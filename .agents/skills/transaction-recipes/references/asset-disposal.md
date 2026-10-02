# Recipe: Asset Disposal (calculator type: `asset-disposal`)

> One-shot recipe for fixed-asset disposal under IAS 16.67-72 (sale, scrap, write-off). One disposal journal, plus the fixed-asset register update that stops depreciation. The calculator returns the accumulated depreciation, net book value, gain or loss and the journal lines; you post the journal and update the register yourself (see `building-blocks.md` § The three-step flow).

## Tools and calculator this recipe uses

### Calculator (offline, posts nothing)
- **MCP: `calculate(type: 'asset-disposal', cost, salvageValue, usefulLifeYears, acquisitionDate, disposalDate, proceeds, method, currency)`** (step 1). `method` is `sl` (the default), `ddb` or `150db`.
- **CLI: `clio calc asset-disposal --cost <c> --salvage <s> --life <years> --acquired <YYYY-MM-DD> --disposed <YYYY-MM-DD> --proceeds <p> --method <sl|ddb|150db> --currency <code> --json`** (step 1): the same result.

### Posting tools
- **`list_capsule_types` / `create_capsule_type(displayName: 'Asset Disposal')` / `create_capsule(...)`** (step 3).
- **`create_journal(...)`** (step 4): the disposal journal.
- **`mark_fixed_asset_sold(...)`** for a sale (it links the sale transaction and records gain/loss) or **`discard_fixed_asset(...)`** for a write-off (step 5). A disposal is its own operation, never a `status` change via `update_fixed_asset`.

### Lookup and verification tools
- **`get_fixed_asset(resourceId: <id>)`** (step 1): the asset's registered cost, purchase date and net book value. Use the live FA-register values; the auditor wants those, not a cached estimate.
- **`generate_fa_summary(primarySnapshotStartDate: <FY-start>, primarySnapshotEndDate: <disposalDate>, groupBy: 'CATEGORY')`** (step 1 alt): NBV from Jaz's running FA register. If this matches your independent calculation, use it as the authoritative NBV. If they diverge: investigate (likely a missing depreciation journal).
- **`search_capsules(filter: {title: {eq: <capsule title>}})`**: step 0 idempotency check. Each disposal is unique; duplicate disposal journals would corrupt the FA register reconciliation.
- **`search_accounts(filter: {name: {in: ['Vehicles', 'Accumulated Depreciation (Vehicles)', 'Gain on Disposal', 'Loss on Disposal']}})`**: step 2.
- **`generate_trial_balance(endDate: <disposalDate>)`** (step 6): verify cost + accumulated depreciation cleared; gain/loss in P&L.

### Cross-references
- Operational context: invoked during year-end close (FA disposals discovered during the year-end review) or ad-hoc during month-end close if a disposal happens mid-period.
- Sibling: `declining-balance.md` (depreciation up to the disposal date; the disposal calculator recomputes it from the same inputs); `capital-wip.md` (the inverse: adding to FA, not disposing).
- IFRS / accounting context: IAS 16.67-72 (derecognition); IAS 16.71 (gain on disposal classified as Other Income, NOT revenue); IAS 16.68 (gain/loss = net proceeds − carrying amount).

---

## Step-by-step

### Step 0: Idempotency check

```
search_capsules(filter: {title: {eq: 'Disposal, Delivery Vehicle (Truck-001), 2026-03-15'}})
```

If a result returns: halt. Disposal capsules are unique per asset+date; duplicates would double-book the disposal.

### Step 1: Pull asset details and calculate

```
get_fixed_asset(resourceId: <FA UUID>)
```

Read the registered values off the record: `purchaseAmount` (cost), `purchaseDate` (epoch milliseconds: convert to a date), `netBookValueAmount`, `status`, and the asset's depreciation settings (life, method, residual value) as registered. Use these as the authoritative inputs to the calculator (don't accept user-provided values blindly; auditor will tie back to the FA register).

```
calculate(
  type: 'asset-disposal',
  cost: 50000,
  salvageValue: 5000,
  usefulLifeYears: 5,
  acquisitionDate: '2023-01-01',
  disposalDate: '2026-03-15',
  proceeds: 18000,
  method: 'sl',
  currency: 'SGD'
)
```

