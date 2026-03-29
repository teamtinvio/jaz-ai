/**
 * Depreciation schedule calculator.
 *
 * Methods:
 *  - sl:    Straight-line (cost - salvage) / life
 *  - ddb:   Double declining balance (2 / life), auto switch-to-SL
 *  - 150db: 150% declining balance (1.5 / life), auto switch-to-SL
 *
 * Book value never goes below salvage value.
 * Total depreciation always equals (cost - salvage).
 */

import { round2 } from './types.js';
import type { DepreciationResult, DepreciationRow, JournalEntry } from './types.js';
import { validatePositive, validateNonNegative, validatePositiveInteger, validateSalvageLessThanCost } from './validate.js';
import { journalStep, fmtAmt } from './blueprint.js';
import type { Blueprint } from './blueprint.js';

export interface DepreciationInputs {
  cost: number;
  salvageValue: number;
  usefulLifeYears: number;
  method?: 'ddb' | '150db' | 'sl'; // default ddb
  frequency?: 'annual' | 'monthly'; // default annual
  currency?: string;
}

export function calculateDepreciation(inputs: DepreciationInputs): DepreciationResult {
  const {
    cost,
    salvageValue,
    usefulLifeYears,
    method = 'ddb',
    frequency = 'annual',
    currency,
  } = inputs;

  validatePositive(cost, 'Asset cost');
  validateNonNegative(salvageValue, 'Salvage value');
  validatePositiveInteger(usefulLifeYears, 'Useful life (years)');
  if (salvageValue > 0) validateSalvageLessThanCost(salvageValue, cost);

  const depreciableBase = round2(cost - salvageValue);

  if (method === 'sl') {
    return buildStraightLineResult(cost, salvageValue, usefulLifeYears, depreciableBase, frequency, currency);
  }

  const multiplier = method === 'ddb' ? 2 : 1.5;
  const annualRate = multiplier / usefulLifeYears;

  if (frequency === 'annual') {
    return buildDecliningSchedule(cost, salvageValue, usefulLifeYears, annualRate, depreciableBase, method, currency);
  }

  // Monthly: compute annual schedule then subdivide each year into 12 equal months
  const annual = buildDecliningSchedule(cost, salvageValue, usefulLifeYears, annualRate, depreciableBase, method, currency);
  const monthlySchedule: DepreciationRow[] = [];
  let periodNum = 0;

  for (const yearRow of annual.schedule) {
    const monthlyAmount = round2(yearRow.depreciation / 12);
    let yearRemaining = yearRow.depreciation;

    for (let m = 1; m <= 12; m++) {
      periodNum++;
      const isLastMonth = m === 12;
      const dep = isLastMonth ? round2(yearRemaining) : monthlyAmount;
      yearRemaining = round2(yearRemaining - dep);

      const openingBV = periodNum === 1
        ? cost
        : round2(monthlySchedule[periodNum - 2].closingBookValue);
      const closingBV = round2(openingBV - dep);

      const journal: JournalEntry = {
        description: `${yearRow.methodUsed} depreciation — Month ${periodNum} of ${usefulLifeYears * 12}`,
        lines: [
          { account: 'Depreciation Expense', debit: dep, credit: 0 },
          { account: 'Accumulated Depreciation', debit: 0, credit: dep },
        ],
      };

      monthlySchedule.push({
        period: periodNum,
        date: null,
        openingBookValue: openingBV,
        ddbAmount: round2(yearRow.ddbAmount / 12),
        slAmount: round2(yearRow.slAmount / 12),
        methodUsed: yearRow.methodUsed,
        depreciation: dep,
        closingBookValue: closingBV,
        journal,
      });
    }
  }

  return {
    type: 'depreciation',
    currency: currency ?? null,
    inputs: { cost, salvageValue, usefulLifeYears, method, frequency },
    totalDepreciation: depreciableBase,
    schedule: monthlySchedule,
    blueprint: annual.blueprint, // reuse annual blueprint (monthly is just subdivision)
  };
}

