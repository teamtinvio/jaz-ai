# Monthly close — agent playbook

Canonical playbook the agent walks through when the practitioner says "close `<period>` for `<client>`" and an active engagement of `type: monthly-close` is loaded. Driver tool: `generate_month_end_blueprint`. Driver context: `CLIENT.md` for the client + `ENGAGEMENT.md` for the period.

## Tools, recipes, calculators this engagement uses

### Tools (jaz-api / direct API)
- `generate_month_end_blueprint` — used in step 1: emit the phased close checklist for `ENGAGEMENT.period`.
- `generate_trial_balance` — used in steps 2 and 11: open with current TB, close with verification TB.
- `generate_balance_sheet` / `generate_profit_and_loss` — used in step 11: deliverable reports.
- `generate_aged_ar` / `generate_aged_ap` — used in step 11: AR/AP supporting schedules.
- `list_bank_accounts` — used in step 3: resolve any missing `CLIENT.bank_accounts[i].jaz_resource_id`.
- `search_bank_records` — used in step 3: per `CLIENT.bank_accounts[i]`, pull `status: UNRECONCILED`.
- `quick_reconcile` / `reconcile_direct_cash_entry` / `reconcile_cash_journal` / `reconcile_manual_journal` / `reconcile_cash_transfer` / `reconcile_invoice_receipt` / `reconcile_bill_receipt` — used in step 3: per matched pair from the cascade.
- `generate_bank_recon_summary` / `generate_bank_recon_details` — used in step 3 verification.
- `validate_journal_draft` — used in steps 4–7 before posting any draft journal.
- `bulk_finalize_drafts` — used at end of steps 4 and 7: batch finalize all draft journals created in the step.
- `search_capsules` — used in steps 5–6: find existing depreciation / FX-reval / lease / provision capsules whose unwinding journal is due this period.
- `search_fixed_assets` — used in step 5: pull active assets for depreciation cross-check.
- `search_journals(status: ACTIVE, valueDate: <period_end>)` — used in step 11: confirm period-end journals are all `ACTIVE` (NOT `FINALIZED` — see jaz-api rule on journal status, jaz-jobs note in `references/month-end-close.md`).

### Recipes (jaz-recipes — IFRS-compliant transaction modeling)
- `plan_recipe(recipe: 'accrued-expense', …)` — used in step 4: per `CLIENT.recurring_accruals[i]` whose `last_posted < period_end`. Two-scheduler accrue + reverse pattern.
- `plan_recipe(recipe: 'depreciation', …)` — used in step 5: only when an asset uses a non-SL method (DDB, 150DB) — Jaz native FA already handles SL. Cross-check with `clio calc depreciation`.
- **FX revaluation** — used in step 6 as VERIFICATION ONLY (Jaz auto-handles all FX reval per IAS 21.23; do NOT invoke `execute_recipe(recipe: 'fx-reval', ...)` — would double-post).
- `plan_recipe(recipe: 'prepaid-expense', …)` — used in step 7: only on initial setup of a new prepaid; ongoing recognition runs from the scheduler created at setup.
- `plan_recipe(recipe: 'deferred-revenue', …)` — used in step 7: same setup-vs-recognition note as prepaid.
- `plan_recipe(recipe: 'provision', …)` — used in step 7: monthly discount-unwinding journal for any active IAS 37 provision capsule.

### Calculators (jaz-cli / `clio calc`)
- `clio calc accrued-expense` — used in step 4: independently compute accrual amount before invoking the recipe (cross-check).
- `clio calc depreciation` — used in step 5: FA register cross-check; verify Jaz's posted depreciation against an independent calc.
- `clio calc fx-reval` — used in step 6: independently compute period FX gain/loss for VERIFICATION against what Jaz auto-posted.
- `clio calc prepaid-expense` / `clio calc deferred-revenue` — used in step 7 for setup events; not for ongoing periods.
- `clio calc provision` — used in step 7: PV unwinding cross-check.

