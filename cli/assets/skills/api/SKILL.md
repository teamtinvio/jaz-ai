---
name: jaz-api
version: 4.36.0
description: >-
  Use this skill whenever you call, debug, or review code that touches the Jaz
  REST API. Covers field names, response shapes, 117 production gotchas, error
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
21. **CoA POST uses `classificationType`** — GET returns `accountType`. Same values.
22. **CoA code mapping: match by NAME, not code** — pre-existing accounts may have different codes. Resource IDs are the universal identifier.

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
38. **All list/search endpoints use `limit`/`offset` pagination** — NOT `page`/`size`. Default limit=100, offset=0. Max limit=1000, max offset=65536. `page`/`size` params are silently ignored. Response shape: `{ totalPages, totalElements, truncated, data: [...] }`. When `truncated: true`, a `_meta: { fetchedRows, maxRows }` field explains why (offset cap or `--max-rows` soft cap — default 10,000). Use `--max-rows <n>` to override. Always check `truncated` before assuming the full dataset was returned.

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
50. **Search endpoint universal pattern** — All 28 `POST /*/search` endpoints share identical structure: `{ filter?, sort: { sortBy: ["field"], order: "ASC"|"DESC" }, limit: 1-1000, offset: 0-65536 }`. Sort is REQUIRED when offset is present (even `offset: 0`). Default limit: 100. `sortBy` is always an array on all endpoints (no exceptions). See `references/search-reference.md` for per-endpoint filter/sort fields.
51. **Filter operator reference** — String: `eq`, `neq`, `contains`, `in` (array, max 100), `likeIn` (array, max 100), `reg` (regex array, max 100), `isNull` (bool). Numeric: `eq`, `gt`, `gte`, `lt`, `lte`, `in`. Date (YYYY-MM-DD): `eq`, `gt`, `gte`, `lt`, `lte`, `between` (exactly 2 values). DateTime (RFC3339): same operators, converted to epoch ms internally. Boolean: `eq`. JSON: `jsonIn`, `jsonNotIn`. Logical: nest with `and`/`or`/`not` objects, or use `andGroup`/`orGroup` arrays (invoices, bills, journals, credit notes).
52. **Date format asymmetry (CRITICAL)** — Request dates: `YYYY-MM-DD` strings (all create/update and DateExpression filters). Request datetimes: RFC3339 strings (DateTimeExpression filters for `createdAt`, `updatedAt`, `approvedAt`, `submittedAt`). **ALL response dates**: `int64` epoch milliseconds — including `valueDate`, `createdAt`, `updatedAt`, `approvedAt`, `submittedAt`, `matchDate`. Convert: `new Date(epochMs).toISOString().slice(0,10)`. **Timezone convention**: ALL business dates (`valueDate`, `dueDate`, `startDate`, `endDate`, etc.) are in the **organization's timezone** — never UTC. The epoch ms stored in the DB represents the org-local date (no timezone conversion is ever needed). Only audit timestamps (`createdAt`, `updatedAt`, `action_at`) are UTC.
53. **Field aliases on create endpoints** — Middleware transparently maps: `issueDate`/`date` → `valueDate` (invoices, bills, credit notes, journals). `name` → `tagName` (tags) or `internalName` (items). `paymentDate` → `valueDate`, `bankAccountResourceId` → `accountResourceId` (payments). `paymentAmount` → `refundAmount`, `paymentMethod` → `refundMethod` (credit note refunds). `accountType` → `classificationType`, `currencyCode` → `currency` (CoA). Canonical names always work; aliases are convenience only.
54. **All search/list responses are flat** — every search and list endpoint returns `{ totalElements, totalPages, data: [...] }` directly (no outer `data` wrapper). Access the array via `response.data`, pagination via `response.totalElements`. **Two exceptions**: (a) `GET /bank-accounts` returns a plain array `[{...}]` (see Rule 18), (b) `GET /invoices/:id` returns a flat object `{...}` (no `data` wrapper) — unlike `GET /bills/:id`, `GET /contacts/:id`, `GET /journals/:id` which wrap in `{ data: {...} }`. Normalize the invoice GET response before use.
55. **Scheduled endpoints support date aliases** — `txnDateAliases` middleware (mapping `issueDate`/`date` → `valueDate`) now applies to all scheduled create/update endpoints: `POST/PUT /scheduled/invoices`, `POST/PUT /scheduled/bills`, `POST/PUT /scheduled/journals`, `POST/PUT /scheduled/subscriptions`.
56. **Kebab-case URL aliases** — `capsuleTypes` endpoints also accept kebab-case paths: `/capsule-types` (list, search, CRUD). `moveTransactionCapsules` also accepts `/move-transaction-capsules`. Both camelCase and kebab-case work identically.

