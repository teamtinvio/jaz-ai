/**
 * Asset disposal gain/loss calculator.
 *
 * Compliance references:
 *  - IAS 16.67-72: Derecognition on disposal or when no future economic benefits expected
 *  - IAS 16.68: Gain/loss = Net disposal proceeds - Carrying amount
 *  - IAS 16.71: Gain ≠ revenue (classified separately in P&L)
 *
 * Computes depreciation to the disposal date (pro-rated partial period),
 * then calculates NBV and gain/loss. Supports SL, DDB, and 150DB methods.
 */

import { round2 } from './types.js';
import type { JournalEntry } from './types.js';
import {
  CalcValidationError,
  validatePositive,
  validateNonNegative,
  validatePositiveInteger,
  validateSalvageLessThanCost,
  validateDateFormat,
} from './validate.js';
import { journalStep, noteStep, fmtCapsuleAmount, fmtAmt } from './blueprint.js';
import type { Blueprint } from './blueprint.js';

export interface AssetDisposalInputs {
  cost: number;
  salvageValue: number;
  usefulLifeYears: number;
  acquisitionDate: string; // YYYY-MM-DD
  disposalDate: string;    // YYYY-MM-DD
  proceeds: number;        // 0 for scrap/write-off
  method?: 'sl' | 'ddb' | '150db'; // default: sl
  currency?: string;
}

export interface AssetDisposalResult {
  type: 'asset-disposal';
  currency: string | null;
  inputs: {
    cost: number;
    salvageValue: number;
    usefulLifeYears: number;
    acquisitionDate: string;
    disposalDate: string;
    proceeds: number;
    method: string;
  };
  monthsHeld: number;
  accumulatedDepreciation: number;
  netBookValue: number;
  gainOrLoss: number;
  isGain: boolean;
  disposalJournal: JournalEntry;
  blueprint: Blueprint | null;
}

/**
 * Count full months between two YYYY-MM-DD dates.
 * Partial months are rounded up (any day in a month counts as a full month).
 */
function monthsBetween(from: string, to: string): number {
  const d1 = new Date(from + 'T00:00:00');
  const d2 = new Date(to + 'T00:00:00');
  const months = (d2.getFullYear() - d1.getFullYear()) * 12 + (d2.getMonth() - d1.getMonth());
  // If disposal day > acquisition day, it's a partial month — round up
  return d2.getDate() >= d1.getDate() ? months + 1 : Math.max(months, 0);
}

/**
 * Compute accumulated depreciation from acquisition to disposal date.
 */
function computeAccumDepreciation(
  cost: number,
  salvageValue: number,
  usefulLifeYears: number,
  method: string,
  monthsHeld: number,
): number {
  const totalMonths = usefulLifeYears * 12;
  const depreciableBase = round2(cost - salvageValue);

  // Cap at useful life — asset is fully depreciated
  const effectiveMonths = Math.min(monthsHeld, totalMonths);

  if (method === 'sl') {
    // Straight-line: pro-rate by months
    const monthlyDep = depreciableBase / totalMonths;
    return round2(Math.min(monthlyDep * effectiveMonths, depreciableBase));
  }

  // DDB / 150DB: compute year-by-year then pro-rate final partial year
  const multiplier = method === 'ddb' ? 2 : 1.5;
  const annualRate = multiplier / usefulLifeYears;
  let bookValue = cost;
  let totalDep = 0;
  let monthsRemaining = effectiveMonths;

  for (let year = 1; year <= usefulLifeYears && monthsRemaining > 0; year++) {
    const remainingYears = usefulLifeYears - year + 1;
    const ddbAmount = round2(bookValue * annualRate);
    const slAmount = round2((bookValue - salvageValue) / remainingYears);
    const useSL = slAmount >= ddbAmount || round2(bookValue - ddbAmount) < salvageValue;
    let annualDep = useSL ? slAmount : ddbAmount;

    // Don't breach salvage floor
    if (round2(bookValue - annualDep) < salvageValue) {
      annualDep = round2(bookValue - salvageValue);
    }

    if (monthsRemaining >= 12) {
      // Full year
      totalDep = round2(totalDep + annualDep);
      bookValue = round2(bookValue - annualDep);
      monthsRemaining -= 12;
    } else {
      // Partial year: pro-rate
      const partialDep = round2(annualDep * monthsRemaining / 12);
      totalDep = round2(totalDep + partialDep);
      monthsRemaining = 0;
    }
  }

  return Math.min(totalDep, depreciableBase);
}

