# Month-End Close

The monthly close is the foundation of accurate books. For an SMB, this typically takes 1-3 days depending on transaction volume and complexity. Every quarter-end and year-end builds on this.

**CLI:** `clio jobs month-end --period 2025-01 [--currency SGD] [--json]`

---

## Phase 1: Pre-Close Preparation

Before adjusting anything, ensure the raw data is complete. These are verification steps — you're checking, not creating.

### Step 1: Verify all sales invoices are entered

Confirm every invoice issued during the period is in Jaz.

```
POST /invoices/search
{
  "filter": { "valueDate": { "between": ["2025-01-01", "2025-01-31"] } },
  "sort": { "sortBy": ["valueDate"], "order": "ASC" },
  "limit": 1000
}
```

**What to check:** Compare the count and total against your sales records or POS system. Missing invoices = understated revenue.

### Step 2: Verify all purchase bills are entered

Confirm every bill received during the period is in Jaz. For SMBs, this is the most common gap — bills arrive late or sit in someone's inbox.

```
POST /bills/search
{
  "filter": { "valueDate": { "between": ["2025-01-01", "2025-01-31"] } },
  "sort": { "sortBy": ["valueDate"], "order": "ASC" },
  "limit": 1000
}
```

**What to check:** Cross-reference against email, supplier portals, and physical mail. Late bills → missed expenses → overstated profit.

**Tip:** If you have the bill document but haven't entered it yet, use **Jaz Magic** (`POST /magic/createBusinessTransactionFromAttachment`) — upload the PDF/JPG and let extraction & autofill handle it.

### Step 3: Complete bank reconciliation

This is the single most important pre-close step. Every bank account must be reconciled to its statement closing balance.

```
POST /bank-records/{accountResourceId}/search
{
  "filter": { "status": { "eq": "UNRECONCILED" } },
  "sort": { "sortBy": ["valueDate"], "order": "ASC" },
  "limit": 1000
}
```

**What to check:**
- All unreconciled items are genuine timing differences (outstanding cheques, deposits in transit)
- No items older than 30 days (investigate and resolve)
- Book balance per Jaz matches bank statement closing balance

**See also:** `references/bank-recon.md` for the full bank reconciliation catch-up job.

### Step 4: Review AR aging

Identify overdue customer invoices. This feeds into credit control and bad debt assessment.

```
POST /generate-reports/ar-report
{ "endDate": "2025-01-31" }
```

**What to check:**
- Total AR ties to Accounts Receivable on trial balance
- Flag invoices overdue > 30/60/90 days
- Consider bad debt provision if material (→ Phase 3)

### Step 5: Review AP aging

Identify upcoming and overdue supplier payments. This feeds into payment planning.

```
POST /generate-reports/ap-report
{ "endDate": "2025-01-31" }
```

**What to check:**
- Total AP ties to Accounts Payable on trial balance
- Identify bills due in the next 7-14 days for the payment run
- Flag any disputed or held bills

---

## Phase 2: Accruals & Adjustments

Record transactions that belong to this period but aren't yet in the books. This is where recipes come in.

### Step 6: Record accrued expenses

Expenses incurred but not yet billed (utilities, professional services, cleaning, etc.). The most common month-end adjustment for SMBs.

**Recipe:** `accrued-expenses`
**Pattern:** DR Expense, CR Accrued Liabilities → reverse on Day 1 of next month

```
POST /journals
{
  "valueDate": "2025-01-31",
  "reference": "ME-ACCR-JAN25",
  "journalEntries": [
    { "accountResourceId": "<expense-account>", "amount": 500.00, "type": "DEBIT", "name": "Electricity accrual — Jan 2025" },
    { "accountResourceId": "<accrued-liabilities>", "amount": 500.00, "type": "CREDIT", "name": "Electricity accrual — Jan 2025" }
  ]
}
```