### Jaz Magic — Extraction & Autofill
57. **When the user starts from an attachment, always use Jaz Magic** — if the input is a PDF, JPG, or any document image (invoice, bill, receipt), the correct path is `POST /magic/createBusinessTransactionFromAttachment`. Do NOT manually construct a `POST /invoices` or `POST /bills` payload from an attachment — Jaz Magic handles the entire extraction-and-autofill pipeline server-side: OCR, line item detection, contact matching, CoA auto-mapping via ML learning, and draft creation with all fields pre-filled. Only use `POST /invoices` or `POST /bills` when building transactions from structured data (JSON, CSV, database rows) where the fields are already known.
58. **Two upload modes with different content types** — `sourceType: "FILE"` requires **multipart/form-data** with `sourceFile` blob (JSON body fails with 400 "sourceFile is a required field"). `sourceType: "URL"` accepts **application/json** with `sourceURL` string. The OAS only documents URL mode — FILE mode (the common case) is undocumented.
59. **Three required fields + one optional**: `sourceFile` (multipart blob — NOT `file`), `businessTransactionType` (`"INVOICE"`, `"BILL"`, `"CUSTOMER_CREDIT_NOTE"`, or `"SUPPLIER_CREDIT_NOTE"` — `EXPENSE` rejected), `sourceType` (`"FILE"` or `"URL"`). Optional: `uploadMode` (`"SEPARATE"` default, or `"MERGED"` for a single PDF containing multiple documents — the backend splits it via boundary detection before extraction). All required fields are validated server-side. **CRITICAL: multipart form field names are camelCase** — `businessTransactionType`, `sourceType`, `sourceFile`, `uploadMode`, NOT snake_case. Using `business_transaction_type` returns 422 "businessTransactionType is a required field". The File blob must include a filename and correct MIME type (e.g. `application/pdf`, `image/jpeg`) — bare `application/octet-stream` blobs are rejected with 400 "Invalid file type".
59a. **MERGED upload workflow tracking** — When `uploadMode: "MERGED"`, the upload response `workflowResourceId` is a **parent** tracking ID. The backend splits the PDF, then creates **child** workflows for each split page — these child IDs appear in `POST /magic/workflows/search` (by fileName or createdAt), NOT the parent ID. To track MERGED progress, search by `fileName` rather than the parent `workflowResourceId`.
60. **Response maps transaction types**: Request `INVOICE` → response `SALE`. Request `BILL` → response `PURCHASE`. Request `CUSTOMER_CREDIT_NOTE` → response `SALE_CREDIT_NOTE`. Request `SUPPLIER_CREDIT_NOTE` → response `PURCHASE_CREDIT_NOTE`. S3 paths follow the response type. The response `validFiles[]` array contains `workflowResourceId` for tracking extraction progress via `POST /magic/workflows/search`.
61. **Extraction is asynchronous** — the API response is immediate (file upload confirmation only). The actual Magic pipeline — OCR, line item extraction, contact matching, CoA learning, and autofill — runs asynchronously. Use `POST /magic/workflows/search` with `filter.resourceId.eq: "<workflowResourceId>"` to check status (SUBMITTED → PROCESSING → COMPLETED/FAILED). When COMPLETED, `businessTransactionDetails.businessTransactionResourceId` contains the created draft BT ID. The `subscriptionFBPath` in the response is a Firebase Realtime Database path for real-time status updates (alternative to polling).
62. **Accepts PDF and JPG/JPEG** — both file types confirmed working. Handwritten documents are accepted at upload stage (extraction quality varies). `fileType` in response reflects actual format: `"PDF"`, `"JPEG"`.
63. **Never use magic-search endpoints** — `GET /invoices/magic-search` and `GET /bills/magic-search` require a separate `x-magic-api-key` (not available to agents). Always use `POST /invoices/search` or `POST /bills/search` with standard `x-jk-api-key` auth instead.
63b. **Workflow search tracks all magic uploads** — `POST /magic/workflows/search` searches across BT extractions AND bank statement imports. Filter by `resourceId` (eq), `documentType` (SALE, PURCHASE, SALE_CREDIT_NOTE, PURCHASE_CREDIT_NOTE, BANK_STATEMENT), `status` (SUBMITTED, PROCESSING, COMPLETED, FAILED), `fileName` (contains), `fileType`, `createdAt` (date range). Response: paginated `MagicWorkflowItem` with `businessTransactionDetails.businessTransactionResourceId` (the draft BT ID when COMPLETED) or `bankStatementDetails` (for bank imports). Standard search sort: `{ sortBy: ["createdAt"], order: "DESC" }`.

