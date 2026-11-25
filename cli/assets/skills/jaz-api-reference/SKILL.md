---
name: jaz-api-reference
description: >-
  Use this skill to look up exactly what a Jaz REST API endpoint takes and
  returns: method and path, request body fields, response shape, and status
  codes, with request/response examples for every core endpoint by domain
  (master data, transactions, banking and Jaz Magic, schedulers and reports,
  fixed assets and payroll, Quick Fix and bulk edits). Also holds the endpoint
  catalog (about 200 paths) and the search reference: every search filter and
  sort field per endpoint, the `query` search syntax, and the valid enum values
  for each filter field. Load it when building or debugging a request body,
  checking whether an endpoint exists, writing a search filter, or confirming
  an enum value. The numbered API rules, error catalog, and field name mapping
  live in the jaz-api skill: load both together.
license: MIT
compatibility: Uses Jaz OAuth by default; organization API keys remain supported. Works with Claude Code, Google Antigravity, OpenAI Codex, GitHub Copilot, Cursor, and any agent that reads markdown. Load the jaz-api skill alongside this one.
metadata:
  version: "9.9.0"
---

# Jaz API Reference Skill

The lookup half of the Jaz REST API docs: what each endpoint takes and returns, and how to search. Everything here is also valid for Juan Accounting (same API).

The **jaz-api** skill holds the rest: the numbered rules (production gotchas), the error catalog, the field name mapping, resource creation order, orders, claims and report templates. Read its rules before writing a request; these pages show the wire, the rules say where it bites.

- A rule cited here ("rule 107", "SKILL.md rule 107") is a jaz-api rule. The Rule Index in jaz-api's `SKILL.md` names the file that holds it.
- A file named here without a link (`field-map.md`, `errors.md`, `feature-glossary.md`, `orders.md`, `report-templates.md`, `rules-*.md`) is in jaz-api's `references/`.
- Inside an MCP host or with the `clio` CLI, call the tools or commands; read these pages for context. Write raw HTTP from them only for a direct integration.

## Files

| File | Read it for |
|------|-------------|
| [references/endpoints.md](references/endpoints.md) | Start here. Conventions every endpoint shares (base URL, auth, date format, pagination, success codes, auto-wrapping) and the index of which file holds each endpoint section |
| [references/endpoints-master-data.md](references/endpoints-master-data.md) | Organization, chart of accounts, tax profiles, currencies and rates, contacts, items, tags, custom fields, inventory items and balances, contact groups, bookmarks, catalogs, nano classifiers |
| [references/endpoints-transactions.md](references/endpoints-transactions.md) | Invoices, bills, journals, cash entries, payments and payment records, credit notes and refunds, cash transfers, attachments, transfer trial balance, approvals, jots, unapplied payments, comments and notifications |
| [references/endpoints-banking-magic.md](references/endpoints-banking-magic.md) | Jaz Magic extraction, bank records, the cashflow ledger search, deposits, bank rules |
| [references/endpoints-schedules-reports.md](references/endpoints-schedules-reports.md) | Schedulers, subscriptions, reports, export records, report templates |
| [references/endpoints-assets-payroll.md](references/endpoints-assets-payroll.md) | Fixed assets, deferrals, leases, loans, payrun settings and employee pay |
| [references/endpoints-bulk-edits.md](references/endpoints-bulk-edits.md) | Quick Fix (with the generated per-entity field lists), Ledger Find & Fix, contacts bulk upsert, background jobs |
| [references/full-api-surface.md](references/full-api-surface.md) | Endpoint catalog by resource (about 200 paths, more than the examples cover), limits, platform features that change API behavior |
| [references/search-reference.md](references/search-reference.md) | The `POST /*/search` request shape, operators per field type, and each endpoint's filter and sort fields |
| [references/search-syntax.md](references/search-syntax.md) | The `query` string syntax: amounts, dates, abs, blanks, wildcards, regex, entity field lists, aliases, examples (auto-synced from the dashboard repo) |
| [references/search-enums.md](references/search-enums.md) | Valid enum values per search field, nested filter paths, response field mapping |

## By task

- **Building a create or update body**: the endpoint's section in its domain file (find it in the `endpoints.md` index), then jaz-api's `field-map.md` for names you would guess wrong.
- **Writing a search**: `search-reference.md` for the fields an endpoint filters and sorts on, `search-enums.md` for the values a field accepts, `search-syntax.md` for a `query` string.
- **Does an endpoint for X exist?**: `full-api-surface.md`. It catalogues the endpoints clio wraps, not the whole REST surface; its header says where the complete list lives.
