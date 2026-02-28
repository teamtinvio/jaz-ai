/**
 * Bank reconciliation matching tool — 5-phase cascade algorithm.
 *
 * Pure deterministic calculator: takes bank records + cashflow transactions,
 * outputs match proposals with confidence scores. No API calls, no side effects.
 *
 * Algorithm phases:
 *   0. Normalize & index (integer cents, day offsets, text normalization)
 *   1. Exact 1:1 hash join (amount + contact + date)
 *   2. Fuzzy 1:1 greedy assignment (tolerance + scoring)
 *   3. N:1 subset-sum (multiple txns → one bank record)
 *   4. 1:N reverse subset-sum (multiple bank records → one txn)
 *   5. N:M two-set matching (within contact groups)
 *
 * Performance: <50ms for 500 records × 2000 transactions.
 */

import { round2 } from '../../../../calc/types.js';
import type {
  BankRecord, CashflowTransaction, BankMatchOptions, BankMatchInput,
  BankMatchResult, MatchProposal, MatchType, MatchConfidence,
} from '../../../../calc/types.js';
import {
  normalizeText, crossFieldTextScore, groupTextScore,
  dateScore, typeScore, compositeScore, scoreToConfidence,
  toCents, fromCents, toDayOffset,
  subsetSumDFS,
} from './match-utils.js';
import type { SubsetCandidate } from './match-utils.js';

// ── Defaults ──────────────────────────────────────────────────

const DEFAULT_TOLERANCE = 0.01;
const DEFAULT_DATE_WINDOW = 14;
const DEFAULT_MAX_K = 5;
const DEFAULT_FX_TOLERANCE_PCT = 0.05; // 5% for cross-currency
const FX_PENALTY = 0.05;
const MIN_FUZZY_SCORE = 0.15;
const STRONG_1TO1_THRESHOLD = 0.70; // Regret check: Phase 2 matches below this are deferred to Phase 3
const MAX_DFS_NODES = 500_000; // Node budget per DFS call — prevents exponential blowup on large candidate pools

// ── Internal pool types ───────────────────────────────────────

interface NormalizedRecord {
  id: string;
  originalAmount: number;
  cents: number; // signed integer cents (normalized to functional currency)
  day: number;   // integer day offset
  date: string;
  contact: string | undefined;
  reference: string | undefined;
  description: string | undefined;
  contactNorm: string;
  currency: string | undefined;
  isFx: boolean;
}

interface NormalizedTxn {
  id: string;
  originalAmount: number;
  signedAmount: number;
  cents: number; // signed integer cents (normalized to functional currency)
  day: number;
  date: string;
  contact: string | undefined;
  reference: string | undefined;
  type: string | undefined;
  contactNorm: string;
  currency: string | undefined;
  isFx: boolean;
}

// ── Main entry point ──────────────────────────────────────────

