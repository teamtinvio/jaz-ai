/**
 * Singapore Form C-S / C-S Lite corporate income tax computation engine.
 *
 * Implements the full IRAS tax computation pipeline:
 *   accounting profit → add-backs → deductions → adjusted profit →
 *   capital allowances → enhanced deductions → loss relief → donation relief →
 *   chargeable income → exemption → 17% → CIT rebate → net tax payable
 *
 * Set-off order follows IRAS rules (current CA → enhanced → unabsorbed CA →
 * losses → donations, each capped at available chargeable income).
 */

import { round2 } from './types.js';
import type {
  SgFormCsInput,
  SgFormCsResult,
  TaxScheduleLine,
  FormCsField,
} from './types.js';
import { validateFormCsInput } from './validate.js';
import {
  SG_CIT_RATE,
  FORM_CS_REVENUE_LIMIT,
  FORM_CS_LITE_REVENUE_LIMIT,
  DONATION_MULTIPLIER,
  MONTH_NAMES,
} from './constants.js';
import { computeExemption, computeCitRebate } from './exemptions.js';

// ── Helpers ──────────────────────────────────────────────────────

function formatBasisPeriod(start: string, end: string): string {
  const s = new Date(start + 'T00:00:00Z');
  const e = new Date(end + 'T00:00:00Z');
  const fmt = (d: Date) =>
    `${String(d.getUTCDate()).padStart(2, '0')} ${MONTH_NAMES[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
  return `${fmt(s)} to ${fmt(e)}`;
}

function line(label: string, amount: number, ref?: string, indent?: number): TaxScheduleLine {
  return { label, amount: round2(amount), reference: ref, indent: indent ?? 0 };
}

// ── Main computation ──────────────────────────────────────────────

export function computeFormCs(input: SgFormCsInput): SgFormCsResult {
  validateFormCsInput(input);

  const currency = input.currency ?? 'SGD';
  const ya = input.ya;
  const basisPeriod = formatBasisPeriod(input.basisPeriodStart, input.basisPeriodEnd);

  // ── Form type determination ──
  const eligible = input.revenue <= FORM_CS_REVENUE_LIMIT;
  const formType: 'C-S' | 'C-S Lite' = input.revenue <= FORM_CS_LITE_REVENUE_LIMIT ? 'C-S Lite' : 'C-S';

  const schedule: TaxScheduleLine[] = [];

  // ── Step 1: Accounting profit ──
  const accountingProfit = round2(input.accountingProfit);
  schedule.push(line('Net profit/(loss) per accounts', accountingProfit, 'P&L'));

  // ── Step 2: Add-backs ──
  const ab = input.addBacks;
  const addBackItems = [
    { label: 'Depreciation', amount: ab.depreciation, ref: 'S19 — accounting depr always added back' },
    { label: 'Amortization', amount: ab.amortization, ref: 'Intangible amortization' },
    { label: 'ROU depreciation (IFRS 16)', amount: ab.rouDepreciation, ref: 'IFRS 16 ROU' },
    { label: 'Lease interest (IFRS 16)', amount: ab.leaseInterest, ref: 'IFRS 16 lease liability' },
    { label: 'General provisions', amount: ab.generalProvisions, ref: 'ECL, warranty, restructuring' },
    { label: 'Donations', amount: ab.donations, ref: 'IPC — claim 250% separately' },
    { label: 'Entertainment', amount: ab.entertainment, ref: 'Non-deductible portion' },
    { label: 'Penalties & fines', amount: ab.penalties, ref: 'Not deductible' },
    { label: 'Private car expenses', amount: ab.privateCar, ref: 'S-plated vehicles' },
    { label: 'Capital expenditure on P&L', amount: ab.capitalExpOnPnl, ref: 'Capital items expensed' },
    { label: 'Unrealized FX losses', amount: ab.unrealizedFxLoss, ref: 'Not crystallized' },
    { label: 'Other non-deductible', amount: ab.otherNonDeductible, ref: ab.otherDescription },
  ];

  const totalAddBacks = round2(addBackItems.reduce((s, i) => s + i.amount, 0));

  schedule.push(line('Add: Non-deductible / non-taxable items', totalAddBacks));
  for (const item of addBackItems) {
    if (item.amount > 0) {
      schedule.push(line(item.label, item.amount, item.ref, 1));
    }
  }

  // ── Step 3: Deductions ──
  const ded = input.deductions;
  const deductionItems = [
    { label: 'Actual lease payments (IFRS 16 reversal)', amount: ded.actualLeasePayments, ref: 'Operating lease payments' },
    { label: 'Unrealized FX gains', amount: ded.unrealizedFxGain, ref: 'Not crystallized' },
    { label: 'Exempt dividends', amount: ded.exemptDividends, ref: 'SG one-tier' },
    { label: 'Exempt income', amount: ded.exemptIncome, ref: 'Not taxable' },
    { label: 'Other deductions', amount: ded.otherDeductions, ref: ded.otherDescription },
  ];

  const totalDeductions = round2(deductionItems.reduce((s, i) => s + i.amount, 0));

  schedule.push(line('Less: Further deductions', totalDeductions));
  for (const item of deductionItems) {
    if (item.amount > 0) {
      schedule.push(line(item.label, item.amount, item.ref, 1));
    }
  }

  // ── Step 4: Adjusted profit ──
  const adjustedProfit = round2(accountingProfit + totalAddBacks - totalDeductions);
  schedule.push(line('Adjusted profit/(loss)', adjustedProfit, 'Box 1'));

  // ── Step 5: Capital allowances (IRAS set-off order) ──
  // Current year CA first, then unabsorbed brought forward
  const ca = input.capitalAllowances;

  // If adjusted profit is negative, CA cannot reduce it further — carry all forward
  let remainingCI = adjustedProfit;

  // Current year CA
  const currentCaClaim = remainingCI > 0
    ? round2(Math.min(ca.currentYearClaim, remainingCI))
    : 0;
  const currentCaExcess = round2(ca.currentYearClaim - currentCaClaim);
  if (currentCaClaim > 0) {
    schedule.push(line('Less: Current year capital allowances', currentCaClaim, 'S19/S19A'));
  }
  remainingCI = round2(remainingCI - currentCaClaim);

  // ── Step 6: Enhanced deductions ──
  const ed = input.enhancedDeductions;

  // R&D: qualifying expenditure × (multiplier - 1) = the enhanced portion
  // (The base 100% is already in the P&L as an expense)
  const rdEnhanced = round2(ed.rdExpenditure * Math.max(0, ed.rdMultiplier - 1));
  const ipEnhanced = round2(ed.ipRegistration * Math.max(0, ed.ipMultiplier - 1));
  const donationEnhanced = round2(ed.donations250Base * (DONATION_MULTIPLIER - 1));
  // S14Q: net uplift only (base already claimed via CA)
  const s14qEnhanced = ed.s14qRenovation;

  const enhancedTotal = round2(rdEnhanced + ipEnhanced + donationEnhanced + s14qEnhanced);

  const enhancedClaim = remainingCI > 0
    ? round2(Math.min(enhancedTotal, remainingCI))
    : 0;
  const enhancedExcess = round2(enhancedTotal - enhancedClaim);

  if (enhancedClaim > 0) {
    schedule.push(line('Less: Enhanced deductions', enhancedClaim));
    if (rdEnhanced > 0) schedule.push(line(`R&D (${ed.rdMultiplier * 100}% − 100% base)`, rdEnhanced, 'S14C/14E', 1));
    if (ipEnhanced > 0) schedule.push(line(`IP registration (${ed.ipMultiplier * 100}% − 100% base)`, ipEnhanced, 'S14A', 1));
    if (donationEnhanced > 0) schedule.push(line(`Donations (${DONATION_MULTIPLIER * 100}% − 100% base)`, donationEnhanced, 'S37', 1));
    if (s14qEnhanced > 0) schedule.push(line('S14Q renovation (net uplift)', s14qEnhanced, 'S14Q', 1));
  }
  remainingCI = round2(remainingCI - enhancedClaim);

  // Unabsorbed CA from prior years
  const priorCaClaim = remainingCI > 0
    ? round2(Math.min(ca.balanceBroughtForward, remainingCI))
    : 0;
  const priorCaExcess = round2(ca.balanceBroughtForward - priorCaClaim);
  if (priorCaClaim > 0) {
    schedule.push(line('Less: Unabsorbed CA brought forward', priorCaClaim, 'Prior YA CA'));
  }
  remainingCI = round2(remainingCI - priorCaClaim);

  const capitalAllowanceClaim = round2(currentCaClaim + priorCaClaim);

  const chargeableIncomeBeforeLosses = round2(Math.max(0, remainingCI));

  schedule.push(line('Chargeable income before loss relief', chargeableIncomeBeforeLosses));

  // ── Step 7: Loss relief ──
  const lossRelief = chargeableIncomeBeforeLosses > 0
    ? round2(Math.min(input.losses.broughtForward, chargeableIncomeBeforeLosses))
    : 0;
  const unabsorbedLossesAfter = round2(input.losses.broughtForward - lossRelief);

  if (lossRelief > 0) {
    schedule.push(line('Less: Unabsorbed trade losses', lossRelief, 'Prior YA losses'));
  }

  let ciAfterLosses = round2(chargeableIncomeBeforeLosses - lossRelief);

  // ── Step 8: Donation relief ──
  // Current year donations at 250%
  const currentDonation250 = round2(ed.donations250Base * DONATION_MULTIPLIER);
  const totalDonationAvailable = round2(currentDonation250 + input.donationsCarryForward.broughtForward);

  const donationRelief = ciAfterLosses > 0
    ? round2(Math.min(totalDonationAvailable, ciAfterLosses))
    : 0;

  // Determine how much came from current year vs brought forward
  const currentDonationUsed = round2(Math.min(currentDonation250, donationRelief));
  const priorDonationUsed = round2(donationRelief - currentDonationUsed);
  const unabsorbedDonations = round2(input.donationsCarryForward.broughtForward - priorDonationUsed);

  if (donationRelief > 0) {
    schedule.push(line('Less: Donation deductions', donationRelief));
    if (currentDonationUsed > 0) schedule.push(line(`Current year (${DONATION_MULTIPLIER * 100}%)`, currentDonationUsed, 'S37', 1));
    if (priorDonationUsed > 0) schedule.push(line('Brought forward', priorDonationUsed, 'Prior YA', 1));
  }

  // ── Step 9: Chargeable income ──
  const chargeableIncome = round2(Math.max(0, ciAfterLosses - donationRelief));
  schedule.push(line('Chargeable income', chargeableIncome, 'Box 2'));

  // ── Step 10: Tax exemption ──
  const exemption = computeExemption(chargeableIncome, input.exemptionType);
  const exemptAmount = exemption.exemptAmount;
  const taxableIncome = exemption.taxableIncome;

  if (exemptAmount > 0) {
    const exemptionLabel = input.exemptionType === 'sute'
      ? 'Start-Up Tax Exemption (SUTE)'
      : 'Partial Tax Exemption (PTE)';
    schedule.push(line(`Less: ${exemptionLabel}`, exemptAmount));
  }

  schedule.push(line('Taxable income', taxableIncome));

  // ── Step 11: Gross tax ──
  const grossTax = round2(taxableIncome * SG_CIT_RATE);
  schedule.push(line(`Tax @ ${SG_CIT_RATE * 100}%`, grossTax, 'Box 6'));

  // ── Step 12: CIT rebate ──
  const citRebate = computeCitRebate(grossTax, ya);
  if (citRebate > 0) {
    schedule.push(line('Less: CIT rebate', citRebate, `YA ${ya} rebate`));
  }

  // ── Step 13: Net tax payable ──
  const netTaxPayable = round2(Math.max(0, grossTax - citRebate));
  schedule.push(line('Net tax payable', netTaxPayable, 'Box 7'));

  // ── Carry-forwards ──
  // Unabsorbed CA = excess from current year + excess from prior + enhanced excess
  const unabsorbedCapitalAllowances = round2(currentCaExcess + priorCaExcess);

  // If adjusted profit was negative, the loss is a current-year loss that adds to carry-forward
  const currentYearLoss = adjustedProfit < 0 ? round2(Math.abs(adjustedProfit)) : 0;
  const unabsorbedLosses = round2(unabsorbedLossesAfter + currentYearLoss);

  // ── Form C-S field mapping ──
  const formFields: FormCsField[] = buildFormFields(input, {
    adjustedProfit,
    chargeableIncome,
    capitalAllowanceClaim,
    enhancedDeductionTotal: enhancedClaim,
    lossRelief,
    donationRelief,
    grossTax,
    citRebate,
    netTaxPayable,
    formType,
    basisPeriod,
    exemptAmount,
    taxableIncome,
    currentYearLoss,
    unabsorbedLosses,
    unabsorbedCapitalAllowances,
    unabsorbedDonations,
  });

  // ── Workings text ──
  const workings = buildWorkings({
    ya, currency, basisPeriod, formType, eligible,
    accountingProfit, totalAddBacks, totalDeductions, adjustedProfit,
    capitalAllowanceClaim, currentCaClaim, priorCaClaim,
    enhancedDeductionTotal: enhancedClaim,
    chargeableIncomeBeforeLosses, lossRelief, donationRelief,
    chargeableIncome, exemptAmount, taxableIncome,
    grossTax, citRebate, netTaxPayable,
    exemptionType: input.exemptionType,
    unabsorbedLosses, unabsorbedCapitalAllowances, unabsorbedDonations,
  });

  return {
    type: 'sg-form-cs',
    ya,
    currency,
    basisPeriod,
    formType,
    eligible,
    schedule,
    accountingProfit,
    totalAddBacks,
    totalDeductions,
    adjustedProfit,
    capitalAllowanceClaim,
    enhancedDeductionTotal: enhancedClaim,
    chargeableIncomeBeforeLosses,
    lossRelief,
    donationRelief,
    chargeableIncome,
    exemptAmount,
    taxableIncome,
    grossTax,
    citRebate,
    netTaxPayable,
    unabsorbedLosses,
    unabsorbedCapitalAllowances,
    unabsorbedDonations,
    formFields,
    workings,
  };
}

// ── Form C-S field builder ────────────────────────────────────────

interface FormFieldInputs {
  adjustedProfit: number;
  chargeableIncome: number;
  capitalAllowanceClaim: number;
  enhancedDeductionTotal: number;
  lossRelief: number;
  donationRelief: number;
  grossTax: number;
  citRebate: number;
  netTaxPayable: number;
  formType: 'C-S' | 'C-S Lite';
  basisPeriod: string;
  exemptAmount: number;
  taxableIncome: number;
  currentYearLoss: number;
  unabsorbedLosses: number;
  unabsorbedCapitalAllowances: number;
  unabsorbedDonations: number;
}

/**
 * Build Form C-S (18 boxes) or C-S Lite (6 boxes) field mapping
 * per IRAS specification. Box numbers match the actual IRAS form.
 */
function buildFormFields(input: SgFormCsInput, f: FormFieldInputs): FormCsField[] {
  if (f.formType === 'C-S Lite') {
    // C-S Lite: 6 fields only
    return [
      { box: 1, label: 'Total Revenue', value: input.revenue, source: 'P&L total revenue' },
      { box: 2, label: 'Adjusted Profit / Loss', value: f.adjustedProfit, source: 'Accounting profit + add-backs − deductions' },
      { box: 3, label: 'Chargeable Income', value: f.chargeableIncome, source: 'After all reliefs' },
      { box: 4, label: 'Exempt Amount', value: f.exemptAmount, source: `${input.exemptionType.toUpperCase()} exemption` },
      { box: 5, label: 'Tax Payable', value: f.grossTax, source: `Taxable income × ${SG_CIT_RATE * 100}%` },
      { box: 6, label: 'Net Tax Payable', value: f.netTaxPayable, source: 'Gross tax − CIT rebate' },
    ];
  }

  // Form C-S: 18 fields matching IRAS layout
  return [
    // Section A: Revenue and Adjusted Profit
    { box: 1, label: 'Adjusted Profit / Loss', value: f.adjustedProfit, source: 'Accounting profit + add-backs − deductions' },
    { box: 2, label: 'Total Revenue', value: input.revenue, source: 'P&L total revenue' },
    // Section B: Capital Allowances
    { box: 3, label: 'Capital Allowances Claimed', value: f.capitalAllowanceClaim, source: 'Current + prior YA CA' },
    { box: 4, label: 'Unabsorbed CA b/f', value: input.capitalAllowances.balanceBroughtForward, source: 'Prior YA carry-forward' },
    { box: 5, label: 'Unabsorbed CA c/f', value: f.unabsorbedCapitalAllowances, source: 'b/f + current available − utilized' },
    // Section C: Losses
    { box: 6, label: 'Current Year Unabsorbed Losses', value: f.currentYearLoss, source: 'Only if Box 1 is a loss' },
    { box: 7, label: 'Unabsorbed Losses b/f', value: input.losses.broughtForward, source: 'Prior YA carry-forward' },
    { box: 8, label: 'Unabsorbed Losses c/f', value: f.unabsorbedLosses, source: 'b/f + current year loss − utilized' },
    // Section D: Donations
    { box: 9, label: 'Qualifying Donations (250%)', value: f.donationRelief, source: 'IPC donations at 250%' },
    { box: 10, label: 'Unabsorbed Donations b/f', value: input.donationsCarryForward.broughtForward, source: 'Prior YA carry-forward (max 5 years)' },
    { box: 11, label: 'Unabsorbed Donations c/f', value: f.unabsorbedDonations, source: 'b/f + current qualifying − utilized' },
    // Section E: Chargeable Income and Tax
    { box: 12, label: 'Chargeable Income', value: f.chargeableIncome, source: 'After all reliefs, floored at 0' },
    { box: 13, label: 'Exempt Amount', value: f.exemptAmount, source: `${input.exemptionType.toUpperCase()} exemption` },
    { box: 14, label: 'Taxable Income', value: f.taxableIncome, source: 'Chargeable income − exempt amount' },
    { box: 15, label: 'Gross Tax', value: f.grossTax, source: `Taxable income × ${SG_CIT_RATE * 100}%` },
    { box: 16, label: 'CIT Rebate', value: f.citRebate, source: `YA ${input.ya} rebate schedule` },
    { box: 17, label: 'Net Tax Payable', value: f.netTaxPayable, source: 'Gross tax − CIT rebate' },
    { box: 18, label: 'Claiming SUTE?', value: input.exemptionType === 'sute', source: 'Exemption election' },
  ];
}

// ── Workings builder ──────────────────────────────────────────────

interface WorkingsInputs {
  ya: number;
  currency: string;
  basisPeriod: string;
  formType: 'C-S' | 'C-S Lite';
  eligible: boolean;
  accountingProfit: number;
  totalAddBacks: number;
  totalDeductions: number;
  adjustedProfit: number;
  capitalAllowanceClaim: number;
  currentCaClaim: number;
  priorCaClaim: number;
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
  exemptionType: string;
  unabsorbedLosses: number;
  unabsorbedCapitalAllowances: number;
  unabsorbedDonations: number;
}

function fmtAmt(n: number, ccy: string): string {
  return `${ccy} ${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function buildWorkings(w: WorkingsInputs): string {
  const lines: string[] = [
    `TAX COMPUTATION — YA ${w.ya}`,
    `${w.formType} | Basis period: ${w.basisPeriod}`,
    `${w.eligible ? '✓ Eligible for Form C-S filing' : '✗ Exceeds C-S revenue threshold'}`,
    '',
    `Net profit per accounts:              ${fmtAmt(w.accountingProfit, w.currency)}`,
    `Add: Non-deductible items:            ${fmtAmt(w.totalAddBacks, w.currency)}`,
    `Less: Further deductions:            (${fmtAmt(w.totalDeductions, w.currency)})`,
    `                                     ─────────────────`,
    `Adjusted profit/(loss):               ${fmtAmt(w.adjustedProfit, w.currency)}`,
    '',
    `Less: Capital allowances:            (${fmtAmt(w.capitalAllowanceClaim, w.currency)})`,
  ];

  if (w.currentCaClaim > 0) lines.push(`  Current year CA:                    (${fmtAmt(w.currentCaClaim, w.currency)})`);
  if (w.priorCaClaim > 0) lines.push(`  Unabsorbed CA b/f:                  (${fmtAmt(w.priorCaClaim, w.currency)})`);

  if (w.enhancedDeductionTotal > 0) {
    lines.push(`Less: Enhanced deductions:            (${fmtAmt(w.enhancedDeductionTotal, w.currency)})`);
  }

  lines.push(`                                     ─────────────────`);
  lines.push(`Chargeable income before losses:      ${fmtAmt(w.chargeableIncomeBeforeLosses, w.currency)}`);

  if (w.lossRelief > 0) lines.push(`Less: Trade loss relief:             (${fmtAmt(w.lossRelief, w.currency)})`);
  if (w.donationRelief > 0) lines.push(`Less: Donation relief:               (${fmtAmt(w.donationRelief, w.currency)})`);

  lines.push(`                                     ─────────────────`);
  lines.push(`Chargeable income:                    ${fmtAmt(w.chargeableIncome, w.currency)}`);

  if (w.exemptAmount > 0) {
    lines.push(`Less: ${w.exemptionType.toUpperCase()} exemption:              (${fmtAmt(w.exemptAmount, w.currency)})`);
    lines.push(`Taxable income:                       ${fmtAmt(w.taxableIncome, w.currency)}`);
  }

  lines.push('');
  lines.push(`Tax @ 17%:                            ${fmtAmt(w.grossTax, w.currency)}`);
  if (w.citRebate > 0) lines.push(`Less: CIT rebate (YA ${w.ya}):           (${fmtAmt(w.citRebate, w.currency)})`);
  lines.push(`                                     ═════════════════`);
  lines.push(`NET TAX PAYABLE:                      ${fmtAmt(w.netTaxPayable, w.currency)}`);

  if (w.unabsorbedLosses > 0 || w.unabsorbedCapitalAllowances > 0 || w.unabsorbedDonations > 0) {
    lines.push('');
    lines.push('Carry-forwards to next YA:');
    if (w.unabsorbedLosses > 0) lines.push(`  Unabsorbed trade losses:            ${fmtAmt(w.unabsorbedLosses, w.currency)}`);
    if (w.unabsorbedCapitalAllowances > 0) lines.push(`  Unabsorbed capital allowances:      ${fmtAmt(w.unabsorbedCapitalAllowances, w.currency)}`);
    if (w.unabsorbedDonations > 0) lines.push(`  Unabsorbed donations:               ${fmtAmt(w.unabsorbedDonations, w.currency)}`);
  }

  return lines.join('\n');
}
