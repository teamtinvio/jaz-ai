/**
 * Loan amortization calculator.
 * Uses the `financial` package for PMT calculation.
 * IFRS-compliant rounding: 2 decimals per period, final period closes to zero.
 */

import { pmt } from 'financial';
import { round2, addMonths } from './types.js';
import type { LoanResult, ScheduleRow, JournalEntry } from './types.js';
import { validatePositive, validateNonNegative, validatePositiveInteger, validateDateFormat, validateRate } from './validate.js';
import { journalStep, cashInStep, fmtCapsuleAmount, fmtAmt } from './blueprint.js';
import type { Blueprint } from './blueprint.js';

export interface LoanInputs {
  principal: number;
  annualRate: number; // percentage, e.g. 6 for 6%
  termMonths: number;
  startDate?: string; // YYYY-MM-DD
  currency?: string;
}

export function calculateLoan(inputs: LoanInputs): LoanResult {
  const { principal, annualRate, termMonths, startDate, currency } = inputs;

  validatePositive(principal, 'Principal');
  validateRate(annualRate, 'Annual rate');
  validatePositiveInteger(termMonths, 'Term (months)');
  validateDateFormat(startDate);

  const monthlyRate = annualRate / 100 / 12;

  // PMT returns negative (cash outflow convention), negate for positive value
  const payment = round2(-pmt(monthlyRate, termMonths, principal));

  const schedule: ScheduleRow[] = [];
  let balance = principal;
  let totalInterest = 0;
  let totalPrincipal = 0;

  for (let i = 1; i <= termMonths; i++) {
    const openingBalance = round2(balance);
    const isFinal = i === termMonths;

    let interest: number;
    let principalPortion: number;
    let periodPayment: number;

    if (isFinal) {
      // Final period: close balance to exactly zero
      interest = round2(openingBalance * monthlyRate);
      principalPortion = openingBalance;
      periodPayment = round2(principalPortion + interest);
    } else {
      interest = round2(openingBalance * monthlyRate);
      principalPortion = round2(payment - interest);
      periodPayment = payment;
    }

    balance = round2(openingBalance - principalPortion);
    totalInterest = round2(totalInterest + interest);
    totalPrincipal = round2(totalPrincipal + principalPortion);

    const date = startDate ? addMonths(startDate, i) : null;

    const journal: JournalEntry = {
      description: `Loan payment — Month ${i} of ${termMonths}`,
      lines: [
        { account: 'Loan Payable', debit: principalPortion, credit: 0 },
        { account: 'Interest Expense', debit: interest, credit: 0 },
        { account: 'Cash / Bank Account', debit: 0, credit: periodPayment },
      ],
    };

    schedule.push({
      period: i,
      date,
      openingBalance,
      payment: periodPayment,
      interest,
      principal: principalPortion,
      closingBalance: balance,
      journal,
    });
  }

  // Build blueprint for agent execution
  let blueprint: Blueprint | null = null;
  if (startDate) {
    const steps = [
      cashInStep(1, 'Record loan proceeds received from bank', startDate, [
        { account: 'Cash / Bank Account', debit: principal, credit: 0 },
        { account: 'Loan Payable', debit: 0, credit: principal },
      ]),
      ...schedule.map((row, idx) => journalStep(idx + 2, row.journal.description, row.date, row.journal.lines)),
    ];
    const c = currency ?? undefined;
    const workings = [
      `Loan Amortization Workings`,
      `Principal: ${fmtAmt(principal, c)} | Rate: ${annualRate}% p.a. (${round2(monthlyRate * 100)}% monthly)`,
      `Term: ${termMonths} months | Monthly payment: ${fmtAmt(payment, c)}`,
      `Total payments: ${fmtAmt(round2(totalInterest + totalPrincipal), c)} | Total interest: ${fmtAmt(totalInterest, c)}`,
      `Method: PMT formula, constant payment amortization`,
      `Rounding: 2dp per period, final period closes balance to $0.00`,
    ].join('\n');
    blueprint = {
      capsuleType: 'Loan Repayment',
      capsuleName: `Bank Loan — ${fmtCapsuleAmount(principal, currency)} — ${annualRate}% — ${termMonths} months`,
      capsuleDescription: workings,
      tags: ['Bank Loan'],
      customFields: { 'Loan Reference': null },
      steps,
    };
  }

  return {
    type: 'loan',
    currency: currency ?? null,
    inputs: {
      principal,
      annualRate,
      termMonths,
      startDate: startDate ?? null,
    },
    monthlyPayment: payment,
    totalPayments: round2(totalInterest + totalPrincipal),
    totalInterest,
    totalPrincipal,
    schedule,
    blueprint,
  };
}
