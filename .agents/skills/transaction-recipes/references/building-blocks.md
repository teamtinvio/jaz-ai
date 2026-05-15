# Building Blocks

The Jaz features that transaction recipes combine to model complex, multi-period accounting scenarios.

> **Always anchor on the recipe engine first.** Before reading any specific recipe, the canonical entry point is `plan_recipe(recipe: <canonical>, ...)` followed by `execute_recipe(...)`. The engine emits the capsules, schedulers, journals, and bills described below — agents should NOT hand-construct them. The sections below explain the building blocks the engine produces, not a manual construction guide.

## Recipe-name aliases (file-name vs engine-name)

Reference file names use accounting-textbook terminology (`prepaid-amortization`, `bank-loan`, `bad-debt-provision`). The recipe engine uses canonical short names. Always pass the canonical name to `plan_recipe(recipe: ...)` — file-name aliases will return `422 unsupported_recipe`.

| File / textbook name | Canonical engine name |
|----------------------|------------------------|
| `prepaid-amortization` | `prepaid-expense` |
| `deferred-revenue` | `deferred-revenue` |
| `accrued-expenses` | `accrued-expense` |
| `bank-loan` | `loan` |
| `ifrs16-lease` | `lease` |
| `hire-purchase` | `lease` (with `useful-life-months` set) |
| `declining-balance` | `depreciation` (with `method: 'ddb'` or `'150db'`) |
| `bad-debt-provision` | `ecl` |
| `fx-revaluation` | `fx-reval` |
| `provisions` | `provision` |
| `fixed-deposit` | `fixed-deposit` |
| `asset-disposal` | `asset-disposal` |
| `dividend` | `dividend` |
| `employee-accruals` (annual leave / 13th month) | `leave-accrual` |
| `intercompany` | (no engine — manual journals via `create_journal`; pair invoices/bills across two orgs) |
| `capital-wip` | (no engine — manual capsule + capital-asset journal pattern) |

**13 recipes are engine-managed.** 2 are manual patterns (intercompany + capital-wip) — they share the capsule + scheduler primitives below but emit journals via `create_journal` directly.

---

## Capsules — the Jaz primitive for complex / multi-step transactions

Capsules group related transactions into one logical lifecycle unit. NOT a classification tag, NOT a tracking dimension — capsules are the workflow container that ties every entry of a multi-step business event to the same audit trail. They unlock advanced patterns the recipe engine can't model on its own.

**Capsule = (capsuleType, capsuleName, [bills, invoices, journals, cash entries], custom fields, lifecycle status)**

### Where capsules earn their place

The recipe engine uses capsules automatically. But capsules also enable advanced/complex transactions OUTSIDE the engine — anywhere you need cross-period traceability, GL grouping, or auditor-friendly aggregation.

**Advanced patterns that need capsules (no engine handles them):**

| Pattern | Why a capsule | Tools to build it |
|---------|---------------|-------------------|
| Multi-leg M&A transaction (acquisition price + escrow + adjustments) | Track the full deal across legal close + post-close adjustments + escrow release in one auditable unit | `create_capsule(capsuleType: 'M&A')` + per-leg `create_journal` / `create_bill` / `create_cash_in` all assigned to the same capsule |
| Construction-in-progress (CWIP → FA) — see `capital-wip.md` | Accumulate dozens of contractor bills + permits + materials across months; then transfer to FA on completion. Capsule = the audit trail for the project. | `create_capsule(capsuleType: 'Capital Projects')` + bills per cost + transfer journal + FA registration |
| Intercompany lifecycle — see `intercompany.md` | Match invoices / bills across two orgs (and their settlements). One capsule per entity, both with matching reference. | `create_capsule(capsuleType: 'Intercompany')` per entity |
| Multi-period contract revenue (deferred + variable consideration + reversals per IFRS 15) | Recipe engine handles ratable; capsule + manual adjustments handle variable consideration + true-ups | `Deferred Revenue` capsule + recipe + manual variable-consideration journals |
| Restructuring program (multiple severance, lease exits, write-offs over 6-18 months) | Tie the full program — provisions, asset disposals, severance accruals, settlement cash-outs — to one capsule for board / auditor reporting | `create_capsule(capsuleType: 'Restructuring')` + provisions recipe + asset-disposal recipe + manual severance journals |
| Insurance claim (loss event → claim filed → cash received → asset write-off / replacement) | Track the full claim lifecycle across multiple periods | `create_capsule(capsuleType: 'Insurance Claim')` + asset-disposal recipe + cash-in receipt + manual gain/loss journal |
| Litigation provision lifecycle (initial recognition → settlement negotiations → final payment or release) | IAS 37 provision + interim remeasurements + eventual settlement — all in one trail | `create_capsule(capsuleType: 'Provisions')` + provision recipe + manual remeasurement journals + settlement cash-out |
| Customer write-off campaign (specific impairment of a major debtor) | Group the customer's outstanding invoices + the credit notes that write them off + the resulting cash recovery (if any) | `create_capsule(capsuleType: 'Bad Debt Write-off')` + customer credit notes + apply_credit_to_invoice + any later cash recovery |
| Foreign subsidiary investment lifecycle (subscription + dividends received + investment impairment + eventual disposal) | Long-running investment account with multiple economic events over years | `create_capsule(capsuleType: 'Investments')` + journals per event |

