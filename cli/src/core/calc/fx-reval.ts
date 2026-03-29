/**
 * FX Revaluation calculator (IAS 21).
 *
 * Calculates unrealized gain/loss on non-AR/AP foreign currency monetary
 * items at period-end. This is for items NOT auto-revalued by the platform
 * (which handles invoices, bills, credit notes, cash, and bank balances).
 *
 * Use cases:
 *  - Intercompany loan receivables/payables (booked as manual journals)
 *  - Foreign currency term deposits or escrow
 *  - FX-denominated provisions
 *  - Any manual journal balance in a foreign currency account
 *
 * IAS 21.23: All monetary items translated at closing rate.
 * IAS 21.28: Exchange differences recognized in P&L.
 */

import { round2 } from './types.js';
import type { FxRevalResult, JournalEntry } from './types.js';
import { validatePositive } from './validate.js';
import { journalStep, fmtAmt } from './blueprint.js';
import type { Blueprint } from './blueprint.js';

export interface FxRevalInputs {
  amount: number;         // foreign currency amount outstanding
  bookRate: number;       // original booking exchange rate
  closingRate: number;    // period-end closing exchange rate
  currency?: string;      // foreign currency code (e.g. USD)
  baseCurrency?: string;  // base (functional) currency code (e.g. SGD)
}

export function calculateFxReval(inputs: FxRevalInputs): FxRevalResult {
  const {
    amount,
    bookRate,
    closingRate,
    currency = 'USD',
    baseCurrency = 'SGD',
  } = inputs;

  validatePositive(amount, 'Foreign currency amount');
  validatePositive(bookRate, 'Book rate');
  validatePositive(closingRate, 'Closing rate');

  // Base currency equivalents
  const bookValue = round2(amount * bookRate);
  const closingValue = round2(amount * closingRate);
  const gainOrLoss = round2(closingValue - bookValue);
  const isGain = gainOrLoss >= 0;
  const absAmount = Math.abs(gainOrLoss);

  // Journal entry for the revaluation adjustment
  let journal: JournalEntry;
  if (isGain) {
    journal = {
      description: `FX revaluation — ${currency} ${amount.toLocaleString()} @ ${closingRate} (was ${bookRate})`,
      lines: [
        { account: `${currency} Monetary Item`, debit: absAmount, credit: 0 },
        { account: 'FX Unrealized Gain', debit: 0, credit: absAmount },
      ],
    };
  } else {
    journal = {
      description: `FX revaluation — ${currency} ${amount.toLocaleString()} @ ${closingRate} (was ${bookRate})`,
      lines: [
        { account: 'FX Unrealized Loss', debit: absAmount, credit: 0 },
        { account: `${currency} Monetary Item`, debit: 0, credit: absAmount },
      ],
    };
  }

  // Reversal journal (Day 1 of next period)
  const reversalJournal: JournalEntry = {
    description: `Reversal of FX revaluation — ${currency} ${amount.toLocaleString()}`,
    lines: journal.lines.map(l => ({
      account: l.account,
      debit: l.credit,  // swap debit/credit
      credit: l.debit,
    })),
  };

  // Blueprint: revaluation + reversal
  const workings = [
    `FX Revaluation Workings (IAS 21)`,
    `Foreign currency: ${currency} ${amount.toLocaleString()} | Base currency: ${baseCurrency}`,
    `Book rate: ${bookRate} → Book value: ${fmtAmt(bookValue, baseCurrency)}`,
    `Closing rate: ${closingRate} → Closing value: ${fmtAmt(closingValue, baseCurrency)}`,
    `${isGain ? 'Unrealized gain' : 'Unrealized loss'}: ${fmtAmt(Math.abs(gainOrLoss), baseCurrency)}`,
    `Method: IAS 21.23 — monetary items translated at closing rate`,
    `Reversal: Day 1 next period (standard reval/reverse approach)`,
  ].join('\n');
  const blueprint: Blueprint = {
    capsuleType: 'FX Revaluation',
    capsuleName: `FX Reval — ${currency} ${amount.toLocaleString()} — ${bookRate} → ${closingRate}`,
    capsuleDescription: workings,
    tags: ['FX Revaluation', currency],
    customFields: { 'Source Account': null, 'Period End Date': null },
    steps: [
      journalStep(1, journal.description, null, journal.lines),
      journalStep(2, reversalJournal.description, null, reversalJournal.lines),
    ],
  };

  return {
    type: 'fx-reval',
    currency,
    inputs: { amount, bookRate, closingRate, baseCurrency },
    bookValue,
    closingValue,
    gainOrLoss,
    isGain,
    journal,
    reversalJournal,
    blueprint,
  };
}
