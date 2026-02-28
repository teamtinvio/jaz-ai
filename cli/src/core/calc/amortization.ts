/**
 * Prepaid expense & deferred revenue recognition calculators.
 * Equal-period division. Final period absorbs rounding remainder.
 */

import { round2, addMonths } from './types.js';
import type { PrepaidExpenseResult, DeferredRevenueResult, AmortizationRow, JournalEntry } from './types.js';
import { validatePositive, validatePositiveInteger, validateDateFormat } from './validate.js';
import { journalStep, billStep, invoiceStep, fmtCapsuleAmount, fmtAmt } from './blueprint.js';
import type { Blueprint } from './blueprint.js';

export interface RecognitionInputs {
  amount: number;
  periods: number;
  frequency?: 'monthly' | 'quarterly'; // default monthly
  startDate?: string; // YYYY-MM-DD
  currency?: string;
}

export function calculatePrepaidExpense(inputs: RecognitionInputs): PrepaidExpenseResult {
  const { amount, periods, frequency = 'monthly', startDate, currency } = inputs;

  validatePositive(amount, 'Amount');
  validatePositiveInteger(periods, 'Periods');
  validateDateFormat(startDate);

  const schedule = buildSchedule(amount, periods, frequency, startDate, 'prepaid');

  let blueprint: Blueprint | null = null;
  if (startDate) {
    const steps = [
      billStep(1, 'Create bill from supplier coded to Prepaid Asset, then pay from Cash / Bank Account', startDate, [
        { account: 'Prepaid Asset', debit: amount, credit: 0 },
        { account: 'Cash / Bank Account', debit: 0, credit: amount },
      ]),
      ...schedule.map((row, idx) => journalStep(idx + 2, row.journal.description, row.date, row.journal.lines)),
    ];
    const c = currency ?? undefined;
    const workings = [
      `Prepaid Expense Recognition Workings`,
      `Total prepaid: ${fmtAmt(amount, c)} | Periods: ${periods} (${frequency})`,
      `Per period: ${fmtAmt(round2(amount / periods), c)}`,
      `Method: Straight-line recognition over ${periods} ${frequency} periods`,
      `Rounding: 2dp per period, final period absorbs remainder`,
    ].join('\n');
    blueprint = {
      capsuleType: 'Prepaid Expenses',
      capsuleName: `Prepaid Expense — ${fmtCapsuleAmount(amount, currency)} — ${periods} periods`,
      capsuleDescription: workings,
      tags: ['Prepaid Expense'],
      customFields: { 'Policy / Contract #': null },
      steps,
    };
  }

  return {
    type: 'prepaid-expense',
    currency: currency ?? null,
    inputs: { amount, periods, frequency, startDate: startDate ?? null },
    perPeriodAmount: round2(amount / periods),
    schedule,
    blueprint,
  };
}

export function calculateDeferredRevenue(inputs: RecognitionInputs): DeferredRevenueResult {
  const { amount, periods, frequency = 'monthly', startDate, currency } = inputs;

  validatePositive(amount, 'Amount');
  validatePositiveInteger(periods, 'Periods');
  validateDateFormat(startDate);

  const schedule = buildSchedule(amount, periods, frequency, startDate, 'deferred');

  let blueprint: Blueprint | null = null;
  if (startDate) {
    const steps = [
      invoiceStep(1, 'Create invoice to customer coded to Deferred Revenue, record payment to Cash / Bank Account', startDate, [
        { account: 'Cash / Bank Account', debit: amount, credit: 0 },
        { account: 'Deferred Revenue', debit: 0, credit: amount },
      ]),
      ...schedule.map((row, idx) => journalStep(idx + 2, row.journal.description, row.date, row.journal.lines)),
    ];
    const c2 = currency ?? undefined;
    const workings2 = [
      `Deferred Revenue Recognition Workings`,
      `Total deferred: ${fmtAmt(amount, c2)} | Periods: ${periods} (${frequency})`,
      `Per period: ${fmtAmt(round2(amount / periods), c2)}`,
      `Method: Straight-line recognition over ${periods} ${frequency} periods`,
      `Rounding: 2dp per period, final period absorbs remainder`,
    ].join('\n');
    blueprint = {
      capsuleType: 'Deferred Revenue',
      capsuleName: `Deferred Revenue — ${fmtCapsuleAmount(amount, currency)} — ${periods} periods`,
      capsuleDescription: workings2,
      tags: ['Deferred Revenue'],
      customFields: { 'Contract #': null },
      steps,
    };
  }

  return {
    type: 'deferred-revenue',
    currency: currency ?? null,
    inputs: { amount, periods, frequency, startDate: startDate ?? null },
    perPeriodAmount: round2(amount / periods),
    schedule,
    blueprint,
  };
}

function buildSchedule(
  amount: number,
  periods: number,
  frequency: 'monthly' | 'quarterly',
  startDate: string | undefined,
  kind: 'prepaid' | 'deferred',
): AmortizationRow[] {
  const perPeriod = round2(amount / periods);
  const schedule: AmortizationRow[] = [];
  let remaining = amount;
  const monthsPerPeriod = frequency === 'quarterly' ? 3 : 1;

  for (let i = 1; i <= periods; i++) {
    const isFinal = i === periods;
    const amortized = isFinal ? round2(remaining) : perPeriod;
    remaining = round2(remaining - amortized);

    const date = startDate ? addMonths(startDate, i * monthsPerPeriod) : null;

    let journal: JournalEntry;
    if (kind === 'prepaid') {
      journal = {
        description: `Prepaid expense recognition — Period ${i} of ${periods}`,
        lines: [
          { account: 'Expense', debit: amortized, credit: 0 },
          { account: 'Prepaid Asset', debit: 0, credit: amortized },
        ],
      };
    } else {
      journal = {
        description: `Deferred revenue recognition — Period ${i} of ${periods}`,
        lines: [
          { account: 'Deferred Revenue', debit: amortized, credit: 0 },
          { account: 'Revenue', debit: 0, credit: amortized },
        ],
      };
    }

    schedule.push({ period: i, date, amortized, remainingBalance: remaining, journal });
  }

  return schedule;
}
