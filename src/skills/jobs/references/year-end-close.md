# Year-End Close

The annual close builds on the quarterly close. It is quarter-end close repeated four times, plus a set of year-end-specific adjustments — true-ups, dividends, retained earnings rollover, final GST reconciliation, and audit preparation. For most SMBs, the annual extras add 2-5 days of work depending on complexity and whether an external audit is required.

**CLI:** `clio jobs year-end --period 2025 [--currency SGD] [--json]`

**Standalone vs Incremental:**
- **Standalone (default):** Generates the full plan — all quarterly close steps for each of the four quarters, followed by the annual extras. Use this when quarters haven't been closed yet.
- **Incremental (`--incremental`):** Generates only the annual extras below. Use this when all four quarters are already closed and locked.

---

## Phase 1–7: Quarterly Close (x4)

Complete the full quarter-end close for each quarter in the year. Each quarter follows the monthly close (x3) plus quarterly extras pattern.

**Reference:** `references/quarter-end-close.md`

| FY | Q1 | Q2 | Q3 | Q4 |
|----|----|----|----|----|
| Calendar year | Jan–Mar | Apr–Jun | Jul–Sep | Oct–Dec |

**Important:** Close quarters in order. Q1 must be locked before starting Q2, and so on. The annual extras run after Q4 is closed. By the time you reach this phase, all 12 months are individually closed, all four quarterly GST returns are filed, and all quarterly provisions are up to date.

---

## Phase 8: Annual Extras

These steps run once per year, after all four quarters are closed. They address items that are inherently annual — full-year depreciation reconciliation, true-ups against actuals, dividends, retained earnings rollover, and audit preparation.

### Step Y1: Final depreciation run

Verify the full year's depreciation is correctly recorded and reconciles to the fixed asset register.

**Recipe:** `declining-balance` | **Calculator:** `clio calc depreciation`

**Step-by-step:**

1. Pull the fixed asset register as at year-end:
```
POST /generate-reports/fixed-assets-summary
{}
```

2. For each asset class, verify that 12 months of depreciation have been recorded. If using Jaz native FA depreciation (straight-line), this should be automatic. If using manual journals for non-standard methods (DDB, 150DB), verify all 12 monthly entries exist.

3. Run the calculator for each non-standard asset to confirm the full-year charge:
```bash
clio calc depreciation --cost 50000 --salvage 5000 --life 5 --method ddb --frequency monthly --json
```

4. Reconcile accumulated depreciation per the FA register to accumulated depreciation per the trial balance:
```
POST /generate-reports/trial-balance
{ "startDate": "2025-01-01", "endDate": "2025-12-31" }
```

**What to check:**
- Depreciation expense on P&L = sum of all 12 monthly depreciation charges
- Accumulated depreciation on balance sheet = prior year balance + current year depreciation - accumulated depreciation on disposed assets
- FA register NBV (net book value) per asset ties to the balance sheet total
- No asset has been depreciated below its salvage value

**Conditional:** Always, if fixed assets exist. Even if depreciation runs automatically, verify it at year-end. Auditors will test this.

### Step Y2: Year-end true-ups

Reconcile accruals to actuals and post adjustments. Three components:

#### a) Leave balance true-up

Monthly closes accrued a fixed amount for leave liability. At year-end, reconcile to actual leave balances.

**Recipe:** `employee-accruals`

```
POST /journals
{
  "valueDate": "2025-12-31",
  "reference": "YE-LEAVE-TRUEUP-FY25",
  "journalEntries": [
    { "accountResourceId": "<leave-expense>", "amount": 3200.00, "type": "DEBIT", "name": "Leave accrual true-up — FY2025 (actual vs accrued)" },
    { "accountResourceId": "<leave-liability>", "amount": 3200.00, "type": "CREDIT", "name": "Leave accrual true-up — FY2025 (actual vs accrued)" }
  ]
}
```

**What to check:** Leave liability on balance sheet should equal (unused leave days x daily rate) for each employee. If accrual > actual, reverse the excess (DR Leave Liability, CR Leave Expense).

**Conditional:** Only if you track leave balances in the books. Most SMBs with 5+ employees should.

#### b) Bonus true-up

Quarterly closes maintained the bonus accrual estimate. At year-end, true up to actual bonus amounts declared.

