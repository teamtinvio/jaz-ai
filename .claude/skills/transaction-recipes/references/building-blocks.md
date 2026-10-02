# Building Blocks

The Jaz features that transaction recipes combine to model complex, multi-period accounting scenarios, and the three-step flow every recipe follows.

> **Nothing posts a recipe for you.** A calculator returns the numbers and the journal lines; you create the capsule and post each entry yourself with the ordinary transaction tools. No tool resolves accounts, creates a schedule or posts a whole recipe in one call.

## The three-step flow

Every calculator-backed recipe runs the same way:

1. **Calculate.** `calculate(type: <calculator type>, ...)` over MCP, or `clio calc <type> ... --json` on the CLI. Offline and read-only: it needs no account and posts nothing.
2. **Create the capsule.** `list_capsule_types` to find the type; if it is missing, `create_capsule_type(displayName: '<type>')`; then `create_capsule(capsuleTypeResourceId, title, description)`.
3. **Post each step** of the calculator's blueprint with the real transaction tools, each carrying `capsuleResourceId`: `create_journal`, `create_bill`, `create_invoice`, `create_cash_in`, `create_cash_out`. Fixed assets go through the fixed-asset tools.

CLI equivalents for step 2:

```bash
clio capsules types --json
clio capsules create-type --name "Loan Repayment" --json
clio capsules create --type <capsuleTypeResourceId> --title "Bank Loan, DBS Term Loan, LN-2025-0042" --json
```

### Reading the calculator result

Both surfaces return the same JSON:

- **Totals** at the top level (each recipe file names its own: `monthlyPayment`, `presentValue`, `perPeriodAmount`, ...).
- **`schedule[]`**: one row per period. Each row carries its own `journal: { description, lines: [{ account, debit, credit }] }`.
- **`blueprint`**: `{ capsuleType, capsuleName, capsuleDescription, tags, customFields, steps[] }`. Each step is `{ step, action, description, date, lines }`.

Three things to know before posting from it:

- **Dates.** Loan, lease, prepaid-expense, deferred-revenue, provision, fixed-deposit, accrued-expense and leave-accrual return `blueprint: null` unless you pass a start date. Depreciation and fx-reval never date their steps, and ECL dates its step only when `startDate` is passed (an MCP param; the CLI command has no such flag): date those entries yourself. Step dates run in whole periods from the start date. For loan, lease, prepaid-expense, deferred-revenue, provision and fixed-deposit the first periodic step falls one period AFTER the start date (start `2025-01-01` gives `2025-02-01`, `2025-03-01`, ...). For leave-accrual and accrued-expense the first step IS the start date (start `2025-01-31` gives `2025-01-31`, `2025-02-28`, ...). Pass a month-end start date to get month-end entries.
- **Account names are labels, not accounts.** Lines say `Cash / Bank Account`, `Prepaid Asset`, `Expense`, `Loan Payable`. Map each label to a real chart-of-accounts account with `search_accounts` (or `list_accounts`), and the bank label to a bank account from `list_bank_accounts`. If an account is missing, `create_account` after the practitioner confirms its classification. If two accounts fit, ask.
- **Rounding sits in the final period.** The last row absorbs the remainder so the balance closes to zero. Post the amounts as returned; do not recompute them.

### Blueprint action to tool

| Step `action` | Tool | How the lines map |
|---|---|---|
| `journal` | `create_journal` | `valueDate` = step date. One `journalEntries` row per line: `{ accountResourceId, type: 'DEBIT' \| 'CREDIT', amount, description }`. |
| `bill` | `create_bill` | One `lineItems` row per debit line, coded to that line's account. Needs `contactResourceId` and `dueDate`. The bank line is the payment: record it with `pay_bill` when the supplier is paid. |
| `invoice` | `create_invoice` | One `lineItems` row per credit line. Needs `contactResourceId` and `dueDate`. The bank line is the receipt: record it with `pay_invoice` when the customer pays. |
| `cash-in` | `create_cash_in` | `accountResourceId` = the bank account. `lines` = every other line as `{ accountResourceId, amount }`. No `type`: a cash-in credits every line. |
| `cash-out` | `create_cash_out` | Same shape. A cash-out debits every line. |
| `fixed-asset` | `create_fixed_asset` | An instruction, not a posting: register the asset against the purchase line (see the lease and capital WIP recipes). |
| `note` | `mark_fixed_asset_sold` or `discard_fixed_asset` | An instruction: update the fixed-asset register (see `asset-disposal.md`). |

