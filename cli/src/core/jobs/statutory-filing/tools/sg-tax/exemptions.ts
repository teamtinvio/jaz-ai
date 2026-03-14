/**
 * Singapore corporate income tax exemptions and rebates.
 * Pure functions — no side effects, no I/O.
 */

import { round2 } from './types.js';
import type { ExemptionType, ExemptionResult } from './types.js';
import {
  SG_CIT_RATE,
  SUTE_BANDS,
  PTE_BANDS,
  CIT_REBATE_SCHEDULE,
} from './constants.js';

/**
 * Apply banded exemption (SUTE or PTE).
 * Each band fills in order — excess flows to the next band.
 * Returns the total exempt amount (deducted from chargeable income before applying 17%).
 */
function applyBands(
  chargeableIncome: number,
  bands: ReadonlyArray<{ readonly threshold: number; readonly exemptionRate: number }>,
): number {
  let remaining = chargeableIncome;
  let totalExempt = 0;

  for (const band of bands) {
    if (remaining <= 0) break;
    const inBand = Math.min(remaining, band.threshold);
    totalExempt = round2(totalExempt + round2(inBand * band.exemptionRate));
    remaining = round2(remaining - inBand);
  }

  return totalExempt;
}

/**
 * Compute tax exemption for a given chargeable income.
 *
 * @param chargeableIncome — must be >= 0 (losses already absorbed upstream)
 * @param type — 'sute' | 'pte' | 'none'
 * @returns ExemptionResult with exempt amount, taxable income, and effective rate
 */
export function computeExemption(chargeableIncome: number, type: ExemptionType): ExemptionResult {
  if (chargeableIncome <= 0) {
    return {
      type,
      chargeableIncome: 0,
      exemptAmount: 0,
      taxableIncome: 0,
      effectiveRate: 0,
    };
  }

  let exemptAmount: number;

  switch (type) {
    case 'sute':
      exemptAmount = applyBands(chargeableIncome, SUTE_BANDS);
      break;
    case 'pte':
      exemptAmount = applyBands(chargeableIncome, PTE_BANDS);
      break;
    case 'none':
      exemptAmount = 0;
      break;
  }

  const taxableIncome = round2(chargeableIncome - exemptAmount);
  const grossTax = round2(taxableIncome * SG_CIT_RATE);
  const effectiveRate = chargeableIncome > 0
    ? round2((grossTax / chargeableIncome) * 10000) / 10000  // 4dp for rate
    : 0;

  return {
    type,
    chargeableIncome,
    exemptAmount,
    taxableIncome,
    effectiveRate,
  };
}

/**
 * Compute CIT rebate for a given YA.
 * Rebate = min(grossTax * rebateRate, rebateCap).
 * Returns 0 if no rebate schedule exists for the YA.
 */
export function computeCitRebate(grossTax: number, ya: number): number {
  const schedule = CIT_REBATE_SCHEDULE[ya];
  if (!schedule || grossTax <= 0) return 0;
  return round2(Math.min(grossTax * schedule.rate, schedule.cap));
}
