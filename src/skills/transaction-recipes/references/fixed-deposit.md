# Recipe: Fixed Deposit

## Scenario

Your company places $100,000 in a 12-month fixed deposit at 3.5% annual interest. Under IFRS 9, this is classified as a financial asset at amortized cost (hold-to-collect business model, passes the SPPI test — solely payments of principal and interest). Interest is accrued monthly using the effective interest rate method and recognized in profit or loss. At maturity, the bank returns the principal plus accumulated interest.

**Pattern:** Manual journals + capsule (monthly accrual, single maturity settlement)

---

## Accounts Involved

| Account | Type | Subtype | Role |
|---|---|---|---|
| Fixed Deposit | Asset | Current Asset | Carries the principal for the deposit term |
| Accrued Interest Receivable | Asset | Current Asset | Accumulates monthly interest accruals |
| Interest Income | Revenue | Other Income | P&L recognition of interest earned |
| Cash / Bank Account | Asset | Bank | Outflow on placement, inflow at maturity |

---

## Journal Entries

### Step 1: Placement (Day 1) — cash-out

Record the transfer from operating account to the fixed deposit. This is a **cash-out** entry in Jaz (cash leaves the bank account):

| Line | Account | Debit | Credit |
|---|---|---|---|
| 1 | Fixed Deposit | $100,000 | |
| 2 | Cash / Bank Account | | $100,000 |

> In Jaz, record this via the bank module (match the outgoing bank feed entry) or as a manual journal.

### Step 2: Monthly Interest Accrual (each month)

**Simple interest (default):** Equal monthly accrual amount.

| Line | Account | Debit | Credit |
|---|---|---|---|
| 1 | Accrued Interest Receivable | $291.67 | |
| 2 | Interest Income | | $291.67 |

**Calculation:**
- Annual interest = $100,000 × 3.5% = $3,500
- Monthly accrual = $3,500 / 12 = $291.67

**Compound interest:** Interest is calculated on the carrying amount (principal + previously accrued interest) using the effective interest rate. Each month's accrual is slightly higher than the last. Use `clio calc fixed-deposit --principal 100000 --rate 3.5 --term 12 --compound monthly` to generate the exact schedule.

### Step 3: Maturity (final day) — cash-in

Principal plus accrued interest returns to the bank account. This is a **cash-in** entry in Jaz (cash arrives in the bank account):

| Line | Account | Debit | Credit |
|---|---|---|---|
| 1 | Cash / Bank Account | $103,500 | |
| 2 | Fixed Deposit | | $100,000 |
| 3 | Accrued Interest Receivable | | $3,500 |

> After this entry, Fixed Deposit and Accrued Interest Receivable both zero out. The net P&L impact is $3,500 of Interest Income recognized over the 12 months. In Jaz, record via the bank module (match the incoming bank feed entry) or as a manual journal.

---

## Capsule Structure

**Capsule:** "Fixed Deposit — DBS — 2025"
**Capsule Type:** "Fixed Deposit"

Contents:
- 1 placement journal
- 12 monthly interest accrual journals
- 1 maturity journal
- **Total entries:** 14

The CLI generates a `capsuleDescription` field with full workings — including the interest calculation method, per-period accrual amounts, and maturity value — so the capsule is self-documenting.

---

## Worked Example

**Deposit terms:**
- Principal: $100,000
- Annual rate: 3.5%
- Term: 12 months (simple interest)
- Monthly accrual: $100,000 × 3.5% / 12 = $291.67
- Total interest: $3,500.00
- Maturity value: $103,500.00

**CLI command:**
```
clio calc fixed-deposit --principal 100000 --rate 3.5 --term 12 --currency SGD
```

### Accrual Schedule (first 3 months + last month)

| Month | Accrual Amount | Cumulative Interest | Accrued Interest Receivable |
|---|---|---|---|
| 1 | $291.67 | $291.67 | $291.67 |
| 2 | $291.67 | $583.34 | $583.34 |
| 3 | $291.67 | $875.01 | $875.01 |
| ... | ... | ... | ... |
| 12 | $291.63* | $3,500.00 | $3,500.00 |