A cash entry cannot carry lines on both sides. If a `cash-in` / `cash-out` step has a non-bank line on the same side as the bank line (the dividend payment net of withholding tax), post the net cash movement as the cash entry and move the remainder with a `create_journal` (see `dividend.md`).

```
create_journal(
  valueDate: '2025-02-01',
  reference: 'LN-2025-0042-01',
  journalEntries: [
    { accountResourceId: <Loan Payable>, type: 'DEBIT', amount: 1433.28 },
    { accountResourceId: <Interest Expense>, type: 'DEBIT', amount: 500.00 },
    { accountResourceId: <bank account>, type: 'CREDIT', amount: 1933.28 }
  ],
  saveAsDraft: true,
  capsuleResourceId: <capsule id>
)
```

### Drafts, future dates and references

- `create_journal`, `create_bill` and `create_invoice` save a DRAFT unless you pass `saveAsDraft: false`. Cash entries have no draft state: `create_cash_in` / `create_cash_out` post ACTIVE at once, so record a cash step when the money actually moves, not ahead of it.
- A future-dated journal can be posted now as a draft and finalized at its period close with `update_journal(resourceId: <id>, saveAsDraft: false)`, or posted at that close from the same calculator output (the calculators are deterministic: the same inputs return the same schedule). Either way, agree the approach with the practitioner and stay with it for the life of the capsule.
- **Give every entry a reference you can find again.** Journals cannot be filtered by capsule (`JournalFilter` declares no capsule field, and `get_capsule` returns only a `totalTransactions` count). Use `<facility or contract ref>-<period number>` and retrieve it with `search_journals(filter: {reference: {eq: 'LN-2025-0042-03'}})`. A date-plus-status search returns every matching DRAFT in the org, so it must never feed `bulk_update_journals` or `delete_journal`.
- **A step that fails leaves the earlier steps in the books.** Do not start again from step 1. Check what posted (`get_capsule(resourceId)` for the count, `search_journals` by reference), then continue from the failed step. `create_capsule` does not create a second capsule with a title that already exists: it returns the existing one, so the title is also the idempotency check.

### Same amount every period: one schedule instead of N journals

Where every period posts the same lines for the same amount (prepaid expense, deferred revenue, leave accrual, simple-interest deposit accrual), one `create_scheduled_journal` can replace the N dated journals:

```
create_scheduled_journal(
  startDate: '2025-02-01',
  endDate: '2026-01-01',
  repeat: 'MONTHLY',
  valueDate: '2025-02-01',
  reference: 'PREPAID-INS-2025',
  schedulerEntries: [
    { accountResourceId: <Insurance Expense>, type: 'DEBIT', amount: 1000, description: 'Insurance recognition: {{MONTH_NAME}} {{YEAR}}' },
    { accountResourceId: <Prepaid Insurance>, type: 'CREDIT', amount: 1000, description: 'Insurance recognition: {{MONTH_NAME}} {{YEAR}}' }
  ],
  capsuleResourceId: <capsule id>
)
```

With `capsuleResourceId` on the schedule, every journal it generates is created in the capsule.

Limits to check first:

- **The amount is fixed.** If the calculator's final period differs from the others (rounding), end the schedule one period early and post the final journal by hand.
- **`repeat` is ONE_TIME, DAILY, WEEKLY, MONTHLY or YEARLY.** There is no quarterly: post quarterly schedules as dated journals.

Never schedule a variable amount (loan interest, lease unwinding, declining-balance depreciation, provision unwinding).

## Recipe file to calculator type

Reference file names use accounting-textbook terminology. The calculator takes the short type name.

