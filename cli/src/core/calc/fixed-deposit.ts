/**
 * Fixed deposit interest accrual calculator.
 *
 * Compliance references:
 *  - IFRS 9.4.1.2: Classification at amortized cost (hold-to-collect, passes SPPI)
 *  - IFRS 9.5.4.1: Interest revenue via effective interest rate method
 *
 * Supports simple interest (default) and compound interest (monthly/quarterly/annually).
 * Final period absorbs rounding — maturity value is exact.
 */

import { fv } from 'financial';
import { round2, addMonths } from './types.js';
import type { JournalEntry } from './types.js';
import { CalcValidationError, validatePositive, validatePositiveInteger, validateDateFormat, validateRate } from './validate.js';
import { journalStep, cashOutStep, cashInStep, fmtCapsuleAmount, fmtAmt } from './blueprint.js';
import type { Blueprint } from './blueprint.js';

export interface FixedDepositInputs {
  principal: number;
  annualRate: number; // percentage, e.g. 3.5 for 3.5%
  termMonths: number;
  compounding?: 'none' | 'monthly' | 'quarterly' | 'annually'; // default: none (simple)
  startDate?: string; // YYYY-MM-DD
  currency?: string;
}

export interface FixedDepositRow {
  period: number;
  date: string | null;
  openingBalance: number;
  interest: number;
  closingBalance: number;
  journal: JournalEntry;
}

export interface FixedDepositResult {
  type: 'fixed-deposit';
  currency: string | null;
  inputs: {
    principal: number;
    annualRate: number;
    termMonths: number;
    compounding: string;
    startDate: string | null;
  };
  maturityValue: number;
  totalInterest: number;
  effectiveRate: number;
  schedule: FixedDepositRow[];
  placementJournal: JournalEntry;
  maturityJournal: JournalEntry;
  blueprint: Blueprint | null;
}