### Cross-references
- `jaz-jobs/SKILL.md § generate_month_end_blueprint` and `jaz-jobs/references/month-end-close.md` for the 5-phase blueprint structure.
- `jaz-recipes/references/accrued-expenses.md`, `fx-revaluation.md`, `prepaid-amortization.md`, `deferred-revenue.md`, `declining-balance.md`, `provisions.md` for IFRS treatment depth.
- `jaz-api/SKILL.md § Identifiers & Dates` (rules 1–3), `§ Names & Fields` (9–13), `§ Transaction Creation` (14–16), `§ Journals & Cash` (23–26), `§ Reports` (36–37), `§ Pagination` (38), `§ Currency Rates` (39, 49, 105) for field/error gotchas.

---

## Step-by-step playbook

### Step 1 — Frame the period and emit the blueprint

Read `CLIENT.fy_end` and `ENGAGEMENT.period`. Confirm `ENGAGEMENT.period` is a single month (YYYY-MM) and that `<period>-end` falls before today and inside `CLIENT.fy_end` boundaries.

Invoke `generate_month_end_blueprint(period: <ENGAGEMENT.period>, currency: <CLIENT.base_currency>)`. Save the JSON to `recurring/monthly/<period>/blueprint.json`.

**On 422 with reason `period_end_in_future`:** `ENGAGEMENT.period` is set wrong. Surface to practitioner: "Period end is in the future — confirm `CLIENT.fy_end` and `ENGAGEMENT.period` before retry." Halt.

**On 422 with reason `period_already_locked`:** the period was closed in a prior engagement. Surface: "Period `<period>` is already locked. Confirm whether this is a re-open (lift lock) or a duplicate engagement." Halt.

### Step 2 — Open the period with a trial balance

Invoke `generate_trial_balance(period_end: <period>-end)`. Save to `recurring/monthly/<period>/tb-open.json`.

If `recurring/monthly/<prior-period>/tb.json` exists: for every account row, compute `delta = current - prior`. Surface to practitioner the top 3 deltas where `|delta| > CLIENT.materiality_threshold`, descending magnitude, each with prior value, current value, and a 1-line possible-explanation hypothesis derived from the GL category (e.g. "Revenue +SGD 12,400 — likely month-on-month sales growth, verify against `search_invoices(valueDate: <period>)` count").

**On 422 with reason `period_end_in_future`:** as in step 1.
**On 500:** retry once with 5s backoff. On second 500: surface "TB generation failing repeatedly — escalate to support with `requestId` from response." Halt.

### Step 3 — Bank reconciliation

For each row in `CLIENT.bank_accounts[]`:

1. If `jaz_resource_id` is empty: invoke `list_bank_accounts()`, match by `name` AND `currency`, write the resourceId back to `CLIENT.bank_accounts[i].jaz_resource_id` and ask practitioner to confirm before continuing.
2. Invoke `search_bank_records(accountResourceId: <jaz_resource_id>, status: 'UNRECONCILED', valueDateRange: { from: <period>-01, to: <period>-end }, limit: 200, sort: 'valueDate:asc')`.
3. If results: invoke `clio jobs bank-recon match --input <records-payload> --tolerance 0.01 --date-window 14 --max-group 5 --json` (the 5-phase cascade matcher; see `jaz-recipes/SKILL.md § Bank Reconciliation Matcher`).
4. For each match the cascade returns: invoke the matching `reconcile_*` tool (`reconcile_invoice_receipt` for AR matches, `reconcile_bill_receipt` for AP, `reconcile_cash_journal` / `reconcile_manual_journal` / `reconcile_direct_cash_entry` for journal matches, `reconcile_cash_transfer` for inter-account, `quick_reconcile` for the simple 1:1 case where the bank record already references a paired transaction).
5. After the cascade: re-invoke `search_bank_records(status: 'UNRECONCILED', …)`. Surface the residual to practitioner with categories ("3 bank charges to expense via `create_cash_out`, 1 unidentified deposit pending client query").
6. Invoke `generate_bank_recon_summary(period_end: <period>-end, accountResourceId: <jaz_resource_id>)` per account. Save to `recurring/monthly/<period>/bank-recon-<account-name>.json`. Confirm `unreconciledCount == 0` OR is documented in `ENGAGEMENT.risk areas`.

