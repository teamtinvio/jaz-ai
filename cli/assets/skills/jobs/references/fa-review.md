# Fixed Asset Review

> Annual housekeeping of the FA register. Identify assets requiring disposal/write-off, reconcile register to TB, verify Jaz auto-depreciation matches schedules. Walk the steps below in order, calling the named platform tools directly.

## Tools and calculators this job uses

### Platform tools
- **`search_fixed_assets(filter: {status: {in: ['ACTIVE', 'DISPOSED', 'DISCARDED']}}, limit: 200)`**, step 1: enumerate FAs. Paginate.
- **`get_fixed_asset(resourceId: <id>)`**, step 2: per-asset detail (purchaseAmount, purchaseDate, depreciationStartDate, effectiveLife in months, depreciationMethod, depreciableValueResidualAmount, NBV).
- **`generate_fixed_assets_summary(primarySnapshotStartDate: <period-start>, primarySnapshotEndDate: <period-end>, groupBy: 'CATEGORY')`**, step 3: aggregate FA register at period end.
- **`generate_fixed_assets_reconciliation_summary(primarySnapshotStartDate: <year-start>, primarySnapshotEndDate: <year-end>)`**, step 3: reconcile movement (opening + additions − disposals − depreciation = closing).
- **`generate_general_ledger(accountResourceIds: [<FA category GL>], startDate, endDate)`**, step 4: per-FA-category GL movement vs FA register.
- **`mark_fixed_asset_sold(resourceId: <id>, depreciationEndDate, assetDisposalGainLossAccountResourceId, saleBusinessTransactionType, saleItemResourceId)` / `discard_fixed_asset(resourceId: <id>, disposalDate, depreciationEndDate)`**, step 5: status updates for disposals. Mirror endpoints `POST /api/v1/mark-as-sold/fixed-assets` (sale) / `POST /api/v1/discard-fixed-assets/{id}` (scrap).
- **`calculate(type: 'asset-disposal', ...)`**, then `create_capsule` + `create_journal` with `capsuleResourceId`, step 5: per disposal identified during review (see the `asset-disposal` recipe).
- **`bulk_update_journals(items: [{resourceId: <id>, saveAsDraft: false}, ...])`**, step 5 / 6: finalize disposal journals + any pending DDB / 150DB depreciation DRAFTs posted from a `depreciation` schedule.

### Calculators (cross-check, no API key needed)
- **`clio calc depreciation --cost --salvage --life --method --frequency annual --json`**: step 4 per-asset cross-check.
- **`clio calc asset-disposal`**: step 5 per-disposal gain/loss (the CLI form of `calculate(type: 'asset-disposal', ...)`).

### Cross-references
- Run as part of year-end; the FA review feeds audit-prep + Form C-S capital allowances.
- Sibling jobs: `audit-prep.md` step 8 (auditor reviews FA register + recon summary), `month-end-close.md` step 9 (monthly depreciation; this job is the periodic comprehensive review).
- Calculator types used: `asset-disposal`, `depreciation` (DDB / 150DB). See the transaction-recipes skill for the pattern.
- API rules: `jaz-api/SKILL.md` rules 91-92c (fixed-asset endpoints).

---

## Steps

Walk steps 1-8 below.

## Step 1: Enumerate FAs

```
search_fixed_assets(filter: {status: {in: ['ACTIVE', 'DISPOSED', 'DISCARDED']}}, limit: 200, sortBy: 'purchaseDate', sortOrder: 'ASC')
```

Paginate via offset. For year-end review: include DISPOSED and DISCARDED (disposed during the year are part of the recon).

## Step 2: Identify candidates for review

For each ACTIVE asset, flag for practitioner attention:
- **Fully depreciated** (`NBV == salvageValue` per FA summary): consider disposal if no longer in use; consider impairment review per IAS 36 if NBV > recoverable amount.
- **Recently acquired without `effectiveLife`**: depreciation can't run; halt and surface.
- **Pre-flagged by the user as a disposal candidate**: act on it.
- **Damaged / no longer in use** (per practitioner inspection): write off.
- **Mid-life disposals** (sold or traded in during the period): per step 5.

## Step 3: FA register reconciliation

```
generate_fixed_assets_summary(primarySnapshotStartDate: '2025-01-01', primarySnapshotEndDate: '2025-12-31', groupBy: 'CATEGORY')
generate_fixed_assets_reconciliation_summary(primarySnapshotStartDate: '2025-01-01', primarySnapshotEndDate: '2025-12-31')
```

Keep both the FA summary and the recon summary. Assert per FA category:
- `closingNbv == openingNbv + additions - disposals - depreciation` (the recon formula).
- Sum of per-asset NBV in the register equals TB `<FA cost> - <Accumulated Depreciation>` line for that category.

If mismatch beyond the materiality threshold: investigate via `generate_general_ledger(accountResourceIds: [<FA category cost GL>], startDate, endDate)`. Common: a disposal journal was posted but the step 5 `mark_fixed_asset_sold` / `discard_fixed_asset` was missed; Jaz continues auto-depreciating.

## Step 4: Depreciation cross-check

For each ACTIVE SL asset (Jaz auto-depreciates):
- Pull FA's expected annual depreciation: `(purchaseAmount - depreciableValueResidualAmount) / (effectiveLife / 12)`.
- Compare to actual `generate_general_ledger(accountResourceIds: [<Depreciation Expense for this category>], startDate: <year-start>, endDate: <year-end>)` movement.
- Should match within rounding ($0.12 tolerance for full-year SL).

