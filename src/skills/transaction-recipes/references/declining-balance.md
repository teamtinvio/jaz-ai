# Recipe: Declining Balance Depreciation (calculator type: `depreciation`)

> Canonical recipe for non-straight-line depreciation methods (double declining balance / DDB, 150% declining balance / 150DB), which the Jaz native FA register does not post. One depreciation journal per period, in one capsule. **Do NOT register the asset in the Jaz FA register with straight-line depreciation** (it would post duplicate SL depreciation). You calculate, create the capsule and post each journal yourself (see `building-blocks.md` § The three-step flow).

## Tools and calculator this recipe uses

### Calculator (offline, posts nothing)
- **MCP: `calculate(type: 'depreciation', cost, salvageValue, usefulLifeYears, method, frequency, currency)`** (step 1). `method` is `ddb` (the default), `150db` or `sl`; `frequency` is `annual` (the default) or `monthly`.
- **CLI: `clio calc depreciation --cost <c> --salvage <s> --life <years> --method <ddb|150db|sl> --frequency <annual|monthly> --currency <code> --json`** (step 1): the same result.

The depreciation calculator takes no start date: its steps are never dated. You date each journal yourself (step 4).

### Posting tools
- **`list_capsule_types` / `create_capsule_type(displayName: 'Depreciation')` / `create_capsule(...)`** (step 3).
- **`create_journal(...)`** (step 4): one per period. The amount changes as book value falls, so a fixed-amount schedule does not fit.

### Lookup and verification tools
- **`search_capsules(filter: {title: {eq: <capsule title>}})`**: step 0 idempotency check. One depreciation capsule per asset; duplicate setup is almost always an error.
- **`search_accounts(filter: {name: {in: ['Vehicles', 'Accumulated Depreciation (Vehicles)', 'Depreciation Expense']}})`** (step 2): confirm the asset, contra-asset, and expense GL accounts exist.
- **`generate_trial_balance(endDate: <date>)`** (step 5): verify NBV matches the schedule.

### Cross-references
- Operational context: invoked during month-end close (only when an asset uses a non-SL method; Jaz native FA handles SL automatically). For SL: `create_fixed_asset` directly; do NOT use this recipe.
- Sibling: `asset-disposal.md` for end-of-life de-recognition; `ifrs16-lease.md`, which uses SL depreciation via the FA register because the ROU asset is depreciated straight-line there.
- IFRS / accounting context: IAS 16.62, depreciation method should reflect the pattern of consumption of the asset's economic benefits. DDB / 150DB are valid alternatives to SL when usage is front-loaded (vehicles, technology). NOT for buildings, land improvements (always SL).

---

## Step-by-step

### Step 0: Idempotency check

```
search_capsules(filter: {title: {eq: 'DDB Depreciation, 5 years, Delivery Vehicle TRK-001'}})
```

If a result returns: halt and surface "Depreciation capsule for asset `<name>` already exists. Re-posting would create duplicate depreciation journals. Confirm: if revising the depreciation schedule (changed useful life or salvage), delete the remaining DRAFT journals via `delete_journal`, then post the revised periods into the same capsule."

### Step 1: Calculate

```
calculate(
  type: 'depreciation',
  cost: 50000,
  salvageValue: 5000,
  usefulLifeYears: 5,
  method: 'ddb',
  frequency: 'monthly',
  currency: 'SGD'
)
```

```
clio calc depreciation --cost 50000 --salvage 5000 --life 5 --method ddb --frequency monthly --currency SGD --json
```

Returns `{ totalDepreciation: 45000, schedule: [{ period, date, openingBookValue, ddbAmount, slAmount, methodUsed, depreciation, closingBookValue, journal }, ...60], blueprint }`. `date` is `null` on every row.

DDB rate formula: `2 / useful-life-years = 40% annual` for 5-year life.
150DB rate: `1.5 / useful-life-years = 30% annual` for 5-year life.

