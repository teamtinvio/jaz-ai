# Jaz API Field Name Map

> Complete mapping of intuitive/guessed field names to actual Jaz API field names.
> Organized by resource type. Every field verified against production API.

---

## Universal Fields

| What You'd Guess | Actual API Field | Context |
|------------------|-------------------|---------|
| `id` | `resourceId` | Every resource, every response |
| `contactId` | `contactResourceId` | POST body reference |
| `accountId` | `accountResourceId` | POST body reference |
| `bankAccountId` | `accountResourceId` | Payments, cash entries. **Alias `bankAccountResourceId` now accepted on POST.** |
| `taxProfileId` | `taxProfileResourceId` | POST body reference |
| `itemId` | `itemResourceId` | POST body reference |
| `creditNoteId` | `creditNoteResourceId` | POST body reference |

**Pattern**: References always use `<resource>ResourceId` suffix.
**Exception**: Bank account references in payments and cash entries use `accountResourceId` (NOT `bankAccountResourceId`).

---

## Date Fields

| What You'd Guess | Actual API Field | Used In |
|------------------|-------------------|---------|
| `issueDate` | `valueDate` | Invoices, bills, credit notes, journals, cash entries. **Alias `issueDate` now accepted on POST.** |
| `invoiceDate` | `valueDate` | Invoices. **Alias accepted on POST.** |
| `billDate` | `valueDate` | Bills |
| `journalDate` | `valueDate` | Journals |
| `paymentDate` | `valueDate` | Invoice/bill payments (NOT `paymentDate`!) |
| `date` (payment) | `valueDate` | Invoice/bill payments |
| `date` (bank) | `transactionDate` | Bank records |
| `asAtDate` | `endDate` | Reports (trial balance) |

**Pattern**: Transaction documents AND payments use `valueDate`. Bank records use `transactionDate`. Reports use `startDate`/`endDate`.
**CORRECTION**: Payments use `valueDate` (NOT `paymentDate` as previously documented).
**FORMAT**: All dates MUST be `YYYY-MM-DD` strings (e.g., `"2026-02-08"`). ISO datetime and epoch ms are rejected. OAS may declare `integer/int64` but strings work.
**TIMEZONE**: All business dates (`valueDate`, `dueDate`, `startDate`, `endDate`, etc.) are in the **organization's timezone** — both in requests and responses. No timezone conversion is ever needed. Only audit timestamps (`createdAt`, `updatedAt`) are UTC.

### Date Format Matrix (Request vs Response)

| Context | Direction | Format | Example |
|---------|-----------|--------|---------|
| Create/update requests | Inbound | `YYYY-MM-DD` string | `"valueDate": "2026-02-14"` |
| Search filter dates (`DateExpression`) | Inbound | `YYYY-MM-DD` string | `{ "valueDate": { "gte": "2026-01-01" } }` |
| Search filter datetimes (`DateTimeExpression`) | Inbound | RFC3339 string | `{ "createdAt": { "gte": "2026-01-01T00:00:00Z" } }` |
| **ALL response dates** | **Outbound** | **`int64` epoch milliseconds** | `"valueDate": 1707868800000` |

**CRITICAL**: ALL dates in API responses are `int64` epoch milliseconds — including `valueDate`, `createdAt`, `updatedAt`, `approvedAt`, `submittedAt`, `matchDate`, `startDate`, `endDate`, `lastScheduleDate`, `nextScheduleDate`. To convert: `new Date(epochMs).toISOString().slice(0, 10)` → `"2026-02-14"`. Business dates are stored as org-timezone epoch (no conversion needed) — only `createdAt`/`updatedAt` are UTC.

**Which fields use DateExpression (YYYY-MM-DD) vs DateTimeExpression (RFC3339)**:
- `DateExpression`: `valueDate`, `dueDate`, `startDate`, `endDate`, `purchaseDate`, `matchDate`, `approvedAt`, `submittedAt`, `depreciationStartDate`, `depreciationEndDate`, `disposalValueDate`, `proratedStartDate`, `lastScheduleDate`, `nextScheduleDate`
- `DateTimeExpression`: `createdAt`, `updatedAt` (on invoices, bills, journals, custom fields)

---

### Middleware Alias Table (Complete)

These aliases are applied by middleware on POST/PUT endpoints. The alias is only used if the canonical field is absent from the request body.

