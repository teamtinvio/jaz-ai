/**
 * Payment Run blueprint generator.
 * Produces a structured JobBlueprint for processing supplier payments —
 * no actual API calls, just an actionable checklist for accountants.
 */

import type { JobBlueprint, JobPhase } from '../types.js';
import { buildSummary } from '../types.js';
import { validateDateString } from '../validate.js';

export interface PaymentRunOptions {
  /** Only include bills due before this date (YYYY-MM-DD). */
  dueBefore?: string;
  /** Reporting currency (e.g., SGD, PHP). */
  currency?: string;
}

export function generatePaymentRunBlueprint(opts: PaymentRunOptions = {}): JobBlueprint {
  validateDateString(opts.dueBefore, 'dueBefore');

  const currency = opts.currency ?? 'SGD';
  const period = opts.dueBefore ? `Due before ${opts.dueBefore}` : 'current';

  const dueDateFilter = opts.dueBefore
    ? { dueDateTo: opts.dueBefore }
    : {};

  // Phase 1: Identify Outstanding Bills
  const identifyOutstanding: JobPhase = {
    name: 'Identify Outstanding Bills',
    description: 'List all unpaid bills and filter by due date if specified.',
    steps: [
      {
        order: 1,
        description: 'List all unpaid bills',
        category: 'verify',
        apiCall: 'POST /bills/search',
        apiBody: {
          filter: {
            status: ['UNPAID'],
            balanceAmount: { gt: 0 },
            ...dueDateFilter,
          },
        },
        verification: 'Total outstanding amount noted',
      },
      {
        order: 2,
        description: 'Filter bills by due date priority',
        category: 'verify',
        apiCall: 'POST /bills/search',
        apiBody: {
          filter: {
            status: ['UNPAID'],
            balanceAmount: { gt: 0 },
            ...dueDateFilter,
          },
          sort: { sortBy: ['dueDate'], order: 'ASC' },
        },
        notes: opts.dueBefore
          ? `Only bills due before ${opts.dueBefore}`
          : 'Sorted by due date — prioritize overdue and upcoming',
        verification: 'Bills sorted by payment urgency',
      },
    ],
  };

  // Phase 2: Summarize by Supplier
  const summarize: JobPhase = {
    name: 'Summarize by Supplier',
    description: 'Group outstanding bills by supplier and generate AP aging.',
    steps: [
      {
        order: 3,
        description: 'Group outstanding amounts by supplier',
        category: 'report',
        apiCall: 'POST /bills/search',
        notes: 'Aggregate total owed per supplier for batch grouping',
        verification: 'Supplier summary matches total outstanding from step 1',
      },
      {
        order: 4,
        description: 'Generate AP aging report',
        category: 'report',
        apiCall: 'POST /generate-reports/ap-report',
        notes: 'Current, 1-30, 31-60, 61-90, 90+ day buckets',
        verification: 'AP aging total ties to unpaid bills total',
      },
    ],
  };

  // Phase 3: Select & Approve Payment Batch
  const selectApprove: JobPhase = {
    name: 'Select & Approve Payment Batch',
    description: 'Build the payment batch and verify cash availability.',
    steps: [
      {
        order: 5,
        description: 'Build payment batch and check cash availability',
        category: 'review',
        apiCall: 'POST /generate-reports/trial-balance',
        notes: 'Compare total payment batch amount against bank account balance on TB. Ensure sufficient funds before proceeding.',
        verification: 'Bank balance >= total payment batch amount',
      },
    ],
  };

  // Phase 4: Record Payments
  const recordPayments: JobPhase = {
    name: 'Record Payments',
    description: 'Record full and partial payments against approved bills.',
    steps: [
      {
        order: 6,
        description: 'Record full payments for each approved bill',
        category: 'resolve',
        apiCall: 'POST /bills/{id}/payments',
        apiBody: {
          payments: [
            {
              paymentAmount: '{{paymentAmount}}',
              transactionAmount: '{{transactionAmount}}',
              accountResourceId: '{{bankAccountResourceId}}',
              paymentMethod: '{{paymentMethod}}',
              reference: '{{reference}}',
              valueDate: '{{today}}',
            },
          ],
        },
        recipeRef: 'bill-payment',
        notes: 'Payments endpoint requires { payments: [...] } wrapping. Fields: paymentAmount, transactionAmount, accountResourceId, valueDate.',
        verification: 'Each bill status changes to PAID after payment',
      },
      {
        order: 7,
        description: 'Record partial payments where applicable',
        category: 'resolve',
        apiCall: 'POST /bills/{id}/payments',
        apiBody: {
          payments: [
            {
              paymentAmount: '{{partialAmount}}',
              transactionAmount: '{{partialAmount}}',
              accountResourceId: '{{bankAccountResourceId}}',
              paymentMethod: '{{paymentMethod}}',
              reference: '{{reference}}',
              valueDate: '{{today}}',
            },
          ],
        },
        notes: 'For bills being partially paid — record the agreed amount. Bill remains UNPAID with reduced balance.',
        verification: 'Partial payment recorded, outstanding balance updated',
      },
    ],
  };

  // Phase 5: FX Payments
  const fxPayments: JobPhase = {
    name: 'FX Payments',
    description: 'Handle multi-currency bill payments with exchange rate considerations.',
    steps: [
      {
        order: 8,
        description: 'Process foreign currency bill payments',
        category: 'resolve',
        apiCall: 'POST /bills/{id}/payments',
        apiBody: {
          payments: [
            {
              paymentAmount: '{{fxPaymentAmount}}',
              transactionAmount: '{{fxTransactionAmount}}',
              accountResourceId: '{{fxBankAccountResourceId}}',
              paymentMethod: '{{paymentMethod}}',
              reference: '{{reference}}',
              valueDate: '{{today}}',
              currency: { sourceCurrency: '{{foreignCurrency}}' },
            },
          ],
        },
        conditional: 'If multi-currency bills exist in the payment batch',
        recipeRef: 'fx-bill-payment',
        calcCommand: 'clio calc fx-reval',
        notes: 'Use currency: { sourceCurrency } object form for FX — string currencyCode is silently ignored. Platform auto-fetches ECB rates.',
        verification: 'FX payments recorded with correct exchange rates, FX gain/loss recognized',
      },
    ],
  };

  // Phase 6: Verification
  const verification: JobPhase = {
    name: 'Verification',
    description: 'Confirm all payments processed and balances updated.',
    steps: [
      {
        order: 9,
        description: 'Verify AP aging after payment run',
        category: 'verify',
        apiCall: 'POST /generate-reports/ap-report',
        verification: 'AP aging reduced by total payments made. No unexpected outstanding items.',
      },
      {
        order: 10,
        description: 'Verify bank balance after payment run',
        category: 'verify',
        apiCall: 'POST /generate-reports/trial-balance',
        verification: 'Bank account balance reduced by total payment amount. TB still balances.',
      },
    ],
  };

  const phases = [identifyOutstanding, summarize, selectApprove, recordPayments, fxPayments, verification];

  return {
    jobType: 'payment-run',
    period,
    currency,
    mode: 'standalone',
    phases,
    summary: buildSummary(phases),
  };
}