function buildStraightLineResult(
  cost: number,
  salvageValue: number,
  usefulLifeYears: number,
  depreciableBase: number,
  frequency: 'annual' | 'monthly',
  currency?: string,
): DepreciationResult {
  const totalPeriods = frequency === 'monthly' ? usefulLifeYears * 12 : usefulLifeYears;
  const perPeriod = round2(depreciableBase / totalPeriods);
  const periodLabel = frequency === 'monthly' ? 'Month' : 'Year';
  const totalLabel = frequency === 'monthly' ? usefulLifeYears * 12 : usefulLifeYears;

  const schedule: DepreciationRow[] = [];
  let bookValue = cost;

  for (let i = 1; i <= totalPeriods; i++) {
    const openingBV = round2(bookValue);
    const isFinal = i === totalPeriods;
    const dep = isFinal ? round2(openingBV - salvageValue) : perPeriod;
    bookValue = round2(openingBV - dep);

    const journal: JournalEntry = {
      description: `SL depreciation — ${periodLabel} ${i} of ${totalLabel}`,
      lines: [
        { account: 'Depreciation Expense', debit: dep, credit: 0 },
        { account: 'Accumulated Depreciation', debit: 0, credit: dep },
      ],
    };

    schedule.push({
      period: i,
      date: null,
      openingBookValue: openingBV,
      ddbAmount: 0,
      slAmount: dep,
      methodUsed: 'SL',
      depreciation: dep,
      closingBookValue: bookValue,
      journal,
    });
  }

  const blueprintSteps = schedule.map((row, idx) =>
    journalStep(idx + 1, row.journal.description, row.date, row.journal.lines)
  );

  const c = currency ?? undefined;
  const workings = [
    `Straight-Line Depreciation Workings`,
    `Cost: ${fmtAmt(cost, c)} | Salvage: ${fmtAmt(salvageValue, c)} | Depreciable base: ${fmtAmt(depreciableBase, c)}`,
    `Useful life: ${usefulLifeYears} years | Frequency: ${frequency}`,
    `Per ${frequency === 'monthly' ? 'month' : 'year'}: ${fmtAmt(perPeriod, c)}`,
    `Total depreciation: ${fmtAmt(depreciableBase, c)}`,
    `Method: (Cost − Salvage) ÷ Life = ${fmtAmt(depreciableBase, c)} ÷ ${totalPeriods} = ${fmtAmt(perPeriod, c)}`,
    `Rounding: 2dp per period, final period closes to salvage value`,
  ].join('\n');
  return {
    type: 'depreciation',
    currency: currency ?? null,
    inputs: { cost, salvageValue, usefulLifeYears, method: 'sl', frequency },
    totalDepreciation: depreciableBase,
    schedule,
    blueprint: {
      capsuleType: 'Depreciation',
      capsuleName: `SL Depreciation — ${usefulLifeYears} years`,
      capsuleDescription: workings,
      tags: ['Depreciation'],
      customFields: { 'Asset ID': null },
      steps: blueprintSteps,
    },
  };
}

function buildDecliningSchedule(
  cost: number,
  salvageValue: number,
  usefulLifeYears: number,
  annualRate: number,
  depreciableBase: number,
  method: string,
  currency?: string,
): DepreciationResult {
  const schedule: DepreciationRow[] = [];
  let bookValue = cost;

  for (let year = 1; year <= usefulLifeYears; year++) {
    const openingBV = round2(bookValue);
    const remainingYears = usefulLifeYears - year + 1;

    // DDB amount (rate × opening book value)
    const ddbAmount = round2(openingBV * annualRate);

    // SL for remaining life: (book value - salvage) / remaining years
    const slAmount = round2((openingBV - salvageValue) / remainingYears);

    // Switch to SL when SL >= DDB, or when DDB would push below salvage
    const ddbCapped = round2(openingBV - ddbAmount) < salvageValue;
    const useSL = slAmount >= ddbAmount || ddbCapped;
    const methodUsed: 'DDB' | 'SL' | '150DB' = useSL ? 'SL' : (method === '150db' ? '150DB' : 'DDB');

    // Depreciation cannot push book value below salvage
    let depreciation = useSL ? slAmount : ddbAmount;
    if (round2(openingBV - depreciation) < salvageValue) {
      depreciation = round2(openingBV - salvageValue);
    }

    bookValue = round2(openingBV - depreciation);

    const journal: JournalEntry = {
      description: `${methodUsed} depreciation — Year ${year} of ${usefulLifeYears}`,
      lines: [
        { account: 'Depreciation Expense', debit: depreciation, credit: 0 },
        { account: 'Accumulated Depreciation', debit: 0, credit: depreciation },
      ],
    };

    schedule.push({
      period: year,
      date: null,
      openingBookValue: openingBV,
      ddbAmount,
      slAmount,
      methodUsed,
      depreciation,
      closingBookValue: bookValue,
      journal,
    });
  }

  const blueprintSteps = schedule.map((row, idx) =>
    journalStep(idx + 1, row.journal.description, row.date, row.journal.lines)
  );

  const c = currency ?? undefined;
  const methodLabel = method === 'ddb' ? 'Double Declining Balance' : '150% Declining Balance';
  const ratePercent = round2(annualRate * 100);
  const workings = [
    `${methodLabel} Depreciation Workings`,
    `Cost: ${fmtAmt(cost, c)} | Salvage: ${fmtAmt(salvageValue, c)} | Depreciable base: ${fmtAmt(depreciableBase, c)}`,
    `Useful life: ${usefulLifeYears} years | Rate: ${ratePercent}% (${method === 'ddb' ? '2' : '1.5'} ÷ ${usefulLifeYears})`,
    `Total depreciation: ${fmtAmt(depreciableBase, c)}`,
    `Method: ${method.toUpperCase()} with auto switch to SL when SL ≥ declining or floor hit`,
    `Rounding: 2dp per period, book value never falls below salvage`,
  ].join('\n');
  return {
    type: 'depreciation',
    currency: currency ?? null,
    inputs: { cost, salvageValue, usefulLifeYears, method, frequency: 'annual' },
    totalDepreciation: depreciableBase,
    schedule,
    blueprint: {
      capsuleType: 'Depreciation',
      capsuleName: `${method.toUpperCase()} Depreciation — ${usefulLifeYears} years`,
      capsuleDescription: workings,
      tags: ['Depreciation'],
      customFields: { 'Asset ID': null },
      steps: blueprintSteps,
    },
  };
}
