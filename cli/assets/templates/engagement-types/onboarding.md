---
v: 1
type: onboarding
period: "{{period}}"                   # Free-text, e.g. "FY2026 takeover from Xero" or "Fresh start 2026-04"
status: active
scope_summary: "New-client takeover — opening balances, COA setup, multi-currency, banking, first-period reconciliation."
opened_date: "{{opened_date}}"
target_completion_date: ""             # Typically 30 days from prior firm handover.
jaz_org_id: ""
---

# Onboarding — {{period}}

Practitioner checklist. Tick boxes as the underlying Jaz tools succeed. Agent reads `jaz-practice/references/onboarding.md` for the full playbook.

**Scope:** ACCOUNTING workflow only. KYC, AML, beneficial-ownership, and engagement-letter steps are firm-administrative and live elsewhere — not in this engagement.

## What this engagement uses

**Tools.** `get_organization` (verify `CLIENT.jaz_org_id` resolves) · `list_currencies` · `add_currency` (multi-currency setup) · `add_currency_rate` / `bulk_upsert_currency_rates` (FYE rates) · `search_accounts` + `create_account` (or `bulk_upsert_items` patterns equivalent — note: COA bulk-upsert is a Jaz backend HTTP endpoint, not yet an MCP tool) · `bulk_create_contacts` (counterparty migration) · `search_tax_profiles` (verify pre-existing IRAS-aligned profiles; never create) · `create_journal` with `create_transfer_trial_balance` semantics for opening balances · `import_bank_statement` (first-month bank import) · `create_bank_rule` · `search_bank_records` (first reconciliation) · `quick_reconcile` and the `reconcile_*` family.

**Recipes.** Not used during setup itself. After onboarding completes, the recurring-cadence engagements (`monthly-close`, `quarterly-gst`, `annual-statutory`) drive recipes per `CLIENT.recurring_accruals`, FA register, prepaids, leases, etc. Onboarding's job is to populate `CLIENT.md` so those engagements have the data they need.

**Calculators.** Not used during setup. Used in subsequent engagements after onboarding closes.

**Cross-references.** `jaz-conversion/SKILL.md` end-to-end (this is the canonical source for any migration from Xero/QB/Sage/MYOB) · `jaz-conversion/references/{option2-quick,option1-full,mapping-rules,verification}.md` for the conversion pipeline · `jaz-api/SKILL.md § Chart of Accounts` (rules 17–22), `§ Bulk Upsert` (Items/Contacts/Rates), `§ Background Jobs` (poll bulk_upsert_contacts), `§ Identifiers & Dates` (rules 1–3) · `jaz-jobs/SKILL.md § generate_document_collection_blueprint` for the initial-doc-capture step.

## Scope & deliverables checklist

### Step 1 — Org + organisational basics

- [ ] `CLIENT.legal_entity_name`, `CLIENT.uen`, `CLIENT.registered_address` captured
- [ ] `CLIENT.fy_end` set (MM-DD)
- [ ] `CLIENT.base_currency` set
- [ ] `CLIENT.gst_scheme` set (`quarterly` / `monthly` / `not-registered`); if registered, `CLIENT.gst_registration_number` captured
- [ ] `CLIENT.corporate_tax_bracket` set (`standard` / `startup_exemption` / `partial_exemption`)
- [ ] `CLIENT.jaz_api_key_override` set (if multi-org) and `get_organization()` returns matching `legalEntityName`; `CLIENT.jaz_org_id` populated from response

### Step 2 — Multi-currency (if `CLIENT.base_currency` ≠ all transacting currencies)

- [ ] `list_currencies` to see what's enabled in the org
- [ ] `add_currency` for any missing currency from the prior-firm TB
- [ ] FYE closing rates loaded — `bulk_upsert_currency_rates` with `rateDirection: FUNCTIONAL_TO_SOURCE` per pair

### Step 3 — Chart of Accounts

