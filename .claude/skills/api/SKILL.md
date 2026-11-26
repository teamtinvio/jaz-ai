---
name: jaz-api
description: >-
  Use this skill whenever you call, debug, or review code that touches the Jaz
  REST API. Covers field names, response shapes, 148 production gotchas, error
  recovery (422/400/404/500), search filters, pagination, and edge cases for
  every endpoint: invoices, bills, credit notes, journals, cash entries,
  payments, contacts, CoA, items, tax profiles, bank records, fixed assets,
  schedulers, subscriptions, attachments, claim settings, and Jaz Magic extraction. Also use
  when building API clients, seeding test data, or adding new endpoint support.
  Request/response examples, the endpoint catalog, and the search filter, syntax
  and enum reference are in the jaz-api-reference skill: load it alongside.
license: MIT
compatibility: Uses Jaz OAuth by default; organization API keys remain supported. Works with Claude Code, Google Antigravity, OpenAI Codex, GitHub Copilot, Cursor, and any agent that reads markdown.
metadata:
  version: "9.10.0"
---

# Jaz API Skill

You are working with the **Jaz REST API**, the accounting platform backend. Also fully compatible with Juan Accounting (same API, same endpoints).

Prefer the configured OAuth connection. Local CLI/MCP shares `clio auth login`; hosted MCP uses its host's sign-in. Select the organization explicitly. For a direct integration, follow the repository's OAuth sign-in reference; the API-key header examples below describe the optional key-based route. Never copy a host's tokens into another application.

## Pick the right invocation path first

- **Running inside an MCP host (Claude Desktop, Cowork)**: use the MCP tools (`execute_tool` with `create_invoice`, `list_bills`, etc.). Do not write direct HTTP. The MCP server handles auth, retries, and field shape for you.
- **Running Claude Code with the `jaz-clio` CLI**: use the CLI commands (`clio invoices list --json`, etc.). Same code path, structured output.
- **No agent surface, raw integration**: write HTTP calls per the endpoint reference in the **jaz-api-reference** skill (its `references/endpoints.md` indexes one file per domain).

The rest of this skill (field names, gotchas, error catalog, dependency order, search filter syntax) applies regardless of invocation path. Read it for *context*, not for HTTP-call construction unless you're in the third bucket.

## Reading Order

