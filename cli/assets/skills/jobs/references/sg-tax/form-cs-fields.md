# Form C-S / C-S Lite — Field Mapping

Complete mapping of every field on the IRAS Form C-S and Form C-S Lite returns to the `clio jobs statutory-filing sg-cs` CLI output. Use this reference when populating the IRAS myTax Portal or verifying the computation output.

**CLI:** `clio jobs statutory-filing sg-cs --input tax-data.json --json`

---

## Form C-S (18 Fields)

The standard simplified corporate income tax return for companies with revenue of $5 million or below.

### Section A: Revenue and Adjusted Profit

| Box | IRAS Label | Data Type | CLI Output Field | Source / Formula |
|-----|-----------|-----------|------------------|------------------|
| **1** | Adjusted Profit / Loss | Dollar amount | `adjustedProfit` | `accountingProfit + totalAddBacks - totalDeductions` |
| **2** | Total Revenue | Dollar amount | (from input) `revenue` | Total revenue line from P&L |

**Box 1 detail:** The adjusted profit is the accounting profit AFTER tax adjustments (add-backs and further deductions) but BEFORE capital allowances, enhanced deductions, and loss relief. This is the key working number.

**Box 2 detail:** Total revenue as reported in the financial statements. This determines C-S vs C-S Lite eligibility. It must match the top line of the P&L.

### Section B: Capital Allowances

| Box | IRAS Label | Data Type | CLI Output Field | Source / Formula |
|-----|-----------|-----------|------------------|------------------|
| **3** | Capital Allowances Claimed | Dollar amount | `capitalAllowanceClaim` | From CA schedule (current year claim) |
| **4** | Balances of Unabsorbed Capital Allowances b/f | Dollar amount | (from input) `capitalAllowances.balanceBroughtForward` | Prior YA carry-forward |
| **5** | Balances of Unabsorbed Capital Allowances c/f | Dollar amount | `unabsorbedCapitalAllowances` | `b/f + current year available - amount utilized` |

### Section C: Losses

| Box | IRAS Label | Data Type | CLI Output Field | Source / Formula |
|-----|-----------|-----------|------------------|------------------|
| **6** | Current Year Unabsorbed Losses | Dollar amount | Computed from adjusted loss | Only if Box 1 is a loss |
| **7** | Balances of Unabsorbed Losses b/f | Dollar amount | (from input) `losses.broughtForward` | Prior YA carry-forward |
| **8** | Balances of Unabsorbed Losses c/f | Dollar amount | `unabsorbedLosses` | `b/f + current year loss - amount utilized` |

### Section D: Donations

| Box | IRAS Label | Data Type | CLI Output Field | Source / Formula |
|-----|-----------|-----------|------------------|------------------|
| **9** | Donations — Qualifying Amount (250%) | Dollar amount | `donationRelief` | `addBacks.donations x 2.50` (IPC donations at 250%) |
| **10** | Balances of Unabsorbed Donations b/f | Dollar amount | (from input) `donationsCarryForward.broughtForward` | Prior YA carry-forward (max 5 years) |
| **11** | Balances of Unabsorbed Donations c/f | Dollar amount | `unabsorbedDonations` | `b/f + current year qualifying - amount utilized` |

### Section E: Chargeable Income and Tax

| Box | IRAS Label | Data Type | CLI Output Field | Source / Formula |
|-----|-----------|-----------|------------------|------------------|
| **12** | Chargeable Income | Dollar amount | `chargeableIncome` | `adjustedProfit - CA - enhanced deductions - loss relief - donation relief` (floored at 0) |
| **13** | Exempt Amount | Dollar amount | `exemptAmount` | SUTE or PTE exemption applied to chargeable income |
| **14** | Taxable Income (after exemption) | Dollar amount | `taxableIncome` | `chargeableIncome - exemptAmount` |
| **15** | Gross Tax | Dollar amount | `grossTax` | `taxableIncome x 17%` |
| **16** | CIT Rebate | Dollar amount | `citRebate` | `min(grossTax x rebateRate, rebateCap)` per YA schedule |
| **17** | Net Tax Payable | Dollar amount | `netTaxPayable` | `grossTax - citRebate` (floored at 0) |
| **18** | Is the company claiming Start-Up Tax Exemption? | Yes / No | `exemptionType` | `'sute'` = Yes, `'pte'` or `'none'` = No |

---

## Form C-S Lite (6 Fields)

The ultra-simplified return for companies with revenue of $200,000 or below. Only 6 fields — no breakdown of CA, losses, or donations.

| Box | IRAS Label | Data Type | CLI Output Field | Source / Formula |
|-----|-----------|-----------|------------------|------------------|
| **1** | Total Revenue | Dollar amount | (from input) `revenue` | Must be $200,000 or below |
| **2** | Adjusted Profit / Loss | Dollar amount | `adjustedProfit` | Same as Form C-S Box 1 |
| **3** | Chargeable Income | Dollar amount | `chargeableIncome` | After all deductions and relief |
| **4** | Exempt Amount | Dollar amount | `exemptAmount` | SUTE or PTE |
| **5** | Tax Payable | Dollar amount | `grossTax` | `(chargeableIncome - exemptAmount) x 17%` |
| **6** | Net Tax Payable (after rebate) | Dollar amount | `netTaxPayable` | `grossTax - citRebate` |

**C-S Lite simplification:** The taxpayer still performs the full computation (add-backs, CA, losses, donations) to arrive at chargeable income. They just don't need to report the intermediate steps on the form itself. The `clio jobs statutory-filing sg-cs` engine computes everything regardless — the `formType` field in the output indicates which form applies.

---

## CLI Output to IRAS Form — Quick Reference

