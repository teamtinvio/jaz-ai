/**
 * Quarter-end close blueprint generator.
 * Builds on month-end phases with additional quarterly review steps.
 * Supports standalone (full) and incremental (quarterly extras only) modes.
 */

import { parseQuarterPeriod } from '../validate.js';
import { buildMonthEndPhases } from '../month-end/blueprint.js';
import type { JobBlueprint, JobPhase, JobStep } from '../types.js';
import { buildSummary } from '../types.js';

export interface QuarterEndOptions {
  period: string;
  currency?: string;
  incremental?: boolean;
}

/**
 * Build the quarterly extras phase (Phase 6).
 * These steps only apply at quarter boundaries, beyond normal month-end work.
 */
function buildQuarterlyExtrasPhase(
  startDate: string,
  endDate: string,
  startOrder: number,
): JobPhase {
  let order = startOrder;
  const step = (partial: Omit<JobStep, 'order'>): JobStep => ({
    order: ++order,
    ...partial,
  });

  return {
    name: 'Phase 6: Quarterly Extras',
    description: 'Additional reviews and filings required at quarter boundaries.',
    steps: [
      step({
        description: 'GST/VAT filing preparation',
        category: 'report',
        apiCall: 'POST /generate-reports/vat-ledger',
        apiBody: { startDate, endDate },
        conditional: 'If GST-registered',
        verification: 'Output tax minus input tax matches F5/F7 boxes',
      }),
      step({
        description: 'ECL / bad debt provision formal review',
        category: 'value',
        recipeRef: 'bad-debt-provision',
        calcCommand: 'clio calc ecl',
        verification: 'Provision movement disclosed in notes',
      }),
      step({
        description: 'Bonus accrual true-up',
        category: 'accrue',
        recipeRef: 'employee-accruals',
        conditional: 'If bonus schemes exist',
        notes: 'Adjust accrual to reflect year-to-date actual performance vs. budget',
      }),
      step({
        description: 'Intercompany reconciliation',
        category: 'verify',
        recipeRef: 'intercompany',
        conditional: 'If multi-entity',
        verification: 'Intercompany balances net to zero across all entities',
      }),
      step({
        description: 'Provision unwinding (IAS 37 / FRS 37)',
        category: 'value',
        recipeRef: 'provisions',
        calcCommand: 'clio calc provision',
        conditional: 'If IAS 37 provisions exist',
        notes: 'Unwind discount on non-current provisions',
      }),
    ],
  };
}

/**
 * Build the quarterly verification phase (Phase 7).
 * Full-quarter financial reports for consolidated review.
 */
function buildQuarterlyVerificationPhase(
  startDate: string,
  endDate: string,
  label: string,
  startOrder: number,
): JobPhase {
  let order = startOrder;
  const step = (partial: Omit<JobStep, 'order'>): JobStep => ({
    order: ++order,
    ...partial,
  });

  return {
    name: 'Phase 7: Quarterly Verification',
    description: `Full-quarter financial report review for ${label}.`,
    steps: [
      step({
        description: `Review trial balance for ${label}`,
        category: 'report',
        apiCall: 'POST /generate-reports/trial-balance',
        apiBody: { startDate, endDate },
        verification: 'Total debits equal total credits',
      }),
      step({
        description: `Generate P&L for ${label}`,
        category: 'report',
        apiCall: 'POST /generate-reports/profit-and-loss',
        apiBody: { primarySnapshotDate: endDate, secondarySnapshotDate: startDate },
      }),
      step({
        description: `Generate balance sheet as at ${endDate}`,
        category: 'report',
        apiCall: 'POST /generate-reports/balance-sheet',
        apiBody: { primarySnapshotDate: endDate },
        verification: 'Assets = Liabilities + Equity',
      }),
    ],
  };
}

/**
 * Generate a quarter-end close blueprint.
 *
 * @param opts.period       Quarter in YYYY-QN format (e.g. "2025-Q1")
 * @param opts.currency     Optional base currency code (e.g. "SGD")
 * @param opts.incremental  If true, generate only the quarterly extras (skip month-end phases)
 */
export function generateQuarterEndBlueprint(opts: QuarterEndOptions): JobBlueprint {
  const parsed = parseQuarterPeriod(opts.period);
  const mode = opts.incremental ? 'incremental' : 'standalone';
  const phases: JobPhase[] = [];

  if (!opts.incremental) {
    // Standalone: include month-end phases for each of the 3 months
    for (const month of parsed.months) {
      const monthPhases = buildMonthEndPhases(
        month.startDate,
        month.endDate,
        month.year,
        month.month,
        month.label,
      );
      phases.push(...monthPhases);
    }
  }

  // Count the highest step order from existing phases
  const maxOrder = phases.reduce(
    (max, phase) =>
      phase.steps.reduce((m, s) => Math.max(m, s.order), max),
    0,
  );

  // Add quarterly extras (Phase 6)
  const extras = buildQuarterlyExtrasPhase(
    parsed.startDate,
    parsed.endDate,
    maxOrder,
  );
  phases.push(extras);

  // Add quarterly verification (Phase 7)
  const lastExtraOrder = extras.steps.reduce(
    (max, s) => Math.max(max, s.order),
    0,
  );
  const verification = buildQuarterlyVerificationPhase(
    parsed.startDate,
    parsed.endDate,
    parsed.label,
    lastExtraOrder,
  );
  phases.push(verification);

  return {
    jobType: 'quarter-end-close',
    period: parsed.label,
    currency: opts.currency ?? 'SGD',
    mode,
    phases,
    summary: buildSummary(phases),
  };
}
