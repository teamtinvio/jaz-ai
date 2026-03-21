/**
 * Supplier Reconciliation blueprint generator.
 * Produces a structured JobBlueprint for reconciling supplier statements —
 * no actual API calls, just an actionable checklist for accountants.
 */

import type { JobBlueprint, JobPhase } from '../types.js';
import { buildSummary } from '../types.js';
import { parseMonthPeriod } from '../validate.js';

export interface SupplierReconOptions {
  /** Specific supplier name or resourceId to reconcile. */
  supplier?: string;
  /** Optional period filter (YYYY-MM). */
  period?: string;
  /** Reporting currency (e.g., SGD, PHP). */
  currency?: string;
}

export function generateSupplierReconBlueprint(opts: SupplierReconOptions = {}): JobBlueprint {
  const currency = opts.currency ?? 'SGD';
  const period = opts.period ?? 'current';

  const supplierFilter = opts.supplier
    ? { supplierName: opts.supplier }
    : {};

  const periodFilter = opts.period
    ? (() => {
        const mp = parseMonthPeriod(opts.period);
        return { dateFrom: mp.startDate, dateTo: mp.endDate };
      })()
    : {};

  // Phase 1: Pull AP Data
  const pullApData: JobPhase = {
    name: 'Pull AP Data',
    description: 'Generate AP aging and pull bills for the supplier.',
    steps: [
      {
        order: 1,
        description: 'Generate AP aging report',
        category: 'report',
        apiCall: 'POST /generate-reports/ap-report',
        notes: opts.supplier
          ? `Filtered to supplier: ${opts.supplier}`
          : 'Full AP aging — filter to target supplier(s) for comparison',
        verification: 'AP aging total for supplier noted as starting reference',
      },
      {
        order: 2,
        description: 'List all bills for the supplier',
        category: 'verify',
        apiCall: 'POST /bills/search',
        apiBody: {
          filter: {
            ...supplierFilter,
            ...periodFilter,
          },
        },
        notes: 'Include all statuses (DRAFT, UNPAID, PAID) for complete picture',
        verification: 'Bill list pulled — note total count and amounts',
      },
    ],
  };

  // Phase 2: Compare Against Supplier Statement
  const compare: JobPhase = {
    name: 'Compare Against Supplier Statement',
    description: 'Match internal records against the supplier statement to identify discrepancies.',
    steps: [
      {
        order: 3,
        description: 'Match bills against supplier statement line items',
        category: 'verify',
        notes: [
          'Compare each supplier statement line to internal bills by:',
          '(1) invoice/reference number, (2) amount, (3) date.',
          'Mark items as matched, missing internally, or missing on statement.',
        ].join(' '),
        verification: 'Every statement line has been compared to internal records',
      },
      {
        order: 4,
        description: 'Identify and document mismatches',
        category: 'review',
        notes: [
          'Common mismatch types:',
          '(a) Bill in books but not on statement — timing difference or supplier error,',
          '(b) On statement but not in books — missing bill, needs to be entered,',
          '(c) Amount difference — pricing dispute, currency conversion, or data entry error,',
          '(d) Payment not reflected — check payment clearing dates.',
        ].join(' '),
        verification: 'All mismatches documented with root cause and proposed resolution',
      },
    ],
  };

  // Phase 3: Resolve Discrepancies
  const resolve: JobPhase = {
    name: 'Resolve Discrepancies',
    description: 'Create missing bills and record adjustments to align balances.',
    steps: [
      {
        order: 5,
        description: 'Create missing bills from supplier statement',
        category: 'resolve',
        apiCall: 'POST /bills',
        recipeRef: 'standard-bill',
        notes: 'For items on supplier statement but missing from books — create and approve the bill. Attach supplier invoice as supporting document.',
        verification: 'All missing bills created and approved',
      },
      {
        order: 6,
        description: 'Record adjustments for amount differences',
        category: 'adjust',
        apiCall: 'POST /journals',
        notes: 'For amount mismatches — create adjustment journals (e.g., price adjustments, rounding differences). For disputed amounts, create debit notes via POST /bills/credit-notes.',
        verification: 'All adjustments journaled, disputed amounts documented',
      },
    ],
  };

  // Phase 4: Verification
  const verification: JobPhase = {
    name: 'Verification',
    description: 'Confirm AP balance now matches supplier statement.',
    steps: [
      {
        order: 7,
        description: 'Re-check AP aging for supplier after resolution',
        category: 'verify',
        apiCall: 'POST /generate-reports/ap-report',
        notes: opts.supplier
          ? `Verify ${opts.supplier} balance matches their statement closing balance`
          : 'Verify each reconciled supplier balance matches their statement',
        verification: 'AP balance per books agrees with supplier statement balance. Any remaining differences are documented and accepted.',
      },
    ],
  };

  const phases = [pullApData, compare, resolve, verification];

  return {
    jobType: 'supplier-recon',
    period,
    currency,
    mode: 'standalone',
    phases,
    summary: buildSummary(phases),
  };
}
