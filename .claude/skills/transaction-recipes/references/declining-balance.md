# Recipe: Declining Balance Depreciation (engine name: `depreciation`)

> Canonical recipe for non-straight-line depreciation methods (double declining balance / DDB, 150% declining balance / 150DB) where Jaz native FA can't auto-handle. Engine emits N future-dated DRAFT depreciation journals upfront. **Do NOT register the asset in Jaz native FA register** — would trigger duplicate SL depreciation.

## Tools, recipes, calculators this recipe uses

### Recipe engine entry point
- **`plan_recipe(name: 'depreciation', method: 'ddb' | '150db', ...)`** — used in step 2: returns RecipePlan with N future-dated depreciation journals (one per period in the schedule), capsule shape, required accounts.
- **`execute_recipe(name: 'depreciation', ...)`** — used in step 4: posts N future-dated DRAFT journals all attached to the same capsule. NO fixed-asset step (recipe assumes asset is tracked in CoA only, not in FA register).

### Calculator (cross-check, no API key needed)
- **`clio calc depreciation --cost <c> --salvage <s> --life <years> --method <ddb|150db|sl> --frequency <annual|monthly> --json`** — used in step 1: full depreciation schedule. Returns `{ totalDepreciation, schedule[n] }` where each row carries `period`, `openingBookValue`, `depreciationAmount`, `accumulatedDepreciation`, `closingBookValue`. Final period absorbs rounding to land at salvage value exactly.

### Tools (jaz-api / direct)
- **`search_capsules(filter: {capsuleType: {eq: 'Depreciation'}, name: {eq: <capsule.name>}})`** — step 0 idempotency check. One depreciation capsule per asset; duplicate setup is almost always an error.
- **`search_accounts(filter: {name: {in: ['Vehicles', 'Accumulated Depreciation — Vehicles', 'Depreciation Expense']}})`** — step 3: confirm the asset, contra-asset, and expense GL accounts exist.
- **`generate_trial_balance(period_end: <date>)`** — step 5: verify NBV matches schedule.
- **`bulk_finalize_drafts({kind: 'journal', resourceIds: [...]})`** — step 5 monthly: finalize this period's pre-emitted DRAFT depreciation journal.

### Cross-references
- Within an engagement: invoked from `practice/references/monthly-close.md` step 9 (only when an asset uses non-SL method — Jaz native FA handles SL automatically). For SL: `create_fixed_asset` directly via `fixed-assets` tool family; do NOT use this recipe.
- Sibling: `asset-disposal.md` for end-of-life de-recognition; `ifrs16-lease.md` (lease engine) which uses SL depreciation via the FA register because ROU is always SL under IFRS 16.
- IFRS / accounting context: IAS 16.62 — depreciation method should reflect the pattern of consumption of the asset's economic benefits. DDB / 150DB are valid alternatives to SL when usage is front-loaded (vehicles, technology). NOT for buildings, land improvements (always SL).

---

## Step-by-step

### Step 0 — Idempotency check

```
search_capsules(filter: {capsuleType: {eq: 'Depreciation'}, name: {eq: 'DDB Depreciation — 5 years (Delivery Vehicle FY2025)'}})
```

If a result returns: halt and surface "Depreciation capsule for asset `<name>` already exists. Re-running would create duplicate depreciation journals. Confirm — if revising the depreciation schedule (changed useful life or salvage), close the existing capsule, reverse remaining DRAFT journals via `delete_journal`, then re-execute."

### Step 1 — Independent cross-check (calculator)

```
clio calc depreciation --cost 50000 --salvage 5000 --life 5 --method ddb --frequency monthly --start-date 2025-01-01 --currency SGD --json
```

Returns: `{ totalDepreciation: 45000, schedule: [{period: 1, openingBookValue: 50000, depreciationAmount: 833.33, accumulatedDepreciation: 833.33, closingBookValue: 49166.67}, ...60] }`. For DDB: amounts decline each period (40% annual rate × declining book value × 1/12 monthly). Final period absorbs rounding to land at exactly salvage value ($5,000).

DDB rate formula: `2 / useful-life-years = 40% annual` for 5-year life.
150DB rate: `1.5 / useful-life-years = 30% annual` for 5-year life.

Save schedule to `workpapers/<period>/depreciation-<asset-id>.json` for the engagement archive (audit will sample-test).

### Step 2 — Plan the recipe

```
plan_recipe(
  name: 'depreciation',
  cost: 50000,
  salvageValue: 5000,
  usefulLifeYears: 5,
  method: 'ddb',
  frequency: 'monthly',
  startDate: '2025-01-01',
  currency: 'SGD',
  glAsset: <CLIENT.coa_mapping['Vehicles']>,
  glAccumDep: <CLIENT.coa_mapping['Accumulated Depreciation — Vehicles']>,
  glDepExpense: <CLIENT.coa_mapping['Depreciation Expense']>,
  capsuleType: 'Depreciation',
  capsuleName: 'DDB Depreciation — 5 years (Delivery Vehicle FY2025)'
)
```

Returns `RecipePlan` with `requiredAccounts: ['Vehicles', 'Accumulated Depreciation — Vehicles', 'Depreciation Expense']`, `needsContact: false`, `needsBankAccount: false`, `steps[1..60]`: 60 future-dated DRAFT depreciation journals (one per month). Each is Dr Depreciation Expense / Cr Accumulated Depreciation, varying amount per the DDB schedule.

### Step 3 — Resolve dependencies

For each account in `requiredAccounts`:
- `search_accounts(filter: {name: {eq: <accountName>}})`. If empty: halt. Suggested classifications: asset GL → `Non-Current Asset`; accumulated depreciation → `Non-Current Asset` (contra); expense → `Operating Expense`.

