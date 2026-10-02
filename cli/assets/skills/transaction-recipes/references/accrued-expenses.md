# Recipe: Accrued Expenses (calculator type: `accrued-expense`)

> Canonical recipe for month-end expense accruals (utilities, professional fees, cleaning, employee bonuses), incurred but not yet billed. Each period is a pair of journals: the accrual at period-end and its reversal in the next period, all in one capsule. You calculate, create the capsule and post each journal yourself (see `building-blocks.md` § The three-step flow).

## Tools and calculator this recipe uses

### Calculator (offline, posts nothing)
- **MCP: `calculate(type: 'accrued-expense', amount, periods, frequency, startDate, currency)`** (step 1).
- **CLI: `clio calc accrued-expense --amount <per-period> --periods <n> --start-date <YYYY-MM-DD> --currency <code> --json`** (step 1): the same result.

### Posting tools
- **`list_capsule_types` / `create_capsule_type(displayName: 'Accrued Expenses')` / `create_capsule(...)`** (step 3).
- **`create_journal(...)`** (step 4): one per accrual and one per reversal, each with `capsuleResourceId`.

### Lookup and verification tools
- **`search_journals(filter: {tags: {eq: <accrual tag>}, valueDate: {between: [<-3 months>, <today>]}})`** (step 1 estimation): pull the posted accrual amounts for the prior month or the trailing three months.
- **`search_contacts(filter: {name: {eq: <vendor>}})`** (step 2): resolve the accrual's vendor for the journal narrative.
- **`search_accounts(filter: {name: {in: ['<expense GL>', '<accrued liability GL>']}})`** (step 2): confirm both sides of the journal exist in the CoA.
- **`update_journal(resourceId: <id>, saveAsDraft: false)`** (step 5): finalize a draft accrual or reversal.
- **`generate_trial_balance(endDate: <date>)`** (step 5 verification): confirm the Accrued Expenses balance and net P&L impact.

### Cross-references
- Operational context: invoked during month-end close, once per recurring accrual whose last-posted period precedes the current period end. The close loop supplies the estimation method, GL account, vendor, and fixed/budget amount for each accrual.
- Sibling recipes: `prepaid-amortization.md` (mirror: paid upfront, recognized over time vs incurred over time, billed later); `employee-accruals.md` (bonus accruals use this same calculator; leave uses `leave-accrual`, monthly-only with no reversal, since leave accumulates).
- IFRS / accounting context: matching principle (IFRS Conceptual Framework). The reversal pattern eliminates double-counting when the actual bill arrives.

---

## Step-by-step

### Step 1: Compute the per-period amount and calculate

Per the accrual's estimation method:

- **`prior_month`**: pull last period's posted amount via `search_journals` on the accrual's tag and the prior period's dates. Use that amount.
- **`trailing_3m_avg`**: pull last 3 months' posted amounts and average.
- **`budget`**: use the accrual's budget amount.
- **`fixed_amount`**: use the accrual's fixed amount directly.

Then run the calculator:

```
calculate(
  type: 'accrued-expense',
  amount: 3000,
  periods: 1,
  startDate: '2025-01-31',
  currency: 'SGD'
)
```

```
clio calc accrued-expense --amount 3000 --periods 1 --start-date 2025-01-31 --currency SGD --json
```

Returns `{ totalAccruals: 3000, schedule: [{ period, accrualDate: '2025-01-31', reversalDate: '2025-02-28', amount: 3000, accrualJournal, reversalJournal }], blueprint }`. For a single-period accrual, `periods: 1`. For a multi-period rolling accrual (e.g. quarterly bill arriving in month 3), use `periods: 3`.

`blueprint.steps` (2 journals for `periods: 1`; 6 for `periods: 3`):
- Step 1, `journal`, dated `2025-01-31`: Dr Expense Account 3,000 / Cr Accrued Liability 3,000.
- Step 2, `journal`, dated `2025-02-28`: Dr Accrued Liability 3,000 / Cr Expense Account 3,000.

The calculator dates each reversal one period after its accrual. If the entity reverses on day 1 of the next period (the usual convention), post the reversal with `valueDate: '2025-02-01'` instead: both dates fall in the next period, so the monthly P&L is the same.

### Step 2: Resolve accounts

The blueprint's `Expense Account` and `Accrued Liability` are labels. Map each to the real account:
- `search_accounts(filter: {name: {in: ['<expense GL>', 'Accrued Expenses']}})`. If one is missing: halt and surface "Accrual needs GL account `<accountName>`, which is not in the Jaz CoA. Create via `create_account` (suggested classifications: expense → `Operating Expense`; accrued liability → `Current Liability`) or remap the account."

Vendor: confirm via `search_contacts(filter: {name: {eq: <vendor>}})` for the journal narrative. The accrual itself needs no contact (no AR/AP document).

### Step 3: Create the capsule

```
list_capsule_types()
create_capsule(
  capsuleTypeResourceId: <id of 'Accrued Expenses'>,
  title: 'Utilities Accrual, PowerCo, FY2025',
  description: <blueprint.capsuleDescription>
)
```

If `Accrued Expenses` is not in the list: `create_capsule_type(displayName: 'Accrued Expenses')` first. A recurring accrual keeps ONE capsule: later periods post into the same one.