### Cashflow & Unified Ledger
64. **No standalone payments list/search** — `GET /payments`, `POST /payments/search`, and `GET /payments` do NOT exist. Per-payment CRUD (`GET/PUT/DELETE /payments/:resourceId`) exists for individual payment records, but to **list or search** payments, use `POST /cashflow-transactions/search` — the unified transaction ledger that spans invoices, bills, credit notes, journals, cash entries, and payments. Filter by `businessTransactionType` (e.g., `SALE`, `PURCHASE`) and `direction` (`PAYIN`, `PAYOUT`). Response dates are epoch milliseconds.
65. **Contacts search uses `name`** — NOT `billingName`. The filter field for searching contacts by name is `name` (maps to `billingName` internally). Sort field is also `name`. Using `billingName` in a search filter returns zero results.

### Response Shape Gotchas
66. **Contact boolean fields are `customer`/`supplier`** — NOT `isCustomer`/`isSupplier`. These are plain booleans on the contact object: `{ "customer": true, "supplier": false }`. Using `isCustomer` or `isSupplier` in code will be `undefined`.
67. **Finalized statuses differ by resource type** — NOT `"FINALIZED"`, `"FINAL"`, or `"POSTED"`. Journals → `"APPROVED"`. Invoices/Bills → `"UNPAID"` (progresses to `"PAID"`, `"OVERDUE"`). Customer/Supplier Credit Notes → `"UNAPPLIED"` (progresses to `"APPLIED"`). All types support `"DRAFT"` and `"VOIDED"`. When creating without `saveAsDraft: true`, the response status matches the type's finalized status.
68. **Create/pay responses are minimal** — POST create endpoints (invoices, bills, journals, contacts, payments) return only `{ resourceId: "..." }` (plus a few metadata fields). They do NOT return the full entity. To verify field values after creation, you MUST do a subsequent `GET /:type/:resourceId`. Never assert on field values from a create response.
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

