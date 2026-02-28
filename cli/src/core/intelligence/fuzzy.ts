/**
 * Fuzzy string matching utilities.
 * Hand-rolled Levenshtein + trigram scoring — no external deps.
 */

/**
 * Levenshtein edit distance between two strings.
 * O(m*n) time, O(min(m,n)) space.
 */
export function levenshtein(a: string, b: string): number {
  const al = a.length;
  const bl = b.length;

  if (al === 0) return bl;
  if (bl === 0) return al;

  // Use shorter string for the column to save memory
  if (al > bl) return levenshtein(b, a);

  let prev = Array.from({ length: al + 1 }, (_, i) => i);
  let curr = new Array<number>(al + 1);

  for (let j = 1; j <= bl; j++) {
    curr[0] = j;
    for (let i = 1; i <= al; i++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[i] = Math.min(
        prev[i] + 1,      // deletion
        curr[i - 1] + 1,  // insertion
        prev[i - 1] + cost, // substitution
      );
    }
    [prev, curr] = [curr, prev];
  }

  return prev[al];
}

/**
 * Normalized Levenshtein similarity (0 = no match, 1 = exact).
 */
export function levenshteinSimilarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshtein(a, b) / maxLen;
}

/**
 * Extract character trigrams from a string.
 * Pads with leading/trailing spaces for edge matching.
 */
export function trigrams(s: string): Set<string> {
  const padded = ` ${s} `;
  const result = new Set<string>();
  for (let i = 0; i <= padded.length - 3; i++) {
    result.add(padded.slice(i, i + 3));
  }
  return result;
}

/**
 * Trigram similarity (Jaccard coefficient): |A ∩ B| / |A ∪ B|.
 * Returns 0..1 (1 = identical trigram sets).
 */
export function trigramSimilarity(a: string, b: string): number {
  const ta = trigrams(a);
  const tb = trigrams(b);

  let intersection = 0;
  for (const t of ta) {
    if (tb.has(t)) intersection++;
  }

  const union = ta.size + tb.size - intersection;
  if (union === 0) return 1;
  return intersection / union;
}

/**
 * Combined fuzzy score: weighted average of Levenshtein + trigram similarity.
 * Returns 0..1 (1 = exact match).
 */
export function fuzzyScore(
  a: string,
  b: string,
  options: { levenshteinWeight?: number } = {},
): number {
  const lw = options.levenshteinWeight ?? 0.4;
  const tw = 1 - lw;

  const al = a.toLowerCase().trim();
  const bl = b.toLowerCase().trim();

  // Exact match shortcut
  if (al === bl) return 1;

  const lev = levenshteinSimilarity(al, bl);
  const tri = trigramSimilarity(al, bl);

  return lw * lev + tw * tri;
}

export interface FuzzyMatch<T> {
  item: T;
  score: number;
}

/**
 * Find best fuzzy matches from a list of candidates.
 * Returns matches sorted by score (descending), filtered by threshold.
 */
export function fuzzyMatch<T>(
  query: string,
  candidates: T[],
  getText: (item: T) => string,
  options: { threshold?: number; limit?: number } = {},
): FuzzyMatch<T>[] {
  const threshold = options.threshold ?? 0.3;
  const limit = options.limit ?? 5;

  const scored = candidates
    .map((item) => ({
      item,
      score: fuzzyScore(query, getText(item)),
    }))
    .filter((m) => m.score >= threshold)
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, limit);
}
