/**
 * IAS 37 Provision calculator — PV measurement + discount unwinding.
 *
 * Calculates the present value of a future obligation and generates
 * the periodic unwinding schedule (Dr Finance Cost / Cr Provision).
 *
 * Compliance references:
 *  - IAS 37.36: Best estimate of expenditure required to settle
 *  - IAS 37.45: PV when effect of time value is material
 *  - IAS 37.60: Unwinding of discount = finance cost
 *
 * Uses `financial` package for PV calculation (same as lease calculator).
 * Final period penny adjustment closes provision to the full nominal amount.
 *
 * Use cases:
 *  - Warranty obligations
 *  - Legal claims / litigation
 *  - Decommissioning / restoration
 *  - Restructuring provisions
 *  - Onerous contracts
 */

import { pv } from 'financial';
import { round2, addMonths } from './types.js';
import type { ProvisionResult, ScheduleRow, JournalEntry } from './types.js';
import { validatePositive, validatePositiveInteger, validateDateFormat, validateRate } from './validate.js';
import { journalStep, cashOutStep, fmtCapsuleAmount, fmtAmt } from './blueprint.js';
import type { Blueprint } from './blueprint.js';

export interface ProvisionInputs {
  amount: number;       // estimated future cash outflow (nominal)
  annualRate: number;   // discount rate (%), e.g. 4 for 4%
  termMonths: number;   // months until expected settlement
  startDate?: string;   // recognition date (YYYY-MM-DD)
  currency?: string;
}

export function calculateProvision(inputs: ProvisionInputs): ProvisionResult {
  const { amount, annualRate, termMonths, startDate, currency } = inputs;

  validatePositive(amount, 'Estimated future outflow');
  validateRate(annualRate, 'Discount rate');
  validatePositiveInteger(termMonths, 'Term (months)');
  validateDateFormat(startDate);

  const monthlyRate = annualRate / 100 / 12;

  // PV of a single future cash flow (IAS 37.45)
  // pv(rate, nper, pmt, fv) — pmt=0, fv=amount → returns negative, negate
  const presentValue = round2(-pv(monthlyRate, termMonths, 0, amount));
  const totalUnwinding = round2(amount - presentValue);

  // Initial recognition journal (Dr Expense / Cr Provision at PV)
  const initialJournal: JournalEntry = {
    description: `Initial provision recognition at PV (IAS 37)`,
    lines: [
      { account: 'Provision Expense', debit: presentValue, credit: 0 },
      { account: 'Provision for Obligations', debit: 0, credit: presentValue },
    ],
  };

  // Unwinding schedule (effective interest method, IAS 37.60)
  const schedule: ScheduleRow[] = [];
  let provisionBalance = presentValue;
  let totalInterest = 0;

  for (let i = 1; i <= termMonths; i++) {
    const openingBalance = round2(provisionBalance);
    const isFinal = i === termMonths;

    let interest: number;
    if (isFinal) {
      // Final period: close to nominal amount exactly
      interest = round2(amount - openingBalance);
    } else {
      interest = round2(openingBalance * monthlyRate);
    }

    provisionBalance = round2(openingBalance + interest);
    totalInterest = round2(totalInterest + interest);

    const date = startDate ? addMonths(startDate, i) : null;

    const journal: JournalEntry = {
      description: `Provision unwinding — Month ${i} of ${termMonths}`,
      lines: [
        { account: 'Finance Cost — Unwinding', debit: interest, credit: 0 },
        { account: 'Provision for Obligations', debit: 0, credit: interest },
      ],
    };

    schedule.push({
      period: i,
      date,
      openingBalance,
      payment: 0,         // no cash movement until settlement
      interest,
      principal: 0,       // reuse ScheduleRow — principal not applicable
      closingBalance: provisionBalance,
      journal,
    });
  }

  // Build blueprint for agent execution
  let blueprint: Blueprint | null = null;
  if (startDate) {
    const settlementDate = addMonths(startDate, termMonths);
    const steps = [
      journalStep(1, initialJournal.description, startDate, initialJournal.lines),
      ...schedule.map((row, idx) => journalStep(idx + 2, row.journal.description, row.date, row.journal.lines)),
      cashOutStep(termMonths + 2, 'Settlement — pay the obligation', settlementDate, [
        { account: 'Provision for Obligations', debit: amount, credit: 0 },
        { account: 'Cash / Bank Account', debit: 0, credit: amount },
      ]),
    ];
    const c = currency ?? undefined;
    const workings = [
      `IAS 37 Provision Workings`,
      `Nominal obligation: ${fmtAmt(amount, c)} | Discount rate: ${annualRate}% p.a. (${round2(monthlyRate * 100)}% monthly)`,
      `Term to settlement: ${termMonths} months | PV at recognition: ${fmtAmt(presentValue, c)}`,
      `Total unwinding (finance cost): ${fmtAmt(totalUnwinding, c)}`,
      `Method: PV of single future outflow (IAS 37.45), unwinding via effective interest (IAS 37.60)`,
      `Settlement: ${fmtAmt(amount, c)} cash out on ${settlementDate}`,
      `Rounding: 2dp per period, final period closes to nominal amount`,
    ].join('\n');
    blueprint = {
      capsuleType: 'Provisions',
      capsuleName: `Provision — ${fmtCapsuleAmount(amount, currency)} — ${annualRate}% — ${termMonths} months`,
      capsuleDescription: workings,
      tags: ['Provision', 'IAS 37'],
      customFields: { 'Obligation Type': null, 'Expected Settlement Date': null },
      steps,
    };
  }

  return {
    type: 'provision',
    currency: currency ?? null,
    inputs: {
      amount,
      annualRate,
      termMonths,
      startDate: startDate ?? null,
    },
    presentValue,
    nominalAmount: amount,
    totalUnwinding,
    initialJournal,
    schedule,
    blueprint,
  };
}