| Alias | Canonical | Middleware | Applied To |
|-------|-----------|------------|-----------|
| `issueDate` | `valueDate` | `txnDateAliases` | POST/PUT: invoices, bills, customer-credit-notes, supplier-credit-notes, journals, cash-in-journals, cash-out-journals, cash-transfer-journals, scheduled/invoices, scheduled/bills, scheduled/journals, scheduled/subscriptions |
| `date` | `valueDate` | `txnDateAliases` | Same as above (all transaction and scheduled create/update endpoints) |
| `paymentDate` | `valueDate` | `paymentAliases` | POST: invoice payments, bill payments. PUT: payments |
| `bankAccountResourceId` | `accountResourceId` | `paymentAliases` | Same as above |
| `paymentAmount` | `refundAmount` | `refundAliases` | POST: customer-credit-notes refunds, supplier-credit-notes refunds |
| `paymentMethod` | `refundMethod` | `refundAliases` | Same as above |
| `name` | `tagName` | `tagAliases` | POST/PUT: tags |
| `name` | `internalName` | `itemAliases` | POST: items, inventory-items |
| `accountType` | `classificationType` | Code-level alias | POST/PUT: chart-of-accounts, bulk-upsert |
| `currencyCode` | `currency` | Code-level alias | POST: chart-of-accounts bulk-upsert |

---

## Organization & Auth

| What You'd Guess | Actual API Field | Notes |
|------------------|-------------------|-------|
| `apiKey` header | `x-jk-api-key` | Custom header (not Authorization: Bearer) |
| `org.id` | `data[0].resourceId` | Org endpoint returns a LIST |
| `org.baseCurrency` | `data[0].currency` | Not `baseCurrency` |
| `org.country` | `data[0].countryCode` | ISO 2-letter code |

---

## Chart of Accounts

| What You'd Guess | Actual API Field | Context |
|------------------|-------------------|---------|
| `chartOfAccounts` (upsert body) | `accounts` | POST bulk-upsert wrapper |
| `currencyCode` (in POST) | `currency` | POST body (GET returns `currencyCode`!) |
| `accountClass` or `accountType` | `classificationType` | POST body — uses `accountType` values |
| `type` | `accountType` | GET response field |
| `class` | `accountClass` | GET response field |
| `accountNumber` | `code` | String, can be null. **Codes differ between orgs — match by name, not code** |

### classificationType → accountType Mapping

When POSTing, `classificationType` must be one of these exact strings (same as `accountType` from GET):

| classificationType Value | accountClass (GET) |
|-------------------------|-------------------|
| `"Bank Accounts"` | Asset |
| `"Cash"` | Asset |
| `"Current Asset"` | Asset |
| `"Fixed Asset"` | Asset |
| `"Inventory"` | Asset |
| `"Current Liability"` | Liability |
| `"Non-current Liability"` | Liability |
| `"Shareholders Equity"` | Equity |
| `"Operating Revenue"` | Revenue |
| `"Other Revenue"` | Revenue |
| `"Operating Expense"` | Expense |
| `"Direct Costs"` | Expense |

### Account Create (POST /chart-of-accounts) Fields

| What You'd Guess | Actual API Field | Notes |
|------------------|-------------------|-------|
| `accountType` | `classificationType` | **Alias `accountType` accepted** — resolved to `classificationType` |
| `currencyCode` | `currency` | POST body uses `currency` (NOT `currencyCode`). **GET response returns `currencyCode`!** Asymmetric. |
| `accountName` | `name` | Account display name — must be unique within org (409 on duplicate) |
| `accountNumber` | `code` | Optional string. System may auto-assign if omitted. |

**Foreign-currency accounts**: Pass `currency: "USD"` (or any enabled currency code) to create a foreign-currency account. Omit `currency` to default to org base currency. Useful for creating foreign-currency bank accounts (e.g., `classificationType: "Bank Accounts"` + `currency: "USD"`).

**Bank account creation shortcut**: `classificationType: "Bank Accounts"` makes the account immediately appear in the bank accounts list and usable for payments, cash entries, and bank record imports. No separate "bank account" endpoint — it's all CoA.

---

## Contacts

