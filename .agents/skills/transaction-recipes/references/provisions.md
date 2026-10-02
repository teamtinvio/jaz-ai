# Recipe: Provisions (IAS 37) (calculator type: `provision`)

> Recipe for IAS 37 provisions where the time value of money is material: warranty obligations, decommissioning, restructuring, onerous contracts, legal claims. One initial recognition journal at present value, N discount-unwinding journals, one settlement cash-out, all in one capsule. You calculate, create the capsule and post each entry yourself (see `building-blocks.md` § The three-step flow).

## Tools and calculator this recipe uses

### Calculator (offline, posts nothing)
- **MCP: `calculate(type: 'provision', amount, annualRate, termMonths, startDate, currency)`** (step 1). `amount` is the undiscounted future outflow.
- **CLI: `clio calc provision --amount <undiscounted total> --rate <annual %> --term <months> --start-date <YYYY-MM-DD> --currency <code> --json`** (step 1): the same result.

### Posting tools
- **`list_capsule_types` / `create_capsule_type(displayName: 'Provisions')` / `create_capsule(...)`** (step 3).
- **`create_journal(...)`** (step 4): the initial recognition, then one per unwinding period. The unwinding charge grows every month, so a fixed-amount schedule does not fit.
- **`create_cash_out(...)`** (step 7): the settlement, posted when the obligation is actually paid.

### Lookup and verification tools
- **`search_capsules(filter: {title: {eq: <capsule title>}})`**: step 0 idempotency check.
- **`search_accounts(filter: {name: {in: ['Provision for Warranties', 'Finance Cost', 'Warranty Expense']}})`**: step 2.
- **`generate_trial_balance(endDate: <date>)`**: step 5 verify the provision balance matches the schedule's `closingBalance`.

