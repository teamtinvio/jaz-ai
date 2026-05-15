# Month-End Close

> The foundational close cadence — every quarter-end and year-end builds on it. For an SMB, 1-3 days depending on transaction volume. Driver tool: `generate_month_end_blueprint`.

## Tools, recipes, calculators this job uses

### MCP tools — pre-close gates
- **`generate_month_end_blueprint(period: <YYYY-MM>, currency: <base>)`** — step 0: emit phased close checklist for the agent to execute.
- **`search_invoices(filter: {valueDate: {between: [<period-start>, <period-end>]}}, sort: 'valueDate:asc', limit: 200)`** — step 1: confirm sales invoices entered. Paginate via `offset`.
- **`search_bills(filter: {valueDate: {between: [<period-start>, <period-end>]}}, ...)`** — step 2: confirm purchase bills entered.
- **`search_bank_records(accountResourceId: <id>, status: 'UNRECONCILED', valueDateRange: {from, to})`** — step 3: pull unreconciled bank statement entries per account.
- **`generate_aged_ar(period_end: <date>)` / `generate_aged_ap(period_end: <date>)`** — steps 4-5: aging reports tied to TB AR / AP balances.

### MCP tools — accruals + valuations
- **`plan_recipe(recipe: 'accrued-expense', ...)` / `execute_recipe(...)`** — step 6: per `CLIENT.recurring_accruals[]` whose `last_posted < period_end`.
- **`plan_recipe(recipe: 'prepaid-expense', ...)`** — step 7: only for new prepaid setup; ongoing recognition runs from the scheduler created at setup.
- **`plan_recipe(recipe: 'deferred-revenue', ...)`** — step 8: same setup-vs-recognition note as prepaid.
- **`plan_recipe(recipe: 'depreciation', ...)`** — step 9: only when an asset uses non-SL method (DDB, 150DB) — Jaz native FA handles SL automatically. Verify FA register first.
- **`plan_recipe(recipe: 'leave-accrual', ...)` / `execute_recipe(...)`** — step 10: monthly leave accrual; the engine creates the scheduler so it auto-fires next month.
- **FX revaluation** — step 12: **Jaz auto-handles**. The recipe is verification-only via `clio calc fx-reval`; do NOT invoke `execute_recipe(recipe: 'fx-reval', ...)` (would double-post).
- **`plan_recipe(recipe: 'ecl', ...)`** — step 13: top-up bad-debt provision based on `generate_aged_ar` buckets.

### MCP tools — reconciliation execution
- **`view_auto_reconciliation(bankAccountResourceId: <id>)`** — step 3: READ-ONLY suggestions (does NOT write).
- **`apply_bank_rule(...)`** — step 3: rule-driven recon.
- **`quick_reconcile(...)` / `reconcile_direct_cash_entry(...)` / `reconcile_cash_journal(...)` / `reconcile_manual_journal(...)` / `reconcile_cash_transfer(...)` / `reconcile_invoice_receipt(...)` / `reconcile_bill_receipt(...)`** — step 3: per matched pair from the cascade.

### MCP tools — verification + close
- **`generate_trial_balance(period_end: <date>)`** — step 14: master reconciliation.
- **`generate_profit_and_loss(period_start, period_end)`** — step 15.
- **`generate_balance_sheet(period_end)`** — step 16.
- **`search_journals(filter: {status: 'DRAFT', valueDate: {between: [<period-start>, <period-end>]}})`** — step 17: gate on zero drafts.
- **`update_journal(resourceId: <each id>, saveAsDraft: false)  // loop per id — no bulk-finalize-journals tool yet`** — step 17: clear residual drafts before lock.
- **`update_account(resourceId: <CoA root>, lockDate: <period-end>)`** — step 18: lock the period.