> *Final month adjusted by $0.04 to close the balance exactly to $3,500.00 (rounding correction).

**Month 1 journal entry:**
- Dr Accrued Interest Receivable $291.67
- Cr Interest Income $291.67
- Description: "FD interest accrual — Month 1 of 12 (DBS)"
- Assign to capsule

**Month 3 journal entry:**
- Dr Accrued Interest Receivable $291.67
- Cr Interest Income $291.67
- Description: "FD interest accrual — Month 3 of 12 (DBS)"
- Assign to capsule

**Maturity journal entry:**
- Dr Cash $103,500.00
- Cr Fixed Deposit $100,000.00
- Cr Accrued Interest Receivable $3,500.00
- Description: "FD maturity — principal + interest received (DBS)"
- Assign to capsule

**Totals over 12 months:**
- Total interest income: $3,500.00
- Net cash impact: −$100,000 at placement, +$103,500 at maturity = +$3,500

---

## Enrichment Suggestions

| Enrichment | Value | Why |
|---|---|---|
| Tracking Tag | "Fixed Deposit" | Filter all FD-related transactions in reports |
| Nano Classifier | Instrument → "Term Deposit" | Distinguish from savings accounts or money market funds |
| Custom Field | "Deposit Reference" → "TD-2025-001" | Record the bank's deposit certificate number |
| Custom Field | "Bank Name" → "DBS" | Identify the issuing bank for multi-bank portfolios |

Set the tag and nano classifier on each accrual journal. Custom fields go on the placement journal (the capsule groups everything together).

---

## Verification

1. **Accrued Interest Receivable should accumulate monthly** → Trial Balance at month 6 should show $1,750.02 (6 × $291.67). The balance grows each month until maturity.
2. **Interest Income P&L line = total accrual to date** → P&L at any date should equal the sum of accrual entries posted up to that date.
3. **At maturity, Fixed Deposit account zeros out** → After the maturity journal, Fixed Deposit balance = $0 and Accrued Interest Receivable balance = $0.
4. **Cash flow: Cash decreased by principal on placement, increased by maturity value at end** → Net cash movement over the 12 months = +$3,500 (the interest earned).
5. **Group General Ledger by Capsule** → "Fixed Deposit — DBS — 2025" should show all 14 entries. Fixed Deposit nets to $0 and Interest Income totals $3,500.

---

## Variations

**Compound interest:** Use `clio calc fixed-deposit --principal 100000 --rate 3.5 --term 12 --compound monthly` to generate a schedule where each month's interest is calculated on the carrying amount (principal + accrued interest to date). Total interest will be slightly higher than simple interest ($3,556.46 vs $3,500.00 for monthly compounding). The effective interest rate method applies the same logic — each period's income = carrying amount × periodic rate.

**FX-denominated deposit:** If the deposit is in USD but your base currency is SGD, record the placement journal with `currency: { sourceCurrency: "USD" }`. Monthly accruals should use the spot rate at each month-end. At maturity, any difference between the cumulative translated amounts and the actual SGD received is an FX gain/loss. Cross-reference the fx-revaluation recipe for month-end revaluation of the outstanding balance.

**Premature withdrawal:** The bank may impose a penalty (reduced interest rate or flat fee). Record the maturity journal with the reduced interest amount. If interest already accrued exceeds the actual payout, reverse the excess: Dr Interest Income / Cr Accrued Interest Receivable. Note the penalty in the journal description.

**Auto-rollover:** When the bank automatically rolls over the deposit at maturity, close the original capsule with a maturity journal (Dr Fixed Deposit New / Cr Fixed Deposit Old + Cr Accrued Interest Receivable), then create a new capsule for the rolled deposit. The new principal may include the prior interest if the bank compounds on rollover.

**PH withholding tax (20% final WHT on interest income):** In jurisdictions that withhold tax on interest at source, the maturity cash received is net of WHT. Record: Dr Cash (net) + Dr WHT Receivable or Tax Expense / Cr Fixed Deposit + Cr Accrued Interest Receivable. This variation is deferred to a future recipe update.
