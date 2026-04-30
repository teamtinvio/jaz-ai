# Singapore Corporate Income Tax — Overview

Foundational context for Singapore corporate income tax (CIT). Read this first before working on any CIT computation, Form C-S preparation, or tax adjustment classification.

**CLI:** `clio jobs statutory-filing sg-cs --help`

---

## The Basics

| Item | Detail |
|------|--------|
| **Tax rate** | 17% flat rate on chargeable income |
| **Tax authority** | Inland Revenue Authority of Singapore (IRAS) |
| **Filing portal** | IRAS myTax Portal (https://mytax.iras.gov.sg) |
| **Who must file** | Every Singapore-incorporated company, including dormant companies and companies with no income |
| **Accounting standard** | SFRS(I) or SFRS for Small Entities — tax computation starts from accounting profit |

---

## Year of Assessment (YA) Concept

Singapore taxes on a **preceding-year basis**. The Year of Assessment (YA) is the year in which tax is assessed, and it always refers to the income earned in the **prior** financial year (the "basis period").

| Term | Definition | Example |
|------|-----------|---------|
| **Basis period** | The financial year in which income was earned | 1 Jan 2025 to 31 Dec 2025 |
| **Year of Assessment (YA)** | The calendar year immediately following the basis period | YA 2026 |

**Rule:** YA = calendar year in which the basis period **ends** + 1.

| FY End Date | Basis Period | YA |
|-------------|-------------|-----|
| 31 Dec 2025 | 1 Jan 2025 - 31 Dec 2025 | 2026 |
| 31 Mar 2025 | 1 Apr 2024 - 31 Mar 2025 | 2026 |
| 30 Jun 2025 | 1 Jul 2024 - 30 Jun 2025 | 2026 |

**Non-standard basis periods:** A company's basis period is usually its financial year. If the FY does not end on 31 December, the YA is the calendar year in which the FY ends plus one. A newly incorporated company with a short first FY still follows this rule — the first YA maps to the calendar year after the first FY end.

---

## Form Types

Singapore offers three corporate income tax return forms. The choice depends on company size and complexity.

### Form C-S (Simplified)

The standard SMB return. Most small companies file this.

**Eligibility (ALL must be met):**
- Annual revenue $5 million or below
- Only income taxable at the 17% corporate rate
- NOT claiming any of: group relief, investment allowance, foreign tax credit, carry-back of capital allowances or losses, tax exemption for income from overseas or qualifying debt securities

**18 fields** covering revenue, adjusted profit, capital allowances, enhanced deductions, losses, and tax computation.

### Form C-S Lite

An even simpler version for micro businesses.

**Eligibility (ALL must be met):**
- All Form C-S eligibility criteria, AND
- Annual revenue $200,000 or below

**6 fields only:** revenue, adjusted profit/loss, chargeable income, exempt amount, tax payable, and net tax payable.

### Form C (Full)

For companies that do not qualify for C-S or C-S Lite. Requires detailed financial statements, tax computation, and supporting schedules. Not covered by the `clio jobs statutory-filing sg-cs` command — use a tax agent.

---

## Key Deadlines

| Deadline | When | Penalty for Late Filing |
|----------|------|------------------------|
| **ECI (Estimated Chargeable Income)** | Within 3 months of financial year-end | No penalty for late filing, but waiver applies only if revenue <= $5M AND ECI is nil |
| **Form C-S / C-S Lite** | 30 November of the YA (e.g., YA 2026 due 30 Nov 2026) | $200-$1,000 composition penalty, followed by summons if still outstanding |
| **Form C** | 30 November of the YA | Same as Form C-S |
| **e-Filing extension** | 15 December of the YA (automatic for e-filing) | Only applies if filing electronically via myTax Portal |
| **Tax payment** | Within 1 month of receiving Notice of Assessment (NOA) | 5% late payment penalty |

**ECI waiver:** Companies with annual revenue of $5 million or below AND whose ECI is nil (zero chargeable income) do not need to file ECI. All other companies must file.

---

## Income Types (Section 10(1))

Singapore taxes income under these categories:

| Section | Income Type | Common Sources |
|---------|-------------|----------------|
| **10(1)(a)** | Gains or profits from trade, business, profession, or vocation | Revenue, service income, commissions |
| **10(1)(b)** | Gains or profits from employment | Not applicable to companies |
| **10(1)(c)** | Dividends, interest, or discounts | Foreign dividends (may be exempt), interest income |
| **10(1)(d)** | Rent, royalties, premiums, or other profits from property | Rental income, royalty income |
| **10(1)(e)** | Gains not falling in (a)-(d) of an income nature | Miscellaneous income |
| **10(1)(f)** | Gains from sale of real property / intellectual property | Not usually relevant for SMBs |
| **10(1)(g)** | Other gains of an income nature | FX gains, insurance proceeds (if revenue nature) |

**For most SMBs on Form C-S:** All income falls under Section 10(1)(a) — trade/business income. The total from the P&L statement is the starting point.

---

## Tax Exemptions

Two mutually exclusive exemption schemes reduce the effective tax rate for qualifying companies.

### Start-Up Tax Exemption (SUTE)

For newly incorporated companies in their **first three YAs**.

| Band | Chargeable Income | Exemption Rate | Tax Saved |
|------|-------------------|----------------|-----------|
| First $100,000 | Up to $100,000 | 75% | Up to $12,750 |
| Next $100,000 | $100,001 to $200,000 | 50% | Up to $8,500 |
| **Maximum saving** | | | **$21,250 per YA** |

**Conditions:** The company must be incorporated in Singapore, have no more than 20 shareholders throughout the basis period, and all shareholders must be individuals. There are anti-avoidance rules for companies set up to split income.

### Partial Tax Exemption (PTE)

For all other companies (not on SUTE).

| Band | Chargeable Income | Exemption Rate | Tax Saved |
|------|-------------------|----------------|-----------|
| First $10,000 | Up to $10,000 | 75% | Up to $1,275 |
| Next $190,000 | $10,001 to $200,000 | 50% | Up to $16,150 |
| **Maximum saving** | | | **$17,425 per YA** |

**Note:** PTE applies automatically unless SUTE is elected. For the `clio jobs statutory-filing sg-cs` input, set `exemptionType` to `'sute'`, `'pte'`, or `'none'`.

---

## CIT Rebate

IRAS occasionally grants a CIT rebate (percentage discount on gross tax, subject to a cap). Rebates vary by YA and are set in the annual Budget.

| YA | Rebate Rate | Cap |
|----|------------|-----|
| 2024 | 50% | $40,000 |
| 2025 | 50% | $40,000 |
| 2026 | 40% | $40,000 |

The `clio jobs statutory-filing sg-cs` engine applies the correct rebate for the given YA automatically. If a YA has no rebate in the schedule, the rebate is zero.

---

## One-Tier Dividend System

Singapore operates a **one-tier corporate tax system**. Once a company pays tax on its chargeable income, all dividends paid to shareholders from that income are **tax-exempt** in the hands of the shareholders.

**For CIT computation:**
- Dividend income received from Singapore-resident companies is **fully exempt** under Section 13(26)
- This income should be added back as a non-taxable item (`addBacks.exemptDividends`) and excluded from chargeable income
- The dividend itself is not subject to withholding tax

---

## Withholding Tax

Withholding tax applies to certain payments to non-residents (royalties, interest, technical fees, management fees, rent). For most SMBs filing Form C-S:

- WHT is **not a Form C-S field** — it is remitted separately to IRAS
- If WHT applies, the company cannot file Form C-S (one of the disqualifying criteria is claiming foreign tax credit)
- If you encounter WHT obligations, recommend Form C and a tax agent

---

## Tax Computation Flow (High Level)

This is the conceptual flow from accounting profit to net tax payable. Each step maps to sections of the `SgFormCsInput` type.

```
Accounting Profit (from P&L)
  + Add-backs (non-deductible expenses)
  - Further deductions (non-taxable income, IFRS 16 reversal)
  = Adjusted Profit / Loss
  - Capital Allowances (current year + brought forward)
  - Enhanced Deductions (R&D, IP, donations 250%)
  = Chargeable Income before Losses
  - Loss Relief (unabsorbed losses brought forward)
  - Donation Relief (unabsorbed donations brought forward)
  = Chargeable Income
  - Exemption (SUTE or PTE)
  = Taxable Income
  x 17%
  = Gross Tax
  - CIT Rebate
  = Net Tax Payable
```

---

## Practitioner Tips

**Start with the P&L.** Every CIT computation starts from the accounting net profit or loss. Pull the P&L from Jaz for the basis period. The bottom line is your `accountingProfit` input.

**Revenue determines form type.** If revenue exceeds $5M, the company cannot file Form C-S. If revenue is $200K or below, it qualifies for C-S Lite (fewer fields, simpler process).

**Ask about SUTE eligibility.** New companies in their first 3 YAs can save up to $21,250/YA with SUTE. Always ask: "Is this company within its first three Years of Assessment?" and "Does it have 20 or fewer individual shareholders?"

**Accounting depreciation is ALWAYS added back.** This is the single most common add-back. Depreciation per the books is non-deductible — capital allowances (tax depreciation) replace it. No exceptions.

**Keep it stateless.** The `clio jobs statutory-filing sg-cs` engine is a pure computation tool. It does not store or retrieve prior-year data. The agent must provide carry-forward balances (unabsorbed losses, unabsorbed CA, unabsorbed donations) from the user or prior-year workpapers.

**Common SMB profile:** Revenue under $5M, standard trade income, no foreign tax credits, no group relief. This describes the vast majority of companies that file Form C-S.