export function matchBankRecords(input: BankMatchInput): BankMatchResult {
  const opts = input.options ?? {};
  const tolerance = opts.tolerance ?? DEFAULT_TOLERANCE;
  const dateWindowDays = opts.dateWindowDays ?? DEFAULT_DATE_WINDOW;
  const maxK = opts.maxGroupSize ?? DEFAULT_MAX_K;
  const fxTolerancePct = opts.fxTolerancePct ?? DEFAULT_FX_TOLERANCE_PCT;
  const findAll = opts.findAll ?? false;
  const dfsNodes = opts.maxDfsNodes ?? MAX_DFS_NODES;
  const currency = opts.currency ?? null;
  const exchangeRates = opts.exchangeRates ?? {};
  const toleranceCents = toCents(tolerance);

  const timing = { phase0Ms: 0, phase1Ms: 0, phase2Ms: 0, phase3Ms: 0, phase4Ms: 0, phase5Ms: 0, totalMs: 0 };
  const totalStart = performance.now();

  // ── Phase 0: Normalize & index ────────────────────────────
  let t0 = performance.now();

  const records: NormalizedRecord[] = input.bankRecords.map(r => {
    const isFx = false; // Bank records are in bank currency (= functional)
    return {
      id: r.id,
      originalAmount: r.amount,
      cents: toCents(r.amount),
      day: toDayOffset(r.date),
      date: r.date,
      contact: r.contact,
      reference: r.reference,
      description: r.description,
      contactNorm: normalizeText(r.contact),
      currency: r.currency,
      isFx,
    };
  });

  const txns: NormalizedTxn[] = input.transactions.map(t => {
    const signed = t.direction === 'PAYIN' ? t.amount : -t.amount;
    const isFx = !!t.crossCurrency;
    let rate = 1;
    if (isFx && t.currency) {
      if (exchangeRates[t.currency] === undefined) {
        throw new Error(`Missing exchange rate for ${t.currency} (transaction ${t.id} is cross-currency)`);
      }
      rate = exchangeRates[t.currency];
    }
    const normalizedAmount = signed * rate;
    return {
      id: t.id,
      originalAmount: t.amount,
      signedAmount: signed,
      cents: toCents(normalizedAmount),
      day: toDayOffset(t.date),
      date: t.date,
      contact: t.contact,
      reference: t.reference,
      type: t.type,
      contactNorm: normalizeText(t.contact),
      currency: t.currency,
      isFx,
    };
  });

  // Mutable pools — items removed as they're consumed
  const recordPool = new Set<number>(records.map((_, i) => i));
  const txnPool = new Set<number>(txns.map((_, i) => i));

  const matches: MatchProposal[] = [];
  const workingsLines: string[] = [];

  timing.phase0Ms = performance.now() - t0;

  // ── Phase 1: Exact 1:1 hash join ─────────────────────────
  t0 = performance.now();

  // Build map from bank records: key = "cents|contactNorm|date"
  const exactMap = new Map<string, number[]>();
  for (const ri of recordPool) {
    const r = records[ri];
    const key = `${r.cents}|${r.contactNorm}|${r.date}`;
    const arr = exactMap.get(key);
    if (arr) arr.push(ri);
    else exactMap.set(key, [ri]);
  }

  // Probe with transactions
  const phase1Matches: [number, number][] = [];
  for (const ti of txnPool) {
    const t = txns[ti];
    const key = `${t.cents}|${t.contactNorm}|${t.date}`;
    const candidates = exactMap.get(key);
    if (!candidates) continue;
    // Take first available record
    for (let c = 0; c < candidates.length; c++) {
      const ri = candidates[c];
      if (recordPool.has(ri)) {
        phase1Matches.push([ri, ti]);
        // Remove from candidates to prevent reuse
        candidates.splice(c, 1);
        break;
      }
    }
  }

  for (const [ri, ti] of phase1Matches) {
    recordPool.delete(ri);
    txnPool.delete(ti);
    const r = records[ri];
    const t = txns[ti];
    matches.push({
      matchType: '1:1',
      confidence: 'exact',
      score: 1.0,
      bankRecords: [{ id: r.id, amount: r.originalAmount, date: r.date }],
      transactions: [{ id: t.id, amount: t.originalAmount, date: t.date }],
      bankTotal: r.originalAmount,
      transactionTotal: t.signedAmount,
      variance: 0,
      signals: { text: 1.0, date: 1.0, type: 1.0 },
      reason: 'Exact match — amount, contact, and date all match',
    });
  }

  workingsLines.push(`Phase 1 (exact 1:1): ${phase1Matches.length} matches`);
  timing.phase1Ms = performance.now() - t0;

  // ── Phase 2: Fuzzy 1:1 greedy assignment ──────────────────
  t0 = performance.now();

  interface ScoredPair { ri: number; ti: number; score: number; text: number; date: number; type: number; isFx: boolean }
  const pairs: ScoredPair[] = [];

  for (const ri of recordPool) {
    const r = records[ri];
    for (const ti of txnPool) {
      const t = txns[ti];

      // FILTER: same sign
      if ((r.cents > 0) !== (t.cents > 0)) continue;

      // FILTER: date within window
      const daysDiff = Math.abs(r.day - t.day);
      if (daysDiff > dateWindowDays) continue;

      // FILTER: amount within tolerance
      const isFxPair = r.isFx || t.isFx;
      const effectiveTolerance = isFxPair
        ? Math.max(toleranceCents, Math.round(Math.abs(t.cents) * fxTolerancePct))
        : toleranceCents;
      if (Math.abs(r.cents - t.cents) > effectiveTolerance) continue;

      // RANK: compute signals
      const textSig = crossFieldTextScore(r.contact, r.reference, r.description, t.contact, t.reference);
      const dateSig = dateScore(daysDiff);
      const typeSig = typeScore('1:1', 2);
      let score = compositeScore(textSig, dateSig, typeSig);
      if (isFxPair) score = Math.max(0, score - FX_PENALTY);

      if (score >= MIN_FUZZY_SCORE) {
        pairs.push({ ri, ti, score, text: textSig, date: dateSig, type: typeSig, isFx: isFxPair });
      }
    }
  }

  // Sort descending by score
  pairs.sort((a, b) => b.score - a.score);

  // Greedy assignment: walk sorted list, skip if either side taken
  const phase2RecordUsed = new Set<number>();
  const phase2TxnUsed = new Set<number>();
  const phase2Matches: ScoredPair[] = [];

  for (const p of pairs) {
    if (phase2RecordUsed.has(p.ri) || phase2TxnUsed.has(p.ti)) continue;
    phase2RecordUsed.add(p.ri);
    phase2TxnUsed.add(p.ti);
    phase2Matches.push(p);
  }

  // Regret check: un-assign weak matches (score < 0.70) — let Phase 3 try them
  const phase2Final: ScoredPair[] = [];
  const phase2Regret: ScoredPair[] = [];
  for (const p of phase2Matches) {
    if (p.score < STRONG_1TO1_THRESHOLD) {
      phase2Regret.push(p);
    } else {
      phase2Final.push(p);
    }
  }

  // Commit strong Phase 2 matches
  for (const p of phase2Final) {
    recordPool.delete(p.ri);
    txnPool.delete(p.ti);
    const r = records[p.ri];
    const t = txns[p.ti];
    const confidence = scoreToConfidence(p.score);
    const proposal: MatchProposal = {
      matchType: '1:1',
      confidence,
      score: round2Sig(p.score),
      bankRecords: [{ id: r.id, amount: r.originalAmount, date: r.date }],
      transactions: [{ id: t.id, amount: t.originalAmount, date: t.date }],
      bankTotal: r.originalAmount,
      transactionTotal: t.signedAmount,
      variance: round2(r.originalAmount - t.signedAmount),
      signals: { text: round2Sig(p.text), date: round2Sig(p.date), type: round2Sig(p.type) },
      reason: buildReason('1:1', confidence, p),
    };
    if (p.isFx) {
      proposal.fxVariance = round2(fromCents(Math.abs(records[p.ri].cents - txns[p.ti].cents)));
    }
    matches.push(proposal);
  }

  // Regret items stay in the pool for Phase 3
  // (They were tentatively assigned but released)
  workingsLines.push(`Phase 2 (fuzzy 1:1): ${phase2Final.length} matches, ${phase2Regret.length} deferred to Phase 3`);
  timing.phase2Ms = performance.now() - t0;

  // ── Phase 3: N:1 subset-sum (txn subsets → bank record) ──
  t0 = performance.now();
  let phase3Count = 0;

  for (const ri of [...recordPool]) {
    const r = records[ri];

    // Gather same-sign candidates within date window
    const candidates: { ti: number; cents: number }[] = [];
    for (const ti of txnPool) {
      const t = txns[ti];
      if ((r.cents > 0) !== (t.cents > 0)) continue;
      if (Math.abs(r.day - t.day) > dateWindowDays) continue;
      candidates.push({ ti, cents: t.cents });
    }

    if (candidates.length < 2) continue;

    // DFS operates on absolute values (same-sign filter guarantees all same direction)
    // Sort descending by |cents| for DFS pruning
    candidates.sort((a, b) => Math.abs(b.cents) - Math.abs(a.cents));

    // Build SubsetCandidate array with absolute cents (sign already filtered)
    const subCandidates: SubsetCandidate[] = candidates.map((c, i) => ({
      index: i,
      cents: Math.abs(c.cents),
    }));

    // Compute effective tolerance
    const isFxRecord = r.isFx || candidates.some(c => txns[c.ti].isFx);
    const effectiveTolCents = isFxRecord
      ? Math.max(toleranceCents, Math.round(Math.abs(r.cents) * fxTolerancePct))
      : toleranceCents;

    const subsets = subsetSumDFS(subCandidates, Math.abs(r.cents), effectiveTolCents, maxK, findAll, dfsNodes);
    if (subsets.length === 0) continue;

    // Pick best subset: fewest items, then highest composite score
    let bestSubset = subsets[0];
    let bestScore = -1;
    for (const ss of subsets) {
      const matchedTxns = ss.indices.map(i => txns[candidates[i].ti]);
      const textSig = groupTextScore(r.contact, r.reference, r.description,
        matchedTxns.map(t => ({ contact: t.contact, reference: t.reference })));
      const minDaysDiff = Math.min(...ss.indices.map(i => Math.abs(r.day - txns[candidates[i].ti].day)));
      const dateSig = dateScore(minDaysDiff);
      const typeSig = typeScore('N:1', ss.indices.length);
      let score = compositeScore(textSig, dateSig, typeSig);
      if (isFxRecord) score = Math.max(0, score - FX_PENALTY);

      // Prefer: smaller subset, then higher score
      const rank = -ss.indices.length * 1000 + score * 100;
      if (subsets.length === 1 || rank > bestScore || (rank === bestScore && ss.indices.length < bestSubset.indices.length)) {
        bestSubset = ss;
        bestScore = rank;
      }
    }

    // Commit the best subset
    const matchedTxnIndices = bestSubset.indices.map(i => candidates[i].ti);

    // Verify none already consumed
    if (matchedTxnIndices.some(ti => !txnPool.has(ti))) continue;

    recordPool.delete(ri);
    for (const ti of matchedTxnIndices) txnPool.delete(ti);

    const matchedTxns = matchedTxnIndices.map(ti => txns[ti]);
    const textSig = groupTextScore(r.contact, r.reference, r.description,
      matchedTxns.map(t => ({ contact: t.contact, reference: t.reference })));
    const minDaysDiff = Math.min(...matchedTxns.map(t => Math.abs(r.day - t.day)));
    const dateSig = dateScore(minDaysDiff);
    const typeSig = typeScore('N:1', matchedTxns.length);
    let score = compositeScore(textSig, dateSig, typeSig);
    if (isFxRecord) score = Math.max(0, score - FX_PENALTY);
    const confidence = scoreToConfidence(score);

    const txnTotal = round2(matchedTxns.reduce((s, t) => s + t.signedAmount, 0));
    const proposal: MatchProposal = {
      matchType: 'N:1',
      confidence,
      score: round2Sig(score),
      bankRecords: [{ id: r.id, amount: r.originalAmount, date: r.date }],
      transactions: matchedTxns.map(t => ({ id: t.id, amount: t.originalAmount, date: t.date })),
      bankTotal: r.originalAmount,
      transactionTotal: txnTotal,
      variance: round2(r.originalAmount - txnTotal),
      signals: { text: round2Sig(textSig), date: round2Sig(dateSig), type: round2Sig(typeSig) },
      reason: `${matchedTxns.length} transactions sum to bank record amount (${confidence} confidence)`,
    };
    if (isFxRecord) {
      proposal.fxVariance = round2(fromCents(Math.abs(r.cents - bestSubset.sum)));
    }
    matches.push(proposal);
    phase3Count++;
  }

  workingsLines.push(`Phase 3 (N:1 subset): ${phase3Count} matches`);
  timing.phase3Ms = performance.now() - t0;

  // ── Phase 4: 1:N reverse subset-sum (record subsets → txn) ─
  t0 = performance.now();
  let phase4Count = 0;

  for (const ti of [...txnPool]) {
    const t = txns[ti];

    const candidates: { ri: number; cents: number }[] = [];
    for (const ri of recordPool) {
      const r = records[ri];
      if ((r.cents > 0) !== (t.cents > 0)) continue;
      if (Math.abs(r.day - t.day) > dateWindowDays) continue;
      candidates.push({ ri, cents: r.cents });
    }

    if (candidates.length < 2) continue;

    candidates.sort((a, b) => Math.abs(b.cents) - Math.abs(a.cents));

    // DFS operates on absolute values (same-sign filter guarantees all same direction)
    const subCandidates: SubsetCandidate[] = candidates.map((c, i) => ({
      index: i,
      cents: Math.abs(c.cents),
    }));

    const isFxTxn = t.isFx || candidates.some(c => records[c.ri].isFx);
    const effectiveTolCents = isFxTxn
      ? Math.max(toleranceCents, Math.round(Math.abs(t.cents) * fxTolerancePct))
      : toleranceCents;

    const subsets = subsetSumDFS(subCandidates, Math.abs(t.cents), effectiveTolCents, maxK, findAll, dfsNodes);
    if (subsets.length === 0) continue;

    // Pick best: fewest items
    let bestSubset = subsets[0];
    for (const ss of subsets) {
      if (ss.indices.length < bestSubset.indices.length) bestSubset = ss;
    }

    const matchedRecordIndices = bestSubset.indices.map(i => candidates[i].ri);
    if (matchedRecordIndices.some(ri => !recordPool.has(ri))) continue;

    txnPool.delete(ti);
    for (const ri of matchedRecordIndices) recordPool.delete(ri);

    const matchedRecords = matchedRecordIndices.map(ri => records[ri]);
    const textSig = Math.max(...matchedRecords.map(r =>
      crossFieldTextScore(r.contact, r.reference, r.description, t.contact, t.reference)));
    const minDaysDiff = Math.min(...matchedRecords.map(r => Math.abs(r.day - t.day)));
    const dateSig = dateScore(minDaysDiff);
    const typeSig = typeScore('1:N', matchedRecords.length);
    let score = compositeScore(textSig, dateSig, typeSig);
    if (isFxTxn) score = Math.max(0, score - FX_PENALTY);
    const confidence = scoreToConfidence(score);

    const bankTotal = round2(matchedRecords.reduce((s, r) => s + r.originalAmount, 0));
    const proposal: MatchProposal = {
      matchType: '1:N',
      confidence,
      score: round2Sig(score),
      bankRecords: matchedRecords.map(r => ({ id: r.id, amount: r.originalAmount, date: r.date })),
      transactions: [{ id: t.id, amount: t.originalAmount, date: t.date }],
      bankTotal,
      transactionTotal: t.signedAmount,
      variance: round2(bankTotal - t.signedAmount),
      signals: { text: round2Sig(textSig), date: round2Sig(dateSig), type: round2Sig(typeSig) },
      reason: `${matchedRecords.length} bank records sum to transaction amount (${confidence} confidence)`,
    };
    if (isFxTxn) {
      proposal.fxVariance = round2(fromCents(Math.abs(bestSubset.sum - t.cents)));
    }
    matches.push(proposal);
    phase4Count++;
  }

  workingsLines.push(`Phase 4 (1:N reverse): ${phase4Count} matches`);
  timing.phase4Ms = performance.now() - t0;

  // ── Phase 5: N:M two-set matching ─────────────────────────
  t0 = performance.now();
  let phase5Count = 0;

  // Group remaining items by contact
  const contactGroups = new Map<string, { records: number[]; txns: number[] }>();
  for (const ri of recordPool) {
    const key = records[ri].contactNorm || '__none__';
    let g = contactGroups.get(key);
    if (!g) { g = { records: [], txns: [] }; contactGroups.set(key, g); }
    g.records.push(ri);
  }
  for (const ti of txnPool) {
    const key = txns[ti].contactNorm || '__none__';
    let g = contactGroups.get(key);
    if (!g) { g = { records: [], txns: [] }; contactGroups.set(key, g); }
    g.txns.push(ti);
  }

  for (const [contactKey, group] of contactGroups) {
    if (contactKey === '__none__') continue; // Skip items with no contact
    if (group.records.length === 0 || group.txns.length === 0) continue;
    if (group.records.length + group.txns.length > maxK * 2) continue; // Too large

    // Enumerate record subsets and transaction subsets
    const rIndices = group.records.filter(ri => recordPool.has(ri));
    const tIndices = group.txns.filter(ti => txnPool.has(ti));
    if (rIndices.length === 0 || tIndices.length === 0) continue;

    // Build sum maps for smaller side
    const rSubsets = enumerateSubsets(rIndices, maxK, records, 'record');
    const tSubsets = enumerateSubsets(tIndices, maxK, txns, 'txn');

    // For each record subset, find a matching txn subset
    const isFxGroup = rIndices.some(ri => records[ri].isFx) || tIndices.some(ti => txns[ti].isFx);
    const effectiveTolCents = isFxGroup
      ? Math.max(toleranceCents, Math.round(
          Math.max(...rIndices.map(ri => Math.abs(records[ri].cents))) * fxTolerancePct))
      : toleranceCents;

    let bestMatch: { rSet: number[]; tSet: number[]; rSum: number; tSum: number; score: number } | null = null;

    for (const rs of rSubsets) {
      // Check all txn subsets within tolerance
      for (const ts of tSubsets) {
        if (Math.abs(rs.sum - ts.sum) > effectiveTolCents) continue;
        // Ensure sets don't overlap in the pool
        const totalSize = rs.indices.length + ts.indices.length;
        if (totalSize < 3 || totalSize > maxK * 2) continue;

        const rRecords = rs.indices.map(ri => records[ri]);
        const tTxns = ts.indices.map(ti => txns[ti]);
        const textSig = Math.max(...rRecords.flatMap(r =>
          tTxns.map(t => crossFieldTextScore(r.contact, r.reference, r.description, t.contact, t.reference))));
        const minDaysDiff = Math.min(...rRecords.flatMap(r =>
          tTxns.map(t => Math.abs(r.day - t.day))));
        const dateSig = dateScore(minDaysDiff);
        const typeSig = typeScore('N:M', totalSize);
        let score = compositeScore(textSig, dateSig, typeSig);
        if (isFxGroup) score = Math.max(0, score - FX_PENALTY);

        if (score >= MIN_FUZZY_SCORE && (!bestMatch || score > bestMatch.score)) {
          bestMatch = { rSet: rs.indices, tSet: ts.indices, rSum: rs.sum, tSum: ts.sum, score };
        }
      }
    }

    if (bestMatch) {
      // Verify all items still available
      if (bestMatch.rSet.some(ri => !recordPool.has(ri))) continue;
      if (bestMatch.tSet.some(ti => !txnPool.has(ti))) continue;

      for (const ri of bestMatch.rSet) recordPool.delete(ri);
      for (const ti of bestMatch.tSet) txnPool.delete(ti);

      const rRecords = bestMatch.rSet.map(ri => records[ri]);
      const tTxns = bestMatch.tSet.map(ti => txns[ti]);
      const bankTotal = round2(rRecords.reduce((s, r) => s + r.originalAmount, 0));
      const txnTotal = round2(tTxns.reduce((s, t) => s + t.signedAmount, 0));
      const textSig = Math.max(...rRecords.flatMap(r =>
        tTxns.map(t => crossFieldTextScore(r.contact, r.reference, r.description, t.contact, t.reference))));
      const minDaysDiff = Math.min(...rRecords.flatMap(r =>
        tTxns.map(t => Math.abs(r.day - t.day))));
      const dateSig = dateScore(minDaysDiff);
      const totalSize = rRecords.length + tTxns.length;
      const typeSig = typeScore('N:M', totalSize);
      let score = compositeScore(textSig, dateSig, typeSig);
      if (isFxGroup) score = Math.max(0, score - FX_PENALTY);
      const confidence = scoreToConfidence(score);

      matches.push({
        matchType: 'N:M',
        confidence,
        score: round2Sig(score),
        bankRecords: rRecords.map(r => ({ id: r.id, amount: r.originalAmount, date: r.date })),
        transactions: tTxns.map(t => ({ id: t.id, amount: t.originalAmount, date: t.date })),
        bankTotal,
        transactionTotal: txnTotal,
        variance: round2(bankTotal - txnTotal),
        signals: { text: round2Sig(textSig), date: round2Sig(dateSig), type: round2Sig(typeSig) },
        reason: `${rRecords.length} records + ${tTxns.length} transactions cross-match within contact group (${confidence} confidence)`,
      });
      phase5Count++;
    }
  }

  workingsLines.push(`Phase 5 (N:M): ${phase5Count} matches`);
  timing.phase5Ms = performance.now() - t0;

  // ── Assemble result ───────────────────────────────────────

  // Sort matches: exact first, then by score descending
  matches.sort((a, b) => {
    if (a.confidence === 'exact' && b.confidence !== 'exact') return -1;
    if (b.confidence === 'exact' && a.confidence !== 'exact') return 1;
    return b.score - a.score;
  });

  const unmatchedRecords = [...recordPool].map(ri => input.bankRecords[ri]);
  const unmatchedTransactions = [...txnPool].map(ti => input.transactions[ti]);

  // Counts by type
  let matched1to1 = 0, matchedNto1 = 0, matched1toN = 0, matchedNtoM = 0;
  let totalMatchedAmount = 0;
  for (const m of matches) {
    switch (m.matchType) {
      case '1:1': matched1to1++; break;
      case 'N:1': matchedNto1++; break;
      case '1:N': matched1toN++; break;
      case 'N:M': matchedNtoM++; break;
    }
    totalMatchedAmount += Math.abs(m.bankTotal);
  }

  const totalRecords = input.bankRecords.length;
  const totalTransactions = input.transactions.length;
  const matchedRecordCount = totalRecords - unmatchedRecords.length;
  const totalUnmatchedAmount = round2(unmatchedRecords.reduce((s, r) => s + Math.abs(r.amount), 0));

  timing.totalMs = performance.now() - totalStart;

  // Build workings string
  workingsLines.unshift(`Bank Match Workings — ${totalRecords} records × ${totalTransactions} transactions`);
  workingsLines.push(`Total: ${matches.length} match proposals (${matchedRecordCount}/${totalRecords} records matched = ${totalRecords > 0 ? Math.round(matchedRecordCount / totalRecords * 100) : 0}%)`);
  workingsLines.push(`Timing: ${timing.totalMs.toFixed(1)}ms total (P0: ${timing.phase0Ms.toFixed(1)}, P1: ${timing.phase1Ms.toFixed(1)}, P2: ${timing.phase2Ms.toFixed(1)}, P3: ${timing.phase3Ms.toFixed(1)}, P4: ${timing.phase4Ms.toFixed(1)}, P5: ${timing.phase5Ms.toFixed(1)})`);

  return {
    type: 'bank-match',
    currency,
    inputs: {
      recordCount: totalRecords,
      transactionCount: totalTransactions,
      tolerance,
      dateWindowDays,
      maxGroupSize: maxK,
    },
    matches,
    unmatchedRecords,
    unmatchedTransactions,
    summary: {
      totalRecords,
      totalTransactions,
      matched1to1,
      matchedNto1,
      matched1toN,
      matchedNtoM,
      unmatchedRecordCount: unmatchedRecords.length,
      unmatchedTransactionCount: unmatchedTransactions.length,
      matchRate: totalRecords > 0 ? round2(matchedRecordCount / totalRecords * 100) : 0,
      totalMatchedAmount: round2(totalMatchedAmount),
      totalUnmatchedAmount,
    },
    timing,
    workings: workingsLines.join('\n'),
  };
}

