/**
 * Output formatters for job blueprints.
 * Checklist table for human reading, JSON for programmatic use.
 */

import chalk from 'chalk';
import type { JobBlueprint, JobPhase, JobStep } from './types.js';

const line = (w: number): string => chalk.dim('─'.repeat(w));

const CATEGORY_LABELS: Record<string, string> = {
  verify: 'Verify',
  accrue: 'Accrue',
  adjust: 'Adjust',
  value: 'Value',
  report: 'Report',
  lock: 'Lock',
  resolve: 'Resolve',
  export: 'Export',
  review: 'Review',
};

const CATEGORY_COLORS: Record<string, (s: string) => string> = {
  verify: chalk.cyan,
  accrue: chalk.yellow,
  adjust: chalk.yellow,
  value: chalk.magenta,
  report: chalk.blue,
  lock: chalk.red,
  resolve: chalk.green,
  export: chalk.blue,
  review: chalk.cyan,
};

function categoryBadge(cat: string): string {
  const label = CATEGORY_LABELS[cat] ?? cat;
  const color = CATEGORY_COLORS[cat] ?? chalk.white;
  return color(`[${label}]`);
}

function printStep(step: JobStep): void {
  const badge = categoryBadge(step.category);
  const cond = step.conditional ? chalk.dim(` (${step.conditional})`) : '';
  console.log(`    ${String(step.order).padStart(2)}. ${badge} ${step.description}${cond}`);

  if (step.apiCall) {
    console.log(chalk.dim(`        API: ${step.apiCall}`));
  }
  if (step.recipeRef) {
    console.log(chalk.dim(`        Recipe: ${step.recipeRef}`));
  }
  if (step.calcCommand) {
    console.log(chalk.dim(`        Calc: ${step.calcCommand}`));
  }
  if (step.verification) {
    console.log(chalk.dim(`        Check: ${step.verification}`));
  }
  if (step.notes) {
    console.log(chalk.dim(`        Note: ${step.notes}`));
  }
}

function printPhase(phase: JobPhase): void {
  console.log();
  console.log(chalk.bold(`  ${phase.name}`));
  console.log(chalk.dim(`  ${phase.description}`));
  console.log();
  for (const step of phase.steps) {
    printStep(step);
  }
}

const JOB_TITLES: Record<string, string> = {
  'month-end-close': 'Month-End Close',
  'quarter-end-close': 'Quarter-End Close',
  'year-end-close': 'Year-End Close',
  'bank-recon': 'Bank Reconciliation',
  'gst-vat-filing': 'GST/VAT Filing Preparation',
  'payment-run': 'Payment Run',
  'credit-control': 'Credit Control',
  'supplier-recon': 'Supplier Reconciliation',
  'audit-prep': 'Audit Preparation',
  'fa-review': 'Fixed Asset Review',
};

export function printBlueprint(bp: JobBlueprint): void {
  const W = 80;
  const title = JOB_TITLES[bp.jobType] ?? bp.jobType;
  const modeLabel = bp.mode === 'incremental' ? ' (Incremental)' : '';
  const currLabel = bp.currency ? ` — ${bp.currency}` : '';

  console.log();
  console.log(chalk.bold(`${title}${modeLabel}${currLabel}`));
  console.log(chalk.bold(`Period: ${bp.period}`));
  console.log(line(W));

  for (const phase of bp.phases) {
    printPhase(phase);
  }

  console.log();
  console.log(line(W));
  console.log(chalk.bold('Summary'));
  console.log(`  Total steps:     ${bp.summary.totalSteps}`);
  if (bp.summary.recipeReferences.length > 0) {
    console.log(`  Recipes:         ${bp.summary.recipeReferences.join(', ')}`);
  }
  if (bp.summary.calcReferences.length > 0) {
    console.log(`  Calculators:     ${bp.summary.calcReferences.join(', ')}`);
  }
  console.log(`  API calls:       ${bp.summary.apiCalls.length} unique endpoints`);
  console.log();
}

export function printBlueprintJson(bp: JobBlueprint): void {
  console.log(JSON.stringify(bp, null, 2));
}
