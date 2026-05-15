# Recipe: Prepaid Amortization (engine name: `prepaid-expense`)

> Canonical recipe for prepaid expenses paid upfront and recognized over a fixed schedule. Use the engine — never hand-construct the journals or scheduler.

## Tools, recipes, calculators this recipe uses

### Recipe engine entry point
- **`plan_recipe(recipe: 'prepaid-expense', ...)`** — used in step 2: model the schedule + journal entries; returns `RecipePlan` with `requiredAccounts`, `needsContact`, capsule shape, scheduler config.
- **`execute_recipe(recipe: 'prepaid-expense', ...)`** — used in step 4: post the bill (or cash-out), create the capsule, create the monthly amortization scheduler. Returns `{ capsuleResourceId, billResourceId, schedulerResourceId, journalResourceIds }`.

### Calculators (for cross-check, no API key needed)
- **`clio calc prepaid-expense --amount <total> --periods <n> --start-date <YYYY-MM-DD> --currency <code> --json`** — used in step 1: independently verify the period amount and end-of-recognition date before invoking the recipe.

### Tools (jaz-api / direct)
- **`search_contacts(filter: {name: {eq: <vendor>}})`** — used in step 3: resolve the insurance supplier resourceId before bill creation.
- **`create_contact(...)`** — used in step 3 fallback: create the supplier if `search_contacts` returns empty.
- **`search_accounts(filter: {name: {in: ['<asset GL>', '<expense GL>']}})`** — used in step 3: confirm the prepaid asset and expense GL accounts exist; if missing, surface to practitioner before retry.
- **`generate_trial_balance(period_end: <date>)`** — used in step 5: verify the recognition has unwound the prepaid balance correctly.
- **`search_capsules(filter: {capsuleType: {eq: 'Prepaid Expenses'}, name: {eq: <capsule.name>}})`** — used to detect duplicate setup in re-runs.

### Cross-references
- Within an engagement: invoked from `practice/references/monthly-close.md` step 7 (initial setup of new prepaids; ongoing recognition runs from the scheduler created here).
- IFRS / accounting context: IAS 38 (intangible) does NOT apply — this is a current asset under IAS 1. The capsule type "Prepaid Expenses" maps to `accountType: Current Asset` per `jaz-api/SKILL.md` rule 21.
- Sibling recipe: `deferred-revenue.md` (mirror image — upfront receipt, monthly recognition).

---

## Step-by-step

### Step 1 — Independent cross-check (calculator)

```
clio calc prepaid-expense --amount 12000 --periods 12 --start-date 2025-01-01 --currency SGD --json
```

Returns: `{ perPeriodAmount, recognitionStartDate, recognitionEndDate, schedule[12] }`. Verify `perPeriodAmount * periods == amount` (within 1 cent rounding tolerance — the engine carries fractional cents into the final period).

### Step 2 — Plan the recipe

```
plan_recipe(
  // Note: gl*, capsuleType, capsuleName, bankAccountResourceId, vendor, customer below are illustrative — auto-resolved at execute time from CoA / CLIENT.md, not real plan_recipe params.
  recipe: 'prepaid-expense',
  amount: 12000,
  periods: 12,
  startDate: '2025-01-01',
  currency: 'SGD',
  glAsset: <CLIENT.coa_mapping['Prepaid Insurance']>,
  glExpense: <CLIENT.coa_mapping['Insurance Expense']>,
  capsuleType: 'Prepaid Expenses',
  capsuleName: 'FY2025 Office Insurance',
  vendor: 'AXA Insurance Singapore'
)
```

Returns a `RecipePlan` with:
- `requiredAccounts`: `['Prepaid Insurance' (Current Asset), 'Insurance Expense' (Operating Expense)]`
- `needsContact`: `true` (vendor must exist before `execute_recipe`)
- `steps`: 1 bill (initial $12,000 to AP) + 12 scheduler-emitted journals ($1,000/month, end-of-month recognition)
- `capsule`: `{ type: 'Prepaid Expenses', name: 'FY2025 Office Insurance' }`

### Step 3 — Resolve dependencies

For every account in `requiredAccounts`:
- `search_accounts(filter: {name: {eq: <accountName>}})`. If empty, halt and surface: "Prepaid recipe references GL account `<accountName>` not in CoA / `CLIENT.coa_mapping`. Create via `create_account` or remap CLIENT.md before retry."

For the vendor (because `needsContact: true`):
- `search_contacts(filter: {name: {eq: <vendor>}})`. If empty: halt and surface: "Vendor `<vendor>` not in Jaz contacts. Create via `create_contact(...)` or remap CLIENT.md before retry."

### Step 4 — Execute

```
execute_recipe(recipe: 'prepaid-expense', ...same args...)  // accounts auto-resolved from CoA; pass `bankAccountName` / `contactName` for fuzzy resolve
```

Returns: `{ capsule: {resourceId, type, title}, steps: [{step, action, status, resourceId}, ...], summary: {total, created, ...} }`. The recipe creates **N+1 entries upfront**:
- Step 1: 1 bill (initial $12,000 to supplier coded to Prepaid Asset). DRAFT — finalize via `finalize_bill(resourceId: <id>)` once supplier invoice is on hand.
- Steps 2..N+1: **N future-dated DRAFT journals** (one per recognition period, dated end-of-month for each month from `<startDate>+1 month` through `<startDate>+12 months`).