| Reference file | Calculator `type` |
|----------------------|------------------------|
| `prepaid-amortization` | `prepaid-expense` |
| `deferred-revenue` | `deferred-revenue` |
| `accrued-expenses` | `accrued-expense` |
| `bank-loan` | `loan` |
| `ifrs16-lease` | `lease` |
| `hire-purchase` | `lease` (with `usefulLifeMonths`, CLI `--useful-life`) |
| `declining-balance` | `depreciation` (with `method: 'ddb'` or `'150db'`) |
| `bad-debt-provision` | `ecl` |
| `fx-revaluation` | `fx-reval` (verification only: never post its result) |
| `provisions` | `provision` |
| `fixed-deposit` | `fixed-deposit` |
| `asset-disposal` | `asset-disposal` |
| `dividend` | `dividend` |
| `employee-accruals` | `leave-accrual` (leave) and `accrued-expense` (bonus) |
| `intercompany` | none: mirrored invoices / bills / journals across two orgs |
| `capital-wip` | none: bills and journals into a capsule, then fixed-asset registration |

---

## Capsules: the Jaz primitive for complex / multi-step transactions

Capsules group related transactions into one logical lifecycle unit. NOT a classification tag, NOT a tracking dimension; capsules are the workflow container that ties every entry of a multi-step business event to the same audit trail.

**Capsule = (capsule type, title, description, [bills, invoices, journals, cash entries])**

### Where capsules earn their place

Every recipe in this skill uses one. Capsules also carry complex transactions no calculator models, anywhere you need cross-period traceability, GL grouping, or auditor-friendly aggregation.

| Pattern | Why a capsule | Tools to build it |
|---------|---------------|-------------------|
| Multi-leg M&A transaction (acquisition price + escrow + adjustments) | Track the full deal across legal close + post-close adjustments + escrow release in one auditable unit | `create_capsule(capsuleTypeResourceId: <id of 'M&A' from list_capsule_types>, title)` + per-leg `create_journal` / `create_bill` / `create_cash_in` all assigned to the same capsule |
| Construction-in-progress (CWIP → FA), see `capital-wip.md` | Accumulate dozens of contractor bills + permits + materials across months; then transfer to FA on completion. Capsule = the audit trail for the project. | `create_capsule(capsuleTypeResourceId: <id of 'Capital Projects' from list_capsule_types>, title)` + bills per cost + transfer journal + FA registration |
| Intercompany lifecycle, see `intercompany.md` | Match invoices / bills across two orgs (and their settlements). One capsule per entity, both with matching reference. | `create_capsule(capsuleTypeResourceId: <id of 'Intercompany' from list_capsule_types>, title)` per entity |
| Multi-period contract revenue (deferred + variable consideration + reversals per IFRS 15) | The deferred-revenue calculator handles the ratable part; manual adjustments in the same capsule handle variable consideration + true-ups | `Deferred Revenue` capsule + the ratable journals + manual variable-consideration journals |
| Restructuring program (multiple severance, lease exits, write-offs over 6-18 months) | Tie the full program (provisions, asset disposals, severance accruals, settlement cash-outs) to one capsule for board / auditor reporting | `create_capsule(capsuleTypeResourceId: <id of 'Restructuring' from list_capsule_types>, title)` + provision entries + asset-disposal entries + manual severance journals |
| Insurance claim (loss event → claim filed → cash received → asset write-off / replacement) | Track the full claim lifecycle across multiple periods | `create_capsule(capsuleTypeResourceId: <id of 'Insurance Claim' from list_capsule_types>, title)` + asset-disposal entries + cash-in receipt + manual gain/loss journal |
| Litigation provision lifecycle (initial recognition → settlement negotiations → final payment or release) | IAS 37 provision + interim remeasurements + eventual settlement, all in one trail | `create_capsule(capsuleTypeResourceId: <id of 'Provisions' from list_capsule_types>, title)` + provision entries + manual remeasurement journals + settlement cash-out |
| Customer write-off campaign (specific impairment of a major debtor) | Group the customer's outstanding invoices + the credit notes that write them off + the resulting cash recovery (if any) | `create_capsule(capsuleTypeResourceId: <id of 'Bad Debt Write-off' from list_capsule_types>, title)` + customer credit notes + `apply_credits_to_invoice` + any later cash recovery |
| Foreign subsidiary investment lifecycle (subscription + dividends received + investment impairment + eventual disposal) | Long-running investment account with multiple economic events over years | `create_capsule(capsuleTypeResourceId: <id of 'Investments' from list_capsule_types>, title)` + journals per event |

### How to use capsules well

**Three rules:**

1. **One capsule per LIFECYCLE, not per period.** A 5-year loan = ONE capsule (not 12 per year). A construction project = ONE capsule (not one per contractor bill). The capsule's job is to span the full lifecycle.

