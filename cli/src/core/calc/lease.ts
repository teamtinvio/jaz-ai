/**
 * IFRS 16 lease calculator.
 *
 * Compliance references:
 *  - IFRS 16.26: Initial measurement — PV of lease payments
 *  - IFRS 16.36-37: Subsequent measurement — effective interest method
 *  - IFRS 16.31-32: ROU depreciation — straight-line over lease term
 *
 * Uses `financial` package for PV calculation.
 * Final period penny adjustment closes lease liability to exactly zero.
 */

import { pv } from 'financial';
import { round2, addMonths } from './types.js';
import type { LeaseResult, ScheduleRow, JournalEntry } from './types.js';
import { CalcValidationError, validatePositive, validatePositiveInteger, validateDateFormat, validateRate } from './validate.js';
import { journalStep, fixedAssetStep, fmtCapsuleAmount, fmtAmt } from './blueprint.js';
import type { Blueprint } from './blueprint.js';

export interface LeaseInputs {
  monthlyPayment: number;
  termMonths: number;
  annualRate: number; // incremental borrowing rate, percentage (e.g. 5 for 5%)
  usefulLifeMonths?: number; // for hire purchase: depreciate over useful life (not lease term)
  startDate?: string; // YYYY-MM-DD
  currency?: string;
}