- [ ] Decide path: (a) prior firm's CoA migrated via `jaz-conversion` or (b) seeded from Jaz template by industry
- [ ] If (a): run conversion Phases 0–1B per `jaz-conversion/references/option2-quick.md`
- [ ] If (b): `create_account` per seed account; record decisions in `CLIENT.COA mapping notes`
- [ ] Verify `search_tax_profiles(appliesToSale: true)` and `(appliesToPurchase: true)` cover every transaction profile the client uses (NEVER create — see jaz-api rule 17)

### Step 4 — Counterparties (contacts)

- [ ] Prior-firm contact list extracted per `jaz-conversion/references/file-types.md`
- [ ] `bulk_create_contacts` (max 500/call) — poll `search_background_jobs(filter: {resourceId: {eq: <jobId>}})` until status `SUCCESS` or `PARTIAL_SUCCESS`
- [ ] On `PARTIAL_SUCCESS`: review `errorDetails[]` per record; fix and retry the failed slice

### Step 5 — Banking

- [ ] `CLIENT.bank_accounts[]` populated with name, last-4 ref, currency
- [ ] For each: corresponding Jaz CoA bank account exists — `search_accounts(filter: {accountType: {eq: "Bank Accounts"}})`; capture `jaz_resource_id` into `CLIENT.bank_accounts[i].jaz_resource_id`
- [ ] First-month bank statement imported via `import_bank_statement(accountResourceId: …, file: …)` — poll `search_background_jobs` (jobType `PROCESS_BANK_STATEMENT_FILES`) until `SUCCESS`
- [ ] Bank rules drafted — `create_bank_rule` for each recurring counterparty/category pattern documented by the client

### Step 6 — Opening balances (TTB)

- [ ] Prior-firm TB at takeover date pulled and reconciled to source-system reports
- [ ] If conversion: run Phases 2–3 per `jaz-conversion/references/option2-quick.md` (conversion invoices + bills + TTB journal); rollback on failure is automatic per Phase 2/3 contract
- [ ] If fresh start: opening balances posted as a single `create_journal` per `jaz-conversion` TTB pattern (clearing accounts net to zero — see jaz-conversion rule 3)
- [ ] Lock dates set per CoA at takeover date — Phase 4 per `jaz-conversion/references/option2-quick.md`

### Step 7 — Verification

- [ ] Trial balance pulled — `generate_trial_balance(period_end: <takeover-date>)` matches the source TB to the dollar (see jaz-conversion rule 7: 100% accuracy required)
- [ ] If TB mismatches: triage per `jaz-conversion/references/verification.md` — rounding, missing accounts, FX, missed transactions
- [ ] Re-verify after each fix until clean

### Step 8 — Hand-off to recurring cadence

- [ ] `CLIENT.recurring_accruals[]` populated (utilities, professional fees, rent, employee benefits with default vendor + GL account + estimation method)
- [ ] `CLIENT.recurring_engagements[]` populated (typically `monthly-close` + `quarterly-gst` + `annual-statutory`)
- [ ] First `monthly-close` engagement scaffolded for the period after takeover
- [ ] `ENGAGEMENT.status` transitioned to `signed-off`

## Open queries with client

- [ ] _Question_ — _asked YYYY-MM-DD_ — _waiting on_ — _SLA YYYY-MM-DD_

## Risk areas

Source-firm TB mismatches (rounding, missing accounts), FX rate selection at takeover (closing vs original-date — see jaz-conversion rule 5), tax-profile mapping drift if source system used non-IRAS profile names, opening AR/AP aging that doesn't match the TTB clearing balance, fixed-asset accumulated depreciation preservation (see jaz-conversion rule 2: use transfer-fixed-assets endpoint, not new-asset).

## Decisions log

Append-only. Most recent first. Mapping decisions and treatment elections made during the takeover.

- _YYYY-MM-DD_ — _decision_ — _rationale_

## Daily journal

- _YYYY-MM-DD_ — _what happened_
