# Fixed Asset Review

> Annual housekeeping of the FA register. Identify assets requiring disposal/write-off, reconcile register to TB, verify Jaz auto-depreciation matches schedules. Driver tool: `generate_fa_review_blueprint`.

## Tools, recipes, calculators this job uses

### MCP tools
- **`generate_fa_review_blueprint(period: <YYYY> | <YYYY-Q[1-4]>, currency: <base>)`** — step 0: emit blueprint.
- **`search_fixed_assets(filter: {status: {in: ['ACTIVE', 'DISPOSED', 'WRITTEN_OFF']}}, limit: 200)`** — step 1: enumerate FAs. Paginate.
- **`get_fixed_asset(resourceId: <id>)`** — step 2: per-asset detail (cost, acquisitionDate, usefulLifeMonths, depreciationMethod, salvageValue, NBV).
- **`generate_fa_summary(period_end: <date>)`** — step 3: aggregate FA register at period end.
- **`generate_fa_recon_summary(period_start: <year-start>, period_end: <year-end>)`** — step 3: reconcile movement (opening + additions − disposals − depreciation = closing).
- **`generate_general_ledger(accountResourceId: <FA category GL>, period_start, period_end)`** — step 4: per-FA-category GL movement vs FA register.
- **`update_fixed_asset(resourceId: <id>, status: 'DISPOSED' | 'WRITTEN_OFF', disposalDate, disposalProceeds)`** — step 5: status updates for disposals. Mirror endpoints `POST /api/v1/mark-as-sold/fixed-assets` (sale) / `POST /api/v1/discard-fixed-assets/{id}` (scrap).
- **`plan_recipe(recipe: 'asset-disposal', ...)` + `execute_recipe(...)`** — step 5: invoke per disposal identified during review (per `asset-disposal.md` recipe).
- **`bulk_update_journals(items: [{resourceId: <id>, saveAsDraft: false}, ...])`** — step 5 / 6: finalize disposal journals + any pending DDB / 150DB depreciation DRAFTs from `declining-balance.md` recipe.

### Calculators (cross-check, no API key needed)
- **`clio calc depreciation --cost --salvage --life --method --frequency annual --json`** — step 4 per-asset cross-check.
- **`clio calc asset-disposal`** — step 5 per-disposal cross-check (auto-invoked by recipe).

### Cross-references
- Within an engagement: invoked from `practice/references/annual-statutory.md` step 4b (year-end FA review feeds audit-prep + Form C-S capital allowances).
- Sibling jobs: `audit-prep.md` step 8 (auditor reviews FA register + recon summary), `month-end-close.md` step 9 (monthly depreciation; this job is the periodic comprehensive review).
- Recipes: `asset-disposal.md`, `declining-balance.md` (depreciation engine).
- API rules: `jaz-api/SKILL.md` rules 91-92c (fixed-asset endpoints).

---

## Step 0 — Emit blueprint

```
generate_fa_review_blueprint(period: '2025', currency: <CLIENT.base_currency>)
```

## Step 1 — Enumerate FAs

```
search_fixed_assets(filter: {status: {in: ['ACTIVE', 'DISPOSED', 'WRITTEN_OFF']}}, limit: 200, sort: 'acquisitionDate:asc')
```

Paginate via offset. For year-end review: include DISPOSED and WRITTEN_OFF (disposed during the year are part of the recon).

## Step 2 — Identify candidates for review

For each ACTIVE asset, flag for practitioner attention:
- **Fully depreciated** (`NBV == salvageValue` per FA summary): consider disposal if no longer in use; consider impairment review per IAS 36 if NBV > recoverable amount.
- **Recently acquired without `usefulLifeMonths`**: depreciation can't run; halt and surface.
- **In a disposal-candidate list per `CLIENT.fa_disposal_review[]`**: practitioner pre-flagged.
- **Damaged / no longer in use** (per practitioner inspection): write off.
- **Mid-life disposals** (sold or traded in during the period): per asset-disposal recipe.

## Step 3 — FA register reconciliation

```
generate_fa_summary(period_end: '2025-12-31')
generate_fa_recon_summary(period_start: '2025-01-01', period_end: '2025-12-31')
```

Save both to `recurring/annual/2025/fa-review/`. Assert per FA category:
- `closingNbv == openingNbv + additions - disposals - depreciation` (the recon formula).
- Sum of per-asset NBV in the register equals TB `<FA cost> - <Accumulated Depreciation>` line for that category.

If mismatch beyond `CLIENT.materiality_threshold`: investigate via `generate_general_ledger(accountResourceId: <FA category cost GL>, period_start, period_end)`. Common: a disposal posted via `asset-disposal.md` recipe but `update_fixed_asset(status: 'DISPOSED')` step 5 missed — Jaz continues auto-depreciating.

## Step 4 — Depreciation cross-check

For each ACTIVE SL asset (Jaz auto-depreciates):
- Pull FA's expected annual depreciation: `(cost - salvage) / (usefulLifeMonths / 12)`.
- Compare to actual `generate_general_ledger(accountResourceId: <Depreciation Expense for this category>, period_start: <year-start>, period_end: <year-end>)` movement.
- Should match within rounding ($0.12 tolerance for full-year SL).

