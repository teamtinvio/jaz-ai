/**
 * Universal fuzzy entity resolution for CLI commands.
 *
 * Accepts a JazClient + user-provided name or UUID → returns resolved resourceId.
 * Resolution order: UUID passthrough → exact → substring → fuzzy → helpful error.
 *
 * All feedback goes to stderr (never corrupts --json stdout).
 * Stricter by default — accountants don't like mistakes.
 */

import chalk from 'chalk';
import type { JazClient } from '../core/api/client.js';
import type { Account, Contact, TaxProfile } from '../core/api/types.js';
import { listAccounts } from '../core/api/chart-of-accounts.js';
import { searchContacts, listContacts } from '../core/api/contacts.js';
import { listTaxProfiles } from '../core/api/tax-profiles.js';
import { fetchAllPages } from '../core/api/pagination.js';
import {
  resolveAccount,
  resolveBestAccount,
  filterPaymentAccounts,
  filterLineItemAccounts,
} from '../core/intelligence/account-resolver.js';
import {
  resolveContact,
  resolveBestContact,
} from '../core/intelligence/contact-resolver.js';
import { resolveBankAccount } from '../core/intelligence/bank-resolver.js';
import { fuzzyMatch } from '../core/intelligence/fuzzy.js';

// ── Shared ──────────────────────────────────────────────────────

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface ResolveOptions {
  /** Suppress stderr resolution feedback (for --json mode). */
  silent?: boolean;
}

export interface ResolvedEntity {
  resourceId: string;
  displayName: string;
}

/** Truncated UUID for display: abc12345-... */
function shortId(id: string): string {
  return id.length > 12 ? id.slice(0, 8) + '-...' : id;
}

// ── Contact Resolution ──────────────────────────────────────────

/**
 * Resolve a contact flag value (UUID or name) to a resourceId.
 *
 * 1. UUID → passthrough (no API call)
 * 2. Server-side search on billingName (contains)
 * 3. Fallback: fetch all contacts + in-memory fuzzy
 * 4. Single strong match (>= 0.7) → return
 * 5. Multiple/none → throw with candidates
 */
export async function resolveContactFlag(
  client: JazClient,
  input: string,
  opts?: ResolveOptions,
): Promise<ResolvedEntity> {
  if (UUID_RE.test(input)) {
    return { resourceId: input, displayName: input };
  }

  const inputTrimmed = input.trim();

  // Try server-side search first (efficient for large contact lists)
  const searchResult = await searchContacts(client, {
    filter: { billingName: { contains: inputTrimmed } },
    limit: 50,
  });
  let candidates: Contact[] = searchResult.data;

  // If server search returned nothing, fetch a capped set for in-memory fuzzy.
  // Limited to 500 contacts to avoid expensive full scans on large orgs.
  if (candidates.length === 0) {
    const page = await listContacts(client, { offset: 0, limit: 500 });
    candidates = page.data;
  }

  if (candidates.length === 0) {
    throw new Error('No contacts found. Create one in Jaz first.');
  }

  // Exact match (case-insensitive) on billingName or name
  const inputLower = inputTrimmed.toLowerCase();
  const exact = candidates.find(
    (c) =>
      c.billingName?.toLowerCase() === inputLower ||
      c.name?.toLowerCase() === inputLower,
  );
  if (exact) {
    const name = exact.billingName || exact.name || 'Unknown';
    if (!opts?.silent) {
      process.stderr.write(chalk.dim(`  Contact: ${name} (${shortId(exact.resourceId)})\n`));
    }
    return { resourceId: exact.resourceId, displayName: name };
  }

  // Fuzzy match — collect candidates above 0.5 (for error messages) but
  // only auto-resolve if the best match scores >= 0.7 AND is clearly dominant.
  const matches = resolveContact(inputTrimmed, candidates, { threshold: 0.5, limit: 5 });

  if (matches.length >= 1 && matches[0].score >= 0.7) {
    // Auto-resolve if: (a) single match, or (b) best match leads by >= 0.1 (10+ percentage points)
    const best = matches[0];
    const secondBest = matches.length > 1 ? matches[1].score : 0;
    if (matches.length === 1 || (best.score - secondBest) >= 0.1) {
      const c = best.item;
      const name = c.billingName || c.name || 'Unknown';
      if (!opts?.silent) {
        process.stderr.write(chalk.dim(`  Contact: ${name} (${shortId(c.resourceId)})\n`));
      }
      return { resourceId: c.resourceId, displayName: name };
    }
  }

  if (matches.length > 1) {
    const options = matches
      .map((m) => `  ${m.item.billingName || m.item.name} (${(m.score * 100).toFixed(0)}%)`)
      .join('\n');
    throw new Error(
      `Multiple contacts match "${inputTrimmed}":\n${options}\n\nBe more specific, or use the full billingName.`,
    );
  }

  // No match — show available (up to 10)
  const available = candidates
    .slice(0, 10)
    .map((c) => `  ${c.billingName || c.name}`)
    .join('\n');
  const suffix = candidates.length > 10 ? `\n  ... and ${candidates.length - 10} more` : '';
  throw new Error(
    `No contact matching "${inputTrimmed}".\n\nAvailable contacts:\n${available}${suffix}`,
  );
}