### Step 4: Post the journals

```
create_journal(
  valueDate: '2025-01-31',
  reference: 'ACCR-POWERCO-2025-01',
  journalEntries: [
    { accountResourceId: <expense GL>, type: 'DEBIT', amount: 3000, description: 'Accrued utilities: Jan 2025' },
    { accountResourceId: <Accrued Expenses>, type: 'CREDIT', amount: 3000, description: 'Accrued utilities: Jan 2025' }
  ],
  saveAsDraft: false,
  capsuleResourceId: <capsule id>
)
create_journal(
  valueDate: '2025-02-01',
  reference: 'ACCR-POWERCO-2025-01-REV',
  journalEntries: [
    { accountResourceId: <Accrued Expenses>, type: 'DEBIT', amount: 3000, description: 'Reverse accrued utilities: Jan 2025' },
    { accountResourceId: <expense GL>, type: 'CREDIT', amount: 3000, description: 'Reverse accrued utilities: Jan 2025' }
  ],
  saveAsDraft: true,
  capsuleResourceId: <capsule id>
)
```

The reversal stays a DRAFT until February's close.

### Step 5: Monthly action

January close: the accrual is posted (step 4). February close: find the reversal by its reference and finalize it, then post February's accrual if the bill still has not arrived (run step 1 again for February's amount and post the new pair into the same capsule).

```
search_journals(filter: {reference: {eq: 'ACCR-POWERCO-2025-01-REV'}})
update_journal(resourceId: <reversal journal id>, saveAsDraft: false)
```

**Do NOT finalize an accrual and its reversal in the same period**; that defeats the period-matching purpose. Journals cannot be filtered by capsule, and a date-plus-status search returns every matching DRAFT in the org: never feed one into `bulk_update_journals` or `delete_journal`.

Verify after January:
- `generate_trial_balance(endDate: '2025-01-31')`.
- Assert: `balance['Accrued Expenses']` increased by 3000.
- Assert: `balance['<expense GL>']` (period MTD) increased by 3000.
- Net P&L impact for January: $3,000 expense.

After February (with reversal + new Feb accrual posted):
- `balance['Accrued Expenses']` reflects only the Feb accrual (Jan's reversed cleanly).

When the actual quarterly bill arrives (typically Mar 31, $9,000 total): post a normal `create_bill(...)` for the full $9,000 against `<expense GL>`. The capsule may or may not include this bill; practitioner's call. The accrual capsule's net P&L impact is zero across the rolling window once all reversals post.

---

## Common problems and recovery

| Where | Problem | Recovery |
|--------|-------|----------|
| Calculator | "Amount must be a positive number" | The computed amount is zero or negative: `prior_month` may have returned a credit balance. Switch the estimation method to `fixed_amount` for this row this period, OR investigate the credit. |
| Step 2 | An account is missing | `search_accounts`; create via `create_account` if the practitioner confirms classification. |
| `create_journal` | "Unbalanced journal" | The lines were retyped incorrectly. Take both amounts from the calculator's step; debits must equal credits. |
| Verification | Net P&L impact stuck after the reversal should have posted | The reversal is likely still a DRAFT. Find it by its reference (journals cannot be filtered by capsule) and finalize it. |
| Verification | Accrued Expenses balance nonzero after the actual bill posts AND all reversals run | Either the bill amount diverged from the accrual estimate (post a true-up journal: Dr/Cr `<expense GL>` for the difference) OR a reversal was missed. Audit via `generate_general_ledger(accountResourceIds: [<Accrued Expenses id>], startDate: <accrual date>, endDate: <today>)`. |
| Actual bill posted against `Accrued Expenses` instead of `<expense GL>` | (process error) | The reversal AND the bill both touch `Accrued Expenses`: net to zero on liability, but expense gets double-recognized. Reverse the bill, re-post against `<expense GL>`. Note the risk in your working notes. |

---

## Variations

- **Multi-period rolling accrual** (quarterly bill, monthly accrual): `periods: 3` with `frequency: 'monthly'`. The calculator returns 3 accrual + 3 reversal pairs. Each month's close posts that month's pair.
- **One-shot accrual** (year-end true-up where you don't know the per-period split): `periods: 1`, `startDate: <FY-end>`. Post the reversal on FY-end+1 day. The practitioner posts the actual bill in the next FY when it arrives.
- **Quarterly cadence**: `frequency: 'quarterly', periods: 4` for an annual rolling accrual (rare for SMBs).
- **Different estimate per period**: the calculator assumes a constant per-period amount. For variable amounts, run it once per period with that period's amount.
- **Vendor unknown** (estimating an accrual but supplier not yet identified): leave the vendor out of the narrative. The journal still posts; update the narrative later via `update_journal`.

---

## Cross-references

- Month-end close: invoked once per recurring accrual whose last-posted period precedes the current period end.
- GST/VAT filing cycle: same per-accrual loop, plus quarter-specific accruals (e.g. ECL top-up if AR aging shifted, employee bonus accruals if contractually due quarterly).
- Year-end close: full FY-end accrual sweep + employee bonus accrual + dividend declarations.
- Data migration: opening balance load may include opening accrued liabilities; conversion handles those, this recipe runs forward only from the migration date.
