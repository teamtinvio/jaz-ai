/**
 * Singapore corporate income tax constants.
 * All magic numbers live here — no hard-coded rates in computation logic.
 */

/** Standard corporate income tax rate. */
export const SG_CIT_RATE = 0.17;

/** Revenue threshold for Form C-S eligibility. */
export const FORM_CS_REVENUE_LIMIT = 5_000_000;

/** Revenue threshold for Form C-S Lite eligibility. */
export const FORM_CS_LITE_REVENUE_LIMIT = 200_000;

/**
 * Start-Up Tax Exemption (SUTE) — for first 3 YAs of newly incorporated companies.
 * Applied in order: first band fills before second band.
 */
export const SUTE_BANDS = [
  { threshold: 100_000, exemptionRate: 0.75 },
  { threshold: 100_000, exemptionRate: 0.50 },
] as const;

/**
 * Partial Tax Exemption (PTE) — for all companies not on SUTE.
 * Applied in order: first band fills before second band.
 */
export const PTE_BANDS = [
  { threshold: 10_000, exemptionRate: 0.75 },
  { threshold: 190_000, exemptionRate: 0.50 },
] as const;

/**
 * CIT rebate schedule by Year of Assessment.
 * Rebate = min(grossTax * rate, cap).
 */
export const CIT_REBATE_SCHEDULE: Record<number, { rate: number; cap: number }> = {
  2020: { rate: 0.25, cap: 15_000 },
  2021: { rate: 0.00, cap: 0 },       // COVID relief was different
  2022: { rate: 0.00, cap: 0 },
  2023: { rate: 0.00, cap: 0 },
  2024: { rate: 0.50, cap: 40_000 },
  2025: { rate: 0.50, cap: 40_000 },
  2026: { rate: 0.40, cap: 40_000 },
};

/**
 * Capital allowance rates by asset category.
 */
export const CA_RATES: Record<string, { section: string; annualRate: number; years: number }> = {
  computer:   { section: 'S19A(1)', annualRate: 1.00,     years: 1 },
  automation: { section: 'S19A(1)', annualRate: 1.00,     years: 1 },
  'low-value':  { section: 'S19A(2)', annualRate: 1.00,     years: 1 },
  general:    { section: 'S19',     annualRate: 1 / 3,    years: 3 },
  ip:         { section: 'S19B',    annualRate: 0.20,     years: 5 },  // default 5-year
  renovation: { section: 'S14Q',    annualRate: 1 / 3,    years: 3 },
};

/** Low-value asset per-YA total cap. */
export const LOW_VALUE_YA_CAP = 30_000;

/** Low-value asset per-item cost ceiling. */
export const LOW_VALUE_ITEM_LIMIT = 5_000;

/** S14Q renovation per-3-year-block cap. */
export const S14Q_BLOCK_CAP = 300_000;

/** Donation tax deduction multiplier for approved IPC donations. */
export const DONATION_MULTIPLIER = 2.50;

/** Month names for date formatting. */
export const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];
