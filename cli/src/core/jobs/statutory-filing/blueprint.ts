/**
 * Statutory Filing blueprint generator.
 * Produces a structured JobBlueprint describing the statutory filing workflow —
 * data extraction, classification, computation, and filing preparation.
 *
 * Currently covers Singapore Form C-S / C-S Lite (revenue ≤ $5M).
 * Paired tools: sg-cs (tax computation), sg-ca (capital allowance schedule).
 */

import type { JobBlueprint, JobPhase } from '../types.js';
import { buildSummary } from '../types.js';

export interface StatutoryFilingOptions {
  /** Year of Assessment (e.g., 2026). */
  ya?: number;
  /** Jurisdiction (default: sg). */
  jurisdiction?: string;
  /** Reporting currency (e.g., SGD). */
  currency?: string;
}

export function generateStatutoryFilingBlueprint(opts: StatutoryFilingOptions = {}): JobBlueprint {
  const currency = opts.currency ?? 'SGD';
  const ya = opts.ya ?? new Date().getFullYear();
  const jurisdiction = opts.jurisdiction ?? 'sg';
  const period = `YA${ya}`;

  // Phase 1: Data Extraction
  const dataExtraction: JobPhase = {
    name: 'Data Extraction',
    description: 'Pull financial data from Jaz for the basis period.',
    steps: [
      {
        order: 1,
        description: 'Pull trial balance for basis period',
        category: 'verify',
        apiCall: 'POST /generate-reports/trial-balance',
        notes: `Basis period: FY${ya - 1} (typically 1 Jan ${ya - 1} to 31 Dec ${ya - 1})`,
      },
      {
        order: 2,
        description: 'Pull profit & loss statement',
        category: 'verify',
        apiCall: 'POST /generate-reports/profit-and-loss',
        notes: 'Revenue figure determines form eligibility: ≤$200K → C-S Lite, ≤$5M → C-S',
      },
      {
        order: 3,
        description: 'Pull fixed asset register for capital allowances',
        category: 'verify',
        apiCall: 'POST /chart-of-accounts/search',
        apiBody: { filter: { classificationType: 'Fixed Assets' } },
        notes: 'List all fixed assets for CA computation',
      },
    ],
  };

  // Phase 2: Classification & Add-backs
  const classification: JobPhase = {
    name: 'Classification & Add-backs',
    description: 'Identify non-deductible items and compute tax add-backs.',
    steps: [
      {
        order: 4,
        description: 'Identify accounting depreciation (add-back)',
        category: 'adjust',
        notes: 'Pull depreciation expense accounts from GL. This is added back and replaced by capital allowances.',
      },
      {
        order: 5,
        description: 'Identify IFRS 16 lease adjustments',
        category: 'adjust',
        notes: 'ROU depreciation + lease interest → add back. Actual lease payments → deduct.',
        conditional: 'Only if IFRS 16 leases exist',
      },
      {
        order: 6,
        description: 'Identify other non-deductible items',
        category: 'adjust',
        notes: 'General provisions, donations, entertainment, penalties, S-plated vehicle expenses.',
      },
      {
        order: 7,
        description: 'Classify enhanced deductions',
        category: 'adjust',
        notes: 'R&D (250%), IP registration (200%), IPC donations (250%), S14Q renovation.',
        conditional: 'Only if qualifying expenditure exists',
      },
    ],
  };

  // Phase 3: Computation
  const computation: JobPhase = {
    name: 'Computation',
    description: 'Run tax computation using CLI tools.',
    steps: [
      {
        order: 8,
        description: 'Compute capital allowances',
        category: 'adjust',
        calcCommand: 'clio jobs statutory-filing sg-ca --input assets.json --json',
        notes: 'Generates per-asset CA schedule with rates, caps, and carry-forward.',
      },
      {
        order: 9,
        description: 'Compute Form C-S / C-S Lite',
        category: 'adjust',
        calcCommand: 'clio jobs statutory-filing sg-cs --input tax-data.json --json',
        notes: `YA${ya}: accounting profit → add-backs → deductions → CA → exemptions → tax payable.`,
      },
    ],
  };

  // Phase 4: Review & Filing
  const review: JobPhase = {
    name: 'Review & Filing',
    description: 'Review computation, prepare filing, and record tax provision.',
    steps: [
      {
        order: 10,
        description: 'Review tax computation for accuracy',
        category: 'review',
        verification: 'Chargeable income, tax payable, and exemptions match expectations.',
      },
      {
        order: 11,
        description: 'Record income tax provision in Jaz',
        category: 'adjust',
        apiCall: 'POST /journals',
        recipeRef: 'income-tax-provision',
        notes: 'Dr Income Tax Expense, Cr Income Tax Payable',
      },
      {
        order: 12,
        description: 'Prepare filing package',
        category: 'report',
        notes: `Generate Form C-S${jurisdiction === 'sg' ? ' for IRAS e-Filing' : ''} with supporting schedules.`,
        verification: 'All 18 fields (C-S) or 6 fields (C-S Lite) populated correctly.',
      },
    ],
  };

  const phases = [dataExtraction, classification, computation, review];

  return {
    jobType: 'statutory-filing',
    period,
    currency,
    mode: 'standalone',
    phases,
    summary: buildSummary(phases),
  };
}