For each ACTIVE DDB / 150DB asset (recipe-managed, see `declining-balance.md`):
- Per capsule: `search_journals(filter: {capsuleResourceId: {eq: <dep capsule>}, valueDate: {between: [<year-start>, <year-end>]}, status: 'DRAFT'})`. Should be zero — all 12 months' DRAFT depreciation journals should already be FINALIZED via monthly-close.
- If non-zero: `bulk_update_journals(items: [{resourceId: <id>, saveAsDraft: false}, ...])` for each remaining DRAFT.

Cross-check via `clio calc depreciation --frequency annual --json` per asset; auditor will sample-test.

## Step 5 — Process disposals

For each disposal identified in step 2:

```
plan_recipe(
  // Note: gl*, capsuleType, capsuleName, bankAccountResourceId, vendor, customer below are illustrative — auto-resolved at execute time from CoA / CLIENT.md, not real plan_recipe params.
  recipe: 'asset-disposal',
  cost, salvageValue, usefulLifeYears, acquisitionDate, disposalDate, proceeds, method,
  ...,
  fixedAssetResourceId: <asset id>,
  capsuleType: 'Asset Disposal',
  capsuleName: 'Disposal — <asset name> — <disposal date>'
)
execute_recipe(...)
update_journal(resourceId: <disposal journal id>, saveAsDraft: false)
```

Then the manual FA-register status update (engine-skipped — see `asset-disposal.md` step 5):
```
update_fixed_asset(resourceId: <asset id>, status: 'DISPOSED', disposalDate, disposalProceeds)
```

For scrap / write-off (no proceeds): `update_fixed_asset(status: 'WRITTEN_OFF', disposalDate)`.

## Step 6 — Write-off of fully depreciated unused assets

For assets at salvage value AND no longer in use:
- If salvage value > 0 and asset is to be retained at salvage: leave ACTIVE; no further depreciation.
- If salvage value > 0 and asset is to be scrapped: invoke `asset-disposal.md` with `proceeds: 0` → loss = salvage value.
- If salvage value = 0 and asset is to be scrapped: minimal P&L impact; `asset-disposal` recipe still required to clear the cost + accumulated depreciation balances against each other.

## Step 7 — Per-category GL reconciliation

For each FA category (e.g., Vehicles, Office Equipment, Computers, Buildings):
```
generate_general_ledger(accountResourceId: <FA cost GL>, period_start: '2025-01-01', period_end: '2025-12-31', groupBy: 'CAPSULE')
```

Group by capsule shows per-asset / per-disposal trail. Auditor sample-test will pick 2-3 assets per category and trace GL → original purchase bill → FA registration → depreciation history → disposal (if any).

## Step 8 — Save register snapshot

Save to `recurring/annual/2025/fa-review/`:
- `fa-summary.json` — per-asset detail
- `fa-recon.json` — opening/additions/disposals/depreciation/closing
- `gl-by-category.json` — per-category capsule-grouped GL
- `disposals.json` — list of disposals processed during the review with capsule + journal references

These feed `audit-prep.md` step 8 supporting schedules.

---

## Common error classes and recovery

| Source | Error | Recovery |
|--------|-------|----------|
| Step 1 | `search_fixed_assets` returns more than the page limit | Paginate via `offset`. Most SMBs have <100 FAs. |
| Step 3 | Recon doesn't tie | Disposed asset still ACTIVE in register (see `asset-disposal.md` step 5 manual update). Audit each disposal's status. |
| Step 4 | DDB / 150DB DRAFTs unfinalized | Likely a missed monthly-close. Finalize current and surface to practitioner — auditor will see 12 months' depreciation in one period. |
| Step 4 | SL depreciation off by > $0.12 | A monthly depreciation period was skipped (asset created mid-month with mis-aligned `acquisitionDate`). Reconcile per asset. |
| Step 5 | `update_fixed_asset` to DISPOSED | 422 `pending_depreciation_journals` | DRAFT depreciation journals exist for periods after disposal date. `search_journals(filter: {fixedAssetResourceId: <id>, valueDate: {gt: <disposal>}, status: 'DRAFT'})` → `delete_journal` per result. Then retry. |
| Step 6 | Trying to dispose an FA at NBV = 0 with no proceeds | Recipe still works but creates a no-effect journal. May be skippable; surface to practitioner. |

---

## Cross-references back to engagements

- `practice/references/annual-statutory.md` step 4b — invokes this job for year-end FA review. Practice playbook reads `CLIENT.fa_disposal_review[]` for pre-flagged candidates.
- `audit-prep.md` step 8 — consumes the snapshot files for the audit pack.
- `statutory-filing.md` (SG Form C-S) — capital allowances computation reads from FA register; this job's reconciliation must be clean before the tax computation.
- `month-end-close.md` step 9 — monthly depreciation (Jaz auto-SL + recipe-DDB); this job is the periodic comprehensive register review (typically annual).
- Recipes: `asset-disposal.md` (per-disposal), `declining-balance.md` (per-DDB-asset depreciation engine).
