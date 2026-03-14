/**
 * Bank account fuzzy resolution.
 *
 * Matches a user-provided name or UUID against the org's bank accounts
 * (from the bank module, NOT chart of accounts).
 *
 * Resolution order: UUID passthrough → exact name → substring → fuzzy → error.
 */

import type { JazClient } from '../api/client.js';
import type { BankAccount } from '../api/types.js';
import { listBankAccounts } from '../api/bank.js';
import { fuzzyMatch } from './fuzzy.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface ResolvedBankAccount {
  resourceId: string;
  name: string;
}

/**
 * Resolve a bank account identifier (UUID or fuzzy name) to a resourceId.
 *
 * - If the input is a UUID, returns it directly (no API call).
 * - Otherwise, fetches bank accounts and matches against names.
 * - Single strong match → returns it.
 * - Zero or ambiguous → throws a helpful error listing available accounts.
 */
export async function resolveBankAccount(
  client: JazClient,
  input: string,
): Promise<ResolvedBankAccount> {
  // Direct UUID — passthrough
  if (UUID_RE.test(input)) {
    return { resourceId: input, name: input };
  }

  // Fetch bank accounts from bank module
  const accounts = await listBankAccounts(client);
  const list = accounts.data;

  if (list.length === 0) {
    throw new Error('No bank accounts found. Create one in Jaz first.');
  }

  return matchBankAccount(input, list);
}

/**
 * Match a name against a list of bank accounts.
 * Separated for testability — no API calls.
 */
export function matchBankAccount(
  input: string,
  list: BankAccount[],
): ResolvedBankAccount {
  const inputLower = input.toLowerCase().trim();

  // 1. Exact name match (case-insensitive)
  const exact = list.find((a) => a.name.toLowerCase() === inputLower);
  if (exact) {
    return { resourceId: exact.resourceId, name: exact.name };
  }

  // 2. Substring match (e.g. "business" matches "Business Bank Account")
  const substringMatches = list.filter((a) => a.name.toLowerCase().includes(inputLower));
  if (substringMatches.length === 1) {
    return { resourceId: substringMatches[0].resourceId, name: substringMatches[0].name };
  }

  // 3. Fuzzy match (Levenshtein + trigram) — strict threshold
  const matches = fuzzyMatch(input, list, (a) => a.name, { threshold: 0.4, limit: 5 });
  if (matches.length === 1 && matches[0].score >= 0.5) {
    return { resourceId: matches[0].item.resourceId, name: matches[0].item.name };
  }

  // 4. Error with candidates
  const available = list.map((a) => `  ${a.name}`).join('\n');

  if (substringMatches.length > 1) {
    const options = substringMatches.map((a) => `  ${a.name}`).join('\n');
    throw new Error(
      `Multiple bank accounts match "${input}":\n${options}\n\nBe more specific, or use the full name.`,
    );
  }

  if (matches.length > 0) {
    const options = matches.map((m) => `  ${m.item.name} (score: ${(m.score * 100).toFixed(0)}%)`).join('\n');
    throw new Error(
      `No exact match for "${input}". Did you mean:\n${options}`,
    );
  }

  throw new Error(
    `No bank account matching "${input}".\n\nAvailable accounts:\n${available}`,
  );
}
