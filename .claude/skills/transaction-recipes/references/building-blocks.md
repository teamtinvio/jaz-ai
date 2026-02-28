# Building Blocks

The Jaz features that transaction recipes combine to model complex, multi-period accounting scenarios.

---

## Capsules — Workflow Containers

Capsules group related transactions into a single logical unit for a specific accounting workflow. They are **not** a classification tool — they represent the full lifecycle of a business event.

**How capsules work in recipes:**
- Create one capsule per scenario instance (e.g., "FY2025 Office Insurance")
- Assign the initial transaction (bill, invoice, or journal) to the capsule
- Assign the scheduler (if any) to the same capsule — every entry it generates automatically lands in that capsule
- For manual journal recipes, assign each monthly journal to the capsule as you create it

**Capsule Types** are labels that categorize capsules. Create types that match your recipes:
- Prepaid Expenses
- Deferred Revenue
- Accrued Expenses
- Loan Repayment
- Lease Accounting (IFRS 16)
- Depreciation (Non-Standard)
- FX Revaluation
- ECL Provision
- Employee Benefits
- Provisions
- Dividends
- Intercompany
- Capital Projects

**Reporting:** Capsules are the **only enrichment that supports group-by** in the General Ledger. Grouping by capsule shows the complete lifecycle of a multi-step transaction in one view.

**API:** `POST /capsules`, `POST /capsuleTypes`, `POST /capsuleTypes/search`

---

## Schedulers — Recurring Entry Generators

Schedulers automate **fixed-amount** recurring transactions. A scheduler generates one entry per period (monthly, quarterly, annually) until its end date.

**Key limitation:** Scheduler amounts are **fixed** — every generated entry has the same amount. This makes schedulers perfect for:
- Prepaid amortization ($1,000/month for 12 months)
- Deferred revenue recognition ($2,000/month for 12 months)

But **not suitable** for:
- Loan interest (changes as principal balance reduces)
- IFRS 16 liability unwinding (interest component changes each period)
- Declining balance depreciation (amount changes as book value drops)

**Scheduler + capsule:** When a scheduler has a capsule assigned, every entry it generates is automatically created under that capsule. This is the automation sweet spot for fixed-amount recipes.

**Dynamic strings:** Scheduler descriptions support `{{YEAR}}`, `{{MONTH}}`, `{{MONTH_NAME}}` — e.g., "Insurance amortization — {{MONTH_NAME}} {{YEAR}}" produces "Insurance amortization — January 2025".

**API:** `POST /scheduled/journals` (manual journal scheduler), `POST /scheduled/invoices`, `POST /scheduled/bills`

---

## Manual Journals — Flexible Entries

Manual journals are multi-line debit/credit entries. Use them when amounts change each period or timing is irregular.

**In variable-amount recipes**, you record one journal per period with calculated amounts (from the amortization table or depreciation schedule). Each journal is assigned to the capsule manually.

**Requirements:** Minimum 2 lines, debits must equal credits. Journal descriptions should identify the period (e.g., "Loan payment — Month 3 of 60").

**API:** `POST /journals`

---

## Fixed Assets — Native Straight-Line Depreciation

Jaz has built-in fixed asset management with **straight-line depreciation only**. Register an asset and Jaz auto-posts monthly depreciation journal entries.

**Formula:** `(Cost - Salvage Value) / Useful Life in Months`

**Used in IFRS 16:** The ROU (right-of-use) asset is registered as a native fixed asset. Jaz handles its straight-line depreciation automatically — you only need manual journals for the liability unwinding side.

**Not suitable for:** Declining balance, units of production, sum-of-years-digits, or any non-straight-line method. Use manual journals instead.

**API:** `POST /fixed-assets`

---

## Enrichments — Metadata for Recipes

Apply enrichments to recipe transactions for richer reporting and record-keeping:

| Enrichment | Level | Recipe Use |
|---|---|---|
| **Tracking Tags** | Transaction | Tag all entries with scenario label (e.g., "Insurance", "Office Lease") |
| **Nano Classifiers** | Line item | Classify by department or cost center on each journal line |
| **Custom Fields** | Transaction | Record reference numbers (policy #, loan #, lease contract #) |

**Schedulers inherit tags and nano classifiers** — set them once on the scheduler and all generated entries get them automatically.

**Custom fields are not available on schedulers** — only on individual transactions.

---

## Accounts Required

Each recipe lists the specific CoA accounts needed. Common patterns:

| Account | Type | Subtype | Used In |
|---|---|---|---|
| Prepaid Expenses | Asset | Current Asset | Prepaid amortization |
| Deferred Revenue | Liability | Current Liability | Deferred revenue |
| Accrued Expenses | Liability | Current Liability | Accrued expenses |
| Loan Payable | Liability | Non-Current Liability | Bank loan |
| Loan Payable (Current) | Liability | Current Liability | Bank loan (current portion) |
| Interest Expense | Expense | Expense | Bank loan, IFRS 16 |
| Right-of-Use Asset | Asset | Non-Current Asset | IFRS 16 |
| Lease Liability | Liability | Non-Current Liability | IFRS 16 |
| Lease Liability (Current) | Liability | Current Liability | IFRS 16 |
| Accumulated Depreciation | Asset | Non-Current Asset | Declining balance, Capital WIP |
| Depreciation Expense | Expense | Expense | Declining balance, Capital WIP |
| FX Unrealized Gain | Revenue | Other Income | FX revaluation |
| FX Unrealized Loss | Expense | Other Expense | FX revaluation |
| Bad Debt Expense | Expense | Expense | ECL provision |
| Allowance for Doubtful Debts | Asset | Current Asset (contra) | ECL provision |
| Leave Expense | Expense | Expense | Employee accruals |
| Accrued Leave Liability | Liability | Current Liability | Employee accruals |
| Bonus Expense | Expense | Expense | Employee accruals |
| Accrued Bonus Liability | Liability | Current Liability | Employee accruals |
| Provision Expense | Expense | Expense | IAS 37 provisions |
| Provision for Obligations | Liability | Non-Current Liability | IAS 37 provisions |
| Finance Cost — Unwinding | Expense | Expense | IAS 37 provisions, Lease |
| Retained Earnings | Equity | Retained Earnings | Dividends |
| Dividends Payable | Liability | Current Liability | Dividends |
| Intercompany Receivable | Asset | Current Asset | Intercompany |
| Intercompany Payable | Liability | Current Liability | Intercompany |
| Capital Work-in-Progress | Asset | Non-Current Asset | Capital WIP |

**API:** `POST /chart-of-accounts` or `POST /chart-of-accounts/bulk-upsert`
