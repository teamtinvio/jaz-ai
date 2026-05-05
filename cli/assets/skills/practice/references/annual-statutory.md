# Annual statutory — agent playbook

Canonical playbook the agent walks through when the practitioner says "year-end `<FY>` for `<client>`" and an active engagement of `type: annual-statutory` is loaded. Three driver tools run in sequence: `generate_year_end_blueprint` → `generate_audit_prep_blueprint` → `generate_statutory_filing_blueprint`. Driver context: `CLIENT.md` + `ENGAGEMENT.md`.

## Tools, recipes, calculators this engagement uses

### Tools (jaz-api / direct API)
- `generate_year_end_blueprint` — used in step 2: drives the year-end close (true-ups, dividends, CYE rollover, final lock).
- `generate_audit_prep_blueprint` — used in step 5: drives audit-pack assembly.
- `generate_statutory_filing_blueprint` — used in step 7: drives the corporate-tax / Form C-S workstream.
- `generate_trial_balance` — used in steps 1, 3, 6, 9: open TB, post-true-ups TB, audit-pack TB, final filed TB.
- `generate_balance_sheet` / `generate_profit_and_loss` — used in step 6: deliverable reports.
- `generate_cashflow` — used in step 6: cashflow statement.
- `generate_equity_movement` — used in step 6: statement of changes in equity.
- `generate_aged_ar` / `generate_aged_ap` — used in step 4 (ECL true-up) and step 5 (audit confirmations).
- `generate_fa_summary` — used in step 4: FA register year-end snapshot, ties to BS Fixed Assets line.
- `generate_fa_recon_summary` — used in step 4: rolls FA cost + accumulated depreciation movement.
- `generate_general_ledger` — used in step 5: lead-schedule ties for material accounts.
- `generate_ar_report` / `generate_supplier_recon_blueprint` — used in step 5: AR/AP confirmation lists.
- `search_fixed_assets` — used in step 4: pull all assets to identify disposals not yet posted.
- `search_capsules` — used in step 4: enumerate active provisions, leases, intercompany capsules requiring year-end attention.
- `list_currency_rates` — used in step 4 FX reval: fetch FY-end closing rates per pair.
- `bulk_finalize_drafts` — used after each recipe step (3, 4, 8): batch finalize.
- `validate_journal_draft` — used before any `bulk_finalize_drafts`.
- `update_account` — used in step 9: lock dates per account at FY-end.
- `export_records` / `download_export` — used in step 5: deliverable XLSX exports for auditor pack.

### Recipes (jaz-recipes)
- `plan_recipe(name: 'depreciation', …)` — used in step 4: annual depreciation true-up for non-SL assets.
- `plan_recipe(name: 'fx-reval', …)` — used in step 4: year-end revaluation per non-base-currency monetary balance (jaz-recipes "annual-statutory" engagement context).
- `plan_recipe(name: 'asset-disposal', …)` — used in step 4: disposals surfaced during FA review.
- `plan_recipe(name: 'ecl', …)` — used in step 4: IFRS 9 year-end true-up over `generate_aged_ar`.
- `plan_recipe(name: 'provision', …)` — used in step 4: IAS 37 remeasurement.
- `plan_recipe(name: 'dividend', …)` — used in step 8: declaration after profit finalization (per jaz-recipes annual-statutory context).

### Calculators (jaz-cli)
- `clio calc loan` — used in step 4: independent verification of loan schedules at FY-end.
- `clio calc lease` — used in step 4: IFRS 16 ROU register + liability unwinding cross-check.
- `clio calc provision` — used in step 4: PV unwinding cross-check.
- `clio calc asset-disposal` — used in step 4: gain/loss verification before invoking the recipe.
- `clio calc fx-reval` — used in step 4: year-end FX delta cross-check.
- `clio calc ecl` — used in step 4: provision matrix cross-check.
- `clio calc dividend` — used in step 8: with optional withholding-rate.
- `clio jobs statutory-filing sg-cs` — used in step 7: Form C-S deterministic computation engine (input: structured JSON; output: workpaper + Form C-S fields + carry-forwards).
- `clio jobs statutory-filing sg-ca` — used in step 7: capital-allowance schedule per asset category.