### Calculators (cross-check, no API key needed)
- **`clio calc accrued-expense`** — step 6: independently compute accrual amount.
- **`clio calc prepaid-expense`** / **`clio calc deferred-revenue`** — steps 7-8: setup events only.
- **`clio calc depreciation`** — step 9: FA register cross-check.
- **`clio calc fx-reval`** — step 12: independent FX gain/loss for VERIFICATION against what Jaz auto-posted.
- **`clio calc ecl`** — step 13: ECL provision cross-check.

### Cross-references
- Within an engagement: invoked from `practice/references/monthly-close.md` end-to-end. Practice playbook reads CLIENT.md fields (`recurring_accruals[]`, `bank_accounts[]`, `materiality_threshold`, `coa_mapping`, `base_currency`, `multi_currency`) and writes outputs to `recurring/monthly/<period>/`.
- Sibling jobs: `bank-recon.md` (step 3 detail), `payment-run.md` (typically run separately mid-month), `quarter-end-close.md` / `year-end-close.md` (additive on top of this base).
- Recipes invoked: `accrued-expenses.md`, `prepaid-amortization.md`, `deferred-revenue.md`, `declining-balance.md`, `employee-accruals.md`, `bank-loan.md` (verification only — engine emits interest), `fx-revaluation.md`, `bad-debt-provision.md`. See per-recipe files for engine entry points.
- API rules: `jaz-api/SKILL.md` rules 2 (valueDate not issueDate), 14 (saveAsDraft default), 18 (bank-accounts envelope), 31 (currency object shape), 36 (endDate for AR/AP point-in-time), 124 (recon NOT idempotent).

---

## Step 0 — Emit blueprint

```
generate_month_end_blueprint(period: '2025-01', currency: <CLIENT.base_currency>)
```

Save to `recurring/monthly/2025-01/blueprint.json`. Blueprint produces the phased structure this playbook executes.

## Phase 1 — Pre-close gates

### Step 1 — Verify sales invoices entered

```
search_invoices(filter: {valueDate: {between: ['2025-01-01', '2025-01-31']}}, sort: 'valueDate:asc', limit: 200)
```

Compare count + sum against POS / sales register. Missing invoices = understated revenue. Per `jaz-api/SKILL.md` rule 38, paginate via `offset` if `totalElements > 200`.

### Step 2 — Verify bills entered (most common SMB gap)

```
search_bills(filter: {valueDate: {between: ['2025-01-01', '2025-01-31']}}, sort: 'valueDate:asc', limit: 200)
```

Cross-reference against email + supplier portals + physical mail. Late bills = missed expenses = overstated profit. For PDFs in hand: invoke `mcp magic create --file <pdf>` (Jaz Magic OCR + autofill) to generate the bill draft.

### Step 3 — Bank reconciliation

For each `CLIENT.bank_accounts[]`:

1. If `jaz_resource_id` empty: `list_bank_accounts()`, match by `name + currency`, write back to CLIENT.md, ask practitioner to confirm.
2. `search_bank_records(accountResourceId: <jaz_resource_id>, status: 'UNRECONCILED', valueDateRange: {from: '2025-01-01', to: '2025-01-31'}, limit: 200, sort: 'valueDate:asc')`.
3. If results: `clio jobs bank-recon match --input <records> --tolerance 0.01 --date-window 14 --json` (5-phase cascade matcher). For each match, invoke the matching `reconcile_*` tool.
4. `view_auto_reconciliation(bankAccountResourceId: <id>, recommendationType: 'MAGIC_MATCH')` — READ-ONLY suggestions for residuals; commit via `quick_reconcile` / `apply_bank_rule` / per-entry `reconcile_*`.
5. `generate_bank_recon_summary(period_end: '2025-01-31', accountResourceId: <id>)`. Confirm `unreconciledCount == 0` OR document in `ENGAGEMENT.risk_areas`.

Full detail in `bank-recon.md`. NOT idempotent — see error table.

### Steps 4-5 — AR / AP aging

```
generate_aged_ar(period_end: '2025-01-31')
generate_aged_ap(period_end: '2025-01-31')
```

