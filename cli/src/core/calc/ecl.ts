/**
 * Expected Credit Loss (ECL) calculator — IFRS 9 simplified approach.
 *
 * Builds a provision matrix from aged receivables buckets and historical
 * loss rates, then calculates the required provision adjustment.
 *
 * Compliance references:
 *  - IFRS 9.5.5.15: Simplified approach for trade receivables
 *  - IFRS 9.B5.5.35: Provision matrix method
 *  - IFRS 9.5.5.17: Always recognize lifetime ECL (no staging)
 *
 * Standard aging buckets: Current, 1-30d, 31-60d, 61-90d, 91+d
 * Each bucket gets a historical loss rate (%) applied.
 * The delta between total ECL and existing provision = period charge.
 */

import { round2 } from './types.js';
import type { EclResult, EclBucketRow, JournalEntry } from './types.js';
import { validateNonNegative } from './validate.js';
import { journalStep, fmtCapsuleAmount, fmtAmt } from './blueprint.js';
import type { Blueprint } from './blueprint.js';

export interface EclBucketInput {
  name: string;
  balance: number;
  rate: number; // loss rate as percentage (e.g. 2 for 2%)
}

export interface EclInputs {
  buckets: EclBucketInput[];
  existingProvision?: number; // current allowance balance (default 0)
  currency?: string;
}

export function calculateEcl(inputs: EclInputs): EclResult {
  const { buckets, existingProvision = 0, currency } = inputs;

  // Validate each bucket
  for (const b of buckets) {
    validateNonNegative(b.balance, `${b.name} balance`);
    validateNonNegative(b.rate, `${b.name} loss rate`);
  }
  validateNonNegative(existingProvision, 'Existing provision');

  // Calculate ECL per bucket
  const bucketDetails: EclBucketRow[] = buckets.map(b => ({
    bucket: b.name,
    balance: b.balance,
    lossRate: b.rate,
    ecl: round2(b.balance * b.rate / 100),
  }));

  const totalReceivables = round2(buckets.reduce((sum, b) => sum + b.balance, 0));
  const totalEcl = round2(bucketDetails.reduce((sum, b) => sum + b.ecl, 0));
  const adjustmentRequired = round2(totalEcl - existingProvision);
  const isIncrease = adjustmentRequired >= 0;
  const absAdj = Math.abs(adjustmentRequired);

  // Weighted average loss rate for summary
  const weightedRate = totalReceivables > 0
    ? round2(totalEcl / totalReceivables * 100 * 100) / 100  // round to 2dp %
    : 0;

  // Journal entry for the provision adjustment
  let journal: JournalEntry;
  if (isIncrease) {
    journal = {
      description: `ECL provision increase — IFRS 9 simplified approach`,
      lines: [
        { account: 'Bad Debt Expense', debit: absAdj, credit: 0 },
        { account: 'Allowance for Doubtful Debts', debit: 0, credit: absAdj },
      ],
    };
  } else {
    journal = {
      description: `ECL provision release — IFRS 9 simplified approach`,
      lines: [
        { account: 'Allowance for Doubtful Debts', debit: absAdj, credit: 0 },
        { account: 'Bad Debt Expense', debit: 0, credit: absAdj },
      ],
    };
  }

  // Blueprint
  const c = currency ?? undefined;
  const bucketWorkings = bucketDetails.map(b => `  ${b.bucket}: ${fmtAmt(b.balance, c)} × ${b.lossRate}% = ${fmtAmt(b.ecl, c)}`).join('\n');
  const workings = [
    `ECL Provision Matrix Workings (IFRS 9)`,
    `Total receivables: ${fmtAmt(totalReceivables, c)} | Weighted avg loss rate: ${weightedRate}%`,
    `Provision matrix:`,
    bucketWorkings,
    `Total ECL required: ${fmtAmt(totalEcl, c)} | Existing provision: ${fmtAmt(existingProvision, c)}`,
    `Adjustment: ${fmtAmt(Math.abs(adjustmentRequired), c)} (${isIncrease ? 'increase' : 'release'})`,
    `Method: IFRS 9.5.5.15 simplified approach — lifetime ECL, provision matrix`,
  ].join('\n');
  const blueprint: Blueprint = {
    capsuleType: 'ECL Provision',
    capsuleName: `ECL Provision — ${fmtCapsuleAmount(totalEcl, currency)} — ${buckets.length} buckets`,
    capsuleDescription: workings,
    tags: ['ECL', 'Bad Debt'],
    customFields: { 'Reporting Period': null, 'Aged Receivables Report Date': null },
    steps: [
      journalStep(1, journal.description, null, journal.lines),
    ],
  };

  return {
    type: 'ecl',
    currency: currency ?? null,
    inputs: {
      buckets: buckets.map(b => ({ name: b.name, balance: b.balance, rate: b.rate })),
      existingProvision,
    },
    totalReceivables,
    totalEcl,
    weightedRate,
    adjustmentRequired,
    isIncrease,
    bucketDetails,
    journal,
    blueprint,
  };
}
