# Recipe: IFRS 16 Lease (engine name: `lease`)

> Canonical recipe for operating leases (office, equipment, vehicles) under IFRS 16. Engine creates the initial recognition journal (Dr ROU Asset / Cr Lease Liability) + a fixed-asset note (manual FA register update) + N future-dated DRAFT liability-unwinding journals. ROU depreciation runs through the Jaz native FA register separately (straight-line, auto-posted by Jaz).

## Tools, recipes, calculators this recipe uses

### Recipe engine entry point
- **`plan_recipe(recipe: 'lease', ...)`** — used in step 2: returns RecipePlan with PV-derived initial recognition journal, fixed-asset note (manual step), and N future-dated liability unwinding journals.
- **`execute_recipe(recipe: 'lease', ...)`** — used in step 4: posts the initial journal + N future-dated DRAFT unwinding journals. The fixed-asset step is SKIPPED by the engine (per `src/core/recipe/engine.ts:73-83` — `fixed-asset` and `note` actions can't be auto-created via the engine; they appear in the `notes` summary for the practitioner to handle manually).

### Calculator (cross-check, no API key needed)
- **`clio calc lease --payment <monthly> --term <months> --rate <annual %> --start-date <YYYY-MM-DD> --currency <code> --json`** — used in step 1: independently produce `{ presentValue, totalInterest, schedule[n] }` (monthly payment splits into interest + principal portions, principal reducing the liability).

### Tools (jaz-api / direct)
- **`search_capsules(filter: {capsuleType: {eq: 'Lease'}, name: {eq: <capsuleName>}})`** — step 0 idempotency check.
- **`search_accounts(filter: {name: {in: ['Right-of-Use Asset', 'Lease Liability', 'Interest Expense — Leases']}})`** — step 3.
- **`search_contacts(filter: {supplier: true, name: {eq: <lessor>}})`** — step 3 (lease counterparty).
- **`create_fixed_asset(...)`** — step 4 manual: register the ROU asset in Jaz native FA. `cost` = PV from calculator, `usefulLifeMonths` = lease term, `depreciationMethod` = 'sl' (straight-line). Jaz auto-posts monthly depreciation thereafter.
- **`generate_trial_balance(period_end: <date>)`** — step 5 verify.
- **`bulk_update_journals(items: [{resourceId: <id>, saveAsDraft: false}, ...])`** — step 5 monthly: finalize this period's pre-emitted unwinding DRAFT.
- **`generate_fa_summary(period_end: <date>)`** — step 5 verify Jaz auto-posted ROU depreciation.

### Cross-references
- Operational context: invoked during month-end close (verify scheduler / pre-emitted unwinding journal + verify Jaz FA posted ROU depreciation) and at `jobs/references/year-end-close.md` Y6 (current/non-current reclassification of the next 12 months' principal portion).
- Sibling recipes: `bank-loan.md` (similar amortization pattern but no FA dimension); `hire-purchase.md` (shares the lease engine but with different useful-life-months per asset).
- IFRS / accounting context: IFRS 16 paragraphs 22-25 (recognition), 36 (subsequent measurement), 47 (lease liability re-measurement).

---

## Step-by-step

### Step 0 — Idempotency check

```
search_capsules(filter: {capsuleType: {eq: 'Lease'}, name: {eq: 'Office Lease — Marina One — 36 months'}})
```

If a result returns: halt and surface "Lease capsule `<name>` already exists. Re-running would create a duplicate ROU + Lease Liability. Confirm intent — if modifying lease terms (rent revision, term extension), use the IFRS 16 lease re-measurement pattern (manual journal); do NOT re-execute the recipe."

### Step 1 — Independent cross-check (calculator)

```
clio calc lease --payment 5000 --term 36 --rate 5 --start-date 2025-01-01 --currency SGD --json
```

Returns: `{ presentValue: 167287.43, totalInterest: 12712.57, schedule: [{period, openingLiability, interest, principal, payment, closingLiability}, ...36] }`. Save to `workpapers/<period>/lease-amortization.json` for the workpaper record.

### Step 2 — Plan the recipe

```
plan_recipe(
  // Note: gl*, capsuleType, capsuleName, bankAccountResourceId, vendor, customer below are illustrative — auto-resolved at execute time from CoA, not real plan_recipe params.
  recipe: 'lease',
  monthlyPayment: 5000,
  termMonths: 36,
  annualRate: 5,
  startDate: '2025-01-01',
  currency: 'SGD',
  glRouAsset: <resourceId of 'Right-of-Use Asset' account>,
  glLeaseLiability: <resourceId of 'Lease Liability' account>,
  glInterestExpense: <resourceId of 'Interest Expense — Leases' account>,
  bankAccountResourceId: <bank account resourceId>,
  capsuleType: 'Lease',
  capsuleName: 'Office Lease — Marina One — 36 months',
  lessor: 'Marina One Holdings'
)
```

Returns `RecipePlan` with:
- `requiredAccounts`: `['Right-of-Use Asset', 'Lease Liability', 'Interest Expense — Leases', 'Cash / Bank Account', 'Depreciation Expense — ROU', 'Accumulated Depreciation — ROU']`
- `needsContact`: `true` (lessor)
- `steps[0]`: initial recognition journal (Dr ROU Asset $167,287.43 / Cr Lease Liability $167,287.43, dated startDate). NOT a cash-out — first payment happens at end of period 1.
- `steps[1]`: fixed-asset note (the engine will SKIP auto-creating; surfaces in `notes` summary). Practitioner must invoke `create_fixed_asset` manually in step 4.
- `steps[2..37]`: 36 future-dated DRAFT unwinding journals. Each is a 3-line entry: Dr Lease Liability (principal portion), Dr Interest Expense — Leases (interest portion), Cr Cash $5,000 (the lease payment).

### Step 3 — Resolve dependencies

For each account in `requiredAccounts`:
- `search_accounts(filter: {name: {eq: <accountName>}})`. Suggested classifications: `Right-of-Use Asset` → `Non-Current Asset`; `Lease Liability` → `Non-Current Liability`; `Interest Expense — Leases` → `Operating Expense`. The Depreciation Expense + Accumulated Depreciation accounts are FA-register defaults — Jaz uses standard ones unless overridden.

Lessor:
- `search_contacts(filter: {supplier: true, name: {eq: 'Marina One Holdings'}})`. If empty: `create_contact(supplier: true, ...)`.

Bank account:
- Resolve `bankAccountResourceId` via `list_bank_accounts()` if the bank account resourceId isn't already known.

### Step 4 — Execute

```
execute_recipe(recipe: 'lease', ...same args..., accountMap: <resolved>, contactName: <resolved>, bankAccountName: <resolved>)
```

Returns: `{ capsule: {resourceId, type, title}, steps: [{step, action, status, resourceId | 'skipped'}], summary: {total: 38, created: 37, skipped: 1, notes: ['Step 2 (fixed-asset): Register ROU asset in Jaz FA module — see step 4 manual action below.']} }`. The recipe creates **37 entries upfront** (1 initial journal + 36 unwinding journals). All journals attach to the same capsule.

**Manual step required (engine cannot auto-create):**

```
create_fixed_asset(
  name: 'Right-of-Use Asset — Marina One Office (FY2025)',
  reference: 'ROU-MARINA-2025',
  cost: 167287.43,
  acquisitionDate: '2025-01-01',
  usefulLifeMonths: 36,
  depreciationMethod: 'sl',
  capsuleResourceId: <capsule from execute_recipe>,
  saveAsDraft: false
)
```

Once registered in FA, **Jaz auto-posts monthly straight-line ROU depreciation** ($167,287.43 / 36 = $4,646.87 per month) for 36 months. Practitioner does NOT post depreciation manually.

### Step 5 — Monthly action (during monthly-close)

For each month after recipe execution:

**5a — Finalize this period's unwinding journal (3-line, lease payment):**

```
search_journals(filter: {capsuleResourceId: {eq: <id>}, valueDate: {between: [<period-start>, <period-end>]}, status: {eq: 'DRAFT'}})
update_journal(resourceId: <journal id>, saveAsDraft: false)
```

This posts the cash payment + interest split per the amortization schedule.

**5b — Verify Jaz auto-posted ROU depreciation:**

```
generate_fa_summary(period_end: <period-end>, fixedAssetResourceId: <ROU asset id>)
```

Should show this month's $4,646.87 depreciation movement. If missing: the FA wasn't activated (still DRAFT) — `update_fixed_asset(resourceId: <id>, status: 'ACTIVE')` first, then re-run.

**5c — Verify TB:**
- `generate_trial_balance(period_end: <month-end>)`.
- Assert: `balance['Lease Liability'] == -schedule[periodIndex].closingLiability` (within 1 cent).
- Assert: `balance['Interest Expense — Leases'] (period MTD) == schedule[periodIndex].interest`.
- Assert: `balance['Right-of-Use Asset'] - balance['Accumulated Depreciation — ROU'] == 167287.43 - (4646.87 × monthsElapsed)`.

After the FINAL period (month 36):
- Assert: `balance['Lease Liability'] == 0` exactly.
- Assert: `balance['Right-of-Use Asset']` net of accumulated depreciation `== 0`.
- Close capsule via a manual `update_capsule(title: '<original> [CLOSED]')` (the API has no `status` field for capsules — closure is informational only). Decommission FA via `update_fixed_asset(status: 'DISPOSED')` (lease end = de-recognition per IFRS 16.46).

---

## Common error classes and recovery

| Source | Error | Recovery |
|--------|-------|----------|
| `plan_recipe` | 422 `unsupported_recipe` | File-name alias `ifrs16-lease` was used. Use canonical engine name `lease`. |
| `plan_recipe` | 422 `term_too_short` | Lease must be ≥2 periods. Short-term lease exemption (IFRS 16.5): for ≤12 months, expense as incurred via `create_bill` per period; do NOT capitalize — skip this recipe. |
| `execute_recipe` | engine output `summary.skipped >= 1` | Expected. The fixed-asset step is intentionally skipped — invoke `create_fixed_asset` manually per step 4. |
| `create_fixed_asset` | 422 `cost_mismatch` | The PV used here must match `plan_recipe.calculator.presentValue`. If they diverge, you re-ran the calc with different inputs — recompute. |
| `create_fixed_asset` | 422 `useful_life_not_set` | `usefulLifeMonths` is required for ROU; otherwise Jaz can't auto-depreciate. |
| Jaz auto-depreciation not running | (verification fail in 5b) | FA may still be DRAFT. `update_fixed_asset(status: 'ACTIVE')`. Or the depreciation start date is wrong — verify `acquisitionDate` matches `startDate`. |
| Lease re-measurement (rent revision) | (process) | NOT supported by this recipe. Manual journal pattern: revalue Lease Liability at new PV, offset Dr/Cr Right-of-Use Asset for the same delta (per IFRS 16.39-46). Do NOT re-execute the recipe — it would duplicate the entire amortization. |
| Lease termination (early exit) | (process) | Manual journal pattern: derecognize remaining ROU + Lease Liability balances; post any termination penalty as P&L. Decommission FA via `update_fixed_asset(status: 'DISPOSED')`. |

---

## Variations

- **Hire purchase** (`useful-life-months` ≠ `term-months`): use the `lease` engine but pass `usefulLifeMonths: <asset's life>` distinct from `termMonths: <financing term>`. ROU depreciates over useful life, liability unwinds over financing term. See `hire-purchase.md`.
- **Variable rent** (CPI-linked, turnover-linked): NOT supported by initial recipe. Recompute PV at each reset event and re-measure manually.
- **Multi-currency lease** (USD payments from SGD bank): pass `currency: 'USD'`. ROU + Lease Liability denominate in USD; Jaz auto-translates BS balances at closing rate per IAS 21.23 (do NOT invoke `fx-reval` recipe).
- **Lease with prepayments** (initial payment at signing): post the prepayment as `create_cash_out_entry` against ROU Asset BEFORE invoking the recipe. The recipe's PV calculation should exclude the upfront payment portion.
- **Year-end current/non-current reclassification**: Out of scope for the engine. Manual annual journal: Dr Lease Liability (Non-Current) / Cr Lease Liability (Current) for the next 12 months' principal portion. Job blueprint `jobs/references/year-end-close.md` Y6 covers this.

---

## Cross-references

- Month-end close — invoked monthly to finalize this period's pre-emitted unwinding DRAFT (5a) + verify Jaz auto-posted ROU depreciation (5b).
- `jobs/references/year-end-close.md` Y6 — current/non-current reclassification (manual annual journal) + auditor sample-test of the lease schedule via `clio calc lease`.
- Data migration — opening lease balances loaded via conversion (`jaz-conversion/SKILL.md § Option 2` with the Conversion Clearing > Lease account); recipe runs forward only from migration date.
- `audit-prep.md` step 8 — supporting schedule via `search_capsules(filter: {capsuleType: {eq: 'Lease'}})` + per-capsule `clio calc lease` recompute. Auditor reconciles to TB Lease Liability + ROU Asset NBV.
- Sibling recipe `hire-purchase.md` — same engine, different useful-life parameter.