| What You'd Guess | Actual API Field | Notes |
|------------------|-------------------|-------|
| `isCustomer` | `customer` | Plain boolean — NOT `isCustomer` |
| `isSupplier` | `supplier` | Plain boolean — NOT `isSupplier` |
| `contactType: "customer"` | `customer: true` | Boolean, not enum |
| `contactType: "supplier"` | `supplier: true` | Boolean, not enum |
| `defaultCurrencyCode` | `currency` | ISO code string |
| `taxRegistrationNumber` | `taxNumber` | UEN (SG), TIN (PH) |
| `address.line1` | `addressLine1` | Top-level, NOT nested |
| `address.line2` | `addressLine2` | Top-level |
| `address.city` | `city` | Top-level |
| `address.postalCode` | `postalCode` | Top-level |
| `address.country` | `countryCode` | ISO 2-letter code, top-level |
| `displayName` | `billingName` | Required, set = name |

---

## Items

| What You'd Guess | Actual API Field | Notes |
|------------------|-------------------|-------|
| `name` | `internalName` | Display name. **Alias `name` now accepted on POST; GET returns both `internalName` and `name`.** |
| `sku` | `itemCode` | Unique code |
| `type` | `type` | `"PRODUCT"` or `"SERVICE"` |
| `sellPrice` | `salePrice` | Decimal |
| `buyPrice` | `purchasePrice` | Decimal |
| `sellAccountId` | `saleAccountResourceId` | CoA UUID |
| `buyAccountId` | `purchaseAccountResourceId` | CoA UUID |
| `sellTaxId` | `saleTaxProfileResourceId` | Tax profile UUID |
| `buyTaxId` | `purchaseTaxProfileResourceId` | Tax profile UUID |
| `sellable` | `appliesToSale` | Boolean |
| `purchasable` | `appliesToPurchase` | Boolean |
| `sellName` | `saleItemName` | REQUIRED when `appliesToSale: true` |
| `buyName` | `purchaseItemName` | REQUIRED when `appliesToPurchase: true` |

---

## Invoices / Bills

| What You'd Guess | Actual API Field | Notes |
|------------------|-------------------|-------|
| `invoiceNumber` | `reference` | User-visible number |
| `referenceNumber` | `reference` | Same field |
| `issueDate` | `valueDate` | THE invoice date |
| `description` (line item) | `name` | Line item description |
| `price` (line item) | `unitPrice` | Per-unit price |
| `qty` (line item) | `quantity` | Count |
| `taxId` (line item) | `taxProfileResourceId` | Tax profile UUID |
| `accountId` (line item) | `accountResourceId` | CoA UUID (required if !saveAsDraft) |
| `isDraft` | `saveAsDraft` | Boolean — defaults to `false`. Omitting creates a finalized transaction. |
| `currencyCode: "USD"` (string for FX) | SILENTLY IGNORED | Creates invoice in base currency! No error returned |
| `currency: "USD"` (string for FX) | CAUSES 400 ERROR | "Invalid request body" — string form rejected |
| `currency` (object form) | `currency: { sourceCurrency, exchangeRate }` | **ONLY working form** for FX transactions |

---

## Withholding Tax (Bills & Supplier Credit Notes Only)

| What You'd Guess | Actual API Field | Notes |
|---|---|---|
| `tax` | `withholdingTax` | Nested object on each line item |
| `withholdingTaxCode` | `withholdingTax.code` | String code (e.g., "WC010") |
| `withholdingTaxRate` | `withholdingTax.rate` | Numeric percentage (e.g., 10) |
| `withholdingTaxDescription` | `withholdingTax.description` | Optional description |

**Not supported on**: Invoices, customer credit notes, journals, cash entries. Only bills and supplier credit notes.

---

## Journals

| What You'd Guess | Actual API Field | Notes |
|------------------|-------------------|-------|
| `lineItems` | `journalEntries` | Array of entries |
| `lines` | `journalEntries` | Same |
| `entries` | `journalEntries` | Same |
| `debit` / `credit` (entry) | `amount` + `type` | `amount`: number, `type`: `"DEBIT"` or `"CREDIT"` (UPPERCASE) |
| `currency: "USD"` (string) | `currency: { sourceCurrency: "USD" }` | **Object form** — same as invoices/bills. Auto-fetches platform rate. Add `exchangeRate: 1.35` for custom rate. Omit for base currency. |

---

## Cash Entries (CREATE request shape)

