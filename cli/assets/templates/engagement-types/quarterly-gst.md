---
v: 1
type: quarterly-gst
period: "{{period}}"                   # YYYY-QN, e.g. 2026-Q1
status: active
scope_summary: "Prepare and submit IRAS GST Form F5 for {{period}} — tax-ledger pull, Box 1-16 mapping, output/input cross-check, IRAS file."
opened_date: "{{opened_date}}"
target_completion_date: ""             # IRAS deadline = 1 month after quarter-end. Set accordingly.
jaz_org_id: ""
---

# Quarterly GST F5 — {{period}}

Practitioner checklist. Tick boxes as the underlying Jaz tools succeed. Agent reads `jaz-practice/references/quarterly-gst.md` for the full playbook.

**Pre-flight:** `CLIENT.gst_scheme` must be `quarterly`. `CLIENT.gst_registration_number` must be set. If either is missing, halt and surface "GST setup incomplete on CLIENT.md — confirm before proceeding."

## What this engagement uses

**Tools.** `generate_gst_vat_blueprint` (drives the sequence) · `generate_vat_ledger` (the F5 source-of-truth ledger) · `search_invoices(status: APPROVED, valueDate: …)` (output tax cross-check) · `search_bills(status: APPROVED, valueDate: …)` (input tax cross-check) · `search_tax_profiles` (verify F5 box mapping per profile) · `export_records` (vat-ledger CSV) · `download_export` (download the generated CSV for IRAS submission attachment).

**Recipes.** None. GST is tooling-heavy, not recipe-heavy. Exception: if ECL review is folded in (per jaz-recipes guidance that ECL is reviewed alongside F5 prep), `plan_recipe(name: 'ecl', …)`.

**Calculators.** `clio calc ecl` if ECL review is bundled with F5 prep.

**Cross-references.** `jaz-jobs/SKILL.md § generate_gst_vat_blueprint` and `jaz-jobs/references/gst-vat-filing.md` for blueprint structure and F5 box mapping · `jaz-api/SKILL.md § Tax Profile Scoping` (rule 100) and `§ Transaction References` (rule 104) · `jaz-recipes/references/bad-debt-provision.md` if ECL is bundled.

## Scope & deliverables checklist

- [ ] Quarter frame confirmed — `ENGAGEMENT.period` (YYYY-QN) and the 3 contained months are all closed (each has a signed-off `monthly-close` engagement OR period is locked)
- [ ] Blueprint generated — `generate_gst_vat_blueprint(period: <ENGAGEMENT.period>, currency: <CLIENT.base_currency>)`
- [ ] VAT ledger pulled — `generate_vat_ledger(period_start: <Q-start>, period_end: <Q-end>)` saved to `recurring/quarterly/<period>/vat-ledger.json`
- [ ] Output tax cross-check — sum of `search_invoices(status: APPROVED, valueDate: <Q-start>..<Q-end>)` tax lines matches Box 6 (Output Tax Due) within rounding
- [ ] Input tax cross-check — sum of `search_bills(status: APPROVED, valueDate: <Q-start>..<Q-end>)` tax lines matches Box 7 (Input Tax Claimed) within rounding, after blocked-input-tax filter
- [ ] Blocked input tax filtered — entertainment, motor, medical bills excluded per `CLIENT.tax setup quirks`
- [ ] Reverse-charge applied — imported services with `taxProfile.taxType = REVERSE_CHARGE` populate Box 14 + Box 7
- [ ] Mixed-supply allocation reviewed — partial exemption ratio applied if `CLIENT.corporate_tax_bracket = partial_exemption` (or noted in COA mapping)
- [ ] F5 box mapping reconciled — Box 1-16 sums tie back to `vat-ledger.json` totals
- [ ] CSV exported for IRAS — `export_records` then `download_export` to `deliverables/gst-f5-<period>.csv`
- [ ] F5 filed on myTax Portal — submission reference captured in `deliverables/iras-ack.txt`
- [ ] `ENGAGEMENT.status` transitioned to `filed`

## Open queries with client

- [ ] _Question_ — _asked YYYY-MM-DD_ — _waiting on_ — _SLA YYYY-MM-DD_

## Risk areas

Wrong tax period on transactions (especially manual journals where `valueDate` was set in the wrong quarter), reverse-charge under/over-claim on imported services, blocked-input-tax leakage (especially client entertainment), mixed-supply allocation drift, late-arrival bills that should have hit the prior quarter (timing-rule exception).

## Decisions log

Append-only. Most recent first. Quarter-specific judgment calls only.

- _YYYY-MM-DD_ — _decision_ — _rationale_

## Daily journal

- _YYYY-MM-DD_ — _what happened_
