---
name: jaz-api
version: 5.20.6
description: >-
  Use this skill whenever you call, debug, or review code that touches the Jaz
  REST API. Covers field names, response shapes, 158 production gotchas, error
  recovery (422/400/404/500), search filters, pagination, and edge cases for
  every endpoint — invoices, bills, credit notes, journals, cash entries,
  payments, contacts, CoA, items, tax profiles, bank records, fixed assets,
  schedulers, subscriptions, attachments, and Jaz Magic extraction. Also use
  when building API clients, seeding test data, or adding new endpoint support.
license: MIT
compatibility: Requires Jaz API key (x-jk-api-key header). Works with Claude Code, Google Antigravity, OpenAI Codex, GitHub Copilot, Cursor, and any agent that reads markdown.
---

# Jaz API Skill

You are working with the **Jaz REST API** — the accounting platform backend. Also fully compatible with Juan Accounting (same API, same endpoints).

## Pick the right invocation path first

Before touching this skill's HTTP details, check what's actually available:

- **Running inside an MCP host (Claude Desktop, Cowork)**: use the MCP tools (`execute_tool` with `create_invoice`, `list_bills`, etc.). Do not write direct HTTP. The MCP server handles auth, retries, and field shape for you.
- **Running Claude Code with the `jaz-clio` CLI**: use the CLI commands (`clio invoices list --json`, etc.). Same code path, structured output.
- **No agent surface, raw integration**: write HTTP calls per the endpoints catalog below.

The rest of this skill — field names, gotchas, error catalog, dependency order, search filter syntax — applies regardless of invocation path. Read it for *context*, not for HTTP-call construction unless you're in the third bucket.

## Reading Order

**Core fundamentals (read first, every integration):** Identifiers & Dates 1–3; Names & Fields 9–13; Transaction Creation 14–16; Chart of Accounts 17–22; Payments / Cross-Currency 4–8; Journals & Cash 23–26; Credit Notes & Refunds 27–28; Reports 36–37; Tax Profile Scoping 100; Transaction References 104; Draft Finalization Pipeline 81–88; Jaz Magic / PDF-JPG 57–63; Currency Rates 39, 49, 105; Withholding Tax 45, 98.

**Integration depth (API clients, pipelines, batch jobs, MCP/CLI):** Bulk Upsert (Items/Contacts/Rates); Background Jobs (filter `resourceId` not `jobId`); Export Records; Pagination (38); Search & Filter (50–56); Response Shape Gotchas (66–73); Cash Entry Response Shape (74–77); Entity Resolution (78–80); Bank Rules (89–90c); Fixed Assets (91–92c); Subscriptions & Scheduled (93–94); niche endpoints (95–102); Journals balance (103); Quick Fix (107, 111); TTB (108); Dynamic Strings (109–110); Sub-Resource Shapes (112); Nano-Classifier (113); Scheduler Asymmetry (114); Payment Record CRUD (115–117); Bulk Upserts transactions (118–122); Reconciliation write-side (123–127); Drafts lifecycle (128–135); Orders — Sale Quotes / Sale Orders / Purchase Requests / Purchase Orders (`references/orders.md`).

## When to Use This Skill

- Writing or modifying any code that calls the Jaz API
- Building API clients, integrations, or data pipelines
- Debugging API errors (422, 400, 404, 500)
- Adding support for new Jaz API endpoints
- Reviewing code that constructs Jaz API request payloads

## Quick Reference

**Base URL**: `https://api.getjaz.com`
**Auth**: `x-jk-api-key: <key>` header on every request — key has `jk-` prefix (e.g., `jk-a1b2c3...`). NOT `Authorization: Bearer` or `x-api-key`.
**Content-Type**: `application/json` for all POST/PUT/PATCH (except multipart endpoints: `createBusinessTransactionFromAttachment` FILE mode, `importBankStatementFromAttachment`, and attachment uploads)
**All paths are prefixed**: `/api/v1/` (e.g., `https://api.getjaz.com/api/v1/invoices`)

## Critical Rules

### Identifiers & Dates
1. **All IDs are `resourceId`** — never `id`. References use `<resource>ResourceId` suffix.
2. **All transaction dates are `valueDate`** — not `issueDate`, `invoiceDate`, `date`. This is an accounting term meaning "date of economic effect."
3. **All dates are `YYYY-MM-DD` strings** — ISO datetime and epoch ms are rejected.

### Payments (Cross-Currency Aware)
4. **Payment amounts have two fields**: `paymentAmount` = bank account currency (actual cash moved), `transactionAmount` = transaction document currency (invoice/bill/credit note — amount applied to balance). For same-currency, both are equal. For FX (e.g., USD invoice paid from SGD bank at 1.35): `paymentAmount: 1350` (SGD), `transactionAmount: 1000` (USD).
5. **Payment date is `valueDate`** — not `paymentDate`, not `date`.
6. **Payment bank account is `accountResourceId`** — not `bankAccountResourceId`.
7. **Payments require 6 fields**: `paymentAmount`, `transactionAmount`, `accountResourceId`, `paymentMethod`, `reference`, `valueDate`.
8. **Payments wrapped in `{ payments: [...] }`** — array recommended. Flat objects are now auto-wrapped by the API, but array format is preferred for clarity.

### Names & Fields
9. **Line item descriptions use `name`** — not `description`.
10. **Item names**: canonical field is `internalName`, but `name` alias is accepted on POST. GET responses return both `internalName` and `name`.
11. **Tag names**: canonical field is `tagName`, but `name` alias is accepted on POST. GET responses return both `tagName` and `name`.
12. **Custom field names**: POST uses `name`, GET returns both `customFieldName` and `name`.
13. **Invoice/bill number is `reference`** — not `referenceNumber`.

### Transaction Creation
14. **`saveAsDraft`** defaults to `false` — omitting it creates a finalized transaction. Explicitly sending `saveAsDraft: true` creates a draft.
15. **If `saveAsDraft: false`** (or omitted), every lineItem MUST have `accountResourceId`.
16. **Phones MUST be E.164** — `+65XXXXXXXX` (SG), `+63XXXXXXXXXX` (PH). No spaces.

### Chart of Accounts
17. **Tax profiles pre-exist** — NEVER create them. Only GET and map.
18. **Bank accounts are CoA entries** with `accountType: "Bank Accounts"`. A convenience endpoint `GET /bank-accounts` exists but returns a **flat array** `[{...}]` — NOT the standard paginated `{ data, totalElements, totalPages }` shape. Normalize before use.
19. **CoA bulk-upsert wrapper is `accounts`** — not `chartOfAccounts`.
20. **CoA POST uses `currency`** — not `currencyCode`. (Asymmetry — GET returns `currencyCode`.)
21. **CoA POST uses `classificationType`** — GET returns `accountType`. Same values. Both fields accept the classic 12 types (Bank Accounts, Cash, Current Asset, Fixed Asset, Inventory, Current Liability, Non-current Liability, Shareholders Equity, Operating Revenue, Other Revenue, Operating Expense, Direct Costs) AND the IFRS 18 set added 2026-04 (Discontinued Expense, Discontinued Income, Finance Cost, Financing Income, Goodwill, Income Tax Expense, Investing Expense, Investing Income, Investment) — see rule 140 for IFRS 18 detail.
22. **CoA code mapping: match by NAME, not code** — pre-existing accounts may have different codes. Resource IDs are the universal identifier.

### Bulk Upsert (Items, Contacts & Rates)
- **Items bulk-upsert** (`POST /items/bulk-upsert`) — max 500 per call. Provide `resourceId` per item to update (partial — only changed fields needed, server preserves existing values). Omit `resourceId` to create (defaults: `status=ACTIVE`, `itemCategory=NON_INVENTORY`). Response: `{ resourceId: null, resourceIds: [...] }`. **SYNC** — returns resourceIds immediately.
- **Contacts bulk-upsert** (`POST /contacts/bulk-upsert`) — max 500 per call. Provide `resourceId` to update (partial), omit to create. `billingName` required for create. **ASYNC** — returns `{ jobId, status: "QUEUED", totalRecords }`. Poll `search_background_jobs` with `filter: {resourceId:{eq:jobId}}` until status is `SUCCESS`, `FAILED`, or `PARTIAL_SUCCESS`. Unlike items, contacts bulk-upsert is asynchronous.
- **Rates bulk-upsert** (`POST /organization/currencies/rates/bulk-upsert`) — max 500 per call. Requires `rateDirection` per rate (`FUNCTIONAL_TO_SOURCE` or `SOURCE_TO_FUNCTIONAL`). **Auto-enables currencies not yet enabled in the org** — no need to call `add_currency` first. Response: `{ resourceId: null, resourceIds: [...] }`.

### Background Jobs (Universal Async Tracking)
- **ANY operation that returns a `jobId`** can be polled via `search_background_jobs`. This includes: contacts bulk-upsert (`UPSERT_CONTACTS`), items bulk-upsert (`UPSERT_ITEMS`), bank statement import (`PROCESS_BANK_STATEMENT_FILES`), and magic processing (`MAGIC_TRANSACTION_*`).
- **🚨 CRITICAL: Filter by `resourceId`, NOT `jobId`** — `filter: {jobId:{eq:...}}` is silently ignored (returns ALL jobs). Must use `filter: {resourceId:{eq:theJobId}}`. The response field is named `jobId` but the filter path is `resourceId`.
- **Poll until terminal status** — `SUCCESS`, `FAILED`, or `PARTIAL_SUCCESS`. Use `processedCount`, `failedCount`, `totalRecords` for progress. `PARTIAL_SUCCESS` means some records succeeded and some failed — check `errorDetails` array for per-record errors.
- **`startedAt` filter does NOT work** — use `createdAt` for date range filtering.
- **`errorDetails` is `[]` (empty array) on success** — not `null`.
- **Known jobTypes**: `UPSERT_CONTACTS`, `UPSERT_ITEMS`, `PROCESS_BANK_STATEMENT_FILES`, `MAGIC_TRANSACTION_PURCHASE`, `MAGIC_TRANSACTION_SALE`, `MAGIC_TRANSACTION_SALE_CREDIT_NOTE`.

### Export Records
- **`outputFormat: "XLSX"` is always required** — no other format is currently supported. Hardcode it.
- **`query` + `filter` are mutually exclusive** — the server returns `INVALID_SEARCH_INPUT` if both are provided. Pass `query` (structured search string, same syntax as dashboard) OR `filter` (raw JSON filter object), never both.
- **Available entity types**: `INVOICE`, `BILL`, `CUSTOMER_CREDIT_NOTE`, `SUPPLIER_CREDIT_NOTE`, `SALE_PAYMENT`, `PURCHASE_PAYMENT`, `BATCH_PAYMENT`, `CONTACT`, `ITEM`, `CAPSULE`, `SCHEDULED_TRANSACTION`, `JOURNAL`, `BANK_RECORD`, `CASHFLOW_TRANSACTION`, `FIXED_ASSET`, `CHART_OF_ACCOUNT`, `TAX_PROFILE`.
- **`fileUrl` expires in ~5 minutes** — it's a pre-signed S3 URL. Warn the user to download immediately.
- **Preview first** — use `preview_export_records` to confirm scope (count + sample rows) before calling `export_records`. The `filterDescription` field gives a human-readable summary like `"2580 records | Status in: UNPAID"`.
- **Column customization** — use `get_export_columns` to discover available column paths and headers. Pass a `columns` array to select specific fields. Omit for default columns.
- **`previewRows` keys are column headers** — not field paths. E.g. `{"Invoice Ref #": "INV-001", "Customer": "Acme"}`. Use `resolvedColumns` to map headers back to paths.

### Journals & Cash
23. **Journals use `journalEntries`** with `amount` + `type: "DEBIT"|"CREDIT"` — NOT `debit`/`credit` number fields.
24. **Journals support multi-currency via `currency` object** — same format as invoices/bills: `"currency": { "sourceCurrency": "USD" }` (auto-fetch platform rate) or `"currency": { "sourceCurrency": "USD", "exchangeRate": 1.35 }` (custom rate). Must be enabled for the org. Omit for base currency. Three restrictions apply to foreign currency journals: (a) **no controlled accounts** — accounts with `controlFlag` (AR, AP) are off-limits (use invoices/bills instead), (b) **no FX accounts** — FX Unrealized Gain/Loss/Rounding are system-managed, (c) **bank accounts must match** — can only post to bank accounts in the same currency as the journal (e.g., USD journal → USD bank account only, not SGD bank account). All other non-controlled accounts (expenses, revenue, assets, liabilities) are available.
25. **`currency` object is the SAME everywhere** — invoices, bills, credit notes, AND journals all use `currency: { sourceCurrency: "USD", exchangeRate?: number }`. Never use `currencyCode: "USD"` (silently ignored on invoices/bills) or `currency: "USD"` (string — causes 400 on invoices/bills).
26. **Cash entries use `accountResourceId`** at top level for the BANK account + `lines` array for offsets.