**On 404 from `search_bank_records`:** account doesn't exist or `jaz_resource_id` is stale. Surface "`CLIENT.bank_accounts[<name>].jaz_resource_id` no longer resolves — re-run `list_bank_accounts` and update CLIENT.md."
**On 422 from `quick_reconcile` with reason `amount_mismatch`:** the cascade's tolerance was too loose for this match. Surface the proposed pair and the delta; let practitioner accept manually or reject.
**On 422 from `reconcile_invoice_receipt` with reason `invoice_status_invalid`:** the matched invoice is still DRAFT. Invoke `finalize_invoice(resourceId: …)` first, then retry the recon.

### Step 4 — Accruals

For each row in `CLIENT.recurring_accruals[]` where `last_posted < <period>-end`:

1. Compute the accrual amount per `estimation_method`:
   - `prior_month`: pull last period's posted amount via `search_journals(filter: {tag: <accrual.name>, valueDate: <prior-period>-end})`.
   - `trailing_3m_avg`: pull last 3 months' posted amounts and average.
   - `budget`: read from `CLIENT.recurring_accruals[i].budget_amount` (NOT `fixed_amount`).
   - `fixed_amount`: use `CLIENT.recurring_accruals[i].fixed_amount`.
2. Cross-check: `clio calc accrued-expense --amount <computed> --periods 1 --start-date <period>-end --currency <CLIENT.base_currency> --json`.
3. Invoke `plan_recipe(recipe: 'accrued-expense', amount: <computed>, glAccount: <CLIENT.recurring_accruals[i].gl_account>, vendor: <CLIENT.recurring_accruals[i].vendor>, valueDate: <period>-end, reversalDate: <next-period>-01)`.
4. Inspect `plan_recipe` output: `requiredAccounts`, `needsContact`. If `needsContact` and the vendor doesn't yet exist: invoke `search_contacts(filter: {name: {eq: <vendor>}})`; if empty, halt and surface "Accrual vendor `<vendor>` not in Jaz contacts — create via `create_contact` or remap CLIENT.md before retry."
5. If `requiredAccounts` includes a GL account not in the org's CoA: surface "Accrual `<accrual.name>` references GL account `<glAccount>` not in `CLIENT.coa_mapping` / Jaz CoA; create via `create_account` or remap before retry." Halt.
6. Invoke `execute_recipe(...)` with the same args as `plan_recipe` plus the resolved `accountMap` and `contactId`. The recipe creates a capsule + the dual-entry accrual + reversal scheduler. The journals are returned in DRAFT.
7. For each draft journal returned: invoke `validate_journal_draft(resourceId: <id>)` — if any rejection (e.g. unbalanced, invalid `valueDate`), surface the validation message and halt.
8. After all accruals processed: collect the journal `resourceId`s and invoke `bulk_finalize_drafts({ kind: 'journal', resourceIds: [...] })`.
9. Append to `workpapers/<period>/accruals.md`: row per accrual with `name | amount | recipe-output capsuleResourceId | journal resourceId(s) | finalized timestamp`.
10. Cross-check: invoke `generate_trial_balance(period_end: <period>-end)`. Sum the credit movements against accrual liability accounts. Verify `|sum - expected| ≤ CLIENT.materiality_threshold`.

**On 422 from `plan_recipe` with field `valueDate`:** date format wrong. Re-format as YYYY-MM-DD per jaz-api rule 3 and retry.
**On 422 from `execute_recipe` with reason `account_not_found`:** as step 5.
**On 422 from `bulk_finalize_drafts` with reason `journal_unbalanced`:** the accrual recipe produced an unbalanced journal (debits ≠ credits). This is a recipe regression. Surface the journal payload and halt; do NOT retry without manual review.

### Step 5 — Depreciation

