---
v: 1
legal_entity_name: "{{legal_entity_name}}"   # <!-- Full legal name as registered with ACRA. Used verbatim in deliverables and engagement letters. -->
uen: "{{uen}}"                                # <!-- Singapore UEN (e.g., 201912345A). Agent validates format during practice_onboard_client. -->
registered_address: "{{registered_address}}"  # <!-- ACRA-registered address; agent uses this on filings and letters. -->
country: SG                                   # <!-- ISO-3166 alpha-2. Drives jurisdiction-specific playbooks (IRAS/ACRA for SG). -->
base_currency: SGD                            # <!-- Functional currency. Used by FX-revaluation recipes and reporting. Override per-org if it differs from PRACTICE.md.default_base_currency. -->
fy_end: "12-31"                               # <!-- MM-DD format. Drives annual-statutory engagement period boundaries and ECI / Form C-S deadlines. -->
gst_scheme: quarterly                         # <!-- One of: quarterly | monthly | not-registered. Drives quarterly-gst engagement cadence and F5 box logic. -->
gst_registration_number: ""                   # <!-- Required when gst_scheme != not-registered. Stamped on F5 submission tracker. -->
corporate_tax_bracket: standard               # <!-- One of: standard | startup_exemption | partial_exemption. Agent uses this to pick the right Form C-S computation path. -->
jaz_api_key_override: ""                      # <!-- Optional. Per-client API key for multi-org agencies. Resolution order: this override -> PRACTICE.md.default_jaz_api_key -> JAZ_API_KEY env. -->
jaz_org_id: ""                                # <!-- Resolved by practice_onboard_client after first successful API call. Used to scope Jaz tool invocations to this client's org. -->
materiality_threshold: 1000                   # <!-- In base_currency. Seeded from PRACTICE.md.materiality_default. Agent compares variances and reconciliation gaps against this in monthly-close. -->
bank_accounts:                                # <!-- Read by monthly-close before invoking search_bank_records / reconciliation tools. Each entry must match a Jaz bank account. -->
  - name: ""                                  # <!-- Display label, e.g., "DBS SGD Operating". -->
    account_number_ref: ""                    # <!-- Last 4 digits or internal ref; never store the full account number. -->
    currency: SGD                             # <!-- ISO-4217. Multi-currency banks must list each leg separately. -->
    jaz_resource_id: ""                       # <!-- Jaz bank_accounts resourceId. Populated after first reconciliation; agent uses it directly to skip lookup. -->
recurring_accruals:                           # <!-- Read by monthly-close step "accruals". Each entry drives one plan_recipe(name: 'accrued-expense', ...) call. -->
  - name: ""                                  # <!-- Human label, e.g., "Utilities — SP Group". -->
    gl_account: ""                            # <!-- Accrual GL account code from Jaz CoA. Must exist or accrual step fails with 422. -->
    vendor: ""                                # <!-- Counterparty contact name as it appears in Jaz contacts. -->
    estimation_method: prior_month            # <!-- One of: prior_month | trailing_3m_avg | budget | fixed_amount. Agent uses this to compute the accrual figure. -->
    fixed_amount: 0                           # <!-- Only consulted when estimation_method = fixed_amount. -->
recurring_engagements:                        # <!-- Drives the engagement-creation prompts on practice_load_client. Agent flags any expected engagement that has no active ENGAGEMENT.md for the current period. -->
  - type: monthly-close                       # <!-- Must match an engagement type the agent knows: monthly-close | quarterly-gst | annual-statutory. -->
    cadence: monthly                          # <!-- One of: monthly | quarterly | annual. -->
key_contacts:                                 # <!-- Used by onboarding deliverables and "open queries with client" routing. -->
  - name: ""
    role: ""                                  # <!-- e.g., Director, CFO, Finance Manager, Auditor. -->
    email: ""
---

# {{legal_entity_name}}

Master file for this client. Keep facts here; keep period work in `engagements/<slug>/ENGAGEMENT.md`.

## Industry & business model

What the client actually does, who pays them, how revenue is recognized at a high level. Two or three sentences. The agent uses this to disambiguate ambiguous transactions ("is this a sale or a deposit?").

## COA mapping notes

Material customizations to the standard CoA — extra revenue lines, departmental cost centers, project-tracking dimensions. The agent reads this before suggesting GL accounts for new transactions or accruals.

## Tax setup quirks

GST scheme details (e.g., reverse-charge applicability, blocked input tax categories, mixed supplies), corporate tax peculiarities (group relief, capital allowance pools, prior-year losses), withholding tax obligations on cross-border payments.

## Banking & multi-currency exposures

Which banks, which accounts feed which entities, FX policy (revalue monthly vs at year-end), hedging arrangements, signatory rules.

## Known issues / quirks

Things every preparer must remember. Old systems still feeding data, manual journals that recur, vendor-specific oddities, related-party balances that need elimination.

## Open follow-ups

- [ ] _Item_ — _owner_ — _due_

## Decisions log

Append-only. Most recent first. Judgment calls that affect future periods (treatment elections, materiality overrides, reclassifications).

- _YYYY-MM-DD_ — _decision_ — _rationale_

## Daily journal

Most recent first. One-line per touch. Facts the agent should remember next session about this client (without re-reading every engagement).

- _YYYY-MM-DD_ — _what happened_