### Credit Notes & Refunds
27. **Credit note application wraps in `credits` array** with `amountApplied` — not flat.
28. **CN refunds use the same Payment shape** as invoice/bill payments — `paymentAmount`, `transactionAmount`, `accountResourceId`, `paymentMethod`, `valueDate`, `reference`. The API also accepts aliases `refundAmount`/`refundMethod` (see Rule 53) but prefer canonical `paymentAmount`/`paymentMethod` for consistency.

### Inventory Items
29. **Inventory items require**: `unit` (e.g., `"pcs"`), `costingMethod` (`"FIXED"` or `"WAC"`), `cogsResourceId`, `blockInsufficientDeductions`, `inventoryAccountResourceId`. `purchaseAccountResourceId` MUST be Inventory-type CoA.
30. **Delete inventory items via `DELETE /items/:id`** — not `/inventory-items/:id`.

### Cash Transfers
31. **Cash transfers use `cashOut`/`cashIn` sub-objects** — NOT flat `fromAccountResourceId`/`toAccountResourceId`. Each: `{ accountResourceId, amount }`.

### Schedulers
32. **Scheduled invoices/bills wrap in `{ invoice: {...} }` or `{ bill: {...} }`** — not flat. Recurrence field is `repeat` (NOT `frequency`/`interval`). `saveAsDraft: false` required. **`reference` is required** inside the `invoice`/`bill` wrapper — omitting it causes 422.
33. **Scheduled journals use FLAT structure** with `schedulerEntries` — not nested in `journal` wrapper. **`valueDate` is required** at the top level (alongside `startDate`, `repeat`, etc.).

### Bookmarks
34. **Bookmarks use `items` array wrapper** with `name`, `value`, `categoryCode`, `datatypeCode`.

### Custom Fields
35. **Do NOT send `appliesTo` on custom field POST** — causes "Invalid request body". Only send `name`, `type`, `printOnDocuments`.
35a. **Custom field values on transactions**: Set via `customFields: [{ customFieldName: "PO Number", actualValue: "PO-123" }]` on invoice/bill/customer-CN/supplier-CN/payment/item/fixed-asset create/update. NOT on journals, cash entries, or cash transfers. Read from GET responses in the same shape.
35b. **Custom field search**: `POST /custom-fields/search` with filter/sort/limit/offset. Filter by `customFieldName` (StringExpression), `datatypeCode` (StringExpression: TEXT, DATE, DROPDOWN).
35c. **Custom field GET**: `GET /custom-fields/:resourceId` returns full definition including `applyToSales`, `applyToPurchase`, `applyToCreditNote`, `applyToPayment`, `printOnDocuments`, `listOptions`.

### Tags on Transactions
35d. **Tags are `tags: string[]`** on ALL transaction create/update: invoices, bills, customer CNs, supplier CNs, journals, cash-in, cash-out, cash transfers. CLI uses `--tag <name>` (singular, wrapped to array). API accepts the array directly.

### Nano Classifiers
35e. **ClassifierConfig on line items**: `classifierConfig: [{ resourceId: "<capsuleTypeId>", type: "invoice"|"bill", selectedClasses: [{ className: "Class A", resourceId: "<classId>" }], printable: true }]`. Applies to line items on invoices, bills, credit notes, journal entries, and cash entry details. Create capsule types first via `POST /capsule-types`, then reference them in classifierConfig.

### Reports
36. **Report field names differ by type** — this is the most error-prone area:

| Report | Required Fields |
|--------|----------------|
| Trial balance | `startDate`, `endDate` |
| Balance sheet | `primarySnapshotDate` |
| P&L | `primarySnapshotDate`, `secondarySnapshotDate` |
| General ledger | `startDate`, `endDate`, `groupBy: "ACCOUNT"` (also `TRANSACTION`, `CAPSULE`) |
| Cashflow | `primaryStartDate`, `primaryEndDate` |
| Cash balance | `reportDate` |
| AR/AP report | `endDate` |
| AR/AP summary | `startDate`, `endDate` |
| Bank balance summary | `primarySnapshotDate` |
| Equity movement | `primarySnapshotStartDate`, `primarySnapshotEndDate` |
| Ledger highlights | *(none — simple GET)* |

37. **Ledger highlights is a simple GET** — `GET /api/v1/ledger/highlights` returns org-wide GL summary metadata: transaction counts by type, date range, active accounts/currencies, cross-currency flag, and dynamic FX types. No parameters. Response dates are epoch ms (see Rule 52).
37a. **Data exports use simpler field names**: P&L export uses `startDate`/`endDate` (NOT `primarySnapshotDate`). AR/AP export uses `endDate`.

### Pagination
38. **All list/search endpoints use `limit`/`offset` pagination** — NOT `page`/`size`. **`offset` is a 0-indexed PAGE NUMBER, not a row-skip** (offset=1 = second page of `limit` rows). Default limit=100, offset=0. Max limit=1000, max offset=65536. `page`/`size` params are silently ignored. Response shape: `{ totalPages, totalElements, truncated, data: [...] }`. When `truncated: true`, a `_meta: { fetchedRows, maxRows }` field explains why (offset cap or `--max-rows` soft cap — default 10,000). Use `--max-rows <n>` to override. Always check `truncated` before assuming the full dataset was returned. **Payload tier (`view`) — page-then-drill:** `search_*` and the lean `list_*` tools (invoices, bills, contacts, items, journals, customer/supplier credit notes, sale/purchase orders) return a **compact summary row by default** (`view:"lean"` — id + reference/status/date/contact/amount). Search lean to FIND a record, then read it in full via its `get_*`; pass `view:"full"` only when you need whole rows up front (heavier — avoid for broad searches). Other collections always return full. CLI defaults to full; use `--view lean`.

### Other
39. **Currency rates use `/organization-currencies/:code/rates`** — note the HYPHENATED path (NOT `/organization/currencies`). Enable currencies first via `POST /organization/currencies`, then set rates via `POST /organization-currencies/:code/rates` with body `{ "rate": 0.74, "rateApplicableFrom": "YYYY-MM-DD" }` (see Rule 49 for direction). Cannot set rates for org base currency. Full CRUD: POST (create), GET (list), GET/:id, PUT/:id, DELETE/:id.
40. **FX invoices/bills MUST use `currency` object** — `currencyCode: "USD"` (string) is **silently ignored** (transaction created in base currency!). Use `currency: { sourceCurrency: "USD" }` to auto-fetch platform rate (ECB/FRANKFURTER), or `currency: { sourceCurrency: "USD", exchangeRate: 1.35 }` for a custom rate. Rate hierarchy: org rate → platform/ECB → transaction-level.
41. **Invoice GET uses `organizationAccountResourceId`** for line item accounts — POST uses `accountResourceId`. Request-side aliases resolve `issueDate` → `valueDate`, `bankAccountResourceId` → `accountResourceId`, etc.
42. **Scheduler GET returns `interval`** — POST uses `repeat`. (Response-side asymmetry remains.)
43. **Search sort is an object** — `{ sort: { sortBy: ["valueDate"], order: "DESC" } }`. Required when `offset` is present (even `offset: 0`).
44. **Bank records** — **Create**: Multipart CSV/OFX via `POST /magic/importBankStatementFromAttachment` or JSON via `POST /bank-records/:accountResourceId` with `{ records: [{amount, transactionDate, description?, payerOrPayee?, reference?}] }` (positive = cash-in, negative = cash-out, response: `{data: {errors: []}}`). **Search**: `POST /bank-records/:accountResourceId/search` — filter fields: `valueDate` (DateExpression), `status` (StringExpression: UNRECONCILED, RECONCILED, ARCHIVED, POSSIBLE_DUPLICATE), `description`, `extContactName` (payer/payee), `extReference`, `netAmount` (BigDecimalExpression), `extAccountNumber`. Sort by `valueDate` DESC default.
45. **Withholding tax** on bills/supplier CNs only. Retry pattern: if `WITHHOLDING_CODE_NOT_FOUND`, strip field and retry.
46. **Known API bugs (500s)**: Contact groups PUT (nil pointer on search response), custom fields PUT (dangling stack pointers in mapping), capsules POST (upstream returns nil), catalogs POST, inventory balances by status GET (`/inventory-balances/:status`, missing `c.Bind`) — all return 500.
47. **Non-existent endpoints**: `POST /deposits`, `POST /inventory/adjustments`, `GET /payments` (list), and `POST /payments/search` return 404 — these endpoints are not implemented. To list/search payments, use `POST /cashflow-transactions/search` (the unified transaction ledger — see Rule 63).
48. **Attachments — full CRUD**: **Add**: `POST /:type/:id/attachments` (multipart, `file` field, `application/pdf` or `image/*` — NOT `text/plain`). **List**: `GET /:type/:id/attachments`. **Delete**: `DELETE /:type/:id/attachments/:attachmentResourceId` (HTTP 200). CLI: `clio attachments add --file <path>` or `--url <url>`, `clio attachments list`, `clio attachments delete <attachmentResourceId>`. **Response shape is non-standard**: `{ reference, resourceId, attachments: [{fileName, fileType, fileId, attachmentResourceId}] }` — NOT `{ data: [...] }`. The attachment ID field is `attachmentResourceId` (not `resourceId`).
49. **Currency rate direction: `rate` = functionalToSource (1 base = X foreign)** — POST `rate: 0.74` for a SGD org means 1 SGD = 0.74 USD. **If your data stores rates as "1 USD = 1.35 SGD" (sourceToFunctional), you MUST invert: `rate = 1 / 1.35 = 0.74`.** GET confirms both: `rateFunctionalToSource` (what you POSTed) and `rateSourceToFunctional` (the inverse).

