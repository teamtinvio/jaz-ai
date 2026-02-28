# Audit Preparation

Compile the complete report pack, supporting schedules, and reconciliations that an auditor or tax agent needs. For most SMBs, this is an annual exercise — either for the statutory audit (if required) or for the annual tax filing with IRAS (SG) or BIR (PH).

**CLI:** `clio jobs audit-prep --period 2025 [--json]`

---

## Who Needs This

| Situation | SG | PH |
|-----------|----|----|
| **Statutory audit required** | Companies with revenue > S$10M, assets > S$10M, or employees > 50 | All stock corporations, companies with paid-up capital > PHP 50K |
| **Tax filing (no audit)** | All companies file Form C/C-S with IRAS | All companies file ITR with BIR |
| **Compilation by accountant** | Small exempt private companies — no audit but accountant prepares financial statements | N/A |

Even if you're a small exempt company not requiring an audit, your external accountant or tax agent needs the same reports to prepare your financial statements and tax return. This job produces the full pack.

---

## Phase 1: Core Financial Reports

Generate the three primary financial statements. These form the backbone of any audit or tax filing.

### Step 1: Trial Balance

The master reconciliation tool. Everything else derives from this.

```
POST /api/v1/generate-reports/trial-balance
{ "startDate": "2025-01-01", "endDate": "2025-12-31" }
```

**What the auditor checks:** Debits = Credits (always). Any imbalance indicates a system error.

### Step 2: Profit & Loss Statement

```
POST /api/v1/generate-reports/profit-and-loss
{ "primarySnapshotDate": "2025-12-31", "secondarySnapshotDate": "2025-01-01" }
```

**Comparative:** If the auditor needs prior year comparison:

```
POST /api/v1/generate-reports/profit-and-loss
{ "primarySnapshotDate": "2024-12-31", "secondarySnapshotDate": "2024-01-01" }
```

### Step 3: Balance Sheet

```
POST /api/v1/generate-reports/balance-sheet
{ "primarySnapshotDate": "2025-12-31" }
```

**Key check:** Assets = Liabilities + Equity.

---

## Phase 2: Supporting Ledgers

Detailed transaction-level data behind the summary reports.

### Step 4: General Ledger — grouped by account

```
POST /api/v1/generate-reports/general-ledger
{ "startDate": "2025-01-01", "endDate": "2025-12-31", "groupBy": "ACCOUNT" }
```

This is the auditor's primary working document. Every transaction, grouped by CoA account, with opening balance, movements, and closing balance.

### Step 5: Cashflow Statement

```
POST /api/v1/generate-reports/cashflow
{ "primaryStartDate": "2025-01-01", "primaryEndDate": "2025-12-31" }
```

Classifies cash movements into Operating, Investing, and Financing activities.

### Step 6: Equity Movement

```
POST /api/v1/generate-reports/equity-movement
{ "primarySnapshotStartDate": "2025-01-01", "primarySnapshotEndDate": "2025-12-31" }
```

Shows opening equity, net profit, dividends, and other movements during the year.

---

## Phase 3: Aging Reports

### Step 7: AR Aging (Accounts Receivable)

```
POST /api/v1/generate-reports/ar-report
{ "endDate": "2025-12-31" }
```

**Auditor use:** Tests recoverability of receivables. Aging > 90 days triggers bad debt assessment. The AR total MUST tie to the Accounts Receivable balance on the trial balance.

### Step 8: AP Aging (Accounts Payable)

```
POST /api/v1/generate-reports/ap-report
{ "endDate": "2025-12-31" }
```

**Auditor use:** Completeness assertion — are all liabilities recorded? The AP total MUST tie to the Accounts Payable balance on the trial balance.

---

## Phase 4: Bank and Cash

### Step 9: Bank Reconciliation Summary

```
POST /api/v1/generate-reports/bank-reconciliation-summary
{ "primarySnapshotDate": "2025-12-31" }
```

**This is non-negotiable for auditors.** The bank recon proves that the cash balance per books matches the bank statement. Any unreconciled items at year-end must be explained.

**For detailed reconciliation (per bank account):**

```
POST /api/v1/generate-reports/bank-reconciliation-details
{ "primarySnapshotDate": "2025-12-31" }
```

### Step 10: Bank Balance Summary

```
POST /api/v1/generate-reports/bank-balance-summary
{ "primarySnapshotDate": "2025-12-31" }
```

Summary of all bank account balances at year-end. Cross-reference to bank confirmation letters (which the auditor will request directly from your banks).

---

## Phase 5: Fixed Assets

### Step 11: Fixed Assets Register

```
POST /api/v1/generate-reports/fixed-assets-summary
```

Shows all fixed assets: acquisition date, cost, depreciation method, useful life, accumulated depreciation, and net book value.

**For FA reconciliation (movements during the year):**

```
POST /api/v1/generate-reports/fixed-assets-recon-summary
```

This shows: opening NBV + additions - disposals - depreciation = closing NBV. The auditor reconciles this to the trial balance.

---

## Phase 6: Tax

### Step 12: Tax Ledger / GST Summary

```
POST /api/v1/generate-reports/vat-ledger
{ "startDate": "2025-01-01", "endDate": "2025-12-31" }
```

Full year tax ledger for the auditor to verify GST returns filed during the year. The annual total should reconcile to the sum of the four quarterly GST F5 returns.

---

## Phase 7: Data Exports

Auditors and tax agents often need the data in Excel format for their own workpapers.

### Step 13: Export all key reports

```
POST /api/v1/data-exports/trial-balance
{ "startDate": "2025-01-01", "endDate": "2025-12-31" }
```

```
POST /api/v1/data-exports/profit-and-loss
{ "startDate": "2025-01-01", "endDate": "2025-12-31" }
```

