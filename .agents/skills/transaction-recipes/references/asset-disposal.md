# Recipe: Asset Disposal (engine name: `asset-disposal`)

> One-shot recipe for fixed-asset disposal under IAS 16.67-72 (sale, scrap, write-off). Engine emits 1 disposal journal + 1 note (manual FA-register update). The note step is engine-SKIPPED — practitioner invokes the right Jaz FA endpoint manually after `execute_recipe`.

## Tools, recipes, calculators this recipe uses

### Recipe engine entry point
- **`plan_recipe(recipe: 'asset-disposal', ...)`** — used in step 2: returns RecipePlan with the disposal journal (Dr Cash + Dr Accumulated Depreciation + Dr/Cr Loss/Gain on Disposal / Cr Fixed Asset Cost) and a note step.
- **`execute_recipe(recipe: 'asset-disposal', ...)`** — used in step 4: posts the disposal journal. The note step is SKIPPED (engine surfaces it in `summary.notes` for the practitioner to action manually).

### Calculator (cross-check, no API key needed)
- **`clio calc asset-disposal --cost <c> --salvage <s> --life <years> --acquired <YYYY-MM-DD> --disposed <YYYY-MM-DD> --proceeds <p> --method <sl|ddb|150db> --currency <code> --json`** — used in step 1: computes accumulated depreciation to disposal date, net book value, gain/loss. Returns `{ accumulatedDepreciation, netBookValue, proceeds, gainOrLoss, classification: 'gain' | 'loss' }`.

### Tools (jaz-api / direct)
- **`get_fixed_asset(resourceId: <id>)`** — step 1: pull the asset's actual `cost`, `acquisitionDate`, `usefulLifeMonths`, `depreciationMethod`, `salvageValue` to feed the calculator (don't trust CLIENT.md — auditor wants the FA-register values).
- **`generate_fa_summary(period_end: <disposalDate>)`** — step 1 alt: pull NBV directly from Jaz's running FA register. If this matches your independent calc, use it as the authoritative NBV. If they diverge: investigate (likely a missing depreciation journal).
- **`search_capsules(filter: {capsuleType: {eq: 'Asset Disposal'}, name: {eq: <capsule.name>}})`** — step 0 idempotency check. Each disposal is unique; duplicate disposal journals would corrupt the FA register reconciliation.
- **`search_accounts(filter: {name: {in: ['Vehicles', 'Accumulated Depreciation — Vehicles', 'Gain on Disposal', 'Loss on Disposal']}})`** — step 3.
- **`update_fixed_asset(resourceId: <id>, status: 'DISPOSED' | 'WRITTEN_OFF')`** OR **`POST /api/v1/mark-as-sold/fixed-assets`** OR **`POST /api/v1/discard-fixed-assets/{id}`** — step 5 manual FA-register update (the engine-skipped note step).
- **`generate_trial_balance(period_end: <disposalDate>)`** — step 6: verify cost + accumulated depreciation cleared; gain/loss in P&L.

### Cross-references
- Within an engagement: invoked from `practice/references/annual-statutory.md` step 4b (FA disposals discovered during year-end review) or ad-hoc from `practice/references/monthly-close.md` if disposal happens mid-period.
- Sibling: `declining-balance.md` (depreciation up to the disposal date — engine handles this internally via the calculator); `capital-wip.md` (the inverse — adding to FA, not disposing).
- IFRS / accounting context: IAS 16.67-72 (derecognition); IAS 16.71 (gain on disposal classified as Other Income, NOT revenue); IAS 16.68 (gain/loss = net proceeds − carrying amount).

---

## Step-by-step

### Step 0 — Idempotency check

```
search_capsules(filter: {capsuleType: {eq: 'Asset Disposal'}, name: {eq: 'Disposal — Delivery Vehicle (Truck-001) — 2026-03-15'}})
```

If a result returns: halt. Disposal capsules are unique per asset+date — duplicates would double-book the disposal.

### Step 1 — Pull asset details + independent cross-check

