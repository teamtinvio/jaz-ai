/**
 * Singapore capital allowance schedule calculator.
 * Computes per-asset CA claims for a given Year of Assessment.
 */

import { round2 } from './types.js';
import type { CaAsset, CaScheduleRow, SgCapitalAllowanceInput, SgCapitalAllowanceResult } from './types.js';
import { validateCaInput } from './validate.js';
import { CA_RATES, LOW_VALUE_YA_CAP, S14Q_BLOCK_CAP } from './constants.js';

/**
 * Compute CA for a single asset in the given YA.
 * Returns the current year claim (may be zero if fully claimed).
 */
function computeAssetCa(asset: CaAsset): CaScheduleRow {
  const rate = CA_RATES[asset.category];
  if (!rate) {
    // Shouldn't happen after validation, but defensive
    return {
      description: asset.description,
      cost: asset.cost,
      category: asset.category,
      section: 'Unknown',
      totalClaimedPrior: asset.priorYearsClaimed,
      currentYearClaim: 0,
      totalClaimedToDate: asset.priorYearsClaimed,
      remainingUnabsorbed: round2(asset.cost - asset.priorYearsClaimed),
    };
  }

  // IP category: use custom write-off years if provided
  let annualRate = rate.annualRate;
  if (asset.category === 'ip' && asset.ipWriteOffYears) {
    annualRate = 1 / asset.ipWriteOffYears;
  }

  const unclaimed = round2(asset.cost - asset.priorYearsClaimed);
  if (unclaimed <= 0) {
    return {
      description: asset.description,
      cost: asset.cost,
      category: asset.category,
      section: rate.section,
      totalClaimedPrior: asset.priorYearsClaimed,
      currentYearClaim: 0,
      totalClaimedToDate: asset.cost,
      remainingUnabsorbed: 0,
    };
  }

  // Annual claim = cost × annual rate, capped at remaining unclaimed
  const rawClaim = round2(asset.cost * annualRate);
  const currentYearClaim = round2(Math.min(rawClaim, unclaimed));
  const totalClaimedToDate = round2(asset.priorYearsClaimed + currentYearClaim);
  const remainingUnabsorbed = round2(asset.cost - totalClaimedToDate);

  return {
    description: asset.description,
    cost: asset.cost,
    category: asset.category,
    section: rate.section,
    totalClaimedPrior: asset.priorYearsClaimed,
    currentYearClaim,
    totalClaimedToDate,
    remainingUnabsorbed,
  };
}

/**
 * Compute the full capital allowance schedule for a set of assets.
 *
 * Applies:
 * - Per-asset CA computation using IRAS rates
 * - Low-value asset $30K/YA total cap (S19A(2))
 * - S14Q renovation $300K per 3-year block cap
 * - Unabsorbed CA brought forward added to total available
 */
export function computeCapitalAllowances(input: SgCapitalAllowanceInput): SgCapitalAllowanceResult {
  validateCaInput(input);

  const currency = input.currency ?? 'SGD';

  // Step 1: Compute raw per-asset claims
  const rawRows = input.assets.map(a => computeAssetCa(a));

  // Step 2: Apply low-value YA cap ($30K total for all low-value assets)
  let lowValueTotal = 0;
  let lowValueCount = 0;
  let lowValueCapped = false;

  const rows: CaScheduleRow[] = rawRows.map(row => {
    if (row.category === 'low-value' && row.currentYearClaim > 0) {
      lowValueCount++;
      const available = round2(LOW_VALUE_YA_CAP - lowValueTotal);
      if (available <= 0) {
        lowValueCapped = true;
        return { ...row, currentYearClaim: 0, totalClaimedToDate: row.totalClaimedPrior, remainingUnabsorbed: round2(row.cost - row.totalClaimedPrior) };
      }
      const cappedClaim = round2(Math.min(row.currentYearClaim, available));
      if (cappedClaim < row.currentYearClaim) lowValueCapped = true;
      lowValueTotal = round2(lowValueTotal + cappedClaim);
      return {
        ...row,
        currentYearClaim: cappedClaim,
        totalClaimedToDate: round2(row.totalClaimedPrior + cappedClaim),
        remainingUnabsorbed: round2(row.cost - row.totalClaimedPrior - cappedClaim),
      };
    }
    if (row.category === 'low-value') lowValueCount++;
    return row;
  });

  // Step 3: Apply S14Q renovation cap ($300K per 3-year block)
  // Simplified: we cap total renovation claims at $300K, leaving detailed
  // 3-year block tracking to the AI agent (which has multi-year context).
  let renovationTotal = 0;
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (row.category === 'renovation' && row.currentYearClaim > 0) {
      const available = round2(S14Q_BLOCK_CAP - renovationTotal);
      if (available <= 0) {
        rows[i] = { ...row, currentYearClaim: 0, totalClaimedToDate: row.totalClaimedPrior, remainingUnabsorbed: round2(row.cost - row.totalClaimedPrior) };
        continue;
      }
      const cappedClaim = round2(Math.min(row.currentYearClaim, available));
      renovationTotal = round2(renovationTotal + cappedClaim);
      if (cappedClaim < row.currentYearClaim) {
        rows[i] = {
          ...row,
          currentYearClaim: cappedClaim,
          totalClaimedToDate: round2(row.totalClaimedPrior + cappedClaim),
          remainingUnabsorbed: round2(row.cost - row.totalClaimedPrior - cappedClaim),
        };
      }
    }
  }

  // Step 4: Totals
  const totalCurrentYearClaim = round2(rows.reduce((sum, r) => sum + r.currentYearClaim, 0));
  const totalAvailable = round2(totalCurrentYearClaim + input.unabsorbedBroughtForward);

  // Step 5: Build workings
  const lines: string[] = [
    `Capital Allowance Schedule — YA ${input.ya}`,
    '',
  ];

  for (const row of rows) {
    lines.push(
      `${row.description} (${row.section}): Cost ${currency} ${row.cost.toLocaleString('en-US', { minimumFractionDigits: 2 })} → ` +
      `Claim ${currency} ${row.currentYearClaim.toLocaleString('en-US', { minimumFractionDigits: 2 })} ` +
      `(${row.totalClaimedToDate.toLocaleString('en-US', { minimumFractionDigits: 2 })} to date, ` +
      `${row.remainingUnabsorbed.toLocaleString('en-US', { minimumFractionDigits: 2 })} remaining)`,
    );
  }

  if (lowValueCapped) {
    lines.push(`\nNote: Low-value asset claims capped at ${currency} ${LOW_VALUE_YA_CAP.toLocaleString()} per YA`);
  }

  lines.push('');
  lines.push(`Current year CA: ${currency} ${totalCurrentYearClaim.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
  lines.push(`Unabsorbed b/f:  ${currency} ${input.unabsorbedBroughtForward.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
  lines.push(`Total available:  ${currency} ${totalAvailable.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);

  return {
    type: 'sg-capital-allowance',
    ya: input.ya,
    currency,
    assets: rows,
    totalCurrentYearClaim,
    lowValueCount,
    lowValueTotal,
    lowValueCapped,
    unabsorbedBroughtForward: input.unabsorbedBroughtForward,
    totalAvailable,
    workings: lines.join('\n'),
  };
}
