# Changelog

## [5.0.0] - 2026-05-01

### Breaking changes

- **Removed `clio search` command and `universal_search` MCP tool.** The Typesense-backed universal cross-entity search was frontend-typeahead infrastructure that leaked into the agent/CLI surface. For programmatic search, use the structured `--query` syntax on per-entity search commands:
  ```
  clio invoices search --query "customer:acme AND status:unpaid AND $500+" --json
  clio bills search --query "$50+ AND date:-90d" --json
  clio contacts search --query "customer:yes" --json
  ```
  The full DSL (AND/OR/NOT, parentheses, amount ranges, date ranges, wildcards, sort) is documented in the API skill's `references/search-syntax.md`.
- **Tool count: 266 → 265** (`universal_search` removed).
- **Internal API: `core/api/search.ts` and `universalSearch()` removed.** No longer importable.

### Added

- 6 new structured-query smoke tests in section 57 (k–p) exercising the full `--query` DSL: AND + amount ranges, OR + parens + AND, NOT + sort, amount lower-bound + date range, ref wildcard + status, 3-way OR + outer AND.

## [4.58.5] - 2026-04-30

### Fixed
- **`drafts` CLI was never wired** — `clio drafts validate`, `clio drafts convert-to-active`, `clio drafts submit-for-approval` returned "unknown command 'drafts'" since 4.58.0. Now registered in `src/index.ts`.
- **`bulk_upsert_journals` schema docs were wrong** — natural key field is `journalReference` (NOT `reference`), legs field is `journalEntries[]` (NOT `entries[]`), each leg uses `debitAmount`+`creditAmount` (NOT `amount`+`type`). Existing tool calls using the wrong field names were silently failing at the API worker. Tool registry, SKILL docs, and field-map reference all updated.
- **`bulk_upsert_fixed_assets` schema docs were wrong** — request uses `valueDate` (the GET response uses `purchaseDate`); also documents `cost`/`purchaseAmount` and `effectiveLife`/`usefulLifeMonths` as accepted synonyms. Sending `purchaseDate` returned a generic 400 "Invalid request body".
- **`paginatedFetch` no longer fans out unbounded fetches** — `--all` mode now early-stops once `--max-rows` is reached. Previously it pulled every page then sliced, causing minute-long hangs on busy sandboxes.

### Changed
- **CLI default `--max-rows` lowered from 10,000 → 1,000** for `--all` mode across every list/search command. Pass `--max-rows N` explicitly to fetch more. Combined with the early-stop fix above, prevents accidental multi-thousand-row fetches.
- **5 bulk-upsert tool descriptions tightened** with gotchas surfaced by integration testing — FLAT vs NESTED distinction for invoices/bills, journals naming, manual-journal auto-add-bank-leg warning, invoice-receipt / bill-receipt BSE-type requirement, fixed-asset date-field mismatch.
- **Skill docs extended** — `api/SKILL.md` gained rules 131-135 (complete-drafts before promote, manual-journal auto-add, BSE-type, FLAT vs NESTED, recon line-item naming). `cli/SKILL.md` + `references/agent-gotchas.md` + `references/command-catalog.md` now cover reconciliations + drafts namespaces and `bills draft list` attachment fan-out warning.

## [4.58.2] - 2026-04-29
- 247 → 266 tools across three new capability areas. Single user-facing release covering everything published since 4.55.6.
- Bulk-upsert (8 tools, async, max 500 rows/call):
  - `bulk_upsert_invoices`, `bulk_upsert_invoice_line_items`
  - `bulk_upsert_bills`, `bulk_upsert_bill_line_items`
  - `bulk_upsert_customer_credit_notes`, `bulk_upsert_supplier_credit_notes`
  - `bulk_upsert_journals` (debit + credit must balance per row)
  - `bulk_upsert_fixed_assets` (`registrationType`: NEW or TRANSFER)
