/**
 * Dividend declaration and payment calculator.
 * Two-step pattern: declaration journal + payment cash-out.
 * Optional withholding tax creates a third step.
 */

import { round2 } from './types.js';
import type { DividendResult, JournalEntry } from './types.js';
import { validatePositive, validateDateFormat } from './validate.js';
import { journalStep, cashOutStep, fmtCapsuleAmount, fmtAmt } from './blueprint.js';
import type { Blueprint } from './blueprint.js';

export interface DividendInputs {
  amount: number;           // Declared dividend amount
  declarationDate: string;  // Board resolution date (YYYY-MM-DD)
  paymentDate: string;      // Settlement date (YYYY-MM-DD)
  withholdingRate?: number; // Withholding tax rate % (default 0)
  currency?: string;
}

export function calculateDividend(inputs: DividendInputs): DividendResult {
  const { amount, declarationDate, paymentDate, withholdingRate = 0, currency } = inputs;

  validatePositive(amount, 'Amount');
  validateDateFormat(declarationDate);
  validateDateFormat(paymentDate);

  if (withholdingRate < 0 || withholdingRate > 100) {
    throw new Error('Withholding rate must be between 0 and 100');
  }

  if (paymentDate < declarationDate) {
    throw new Error('Payment date must be on or after declaration date');
  }

  const withholdingTax = round2(amount * withholdingRate / 100);
  const netToShareholders = round2(amount - withholdingTax);

  // Step 1: Declaration — Dr Retained Earnings / Cr Dividends Payable
  const declarationJournal: JournalEntry = {
    description: `Dividend declaration — ${fmtAmt(amount, currency)}`,
    lines: [
      { account: 'Retained Earnings', debit: amount, credit: 0 },
      { account: 'Dividends Payable', debit: 0, credit: amount },
    ],
  };

  // Step 2: Payment — Dr Dividends Payable / Cr Cash (net amount if WHT)
  const paymentJournal: JournalEntry = withholdingTax > 0
    ? {
        description: `Dividend payment — net ${fmtAmt(netToShareholders, currency)} to shareholders`,
        lines: [
          { account: 'Dividends Payable', debit: amount, credit: 0 },
          { account: 'Cash / Bank Account', debit: 0, credit: netToShareholders },
          { account: 'Withholding Tax Payable', debit: 0, credit: withholdingTax },
        ],
      }
    : {
        description: `Dividend payment — ${fmtAmt(amount, currency)} to shareholders`,
        lines: [
          { account: 'Dividends Payable', debit: amount, credit: 0 },
          { account: 'Cash / Bank Account', debit: 0, credit: amount },
        ],
      };

  // Step 3 (optional): WHT remittance — Dr WHT Payable / Cr Cash
  let withholdingJournal: JournalEntry | null = null;
  if (withholdingTax > 0) {
    withholdingJournal = {
      description: `Withholding tax remittance — ${fmtAmt(withholdingTax, currency)}`,
      lines: [
        { account: 'Withholding Tax Payable', debit: withholdingTax, credit: 0 },
        { account: 'Cash / Bank Account', debit: 0, credit: withholdingTax },
      ],
    };
  }

  // Build blueprint
  const c = currency ?? undefined;
  const steps = [
    journalStep(1, declarationJournal.description, declarationDate, declarationJournal.lines),
    cashOutStep(2, paymentJournal.description, paymentDate, paymentJournal.lines),
  ];
  if (withholdingJournal) {
    steps.push(cashOutStep(3, withholdingJournal.description, paymentDate, withholdingJournal.lines));
  }

  const workingsLines = [
    'Dividend Declaration & Payment Workings',
    `Declared amount: ${fmtAmt(amount, c)}`,
    `Declaration date: ${declarationDate} | Payment date: ${paymentDate}`,
  ];
  if (withholdingTax > 0) {
    workingsLines.push(
      `Withholding tax: ${withholdingRate}% = ${fmtAmt(withholdingTax, c)}`,
      `Net to shareholders: ${fmtAmt(netToShareholders, c)}`,
    );
  }

  const blueprint: Blueprint = {
    capsuleType: 'Dividends',
    capsuleName: `Dividend — ${fmtCapsuleAmount(amount, currency)}`,
    capsuleDescription: workingsLines.join('\n'),
    tags: ['Dividend'],
    customFields: { 'Board Resolution #': null, 'Fiscal Year': null },
    steps,
  };

  return {
    type: 'dividend',
    currency: currency ?? null,
    inputs: {
      amount,
      declarationDate,
      paymentDate,
      withholdingRate,
    },
    grossAmount: amount,
    netToShareholders,
    withholdingTax,
    declarationJournal,
    paymentJournal,
    withholdingJournal,
    blueprint,
  };
}
