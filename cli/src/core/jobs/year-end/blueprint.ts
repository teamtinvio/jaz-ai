/**
 * Year-end close blueprint generator.
 * Builds on quarter-end phases with additional annual review and audit steps.
 * Supports standalone (full) and incremental (annual extras only) modes.
 */

import { parseYearPeriod } from '../validate.js';
import { generateQuarterEndBlueprint } from '../quarter-end/blueprint.js';
import type { JobBlueprint, JobPhase, JobStep } from '../types.js';
import { buildSummary } from '../types.js';

export interface YearEndOptions {
  period: string;
  currency?: string;
  incremental?: boolean;
}

/**
 * Build the annual extras phase (Phase 8).
 * Year-end only steps: final depreciation, true-ups, dividends, retained
 * earnings rollover, full-year GST reconciliation, audit prep, and final lock.
 */
function buildAnnualExtrasPhase(
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
    name: 'Phase 8: Annual Extras',
    description: 'Year-end specific adjustments, filings, and audit preparation.',
    steps: [
      step({
        description: 'Final depreciation run for all fixed assets',
        category: 'verify',
        recipeRef: 'declining-balance',
        calcCommand: 'clio calc depreciation',
        verification: 'NBV per register matches GL balances',
        notes: 'Reconcile fixed asset register to general ledger',
      }),
      step({
        description: 'Year-end true-ups (leave, bonus, provisions)',
        category: 'adjust',
        recipeRef: 'employee-accruals',
        notes: 'True-up leave accrual to actual entitlement, bonus accrual to board-approved pool, and provision estimates to year-end reassessment',
      }),
      step({
        description: 'Dividend declaration and payment',
        category: 'adjust',
        recipeRef: 'dividend',
        conditional: 'If declaring dividends',
        notes: 'Requires board resolution. Record declaration (DR Retained Earnings, CR Dividends Payable) then payment separately.',
      }),
      step({
        description: 'Retained earnings rollover verification',
        category: 'verify',
        notes: 'Platform-managed. Verify via equity movement report that opening retained earnings equals prior year closing balance plus current year net income.',
      }),
      step({
        description: 'Final GST/VAT reconciliation for the full year',
        category: 'verify',
        apiCall: 'POST /generate-reports/vat-ledger',
        apiBody: { startDate, endDate },
        verification: 'Full-year VAT ledger reconciles to quarterly filings',
        notes: 'Sum of quarterly GST submissions should match full-year ledger totals',
      }),
      step({
        description: 'Audit preparation and documentation',
        category: 'export',
        notes: 'See audit-prep job for full detail. Prepare trial balance, aged schedules, bank confirmations, and supporting journals for auditor.',
      }),
      step({
        description: `Set final lock date to ${endDate}`,
        category: 'lock',
        notes: `Lock the full financial year by setting the accounting lock date to ${endDate}. No further postings to this year after lock.`,
      }),
    ],
  };
}

/**
 * Build the annual verification phase (Phase 9).
 * Full-year financial reports for board and statutory filing.
 */
function buildAnnualVerificationPhase(
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
    name: 'Phase 9: Annual Verification',
    description: `Full-year financial report review for ${label}.`,
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
 * Generate a year-end close blueprint.
 *
 * @param opts.period       Year in YYYY format (e.g. "2025")
 * @param opts.currency     Optional base currency code (e.g. "SGD")
 * @param opts.incremental  If true, generate only the annual extras (skip quarter/month phases)
 */
export function generateYearEndBlueprint(opts: YearEndOptions): JobBlueprint {
  const parsed = parseYearPeriod(opts.period);
  const mode = opts.incremental ? 'incremental' : 'standalone';
  const phases: JobPhase[] = [];

  if (!opts.incremental) {
    // Standalone: include quarter-end phases for each of the 4 quarters
    for (const quarter of parsed.quarters) {
      const qBp = generateQuarterEndBlueprint({
        period: `${parsed.year}-Q${quarter.quarter}`,
        currency: opts.currency,
        incremental: false,
      });
      // Prefix each phase name with the quarter label for clarity
      for (const phase of qBp.phases) {
        if (!phase.name.startsWith(quarter.label)) {
          phase.name = `${quarter.label} — ${phase.name}`;
        }
        phases.push(phase);
      }
    }
  }

  // Count the highest step order from existing phases
  const maxOrder = phases.reduce(
    (max, phase) =>
      phase.steps.reduce((m, s) => Math.max(m, s.order), max),
    0,
  );

  // Add annual extras (Phase 8)
  const extras = buildAnnualExtrasPhase(
    parsed.startDate,
    parsed.endDate,
    maxOrder,
  );
  phases.push(extras);

  // Add annual verification (Phase 9)
  const lastExtraOrder = extras.steps.reduce(
    (max, s) => Math.max(max, s.order),
    0,
  );
  const verification = buildAnnualVerificationPhase(
    parsed.startDate,
    parsed.endDate,
    parsed.label,
    lastExtraOrder,
  );
  phases.push(verification);

  return {
    jobType: 'year-end-close',
    period: parsed.label,
    currency: opts.currency ?? 'SGD',
    mode,
    phases,
    summary: buildSummary(phases),
  };
}