| What You'd Guess | Actual API Field | Notes |
|------------------|-------------------|-------|
| `bankAccountResourceId` | `accountResourceId` (top level) | The BANK account UUID — NOT `bankAccountResourceId` |
| `amount` (flat) | `journalEntries[].amount` | Cash entries use `journalEntries` array, same as journals |
| `description` | NOT USED | Cash entries do not have a flat `description` field |
| `bankAccount` | `accountResourceId` (top level) | Same as above |
| offset account | `journalEntries[].accountResourceId` | The offsetting account goes in `journalEntries` |
| (omit saveAsDraft) | `saveAsDraft` | **REQUIRED** — must be included on cash-in and cash-out journals |

## Cash Entries (LIST/GET response shape — DIFFERENT from CREATE!)

Cash-in/out/transfer LIST and GET return **cashflow-transaction objects**, NOT journal objects:

| What You'd Guess | Actual API Field | Notes |
|------------------|-------------------|-------|
| `resourceId` | `resourceId` | **Cashflow-transaction ID** — use for GET by ID. NOT the same as CREATE response! |
| `reference` | `transactionReference` | NOT `reference` — different field name than journals |
| `status` | `transactionStatus` | NOT `status`. Values: `ACTIVE`, `VOID` (not `DRAFT`/`APPROVED`) |
| `valueDate` (string) | `valueDate` (epoch ms) | **Number, NOT string!** Convert: `new Date(epochMs).toISOString().slice(0,10)` |
| `journalEntries` | NOT PRESENT | Cash GET responses do NOT include offset entries — only `totalAmount` |
| `amount` | `totalAmount` | The total amount of the cash entry |
| `accountName` | `account.name` | Nested object: `{ name, resourceId, accountType, accountClass }` |
| `bankAccountId` | `organizationAccountResourceId` | Bank account resource ID (flat field) |
| `type` | `businessTransactionType` | `JOURNAL_DIRECT_CASH_IN`, `JOURNAL_DIRECT_CASH_OUT`, `JOURNAL_CASH_TRANSFER` |
| `direction` | `direction` | `PAYIN` or `PAYOUT` |
| (from CREATE) | `parentEntityResourceId` | The CREATE-returned resourceId appears here — use for DELETE |

### ID Mapping (CRITICAL)

```
CREATE → { resourceId: "A" }         ← This is parentEntityResourceId
LIST   → { resourceId: "B",          ← This is the cashflow-transaction ID (use for GET)
            businessTransactionResourceId: "C",   ← underlying journal ID (don't use)
            parentEntityResourceId: "A" }          ← matches CREATE response
GET    → expects "B" (cashflow-transaction ID)
DELETE → expects "A" (parentEntityResourceId, via /cashflow-journals/:id)
```

---

## Payments

| What You'd Guess | Actual API Field | Notes |
|------------------|-------------------|-------|
| `amount` | `paymentAmount` | **Bank account currency** — actual cash moved. NOT `amount`. |
| (none) | `transactionAmount` | **Transaction document currency (invoice/bill/credit note)** — amount applied to balance. Equal to `paymentAmount` for same-currency. For FX: differs (e.g., USD invoice paid from SGD bank at 1.35 → `paymentAmount: 1350`, `transactionAmount: 1000`). |
| `bankAccountResourceId` | `accountResourceId` | Canonical is `accountResourceId`. **Alias `bankAccountResourceId` now accepted on POST.** |
| (none) | `paymentMethod` | Required: `"BANK_TRANSFER"` |
| (none) | `reference` | Required: payment reference string |
| `date` / `paymentDate` | `valueDate` | NOT `paymentDate`, NOT `date`. Must be `YYYY-MM-DD` |
| (flat object) | `{ payments: [...] }` | Must be wrapped in array |

**Cross-currency payments**: `paymentAmount` is the bank account currency amount (actual cash moved), `transactionAmount` is the invoice/bill currency amount (applied to balance). Verified via live FX testing: USD invoice ($1000) paid from SGD bank at 1.35 rate → `paymentAmount: 1350` (SGD), `transactionAmount: 1000` (USD).
**Bill payments**: Standalone `POST /bills/{id}/payments` was broken (nil pointer dereference) — fixed in backend PR #112. Embed-in-creation pattern is still a valid alternative.
**Invoice payments**: Standalone `POST /invoices/{id}/payments` works fine.
**TransactionFeeCollected**: NOT supported on bill payments (model field missing). Only invoice payments support collected fees.

---

## Tags

| What You'd Guess | Actual API Field | Notes |
|------------------|-------------------|-------|
| `name` | `tagName` | **Alias `name` now accepted on POST; GET returns both `tagName` and `name`.** |

---

## Credit Note Applications