### Cross-references
- `jaz-jobs/SKILL.md § generate_year_end_blueprint`, `§ generate_audit_prep_blueprint`, `§ generate_statutory_filing_blueprint` for blueprint structure.
- `jaz-jobs/references/year-end-close.md`, `audit-prep.md`, `fa-review.md`, `supplier-recon.md` for blueprint depth.
- `jaz-jobs/references/sg-tax/wizard-workflow.md` for the Form C-S wizard procedure (THE main playbook for step 7); `sg-tax/{form-cs-fields,data-extraction,add-backs-guide,capital-allowances-guide,ifrs16-tax-adjustment,enhanced-deductions,exemptions-and-rebates,losses-and-carry-forwards}.md` for tax-rule depth.
- `jaz-recipes/references/{asset-disposal,fx-revaluation,provisions,bad-debt-provision,dividend,intercompany,capital-wip,ifrs16-lease,declining-balance}.md` for IFRS treatment depth.
- `jaz-api/SKILL.md § Reports` (rules 36–37), `§ Currency Rates` (39, 49, 105), `§ Withholding Tax` (45, 98), `§ Identifiers & Dates` (1–3), `§ Pagination` (38).

---

## Step-by-step playbook

### Step 1 — Pre-flight + frame the FY

Read `CLIENT.fy_end` (MM-DD) and `ENGAGEMENT.period` (YYYY). Compute the FY window:
- FY-start = (year-1)-`fy_end` + 1 day if `fy_end == 12-31` else `period`-`fy_end_month_start`
- FY-end = `period`-`fy_end`

Verify all 12 monthly closes (or 4 quarter-end closes if the firm operates on a quarterly cadence) are signed-off OR the period is locked. Surface any gaps; halt unless practitioner authorises.

Invoke `generate_trial_balance(period_end: <FY-end>)`. Save to `recurring/annual/<period>/audit/tb-pre-yearend.json`.

### Step 2 — Year-end blueprint

Invoke `generate_year_end_blueprint(period: <ENGAGEMENT.period>, currency: <CLIENT.base_currency>)`. Save to `recurring/annual/<period>/year-end-blueprint.json`.

The blueprint emits phased steps for: monthly true-ups + bonus accrual true-up + annual ECL + year-end FX reval + dividend (if applicable) + final lock. The playbook below maps the blueprint phases onto concrete tool/recipe invocations.

**On 422 with `prior_year_not_locked`:** the prior FY was not closed. Halt: "Prior FY `<period - 1>` not locked — close prior FY before starting current year-end."

### Step 3 — Pull the opening register set

Save the following to `recurring/annual/<period>/audit/`:

- `search_fixed_assets(filter: {status: {in: ['ACTIVE', 'DISPOSED']}}, valueDateRange: { from: <FY-start>, to: <FY-end> }, limit: 200)` paginated → `fa-register.json`
- `search_capsules(filter: {status: {in: ['ACTIVE', 'CLOSED']}, tag: {in: ['lease', 'loan', 'provision', 'intercompany', 'capital-wip']}}, limit: 200)` paginated → `capsules.json`
- `generate_aged_ar(period_end: <FY-end>)` → `aged-ar.json`
- `generate_aged_ap(period_end: <FY-end>)` → `aged-ap.json`

### Step 4 — Year-end recipes (true-ups, FX reval, ECL, provisions, FA disposals)

This is the largest step and runs through the recipe set in this order:

#### 4a — Depreciation annual true-up

Invoke `generate_fa_summary(period_end: <FY-end>)`. For every active asset:
- If `depreciationMethod == STRAIGHT_LINE`: Jaz native FA already posted monthly. Verify the year's accumulated depreciation per the report. Cross-check via `clio calc depreciation --cost <c> --salvage <s> --life <l> --method sl --frequency annual --currency <CLIENT.base_currency> --json`. Tolerance: `CLIENT.materiality_threshold`.
- If `depreciationMethod ∈ { DDB, 150DB }`: confirm the 12 monthly close engagements posted via `plan_recipe(name: 'depreciation', …)`. Year-end true-up only if a remeasurement of `usefulLife` happened during FY.