**Recipe:** `employee-accruals` (bonus component)

```
POST /journals
{
  "valueDate": "2025-12-31",
  "reference": "YE-BONUS-TRUEUP-FY25",
  "journalEntries": [
    { "accountResourceId": "<bonus-expense>", "amount": 5000.00, "type": "DEBIT", "name": "Bonus true-up — FY2025 (actual declared vs accrued)" },
    { "accountResourceId": "<bonus-liability>", "amount": 5000.00, "type": "CREDIT", "name": "Bonus true-up — FY2025 (actual declared vs accrued)" }
  ]
}
```

**What to check:** Bonus liability on balance sheet = actual bonuses declared but not yet paid. If over-accrued, reverse the excess.

**Conditional:** Only if the business has bonus schemes.

#### c) Provision reassessment (IAS 37)

At year-end, reassess all provisions — not just unwind the discount, but review whether the provision amount itself is still the best estimate.

**Recipe:** `provisions`

**What to check for each provision:**
- Is the obligating event still valid? (If resolved, release the provision.)
- Has the best estimate changed? (Adjust up or down.)
- Has the discount rate changed? (Re-measure at current rate, post the difference.)
- Has the expected settlement date changed? (Adjust the unwinding schedule.)

Post adjustment journals for any changes. Document the reasoning — auditors will review provision assessments.

**Conditional:** Only if IAS 37 provisions exist. Most simple SMBs can skip this.

### Step Y3: Dividend declaration and payment

If the business is declaring dividends for the fiscal year, post two journals — one for declaration and one for payment. These are distinct accounting events.

**Recipe:** `dividend`

#### Declaration (board resolution date):

```
POST /journals
{
  "valueDate": "2025-12-31",
  "reference": "YE-DIV-DECLARE-FY25",
  "journalEntries": [
    { "accountResourceId": "<retained-earnings>", "amount": 50000.00, "type": "DEBIT", "name": "Dividend declared — FY2025" },
    { "accountResourceId": "<dividends-payable>", "amount": 50000.00, "type": "CREDIT", "name": "Dividend declared — FY2025" }
  ]
}
```

#### Payment (actual payment date):

```
POST /journals
{
  "valueDate": "2026-01-15",
  "reference": "YE-DIV-PAY-FY25",
  "journalEntries": [
    { "accountResourceId": "<dividends-payable>", "amount": 50000.00, "type": "DEBIT", "name": "Dividend paid — FY2025" },
    { "accountResourceId": "<bank-account>", "amount": 50000.00, "type": "CREDIT", "name": "Dividend paid — FY2025" }
  ]
}
```

**Note:** Declaration often falls in the current FY (e.g., Dec 31), but payment may fall in the next FY (e.g., Jan 15). The declaration journal reduces retained earnings in the current year. The payment journal just clears the liability — no P&L impact.

**For Singapore:** Dividends are tax-exempt in the hands of the shareholder (one-tier system). No withholding tax. No additional tax journal needed.

**For Philippines:** Dividends to resident individuals are subject to 10% final withholding tax. Post the withholding tax separately (DR Dividends Payable, CR Withholding Tax Payable) and remit to BIR.

**Conditional:** Only if the business is declaring dividends. Many SMBs retain all earnings. Skip if no dividend resolution.

### Step Y4: Retained earnings rollover (Current Year Earnings)

Jaz auto-manages the annual rollover of Current Year Earnings (CYE) into Retained Earnings at the start of each new fiscal year. The net P&L for the year is accumulated in CYE during the year, then rolled forward.

**What to verify:**

1. Pull the equity movement report:
```
POST /generate-reports/equity-movement
{ "primarySnapshotStartDate": "2025-01-01", "primarySnapshotEndDate": "2025-12-31" }
```

2. Confirm:
   - CYE balance at year-end = Net profit (or loss) for the year per P&L
   - Retained Earnings opening balance = prior year closing Retained Earnings
   - After rollover (in the new year): CYE resets to zero, Retained Earnings increases by last year's net profit (less any dividends declared)

**Tip:** If CYE doesn't match the P&L bottom line, there's a posting error somewhere — most likely a journal posted directly to an equity account that shouldn't have been.

**No journal needed** — this is a platform-managed rollover. Your job is to verify it happened correctly.

