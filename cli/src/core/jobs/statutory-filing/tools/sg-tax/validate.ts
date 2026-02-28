/**
 * Input validation for clio tax computations.
 * Throws TaxValidationError with user-friendly messages.
 */

import type { ExemptionType, AssetCategory, SgFormCsInput, SgCapitalAllowanceInput } from './types.js';
import { EXEMPTION_TYPES, ASSET_CATEGORIES } from './types.js';

export class TaxValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TaxValidationError';
  }
}

export function validateYa(ya: number): void {
  if (!Number.isFinite(ya) || !Number.isInteger(ya)) {
    throw new TaxValidationError(`Year of Assessment must be an integer (got ${ya})`);
  }
  if (ya < 2020 || ya > 2100) {
    throw new TaxValidationError(`Year of Assessment must be between 2020 and 2100 (got ${ya})`);
  }
}

export function validateNonNegative(value: number, name: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new TaxValidationError(`${name} must be zero or positive (got ${value})`);
  }
}

export function validatePositive(value: number, name: string): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new TaxValidationError(`${name} must be a positive number (got ${value})`);
  }
}

export function validateExemptionType(type: string): asserts type is ExemptionType {
  if (!EXEMPTION_TYPES.includes(type as ExemptionType)) {
    throw new TaxValidationError(
      `Invalid exemption type: "${type}". Must be one of: ${EXEMPTION_TYPES.join(', ')}`
    );
  }
}

export function validateAssetCategory(cat: string): asserts cat is AssetCategory {
  if (!ASSET_CATEGORIES.includes(cat as AssetCategory)) {
    throw new TaxValidationError(
      `Invalid asset category: "${cat}". Must be one of: ${ASSET_CATEGORIES.join(', ')}`
    );
  }
}

export function validateDateFormat(date: string, name: string): void {
  const m = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) {
    throw new TaxValidationError(`${name} must be YYYY-MM-DD format (got "${date}")`);
  }
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const da = Number(m[3]);
  const d = new Date(Date.UTC(y, mo - 1, da));
  if (d.getUTCFullYear() !== y || d.getUTCMonth() !== mo - 1 || d.getUTCDate() !== da) {
    throw new TaxValidationError(`Invalid ${name}: "${date}"`);
  }
}

/** Validate the full SgFormCsInput structure. */
export function validateFormCsInput(input: SgFormCsInput): void {
  validateYa(input.ya);
  validateDateFormat(input.basisPeriodStart, 'basisPeriodStart');
  validateDateFormat(input.basisPeriodEnd, 'basisPeriodEnd');
  if (input.basisPeriodStart > input.basisPeriodEnd) {
    throw new TaxValidationError(
      `basisPeriodStart (${input.basisPeriodStart}) must be on or before basisPeriodEnd (${input.basisPeriodEnd})`
    );
  }
  validateNonNegative(input.revenue, 'revenue');
  // accountingProfit can be negative (loss)

  // Add-backs — all must be non-negative
  const ab = input.addBacks;
  validateNonNegative(ab.depreciation, 'addBacks.depreciation');
  validateNonNegative(ab.amortization, 'addBacks.amortization');
  validateNonNegative(ab.rouDepreciation, 'addBacks.rouDepreciation');
  validateNonNegative(ab.leaseInterest, 'addBacks.leaseInterest');
  validateNonNegative(ab.generalProvisions, 'addBacks.generalProvisions');
  validateNonNegative(ab.donations, 'addBacks.donations');
  validateNonNegative(ab.entertainment, 'addBacks.entertainment');
  validateNonNegative(ab.penalties, 'addBacks.penalties');
  validateNonNegative(ab.privateCar, 'addBacks.privateCar');
  validateNonNegative(ab.capitalExpOnPnl, 'addBacks.capitalExpOnPnl');
  validateNonNegative(ab.unrealizedFxLoss, 'addBacks.unrealizedFxLoss');
  validateNonNegative(ab.otherNonDeductible, 'addBacks.otherNonDeductible');

  // Deductions — all must be non-negative
  const ded = input.deductions;
  validateNonNegative(ded.actualLeasePayments, 'deductions.actualLeasePayments');
  validateNonNegative(ded.unrealizedFxGain, 'deductions.unrealizedFxGain');
  validateNonNegative(ded.exemptDividends, 'deductions.exemptDividends');
  validateNonNegative(ded.exemptIncome, 'deductions.exemptIncome');
  validateNonNegative(ded.otherDeductions, 'deductions.otherDeductions');

  // Capital allowances
  validateNonNegative(input.capitalAllowances.currentYearClaim, 'capitalAllowances.currentYearClaim');
  validateNonNegative(input.capitalAllowances.balanceBroughtForward, 'capitalAllowances.balanceBroughtForward');

  // Enhanced deductions
  const ed = input.enhancedDeductions;
  validateNonNegative(ed.rdExpenditure, 'enhancedDeductions.rdExpenditure');
  validateNonNegative(ed.ipRegistration, 'enhancedDeductions.ipRegistration');
  validateNonNegative(ed.donations250Base, 'enhancedDeductions.donations250Base');
  validateNonNegative(ed.s14qRenovation, 'enhancedDeductions.s14qRenovation');

  // Carry-forwards
  validateNonNegative(input.losses.broughtForward, 'losses.broughtForward');
  validateNonNegative(input.donationsCarryForward.broughtForward, 'donationsCarryForward.broughtForward');

  validateExemptionType(input.exemptionType);
}

/** Validate the SgCapitalAllowanceInput structure. */
export function validateCaInput(input: SgCapitalAllowanceInput): void {
  validateYa(input.ya);
  validateNonNegative(input.unabsorbedBroughtForward, 'unabsorbedBroughtForward');

  if (!Array.isArray(input.assets) || input.assets.length === 0) {
    throw new TaxValidationError('At least one asset is required');
  }

  for (let i = 0; i < input.assets.length; i++) {
    const asset = input.assets[i];
    validatePositive(asset.cost, `assets[${i}].cost`);
    validateDateFormat(asset.acquisitionDate, `assets[${i}].acquisitionDate`);
    validateAssetCategory(asset.category);
    validateNonNegative(asset.priorYearsClaimed, `assets[${i}].priorYearsClaimed`);

    if (asset.priorYearsClaimed > asset.cost) {
      throw new TaxValidationError(
        `assets[${i}].priorYearsClaimed (${asset.priorYearsClaimed}) exceeds cost (${asset.cost})`
      );
    }

    if (asset.category === 'ip' && asset.ipWriteOffYears != null) {
      const valid = [5, 10, 15];
      if (!valid.includes(asset.ipWriteOffYears)) {
        throw new TaxValidationError(
          `assets[${i}].ipWriteOffYears must be 5, 10, or 15 (got ${asset.ipWriteOffYears})`
        );
      }
    }

    if (asset.category === 'low-value' && asset.cost > 5000) {
      throw new TaxValidationError(
        `assets[${i}] is 'low-value' but cost (${asset.cost}) exceeds $5,000 threshold`
      );
    }
  }
}