#### 4b — FA disposals discovered during review

For each asset where `search_fixed_assets` returns `status: DISPOSED` but no asset-disposal capsule exists, OR the practitioner identifies a missed disposal during review:
1. `clio calc asset-disposal --cost <c> --salvage <s> --life <l> --acquired <YYYY-MM-DD> --disposed <YYYY-MM-DD> --proceeds <p> --method <sl|ddb|150db> --currency <CLIENT.base_currency> --json` for verification.
2. `plan_recipe(name: 'asset-disposal', cost: <c>, accumulated: <accumulated-to-disposal-date>, disposalDate: <YYYY-MM-DD>, proceeds: <p>, glAccountCost: <FA gl>, glAccountAccumulated: <accumulated gl>, glAccountGainLoss: <P&L line>, …)`.
3. `execute_recipe`. Inspect `notes` — typically includes a `note` action to deregister the asset in the FA module.

**On 422 from `plan_recipe` with `disposal_after_period_end`:** the disposal date is later than `<FY-end>`. The disposal belongs to next FY; halt and confirm with practitioner.

#### 4c — Year-end FX revaluation

Same logic as monthly-close step 6, but at `<FY-end>` and with the FY closing rates. Pull rates: `list_currency_rates(filter: {sourceCurrency: <fcy>, valueDate: <FY-end>})` per non-base-currency.

For each foreign-currency monetary balance:
1. `clio calc fx-reval --amount <fcy> --book-rate <booked> --closing-rate <fy-close> --currency <fcy> --base-currency <CLIENT.base_currency> --json`.
2. `plan_recipe(name: 'fx-reval', …)` then `execute_recipe`.

The Day-1 reversal scheduler will post on FY-start of the next FY automatically.

**On 404 from `list_currency_rates`:** FY-end rate not loaded. `bulk_upsert_currency_rates` to load rates for all required pairs before proceeding (jaz-api rule 39 — auto-enables currencies not yet enabled).

#### 4d — IFRS 9 ECL year-end true-up

1. `generate_aged_ar(period_end: <FY-end>)`.
2. Bucket receivables by aging band per CLIENT historical loss-rate matrix.
3. `clio calc ecl --current <c> --30d <30> --60d <60> --90d <90> --120d <120> --rates <r1>,<r2>,<r3>,<r4>,<r5> --existing-provision <ep> --currency <CLIENT.base_currency> --json`.
4. If top-up > `CLIENT.materiality_threshold`: `plan_recipe(name: 'ecl', …)` then `execute_recipe`.

#### 4e — IAS 37 provisions remeasurement

For each capsule from step 3 with `tag: 'provision'`:
1. `clio calc provision --amount <pv> --rate <discount-rate> --term <remaining-months-to-FY-end> --currency <CLIENT.base_currency> --json` to verify cumulative discount unwinding.
2. If best-estimate has changed materially during FY: re-run `plan_recipe(name: 'provision', …)` with new amount; the recipe creates a remeasurement journal.

#### 4f — Bonus accrual true-up

If `CLIENT.recurring_accruals[]` includes bonus-accrual entries with `estimation_method != fixed_amount`: pull actual final-bonus figures from the practitioner; reverse the over-/under-accrued portion via a manual `create_journal` tagged to the bonus capsule. (The leave-accrual half stays on its scheduler — no true-up needed unless leave policy changed mid-FY.)

#### 4g — Intercompany elimination

For each capsule with `tag: 'intercompany'`: confirm both legs (in two Jaz orgs if practitioner serves both) have matching reference numbers and equal-and-opposite balances. Surface any imbalance > `CLIENT.materiality_threshold` to practitioner.

#### 4h — Capital-WIP transfers

For each capsule with `tag: 'capital-wip'` whose underlying project is COMMISSIONED during FY: trigger the WIP→FA transfer per `jaz-recipes/references/capital-wip.md`. The transfer is `POST /api/v1/transfer-fixed-assets` (preserves accumulated depreciation per jaz-conversion rule 2).

#### Finalize step 4

Collect all draft journals from 4a–4h, run `validate_journal_draft` per draft, then `bulk_finalize_drafts({ kind: 'journal', resourceIds: [...] })`. Save a manifest to `recurring/annual/<period>/audit/year-end-recipes-manifest.md`.

