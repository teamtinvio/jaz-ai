# Month-End Close

> The foundational close cadence — every quarter-end and year-end builds on it. For an SMB, 1-3 days depending on transaction volume. Walk the phases below in order, calling the named platform tools directly. (Local CLI convenience: `clio jobs month-end --period <YYYY-MM>` prints this same phased checklist.)

## Tools, recipes, calculators this job uses

### Platform tools — pre-close gates
- **`search_invoices(filter: {valueDate: {between: [<period-start>, <period-end>]}}, sort: 'valueDate:asc', limit: 200)`** — step 1: confirm sales invoices entered. Paginate via `offset`.
- **`search_bills(filter: {valueDate: {between: [<period-start>, <period-end>]}}, ...)`** — step 2: confirm purchase bills entered.
- **`search_bank_records(accountResourceId: <id>, status: 'UNRECONCILED', valueDateRange: {from, to})`** — step 3: pull unreconciled bank statement entries per account.
- **`generate_aged_ar(period_end: <date>)` / `generate_aged_ap(period_end: <date>)`** — steps 4-5: aging reports tied to TB AR / AP balances.

### Platform tools — accruals + valuations
- **`plan_recipe(recipe: 'accrued-expense', ...)` / `execute_recipe(...)`** — step 6: per recurring accrual whose last posting predates the period end.
- **`plan_recipe(recipe: 'prepaid-expense', ...)`** — step 7: only for new prepaid setup; ongoing recognition runs from the scheduler created at setup.
- **`plan_recipe(recipe: 'deferred-revenue', ...)`** — step 8: same setup-vs-recognition note as prepaid.
- **`plan_recipe(recipe: 'depreciation', ...)`** — step 9: only when an asset uses non-SL method (DDB, 150DB) — Jaz native FA handles SL automatically. Verify FA register first.
- **`plan_recipe(recipe: 'leave-accrual', ...)` / `execute_recipe(...)`** — step 10: monthly leave accrual; the engine creates the scheduler so it auto-fires next month.
- **FX revaluation** — step 12: **Jaz auto-handles**. The recipe is verification-only via `clio calc fx-reval`; do NOT invoke `execute_recipe(recipe: 'fx-reval', ...)` (would double-post).
- **`plan_recipe(recipe: 'ecl', ...)`** — step 13: top-up bad-debt provision based on `generate_aged_ar` buckets.

### Platform tools — reconciliation execution
- **`view_auto_reconciliation(bankAccountResourceId: <id>)`** — step 3: READ-ONLY suggestions (does NOT write).
- **`apply_bank_rule(...)`** — step 3: rule-driven recon.
- **`quick_reconcile(...)` / `reconcile_direct_cash_entry(...)` / `reconcile_cash_journal(...)` / `reconcile_manual_journal(...)` / `reconcile_cash_transfer(...)` / `reconcile_invoice_receipt(...)` / `reconcile_bill_receipt(...)`** — step 3: per matched pair from the cascade.

### Platform tools — verification + close
- **`generate_trial_balance(period_end: <date>)`** — step 14: master reconciliation.
- **`generate_profit_and_loss(period_start, period_end)`** — step 15.
- **`generate_balance_sheet(period_end)`** — step 16.
- **`search_journals(filter: {status: 'DRAFT', valueDate: {between: [<period-start>, <period-end>]}})`** — step 17: gate on zero drafts.
- **`bulk_update_journals(items: [{resourceId: <id>, saveAsDraft: false}, ...])`** — step 17: clear residual drafts before lock.
- **`update_account(resourceId: <CoA root>, lockDate: <period-end>)`** — step 18: lock the period.

### Calculators (cross-check, no API key needed)
- **`clio calc accrued-expense`** — step 6: independently compute accrual amount.
- **`clio calc prepaid-expense`** / **`clio calc deferred-revenue`** — steps 7-8: setup events only.
- **`clio calc depreciation`** — step 9: FA register cross-check.
- **`clio calc fx-reval`** — step 12: independent FX gain/loss for VERIFICATION against what Jaz auto-posted.
- **`clio calc ecl`** — step 13: ECL provision cross-check.

