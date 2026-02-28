/**
 * Employee leave accrual calculator (IAS 19).
 * Monthly accrual of annual leave entitlements.
 * Final period absorbs rounding remainder (same pattern as amortization.ts).
 */

import { round2, addMonths } from './types.js';
import type { LeaveAccrualResult, LeaveAccrualRow, JournalEntry } from './types.js';
import { validatePositive, validatePositiveInteger, validateDateFormat } from './validate.js';
import { journalStep, fmtCapsuleAmount, fmtAmt } from './blueprint.js';
import type { Blueprint } from './blueprint.js';

export interface LeaveAccrualInputs {
  employees: number;     // Number of employees
  daysPerYear: number;   // Leave days per employee per year
  dailyRate: number;     // Average daily rate (cost per day)
  periods?: number;      // Months to accrue (default 12)
  startDate?: string;    // First accrual date (YYYY-MM-DD)
  currency?: string;
}

export function calculateLeaveAccrual(inputs: LeaveAccrualInputs): LeaveAccrualResult {
  const { employees, daysPerYear, dailyRate, periods = 12, startDate, currency } = inputs;

  validatePositive(employees, 'Employees');
  validatePositive(daysPerYear, 'Days per year');
  validatePositive(dailyRate, 'Daily rate');
  validatePositiveInteger(periods, 'Periods');
  validateDateFormat(startDate);

  const totalAnnualCost = round2(employees * daysPerYear * dailyRate);
  const periodAccrual = round2(totalAnnualCost / periods);

  const schedule: LeaveAccrualRow[] = [];
  let cumulative = 0;
  let remaining = totalAnnualCost;

  for (let i = 1; i <= periods; i++) {
    const isFinal = i === periods;
    // Final period absorbs rounding remainder
    const accrual = isFinal ? round2(remaining) : periodAccrual;
    remaining = round2(remaining - accrual);
    cumulative = round2(cumulative + accrual);

    const date = startDate ? addMonths(startDate, i - 1) : null;

    const journal: JournalEntry = {
      description: `Leave accrual — Month ${i} of ${periods}`,
      lines: [
        { account: 'Leave Expense', debit: accrual, credit: 0 },
        { account: 'Accrued Leave Liability', debit: 0, credit: accrual },
      ],
    };

    schedule.push({ period: i, date, accrual, cumulativeBalance: cumulative, journal });
  }

  let blueprint: Blueprint | null = null;
  if (startDate) {
    const steps = schedule.map((row, idx) =>
      journalStep(idx + 1, row.journal.description, row.date, row.journal.lines),
    );

    const c = currency ?? undefined;
    const workings = [
      'Employee Leave Accrual Workings (IAS 19)',
      `Employees: ${employees} | Days/year: ${daysPerYear} | Daily rate: ${fmtAmt(dailyRate, c)}`,
      `Total annual cost: ${fmtAmt(totalAnnualCost, c)}`,
      `Per-period accrual: ${fmtAmt(periodAccrual, c)}`,
      `Periods: ${periods} months`,
      `Rounding: 2dp per period, final period absorbs remainder`,
    ].join('\n');

    blueprint = {
      capsuleType: 'Employee Benefits',
      capsuleName: `Leave Accrual — ${fmtCapsuleAmount(totalAnnualCost, currency)} — ${periods} months`,
      capsuleDescription: workings,
      tags: ['Leave Accrual'],
      customFields: { 'Fiscal Year': null },
      steps,
    };
  }

  return {
    type: 'leave-accrual',
    currency: currency ?? null,
    inputs: {
      employees,
      daysPerYear,
      dailyRate,
      periods,
      startDate: startDate ?? null,
    },
    totalAnnualCost,
    periodAccrual,
    schedule,
    blueprint,
  };
}