// ── Account Resolution ──────────────────────────────────────────

export type AccountFilter = 'bank' | 'line-item' | 'any';

export interface ResolveAccountOptions extends ResolveOptions {
  /** Filter accounts by type: 'bank' (payment), 'line-item', or 'any' (default). */
  filter?: AccountFilter;
}

/**
 * Resolve an account flag value (UUID or name) to a resourceId.
 *
 * 1. UUID → passthrough
 * 2. Fetch all accounts (orgs typically have 50-200)
 * 3. Optional filter by account type
 * 4. Exact code match → exact name match → fuzzy
 * 5. Single strong match (>= 0.7) → return
 * 6. Multiple/none → throw with candidates
 */
export async function resolveAccountFlag(
  client: JazClient,
  input: string,
  opts?: ResolveAccountOptions,
): Promise<ResolvedEntity> {
  if (UUID_RE.test(input)) {
    return { resourceId: input, displayName: input };
  }

  const inputTrimmed = input.trim();

  // Fetch all accounts (safe — orgs have 50-200 accounts)
  const all = await fetchAllPages<Account>(
    (offset, limit) => listAccounts(client, { offset, limit }),
  );
  let accounts = all.data;

  // Apply type filter if requested
  const filterType = opts?.filter ?? 'any';
  if (filterType === 'bank') {
    accounts = filterPaymentAccounts(accounts);
  } else if (filterType === 'line-item') {
    accounts = filterLineItemAccounts(accounts);
  }

  if (accounts.length === 0) {
    const filterLabel = filterType === 'any' ? '' : ` (${filterType})`;
    throw new Error(`No${filterLabel} accounts found. Create one in Jaz first.`);
  }

  // Use intelligence resolver — collect candidates above 0.5 (for error messages)
  // but only auto-resolve if best match scores >= 0.7 (strict).
  const matches = resolveAccount(inputTrimmed, accounts, { threshold: 0.5, limit: 5 });

  if (matches.length >= 1 && matches[0].score >= 0.7) {
    const a = matches[0].item;
    const label = a.code ? `${a.name} (${a.code})` : a.name;
    if (!opts?.silent) {
      process.stderr.write(chalk.dim(`  Account: ${label} (${shortId(a.resourceId)})\n`));
    }
    return { resourceId: a.resourceId, displayName: a.name };
  }

  if (matches.length > 0) {
    const options = matches
      .map((m) => {
        const a = m.item;
        const label = a.code ? `${a.name} (${a.code})` : a.name;
        return `  ${label} (${(m.score * 100).toFixed(0)}%)`;
      })
      .join('\n');
    throw new Error(
      `No strong match for "${inputTrimmed}". Closest:\n${options}\n\nUse the exact name, account code, or resourceId.`,
    );
  }

  // No match at all
  const available = accounts
    .slice(0, 10)
    .map((a) => `  ${a.name}${a.code ? ` (${a.code})` : ''}`)
    .join('\n');
  const suffix = accounts.length > 10 ? `\n  ... and ${accounts.length - 10} more` : '';
  throw new Error(
    `No account matching "${inputTrimmed}".\n\nAvailable accounts:\n${available}${suffix}`,
  );
}

// ── Bank Account Resolution ─────────────────────────────────────

/**
 * Resolve a bank account flag value (UUID or name) to a resourceId.
 *
 * Delegates to shared bank-resolver in intelligence layer,
 * adds stderr feedback for CLI context.
 */
export async function resolveBankAccountFlag(
  client: JazClient,
  input: string,
  opts?: ResolveOptions,
): Promise<ResolvedEntity> {
  if (UUID_RE.test(input)) {
    return { resourceId: input, displayName: input };
  }

  const result = await resolveBankAccount(client, input);
  if (!opts?.silent) {
    process.stderr.write(chalk.dim(`  Bank account: ${result.name} (${shortId(result.resourceId)})\n`));
  }
  return { resourceId: result.resourceId, displayName: result.name };
}

// ── Auto-Resolve Account Map (for ct recipes) ──────────────────

/**
 * Auto-resolve all blueprint account names against the org's chart of accounts.
 *
 * Used by capsule-transaction recipes when --input is omitted.
 * Fetches accounts once, then resolves each required name.
 *
 * Returns a mapping: { "Account Name": "resourceId", ... }
 * Throws if any accounts cannot be resolved — lists resolved + unresolved + candidates.
 */