### Step 5 — Audit prep pack

Invoke `generate_audit_prep_blueprint(period: <ENGAGEMENT.period>)`. Save the blueprint to `recurring/annual/<period>/audit/blueprint.json`.

Assemble the audit pack into `deliverables/audit/`:
- TB final, BS, P&L, cashflow, equity movement → from step 6
- FA register snapshot (from `generate_fa_summary` + `generate_fa_recon_summary`)
- Aged AR / AP with confirmation list (`generate_aged_ar` / `generate_aged_ap` filtered by materiality)
- Lead schedules per material account: `generate_general_ledger(accountResourceId: <id>, period_start: <FY-start>, period_end: <FY-end>)` per material GL.
- Supplier recon pack: `generate_supplier_recon_blueprint(period: <ENGAGEMENT.period>)` per material supplier.
- Year-end recipes manifest from step 4 (audit trail of every adjusting journal).
- Capsule listing from step 3.

For each deliverable, invoke `export_records({ entityType: …, period: <ENGAGEMENT.period>, outputFormat: 'XLSX' })` to emit XLSX where appropriate; poll `search_background_jobs(filter: {resourceId: {eq: <jobId>}})` to `SUCCESS`; `download_export` to `deliverables/audit/`.

### Step 6 — Final report set

After step 4 finalizations, invoke and save to `deliverables/audit/`:
- `generate_trial_balance(period_end: <FY-end>)` → `tb-final.json`
- `generate_balance_sheet(period_end: <FY-end>)` → `bs.json`
- `generate_profit_and_loss(period_start: <FY-start>, period_end: <FY-end>)` → `pl.json`
- `generate_cashflow(period_start: <FY-start>, period_end: <FY-end>)` → `cf.json`
- `generate_equity_movement(period_start: <FY-start>, period_end: <FY-end>)` → `equity.json`

Verify ties: `tb-final.balance_sheet_total == bs.total_assets == bs.total_liabilities + bs.total_equity`. If not within rounding: halt and surface "BS/TB mismatch — investigate before signing audit pack."

### Step 7 — Corporate tax (Form C-S workstream)

Invoke `generate_statutory_filing_blueprint`. Save to `recurring/annual/<period>/tax/blueprint.json`.

Form C-S applies if revenue ≤ SGD 5M; Form C-S Lite if revenue ≤ SGD 200K. NOT Form C (out of scope per jaz-jobs § Tax Computation).

Run the wizard per `jaz-jobs/references/sg-tax/wizard-workflow.md`:
1. Pull P&L, TB, GL, FA data per `sg-tax/data-extraction.md`.
2. Classify add-backs per `sg-tax/add-backs-guide.md` (entertainment, motor private-passenger, fines & penalties, donations >250%, depreciation if accounting basis).
3. Capital allowances per `sg-tax/capital-allowances-guide.md` and via `clio jobs statutory-filing sg-ca --input assets.json --json` per asset category.
4. IFRS 16 tax adjustment per `sg-tax/ifrs16-tax-adjustment.md` — reverse depreciation + interest, add back actual lease payments.
5. Enhanced deductions per `sg-tax/enhanced-deductions.md` (R&D, IP, donations 250%, S14Q renovation).
6. Exemptions / rebates per `sg-tax/exemptions-and-rebates.md` and per `CLIENT.corporate_tax_bracket` (SUTE / PTE / standard / partial).
7. Losses + carry-forwards per `sg-tax/losses-and-carry-forwards.md`.
8. Assemble `tax-data.json` and run: `clio jobs statutory-filing sg-cs --input tax-data.json --json`.
9. Output: workpaper + the Form C-S field set (18 fields for C-S, 6 for C-S Lite per `sg-tax/form-cs-fields.md`) + carry-forward schedule.

Save outputs to `deliverables/tax/`:
- `workpaper.json` (full computation trail)
- `form-cs-fields.json` (the 18 / 6 IRAS fields)
- `carry-forwards.json` (loss / CA / donation carry-forward schedule)

Practitioner submits on myTax Portal manually. Capture submission reference into `deliverables/tax/iras-ack-form-cs.txt`.