export function calculateLease(inputs: LeaseInputs): LeaseResult {
  const { monthlyPayment, termMonths, annualRate, usefulLifeMonths, startDate, currency } = inputs;

  validatePositive(monthlyPayment, 'Monthly payment');
  validateRate(annualRate, 'Annual rate (IBR)');
  validatePositiveInteger(termMonths, 'Term (months)');
  if (usefulLifeMonths !== undefined) {
    validatePositiveInteger(usefulLifeMonths, 'Useful life (months)');
    if (usefulLifeMonths < termMonths) {
      throw new CalcValidationError(`Useful life (${usefulLifeMonths} months) must be >= lease term (${termMonths} months) for hire purchase.`);
    }
  }
  validateDateFormat(startDate);

  const isHirePurchase = usefulLifeMonths !== undefined;

  const monthlyRate = annualRate / 100 / 12;

  // PV of an ordinary annuity (payments at end of period)
  // pv() returns negative, negate for positive value
  const presentValue = round2(-pv(monthlyRate, termMonths, monthlyPayment));

  // ROU depreciation: straight-line over lease term (IFRS 16.31-32)
  // For hire purchase (ownership transfers): depreciate over useful life, not lease term
  const depreciationMonths = isHirePurchase ? usefulLifeMonths! : termMonths;
  const monthlyRouDepreciation = round2(presentValue / depreciationMonths);

  const initialJournal: JournalEntry = {
    description: 'Initial recognition — IFRS 16 lease',
    lines: [
      { account: 'Right-of-Use Asset', debit: presentValue, credit: 0 },
      { account: 'Lease Liability', debit: 0, credit: presentValue },
    ],
  };

  // Liability unwinding schedule (effective interest method, IFRS 16.36-37)
  const schedule: ScheduleRow[] = [];
  let liability = presentValue;
  let totalInterest = 0;
  let totalPrincipal = 0;

  for (let i = 1; i <= termMonths; i++) {
    const openingBalance = round2(liability);
    const isFinal = i === termMonths;

    let interest: number;
    let principalPortion: number;
    let periodPayment: number;

    if (isFinal) {
      // Final period: close liability to exactly zero
      interest = round2(openingBalance * monthlyRate);
      principalPortion = openingBalance;
      periodPayment = round2(principalPortion + interest);
    } else {
      interest = round2(openingBalance * monthlyRate);
      principalPortion = round2(monthlyPayment - interest);
      periodPayment = monthlyPayment;
    }

    liability = round2(openingBalance - principalPortion);
    totalInterest = round2(totalInterest + interest);
    totalPrincipal = round2(totalPrincipal + principalPortion);

    const date = startDate ? addMonths(startDate, i) : null;

    const journal: JournalEntry = {
      description: `Lease payment — Month ${i} of ${termMonths}`,
      lines: [
        { account: 'Lease Liability', debit: principalPortion, credit: 0 },
        { account: 'Interest Expense — Leases', debit: interest, credit: 0 },
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
      closingBalance: liability,
      journal,
    });
  }

  // ROU depreciation total (final month absorbs rounding)
  const totalDepreciation = round2(
    monthlyRouDepreciation * (termMonths - 1) +
    (presentValue - monthlyRouDepreciation * (termMonths - 1))
  );

  // Build blueprint for agent execution
  let blueprint: Blueprint | null = null;
  if (startDate) {
    const depNote = isHirePurchase
      ? `Register Right-of-Use Asset in Fixed Asset register: cost ${presentValue}, salvage 0, life ${depreciationMonths} months (straight-line over useful life, not lease term). Jaz will auto-post monthly depreciation of ${monthlyRouDepreciation}.`
      : `Register Right-of-Use Asset in Fixed Asset register: cost ${presentValue}, salvage 0, life ${termMonths} months (straight-line). Jaz will auto-post monthly depreciation of ${monthlyRouDepreciation}.`;
    const steps = [
      journalStep(1, initialJournal.description, startDate, initialJournal.lines),
      fixedAssetStep(2, depNote, startDate),
      ...schedule.map((row, idx) => journalStep(idx + 3, row.journal.description, row.date, row.journal.lines)),
    ];
    const capsuleType = isHirePurchase ? 'Hire Purchase' : 'Lease Accounting';
    const capsuleName = isHirePurchase
      ? `Hire Purchase — ${fmtCapsuleAmount(monthlyPayment, currency)}/month — ${termMonths} months — useful life ${depreciationMonths} months`
      : `IFRS 16 Lease — ${fmtCapsuleAmount(monthlyPayment, currency)}/month — ${termMonths} months`;
    const c = currency ?? undefined;
    const workingsLines = [
      `${isHirePurchase ? 'Hire Purchase' : 'IFRS 16 Lease'} Workings`,
      `Monthly payment: ${fmtAmt(monthlyPayment, c)} | IBR: ${annualRate}% p.a. (${round2(monthlyRate * 100)}% monthly)`,
      `Lease term: ${termMonths} months | PV of payments: ${fmtAmt(presentValue, c)} (IFRS 16.26)`,
    ];
    if (isHirePurchase) {
      workingsLines.push(`Useful life: ${usefulLifeMonths} months | ROU depreciation: ${fmtAmt(monthlyRouDepreciation, c)}/month over ${depreciationMonths} months`);
    } else {
      workingsLines.push(`ROU depreciation: ${fmtAmt(monthlyRouDepreciation, c)}/month (SL over ${termMonths} months)`);
    }
    workingsLines.push(
      `Total cash payments: ${fmtAmt(round2(totalInterest + totalPrincipal), c)} | Total interest: ${fmtAmt(totalInterest, c)}`,
      `Method: Effective interest (IFRS 16.36-37), ROU straight-line (IFRS 16.31-32)`,
      `Rounding: 2dp per period, final period closes liability to $0.00`,
    );
    blueprint = {
      capsuleType,
      capsuleName,
      capsuleDescription: workingsLines.join('\n'),
      tags: [capsuleType],
      customFields: isHirePurchase ? { 'HP Agreement #': null } : { 'Lease Contract #': null },
      steps,
    };
  }

  return {
    type: 'lease',
    currency: currency ?? null,
    inputs: {
      monthlyPayment,
      termMonths,
      annualRate,
      usefulLifeMonths: usefulLifeMonths ?? null,
      startDate: startDate ?? null,
    },
    presentValue,
    monthlyRouDepreciation,
    depreciationMonths,
    isHirePurchase,
    totalCashPayments: round2(totalInterest + totalPrincipal),
    totalInterest,
    totalDepreciation,
    initialJournal,
    schedule,
    blueprint,
  };
}