For this asset the annual charges are 20,000 / 12,000 / 7,200 / 4,320 / 1,480. Each year the calculator computes the declining-balance charge (`ddbAmount`) and straight-line over the remaining life (`slAmount`), and switches to SL once SL is at least the declining-balance charge or the declining-balance charge would take book value below salvage; `methodUsed` shows which applied. Here it switches in year 5 (the DDB charge would breach the $5,000 floor), so the book value lands on the salvage value exactly and never below it.

With `frequency: 'monthly'` each year's charge is spread evenly over its 12 months (1,666.67 a month in year 1, 1,000.00 in year 2, ...), and the last month of each year absorbs the rounding.

**Monthly posting reads `schedule[]`, not `blueprint.steps`.** For DDB and 150DB the blueprint always carries the ANNUAL steps (5 here), whatever the frequency. The 60 monthly entries are the `journal` on each `schedule` row.

Save the schedule to `workpapers/<period>/depreciation-<asset-id>.json` for the workpaper record (audit will sample-test).

### Step 2: Resolve accounts

The calculator's `Depreciation Expense` and `Accumulated Depreciation` are labels. Map each to the real account:
- `search_accounts(filter: {name: {in: ['Vehicles', 'Accumulated Depreciation (Vehicles)', 'Depreciation Expense']}})`. If one is missing: halt. Suggested classifications: asset GL → `Non-current Asset`; accumulated depreciation → `Non-current Asset` (contra); expense → `Operating Expense`.

NO contact (depreciation has no counterparty). NO bank account.

### Step 3: Create the capsule

```
list_capsule_types()
create_capsule(
  capsuleTypeResourceId: <id of 'Depreciation'>,
  title: 'DDB Depreciation, 5 years, Delivery Vehicle TRK-001',
  description: <blueprint.capsuleDescription>
)
```

If `Depreciation` is not in the list: `create_capsule_type(displayName: 'Depreciation')` first.

### Step 4: Post the journals

One `create_journal` per period, dated by you (month-end for monthly, year-end for annual), with that period's amount:

```
create_journal(
  valueDate: '2025-01-31',
  reference: 'DEP-TRK-001-01',
  journalEntries: [
    { accountResourceId: <Depreciation Expense>, type: 'DEBIT', amount: 1666.67, description: 'DDB depreciation, month 1 of 60' },
    { accountResourceId: <Accumulated Depreciation (Vehicles)>, type: 'CREDIT', amount: 1666.67, description: 'DDB depreciation, month 1 of 60' }
  ],
  saveAsDraft: false,
  capsuleResourceId: <capsule id>
)
```

Post each period's journal at that period's close, or post them all now as drafts and finalize one per period. Agree the cadence with the practitioner; the reference pattern (`DEP-TRK-001-01` to `-60`) is what finds a period's journal later.

**Critical:** Do NOT also register this asset in the FA register with `depreciationMethod: 'STRAIGHT_LINE'`. The asset is tracked via the CoA (its cost sits in the `Vehicles` account; its NBV is `cost − accumulated depreciation` per TB). A straight-line registration would post duplicate depreciation, double-counting.

If the asset MUST be in the FA register for reporting reasons (e.g. the fixed-assets summary report): register it with `depreciationMethod: 'NO_DEPRECIATION'`, so the register lists the asset and posts nothing. The register's book value then stays at cost; the journals in this capsule are the depreciation record.

### Step 5: Monthly action (during monthly-close)

Post this period's journal, or find it by its reference and finalize it:

```
search_journals(filter: {reference: {eq: 'DEP-TRK-001-03'}})
update_journal(resourceId: <journal id>, saveAsDraft: false)
```

Journals cannot be filtered by capsule, and a date-plus-status search returns every matching DRAFT in the org: never feed one into `bulk_update_journals` or `delete_journal`.

Verify after each period:
- `generate_trial_balance(endDate: <month-end>)`.
- Assert: `balance['Accumulated Depreciation (Vehicles)'] == -(cost - schedule[periodIndex].closingBookValue)` (within 1 cent).
- Assert: `balance['Depreciation Expense'] (period MTD) == schedule[periodIndex].depreciation` (within 1 cent).
- Assert: `balance['Vehicles'] - |balance['Accumulated Depreciation (Vehicles)']| == schedule[periodIndex].closingBookValue`.