2. **Use Capsule Types as the grouping axis, not the title.** Titles are unique per instance ("FY2025 Office Insurance"); types are reusable ("Prepaid Expenses"). Capsule type is not a search filter: `search_capsules(filter: {status: {eq: 'ACTIVE'}})` returns the active capsules, and you narrow on each row's `type` / `capsuleType.name` (see `jobs/references/building-blocks.md` § Filter limits).

3. **Tie capsule entries back for the auditor.** `generate_general_ledger(startDate, endDate, groupBy: 'CAPSULE')` groups the period's GL rows by capsule, so each capsule's full lifecycle reads as one block. Auditor sample-test: pick 3 capsules per type from that report and pull the underlying documents (bills, invoices, journals) by their resource ids.

**MCP tool shape:**

```
create_capsule(
  capsuleTypeResourceId: <type id from list_capsule_types>,
  title: 'Bank Loan, DBS Term Loan, LN-2025-0042, FY2025',
  description: 'SGD 100,000 5-year term loan, 6% p.a. Bank: DBS Bank. Facility ref: LN-2025-0042.'
)
```

`title` is required and must be non-empty. The calculator's `blueprint.capsuleName` and `blueprint.capsuleDescription` (the workings) are a ready-made title and description; add the contract or facility reference to the title so it is unique.

Then assign entries to it via `capsuleResourceId` on the create call:
```
create_journal(..., capsuleResourceId: <capsule id>)
create_bill(..., capsuleResourceId: <capsule id>)
create_invoice(..., capsuleResourceId: <capsule id>)
create_cash_in(..., capsuleResourceId: <capsule id>)
create_cash_out(..., capsuleResourceId: <capsule id>)
```

`move_transaction_capsules(businessTransactionResourceIds: [...], oldCapsuleResourceId: <from>, newCapsuleResourceId: <to>)` moves an entry from one capsule to another: it needs a source capsule, so it cannot pick up an entry that has none. An entry posted without a capsule gets one by updating it: `quick_fix_transactions(entity: <'invoices' | 'bills' | 'journals' | 'cash-entries' | ...>, resourceIds: [<entry id>], attributes: {capsuleResourceId: <capsule id>})` for one entry, or a Ledger Find & Fix preview (`preview_ledger_find_fix`, level `TRANSACTIONS`) when several entries need it.

**Search and audit patterns:**

```
search_capsules(filter: {status: {eq: 'ACTIVE'}})
  # All open capsules; narrow on the row's `type` / `capsuleType.name` (capsule type is not filterable)
generate_general_ledger(startDate, endDate, groupBy: 'CAPSULE')
  # GL rows grouped by capsule: the auditor's and the practitioner's view
```

Journals carry no capsule link you can filter on in either direction, so a capsule's journals cannot be selected by search. Find them by the references you gave them.

**Capsule lifecycle:**

- Created when the event starts (step 2 of the flow).
- ACTIVE while events accumulate.
- Closed when the lifecycle ends (loan paid off, lease term ends, project complete): a manual `update_capsule(resourceId: <id>, title: '<original> [CLOSED]')`. The API has no `status` field you can set on a capsule; closure is informational only.
- Closed capsules remain searchable + reportable; they're an auditor's friend.

### Undoing a capsule

- A capsule that holds any transaction cannot be deleted: `delete_capsule` answers 422 "capsule associated with transactions".
- Deleting a capsule's last transaction removes the capsule with it. To take down a mistaken setup, delete (or move) its transactions; the capsule goes when the last one does. Both verified 2026-10-02.

### Several calculators, one business event

A capsule is not tied to one calculator. For a business event that needs several, create ONE capsule first and post every calculator's steps into it:

```
# Restructuring program example:
1. create_capsule(capsuleTypeResourceId: <id of 'Restructuring' from list_capsule_types>, title: 'FY2025 Restructuring')
2. calculate(type: 'provision', ...)        # severance provision: post its steps with capsuleResourceId: <restructuring capsule>
3. calculate(type: 'asset-disposal', ...)   # office equipment write-off: post its journal with the same capsuleResourceId
4. create_journal(..., capsuleResourceId: <restructuring capsule>)  # lease termination penalty
```

All entries land in one capsule; auditor reviews the whole restructuring as one unit.

### When NOT to use a capsule