### How to use capsules well

**Three rules:**

1. **One capsule per LIFECYCLE, not per period.** A 5-year loan = ONE capsule (not 12 per year). A construction project = ONE capsule (not one per contractor bill). The capsule's job is to span the full lifecycle.

2. **Use Capsule Types as the search axis, not Capsule Name.** Capsule names are unique per instance ("FY2025 Office Insurance"); types are reusable ("Prepaid Expenses"). `search_capsules(filter: {capsuleType: {eq: 'Prepaid Expenses'}})` returns ALL prepaid capsules across history.

3. **Group GL by capsule for the auditor.** Capsules are the ONLY enrichment that supports `groupBy: 'CAPSULE'` in `generate_general_ledger`. Auditor sample-test: pick 3 capsules per type, pull the full GL by capsule, tie the entries back to the source documents (bills, invoices, journals). This is the highest-leverage capsule use.

**MCP tool shape:**

```
create_capsule(
  capsuleTypeResourceId: <type id from search_capsule_types>,
  title: 'Bank Loan — DBS Term Loan — FY2025',
  description: 'SGD 100,000 5-year term loan, 6% p.a., facility ref LN-2025-0042',
  customFields: { 'Loan Reference': 'LN-2025-0042', 'Bank Name': 'DBS Bank' }
)
```

Then assign entries to it via `capsuleResourceId` on the create call:
```
create_journal(..., capsuleResourceId: <capsule id>)
create_bill(..., capsuleResourceId: <capsule id>)
create_invoice(..., capsuleResourceId: <capsule id>)
create_cash_in_entry(..., capsuleResourceId: <capsule id>)
create_cash_out_entry(..., capsuleResourceId: <capsule id>)
```

**Search and audit patterns:**

```
search_capsules(filter: {capsuleType: {eq: 'Loan Repayment'}}, status: {eq: 'ACTIVE'}})
  # All open loan capsules — feed into year-end-close.md Y6 reclassification
search_journals(filter: {capsuleResourceId: {eq: <id>}}, sort: 'valueDate:asc')
  # Full GL for one capsule — the auditor's view
generate_general_ledger(period_start, period_end, groupBy: 'CAPSULE')
  # Period activity grouped by capsule — the practitioner's view
```

**Capsule lifecycle:**

- Created on first use (recipe `execute_recipe` or manual `create_capsule`).
- ACTIVE while events accumulate.
- CLOSED when the lifecycle ends (loan paid off, lease term ends, project complete). a manual `update_capsule(title: '<original> [CLOSED]')` (the API has no `status` field for capsules — closure is informational only).
- Closed capsules remain searchable + reportable; they're an auditor's friend.

### Recipe-engine capsules vs manually-created capsules

The recipe engine creates ONE capsule per `execute_recipe` call. For complex transactions where you need MULTIPLE recipes against ONE business event, create the capsule manually FIRST, then pass `capsuleResourceId` into each recipe + manual entry:

```
# Restructuring program example:
1. create_capsule(capsuleType: 'Restructuring', title: 'FY2025 Restructuring')
2. plan_recipe(recipe: 'provision', ..., capsuleResourceId: <restructuring capsule>)  # severance provision
3. plan_recipe(recipe: 'asset-disposal', ..., capsuleResourceId: <restructuring capsule>)  # office equipment write-off
4. create_journal(..., capsuleResourceId: <restructuring capsule>)  # lease termination penalty
```

All entries land in one capsule; auditor reviews the whole restructuring as one unit.

### When NOT to use a capsule

- Single-period one-shot entries (e.g.}, monthly utility bill) — use a tag instead. Capsules are overkill.
- Operating expenses that aren't part of a multi-step event — tag for analysis, no capsule.
- Bank reconciliation — bank entries don't need capsules; they belong to specific transactions.

**Capsule overuse cost:** every capsule is a lifecycle to manage. Closing them is manual. Audit reports list them. Over-capsulizing pollutes the search namespace.

---

## How recipes use capsules (engine pattern)

The recipe engine creates one capsule per `execute_recipe` call. The pattern:
- Capsule type comes from `capsuleType` in the recipe input
- Capsule title = `<capsuleName>` + `(<startDate>)` for collision avoidance on repeat runs
- All bill / invoice / journal / cash entries the recipe creates get the new capsule's resourceId
- Manual journal recipes (intercompany, capital-wip) follow the same pattern but you create the capsule + assign journals manually

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

### Nano Classifiers — How to Use

1. **Create a capsule type**: `clio capsules create --name "Department"` → get `resourceId`
2. **Add classes to the capsule type** via the UI (API for class management is limited)
3. **Apply to line items**: Add `classifierConfig` array to each line item on create/update:
   ```json
   {
     "classifierConfig": [{
       "resourceId": "<capsuleTypeResourceId>",
       "type": "invoice",
       "selectedClasses": [{ "className": "Engineering", "resourceId": "<classResourceId>" }],
       "printable": true
     }]
   }
   ```
4. **Supported transaction types**: invoices, bills, credit notes, journals, cash entries
5. **Reports**: Classified transactions appear in General Ledger grouped by capsule when using `groupBy: "CAPSULE"`

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