### Step Y5: Final GST/VAT reconciliation

Reconcile the full year's GST/VAT against all four quarterly returns (or twelve monthly returns for PH).

```
POST /generate-reports/vat-ledger
{ "startDate": "2025-01-01", "endDate": "2025-12-31" }
```

**What to check:**

1. Annual output tax per tax ledger = sum of output tax across all four quarterly returns
2. Annual input tax per tax ledger = sum of input tax across all four quarterly returns
3. Net GST paid/refunded during the year = sum of all quarterly GST payments/refunds
4. GST control account on trial balance = net GST payable/receivable for Q4 (if Q1–Q3 already settled)
5. No orphan transactions — every taxable invoice and bill is accounted for in the tax ledger

**For Singapore:** IRAS may request the Annual GST Return (GST F8) for certain businesses. The annual reconciliation feeds directly into this.

**For Philippines:** Cross-check annual totals against the Summary List of Sales (SLS) and Summary List of Purchases (SLP) required by BIR.

**Tip:** If the annual tax ledger total doesn't match the sum of quarterly returns, the most common causes are: (a) transactions entered after the quarterly filing with a backdated date, (b) credit notes or amendments posted in a later quarter, (c) reclassification of tax codes mid-year.

### Step Y6: Audit preparation

Compile all reports, reconciliation schedules, and supporting documentation for the external auditor or tax preparer.

**Reference:** `references/audit-prep.md` for the full audit preparation job.

At minimum, generate and export:

| Report | API Call |
|--------|----------|
| Trial Balance (full year) | `POST /generate-reports/trial-balance { "startDate": "2025-01-01", "endDate": "2025-12-31" }` |
| Balance Sheet (year-end) | `POST /generate-reports/balance-sheet { "primarySnapshotDate": "2025-12-31" }` |
| P&L (full year) | `POST /generate-reports/profit-and-loss { "primarySnapshotDate": "2025-12-31", "secondarySnapshotDate": "2025-01-01" }` |
| General Ledger (full year) | `POST /generate-reports/general-ledger { "startDate": "2025-01-01", "endDate": "2025-12-31", "groupBy": "ACCOUNT" }` |
| Cashflow Statement | `POST /generate-reports/cashflow { "primaryStartDate": "2025-01-01", "primaryEndDate": "2025-12-31" }` |
| AR Aging (year-end) | `POST /generate-reports/ar-report { "endDate": "2025-12-31" }` |
| AP Aging (year-end) | `POST /generate-reports/ap-report { "endDate": "2025-12-31" }` |
| FA Register | `POST /generate-reports/fixed-assets-summary {}` |
| Tax Ledger (full year) | `POST /generate-reports/vat-ledger { "startDate": "2025-01-01", "endDate": "2025-12-31" }` |
| Equity Movement | `POST /generate-reports/equity-movement { "primarySnapshotStartDate": "2025-01-01", "primarySnapshotEndDate": "2025-12-31" }` |

**Supporting schedules to prepare:**
- Bank reconciliation statements for each bank account at year-end
- ECL provision calculation workpaper (from Q4 Step Q2)
- Fixed asset movement schedule (additions, disposals, depreciation, NBV)
- Intercompany balance confirmation letters (if multi-entity)
- Loan amortization schedules with principal/interest split
- Provision schedules with movement analysis

**Conditional:** Always for audited entities. For non-audited SMBs, at minimum prepare TB + BS + P&L for tax filing purposes.

### Step Y7: Final lock date

Lock the entire fiscal year. This prevents any accidental or unauthorized entries into the closed year.

**Best practice:** Set the org lock date to the last day of the fiscal year (e.g., `2025-12-31`).

**Important considerations:**
- Confirm with the auditor that they have no remaining adjustments before locking. Many auditors request a "soft close" first, with the hard lock applied after audit adjustments are posted.
- If using an audit adjustments period (e.g., January 1–15 of the new year for audit entries), set the lock date after those entries are complete.
- Once locked, reopening requires admin action and should be documented.

---

## Phase 9: Annual Verification

Run the standard period verification (see `references/building-blocks.md` — Period Verification Pattern) for the full year, plus these annual-specific checks.

### Standard verification (full year)

```
POST /generate-reports/trial-balance
{ "startDate": "2025-01-01", "endDate": "2025-12-31" }
```