Numbers are rule numbers; the [Rule Index](#rule-index) below names the file that holds each one.

**Core fundamentals (read first, every integration):** Identifiers & Dates 1 to 3; Names & Fields 9 to 13; Transaction Creation 14 to 16; Chart of Accounts 17 to 22; Payments / Cross-Currency 4 to 8; Journals & Cash 23 to 26; Credit Notes & Refunds 27 to 28; Reports 36 to 37; Tax Profile Scoping 100; Transaction References 104; Draft Finalization Pipeline 81 to 88; Jaz Magic / PDF-JPG 57 to 63; Currency Rates 39, 49, 105; Withholding Tax 45, 98.

**Integration depth (API clients, pipelines, batch jobs, MCP/CLI):** Bulk Upsert (Items/Contacts/Rates); Background Jobs (filter `resourceId` not `jobId`); Export Records; Pagination (38); Search & Filter (50 to 56); Response Shape Gotchas (66 to 73); Cash Entry Response Shape (74 to 77); Entity Resolution (78 to 80); Bank Rules (89 to 90d); Fixed Assets (91 to 92c); Subscriptions & Scheduled (93 to 94); niche endpoints (95 to 102); Journals balance (103); Quick Fix (107, 111); TTB (108); Dynamic Strings (109 to 110); Sub-Resource Shapes (112); Nano-Classifier (113); Scheduler Asymmetry (114); Payment Record CRUD (115 to 117); Bulk Upserts transactions (118 to 122); Reconciliation write-side (123 to 127); Drafts lifecycle (128 to 135); Orders: Sale Quotes / Sale Orders / Purchase Requests / Purchase Orders (`references/orders.md`); Claims: records / lifecycle / bulk + conversion + payouts + Employees + Claim Settings (`references/claims.md`); Report templates and packs (161, `references/report-templates.md`).

## When to Use This Skill

- Writing or modifying any code that calls the Jaz API
- Building API clients, integrations, or data pipelines
- Debugging API errors (422, 400, 404, 500)
- Adding support for new Jaz API endpoints
- Reviewing code that constructs Jaz API request payloads

## Quick Reference

**Base URL**: `https://api.getjaz.com`
**Auth**: `x-jk-api-key: <key>` header on every request; key has `jk-` prefix (e.g., `jk-a1b2c3...`). NOT `Authorization: Bearer` or `x-api-key`.
**Content-Type**: `application/json` for all POST/PUT/PATCH (except multipart endpoints: `createBusinessTransactionFromAttachment` FILE mode, `importBankStatementFromAttachment`, and attachment uploads)
**All paths are prefixed**: `/api/v1/` (e.g., `https://api.getjaz.com/api/v1/invoices`)

## Rule Index

The numbered rules are split by area into four files under `references/`. Numbers are stable, so a citation such as "rule 107", "SKILL.md rule 107" or "jaz-api rule 107" (in tool descriptions, `errors.md` and other skills) resolves through this table. A gap in the numbering is a retired rule.

| Rules | File | Sections |
|-------|------|----------|
| 1-49 | [references/rules-fundamentals.md](references/rules-fundamentals.md) | Identifiers & dates; payments (cross-currency); names & fields; transaction creation (`saveAsDraft`); chart of accounts; bulk upsert of items, contacts and rates; background jobs; export records; journals & cash; credit notes & refunds; inventory items; cash transfers; schedulers; bookmarks; custom fields; tags; nano classifiers; reports; pagination; currency rates and FX; GET/POST field asymmetries; search sort; bank records; withholding tax; known bugs and non-existent endpoints; deposits; attachments; rate direction |
| 50-88 | [references/rules-search-magic-shapes.md](references/rules-search-magic-shapes.md) | Search & filter (`query`, operators, date formats, aliases, response envelopes); Jaz Magic extraction; payment reads and the cashflow ledger; response shape gotchas; cash entry IDs; entity resolution and payment accounts; draft finalization pipeline |
| 89-117 | [references/rules-entities-quick-fix.md](references/rules-entities-quick-fix.md) | Bank rules; fixed assets; subscriptions & scheduled transactions; contact groups; inventory balances; withholding codes and 2307 certificates; duplicate detection; tax profile scoping; cash entry PUT and account type; journal balance; transaction references; currency rates; Quick Fix and Ledger Find & Fix; transfer trial balance; dynamic strings; sub-resource shapes; nano-classifier API; scheduler asymmetry; payment records and payment methods |
| 118-161 | [references/rules-bulk-recon-drafts.md](references/rules-bulk-recon-drafts.md) | Transaction bulk upserts; reconciliation actions; drafts lifecycle; contacts bulk upsert and payment terms; contact signals and `validate_drafts`; IFRS 18 account types; CoA bulk upsert; pseudo-SQL; cashflow report; match-to-existing reconciliation; auto-reconciliation suggestions; payment adjustments; report templates |

## Supporting Files

For detailed reference, read these files in this skill directory (the four rule files are indexed above):

- **[references/errors.md](./references/errors.md)**: Complete error catalog: every error, cause, and fix
- **[references/field-map.md](./references/field-map.md)**: Complete field name mapping (what you'd guess vs actual), date format matrix, middleware aliases
- **[references/dependencies.md](./references/dependencies.md)**: Resource creation dependencies and required order
- **[references/feature-glossary.md](./references/feature-glossary.md)**: Business context per feature: what each feature does and why, extracted from [help.jaz.ai](https://help.jaz.ai)
- **[references/orders.md](./references/orders.md)**: Sale quotes, sale orders, purchase requests, purchase orders: lifecycle, linking, conversion, line-item edits
- **[references/claims.md](./references/claims.md)**: Expense claims: records, lifecycle, bulk actions, conversion, payouts, employees, claim settings
- **[references/report-templates.md](./references/report-templates.md)**: Report templates and packs: layouts, `edits`, defaults, refusals
- **[references/bank-rule-column-mapping.md](./references/bank-rule-column-mapping.md)**: Bank-rule column-value mapping (`ColumnValueMapConfig`, column tokens)

### Endpoint and search lookups: the jaz-api-reference skill

Load **jaz-api-reference** alongside this skill for what each endpoint takes and returns, and for search. A file these pages name that is not listed above (`endpoints.md`, `endpoints-*.md`, `full-api-surface.md`, `search-*.md`) is in its `references/`:

- `endpoints.md`: conventions every endpoint shares (base URL, auth, date format, pagination, success codes, auto-wrapping) and the index of which domain file holds each endpoint section
- `endpoints-master-data.md`, `endpoints-transactions.md`, `endpoints-banking-magic.md`, `endpoints-schedules-reports.md`, `endpoints-assets-payroll.md`, `endpoints-bulk-edits.md`: request/response examples by domain (Quick Fix per-entity field lists are in `endpoints-bulk-edits.md`)
- `full-api-surface.md`: endpoint catalog by resource (about 200 paths), limits, platform features that change API behavior
- `search-reference.md`: per-endpoint filter fields, sort fields, operator types
- `search-syntax.md`: the `query` string syntax (auto-synced from the dashboard repo)
- `search-enums.md`: enum values per search field, nested filter paths, response field mapping

## Help Center Knowledge Base (`clio help-center` / `clio hc`)

For product questions (how-to, feature behavior, troubleshooting), use `clio help-center` (or the `search_help_center` tool):

```bash
clio help-center "how to apply credit note"              # search help center
clio help-center "bank recon" --limit 3                  # limit results
clio help-center "scheduled invoices" --section invoices # filter by section
```

Supports `--json` for structured output. Searches Jaz's hosted help center, no sign-in needed, and returns only the relevant articles.

## Dashboard Deep Links (navigation tools)

When the user wants to OPEN, SEE, or SHARE something in the Jaz dashboard ("open this invoice", "take me to the P&L"), hand them a real URL via `navigate`: one operation, on both surfaces (`clio navigate` on the CLI, offline). Called with no `destination` it discovers destination keys (filter by `query`/`resource`/`kind`; keys are named by product area, not task wording; on zero matches retry broader: "billing", not "card"); called with a `destination` it turns the key into `{ url, kind, label }`. Screens are dotted route paths (`reports.profit-and-loss`); record modals are `<resource>.modal.<type>` (`sales.modal.view-sale`). Record-specific modals (view/edit/duplicate one record) REQUIRE `resourceId`: the same Jaz resourceId from the search/get that found the record; screens and create/"new" modals take none (a resourceId on a screen is rejected). NEVER write a dashboard URL by hand and NEVER guess a destination key: routes are not guessable, and a wrong link is worse than no link; if `navigate` errors, follow its hint (near-matches + discovery pointer) and say the link could not be built rather than improvising one. The org query param is appended automatically when the surface knows the acting org; API-key surfaces open in the user's current org on the app.jaz.ai host. Examples: "open invoice INV-042" → `search_invoices` → `navigate("sales.modal.view-sale", resourceId)`; "take me to the P&L" → `navigate("reports.profit-and-loss")`; "where do I manage users?" → `navigate(query: "user")` → `navigate("settings.modal.user_management")`. (The pre-merge tool names `find_dashboard_destinations` / `get_dashboard_url` still resolve as aliases.)

## Recommended Client Patterns

- **Starting from an attachment?** → Use Jaz Magic (`POST /magic/createBusinessTransactionFromAttachment`). Never manually parse a PDF/JPG to construct `POST /invoices` or `POST /bills`; let the extraction & autofill pipeline handle it.
- **Starting from structured data?** → Use `POST /invoices` or `POST /bills` directly with the known field values.
- **Serialization (Python)**: `model_dump(mode="json", by_alias=True, exclude_unset=True, exclude_none=True)`
- **Field names**: All request bodies use camelCase
- **Date serialization**: Python `date` type → `YYYY-MM-DD` strings
- **Bill payments**: Embed in bill creation body (safest). Standalone `POST /bills/{id}/payments` also works.
- **Bank records**: Create via JSON `POST /bank-records/:id` or multipart `POST /magic/importBankStatementFromAttachment`. Search via `POST /bank-records/:id/search` with filters (valueDate, status, description, extContactName, netAmount, extReference).
- **Scheduled invoices/bills**: Wrap as `{ status, startDate, endDate, repeat, invoice/bill: { reference, valueDate, dueDate, contactResourceId, lineItems, saveAsDraft: false } }`. `reference` is required.
- **Scheduled journals**: Flat: `{ status, startDate, endDate, repeat, valueDate, schedulerEntries, reference }`. `valueDate` is required.
- **FX currency (invoices, bills, credit notes, AND journals)**: `currency: { sourceCurrency: "USD" }` (auto-fetches platform rate) or `currency: { sourceCurrency: "USD", exchangeRate: 0.74 }` (custom rate). Same object form on all transaction types. **Never use `currencyCode` string**: silently ignored.

## See Also

- **jaz-recipes**: 16 IFRS-compliant transaction recipes with journal entries, capsules, and calculators
- **jaz-jobs**: 12 accounting job playbooks (month-end close, bank recon, GST/VAT filing, etc.)
- **jaz-conversion**: Data migration workflows from Xero, QuickBooks, Sage, MYOB, and Excel
- **jaz-cli**: CLI command reference, auth, output formats, pagination, and workflow patterns
