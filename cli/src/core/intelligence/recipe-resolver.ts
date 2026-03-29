/**
 * Recipe entity resolution — pure logic, no TTY dependencies.
 *
 * Extracts the account/contact/bank resolution logic used by recipe execution
 * so both CLI (commands/resolve.ts) and agent tools can share it.
 */

import type { JazClient } from '../api/client.js';
import type { Account } from '../api/types.js';
import { listAccounts } from '../api/chart-of-accounts.js';
import { getContact, searchContacts, listContacts } from '../api/contacts.js';
import { getBankAccount } from '../api/bank.js';
import { fetchAllPages } from '../api/pagination.js';
import { resolveAccount, resolveBestAccount } from './account-resolver.js';
import { resolveContact } from './contact-resolver.js';
import { resolveBankAccount } from './bank-resolver.js';

export interface AccountMapping {
  [accountName: string]: string; // accountName → resourceId
}

export interface ResolvedEntity {
  resourceId: string;
  displayName: string;
}

export interface UnresolvedAccount {
  name: string;
  candidates: string[];
}

export interface AccountResolutionResult {
  mapping: AccountMapping;
  failures: UnresolvedAccount[];
}

/**
 * Resolve a list of account names against the org's chart of accounts.
 * Returns both successes and failures — caller decides how to handle.
 */
export async function resolveRecipeAccounts(
  client: JazClient,
  requiredAccounts: string[],
): Promise<AccountResolutionResult> {
  const all = await fetchAllPages<Account>(
    (offset, limit) => listAccounts(client, { offset, limit }),
  );
  const accounts = all.data;

  if (accounts.length === 0) {
    return {
      mapping: {},
      failures: requiredAccounts.map((name) => ({ name, candidates: [] })),
    };
  }

  const mapping: AccountMapping = {};
  const failures: UnresolvedAccount[] = [];

  for (const name of requiredAccounts) {
    const best = resolveBestAccount(name, accounts);
    if (best) {
      mapping[name] = best.resourceId;
    } else {
      const candidates = resolveAccount(name, accounts, { threshold: 0.3, limit: 3 });
      failures.push({ name, candidates: candidates.map((m) => m.item.name) });
    }
  }

  return { mapping, failures };
}

/**
 * Resolve a contact by name or UUID. Returns resourceId + display name.
 * Throws if no match found.
 */
export async function resolveRecipeContact(
  client: JazClient,
  input: string,
): Promise<ResolvedEntity> {
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (UUID_RE.test(input)) {
    // Verify existence + get display name (org-scoped via client auth)
    const res = await getContact(client, input);
    const c = res.data;
    return { resourceId: c.resourceId, displayName: c.billingName || c.name || 'Unknown' };
  }

  const trimmed = input.trim();

  // Server-side search first
  const searchResult = await searchContacts(client, {
    filter: { billingName: { contains: trimmed } },
    limit: 50,
  });
  let candidates = searchResult.data;

  // Fallback: fetch a capped set for fuzzy matching
  if (candidates.length === 0) {
    const page = await listContacts(client, { offset: 0, limit: 500 });
    candidates = page.data;
  }

  if (candidates.length === 0) {
    throw new Error('No contacts found. Create one in Jaz first.');
  }

  // Exact match
  const inputLower = trimmed.toLowerCase();
  const exact = candidates.find(
    (c) =>
      c.billingName?.toLowerCase() === inputLower ||
      c.name?.toLowerCase() === inputLower,
  );
  if (exact) {
    return { resourceId: exact.resourceId, displayName: exact.billingName || exact.name || 'Unknown' };
  }

  // Fuzzy match — auto-resolve if best >= 0.7 and clearly dominant
  const matches = resolveContact(trimmed, candidates, { threshold: 0.5, limit: 5 });
  if (matches.length >= 1 && matches[0].score >= 0.7) {
    const best = matches[0];
    const secondBest = matches.length > 1 ? matches[1].score : 0;
    if (matches.length === 1 || (best.score - secondBest) >= 0.1) {
      const c = best.item;
      return { resourceId: c.resourceId, displayName: c.billingName || c.name || 'Unknown' };
    }
  }

  if (matches.length > 1) {
    const options = matches
      .map((m) => `${m.item.billingName || m.item.name} (${(m.score * 100).toFixed(0)}%)`)
      .join(', ');
    throw new Error(`Multiple contacts match "${trimmed}": ${options}. Be more specific.`);
  }

  throw new Error(`No contact matching "${trimmed}".`);
}

/**
 * Resolve a bank account by name or UUID. Returns resourceId + display name.
 * Throws if no match found.
 */
export async function resolveRecipeBankAccount(
  client: JazClient,
  input: string,
): Promise<ResolvedEntity> {
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (UUID_RE.test(input)) {
    // Verify existence + get display name (org-scoped via client auth)
    const res = await getBankAccount(client, input);
    return { resourceId: res.data.resourceId, displayName: res.data.name };
  }

  const result = await resolveBankAccount(client, input);
  return { resourceId: result.resourceId, displayName: result.name };
}
