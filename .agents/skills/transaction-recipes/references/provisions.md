# Recipe: Provisions (IAS 37) (engine name: `provision`)

> Recipe for IAS 37 provisions where the time value of money is material — warranty obligations, decommissioning, restructuring, onerous contracts, legal claims. Engine emits 1 initial recognition journal + N future-dated DRAFT discount-unwinding journals + 1 settlement cash-out.

## Tools, recipes, calculators this recipe uses

### Recipe engine entry point
- **`plan_recipe(recipe: 'provision', ...)`** — used in step 2: returns RecipePlan with PV-recognition journal + N period unwinding journals + settlement cash-out.
- **`execute_recipe(recipe: 'provision', ...)`** — used in step 4: posts initial PV journal (today), N future-dated DRAFT discount-unwinding journals (one per month), and settlement cash-out (dated `settlementDate`, also DRAFT).

### Calculator (cross-check, no API key needed)
- **`clio calc provision --amount <undiscounted total> --rate <annual %> --term <months> --start-date <YYYY-MM-DD> --currency <code> --json`** — used in step 1: compute PV at recognition + per-period unwinding charge. Returns `{ presentValue, totalUnwindingCharge, schedule[n] }` where each row has `period`, `openingProvision`, `unwindingCharge`, `closingProvision`.

### Tools (jaz-api / direct)
- **`search_capsules(filter: {capsuleType: {eq: 'Provisions'}, name: {eq: <capsule.name>}})`** — step 0 idempotency check.
- **`search_accounts(filter: {name: {in: ['Provision for Warranties', 'Finance Cost', 'Warranty Expense']}})`** — step 3.
- **`generate_trial_balance(period_end: <date>)`** — step 5 verify provision balance matches schedule's `closingProvision`.
- **`update_journal(resourceId: <each id>, saveAsDraft: false)  // loop per id — no bulk-finalize-journals tool yet`** — step 5 monthly finalize.

