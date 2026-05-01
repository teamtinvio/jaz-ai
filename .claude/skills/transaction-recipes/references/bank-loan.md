# Recipe: Bank Loan

## Scenario

Your company takes a $100,000 bank loan at 6% annual interest, repaid in 60 equal monthly installments of $1,933.28. Each payment splits between principal (reducing the loan balance) and interest (expense), with the split changing every month as the outstanding balance decreases.

**Pattern:** Manual journals + capsule (interest amount changes each period)

---

## Accounts Involved

| Account | Type | Subtype | Role |
|---|---|---|---|
| Loan Payable | Liability | Non-Current Liability | Long-term portion of loan balance |
| Loan Payable (Current) | Liability | Current Liability | Portion due within 12 months |
| Interest Expense | Expense | Expense | Monthly interest charge |
| Cash / Bank Account | Asset | Bank | Receives disbursement, makes payments |

> **Note on current/non-current split:** For simplicity, this recipe uses a single "Loan Payable" account. In practice, you may maintain two accounts and periodically reclassify the next 12 months' principal as current. A year-end reclassification journal (Dr Loan Payable Non-Current / Cr Loan Payable Current) can be added to the capsule.

---

## Journal Entries

### Step 1: Loan Disbursement (Day 1)

| Line | Account | Debit | Credit |
|---|---|---|---|
| 1 | Cash / Bank Account | $100,000 | |
| 2 | Loan Payable | | $100,000 |

### Step 2: Monthly Payment (each month)

Each payment is a fixed installment of $1,933.28, split as follows:

| Line | Account | Debit | Credit |
|---|---|---|---|
| 1 | Loan Payable | *principal portion* | |
| 2 | Interest Expense | *interest portion* | |
| 3 | Cash / Bank Account | | $1,933.28 |

**Calculation per month:**
- Monthly rate = 6% / 12 = 0.5%
- Interest = Outstanding balance × 0.005
- Principal = $1,933.28 − Interest
- New balance = Outstanding balance − Principal

---

## Capsule Structure

**Capsule:** "Bank Loan — ABC Bank — 2025"
**Capsule Type:** "Loan Repayment"

Contents:
- 1 disbursement journal
- 60 monthly payment journals
- Optional: year-end current/non-current reclassification journals
- **Total entries:** 61+

---

## Worked Example

**Loan terms:**
- Principal: $100,000
- Annual rate: 6% (monthly rate: 0.5%)
- Term: 60 months
- Fixed installment: $1,933.28

**Monthly installment formula:**
```
PMT = P × r / (1 − (1 + r)^−n)
PMT = 100,000 × 0.005 / (1 − 1.005^−60)
PMT = 500 / 0.2586 = $1,933.28
```

### Amortization Table (first 6 months + last 2)

| Month | Opening Balance | Interest (0.5%) | Principal | Closing Balance |
|---|---|---|---|---|
| 1 | $100,000.00 | $500.00 | $1,433.28 | $98,566.72 |
| 2 | $98,566.72 | $492.83 | $1,440.45 | $97,126.27 |
| 3 | $97,126.27 | $485.63 | $1,447.65 | $95,678.62 |
| 4 | $95,678.62 | $478.39 | $1,454.89 | $94,223.73 |
| 5 | $94,223.73 | $471.12 | $1,462.16 | $92,761.57 |
| 6 | $92,761.57 | $463.81 | $1,469.47 | $91,292.10 |
| ... | ... | ... | ... | ... |
| 59 | $3,847.42 | $19.24 | $1,914.04 | $1,933.38 |
| 60 | $1,933.38 | $9.67 | $1,923.61 | $0.00* |

> *Final payment may need a small rounding adjustment (±$0.10) to close the balance exactly to zero.

**Month 1 journal entry:**
- Dr Loan Payable $1,433.28
- Dr Interest Expense $500.00
- Cr Cash $1,933.28
- Description: "Loan payment — Month 1 of 60 (ABC Bank)"
- Assign to capsule

**Month 6 journal entry:**
- Dr Loan Payable $1,469.47
- Dr Interest Expense $463.81
- Cr Cash $1,933.28
- Description: "Loan payment — Month 6 of 60 (ABC Bank)"
- Assign to capsule

**Totals over 60 months:**
- Total payments: $1,933.28 × 60 = $115,996.80
- Total interest: $15,996.80
- Total principal: $100,000.00

---

## Enrichment Suggestions

| Enrichment | Value | Why |
|---|---|---|
| Tracking Tag | "Bank Loan" | Filter all loan-related transactions |
| Nano Classifier | Facility → "Term Loan" | Distinguish from revolving credit or overdraft |
| Custom Field | "Loan Reference" → "LN-2025-0042" | Record the bank's loan reference number |

---

## Verification

1. **Group General Ledger by Capsule** → Shows disbursement + all payments. Loan Payable should start at $100,000 credit and reduce to $0 by month 60.
2. **Trial Balance at any date** → Loan Payable balance should match the "Closing Balance" column in the amortization table for that month.
3. **P&L for Year 1** → Interest Expense = sum of interest column for months 1–12 (approximately $5,580).
4. **Cash movement** → Cash decreased by $1,933.28 × number of payments made, offset by the initial $100,000 disbursement.

---

## Variations

**Variable rate loan:** Recalculate the installment amount whenever the rate changes. The capsule still holds all entries. Note in the journal description when the rate changed.

**Lump-sum principal repayment:** Record an additional journal: Dr Loan Payable / Cr Cash for the lump sum. Recalculate remaining monthly installments based on the new balance.

**Interest-only period:** During interest-only months, the journal is: Dr Interest Expense / Cr Cash (no principal portion). Once amortization begins, switch to the split format.

**Multi-currency loan:** If the loan is in USD but base currency is SGD, record the disbursement with `currency: { sourceCurrency: "USD" }`. Monthly payments should use the spot rate on payment date. FX gains/losses are captured automatically.

**Fees:** Loan origination fees can be recorded as a separate journal in the capsule: Dr Loan Origination Fee (expense or amortized asset) / Cr Cash.
