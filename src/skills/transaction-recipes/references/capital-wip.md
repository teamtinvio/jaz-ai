# Recipe: Capital Work-in-Progress (CWIP) → Fixed Asset (manual — no engine)

> Multi-month asset construction pattern: accumulate construction costs in `Capital Work-in-Progress` (Non-Current Asset) via bills coded to CWIP, then transfer the accumulated cost to a Jaz native FA on completion. No recipe engine — built from primitive `create_bill` + `create_journal` + `create_fixed_asset`. The CWIP-to-FA transfer triggers Jaz's auto-depreciation (SL).

## Why no engine

CWIP costs accumulate as construction progresses — multiple bills from contractors / suppliers, none of which are predictable in amount or timing. The recipe engine is for KNOWN-shape multi-period flows (loan amortization, lease unwinding); CWIP is INHERENTLY ad-hoc until completion. Once complete, the transfer is a single one-shot journal + FA registration.

## Tools, recipes, calculators this recipe uses

### Primitive MCP tools (no engine wrapper)
- **`create_bill(...)`** — used in step 2 (multiple times during construction): each contractor bill / supplier invoice / permit fee coded to `Capital Work-in-Progress` GL account, NOT to Operating Expense. The asset is BEING BUILT — these are capitalized costs, not period expenses.
- **`create_capsule(capsuleType: 'Capital Projects', ...)`** — step 1: one capsule per construction project, accumulates all bills + the eventual transfer journal.
- **`create_journal(...)`** — step 4: the CWIP-to-FA transfer journal (Dr Fixed Asset / Cr Capital Work-in-Progress).
- **`create_fixed_asset(...)`** — step 4: register the completed asset in Jaz native FA register; from this point forward, Jaz auto-posts SL depreciation.

### Tools (jaz-api / direct)
- **`search_capsules(filter: {capsuleType: {eq: 'Capital Projects'}, name: {eq: <project>}})`** — step 1 idempotency check.
- **`search_accounts(filter: {name: {in: ['Capital Work-in-Progress', '<target FA category>', '<target Accumulated Depreciation>']}})`** — step 0 + step 4.
- **`generate_general_ledger(accountResourceId: <CWIP id>, period_start: <project start>, period_end: <today>)`** — step 3: pull all CWIP entries to confirm the accumulated cost.
- **`search_bills(filter: {capsuleResourceId: {eq: <CWIP capsule id>}})`** — step 3 alt: pull all bills attached to the project capsule.
- **`generate_trial_balance(period_end: <date>)`** — step 5 verify CWIP balance is zero post-transfer; FA balance reflects new asset.

### Cross-references
- Within an engagement: invoked from `practice/references/monthly-close.md` step 7 (per active capital project per `CLIENT.capital_projects[]`); from `practice/references/annual-statutory.md` step 4h (year-end review of CWIP balances — IAS 16.20 capitalization criteria; flag any CWIP not capitalized for > 12 months as potential expense).
- Sibling: `bank-loan.md` (financing the construction often ties together — the loan funds the CWIP); `declining-balance.md` / `asset-disposal.md` for post-capitalization lifecycle.
- IFRS / accounting context: IAS 16.16-22 (cost components includable in PP&E during construction); IAS 16.23 (capitalization stops when asset is in location and condition for intended use); IAS 23 (borrowing costs eligible for capitalization on qualifying assets).

---

## Step-by-step

### Step 0 — Confirm GL accounts exist

```
search_accounts(filter: {name: {in: ['Capital Work-in-Progress', 'Office Improvements', 'Accumulated Depreciation — Office Improvements']}})
```

`Capital Work-in-Progress` is the holding account. The eventual FA destination (`Office Improvements`, `Buildings`, `Plant & Equipment`, etc.) and its corresponding accumulated depreciation account both need to exist before completion-time transfer.

If `Capital Work-in-Progress` doesn't exist: `create_account(name: 'Capital Work-in-Progress', accountType: 'Non-Current Asset')` first. CRITICAL: classify as Non-Current Asset (not Operating Expense) — the whole point of CWIP is to defer expense recognition.

### Step 1 — Create the project capsule

```
create_capsule(
  capsuleTypeResourceId: <Capital Projects capsule type id>,
  title: 'Office Renovation — Marina One — FY2025 — CAPEX-2025-001',
  description: 'Renovation of Marina One office. Project ref CAPEX-2025-001. Total estimated cost SGD 150,000. Expected completion 2025-04-30.'
)
```

Each construction project gets its own capsule. The capsule is the audit trail — every bill paid for this project, plus the eventual transfer journal, attaches to it. Auditor can pull `search_bills(filter: {capsuleResourceId: {eq: <id>}})` and see the full cost build.

### Step 2 — Accumulate construction costs (multiple bills over months)

For EACH contractor bill / supplier invoice / permit fee received during construction:

```
create_bill(
  contactResourceId: <contractor / supplier>,
  reference: '<contractor invoice number>',
  valueDate: '<actual bill date>',
  lineItems: [{
    name: '<description of work>',
    accountResourceId: <Capital Work-in-Progress GL>,
    amount: <bill amount>,
    quantity: 1
  }],
  capsuleResourceId: <project capsule>,
  saveAsDraft: false
)
```

Critical: `accountResourceId` on the line item points to `Capital Work-in-Progress`, NOT to an operating expense GL. Per IAS 16.16(a)-(c) cost includes:
- Purchase price (less trade discounts)
- Costs directly attributable to bringing the asset to working condition (delivery, installation, professional fees, site preparation, dismantling/removal of existing items being replaced)
- Estimated dismantling / decommissioning costs (if obligation exists per IAS 37 — see `provisions.md` recipe)

Costs NOT capitalizable per IAS 16.19-22:
- Initial operating losses
- Costs of opening a new facility (advertising, training)
- General overhead allocations
- Borrowing costs for non-qualifying assets (qualifying = takes substantial time to ready, per IAS 23.5 — assets typically construction projects qualify)

If the project is FINANCED by a specific loan and qualifies under IAS 23: capitalize the borrowing costs (`Interest Expense`) into CWIP via a journal: Dr Capital Work-in-Progress / Cr Interest Expense for the period's interest. This transfers the interest from P&L to balance sheet during the construction period. Out of scope for this recipe — handled via manual journal.

Pay each bill as normal (`create_bill_payment(...)`). Cash flow for construction is typically lumpy.

### Step 3 — Periodic review during construction

At each month-end during construction:

```
generate_general_ledger(accountResourceId: <CWIP GL>, period_start: <project start>, period_end: <month-end>)
```

Confirm the accumulated CWIP balance matches expectations vs `CLIENT.capital_projects[i].estimated_cost`. Variance > 10% → flag to practitioner for budget review.

```
search_bills(filter: {capsuleResourceId: {eq: <project capsule id>}, status: {ne: 'PAID'}})
```

Identify unpaid bills attached to the project — payment timing matters for cash-flow planning.

### Step 4 — Completion (CWIP → FA transfer)

When construction is COMPLETE per IAS 16.23 — asset is in location and condition for intended use, NOT first revenue or first occupancy:

**4a — Pull final CWIP balance:**

```
generate_general_ledger(accountResourceId: <CWIP GL>, period_end: <completion date>)
```

Note the closing balance — this is the asset's cost on initial recognition (IAS 16.15).

**4b — Post the transfer journal:**

```
create_journal(
  reference: 'CWIP-TRANSFER-CAPEX-2025-001',
  valueDate: '<completion date>',
  journalEntries: [
    {
      accountResourceId: <Office Improvements GL>,
      amount: <final CWIP balance>,
      type: 'DEBIT',
      name: 'Capitalize Marina One renovation on completion'
    },
    {
      accountResourceId: <Capital Work-in-Progress GL>,
      amount: <final CWIP balance>,
      type: 'CREDIT',
      name: 'Transfer to Office Improvements on completion'
    }
  ],
  capsuleResourceId: <project capsule>,
  saveAsDraft: false
)
```

Per `jaz-api/SKILL.md` rules 23-25: journals use `journalEntries` with `amount` + `type: 'DEBIT'|'CREDIT'`; line item field is `name`, not `description`.

**4c — Register as Jaz FA:**

```
create_fixed_asset(
  name: 'Office Renovation — Marina One',
  reference: 'FA-OFFICE-MARINA-2025',
  cost: <final CWIP balance>,
  acquisitionDate: '<completion date>',
  usefulLifeMonths: 60,                  // 5-year SL amortization typical for office reno
  depreciationMethod: 'sl',
  capsuleResourceId: <project capsule>,
  saveAsDraft: false
)
```

`usefulLifeMonths` per `CLIENT.capex_useful_life_matrix[asset-type]` (or practitioner judgment). Common defaults: office renovations 60 months, computer hardware 36 months, motor vehicles 60 months, buildings 240 months.

From this point forward, Jaz auto-posts SL depreciation each month-end. NO manual depreciation journal required.

### Step 5 — Verify

```
generate_trial_balance(period_end: '<completion date>')
```

Assert:
- `balance['Capital Work-in-Progress'] == 0` exactly (transfer cleared the balance).
- `balance['Office Improvements'] == <final CWIP balance>` (asset cost recognized).

```
generate_fa_summary(period_end: '<completion date>', fixedAssetResourceId: <FA UUID>)
```

Should show `cost: <final CWIP balance>, accumulatedDepreciation: 0, NBV: <cost>, status: 'ACTIVE'`. From next month-end onward, NBV reduces by `cost / 60` per month (SL).

