/**
 * Accrued expense calculator (IAS 1).
 * Dual-entry pattern: month-end accrual + next-month reversal.
 * Used for estimated expenses (rent, utilities, services) before invoice arrives.
 */

import { round2, addMonths } from './types.js';
import type { AccruedExpenseResult, AccruedExpenseRow, JournalEntry } from './types.js';
import { validatePositive, validatePositiveInteger, validateDateFormat } from './validate.js';
import { journalStep, fmtCapsuleAmount, fmtAmt } from './blueprint.js';
import type { Blueprint } from './blueprint.js';

export interface AccruedExpenseInputs {
  amount: number;        // Monthly estimated accrual amount
  periods: number;       // Number of accrual periods
  frequency?: 'monthly' | 'quarterly'; // default monthly
  startDate?: string;    // First accrual date (YYYY-MM-DD, typically month-end)
  currency?: string;
}

export function calculateAccruedExpense(inputs: AccruedExpenseInputs): AccruedExpenseResult {
  const { amount, periods, frequency = 'monthly', startDate, currency } = inputs;

  validatePositive(amount, 'Amount');
  validatePositiveInteger(periods, 'Periods');
  validateDateFormat(startDate);

  const monthsPerPeriod = frequency === 'quarterly' ? 3 : 1;
  const schedule: AccruedExpenseRow[] = [];

  for (let i = 1; i <= periods; i++) {
    const accrualDate = startDate ? addMonths(startDate, (i - 1) * monthsPerPeriod) : null;
    const reversalDate = accrualDate ? addMonths(accrualDate, monthsPerPeriod) : null;

    const accrualJournal: JournalEntry = {
      description: `Accrued expense — Period ${i} of ${periods}`,
      lines: [
        { account: 'Expense Account', debit: amount, credit: 0 },
        { account: 'Accrued Liability', debit: 0, credit: amount },
      ],
    };

    const reversalJournal: JournalEntry = {
      description: `Reversal of accrued expense — Period ${i} of ${periods}`,
      lines: [
        { account: 'Accrued Liability', debit: amount, credit: 0 },
        { account: 'Expense Account', debit: 0, credit: amount },
      ],
    };

    schedule.push({
      period: i,
      date: accrualDate,
      accrualDate,
      reversalDate,
      amount,
      accrualJournal,
      reversalJournal,
    });
  }

  let blueprint: Blueprint | null = null;
  if (startDate) {
    const steps = schedule.flatMap((row, idx) => [
      journalStep(idx * 2 + 1, row.accrualJournal.description, row.accrualDate, row.accrualJournal.lines),
      journalStep(idx * 2 + 2, row.reversalJournal.description, row.reversalDate, row.reversalJournal.lines),
    ]);

    const c = currency ?? undefined;
    const workings = [
      'Accrued Expense Workings',
      `Estimated amount per period: ${fmtAmt(amount, c)}`,
      `Periods: ${periods} (${frequency})`,
      `Pattern: Accrue at period-end, reverse at start of next period`,
      `Total accrual entries: ${periods * 2} (${periods} accruals + ${periods} reversals)`,
    ].join('\n');

    blueprint = {
      capsuleType: 'Accrued Expenses',
      capsuleName: `Accrued Expense — ${fmtCapsuleAmount(amount, currency)}/period — ${periods} periods`,
      capsuleDescription: workings,
      tags: ['Accrued Expense'],
      customFields: { 'Vendor / Service': null },
      steps,
    };
  }

  return {
    type: 'accrued-expense',
    currency: currency ?? null,
    inputs: { amount, periods, frequency, startDate: startDate ?? null },
    totalAccruals: round2(amount * periods),
    schedule,
    blueprint,
  };
}