For each ACTIVE DDB / 150DB asset (depreciated by journals you post from a `depreciation` schedule, see the `depreciation` recipe):
- Per capsule: the 12 monthly DRAFT depreciation journals should already be FINALIZED via the monthly close. This cannot be verified with a filter: journals cannot be searched by capsule or fixed asset (measured 2026-09-07; `get_journal` on one journal does return its `capsule`), so report the capsule and its `totalTransactions` count for the practitioner to check, rather than searching by date.
- If the practitioner identifies remaining DRAFTs, finalize those specific resourceIds with `bulk_update_journals(items: [{resourceId: <id>, saveAsDraft: false}, ...])`, never a set collected by an unscoped search.

Cross-check via `clio calc depreciation --frequency annual --json` per asset; auditor will sample-test.

## Step 5: Process disposals

For each disposal identified in step 2:

```
calculate(type: 'asset-disposal', cost, salvageValue, usefulLifeYears, acquisitionDate, disposalDate, proceeds, method)
```

The calculator returns the accumulated depreciation, net book value and gain or loss; it posts nothing. These assets are in the register, and the register books a disposal itself, so do NOT also post the calculator's full disposal journal (that books the disposal twice). Use its figures as the cross-check.

```
// Sale: post the proceeds as the sale entry (the credit line must be on the asset's fixed-asset account), then mark sold against that line
create_capsule(capsuleTypeResourceId: <Asset Disposal type id, from list_capsule_types>, title: <blueprint.capsuleName>)
create_journal(valueDate: <disposalDate>, autoReference: true, journalEntries: [Dr <bank> proceeds, Cr <asset account> proceeds], saveAsDraft: false, capsuleResourceId: <capsule id>)
mark_fixed_asset_sold(resourceId: <asset id>, depreciationEndDate, assetDisposalGainLossAccountResourceId, saleBusinessTransactionType: 'JOURNAL_MANUAL', saleItemResourceId: <the journal's credit line id>)
// Write-off with no sale: no journal
discard_fixed_asset(resourceId: <asset id>, disposalDate, depreciationEndDate)
```

Full walk-through, including an asset that is not in the register: the `asset-disposal` recipe.

For scrap / write-off (no proceeds): `discard_fixed_asset(...)`; its own description is "Discard (write off) a fixed asset". There is no `WRITTEN_OFF` status; the declared set is ACTIVE, ONGOING, COMPLETED, DRAFT, DISPOSED, SOLD, DISCARDED, CLOSED_OUT.

## Step 6: Write-off of fully depreciated unused assets

For assets at salvage value AND no longer in use:
- If salvage value > 0 and asset is to be retained at salvage: leave ACTIVE; no further depreciation.
- If salvage value > 0 and asset is to be scrapped: run step 5 with `proceeds: 0` → loss = salvage value.
- If salvage value = 0 and asset is to be scrapped: minimal P&L impact; the step 5 disposal journal is still required to clear the cost + accumulated depreciation balances against each other.

## Step 7: Per-category GL reconciliation

For each FA category (e.g., Vehicles, Office Equipment, Computers, Buildings):
```
generate_general_ledger(accountResourceIds: [<FA cost GL>], startDate: '2025-01-01', endDate: '2025-12-31', groupBy: 'ACCOUNT')
```

Group by capsule shows per-asset / per-disposal trail. Auditor sample-test will pick 2-3 assets per category and trace GL → original purchase bill → FA registration → depreciation history → disposal (if any).

## Step 8: Save register snapshot

Keep, for the review:
- the per-asset detail (FA summary)
- the recon (opening / additions / disposals / depreciation / closing)
- the per-category capsule-grouped GL
- the list of disposals processed during the review, with capsule + journal references

These feed `audit-prep.md` step 8 supporting schedules.

---

## Common error classes and recovery

| Source | Error | Recovery |
|--------|-------|----------|
| Step 1 | `search_fixed_assets` returns more than the page limit | Paginate via `offset`. Most SMBs have <100 FAs. |
| Step 3 | Recon doesn't tie | Disposed asset still ACTIVE in register (posting the disposal journal does not update the FA register; that is a separate call). Audit each disposal's status. |
| Step 4 | DDB / 150DB DRAFTs unfinalized | Likely a missed monthly close. Finalize the current ones and surface to the user; the auditor will otherwise see 12 months' depreciation in one period. |
| Step 4 | SL depreciation off by > $0.12 | A monthly depreciation period was skipped (asset created mid-month with mis-aligned `depreciationStartDate`). Reconcile per asset. |
| Step 5 (`mark_fixed_asset_sold` / `discard_fixed_asset`) | 422 `pending_depreciation_journals` | DRAFT depreciation journals exist for periods after disposal date. **Do not select these with a filter**: journals cannot be narrowed to one fixed asset (`JournalFilter` has no `fixedAssetResourceId`, and a journal row carries no asset link), so a date+status search returns every DRAFT in the org and `delete_journal` over it would destroy unrelated work. Surface the asset and the blocking periods to the practitioner and let them identify the journals, then retry. |
| Step 6 | Trying to dispose an FA at NBV = 0 with no proceeds | The calculator still works but the journal only clears cost against accumulated depreciation, with no P&L effect. May be skippable; surface to practitioner. |

---

## Cross-references

- `year-end-close.md`: runs this job for the year-end FA review; ask the user for any pre-flagged disposal candidates.
- `audit-prep.md` step 8: consumes the snapshot files for the audit pack.
- SG Form C-S statutory filing (see the SG Form C-S section in `SKILL.md`): capital allowances computation reads from the FA register; this job's reconciliation must be clean before the tax computation.
- `month-end-close.md` step 9: monthly depreciation (Jaz auto-SL + DDB journals from the `depreciation` calculator); this job is the periodic comprehensive register review (typically annual).
- Calculator types: `asset-disposal` (per-disposal), `depreciation` (per-DDB-asset).