Use `endDate` (rule 36 — point-in-time, not period-range). Assert: aging totals match `generate_trial_balance` AR/AP lines within `CLIENT.materiality_threshold`. Flag > 60d for credit-control / payment-priority. Disputed bills exit the active aging — annotate practitioner.

## Phase 2 — Accruals & adjustments

### Step 6 — Accrued expenses

For each `CLIENT.recurring_accruals[]` where `last_posted < '2025-01-31'`:

1. Compute amount per `estimation_method` (`prior_month` via `search_journals`, `trailing_3m_avg`, `budget`, `fixed_amount`).
2. Cross-check: `clio calc accrued-expense --amount <computed> --periods 1 --json`.
3. `plan_recipe(recipe: 'accrued-expense', amount: <computed>, glAccount: <CLIENT.recurring_accruals[i].gl_account>, vendor: <CLIENT.recurring_accruals[i].vendor>, valueDate: '2025-01-31', reversalDate: '2025-02-01')`.
4. Resolve `requiredAccounts` + `needsContact` (search/create as needed).
5. `execute_recipe(...)`. Engine emits dual-entry accrual + reversal scheduler.
6. `validate_journal_draft(resourceId: <id>)` for each draft journal.
7. After all accruals processed: `update_journal(resourceId: <each id>, saveAsDraft: false)  // loop per id — no bulk-finalize-journals tool yet`.

Cross-check: `generate_trial_balance(period_end: '2025-01-31')`. Sum credit movements against accrual liability accounts. Verify `|sum - expected| ≤ CLIENT.materiality_threshold`.

### Step 7 — Prepaid expense recognition (finalize this period's pre-emitted journal)

For each existing `Prepaid Expenses` capsule (via `search_capsules(filter: {capsuleType: {eq: 'Prepaid Expenses'}})`):

