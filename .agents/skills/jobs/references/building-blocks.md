# Building Blocks for Accounting Jobs

Shared concepts that all jobs rely on. Read this first.

---

## Accounting Periods

Jaz uses a **financial year** (FY) that may not match the calendar year. The org's FY start date determines period boundaries.

**Period formats used in jobs:**
- Month: `YYYY-MM` (e.g., `2025-01` = January 2025)
- Quarter: `YYYY-QN` (e.g., `2025-Q1` = Jan–Mar 2025 for calendar-year orgs)
- Year: `YYYY` (e.g., `2025` = full FY 2025)

**Period boundaries matter for:**
- Search filters (`valueDate between`) — determines which transactions are "in period"
- Report snapshots (`startDate`, `endDate`, `primarySnapshotDate`) — determines what the reports cover
- Lock dates — determines what can no longer be edited

---

## Lock Dates

Lock dates prevent backdated entries. Two levels:

| Level | What it locks | When to set |
|-------|--------------|-------------|
| **Org-wide** | All transactions before this date | After month/quarter/year-end close |
| **Per-account** | Specific CoA account locked before date | For bank accounts after recon, or controlled accounts |

**Setting lock dates via API:**
- Org lock date: managed through organization settings
- Per-account lock date: `lockDate` field on CoA account

**Best practice for SMBs:**
- Set org lock date after completing each month-end close
- Move it forward each month: Jan close → lock to 2025-01-31, Feb close → lock to 2025-02-28
- Only move lock date forward, never backward (unless correcting errors — requires admin)

---

## Period Verification Pattern

Every job ends with a verification phase. The universal pattern:

### 1. Trial Balance Check
```
POST /generate-reports/trial-balance
{ "startDate": "YYYY-MM-01", "endDate": "YYYY-MM-DD" }
```
- Total debits MUST equal total credits
- No unexpected account balances (e.g., negative cash, negative inventory)
- Compare to prior period — flag significant variances

### 2. P&L Review
```
POST /generate-reports/profit-and-loss
{ "primarySnapshotDate": "YYYY-MM-DD", "secondarySnapshotDate": "YYYY-MM-01" }
```
- Revenue and expense trends should make sense
- One-off entries (accruals, adjustments) should be explainable

### 3. Balance Sheet Review
```
POST /generate-reports/balance-sheet
{ "primarySnapshotDate": "YYYY-MM-DD" }
```
- Assets = Liabilities + Equity (always, by definition)
- Bank balances match bank statements
- AR/AP aging ties to balance sheet control accounts

### 4. Bank Balance Reconciliation
```
POST /generate-reports/bank-balance-summary
{ "primarySnapshotDate": "YYYY-MM-DD" }
```
- Book balance per Jaz should match bank statement closing balance
- Differences = timing items (outstanding cheques, deposits in transit)

---

## Scheduler Verification

Many month-end steps are automated via schedulers. Before closing, verify:

1. **Schedulers fired** — Check that recurring journals were created for the period
   - `POST /journals/search` with capsule filter + valueDate in period
2. **Amounts correct** — Fixed schedulers should produce consistent amounts
3. **No duplicates** — If you manually posted a journal AND the scheduler fired, you'll double-count

**Common issue for SMBs:** Scheduler was set up mid-period or end date already passed. Always check before assuming automation handled it.

---

## Capsule Conventions for Jobs

Jobs reference capsules from transaction recipes. Standard capsule types:

| Capsule Type | Used By |
|-------------|---------|
| Prepaid Expenses | Prepaid amortization steps |
| Deferred Revenue | Revenue recognition steps |
| Accrued Expenses | Accrued expense steps |
| Loan Repayment | Loan interest accrual steps |
| Lease Accounting | IFRS 16 lease steps |
| Depreciation | Non-standard depreciation steps |
| FX Revaluation | Period-end FX revaluation |
| ECL Provision | Bad debt provision steps |
| Employee Benefits | Leave and bonus accrual steps |

**Verification shortcut:** Group the General Ledger by capsule to see the complete lifecycle of each multi-step workflow in one view.

---

## Report API Quick Reference

Jobs frequently generate reports. The key endpoints and their required fields:

| Report | Endpoint | Required Fields |
|--------|----------|----------------|
| Trial Balance | `POST /generate-reports/trial-balance` | `startDate`, `endDate` |
| P&L | `POST /generate-reports/profit-and-loss` | `primarySnapshotDate`, `secondarySnapshotDate` |
| Balance Sheet | `POST /generate-reports/balance-sheet` | `primarySnapshotDate` |
| General Ledger | `POST /generate-reports/general-ledger` | `startDate`, `endDate`, `groupBy: "ACCOUNT"` |
| AR Aging | `POST /generate-reports/ar-report` | `endDate` |
| AP Aging | `POST /generate-reports/ap-report` | `endDate` |
| Cash Balance | `POST /generate-reports/cash-balance` | `reportDate` |
| Cashflow | `POST /generate-reports/cashflow` | `primaryStartDate`, `primaryEndDate` |
| Bank Balance | `POST /generate-reports/bank-balance-summary` | `primarySnapshotDate` |
| Tax Ledger | `POST /generate-reports/vat-ledger` | `startDate`, `endDate` |
| FA Register | `POST /generate-reports/fixed-assets-summary` | (check endpoint) |
| Equity Movement | `POST /generate-reports/equity-movement` | `primarySnapshotStartDate`, `primarySnapshotEndDate` |

**Data exports** (Excel/CSV) use `/data-exports/` with the same report names but simpler field names (e.g., P&L export uses `startDate`/`endDate` instead of snapshot dates).