### Fixed Assets
91. **Fixed asset search does NOT support `createdAt` sort** — Valid sort fields: `resourceId`, `name`, `purchaseDate`, `typeName`, `purchaseAmount`, `bookValueNetBookValueAmount`, `depreciationMethod`, `status`. Using `createdAt` returns 422. Default to `purchaseDate` DESC.
92. **Fixed asset disposal/sale/transfer use different endpoint patterns** — Discard: `POST /discard-fixed-assets/:id` (body includes `resourceId` + dates). Mark sold: `POST /mark-as-sold/fixed-assets` (body-only, no path param). Transfer: `POST /transfer-fixed-assets` (body-only). Undo: `POST /undo-disposal/fixed-assets/:id`.
92a. **Two ways to create fixed assets** — (1) **Register** (`POST /fixed-assets`): links to an existing purchase bill or journal. ACTIVE assets require `purchaseBusinessTransactionType` (`PURCHASE` or `JOURNAL_MANUAL`) and `purchaseBusinessTransactionResourceId`. Draft assets skip this validation. (2) **Transfer** (`POST /transfer-fixed-assets`): standalone asset entry, no linked transaction needed.
92b. **`saveAsDraft` defaults to `true`** — To create an ACTIVE fixed asset, pass `saveAsDraft: false` with ALL required fields: `name`, `category`, `typeCode`, `purchaseAmount`, `purchaseDate`, `purchaseAssetAccountResourceId`, `depreciationMethod`, `effectiveLife`, and for `STRAIGHT_LINE`: `depreciationStartDate`, `accumulatedDepreciationAccountResourceId`, `depreciationExpenseAccountResourceId`. Omitting any returns 422.
92c. **Valid enums** — `depreciationMethod`: `STRAIGHT_LINE`, `NO_DEPRECIATION`. `category`: `TANGIBLE`, `INTANGIBLE`. Optional string fields (`purchaseBusinessTransactionResourceId`, `accumulatedDepreciationAccountResourceId`, `capsuleResourceId`) can be safely omitted — the API ignores empty values.

### Subscriptions & Scheduled Transactions
93. **Subscription endpoints are under `/scheduled/subscriptions`** — List, GET, POST, PUT, DELETE all at `/api/v1/scheduled/subscriptions[/:id]`. Cancel is **PUT** (not POST) at `/api/v1/scheduled/cancel-subscriptions/:id` (different path pattern). **Subscriptions are invoices only** (SALE) — no bills. Different from scheduled invoices: subscriptions auto-prorate partial periods (generate credit notes for mid-period changes), but currency/tax/account are immutable after creation. Use scheduled invoices for fixed-amount recurring invoices where you need per-occurrence flexibility. **All subscription CRUD requires `proratedConfig: { proratedAdjustmentLineText: string }`** — Clio auto-injects this; do not add manually. **`repeat` is required on POST** (valid: `ONE_TIME`, `DAILY`, `WEEKLY`, `MONTHLY`, `YEARLY`) — Clio maps from the `interval` parameter. Cancel requires `cancelDateType` (`END_OF_CURRENT_PERIOD`, `END_OF_LAST_PERIOD`, `CUSTOM_DATE`) + `proratedAdjustmentLineText` + `resourceId` in body. Must cancel before delete. `businessTransactionType` is NOT in the OAS — the API ignores it.
94. **Scheduled transaction search does NOT support `createdAt` sort** — `POST /scheduled-transaction/search` sort fields: `startDate`, `nextScheduleDate`, etc. Default to `startDate` DESC. This is a cross-entity search across all scheduled types (invoices, bills, journals, subscriptions). Filter by `businessTransactionType` (SALE, PURCHASE, JOURNAL) and/or `schedulerType` (RECURRING, SUBSCRIPTION) to narrow results.

### Universal Search
95. **Universal search uses `query` param (NOT `q`)** — `GET /search?query=<term>` returns categorized results across contacts, invoices, bills, credit notes, journals. Response is a flat object with category keys, each containing an array of matches. No pagination — returns top matches per category.

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

## Supporting Files

For detailed reference, read these files in this skill directory:

- **[references/search-reference.md](./references/search-reference.md)** — Complete search/filter/sort reference for all 28 search endpoints — per-endpoint filter fields, sort fields, operator types
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

## See Also

- **jaz-recipes** — 16 IFRS-compliant transaction recipes with journal entries, capsules, and calculators
- **jaz-jobs** — 12 accounting job playbooks (month-end close, bank recon, GST/VAT filing, etc.)
- **jaz-conversion** — Data migration workflows from Xero, QuickBooks, Sage, MYOB, and Excel
- **jaz-cli** — CLI command reference, auth, output formats, pagination, and workflow patterns