### Form C-S Mapping Table

| CLI `formFields[].box` | CLI `formFields[].label` | IRAS Box |
|------------------------|--------------------------|----------|
| 1 | Adjusted Profit / Loss | Box 1 |
| 2 | Total Revenue | Box 2 |
| 3 | Capital Allowances Claimed | Box 3 |
| 4 | Unabsorbed CA b/f | Box 4 |
| 5 | Unabsorbed CA c/f | Box 5 |
| 6 | Current Year Unabsorbed Losses | Box 6 |
| 7 | Unabsorbed Losses b/f | Box 7 |
| 8 | Unabsorbed Losses c/f | Box 8 |
| 9 | Qualifying Donations (250%) | Box 9 |
| 10 | Unabsorbed Donations b/f | Box 10 |
| 11 | Unabsorbed Donations c/f | Box 11 |
| 12 | Chargeable Income | Box 12 |
| 13 | Exempt Amount | Box 13 |
| 14 | Taxable Income | Box 14 |
| 15 | Gross Tax | Box 15 |
| 16 | CIT Rebate | Box 16 |
| 17 | Net Tax Payable | Box 17 |
| 18 | Claiming SUTE? | Box 18 |

### Using the CLI Output

The `--json` flag produces structured output with a `formFields` array. Each entry contains:

```json
{
  "box": 1,
  "label": "Adjusted Profit / Loss",
  "value": 150000.00,
  "source": "accountingProfit (200,000) + addBacks (80,000) - deductions (130,000)"
}
```

The `source` field provides a human-readable explanation of how the value was derived. This is your audit trail.

### Additional Output Fields (Not on the Form)

The CLI output includes fields that are not directly on the IRAS form but are essential for the tax computation workpaper:

| CLI Output Field | Purpose |
|-----------------|---------|
| `schedule` | Line-by-line tax computation schedule (the working paper) |
| `totalAddBacks` | Sum of all add-back items |
| `totalDeductions` | Sum of all further deductions |
| `capitalAllowanceClaim` | CA utilized this YA |
| `enhancedDeductionTotal` | Total enhanced deductions (R&D, IP, S14Q) |
| `chargeableIncomeBeforeLosses` | Chargeable income before loss/donation relief |
| `lossRelief` | Losses utilized this YA |
| `donationRelief` | Donations relief utilized this YA (at 250%) |
| `workings` | Human-readable narrative of the entire computation |

---

## Auto-Computed vs User-Provided

Understanding which values the engine computes vs which the agent must supply:

### User-Provided (via `SgFormCsInput`)

| Field | What the Agent Must Supply |
|-------|---------------------------|
| `ya` | Year of Assessment |
| `basisPeriodStart` / `basisPeriodEnd` | FY start and end dates |
| `revenue` | Total revenue from P&L |
| `accountingProfit` | Net profit/loss from P&L |
| `addBacks.*` | Each add-back amount (13 categories) |
| `deductions.*` | Each further deduction amount (4 categories) |
| `capitalAllowances.currentYearClaim` | Total CA for this YA |
| `capitalAllowances.balanceBroughtForward` | Unabsorbed CA from prior YAs |
| `enhancedDeductions.*` | R&D, IP, donations base, S14Q |
| `losses.broughtForward` | Unabsorbed losses from prior YAs |
| `donationsCarryForward.broughtForward` | Unabsorbed donations from prior YAs |
| `exemptionType` | `'sute'`, `'pte'`, or `'none'` |

### Engine-Computed (in `SgFormCsResult`)

| Field | How It Is Computed |
|-------|-------------------|
| `formType` | `'C-S Lite'` if revenue <= $200K, else `'C-S'` |
| `eligible` | `true` if revenue <= $5M |
| `adjustedProfit` | `accountingProfit + totalAddBacks - totalDeductions` |
| `chargeableIncomeBeforeLosses` | `adjustedProfit - CA - enhancedDeductions` |
| `chargeableIncome` | After loss and donation relief, floored at 0 |
| `exemptAmount` | SUTE/PTE band calculation |
| `taxableIncome` | `chargeableIncome - exemptAmount` |
| `grossTax` | `taxableIncome x 17%` |
| `citRebate` | Per YA schedule |
| `netTaxPayable` | `grossTax - citRebate` |
| `unabsorbedLosses` | Remaining losses carried forward |
| `unabsorbedCapitalAllowances` | Remaining CA carried forward |
| `unabsorbedDonations` | Remaining donations carried forward |
| `schedule` | Full line-by-line computation |
| `formFields` | Array of 18 (C-S) or 6 (C-S Lite) form field mappings |
| `workings` | Narrative explanation |

---

## Practitioner Tips

**Always verify `formType` before advising.** The engine sets `formType` based on revenue. If the output says `'C-S Lite'`, the user only needs to enter 6 fields on myTax Portal. If `'C-S'`, they need all 18.

**Check `eligible` first.** If `eligible` is `false`, the company must file Form C (full) and should engage a tax agent. The computation is still valid as a working paper, but the simplified form cannot be used.

**Box 1 is NOT accounting profit.** A common mistake is entering the P&L net profit directly into Box 1. Box 1 is the *adjusted* profit — after add-backs and deductions. The CLI computes this correctly; verify with the `workings` output.

**Carry-forward balances are the agent's responsibility.** The engine is stateless. It does not know prior-year balances. Always ask the user: "Do you have any unabsorbed losses, capital allowances, or donations carried forward from previous years?"

**Round to the nearest dollar for IRAS.** IRAS accepts whole-dollar amounts (no cents). The CLI rounds to 2 decimal places for precision; for the actual form filing, round each box to the nearest dollar.
