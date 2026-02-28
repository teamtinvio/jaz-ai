/**
 * Shared types for clio calc financial calculators.
 */

import type { Blueprint } from './blueprint.js';

export type { Blueprint } from './blueprint.js';
export type { BlueprintStep } from './blueprint.js';

export interface JournalLine {
  account: string;
  debit: number;
  credit: number;
}

export interface JournalEntry {
  description: string;
  lines: JournalLine[];
}

// ── Schedule row types ─────────────────────────────────────────

export interface ScheduleRow {
  period: number;
  date: string | null;
  openingBalance: number;
  payment: number;
  interest: number;
  principal: number;
  closingBalance: number;
  journal: JournalEntry;
}

export interface DepreciationRow {
  period: number;
  date: string | null;
  openingBookValue: number;
  ddbAmount: number;
  slAmount: number;
  methodUsed: 'DDB' | 'SL' | '150DB';
  depreciation: number;
  closingBookValue: number;
  journal: JournalEntry;
}

export interface AmortizationRow {
  period: number;
  date: string | null;
  amortized: number;
  remainingBalance: number;
  journal: JournalEntry;
}

export interface EclBucketRow {
  bucket: string;
  balance: number;
  lossRate: number;
  ecl: number;
}

// ── Result types ───────────────────────────────────────────────

export interface LoanResult {
  type: 'loan';
  currency: string | null;
  inputs: {
    principal: number;
    annualRate: number;
    termMonths: number;
    startDate: string | null;
  };
  monthlyPayment: number;
  totalPayments: number;
  totalInterest: number;
  totalPrincipal: number;
  schedule: ScheduleRow[];
  blueprint: Blueprint | null;
}

export interface LeaseResult {
  type: 'lease';
  currency: string | null;
  inputs: {
    monthlyPayment: number;
    termMonths: number;
    annualRate: number;
    usefulLifeMonths: number | null;
    startDate: string | null;
  };
  presentValue: number;
  monthlyRouDepreciation: number;
  depreciationMonths: number;
  isHirePurchase: boolean;
  totalCashPayments: number;
  totalInterest: number;
  totalDepreciation: number;
  initialJournal: JournalEntry;
  schedule: ScheduleRow[];
  blueprint: Blueprint | null;
}

export interface DepreciationResult {
  type: 'depreciation';
  currency: string | null;
  inputs: {
    cost: number;
    salvageValue: number;
    usefulLifeYears: number;
    method: string;
    frequency: 'annual' | 'monthly';
  };
  totalDepreciation: number;
  schedule: DepreciationRow[];
  blueprint: Blueprint | null;
}

export interface PrepaidExpenseResult {
  type: 'prepaid-expense';
  currency: string | null;
  inputs: {
    amount: number;
    periods: number;
    frequency: 'monthly' | 'quarterly';
    startDate: string | null;
  };
  perPeriodAmount: number;
  schedule: AmortizationRow[];
  blueprint: Blueprint | null;
}

export interface DeferredRevenueResult {
  type: 'deferred-revenue';
  currency: string | null;
  inputs: {
    amount: number;
    periods: number;
    frequency: 'monthly' | 'quarterly';
    startDate: string | null;
  };
  perPeriodAmount: number;
  schedule: AmortizationRow[];
  blueprint: Blueprint | null;
}

export interface FxRevalResult {
  type: 'fx-reval';
  currency: string | null;
  inputs: {
    amount: number;
    bookRate: number;
    closingRate: number;
    baseCurrency: string;
  };
  bookValue: number;
  closingValue: number;
  gainOrLoss: number;
  isGain: boolean;
  journal: JournalEntry;
  reversalJournal: JournalEntry;
  blueprint: Blueprint | null;
}