**Conditional:** Only if there are expenses not yet billed for the period. Common examples: utilities, internet, cleaning, accounting fees.

### Step 7: Amortize prepaid expenses

If you've set up prepaid expense capsules with schedulers, verify the scheduler fired for this month. If not, post the amortization journal manually.

**Recipe:** `prepaid-amortization` | **Calculator:** `clio calc prepaid-expense`
**Pattern:** DR Expense, CR Prepaid Asset

**Verification:** Search for journals in the prepaid capsule for this period:
```
POST /journals/search
{
  "filter": {
    "valueDate": { "between": ["2025-01-01", "2025-01-31"] }
  },
  "sort": { "sortBy": ["valueDate"], "order": "DESC" },
  "limit": 100
}
```

Filter results by capsule name (e.g., "FY2025 Office Insurance") to confirm the entry exists.

### Step 8: Recognize deferred revenue

If you've received upfront payments that should be recognized over time, verify the scheduler fired or post manually.

**Recipe:** `deferred-revenue` | **Calculator:** `clio calc deferred-revenue`
**Pattern:** DR Deferred Revenue (liability), CR Revenue

**Conditional:** Only if your business has subscription or prepaid revenue models.

### Step 9: Record depreciation

For fixed assets, record the monthly depreciation charge. Jaz supports straight-line natively via fixed assets. For declining balance or 150DB methods, use the calculator and post manual journals.

**Recipe:** `declining-balance` | **Calculator:** `clio calc depreciation`
**Pattern:** DR Depreciation Expense, CR Accumulated Depreciation

**If using native Jaz FA depreciation:** Verify auto-calculated depreciation is running correctly via the FA register.
**If using non-standard methods:** Post manual journal from calculator output.

### Step 10: Accrue employee benefits

Record monthly leave accrual. If using a scheduler, verify it fired.

**Recipe:** `employee-accruals`
**Pattern:** DR Leave Expense, CR Leave Liability (monthly fixed amount from scheduler)

**Conditional:** Only if you track leave balances. Most SMBs with 5+ employees should.

### Step 11: Accrue loan interest

If you have bank loans, verify the interest portion of this month's payment is correctly recorded. If payments are embedded in bill/cash-out entries, this may already be handled.

**Recipe:** `bank-loan` | **Calculator:** `clio calc loan`
**Pattern:** Interest splits from principal in each payment — verify the amortization table matches.

**Conditional:** Only if you have active loans. Skip if loan payments are already correctly coded.

---

## Phase 3: Period-End Valuations

Adjustments that depend on period-end rates or balances. These are less common for simple SMBs but critical for accuracy.

### Step 12: FX revaluation

If your org has foreign currency monetary items (bank accounts, receivables, payables in non-base currency), revalue them at period-end exchange rates.

**Recipe:** `fx-revaluation` | **Calculator:** `clio calc fx-reval`
**Pattern:** DR/CR FX Unrealized Gain/Loss for the difference between book rate and closing rate. Post a Day 1 reversal.

```bash
clio calc fx-reval --amount 50000 --book-rate 1.35 --closing-rate 1.38 --currency USD --base-currency SGD
```

**Conditional:** Only if multi-currency org with material foreign currency balances. Many SGD-only SMBs can skip this.

**Note:** Jaz auto-handles FX on AR/AP (invoices/bills in foreign currency). This step is for non-AR/AP items only (foreign currency bank accounts, deposits, intercompany balances).

### Step 13: Review bad debt provision (ECL)

Assess whether the bad debt provision needs adjusting based on the AR aging report from Step 4.

**Recipe:** `bad-debt-provision` | **Calculator:** `clio calc ecl`
**Pattern:** DR Bad Debt Expense, CR Allowance for Doubtful Debts

```bash
clio calc ecl --current 100000 --30d 50000 --60d 20000 --90d 10000 --120d 5000 --rates 0.5,2,5,10,50
```