export function calculateFixedDeposit(inputs: FixedDepositInputs): FixedDepositResult {
  const {
    principal,
    annualRate,
    termMonths,
    compounding = 'none',
    startDate,
    currency,
  } = inputs;

  validatePositive(principal, 'Principal');
  validateRate(annualRate, 'Annual rate');
  validatePositiveInteger(termMonths, 'Term (months)');
  validateDateFormat(startDate);

  // Compound interval validation — term must align with compounding frequency
  const compIntervalMonths = compounding === 'monthly' ? 1 : compounding === 'quarterly' ? 3 : compounding === 'annually' ? 12 : 0;
  if (compounding !== 'none' && termMonths % compIntervalMonths !== 0) {
    throw new CalcValidationError(
      `Term (${termMonths} months) must be a multiple of ${compIntervalMonths} for ${compounding} compounding.`,
    );
  }

  // Compute maturity value
  let maturityValue: number;
  if (compounding === 'none') {
    // Simple interest: Principal × Rate × Time
    maturityValue = round2(principal + principal * (annualRate / 100) * (termMonths / 12));
  } else {
    // Compound interest using fv() — one consistent periodic rate
    const periodsPerYear = 12 / compIntervalMonths;
    const compoundRate = annualRate / 100 / periodsPerYear;
    const totalCompoundPeriods = termMonths / compIntervalMonths;
    maturityValue = round2(fv(compoundRate, totalCompoundPeriods, 0, -principal));
  }

  const totalInterest = round2(maturityValue - principal);

  // Effective annual rate (for display)
  const effectiveRate = round2((Math.pow(maturityValue / principal, 12 / termMonths) - 1) * 100 * 100) / 100;

  // Build accrual schedule — accrue at compound intervals using the same periodic rate
  const schedule: FixedDepositRow[] = [];
  let accruedTotal = 0;

  if (compounding === 'none') {
    // Simple interest: equal accrual each month
    const monthlyInterest = round2(totalInterest / termMonths);
    let balance = principal;

    for (let i = 1; i <= termMonths; i++) {
      const isFinal = i === termMonths;
      const interest = isFinal ? round2(totalInterest - accruedTotal) : monthlyInterest;
      accruedTotal = round2(accruedTotal + interest);
      const date = startDate ? addMonths(startDate, i) : null;

      const journal: JournalEntry = {
        description: `Interest accrual — Month ${i} of ${termMonths}`,
        lines: [
          { account: 'Accrued Interest Receivable', debit: interest, credit: 0 },
          { account: 'Interest Income', debit: 0, credit: interest },
        ],
      };

      schedule.push({
        period: i,
        date,
        openingBalance: balance,
        interest,
        closingBalance: balance, // simple interest: principal unchanged
        journal,
      });
    }
  } else {
    // Compound interest: accrue at compound intervals using the periodic rate
    // e.g. quarterly = every 3 months, interest accrues on the growing carrying amount
    const periodicRate = annualRate / 100 / (12 / compIntervalMonths);
    let balance = principal;
    const totalPeriods = termMonths / compIntervalMonths;

    for (let p = 1; p <= totalPeriods; p++) {
      const openingBalance = round2(balance);
      const isFinal = p === totalPeriods;

      let interest: number;
      if (isFinal) {
        // Final period: close to exact maturity value
        interest = round2(maturityValue - openingBalance);
      } else {
        interest = round2(openingBalance * periodicRate);
      }

      balance = round2(openingBalance + interest);
      accruedTotal = round2(accruedTotal + interest);
      const monthOffset = p * compIntervalMonths;
      const date = startDate ? addMonths(startDate, monthOffset) : null;

      const periodLabel = compounding === 'monthly'
        ? `Month ${p}` : compounding === 'quarterly'
        ? `Quarter ${p}` : `Year ${p}`;

      const journal: JournalEntry = {
        description: `Interest accrual — ${periodLabel} of ${totalPeriods}`,
        lines: [
          { account: 'Accrued Interest Receivable', debit: interest, credit: 0 },
          { account: 'Interest Income', debit: 0, credit: interest },
        ],
      };

      schedule.push({
        period: p,
        date,
        openingBalance,
        interest,
        closingBalance: balance,
        journal,
      });
    }
  }

  const placementJournal: JournalEntry = {
    description: 'Fixed deposit placement',
    lines: [
      { account: 'Fixed Deposit', debit: principal, credit: 0 },
      { account: 'Cash / Bank Account', debit: 0, credit: principal },
    ],
  };

  const maturityJournal: JournalEntry = {
    description: 'Fixed deposit maturity',
    lines: [
      { account: 'Cash / Bank Account', debit: maturityValue, credit: 0 },
      { account: 'Fixed Deposit', debit: 0, credit: principal },
      { account: 'Accrued Interest Receivable', debit: 0, credit: totalInterest },
    ],
  };

  // Build blueprint
  let blueprint: Blueprint | null = null;
  if (startDate) {
    const steps = [
      cashOutStep(1, 'Transfer funds from operating account to fixed deposit', startDate, placementJournal.lines),
      ...schedule.map((row, idx) => journalStep(idx + 2, row.journal.description, row.date, row.journal.lines)),
      cashInStep(schedule.length + 2, 'Fixed deposit maturity — principal + accrued interest returned to Cash', addMonths(startDate, termMonths), maturityJournal.lines),
    ];
    const c = currency ?? undefined;
    const compoundLabel = compounding === 'none' ? 'Simple interest' : `Compound ${compounding}`;
    const monthlyAccrual = compounding === 'none' ? round2(totalInterest / termMonths) : null;
    const workingsLines = [
      `Fixed Deposit Interest Accrual Workings (IFRS 9)`,
      `Principal: ${fmtAmt(principal, c)} | Rate: ${annualRate}% p.a. | Term: ${termMonths} months`,
      `Method: ${compoundLabel}`,
    ];
    if (compounding === 'none') {
      workingsLines.push(
        `Interest: ${fmtAmt(principal, c)} × ${annualRate}% × ${termMonths}/12 = ${fmtAmt(totalInterest, c)}`,
        `Monthly accrual: ${fmtAmt(monthlyAccrual!, c)}`,
      );
    } else {
      const periodsPerYear = compounding === 'monthly' ? 12 : compounding === 'quarterly' ? 4 : 1;
      workingsLines.push(
        `Compounding: ${periodsPerYear}× per year | Effective annual rate: ${effectiveRate}%`,
        `Total interest: ${fmtAmt(totalInterest, c)}`,
      );
    }
    workingsLines.push(
      `Maturity value: ${fmtAmt(maturityValue, c)}`,
      `Classification: Amortized cost (hold-to-collect, passes SPPI)`,
      `Rounding: 2dp per period, final period closes to exact maturity value`,
    );
    blueprint = {
      capsuleType: 'Fixed Deposit',
      capsuleName: `Fixed Deposit — ${fmtCapsuleAmount(principal, currency)} — ${annualRate}% — ${termMonths} months`,
      capsuleDescription: workingsLines.join('\n'),
      tags: ['Fixed Deposit'],
      customFields: { 'Deposit Reference': null, 'Bank Name': null },
      steps,
    };
  }

  return {
    type: 'fixed-deposit',
    currency: currency ?? null,
    inputs: {
      principal,
      annualRate,
      termMonths,
      compounding,
      startDate: startDate ?? null,
    },
    maturityValue,
    totalInterest,
    effectiveRate,
    schedule,
    placementJournal,
    maturityJournal,
    blueprint,
  };
}