1. Invoke `search_fixed_assets(filter: {status: {eq: 'ACTIVE'}}, limit: 200)`. For each asset:
   - If `depreciationMethod = STRAIGHT_LINE`: Jaz auto-posts via the FA module. No journal needed. Cross-check that the period's journal exists via `search_journals(filter: {tag: <asset.tagName>, valueDate: <period>-end, type: DEPRECIATION})`.
   - If `depreciationMethod ∈ { DDB, 150DB }`: Jaz native FA does NOT handle. Invoke `plan_recipe(recipe: 'depreciation', cost: <asset.cost>, salvage: <asset.salvage>, life: <asset.usefulLifeMonths>, method: <ddb|150db>, frequency: monthly, valueDate: <period>-end, …)` then `execute_recipe`.
2. Independent cross-check per asset: `clio calc depreciation --cost <cost> --salvage <salvage> --life <life> --method <method> --frequency monthly --currency <CLIENT.base_currency> --json`. Compare per-period journal output to what Jaz posted.
3. For any asset where Jaz-posted ≠ calc-output by > `CLIENT.materiality_threshold`: surface to practitioner.

**On 422 from `search_fixed_assets` with reason `unknown_filter_field`:** filter field name drift. Use `status` (not `assetStatus`); see jaz-api § Fixed Assets.

### Step 6 — FX revaluation

**Jaz auto-handles FX revaluation for ALL foreign-currency monetary balances.** AR, AP, cash, bank, intercompany, term deposits, FX provisions — period-end translation per IAS 21.23 is automatic. **DO NOT invoke `execute_recipe(recipe: 'fx-reval', ...)` — would double-post.** This step is verification + variance investigation.

1. Confirm the period-end closing rate is loaded for each foreign currency: `list_currency_rates(filter: {sourceCurrency: <fcy>, valueDate: <period>-end})`. If empty: halt and surface "Closing rate for `<fcy>` on `<period>-end` not in Jaz — Jaz used the most recent rate as a fallback. Load the actual closing rate via `add_currency_rate` or `bulk_upsert_currency_rates`, which will trigger Jaz to re-translate; confirm via re-running step 6 verification before close." (See jaz-api rule 39.)

2. Pull what Jaz auto-posted to the FX accounts during the period:
   - `search_accounts(filter: {name: {in: ['FX Unrealized Gain', 'FX Unrealized Loss', 'FX Bank Revaluation']}})` — get the FX account ids.
   - `generate_general_ledger(period_end: <period>-end, accountResourceIds: [<FX ids>], groupBy: 'ACCOUNT')` — aggregate per account.

3. For each foreign-currency monetary balance at period end (TB rows where currency ≠ `CLIENT.base_currency` and account class is monetary), independently compute via the calculator:
   - `clio calc fx-reval --amount <fcy-balance> --book-rate <booked> --closing-rate <closing> --currency <fcy> --base-currency <CLIENT.base_currency> --json`.

4. Sum your independent gain/loss across all foreign balances. Compare against Jaz's auto-posted FX totals from step 2. Variance > `CLIENT.materiality_threshold` → investigate (likely causes: a settlement-realized FX event mid-period shifted the book rate; an explicit `currency.exchangeRate` override on a transaction; multi-leg FX through a bank-side spread). See `jaz-recipes/references/fx-revaluation.md` for the full verification flow and likely-cause taxonomy.

5. Save verification to `recurring/monthly/<period>/fx-reval-verification.json` for audit-prep step 8 supporting schedules.

Per memory rule [Bank FX is Revaluation, not Realized]: bank/cash FX uses `FX Bank Revaluation`. AR/AP FX uses both Realized (settlement-time) and Unrealized (period-end translation).

### Step 7 — Other period-end recognition

For each scheduler-driven recipe whose unwinding journal is due this period:

1. Invoke `search_capsules(filter: {tag: {in: ['prepaid', 'deferred-revenue', 'provision', 'lease', 'loan']}, status: ACTIVE})`.
2. For each capsule, the unwinding/recognition journal is auto-emitted by the scheduler — verify it exists via `search_journals(filter: {capsuleResourceId: {eq: <id>}, valueDate: <period>-end})`.
3. If missing: the scheduler is paused or mis-dated. Surface to practitioner: "Capsule `<title>` has no period-end journal — confirm scheduler status before close."
4. For provision capsules: cross-check unwinding amount via `clio calc provision --amount <pv> --rate <rate> --term <remaining-months> --json` and verify the period slice matches.

**On 404 from `search_capsules`:** the capsule namespace tool is `capsules_and_recipes` per the MCP namespace list. Filter syntax may differ — see jaz-api § Search filter syntax.

### Step 8 — Variance analysis

After steps 4–7, re-invoke `generate_trial_balance(period_end: <period>-end)`. For every row where `|current - prior_period_current| > CLIENT.materiality_threshold`: build a 3-line variance entry (account name, prior, current, delta, hypothesis). Save to `recurring/monthly/<period>/variances.md`. Surface the top 5 to practitioner for review.

### Step 9 — Period-end reports

Invoke and save to `deliverables/<period>/`:

- `generate_balance_sheet(period_end: <period>-end)` → `bs.json`
- `generate_profit_and_loss(period_start: <period>-01, period_end: <period>-end)` → `pl.json`
- `generate_aged_ar(period_end: <period>-end)` → `aged-ar.json`
- `generate_aged_ap(period_end: <period>-end)` → `aged-ap.json`
- `generate_cash_balance(period_end: <period>-end)` → `cash.json`

### Step 10 — Lock + sign-off

For each row in CoA: lock at `<period>-end` via the CoA lock-date update path (see jaz-conversion's Phase 4 lock-date pattern; the public tool is `update_account` with the lock-date field).

Update `ENGAGEMENT.status` to `signed-off` and append the close timestamp to `CLIENT.daily_journal`.

### Step 11 — Verification gate

Before declaring close complete, the agent must affirmatively verify:

1. `generate_trial_balance(period_end: <period>-end)` matches the latest BS + P&L (sums tie).
2. `search_bank_records(status: 'UNRECONCILED', valueDate: {lte: <period>-end})` returns zero across all `CLIENT.bank_accounts[]` (or every residual is documented in `ENGAGEMENT.risk areas`).
3. `search_journals(status: 'DRAFT', valueDate: {lte: <period>-end})` returns zero (no orphan drafts left from steps 4–7).
4. The FA register `generate_fa_summary(period_end: <period>-end)` net-book-value matches the BS Fixed Assets line.

If any of (1)–(4) fails: do NOT mark `signed-off`. Surface the failed check.

---

## Common error classes and recovery

| Error class | Where | Recovery |
|---|---|---|
| 422 `valueDate` format | any tool | Re-format as YYYY-MM-DD (jaz-api rule 3); retry. |
| 422 `period_end_in_future` | `generate_*_blueprint` / `generate_trial_balance` | `ENGAGEMENT.period` wrong; halt and confirm with practitioner. |
| 422 `period_already_locked` | any write op | Period was locked previously; halt and confirm re-open intent. |
| 422 `account_not_found` | `execute_recipe`, `create_journal`, `bulk_finalize_drafts` | GL account missing from CoA; create via `create_account` or remap CLIENT.md. |
| 422 `journal_unbalanced` | `bulk_finalize_drafts` | Recipe regression. Halt; do not retry. |
| 422 `invoice_status_invalid` | `reconcile_invoice_receipt` | Invoice still DRAFT; `finalize_invoice` first. |
| 404 `account_resource_id` | `search_bank_records`, `list_currency_rates` | Stale resourceId or missing rate; re-resolve via `list_bank_accounts` / load rate via `add_currency_rate`. |
| 500 transient | any | Retry once with 5s backoff; second 500 → halt and capture `requestId`. |

(Field-name and error-recovery depth lives in `jaz-api/SKILL.md`. This file enumerates only what monthly-close specifically encounters.)