```
POST /api/v1/data-exports/general-ledger
{ "startDate": "2025-01-01", "endDate": "2025-12-31", "groupBy": "ACCOUNT" }
```

```
POST /api/v1/data-exports/ar-report
{ "endDate": "2025-12-31" }
```

```
POST /api/v1/data-exports/ap-report
{ "endDate": "2025-12-31" }
```

**Note:** Data export endpoints use simpler field names than generate-reports. P&L export uses `startDate`/`endDate` instead of `primarySnapshotDate`/`secondarySnapshotDate`.

---

## Phase 8: Supporting Schedules

These are typically prepared manually by extracting data from the general ledger. The schedules explain what sits behind specific balance sheet line items.

### Step 14: Compile supporting schedules

**Prepaid Expenses Schedule:**
- Search the general ledger for prepaid asset accounts
- List each prepaid item: description, original amount, amortization to date, remaining balance
- If using capsules for prepaid workflows, group the GL by capsule for a clean view

**Loan Schedule:**
- For each active loan: original principal, interest rate, monthly payment, balance at year-end
- Extract from the loan capsule GL entries
- **Calculator:** `clio calc loan` produces the full amortization table

**Provision Schedule:**
- List all provisions: ECL/bad debt, employee leave, warranty, legal, etc.
- For each: opening balance, additions, utilizations, reversals, closing balance
- ECL provision: `clio calc ecl` for the year-end calculation

**Lease Schedule (if IFRS 16 applies):**
- Right-of-use asset: opening, depreciation, closing
- Lease liability: opening, interest, payments, closing
- **Calculator:** `clio calc lease` for the complete schedule

**Fixed Deposit Schedule:**
- List all fixed deposits: bank, principal, rate, maturity date, accrued interest
- **Calculator:** `clio calc fixed-deposit` for interest calculations

**Intercompany Balances (if applicable):**
- Receivables and payables with related parties
- Must be disclosed separately in financial statements

---

## Phase 9: Final Checks

### Step 15: Reconciliation checklist

Before handing the pack to the auditor, verify these tie:

| Account | Report | Should Match |
|---------|--------|-------------|
| Cash / Bank | Bank Recon Summary (Step 9) | Bank statements |
| Accounts Receivable | AR Aging (Step 7) | Trial balance AR line |
| Accounts Payable | AP Aging (Step 8) | Trial balance AP line |
| Fixed Assets (NBV) | FA Register (Step 11) | Trial balance FA lines |
| Revenue | P&L (Step 2) | GST return Box 1+2+3 totals |
| GST Receivable/Payable | Tax Ledger (Step 12) | Sum of quarterly GST returns |

### Step 16: Review for completeness

Run through this checklist:

- [ ] All bank accounts reconciled at year-end (zero unreconciled items or documented timing differences)
- [ ] All supplier statements reconciled for major suppliers
- [ ] Lock date set to year-end (prevents backdated entries during audit)
- [ ] No draft transactions in the period (search for status = DRAFT and resolve)
- [ ] Depreciation posted for all 12 months
- [ ] Accruals and prepayments up to date
- [ ] Intercompany balances agree with counterparty
- [ ] Related party transactions identified and documented

---

## Audit Prep Checklist (Quick Reference)

| # | Step | Phase | Report/Endpoint |
|---|------|-------|----------------|
| 1 | Trial Balance | Core | `POST /generate-reports/trial-balance` |
| 2 | P&L | Core | `POST /generate-reports/profit-and-loss` |
| 3 | Balance Sheet | Core | `POST /generate-reports/balance-sheet` |
| 4 | General Ledger | Ledgers | `POST /generate-reports/general-ledger` |
| 5 | Cashflow | Ledgers | `POST /generate-reports/cashflow` |
| 6 | Equity Movement | Ledgers | `POST /generate-reports/equity-movement` |
| 7 | AR Aging | Aging | `POST /generate-reports/ar-report` |
| 8 | AP Aging | Aging | `POST /generate-reports/ap-report` |
| 9 | Bank Recon Summary | Bank | `POST /generate-reports/bank-reconciliation-summary` |
| 10 | Bank Balance Summary | Bank | `POST /generate-reports/bank-balance-summary` |
| 11 | FA Register | Assets | `POST /generate-reports/fixed-assets-summary` |
| 12 | Tax Ledger | Tax | `POST /generate-reports/vat-ledger` |
| 13 | Data Exports | Export | `POST /data-exports/*` |
| 14 | Supporting schedules | Schedules | Manual from GL + calculators |
| 15 | Reconciliation checks | Final | Cross-reference all reports |
| 16 | Completeness review | Final | Checklist |

---

## Tips for SMBs

**Start early.** Don't wait for the auditor's request list. Generate the report pack in January for the prior year and have it ready before the engagement begins. A well-prepared client gets a faster, cheaper audit.

**The auditor will ask for bank confirmation letters.** These are letters from your bank confirming balances at year-end. Request them from your bank in early January — they can take 2-4 weeks to arrive.

**Keep a "passed adjustments" list.** If the auditor proposes adjustments you disagree with (within materiality), track them. Below-materiality items may accumulate — the auditor must consider cumulative effect.

**IRAS filing deadlines (SG):**
- Form C-S/C: November 30 of the following year (e.g., FY 2025 due Nov 30, 2026)
- ECI (Estimated Chargeable Income): Within 3 months of financial year-end
- GST F5: 1 month after each quarter-end

**Common audit queries you can pre-empt:**
- "Can you provide a schedule of revenue by customer?" → Run AR summary report
- "What are the top 10 expenses?" → Run P&L, sort expense lines
- "Are there any related party transactions?" → Tag them during the year, not at audit time
- "Can you explain the $X increase in expenses?" → Have month-by-month P&L ready for variance analysis