### Cross-references
- Org inputs this job needs (confirm with the user when not already on file): the list of recurring accruals, the bank accounts, the materiality threshold, the CoA mapping, the base currency, and whether the org is multi-currency.
- Sibling jobs: `bank-recon.md` (step 3 detail), `payment-run.md` (typically run separately mid-month), `quarter-end-close.md` / `year-end-close.md` (additive on top of this base).
- Recipes invoked: `accrued-expense`, `prepaid-expense`, `deferred-revenue`, `depreciation`, `leave-accrual` + `accrued-expense` (employee accruals / bonus), `loan` (verification only — engine emits interest), `fx-reval`, `ecl`. See the transaction-recipes skill for engine entry points.
- API rules: `jaz-api/SKILL.md` rules 2 (valueDate not issueDate), 14 (saveAsDraft default), 18 (bank-accounts envelope), 31 (currency object shape), 36 (endDate for AR/AP point-in-time), 124 (recon NOT idempotent).

---

## Phase sequence

This playbook runs 5 phases for the period: pre-close gates → accruals & adjustments → valuations → verification → lock. Walk them in order, calling the platform tools named in each step. (A local CLI run of `clio jobs month-end --period 2025-01 --currency <base>` prints the same phased checklist.)

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

For each bank account:

1. If you don't already have the account's resourceId: `list_bank_accounts()`, match by `name + currency`, confirm with the user.
2. `search_bank_records(accountResourceId: <bank account resourceId>, status: 'UNRECONCILED', valueDateRange: {from: '2025-01-01', to: '2025-01-31'}, limit: 200, sort: 'valueDate:asc')`.
3. If results: drive the 5-phase cascade matcher (Step 4 in `bank-recon.md`; local CLI: `clio jobs bank-recon match --input <records> --tolerance 0.01 --date-window 14 --json`). For each match, invoke the matching `reconcile_*` tool.
4. `view_auto_reconciliation(bankAccountResourceId: <id>, recommendationType: 'MAGIC_MATCH')` — READ-ONLY suggestions for residuals; commit via `quick_reconcile` / `apply_bank_rule` / per-entry `reconcile_*`.
5. `generate_bank_recon_summary(period_end: '2025-01-31', accountResourceId: <id>)`. Confirm `unreconciledCount == 0` OR document the residuals for the period and surface to the user.

Full detail in `bank-recon.md`. NOT idempotent — see error table.

### Steps 4-5 — AR / AP aging

```
generate_aged_ar(period_end: '2025-01-31')
generate_aged_ap(period_end: '2025-01-31')
```

Use `endDate` (rule 36 — point-in-time, not period-range). Assert: aging totals match `generate_trial_balance` AR/AP lines within the org's materiality threshold. Flag > 60d for credit-control / payment-priority. Disputed bills exit the active aging — annotate for the user.

## Phase 2 — Accruals & adjustments

### Step 6 — Accrued expenses

For each recurring accrual the org runs whose last posting predates `2025-01-31`:

1. Compute amount per the accrual's estimation method (`prior_month` via `search_journals`, `trailing_3m_avg`, `budget`, `fixed_amount`).
2. Cross-check: `clio calc accrued-expense --amount <computed> --periods 1 --json`.
3. `plan_recipe(recipe: 'accrued-expense', amount: <computed>, glAccount: <accrual GL account>, vendor: <accrual vendor>, valueDate: '2025-01-31', reversalDate: '2025-02-01')`.
4. Resolve `requiredAccounts` + `needsContact` (search/create as needed).
5. `execute_recipe(...)`. Engine emits dual-entry accrual + reversal scheduler.
6. `validate_journal_draft(resourceId: <id>)` for each draft journal.
7. After all accruals processed: `bulk_update_journals(items: [{resourceId: <id>, saveAsDraft: false}, ...])`.

Cross-check: `generate_trial_balance(period_end: '2025-01-31')`. Sum credit movements against accrual liability accounts. Verify `|sum - expected| ≤ materiality threshold`.