### Cross-references
- Within an engagement: invoked from `practice/references/annual-statutory.md` step 4e (Y5 in `year-end-close.md`) for year-end provision remeasurement, and `practice/references/monthly-close.md` step 7 (verify scheduler, finalize this period's unwinding DRAFT).
- Sibling: `bad-debt-provision.md` (engine name `ecl` — IFRS 9 ECL, simpler one-shot pattern, no PV unwinding); `fixed-deposit.md` (similar PV-unwinding mechanic but for a financial asset).
- IFRS / accounting context: IAS 37.45 (PV when material); IAS 37.59 (use a pre-tax discount rate that reflects current market assessments of time value AND risks specific to the obligation); IAS 37.59 Note (do NOT double-count risks via rate AND cash flow estimates).

---

## Step-by-step

### Step 0 — Idempotency check

```
search_capsules(filter: {capsuleType: {eq: 'Provisions'}, name: {eq: 'Warranty Provision — FY2025-FY2029'}})
```

If a result returns: halt. Provision capsules are unique per obligation; duplicate setup means double-recognition.

### Step 1 — Independent cross-check (calculator)

```
clio calc provision --amount 500000 --rate 4 --term 60 --start-date 2025-01-01 --currency SGD --json
```

Returns: `{ presentValue: 410960, totalUnwindingCharge: 89040, schedule: [{period: 1, openingProvision: 410960, unwindingCharge: 1369.87, closingProvision: 412330, ...}, ...60] }`. PV formula: `500,000 / (1 + 0.04/12)^60 ≈ 410,960`. Each period's unwinding = `openingProvision × monthly rate`; closingProvision approaches the undiscounted $500,000 over the 60 months.

Save schedule to `workpapers/<period>/provision-warranty-FY2025.json`.

### Step 2 — Plan the recipe

```
plan_recipe(
  recipe: 'provision',
  amount: 500000,
  annualRate: 4,
  termMonths: 60,
  startDate: '2025-01-01',
  settlementDate: '2030-01-01',
  currency: 'SGD',
  glProvision: <CLIENT.coa_mapping['Provision for Warranties']>,
  glExpense: <CLIENT.coa_mapping['Warranty Expense']>,
  glFinanceCost: <CLIENT.coa_mapping['Finance Cost']>,
  bankAccountResourceId: <CLIENT.bank_accounts[i].jaz_resource_id>,
  capsuleType: 'Provisions',
  capsuleName: 'Warranty Provision — FY2025-FY2029'
)
```

Returns `RecipePlan` with `requiredAccounts: ['Provision for Warranties', 'Warranty Expense', 'Finance Cost', 'Cash / Bank Account']`, `needsContact: false`, `needsBankAccount: true`, `steps`:
- Step 1 (initial recognition, dated startDate): journal — Dr Warranty Expense 410,960 / Cr Provision for Warranties 410,960 (recognize at PV).
- Steps 2..61 (unwinding, dated end-of-month): journal — Dr Finance Cost (per period unwinding) / Cr Provision for Warranties (per period unwinding). Provision balance grows from PV to face value over the term.
- Step 62 (settlement, dated `settlementDate`): cash-out — Dr Provision for Warranties 500,000 / Cr Cash 500,000 (settle the obligation).

### Step 3 — Resolve dependencies

For each account in `requiredAccounts`:
- `search_accounts(filter: {name: {eq: <accountName>}})`. Suggested classifications: `Provision for Warranties` → `Non-Current Liability` (or `Current Liability` if settlement < 12 months); `Warranty Expense` → `Operating Expense` (P&L, period of recognition); `Finance Cost` → `Operating Expense` or `Other Expense` (jurisdiction-specific; SG often `Other Expense`).

Bank account: only needed for the settlement cash-out at the end of the term.

### Step 4 — Execute

```
execute_recipe(recipe: 'provision', ...same args...)  // accounts auto-resolved from CoA; pass `bankAccountName` / `contactName` for fuzzy resolve
```

Returns: `{ capsule: {resourceId, type, title}, steps: [{step, action, status, resourceId}, ...62], summary: {total: 62, created: 62} }`. Initial recognition journal (today, ACTIVE if `finalize: true`); 60 future-dated DRAFT unwinding journals; 1 future-dated DRAFT settlement cash-out.

### Step 5 — Monthly action (during monthly-close)

For each month after recipe execution:

```
search_journals(filter: {capsuleResourceId: {eq: <id>}, valueDate: {between: [<period-start>, <period-end>]}, status: {eq: 'DRAFT'}})
update_journal(resourceId: <journal id>, saveAsDraft: false)
```

Verify after finalize:
- `generate_trial_balance(period_end: <month-end>)`.
- Assert: `balance['Provision for Warranties'] == -schedule[periodIndex].closingProvision` (within 1 cent).
- Assert: `balance['Finance Cost'] (period MTD) == schedule[periodIndex].unwindingCharge`.

### Step 6 — Year-end remeasurement (annual)

Per IAS 37.59, provisions are remeasured at each reporting date for changes in:
- Estimated cash outflow (claim experience changed)
- Discount rate (market rates moved)
- Timing of settlement

If practitioner determines a remeasurement is needed (year-end review):

1. Recompute new PV via `clio calc provision` with updated inputs.
2. Compare against current carrying amount from `generate_trial_balance`.
3. Post adjustment journal: Dr/Cr Warranty Expense / Cr/Dr Provision for Warranties for the delta. (Per IAS 37.60 — through P&L.)
4. Reverse remaining DRAFT unwinding journals (`delete_journal` per future period) and re-execute the recipe with new inputs for the remaining periods.

This is in `year-end-close.md` Y5.

### Step 7 — Settlement (final period)

When settlement date arrives:
- Finalize the settlement cash-out: `update_cash_in(resourceId: <settlement id>, saveAsDraft: false)`.
- Verify: `balance['Provision for Warranties'] == 0`; `balance['Cash']` reduced by 500,000.
- Close capsule: a manual `update_capsule(title: '<original> [CLOSED]')` (the API has no `status` field for capsules — closure is informational only).

If actual settlement amount differs from estimated $500,000 (highly likely for warranty / decommissioning):
- Edit the settlement cash-out before finalizing: `update_cash_out_entry(resourceId: <id>, lines: [{accountResourceId: <Provision>, amount: <actual>}, ...])`.
- Post a true-up journal for the difference: Dr/Cr Warranty Expense for the over/under-provision. (If under-provided: Dr Warranty Expense / Cr Cash for the shortfall. If over-provided: Dr Provision / Cr Warranty Expense for the reversal.)

---

## Common error classes and recovery

| Source | Error | Recovery |
|--------|-------|----------|
| `plan_recipe` | 422 `unsupported_recipe` | Use canonical engine name `provision` (not `provisions`). |
| `plan_recipe` | 422 `term_too_short` | Provision must span ≥ 2 periods (otherwise PV unwinding is immaterial). For short-term provisions (settlement < 6 months): post directly via `create_journal` at face value, no PV needed. |
| `plan_recipe` | 422 `rate_invalid` | Discount rate must be > 0. Per IAS 37.47, use a pre-tax rate reflecting current market + obligation-specific risks. SG: typically gov't bond rate + risk premium. |
| `execute_recipe` | 422 `account_not_found` for `Finance Cost` | Step 3 incomplete. Create via `create_account(accountType: 'Operating Expense' or 'Other Expense', name: 'Finance Cost')`. |
| Step 6 remeasurement | Recipe doesn't natively support mid-life remeasurement | Manual journal + delete remaining DRAFT unwinding journals + re-execute recipe for remaining term. |
| Step 7 actual settlement ≠ estimated | (always, for real-world provisions) | Edit settlement cash-out via `update_cash_out_entry` before finalizing, post true-up journal for the delta. |
| Provision presented as Operating Expense vs Finance Cost confusion | (presentation) | Per IAS 37.84, the unwinding charge is presented in P&L as a Finance Cost (separate from the recognition expense which is Operating Expense). Practitioner judgment if jurisdiction disagrees. |

---

## Variations

- **Restructuring provision** (IAS 37.70-83): use this recipe with `glExpense: 'Restructuring Costs'`. Recognized only when entity has detailed formal plan + valid expectation in those affected. Settlement typically within 12 months — short term, may not need PV.
- **Decommissioning / asset retirement**: this recipe + simultaneous `create_fixed_asset` increment to the asset's cost (IAS 16.16(c) — the present value of the obligation is part of asset cost). Manual extra journal: Dr Fixed Asset / Cr Provision for Decommissioning at recognition.
- **Onerous contract**: this recipe with `glExpense: 'Loss on Onerous Contract'`. PV the lower of cost-to-fulfill vs cost-to-exit.
- **Legal provision** (litigation): only recognize when "more likely than not" (>50% probability) per IAS 37.14(b). Best-estimate amount; PV if settlement > 12 months. Disclose contingent liabilities (probable but not measurable, or possible) per IAS 37.86 — NOT recognized via this recipe.
- **Multi-year warranty with declining utilization**: use multiple shorter-term provisions (one per year) instead of single 5-year. Recognize each year's expected claims as it arises.

---

## Cross-references back to engagements

- `practice/references/annual-statutory.md` step 4e (Y5) — year-end provision remeasurement per IAS 37.59. Practice playbook reviews each `Provisions` capsule's underlying assumptions vs current data; triggers manual remeasurement if needed.
- `practice/references/monthly-close.md` step 7 — finalize this period's pre-emitted unwinding DRAFT for each existing provision capsule.
- `audit-prep.md` step 8 — supporting schedule via `search_capsules(filter: {capsuleType: {eq: 'Provisions'}})` + per-capsule recompute via `clio calc provision`. Auditor tests assumptions (cash flow estimate, discount rate, term).
- Sibling `bad-debt-provision.md` (engine name `ecl`) — much simpler IFRS 9 ECL pattern, no PV unwinding.