```
clio calc asset-disposal --cost 50000 --salvage 5000 --life 5 --acquired 2023-01-01 --disposed 2026-03-15 --proceeds 18000 --method sl --currency SGD --json
```

Returns `{ monthsHeld: 39, accumulatedDepreciation: 29250, netBookValue: 20750, gainOrLoss: -2750, isGain: false, disposalJournal, blueprint }`. The calculator counts a part month as a full month, so 2023-01-01 to 2026-03-15 is 39 months: `(50000 - 5000) / 60 months × 39 months = 29,250` accumulated; NBV = 50,000 − 29,250 = 20,750; loss = 18,000 − 20,750 = −2,750.

`blueprint.steps`:
- Step 1, `journal`, dated `2026-03-15`, multi-line:
  - Dr Cash / Bank Account 18,000 (proceeds received)
  - Dr Accumulated Depreciation 29,250 (clear contra-asset)
  - Dr Loss on Disposal 2,750 (P&L impact)
  - Cr Fixed Asset (at cost) 50,000 (clear original cost)
- Step 2, `note`: an instruction to update the FA register. For a registered asset the register books the disposal itself, so step 1 is a cross-check, not an entry to post (step 4 below).

For scrap (no proceeds): `proceeds: 0` → `gainOrLoss: -netBookValue` → all loss, and the journal has no cash line.
For a gain (proceeds > NBV): the journal debits Cash, debits Accumulated Depreciation, credits Fixed Asset (at cost), AND credits Gain on Disposal for the difference.

Cross-check with the Jaz FA register: `netBookValueAmount` from `get_fixed_asset` should match the calculator's `netBookValue` within 1 cent. The register depreciates to the posting date it has reached, so a difference of the current month's charge is timing, not error. A larger variance means depreciation is missing or was posted outside the register: resolve it BEFORE posting the disposal.

### Step 2: Resolve accounts and the bank account

The blueprint's account names are labels. Map each to the real account:
- `search_accounts(filter: {name: {in: ['Vehicles', 'Accumulated Depreciation (Vehicles)', 'Gain on Disposal', 'Loss on Disposal']}})`. Suggested classifications: asset → `Non-current Asset`; accum dep → `Non-current Asset` contra; **`Gain on Disposal` → `Other Revenue`** (NOT Operating Revenue per IAS 16.71); `Loss on Disposal` → `Other Expense` (or `Operating Expense`, jurisdiction-specific).

Bank account: `list_bank_accounts()` for the account the proceeds arrive in. For scrap (no proceeds) none is needed, unless there is a disposal cost (e.g., scrap fee paid to a disposal vendor), which is its own `create_cash_out`.

### Step 3: Create the capsule

```
list_capsule_types()
create_capsule(
  capsuleTypeResourceId: <id of 'Asset Disposal'>,
  title: 'Disposal, Delivery Vehicle (Truck-001), 2026-03-15',
  description: <blueprint.capsuleDescription>
)
```

If `Asset Disposal` is not in the list: `create_capsule_type(displayName: 'Asset Disposal')` first.

### Step 4: Book the disposal

Which entries you post depends on whether the asset is in the Jaz fixed-asset register. **Never do both**: the register books a disposal itself, so posting the calculator's full disposal journal and then running a register tool books the disposal twice.

**A. The asset is in the register (the usual case).** Do NOT post the calculator's disposal journal. Its figures are your cross-check.

*Sale (proceeds received).* Jaz requires a sale entry to exist before an asset can be marked sold: an invoice line on the asset's account, or a journal whose CREDIT line is on the asset's fixed-asset account. Post the proceeds as that entry, then mark the asset sold against the credit line:

```
create_journal(
  valueDate: '2026-03-15',
  reference: 'DISP-TRUCK-001',
  journalEntries: [
    { accountResourceId: <bank account>, type: 'DEBIT', amount: 18000, description: 'Proceeds, Truck-001' },
    { accountResourceId: <Vehicles>, type: 'CREDIT', amount: 18000, description: 'Sale of Truck-001' }
  ],
  saveAsDraft: true,
  capsuleResourceId: <capsule id>
)
```

Finalize when the practitioner confirms (`update_journal(resourceId: <journal id>, saveAsDraft: false)`), read the credit line's id with `get_journal`, then:

```
mark_fixed_asset_sold(
  resourceId: <FA UUID>,
  depreciationEndDate: '2026-03-15',
  assetDisposalGainLossAccountResourceId: <Gain / Loss on Disposal>,
  saleBusinessTransactionType: 'JOURNAL_MANUAL',
  saleItemResourceId: <the journal's credit line id>
)
```

`saleBusinessTransactionType` is the kind of document that recorded the sale (`JOURNAL_MANUAL` here; `SALE` for an invoice line; `PURCHASE` for a trade-in) and `saleItemResourceId` is the LINE on that document, not the document's id. A sale entry can be linked to one asset sale only.

*Scrap / write-off (no proceeds).* No journal at all:

```
discard_fixed_asset(resourceId: <FA UUID>, disposalDate: '2026-03-15', depreciationEndDate: '2026-03-15')
```

Either tool records the final depreciation up to `depreciationEndDate` and the disposal entry (cost and accumulated depreciation cleared, gain or loss to the account you passed).

CLI equivalents:
```bash
clio fixed-assets sell --id <FA UUID> --depreciation-end-date 2026-03-15 --gain-loss-account <account id> --sale-type JOURNAL_MANUAL --sale-item <journal credit line id> --json
clio fixed-assets discard <FA UUID> --disposal-date 2026-03-15 --depreciation-end-date 2026-03-15 --json
```

After it: `get_fixed_asset(resourceId: <id>)` should return `status: 'DISPOSED'`. A disposal made in error is reversed with `undo_fixed_asset_disposal`.

**B. The asset was never in the register** (for example one depreciated by declining-balance journals, see `declining-balance.md`). There is no register to update, so the calculator's journal is the whole disposal:

```
create_journal(
  valueDate: '2026-03-15',
  reference: 'DISP-TRUCK-001',
  journalEntries: [
    { accountResourceId: <bank account>, type: 'DEBIT', amount: 18000, description: 'Proceeds, Truck-001' },
    { accountResourceId: <Accumulated Depreciation (Vehicles)>, type: 'DEBIT', amount: 29250, description: 'Clear accumulated depreciation' },
    { accountResourceId: <Loss on Disposal>, type: 'DEBIT', amount: 2750, description: 'Loss on disposal' },
    { accountResourceId: <Vehicles>, type: 'CREDIT', amount: 50000, description: 'Clear cost' }
  ],
  saveAsDraft: true,
  capsuleResourceId: <capsule id>
)
```

It is a DRAFT; finalize when the practitioner confirms.

### Step 5: Trade-in (proceeds + replacement asset)

1. Dispose of the old asset as in step 4, with `proceeds: <fair value of the trade-in credit>`.
2. `create_fixed_asset(...)` for the new asset with cost = cash paid + trade-in credit (the trade-in is part-payment).

### Step 6: Verify

```
generate_trial_balance(endDate: '2026-03-15')
```

Assert:
- `balance['Vehicles']` reduced by 50,000 (cost cleared), once.
- `balance['Accumulated Depreciation (Vehicles)']` reduced by 29,250 (contra-asset cleared), once.
- `balance['Cash / Bank Account']` increased by 18,000.
- `balance['Loss on Disposal'] (period MTD) == 2,750` (or Gain on Disposal of `gainOrLoss` if positive).

**Compare with the calculator.** For a registered asset the gain or loss the register booked should match the calculator's `gainOrLoss`; a difference of one month's depreciation is the month convention (the calculator counts a part month as a full month), anything larger needs explaining before the period closes.

**Check for a double count.** If the cost, accumulated depreciation or gain/loss moved by twice the expected amount, a full manual disposal journal was posted for an asset the register also disposed of: pull `generate_general_ledger(accountResourceIds: [<Vehicles>], startDate: <disposalDate>, endDate: <disposalDate>)`, show the practitioner both entries, and remove the manual one.

```
get_fixed_asset(resourceId: <FA UUID>)
```
Should now show `status: 'DISPOSED'`, and no further depreciation auto-posting.

```
generate_fa_recon_summary(primarySnapshotStartDate: <FY-start>, primarySnapshotEndDate: <FY-end>)
```
Should reflect the disposal in the year's movement: `openingNbv − depreciation − disposals == closingNbv`.

