---
name: jaz-api
version: 4.16.0
description: Complete reference for the Jaz REST API — the accounting platform backend. Use this skill whenever building, modifying, debugging, or extending any code that calls the API — including API clients, integrations, data seeding, test data, or new endpoint work. Contains every field name, response shape, error, gotcha, and edge case discovered through live production testing.
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
26. **Cash entries use `accountResourceId`** at top level for the BANK account + `journalEntries` array for offsets.

### Credit Notes & Refunds
27. **Credit note application wraps in `credits` array** with `amountApplied` — not flat.
28. **CN refunds use `refunds` wrapper** with `refundAmount` + `refundMethod` — NOT `payments`/`paymentAmount`/`paymentMethod`.

### Inventory Items
29. **Inventory items require**: `unit` (e.g., `"pcs"`), `costingMethod` (`"FIXED"` or `"WAC"`), `cogsResourceId`, `blockInsufficientDeductions`, `inventoryAccountResourceId`. `purchaseAccountResourceId` MUST be Inventory-type CoA.
30. **Delete inventory items via `DELETE /items/:id`** — not `/inventory-items/:id`.

### Cash Transfers
31. **Cash transfers use `cashOut`/`cashIn` sub-objects** — NOT flat `fromAccountResourceId`/`toAccountResourceId`. Each: `{ accountResourceId, amount }`.

### Schedulers
32. **Scheduled invoices/bills wrap in `{ invoice: {...} }` or `{ bill: {...} }`** — not flat. Recurrence field is `repeat` (NOT `frequency`/`interval`). `saveAsDraft: false` required.
33. **Scheduled journals use FLAT structure** with `schedulerEntries` — not nested in `journal` wrapper.

### Bookmarks
34. **Bookmarks use `items` array wrapper** with `name`, `value`, `categoryCode`, `datatypeCode`.

### Custom Fields
35. **Do NOT send `appliesTo` on custom field POST** — causes "Invalid request body". Only send `name`, `type`, `printOnDocuments`.

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

37. **Data exports use simpler field names**: P&L export uses `startDate`/`endDate` (NOT `primarySnapshotDate`). AR/AP export uses `endDate`.

### Pagination
38. **All list/search endpoints use `limit`/`offset` pagination** — NOT `page`/`size`. Default limit=100, offset=0. Max limit=1000, max offset=65536. `page`/`size` params are silently ignored. Response shape: `{ totalPages, totalElements, truncated, data: [...] }`. When `truncated: true`, a `_meta: { fetchedRows, maxRows }` field explains why (offset cap or `--max-rows` soft cap — default 10,000). Use `--max-rows <n>` to override. Always check `truncated` before assuming the full dataset was returned.