```
get_fixed_asset(resourceId: <FA UUID>)
```

Returns: `{ resourceId, name, cost: 50000, acquisitionDate: '2023-01-01', usefulLifeMonths: 60, depreciationMethod: 'sl', salvageValue: 5000, status: 'ACTIVE', capsuleResourceId: <originating cap if any> }`. Use these as the authoritative inputs to the calculator (don't accept user-provided values blindly — auditor will tie back to the FA register).

```
clio calc asset-disposal --cost 50000 --salvage 5000 --life 5 --acquired 2023-01-01 --disposed 2026-03-15 --proceeds 18000 --method sl --currency SGD --json
```

Returns: `{ accumulatedDepreciation: 28500, netBookValue: 21500, proceeds: 18000, gainOrLoss: -3500, classification: 'loss' }`. (`(50000 - 5000) / 60 months × 38 months elapsed = 28,500` accumulated; NBV = 50,000 − 28,500 = 21,500; loss = 18,000 − 21,500 = −3,500).

Cross-check with Jaz FA register:
```
generate_fa_summary(period_end: '2026-03-15', fixedAssetResourceId: <FA UUID>)
```
Should report `accumulatedDepreciation: 28500, netBookValue: 21500` matching the independent calc within 1 cent. Variance investigation: missing monthly depreciation journals (search via `search_journals(filter: {capsuleResourceId: {eq: <dep capsule>}, status: 'DRAFT'})`); finalize them BEFORE disposal recipe.

### Step 2 — Plan the recipe

```
plan_recipe(
  recipe: 'asset-disposal',
  cost: 50000,
  salvageValue: 5000,
  usefulLifeYears: 5,
  acquisitionDate: '2023-01-01',
  disposalDate: '2026-03-15',
  proceeds: 18000,
  method: 'sl',
  currency: 'SGD',
  glAsset: <CLIENT.coa_mapping['Vehicles']>,
  glAccumDep: <CLIENT.coa_mapping['Accumulated Depreciation — Vehicles']>,
  glGainOnDisposal: <CLIENT.coa_mapping['Gain on Disposal']>,
  glLossOnDisposal: <CLIENT.coa_mapping['Loss on Disposal']>,
  bankAccountResourceId: <CLIENT.bank_accounts[i].jaz_resource_id>,
  fixedAssetResourceId: <FA UUID>,
  capsuleType: 'Asset Disposal',
  capsuleName: 'Disposal — Delivery Vehicle (Truck-001) — 2026-03-15'
)
```

Returns `RecipePlan` with `requiredAccounts: ['Vehicles', 'Accumulated Depreciation — Vehicles', 'Loss on Disposal' (since classification: 'loss'), 'Cash / Bank Account']`, `needsContact: false`, `needsBankAccount: true` (proceeds receipt), `steps`:
- Step 1: disposal journal — multi-line:
  - Dr Cash / Bank Account 18,000 (proceeds received)
  - Dr Accumulated Depreciation — Vehicles 28,500 (clear contra-asset)
  - Dr Loss on Disposal 3,500 (P&L impact)
  - Cr Vehicles 50,000 (clear original cost)
- Step 2: NOTE step — `Update Jaz FA register: use POST /mark-as-sold/fixed-assets (if sold) or POST /discard-fixed-assets/:id (if scrapped).` Engine SKIPS this; practitioner handles manually in step 5.

For scrap (no proceeds): `proceeds: 0` → `gainOrLoss: -netBookValue` → all loss.
For gain (proceeds > NBV): engine debits Cash, debits Accum Dep, credits Vehicles, AND credits Gain on Disposal for the difference.

### Step 3 — Resolve dependencies

For each account in `requiredAccounts`:
- `search_accounts(filter: {name: {eq: <accountName>}})`. Suggested classifications: asset → `Non-Current Asset`; accum dep → `Non-Current Asset` contra; **`Gain on Disposal` → `Other Revenue`** (NOT Operating Revenue per IAS 16.71); `Loss on Disposal` → `Other Expense` (or `Operating Expense`, jurisdiction-specific).

Bank account: resolve via `list_bank_accounts()` if `CLIENT.bank_accounts[i].jaz_resource_id` is empty. For scrap (no proceeds): `bankAccountResourceId` is required only if there's a disposal-cost cash-out (e.g., scrap fee paid to disposal vendor) — pass it for safety even if proceeds are zero.

### Step 4 — Execute

```
execute_recipe(recipe: 'asset-disposal', ...same args...)  // accounts auto-resolved from CoA; pass `bankAccountName` / `contactName` for fuzzy resolve
```

Returns: `{ capsule: {resourceId, type, title}, steps: [{step: 1, action: 'journal', status: 'created', resourceId: <journal id>}, {step: 2, action: 'note', status: 'skipped'}], summary: {total: 2, created: 1, skipped: 1, notes: ['Step 2 (note): Update Jaz FA register: use POST /mark-as-sold/fixed-assets (if sold) or POST /discard-fixed-assets/:id (if scrapped).'] } }`.

The disposal journal is DRAFT. Finalize when ready: `update_journal(resourceId: <journal id>, saveAsDraft: false)`.

### Step 5 — Manual FA register update (CRITICAL)

The engine cannot auto-update the FA register status — practitioner MUST do this manually. Without this step, the FA register will continue to show the asset as `ACTIVE` and Jaz will continue to auto-post depreciation journals (for SL assets), corrupting the disposal.

Pick the right endpoint based on disposal type:

**Sale (proceeds received):**
```
POST /api/v1/mark-as-sold/fixed-assets
{
  fixedAssetResourceId: <FA UUID>,
  disposalDate: '2026-03-15',
  proceeds: 18000,
  notes: 'Sold to <buyer>; capsule <capsuleResourceId>'
}
```
OR equivalent MCP tool if exposed: `update_fixed_asset(resourceId: <id>, status: 'DISPOSED', disposalDate: '2026-03-15', disposalProceeds: 18000)`.

**Scrap / write-off (no proceeds, asset destroyed/donated):**
```
POST /api/v1/discard-fixed-assets/<FA UUID>
{
  disposalDate: '2026-03-15',
  notes: 'Scrapped; capsule <capsuleResourceId>'
}
```
OR `update_fixed_asset(resourceId: <id>, status: 'WRITTEN_OFF', disposalDate: '2026-03-15')`.

**Trade-in (proceeds + replacement asset):**
1. First: invoke this recipe with `proceeds: <fair value of trade-in credit>` for the disposal of the old asset.
2. Then: `create_fixed_asset(...)` for the new asset with cost = cash paid + trade-in credit (the trade-in is part-payment).

After the FA-register update: `get_fixed_asset(resourceId: <id>)` should return `status: 'DISPOSED'` (or `'WRITTEN_OFF'`).

### Step 6 — Verify

```
generate_trial_balance(period_end: '2026-03-15')
```

Assert:
- `balance['Vehicles']` reduced by 50,000 (cost cleared).
- `balance['Accumulated Depreciation — Vehicles']` reduced by 28,500 (contra-asset cleared).
- `balance['Cash / Bank Account']` increased by 18,000.
- `balance['Loss on Disposal'] (period MTD) == 3,500` (or Gain on Disposal of `gainOrLoss` if positive).

```
generate_fa_summary(period_end: '2026-03-15', fixedAssetResourceId: <FA UUID>)
```
Should now show `status: 'DISPOSED'`, NBV = 0, no further depreciation auto-posting.

```
generate_fa_recon_summary(period_start: <FY-start>, period_end: <FY-end>)
```
Should reflect the disposal in the year's movement: `openingNbv − depreciation − disposals == closingNbv`.

---

## Common error classes and recovery

| Source | Error | Recovery |
|--------|-------|----------|
| `plan_recipe` | 422 `disposal_after_period_end` | `disposalDate` later than the engagement's `<period_end>`. Disposal belongs to next period; halt and confirm with practitioner. |
| `plan_recipe` | 422 `acquisition_after_disposal` | Inputs swapped. Verify and re-run. |
| `execute_recipe` | 422 `account_not_found` for `Gain on Disposal` / `Loss on Disposal` | Step 3 incomplete. Create via `create_account(accountType: 'Other Revenue' / 'Other Expense', ...)`. |
| Step 5 manual update missed | (process error — Jaz FA continues auto-depreciating) | Surface to practitioner: "Asset `<name>` (resourceId `<id>`) is still ACTIVE in FA register but disposal journal posted. Auto-depreciation will continue. Run `update_fixed_asset(status: 'DISPOSED')` immediately." |
| `update_fixed_asset` to DISPOSED | 422 `pending_depreciation_journals` | DRAFT depreciation journals exist for periods after disposal date. Delete them: `search_journals(filter: {fixedAssetResourceId: <id>, valueDate: {gt: '<disposal>'}, status: 'DRAFT'})` then `delete_journal` per result. |
| Cross-check | Calculator NBV ≠ FA register NBV | Investigate missing depreciation journals (recipe pre-emitted DRAFTs that weren't finalized monthly). Finalize all up to disposal date BEFORE running this recipe. |
| Recipe NBV ≠ TB Vehicles − TB Accum Dep | (audit failure) | Likely a manual journal touched Vehicles or Accum Dep without going through the recipe. Audit `generate_general_ledger(accountResourceId: <Vehicles>, period_end: <today>)`. |

---

## Variations

- **Scrap (no proceeds)**: `proceeds: 0`. Resulting `gainOrLoss = -netBookValue` (full NBV is loss). Step 5 uses `discard-fixed-assets` not `mark-as-sold`.
- **Donation**: `proceeds: 0`, but classify the loss as `Charitable Donation` (not `Loss on Disposal`) per practitioner judgment. May have tax implications (deductible donation) — flag to practitioner for SG IRAS / PH BIR treatment.
- **Insurance write-off after damage**: `proceeds: <insurance payout>`. The payout is taxable income; the loss may be deductible. Document the insurance reference in the journal narrative.
- **Trade-in**: 2 recipe invocations (this one for old asset, plus `create_fixed_asset` for new) plus a manual reconciliation of the trade-in credit.
- **Partial disposal** (e.g., dismantling part of a building): NOT supported by this recipe. Manual journal — pro-rate cost + accum dep based on the disposed portion.
- **Disposal of a fully depreciated asset (NBV = 0)**: `proceeds > 0` → all gain. `proceeds == 0` → no entries needed in P&L; just clear the contra-asset against the cost (Dr Accum Dep / Cr Vehicles, both at full cost). Recipe still works; gain/loss = proceeds.
- **Foreign-currency proceeds**: pass `currency: 'USD'`. Per `jaz-api/SKILL.md` rule 25, journal records via `currency: { sourceCurrency: 'USD' }`. FX gain/loss between disposal-date rate and book rate is auto-handled by Jaz on the cash side.

---

## Cross-references back to engagements

- `practice/references/annual-statutory.md` step 4b — FA disposals discovered during year-end review trigger this recipe per asset.
- `practice/references/monthly-close.md` — ad-hoc invocation when a disposal happens mid-period; practice playbook adds the new disposal capsule to the engagement journal.
- `audit-prep.md` step 8 — supporting schedule via `search_capsules(filter: {capsuleType: {eq: 'Asset Disposal'}, valueDate: {between: [<FY-start>, <FY-end>]}})` plus per-capsule recompute via `clio calc asset-disposal`. Auditor tests proceeds against bank statements, NBV against FA register.
- `fa-review.md` job — annual FA register review identifies candidates for disposal (assets fully depreciated, assets no longer in use, assets damaged) → invoke this recipe per identified disposal.
- Sibling recipe `declining-balance.md` — depreciation up to the disposal date; complete all DRAFT depreciation finalizations BEFORE running this recipe to ensure NBV is correct.