- Single-period one-shot entries (e.g., monthly utility bill); use a tag instead. Capsules are overkill.
- Operating expenses that aren't part of a multi-step event; tag for analysis, no capsule.
- Bank reconciliation: bank entries don't need capsules; they belong to specific transactions.

**Capsule overuse cost:** every capsule is a lifecycle to manage. Closing them is manual. Audit reports list them. Over-capsulizing pollutes the search namespace.

---

## Capsule types

**Capsule Types** are labels that categorize capsules. Each calculator names the type its recipe belongs under in `blueprint.capsuleType`. Use that string as the type's display name so capsules group consistently across the org:

- Accrued Expenses (`accrued-expense`)
- Asset Disposal (`asset-disposal`)
- Deferred Revenue (`deferred-revenue`)
- Depreciation (`depreciation`: covers SL, DDB, 150DB)
- Dividends (`dividend`)
- ECL Provision (`ecl`)
- Employee Benefits (`leave-accrual`)
- Fixed Deposit (`fixed-deposit`)
- FX Revaluation (`fx-reval`: verification only, nothing is posted, so no capsule is created)
- Hire Purchase (`lease` with a useful life: `usefulLifeMonths`, CLI `--useful-life`)
- Lease Accounting (`lease`, IFRS 16)
- Loan Repayment (`loan`)
- Prepaid Expenses (`prepaid-expense`)
- Provisions (`provision`)

No calculator (create the type yourself):
- Intercompany
- Capital Projects

> **Naming drift to watch for:** the file `accrued-expenses.md` (plural) covers the calculator type `accrued-expense` (singular), whose capsule type is `Accrued Expenses` (plural).

**Reporting:** Capsules are the **only enrichment that supports group-by** in the General Ledger. Grouping by capsule shows the complete lifecycle of a multi-step transaction in one view.

**API:** `POST /capsules`, `POST /capsuleTypes`, `POST /capsuleTypes/search`

---

## Schedulers: Recurring Entry Generators

Schedulers automate **fixed-amount** recurring transactions. A scheduler generates one entry per occurrence (daily, weekly, monthly or yearly) until its end date.

**Key limitation:** Scheduler amounts are **fixed**: every generated entry has the same amount. This makes schedulers perfect for:
- Prepaid amortization ($1,000/month for 12 months)
- Deferred revenue recognition ($2,000/month for 12 months)

But **not suitable** for:
- Loan interest (changes as principal balance reduces)
- IFRS 16 liability unwinding (interest component changes each period)
- Declining balance depreciation (amount changes as book value drops)

**Scheduler + capsule:** When a scheduler has a capsule assigned, every entry it generates is created under that capsule. Pass `capsuleResourceId` on `create_scheduled_journal` (see "Same amount every period" above).

**Dynamic strings:** Scheduler descriptions support `{{YEAR}}`, `{{MONTH}}`, `{{MONTH_NAME}}`, e.g., "Insurance amortization: {{MONTH_NAME}} {{YEAR}}" produces "Insurance amortization: January 2025".

**Tools:** `create_scheduled_journal`, `create_scheduled_invoice`, `create_scheduled_bill`.

**API:** `POST /scheduled/journals` (manual journal scheduler), `POST /scheduled/invoices`, `POST /scheduled/bills`

---

## Manual Journals: Flexible Entries

Manual journals are multi-line debit/credit entries. Use them when amounts change each period or timing is irregular.

**In variable-amount recipes**, you record one journal per period with the calculated amounts (from the amortization table or depreciation schedule), each carrying the capsule's `capsuleResourceId`.

**Requirements:** Minimum 2 lines, debits must equal credits. Journal descriptions should identify the period (e.g., "Loan payment — Month 3 of 60").

**API:** `POST /journals`

---

## Fixed Assets: Native Straight-Line Depreciation

Jaz has built-in fixed asset management with **straight-line depreciation only**. Register an asset and Jaz auto-posts monthly depreciation journal entries.

**Formula:** `(Cost - Salvage Value) / Useful Life in Months`

**Used in IFRS 16:** The ROU (right-of-use) asset is registered as a native fixed asset. Jaz handles its straight-line depreciation automatically; you only need manual journals for the liability unwinding side.

**Not suitable for:** Declining balance, units of production, sum-of-years-digits, or any non-straight-line method. Use manual journals instead.