### Search & Filter
50. **Search endpoint universal pattern** — All 32 `POST /*/search` endpoints share identical structure: `{ filter?, sort: { sortBy: ["field"], order: "ASC"|"DESC" }, limit: 1-1000, offset: 0-65536 }`. `offset` is a 0-indexed page number (not row-skip). Sort is REQUIRED when offset is present (even `offset: 0`). Default limit: 100. `sortBy` is always an array on all endpoints (no exceptions). See `references/search-reference.md` for per-endpoint filter/sort fields.
50a. **`query` field — Jaz search operators** — 14 endpoints accept an optional `query` string alongside `filter`: invoices, bills, customer/supplier credit notes, journals, cashflow-transactions, bank-records, contacts, items, capsules, fixed-assets, scheduled-transactions, chart-of-accounts, tax-profiles. Example: `{ "query": "status:unpaid AND $500+", "limit": 50 }`. Key syntax: amounts (`$500+`, `$100-500`, `amount:>2m`, magnitude suffixes `5k`/`2m`/`1b`), negative (`$-500`), absolute value (`abs:1000+`), dates (`date:this month`, `date:-30d`, `due:overdue`, `submitted:last week`, `lastpayment:-7d`), status/enum (`status:unpaid`, `currency:SGD,USD` — comma = OR), string fields (`customer:acme`, `ref:INV-*` wildcard, `=ref:INV-001` exact, `ref:/\d{4}/` regex), blank checks (`ref:blank`, `tag:!blank`), booleans (`hasattachment:yes`, `customer:yes`), negation (`!status:paid` or `NOT status:void` — **never `-`** for negation), logic (`AND`/`OR` with implicit AND on space), grouping, inline sort (`sort:amount:desc`). Full syntax spec (all fields, aliases, entity field lists, examples): **`references/search-syntax.md`**.
50b. **`query` + `filter` merge** — When both are present, they are merged at the filter level. Explicit `filter` keys win on conflict. Use `query` for human-readable shorthand, `filter` for programmatic precision, or combine both: `{ "query": "date:this year", "filter": { "currencyCode": { "in": ["SGD"] } } }`.
50c. **`query` error handling** — Unknown field name → `query_not_understood` (400). Bad enum value (e.g. `status:BADVALUE`) → **empty results, no error** (silent miss). Unsupported endpoint → `query_not_supported` (400). Parser unavailable → `query_parse_error` (502). Empty/null/whitespace query → passthrough (ignored). In CLI/MCP: use `--query` / `query` param only on supported entities — unsupported entities have no `--query` flag.
51. **Filter operator reference** — String: `eq`, `neq`, `contains`, `in` (array, max 100), `likeIn` (array, max 100), `reg` (regex array, max 100), `isNull` (bool). Numeric: `eq`, `gt`, `gte`, `lt`, `lte`, `in`. Date (YYYY-MM-DD): `eq`, `gt`, `gte`, `lt`, `lte`, `between` (exactly 2 values). DateTime (RFC3339): same operators, converted to epoch ms internally. Boolean: `eq`. JSON: `jsonIn`, `jsonNotIn`. Logical: nest with `and`/`or`/`not` objects, or use `andGroup`/`orGroup` arrays (invoices, bills, journals, credit notes).
52. **Date format asymmetry (CRITICAL)** — Request dates: `YYYY-MM-DD` strings (all create/update and DateExpression filters). Request datetimes: RFC3339 strings (DateTimeExpression filters for `createdAt`, `updatedAt`, `approvedAt`, `submittedAt`). **ALL response dates**: `int64` epoch milliseconds — including `valueDate`, `createdAt`, `updatedAt`, `approvedAt`, `submittedAt`, `matchDate`. Convert: `new Date(epochMs).toISOString().slice(0,10)`. **Timezone convention**: ALL business dates (`valueDate`, `dueDate`, `startDate`, `endDate`, etc.) are in the **organization's timezone** — never UTC. The epoch ms stored in the DB represents the org-local date (no timezone conversion is ever needed). Only audit timestamps (`createdAt`, `updatedAt`, `action_at`) are UTC.
53. **Field aliases on create endpoints** — Middleware transparently maps: `issueDate`/`date` → `valueDate` (invoices, bills, credit notes, journals). `name` → `tagName` (tags) or `internalName` (items). `paymentDate` → `valueDate`, `bankAccountResourceId` → `accountResourceId` (payments). `paymentAmount` → `refundAmount`, `paymentMethod` → `refundMethod` (credit note refunds). `accountType` → `classificationType`, `currencyCode` → `currency` (CoA). Canonical names always work; aliases are convenience only.
54. **All search/list responses are flat** — every search and list endpoint returns `{ totalElements, totalPages, data: [...] }` directly (no outer `data` wrapper). Access the array via `response.data`, pagination via `response.totalElements`. **Two exceptions**: (a) `GET /bank-accounts` returns a plain array `[{...}]` (see Rule 18), (b) `GET /invoices/:id` returns a flat object `{...}` (no `data` wrapper) — unlike `GET /bills/:id`, `GET /contacts/:id`, `GET /journals/:id` which wrap in `{ data: {...} }`. Normalize the invoice GET response before use.
55. **Scheduled endpoints support date aliases** — `txnDateAliases` middleware (mapping `issueDate`/`date` → `valueDate`) now applies to all scheduled create/update endpoints: `POST/PUT /scheduled/invoices`, `POST/PUT /scheduled/bills`, `POST/PUT /scheduled/journals`, `POST/PUT /scheduled/subscriptions`.
56. **Kebab-case URL aliases** — `capsuleTypes` endpoints also accept kebab-case paths: `/capsule-types` (list, search, CRUD). `moveTransactionCapsules` also accepts `/move-transaction-capsules`. Both camelCase and kebab-case work identically.

### Jaz Magic — Extraction & Autofill
57. **When the user starts from an attachment, always use Jaz Magic** — if the input is a PDF, JPG, or any document image (invoice, bill, receipt), the correct path is `POST /magic/createBusinessTransactionFromAttachment`. Do NOT manually construct a `POST /invoices` or `POST /bills` payload from an attachment — Jaz Magic handles the entire extraction-and-autofill pipeline server-side: OCR, line item detection, contact matching, CoA auto-mapping via ML learning, and draft creation with all fields pre-filled. Only use `POST /invoices` or `POST /bills` when building transactions from structured data (JSON, CSV, database rows) where the fields are already known. If you hold the invoice/bill as raw HTML (e.g. an email body), pass it via `sourceType: "HTML"` with an `html` field — the backend renders it to a PDF then extracts, so you do NOT need to save it to a file first.
58. **Three upload modes with different content types** — `sourceType: "FILE"` requires **multipart/form-data** with `sourceFile` blob (JSON body fails with 400 "sourceFile is a required field"). `sourceType: "URL"` accepts **application/json** with `sourceURL` string. `sourceType: "HTML"` accepts the raw HTML body in an `html` field (JSON or multipart) — the backend renders it to a PDF, then extracts (use this for an email body you already hold; no file needed). The OAS only documents URL mode — FILE and HTML modes are undocumented there.
59. **Three required fields + one optional**: the source (`sourceFile` multipart blob — NOT `file` — for FILE, `sourceURL` for URL, or `html` for HTML), `businessTransactionType` (`"INVOICE"`, `"BILL"`, `"CUSTOMER_CREDIT_NOTE"`, or `"SUPPLIER_CREDIT_NOTE"` — `EXPENSE` rejected), `sourceType` (`"FILE"`, `"URL"`, or `"HTML"`). For HTML mode, `html` is the raw HTML string (max 5 MB). Optional: `uploadMode` (`"SEPARATE"` default, or `"MERGED"` for a single PDF containing multiple documents — the backend splits it via boundary detection before extraction). All required fields are validated server-side. **CRITICAL: multipart form field names are camelCase** — `businessTransactionType`, `sourceType`, `sourceFile`, `uploadMode`, NOT snake_case. Using `business_transaction_type` returns 422 "businessTransactionType is a required field". The File blob must include a filename and correct MIME type (e.g. `application/pdf`, `image/jpeg`) — bare `application/octet-stream` blobs are rejected with 400 "Invalid file type".
59a. **MERGED upload workflow tracking** — When `uploadMode: "MERGED"`, the upload response `workflowResourceId` is a **parent** tracking ID. The backend splits the PDF, then creates **child** workflows for each split page — these child IDs appear in `POST /magic/workflows/search` (by fileName or createdAt), NOT the parent ID. To track MERGED progress, search by `fileName` rather than the parent `workflowResourceId`.
60. **Response maps transaction types**: Request `INVOICE` → response `SALE`. Request `BILL` → response `PURCHASE`. Request `CUSTOMER_CREDIT_NOTE` → response `SALE_CREDIT_NOTE`. Request `SUPPLIER_CREDIT_NOTE` → response `PURCHASE_CREDIT_NOTE`. S3 paths follow the response type. The response `validFiles[]` array contains `workflowResourceId` for tracking extraction progress via `POST /magic/workflows/search`.
61. **Extraction is asynchronous** — the API response is immediate (file upload confirmation only). The actual Magic pipeline — OCR, line item extraction, contact matching, CoA learning, and autofill — runs asynchronously. Use `POST /magic/workflows/search` with `filter.resourceId.eq: "<workflowResourceId>"` to check status (SUBMITTED → PROCESSING → COMPLETED/FAILED). When COMPLETED, `businessTransactionDetails.businessTransactionResourceId` contains the created draft BT ID. The `subscriptionFBPath` in the response is a Firebase Realtime Database path for real-time status updates (alternative to polling).
62. **Accepts PDF and JPG/JPEG** — both file types confirmed working. Handwritten documents are accepted at upload stage (extraction quality varies). `fileType` in response reflects actual format: `"PDF"`, `"JPEG"`.
63. **Workflow search tracks all magic uploads** — `POST /magic/workflows/search` searches across BT extractions AND bank statement imports. Filter by `resourceId` (eq), `documentType` (SALE, PURCHASE, SALE_CREDIT_NOTE, PURCHASE_CREDIT_NOTE, BANK_STATEMENT), `status` (SUBMITTED, PROCESSING, COMPLETED, FAILED), `fileName` (contains), `fileType`, `createdAt` (date range). Response: paginated `MagicWorkflowItem` with `businessTransactionDetails.businessTransactionResourceId` (the draft BT ID when COMPLETED) or `bankStatementDetails` (for bank imports). Standard search sort: `{ sortBy: ["createdAt"], order: "DESC" }`.

### Cashflow & Unified Ledger
64. **No standalone payments list/search** — `GET /payments`, `POST /payments/search`, and `GET /payments` do NOT exist. Per-payment CRUD (`GET/PUT/DELETE /payments/:resourceId`) exists for individual payment records, but to **list or search** payments, use `POST /cashflow-transactions/search` — the unified transaction ledger that spans invoices, bills, credit notes, journals, cash entries, and payments. Filter by `businessTransactionType` (e.g., `SALE`, `PURCHASE`) and `direction` (`PAYIN`, `PAYOUT`). Response dates are epoch milliseconds.
65. **Contacts search uses `name`** — NOT `billingName`. The filter field for searching contacts by name is `name` (maps to `billingName` internally). Sort field is also `name`. Using `billingName` in a search filter returns zero results.

### Response Shape Gotchas
66. **Contact boolean fields are `customer`/`supplier`** — NOT `isCustomer`/`isSupplier`. These are plain booleans on the contact object: `{ "customer": true, "supplier": false }`. Using `isCustomer` or `isSupplier` in code will be `undefined`.
67. **Finalized statuses differ by resource type** — NOT `"FINALIZED"`, `"FINAL"`, or `"POSTED"`. Journals → `"APPROVED"`. Invoices/Bills → `"UNPAID"` (progresses to `"PAID"`, `"OVERDUE"`). Customer/Supplier Credit Notes → `"UNAPPLIED"` (progresses to `"APPLIED"`). All types support `"DRAFT"` and `"VOIDED"`. When creating without `saveAsDraft: true`, the response status matches the type's finalized status.
68. **Create/pay responses are minimal by default** — POST create endpoints (invoices, bills, journals, contacts, payments) return only `{ resourceId: "..." }` (plus a few metadata fields). They do NOT return the full entity. To verify field values after creation, do a subsequent `GET /:type/:resourceId`. **MCP tool shortcut:** `create_invoice` / `create_bill` / `create_journal` / `create_contact` / `create_item` accept `returnFullEntity: true` — the executor performs the GET server-side and returns the full entity inline, saving a turn. The raw REST `POST` is still minimal-only; only the MCP tools collapse the round trip. **If the post-create GET fails** (transient 5xx, network blip), the tool returns the minimal create envelope augmented with `_hydration: { status: 'failed', resourceId, message }` — the write committed; the agent should retry only the `get_*` call, NEVER the create (would duplicate the document).
69. **No `amountDue` field** — Invoices and bills do NOT have an `amountDue` field. To check if a transaction is fully paid, inspect the `paymentRecords` array: if `paymentRecords.length > 0`, payments exist. Compare `totalAmount` with the sum of `paymentRecords[].transactionAmount` to determine remaining balance.
70. **Response dates include time component** — Even though request dates are `YYYY-MM-DD`, response dates are epoch milliseconds (see Rule 52). When comparing dates from responses, always convert with `new Date(epochMs).toISOString().slice(0, 10)` — never string-match against the raw epoch value. Remember: business dates are org-timezone (see Rule 52).
71. **Items POST requires `saleItemName`/`purchaseItemName`** — When creating items with `appliesToSale: true` or `appliesToPurchase: true`, you MUST include `saleItemName` and/or `purchaseItemName` respectively. These are the display names shown on sale/purchase documents. Omitting them causes 422: "saleItemName is a required field". If not specified, default to the `internalName` value.
72. **Items PUT requires `itemCode` + `internalName`** — Even for partial updates, `PUT /items/:id` requires both `itemCode` and `internalName` in the body. Omitting either causes 422. Use read-modify-write pattern: GET current item, merge your updates, PUT the full payload. Clio handles this automatically.
73. **Capsules PUT requires `resourceId` + `capsuleTypeResourceId`** — Even for partial updates, `PUT /capsules/:id` requires `resourceId` and `capsuleTypeResourceId` in the body. Omitting either causes 422 or "Capsule type not found". Use read-modify-write pattern: GET current capsule, merge updates, PUT full payload. Clio handles this automatically.