| What You'd Guess | Actual API Field | Notes |
|------------------|-------------------|-------|
| `{ creditNoteResourceId, amount }` | `{ credits: [{ creditNoteResourceId, amountApplied }] }` | Must wrap in `credits` array |
| `amount` | `amountApplied` | NOT `amount` |

---

## Custom Fields

| What You'd Guess | Actual API Field | Notes |
|------------------|-------------------|-------|
| `name` (in GET response) | `customFieldName` | GET returns both `customFieldName` and `name` alias. |
| `name` (in POST body) | `name` | POST accepts `name`. |
| `showOnPdf` | `printOnDocuments` | Required boolean |
| `appliesTo` | DO NOT SEND | Causes "Invalid request body" |
| `type` values | `"TEXT"`, `"DATE"`, `"DROPDOWN"` | UPPERCASE strings |

---

## Jaz Magic — Extraction & Autofill

| What You'd Guess | Actual API Field | Notes |
|------------------|-------------------|-------|
| `file` | `sourceFile` | Multipart blob — same pattern as bank statement |
| `type: "BILL"` | `businessTransactionType: "BILL"` | Request accepts `INVOICE` or `BILL` only |
| Response `"BILL"` | Response `"PURCHASE"` | Response maps: `BILL` → `PURCHASE`, `INVOICE` → `SALE` |
| JSON body | multipart/form-data | FILE mode requires multipart — JSON returns 400 |
| Sync response | Async extraction | Response = upload confirmation; extraction & autofill run async |
| `status` field | `subscriptionFBPath` | Firebase path for tracking extraction progress |

**Content-Type depends on sourceType:**
- `sourceType: "FILE"` → `Content-Type: multipart/form-data` (MUST use multipart)
- `sourceType: "URL"` → `Content-Type: application/json` (JSON body works)

---

## Bank Records

| What You'd Guess | Actual API Field | Notes |
|------------------|-------------------|-------|
| `date` | `transactionDate` | ISO date string |
| `direction` | `type` | `"CREDIT"` or `"DEBIT"` (uppercase) |
| `memo` | `description` | Free text |
| (negative amount) | `amount` (positive) + `type` | Always positive, direction via type |

**Creating bank records**: Use multipart `POST /api/v1/magic/importBankStatementFromAttachment` — the only endpoint for creating bank records. No JSON POST endpoint exists.

---

## Schedulers

| What You'd Guess | Actual API Field | Notes |
|------------------|-------------------|-------|
| `frequency` | `repeat` | Creation field. `"WEEKLY"`, `"MONTHLY"`, `"QUARTERLY"`, `"YEARLY"`. NOT `frequency` or `interval` |
| `interval` (response) | `interval` | Response field. Shows the recurrence after creation. Different name from creation! |
| (flat payload) | `{ invoice: {...} }` or `{ bill: {...} }` | Document wrapped in type key |
| `saveAsDraft: true` | `saveAsDraft: false` | MUST be false — true causes INVALID_SALE_STATUS / INVALID_PURCHASE_STATUS |

---

## Currencies (Organization Currency List)

| What You'd Guess | Actual API Field | Notes |
|------------------|-------------------|-------|
| `code` | `currencyCode` | **NOT `code`** — full field name is `currencyCode` |
| `name` | `currencyName` | **NOT `name`** — full field name is `currencyName` |
| `symbol` | `currencySymbol` | **NOT `symbol`** — full field name is `currencySymbol` |
| `isBase` | `baseCurrency` | Boolean — `true` only for org's base currency |
| `rateCount` | `customRateCount` | Number of org-level custom rates set for this currency |
| `{ currencyCode: "USD" }` | `{ currencies: ["USD"] }` | Enable endpoint — array of ISO codes, NOT object form |

**CRITICAL**: The `currencyCode` field in the Currency response is NOT the same as a generic `code` field. Destructuring `{ code, name, symbol }` from a currency object gives `undefined` for all three. Always use `currencyCode`, `currencyName`, `currencySymbol`.

**Enable (POST) gotchas**: Returns 400 if currency already enabled. Cannot remove currencies — one-way operation.

---

## Currency Rates