export interface EclResult {
  type: 'ecl';
  currency: string | null;
  inputs: {
    buckets: { name: string; balance: number; rate: number }[];
    existingProvision: number;
  };
  totalReceivables: number;
  totalEcl: number;
  weightedRate: number;
  adjustmentRequired: number;
  isIncrease: boolean;
  bucketDetails: EclBucketRow[];
  journal: JournalEntry;
  blueprint: Blueprint | null;
}

export interface ProvisionResult {
  type: 'provision';
  currency: string | null;
  inputs: {
    amount: number;
    annualRate: number;
    termMonths: number;
    startDate: string | null;
  };
  presentValue: number;
  nominalAmount: number;
  totalUnwinding: number;
  initialJournal: JournalEntry;
  schedule: ScheduleRow[];
  blueprint: Blueprint | null;
}

export interface FixedDepositRow {
  period: number;
  date: string | null;
  openingBalance: number;
  interest: number;
  closingBalance: number;
  journal: JournalEntry;
}

export interface FixedDepositResult {
  type: 'fixed-deposit';
  currency: string | null;
  inputs: {
    principal: number;
    annualRate: number;
    termMonths: number;
    compounding: string;
    startDate: string | null;
  };
  maturityValue: number;
  totalInterest: number;
  effectiveRate: number;
  schedule: FixedDepositRow[];
  placementJournal: JournalEntry;
  maturityJournal: JournalEntry;
  blueprint: Blueprint | null;
}

export interface AssetDisposalResult {
  type: 'asset-disposal';
  currency: string | null;
  inputs: {
    cost: number;
    salvageValue: number;
    usefulLifeYears: number;
    acquisitionDate: string;
    disposalDate: string;
    proceeds: number;
    method: string;
  };
  monthsHeld: number;
  accumulatedDepreciation: number;
  netBookValue: number;
  gainOrLoss: number;
  isGain: boolean;
  disposalJournal: JournalEntry;
  blueprint: Blueprint | null;
}

// ── Accrued expense types ────────────────────────────────────

export interface AccruedExpenseRow {
  period: number;
  date: string | null;
  accrualDate: string | null;
  reversalDate: string | null;
  amount: number;
  accrualJournal: JournalEntry;
  reversalJournal: JournalEntry;
}

export interface AccruedExpenseResult {
  type: 'accrued-expense';
  currency: string | null;
  inputs: {
    amount: number;
    periods: number;
    frequency: 'monthly' | 'quarterly';
    startDate: string | null;
  };
  totalAccruals: number;
  schedule: AccruedExpenseRow[];
  blueprint: Blueprint | null;
}

// ── Leave accrual types ─────────────────────────────────────

export interface LeaveAccrualRow {
  period: number;
  date: string | null;
  accrual: number;
  cumulativeBalance: number;
  journal: JournalEntry;
}

export interface LeaveAccrualResult {
  type: 'leave-accrual';
  currency: string | null;
  inputs: {
    employees: number;
    daysPerYear: number;
    dailyRate: number;
    periods: number;
    startDate: string | null;
  };
  totalAnnualCost: number;
  periodAccrual: number;
  schedule: LeaveAccrualRow[];
  blueprint: Blueprint | null;
}

// ── Dividend types ──────────────────────────────────────────

export interface DividendResult {
  type: 'dividend';
  currency: string | null;
  inputs: {
    amount: number;
    declarationDate: string;
    paymentDate: string;
    withholdingRate: number;
  };
  grossAmount: number;
  netToShareholders: number;
  withholdingTax: number;
  declarationJournal: JournalEntry;
  paymentJournal: JournalEntry;
  withholdingJournal: JournalEntry | null;
  blueprint: Blueprint | null;
}

// ── Bank match types ─────────────────────────────────────────

export type MatchType = '1:1' | 'N:1' | '1:N' | 'N:M';
export type MatchConfidence = 'exact' | 'high' | 'medium' | 'low';

export interface BankRecord {
  id: string;
  amount: number;
  date: string;
  contact?: string;
  reference?: string;
  description?: string;
  currency?: string;
}