- Reconciliations namespace (8 tools, commit a reconciliation against a bank statement entry):
  - Async: `quick_reconcile`, `apply_bank_rule`
  - Sync: `reconcile_direct_cash_entry`, `reconcile_cash_journal`, `reconcile_manual_journal`, `reconcile_cash_transfer`, `reconcile_invoice_receipt`, `reconcile_bill_receipt`
- Drafts lifecycle namespace (3 tools, one call accepts up to 500 items mixing any combination of invoices, bills, customer credit notes, supplier credit notes):
  - `validate_drafts` (sync, eligibility check)
  - `convert_drafts_to_active` (async)
  - `submit_drafts_for_approval` (async)
- Bulk-upsert dates are ISO 8601 (`YYYY-MM-DD`) only. The `dateFormat` field is gone.
- Drafts convert/submit and the 6 sync reconciliation endpoints are not idempotent. Filter drafts by `status: DRAFT` before submitting; confirm reconciled state before retrying a sync recon call.
- Includes the 4.58.1 release-pipeline hotfix.

## [4.58.1] - 2026-04-29
- Internal release-pipeline fix: scrubbed an internal codename from the 4.56.0 CHANGELOG entry that was tripping the public-mirror confidential audit and blocking npm publishes since 4.56.0. No code or behavior change.

## [4.58.0] - 2026-04-29
- Add 3 server-side draft lifecycle tools wrapping `/api/v1/drafts/*`. **Bulk-action friendly:** all three accept up to 500 items in ONE call, mixing any combination of invoices (`SALE`), bills (`PURCHASE`), customer credit notes (`SALE_CREDIT_NOTE`), and supplier credit notes (`PURCHASE_CREDIT_NOTE`). No per-entity tools needed — one call covers them all. Journals have their own approval flow.
  - `validate_drafts` + `clio drafts validate` — sync; per-item eligibility check, no state change. Safe to call repeatedly.
  - `convert_drafts_to_active` + `clio drafts convert-to-active` — async, returns a job ID.
  - `submit_drafts_for_approval` + `clio drafts submit-for-approval` — async, returns a job ID.
- Convert/submit are NOT idempotent — a second call on already-promoted drafts returns 422. Filter the draft list by `status: DRAFT` before submitting.
- Shared `assertDraftItems` validator builds on the existing `assertBatchArray` helper to reject malformed batches client-side (non-array, empty, >500, missing/empty `btResourceId`, invalid `btType`) with row-indexed error messages.

## [4.57.2] - 2026-04-29
- Internal refactor: 4 reconciliation tool executors (`quick_reconcile`, `apply_bank_rule`, `reconcile_cash_journal`, `reconcile_manual_journal`) now use the shared `assertBatchArray` helper for empty-array / max-cap checks, matching the pattern used by the 9 bulk-upsert tools. No user-facing behavior change.

## [4.57.1] - 2026-04-29
- Add client-side validation to `reconcile_invoice_receipt` and `reconcile_bill_receipt` — reject empty / >500 line items and non-ISO 8601 date fields (`valueDate`, `dueDate`, `recordedPayment.valueDate`) before submission. These two endpoints create AR/AP transactions and reconcile them in one non-idempotent call, so catching shape problems client-side prevents partial-write recovery.

## [4.57.0] - 2026-04-29
- New `reconciliations` namespace + 8 tools wrapping `/api/v1/reconciliations/*`. These commit a reconciliation decision against a bank statement entry — distinct from the existing `view_auto_reconciliation` (which queries suggestions only).
  - Async (returns a job ID — poll with `clio background-jobs get <jobId>`):
    - `quick_reconcile` + `clio recon quick-reconcile` — bulk-match bank entries to journals (max 500)
    - `apply_bank_rule` + `clio recon bank-rule` — apply a bank rule to a batch of entries (max 500)
  - Sync (returns the reconciled entry status):
    - `reconcile_direct_cash_entry` + `clio recon direct-cash-entry` — single-line cashflow journal; direction inferred from entry sign
    - `reconcile_cash_journal` + `clio recon cash-journal` — multi-line cashflow journal (max 200 lines)
    - `reconcile_manual_journal` + `clio recon manual-journal` — double-entry; bank-side leg auto-added by API
    - `reconcile_cash_transfer` + `clio recon cash-transfer` — inter-account transfer
    - `reconcile_invoice_receipt` + `clio recon invoice-receipt` — AR: creates an invoice and reconciles
    - `reconcile_bill_receipt` + `clio recon bill-receipt` — AP: creates a bill and reconciles