All N journals attach to the same capsule. They sit DRAFT until you finalize them (typically one per month during monthly-close).

Note: This is NOT the Jaz scheduler primitive (`create_scheduled_journal`). The recipe pre-emits all N journals as DRAFT for upfront capsule visibility. If the practitioner prefers scheduler-driven recognition (template-based, auto-fires monthly), they'd skip the recipe engine and call `create_scheduled_journal(...)` directly — but the recipe path is canonical and gives capsule-level traceability.

### Step 5 — Monthly action (during monthly-close)

For each month after recipe execution, the corresponding DRAFT journal already exists in the capsule. Monthly close action:

```
search_journals(filter: {capsuleResourceId: {eq: <id>}, valueDate: {between: [<period-start>, <period-end>]}, status: {eq: 'DRAFT'}})
```

Returns the one DRAFT for that period. Finalize:

```
update_journal(resourceId: <journal id>, saveAsDraft: false)
```

After finalize:
- `generate_trial_balance(period_end: <period-end>)`.
- Assert: `balance['Prepaid Insurance'] == amount - (perPeriodAmount × periodsFinalizedSoFar)` (within 1 cent).
- Assert: `balance['Insurance Expense'] (period MTD) == perPeriodAmount` (within 1 cent).

After the FINAL period (period N+1) is finalized:
- Assert: `balance['Prepaid Insurance'] == 0` exactly (the calculator forces the final period to absorb any rounding remainder).
- The capsule lifecycle is now complete; close via a manual `update_capsule(title: '<original> [CLOSED]')` (the API has no `status` field for capsules — closure is informational only) if the org tracks capsule status.

---

## Common error classes and recovery

| Source | Error | Recovery |
|--------|-------|----------|
| `plan_recipe` | 422 `unsupported_recipe` | You used a file-name alias (`prepaid-amortization`). Use canonical engine name `prepaid-expense`. |
| `plan_recipe` | 422 `invalid_period` (`periods <= 0`) | Verify `periods` is a positive integer. Quarterly = `periods: 4` with `frequency: quarterly` (NOT 12). |
| `execute_recipe` | 422 `account_not_found` | Step 3 resolution incomplete. Re-run `search_accounts`; if missing, create via `create_account` first. |
| `execute_recipe` | 422 `contact_not_found` | Step 3 resolution incomplete. Re-run `search_contacts`; if missing, create via `create_contact` first. |
| `execute_recipe` | 422 `currency_not_enabled` | The recipe currency isn't enabled for the org. `add_currency(currencyCode: ...)` first; rates default-resolve from the latest `list_currency_rates`. |
| `execute_recipe` | 409 `capsule_already_exists` | Re-run on the same `capsuleName` is rejected. Either pick a different name (e.g. include policy number) or `search_capsules` to find the existing one and append additional bills/journals via `update_capsule`. |
| `finalize_bill` | 422 `bill_unbalanced` | Engine-emitted bills are always balanced. If you see this, the source schema changed — escalate (do not retry). |
| Scheduler | Missing recognition journal at month-end | Verify `schedulerResourceId` is `status: ACTIVE`. If `PAUSED`, the scheduler was halted manually (likely by practitioner during a period-end review). Resume via `update_scheduler` or document in `ENGAGEMENT.md`. |

---

## Variations

- **Quarterly recognition:** `periods: 4, frequency: 'quarterly'`. Recipe outputs 4 quarter-end journals at $3,000 each.
- **Partial first period:** The calculator does NOT prorate. Schedule entries are equal full-period amounts (`amount / periods`) starting from `startDate`. For partial-period accuracy on a mid-period start (e.g. insurance starting Feb 15), either accept the slight timing mismatch (most prepaids are immaterial), or post a manual partial-period journal first then run `plan_recipe` from the next full period.
- **Multi-currency:** Pass `currency: 'USD'` if the premium is in USD; the bill is recorded in USD via the standard `currency: { sourceCurrency: 'USD' }` field (per `jaz-api/SKILL.md` rule 25). Monthly recognition journals are also in USD. **Note:** Prepaid Insurance is a NON-MONETARY item per IAS 21.16 — it stays at historical (booking) rate and is NOT FX-revalued at period-end. The auto-FX engine knows this; no action needed.
- **Renewal:** New capsule per year (`'FY2026 Office Insurance'`). Do not extend or re-use the prior capsule — capsule lifecycle is per recognition cycle.

---

## Cross-references back to engagements

- `practice/references/monthly-close.md` step 7 — invoked here only on initial setup of a new prepaid; ongoing recognition runs from the scheduler. Practice playbook reads `CLIENT.coa_mapping` and `CLIENT.recurring_accruals[]` (when the prepaid is structured as a recurring accrual rather than ad-hoc).
- `practice/references/onboarding.md` — initial trial-balance load may include a non-zero prepaid balance. Conversion via `jaz-conversion/SKILL.md § Option 2 Quick` posts the opening balance via the `Conversion Clearing` account; the recipe then sets up forward recognition only (no historical recognition).
