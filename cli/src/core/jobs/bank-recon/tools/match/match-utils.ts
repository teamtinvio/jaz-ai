/**
 * Scoring, text matching, and DFS utilities for the bank-match tool.
 *
 * Design: FILTER (amount/direction/date) is binary pass/fail.
 * These utilities only compute RANK signals for items that pass the filter gate.
 */

import type { MatchType, MatchConfidence } from '../../../../calc/types.js';

// ── Text normalization & similarity ─────────────────────────────

/** Normalize text for comparison: lowercase, strip non-alphanumeric, collapse whitespace. */
export function normalizeText(text: string | undefined | null): string {
  if (!text) return '';
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
}

/** Token set from normalized text. */
function tokenize(text: string): Set<string> {
  if (!text) return new Set();
  return new Set(text.split(' ').filter(t => t.length > 0));
}

/**
 * Similarity between two text strings.
 * 1.0 = exact, 0.85 = substring containment, 0.0–1.0 = token overlap.
 * Returns 0.0 if either is empty or both are < 4 chars.
 */
export function textSimilarity(a: string | undefined | null, b: string | undefined | null): number {
  const na = normalizeText(a);
  const nb = normalizeText(b);
  if (!na || !nb) return 0;
  if (na.length < 4 && nb.length < 4) return 0;
  if (na === nb) return 1.0;

  // Substring containment (shorter inside longer)
  const shorter = na.length <= nb.length ? na : nb;
  const longer = na.length <= nb.length ? nb : na;
  if (longer.includes(shorter)) return 0.85;

  // Token overlap: |intersection| / |shorter set|
  const tokA = tokenize(na);
  const tokB = tokenize(nb);
  if (tokA.size === 0 || tokB.size === 0) return 0;
  const smallerSet = tokA.size <= tokB.size ? tokA : tokB;
  const largerSet = tokA.size <= tokB.size ? tokB : tokA;
  let overlap = 0;
  for (const t of smallerSet) {
    if (largerSet.has(t)) overlap++;
  }
  return smallerSet.size > 0 ? overlap / smallerSet.size : 0;
}

/**
 * Cross-field text score: max similarity across all bank×txn field pairs.
 * Bank has 3 text fields (contact, reference, description).
 * Txn has 2 text fields (contact, reference).
 * = 6 comparisons, take max.
 */
export function crossFieldTextScore(
  bankContact: string | undefined,
  bankReference: string | undefined,
  bankDescription: string | undefined,
  txnContact: string | undefined,
  txnReference: string | undefined,
): number {
  let max = 0;
  const bankFields = [bankContact, bankReference, bankDescription];
  const txnFields = [txnContact, txnReference];
  for (const bf of bankFields) {
    for (const tf of txnFields) {
      const s = textSimilarity(bf, tf);
      if (s > max) max = s;
      if (max === 1.0) return 1.0; // early exit
    }
  }
  return max;
}

/**
 * Multi-transaction text score for N:1 matches.
 * Takes the max text score across all transactions in the group.
 */
export function groupTextScore(
  bankContact: string | undefined,
  bankReference: string | undefined,
  bankDescription: string | undefined,
  txns: { contact?: string; reference?: string }[],
): number {
  let max = 0;
  for (const txn of txns) {
    const s = crossFieldTextScore(bankContact, bankReference, bankDescription, txn.contact, txn.reference);
    if (s > max) max = s;
    if (max === 1.0) return 1.0;
  }
  return max;
}

// ── Date scoring ───────────────────────────────────────────────

const DATE_HALF_LIFE = 5.0;

/** Exponential decay: score halves every 5 days. Same day = 1.0. */
export function dateScore(daysDiff: number): number {
  return Math.exp(-Math.abs(daysDiff) / DATE_HALF_LIFE);
}

// ── Match type scoring ─────────────────────────────────────────

/** Occam's razor penalty: simpler matches score higher. */
export function typeScore(matchType: MatchType, groupSize: number): number {
  switch (matchType) {
    case '1:1': return 0.90;
    case 'N:1': return Math.max(0.40, 0.70 - 0.05 * (groupSize - 2));
    case '1:N': return Math.max(0.35, 0.60 - 0.05 * (groupSize - 2));
    case 'N:M': return Math.max(0.19, 0.40 - 0.03 * (groupSize - 3));
  }
}

// ── Composite scoring ──────────────────────────────────────────

const W_TEXT = 0.55;
const W_DATE = 0.30;
const W_TYPE = 0.15;

/**
 * Weighted composite score from individual signals.
 * When textScore is 0 (no text data), redistribute weight to date + type.
 */
