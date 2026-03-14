/**
 * Calculator dispatcher — maps recipe name → calculator function.
 *
 * Single entry point shared by CLI (`commands/recipe.ts`) and agent tools.
 * Eliminates duplicated dispatch logic.
 */

import type { CalcResult } from '../calc/types.js';
import { calculateLoan } from '../calc/loan.js';
import { calculateLease } from '../calc/lease.js';
import { calculateDepreciation } from '../calc/depreciation.js';
import { calculatePrepaidExpense, calculateDeferredRevenue } from '../calc/amortization.js';
import { calculateFxReval } from '../calc/fx-reval.js';
import { calculateEcl } from '../calc/ecl.js';
import { calculateProvision } from '../calc/provision.js';
import { calculateFixedDeposit } from '../calc/fixed-deposit.js';
import { calculateAssetDisposal } from '../calc/asset-disposal.js';
import { calculateAccruedExpense } from '../calc/accrued-expense.js';
import { calculateLeaveAccrual } from '../calc/leave-accrual.js';
import { calculateDividend } from '../calc/dividend.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Params = Record<string, any>;

/**
 * All supported recipe types. Used for validation and enum generation.
 */
export const RECIPE_TYPES = [
  'loan',
  'lease',
  'depreciation',
  'prepaid-expense',
  'deferred-revenue',
  'fx-reval',
  'ecl',
  'provision',
  'fixed-deposit',
  'asset-disposal',
  'accrued-expense',
  'leave-accrual',
  'dividend',
] as const;

export type RecipeType = (typeof RECIPE_TYPES)[number];

/**
 * Run a calculator by recipe type.
 * Throws on unknown recipe type or calculator validation errors.
 */
export function runCalculator(recipe: string, params: Params): CalcResult {
  switch (recipe) {
    case 'loan':
      return calculateLoan({
        principal: params.principal,
        annualRate: params.annualRate ?? params.rate,
        termMonths: params.termMonths ?? params.term,
        startDate: params.startDate,
        currency: params.currency,
      });
    case 'lease':
      return calculateLease({
        monthlyPayment: params.monthlyPayment ?? params.payment,
        termMonths: params.termMonths ?? params.term,
        annualRate: params.annualRate ?? params.rate,
        usefulLifeMonths: params.usefulLifeMonths ?? params.usefulLife,
        startDate: params.startDate,
        currency: params.currency,
      });
    case 'depreciation':
      return calculateDepreciation({
        cost: params.cost,
        salvageValue: params.salvageValue ?? params.salvage,
        usefulLifeYears: params.usefulLifeYears ?? params.life,
        method: params.method ?? 'ddb',
        frequency: params.frequency ?? 'annual',
        currency: params.currency,
      });
    case 'prepaid-expense':
      return calculatePrepaidExpense({
        amount: params.amount,
        periods: params.periods,
        frequency: params.frequency ?? 'monthly',
        startDate: params.startDate,
        currency: params.currency,
      });
    case 'deferred-revenue':
      return calculateDeferredRevenue({
        amount: params.amount,
        periods: params.periods,
        frequency: params.frequency ?? 'monthly',
        startDate: params.startDate,
        currency: params.currency,
      });
    case 'fx-reval':
      return calculateFxReval({
        amount: params.amount,
        bookRate: params.bookRate,
        closingRate: params.closingRate,
        currency: params.currency ?? 'USD',
        baseCurrency: params.baseCurrency ?? 'SGD',
      });
    case 'ecl':
      return calculateEcl({
        buckets: params.buckets,
        existingProvision: params.existingProvision ?? 0,
        currency: params.currency,
      });
    case 'provision':
      return calculateProvision({
        amount: params.amount,
        annualRate: params.annualRate ?? params.rate,
        termMonths: params.termMonths ?? params.term,
        startDate: params.startDate,
        currency: params.currency,
      });
    case 'fixed-deposit':
      return calculateFixedDeposit({
        principal: params.principal,
        annualRate: params.annualRate ?? params.rate,
        termMonths: params.termMonths ?? params.term,
        compounding: params.compounding ?? params.compound ?? 'none',
        startDate: params.startDate,
        currency: params.currency,
      });
    case 'asset-disposal':
      return calculateAssetDisposal({
        cost: params.cost,
        salvageValue: params.salvageValue ?? params.salvage,
        usefulLifeYears: params.usefulLifeYears ?? params.life,
        acquisitionDate: params.acquisitionDate ?? params.acquired,
        disposalDate: params.disposalDate ?? params.disposed,
        proceeds: params.proceeds,
        method: params.method ?? 'sl',
        currency: params.currency,
      });
    case 'accrued-expense':
      return calculateAccruedExpense({
        amount: params.amount,
        periods: params.periods,
        frequency: params.frequency ?? 'monthly',
        startDate: params.startDate,
        currency: params.currency,
      });
    case 'leave-accrual':
      return calculateLeaveAccrual({
        employees: params.employees,
        daysPerYear: params.daysPerYear ?? params.days,
        dailyRate: params.dailyRate,
        periods: params.periods,
        startDate: params.startDate,
        currency: params.currency,
      });
    case 'dividend':
      return calculateDividend({
        amount: params.amount,
        declarationDate: params.declarationDate,
        paymentDate: params.paymentDate,
        withholdingRate: params.withholdingRate ?? 0,
        currency: params.currency,
      });
    default:
      throw new Error(`Unknown recipe type: "${recipe}". Valid types: ${RECIPE_TYPES.join(', ')}`);
  }
}
