/**
 * Types for clio tax — Singapore Form C-S corporate income tax computation.
 */

import { round2 } from '../../../../calc/types.js';
export { round2 };

// ── Enums ────────────────────────────────────────────────────────

export type ExemptionType = 'sute' | 'pte' | 'none';

/** Capital allowance asset categories per IRAS rules. */
export type AssetCategory =
  | 'computer'       // S19A(1): 100% write-off year 1
  | 'automation'     // S19A(1): 100% write-off year 1
  | 'low-value'      // S19A(2): 100% if ≤$5K each, $30K/YA total cap
  | 'general'        // S19:     33⅓% × 3 years
  | 'ip'             // S19B:    5/10/15 years (default 5)
  | 'renovation';    // S14Q:    33⅓% × 3 years ($300K per 3-year block cap)

export const ASSET_CATEGORIES: AssetCategory[] = [
  'computer', 'automation', 'low-value', 'general', 'ip', 'renovation',
];

export const EXEMPTION_TYPES: ExemptionType[] = ['sute', 'pte', 'none'];

// ── Input types ──────────────────────────────────────────────────

export interface CaAsset {
  description: string;
  cost: number;
  acquisitionDate: string;         // YYYY-MM-DD
  category: AssetCategory;
  priorYearsClaimed: number;       // CA already claimed in prior YAs
  ipWriteOffYears?: number;        // Only for 'ip': 5, 10, or 15 (default 5)
}

export interface SgFormCsInput {
  ya: number;                      // Year of Assessment (e.g. 2026)
  basisPeriodStart: string;        // FY start (YYYY-MM-DD)
  basisPeriodEnd: string;          // FY end (YYYY-MM-DD)
  currency?: string;               // Default: SGD

  // From Jaz P&L
  revenue: number;                 // Total revenue (for C-S eligibility check)
  accountingProfit: number;        // Net profit/loss from P&L

  // Tax adjustments — Add-backs
  addBacks: {
    depreciation: number;          // Accounting depreciation (ALWAYS add back)
    amortization: number;          // Intangible amortization
    rouDepreciation: number;       // IFRS 16 ROU depreciation
    leaseInterest: number;         // IFRS 16 lease liability interest
    generalProvisions: number;     // ECL, warranty, restructuring provisions
    donations: number;             // IPC donations (add back, then claim 250% separately)
    entertainment: number;         // Non-deductible portion
    penalties: number;             // Fines, surcharges
    privateCar: number;            // S-plated vehicle expenses
    capitalExpOnPnl: number;       // Capital items expensed on P&L
    unrealizedFxLoss: number;      // Unrealized FX losses
    otherNonDeductible: number;    // Catch-all
    otherDescription?: string;
  };

  // Tax adjustments — Deductions
  deductions: {
    actualLeasePayments: number;   // IFRS 16 reversal: actual operating lease payments
    unrealizedFxGain: number;      // Unrealized FX gains (not taxable)
    exemptDividends: number;       // SG one-tier dividends (not taxable)
    exemptIncome: number;          // Other exempt income
    otherDeductions: number;
    otherDescription?: string;
  };

  // Capital Allowances
  capitalAllowances: {
    currentYearClaim: number;      // Total CA for this YA
    assets?: CaAsset[];            // Optional per-asset detail
    balanceBroughtForward: number; // Unabsorbed CA from prior YAs
  };

  // Enhanced deductions
  enhancedDeductions: {
    rdExpenditure: number;         // R&D qualifying expenditure
    rdMultiplier: number;          // 2.5 or 4.0
    ipRegistration: number;        // IP registration costs
    ipMultiplier: number;          // 2.0 or 4.0
    donations250Base: number;      // IPC donations base (= addBacks.donations)
    s14qRenovation: number;        // Renovation deduction (already in CA schedule — net uplift only)
  };

  // Carry-forwards (user provides — stateless)
  losses: {
    broughtForward: number;        // Unabsorbed trade losses from prior YAs
  };
  donationsCarryForward: {
    broughtForward: number;        // Unabsorbed donations (max 5 years)
  };

  // Exemption election
  exemptionType: ExemptionType;
}

export interface SgCapitalAllowanceInput {
  ya: number;
  assets: CaAsset[];
  unabsorbedBroughtForward: number;
  currency?: string;
}

// ── Output types ─────────────────────────────────────────────────

export interface TaxScheduleLine {
  label: string;
  amount: number;
  reference?: string;              // e.g. "Form C-S Box 2" or "S19A"
  indent?: number;                 // 0 = main, 1 = sub-item, 2 = detail
}

export interface FormCsField {
  box: number;
  label: string;
  value: number | string | boolean;
  source: string;                  // Human-readable source description
}

export interface ExemptionResult {
  type: ExemptionType;
  chargeableIncome: number;
  exemptAmount: number;
  taxableIncome: number;
  effectiveRate: number;           // Actual rate after exemption
}

export interface SgFormCsResult {
  type: 'sg-form-cs';
  ya: number;
  currency: string;
  basisPeriod: string;             // "01 Jan 2025 to 31 Dec 2025"
  formType: 'C-S' | 'C-S Lite';
  eligible: boolean;

  // Tax computation schedule (the workpaper)
  schedule: TaxScheduleLine[];

  // Summary figures
  accountingProfit: number;
  totalAddBacks: number;
  totalDeductions: number;
  adjustedProfit: number;
  capitalAllowanceClaim: number;
  enhancedDeductionTotal: number;
  chargeableIncomeBeforeLosses: number;
  lossRelief: number;
  donationRelief: number;
  chargeableIncome: number;
  exemptAmount: number;
  taxableIncome: number;
  grossTax: number;
  citRebate: number;
  netTaxPayable: number;

  // Carry-forwards for next YA
  unabsorbedLosses: number;
  unabsorbedCapitalAllowances: number;
  unabsorbedDonations: number;

  // Form C-S field mapping
  formFields: FormCsField[];

  // Human-readable workings
  workings: string;
}

export interface CaScheduleRow {
  description: string;
  cost: number;
  category: AssetCategory;
  section: string;                 // 'S19' | 'S19A(1)' | 'S19A(2)' | 'S19B' | 'S14Q'
  totalClaimedPrior: number;
  currentYearClaim: number;
  totalClaimedToDate: number;
  remainingUnabsorbed: number;
}

export interface SgCapitalAllowanceResult {
  type: 'sg-capital-allowance';
  ya: number;
  currency: string;
  assets: CaScheduleRow[];
  totalCurrentYearClaim: number;
  lowValueCount: number;
  lowValueTotal: number;
  lowValueCapped: boolean;
  unabsorbedBroughtForward: number;
  totalAvailable: number;
  workings: string;
}

export type TaxResult = SgFormCsResult | SgCapitalAllowanceResult;
