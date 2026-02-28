# Recipe: Provisions with PV Unwinding (IAS 37)

## Scenario

Your company has a product warranty obligation. Based on historical claims data, you estimate $500,000 in warranty costs over the next 5 years. Because the time value of money is material (IAS 37.45), you recognize the provision at its present value using a 4% discount rate. Each month, the discount unwinds as a finance cost, gradually increasing the provision balance until it reaches the full $500,000 at settlement.

**Pattern:** Manual journals + capsule (interest amounts change each period, same as loan/lease unwinding)

---

## Accounts Involved

| Account | Type | Subtype | Role |
|---|---|---|---|
| Provision Expense | Expense | Expense | Initial recognition at PV |
| Provision for Obligations | Liability | Non-Current Liability | Holds the discounted obligation |
| Finance Cost — Unwinding | Expense | Expense | Monthly discount unwinding charge |
| Cash / Bank Account | Asset | Bank | Settlement when obligation is paid |

---

## Journal Entries

### Step 1: Initial Recognition (at PV)

| Line | Account | Debit | Credit |
|---|---|---|---|
| 1 | Provision Expense | *present value* | |
| 2 | Provision for Obligations | | *present value* |

### Step 2: Monthly Unwinding (each month)

```
Interest = Opening Provision Balance × Monthly Rate
Monthly Rate = Annual Rate / 12
```

| Line | Account | Debit | Credit |
|---|---|---|---|
| 1 | Finance Cost — Unwinding | *interest amount* | |
| 2 | Provision for Obligations | | *interest amount* |

The provision balance grows each month until it reaches the nominal amount at settlement.

### Step 3: Settlement (when obligation is paid)

| Line | Account | Debit | Credit |
|---|---|---|---|
| 1 | Provision for Obligations | *nominal amount* | |
| 2 | Cash / Bank Account | | *actual amount paid* |
| 3 | Provision Expense (or Revenue) | difference | (if actual ≠ estimate) |

---

## Capsule Structure

**Capsule:** "Warranty Provision — Product X — 2025"
**Capsule Type:** "Provisions"

Contents:
- 1 initial recognition journal
- 60 monthly unwinding journals (5 years)
- Settlement journal(s) when claims are paid
- Revision journals if estimate changes
- **Total entries:** 62+

---

## Worked Example

**Setup:**
- Estimated future outflow: $500,000
- Discount rate: 4% annual (0.333% monthly)
- Settlement term: 60 months
- Present value: $409,501.55

**Calculation:**
```
PV = 500,000 / (1 + 0.04/12)^60 = $409,501.55
Total unwinding = $500,000 − $409,501.55 = $90,498.45
```

**Jan 1, 2025 — Initial recognition:**
- Dr Provision Expense $409,501.55
- Cr Provision for Obligations $409,501.55
- Description: "Initial provision recognition at PV (IAS 37)"

**Jan 31, 2025 — Month 1 unwinding:**
- Opening balance: $409,501.55
- Interest: $409,501.55 × 0.00333 = $1,365.01
- Closing balance: $410,866.56
- Dr Finance Cost — Unwinding $1,365.01
- Cr Provision for Obligations $1,365.01

**Feb 28, 2025 — Month 2 unwinding:**
- Opening balance: $410,866.56
- Interest: $410,866.56 × 0.00333 = $1,369.56
- Closing balance: $412,236.12

**Dec 31, 2029 — Month 60 (final):**
- Closing balance reaches exactly $500,000.00

**Settlement:**
- Dr Provision for Obligations $500,000
- Cr Cash $500,000

**Use the calculator:** `clio calc provision --amount 500000 --rate 4 --term 60 --start-date 2025-01-01`

---

## Enrichment Suggestions

| Enrichment | Value | Why |
|---|---|---|
| Tracking Tag | "Provision" | Filter all provision-related entries |
| Tracking Tag | "IAS 37" | Mark IFRS-specific adjustments |
| Custom Field | "Obligation Type" → "Warranty" | Identify the type of provision |
| Custom Field | "Expected Settlement Date" → "2029-12-31" | Record the estimated settlement date |

---

## Verification

1. **Trial Balance at Jan 31** → Provision for Obligations shows $410,866.56 credit. Finance Cost shows $1,365.01.
2. **Trial Balance at Dec 31, Year 1** → Provision balance should match the year-end closing balance from the unwinding schedule (~$426,185).
3. **Final period** → Provision balance reaches exactly $500,000.00 (the calculator's final-period adjustment ensures this).
4. **P&L per year** → Finance Cost — Unwinding increases each year (compounding effect), totaling $90,498.45 over 5 years.
5. **Group General Ledger by Capsule** → Complete history from recognition through every unwinding entry.

---

## Variations

**Revision of estimate:** If the estimated outflow changes (e.g., from $500,000 to $550,000), adjust the provision and recalculate the unwinding schedule. The change in estimate goes to Provision Expense, not Finance Cost.

**Short-term provision (no discounting):** If settlement is within 12 months, PV discounting is not required (IAS 37.45 — "effect of time value not material"). Simply recognize at the nominal amount with no unwinding schedule.

**Decommissioning provision:** Same pattern, but the initial recognition is capitalized to the related asset (Dr Asset / Cr Provision) instead of expensed. The asset is then depreciated over its useful life.

**Legal claim provision:** If the outcome is uncertain, provision is recognized only when "probable" (>50% likelihood). If only "possible," disclose as a contingent liability but do not recognize. Use the provision calculator once the amount and timing are estimable.

**Multiple payment dates:** If the obligation will be settled in tranches (e.g., warranty claims over 5 years), model as multiple provisions or use a weighted average settlement period.