export async function autoResolveAccountMap(
  client: JazClient,
  requiredAccounts: string[],
  opts?: ResolveOptions,
): Promise<Record<string, string>> {
  // Fetch all accounts once
  const all = await fetchAllPages<Account>(
    (offset, limit) => listAccounts(client, { offset, limit }),
  );
  const accounts = all.data;

  if (accounts.length === 0) {
    throw new Error('No accounts found in chart of accounts. Set up your chart of accounts first.');
  }

  const mapping: Record<string, string> = {};
  const failures: Array<{ name: string; candidates: string[] }> = [];

  for (const name of requiredAccounts) {
    // Use strict threshold for blueprint names (canonical, should match closely)
    const best = resolveBestAccount(name, accounts);

    if (best) {
      mapping[name] = best.resourceId;
      if (!opts?.silent) {
        const label = best.code ? `${best.name} (${best.code})` : best.name;
        process.stderr.write(chalk.dim(`  ${name} -> ${label} (${shortId(best.resourceId)})\n`));
      }
    } else {
      // Find closest candidates for the error message
      const candidates = resolveAccount(name, accounts, { threshold: 0.3, limit: 3 });
      failures.push({
        name,
        candidates: candidates.map((m) => m.item.name),
      });
    }
  }

  if (failures.length > 0) {
    const lines = failures.map((f) => {
      const suggest = f.candidates.length > 0
        ? ` (closest: ${f.candidates.join(', ')})`
        : '';
      return `  ${f.name}${suggest}`;
    });
    const resolved = Object.keys(mapping).length;
    throw new Error(
      `Could not auto-resolve ${failures.length} account(s):\n${lines.join('\n')}\n\n` +
      `${resolved}/${requiredAccounts.length} resolved. ` +
      `Create the missing accounts in Jaz, or provide --input <file> with a manual mapping.`,
    );
  }

  return mapping;
}

// ── Tax Profile Resolution ──────────────────────────────────────

/**
 * Resolve a tax profile flag value (UUID or name) to a resourceId.
 *
 * 1. UUID → passthrough
 * 2. Fetch all tax profiles (orgs have 5-20)
 * 3. Exact name match → fuzzy match (>= 0.7) → error with candidates
 */
export async function resolveTaxProfileFlag(
  client: JazClient,
  input: string,
  opts?: ResolveOptions,
): Promise<ResolvedEntity> {
  if (UUID_RE.test(input)) {
    return { resourceId: input, displayName: input };
  }

  const inputTrimmed = input.trim();

  // Fetch all tax profiles (safe — orgs have 5-20)
  const all = await fetchAllPages<TaxProfile>(
    (offset, limit) => listTaxProfiles(client, { offset, limit }),
  );
  const profiles = all.data;

  if (profiles.length === 0) {
    throw new Error('No tax profiles found. Create one in Jaz first.');
  }

  // Exact match (case-insensitive) on name
  const inputLower = inputTrimmed.toLowerCase();
  const exact = profiles.find((p) => p.name?.toLowerCase() === inputLower);
  if (exact) {
    if (!opts?.silent) {
      process.stderr.write(chalk.dim(`  Tax profile: ${exact.name} (${exact.taxRate}%, ${shortId(exact.resourceId)})\n`));
    }
    return { resourceId: exact.resourceId, displayName: exact.name };
  }

  // Fuzzy match
  const matches = fuzzyMatch(inputTrimmed, profiles, (p) => p.name, { threshold: 0.5, limit: 5 });

  if (matches.length >= 1 && matches[0].score >= 0.7) {
    const p = matches[0].item;
    if (!opts?.silent) {
      process.stderr.write(chalk.dim(`  Tax profile: ${p.name} (${p.taxRate}%, ${shortId(p.resourceId)})\n`));
    }
    return { resourceId: p.resourceId, displayName: p.name };
  }

  if (matches.length > 0) {
    const options = matches
      .map((m) => `  ${m.item.name} (${m.item.taxRate}%) (${(m.score * 100).toFixed(0)}%)`)
      .join('\n');
    throw new Error(
      `No strong match for "${inputTrimmed}". Closest:\n${options}\n\nUse the exact name or resourceId.`,
    );
  }

  const available = profiles
    .slice(0, 10)
    .map((p) => `  ${p.name} (${p.taxRate}%)`)
    .join('\n');
  const suffix = profiles.length > 10 ? `\n  ... and ${profiles.length - 10} more` : '';
  throw new Error(
    `No tax profile matching "${inputTrimmed}".\n\nAvailable tax profiles:\n${available}${suffix}`,
  );
}

// ── Utility ─────────────────────────────────────────────────────

/** Check if a string looks like a UUID. */
export function isUUID(s: string): boolean {
  return UUID_RE.test(s);
}