- Most fields prefill from the bank entry when omitted (`valueDate`, `dueDate`, payment amount, direction).
- Rule reminder: the 6 sync endpoints are NOT idempotent on the same `bankStatementEntryResourceId` — confirm reconciled state before retrying. Concurrent calls on the same entry race.

## [4.56.2] - 2026-04-29
- Internal refactor: extracted a shared `assertBatchArray()` helper for the 9 bulk-upsert tools (contacts, invoices, invoice line items, bills, bill line items, customer credit notes, supplier credit notes, journals, fixed assets). The empty-array / max-500 checks were duplicated in each executor; they now go through one validator. No user-facing behavior change.

## [4.56.1] - 2026-04-29
- Fix bulk-upsert tool descriptions to point users at `search_background_jobs` (with `resourceId` filter) for per-row PARTIAL_SUCCESS error details. Previous wording referenced a `get_background_job` tool that doesn't exist; the same response from `search_background_jobs` already carries `errorDetails`.
- Add client-side date validation for the 8 transaction bulk-upsert tools — invalid `valueDate` / `dueDate` / `depreciationStartDate` (anything outside `YYYY-MM-DD`) and any leftover `dateFormat` field now error out before submission with a row-indexed message, instead of failing async mid-job.

## [4.56.0] - 2026-04-29
- Add 8 transaction bulk-upsert tools — import or update large batches in one call (max 500 per call), all async (return a job ID — poll with `clio background-jobs get <jobId>`):
  - `bulk_upsert_invoices` + `clio invoices bulk-upsert` (natural key: `invoiceReference`)
  - `bulk_upsert_invoice_line_items` + `clio invoices bulk-upsert-line-items` (nested line items per invoice)
  - `bulk_upsert_bills` + `clio bills bulk-upsert` (natural key: `billReference`)
  - `bulk_upsert_bill_line_items` + `clio bills bulk-upsert-line-items` (nested line items per bill)
  - `bulk_upsert_customer_credit_notes` + `clio customer-credit-notes bulk-upsert`
  - `bulk_upsert_supplier_credit_notes` + `clio supplier-credit-notes bulk-upsert`
  - `bulk_upsert_journals` + `clio journals bulk-upsert` (multi-leg manual journals; debit + credit must balance)
  - `bulk_upsert_fixed_assets` + `clio fixed-assets bulk-upsert` (`registrationType` `NEW` or `TRANSFER` per row)
- Dates on bulk-upsert payloads are ISO 8601 (`YYYY-MM-DD`) only — the previously-tolerated `dateFormat` field has been removed API-side.
- 247 → 255 MCP tools

## [4.55.6] - 2026-04-12
- Internal release automation update. No user-facing changes since v4.55.5.

## [4.55.5] - 2026-04-10
- Multi-org MCP auth: comma-separated API keys (`jk-aaa,jk-bbb`) — one MCP server, multiple organizations
- New `list_organizations` meta-tool exposed in multi-org mode (4 meta-tools instead of 3)
- Optional `org_id` parameter on `execute_tool` for per-request org routing; ignored in single-org mode
- 5 new tools: `get_export_columns`, `preview_export_records`, `export_records`, `search_background_jobs`, `bulk_upsert_contacts`
- 247 MCP tools total (+5 from v4.53.0)
- Stability: 30s per-command timeout in smoke tests; dedup guards now verify exact match client-side; items bulk-upsert search uses `--filter`
- 58/58 MCP integration tests passing (28 no-auth + 21 auth + 9 multi-org)