### Cash Entry Response Shape (CRITICAL)
74. **Cash-in/out/transfer CREATE returns `parentEntityResourceId`** — The resourceId in the POST response (`{ data: { resourceId: "X" } }`) is the journal header's `parentEntityResourceId`. This ID is used for DELETE (`DELETE /cash-entries/X`). But it is **NOT** the same ID used for GET (`GET /cash-in-entries/:id`). GET expects the cashflow-transaction `resourceId` from the LIST response. Three different IDs exist per cash entry: `parentEntityResourceId` (from CREATE + in LIST), `resourceId` (cashflow-transaction ID, from LIST — use for GET), `businessTransactionResourceId` (underlying journal ID — do NOT use for anything).
75. **Cash-in/out/transfer LIST/GET return cashflow-transaction shape** — NOT journal shape. Key field differences from journals: `transactionReference` (NOT `reference`), `transactionStatus` (NOT `status` — values: `ACTIVE`/`VOID`), `valueDate` is epoch ms (NOT ISO string), no `journalEntries` array, has `direction` (`PAYIN`/`PAYOUT`), has nested `account` object with bank name, has `businessTransactionType` (`JOURNAL_DIRECT_CASH_IN`/`JOURNAL_DIRECT_CASH_OUT`/`JOURNAL_CASH_TRANSFER`).
76. **Cash-in/out/transfer search uses `/cashflow-transactions/search`** — Filter by `businessTransactionType: { eq: "JOURNAL_DIRECT_CASH_IN" }` (or `JOURNAL_DIRECT_CASH_OUT` or `JOURNAL_CASH_TRANSFER`). Other useful filters: `organizationAccountResourceId` (bank account), `businessTransactionReference` (reference), `valueDate` (date range). The search endpoint is shared across all cashflow transaction types.
77. **DELETE for cash entries uses `/cash-entries/:id`** — NOT the individual resource paths. The ID used is the `parentEntityResourceId` (= the resourceId returned by CREATE). This is a shared endpoint for all cash entry types (cash-in, cash-out, cash-transfer).

### Entity Resolution (Fuzzy Matching)
78. **`--contact`, `--account`, and `--bank-account` accept names** — any CLI flag that takes a contact, chart of accounts entry, or bank account accepts EITHER a UUID resourceId OR a fuzzy name. Examples: `--contact "ACME Corp"`, `--account "DBS Operating"`, `--bank-account "Business"`. The CLI auto-resolves to the best match (strict thresholds) and shows the resolved entity on stderr. UUIDs are passed through without API calls. If the match is ambiguous, the CLI errors with a list of candidates — never silently picks the wrong entity.
79. **`capsule-transaction` recipes auto-resolve accounts** — when `--input` is omitted, the CLI searches the org's chart of accounts for each blueprint account name (e.g., "Interest Expense", "Loan Payable"). If all accounts resolve with high confidence, no JSON mapping file is needed. If any fail, the error message shows exactly which accounts could not be found and suggests close matches. `--contact` and `--bank-account` on recipes also accept names.
80. **Payment/refund account filter is conditional on `--method`** — for BANK_TRANSFER, CASH, and CHEQUE, the `--account` resolver filters to bank/cash accounts only. For other payment methods, all account types are considered.

### Draft Finalization Pipeline (Convert & Next)

The `clio bills draft` subcommand group enables the full "review → fill missing → convert" workflow that mirrors the Jaz UI's "Convert and Next" button. Designed for AI agents processing a queue of draft bills.

#### Commands

| Command | Purpose |
|---------|---------|
| `clio bills draft list [--ids <ids>] [--json]` | Queue view: all drafts with per-field validation + attachment count |
| `clio bills draft finalize <id> [flags] [--json]` | Fill missing fields + convert DRAFT → UNPAID in one PUT |
| `clio bills draft attachments <id> [--json]` | List attachments with download URLs for agent inspection |

#### Mandatory Fields for Bill Finalization

| Field | JSON Path | CLI Flag | Resolver |
|-------|-----------|----------|----------|
| Contact | `contactResourceId` | `--contact <name/UUID>` | Fuzzy resolved |
| Bill date | `valueDate` | `--date <YYYY-MM-DD>` | Literal |
| Due date | `dueDate` | `--due <YYYY-MM-DD>` | Literal |
| Line items | `lineItems` (non-empty) | `--lines <json>` | — |
| Item name | `lineItems[i].name` | via `--lines` | — |
| Item price | `lineItems[i].unitPrice` | via `--lines` | — |
| Item account | `lineItems[i].accountResourceId` | `--account <name/UUID>` (bulk) | Fuzzy resolved |

Optional: `--ref`, `--notes`, `--tag`, `--tax-profile <name/UUID>` (bulk, fuzzy resolved), `--tax`, `--tax-inclusive`, `--dry-run`, `--input <file>`.

#### Agent Workflow Pattern

```
Step 1:  clio bills draft list --json
         → Batch queue: every DRAFT with per-field validation + attachment count

Step 2:  For each draft where ready = false:
         a) Read validation.missingFields from Step 1 output
         b) Optional: clio bills draft attachments <id> --json
            → Download fileUrl, read PDF/image, extract or verify values
         c) Resolve values (ask user, or infer from attachment + context)
         d) clio bills draft finalize <id> --contact "Acme" --date 2025-01-15 ... --json
            → Updates + converts to UNPAID in one PUT (Rule 67: bills/invoices → UNPAID, journals → APPROVED)

Step 3:  For each draft where ready = true:
         clio bills draft finalize <id> --json
         → Converts directly (all mandatory fields already present)
```

81. **`--account` bulk patches line items** — when used with `clio bills draft finalize`, `--account` resolves the name to a UUID then sets `accountResourceId` on EVERY line item where it's currently null. Existing accounts are NOT overwritten. Same for `--tax-profile`. `--lines` takes priority (full replacement).
82. **`--dry-run` validates without modifying** — returns the same validation structure as `draft list` (per-field status/hint), so agents can preview what would happen before committing. No API write occurs.
83. **Finalization is a single PUT** — `updateBill()` with `saveAsDraft: false` transitions DRAFT → UNPAID (per Rule 67) and updates all fields in one call. No delete-and-recreate. The CLI handles all field normalization automatically (date format, line item sanitization, account field name mapping).
84. **Draft list attachment count** — `draft list` includes `attachmentCount` per draft (from `GET /bills/:id/attachments`). Use `draft attachments <id>` for full details including `fileUrl` download links.
85. **PUT body requires `resourceId`** — The UpdateBill PUT endpoint requires `resourceId` in the body (in addition to the URL path). Dates must be `YYYY-MM-DD` (not ISO with time). `taxInclusion` is boolean (`true`/`false`), not string. Line items must use `accountResourceId` (not `organizationAccountResourceId` from GET).
86. **GET→PUT field asymmetry** — GET returns `organizationAccountResourceId` on line items; PUT requires `accountResourceId`. GET returns dates as `2026-02-27T00:00:00Z`; PUT requires `2026-02-27`. GET returns `taxProfile: { resourceId }` object; PUT requires `taxProfileResourceId` string. The CLI `draft finalize` command normalizes all of these automatically.
87. **Magic workflow status may be null immediately after creation** — The `POST /magic/workflows/search` endpoint may return a workflow with `status: null` right after `POST /magic/create-from-attachment`. Allow 2-3 seconds before polling, or default to `SUBMITTED`. The CLI `magic status` command defaults null status to `SUBMITTED`.
88. **Finalized invoices/bills need `accountResourceId` on all line items** — When `saveAsDraft: false` (or using `--finalize`), every `lineItems[i].accountResourceId` must be set. Omitting it causes 422: "lineItems[0].accountResourceId is required if [saveAsDraft] is false". The CLI validates this pre-flight.

#### DRY Extension Pattern

Bills, invoices, and credit notes share identical mandatory field specs. Adding `clio invoices draft` or `clio customer-credit-notes draft` later reuses all validation, formatting, and CLI flag logic from `draft-helpers.ts` — only the API calls differ.

### Bank Rules
89. **Bank rules GET by ID has double-nested response** — `GET /bank-rules/:id` returns `{ data: { data: [...], totalElements, totalPages } }` (double `data` wrapper). Unlike standard `GET /:type/:id` which returns `{ data: {...} }`. The inner `data` is an array containing the single rule. Unwrap with `response.data.data[0]`. **Field asymmetry**: Request uses `appliesToReconciliationAccount` (string UUID), response returns it as an object `{ code, currencyCode, name }`.
90. **Bank rules search uses `/bank-rules/search`** — Standard search pattern with filter/sort/limit/offset. Filter fields: `appliesToReconciliationAccount`, `name`, `reference`, `resourceId`, `actionType`, `businessTransactionType`. Sort fields: `resourceId`, `name`, `actionType`, `businessTransactionType`, `reference`, `appliesToReconciliationAccount`, `createdAt`.
90a. **Bank rules create field is `appliesToReconciliationAccount`** (NOT `appliesToReconciliationAccountResourceId`) — the bank account UUID. `configuration` must nest under `reconcileWithDirectCashEntry` key. `configuration.reconcileWithDirectCashEntry.reference` is REQUIRED (omitting causes GENERAL_ERROR). `amountAllocationType`: use `"PERCENTAGE"` or `"FIXED"` — `"FIXED_AND_PERCENTAGE"` is read-only (include both `fixedAllocation` + `percentageAllocation` arrays and the server infers it). Optional config fields: `contactResourceId`, `internalNotes`, `tags`, `currencySettings`, `taxCurrencySettings`, `classifierConfig` on allocation lines.
90b. **Bank rules PUT is FULL REPLACEMENT** — `PUT /bank-rules/:id` replaces the entire rule. Must send `resourceId`, `appliesToReconciliationAccount`, and full `configuration` every time. Omitting any required field causes GENERAL_ERROR. Use read-modify-write pattern: GET current rule, merge changes, PUT full payload. Same pattern as items PUT (Rule 72) and capsules PUT (Rule 73).

