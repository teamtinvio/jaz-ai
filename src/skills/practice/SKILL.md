---
name: jaz-practice
version: 5.5.0
description: >-
  Use this skill whenever an accounting practitioner is doing client work in
  Jaz — closing the books, filing GST, year-end statutory, onboarding a new
  client. Covers the practitioner workspace at ~/Documents/Jaz Practice
  (clients/<slug>/CLIENT.md and engagements/<slug>/ENGAGEMENT.md), engagement
  routing (monthly-close | quarterly-gst | annual-statutory | onboarding |
  adhoc), and how the agent loads client context before invoking jaz-jobs
  blueprints, jaz-recipes recipes, and jaz-api tools. Triggers on intent like
  "close the books for X", "file GST for Y", "onboard new client Z", "what's
  outstanding for Acme this month". Pair with jaz-jobs (workflow blueprints),
  jaz-recipes (IFRS recipes + calculators), jaz-api (REST gotchas), and
  jaz-conversion (data migration during onboarding).
compatibility:
  jaz-jobs: ">=5.1"
  jaz-recipes: ">=5.1"
  jaz-api: ">=5.1"
  jaz-conversion: ">=5.1"
  jaz-cli: ">=5.1"
---

# jaz-practice

Practitioner-side scaffolding. The agent's entry point when an accountant is doing client work in Jaz.

## When to Use This Skill

Load `jaz-practice` when the user's intent is practitioner-shaped — closing the books, filing GST/VAT, year-end statutory, onboarding a new client, mid-quarter review for a specific client. The skill's job is to LOAD CONTEXT (CLIENT.md + ENGAGEMENT.md) before routing the actual accounting work to `jaz-jobs` (close playbooks), `jaz-recipes` (IFRS recipes), `jaz-conversion` (data migration), or `jaz-api` (raw endpoints).

Trigger phrases: "close the books for X", "file GST for Y", "onboard new client Z", "what's outstanding for Acme this month", "Acme — quarterly close", "year-end statutory for X". When in doubt: if the user names a client or an engagement-type ("monthly close", "GST", "year-end"), load this skill first.

## Mental model

| Engineer (cct-toolkit) | Practitioner (jaz-practice) |
|-------------------------|------------------------------|
| Workspace = a feature being built | Workspace = a client being served |
| Sub-folder = task category | Sub-folder = engagement type (recurring/special) |
| FEATURE.md hub | CLIENT.md (master) + ENGAGEMENT.md (per-engagement) |
| Decisions = architecture | Decisions = accounting treatment (estimate, classification, scope) |
| Done = PR merged | Done = engagement signed-off, period locked, deliverable filed |

The persistent unit is the **client**, not the project. Engineering features come and go; clients accumulate over years. The folder structure must support: historical immutability (last year's audit file is sacred), recurring rhythm (monthly close, quarterly GST), ad-hoc work (M&A, restructuring), and cross-engagement context (the same client's tax position informs their audit risk).

## Folder layout

```
~/Documents/Jaz Practice/        ← override with PRACTICE_HOME env or --root
  PRACTICE.md                    ← firm-level config (one-time)
  templates/                     ← practitioner-overridable copies of engagement templates
  clients/<client-slug>/
    CLIENT.md                    ← master file: legal entity, FY, GST, COA, banks, recurring accruals, materiality
    engagements/<engagement-slug>/
      ENGAGEMENT.md              ← per-engagement: type, period, status, scope, queries, decisions, journal
      inputs/                    ← raw client docs (statements, invoices, receipts)
      workpapers/                ← TBs, analyses, sample selections
      deliverables/              ← signed reports, filed returns, board packs
    recurring/{monthly,quarterly,annual}/<period>/   ← close packages, GST returns, statutory
    correspondence/                                  ← IRAS letters, ACRA notices
    _archive/                                        ← closed engagements, prior periods
```

See `references/client-md-schema.md` and `references/engagement-md-schema.md` for the full field-by-field schema.

## Engagement-type routing (the agent's first move)

When the practitioner expresses intent, route to the right engagement type and load the matching deep reference:

| Practitioner says... | Engagement type | Deep reference | Driver tools |
|----------------------|-----------------|----------------|---------------|
| "Close the books for <client> <month>" | `monthly-close` | `references/monthly-close.md` | `generate_month_end_blueprint` + accrual / depreciation / fx-reval recipes |
| "File GST/F5 for <client> <quarter>" | `quarterly-gst` | `references/quarterly-gst.md` | `generate_gst_vat_blueprint` + `generate_vat_ledger` |
| "Year-end / annual / statutory for <client>" | `annual-statutory` | `references/annual-statutory.md` | `generate_year_end_blueprint` + `generate_audit_prep_blueprint` + `generate_statutory_filing_blueprint` |
| "Onboard <new client>" / "Take over from <prior firm>" | `onboarding` | `references/onboarding.md` | `practice_onboard_client` + `jaz-conversion` if migrating |
| Anything else | `adhoc` | (no reference) | Whatever the practitioner names |

## How the agent works inside jaz-practice

1. **Detect the practitioner workspace.** If `~/Documents/Jaz Practice/` exists (or `PRACTICE_HOME` is set), call `practice_list_clients` first to surface the available client slugs. If the practitioner's intent names a client, slug it and call `practice_load_client`.
2. **One key per session.** v5.2.0 uses a single `JAZ_API_KEY` per Claude session (set once in connector / settings / env). The `CLIENT.md.jaz_api_key_override` field is reserved for v5.3 multi-org runtime selection — not yet wired. Don't prompt the practitioner to re-enter a key per client. For multi-org agencies today: use one Jaz org per Claude session and switch sessions when switching orgs.
3. **Anchor work in an engagement.** Either find the active engagement for the period (in `practice_load_client`'s response) or create one with `practice_create_engagement(clientSlug, type, period)`. The engagement folder gets the type-specific template.
4. **Follow the deep reference.** Load `references/<type>.md` for the canonical playbook — it names every tool / recipe / calculator and every CLIENT.md / ENGAGEMENT.md field.
5. **Surface, don't dump.** When invoking blueprints or running reports, surface to the practitioner: top 3 exceptions, top 3 unreconciled items, top 3 unresolved queries. Save full output to `workpapers/<task>.md`.
6. **Append progress to ENGAGEMENT.md daily journal** so resuming the next session doesn't redo yesterday's work.
7. **Transition status only when the scope checklist is complete.** Don't mark `signed-off` / `filed` / `archived` while items remain unticked.

## Key principle: jaz-practice routes, it does NOT duplicate

The 6 `practice_*` MCP tools and the CLI command group are **filesystem scaffolding only**. They never call the Jaz API. All real accounting work goes through:
- **jaz-jobs** for workflow blueprints (12 playbooks)
- **jaz-recipes** for IFRS-compliant transaction modeling (16 recipes + 13 calculators)
- **jaz-api** for direct REST API operations (266 tools, error/field gotchas)
- **jaz-conversion** for data migration during onboarding
- **jaz-cli** for terminal-first power users (script automation)

If you find yourself wanting a new "do this accounting work" tool inside jaz-practice, stop — extend the existing skill instead, and add a cross-reference here.

## Out of scope

This skill is intentionally focused on accounting workflows. Out of scope:
- KYC / AML / beneficial ownership (firm administration, not accounting work)
- Engagement letters, fee structures, billing rates
- Sign-off log mechanics, partner-review thresholds
- Practice management overhead (CRM, time tracking, invoicing the firm's clients for fees)

## Related

- `jaz-jobs/SKILL.md` — 12 workflow blueprints (cross-referenced from each engagement-type playbook)
- `jaz-recipes/SKILL.md` — 16 IFRS recipes + 13 calculators
- `jaz-api/SKILL.md` — REST API gotchas
- `jaz-conversion/SKILL.md` — Xero/QB/Sage/MYOB migration playbook
- `jaz-cli/SKILL.md` — terminal automation reference
- `references/monthly-close.md` — canonical monthly-close playbook
- `references/quarterly-gst.md` — canonical GST/F5 playbook
- `references/annual-statutory.md` — canonical year-end playbook
- `references/onboarding.md` — canonical new-client playbook
- `references/client-md-schema.md` — every CLIENT.md field
- `references/engagement-md-schema.md` — every ENGAGEMENT.md field
- `references/troubleshooting.md` — common error classes + recovery actions