1. `search_journals(filter: {capsuleResourceId: {eq: <capsule.id>}, valueDate: {between: ['2025-01-01', '2025-01-31']}, status: {eq: 'DRAFT'}})`. The recipe pre-emitted this period's recognition journal as DRAFT at recipe-execution time.
2. If empty: either the recipe was set up wrong (no journal for this period — investigate via `search_journals` without status filter to see if it's already ACTIVE, then skip), OR the practitioner went off-recipe. Surface to practitioner.
3. If found: collect resourceIds, then `update_journal(resourceId: <each id>, saveAsDraft: false)  // loop per id — no bulk-finalize-journals tool yet`.
4. New prepaid setups during this period (a new prepaid started this month): invoke `plan_recipe(recipe: 'prepaid-expense', ...)` per `prepaid-amortization.md` — this creates the bill + N future-dated DRAFT journals; the current period's journal is then in the bulk_finalize_drafts queue above.

### Step 8 — Deferred revenue recognition

Mirror of step 7. Existing `Deferred Revenue` capsules: search for this period's DRAFT journal in each, then `bulk_finalize_drafts`. New deferred setups: `plan_recipe(recipe: 'deferred-revenue', ...)` then handle the current period's journal in the same bulk_finalize.

### Step 9 — Depreciation

```
search_fixed_assets(filter: {status: {eq: 'ACTIVE'}, depreciationMethod: {in: ['ddb', '150db']}})
```

For Jaz-native SL assets: depreciation auto-posts; verify via `generate_fa_summary(period_end: '2025-01-31')` showing month's depreciation movement. For non-SL methods returned above: `plan_recipe(recipe: 'depreciation', method: 'ddb' | '150db', cost, salvage, life, ...)` per asset, then `execute_recipe`.

### Step 10 — Employee benefit accruals

If `CLIENT.headcount > 0` and `CLIENT.tracks_leave_balances == true`:

```
plan_recipe(recipe: 'leave-accrual', headcount: <CLIENT.headcount>, daysPerEmployee: <CLIENT.leave_days_per_year>, dailyRate: <avg-daily-rate>, startDate: '2025-01-01', termMonths: 12)
```

On first month of FY only — engine creates the scheduler and posts the first accrual. Subsequent months: scheduler emits automatically. Cross-check via `clio calc leave-accrual`.

### Step 11 — Loan interest (finalize this period's pre-emitted journal)

For each active loan capsule (via `search_capsules(filter: {capsuleType: {eq: 'Loan Repayment'}})`):

1. `search_journals(filter: {capsuleResourceId: {eq: <loan-capsule-id>}, valueDate: {between: ['2025-01-01', '2025-01-31']}, status: {eq: 'DRAFT'}})`. The `loan` recipe pre-emitted all `termMonths` future-dated DRAFT journals at execution time — this period's repayment is one of them.
2. Should return exactly one DRAFT journal per active loan. Each is a 3-line entry (debit Loan Payable, debit Interest Expense, credit Cash) with the correct amortization split for the period.
3. Collect resourceIds, then `update_journal(resourceId: <each id>, saveAsDraft: false)  // loop per id — no bulk-finalize-journals tool yet`.
4. Do NOT post manual loan-interest accruals — the recipe already emitted the journal with the correct split per `clio calc loan` schedule.

If a loan was newly disbursed this period: invoke `plan_recipe(recipe: 'loan', ...)` then `execute_recipe`; the disbursement (cash-in) and this period's repayment journal are both included in the engine output.

## Phase 3 — Valuations

### Step 12 — FX revaluation (verification only — Jaz auto-handles)

**Jaz auto-handles FX revaluation for ALL foreign-currency monetary balances** (AR, AP, cash, bank, intercompany journals, term deposits, FX provisions). Period-end translation per IAS 21.23 happens inside the platform automatically. **DO NOT invoke `execute_recipe(recipe: 'fx-reval', ...)` — would double-post.**

This step is a verification cross-check. If `CLIENT.multi_currency == true`:

1. Pull what Jaz auto-posted to FX accounts during the period:
```
search_accounts(filter: {name: {in: ['FX Unrealized Gain', 'FX Unrealized Loss', 'FX Bank Revaluation']}})
generate_general_ledger(period_end: '2025-01-31', accountResourceIds: [<FX account ids>], groupBy: 'ACCOUNT')
```

2. For each foreign-currency monetary balance at period end (from a separate `generate_general_ledger` filtered to non-base-currency accounts), independently compute:
```
clio calc fx-reval --amount <foreign> --book-rate <historical> --closing-rate <list_currency_rates valueDate: '2025-01-31'> --currency <code> --base-currency <CLIENT.base_currency> --json
```

3. Sum your independent gain/loss across all foreign balances. Compare against Jaz's auto-posted FX totals from step 1. Variance > `CLIENT.materiality_threshold` → investigate (see `fx-revaluation.md` for likely causes — settlement-realized FX shifts, explicit `currency.exchangeRate` overrides, multi-leg FX through bank-side spreads).

4. Save verification to `recurring/monthly/<period>/fx-reval-verification.json` for audit-prep step 8 supporting schedules.

Per memory rule [Bank FX is Revaluation, not Realized]: bank/cash FX uses `FX Bank Revaluation` (not Realized). AR/AP FX uses both Realized (settlement) and Unrealized (period-end translation).

### Step 13 — ECL review (typically quarterly, monthly check)

Mental check on AR aging > 90d bucket changes. If material change vs prior month: invoke ECL recipe.

```
plan_recipe(recipe: 'ecl', receivables: <generate_aged_ar.buckets>, ratesPerBucket: <CLIENT.ecl_rates>)
```

For most SMBs, formal ECL adjustment runs in `quarter-end-close.md`. Skip in routine monthly close unless a major customer default / dispute occurred.

## Phase 4 — Verification

### Step 14 — Trial balance

```
generate_trial_balance(period_end: '2025-01-31')
```

Save to `recurring/monthly/2025-01/tb-close.json`. Assert:
- Debits == Credits (exact).
- Cash / bank balances match step 3 bank reconciliation summaries.
- AR balance == `generate_aged_ar.totalOutstanding` from step 4.
- AP balance == `generate_aged_ap.totalOutstanding` from step 5.
- No unexpected balances (negative cash, credit balances on expense accounts).

### Steps 15-16 — P&L + Balance Sheet

```
generate_profit_and_loss(period_start: '2025-01-01', period_end: '2025-01-31')
generate_balance_sheet(period_end: '2025-01-31')
```

Save both. Assert: BS Total Assets == Total Liabilities + Total Equity. P&L net profit ties to BS Equity Movement.

### Step 17 — Prior-month variance + draft gate

Compare against `recurring/monthly/<prior-period>/tb-close.json`. Surface to practitioner top 3 deltas where `|delta| > CLIENT.materiality_threshold`, descending magnitude, with 1-line possible-explanation.

```
search_journals(filter: {status: {eq: 'DRAFT'}, valueDate: {between: ['2025-01-01', '2025-01-31']}})
search_invoices(filter: {status: {eq: 'DRAFT'}, valueDate: {between: ['2025-01-01', '2025-01-31']}})
search_bills(filter: {status: {eq: 'DRAFT'}, valueDate: {between: ['2025-01-01', '2025-01-31']}})
```

All three must return zero. If any rows: classify per practitioner judgment, then `bulk_finalize_drafts` for the keep-set OR delete via `delete_journal` / `delete_invoice` / `delete_bill`.

## Phase 5 — Lock

### Step 18 — Move lock date forward

```
update_account(resourceId: <CoA root>, lockDate: '2025-01-31')
```

Locks the period — prevents accidental backdated entries. Move forward only. Reverse only if posting corrections (and re-lock immediately after).

---

## Common error classes and recovery

| Source | Error | Recovery |
|--------|-------|----------|
| `generate_month_end_blueprint` | 422 `period_end_in_future` | `ENGAGEMENT.period` set wrong. Halt; surface to practitioner. |
| `generate_month_end_blueprint` | 422 `period_already_locked` | Period closed in prior engagement. Halt; confirm re-open vs duplicate engagement. |
| `search_bank_records` | 404 | Account doesn't exist or `jaz_resource_id` stale. Re-run `list_bank_accounts`. |
| `quick_reconcile` | 422 `amount_mismatch` | Cascade tolerance too loose. Surface to practitioner; accept manually OR reject. |
| `reconcile_invoice_receipt` | 422 `invoice_status_invalid` | Matched invoice still DRAFT. `finalize_invoice(resourceId: <id>)` first. |
| `reconcile_*` | (any) — NOT idempotent | Per `jaz-api/SKILL.md` rule 124. On 500 / network error, do NOT retry. Confirm reconciled state via `view_auto_reconciliation` or `search_bank_records(status: 'RECONCILED')` first. |
| `plan_recipe` | 422 `account_not_found` / `contact_not_found` | Step resolution incomplete. `search_accounts` / `search_contacts`; create if missing. Halt and surface to practitioner. |
| `bulk_finalize_drafts` | 422 `journal_unbalanced` | Recipe regression. Halt; do not retry without manual review. |
| `update_account` lockDate | 422 `lock_date_violated` | Open drafts in the period. Re-run step 17 gates. |
| FA `depreciation` posting | 0 movement when expected | Asset not `status: ACTIVE` in FA register. `update_fixed_asset(resourceId: <id>, status: 'ACTIVE')` first. |

---

## Cross-references back to engagements

- `practice/references/monthly-close.md` — the canonical end-to-end orchestration. This job is what the practice playbook invokes; the practice playbook owns the CLIENT.md / ENGAGEMENT.md context wiring.
- `practice/references/quarterly-gst.md` — invokes this job + GST-specific extras (step 9 GST filing, F5 box mapping).
- `practice/references/annual-statutory.md` step 1 — final monthly close before year-end-close + audit-prep.
