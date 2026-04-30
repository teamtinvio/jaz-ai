# Quarter-End Close

The quarterly close builds on the monthly close. It is month-end close repeated three times, plus a set of quarterly-specific adjustments that only make sense at three-month intervals. For most SMBs, this adds half a day to a day of extra work on top of the regular month-end.

**CLI:** `clio jobs quarter-end --period 2025-Q1 [--currency SGD] [--json]`

**Standalone vs Incremental:**
- **Standalone (default):** Generates the full plan — all monthly close steps for each of the three months in the quarter, followed by the quarterly extras. Use this when months haven't been closed yet.
- **Incremental (`--incremental`):** Generates only the quarterly extras below. Use this when all three months are already closed and locked.

---

## Phase 1–5: Monthly Close (x3)

Complete the full month-end close for each month in the quarter. Each month follows the same 5-phase, 18-step process.

**Reference:** `references/month-end-close.md`

| Quarter | Month 1 | Month 2 | Month 3 |
|---------|---------|---------|---------|
| Q1 (Jan–Mar) | January close | February close | March close |
| Q2 (Apr–Jun) | April close | May close | June close |
| Q3 (Jul–Sep) | July close | August close | September close |
| Q4 (Oct–Dec) | October close | November close | December close |

**Important:** Close months in order. Month 1 must be locked before starting Month 2, and Month 2 before Month 3. The quarterly extras run after Month 3 is closed.

---

## Phase 6: Quarterly Extras

These steps run once per quarter, after all three months are closed. They address items that are reviewed less frequently or that accumulate over the quarter.

### Step Q1: GST/VAT filing preparation

Generate the tax ledger for the full quarter and reconcile input/output tax for filing.

```
POST /generate-reports/vat-ledger
{ "startDate": "2025-01-01", "endDate": "2025-03-31" }
```

**What to do:**
1. Pull the quarterly tax ledger report
2. Review output tax (GST on sales) — verify every taxable invoice is included and the correct tax code was applied
3. Review input tax (GST on purchases) — verify every claimable bill is included, no blocked input tax claimed
4. Identify discrepancies — missing invoices/bills, wrong tax codes, exempt items coded as taxable
5. Cross-reference totals to the GST return form

**For Singapore (IRAS):**
- Quarterly filing (standard GST-registered businesses)
- File via myTax Portal within one month after quarter end
- Box 1 (Total Sales): total revenue incl. zero-rated and exempt
- Box 6 (Output Tax): from tax ledger output tax total
- Box 7 (Input Tax): from tax ledger input tax total (net of blocked items)

**For Philippines (BIR):**
- Monthly VAT return (BIR Form 2550M) for each month in the quarter
- Quarterly VAT return (BIR Form 2550Q) for the full quarter
- Input VAT carried forward if excess over output VAT
- File within 25 days after the close of the taxable quarter

**Verification:** Output tax per tax ledger should equal sum of GST on all sales invoices for the quarter. Input tax per tax ledger should equal sum of GST on all purchase bills (excluding blocked items). Any difference = data entry error to investigate.

**See also:** `references/gst-vat-filing.md` for the full GST/VAT filing job.

### Step Q2: ECL / bad debt provision — formal review

The monthly close includes a quick bad debt check (Step 13). The quarterly review is the formal one — full aged receivables analysis with loss rates applied.

**Recipe:** `bad-debt-provision` | **Calculator:** `clio calc ecl`

**Step-by-step:**

1. Pull the AR aging report as at quarter-end:
```
POST /generate-reports/ar-report
{ "endDate": "2025-03-31" }
```

2. Categorize receivables into aging buckets (current, 30d, 60d, 90d, 120d+)

3. Apply historical loss rates to each bucket:
```bash
clio calc ecl --current 100000 --30d 50000 --60d 20000 --90d 10000 --120d 5000 --rates 0.5,2,5,10,50
```

4. Compare the calculated provision to the existing Allowance for Doubtful Debts balance on the trial balance

5. Post an adjustment journal for the difference:
```
POST /journals
{
  "valueDate": "2025-03-31",
  "reference": "QE-ECL-Q1-25",
  "journalEntries": [
    { "accountResourceId": "<bad-debt-expense>", "amount": 1250.00, "type": "DEBIT", "name": "ECL provision adjustment — Q1 2025" },
    { "accountResourceId": "<allowance-doubtful-debts>", "amount": 1250.00, "type": "CREDIT", "name": "ECL provision adjustment — Q1 2025" }
  ]
}
```

**Note:** If the required provision has decreased, reverse the direction (DR Allowance, CR Bad Debt Expense). Some firms use a separate recovery account for write-backs.

**Conditional:** Always perform the formal review at quarter-end, even if the monthly quick checks showed no change. Document the analysis — auditors will ask for it.

### Step Q3: Bonus accrual true-up

Review quarterly bonus obligations and adjust the accrual if estimates have changed.

**Recipe:** `employee-accruals` (bonus component)

During monthly closes, you accrue a fixed monthly estimate (1/12 of expected annual bonus). At quarter-end, re-assess whether the estimate is still accurate based on actual performance.

**Step-by-step:**

1. Verify three months of bonus accruals exist. Search for journals in the Employee Benefits capsule:
```
POST /journals/search
{
  "filter": {
    "valueDate": { "between": ["2025-01-01", "2025-03-31"] }
  },
  "sort": { "sortBy": ["valueDate"], "order": "ASC" },
  "limit": 100
}
```
Filter results by capsule or reference prefix (e.g., "BONUS-ACCR") to isolate bonus entries.

2. Sum the year-to-date accrual and compare to the revised full-year estimate