### Step 7 — Prepaid expense recognition (finalize this period's pre-emitted journal)

For each existing `Prepaid Expenses` capsule (via `search_capsules(filter: {capsuleType: {eq: 'Prepaid Expenses'}})`):

1. `search_journals(filter: {capsuleResourceId: {eq: <capsule.id>}, valueDate: {between: ['2025-01-01', '2025-01-31']}, status: {eq: 'DRAFT'}})`. The recipe pre-emitted this period's recognition journal as DRAFT at recipe-execution time.
2. If empty: either the recipe was set up wrong (no journal for this period — investigate via `search_journals` without status filter to see if it's already ACTIVE, then skip), OR the practitioner went off-recipe. Surface to practitioner.
3. If found: collect resourceIds, then `bulk_update_journals(items: [{resourceId: <id>, saveAsDraft: false}, ...])`.
4. New prepaid setups during this period (a new prepaid started this month): invoke `plan_recipe(recipe: 'prepaid-expense', ...)` (see the `prepaid-expense` recipe in the transaction-recipes skill) — this creates the bill + N future-dated DRAFT journals; the current period's journal is then in the bulk_finalize_drafts queue above.

### Step 8 — Deferred revenue recognition

Mirror of step 7. Existing `Deferred Revenue` capsules: search for this period's DRAFT journal in each, then `bulk_finalize_drafts`. New deferred setups: `plan_recipe(recipe: 'deferred-revenue', ...)` then handle the current period's journal in the same bulk_finalize.

### Step 9 — Depreciation

```
search_fixed_assets(filter: {status: {eq: 'ACTIVE'}, depreciationMethod: {in: ['ddb', '150db']}})
```

For Jaz-native SL assets: depreciation auto-posts; verify via `generate_fa_summary(period_end: '2025-01-31')` showing month's depreciation movement. For non-SL methods returned above: `plan_recipe(recipe: 'depreciation', method: 'ddb' | '150db', cost, salvage, life, ...)` per asset, then `execute_recipe`.

### Step 10 — Employee benefit accruals

If the org has headcount and tracks leave balances:

```
plan_recipe(recipe: 'leave-accrual', headcount: <headcount>, daysPerEmployee: <leave days per year>, dailyRate: <avg-daily-rate>, startDate: '2025-01-01', termMonths: 12)
```

On first month of FY only — engine creates the scheduler and posts the first accrual. Subsequent months: scheduler emits automatically. Cross-check via `clio calc leave-accrual`.

### Step 11 — Loan interest (finalize this period's pre-emitted journal)

For each active loan capsule (via `search_capsules(filter: {capsuleType: {eq: 'Loan Repayment'}})`):

1. `search_journals(filter: {capsuleResourceId: {eq: <loan-capsule-id>}, valueDate: {between: ['2025-01-01', '2025-01-31']}, status: {eq: 'DRAFT'}})`. The `loan` recipe pre-emitted all `termMonths` future-dated DRAFT journals at execution time — this period's repayment is one of them.
2. Should return exactly one DRAFT journal per active loan. Each is a 3-line entry (debit Loan Payable, debit Interest Expense, credit Cash) with the correct amortization split for the period.
3. Collect resourceIds, then `bulk_update_journals(items: [{resourceId: <id>, saveAsDraft: false}, ...])`.
4. Do NOT post manual loan-interest accruals — the recipe already emitted the journal with the correct split per `clio calc loan` schedule.

If a loan was newly disbursed this period: invoke `plan_recipe(recipe: 'loan', ...)` then `execute_recipe`; the disbursement (cash-in) and this period's repayment journal are both included in the engine output.

## Phase 3 — Valuations

### Step 12 — FX revaluation (verification only — Jaz auto-handles)

**Jaz auto-handles FX revaluation for ALL foreign-currency monetary balances** (AR, AP, cash, bank, intercompany journals, term deposits, FX provisions). Period-end translation per IAS 21.23 happens inside the platform automatically. **DO NOT invoke `execute_recipe(recipe: 'fx-reval', ...)` — would double-post.**

This step is a verification cross-check. If the org is multi-currency:

1. Pull what Jaz auto-posted to FX accounts during the period:
```
search_accounts(filter: {name: {in: ['FX Unrealized Gain', 'FX Unrealized Loss', 'FX Bank Revaluation']}})
generate_general_ledger(period_end: '2025-01-31', accountResourceIds: [<FX account ids>], groupBy: 'ACCOUNT')
```

2. For each foreign-currency monetary balance at period end (from a separate `generate_general_ledger` filtered to non-base-currency accounts), independently compute:
```
clio calc fx-reval --amount <foreign> --book-rate <historical> --closing-rate <list_currency_rates valueDate: '2025-01-31'> --currency <code> --base-currency <base currency> --json
```

3. Sum your independent gain/loss across all foreign balances. Compare against Jaz's auto-posted FX totals from step 1. Variance > materiality threshold → investigate (see the `fx-reval` recipe for likely causes — settlement-realized FX shifts, explicit `currency.exchangeRate` overrides, multi-leg FX through bank-side spreads).

4. Keep the verification output for audit-prep step 8 supporting schedules.

Per memory rule [Bank FX is Revaluation, not Realized]: bank/cash FX uses `FX Bank Revaluation` (not Realized). AR/AP FX uses both Realized (settlement) and Unrealized (period-end translation).

### Step 13 — ECL review (typically quarterly, monthly check)

Mental check on AR aging > 90d bucket changes. If material change vs prior month: invoke ECL recipe.

```
plan_recipe(recipe: 'ecl', receivables: <generate_aged_ar.buckets>, ratesPerBucket: <org ECL loss-rate matrix>)
```

For most SMBs, formal ECL adjustment runs in `quarter-end-close.md`. Skip in routine monthly close unless a major customer default / dispute occurred.

## Phase 4 — Verification

### Step 14 — Trial balance

```
generate_trial_balance(period_end: '2025-01-31')
```

Save the close trial balance for the period (you'll diff next month against it). Assert:
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

Compare against the prior period's close trial balance. Surface to the user the top 3 deltas where `|delta| > materiality threshold`, descending magnitude, with a 1-line possible-explanation.

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
| `search_bank_records` | 404 | Account doesn't exist or the bank account resourceId is stale. Re-run `list_bank_accounts`. |
| `quick_reconcile` | 422 `amount_mismatch` | Cascade tolerance too loose. Surface to the user; accept manually OR reject. |
| `reconcile_invoice_receipt` | 422 `invoice_status_invalid` | Matched invoice still DRAFT. `finalize_invoice(resourceId: <id>)` first. |
| `reconcile_*` | (any) — NOT idempotent | Per `jaz-api/SKILL.md` rule 124. On 500 / network error, do NOT retry. Confirm reconciled state via `view_auto_reconciliation` or `search_bank_records(status: 'RECONCILED')` first. |
| `plan_recipe` | 422 `account_not_found` / `contact_not_found` | Step resolution incomplete. `search_accounts` / `search_contacts`; create if missing. Halt and surface to the user. |
| `bulk_finalize_drafts` | 422 `journal_unbalanced` | Recipe regression. Halt; do not retry without manual review. |
| `update_account` lockDate | 422 `lock_date_violated` | Open drafts in the period. Re-run step 17 gates. |
| `update_account` lockDate | 422 `period_already_locked` | Period already closed. Confirm with the user before re-opening. |
| FA `depreciation` posting | 0 movement when expected | Asset not `status: ACTIVE` in FA register. `update_fixed_asset(resourceId: <id>, status: 'ACTIVE')` first. |

---

## Cross-references

- `quarter-end-close.md` — invokes this job ×3, then adds GST-specific extras (GST filing, F5 box mapping) and other quarterly steps.
- `year-end-close.md` — the final monthly close for the FY runs before year-end-close + audit-prep.
- `bank-recon.md` — the step-3 detail.
