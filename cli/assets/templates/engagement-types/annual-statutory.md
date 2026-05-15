---
v: 1
type: annual-statutory
period: "{{period}}"                   # YYYY (the FY being closed), e.g. 2025
status: active
scope_summary: "Year-end close + audit prep + corporate tax (Form C-S) + ACRA annual return + IRAS ECI for FY{{period}}."
opened_date: "{{opened_date}}"
target_completion_date: ""             # ECI = 3 months after FY-end; Form C-S = 30 Nov YA; ACRA AR = 7 months after FY-end.
jaz_org_id: ""
---

# Annual statutory — FY{{period}}

Practitioner checklist. Tick boxes as the underlying Jaz tools succeed. Agent reads `jaz-practice/references/annual-statutory.md` for the full playbook.

**Pre-flight:** All 12 monthly closes for FY`{{period}}` (or 4 quarter-ends) must be `signed-off`. `CLIENT.fy_end` defines the period boundary. `CLIENT.corporate_tax_bracket` drives exemption path.

## What this engagement uses

**Tools.** `generate_year_end_blueprint` · `generate_audit_prep_blueprint` · `generate_statutory_filing_blueprint` (the three drivers) · monthly-close tools (TB/BS/P&L, search_*, reconcile_*, bulk_finalize_drafts) plus `generate_cashflow` · `generate_equity_movement` · `generate_aged_ar` · `generate_aged_ap` · `generate_fa_summary` · `generate_fa_recon_summary` · `search_fixed_assets` · `search_capsules` (intercompany + lease + provision capsules).

**Recipes.** `plan_recipe(recipe: 'depreciation', …)` (annual close per asset) · `plan_recipe(recipe: 'fx-reval', …)` (year-end revaluation per non-base-currency monetary balance) · `plan_recipe(recipe: 'provision', …)` (IAS 37 provisions remeasurement) · `plan_recipe(recipe: 'ecl', …)` (year-end IFRS 9 true-up) · `plan_recipe(recipe: 'asset-disposal', …)` (any disposal that surfaced during FA review) · `plan_recipe(recipe: 'dividend', …)` (post profit-finalization declaration).

**Calculators.** `clio calc loan` (year-end loan schedules) · `clio calc lease` (IFRS 16 unwinding for ROU register) · `clio calc provision` (PV unwinding) · `clio calc asset-disposal` (gain/loss verification) · `clio calc dividend` · `clio jobs statutory-filing sg-cs` (Singapore Form C-S computation engine) · `clio jobs statutory-filing sg-ca` (capital allowance schedule).

**Cross-references.** `jaz-jobs/SKILL.md § generate_year_end_blueprint` / `§ generate_audit_prep_blueprint` / `§ generate_statutory_filing_blueprint` · `jaz-jobs/references/sg-tax/wizard-workflow.md` for the Form C-S wizard playbook · `jaz-recipes/references/{asset-disposal,fx-revaluation,provisions,bad-debt-provision,dividend,intercompany,capital-wip}.md` · `jaz-api/SKILL.md § Reports` (rules 36–37), `§ Withholding Tax` (45, 98), `§ Currency Rates` (39, 49, 105).

## Scope & deliverables checklist

### Workstream 1 — Year-end close (`audit/`)

- [ ] Year-end blueprint — `generate_year_end_blueprint(period: <ENGAGEMENT.period>, currency: <CLIENT.base_currency>)`
- [ ] All 12 monthly closes signed-off (precondition)
- [ ] Year-end FX reval — every monetary balance ≠ `CLIENT.base_currency` revalued at FY-end closing rate
- [ ] FA register review — `generate_fa_summary` + `generate_fa_recon_summary`; disposals booked via `plan_recipe(recipe: 'asset-disposal', …)`
- [ ] ECL year-end true-up — `plan_recipe(recipe: 'ecl', …)` over `generate_aged_ar` output
- [ ] Provisions remeasured — `plan_recipe(recipe: 'provision', …)` for every active IAS 37 capsule
- [ ] Intercompany elimination — every intercompany capsule reconciled and confirmed
- [ ] Final TB pulled — `generate_trial_balance(period_end: <FY-end>)` saved to `recurring/annual/<period>/audit/tb.json`
- [ ] Full report set — BS, P&L, cashflow (`generate_cashflow`), equity movement (`generate_equity_movement`), aged AR/AP, FA summary saved to `deliverables/`

### Workstream 2 — Audit prep (`audit/`)

- [ ] Audit-prep blueprint — `generate_audit_prep_blueprint(period: <ENGAGEMENT.period>)`
- [ ] AR/AP confirmations — `generate_supplier_recon_blueprint` per material supplier; AR confirmation list per material customer
- [ ] Lead schedules — TB tied to BS tied to P&L tied to cashflow
- [ ] Sample selections delivered to auditor
- [ ] Auditor queries log maintained — every query has owner + SLA

### Workstream 3 — Corporate tax (`tax/`)

- [ ] Statutory-filing blueprint — `generate_statutory_filing_blueprint`
- [ ] Form C-S wizard run — `clio jobs statutory-filing sg-cs --input tax-data.json` per `jaz-jobs/references/sg-tax/wizard-workflow.md`
- [ ] Capital allowances — `clio jobs statutory-filing sg-ca` for each FA category
- [ ] Add-backs reviewed — entertainment, motor, donations >250%, fines & penalties
- [ ] Exemption applied — SUTE/PTE per `CLIENT.corporate_tax_bracket`
- [ ] Form C-S filed on myTax Portal; reference captured in `deliverables/tax/iras-ack-form-cs.txt`

### Workstream 4 — IRAS ECI (`iras/`)

- [ ] ECI estimate computed (3 months after FY-end deadline)
- [ ] ECI filed on myTax Portal; reference captured in `deliverables/iras/eci-ack.txt`

### Workstream 5 — ACRA annual return (`acra/`)

- [ ] AGM minutes drafted (where required)
- [ ] Financial statements lodged (XBRL where applicable)
- [ ] Annual return filed on BizFile+; reference captured in `deliverables/acra/ar-ack.txt`

### Workstream 6 — Lock + roll-forward

- [ ] Period locked at FY-end across all accounts
- [ ] CYE rollover — retained earnings rolled per `generate_year_end_blueprint` rollover step
- [ ] `ENGAGEMENT.status` transitioned to `filed`

## Open queries with client

- [ ] _Question_ — _asked YYYY-MM-DD_ — _waiting on_ — _SLA YYYY-MM-DD_

## Risk areas

Going-concern indicators, related-party transactions requiring disclosure, tax positions taken (group relief, capital-allowance pooling, prior-year loss utilization), FX revaluation gaps at FY-end, FA disposals discovered late, intercompany imbalances, dividend declaration timing vs profit availability.

## Decisions log

Append-only. Most recent first. Year-end accounting-treatment judgments and tax positions.

- _YYYY-MM-DD_ — _decision_ — _rationale_

## Daily journal

- _YYYY-MM-DD_ — _what happened_
