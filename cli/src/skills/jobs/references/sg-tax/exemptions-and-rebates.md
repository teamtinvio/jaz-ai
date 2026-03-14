# Tax Exemptions and Rebates for SG Corporate Tax

Singapore applies a flat 17% corporate income tax rate, but two exemption schemes reduce the effective rate for most SMBs. After the exemption, a CIT rebate may further reduce the tax payable depending on the Year of Assessment.

---

## 1. Start-Up Tax Exemption (SUTE)

For newly incorporated companies in their first 3 Years of Assessment.

| Item | Detail |
|------|--------|
| **Eligibility** | First 3 YAs of a newly incorporated SG company |
| **Conditions** | <= 20 shareholders AND >= 1 individual shareholder holding >= 10% of shares |
| **Band 1** | 75% exemption on first $100,000 of chargeable income |
| **Band 2** | 50% exemption on next $100,000 of chargeable income |
| **Maximum exemption** | $75,000 + $50,000 = **$125,000** per YA |

### How the bands work

Bands fill in order — Band 1 must be fully consumed before Band 2 applies.

| Chargeable income | Band 1 exempt (75% of first $100K) | Band 2 exempt (50% of next $100K) | Total exempt | Taxable | Tax at 17% | Effective rate |
|-------------------|------------------------------------|------------------------------------|-------------|---------|------------|---------------|
| $50,000 | $37,500 | $0 | $37,500 | $12,500 | $2,125 | 4.25% |
| $100,000 | $75,000 | $0 | $75,000 | $25,000 | $4,250 | 4.25% |
| $150,000 | $75,000 | $25,000 | $100,000 | $50,000 | $8,500 | 5.67% |
| $200,000 | $75,000 | $50,000 | $125,000 | $75,000 | $12,750 | **6.375%** |
| $300,000 | $75,000 | $50,000 | $125,000 | $175,000 | $29,750 | 9.92% |
| $500,000 | $75,000 | $50,000 | $125,000 | $375,000 | $63,750 | 12.75% |

**Benchmark:** A company with $200,000 chargeable income under SUTE pays an effective rate of **6.375%** — less than half the headline 17%.

### Input mapping

```
exemptionType: 'sute'
```

### SUTE conditions in detail

Both conditions must be met throughout the basis period:

1. **<= 20 shareholders** — all shareholders are individuals, OR a mix of individuals and corporate shareholders with at least one individual holding >= 10%
2. **>= 1 individual holding >= 10%** — at least one natural person holds 10% or more of the issued ordinary shares

Companies that are **investment holding companies** or **property development companies** are specifically excluded from SUTE, regardless of their incorporation date or shareholder structure.

---

## 2. Partial Tax Exemption (PTE)

For all companies not on SUTE — the default exemption from Year 4 onwards.

| Item | Detail |
|------|--------|
| **Eligibility** | All Singapore tax-resident companies not claiming SUTE |
| **Conditions** | None — automatic |
| **Band 1** | 75% exemption on first $10,000 of chargeable income |
| **Band 2** | 50% exemption on next $190,000 of chargeable income |
| **Maximum exemption** | $7,500 + $95,000 = **$102,500** per YA |

### How the bands work

| Chargeable income | Band 1 exempt (75% of first $10K) | Band 2 exempt (50% of next $190K) | Total exempt | Taxable | Tax at 17% | Effective rate |
|-------------------|-----------------------------------|------------------------------------|-------------|---------|------------|---------------|
| $10,000 | $7,500 | $0 | $7,500 | $2,500 | $425 | 4.25% |
| $50,000 | $7,500 | $20,000 | $27,500 | $22,500 | $3,825 | 7.65% |
| $100,000 | $7,500 | $45,000 | $52,500 | $47,500 | $8,075 | 8.08% |
| $200,000 | $7,500 | $95,000 | $102,500 | $97,500 | $16,575 | **8.29%** |
| $500,000 | $7,500 | $95,000 | $102,500 | $397,500 | $67,575 | 13.52% |
| $1,000,000 | $7,500 | $95,000 | $102,500 | $897,500 | $152,575 | 15.26% |

**Benchmark:** A company with $200,000 chargeable income under PTE pays an effective rate of **8.29%** — roughly half the headline rate.

### Input mapping

```
exemptionType: 'pte'
```

---

## 3. No Exemption

In rare cases, a company may elect (or be required) to forgo exemptions.

| Item | Detail |
|------|--------|
| **When** | Company elects out, or exemption conditions are not met (e.g., SUTE disqualification) |
| **Rate** | Full 17% on entire chargeable income |

### Input mapping

```
exemptionType: 'none'
```

---

## 4. CIT Rebate (by Year of Assessment)