| What You'd Guess | Actual API Field | Notes |
|------------------|-------------------|-------|
| `/organization/currencies/:code/rates` | `/organization-currencies/:code/rates` | **Hyphenated** path for rates (NOT nested) |
| `exchangeRate` (rate POST body) | `rate` | Just `rate`, not `exchangeRate` |
| `effectiveDate` / `valueDate` / `date` | `rateApplicableFrom` | Rate start date, `YYYY-MM-DD` only |
| `expiryDate` | `rateApplicableTo` | Optional rate end date |
| `rate` (GET response) | `rateFunctionalToSource` | Base→source rate in GET response |
| `inverseRate` | `rateSourceToFunctional` | Source→base rate in GET response |
| `currency` (GET response) | `sourceCurrencyCode` | The foreign currency code in rate response |
| `baseCurrency` (GET response) | `functionalCurrencyCode` | The org's base currency code in rate response |
| `notes` (GET response) | `notes: { date, name }` | Metadata object — `date` is the creation date, `name` is the creator |

> **Rate direction cheat-sheet**: POST `rate` = GET `rateFunctionalToSource` = "1 base → X foreign". If your data is "1 foreign → X base", **invert before POSTing**.

**Rate POST response gotcha**: `POST /organization-currencies/:code/rates` returns `{ "data": "Rate added successfully" }` — a **plain string**, NOT a CurrencyRate object. No `resourceId` is returned. To get the rate's `resourceId` for later PUT/DELETE, follow up with GET and match by `rateApplicableFrom`.

---

## Inventory Items

| What You'd Guess | Actual API Field | Notes |
|------------------|-------------------|-------|
| `itemUnit` / `unitName` | `unit` | String, e.g., `"pcs"`, `"box"`. REQUIRED |
| `costingMethod: "FIXED_COST"` | `costingMethod: "FIXED"` | Only `"FIXED"` or `"WAC"` |
| `purchaseAccountResourceId` (any type) | `purchaseAccountResourceId` (Inventory type!) | MUST be Inventory-type CoA account |
| `DELETE /inventory-items/:id` | `DELETE /items/:id` | Delete via items endpoint, not inventory-items |

---

## Cash Transfer Journals

| What You'd Guess | Actual API Field | Notes |
|------------------|-------------------|-------|
| `fromAccountResourceId` | `cashOut.accountResourceId` | Sub-object, NOT flat |
| `toAccountResourceId` | `cashIn.accountResourceId` | Sub-object, NOT flat |
| `amount` (flat) | `cashOut.amount` / `cashIn.amount` | Amount in each sub-object |

---

## Credit Note Refunds

| What You'd Guess | Actual API Field | Notes |
|------------------|-------------------|-------|
| `payments` wrapper | `refunds` wrapper | NOT `payments` |
| `paymentAmount` | `refundAmount` | NOT `paymentAmount` |
| `paymentMethod` | `refundMethod` | NOT `paymentMethod` |

---

## Bookmarks

| What You'd Guess | Actual API Field | Notes |
|------------------|-------------------|-------|
| `{ name, url }` | `{ items: [{ name, value, categoryCode, datatypeCode }] }` | Array wrapper with 4 fields per item |
| `url` | `value` | General-purpose value field |
| `category` | `categoryCode` | Enum: `GENERAL_INFORMATION`, etc. |
| `type` | `datatypeCode` | Enum: `LINK`, `TEXT`, `NUMBER`, `BOOLEAN`, `DATE` |

---

## Scheduled Journals

| What You'd Guess | Actual API Field | Notes |
|------------------|-------------------|-------|
| `journal: { journalEntries: [...] }` | `schedulerEntries: [...]` (flat) | NOT nested like invoices/bills |
| `journalEntries` | `schedulerEntries` | Different name than regular journals |
| (nested) `reference` / `valueDate` | (top-level) `reference` / `valueDate` | Flat alongside `repeat`/`startDate`/`endDate` |

---

## Reports (All Types)

| Report | Required Fields | Notes |
|--------|----------------|-------|
| Trial balance | `startDate`, `endDate` | |
| Balance sheet | `primarySnapshotDate` | Single date |
| P&L | `primarySnapshotDate`, `secondarySnapshotDate` | |
| General ledger | `startDate`, `endDate`, `groupBy: "ACCOUNT"` | |
| Cashflow | `primaryStartDate`, `primaryEndDate` | Different from other date pairs |
| Cash balance | `reportDate` | Single date, unique field name |
| AR/AP report | `endDate` | Single date |
| AR/AP summary | `startDate`, `endDate` | |
| Bank balance summary | `primarySnapshotDate` | Same as balance sheet |
| Equity movement | `primarySnapshotStartDate`, `primarySnapshotEndDate` | Yet another pair |

