/**
 * Audit Preparation blueprint generator.
 * Produces a structured JobBlueprint for compiling audit-ready financial packs —
 * no actual API calls, just an actionable checklist for accountants.
 */

import type { JobBlueprint, JobPhase } from '../types.js';
import { buildSummary } from '../types.js';
import { parseQuarterPeriod, parseYearPeriod } from '../validate.js';
import type { QuarterPeriod, YearPeriod } from '../validate.js';

export interface AuditPrepOptions {
  /** Period — either YYYY for full year or YYYY-QN for quarter. Required. */
  period: string;
  /** Reporting currency (e.g., SGD, PHP). */
  currency?: string;
}

function parsePeriod(period: string): QuarterPeriod | YearPeriod {
  if (/^\d{4}-Q[1-4]$/i.test(period)) {
    return parseQuarterPeriod(period);
  }
  return parseYearPeriod(period);
}

export function generateAuditPrepBlueprint(opts: AuditPrepOptions): JobBlueprint {
  const p = parsePeriod(opts.period);
  const currency = opts.currency ?? 'SGD';

  // Phase 1: Financial Statements
  const financialStatements: JobPhase = {
    name: 'Financial Statements',
    description: `Generate the core financial statements for ${p.label}.`,
    steps: [
      {
        order: 1,
        description: 'Generate Trial Balance',
        category: 'report',
        apiCall: 'POST /generate-reports/trial-balance',
        apiBody: {
          startDate: p.startDate,
          endDate: p.endDate,
        },
        verification: 'TB balances (total debits = total credits)',
      },
      {
        order: 2,
        description: 'Generate Balance Sheet',
        category: 'report',
        apiCall: 'POST /generate-reports/balance-sheet',
        apiBody: {
          primarySnapshotDate: p.endDate,
        },
        verification: 'Assets = Liabilities + Equity',
      },
      {
        order: 3,
        description: 'Generate Profit & Loss',
        category: 'report',
        apiCall: 'POST /generate-reports/profit-and-loss',
        apiBody: {
          primarySnapshotDate: p.endDate,
          secondarySnapshotDate: p.startDate,
        },
        verification: 'Net profit/loss ties to retained earnings movement on BS',
      },
      {
        order: 4,
        description: 'Generate Cash Flow Statement',
        category: 'report',
        apiCall: 'POST /generate-reports/cashflow',
        apiBody: {
          primaryStartDate: p.startDate,
          primaryEndDate: p.endDate,
        },
        verification: 'Closing cash ties to bank balances on BS',
      },
      {
        order: 5,
        description: 'Generate Statement of Changes in Equity',
        category: 'report',
        apiCall: 'POST /generate-reports/equity-movement',
        apiBody: {
          primarySnapshotStartDate: p.startDate,
          primarySnapshotEndDate: p.endDate,
        },
        verification: 'Closing equity ties to BS equity section',
      },
    ],
  };

  // Phase 2: Supporting Schedules
  const supportingSchedules: JobPhase = {
    name: 'Supporting Schedules',
    description: 'Generate detailed schedules that support the financial statements.',
    steps: [
      {
        order: 6,
        description: 'Generate AR aging schedule',
        category: 'report',
        apiCall: 'POST /generate-reports/ar-report',
        apiBody: {
          endDate: p.endDate,
        },
        verification: 'AR aging total ties to trade receivables on BS',
      },
      {
        order: 7,
        description: 'Generate AP aging schedule',
        category: 'report',
        apiCall: 'POST /generate-reports/ap-report',
        apiBody: {
          endDate: p.endDate,
        },
        verification: 'AP aging total ties to trade payables on BS',
      },
      {
        order: 8,
        description: 'Generate Fixed Asset register',
        category: 'report',
        apiCall: 'POST /generate-reports/fixed-assets-summary',
        apiBody: {
          endDate: p.endDate,
        },
        notes: 'Include cost, accumulated depreciation, and NBV per asset. Should show additions, disposals, and depreciation for the period.',
        verification: 'FA register NBV total ties to property/equipment on BS',
      },
      {
        order: 9,
        description: 'Generate Tax Ledger',
        category: 'report',
        apiCall: 'POST /generate-reports/vat-ledger',
        apiBody: {
          startDate: p.startDate,
          endDate: p.endDate,
        },
        notes: 'Full tax ledger for the audit period — auditors will test-check individual entries',
        verification: 'Tax ledger totals consistent with GST returns filed',
      },
    ],
  };

  // Phase 3: Reconciliations
  const reconciliations: JobPhase = {
    name: 'Reconciliations',
    description: 'Perform key reconciliations for audit evidence.',
    steps: [
      {
        order: 10,
        description: 'Bank reconciliation for all accounts',
        category: 'verify',
        apiCall: 'POST /bank-records/search',
        apiBody: {
          filter: {
            reconciliationStatus: 'UNRECONCILED',
          },
        },
        recipeRef: 'bank-reconciliation',
        notes: 'Reconcile all bank accounts as at period end. Document any reconciling items (outstanding cheques, deposits in transit).',
        verification: 'All bank accounts reconciled — GL balance agrees with bank statements',
      },
      {
        order: 11,
        description: 'Intercompany reconciliation',
        category: 'verify',
        apiCall: 'POST /generate-reports/trial-balance',
        conditional: 'If intercompany transactions exist',
        notes: 'Compare intercompany receivables and payables across entities. Eliminate for consolidated accounts.',
        verification: 'Intercompany balances net to zero across group entities',
      },
      {
        order: 12,
        description: 'Loan schedule reconciliation',
        category: 'verify',
        calcCommand: 'clio calc loan',
        conditional: 'If loan facilities exist',
        notes: 'Compare loan amortization schedule to GL balances. Verify principal, interest, and current/non-current split.',
        verification: 'Loan balances per GL match lender statements and amortization schedule',
      },
    ],
  };

  // Phase 4: Export & Compile
  const exportCompile: JobPhase = {
    name: 'Export & Compile Audit Pack',
    description: 'Export all reports and compile the audit-ready pack.',
    steps: [
      {
        order: 13,
        description: 'Export all data for audit working papers',
        category: 'export',
        notes: [
          'Export the following as CSV/PDF:',
          '(1) Chart of accounts with balances,',
          '(2) General ledger detail for the period,',
          '(3) All reports generated in phases 1-2,',
          '(4) Bank statements and reconciliations,',
          '(5) Supporting invoices/bills for sample testing.',
        ].join(' '),
        verification: 'All data exports completed successfully',
      },
      {
        order: 14,
        description: 'Compile audit preparation pack',
        category: 'report',
        notes: [
          'Organize into audit pack structure:',
          '(a) Financial statements (TB, BS, P&L, Cash Flow, Equity),',
          '(b) Supporting schedules (AR, AP, FA, Tax),',
          '(c) Reconciliations (Bank, Intercompany, Loans),',
          '(d) Data exports and sample documents.',
          'Include index/table of contents for auditor reference.',
        ].join(' '),
        verification: 'Audit pack complete, indexed, and ready for auditor handoff',
      },
    ],
  };

  const phases = [financialStatements, supportingSchedules, reconciliations, exportCompile];

  return {
    jobType: 'audit-prep',
    period: p.label,
    currency,
    mode: 'standalone',
    phases,
    summary: buildSummary(phases),
  };
}
