/**
 * Bank Reconciliation blueprint generator.
 * Produces a structured JobBlueprint describing the bank recon workflow —
 * no actual API calls, just an actionable checklist for accountants.
 */

import type { JobBlueprint, JobPhase } from '../types.js';
import { buildSummary } from '../types.js';
import { parseMonthPeriod } from '../validate.js';

export interface BankReconOptions {
  /** Specific bank account name or resourceId to reconcile. */
  account?: string;
  /** Optional period filter (YYYY-MM) for restricting valueDate. */
  period?: string;
  /** Reporting currency (e.g., SGD, PHP). */
  currency?: string;
}

export function generateBankReconBlueprint(opts: BankReconOptions = {}): JobBlueprint {
  const currency = opts.currency ?? 'SGD';
  const period = opts.period ?? 'current';

  const accountFilter = opts.account
    ? { accountName: opts.account }
    : {};

  const periodFilter = opts.period
    ? (() => {
        const mp = parseMonthPeriod(opts.period);
        return { valueDateFrom: mp.startDate, valueDateTo: mp.endDate };
      })()
    : {};

  // Phase 1: Identify bank accounts
  const identify: JobPhase = {
    name: 'Identify Bank Accounts',
    description: 'List all bank accounts in the chart of accounts.',
    steps: [
      {
        order: 1,
        description: 'List bank accounts from chart of accounts',
        category: 'verify',
        apiCall: 'POST /chart-of-accounts/search',
        apiBody: {
          filter: {
            classificationType: 'Bank Accounts',
            ...accountFilter,
          },
        },
        notes: opts.account
          ? `Filtered to account: ${opts.account}`
          : 'Returns all bank accounts — pick which to reconcile',
      },
    ],
  };

  // Phase 2: Pull unreconciled records
  const pullUnreconciled: JobPhase = {
    name: 'Pull Unreconciled Records',
    description: 'Retrieve all unreconciled bank records and check for duplicates.',
    steps: [
      {
        order: 2,
        description: 'Search unreconciled bank records',
        category: 'verify',
        apiCall: 'POST /bank-records/search',
        apiBody: {
          filter: {
            reconciliationStatus: 'UNRECONCILED',
            ...accountFilter,
            ...periodFilter,
          },
        },
        verification: 'Note total count and amount of unreconciled items',
      },
      {
        order: 3,
        description: 'Check for duplicate bank records',
        category: 'verify',
        apiCall: 'POST /bank-records/search',
        apiBody: {
          filter: {
            reconciliationStatus: 'UNRECONCILED',
            ...accountFilter,
          },
        },
        notes: 'Compare reference numbers, amounts, and dates to identify duplicates',
        verification: 'Flag any records with matching amount + date + reference',
      },
    ],
  };

  // Phase 3: Resolve unreconciled items
  const resolve: JobPhase = {
    name: 'Resolve Unreconciled Items',
    description: 'Match, create, or flag each unreconciled bank record.',
    steps: [
      {
        order: 4,
        description: 'Match bank records to existing transactions',
        category: 'resolve',
        apiCall: 'POST /bank-records/{id}/reconcile',
        notes: 'Match by reference, amount, and date against open invoices/bills/journals',
        recipeRef: 'bank-reconciliation',
      },
      {
        order: 5,
        description: 'Create transactions from bank statement (Jaz Magic)',
        category: 'resolve',
        apiCall: 'POST /bank-records/import-from-attachment',
        apiBody: {
          sourceType: 'FILE',
          businessTransactionType: 'BANK_STATEMENT',
        },
        notes: 'Import CSV/OFX files — uses sourceFile, accountResourceId fields',
      },
      {
        order: 6,
        description: 'Create cash receipt/payment journals for unmatched items',
        category: 'resolve',
        apiCall: 'POST /journals',
        recipeRef: 'cash-receipt',
        notes: 'For bank records with no matching transaction — create cash journal entries',
      },
      {
        order: 7,
        description: 'Flag remaining items for investigation',
        category: 'review',
        notes: 'Items that cannot be matched or journaled need manual investigation — document reason for each',
        verification: 'All unreconciled items should be resolved or flagged',
      },
    ],
  };

  // Phase 4: Verification
  const verification: JobPhase = {
    name: 'Verification',
    description: 'Confirm reconciliation is complete and bank balances agree.',
    steps: [
      {
        order: 8,
        description: 'Re-check unreconciled count',
        category: 'verify',
        apiCall: 'POST /bank-records/search',
        apiBody: {
          filter: {
            reconciliationStatus: 'UNRECONCILED',
            ...accountFilter,
          },
        },
        verification: 'Unreconciled count should be zero (or only flagged items remain)',
      },
      {
        order: 9,
        description: 'Review bank balance summary',
        category: 'verify',
        apiCall: 'POST /generate-reports/trial-balance',
        notes: 'Compare GL bank balance to bank statement closing balance',
        verification: 'GL balance must equal bank statement balance after reconciling items',
      },
      {
        order: 10,
        description: 'Generate reconciliation report',
        category: 'report',
        apiCall: 'POST /generate-reports/trial-balance',
        notes: 'Document: opening balance, reconciled items, outstanding items, closing balance',
        verification: 'Reconciliation report balances and is saved for audit trail',
      },
    ],
  };

  const phases = [identify, pullUnreconciled, resolve, verification];

  return {
    jobType: 'bank-recon',
    period,
    currency,
    mode: 'standalone',
    phases,
    summary: buildSummary(phases),
  };
}