After applying the exemption and computing gross tax at 17%, a CIT rebate may further reduce the tax payable. Rebates are announced in the annual Singapore Budget and vary by YA.

**Formula:** `CIT rebate = min(gross tax x rebate rate, rebate cap)`

| YA | Rebate Rate | Cap | Notes |
|----|-------------|-----|-------|
| 2020 | 25% | $15,000 | Budget 2020 |
| 2021 | 0% | $0 | No CIT rebate (separate COVID relief measures) |
| 2022 | 0% | $0 | No CIT rebate |
| 2023 | 0% | $0 | No CIT rebate |
| 2024 | 50% | $40,000 | Budget 2024 — Enterprise Support Package |
| 2025 | 50% | $40,000 | Budget 2024 — extended |
| 2026 | 40% | $40,000 | Budget 2025 |

### How the rebate works

The rebate is applied AFTER computing gross tax (chargeable income minus exemption, times 17%).

**Example — YA 2026, PTE, $200,000 chargeable income:**

```
Chargeable income:      $200,000
Less: PTE exemption:   ($102,500)
Taxable income:          $97,500
Gross tax (17%):         $16,575
Less: CIT rebate:       ($6,630)   ← min($16,575 x 40%, $40,000) = min($6,630, $40,000)
                        ──────────
Net tax payable:          $9,945
```

Effective rate: $9,945 / $200,000 = **4.97%**

### For YAs not in the schedule

If the YA is not listed in the rebate schedule (e.g., YA 2027 and beyond), the rebate is $0. Check the latest Singapore Budget announcements for updates.

---

## Decision Tree for the Wizard

Use this sequence during Phase 1 (Step 3) of the wizard workflow to determine the correct exemption type:

```
1. "When was the company incorporated?"
   |
   +-- YA <= incorporation year + 2?
       |
       +-- YES → SUTE-eligible (potentially)
       |   |
       |   +-- "Does the company have <= 20 shareholders,
       |   |    with at least 1 individual holding >= 10%?"
       |   |
       |   +-- YES → exemptionType: 'sute'
       |   +-- NO  → exemptionType: 'pte'
       |
       +-- NO → exemptionType: 'pte'
```

### Worked example: incorporation year determination

| Incorporated | FY ending | YA | Year since incorporation | SUTE eligible? |
|-------------|-----------|------|------------------------|----------------|
| 2024 | 31 Dec 2024 | 2025 | Year 1 | Yes |
| 2024 | 31 Dec 2025 | 2026 | Year 2 | Yes |
| 2024 | 31 Dec 2026 | 2027 | Year 3 | Yes |
| 2024 | 31 Dec 2027 | 2028 | Year 4 | No -> PTE |

**Edge case — mid-year incorporation:** If a company was incorporated on 1 Jul 2024 with a Dec year-end, its first YA (2025) covers only 6 months (Jul-Dec 2024). The SUTE still applies for 3 YAs: 2025, 2026, 2027.

---

## SUTE vs PTE Comparison

| Chargeable income | SUTE tax | SUTE eff. rate | PTE tax | PTE eff. rate | SUTE saves |
|-------------------|----------|---------------|---------|---------------|------------|
| $100,000 | $4,250 | 4.25% | $8,075 | 8.08% | $3,825 |
| $200,000 | $12,750 | 6.38% | $16,575 | 8.29% | $3,825 |
| $300,000 | $29,750 | 9.92% | $33,575 | 11.19% | $3,825 |
| $500,000 | $63,750 | 12.75% | $67,575 | 13.52% | $3,825 |

The absolute tax saving of SUTE over PTE is always **$3,825** regardless of income level (because the difference in exemption is $125,000 - $102,500 = $22,500, and $22,500 x 17% = $3,825). SUTE is worth claiming whenever eligible.

---

## Common Mistakes

1. **Using PTE when SUTE applies.** SUTE saves $3,825 per year for 3 years = $11,475. Always check incorporation year.

2. **Counting YAs wrong.** The YA is the year after the FY end, not the FY year itself. A company incorporated in 2024 with FY ending Dec 2024 has its first YA in 2025.

3. **Forgetting SUTE shareholder conditions.** SUTE is not automatic for new companies — the shareholding conditions must be met. A startup with a single corporate shareholder (e.g., a wholly-owned subsidiary of a holding company with no individual shareholder) does not qualify.

4. **Ignoring the CIT rebate.** For YA 2024-2026, the rebate is significant (40-50%, capped at $40K). On $200K chargeable income with PTE, the YA 2026 rebate saves $6,630 additional tax.

5. **Applying the exemption to gross revenue instead of chargeable income.** The exemption applies to **chargeable income** (after all adjustments, CA, losses, and donations). A company with $5M revenue may still have chargeable income under $200K.