After the FINAL period (month 60):
- Assert: `closingBookValue == salvage` exactly ($5,000; the final period carries the rounding).
- Asset is now fully depreciated. If sold/disposed: follow `asset-disposal.md`. If retained at salvage value: close the capsule; no further depreciation.

---

## Common problems and recovery

| Where | Problem | Recovery |
|--------|-------|----------|
| Calculator | "Useful life (years) must be a positive integer" | Whole years only, 1 or more. An item with no multi-period life is a period cost: expense it via `create_bill` to `Operating Expense`. |
| Calculator | "Salvage value (S) must be less than cost (C)" | Salvage ≥ cost is non-sensical. Verify inputs. |
| Step 2 | An account is missing | `search_accounts`; create via `create_account`. |
| Verification | NBV stuck above schedule | Either a period's journal is missing or still a DRAFT (re-run step 5), OR Jaz FA also auto-posted SL depreciation (asset got duplicate-registered). Audit `search_fixed_assets(filter: {name: {contains: <asset>}})`. If duplicated: remove the duplicate registration and its auto-posted depreciation, **not** with `discard_fixed_asset`, whose own description is "records the disposal and final depreciation", i.e. it POSTS more entries in a case that wanted fewer. If the duplicate is still a draft, `delete_fixed_asset` (draft-only by design). If it is already active, stop: deleting is impossible and reversing its posted depreciation is a judgment call; surface both registrations to the practitioner. |
| Asset reaches salvage early (impairment) | (process) | Per IAS 36, if recoverable amount drops below NBV, write down. Manual journal: Dr Impairment Loss / Cr Accumulated Depreciation for the impairment amount. Delete the remaining DRAFT depreciation journals (`delete_journal`) and recalculate from the written-down value; the schedule assumed a normal life. |
| Disposal mid-life | (process) | Follow `asset-disposal.md`. Then close the depreciation capsule and delete any remaining DRAFT depreciation journals. |

---

## Variations

- **150DB**: `method: '150db'`. Rate is 1.5x SL instead of 2x. Less aggressive front-loading.
- **Annual frequency**: `frequency: 'annual'` (the default). 5 annual journals instead of 60 monthly. Used when reporting cadence is annual or asset is small. Here `blueprint.steps` and `schedule[]` agree.
- **Sum-of-years' digits (SYD)**: NOT supported by the calculator. Work the SYD amounts by hand and post manual journals for each period (rare in modern practice).
- **Units-of-production**: NOT supported (depreciation per unit produced, not per period). Manual journal pattern: at each period-end, compute `units × per-unit-rate`, post Dr Depreciation Expense / Cr Accumulated Depreciation.
- **Component depreciation** (IAS 16.43): different parts of an asset depreciated separately. Each component gets its own calculation + capsule.
- **Mid-period acquisition:** The calculator does NOT prorate the first period. Schedule entries are full periods. For partial-period accuracy, either (a) start the journals in the first full period after acquisition (lose the partial-period depreciation), or (b) post a manual partial-period journal via `create_journal` for the days in the acquisition period, then post the schedule from the next full period.

---

## Cross-references

- Month-end close: invoked monthly only when an asset uses non-SL. SL depreciation runs through Jaz native FA register automatically (no recipe needed).
- Year-end close (full FY-end depreciation reconciliation): sum 12 monthly journals against `clio calc depreciation --frequency annual` cross-check; auditor will sample-test.
- Data migration: opening accumulated depreciation loaded via conversion (Conversion Clearing > Accumulated Depreciation account); recipe runs forward from the migration date with `cost: <NBV at migration>` instead of original cost. Useful-life-years should be `remaining life`, not original.
- Sibling recipe `asset-disposal.md`: end-of-life de-recognition.
- `audit-prep.md` step 8: supporting schedule via `search_capsules(filter: {status: {eq: 'ACTIVE'}})` (capsule type is not filterable; see `jobs/references/building-blocks.md` § Filter limits) + per-capsule `clio calc depreciation` recompute.