## [4.54.0] - 2026-04-09
- Add export-records API + CLI (`clio export-records columns/preview/download`) + 3 MCP tools (`get_export_columns`, `preview_export_records`, `export_records`)
- Add background-jobs search API + CLI (`clio background-jobs search/get`) + MCP tool (`search_background_jobs`) — universal async job tracking layer
- Add contacts bulk-upsert API + CLI (`clio contacts bulk-upsert`) + MCP tool (`bulk_upsert_contacts`) — async (returns jobId), unlike items bulk-upsert (sync)
- 242 → 247 MCP tools; 51 → 53 CLI command groups; 2,718 → 2,748 unit tests

## [4.53.0] - 2026-03-10
- Multi-org auth: PAT (pat_...) and comma-separated API keys (jk-aaa,jk-bbb) in MCP server
- New `list_organizations` meta-tool for multi-org mode
- `org_id` parameter on `execute_tool` for per-request org routing
- `parseKeyInput()` with full edge case handling (mixed types, duplicates, invalid formats)
- Upgrade title generation model to gpt-5.4-nano-2026-03-17

## [4.23.0] - 2026-03-06
- Add custom fields, tags, and nano classifiers across CLI, MCP, and skills
- Patch hono and @hono/node-server security vulnerabilities
- Replace stale OAS with placeholder, fix sanitization regex
- Upgrade default OpenAI model to gpt-5.4-2026-03-05

## [4.22.1] - 2026-03-04
- Add missing CLI commands for all registered tools
- Fix auto-reconciliation endpoint URL to `/search-magic-reconciliation`

## [4.22.0] - 2026-03-04
- Expand tool registry from 146 to 200+ tools for full bookkeeper coverage
- Resolve 12 smoke test failures across CLI and infrastructure
- Add build step to release-to-mirror and validate-plugin workflows
- Replace confidential codename in field-map.md

## [4.21.2] - 2026-03-04
- Resolve 12 smoke test failures across CLI commands and infrastructure

## [4.21.1] - 2026-03-04
- Fix bank record search — broken date filter, missing filter params, wrong type
- Enforce same-contact constraint on N:1 bank match (Phase 3)
- Input validation, defensive guards, ESM-safe sync

## [4.21.0] - 2026-03-04
- Add `add_bank_records` tool — JSON POST for creating 1-100 bank records per call (`clio bank add-records`)
- Fix bank record search sort field: `date` → `valueDate`
- Update skill docs: bank record creation methods, error catalog, field map

## [4.20.1] - 2026-03-03
- Combined MCP config examples in README
- Removed duplicate API gotchas table (covered by skills)
- Updated README tagline and descriptions
- Added Clio trademark notice

## [4.20.0] - 2026-03-02
- Structured MCP error responses with status codes and actionable hints
- Input validation in MCP path (fail before hitting API)
- Destructive hint annotations for pay/finalize/refund/remove operations
- Org context display in MCP server instructions and stderr
- Search invoices/bills now match by contact name
- DRY tool architecture: shared errors + validation across MCP and daemon

## [4.19.0] - 2026-03-02
- DRY tool architecture — single source of truth for MCP, drafts, and jobs
- 145 tools from unified TOOL_DEFINITIONS

## [4.18.0] - 2026-03-02
- Auth onboarding on bare `clio` invocation
- Correct offset semantics for pagination

## [4.17.0] - 2026-02-28
- Resolved 19 smoke test failures
- Removed smoke-test from assets (confidential audit)
- Synced stale stats (test count, doc line counts)

## [4.16.0] - 2026-02-25
- Initial public release
- 145 agent tools, 13 financial calculators, 12 accounting jobs
- 4 agent skills (API, conversion, transaction recipes, jobs)
- MCP stdio server for Claude Code and AI tools
- CLI with 38 command groups