```
POST /generate-reports/profit-and-loss
{ "primarySnapshotDate": "2025-12-31", "secondarySnapshotDate": "2025-01-01" }
```

```
POST /generate-reports/balance-sheet
{ "primarySnapshotDate": "2025-12-31" }
```

### Annual-specific checks

**CYE rollover check:**
- Current Year Earnings at year-end = Net profit per the annual P&L
- After the new FY opens: CYE resets to zero, Retained Earnings increases by the prior year's net profit (less dividends)
- Total equity movement = Net profit - Dividends declared + Other equity movements (capital injection, etc.)

**Annual P&L vs monthly P&Ls sum:**
- Generate P&L for each of the 12 months individually
- Sum all 12 monthly net profit figures
- This sum MUST equal the annual P&L net profit
- If it doesn't, there's a timing/posting error — most commonly a journal posted to a month that was supposed to be locked

**FA register reconciliation:**
- NBV per FA register = Cost less accumulated depreciation per balance sheet
- Depreciation expense per FA register = Depreciation expense per P&L
- Asset count per FA register = physical count (if performed)
- Any fully depreciated assets still in use should be noted but not removed from register

**Provision balances:**
- Each provision on the balance sheet has documented support (IAS 37 criteria met)
- Provision movement = Opening + New provisions + Unwinding - Utilizations - Releases
- Unwinding total for the year = sum of four quarterly unwinding entries

**Intercompany elimination (if consolidating):**
- All intercompany balances net to zero across the group
- Intercompany revenue/expense eliminated on consolidation
- No intercompany profit in inventory or fixed assets (if applicable)

---

## Year-End Close Checklist (Quick Reference)

| # | Step | Phase | Conditional | Recipe/Calc |
|---|------|-------|-------------|-------------|
| 1–18 | Q1 Month 1 close | Monthly | Always | See month-end-close.md |
| 1–18 | Q1 Month 2 close | Monthly | Always | See month-end-close.md |
| 1–18 | Q1 Month 3 close | Monthly | Always | See month-end-close.md |
| Q1–Q5 | Q1 quarterly extras | Quarterly | See quarter-end-close.md | See quarter-end-close.md |
| 1–18 | Q2 Month 1 close | Monthly | Always | See month-end-close.md |
| 1–18 | Q2 Month 2 close | Monthly | Always | See month-end-close.md |
| 1–18 | Q2 Month 3 close | Monthly | Always | See month-end-close.md |
| Q1–Q5 | Q2 quarterly extras | Quarterly | See quarter-end-close.md | See quarter-end-close.md |
| 1–18 | Q3 Month 1 close | Monthly | Always | See month-end-close.md |
| 1–18 | Q3 Month 2 close | Monthly | Always | See month-end-close.md |
| 1–18 | Q3 Month 3 close | Monthly | Always | See month-end-close.md |
| Q1–Q5 | Q3 quarterly extras | Quarterly | See quarter-end-close.md | See quarter-end-close.md |
| 1–18 | Q4 Month 1 close | Monthly | Always | See month-end-close.md |
| 1–18 | Q4 Month 2 close | Monthly | Always | See month-end-close.md |
| 1–18 | Q4 Month 3 close | Monthly | Always | See month-end-close.md |
| Q1–Q5 | Q4 quarterly extras | Quarterly | See quarter-end-close.md | See quarter-end-close.md |
| Y1 | Final depreciation run | Annual | If fixed assets exist | declining-balance / `clio calc depreciation` |
| Y2a | Leave balance true-up | Annual | If tracking leave | employee-accruals |
| Y2b | Bonus true-up | Annual | If bonus schemes exist | employee-accruals |
| Y2c | Provision reassessment | Annual | If IAS 37 provisions exist | provisions |
| Y3 | Dividend declaration & payment | Annual | If declaring dividends | dividend |
| Y4 | Retained earnings rollover (CYE) | Annual | Always (verify only) | — |
| Y5 | Final GST/VAT reconciliation | Annual | Always (if GST-registered) | gst-vat-filing job |
| Y6 | Audit preparation | Annual | Always (scope varies) | audit-prep job |
| Y7 | Final lock date | Annual | Always | — |
| V | Annual verification | Verification | Always | — |