### Step 8 — Dividends (if applicable)

If the board declares a dividend post profit-finalization (per jaz-recipes annual-statutory context):
1. `clio calc dividend --amount <amt> --declaration-date <YYYY-MM-DD> --payment-date <YYYY-MM-DD> [--withholding-rate <r>] --currency <CLIENT.base_currency> --json`.
2. `plan_recipe(name: 'dividend', amount: <amt>, declarationDate: <YYYY-MM-DD>, paymentDate: <YYYY-MM-DD>, withholdingRate: <r>, …)` then `execute_recipe`. Recipe creates declaration journal (reduces retained earnings) + payment journal + optional WHT journal.
3. `bulk_finalize_drafts`.

For cross-border WHT obligations: see jaz-api § Withholding Tax (rules 45, 98).

### Step 9 — IRAS ECI (if not yet filed)

ECI deadline: 3 months after FY-end. If ECI was filed earlier in the FY (typical practice), confirm reference is recorded in `deliverables/iras/eci-ack.txt`.

If not yet filed: use the Form C-S working from step 7 to compute estimated chargeable income; submit on myTax Portal; capture reference.

### Step 10 — ACRA annual return

Annual return deadline: 7 months after FY-end (for non-listed; rules differ for listed entities — out of MVP scope).

- AGM minutes drafted (where required by Companies Act).
- Financial statements lodged in XBRL where applicable (small companies: simplified XBRL).
- File AR on BizFile+; capture reference into `deliverables/acra/ar-ack.txt`.

(ACRA filing happens outside Jaz's API surface. Jaz provides the financial statements; lodgment is manual.)

### Step 11 — CYE rollover + final lock

Per `generate_year_end_blueprint` final phase:
1. P&L close: roll P&L net result into Retained Earnings via a CYE journal (the blueprint emits the exact entries).
2. `bulk_finalize_drafts` for the rollover journal.
3. Lock all accounts at `<FY-end>` via `update_account` (lock-date field).

Update `ENGAGEMENT.status` to `filed` once Form C-S, ECI, and ACRA AR acknowledgements are all captured.

### Step 12 — Verification gate

Before declaring `filed`:
1. `generate_trial_balance(period_end: <FY-end>)` matches BS + P&L (sums tie).
2. P&L net result == change in retained earnings on equity-movement statement.
3. `search_journals(status: 'DRAFT', valueDate: {lte: <FY-end>})` returns zero across all years.
4. `search_bank_records(status: 'UNRECONCILED', valueDate: {lte: <FY-end>})` returns zero.
5. FA register net-book-value (`generate_fa_summary`) ties to BS Fixed Assets line.
6. Form C-S, ECI, ACRA AR acknowledgements all in `deliverables/`.

If any fails: do NOT mark `filed`. Surface the failed check.

---

## Common error classes and recovery

| Error class | Where | Recovery |
|---|---|---|
| 422 `prior_year_not_locked` | `generate_year_end_blueprint` | Close prior FY first; halt. |
| 422 `disposal_after_period_end` | `plan_recipe(name: 'asset-disposal', …)` | Disposal date > FY-end; belongs to next FY. |
| 422 `journal_unbalanced` | `bulk_finalize_drafts` | Recipe regression; halt without retry. |
| 404 `currency_rate_missing` | step 4c FX reval | `bulk_upsert_currency_rates` to load FY-end rates; auto-enables currencies (jaz-api rule 39). |
| 422 `account_locked` | step 4 recipe execution | A monthly close already locked the account; lift lock for that specific account, post adjustment, re-lock. |
| 500 transient | `generate_*` reports / blueprints | Retry once with 5s backoff; second 500 → halt with `requestId`. |
| Tax-data validation error | `clio jobs statutory-filing sg-cs` | Inspect the wizard output — typically a missing field; fix `tax-data.json` per `sg-tax/form-cs-fields.md`. |
| BS ≠ TB at step 6 | verification | Investigate before signing; do NOT proceed to filing. |

(Field-name and error-recovery depth lives in `jaz-api/SKILL.md`. This file enumerates only what annual-statutory specifically encounters.)
