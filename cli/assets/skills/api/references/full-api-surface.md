# Jaz API — Complete Endpoint Catalog

> Every endpoint in the Jaz REST API, organized by resource. Includes undocumented
> endpoints, magic AI features, admin APIs, and advanced search/filter syntax.
> For request/response examples of core endpoints, see endpoints.md.

---

## Auth Headers

| Header | Purpose | Format |
|--------|---------|--------|
| `x-jk-api-key` | Standard API key | `jk-` prefix + 48 hex chars |
| `x-magic-api-key` | Magic/AI endpoints | Separate key |

**Use `x-jk-api-key` for all API access.**

---

## Core Accounting Endpoints

### Chart of Accounts
| Method | Path | Description |
|--------|------|-------------|
| GET | `/chart-of-accounts` | List all accounts |
| GET | `/chart-of-accounts/:resourceId` | Get single account |
| POST | `/chart-of-accounts` | Create single account |
| POST | `/chart-of-accounts/bulk-upsert` | Bulk create/update (max 100) |
| POST | `/chart-of-accounts/search` | Advanced search with filters |
| PUT | `/chart-of-accounts/:resourceId` | Update account |
| DELETE | `/chart-of-accounts/:resourceId` | Delete account |
| PUT | `/chart-of-accounts/magic-update` | AI-enhanced update (x-magic-api-key) |

### Invoices
| Method | Path | Description |
|--------|------|-------------|
| GET | `/invoices` | List invoices |
| GET | `/invoices/:resourceId` | Get single invoice |
| POST | `/invoices` | Create invoice |
| POST | `/invoices/search` | Advanced search with filters |
| PUT | `/invoices/:resourceId` | Update invoice |
| DELETE | `/invoices/:resourceId` | Delete invoice |
| GET | `/invoices/:resourceId/download` | Download PDF |
| POST | `/invoices/:resourceId/payments` | Record payment(s) |
| GET | `/invoices/:resourceId/payments` | List recorded payments — **raw array response** |
| POST | `/invoices/:resourceId/credits` | Apply credit note(s) |
| GET | `/invoices/:resourceId/credits` | List applied credits — **raw array response** |
| DELETE | `/invoices/:resourceId/credits/:creditsAppliedResourceId` | Reverse credit |
| GET | `/invoices/:resourceId/attachments` | List attachments |
| POST | `/invoices/:resourceId/attachments` | Upload attachment |
| DELETE | `/invoices/:resourceId/attachments/:attachmentResourceId` | Delete attachment |
| PUT | `/invoices/magic-update` | AI-enhanced update (x-magic-api-key) |