Close the project capsule (or keep ACTIVE for traceability — the FA still references it):
```
// Capsule has no `status` field — record closure manually via `update_capsule(title: '<original> [CLOSED]')` or in ENGAGEMENT.md notes
```

---

## Common error classes and recovery

| Source | Error | Recovery |
|--------|-------|----------|
| Step 0 | `Capital Work-in-Progress` doesn't exist as Non-Current Asset | `create_account(accountType: 'Non-Current Asset')`. Common gap in CoAs that haven't done capital projects. |
| Step 2 | Bill posted to Operating Expense instead of CWIP | Reverse via `delete_bill` (if DRAFT) OR `create_supplier_credit_note` + `apply_credit_to_bill` (if ACTIVE). Re-post correctly. AVOID year-end audit headache — auditor will challenge any P&L expense for capital project items. |
| Step 4b | Transfer journal unbalanced | Verify the `amount` on both lines exactly matches the closing CWIP balance from step 4a. Per `jaz-api/SKILL.md` rule 23 — total debits = total credits. |
| Step 4c | `create_fixed_asset` 422 `cost_mismatch` | Cost passed differs from the transfer journal amount. Both must equal CWIP closing balance. Re-pull `generate_general_ledger` and re-confirm. |
| Step 4c | Asset created but Jaz auto-depreciation not running | FA may have been created as DRAFT. `update_fixed_asset(resourceId: <id>, status: 'ACTIVE')`. From next month-end, auto-depreciation runs. |
| Step 5 | CWIP balance nonzero post-transfer | A bill was posted to CWIP AFTER step 4a — common when contractor sends final invoice late. Two options: (a) extend the project (post the late bill, re-do step 4 transfer for the additional amount + create a SECOND FA OR update the existing FA cost via `update_fixed_asset`); (b) expense the late bill directly to operating expense if immaterial. |
| Project abandoned mid-construction | (process — IAS 16.20 / IAS 36.18 impairment) | If asset will not be completed: write off CWIP balance to Loss on Abandoned Project. `create_journal({capsuleResourceId: <project capsule>, tags: ['abandoned', 'impairment'], internalNotes: '<abandonment date + reason + IAS 36.18 cite>', ...})` — the journal carries the abandonment narrative; the capsule already aggregates every bill + this journal as the audit trail. |
| Borrowing costs incorrectly capitalized post-completion | (IAS 23 violation) | Per IAS 23.22, capitalization stops when asset is ready for intended use. Any interest capitalized after completion → expense. Reverse via journal: Dr Interest Expense / Cr Capital Work-in-Progress (or the FA if already transferred). |

---

## Variations

- **Construction in stages** (e.g., warehouse with multiple phases): one capsule per phase. Each phase gets its own CWIP-to-FA transfer + FA registration on its own completion date. Useful when phases come into use at different times.
- **Self-constructed asset** (using own labor + materials, not contractors): same pattern but bills from labor allocations + materials issuances. Per IAS 16.22, do NOT include internal profit margin (use cost not market price).
- **Software development capitalization** (IAS 38 internally generated intangible): different recipe — separate accumulated R&D vs development phase per IAS 38.57. NOT covered by this recipe (use a manual pattern; consider creating a dedicated `Software Development WIP` capsule).
- **Borrowing costs** (IAS 23 qualifying asset): capitalize period interest into CWIP via manual journals during the construction period. Cease capitalization on completion (per step 4 timing).
- **Disposal of replaced item** (e.g., replacing old air-con system as part of renovation): per IAS 16.13 — derecognize the carrying amount of the replaced part. Use `asset-disposal.md` recipe for the OLD AC's NBV write-off as part of the renovation project.
- **Multi-currency CWIP** (e.g., importing equipment): each foreign-currency bill records via `currency: { sourceCurrency: 'USD' }` per `jaz-api/SKILL.md` rule 25. Jaz auto-translates the CWIP balance at each period-end (per IAS 21 — non-monetary item at historical rate, but bills accumulate at their respective historical rates). Post-completion: FA cost is in base currency at the historical rates. NBV stays at historical (non-monetary, not revalued).

---

## Cross-references back to engagements

- `practice/references/monthly-close.md` step 7 — review active CWIP per project; flag any pending completion.
- `practice/references/annual-statutory.md` step 4h — year-end review: any CWIP balance > 12 months without completion should be questioned (auditor will). Either complete the transfer, or impair if abandoned.
- `audit-prep.md` step 8 — supporting schedule: per project capsule, all bills + transfer journal + FA registration. Auditor traces from individual bills → CWIP balance → FA cost.
- `bank-loan.md` — if construction is loan-financed, pair this recipe with the loan recipe; capitalize interest during construction per IAS 23.
- `asset-disposal.md` — when the eventual FA is later disposed (typically many years after construction).
- `provisions.md` — for decommissioning obligations (IAS 16.16(c)) — recognize the present value of dismantling costs as part of CWIP at the start of construction.
