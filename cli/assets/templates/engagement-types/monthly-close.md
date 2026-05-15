---
v: 1
type: monthly-close
period: "{{period}}"                   # YYYY-MM, e.g. 2026-04
status: active
scope_summary: "Close the books for {{period}} — TB review, bank recon, accruals, depreciation, FX reval, period-end reports, lock."
opened_date: "{{opened_date}}"
target_completion_date: ""
jaz_org_id: ""
---

# Monthly close — {{period}}

Practitioner checklist. Tick boxes as the underlying Jaz tools succeed. Agent reads `jaz-practice/references/monthly-close.md` for the full playbook.

## What this engagement uses

**Tools.** `generate_month_end_blueprint` (drives the whole sequence) · `generate_trial_balance` · `generate_balance_sheet` · `generate_profit_and_loss` · `search_bank_records` (per `CLIENT.bank_accounts[]`) · `quick_reconcile` / `reconcile_*` family · `bulk_finalize_drafts` · `validate_journal_draft`.

**Recipes.** `plan_recipe(recipe: 'accrued-expense', …)` (per `CLIENT.recurring_accruals[]`) · `plan_recipe(recipe: 'depreciation', …)` (FA cross-check) · `plan_recipe(recipe: 'fx-reval', …)` (any monetary balance ≠ `CLIENT.base_currency`) · `plan_recipe(recipe: 'prepaid-expense', …)` (period recognition).

**Calculators.** `clio calc depreciation` (FA register cross-check) · `clio calc accrued-expense` (accrual amounts) · `clio calc fx-reval` (period FX gain/loss) · `clio calc prepaid-expense` (amortization slice).

**Cross-references.** `jaz-jobs/SKILL.md § generate_month_end_blueprint` for blueprint structure · `jaz-recipes/references/{accrued-expenses,fx-revaluation,prepaid-amortization,declining-balance}.md` for IFRS treatment · `jaz-api/SKILL.md § Identifiers & Dates` and `§ Transaction Creation` for field/error gotchas.

## Scope & deliverables checklist

- [ ] Period frame confirmed — `ENGAGEMENT.period` matches the close month, falls inside `CLIENT.fy_end` boundaries
- [ ] Blueprint generated — `generate_month_end_blueprint(period: <ENGAGEMENT.period>, currency: <CLIENT.base_currency>)`
- [ ] Trial balance pulled — `generate_trial_balance(period_end: <ENGAGEMENT.period>-end)` saved to `recurring/monthly/<period>/tb.json`
- [ ] Bank recon cleared — for each `CLIENT.bank_accounts[i]`: `search_bank_records(accountResourceId: …, status: UNRECONCILED)` returns empty after `reconcile_*` cycle
- [ ] Accruals booked — every `CLIENT.recurring_accruals[i]` with `last_posted < period_end` has a recipe-output journal in DRAFT, then `bulk_finalize_drafts`
- [ ] Depreciation posted — FA register cross-checked against `clio calc depreciation` for every active asset
- [ ] FX revaluation booked — every monetary balance whose `currency ≠ CLIENT.base_currency` has a `plan_recipe(recipe: 'fx-reval', …)` journal
- [ ] Prepaid recognition booked — every prepaid scheduler has a posting for the period
- [ ] Variance analysis surfaced — `|delta| > CLIENT.materiality_threshold` items explained in `recurring/monthly/<period>/variances.md`
- [ ] Reports finalized — `generate_balance_sheet`, `generate_profit_and_loss`, `generate_aged_ar`, `generate_aged_ap` saved to `deliverables/`
- [ ] Period locked — lock date set on every account at `<period>-end`
- [ ] `ENGAGEMENT.status` transitioned to `signed-off`

## Open queries with client

- [ ] _Question_ — _asked YYYY-MM-DD_ — _waiting on_ — _SLA YYYY-MM-DD_

## Risk areas

Adjusting journals > `CLIENT.materiality_threshold`, related-party balances pending elimination, FX revaluation gaps if `CLIENT.base_currency` differs from any bank/loan, accruals with `estimation_method: prior_month` when prior month was abnormal.

## Decisions log

Append-only. Most recent first. Period-specific judgment calls only — cross-period decisions go in `CLIENT.md`.

- _YYYY-MM-DD_ — _decision_ — _rationale_

## Daily journal

Append one line per working day so the agent can resume without redoing yesterday's steps.

- _YYYY-MM-DD_ — _what happened_