**Tools:** `create_fixed_asset` (linked to a purchase line), `transfer_fixed_asset` (already-owned asset, no purchase line), `mark_fixed_asset_sold`, `discard_fixed_asset`.

**API:** `POST /fixed-assets`

---

## Enrichments: Metadata for Recipes

Apply enrichments to recipe transactions for richer reporting and record-keeping:

| Enrichment | Level | Recipe Use |
|---|---|---|
| **Tracking Tags** | Transaction | Tag all entries with scenario label (e.g., "Insurance", "Office Lease") |
| **Nano Classifiers** | Line item | Classify by department or cost center on each journal line |
| **Custom Fields** | Transaction | Record reference numbers (policy #, loan #, lease contract #) |

The calculator's `blueprint.tags` and `blueprint.customFields` suggest a tag and the reference fields worth recording for each recipe. They are suggestions: apply them yourself on each create call.

**Schedulers inherit tags and nano classifiers**: set them once on the scheduler and all generated entries get them automatically.

**Custom fields are not available on schedulers**, only on individual transactions.

### Nano Classifiers: How to Use

1. **Create the classifier with its classes**: `clio nano-classifiers create --type "Department" --classes Engineering,Sales` → get its `resourceId` (MCP: `create_nano_classifier(type, classes)`).
2. **Add classes later** with `clio nano-classifiers update <resourceId> --classes Finance`.
3. **Apply to line items**: Add `classifierConfig` array to each line item on create/update:
   ```json
   {
     "classifierConfig": [{
       "resourceId": "<classifierResourceId>",
       "type": "invoice",
       "selectedClasses": [{ "className": "Engineering", "resourceId": "<classResourceId>" }],
       "printable": true
     }]
   }
   ```
4. **Supported transaction types**: invoices, bills, credit notes, journals, cash entries
5. **Reports**: `generate_general_ledger` groups by ACCOUNT, CONTACT, TRANSACTION, RELATIONSHIP or CAPSULE.

---

## Accounts Required

Each recipe lists the specific CoA accounts needed. Common patterns:

| Account | Type | Subtype | Used In |
|---|---|---|---|
| Prepaid Expenses | Asset | Current Asset | Prepaid amortization |
| Deferred Revenue | Liability | Current Liability | Deferred revenue |
| Accrued Expenses | Liability | Current Liability | Accrued expenses |
| Loan Payable | Liability | Non-current Liability | Bank loan |
| Loan Payable (Current) | Liability | Current Liability | Bank loan (current portion) |
| Interest Expense | Expense | Expense | Bank loan, IFRS 16 |
| Right-of-Use Asset | Asset | Non-current Asset | IFRS 16 |
| Lease Liability | Liability | Non-current Liability | IFRS 16 |
| Lease Liability (Current) | Liability | Current Liability | IFRS 16 |
| Accumulated Depreciation | Asset | Non-current Asset | Declining balance, Capital WIP |
| Depreciation Expense | Expense | Expense | Declining balance, Capital WIP |
| FX Unrealized Gain | Revenue | Other Revenue | FX revaluation |
| FX Unrealized Loss | Expense | Other Expense | FX revaluation |
| Bad Debt Expense | Expense | Expense | ECL provision |
| Allowance for Doubtful Debts | Asset | Current Asset (contra) | ECL provision |
| Leave Expense | Expense | Expense | Employee accruals |
| Accrued Leave Liability | Liability | Current Liability | Employee accruals |
| Bonus Expense | Expense | Expense | Employee accruals |
| Accrued Bonus Liability | Liability | Current Liability | Employee accruals |
| Provision Expense | Expense | Expense | IAS 37 provisions |
| Provision for Obligations | Liability | Non-current Liability | IAS 37 provisions |
| Finance Cost — Unwinding | Expense | Expense | IAS 37 provisions, Lease |
| Retained Earnings | Equity | Retained Earnings | Dividends |
| Dividends Payable | Liability | Current Liability | Dividends |
| Intercompany Receivable | Asset | Current Asset | Intercompany |
| Intercompany Payable | Liability | Current Liability | Intercompany |
| Capital Work-in-Progress | Asset | Non-current Asset | Capital WIP |

**API:** `POST /chart-of-accounts` or `POST /chart-of-accounts/bulk-upsert`
