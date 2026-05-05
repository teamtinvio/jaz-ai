---
v: 1
firm_name: "{{firm_name}}"                 # <!-- Display name on deliverable cover pages and report headers. Agent inserts via {{firm_name}} when generating outputs. -->
default_jaz_api_key: ""                    # <!-- Default JAZ_API_KEY for all clients. Resolution chain: CLIENT.md.jaz_api_key_override -> this -> JAZ_API_KEY env. Leave blank to force per-client override. -->
default_base_currency: SGD                 # <!-- Default currency stamped on new CLIENT.md unless overridden during onboarding. Drives FX revaluation reasoning. -->
default_jurisdiction: SG                   # <!-- ISO-3166 alpha-2. MVP supports SG only. Drives playbook selection (e.g., GST F5 vs other VAT regimes; IRAS / ACRA references for annual-statutory). -->
materiality_default: 1000                  # <!-- Default monetary materiality threshold (in default_base_currency). Seeded into new CLIENT.md.materiality_threshold. Used by the agent when comparing variances and reconciliation gaps in monthly-close. -->
---

# Practice configuration

Firm-level defaults that flow into every new client. Changes here apply to NEW clients only — existing CLIENT.md files keep the values that were resolved at scaffold time.

## Notes

Free-form notes the firm wants the agent to remember across all clients (e.g., recurring treatments, jurisdiction quirks, internal naming conventions for journal references).

## Decisions log

Append-only. Most recent first. Firm-wide accounting-treatment decisions only — per-client decisions live in CLIENT.md, per-engagement decisions live in ENGAGEMENT.md.

- _YYYY-MM-DD_ — _decision_ — _rationale_