**Conditional:** Review monthly, but typically adjust quarterly unless there's a significant change (e.g., major customer default). For most SMBs, a quick mental check is sufficient monthly — formal ECL review in quarter-end.

---

## Phase 4: Verification

Run the numbers. Everything should tie.

### Step 14: Review trial balance

The master check. Total debits must equal total credits.

```
POST /generate-reports/trial-balance
{ "startDate": "2025-01-01", "endDate": "2025-01-31" }
```

**What to check:**
- Debits = Credits (always — if not, something is seriously wrong)
- Cash/bank accounts match bank statements
- AR balance matches AR aging total from Step 4
- AP balance matches AP aging total from Step 5
- No unexpected balances (negative cash, credit balances in expense accounts)

### Step 15: Generate P&L

```
POST /generate-reports/profit-and-loss
{ "primarySnapshotDate": "2025-01-31", "secondarySnapshotDate": "2025-01-01" }
```

**What to check:**
- Revenue is in line with expectations
- Expenses make sense for the month
- Gross margin is reasonable
- Any large one-off items should be explainable (accruals, adjustments from Phase 2)

### Step 16: Generate balance sheet

```
POST /generate-reports/balance-sheet
{ "primarySnapshotDate": "2025-01-31" }
```

**What to check:**
- Assets = Liabilities + Equity (by definition — if not, the API has a bug)
- Cash position is reasonable
- Prepaid balances reduced by one month's amortization
- Accrued liabilities reflect the accruals from Phase 2

### Step 17: Compare to prior month

Run the same P&L for the prior month and compare. Significant variances should be explainable.

```
POST /generate-reports/profit-and-loss
{ "primarySnapshotDate": "2024-12-31", "secondarySnapshotDate": "2024-12-01" }
```

**Flag:** Revenue or expense lines that moved > 20% month-over-month without a clear reason.

---

## Phase 5: Close & Lock

Once everything checks out, lock the period to prevent accidental backdated entries.

### Step 18: Set lock date

Move the org lock date forward to the last day of the closed month.

**Best practice:** Lock date = last day of the closed period (e.g., `2025-01-31` after January close).

**Important:** Only move the lock date forward. Moving it backward reopens prior periods — do this only if you need to post corrections (and re-close afterward).

---

## Month-End Close Checklist (Quick Reference)

| # | Step | Phase | Conditional | Recipe/Calc |
|---|------|-------|-------------|-------------|
| 1 | Verify invoices entered | Pre-close | Always | — |
| 2 | Verify bills entered | Pre-close | Always | — |
| 3 | Complete bank reconciliation | Pre-close | Always | bank-recon job |
| 4 | Review AR aging | Pre-close | Always | — |
| 5 | Review AP aging | Pre-close | Always | — |
| 6 | Record accrued expenses | Accruals | If unbilled expenses exist | accrued-expenses |
| 7 | Amortize prepaid expenses | Accruals | If prepaid capsules exist | prepaid-amortization / `clio calc prepaid-expense` |
| 8 | Recognize deferred revenue | Accruals | If deferred revenue exists | deferred-revenue / `clio calc deferred-revenue` |
| 9 | Record depreciation | Accruals | If fixed assets exist | declining-balance / `clio calc depreciation` |
| 10 | Accrue employee benefits | Accruals | If tracking leave | employee-accruals |
| 11 | Accrue loan interest | Accruals | If active loans | bank-loan / `clio calc loan` |
| 12 | FX revaluation | Valuations | If multi-currency | fx-revaluation / `clio calc fx-reval` |
| 13 | Review bad debt provision | Valuations | If material AR change | bad-debt-provision / `clio calc ecl` |
| 14 | Review trial balance | Verification | Always | — |
| 15 | Generate P&L | Verification | Always | — |
| 16 | Generate balance sheet | Verification | Always | — |
| 17 | Compare to prior month | Verification | Always | — |
| 18 | Set lock date | Close | Always | — |