3. If the estimate has changed, post a true-up journal:
```
POST /journals
{
  "valueDate": "2025-03-31",
  "reference": "QE-BONUS-Q1-25",
  "journalEntries": [
    { "accountResourceId": "<bonus-expense>", "amount": 2000.00, "type": "DEBIT", "name": "Bonus accrual true-up — Q1 2025" },
    { "accountResourceId": "<bonus-liability>", "amount": 2000.00, "type": "CREDIT", "name": "Bonus accrual true-up — Q1 2025" }
  ]
}
```

**Conditional:** Only if the business has bonus schemes. Most SMBs with 5+ employees and a performance bonus structure should review quarterly. If no change to estimate, document the review but skip the journal.

### Step Q4: Intercompany reconciliation

If the business operates multiple entities (e.g., SG parent + PH subsidiary), reconcile intercompany balances and post settlement journals.

**Recipe:** `intercompany`

**Step-by-step:**

1. Pull the trial balance for each entity and isolate intercompany receivable/payable accounts:
```
POST /generate-reports/trial-balance
{ "startDate": "2025-01-01", "endDate": "2025-03-31" }
```

2. Verify that Entity A's intercompany receivable = Entity B's intercompany payable (and vice versa). Differences indicate:
   - Transactions recorded in one entity but not the other
   - Timing differences (one entity booked end-of-quarter, the other booked beginning of next)
   - FX differences if the entities operate in different currencies

3. Post matching journals in both entities to clear discrepancies

4. If settling (netting off balances), post settlement journals:
```
POST /journals
{
  "valueDate": "2025-03-31",
  "reference": "QE-IC-SETTLE-Q1-25",
  "journalEntries": [
    { "accountResourceId": "<intercompany-payable>", "amount": 15000.00, "type": "DEBIT", "name": "IC settlement — Entity A, Q1 2025" },
    { "accountResourceId": "<bank-account>", "amount": 15000.00, "type": "CREDIT", "name": "IC settlement — Entity A, Q1 2025" }
  ]
}
```

**Conditional:** Only if multi-entity. Single-entity SMBs skip this entirely.

### Step Q5: Provision unwinding

If IAS 37 provisions exist (e.g., restoration obligations, warranty provisions, legal claims), post the quarterly discount unwinding journal.

**Recipe:** `provisions` | **Calculator:** `clio calc provision`

Provisions measured at present value must have the discount unwound each period, recognizing the time value of money as a finance cost.

```bash
clio calc provision --amount 500000 --rate 4 --term 60 --start-date 2025-01-01 --json
```

The calculator generates the unwinding schedule. Post the quarterly entry:

```
POST /journals
{
  "valueDate": "2025-03-31",
  "reference": "QE-PROV-UNWIND-Q1-25",
  "journalEntries": [
    { "accountResourceId": "<finance-cost>", "amount": 4975.00, "type": "DEBIT", "name": "Provision discount unwinding — Q1 2025" },
    { "accountResourceId": "<provision-liability>", "amount": 4975.00, "type": "CREDIT", "name": "Provision discount unwinding — Q1 2025" }
  ]
}
```

**Conditional:** Only if IAS 37 provisions exist with a discounting component. Most simple SMBs won't have these. Common in businesses with lease restoration obligations or long-term warranty commitments.

---

## Phase 7: Quarterly Verification

Run the standard period verification (see `references/building-blocks.md` — Period Verification Pattern) for the full quarter, plus these quarterly-specific checks.

### Standard verification (full quarter)

```
POST /generate-reports/trial-balance
{ "startDate": "2025-01-01", "endDate": "2025-03-31" }
```

```
POST /generate-reports/profit-and-loss
{ "primarySnapshotDate": "2025-03-31", "secondarySnapshotDate": "2025-01-01" }
```

```
POST /generate-reports/balance-sheet
{ "primarySnapshotDate": "2025-03-31" }
```

### Quarterly-specific checks

**GST reconciliation:**
- Tax ledger output tax total = sum of GST on all sales invoices for Q1
- Tax ledger input tax total = sum of GST on all purchase bills (less blocked items) for Q1
- Net GST payable/refundable per tax ledger matches the amount on the GST return form
- If you already filed monthly VAT returns (PH), quarterly total should equal sum of the three monthly returns

**ECL provision balance:**
- Allowance for Doubtful Debts on the balance sheet matches the calculated ECL from Step Q2
- Bad Debt Expense on the P&L is reasonable relative to revenue

**Intercompany balance check (if multi-entity):**
- Entity A's intercompany receivable = Entity B's intercompany payable
- Net intercompany position across all entities = zero (eliminates on consolidation)

**Bonus accrual reasonableness:**
- Bonus Liability on the balance sheet = (monthly accrual x months elapsed) + any true-ups
- Bonus Expense on the P&L is proportional to the period (e.g., Q1 = ~25% of full-year estimate)

---

## Quarter-End Close Checklist (Quick Reference)

| # | Step | Phase | Conditional | Recipe/Calc |
|---|------|-------|-------------|-------------|
| 1–18 | Month 1 close (all steps) | Monthly | Always | See month-end-close.md |
| 1–18 | Month 2 close (all steps) | Monthly | Always | See month-end-close.md |
| 1–18 | Month 3 close (all steps) | Monthly | Always | See month-end-close.md |
| Q1 | GST/VAT filing preparation | Quarterly | Always (if GST-registered) | gst-vat-filing job |
| Q2 | ECL / bad debt provision review | Quarterly | Always | bad-debt-provision / `clio calc ecl` |
| Q3 | Bonus accrual true-up | Quarterly | If bonus schemes exist | employee-accruals |
| Q4 | Intercompany reconciliation | Quarterly | If multi-entity | intercompany |
| Q5 | Provision unwinding | Quarterly | If IAS 37 provisions exist | provisions / `clio calc provision` |
| V | Quarterly verification | Verification | Always | — |