// ── Helpers ─────────────────────────────────────────────────

/** Round score to 2 significant figures. */
function round2Sig(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Build human-readable reason for a fuzzy 1:1 match. */
function buildReason(matchType: string, confidence: MatchConfidence, p: { text: number; date: number; isFx: boolean }): string {
  const parts: string[] = [];
  if (p.text >= 0.85) parts.push('strong text match');
  else if (p.text >= 0.50) parts.push('partial text match');
  if (p.date >= 0.80) parts.push('close date');
  else if (p.date >= 0.50) parts.push('within date window');
  if (p.isFx) parts.push('cross-currency');
  return parts.length > 0
    ? `Fuzzy 1:1 — ${parts.join(', ')} (${confidence})`
    : `Fuzzy 1:1 — amount within tolerance (${confidence})`;
}

/** Enumerate all subsets of size 1..maxK from an index array, returning sums in cents. */
function enumerateSubsets(
  indices: number[],
  maxK: number,
  items: (NormalizedRecord | NormalizedTxn)[],
  _type: 'record' | 'txn',
): { indices: number[]; sum: number }[] {
  const results: { indices: number[]; sum: number }[] = [];
  const n = indices.length;
  const limit = Math.min(maxK, n);

  function dfs(start: number, current: number[], sum: number): void {
    if (current.length > 0) {
      results.push({ indices: [...current], sum });
    }
    if (current.length >= limit) return;
    for (let i = start; i < n; i++) {
      current.push(indices[i]);
      dfs(i + 1, current, sum + items[indices[i]].cents);
      current.pop();
    }
  }

  dfs(0, [], 0);
  return results;
}
