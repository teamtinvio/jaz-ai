/**
 * Credit Control blueprint generator.
 * Produces a structured JobBlueprint for managing overdue receivables —
 * no actual API calls, just an actionable checklist for accountants.
 */

import type { JobBlueprint, JobPhase } from '../types.js';
import { buildSummary } from '../types.js';
import { validateOverdueDays } from '../validate.js';

export interface CreditControlOptions {
  /** Minimum days overdue to include (default: 30). */
  overdueDays?: number;
  /** Reporting currency (e.g., SGD, PHP). */
  currency?: string;
}

export function generateCreditControlBlueprint(opts: CreditControlOptions = {}): JobBlueprint {
  const overdueDays = opts.overdueDays ?? 30;
  if (opts.overdueDays !== undefined) {
    validateOverdueDays(opts.overdueDays);
  }

  const currency = opts.currency ?? 'SGD';
  const period = `Overdue > ${overdueDays} days`;

  // Phase 1: AR Analysis
  const arAnalysis: JobPhase = {
    name: 'AR Analysis',
    description: 'Generate AR aging and identify overdue invoices beyond the threshold.',
    steps: [
      {
        order: 1,
        description: 'Generate AR aging report',
        category: 'report',
        apiCall: 'POST /generate-reports/ar-report',
        notes: 'Current, 1-30, 31-60, 61-90, 90+ day buckets. Focus on buckets beyond threshold.',
        verification: 'AR aging report generated — note total receivables and overdue amount',
      },
      {
        order: 2,
        description: `Identify invoices overdue by more than ${overdueDays} days`,
        category: 'verify',
        apiCall: 'POST /invoices/search',
        apiBody: {
          filter: {
            status: ['UNPAID'],
            overdue: true,
          },
        },
        notes: `Filter to invoices past due by ${overdueDays}+ days. Record customer name, invoice number, amount, and days overdue.`,
        verification: 'Overdue invoice list matches AR aging report totals',
      },
    ],
  };

  // Phase 2: Chase List
  const chaseList: JobPhase = {
    name: 'Chase List',
    description: 'Prioritize customers and generate a follow-up action list.',
    steps: [
      {
        order: 3,
        description: 'Group overdue invoices by customer priority',
        category: 'review',
        apiCall: 'POST /invoices/search',
        apiBody: {
          filter: {
            status: ['UNPAID'],
            overdue: true,
          },
        },
        notes: 'Rank customers by: (1) total overdue amount, (2) days overdue, (3) payment history. Top customers get priority outreach.',
        verification: 'Customer priority list established',
      },
      {
        order: 4,
        description: 'Generate follow-up action list',
        category: 'report',
        notes: [
          'For each overdue customer, assign action:',
          '(a) 30-60 days: friendly reminder email/call,',
          '(b) 60-90 days: formal demand letter,',
          '(c) 90+ days: escalate to management / external collection.',
          'Document contact attempts and agreed payment plans.',
        ].join(' '),
        verification: 'Every overdue customer has an assigned follow-up action and owner',
      },
    ],
  };

  // Phase 3: Bad Debt Assessment
  const badDebtAssessment: JobPhase = {
    name: 'Bad Debt Assessment',
    description: 'Assess doubtful debts and calculate expected credit losses if needed.',
    steps: [
      {
        order: 5,
        description: 'Identify doubtful debts',
        category: 'review',
        apiCall: 'POST /generate-reports/ar-report',
        notes: 'Review 90+ day bucket for potential bad debts. Consider: customer financial health, dispute status, collateral, historical write-off rates.',
        verification: 'Doubtful debt candidates identified and documented',
      },
      {
        order: 6,
        description: 'Calculate expected credit loss (ECL) provision',
        category: 'value',
        calcCommand: 'clio calc ecl',
        recipeRef: 'bad-debt-provision',
        notes: 'ECL model: apply loss rates per aging bucket (e.g., current 0.5%, 30d 2%, 60d 5%, 90d 10%, 120+ 50%). Book provision journal if ECL differs from existing allowance.',
        verification: 'ECL calculated and compared to existing provision balance. Adjustment journal prepared if needed.',
      },
    ],
  };

  // Phase 4: Verification
  const verification: JobPhase = {
    name: 'Verification',
    description: 'Review AR aging after all credit control actions.',
    steps: [
      {
        order: 7,
        description: 'Review AR aging after credit control actions',
        category: 'verify',
        apiCall: 'POST /generate-reports/ar-report',
        notes: 'Compare to opening AR aging. Document: payments received, payment plans agreed, write-offs processed, provisions updated.',
        verification: 'AR aging reviewed, all actions documented, follow-up dates set',
      },
    ],
  };

  const phases = [arAnalysis, chaseList, badDebtAssessment, verification];

  return {
    jobType: 'credit-control',
    period,
    currency,
    mode: 'standalone',
    phases,
    summary: buildSummary(phases),
  };
}
