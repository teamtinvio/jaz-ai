import type { Account } from '../api/types.js';
import { fuzzyMatch, fuzzyScore, type FuzzyMatch } from './fuzzy.js';

/**
 * Resolve a chart-of-accounts entry by fuzzy matching on name or code.
 * Accounts are matched by NAME (not code) because codes differ across orgs.
 *
 * Exact code match is tried first (instant), then fuzzy on name.
 */
export function resolveAccount(
  query: string,
  accounts: Account[],
  options: { threshold?: number; limit?: number } = {},
): FuzzyMatch<Account>[] {
  const threshold = options.threshold ?? 0.4;
  const limit = options.limit ?? 5;

  // 1. Try exact code match first (case-insensitive)
  const queryLower = query.toLowerCase().trim();
  const exactCode = accounts.find(
    (a) => a.code?.toLowerCase() === queryLower,
  );
  if (exactCode) {
    return [{ item: exactCode, score: 1 }];
  }

  // 2. Try exact name match
  const exactName = accounts.find(
    (a) => a.name.toLowerCase() === queryLower,
  );
  if (exactName) {
    return [{ item: exactName, score: 1 }];
  }

  // 3. Fuzzy match on name
  return fuzzyMatch(query, accounts, (a) => a.name, { threshold, limit });
}

/**
 * Resolve a single best-matching account, or null if no good match.
 */
export function resolveBestAccount(
  query: string,
  accounts: Account[],
): Account | null {
  const matches = resolveAccount(query, accounts, { threshold: 0.6, limit: 1 });
  return matches.length > 0 ? matches[0].item : null;
}

/**
 * Filter accounts suitable for invoice/bill line items.
 * Excludes bank accounts, cash accounts, and controlled (AR/AP) accounts.
 */
export function filterLineItemAccounts(accounts: Account[]): Account[] {
  return accounts.filter(
    (a) =>
      a.status === 'ACTIVE' &&
      !a.controlFlag &&
      a.accountType !== 'Bank Accounts' &&
      a.accountType !== 'Cash',
  );
}

/**
 * Filter accounts suitable for payments (bank/cash accounts only).
 */
export function filterPaymentAccounts(accounts: Account[]): Account[] {
  return accounts.filter(
    (a) =>
      a.status === 'ACTIVE' &&
      (a.accountType === 'Bank Accounts' || a.accountType === 'Cash'),
  );
}