### Cross-references
- Operational context: invoked during year-end close (Y5 in `year-end-close.md`) for year-end provision remeasurement, and during month-end close (post or finalize this period's unwinding journal).
- Sibling: `bad-debt-provision.md` (calculator `ecl`, IFRS 9 ECL, simpler one-shot pattern, no PV unwinding); `fixed-deposit.md` (similar PV-unwinding mechanic but for a financial asset).
- IFRS / accounting context: IAS 37.45 (PV when material); IAS 37.59 (use a pre-tax discount rate that reflects current market assessments of time value AND risks specific to the obligation); IAS 37.59 Note (do NOT double-count risks via rate AND cash flow estimates).

---

## Step-by-step

### Step 0: Idempotency check

```
search_capsules(filter: {title: {eq: 'Warranty Provision, FY2025-FY2029'}})
```

If a result returns: halt. Provision capsules are unique per obligation; duplicate setup means double-recognition.

### Step 1: Calculate

```
calculate(
  type: 'provision',
  amount: 500000,
  annualRate: 4,
  termMonths: 60,
  startDate: '2025-01-01',
  currency: 'SGD'
)
```

```
clio calc provision --amount 500000 --rate 4 --term 60 --start-date 2025-01-01 --currency SGD --json
```

Returns `{ presentValue: 409501.55, nominalAmount: 500000, totalUnwinding: 90498.45, initialJournal, schedule: [{ period: 1, date: '2025-02-01', openingBalance: 409501.55, interest: 1365.01, closingBalance: 410866.56, journal }, ...60], blueprint }`. PV formula: `500,000 / (1 + 0.04/12)^60 = 409,501.55`. Each period's unwinding (`interest`) = `openingBalance × monthly rate`; `closingBalance` reaches the undiscounted $500,000 at month 60.

`blueprint.steps` (62):
- Step 1, `journal`, dated `2025-01-01`: initial recognition, Dr Provision Expense 409,501.55 / Cr Provision for Obligations 409,501.55 (recognize at PV).
- Steps 2 to 61, `journal`, dated `2025-02-01` through `2030-01-01`: Dr Finance Cost — Unwinding / Cr Provision for Obligations (per-period unwinding). The provision balance grows from PV to face value over the term.
- Step 62, `cash-out`, dated `2030-01-01`: settlement, Dr Provision for Obligations 500,000 / Cr Cash / Bank Account 500,000.

Save the schedule to `workpapers/<period>/provision-warranty-FY2025.json`.

### Step 2: Resolve accounts

The blueprint's account names are labels. Map each to the real account for this obligation (here a warranty):
- `search_accounts(filter: {name: {in: ['Provision for Warranties', 'Warranty Expense', 'Finance Cost']}})`. Suggested classifications: `Provision for Warranties` → `Non-current Liability` (or `Current Liability` if settlement < 12 months); `Warranty Expense` → `Operating Expense` (P&L, period of recognition); `Finance Cost` → `Operating Expense` or `Other Expense` (jurisdiction-specific; SG often `Other Expense`).

Bank account: only needed for the settlement cash-out at the end of the term.

### Step 3: Create the capsule

```
list_capsule_types()
create_capsule(
  capsuleTypeResourceId: <id of 'Provisions'>,
  title: 'Warranty Provision, FY2025-FY2029',
  description: <blueprint.capsuleDescription>
)
```

If `Provisions` is not in the list: `create_capsule_type(displayName: 'Provisions')` first.

### Step 4: Post the recognition and the unwinding journals

**4a. Initial recognition** (blueprint step 1):

```
create_journal(
  valueDate: '2025-01-01',
  reference: 'PROV-WARRANTY-2025-RECOG',
  journalEntries: [
    { accountResourceId: <Warranty Expense>, type: 'DEBIT', amount: 409501.55, description: 'Initial provision recognition at PV (IAS 37)' },
    { accountResourceId: <Provision for Warranties>, type: 'CREDIT', amount: 409501.55, description: 'Initial provision recognition at PV (IAS 37)' }
  ],
  saveAsDraft: false,
  capsuleResourceId: <capsule id>
)
```

**4b. Unwinding** (blueprint steps 2 to 61). One `create_journal` per step, using that step's amount:

```
create_journal(
  valueDate: '2025-02-01',
  reference: 'PROV-WARRANTY-2025-01',
  journalEntries: [
    { accountResourceId: <Finance Cost>, type: 'DEBIT', amount: 1365.01, description: 'Provision unwinding, month 1 of 60' },
    { accountResourceId: <Provision for Warranties>, type: 'CREDIT', amount: 1365.01, description: 'Provision unwinding, month 1 of 60' }
  ],
  saveAsDraft: true,
  capsuleResourceId: <capsule id>
)
```

Post each month's journal at that month's close, or post all 60 now as drafts and finalize one per month. Agree the cadence with the practitioner; the reference pattern (`PROV-WARRANTY-2025-01` to `-60`) is what finds a month's journal later. A year-end remeasurement (step 6) replaces the remaining periods, which is a reason to post month by month.

Do NOT post the settlement cash-out (blueprint step 62) now. A cash entry posts ACTIVE immediately, and the payment has not happened.

### Step 5: Monthly action (during monthly-close)

Post this period's unwinding journal, or find it by its reference and finalize it:

```
search_journals(filter: {reference: {eq: 'PROV-WARRANTY-2025-03'}})
update_journal(resourceId: <journal id>, saveAsDraft: false)
```

Journals cannot be filtered by capsule, and a date-plus-status search returns every matching DRAFT in the org: never feed one into `bulk_update_journals` or `delete_journal`.

Verify after each period:
- `generate_trial_balance(endDate: <month-end>)`.
- Assert: `balance['Provision for Warranties'] == -schedule[periodIndex].closingBalance` (within 1 cent).
- Assert: `balance['Finance Cost'] (period MTD) == schedule[periodIndex].interest`.

### Step 6: Year-end remeasurement (annual)

Per IAS 37.59, provisions are remeasured at each reporting date for changes in:
- Estimated cash outflow (claim experience changed)
- Discount rate (market rates moved)
- Timing of settlement

If practitioner determines a remeasurement is needed (year-end review):

1. Recompute new PV via `clio calc provision` with updated inputs.
2. Compare against current carrying amount from `generate_trial_balance`.
3. Post adjustment journal: Dr/Cr Warranty Expense / Cr/Dr Provision for Warranties for the delta. (Per IAS 37.60, through P&L.)
4. Delete the remaining DRAFT unwinding journals (`delete_journal` per future period, each found by its reference), then post the unwinding journals from the new calculation for the remaining periods into the same capsule. Skip the new blueprint's recognition step: step 3 already adjusted the carrying amount.

This is in `year-end-close.md` Y5.

### Step 7: Settlement (final period)

When the obligation is actually paid, post the settlement (blueprint step 62) for the amount paid from the provision:

```
create_cash_out(
  valueDate: '2030-01-01',
  accountResourceId: <bank account>,
  reference: 'PROV-WARRANTY-2025-SETTLE',
  lines: [{ accountResourceId: <Provision for Warranties>, amount: 500000, description: 'Settlement of warranty obligation' }],
  capsuleResourceId: <capsule id>
)
```

- It posts ACTIVE on creation; a cash entry has no draft state.
- Verify: `balance['Provision for Warranties'] == 0`; `balance['Cash']` reduced by 500,000.
- Close capsule: a manual `update_capsule(resourceId: <id>, title: '<original> [CLOSED]')` (the API has no `status` field for capsules; closure is informational only).

If actual settlement amount differs from estimated $500,000 (highly likely for warranty / decommissioning), the cash-out carries the actual cash and the provision is cleared exactly:
- **Under-provided** (actual > carrying amount): one cash-out for the actual amount with two lines: the provision's carrying amount against `<Provision>`, and the shortfall against Warranty Expense. No separate journal: the shortfall is already in the cash-out.
- **Over-provided** (actual < carrying amount): cash-out for the actual amount against `<Provision>`, then a journal for the unused balance: Dr Provision / Cr Warranty Expense.
- A settlement already posted at the wrong amount is corrected with `update_cash_out(resourceId: <id>, lines: [...])`.

---

## Common problems and recovery

| Where | Problem | Recovery |
|--------|-------|----------|
| Calculator | "Term (months) must be a positive integer" | For short-term provisions (settlement < 6 months) PV unwinding is immaterial: post directly via `create_journal` at face value, no PV needed. |
| Calculator | Discount rate questioned | Per IAS 37.47, use a pre-tax rate reflecting current market + obligation-specific risks. SG: typically gov't bond rate + risk premium. A rate of 0 gives no discount (PV = face value). |
| Step 2 | `Finance Cost` is missing | Create via `create_account(accountType: 'Finance Cost', name: 'Finance Cost', code: <unused account code>)`. Note `Finance Cost` is both a valid account TYPE and the account NAME here. |
| Step 6 remeasurement | The calculator does not model a mid-life remeasurement | Manual adjustment journal + delete remaining DRAFT unwinding journals + recalculate and post the remaining term. |
| Step 7 actual settlement ≠ estimated | (always, for real-world provisions) | Settle for the actual amount and clear the provision exactly (see step 7). |
| Provision presented as Operating Expense vs Finance Cost confusion | (presentation) | Per IAS 37.84, the unwinding charge is presented in P&L as a Finance Cost (separate from the recognition expense which is Operating Expense). Practitioner judgment if jurisdiction disagrees. |

---

## Variations

- **Restructuring provision** (IAS 37.70-83): use this recipe with the recognition expense coded to `Restructuring Costs`. Recognized only when entity has detailed formal plan + valid expectation in those affected. Settlement typically within 12 months: short term, may not need PV.
- **Decommissioning / asset retirement**: this recipe + simultaneous `create_fixed_asset` increment to the asset's cost (IAS 16.16(c): the present value of the obligation is part of asset cost). Manual extra journal: Dr Fixed Asset / Cr Provision for Decommissioning at recognition.
- **Onerous contract**: this recipe with the recognition expense coded to `Loss on Onerous Contract`. PV the lower of cost-to-fulfill vs cost-to-exit.
- **Legal provision** (litigation): only recognize when "more likely than not" (>50% probability) per IAS 37.14(b). Best-estimate amount; PV if settlement > 12 months. Disclose contingent liabilities (probable but not measurable, or possible) per IAS 37.86, NOT recognized via this recipe.
- **Multi-year warranty with declining utilization**: use multiple shorter-term provisions (one per year) instead of single 5-year. Recognize each year's expected claims as it arises.

---

## Cross-references

- Year-end close (Y5): year-end provision remeasurement per IAS 37.59. Review each `Provisions` capsule's underlying assumptions vs current data; trigger manual remeasurement if needed.
- Month-end close: post or finalize this period's unwinding journal for each existing provision capsule.
- `audit-prep.md` step 8: supporting schedule via `search_capsules(filter: {status: {eq: 'ACTIVE'}})` (capsule type is not filterable; see `jobs/references/building-blocks.md` § Filter limits) + per-capsule recompute via `clio calc provision`. Auditor tests assumptions (cash flow estimate, discount rate, term).
- Sibling `bad-debt-provision.md` (calculator `ecl`): much simpler IFRS 9 ECL pattern, no PV unwinding.
