import type { Contact } from '../api/types.js';
import { fuzzyScore, type FuzzyMatch } from './fuzzy.js';

/**
 * Resolve a contact from a list by fuzzy matching on name/billingName.
 * Used by CLI and agent to find contacts without requiring exact resourceId.
 *
 * Matches against both `billingName` and `name` fields, taking the best score.
 */
export function resolveContact(
  query: string,
  contacts: Contact[],
  options: { threshold?: number; limit?: number } = {},
): FuzzyMatch<Contact>[] {
  const threshold = options.threshold ?? 0.4;
  const limit = options.limit ?? 5;

  const scored = contacts
    .map((contact) => {
      const names = [contact.billingName, contact.name].filter(Boolean) as string[];
      const bestScore = Math.max(
        ...names.map((n) => fuzzyScore(query, n)),
      );
      return { item: contact, score: bestScore };
    })
    .filter((m) => m.score >= threshold)
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, limit);
}

/**
 * Resolve a single best-matching contact, or null if no good match.
 * A match is considered "good" if score >= 0.7 (high confidence).
 */
export function resolveBestContact(
  query: string,
  contacts: Contact[],
): Contact | null {
  const matches = resolveContact(query, contacts, { threshold: 0.7, limit: 1 });
  return matches.length > 0 ? matches[0].item : null;
}