export function calculateAssetDisposal(inputs: AssetDisposalInputs): AssetDisposalResult {
  const {
    cost,
    salvageValue,
    usefulLifeYears,
    acquisitionDate,
    disposalDate,
    proceeds,
    method = 'sl',
    currency,
  } = inputs;

  validatePositive(cost, 'Asset cost');
  validateNonNegative(salvageValue, 'Salvage value');
  validatePositiveInteger(usefulLifeYears, 'Useful life (years)');
  if (salvageValue > 0) validateSalvageLessThanCost(salvageValue, cost);
  validateNonNegative(proceeds, 'Disposal proceeds');
  validateDateFormat(acquisitionDate);
  validateDateFormat(disposalDate);

  // Normalize monetary inputs to 2dp to guarantee balanced journals
  const cost2 = round2(cost);
  const salvage2 = round2(salvageValue);
  const proceeds2 = round2(proceeds);

  // Validate disposal is after acquisition
  if (disposalDate <= acquisitionDate) {
    throw new CalcValidationError('Disposal date must be after acquisition date.');
  }

  const monthsHeld = monthsBetween(acquisitionDate, disposalDate);
  const accumulatedDepreciation = computeAccumDepreciation(cost2, salvage2, usefulLifeYears, method, monthsHeld);
  const netBookValue = round2(cost2 - accumulatedDepreciation);
  const gainOrLoss = round2(proceeds2 - netBookValue);
  const isGain = gainOrLoss >= 0;

  // Build disposal journal entry
  const lines: { account: string; debit: number; credit: number }[] = [];

  if (proceeds2 > 0) {
    lines.push({ account: 'Cash / Bank Account', debit: proceeds2, credit: 0 });
  }
  if (accumulatedDepreciation > 0) {
    lines.push({ account: 'Accumulated Depreciation', debit: accumulatedDepreciation, credit: 0 });
  }
  if (!isGain) {
    lines.push({ account: 'Loss on Disposal', debit: Math.abs(gainOrLoss), credit: 0 });
  }
  lines.push({ account: 'Fixed Asset (at cost)', debit: 0, credit: cost2 });
  if (isGain && gainOrLoss > 0) {
    lines.push({ account: 'Gain on Disposal', debit: 0, credit: gainOrLoss });
  }

  const disposalJournal: JournalEntry = {
    description: `Asset disposal — ${isGain ? (gainOrLoss > 0 ? 'gain' : 'at book value') : 'loss'}`,
    lines,
  };

  // Build blueprint
  const c = currency ?? undefined;
  const methodLabel = method === 'sl' ? 'Straight-line' : method === 'ddb' ? 'Double declining' : '150% declining';
  const workings = [
    `Asset Disposal Workings (IAS 16)`,
    `Cost: ${fmtAmt(cost2, c)} | Salvage: ${fmtAmt(salvage2, c)} | Life: ${usefulLifeYears} years (${methodLabel})`,
    `Acquired: ${acquisitionDate} | Disposed: ${disposalDate} | Held: ${monthsHeld} months`,
    `Accumulated depreciation: ${fmtAmt(accumulatedDepreciation, c)} | NBV: ${fmtAmt(netBookValue, c)}`,
    `Proceeds: ${fmtAmt(proceeds2, c)} | ${isGain ? (gainOrLoss > 0 ? `Gain: ${fmtAmt(gainOrLoss, c)}` : 'At book value (no gain/loss)') : `Loss: ${fmtAmt(Math.abs(gainOrLoss), c)}`}`,
    `Method: IAS 16.68 — Gain/Loss = Proceeds − NBV = ${fmtAmt(proceeds2, c)} − ${fmtAmt(netBookValue, c)} = ${fmtAmt(gainOrLoss, c)}`,
  ].join('\n');
  let blueprint: Blueprint | null = null;
  blueprint = {
    capsuleType: 'Asset Disposal',
    capsuleName: `Asset Disposal — ${fmtCapsuleAmount(cost2, currency)} asset — ${disposalDate}`,
    capsuleDescription: workings,
    tags: ['Asset Disposal'],
    customFields: { 'Asset Description': null },
    steps: [
      journalStep(1, disposalJournal.description, disposalDate, disposalJournal.lines),
      noteStep(2, `Update Jaz FA register: use POST /mark-as-sold/fixed-assets (if sold) or POST /discard-fixed-assets/:id (if scrapped).`, disposalDate),
    ],
  };

  return {
    type: 'asset-disposal',
    currency: currency ?? null,
    inputs: {
      cost: cost2,
      salvageValue: salvage2,
      usefulLifeYears,
      acquisitionDate,
      disposalDate,
      proceeds: proceeds2,
      method,
    },
    monthsHeld,
    accumulatedDepreciation,
    netBookValue,
    gainOrLoss,
    isGain,
    disposalJournal,
    blueprint,
  };
}