90c. **Bank rule POST canonical create payload** (verified live 2026-04, NOT obvious from any single field error):
```json
{
  "name": "My Rule",
  "appliesToReconciliationAccount": "<bank-account-uuid>",
  "configuration": {
    "reconcileWithDirectCashEntry": {
      "amountAllocationType": "PERCENTAGE",
      "reference": "AUTO-{{bankReference}}",
      "percentageAllocation": [
        { "organizationAccountResourceId": "<acct-uuid>", "amount": 100 }
      ]
    }
  }
}
```
**Required nested keys** (each missing one returns a different cryptic error):
- `configuration` MUST nest under `reconcileWithDirectCashEntry` key (the action type — even though there's only one type today)
- `amountAllocationType`: `"PERCENTAGE"` or `"FIXED"` only (NOT `FULL_AMOUNT` despite that sounding right)
- For `PERCENTAGE`: `percentageAllocation: [{organizationAccountResourceId, amount}]` (ARRAY of allocations summing to 100)
- For `FIXED`: `fixedAllocation: [{organizationAccountResourceId, amount}]` (ARRAY of fixed amounts)
- `reference` is **required** in the action config (omitting → cryptic 422)

**Dynamic strings**: `name` and `reference` support `{{bankReference}}`, `{{bankPayee}}`, `{{bankDescription}}` placeholders — replaced with bank record values during reconciliation.

**actionShortcutResourceId** for `apply_bank_rule` IS the rule's own `resourceId` from create response (no separate "action shortcut" entity).

### Fixed Assets
91. **Fixed asset search does NOT support `createdAt` sort** — Valid sort fields: `resourceId`, `name`, `purchaseDate`, `typeName`, `purchaseAmount`, `bookValueNetBookValueAmount`, `depreciationMethod`, `status`. Using `createdAt` returns 422. Default to `purchaseDate` DESC.
92. **Fixed asset disposal/sale/transfer use different endpoint patterns** — Discard: `POST /discard-fixed-assets/:id` (body includes `resourceId` + dates). Mark sold: `POST /mark-as-sold/fixed-assets` (body-only, no path param). Transfer: `POST /transfer-fixed-assets` (body-only). Undo: `POST /undo-disposal/fixed-assets/:id`.
92a. **Two ways to register fixed assets** — (1) **Create** (`POST /fixed-assets`): for assets purchased via a bill or journal already in the system. ACTIVE assets require `purchaseBusinessTransactionType` (`PURCHASE` or `JOURNAL_MANUAL`) and `purchaseBusinessTransactionResourceId`. (2) **Transfer** (`POST /transfer-fixed-assets`): for pre-existing assets purchased before using Jaz or outside the system. Accepts `bookValueAccumulatedDepreciationAmount` for depreciation already incurred. No linked transaction needed.
92b. **`saveAsDraft` defaults to `true`** — To create an ACTIVE fixed asset, pass `saveAsDraft: false` with ALL required fields: `name`, `category`, `typeCode`, `purchaseAmount`, `purchaseDate`, `purchaseAssetAccountResourceId`, `depreciationMethod`, `effectiveLife`, and for `STRAIGHT_LINE`: `depreciationStartDate`, `accumulatedDepreciationAccountResourceId`, `depreciationExpenseAccountResourceId`. Omitting any returns 422.
92c. **Valid enums** — `depreciationMethod`: `STRAIGHT_LINE`, `NO_DEPRECIATION`. `category`: `TANGIBLE`, `INTANGIBLE`. Optional string fields (`purchaseBusinessTransactionResourceId`, `accumulatedDepreciationAccountResourceId`, `capsuleResourceId`) can be safely omitted — the API ignores empty values.

### Subscriptions & Scheduled Transactions
93. **Subscription endpoints are under `/scheduled/subscriptions`** — List, GET, POST, PUT, DELETE all at `/api/v1/scheduled/subscriptions[/:id]`. Cancel is **PUT** (not POST) at `/api/v1/scheduled/cancel-subscriptions/:id` (different path pattern). **Subscriptions are invoices only** (SALE) — no bills. Different from scheduled invoices: subscriptions auto-prorate partial periods (generate credit notes for mid-period changes), but currency/tax/account are immutable after creation. Use scheduled invoices for fixed-amount recurring invoices where you need per-occurrence flexibility. **All subscription CRUD requires `proratedConfig: { proratedAdjustmentLineText: string }`** — Clio auto-injects this; do not add manually. **`repeat` is required on POST** (valid: `ONE_TIME`, `DAILY`, `WEEKLY`, `MONTHLY`, `YEARLY`) — Clio maps from the `interval` parameter. Cancel requires `cancelDateType` (`END_OF_CURRENT_PERIOD`, `END_OF_LAST_PERIOD`, `CUSTOM_DATE`) + `proratedAdjustmentLineText` + `resourceId` in body. Must cancel before delete. `businessTransactionType` is NOT in the OAS — the API ignores it.
94. **Scheduled transaction search does NOT support `createdAt` sort** — `POST /scheduled-transaction/search` sort fields: `startDate`, `nextScheduleDate`, etc. Default to `startDate` DESC. This is a cross-entity search across all scheduled types (invoices, bills, journals, subscriptions). Filter by `businessTransactionType` (SALE, PURCHASE, JOURNAL) and/or `schedulerType` (RECURRING, SUBSCRIPTION) to narrow results.

### Contact Groups
96. **Contact groups have `associatedContacts` array** — Each group contains `{ name, resourceId, associatedContacts: [{ name, resourceId }] }`. Search via `POST /contact-groups/search`. Known bug: PUT returns 500 (Rule 46).

### Inventory
97. **Inventory balance uses `GET /inventory-item-balance/:itemResourceId`** — Returns `{ itemResourceId, latestAverageCostAmount, baseQty, baseUnit }`. Note: this is the ITEM resourceId, not an inventory-specific ID. The `/inventory-balances/:status` endpoint returns 500 (Rule 46).

### Withholding Tax
98. **Withholding tax codes via `GET /withholding-tax-codes`** — Returns a flat array of 1,360+ entries (PH PSIC codes). Each entry: `{ code, description, taxRate, ... }`. No pagination — full list in one call. Use for PH/SG tax compliance.
99. **Duplicate detection fields** — API rejects duplicates with 422: Contacts on `name` (NOT `billingName`), Items on `itemCode`, Accounts on `name`, Tax Profiles on `name`. Agent tools auto-search before creating — if a match is found, the existing entity is returned instead of hitting a 422.

### Tax Profile Scoping
100. **Tax profiles have `appliesToSale`/`appliesToPurchase` scope** — A sales-only tax profile used on a bill causes 422. Always filter by transaction type when selecting: `search_tax_profiles` accepts `appliesTo` param (`sale`, `purchase`, `sale_credit_note`, `purchase_credit_note`). Invoices → `sale`, Bills → `purchase`.

### Cash Entry PUT Requirements
101. **Cash entry PUT requires `accountResourceId` + `resourceId`** — `PUT /cash-in-entries/:id` and `PUT /cash-out-entries/:id` require both `accountResourceId` (bank account) and `resourceId` in the body. Omitting `accountResourceId` causes 500. `accountEntryResourceId` is optional (auto-populated).

### Cash Entry Account Type
102. **Cash-in/out `accountResourceId` must be a Bank Accounts type** — Using expense, revenue, or other non-bank accounts causes 422 `CASH_OUT_ACCOUNT_TYPE_NOT_ALLOWED` (or equivalent for cash-in). Use `list_bank_accounts` or `search_accounts` with `accountType: "Bank Accounts"` to find valid accounts.

### Journals
103. **Journal entries must balance** — Sum of all DEBIT amounts must exactly equal sum of all CREDIT amounts. Unbalanced journals are rejected with 422. Agent tools pre-flight check this client-side before hitting the API.

### Transaction References
104. **Invoice/bill/CN references must be unique per org** — Creating a transaction with a `reference` that already exists causes 422 `Sale Reference already exists` (or `Purchase Reference`). Generate unique references with timestamps (e.g., `INV-20260309-1430`) when the user doesn't specify one.

### Currency Rates
105. **`add_currency_rate` for new rates, `update_currency_rate` only for editing existing records** — When a user says "update the rate" or "set the rate", use `add_currency_rate` (POST — creates a new rate entry for a date). Only use `update_currency_rate` (PUT) when explicitly modifying an existing rate record by its resourceId.
106. **Contact PUT uses `email` (string), not `emails` (array)** — GET returns `emails: [{email, label}]` (array) but PUT accepts `email: "user@example.com"` (string). Sending the `emails` array in PUT body causes 400 "Invalid request body". The CLI and tool executor handle this automatically via read-modify-write with the correct field.

### Quick Fix (Bulk Update)
107. **20 Quick Fix endpoints for bulk-updating transactions and line items** — `POST /api/v1/quick-fix/{entity}` with `{ resourceIds: [...], attributes: {...} }`. Only included fields are changed — omitted fields are left unchanged. Response: `{ updated: string[], failed: [{ resourceId, error, errorCode }] }`. **HTTP status codes**: 200 = complete success (`failed` always empty). **207 Multi-Status** = partial or total failure with per-item detail (same response shape as 200 — check `failed` array). 422 = total failure with no per-item breakdown (rare). On 207, retry only `failed` resourceIds. Entities: **ARAP**: invoices, bills, customer-credit-notes, supplier-credit-notes. **Accounting**: journals, cash-entries. **Schedulers**: sale-schedules, purchase-schedules, subscription-schedules, journal-schedules. **Line-item request patterns**: ARAP + accounting use `{ lineItemResourceIds, attributes }`. Schedulers (sale/purchase/subscription) use Pattern C: `{ schedulerUpdates: [{ schedulerResourceId, lineItemUpdates: [{ arrayIndex, ...attrs }] }] }`. **Journal-schedules use Pattern D**: `lineItemResourceId` (UUID) instead of `arrayIndex`. **Field gotchas**: cash entries use `currencySetting` (singular: `{ rateFunctionalToSource, exchangeToken }`), NOT `currencySettings`. Journal schedules have `startDate` in addition to `endDate`/`interval`. Tags: string array, max 50 items, max 50 chars each.

### Transfer Trial Balance
108. **Transfer Trial Balance** (`POST /api/v1/transfer-trial-balance`) creates opening balance entries. Uses `journalEntries` (NOT `lines` — this is a journal type). Always ACTIVE (no draft mode), reference auto-generated as "Transfer Trial Balance", minimum 1 entry, entries cannot have 0 amounts, skips lock date validation. **`valueDate` must be today or in the past** — future dates are rejected with "Opening data cannot be future date". Each entry: `{ accountResourceId, type: "DEBIT"|"CREDIT", amount }`.

### Scheduler Dynamic Strings
109. **Scheduler placeholder strings** — All scheduled transactions (invoices, bills, journals, subscriptions) support dynamic strings in any free text field (`reference`, line item `name`, `notes`). Strings are replaced with values relative to the **transaction date**: `{{Day}}` → day name (Monday), `{{Date}}` → full date (09 Mar 2026), `{{Date+X}}` → date + X days, `{{DateRange:X}}` → date range spanning X days (min 1, max 999), `{{Month}}` → month name (March), `{{Month+X}}` → month + X months, `{{MonthRange:X}}` → month range spanning X months, `{{Year}}` → year (2026), `{{Year+X}}` → year + X years. Example: `reference: "INV-{{Month}}-{{Year}}"` → `"INV-March-2026"` for a March transaction.

### Bank Rule Dynamic Strings
110. **Bank rule placeholder strings** — Bank reconciliation rules support dynamic strings in any free text field (`name`, `reference`, cash entry description). Strings are replaced with actual **bank record** values during reconciliation: `{{bankReference}}` → bank record reference (e.g., INV-03/01/2025-01), `{{bankPayee}}` → payer/payee name (e.g., Fruit Planet), `{{bankDescription}}` → transaction description (e.g., QR Payment). Example: `reference: "{{bankPayee}} - {{bankReference}}"`.

### Quick Fix Tag Field
111. **Quick-fix uses `tags` (string array) — e.g., `"tags": ["Q1"]`** — The `attributes` object in quick-fix transaction endpoints accepts `tags` as a string array (e.g., `"tags": ["Q1"]`). `tag` (singular) is silently ignored. This matches the `tags` array format used on create/update for all transaction types. The CLI `--tag` flag auto-wraps to `tags: [name]`.

### Sub-Resource Response Shapes
112. **Invoice/bill payment & credit sub-resources return raw arrays** — `GET /invoices/:id/payments` and `GET /bills/:id/payments` return `[{paymentRecord}, ...]` — NOT `{data: [...]}`. Same for `GET /invoices/:id/credits` and `GET /bills/:id/credits`. The CLI wraps these into `{data: [...]}` for consistency. `DELETE /invoices/:id/credits/:creditsAppliedResourceId` reverses a credit application.

### Nano-Classifier API
113. **Nano-classifier API gotchas** — CREATE uses `classes: string[]` (NOT `classNames` or `[{className}]`). `printable: boolean` is required — defaults to `false` (most classifiers are not printable). GET single is double-wrapped: `{data: {data: [...], totalElements, totalPages}}` — extract the first element from the inner paginated response. GET/LIST response returns classes as `[{className, resourceId}]` (objects), while CREATE accepts plain `string[]`.

### Scheduler Response Asymmetry
114. **Scheduler response uses `interval`, not `repeat`** — POST/PUT uses `repeat` field (values: `WEEKLY`, `MONTHLY`, `QUARTERLY`, `YEARLY`). GET response returns `interval` field (same values). PUT accepts the full transaction template (`invoice`, `bill`, or journal entries at top level), not just schedule metadata — same structure as POST.

### Payment Record CRUD
115. **Payment record CRUD** — `GET /payments/:resourceId` returns `{data: PaymentRecord}` (wrapped). Payment resourceIds come from invoice/bill GET response → `paymentRecords[].resourceId`. **Cashflow transaction IDs ≠ payment IDs** — don't mix them. `POST /cashflow-transactions/search` returns cashflow IDs, while payment CRUD uses separate payment IDs from the parent document.

116. **PaymentMethod accepts 11 values** — All payment endpoints (invoices, bills, credit note refunds, payment updates) accept: `CASH`, `BANK_TRANSFER`, `CREDIT_CARD`, `CHEQUE`, `E_WALLET`, `WITHHOLDING_TAX_CERTIFICATE`, `CLEARING_SETTLEMENT`, `DEBT_WRITE_OFF`, `INTER_COMPANY`, `OTHER`, `PAYMENT_GATEWAY`. Default is `BANK_TRANSFER`. The OAS previously listed only 7 — the API runtime already accepted all 11.
117. **Fixed asset sale accepts PURCHASE type** — `saleBusinessTransactionType` in mark-as-sold accepts `SALE`, `PURCHASE`, or `JOURNAL_MANUAL`. Use `PURCHASE` when the disposal is linked to a purchase-side transaction (e.g., trade-in).

### Bulk Upserts (transactions)

118. **8 bulk-upsert endpoints for transactions** — `POST /api/v1/{invoices,bills,customer-credit-notes,supplier-credit-notes,journals,fixed-assets}/bulk-upsert` plus line-item variants for invoices and bills (`/invoices/line-items/bulk-upsert`, `/bills/line-items/bulk-upsert`). Max **500 rows per call**. All async — return `{data: {jobId, subscriptionFBPath, status, totalRecords}}`. Poll `search_background_jobs` with `filter: {resourceId: {eq: jobId}}` until terminal status. **Natural keys**: invoices = `invoiceReference`, bills = `billReference`, credit notes = `creditNoteReference`, **journals = `journalReference` (NOT `reference` — asymmetric vs other entities)**, fixed assets = `reference`. **`currencyCode` is REQUIRED** on every transaction row (invoices, bills, CCN, SCN, journals) — missing it returns errorCode `IMPORT_CURRENCY_REQUIRED`. **Journals legs use `journalEntries[]`** (NOT `entries[]` — different from `journals create` which uses entries). Provide `resourceId` (UUID) to update by ID; otherwise the natural key drives upsert. `rowIndex` is optional caller-supplied for error reporting.

119. **PARTIAL_SUCCESS handling** — When `search_background_jobs` returns `PARTIAL_SUCCESS` for a bulk-upsert job, the per-row failures are in `data[0].errorDetails` on the SAME response (an array of per-row error objects). Top-level counts (`processedCount`, `failedCount`, `totalRecords`) tell you *how many* failed; `errorDetails` tells you *which rows and why*. Don't pretend the operation succeeded — surface the failed rows to the user. The rule of thumb: poll with `search_background_jobs` filtered by `resourceId: { eq: jobId }`, then read `data[0].errorDetails` for terminal states.

120. **`dateFormat` field was removed from bulk-upsert** — the API now requires ISO 8601 (`YYYY-MM-DD`) for ALL date fields on `POST /{invoices,bills,journals}/bulk-upsert`. Sending `dateFormat: "MM/DD/YYYY"` (or any other value) is silently ignored. Reject any datetime strings (anything with `T` or `:`) client-side before submitting.

121. **Intra-batch reference dedup is MERGE, not REJECT** — Two rows in the same bulk-upsert call sharing the same natural key (`invoiceReference`/`billReference`/etc.) are MERGED by the API (last row wins). If the user wants strict-uniqueness, dedup client-side first.

122. **Fixed asset bulk upsert — date fields are inconsistent** — the bulk-upsert REQUEST has TWO different date conventions: `valueDate` is `YYYY-MM-DD` (string); `depreciationStartDate` is **epoch milliseconds** (number). Sending YYYY-MM-DD for `depreciationStartDate` returns generic 400 "Invalid request body" with no detail. The GET RESPONSE uses `purchaseDate` (different field from request `valueDate`). Sending `purchaseDate` in the request → same generic 400. Other fields: `cost` and `purchaseAmount` are synonyms; `effectiveLife` and `usefulLifeMonths` are synonyms. Required: `reference`, `registrationType` ("NEW" | "TRANSFER"). Recommended: `typeCode` (e.g. `FURNITURE_AND_FIXTURE`), `typeName`, `category` ("TANGIBLE" | "INTANGIBLE"), `cost`/`purchaseAmount`, `valueDate` (YYYY-MM-DD), `effectiveLife`/`usefulLifeMonths`, `depreciationMethod` (`STRAIGHT_LINE` | `NO_DEPRECIATION`), `purchaseAssetAccountResourceId` (UUIDv4), `depreciationExpenseAccountResourceId` (UUIDv4), `accumulatedDepreciationAccountResourceId`. To set `depreciationStartDate`: pass epoch ms OR omit (defaults to valueDate).

### Reconciliation actions (write-side)

123. **11 reconciliation action endpoints under `/api/v1/reconciliations/*`** — these *commit* a reconciliation decision against a bank statement entry, distinct from `view_auto_reconciliation` (which queries `/search-magic-reconciliation` for *suggestions*):
    - **Async (jobId):** `quick_reconcile` (bulk match entries to journals, max 500), `apply_bank_rule` (bulk apply a rule to entries, max 500). Poll `search_background_jobs` filtered by `resourceId`; on `PARTIAL_SUCCESS` read `data[0].errorDetails` for per-row failures.
    - **Sync (single bank entry):** `reconcile_direct_cash_entry`, `reconcile_cash_journal`, `reconcile_manual_journal`, `reconcile_cash_transfer`, `reconcile_invoice_receipt`, `reconcile_bill_receipt`, `reconcile_with_payments` (match EXISTING — see Rule 158), `reconcile_learned_prediction`. Each returns `{bankStatementEntryResourceId, status, reference, valueDate}`.
    - **Sync bulk:** `reconcile_magic_match` (bulk-accept MAGIC_MATCH suggestions, max 500) returns `{reconciled[], failed[]}`.

124. **Recon prefill from the bank statement entry** — when caller omits `valueDate`, `dueDate`, payment `amount`, or direction (cash-in vs cash-out), the API fills these from the bank entry. Best-effort: a missing entry lookup logs a warning and forwards the payload as-is. Caller can always override by passing the field explicitly.

125. **The 6 sync recon endpoints are NOT idempotent** — calling twice on the same `bankStatementEntryResourceId` creates duplicate journals. Before retrying, confirm the entry's reconciled state via `view_auto_reconciliation` or `search_bank_records` filtered by `status`. Concurrent calls on the same entry race — last-write-wins.

126. **Sync recon → AR/AP via `invoice_receipt` / `bill_receipt`** — these endpoints CREATE a transaction (invoice for AR, bill for AP) and immediately reconcile it to the bank entry. The two endpoints stay separate (not unified) because the invoice side carries `billTo` / `billFrom` that bills don't have. Cash-in vs cash-out, by contrast, IS unified into `reconcile_direct_cash_entry` — direction is encoded in the bank entry sign.

127. **Cash transfer `amount` is conditional** — for `reconcile_cash_transfer`, `amount` is required only when the counterparty account is in a non-functional currency. Same-currency transfers omit it; the API derives the amount from the bank entry.

### Drafts lifecycle (server-side, BULK-friendly)

128. **3 BULK-action server-side draft lifecycle endpoints under `/api/v1/drafts/*`** — distinct from the local-only `src/core/drafts/` payload helpers. All three accept a single mixed-type batch (max 500 items per call); there are NO per-entity variants. ONE call covers any combination of invoices, bills, customer credit notes, and supplier credit notes.
    - `POST /api/v1/drafts/validate` (sync) → `validate_drafts`. Returns per-item validation errors + display data inline. No state change. Use to pre-flight before convert/submit.
    - `POST /api/v1/drafts/convert-to-active` (async, jobId) → `convert_drafts_to_active`. Promotes drafts to ACTIVE. Poll `search_background_jobs` filtered by `resourceId`; on PARTIAL_SUCCESS read `data[0].errorDetails`.
    - `POST /api/v1/drafts/submit-for-approval` (async, jobId) → `submit_drafts_for_approval`. Routes drafts into the approval workflow.

129. **Drafts lifecycle request shape (mix-friendly)** — all 3 endpoints accept the same body: `{ items: [{btResourceId, btType}] }` with `btType ∈ {SALE | PURCHASE | SALE_CREDIT_NOTE | PURCHASE_CREDIT_NOTE}`. **Max 500 items per call. ONE batch can mix any combination of types** — no need to group by btType client-side, no need to make multiple calls per entity type. **Mapping**: `SALE` → invoice, `PURCHASE` → bill, `SALE_CREDIT_NOTE` → customer credit note, `PURCHASE_CREDIT_NOTE` → supplier credit note. Journals are NOT in the enum (they have their own approval flow).

130. **Drafts lifecycle is NOT idempotent** — a second `convert_drafts_to_active` on already-ACTIVE drafts returns 422; a second `submit_drafts_for_approval` on drafts with an in-flight approval returns 422. Filter the draft list by `status: DRAFT` before submitting (the entity-specific search tools — `search_invoices`, `search_bills`, etc. — accept `status` filters). `validate_drafts` IS safe to call repeatedly (read-only, no state change).

131. **Drafts must be COMPLETE before convert/submit** — `convert_drafts_to_active` and `submit_drafts_for_approval` reject INCOMPLETE drafts (drafts missing required fields like `accountResourceId` on every line item, contactResourceId, etc.) with 422. The `bills draft list` / `invoices draft list` etc. commands return per-draft `ready: bool` + `missingCount` + `missingFields[]` — call `validate_drafts` first to surface missing fields per row, fix client-side, then convert/submit.

132. **Manual-journal recon: caller provides ONLY the offset side(s)** — `reconcile_manual_journal` AUTO-ADDS the bank-side leg from the bank statement entry. If the caller sends both debit AND credit legs covering the bank side, the API doubles-up after auto-add → 422 "sum of debit and credit amounts are not equal in a journal". Send only the offset journal entries (the non-bank side); the API balances them against the bank entry.

133. **`reconcile_invoice_receipt` and `reconcile_bill_receipt` gate on `paymentDirection`, not BSE entry type** — error code `INVALID_BUSINESS_TRANSACTION_TYPE_ERROR` ("Invalid business transaction type", 422) is misleadingly named. The actual gate is the BSE's `paymentDirection`. **`invoice_receipt` requires `PAYIN`** (AR — money in — positive amount in `bank add-records`, producing `credit_amount > 0`). **`bill_receipt` requires `PAYOUT`** (AP — money out — NEGATIVE amount, producing `debit_amount > 0`). `bank add-records` produces both directions based on amount sign. Statement-imported BSEs (`bank import`) also work — direction is set from the CSV. No need for the async magic-OCR `bank import` path; sync `bank add-records` with the correct sign is sufficient.

134. **Bulk-upsert FLAT vs NESTED variants** — for invoices and bills, there are TWO bulk-upsert endpoints. **FLAT** (`bulk_upsert_invoices` / `bulk_upsert_bills`) — one line per row, set at row level via `itemDescription` + `totalAmount` + `invoiceAccountResourceId` (or `billAccountResourceId`). **NESTED** (`bulk_upsert_invoice_line_items` / `bulk_upsert_bill_line_items`) — multi-line per row via nested `lineItems[]`, each with `itemDescription` + `quantity` + `unitPrice` + `accountResourceId`. Use FLAT when one line per transaction is fine (CSV import, simple bills); use NESTED when each transaction needs multiple lines. Sending `lineItems[]` to the FLAT endpoint silently ignores them and creates a $0 invoice.

135. **Reconciliation `lineItems[]` use a DIFFERENT field naming convention** — for `reconcile_invoice_receipt.invoiceDetails.lineItems[]` and `reconcile_bill_receipt.billDetails.lineItems[]`, each line uses `name` (NOT `itemDescription`) for the description and `organizationAccountResourceId` (NOT `accountResourceId`) for the revenue/expense account. The bulk-upsert-line-items variants use `itemDescription` + `accountResourceId`. Memorize this: bulk = `itemDescription`+`accountResourceId`; recon-create = `name`+`organizationAccountResourceId`.

136. **Sync bulk-upsert response carries per-row failures** — `bulk_upsert_currency_rates` and `bulk_upsert_chart_of_accounts` return `{ resourceIds: string[], failedRows: ImportedRowError[], failedCount: number }` synchronously (no jobId polling needed). Each `failedRows` entry: `{ rowIndex, columnName, columnValue, errorCode, errorMessage }`. Empty `failedRows: []` + `failedCount: 0` on full success. For `bulk_upsert_currency_rates` specifically: omitting `rateApplicableTo` defaults it to `rateApplicableFrom - 0.999ms` (prevents temporal gaps in rate lookups). Contrast with async bulk-upserts (contacts, invoices, journals, etc.) which return `{ jobId }` and need `search_background_jobs` polling — there, per-row failures live in the job's `errorDetails` field instead.

137. **`bulk_upsert_contacts` request-level validation** — fails the WHOLE batch with HTTP 422 (no per-row partial success at this layer). Five rules to satisfy before submitting: (a) every contact must have `customer: true` OR `supplier: true` after defaults+backfill — for updates, the API backfills omitted flags from the existing contact; for creates, you must explicitly set at least one. (b) `emailList[]` entries within a contact must be case-insensitively unique. (c) `customerPaymentTerms.value` and `supplierPaymentTerms.value` must be positive integers when `name` != "CUSTOM". (d) `name` must be unique within the batch (after whitespace+case normalize). (e) When `billingAddress` or `shippingAddress` is provided, its `addressLine1` is required. Pre-validate client-side before calling; one bad row rejects the entire batch and the agent loses any successful work-in-progress.

138. **`get_contact_signals` — read-only contact-history pattern lookup** — `GET /api/v1/contacts/{resourceId}/signals?btType=…` returns the contact's modal patterns (currency, payment-terms, tax-inclusion/presence, top-COA, top-item), cadence (median interval days, days-since-last, interval ratio), and outstanding-balance snapshot for one (contact × business-transaction-type) pair. `btType` is required: `SALE` | `PURCHASE` | `SALE_CREDIT_NOTE` | `PURCHASE_CREDIT_NOTE`. Returns null `data` when sampleSize < 5 or the freshness layer is unavailable. Cache key is per-(contactId, btType) pair, so repeated calls for the same pair are cheap. **Three slices are always empty/null on this endpoint** — `severitySummary`, `outlierFlags`, `revealedDivergences` — because they require a draft to compare against; those populate only on the per-result `contactSignals` object inside `validate_drafts` responses. Use this tool for "what does this contact normally look like?" questions before drafting; use `validate_drafts` for "how does this draft compare to the contact's history?" questions after drafting.

139. **`validate_drafts` per-result enrichment (MID7)** — every entry in `results[]` now carries two extra slices alongside the existing `eligible` / `errors[]` / `displayData[]`: (a) **`contactSignals`** — full Mid-7 insight (cadence, outliers, severity, divergences, outstanding balance) computed against the draft's contact history. Null when the draft has no contact, the draft is ineligible, or the contact has no qualifying history in the 12-month window. Same shape as `get_contact_signals` but populated WITH the always-empty-on-GET slices (severitySummary, outlierFlags, revealedDivergences) — those compare the draft against the contact's modal pattern. (b) **`breakdown`** — full Balance-panel payload (`items[]` + `meta` with subtotal / tax / total / paymentRecorded / balance / exchangeRate). Use breakdown to surface the trx-level metadata an agent needs for "show me what this draft looks like" questions without a separate `get_invoice` / `get_bill` call. Top-level: `eligibleCount`, `ineligibleCount`, `columns` / `errorColumns` (table render hints), and `contactSignalsMeta.unavailable=true` when the freshness layer was offline for the whole batch (per-result `contactSignals` will all be null). Wire response uses legacy field names `contactInsight` (per-result) and `contactInsightsMeta` (top-level); motherboard's API client renames both to `contactSignals` / `contactSignalsMeta` for consistency with `get_contact_signals`.

140. **IFRS 18 accountType values (effective 2027)** — `create_account` / `update_account` / `bulk_upsert_chart_of_accounts` accept the 9 IFRS 18 classification types alongside the classic 12: **Discontinued Expense**, **Discontinued Income**, **Finance Cost**, **Financing Income**, **Goodwill**, **Income Tax Expense**, **Investing Expense**, **Investing Income**, **Investment**. `normalizeAccountType` (in `core/api/guards.ts`) maps unambiguous variants client-side: "income tax" / "tax expense" → "Income Tax Expense", "finance costs" → "Finance Cost", "investments" → "Investment". **Ambiguous variants are intentionally NOT auto-mapped** — under IFRS 18, "interest expense" can land in EITHER Finance Cost (financing activities) OR Operating / Investing Expense depending on the entity's main business activity, and "interest income" can land in EITHER Financing Income OR Investing Income. The agent must pick the explicit canonical string for those cases instead of relying on a guess that could misclassify the account. Pass any value to `accountType` (POST/PUT will receive it as `classificationType` per rule 21). The classic types still work — IFRS 18 is purely additive.

141. **`bulk_upsert_chart_of_accounts` — sync bulk-upsert with PARTIAL_SUCCESS** — wraps `POST /api/v1/chart-of-accounts/bulk-upsert` (max 500 per call). Returns synchronously (no jobId polling): `{ resourceIds: string[], failedRows: ImportedRowError[], failedCount: number }` per rule 136. Each successful row contributes one `resourceId`; each failure surfaces a `failedRows[]` entry with `rowIndex` (1-based per the API), `columnName`, `columnValue`, `errorCode`, `errorMessage`. **Dedup is by NAME, not code** — collisions emit `ORGANIZATION_CHART_OF_ACCOUNT_DUPLICATED` per row (other rows in the batch still succeed). Provide `resourceId` per account to update; omit to create. Accepts the classic 12 + 9 IFRS 18 `accountType` values per rule 140 (variants normalized client-side). For one-off creates with auto-dedup-on-name (returns existing if found), use `create_account` instead. CLI counterpart: `clio accounts bulk-upsert --input <file.json>`.

142. **`capsuleRecipe` payload is mutually exclusive with `capsuleResourceId`** on trigger mutations (create/update of invoice, bill, journal, cash_in, cash_out). Use `capsuleRecipe` to CREATE a new capsule via the recipe engine; use `capsuleResourceId` to ATTACH a base-trx to an existing capsule. Sending both returns 422 (`excluded_with` validator).

143. **Capsule recipe publish is best-effort post-commit — silent-null failure mode.** On success the trigger-mutation response carries `capsuleRecipeJob: { jobResourceId, capsuleResourceId, subscriptionFBPath, totalRecords, idempotentHit, recipeKey }` (verified live 2026-05-27). **Note `jobResourceId` (NOT `resourceId`)** on the trigger-mutation payload — this is the polling key. **On publish failure, `capsuleRecipeJob` is absent (or null) from the response, the trigger mutation STILL returns 201, the base-trx is committed, and NO error reason is surfaced to the caller.** The response echoes `capsuleRecipe.{recipeName, inputs}` back unchanged, which can look like success at a glance. **Three known causes** of silent null `capsuleRecipeJob` (must pre-validate before sending):
  - **(a) Wrong `recipeName` for the base trx type** — every recipe is locked to `allowedBaseTransactionTypes` (e.g. PREPAID_AMORTIZATION = PURCHASE only; DEFERRED_REVENUE = SALE only; ACCRUAL_REVERSAL, IFRS16_LEASE = JOURNAL_MANUAL only; LOAN_AMORTIZATION = JOURNAL_DIRECT_CASH_IN or JOURNAL_MANUAL). On `preview_capsule_recipe`, mismatch surfaces as 422 `RECIPE_INVALID_BASE_TRANSACTION_TYPE`. **On the trigger mutation, it silently nulls the job** — the validation happens post-commit in customer-service and arap catches the exception. Always check `get_capsule_recipe(name).allowedBaseTransactionTypes` matches the trigger mutation you're calling.
  - **(b) Currency mismatch** — see Rule 156 (single-currency v1 recipes — recipe `currency`, every `*AccountResourceId` account's `currencyCode`, and the base trx currency MUST all match). Mismatch surfaces as 422 `ERR_RECIPE_ACCOUNT_CURRENCY_MISMATCH` on `preview_capsule_recipe` but silently nulls on the trigger mutation.
  - **(c) Wrong `x-accountClass` on an input field** — see Rule 157 (each `*AccountResourceId` slot has a required account class). Mismatch silently nulls; preview returns the matching `RECIPE_FIELDS_*` 422.
  
  **Diagnosis sequence when the response has null/absent `capsuleRecipeJob`:**
  1. **Re-run `preview_capsule_recipe`** with the same `recipeName` + `inputs` (without a base trx). This is the canonical pre-flight: it returns the exact 422 reason — `ERR_RECIPE_ACCOUNT_CURRENCY_MISMATCH`, `RECIPE_INVALID_BASE_TRANSACTION_TYPE`, `RECIPE_FIELDS_MUST_DIFFER`, etc. Most reliable diagnostic — fix the input and retry the trigger.
  2. **Poll `search_background_jobs --filter '{"baseTransactionResourceId":{"eq":"<id>"}}'`** — if a `FAILED` job exists, its `errorDetails` has the publish failure reason. **If no job exists for the base-trx, the publish never queued** (validation rejected pre-queue in customer-service).
  3. **`resume_capsule_recipe(capsuleResourceId)`** is only available if a capsule WAS created — i.e. the recipe partially ran. For pre-queue rejections (3 causes above), no capsule exists; the only recovery is to re-issue the trigger mutation with corrected inputs.
  
  Pre-flight gate (recommended for agents and integrations): always call `preview_capsule_recipe(recipeName, inputs)` before the trigger mutation. Preview is pure-compute (no side effects) and surfaces every input/account/currency problem with a clear error_type — eliminates the silent-null class entirely. **Same gate covers `templateOverrides`** (Customize Recipe): pass `capsuleRecipe.templateOverrides: [{slotKey, template}]` to customize generated text (capsule title/description, leg labels, line memos, schedule reference). Valid slotKeys + `{{variables}}` come from `get_capsule_recipe → versions[].templateSlots[]`; `slotKey` ≤128 chars (no dups), `template` ≤2000 (empty string clears a nullable slot). Invalid overrides return 422 `ERR_RECIPE_OVERRIDE_*` (UNKNOWN_RECIPE / MISSING_SLOT_KEY / DUPLICATE_SLOT / UNKNOWN_SLOT / NON_NULLABLE_BLANK / TEMPLATE_TOO_LONG / UNKNOWN_VARIABLE) on preview but silently null on the trigger path — so preview first.

144. **`recipeName` IS enum-constrained at the API layer** (verified live 2026-05-27): closed enum `LOAN_AMORTIZATION | ACCRUAL_REVERSAL | PREPAID_AMORTIZATION | DEFERRED_REVENUE | IFRS16_LEASE` on `POST /capsule-recipes/preview` and on `capsuleRecipe.recipeName` payloads on trigger mutations. Send a string not in the set → 422 validation_error. Don't hard-code the 5 values in motherboard descriptions — discover via `list_capsule_recipes` (the source of truth) and pass the discovered name through.

145. **Pseudo-SQL `truncated:true` does NOT mean "you hit the cap"** — it means "more rows matched than were returned in this preview". Inspect `rowCount` vs preview cap (100) or your LIMIT to interpret. If you need every row, switch to `export_pseudo_sql`.

146. **Pseudo-SQL export `downloadUrl` is S3 pre-signed with ~15min expiry** (`X-Amz-Expires=900`). Fetch immediately; don't store the URL. If a fetch returns 403 (expired), call `get_pseudo_sql_export(jobId)` again for a fresh URL.

147. **Cashflow report** (`download_export(exportType='cashflow')`) returns the org's CASHFLOW template (IAS 7). If no template configured, returns 404 `template_not_found`. Configure via Jaz settings before invoking.

148. **`resume_capsule_recipe` after `terminalReason=BLOCKED_AFTER_3_RESUME_ATTEMPTS` is unavailable.** Only path forward is `rollback_capsule_recipe(capsuleResourceId)` or manual cleanup via Jaz admin. Resume is NOT idempotent — each call counts toward the 3-attempt limit.

149. **`rollback_capsule_recipe` returning `status=PARTIAL_ROLLBACK`** with `blockedAtomResourceIds[]` is safe to retry (rollback is idempotent on already-deleted atoms). Persistent partial-rollback typically indicates an atom is referenced downstream; escalate to ops if retry doesn't resolve.

150. **`preview_capsule_recipe` returns 422 `RECIPE_INVALID_BASE_TRANSACTION_TYPE`** when the recipe's `allowedBaseTransactionTypes` doesn't include the supplied base trx type (see descriptor at `get_capsule_recipe`). **The trigger mutation does NOT surface this 422 to the caller** — it silently nulls `capsuleRecipeJob` on the response (see Rule 143). The allowed types are: PREPAID_AMORTIZATION → PURCHASE only; DEFERRED_REVENUE → SALE only; ACCRUAL_REVERSAL → JOURNAL_MANUAL only; IFRS16_LEASE → JOURNAL_MANUAL only; LOAN_AMORTIZATION → JOURNAL_DIRECT_CASH_IN or JOURNAL_MANUAL. Always check `get_capsule_recipe(name).allowedBaseTransactionTypes` before sending `capsuleRecipe` on any trigger mutation.

151. **Sending BOTH `capsuleRecipe` AND `capsuleResourceId`** on the same trigger mutation returns 422 (`excluded_with` validator — same lock as Rule 142). Pick one based on intent.

152. **`saveAsDraft: true` + `capsuleRecipe` payload** — recipe is stashed in the draft's `pending_capsule_recipe` JSONB column and fires on draft activation (not on draft create). The base-trx commits as DRAFT immediately; the recipe job is created later when the draft is activated via `convert_drafts_to_active`.

153. **Pseudo-SQL `Idempotency-Key` dedup is server-side primary key** — same key + DIFFERENT query body returns the prior job's result (the server does NOT cross-check the new query body). For agent reliability, `run_pseudo_sql_and_download` auto-keys from `sha256(query).slice(0,16)` so dedup is query-tied automatically. If you call `export_pseudo_sql` directly with a manual key, treat it as a per-intent token — don't reuse across different queries.

154. **`rollback_capsule_recipe` on a non-recipe capsule** (a capsule created by the legacy `create_capsule` tool or imported, not by the recipe engine) returns 422 `RECIPE_ROLLBACK_JOB_NOT_FOUND` ("No CAPSULE_RECIPE job found for capsule X in organization Y — nothing to roll back"). Rollback only works on capsules whose lifecycle was managed by the recipe engine. For legacy capsules, use `delete_capsule` instead.

155. **Pseudo-SQL schema is canonical — call `get_pseudo_sql_schema` before any query.** The response returns the live curated catalog (tables / columns / joins / functions) PLUS the canonical `jaz-pseudo-sql.md` skill body in `agentSkillsDoc.content`. Drop the `.md` body into context as the syntax-rules source; treat `tables[] / joins[] / functions[]` as the column-list source. **Cache contract:** the `version` field is a stable 16-char hex hash; within a session, cache by version and don't re-call unless you have reason to believe the schema changed (e.g. a fresh backend deploy mid-session). Don't re-fetch on a wall-clock timer (upstream is `private, no-cache, must-revalidate`). A static curated-schema snapshot used to ship with the `jaz-pseudo-sql` skill before v5.6.0; it was dropped because it was structurally guaranteed to drift. Never write a query from a memorized column list.

156. **v1 capsule recipes are single-currency — `ERR_RECIPE_ACCOUNT_CURRENCY_MISMATCH`.** The recipe `currency` field, every `*AccountResourceId` account's `currencyCode`, and the base transaction's `currencyCode` ALL MUST match. Preview returns 422 `ERR_RECIPE_ACCOUNT_CURRENCY_MISMATCH` with a concrete message (e.g. "account X is denominated in USD but the recipe currency is SGD"). **Trigger mutation silently nulls `capsuleRecipeJob`** (Rule 143). Practical recipe: never hardcode `currency`; derive from `get_account(prepaidAssetAccountResourceId).currencyCode` (or the base trx currency) and use the same value as the recipe input. The recipe descriptor's `currency.x-baseTrxBinding: "strict"` field marks this — when present, the value is bound to (and must equal) `trx.currencyCode` post-commit. Caught by smoke runs since v5.5.0 — tests 65/66 hardcoded `SGD` and silently nulled against a USD fire-test org for 20+ hours.

157. **Recipe input `*AccountResourceId` fields are account-class-locked — `x-accountClass` in inputSchema is authoritative.** Each `*AccountResourceId` slot on a recipe's input schema carries an `x-accountClass` constraint (`"Asset"`, `"Liability"`, `"Expense"`, `"Revenue"`, `"Equity"`). Passing an account whose class doesn't match the slot's `x-accountClass` is rejected post-commit and silently nulls `capsuleRecipeJob` (Rule 143). Schema location: `get_capsule_recipe(name).data.versions[0].inputSchema.properties.<fieldName>['x-accountClass']` — **note `versions[0].inputSchema`, NOT `inputSchema` at the top level**. Examples: PREPAID_AMORTIZATION needs `prepaidAssetAccountResourceId: Asset` + `expenseAccountResourceId: Expense`; DEFERRED_REVENUE needs `deferredRevenueAccountResourceId: Liability` + `revenueAccountResourceId: Revenue`; ACCRUAL_REVERSAL needs `expenseAccountResourceId: Expense` + `accruedLiabilityAccountResourceId: Liability`. Always pre-validate via `get_account(resourceId).accountClass` against the slot constraint, or just call `preview_capsule_recipe(recipeName, inputs)` to surface every class violation as a clean 422.

## Supporting Files

For detailed reference, read these files in this skill directory:

- **[references/search-syntax.md](./references/search-syntax.md)** — Full Jaz search query syntax: amounts, dates, abs, blanks, wildcards, regex, entity field lists, aliases, examples (auto-synced from dashboard repo)
- **[references/search-reference.md](./references/search-reference.md)** — API search/filter/sort reference for all 28 endpoints — per-endpoint filter fields, sort fields, operator types
- **[references/endpoints.md](./references/endpoints.md)** — Full API endpoint reference with request/response examples
- **[references/errors.md](./references/errors.md)** — Complete error catalog: every error, cause, and fix
- **[references/field-map.md](./references/field-map.md)** — Complete field name mapping (what you'd guess vs actual), date format matrix, middleware aliases
- **[references/dependencies.md](./references/dependencies.md)** — Resource creation dependencies and required order
- **[references/full-api-surface.md](./references/full-api-surface.md)** — Complete endpoint catalog (80+ endpoints), enums, search filters, limits
- **[references/feature-glossary.md](./references/feature-glossary.md)** — Business context per feature — what each feature does and why, extracted from [help.jaz.ai](https://help.jaz.ai)
- **[help-center-mirror/](./help-center-mirror/)** — Full help center content split by section (auto-generated from [help.jaz.ai](https://help.jaz.ai))

## Help Center Knowledge Base (`clio help-center` / `clio hc`)

For product questions (how-to, feature behavior, troubleshooting), use `clio help-center` instead of reading raw help-center-mirror files:

```bash
clio help-center "how to apply credit note"              # search help center
clio help-center "bank recon" --limit 3                  # limit results
clio help-center "scheduled invoices" --section invoices # filter by section
```

Supports `--json` for structured output. 186 articles across 20 sections. Automatically uses hybrid search (embeddings + keyword) when available, falls back to keyword + synonym expansion offline.

**When to use `clio help-center` vs reading raw files:**
- Use `clio help-center` when you need specific answers (returns only relevant articles, saves context)
- Read `help-center-mirror/*.md` directly only when you need to scan an entire section comprehensively

## Dashboard Deep Links (navigation tools)

When the user wants to OPEN, SEE, or SHARE something in the Jaz dashboard ("open this invoice", "take me to the P&L"), hand them a real URL via two agent (MCP) tools — deliberately no CLI command: `find_dashboard_destinations` discovers the destination key (filter by `query`/`resource`/`kind`; keys are named by product area, not task wording — on zero matches retry broader: "billing", not "card"), and `get_dashboard_url` turns a key into `{ url, kind, label }`. Screens are dotted route paths (`reports.profit-and-loss`); record modals are `<resource>.modal.<type>` (`sales.modal.view-sale`). Record-specific modals (view/edit/duplicate one record) REQUIRE `resourceId` — the same Jaz resourceId from the search/get that found the record; screens and create/"new" modals take none (a resourceId on a screen is rejected). NEVER write a dashboard URL by hand and NEVER guess a destination key — routes are not guessable, and a wrong link is worse than no link; if `get_dashboard_url` errors, follow its hint (near-matches + discovery pointer) and say the link could not be built rather than improvising one. The org query param is appended automatically when the surface knows the acting org; API-key surfaces open in the user's current org on the app.jaz.ai host. Examples: "open invoice INV-042" → `search_invoices` → `get_dashboard_url("sales.modal.view-sale", resourceId)`; "take me to the P&L" → `get_dashboard_url("reports.profit-and-loss")`; "where do I manage users?" → `find_dashboard_destinations("user")` → `get_dashboard_url("settings.modal.user_management")`.

## Recommended Client Patterns

- **Starting from an attachment?** → Use Jaz Magic (`POST /magic/createBusinessTransactionFromAttachment`). Never manually parse a PDF/JPG to construct `POST /invoices` or `POST /bills` — let the extraction & autofill pipeline handle it.
- **Starting from structured data?** → Use `POST /invoices` or `POST /bills` directly with the known field values.
- **Serialization (Python)**: `model_dump(mode="json", by_alias=True, exclude_unset=True, exclude_none=True)`
- **Field names**: All request bodies use camelCase
- **Date serialization**: Python `date` type → `YYYY-MM-DD` strings
- **Bill payments**: Embed in bill creation body (safest). Standalone `POST /bills/{id}/payments` also works.
- **Bank records**: Create via JSON `POST /bank-records/:id` or multipart `POST /magic/importBankStatementFromAttachment`. Search via `POST /bank-records/:id/search` with filters (valueDate, status, description, extContactName, netAmount, extReference).
- **Scheduled invoices/bills**: Wrap as `{ status, startDate, endDate, repeat, invoice/bill: { reference, valueDate, dueDate, contactResourceId, lineItems, saveAsDraft: false } }`. `reference` is required.
- **Scheduled journals**: Flat: `{ status, startDate, endDate, repeat, valueDate, schedulerEntries, reference }`. `valueDate` is required.
- **FX currency (invoices, bills, credit notes, AND journals)**: `currency: { sourceCurrency: "USD" }` (auto-fetches platform rate) or `currency: { sourceCurrency: "USD", exchangeRate: 1.35 }` (custom rate). Same object form on all transaction types. **Never use `currencyCode` string** — silently ignored.

158. **Match-to-EXISTING reconciliation — `reconcile_with_payments` / `reconcile_magic_match` / `reconcile_learned_prediction`.** These reconcile a bank entry against transactions/payments the org ALREADY has, vs `invoice_receipt`/`bill_receipt` which CREATE new ones. Prefer match-to-existing to avoid duplicates.
    - **`reconcile_with_payments`** — the headline. `businessTransactionPayments[]` each carry an open bill/invoice's `cashflowTransactionResourceId` (from `search_cashflow_transactions` or a suggestion's `cftBtResourceId`) + `transactionAmount`; the endpoint CREATES the payment AND reconciles in one call — **no `pay_bill`/`pay_invoice` first.** Also accepts `matchedPayments[]` (existing payments) / `matchedBatchPayments[]` / `adjustment` (over/under-payment + FX write-off). Guard: ≥1 match array non-empty. **FX is auto-resolved server-side — pass NO `currencySettings`/rate for the common case.** Only the rare bill-currency ≠ bank-currency case needs explicit `paymentAmount` (bank ccy) + `currencySettings`. FX gain/loss is NOT auto-posted — post it via `adjustment.cashAdjustmentEntries[]` to an FX account. Errors: `PAYMENT_AMOUNT_REQUIRED_IN_BUSINESS_TRANSACTION_SOURCE_CURRENCY` (cross-ccy missing paymentAmount), `INVALID_EXCHANGE_RATE_ERROR` (adjustment leg in non-functional ccy missing rate), `TOTAL_RECONCILIATION_AMOUNT_MISMATCHED_WITH_STATEMENT_ENTRY_AMOUNT` (sum ≠ entry → add adjustment leg). **NOT idempotent, no client key — a blind retry double-creates a payment; re-check `search_bank_records(status:'RECONCILED')` before retry.**
    - **`reconcile_magic_match`** — bulk-accept MAGIC_MATCH suggestions (max 500 entries). Returns `{reconciled[], failed[]}` — a 200 with non-empty `failed[]` is a PARTIAL success (per-entry `errorCode`); loop on failed only. Entry-level idempotency-keyed server-side (re-submit returns done entries in `reconciled[]`).
    - **`reconcile_learned_prediction`** — accept an ML prediction. `predictedPayload` + `predictedPayloadSchemaVersion` come VERBATIM from a `view_auto_reconciliation` (MAGIC_RECONCILE_WITH_CASH_IN_OUT) suggestion — never hand-construct. `retryToken` forces a fresh journal on edit-retry; omit for idempotent replay. On failure (stale payload), fall back to `reconcile_with_payments` — don't retry the blob.

159. **`view_auto_reconciliation` returns execution-ready `suggestions[]` — the suggestion→commit seam.** Each suggestion carries `recommendedTool` (the commit tool to call), `execute` (ready-to-pass args — merge `bankAccountResourceId` for `reconcile_magic_match`), `confidenceTier` (high/medium/low, code-derived), and `autoCommitEligible` (true ⇒ high confidence + executable plan + under any `autoCommitMaxAmount` cap). **Decision gate:** `autoCommitEligible===true` → auto-commit via `recommendedTool`+`execute`; everything else → surface for confirmation. **Amount threshold is a HARD VETO over confidence** (pass `autoCommitMaxAmount`). Field mapping under the hood: `cftBtResourceId`→`cashflowTransactionResourceId` (single → `reconcile_with_payments`), `cftBtResourceIds[]`/`isBatch`→`matchedBusinessTransactions` (batch → `reconcile_magic_match`), `recommendationType`→tool, `confidenceScore`→tier. Pass `includeRaw:true` for the unmapped payload. On 500 (high-volume OOM) it returns `{degraded:true}` — scope by period or use the `clio jobs bank-recon match` cascade. NOT idempotent applies to every commit — see Rules 125 + 158.

## See Also

- **jaz-recipes** — 16 IFRS-compliant transaction recipes with journal entries, capsules, and calculators
- **jaz-jobs** — 12 accounting job playbooks (month-end close, bank recon, GST/VAT filing, etc.)
- **jaz-conversion** — Data migration workflows from Xero, QuickBooks, Sage, MYOB, and Excel
- **jaz-cli** — CLI command reference, auth, output formats, pagination, and workflow patterns
