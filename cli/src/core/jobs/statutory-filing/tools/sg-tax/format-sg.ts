/**
 * Singapore tax result formatters.
 * Professional-grade tax computation schedule and CA schedule output.
 */

import chalk from 'chalk';
import type { SgFormCsResult, SgCapitalAllowanceResult, TaxScheduleLine } from './types.js';

const fmt = (n: number): string => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtR = (n: number): string => fmt(Math.abs(n)).padStart(16);
const line = (w: number): string => chalk.dim('─'.repeat(w));
const dline = (w: number): string => chalk.dim('═'.repeat(w));

// ── Form C-S / C-S Lite ──────────────────────────────────────────

export function printFormCsResult(result: SgFormCsResult): void {
  const W = 80;
  const ccy = result.currency;

  console.log();
  console.log(chalk.bold(`SINGAPORE CORPORATE INCOME TAX COMPUTATION — YA ${result.ya}`));
  console.log(line(W));
  console.log(`  Form type:      ${chalk.bold(result.formType)}${result.eligible ? chalk.green(' ✓ Eligible') : chalk.red(' ✗ Not eligible')}`);
  console.log(`  Basis period:   ${result.basisPeriod}`);
  console.log(`  Currency:       ${ccy}`);
  console.log(line(W));

  // Tax computation schedule
  console.log();
  console.log(chalk.bold('TAX COMPUTATION SCHEDULE'));
  console.log(line(W));

  for (const entry of result.schedule) {
    printScheduleLine(entry, ccy, W);
  }

  console.log(dline(W));

  // Carry-forwards
  if (result.unabsorbedLosses > 0 || result.unabsorbedCapitalAllowances > 0 || result.unabsorbedDonations > 0) {
    console.log();
    console.log(chalk.bold('CARRY-FORWARDS TO NEXT YA'));
    console.log(line(W));
    if (result.unabsorbedLosses > 0) {
      console.log(`  Unabsorbed trade losses:          ${ccy} ${fmtR(result.unabsorbedLosses)}`);
    }
    if (result.unabsorbedCapitalAllowances > 0) {
      console.log(`  Unabsorbed capital allowances:    ${ccy} ${fmtR(result.unabsorbedCapitalAllowances)}`);
    }
    if (result.unabsorbedDonations > 0) {
      console.log(`  Unabsorbed donations:             ${ccy} ${fmtR(result.unabsorbedDonations)}`);
    }
  }

  // Form C-S field mapping
  console.log();
  console.log(chalk.bold(`FORM ${result.formType} FIELD MAPPING`));
  console.log(line(W));
  for (const f of result.formFields) {
    const val = typeof f.value === 'number' ? `${ccy} ${fmt(f.value)}` : String(f.value);
    console.log(`  Box ${String(f.box).padStart(2)}: ${f.label.padEnd(35)} ${val}`);
    console.log(chalk.dim(`         ${f.source}`));
  }

  // Workings
  console.log();
  console.log(chalk.bold('WORKINGS'));
  console.log(line(W));
  for (const l of result.workings.split('\n')) {
    console.log(`  ${l}`);
  }
  console.log();
}

function printScheduleLine(entry: TaxScheduleLine, ccy: string, _w: number): void {
  const indent = entry.indent ?? 0;
  const prefix = '  '.repeat(indent + 1);
  const label = entry.label;
  const ref = entry.reference ? chalk.dim(` (${entry.reference})`) : '';

  // Main lines are bold, sub-items are dim
  if (indent === 0) {
    const isSubtotal = label.includes('Adjusted profit') || label.includes('Chargeable income') ||
                        label.includes('Taxable income') || label.includes('Net tax payable') ||
                        label.includes('Tax @');
    const formatted = `${prefix}${label.padEnd(45 - indent * 2)}${ccy} ${fmtR(entry.amount)}${ref}`;
    if (isSubtotal) {
      console.log(chalk.bold(formatted));
    } else {
      console.log(formatted);
    }
  } else {
    console.log(chalk.dim(`${prefix}${label.padEnd(43 - indent * 2)}${ccy} ${fmtR(entry.amount)}${ref}`));
  }
}

// ── Capital Allowance Schedule ────────────────────────────────────

export function printCaResult(result: SgCapitalAllowanceResult): void {
  const W = 110;
  const ccy = result.currency;

  console.log();
  console.log(chalk.bold(`CAPITAL ALLOWANCE SCHEDULE — YA ${result.ya}`));
  console.log(line(W));

  // Header row
  const header = [
    'Description'.padEnd(25),
    'Section'.padEnd(10),
    'Cost'.padStart(14),
    'Prior Claimed'.padStart(14),
    'Current YA'.padStart(14),
    'Total Claimed'.padStart(14),
    'Remaining'.padStart(14),
  ].join('  ');
  console.log(chalk.dim(header));
  console.log(line(W));

  for (const row of result.assets) {
    const cols = [
      row.description.slice(0, 25).padEnd(25),
      row.section.padEnd(10),
      fmt(row.cost).padStart(14),
      fmt(row.totalClaimedPrior).padStart(14),
      fmt(row.currentYearClaim).padStart(14),
      fmt(row.totalClaimedToDate).padStart(14),
      fmt(row.remainingUnabsorbed).padStart(14),
    ].join('  ');
    console.log(cols);
  }

  console.log(line(W));

  // Totals
  console.log();
  console.log(`  Current year CA:             ${ccy} ${fmt(result.totalCurrentYearClaim)}`);
  console.log(`  Unabsorbed CA b/f:           ${ccy} ${fmt(result.unabsorbedBroughtForward)}`);
  console.log(chalk.bold(`  Total CA available:          ${ccy} ${fmt(result.totalAvailable)}`));

  if (result.lowValueCapped) {
    console.log();
    console.log(chalk.yellow(`  Note: Low-value asset claims capped at ${ccy} 30,000.00 per YA`));
    console.log(chalk.yellow(`  (${result.lowValueCount} low-value assets, total ${ccy} ${fmt(result.lowValueTotal)} claimed)`));
  }

  // Workings
  console.log();
  console.log(chalk.bold('WORKINGS'));
  console.log(line(W));
  for (const l of result.workings.split('\n')) {
    console.log(`  ${l}`);
  }
  console.log();
}
