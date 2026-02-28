/**
 * GST/VAT Filing Preparation blueprint generator.
 * Produces a structured JobBlueprint for quarterly GST/VAT return preparation —
 * no actual API calls, just an actionable checklist for accountants.
 */

import type { JobBlueprint, JobPhase } from '../types.js';
import { buildSummary } from '../types.js';
import { parseQuarterPeriod } from '../validate.js';

export interface GstVatOptions {
  /** Quarter period (YYYY-QN, e.g., 2025-Q1). Required. */
  period: string;
  /** Reporting currency (e.g., SGD, PHP). */
  currency?: string;
}

export function generateGstVatBlueprint(opts: GstVatOptions): JobBlueprint {
  const qp = parseQuarterPeriod(opts.period);
  const currency = opts.currency ?? 'SGD';

  // Phase 1: Generate Tax Ledger
  const generateLedger: JobPhase = {
    name: 'Generate Tax Ledger',
    description: `Generate the tax ledger for ${qp.label} to identify all taxable transactions.`,
    steps: [
      {
        order: 1,
        description: `Generate tax ledger for ${qp.label}`,
        category: 'report',
        apiCall: 'POST /generate-reports/vat-ledger',
        apiBody: {
          startDate: qp.startDate,
          endDate: qp.endDate,
        },
        verification: 'Tax ledger generated — review total output tax and input tax',
      },
      {
        order: 2,
        description: 'Export tax ledger for offline review',
        category: 'export',
        apiCall: 'POST /data-exports/vat-ledger',
        apiBody: {
          startDate: qp.startDate,
          endDate: qp.endDate,
        },
        notes: 'Optional — export for working paper or external review',
      },
    ],
  };

  // Phase 2: Review Output Tax (Sales)
  const reviewOutputTax: JobPhase = {
    name: 'Review Output Tax',
    description: 'Cross-reference invoices against tax ledger to verify output tax completeness.',
    steps: [
      {
        order: 3,
        description: 'Cross-reference invoices with tax ledger entries',
        category: 'verify',
        apiCall: 'POST /invoices/search',
        apiBody: {
          filter: {
            dateFrom: qp.startDate,
            dateTo: qp.endDate,
            status: ['UNPAID', 'PAID'],
          },
        },
        verification: 'Every taxable invoice should appear in the tax ledger with correct tax code',
        notes: 'Check for invoices missing tax profiles or using incorrect rates',
      },
      {
        order: 4,
        description: 'Check for missing or incorrect tax profiles on invoices',
        category: 'verify',
        apiCall: 'POST /invoices/search',
        apiBody: {
          filter: {
            dateFrom: qp.startDate,
            dateTo: qp.endDate,
          },
        },
        notes: 'Look for zero-rated, exempt, or out-of-scope transactions that may be miscategorized',
        verification: 'All invoices have appropriate tax profiles assigned',
      },
    ],
  };

  // Phase 3: Review Input Tax (Purchases)
  const reviewInputTax: JobPhase = {
    name: 'Review Input Tax',
    description: 'Cross-reference bills against tax ledger to verify input tax claims.',
    steps: [
      {
        order: 5,
        description: 'Cross-reference bills with tax ledger entries',
        category: 'verify',
        apiCall: 'POST /bills/search',
        apiBody: {
          filter: {
            dateFrom: qp.startDate,
            dateTo: qp.endDate,
            status: ['UNPAID', 'PAID'],
          },
        },
        verification: 'Every claimable bill should appear in the tax ledger with correct input tax',
        notes: 'Ensure supplier tax invoice numbers are recorded for audit trail',
      },
      {
        order: 6,
        description: 'Identify blocked input tax claims',
        category: 'review',
        notes: 'Review expenses that are non-claimable under local GST/VAT rules (e.g., entertainment, motor vehicles, medical). These should be coded to a non-claimable tax profile.',
        verification: 'Blocked input tax items correctly excluded from claimable total',
      },
    ],
  };

  // Phase 4: Error Checks
  const errorChecks: JobPhase = {
    name: 'Error Checks',
    description: 'Run common GST/VAT error checks before filing.',
    steps: [
      {
        order: 7,
        description: 'Review common GST/VAT errors',
        category: 'review',
        notes: [
          'Check for: (1) transactions with wrong tax period,',
          '(2) reverse charge not applied on imported services,',
          '(3) credit notes not linked to original invoices,',
          '(4) inter-company transactions missing tax,',
          '(5) capital goods above threshold without separate declaration',
        ].join(' '),
        verification: 'All common error patterns reviewed and resolved',
      },
    ],
  };

  // Phase 5: GST Return Summary
  const returnSummary: JobPhase = {
    name: 'GST Return Summary',
    description: 'Compile the GST F5 return boxes and generate supporting reports.',
    steps: [
      {
        order: 8,
        description: 'Compile F5 box mapping (Boxes 1-16)',
        category: 'report',
        notes: [
          'Box 1: Total value of standard-rated supplies,',
          'Box 2: Total value of zero-rated supplies,',
          'Box 3: Total value of exempt supplies,',
          'Box 5: Total value of taxable purchases,',
          'Box 6: Output tax due,',
          'Box 7: Input tax and refunds claimed,',
          'Box 8: Net GST payable/refundable',
        ].join(' '),
        verification: 'F5 boxes balance: Box 6 - Box 7 = Box 8',
      },
      {
        order: 9,
        description: 'Generate supporting reports for filing',
        category: 'report',
        apiCall: 'POST /generate-reports/profit-and-loss',
        apiBody: {
          primarySnapshotDate: qp.endDate,
          secondarySnapshotDate: qp.startDate,
        },
        notes: 'P&L cross-check: revenue should tie to output tax base, expenses to input tax base',
        verification: 'Supporting reports consistent with GST return numbers',
      },
    ],
  };

  // Phase 6: Export & File
  const exportAndFile: JobPhase = {
    name: 'Export & File',
    description: 'Export the final tax ledger and prepare for e-filing.',
    steps: [
      {
        order: 10,
        description: 'Export final tax ledger for submission',
        category: 'export',
        apiCall: 'POST /data-exports/vat-ledger',
        apiBody: {
          startDate: qp.startDate,
          endDate: qp.endDate,
        },
        notes: 'Export tax ledger as CSV/PDF for IRAS e-filing or manual submission. Archive working papers.',
        verification: 'Tax ledger exported and filed. Filing deadline noted.',
      },
    ],
  };

  const phases = [generateLedger, reviewOutputTax, reviewInputTax, errorChecks, returnSummary, exportAndFile];

  return {
    jobType: 'gst-vat-filing',
    period: qp.label,
    currency,
    mode: 'standalone',
    phases,
    summary: buildSummary(phases),
  };
}