NO contact resolution (depreciation has no counterparty). NO bank account resolution.

### Step 4 — Execute

```
execute_recipe(name: 'depreciation', ...same args..., accountMap: <resolved>)
```

Returns: `{ capsule: {resourceId, type, title}, steps: [{step, action, status, resourceId}, ...60], summary: {total: 60, created: 60} }`. The recipe creates **60 future-dated DRAFT depreciation journals** (one per month for 5 years), all attached to the same capsule. Each journal is dated end-of-month for its period.

**Critical:** Do NOT also call `create_fixed_asset` for this asset. The asset is tracked via the CoA only (its cost sits in `Vehicles` account; its NBV is `cost − accumulated depreciation` per TB). Registering in Jaz FA would trigger duplicate SL depreciation, double-counting.

If the asset MUST be in the FA register for reporting reasons (e.g. fixed-assets-summary report grouping): use Jaz FA with `depreciationMethod: 'sl'` BUT mark the asset as "manually depreciated" via custom field, and immediately archive the auto-emitted SL depreciation journals — risky pattern, prefer recipe-only.

### Step 5 — Monthly action (during monthly-close)

For each month after recipe execution, this period's DRAFT depreciation journal already exists. Monthly close action:

```
search_journals(filter: {capsuleResourceId: <id>, valueDate: {between: [<period-start>, <period-end>]}, status: {eq: 'DRAFT'}})
bulk_finalize_drafts({kind: 'journal', resourceIds: [<journal id>]})
```

Verify after finalize:
- `generate_trial_balance(period_end: <month-end>)`.
- Assert: `balance['Accumulated Depreciation — Vehicles'] == -schedule[periodIndex].accumulatedDepreciation` (within 1 cent).
- Assert: `balance['Depreciation Expense'] (period MTD) == schedule[periodIndex].depreciationAmount` (within 1 cent).
- Assert: `balance['Vehicles'] - |balance['Accumulated Depreciation — Vehicles']| == schedule[periodIndex].closingBookValue`.

After the FINAL period (month 60):
- Assert: `closingBookValue == salvage` exactly ($5,000 — engine forces final-period adjustment).
- Asset is now fully depreciated. If sold/disposed at salvage value: invoke `asset-disposal` recipe. If retained at salvage value: capsule closes; no further depreciation.

---

## Common error classes and recovery

| Source | Error | Recovery |
|--------|-------|----------|
| `plan_recipe` | 422 `unsupported_recipe` | File-name alias `declining-balance` was used. Use canonical engine name `depreciation` with explicit `method: 'ddb'` or `'150db'`. |
| `plan_recipe` | 422 `useful_life_invalid` | Useful life must be ≥ 2 years. Asset with useful life < 2 years: expense as period cost via `create_bill` to `Operating Expense`. |
| `plan_recipe` | 422 `salvage_exceeds_cost` | Salvage ≥ cost is non-sensical. Verify inputs. |
| `execute_recipe` | 422 `account_not_found` | Step 3 incomplete. `search_accounts`; create via `create_account`. |
| Verification | NBV stuck above schedule | Either a DRAFT wasn't finalized (re-run step 5), OR Jaz FA also auto-posted SL depreciation (asset got duplicate-registered). Audit `search_fixed_assets(filter: {name: {contains: <asset>}})`. If duplicated: archive the auto-FA depreciation journals + decommission the FA via `update_fixed_asset(status: 'WRITTEN_OFF')`. |
| Asset reaches salvage early (impairment) | (process) | Per IAS 36 — if recoverable amount drops below NBV, write down. Manual journal: Dr Impairment Loss / Cr Accumulated Depreciation for the impairment amount. Reverse remaining DRAFT depreciation journals (`delete_journal`); recipe assumed normal life. |
| Disposal mid-life | (process) | Invoke `asset-disposal.md` recipe. Then close depreciation capsule, delete remaining DRAFT depreciation journals. |

---

## Variations

- **150DB**: `method: '150db'`. Rate is 1.5x SL instead of 2x. Less aggressive front-loading.
- **Annual frequency**: `frequency: 'annual'`. 5 annual journals instead of 60 monthly. Used when reporting cadence is annual or asset is small.
- **Sum-of-years' digits (SYD)**: NOT supported by the engine. Use `clio calc depreciation` with `--method sl` for the calculation, then post manual journals for each period (rare in modern practice).
- **Units-of-production**: NOT supported (depreciation per unit produced, not per period). Manual journal pattern: at each period-end, compute `units × per-unit-rate`, post Dr Depreciation Expense / Cr Accumulated Depreciation.
- **Component depreciation** (IFRS 16.43): different parts of an asset depreciated separately. Each component gets its own recipe invocation + capsule.
- **Mid-period acquisition**: pass `startDate` mid-month; engine prorates the first journal to days-in-period × daily rate, then full months. Schedule output makes this explicit.

---

## Cross-references back to engagements

- `practice/references/monthly-close.md` step 9 — invoked monthly only when an asset uses non-SL. SL depreciation runs through Jaz native FA register automatically (no recipe needed).
- `practice/references/annual-statutory.md` step 4b — full FY-end depreciation reconciliation: sum 12 monthly journals against `clio calc depreciation --frequency annual` cross-check; auditor will sample-test.
- `practice/references/onboarding.md` — opening accumulated depreciation loaded via conversion (Conversion Clearing > Accumulated Depreciation account); recipe runs forward from the migration date with `cost: <NBV at migration>` instead of original cost. Useful-life-years should be `remaining life`, not original.
- Sibling recipe `asset-disposal.md` — end-of-life de-recognition.
- `audit-prep.md` step 8 — supporting schedule via `search_capsules(filter: {capsuleType: {eq: 'Depreciation'}})` + per-capsule `clio calc depreciation` recompute.
