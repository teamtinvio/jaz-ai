/**
 * Month-end close blueprint generator.
 * Produces a phased checklist with API calls, recipe references, and calc
 * commands populated with the correct dates for the given period.
 */

import { parseMonthPeriod } from '../validate.js';
import type { JobBlueprint, JobPhase, JobStep } from '../types.js';
import { buildSummary } from '../types.js';

export interface MonthEndOptions {
  period: string;
  currency?: string;
}

/**
 * Compute the prior month's start and end dates from a YYYY-MM period.
 * Rolls back to December of the prior year when month is January.
 */
function priorMonthDates(year: number, month: number): { start: string; end: string } {
  let pYear = year;
  let pMonth = month - 1;
  if (pMonth < 1) {
    pMonth = 12;
    pYear -= 1;
  }
  const endDay = new Date(pYear, pMonth, 0).getDate();
  const fmt = (y: number, m: number, d: number) =>
    `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  return { start: fmt(pYear, pMonth, 1), end: fmt(pYear, pMonth, endDay) };
}

/**
 * Build the five standard month-end close phases.
 * Exposed for reuse by quarter-end and year-end generators.
 */
export function buildMonthEndPhases(
  startDate: string,
  endDate: string,
  year: number,
  month: number,
  phasePrefix?: string,
): JobPhase[] {
  const pfx = phasePrefix ? `${phasePrefix} — ` : '';
  const prior = priorMonthDates(year, month);

  let order = 0;
  const step = (
    partial: Omit<JobStep, 'order'>,
  ): JobStep => ({ order: ++order, ...partial });

  // Phase 1 — Pre-Close Preparation
  const preClose: JobPhase = {
    name: `${pfx}Phase 1: Pre-Close Preparation`,
    description: 'Verify completeness of source data before making adjustments.',
    steps: [
      step({
        description: 'Verify all invoices entered for the period',
        category: 'verify',
        apiCall: 'POST /invoices/search',
        apiBody: {
          filter: {
            valueDate: { from: startDate, to: endDate },
          },
        },
        verification: 'Cross-check count with source documents',
      }),
      step({
        description: 'Verify all bills entered for the period',
        category: 'verify',
        apiCall: 'POST /bills/search',
        apiBody: {
          filter: {
            valueDate: { from: startDate, to: endDate },
          },
        },
        verification: 'Cross-check count with supplier invoices received',
      }),
      step({
        description: 'Complete bank reconciliation',
        category: 'verify',
        apiCall: 'POST /bank-records/{accountResourceId}/search',
        apiBody: {
          filter: { reconciliationStatus: 'UNRECONCILED' },
        },
        verification: 'Zero unreconciled items for the period',
        notes: 'Repeat for each bank account',
      }),
      step({
        description: 'Review AR aging report',
        category: 'verify',
        apiCall: 'POST /generate-reports/ar-report',
        apiBody: { endDate },
        verification: 'Flag overdue balances > 90 days',
      }),
      step({
        description: 'Review AP aging report',
        category: 'verify',
        apiCall: 'POST /generate-reports/ap-report',
        apiBody: { endDate },
        verification: 'Ensure no missed supplier payments',
      }),
    ],
  };

  // Phase 2 — Accruals & Adjustments
  const accruals: JobPhase = {
    name: `${pfx}Phase 2: Accruals & Adjustments`,
    description: 'Record accruals, amortizations, and depreciation for the period.',
    steps: [
      step({
        description: 'Record accrued expenses',
        category: 'accrue',
        apiCall: 'POST /journals',
        recipeRef: 'accrued-expenses',
        conditional: 'If unbilled expenses exist',
        notes: 'Reverse in the following period',
      }),
      step({
        description: 'Amortize prepaid expenses',
        category: 'accrue',
        apiCall: 'POST /journals/search',
        recipeRef: 'prepaid-amortization',
        calcCommand: 'clio calc prepaid-expense',
        conditional: 'If prepaid capsules exist',
        verification: 'Prepaid balance matches remaining schedule',
      }),
      step({
        description: 'Recognize deferred revenue',
        category: 'accrue',
        recipeRef: 'deferred-revenue',
        calcCommand: 'clio calc deferred-revenue',
        conditional: 'If deferred revenue exists',
        verification: 'Deferred revenue balance matches remaining obligation',
      }),
      step({
        description: 'Record depreciation for the period',
        category: 'accrue',
        recipeRef: 'declining-balance',
        calcCommand: 'clio calc depreciation',
        conditional: 'If fixed assets exist',
        verification: 'Accumulated depreciation matches schedule',
      }),
      step({
        description: 'Accrue employee benefits (leave, CPF)',
        category: 'accrue',
        recipeRef: 'employee-accruals',
        conditional: 'If tracking leave or benefit obligations',
      }),
      step({
        description: 'Accrue loan interest for the period',
        category: 'accrue',
        recipeRef: 'bank-loan',
        calcCommand: 'clio calc loan',
        conditional: 'If active loans',
        verification: 'Interest accrual matches amortization schedule',
      }),
    ],
  };

  // Phase 3 — Period-End Valuations
  const valuations: JobPhase = {
    name: `${pfx}Phase 3: Period-End Valuations`,
    description: 'Revalue balances to reflect period-end rates and provisions.',
    steps: [
      step({
        description: 'FX revaluation of foreign currency balances',
        category: 'value',
        recipeRef: 'fx-revaluation',
        calcCommand: 'clio calc fx-reval',
        conditional: 'If multi-currency org',
        verification: 'Unrealised gain/loss posted to P&L',
      }),
      step({
        description: 'Bad debt provision (ECL assessment)',
        category: 'value',
        recipeRef: 'bad-debt-provision',
        calcCommand: 'clio calc ecl',
        conditional: 'If material AR balance change',
        verification: 'Provision balance reflects current ECL estimate',
      }),
    ],
  };

  // Phase 4 — Verification
  const verification: JobPhase = {
    name: `${pfx}Phase 4: Verification`,
    description: 'Generate financial reports and compare to prior period.',
    steps: [
      step({
        description: 'Review trial balance',
        category: 'report',
        apiCall: 'POST /generate-reports/trial-balance',
        apiBody: { startDate, endDate },
        verification: 'Total debits equal total credits',
      }),
      step({
        description: 'Generate profit & loss statement',
        category: 'report',
        apiCall: 'POST /generate-reports/profit-and-loss',
        apiBody: { primarySnapshotDate: endDate, secondarySnapshotDate: startDate },
      }),
      step({
        description: 'Generate balance sheet',
        category: 'report',
        apiCall: 'POST /generate-reports/balance-sheet',
        apiBody: { primarySnapshotDate: endDate },
        verification: 'Assets = Liabilities + Equity',
      }),
      step({
        description: 'Compare P&L to prior month',
        category: 'report',
        apiCall: 'POST /generate-reports/profit-and-loss',
        apiBody: {
          primarySnapshotDate: endDate,
          secondarySnapshotDate: prior.start,
        },
        notes: `Prior month: ${prior.start} to ${prior.end}`,
        verification: 'Investigate material variances (> 10%)',
      }),
    ],
  };

  // Phase 5 — Close & Lock
  const closeLock: JobPhase = {
    name: `${pfx}Phase 5: Close & Lock`,
    description: 'Lock the period to prevent further changes.',
    steps: [
      step({
        description: `Set accounting lock date to ${endDate}`,
        category: 'lock',
        notes:
          'Navigate to Settings > General > Lock Date and move it forward to ' +
          `${endDate}. This prevents any transactions from being posted to this period.`,
      }),
    ],
  };

  return [preClose, accruals, valuations, verification, closeLock];
}

/**
 * Generate a month-end close blueprint for a given period.
 *
 * @param opts.period - Month in YYYY-MM format (e.g. "2025-01")
 * @param opts.currency - Optional base currency code (e.g. "SGD")
 */
export function generateMonthEndBlueprint(opts: MonthEndOptions): JobBlueprint {
  const parsed = parseMonthPeriod(opts.period);
  const phases = buildMonthEndPhases(
    parsed.startDate,
    parsed.endDate,
    parsed.year,
    parsed.month,
  );

  return {
    jobType: 'month-end-close',
    period: parsed.label,
    currency: opts.currency ?? 'SGD',
    mode: 'standalone',
    phases,
    summary: buildSummary(phases),
  };
}