export function compositeScore(text: number, date: number, type: number): number {
  if (text === 0) {
    // No text available — redistribute weight proportionally
    const total = W_DATE + W_TYPE;
    return (date * W_DATE + type * W_TYPE) / total;
  }
  return W_TEXT * text + W_DATE * date + W_TYPE * type;
}

/** Map composite score to confidence level. */
export function scoreToConfidence(score: number): MatchConfidence {
  if (score >= 0.70) return 'high';
  if (score >= 0.40) return 'medium';
  return 'low';
}

// ── Integer cents helpers ──────────────────────────────────────

/** Convert float amount to integer cents. */
export function toCents(amount: number): number {
  return Math.round(amount * 100);
}

/** Convert cents back to float amount (2dp). */
export function fromCents(cents: number): number {
  return Math.round(cents) / 100;
}

// ── Date helpers ───────────────────────────────────────────────

const MS_PER_DAY = 86400000;

/** Convert YYYY-MM-DD to integer day offset. */
export function toDayOffset(dateStr: string): number {
  return Math.floor(Date.parse(dateStr + 'T00:00:00Z') / MS_PER_DAY);
}

// ── Subset-sum DFS ─────────────────────────────────────────────

export interface SubsetCandidate {
  index: number;
  cents: number;
}

export interface SubsetResult {
  indices: number[];
  sum: number; // in cents
}

/**
 * Find subsets of candidates whose sum is within tolerance of target.
 *
 * INVARIANT: All candidate cents MUST be non-negative integers. Call sites
 * pass Math.abs(cents) after same-sign filtering. This function defensively
 * sorts by descending cents and validates the non-negative contract.
 *
 * Pruning (node-level, proven correct for non-negative descending):
 *   - Overshoot: if currentSum > target + tolerance, prune entire subtree
 *   - Undershoot: if currentSum + suffixSum[start] < target - tolerance, prune
 *   - Node budget: if exceeded, bail out with whatever matches found so far
 *
 * @param candidates Array of {index, cents} — cents must be non-negative integers
 * @param targetCents Target sum in integer cents (non-negative)
 * @param toleranceCents Absolute tolerance in integer cents
 * @param maxK Maximum subset size (default 5)
 * @param findAll If true, return all valid subsets. If false, return first found.
 * @param maxNodes Maximum DFS nodes to explore before bailing out (0 = unlimited).
 * @returns Array of valid subsets (may be empty)
 */
export function subsetSumDFS(
  candidates: SubsetCandidate[],
  targetCents: number,
  toleranceCents: number,
  maxK: number = 5,
  findAll: boolean = false,
  maxNodes: number = 0,
): SubsetResult[] {
  const n = candidates.length;
  if (n === 0) return [];

  // Defensive sort: descending by cents (required for pruning correctness)
  const sorted = [...candidates].sort((a, b) => b.cents - a.cents);

  // Precompute suffix sums for undershoot pruning
  const suffixSum = new Array<number>(n + 1);
  suffixSum[n] = 0;
  for (let i = n - 1; i >= 0; i--) {
    suffixSum[i] = suffixSum[i + 1] + sorted[i].cents;
  }

  const results: SubsetResult[] = [];
  const stack: number[] = [];
  let nodesVisited = 0;
  const hasNodeBudget = maxNodes > 0;

  function dfs(start: number, currentSum: number, depth: number): void {
    nodesVisited++;
    if (hasNodeBudget && nodesVisited > maxNodes) return;

    // Node-level prune: overshoot — currentSum already exceeds target + tolerance
    if (currentSum > targetCents + toleranceCents) return;
    // Node-level prune: undershoot — even taking all remaining can't reach target
    if (currentSum + suffixSum[start] < targetCents - toleranceCents) return;

    // Check if current subset (size ≥ 2) matches target
    if (depth >= 2) {
      if (Math.abs(currentSum - targetCents) <= toleranceCents) {
        results.push({
          indices: stack.map(i => sorted[i].index),
          sum: currentSum,
        });
        if (!findAll) return;
      }
    }

    // Max depth reached
    if (depth >= maxK) return;
    if (!findAll && results.length > 0) return;

    for (let i = start; i < n; i++) {
      stack.push(i);
      dfs(i + 1, currentSum + sorted[i].cents, depth + 1);
      stack.pop();
      if (!findAll && results.length > 0) return;
      if (hasNodeBudget && nodesVisited > maxNodes) return;
    }
  }

  dfs(0, 0, 0);
  return results;
}