---

## Common problems and recovery

| Where | Problem | Recovery |
|--------|-------|----------|
| Calculator | "Disposal date must be after acquisition date." | Inputs swapped. Verify and re-run. |
| Calculator | Disposal date later than the period being closed | The disposal belongs to the next period; halt and confirm with the practitioner. |
| Step 2 | `Gain on Disposal` / `Loss on Disposal` is missing | Create via `create_account(accountType: 'Other Revenue' / 'Other Expense', ...)`. |
| Step 5 register update missed | (process error: Jaz FA continues auto-depreciating) | Surface to practitioner: "Asset `<name>` (resourceId `<id>`) is still ACTIVE in FA register but disposal journal posted. Auto-depreciation will continue. Run `mark_fixed_asset_sold` (sale) or `discard_fixed_asset` (write-off) immediately." |
| `mark_fixed_asset_sold` / `discard_fixed_asset` | Refused because depreciation is pending after the disposal date | DRAFT depreciation journals exist for periods after the disposal date. Identify them by their references (journals cannot be filtered by capsule) and confirm the set with the practitioner, then `delete_journal` per confirmed journal. |
| Cross-check | Calculator NBV ≠ FA register NBV | Investigate missing depreciation (period journals posted as DRAFT that were never finalized). Finalize all up to the disposal date BEFORE this recipe. |
| Calculator NBV ≠ TB Vehicles − TB Accum Dep | (audit failure) | Likely a manual journal touched Vehicles or Accum Dep outside the depreciation schedule. Audit `generate_general_ledger(accountResourceIds: [<Vehicles>], startDate: <acquisition date>, endDate: <today>)`. |

---

## Variations

- **Scrap (no proceeds)**: `proceeds: 0`. Resulting `gainOrLoss = -netBookValue` (full NBV is loss). Step 5 uses `discard_fixed_asset`, not `mark_fixed_asset_sold`.
- **Donation**: `proceeds: 0`, but classify the loss as `Charitable Donation` (not `Loss on Disposal`) per practitioner judgment. May have tax implications (deductible donation); flag to practitioner for SG IRAS / PH BIR treatment.
- **Insurance write-off after damage**: `proceeds: <insurance payout>`. The payout is taxable income; the loss may be deductible. Document the insurance reference in the journal narrative.
- **Trade-in**: this recipe for the old asset, plus `create_fixed_asset` for the new one, plus a manual reconciliation of the trade-in credit.
- **Partial disposal** (e.g., dismantling part of a building): NOT supported by the calculator. Manual journal: pro-rate cost + accum dep based on the disposed portion.
- **Disposal of a fully depreciated asset (NBV = 0)**: `proceeds > 0` → all gain. `proceeds == 0` → no entries needed in P&L; just clear the contra-asset against the cost (Dr Accum Dep / Cr Vehicles, both at full cost). The calculator still works; gain/loss = proceeds.
- **Foreign-currency proceeds**: pass `currency: 'USD'`. Per `jaz-api/SKILL.md` rule 25, journal records via `currency: { sourceCurrency: 'USD' }`. FX gain/loss between disposal-date rate and book rate is auto-handled by Jaz on the cash side.

---

## Cross-references

- Year-end close: FA disposals discovered during the year-end review trigger this recipe per asset.
- Month-end close: ad-hoc invocation when a disposal happens mid-period.
- `audit-prep.md` step 8: supporting schedule via `search_capsules(filter: {status: {eq: 'ACTIVE'}})` then narrow by date on the rows (**do not filter capsules by date**: `startDate`/`endDate` are declared on `CapsuleFilter` and pass validation, but every form of them answers `500 Internal Server Error` (measured 2026-09-07: `{gte}`, `{between}`, and `{gte}`+`{lte}` all 500)) plus per-capsule recompute via `clio calc asset-disposal`. Auditor tests proceeds against bank statements, NBV against FA register.
- `fa-review.md` job: annual FA register review identifies candidates for disposal (assets fully depreciated, assets no longer in use, assets damaged) → follow this recipe per identified disposal.
- Sibling recipe `declining-balance.md`: depreciation up to the disposal date; finalize all DRAFT depreciation journals BEFORE this recipe so NBV is correct.