export interface CashflowTransaction {
  id: string;
  direction: 'PAYIN' | 'PAYOUT';
  amount: number;
  date: string;
  contact?: string;
  reference?: string;
  type?: string;
  currency?: string;
  crossCurrency?: boolean;
}

export interface BankMatchOptions {
  tolerance?: number;
  dateWindowDays?: number;
  maxGroupSize?: number;
  currency?: string;
  exchangeRates?: Record<string, number>;
  fxTolerancePct?: number;
  findAll?: boolean;
  /** Max DFS nodes per subset-sum search (default 500,000). Higher = more thorough but slower.
   *  Set to 0 for unlimited (not recommended for large datasets). */
  maxDfsNodes?: number;
}

export interface BankMatchInput {
  bankRecords: BankRecord[];
  transactions: CashflowTransaction[];
  options?: BankMatchOptions;
}

export interface MatchProposal {
  matchType: MatchType;
  confidence: MatchConfidence;
  score: number;
  bankRecords: { id: string; amount: number; date: string }[];
  transactions: { id: string; amount: number; date: string }[];
  bankTotal: number;
  transactionTotal: number;
  variance: number;
  fxVariance?: number;
  signals: { text: number; date: number; type: number };
  reason: string;
}

export interface BankMatchResult {
  type: 'bank-match';
  currency: string | null;
  inputs: {
    recordCount: number;
    transactionCount: number;
    tolerance: number;
    dateWindowDays: number;
    maxGroupSize: number;
  };
  matches: MatchProposal[];
  unmatchedRecords: BankRecord[];
  unmatchedTransactions: CashflowTransaction[];
  summary: {
    totalRecords: number;
    totalTransactions: number;
    matched1to1: number;
    matchedNto1: number;
    matched1toN: number;
    matchedNtoM: number;
    unmatchedRecordCount: number;
    unmatchedTransactionCount: number;
    matchRate: number;
    totalMatchedAmount: number;
    totalUnmatchedAmount: number;
  };
  timing: {
    phase0Ms: number;
    phase1Ms: number;
    phase2Ms: number;
    phase3Ms: number;
    phase4Ms: number;
    phase5Ms: number;
    totalMs: number;
  };
  workings: string;
}

export type CalcResult =
  | LoanResult
  | LeaseResult
  | DepreciationResult
  | PrepaidExpenseResult
  | DeferredRevenueResult
  | FxRevalResult
  | EclResult
  | ProvisionResult
  | FixedDepositResult
  | AssetDisposalResult
  | AccruedExpenseResult
  | LeaveAccrualResult
  | DividendResult
  | BankMatchResult;

/**
 * Round to 2 decimal places (cents).
 *
 * Uses Math.round() (asymmetric, rounds 0.5 away from zero). This is the
 * standard JavaScript rounding and works correctly for accounting amounts
 * up to ~$90 trillion (Number.MAX_SAFE_INTEGER / 100). Final-period
 * corrections in each calculator absorb any cumulative drift, ensuring
 * balances always close to exactly $0.00.
 */
export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Advance a date by N months (month-end aware). Returns YYYY-MM-DD string. */
export function addMonths(dateStr: string, months: number): string {
  const parts = dateStr.split('-');
  if (parts.length !== 3) throw new Error(`Invalid date format: ${dateStr}`);
  const [y, m, d] = parts.map(Number);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) {
    throw new Error(`Invalid date: ${dateStr}`);
  }
  const totalMonths = (m - 1) + months;
  const targetYear = y + Math.floor(totalMonths / 12);
  const targetMonth = ((totalMonths % 12) + 12) % 12; // 0-indexed, handles negatives
  const daysInMonth = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
  const clampedDay = Math.min(d, daysInMonth);
  return `${String(targetYear).padStart(4, '0')}-${String(targetMonth + 1).padStart(2, '0')}-${String(clampedDay).padStart(2, '0')}`;
}