## Data Exports

| Export | Required Fields | Notes |
|--------|----------------|-------|
| Trial balance | `startDate`, `endDate` | Same as generate-reports |
| P&L | `startDate`, `endDate` | DIFFERENT from generate-reports (no snapshot dates) |
| General ledger | `startDate`, `endDate`, `groupBy: "ACCOUNT"` | Same as generate-reports |
| AR/AP report | `endDate` | Same as generate-reports |

---

## Pagination

| What You'd Guess | Actual API Field | Notes |
|------------------|-------------------|-------|
| `page` | NOT SUPPORTED | Silently ignored — use `limit`/`offset` |
| `size` | NOT SUPPORTED | Silently ignored — use `limit`/`offset` |
| `pageSize` | NOT SUPPORTED | Use `limit` |
| `per_page` | NOT SUPPORTED | Use `limit` |
| `page_number` | NOT SUPPORTED | Use `offset` (item-based, not page-based) |
| (default page size) | `limit` (default: 100) | Query param for GET, JSON body for POST /search |
| (skip N items) | `offset` (default: 0) | Query param for GET, JSON body for POST /search |

**GET list endpoints**: `?limit=100&offset=0` (query params)
**POST /search endpoints**: `{ "limit": 100, "offset": 0 }` (JSON body)
**Min/max**: limit 1–1000, offset 0–65536
**Response**: `{ totalPages, totalElements, data: [...] }` — consistent across all endpoints

---

## Response Shape Quirks

| Endpoint | Response Shape | What You'd Expect |
|----------|---------------|-------------------|
| `GET /organization` | `{ data: [...] }` (list!) | `{ data: {...} }` (single) |
| `GET /organization/currencies` | `{ data: { data: [...] } }` | `{ data: [...] }` |
| `POST /chart-of-accounts/bulk-upsert` | `{ data: { resourceIds: [...] } }` | Individual results |
| `POST /organization/currencies` | `{ data: { resourceIds: [...] } }` | Confirmation object |
| `POST /organization-currencies/:code/rates` | `{ data: "Rate added successfully" }` (string!) | `{ data: { resourceId } }` (object) |
| `PUT /organization-currencies/:code/rates/:id` | `{ data: "Rate updated successfully" }` (string!) | `{ data: { resourceId } }` (object) |
| `GET /invoices/{id}` line items | `organizationAccountResourceId` | `accountResourceId` (POST uses `accountResourceId`) |
| `POST /invoices` (create) | `{ resourceId }` only | Full entity (minimal response!) |
| `POST /bills` (create) | `{ resourceId }` only | Full entity (minimal response!) |
| `POST /journals` (create) | `{ resourceId }` only | Full entity (minimal response!) |
| `POST /:type/:id/payments` | `{ resourceId }` only | Full entity (minimal response!) |
| Invoice/bill `amountDue` | Does NOT exist | Use `paymentRecords` array |
| Invoice/bill/journal status | `"APPROVED"` | `"FINALIZED"` (wrong!) |

---

## Recommended Serialization Patterns

Battle-tested patterns from production Jaz API clients:

| Pattern | Detail |
|---------|--------|
| Serialization | `model_dump(mode="json", by_alias=True, exclude_unset=True, exclude_none=True)` |
| Alias generator | `alias_generator=to_camel` (snake_case to camelCase) |
| Date type | Python `date` type serializes to `YYYY-MM-DD` strings |
| Bill payments | Always embedded in bill creation body, never standalone |
| Bank records | Multipart import via `importBankStatementFromAttachment` — the only endpoint |
| Scheduled bills | Wrapped as `{ repeat, startDate, endDate, bill: {...} }`. Field is `repeat` (NOT `frequency`/`interval`) |
| FX currency | MUST use `currency` OBJECT on ALL transaction types (invoices, bills, credit notes, journals): `{ sourceCurrency: "USD" }` (auto platform rate) or `{ sourceCurrency: "USD", exchangeRate: 1.35 }` (custom). String `currencyCode` silently ignored. |

---

*Last updated: 2026-02-23 — Added: Currency response field mapping (currencyCode NOT code, currencyName NOT name, currencySymbol NOT symbol, customRateCount). CurrencyRate response field mapping (sourceCurrencyCode, functionalCurrencyCode, notes). Account create field mapping (classificationType, currency, foreign-currency accounts). Response shape quirks: rate POST/PUT return plain strings.*