### Bills
| Method | Path | Description |
|--------|------|-------------|
| GET | `/bills` | List bills |
| GET | `/bills/:resourceId` | Get single bill |
| POST | `/bills` | Create bill (can embed payments) |
| POST | `/bills/search` | Advanced search with filters |
| PUT | `/bills/:resourceId` | Update bill |
| DELETE | `/bills/:resourceId` | Delete bill |
| POST | `/bills/:resourceId/payments` | Record payment(s) (fixed in PR #112) |
| GET | `/bills/:resourceId/payments` | List recorded payments |
| POST | `/bills/:resourceId/credits` | Apply supplier credit note(s) |
| GET | `/bills/:resourceId/credits` | List applied credits |
| DELETE | `/bills/:resourceId/credits/:creditsAppliedResourceId` | Reverse credit |
| GET | `/bills/:resourceId/attachments` | List attachments |
| POST | `/bills/:resourceId/attachments` | Upload attachment |
| DELETE | `/bills/:resourceId/attachments/:attachmentResourceId` | Delete attachment |
| PUT | `/bills/magic-update` | AI-enhanced update (x-magic-api-key) |

### Customer Credit Notes
| Method | Path | Description |
|--------|------|-------------|
| GET | `/customer-credit-notes` | List |
| GET | `/customer-credit-notes/:resourceId` | Get by ID |
| POST | `/customer-credit-notes` | Create |
| POST | `/customer-credit-notes/search` | Advanced search |
| PUT | `/customer-credit-notes/:resourceId` | Update |
| DELETE | `/customer-credit-notes/:resourceId` | Delete |
| GET | `/customer-credit-notes/:resourceId/download` | Download PDF |
| POST | `/customer-credit-notes/:resourceId/refunds` | Record refund(s) |
| GET | `/customer-credit-notes/:resourceId/refunds` | List refunds |
| PUT | `/customer-credit-notes/magic-update` | AI update |

### Supplier Credit Notes
| Method | Path | Description |
|--------|------|-------------|
| GET | `/supplier-credit-notes` | List |
| GET | `/supplier-credit-notes/:resourceId` | Get by ID |
| POST | `/supplier-credit-notes` | Create |
| POST | `/supplier-credit-notes/search` | Advanced search |
| PUT | `/supplier-credit-notes/:resourceId` | Update |
| DELETE | `/supplier-credit-notes/:resourceId` | Delete |
| POST | `/supplier-credit-notes/:resourceId/refunds` | Record refund(s) |
| GET | `/supplier-credit-notes/:resourceId/refunds` | List refunds |
| PUT | `/supplier-credit-notes/magic-update` | AI update |

### Journals
| Method | Path | Description |
|--------|------|-------------|
| GET | `/journals` | List |
| GET | `/journals/:resourceId` | Get by ID |
| POST | `/journals` | Create |
| POST | `/journals/search` | Advanced search |
| PUT | `/journals/:resourceId` | Update |
| DELETE | `/journals/:resourceId` | Delete |
| GET | `/journals/:resourceId/attachments` | List attachments |
| POST | `/journals/:resourceId/attachments` | Upload attachment |
| DELETE | `/journals/:resourceId/attachments/:attachmentResourceId` | Delete attachment |
| PUT | `/journals/magic-update` | AI update |

### Cash Entries
| Method | Path | Description |
|--------|------|-------------|
| POST | `/cash-in-entries` | Create cash-in |
| GET | `/cash-in-entries` | List cash-in |
| GET | `/cash-in-entries/:resourceId` | Get cash-in by ID |
| PUT | `/cash-in-entries/:resourceId` | Update cash-in |
| PUT | `/cash-in-entries/magic-update` | AI update |
| POST | `/cash-out-entries` | Create cash-out |
| GET | `/cash-out-entries` | List cash-out |
| GET | `/cash-out-entries/:resourceId` | Get cash-out by ID |
| PUT | `/cash-out-entries/:resourceId` | Update cash-out |
| PUT | `/cash-out-entries/magic-update` | AI update |
| POST | `/cash-transfers` | Create cash transfer |
| GET | `/cash-transfers` | List cash transfers |
| GET | `/cash-transfers/:resourceId` | Get transfer by ID |
| POST | `/cashflow-transactions/search` | Search all cash transactions |
| DELETE | `/cash-entries/:resourceId` | Delete any cash entry |

### Transfer Trial Balance
| Method | Path | Description |
|--------|------|-------------|
| POST | `/transfer-trial-balance` | Create opening balance entries (always ACTIVE, reference auto-generated, uses `journalEntries`) |

### Payments (Generic)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/payments/:resourceId` | Get payment record — returns `{data: PaymentRecord}` |
| PUT | `/payments/:resourceId` | Update payment — returns `{data: PaymentRecord}` |
| DELETE | `/payments/:resourceId` | Delete/void payment |

**Note**: Payment resourceIds come from parent documents (`GET /invoices/:id` → `paymentRecords[].resourceId`). Cashflow transaction IDs from `POST /cashflow-transactions/search` are NOT the same.

### Bank Records
| Method | Path | Description |
|--------|------|-------------|
| POST | `/bank-records/:accountResourceId` | Create bank records (JSON POST) |
| POST | `/bank-records/:accountResourceId/search` | Search bank entries |
| POST | `/magic/importBankStatementFromAttachment` | Import bank statement (multipart, see endpoints.md) |

### Bank Accounts (Convenience)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/bank-accounts` | List bank-type CoA accounts |
| GET | `/bank-accounts/:resourceId` | Get bank account by ID |

### Bank Rules
| Method | Path | Description |
|--------|------|-------------|
| POST | `/bank-rules` | Create bank rule |
| GET | `/bank-rules` | List bank rules |
| GET | `/bank-rules/:resourceId` | Get bank rule by ID |
| PUT | `/bank-rules/:resourceId` | Update bank rule |
| DELETE | `/bank-rules/:resourceId` | Delete bank rule |
| POST | `/bank-rules/search` | Search bank rules |

### Auto-Reconciliation
| Method | Path | Description |
|--------|------|-------------|
| POST | `/search-magic-reconciliation` | Search auto-reconciliation suggestions |

---

## Entity Endpoints

### Contacts
| Method | Path | Description |
|--------|------|-------------|
| GET | `/contacts` | List |
| GET | `/contacts/:resourceId` | Get by ID |
| POST | `/contacts` | Create |
| POST | `/contacts/search` | Advanced search |
| PUT | `/contacts/:resourceId` | Update |
| DELETE | `/contacts/:resourceId` | Delete |
| PUT | `/contacts/magic-update` | AI update |

### Contact Groups
| Method | Path | Description |
|--------|------|-------------|
| GET | `/contact-groups` | List |
| GET | `/contact-groups/:resourceId` | Get by ID |
| POST | `/contact-groups` | Create |
| POST | `/contact-groups/search` | Advanced search |
| PUT | `/contact-groups/:resourceId` | Update (**known 500 bug**) |
| DELETE | `/contact-groups/:resourceId` | Delete |

### Items
| Method | Path | Description |
|--------|------|-------------|
| GET | `/items` | List standard items |
| GET | `/items/:resourceId` | Get item by ID |
| POST | `/items` | Create standard item (requires `itemCode`, `appliesToSale`/`appliesToPurchase`) |
| PUT | `/items/:resourceId` | Update item |
| DELETE | `/items/:resourceId` | Delete item |
| POST | `/items/search` | Advanced search with filters |
| POST | `/inventory-items` | Create inventory item (needs `unit`, `costingMethod`, `cogsResourceId`, `blockInsufficientDeductions`, `inventoryAccountResourceId`) |
| GET | `/inventory-items` | List inventory items |
| GET | `/inventory-item-balance/:resourceId` | Get inventory balance |
| GET | `/inventory-balances/:balanceStatus` | List by status (**known 500 bug**) |
| DELETE | (use `/items/:id`) | Delete inventory items via standard items endpoint |

### Tax Profiles
| Method | Path | Description |
|--------|------|-------------|
| GET | `/tax-profiles` | List |
| GET | `/tax-profiles/:resourceId` | Get by ID |
| POST | `/tax-profiles` | Create |
| POST | `/tax-profiles/search` | Advanced search |
| PUT | `/tax-profiles/:resourceId` | Update |
| DELETE | `/tax-profiles/:resourceId` | Delete |
| GET | `/tax-types` | List all tax types |

### Tags
| Method | Path | Description |
|--------|------|-------------|
| GET | `/tags` | List |
| GET | `/tags/:resourceId` | Get by ID |
| POST | `/tags` | Create |
| POST | `/tags/search` | Advanced search |
| PUT | `/tags/:resourceId` | Update |
| DELETE | `/tags/:resourceId` | Delete |

### Custom Fields
| Method | Path | Description |
|--------|------|-------------|
| GET | `/custom-fields` | List |
| GET | `/custom-fields/:resourceId` | Get by ID |
| POST | `/custom-fields` | Create |
| POST | `/custom-fields/search` | Advanced search |
| PUT | `/custom-fields/:resourceId` | Update (**known 500 bug** — requires `appliesTo` but crashes) |
| DELETE | `/custom-fields/:resourceId` | Delete |

---

## Organization & Currency Endpoints

### Organization
| Method | Path | Description |
|--------|------|-------------|
| GET | `/organization` | Get org details (returns LIST) |
| GET | `/me` | Test API key (health check) |

### Currencies (via /organization/currencies)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/organization/currencies` | List enabled currencies |
| POST | `/organization/currencies` | Enable currencies (array format) |
| GET | `/organization/currencies/:currencyCode` | Get by code |
| DELETE | `/organization/currencies/:currencyCode` | Disable currency |

### Currency Rates (via /organization-currencies)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/organization-currencies/:currencyCode/rates` | Set custom rate |
| GET | `/organization-currencies/:currencyCode/rates` | List rates |
| GET | `/organization-currencies/:currencyCode/rates/:resourceId` | Get rate |
| PUT | `/organization-currencies/:currencyCode/rates/:resourceId` | Update rate |
| DELETE | `/organization-currencies/:currencyCode/rates/:resourceId` | Delete rate |

**CRITICAL path difference**: Currency rate management uses `/organization-currencies` (hyphenated), while basic enable/disable uses `/organization/currencies` (nested). Using the wrong path returns 404. POST body: `{ "rate": 0.74, "rateApplicableFrom": "YYYY-MM-DD" }` (rate = 1 base → X foreign; see endpoints.md for direction details). Base currency rates return 400. See endpoints.md for full examples.

---

## Scheduling Endpoints

### Scheduled Invoices
| Method | Path | Description |
|--------|------|-------------|
| POST | `/scheduled/invoices` | Create |
| GET | `/scheduled/invoices` | List |
| GET | `/scheduled/invoices/:resourceId` | Get by ID |
| PUT | `/scheduled/invoices/:resourceId` | Update |
| DELETE | `/scheduled/invoices/:resourceId` | Delete |
| POST/GET/DELETE | `/scheduled/invoices/:resourceId/attachments[/:fileId]` | Attachment CRUD |

### Scheduled Bills
| Method | Path | Description |
|--------|------|-------------|
| POST | `/scheduled/bills` | Create |
| GET | `/scheduled/bills` | List |
| GET | `/scheduled/bills/:resourceId` | Get by ID |
| PUT | `/scheduled/bills/:resourceId` | Update |
| DELETE | `/scheduled/bills/:resourceId` | Delete |
| POST/GET/DELETE | `/scheduled/bills/:resourceId/attachments[/:fileId]` | Attachment CRUD |

### Scheduled Journals
| Method | Path | Description |
|--------|------|-------------|
| POST | `/scheduled/journals` | Create |
| GET | `/scheduled/journals` | List |
| GET | `/scheduled/journals/:resourceId` | Get by ID |
| PUT | `/scheduled/journals/:resourceId` | Update |
| DELETE | `/scheduled/journals/:resourceId` | Delete |
| POST/GET/DELETE | `/scheduled/journals/:resourceId/attachments[/:attachmentResourceId]` | Attachment CRUD |

### Scheduled Subscriptions (Recurring Invoices)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/scheduled/subscriptions` | Create |
| GET | `/scheduled/subscriptions` | List |
| GET | `/scheduled/subscriptions/:resourceId` | Get by ID |
| PUT | `/scheduled/subscriptions/:resourceId` | Update |
| DELETE | `/scheduled/subscriptions/:resourceId` | Delete |
| PUT | `/scheduled/cancel-subscriptions/:resourceId` | Cancel (soft delete) |
| POST/GET/DELETE | `/scheduled/subscriptions/:resourceId/attachments[/:fileId]` | Attachment CRUD |

### Search All Scheduled
| Method | Path | Description |
|--------|------|-------------|
| POST | `/scheduled-transaction/search` | Search all scheduled items |

**Response shape note**: Scheduler GET returns `interval` field (not `repeat`). POST/PUT uses `repeat`. PUT accepts the full transaction template (not just schedule metadata).

---

## Reports & Exports

### Generate Reports (interactive)
| Method | Path |
|--------|------|
| POST | `/generate-reports/trial-balance` |
| POST | `/generate-reports/balance-sheet` |
| POST | `/generate-reports/profit-and-loss` |
| POST | `/generate-reports/cashflow` |
| POST | `/generate-reports/general-ledger` |
| POST | `/generate-reports/cash-balance` |
| POST | `/generate-reports/vat-ledger` |
| POST | `/generate-reports/ar-report` |
| POST | `/generate-reports/ap-report` |
| POST | `/generate-reports/ar-summary-report` |
| POST | `/generate-reports/ap-summary-report` |
| POST | `/generate-reports/bank-balance-summary` |
| POST | `/generate-reports/bank-reconciliation-summary` |
| POST | `/generate-reports/bank-reconciliation-details` |
| POST | `/generate-reports/equity-movement` |
| POST | `/generate-reports/fixed-assets-summary` |
| POST | `/generate-reports/fixed-assets-recon-summary` |
| POST | `/generate-reports/templated-*` | Templated versions of above |
| GET | `/ledger/highlights` | GL summary metadata (counts, date range, currencies) |

### Data Exports (downloadable)
| Method | Path |
|--------|------|
| POST | `/data-exports/trial-balance` |
| POST | `/data-exports/balance-sheet` |
| POST | `/data-exports/profit-and-loss` |
| POST | `/data-exports/cashflow` |
| POST | `/data-exports/general-ledger` |
| POST | `/data-exports/sales-summary` |
| POST | `/data-exports/purchase-summary` |
| POST | `/data-exports/journal-summary` |
| POST | `/data-exports/ar-report` |
| POST | `/data-exports/ap-report` |
| POST | `/data-exports/ar-details-report` |
| POST | `/data-exports/ap-details-report` |
| POST | `/data-exports/bank-reconciliation-*` |
| POST | `/data-exports/fixed-assets-*` |
| POST | `/data-exports/sales-book` |
| POST | `/data-exports/purchase-book` |
| POST | `/data-exports/cash-receipt-book` |
| POST | `/data-exports/cash-disbursement-book` |
| POST | `/data-exports/general-journal-book` |
| POST | `/data-exports/general-ledger-book` |

### Report Packs
| Method | Path | Description |
|--------|------|-------------|
| POST | `/generate-report-packs-pdf` | Generate multiple reports as single PDF |

### Statement of Account
| Method | Path | Description |
|--------|------|-------------|
| POST | `/statement-of-account-export` | Generate SOA for contact |

---

## Magic/AI Endpoints (x-magic-api-key)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/magic/createBusinessTransactionFromAttachment` | **Jaz Magic: Extraction & Autofill.** Upload PDF/JPG → full extraction pipeline (OCR, line items, contact matching, CoA ML learning) → draft transaction with all fields autofilled. Supports `INVOICE`, `BILL`, `CUSTOMER_CREDIT_NOTE`, `SUPPLIER_CREDIT_NOTE`. FILE mode = multipart (`sourceFile` blob), URL mode = JSON (`sourceURL`). Async — returns `workflowResourceId` for tracking via workflow search. Request maps: `INVOICE`→`SALE`, `BILL`→`PURCHASE`, `CUSTOMER_CREDIT_NOTE`→`SALE_CREDIT_NOTE`, `SUPPLIER_CREDIT_NOTE`→`PURCHASE_CREDIT_NOTE`. |
| POST | `/magic/workflows/search` | **Workflow search.** Track magic upload status across BT extractions and bank imports. Filter by `resourceId`, `documentType` (SALE/PURCHASE/SALE_CREDIT_NOTE/PURCHASE_CREDIT_NOTE/BANK_STATEMENT), `status` (SUBMITTED/PROCESSING/COMPLETED/FAILED), `fileName`, `fileType`, `createdAt`. Response includes `businessTransactionDetails.businessTransactionResourceId` (the draft BT ID) when COMPLETED. |
| POST | `/magic/importBankStatementFromAttachment` | Convert bank statement → entries |
| PUT | `/invoices/magic-update` | AI-enhanced invoice update |
| PUT | `/bills/magic-update` | AI-enhanced bill update |
| PUT | `/customer-credit-notes/magic-update` | AI-enhanced CN update |
| PUT | `/supplier-credit-notes/magic-update` | AI-enhanced CN update |
| PUT | `/journals/magic-update` | AI-enhanced journal update |
| PUT | `/cash-in-entries/magic-update` | AI-enhanced cash-in update |
| PUT | `/cash-out-entries/magic-update` | AI-enhanced cash-out update |
| PUT | `/contacts/magic-update` | AI-enhanced contact update |
| PUT | `/chart-of-accounts/magic-update` | AI-enhanced CoA update |
| ~~GET~~ | ~~`/invoices/magic-search`~~ | ~~AI-powered sales search~~ — **Do not use.** Requires `x-magic-api-key`. Use `POST /invoices/search` instead. |
| ~~GET~~ | ~~`/bills/magic-search`~~ | ~~AI-powered purchase search~~ — **Do not use.** Requires `x-magic-api-key`. Use `POST /bills/search` instead. |

---

## Additional Resources

### Capsules (Workspaces)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/capsules` | Create workspace |
| GET | `/capsules` | List |
| GET | `/capsules/:resourceId` | Get by ID |
| POST | `/capsules/search` | Search |
| PUT | `/capsules/:resourceId` | Update |
| DELETE | `/capsules/:resourceId` | Delete |
| POST | `/moveTransactionCapsules` | Move transactions between capsules |
| POST | `/move-transaction-capsules` | Kebab-case alias (same handler) |

### Capsule Types
| Method | Path | Description |
|--------|------|-------------|
| POST | `/capsuleTypes` | Create capsule type |
| GET | `/capsuleTypes` | List |
| GET | `/capsuleTypes/:resourceId` | Get by ID |
| POST | `/capsuleTypes/search` | Search |
| PUT | `/capsuleTypes/:resourceId` | Update |
| DELETE | `/capsuleTypes/:resourceId` | Delete |
| — | `/capsule-types/*` | Kebab-case aliases for all above (same handlers) |

### Fixed Assets
| Method | Path | Description |
|--------|------|-------------|
| POST | `/fixed-assets` | Create (requires `purchaseDate` + `depreciationStartDate`) |
| GET | `/fixed-assets` | List |
| GET | `/fixed-assets/:resourceId` | Get by ID |
| POST | `/fixed-assets/search` | Search |
| PUT | `/fixed-assets/:resourceId` | Update |
| DELETE | `/fixed-assets/:resourceId` | Delete |
| POST | `/mark-as-sold/fixed-assets` | Mark as sold |
| POST | `/undo-disposal/fixed-assets/:resourceId` | Undo disposal |
| POST | `/discard-fixed-assets/:resourceId` | Discard |
| POST | `/transfer-fixed-assets` | Transfer between entities |

### Fixed Asset Types
| Method | Path | Description |
|--------|------|-------------|
| POST | `/fixed-assets-types/search` | Search fixed asset types |

### Purchase Items
| Method | Path | Description |
|--------|------|-------------|
| POST | `/purchase-items/search` | Search purchase items |

### Nano Classifiers (Tracking Categories)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/nano-classifiers` | Create — `classes: string[]`, `printable: boolean` (default `false`) |
| GET | `/nano-classifiers` | List |
| GET | `/nano-classifiers/:resourceId` | Get by ID — **double-wrapped**: `{data: {data: [...], totalElements, totalPages}}` |
| PUT | `/nano-classifiers/:resourceId` | Update |
| DELETE | `/nano-classifiers/:resourceId` | Delete |
| POST | `/nano-classifiers/search` | Search |

**Response shape note**: GET single is double-wrapped. GET/LIST response returns classes as `[{className, resourceId}]` objects, while CREATE accepts plain `string[]`.

### Organization Report Templates
| Method | Path | Description |
|--------|------|-------------|
| POST | `/organization-report-template/search` | Search report templates |

### Catalogs
| Method | Path | Description |
|--------|------|-------------|
| POST | `/catalogs` | Create catalog |
| GET | `/catalogs` | List |
| GET | `/catalogs/:resourceId` | Get by ID |
| POST | `/catalogs/search` | Search |
| PUT | `/catalogs/:resourceId` | Update |
| DELETE | `/catalogs/:resourceId` | Delete |

### Reference Data
| Method | Path | Description |
|--------|------|-------------|
| GET | `/account-classifications` | List all account classification types |
| GET | `/withholding-tax-codes` | List withholding tax codes |
| GET | `/search` | Full-text search (Typesense-backed) |

### Bookmarks
| Method | Path | Description |
|--------|------|-------------|
| POST | `/organization/bookmarks` | Create bookmark |
| GET | `/organization/bookmarks` | List |
| GET | `/organization/bookmarks/:resourceId` | Get by ID |
| PUT | `/organization/bookmarks/:resourceId` | Update |
| DELETE | `/organization/bookmarks/:resourceId` | Delete |

### Organization Users
| Method | Path | Description |
|--------|------|-------------|
| GET | `/organization-users` | List |
| GET | `/organization-users/:resourceId` | Get by ID |
| PUT | `/organization-users/:resourceId` | Update |
| POST | `/organization-users/search` | Search |
| POST | `/organization-users/invite` | Invite user |
| DELETE | `/organization-users/:resourceId` | Delete |

### Modules
| Method | Path | Description |
|--------|------|-------------|
| GET | `/modules` | List all modules |
| GET | `/modules/:resourceId` | Get module by ID |

---

## Advanced Search Filter Syntax

> **Complete reference**: See **[references/search-reference.md](./search-reference.md)** for per-endpoint filter fields, sort fields, and response shapes.

All 28 `POST /*/search` endpoints accept this filter structure in the POST body:

### String Filters
```json
{ "filter": { "reference": { "eq": "INV-001" } } }
{ "filter": { "reference": { "neq": "DRAFT-001" } } }
{ "filter": { "reference": { "contains": "INV" } } }
{ "filter": { "status": { "in": ["ACTIVE", "DRAFT"] } } }
{ "filter": { "reference": { "likeIn": ["INV%", "BILL%"] } } }
{ "filter": { "reference": { "reg": ["^INV-.*"] } } }
{ "filter": { "reference": { "isNull": true } } }
```

### Numeric Filters
```json
{ "filter": { "totalAmount": { "eq": 1000 } } }
{ "filter": { "totalAmount": { "gt": 1000 } } }
{ "filter": { "totalAmount": { "gte": 500, "lte": 5000 } } }
{ "filter": { "totalAmount": { "in": [100, 200, 500] } } }
```

### Date Filters (YYYY-MM-DD format)
```json
{ "filter": { "valueDate": { "eq": "2026-02-08" } } }
{ "filter": { "valueDate": { "gte": "2026-01-01", "lte": "2026-12-31" } } }
{ "filter": { "valueDate": { "between": ["2026-01-01", "2026-03-31"] } } }
```

### DateTime Filters (RFC3339 format — for createdAt, updatedAt, approvedAt, submittedAt)
```json
{ "filter": { "createdAt": { "gte": "2026-01-01T00:00:00Z" } } }
```

### Boolean Filters
```json
{ "filter": { "appliesToSale": { "eq": true } } }
```

### JSON Filters (for tags, custom fields)
```json
{ "filter": { "tags": { "jsonIn": ["tag-resource-id-1"] } } }
{ "filter": { "tags": { "jsonNotIn": ["tag-resource-id-2"] } } }
```

### Nested Object Filters
```json
{ "filter": { "contact": { "name": { "contains": "Acme" } } } }
{ "filter": { "account": { "code": { "eq": "4000" } } } }
```

### Logical Operators
```json
{ "filter": { "and": { "status": { "eq": "ACTIVE" }, "totalAmount": { "gt": 0 } } } }
{ "filter": { "or": { "status": { "eq": "ACTIVE" }, "status": { "eq": "DRAFT" } } } }
{ "filter": { "not": { "status": { "eq": "VOIDED" } } } }
```

### andGroup / orGroup (invoices, bills, journals, credit notes)
```json
{
  "filter": {
    "andGroup": [
      { "status": { "eq": "ACTIVE" } },
      { "totalAmount": { "gt": 0 } }
    ]
  }
}
```

### Sort
`sort` is an OBJECT (not a top-level field). `sortBy` MUST be an array on all endpoints (no exceptions). Required when `offset` is present.
```json
{ "sort": { "sortBy": ["valueDate"], "order": "DESC" } }
```

### Pagination

See `endpoints.md` § "Pagination (All List Endpoints)" for the full spec (limit/offset semantics, defaults, constraints, sort requirement, examples). Key points: `offset` is a 0-indexed page number (not row-skip), default limit=100, max 1000, sort required on POST /search when offset is present. Exception: `organization-report-template/search` returns a plain array (no pagination).

### Date Format Asymmetry (CRITICAL)

| Direction | Format | Examples |
|-----------|--------|----------|
| Request dates (create/update) | `YYYY-MM-DD` string | `"valueDate": "2026-02-14"` |
| Request date filters (search) | `YYYY-MM-DD` string | `"valueDate": { "gte": "2026-01-01" }` |
| Request datetime filters (search) | RFC3339 string | `"createdAt": { "gte": "2026-01-01T00:00:00Z" }` |
| **ALL response dates** | **int64 epoch milliseconds** | `"valueDate": 1739491200000` |

Convert response dates: `new Date(epochMs).toISOString().slice(0,10)` → `"2026-02-14"`

**Timezone convention**: All business dates (`valueDate`, `dueDate`, etc.) are in the **organization's timezone** — both in requests and responses. The DB stores epoch ms representing the org-local date (no timezone conversion is ever performed). Only audit timestamps (`createdAt`, `updatedAt`) are UTC.

---

## Payment Method Enum

Valid values for `paymentMethod` field:
```
CASH, CREDIT_CARD, BANK_TRANSFER, E_WALLET, CHEQUE,
WITHHOLDING_TAX_CERTIFICATE, CLEARING_SETTLEMENT,
DEBT_WRITE_OFF, INTER_COMPANY, OTHER, PAYMENT_GATEWAY
```

---

## Limits & Constraints

| Constraint | Value |
|-----------|-------|
| Request timeout | 5 minutes (300s) |
| Body size limit | 11 MB |
| Line items per transaction | 200 max |
| Payments per transaction | 200 max |
| Tags per transaction | 50 max |
| Tag name length | 50 chars |
| CoA bulk upsert batch | 100 max |
| Search results per page | 1000 max |
| Filter `in` array | 100 values max |
| Filter `reg` patterns | 100 max |
| Journal entries | 2-200 per journal |
| Cash journal entries | 1-100 per cash journal |
| Internal notes | 65536 chars max |
| Reference field | 256 chars max |
| Contact emails | 50 max per contact |
| Shipping addresses | 100 max per contact |
| Sort fields | 25 max per query |

---

## Platform Features Affecting API Behavior

These features exist in the Jaz platform and may affect API responses or cause unexpected errors.

### Approvals
- Bills and invoices can be submitted for approval workflow
- Only admin users (AP permission) can approve submitted bills
- API-created transactions with `saveAsDraft: false` bypass approval workflow
- Approval records are read-only via API

### Lock Dates
- Organizations can set a lock date preventing changes before that cutoff
- POST/PUT requests for transactions dated before the lock date will fail
- Check `lockDate` field in `GET /api/v1/organization` response

### Bulk Operations
- Bulk invoice payments: Record payments for multiple invoices at once
- Bulk bill payments: Record payments for multiple bills at once
- Bulk import: Items (max 1000/batch via XLSX), invoices, journals (CSV/XLSX import, not API)

### Bank Integrations
- Aspire and Airwallex direct bank feeds available
- Bank statement import via `POST /api/v1/magic/importBankStatementFromAttachment` (multipart)
- Direct bank feeds may create bank records automatically

### Inventory
- Items can be PRODUCT (inventory-tracked) or SERVICE (non-tracked)
- Inventory items have costing methods: Fixed Cost or Weighted Average Cost (set at creation, cannot change)
- Stock can block insufficient deductions (orange quantity field indicator)
- Inventory adjustments via `POST /api/v1/inventory/adjustments`

### Capsules (Workspaces)
- Group transactions by project/workspace
- Move transactions between capsules via `POST /api/v1/moveTransactionCapsules`
- Search transactions within capsules

### Quick Fix (Bulk Update) — 20 Endpoints

Bulk-update transactions or line items in a single call. Pattern: `POST /api/v1/quick-fix/{entity}` + `POST /api/v1/quick-fix/{entity}/line-items`.

**ARAP**: `invoices`, `bills`, `customer-credit-notes`, `supplier-credit-notes` (× 2 = 8)
**Accounting**: `journals`, `cash-entries` (× 2 = 4)
**Schedulers**: `sale-schedules`, `purchase-schedules`, `subscription-schedules`, `journal-schedules` (× 2 = 8)

Request: `{ resourceIds: [...], attributes: {...} }` (transactions) or `{ lineItemResourceIds: [...], attributes: {...} }` (line items) or `{ schedulerUpdates: [...] }` (scheduler line items).
Response: `{ updated: [...], failed: [{ resourceId, error, errorCode }] }`. HTTP 200 = all succeeded. **207 Multi-Status** = partial failure (check both arrays). 422/500 = total failure (standard error shape).

---

*Last updated: 2026-03-13 — Added response shape annotations: payment record wrapped response, nano-classifier double-wrapped GET and classes field, scheduler interval vs repeat asymmetry, invoice/bill sub-resource raw array responses. Previous: Cash entry path migration, Transfer Trial Balance, Quick Fix.*