### Other
39. **Currency rates use `/organization-currencies/:code/rates`** — note the HYPHENATED path (NOT `/organization/currencies`). Enable currencies first via `POST /organization/currencies`, then set rates via `POST /organization-currencies/:code/rates` with body `{ "rate": 0.74, "rateApplicableFrom": "YYYY-MM-DD" }` (see Rule 49 for direction). Cannot set rates for org base currency. Full CRUD: POST (create), GET (list), GET/:id, PUT/:id, DELETE/:id.
40. **FX invoices/bills MUST use `currency` object** — `currencyCode: "USD"` (string) is **silently ignored** (transaction created in base currency!). Use `currency: { sourceCurrency: "USD" }` to auto-fetch platform rate (ECB/FRANKFURTER), or `currency: { sourceCurrency: "USD", exchangeRate: 1.35 }` for a custom rate. Rate hierarchy: org rate → platform/ECB → transaction-level.
41. **Invoice GET uses `organizationAccountResourceId`** for line item accounts — POST uses `accountResourceId`. Request-side aliases resolve `issueDate` → `valueDate`, `bankAccountResourceId` → `accountResourceId`, etc.
42. **Scheduler GET returns `interval`** — POST uses `repeat`. (Response-side asymmetry remains.)
43. **Search sort is an object** — `{ sort: { sortBy: ["valueDate"], order: "DESC" } }`. Required when `offset` is present (even `offset: 0`).
44. **Bank records: two import methods** — Multipart CSV/OFX via `POST /magic/importBankStatementFromAttachment` (camelCase fields: `sourceFile`, `accountResourceId`, `businessTransactionType: "BANK_STATEMENT"`, `sourceType: "FILE"` — same camelCase rule as rule 59). JSON via `POST /bank-records/:accountResourceId` with `{ records: [{description, netAmount, valueDate, ...}] }`.
45. **Withholding tax** on bills/supplier CNs only. Retry pattern: if `WITHHOLDING_CODE_NOT_FOUND`, strip field and retry.
46. **Known API bugs (500s)**: Contact groups PUT, custom fields PUT, capsules POST, catalogs POST, inventory balances GET — all return 500.
47. **Non-existent endpoints**: `POST /deposits`, `POST /inventory/adjustments`, `GET /payments` (list), and `POST /payments/search` return 404 — these endpoints are not implemented. To list/search payments, use `POST /cashflow-transactions/search` (the unified transaction ledger — see Rule 63).
48. **Attachments require PDF/PNG**: `POST /:type/:id/attachments` uses multipart `file` field but rejects `text/plain`. Use `application/pdf` or `image/png`.
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
59. **Three required fields**: `sourceFile` (multipart blob — NOT `file`), `businessTransactionType` (`"INVOICE"`, `"BILL"`, `"CUSTOMER_CREDIT_NOTE"`, or `"SUPPLIER_CREDIT_NOTE"` — `EXPENSE` rejected), `sourceType` (`"FILE"` or `"URL"`). All three are validated server-side. **CRITICAL: multipart form field names are camelCase** — `businessTransactionType`, `sourceType`, `sourceFile`, NOT snake_case. Using `business_transaction_type` returns 422 "businessTransactionType is a required field". The File blob must include a filename and correct MIME type (e.g. `application/pdf`, `image/jpeg`) — bare `application/octet-stream` blobs are rejected with 400 "Invalid file type".
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
74. **Cash-in/out/transfer CREATE returns `parentEntityResourceId`** — The resourceId in the POST response (`{ data: { resourceId: "X" } }`) is the journal header's `parentEntityResourceId`. This ID is used for DELETE (`DELETE /cashflow-journals/X`). But it is **NOT** the same ID used for GET (`GET /cash-in-journals/:id`). GET expects the cashflow-transaction `resourceId` from the LIST response. Three different IDs exist per cash entry: `parentEntityResourceId` (from CREATE + in LIST), `resourceId` (cashflow-transaction ID, from LIST — use for GET), `businessTransactionResourceId` (underlying journal ID — do NOT use for anything).
75. **Cash-in/out/transfer LIST/GET return cashflow-transaction shape** — NOT journal shape. Key field differences from journals: `transactionReference` (NOT `reference`), `transactionStatus` (NOT `status` — values: `ACTIVE`/`VOID`), `valueDate` is epoch ms (NOT ISO string), no `journalEntries` array, has `direction` (`PAYIN`/`PAYOUT`), has nested `account` object with bank name, has `businessTransactionType` (`JOURNAL_DIRECT_CASH_IN`/`JOURNAL_DIRECT_CASH_OUT`/`JOURNAL_CASH_TRANSFER`).
76. **Cash-in/out/transfer search uses `/cashflow-transactions/search`** — Filter by `businessTransactionType: { eq: "JOURNAL_DIRECT_CASH_IN" }` (or `JOURNAL_DIRECT_CASH_OUT` or `JOURNAL_CASH_TRANSFER`). Other useful filters: `organizationAccountResourceId` (bank account), `businessTransactionReference` (reference), `valueDate` (date range). The search endpoint is shared across all cashflow transaction types.
77. **DELETE for cash entries uses `/cashflow-journals/:id`** — NOT the individual resource paths. The ID used is the `parentEntityResourceId` (= the resourceId returned by CREATE). This is a shared endpoint for all cash journal types (cash-in, cash-out, cash-transfer).

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

## DX Overhaul (Implemented)

The backend DX overhaul is live. Key improvements now available:
- **Request-side field aliases**: `name` → `tagName`/`internalName`, `issueDate` → `valueDate`, `bankAccountResourceId` → `accountResourceId`, and more. Both canonical and alias names are accepted.
- **Response-side aliases**: Tags, items, and custom fields return `name` alongside canonical field names (`tagName`, `internalName`, `customFieldName`).
- **`saveAsDraft` defaults to `false`**: Omitting it creates a finalized transaction. No longer required on POST.
- **`POST /items/search` available**: Advanced search with filters now works for items.
- **NormalizeToArray**: Flat payment/refund/credit objects are auto-wrapped into arrays. Array format is still recommended.
- **Nil-safe deletes**: Delete endpoints return 404 (not 500) when resource not found.

## Recommended Client Patterns

- **Starting from an attachment?** → Use Jaz Magic (`POST /magic/createBusinessTransactionFromAttachment`). Never manually parse a PDF/JPG to construct `POST /invoices` or `POST /bills` — let the extraction & autofill pipeline handle it.
- **Starting from structured data?** → Use `POST /invoices` or `POST /bills` directly with the known field values.
- **Serialization (Python)**: `model_dump(mode="json", by_alias=True, exclude_unset=True, exclude_none=True)`
- **Field names**: All request bodies use camelCase
- **Date serialization**: Python `date` type → `YYYY-MM-DD` strings
- **Bill payments**: Embed in bill creation body (safest). Standalone `POST /bills/{id}/payments` also works.
- **Bank records**: Use multipart `POST /magic/importBankStatementFromAttachment`
- **Scheduled bills**: Wrap as `{ status, startDate, endDate, repeat, bill: {...} }`
- **FX currency (invoices, bills, credit notes, AND journals)**: `currency: { sourceCurrency: "USD" }` (auto-fetches platform rate) or `currency: { sourceCurrency: "USD", exchangeRate: 1.35 }` (custom rate). Same object form on all transaction types. **Never use `currencyCode` string** — silently ignored.
