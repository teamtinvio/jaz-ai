# Jaz API Endpoint Reference

> Full request/response examples for every Jaz API endpoint.
> See SKILL.md for rules, errors.md for troubleshooting, field-map.md for name lookups.

---

## Base URL & Auth

```
Base URL: https://api.getjaz.com
Auth Header: x-jk-api-key: <key>
Content-Type: application/json
```

---

## Date Format (All Endpoints)

**All dates must be `YYYY-MM-DD` strings** (e.g., `"2026-02-08"`).

- ISO datetime strings (e.g., `"2026-02-08T00:00:00Z"`) are REJECTED — bill payment validation returns "does not match 2006-01-02 format"
- Epoch milliseconds are REJECTED
- The OAS may declare some date fields as `integer/int64` (e.g., cash journals) but `YYYY-MM-DD` strings work in practice
- Production clients send all dates as `YYYY-MM-DD` via Python `date` type

**Timezone convention**: All business dates (`valueDate`, `dueDate`, `startDate`, `endDate`, etc.) are in the **organization's timezone** — no timezone conversion is needed, in either requests or responses. The DB stores epoch ms representing the org-local date. Only audit timestamps (`createdAt`, `updatedAt`, `action_at`) are UTC.

---

## Pagination (All List Endpoints)

All GET list endpoints and POST `/search` endpoints use **`limit`/`offset` pagination** — NOT `page`/`size`.

| Property | Value |
|----------|-------|
| **GET list endpoints** | `?limit=100&offset=0` (query params) |
| **POST /search endpoints** | `{ "limit": 100, "offset": 0 }` (JSON body) |
| **Default limit** | 100 (if omitted) |
| **Default offset** | 0 (if omitted) |
| **Max limit** | 1000 |
| **Min limit** | 1 |
| **Max offset** | 65536 |
| **Response shape** | `{ totalPages, totalElements, data: [...] }` |

**`page`/`size` are NOT supported** — sending `?page=0&size=100` is silently ignored (API returns default 100 items as if no params were sent). Always use `limit`/`offset`.

**POST /search sort requirement**: When `offset` is present in the body (even `offset: 0`), `sort` is required:
```json
{ "limit": 100, "offset": 0, "sort": { "sortBy": ["createdAt"], "order": "DESC" } }
```

---

## 1. Organization

### GET /api/v1/organization

```json
// Response (returns a SINGLE OBJECT, not array):
{
  "data": {
    "resourceId": "31eb050a-...",
    "name": "Jaz Global SG",
    "currency": "SGD",
    "countryCode": "SG",
    "status": "ACTIVE",
    "lockDate": null
  }
}
```

Access org via `data` directly (single object). The API previously returned an array but now returns a single object. Use `Array.isArray(data) ? data[0] : data` to handle both formats. Check `lockDate` — don't seed transactions before it.

---

## 2. Chart of Accounts

### GET /api/v1/chart-of-accounts?limit=200&offset=0

```json
// Response (flat list, NOT double-nested):
{
  "totalElements": 52,
  "totalPages": 1,
  "data": [{
    "resourceId": "uuid",
    "name": "Business Bank Account",
    "status": "ACTIVE",
    "accountClass": "Asset",
    "accountType": "Bank Accounts",
    "code": "90",
    "currencyCode": "SGD",
    "locked": false,
    "controlFlag": true
  }]
}
```

### POST /api/v1/chart-of-accounts/bulk-upsert

```json
// Request:
{
  "accounts": [
    {
      "name": "Sales Revenue",
      "currency": "SGD",
      "classificationType": "Operating Revenue",
      "code": "4000"
    },
    {
      "name": "Office Expenses",
      "currency": "SGD",
      "classificationType": "Operating Expense",
      "code": "5000"
    }
  ]
}

// Response:
{ "data": { "resourceIds": ["uuid1", "uuid2"] } }
```

Upsert matches by name — existing accounts updated, new ones created.

**Important**: The bulk-upsert endpoint does NOT return individual resourceIds for created/updated accounts. After a successful bulk-upsert, you MUST re-fetch the full CoA via `GET /api/v1/chart-of-accounts` to collect the new resourceIds.

**CRITICAL: CoA code mapping — match by NAME, not code**:
- Pre-existing accounts may have different codes than your templates
- Example: "Cost of Goods Sold" = code 310 in the API, but code 5000 in template
- "Accounts Receivable" can have `code: null` in the API
- Always map template accounts to resource IDs via **name matching**, not code matching
- Resource IDs are the universal identifier, not codes
- When building lookup maps, key by BOTH `name` AND `code` for maximum compatibility:
```javascript
ctx.coaIds[acct.name] = acct.resourceId;
if (acct.code) ctx.coaIds[acct.code] = acct.resourceId;
```

### POST /api/v1/chart-of-accounts (Single Create)

```json
// Request:
{
  "name": "USD Bank Account",
  "currency": "USD",
  "classificationType": "Bank Accounts",
  "code": "91"
}

// Response:
{ "data": { "resourceId": "uuid" } }
```

Creates a single account. Unlike bulk-upsert, this returns the `resourceId` directly — no need to re-fetch.

**Key behaviors**:
- `classificationType` determines the account type (see mapping table below bulk-upsert). Using `"Bank Accounts"` creates an account that appears in the bank accounts list and can be used as `accountResourceId` in payments and cash entries.
- `currency` is optional. If omitted, defaults to the org's base currency. Pass a foreign currency code (e.g., `"USD"`) to create a **foreign-currency account** — useful for foreign-currency bank accounts.
- `code` is optional. If omitted, the system may auto-assign one (behavior varies).
- `name` must be unique within the organization — duplicate names return 409.
- **Alias**: `accountType` is accepted as an alias for `classificationType` (same as bulk-upsert).

**Creating a bank account**: Set `classificationType: "Bank Accounts"` and the account immediately becomes available as a bank account across the platform (payments, cash entries, bank records, reports).

### DELETE /api/v1/chart-of-accounts/:id

```json
// Response:
(empty body, 200 OK)
```

Deletes an account by `resourceId`. Returns 200 on success.

**Restrictions**:
- Cannot delete accounts with `controlFlag: true` (system accounts like Accounts Receivable, Accounts Payable) — returns 400.
- Cannot delete accounts that have been used in transactions — returns 400 with `"Account has transactions"`.
- Cannot delete locked accounts (`locked: true`) — returns 400.

---

## 3. Tax Profiles

### GET /api/v1/tax-profiles?limit=100&offset=0

```json
// Response:
{
  "totalElements": 10,
  "totalPages": 1,
  "data": [{
    "resourceId": "d8a5afbb-...",
    "taxTypeCode": "STANDARD_RATED_SUPPLIES",
    "displayName": "Standard-Rated Supplies (SR)",
    "vatValue": 9,
    "status": "ACTIVE"
  }]
}
```

READ-ONLY. Map `taxTypeCode` to `resourceId`. Never create.

SG defaults: SR (9%), TX (9%), OS (0%), ZR (0%), ES (0%), EP (0%), IM (9%), plus a few more.

---

## 4. Currencies

### GET /api/v1/organization/currencies

```json
// Response (flat):
{
  "totalElements": 2,
  "totalPages": 1,
  "data": [{
    "currencyCode": "SGD",
    "currencyName": "Singapore Dollar",
    "currencySymbol": "S$",
    "baseCurrency": true,
    "customRateCount": 0
  }, {
    "currencyCode": "USD",
    "currencyName": "US Dollar",
    "currencySymbol": "US$",
    "baseCurrency": false,
    "customRateCount": 3
  }]
}
```

**CRITICAL field names**: Response uses `currencyCode`, `currencyName`, `currencySymbol`, `baseCurrency`, `customRateCount` — NOT `code`/`name`/`symbol`. If you destructure with `{ code, name, symbol }` you get `undefined`. Always use the full prefixed names.

- `customRateCount` — number of org-level custom rates set for this currency (0 if none)
- `baseCurrency` — boolean, `true` for the org's base currency only

### POST /api/v1/organization/currencies

```json
// Request:
{ "currencies": ["USD", "EUR", "GBP"] }

// Response:
{ "data": { "resourceIds": ["uuid1", "uuid2", "uuid3"] } }
```

Enable currencies first, then set rates via the **separate** rate endpoints below.

**Gotchas**:
- Returns **400** if a currency is already enabled — `"Currency already exists"`. You cannot un-enable currencies from an org; this is a one-way operation.
- To check before enabling: `GET /organization/currencies` and check if the code is already in the list.
- Sending an empty array `{ "currencies": [] }` returns 400.

### Currency Rates — `/organization-currencies` (hyphenated path)

**CRITICAL path difference**: Enable uses `/organization/currencies` (nested). Rates use `/organization-currencies` (hyphenated). Using the wrong path returns 404.

#### POST /api/v1/organization-currencies/:currencyCode/rates

```json
// Request:
{ "rate": 0.74, "rateApplicableFrom": "2026-02-10" }

// Response:
{ "data": "Rate added successfully" }
// HTTP 201
```

**CRITICAL**: Response `data` is a **plain string** `"Rate added successfully"` — NOT a CurrencyRate object. You do NOT get back a `resourceId`. If you need the rate's `resourceId` (e.g., for later PUT/DELETE), you must follow up with `GET /organization-currencies/:code/rates` and match by `rateApplicableFrom` date.

**Required fields**:
- `rate` — positive number (must be > 0). Direction is **functionalToSource** (1 base = X foreign). Example for SGD org setting USD rate: `rate: 0.74` means 1 SGD = 0.74 USD. **If your data is sourceToFunctional (1 USD = 1.35 SGD), invert: `rate = 1 / yourRate`.**
- `rateApplicableFrom` — `YYYY-MM-DD` string (NOT ISO datetime — `"2026-02-10T00:00:00Z"` is rejected with "does not match 2006-01-02 format")

**Optional fields**:
- `rateApplicableTo` — `YYYY-MM-DD` string. Must be after `rateApplicableFrom` (422 `INVALID_DATE_RANGE` otherwise).

#### GET /api/v1/organization-currencies/:currencyCode/rates

```json
// Response:
{
  "data": {
    "totalElements": 12,
    "totalPages": 1,
    "data": [{
      "resourceId": "uuid",
      "rateFunctionalToSource": 0.74,
      "rateSourceToFunctional": 1.3514,
      "rateApplicableFrom": "2026-01-01",
      "rateApplicableTo": "2026-01-31",
      "sourceCurrencyCode": "USD",
      "functionalCurrencyCode": "SGD",
      "notes": { "date": "2026-01-01", "name": "Admin" }
    }]
  }
}
```

#### PUT /api/v1/organization-currencies/:currencyCode/rates/:resourceId

```json
// Request:
{ "rate": 0.71, "rateApplicableFrom": "2026-02-10" }

// Response:
{ "data": "Rate updated successfully" }
// HTTP 200
```

#### DELETE /api/v1/organization-currencies/:currencyCode/rates/:resourceId

```json
// Response:
{ "data": { "message": "Rate deleted successfully" } }
// HTTP 200
```

**Boundary behavior**:
- Base currency rates → 400: `"Cannot set rate for organization base currency"` (GET also 400: `"Cannot lookup rate for organization base currency"`)
- Invalid ISO code (e.g., `"XYZ"`) → 422: `"validation_error"` (vs 404 for valid-but-not-enabled codes)
- `rate: 0` or negative → 422: `"rate must be greater than 0"`
- Very small rates (e.g., `0.0001`) are accepted

---

## 5. Contacts

### GET /api/v1/contacts?limit=100&offset=0

```json
// Response item:
{
  "resourceId": "uuid",
  "name": "Sterling Enterprises",
  "billingName": "Sterling Enterprises",
  "customer": true,
  "supplier": false,
  "currency": "SGD",
  "phone": "+6591234567",
  "email": "accounts@sterling.sg",
  "taxNumber": "201812345A"
}
```

### POST /api/v1/contacts

```json
// Request:
{
  "name": "Sterling Enterprises",
  "billingName": "Sterling Enterprises",
  "customer": true,
  "supplier": false,
  "currency": "SGD",
  "phone": "+6591234567",
  "email": "accounts@sterling.sg",
  "taxNumber": "201812345A",
  "addressLine1": "100 Robinson Road",
  "addressLine2": "#08-01",
  "city": "Singapore",
  "postalCode": "068902",
  "countryCode": "SG"
}

// Response:
{ "data": { "resourceId": "uuid", ... } }
```

---

## 6. Items

### GET /api/v1/items?limit=100&offset=0

```json
// Response item (includes both canonical and alias names):
{
  "resourceId": "uuid",
  "internalName": "Premium Coffee Beans",
  "name": "Premium Coffee Beans",
  "itemCode": "PREM-COFFEE",
  "type": "PRODUCT",
  "status": "ACTIVE"
}
```

### POST /api/v1/items

`name` alias is accepted (resolves to `internalName`).

```json
// Request (either field name works):
{
  "itemCode": "PREM-COFFEE",
  "internalName": "Premium Coffee Beans",
  "type": "PRODUCT",
  "appliesToSale": true,
  "saleItemName": "Premium Coffee Beans",
  "salePrice": 45.00,
  "saleAccountResourceId": "uuid",
  "saleTaxProfileResourceId": "uuid",
  "appliesToPurchase": true,
  "purchaseItemName": "Premium Coffee Beans",
  "purchasePrice": 25.00,
  "purchaseAccountResourceId": "uuid",
  "purchaseTaxProfileResourceId": "uuid"
}

// Response:
{ "data": { "resourceId": "uuid", ... } }
```

---

## 7. Invoices

### POST /api/v1/invoices

```json
// Request:
{
  "contactResourceId": "uuid",
  "saveAsDraft": false,
  "reference": "INV-001",
  "valueDate": "2026-02-08",
  "dueDate": "2026-03-10",
  "currency": "SGD",
  "lineItems": [{
    "name": "Premium Coffee Beans x 50",
    "unitPrice": 45.00,
    "quantity": 50,
    "accountResourceId": "uuid",
    "taxProfileResourceId": "uuid",
    "itemResourceId": "uuid"
  }]
}

// Response:
{ "data": { "resourceId": "uuid", "reference": "INV-001" } }
```

**saveAsDraft**: Defaults to `false` — omitting it creates a finalized transaction. Sending `saveAsDraft: true` creates a draft.

**GET response note**: When fetching invoices via GET, line items use `organizationAccountResourceId` (not `accountResourceId`). POST uses `accountResourceId`. Request-side aliases resolve `issueDate` → `valueDate`, `bankAccountResourceId` → `accountResourceId`, etc.

**FX (foreign currency) invoices**: For invoices in a non-base currency, use the `currency` OBJECT form:
- **`currency: { sourceCurrency: "MYR" }`** — platform auto-fetches rate from ECB (FRANKFURTER). Response shows `rateSource: "EXTERNAL"`, `providerName: "FRANKFURTER"`.
- **`currency: { sourceCurrency: "MYR", exchangeRate: 3.15 }`** — custom rate. Response shows `rateSource: "INTERNAL_TRANSACTION"`, `providerName: "CUSTOM"`.
- **`currencyCode: "MYR"` (string) is SILENTLY IGNORED** — the invoice is created in the org's base currency (e.g., SGD) with rate 1:1. No error returned. This is a major gotcha.
- **`currency: "USD"` (string)** causes "Invalid request body" error (400).

**Rate hierarchy** (when using `currency: { sourceCurrency }` without `exchangeRate`):
1. Org-level rate (set via `/organization-currencies/:code/rates`) — auto-filled if exists
2. Platform rate (ECB via FRANKFURTER) — auto-fetched if no org rate
3. Transaction-level rate (via `exchangeRate` in the `currency` object) — overrides all

**Invoice payments**: `POST /invoices/{invoiceResourceId}/payments` works reliably as a standalone endpoint.

---

## 8. Bills

### POST /api/v1/bills

Same structure as invoices. All field names identical. FX currency rules also apply — use `currency` object form (see Section 7 FX notes).

**Bill payments**: The standalone `POST /bills/{id}/payments` endpoint was broken (nil pointer dereference in the API backend) — **fixed in backend PR #112**. Both standalone and embedded payment approaches now work. The embed-in-creation pattern remains a valid alternative:

```json
// Request — Bill with embedded payment:
{
  "contactResourceId": "uuid",
  "saveAsDraft": false,
  "reference": "BILL-001",
  "valueDate": "2026-02-08",
  "dueDate": "2026-03-10",
  "lineItems": [{
    "name": "Office Supplies",
    "unitPrice": 500.00,
    "quantity": 1,
    "accountResourceId": "uuid",
    "taxProfileResourceId": "uuid"
  }],
  "payments": [{
    "paymentAmount": 500.00,
    "transactionAmount": 500.00,
    "accountResourceId": "uuid-of-bank-account",
    "paymentMethod": "BANK_TRANSFER",
    "reference": "PAY-BILL-001",
    "valueDate": "2026-02-08"
  }]
}
```

The `payments` array uses the same 6-field structure as standalone payments. production clients uses embedded payments for bills.

**Note**: Bill payments do NOT support `TransactionFeeCollected` (model field missing). Only invoice payments support collected transaction fees.

### Withholding Tax on Line Items

Bills and supplier credit notes support withholding tax per line item:

```json
{
  "lineItems": [{
    "name": "Consulting services",
    "unitPrice": 10000,
    "quantity": 1,
    "accountResourceId": "expense-uuid",
    "withholdingTax": {
      "code": "WC010",
      "rate": 10,
      "description": "Professional fees"
    }
  }]
}
```

**Retry pattern**: If the organization doesn't support withholding tax, the API returns `WITHHOLDING_CODE_NOT_FOUND`. On this error, remove the `withholdingTax` field from all line items and retry the request.

---

## 9. Journals

### POST /api/v1/journals

```json
// Request:
{
  "saveAsDraft": false,
  "reference": "JV-001",
  "valueDate": "2026-02-08",
  "journalEntries": [
    { "accountResourceId": "uuid", "amount": 500, "type": "DEBIT", "contactResourceId": "uuid" },
    { "accountResourceId": "uuid", "amount": 500, "type": "CREDIT" }
  ]
}

// Response:
{ "data": { "resourceId": "uuid" } }
```

**CRITICAL corrections from live testing**:
- Each entry uses `amount` (number) + `type`: `"DEBIT"` or `"CREDIT"` (UPPERCASE strings)
- Do NOT use `debit`/`credit` as separate number fields — that is WRONG
- Do NOT include `currency` at top level — causes "Invalid request body"
- Total DEBIT amounts MUST equal total CREDIT amounts
- `contactResourceId` is optional per entry

---

## 10. Cash Entries

### POST /api/v1/cash-in-journals
### POST /api/v1/cash-out-journals

```json
// Request — Cash-In example:
{
  "saveAsDraft": false,
  "reference": "CI-001",
  "valueDate": "2026-02-08",
  "accountResourceId": "uuid-of-bank-account",
  "journalEntries": [
    { "accountResourceId": "uuid-of-revenue-account", "amount": 500, "type": "CREDIT" }
  ]
}

// Request — Cash-Out example:
{
  "saveAsDraft": false,
  "reference": "CO-001",
  "valueDate": "2026-02-08",
  "accountResourceId": "uuid-of-bank-account",
  "journalEntries": [
    { "accountResourceId": "uuid-of-expense-account", "amount": 300, "type": "DEBIT" }
  ]
}

// Response:
{ "data": { "resourceId": "uuid" } }
```

**CRITICAL corrections from live testing**:
- `saveAsDraft` is REQUIRED — omitting it causes validation failure
- `accountResourceId` at top level = the BANK account (NOT `bankAccountResourceId`)
- `journalEntries` array for the offset entries — same `amount` + `type` format as regular journals
- Do NOT use a flat structure with `amount`, `bankAccountResourceId`, `description` — that is WRONG
- The system auto-creates the bank-side entry; you only specify the offset entries in `journalEntries`
- For cash-in: offset entries are typically CREDIT (revenue/liability)
- For cash-out: offset entries are typically DEBIT (expense/asset)

### GET /api/v1/cash-in-journals (LIST)
### GET /api/v1/cash-out-journals (LIST)

```json
// Response (same for both):
{
  "totalElements": 523, "totalPages": 523,
  "data": [{
    "resourceId": "uuid-cashflow-txn",
    "businessTransactionResourceId": "uuid-journal",
    "parentEntityResourceId": "uuid-from-create",
    "transactionReference": "CI-UFK9WHE3",
    "transactionStatus": "ACTIVE",
    "totalAmount": 627.5,
    "valueDate": 1759881600000,
    "direction": "PAYIN",
    "businessTransactionType": "JOURNAL_DIRECT_CASH_IN",
    "currencyCode": "SGD", "currencySymbol": "S$",
    "organizationAccountResourceId": "uuid-bank",
    "account": { "name": "Business Bank Account", "resourceId": "uuid-bank", "accountType": "Bank Accounts" }
  }]
}
```

### GET /api/v1/cash-in-journals/:resourceId
### GET /api/v1/cash-out-journals/:resourceId

Same shape as list items, wrapped in `{ data: {...} }`. Use the `resourceId` from LIST (cashflow-transaction ID), NOT the CREATE-returned resourceId.

### PUT /api/v1/cash-in-journals/:resourceId
### PUT /api/v1/cash-out-journals/:resourceId

Same request body as POST. Use cashflow-transaction `resourceId` from LIST.

### DELETE /api/v1/cashflow-journals/:resourceId

Shared delete endpoint for ALL cash journal types (cash-in, cash-out, cash-transfer). Use the `parentEntityResourceId` from LIST (= the CREATE-returned resourceId). NOT the cashflow-transaction `resourceId`.

```json
// Response:
(empty body, 200 OK)
```

**CRITICAL ID gotcha (verified via live testing)**:
- CREATE returns `resourceId = A` (this is `parentEntityResourceId`)
- LIST returns `resourceId = B` (cashflow-transaction ID), `parentEntityResourceId = A`
- GET expects `B` (cashflow-transaction ID)
- DELETE expects `A` (parentEntityResourceId, via `/cashflow-journals/A`)
- `businessTransactionResourceId = C` (underlying journal ID) — do NOT use for any CRUD operation

---

## 11. Payments

### POST /api/v1/invoices/{invoiceResourceId}/payments (WORKS)
### POST /api/v1/bills/{billResourceId}/payments (FIXED in PR #112)

```json
// Request:
{
  "payments": [{
    "paymentAmount": 2250.00,
    "transactionAmount": 2250.00,
    "accountResourceId": "uuid-of-bank-account",
    "paymentMethod": "BANK_TRANSFER",
    "reference": "PAY-001",
    "valueDate": "2026-02-05"
  }]
}

// Response:
{ "data": { "resourceIds": ["uuid"] } }
```

**CRITICAL corrections from live testing** — payments require 6 fields:
- `paymentAmount` — NOT `amount`. The **bank account currency** amount (actual cash moved from bank).
- `transactionAmount` — The **transaction document currency (invoice/bill/credit note)** amount (applied to the balance). Equal to `paymentAmount` for same-currency. For cross-currency (e.g., USD invoice paid from SGD bank at 1.35): `paymentAmount: 1350` (SGD), `transactionAmount: 1000` (USD).
- `accountResourceId` — NOT `bankAccountResourceId`. This IS the bank account UUID.
- `paymentMethod` — required string: `"BANK_TRANSFER"` (other values may exist but this works universally)
- `reference` — payment reference string (required)
- `valueDate` — NOT `paymentDate`. ISO date string.

Always wrap in `{ payments: [...] }` even for single payment.

**Bill payments standalone endpoint**: Was broken (nil pointer dereference) — **fixed in backend PR #112**. Now works for basic payments. Embed-in-creation pattern also remains valid (see Section 8). production clients uses embedded payments for bills.

**TransactionFeeCollected**: NOT supported on bill payments (model field missing in the API backend). Only invoice payments support collected transaction fees.

---

## 12. Credit Notes

### POST /api/v1/customer-credit-notes
### POST /api/v1/supplier-credit-notes

```json
// Request (same structure for both):
{
  "contactResourceId": "uuid",
  "saveAsDraft": false,
  "reference": "CN-001",
  "valueDate": "2026-02-08",
  "lineItems": [{
    "name": "Return - Defective items",
    "unitPrice": 45.00,
    "quantity": 5,
    "accountResourceId": "uuid",
    "taxProfileResourceId": "uuid"
  }]
}

// Response:
{ "data": { "resourceId": "uuid" } }
```

### POST /api/v1/invoices/{invoiceResourceId}/credits

```json
// Request:
{
  "credits": [
    { "creditNoteResourceId": "uuid-of-credit-note", "amountApplied": 225.00 }
  ]
}
```

**CRITICAL corrections from live testing**:
- Wrap in `credits` array (NOT a flat object)
- Use `amountApplied` (NOT `amount`)
- Can apply multiple credit notes in one call by adding more entries to the array

---

## 13. Tags

### GET /api/v1/tags?limit=100&offset=0
### POST /api/v1/tags

`name` alias is accepted (resolves to `tagName`).

```json
// Request (either field name works):
{ "tagName": "Department: Sales" }
// or: { "name": "Department: Sales" }

// Response (includes both canonical and alias names):
{ "data": { "tagName": "Department: Sales", "name": "Department: Sales", "status": "ACTIVE", "resourceId": "uuid" } }
```

---

## 14. Custom Fields

### GET /api/v1/custom-fields?limit=100&offset=0
### POST /api/v1/custom-fields

```json
// Request (TEXT type):
{ "name": "PO Number", "type": "TEXT", "printOnDocuments": false }

// Request (DROPDOWN type with options):
{ "name": "Priority", "type": "DROPDOWN", "printOnDocuments": false, "options": ["Low", "Medium", "High"] }

// Request (DATE type):
{ "name": "Delivery Date", "type": "DATE", "printOnDocuments": true }

// Response (includes both canonical and alias names):
{ "data": { "customFieldName": "PO Number", "name": "PO Number", "status": "ACTIVE", "resourceId": "uuid" } }
```

**CRITICAL notes from live testing**:
- POST uses `name`, GET returns both `customFieldName` and `name`
- Valid `type` values: `"TEXT"`, `"DATE"`, `"DROPDOWN"` (UPPERCASE)
- `printOnDocuments` is REQUIRED — omitting it causes 400
- Do NOT send `appliesTo` field — causes "Invalid request body"
- Only send: `name`, `type`, `printOnDocuments` (and `options` for DROPDOWN)
- For DROPDOWN type, `options` array works (without `appliesTo`)

---

## 14b. Inventory Items

### POST /api/v1/inventory-items

```json
// Request:
{
  "internalName": "Widget A",
  "itemCode": "WDG-A",
  "unit": "pcs",
  "appliesToSale": true,
  "appliesToPurchase": true,
  "saleItemName": "Widget A",
  "salePrice": 50.00,
  "saleAccountResourceId": "uuid-operating-revenue",
  "saleTaxProfileResourceId": "uuid-tax",
  "purchaseItemName": "Widget A",
  "purchasePrice": 30.00,
  "purchaseAccountResourceId": "uuid-inventory-account",
  "purchaseTaxProfileResourceId": "uuid-tax",
  "costingMethod": "WAC",
  "cogsResourceId": "uuid-direct-costs",
  "blockInsufficientDeductions": false,
  "inventoryAccountResourceId": "uuid-inventory-account"
}

// Response:
{ "data": { "resourceId": "uuid" } }
```

**CRITICAL notes from live testing**:
- `unit` is REQUIRED (e.g., `"pcs"`, `"box"`, `"kg"`) — omitting causes ITEM_UNIT_EMPTY_ERROR
- `costingMethod` must be `"FIXED"` or `"WAC"` (NOT `"FIXED_COST"`)
- `purchaseAccountResourceId` MUST point to an Inventory-type CoA account (NOT Direct Costs) — wrong type causes INVALID_ACCOUNT_TYPE_INVENTORY
- `inventoryAccountResourceId` also must be Inventory-type
- Delete inventory items via `DELETE /items/:id` (NOT `/inventory-items/:id`)
- `GET /inventory-item-balance/:id` returns balance per item
- `GET /inventory-balances/:status` currently returns 500 (known bug)

---

## 14c. Cash Transfer Journals

### POST /api/v1/cash-transfer-journals

```json
// Request:
{
  "valueDate": "2026-02-09",
  "saveAsDraft": false,
  "reference": "XFER-001",
  "cashOut": { "accountResourceId": "uuid-from-bank", "amount": 500 },
  "cashIn": { "accountResourceId": "uuid-to-bank", "amount": 500 }
}

// Response:
{ "data": { "resourceId": "uuid" } }
```

**CRITICAL**: Uses `cashOut`/`cashIn` sub-objects — NOT `fromAccountResourceId`/`toAccountResourceId`/`amount` flat fields. Each sub-object has `accountResourceId` and `amount`. Must use TWO DIFFERENT bank accounts — same account for both fails.

### GET /api/v1/cash-transfer-journals (LIST)

Same cashflow-transaction response shape as cash-in/out list. `businessTransactionType` = `"JOURNAL_CASH_TRANSFER"`.

### GET /api/v1/cash-transfer-journals/:resourceId

Use cashflow-transaction `resourceId` from LIST. Returns same shape wrapped in `{ data: {...} }`.

**Cash transfers have NO update (PUT) endpoint.**

DELETE uses shared `/cashflow-journals/:id` with the CREATE-returned resourceId (= `parentEntityResourceId`).

---

## 14d. Credit Note Refunds

### POST /api/v1/customer-credit-notes/{id}/refunds

```json
// Request:
{
  "refunds": [{
    "refundAmount": 75.00,
    "refundMethod": "BANK_TRANSFER",
    "transactionAmount": 75.00,
    "accountResourceId": "uuid-bank",
    "reference": "REFUND-001",
    "valueDate": "2026-02-09"
  }]
}

// Response:
{ "data": { "resourceIds": ["uuid"] } }
```

**CRITICAL**: Uses `refunds` wrapper with `refundAmount`/`refundMethod` — NOT `payments` wrapper with `paymentAmount`/`paymentMethod`.

---

## 14e. Contact Groups

### POST /api/v1/contact-groups

```json
// Request:
{ "name": "VIP Clients", "description": "Top-tier customers" }

// Response:
{ "data": { "resourceId": "uuid" } }
```

**Known bug**: `PUT /contact-groups/:id` returns 500. Use create + delete as workaround.

---

## 14f. Organization Bookmarks

### POST /api/v1/organization/bookmarks

```json
// Request:
{
  "items": [{
    "name": "Company Policy",
    "value": "https://example.com/policy",
    "categoryCode": "GENERAL_INFORMATION",
    "datatypeCode": "LINK"
  }]
}

// Response:
{ "data": [{ "name": "Company Policy", "resourceId": "uuid" }] }
```

Valid `categoryCode`: `AUDIT_AND_ASSURANCE`, `BANKING_AND_FINANCE`, `BUDGETS_AND_CONTROLS`, `EMPLOYEES_AND_PAYROLL`, `EXTERNAL_DOCUMENTS`, `GENERAL_INFORMATION`, `OWNERS_AND_DIRECTORS`, `TAXATION_AND_COMPLIANCE`, `WORKFLOWS_AND_PROCESSES`.

Valid `datatypeCode`: `TEXT`, `NUMBER`, `BOOLEAN`, `DATE`, `LINK`.

---

## 14g. Jaz Magic — Extraction & Autofill

### POST /api/v1/magic/createBusinessTransactionFromAttachment

**When the user starts from an attachment (PDF, JPG, document image), this is the endpoint to use.** Do not manually parse files to construct `POST /invoices` or `POST /bills` — Jaz Magic handles the full extraction-and-autofill pipeline server-side: OCR, line item detection, contact matching, and CoA auto-mapping via ML learning. Creates a complete draft transaction with all fields pre-filled. Use `POST /invoices` or `POST /bills` only when building from structured data where the fields are already known.

Processing is **asynchronous** — the API response confirms file upload immediately. The extraction pipeline runs server-side and pushes status updates via Firebase Realtime Database.

**Supported document types:**
- `INVOICE` → creates a draft sale (response type: `SALE`)
- `BILL` → creates a draft purchase (response type: `PURCHASE`)
- `CUSTOMER_CREDIT_NOTE` → creates a draft customer CN (response type: `SALE_CREDIT_NOTE`)
- `SUPPLIER_CREDIT_NOTE` → creates a draft supplier CN (response type: `PURCHASE_CREDIT_NOTE`)

**Two modes** — content type depends on `sourceType`:

#### FILE mode (multipart/form-data) — most common

```
POST /api/v1/magic/createBusinessTransactionFromAttachment
Content-Type: multipart/form-data

Fields:
  - sourceFile: PDF or JPG file blob (NOT "file")
  - businessTransactionType: "INVOICE", "BILL", "CUSTOMER_CREDIT_NOTE", or "SUPPLIER_CREDIT_NOTE"
  - sourceType: "FILE"
```

```json
/ Response (201):
{
  "data": {
    "businessTransactionType": "PURCHASE",
    "filename": "NB64458.pdf",
    "invalidFiles": [],
    "validFiles": [{
      "workflowResourceId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
      "subscriptionFBPath": "magic_transactions/{orgId}/purchase/{fileId}",
      "errorCode": null,
      "errorMessage": null,
      "fileDetails": {
        "fileId": "6e999313b8b53ccef0757394ee6c7e6a",
        "fileType": "PDF",
        "fileURL": "https://s3.ap-southeast-1.amazonaws.com/.../{resourceId}.PDF",
        "fileName": "NB64458.pdf"
      }
    }]
  }
}
```

#### URL mode (application/json) — for remote files

```json
/ Request:
POST /api/v1/magic/createBusinessTransactionFromAttachment
Content-Type: application/json

{
  "businessTransactionType": "BILL",
  "sourceType": "URL",
  "sourceURL": "https://example.com/invoice.pdf"
}

/ Response: same shape as FILE mode
```

**What Jaz Magic extracts and autofills:**
- Line items (description, quantity, unit price, amounts)
- Contact name and details (matched against existing contacts)
- Chart of Accounts mapping (ML-based learning from past transactions)
- Tax amounts and profiles
- Document reference numbers, dates, currency

**Encrypted PDFs:** Magic cannot process password-protected PDFs. The CLI auto-detects and decrypts before upload:
- Embed password in filename: `receipt__pw__s3cRetP@ss.pdf` → decrypts with password `s3cRetP@ss`, uploads as `receipt.pdf`
- `__pw__` delimiter is case-insensitive; password is case-sensitive
- Requires `qpdf` installed (`brew install qpdf`)
- If no password in filename, CLI prompts interactively (or errors in `--json` mode with actionable rename instructions)

**Key gotchas:**
- `sourceFile` is the field name (NOT `file`) — same pattern as bank statement endpoint
- `EXPENSE` returns 422 — use one of the 4 valid types above
- Response maps types: `INVOICE` → `SALE`, `BILL` → `PURCHASE`, `CUSTOMER_CREDIT_NOTE` → `SALE_CREDIT_NOTE`, `SUPPLIER_CREDIT_NOTE` → `PURCHASE_CREDIT_NOTE`
- JSON body with `sourceType: "FILE"` always fails (400) — MUST use multipart
- `workflowResourceId` in `validFiles[]` is for tracking via `POST /magic/workflows/search`
- `subscriptionFBPath` is the Firebase path for real-time status updates
- All three fields (`sourceFile`/`sourceURL`, `businessTransactionType`, `sourceType`) are required — omitting any returns 422
- File types confirmed: PDF, JPG/JPEG, PNG, HEIC, XLS, XLSX, EML (max 1 MB)

---

### POST /api/v1/magic/workflows/search

Search across magic BT extraction workflows and bank statement imports. Use this to track the status of uploads and retrieve the created draft BT resource ID.

```json
/ Request:
POST /api/v1/magic/workflows/search
Content-Type: application/json

{
  "filter": {
    "resourceId": { "eq": "f47ac10b-58cc-4372-a567-0e02b2c3d479" },
    "documentType": ["SALE", "PURCHASE"],
    "status": ["COMPLETED"],
    "fileName": { "contains": "invoice" },
    "createdAt": { "gte": "2025-01-01", "lte": "2025-12-31" }
  },
  "limit": 20,
  "offset": 0,
  "sort": { "sortBy": ["createdAt"], "order": "DESC" }
}

/ Response (200):
{
  "data": [{
    "resourceId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "documentType": "SALE",
    "status": "COMPLETED",
    "fileName": "invoice.pdf",
    "fileType": "PDF",
    "fileUrl": "https://s3...",
    "fileId": "6e999313...",
    "createdAt": "2025-01-15",
    "updatedAt": "2025-01-15",
    "businessTransactionDetails": {
      "businessTransactionResourceId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "ocrJobType": "SYNC",
      "workflowStatus": "TRANSACTION_CREATED"
    }
  }],
  "totalElements": 1,
  "totalPages": 1
}
```

**Filter fields:**
- `resourceId`: StringExpression (eq, contains) — workflow ID from magic create response
- `documentType`: Array — SALE, PURCHASE, SALE_CREDIT_NOTE, PURCHASE_CREDIT_NOTE, BANK_STATEMENT
- `status`: Array — SUBMITTED, PROCESSING, COMPLETED, FAILED
- `fileName`: StringExpression — original uploaded filename
- `fileType`: Array — PDF, PNG, JPEG, JPG, HEIC, CSV, XLS, XLSX, EML
- `createdAt`: DateExpression (eq, gte, lte) — workflow creation date

**Workflow for agents:**
1. Upload via `POST /magic/createBusinessTransactionFromAttachment` → get `workflowResourceId`
2. Search with `filter.resourceId.eq` → check `status`
3. When `COMPLETED` → read `businessTransactionDetails.businessTransactionResourceId`
4. Use the BT resource ID with `GET /invoices/:id`, `GET /bills/:id`, `GET /customer-credit-notes/:id`, or `GET /supplier-credit-notes/:id`

### CLI: clio magic split — Merged PDF Splitting

Splits a merged PDF containing multiple documents (invoices, bills, credit notes) into individual files and uploads each to Magic. Uses structural PDF signals (bookmarks, page labels) + text heuristics (keywords, "Page 1 of N" patterns) for boundary detection. **No AI tokens used.**

```bash
# Auto-detect boundaries + upload
clio magic split --file merged.pdf --type bill

# Manual page ranges (for scanned PDFs or override)
clio magic split --file merged.pdf --type bill --pages "1-3,4-6,7-9"

# Dry-run: detect boundaries only (no qpdf needed)
clio magic split --file merged.pdf --type bill --dry-run

# JSON output (for agents)
clio magic split --file merged.pdf --type bill --dry-run --json
```

**Detection signals (score-based, threshold >= 50):**
- outline-bookmark (+80): PDF bookmark points to this page
- page-label-reset (+70): PDF page label restarts at "1"
- keyword in header (+40): Document keyword (INVOICE, BILL, etc.) in upper 40%
- page-one-of (+35): "Page 1 of N" pattern
- keyword-large (+25): Large font (>18pt) keyword bonus
- doc-ref (+20): Document reference (INV-001, SO-2024-100, etc.)
- continuation (-60): "Page N>1 of M" anti-signal
- continuation-text (-40): "Continued" anti-signal

**Edge cases:**
- Scanned PDFs (no extractable text): warns and requires `--pages` manual override
- Mixed scanned+digital: low confidence on scanned portions triggers confirmation prompt
- Single document detected: suggests `clio magic create` instead
- Encrypted PDFs: same `__pw__` pattern as `magic create`
- Requires `qpdf` for splitting (not needed for `--dry-run` auto-detect mode)

---

## 15. Bank Records

### POST /api/v1/magic/importBankStatementFromAttachment (multipart)

The only endpoint for creating bank records. Uses multipart form upload:

```
POST /api/v1/magic/importBankStatementFromAttachment
Content-Type: multipart/form-data

Fields:
  - sourceFile: CSV/OFX bank statement file (NOT "file")
  - accountResourceId: UUID of the bank account CoA entry (NOT "bankAccountResourceId")
  - businessTransactionType: "BANK_STATEMENT"
  - sourceType: "FILE" (valid values: URL, FILE)
```

CSV format: `Date,Description,Debit,Credit` — maps to Date, Description, Cash-out, Cash-in.

Multipart import is the more reliable method. Use it when JSON POST returns errors.

---

## 16. Schedulers

### POST /api/v1/scheduled/invoices

```json
// Request:
{
  "repeat": "MONTHLY",
  "startDate": "2026-03-01",
  "endDate": "2026-12-01",
  "invoice": {
    "contactResourceId": "uuid",
    "saveAsDraft": false,
    "reference": "SCH-INV-001",
    "valueDate": "2026-03-01",
    "dueDate": "2026-03-31",
    "lineItems": [{
      "name": "Monthly retainer",
      "unitPrice": 3000.00,
      "quantity": 1,
      "accountResourceId": "uuid",
      "taxProfileResourceId": "uuid"
    }]
  }
}
```

### POST /api/v1/scheduled/bills

Same but with `"bill"` wrapper instead of `"invoice"`.

### POST /api/v1/scheduled/journals

```json
// Request (FLAT structure — NOT nested in "journal" wrapper):
{
  "reference": "SCHED-JNL-001",
  "valueDate": "2026-03-01",
  "saveAsDraft": false,
  "schedulerEntries": [
    { "accountResourceId": "uuid", "amount": 100, "type": "DEBIT", "name": "Monthly accrual" },
    { "accountResourceId": "uuid", "amount": 100, "type": "CREDIT", "name": "Monthly accrual" }
  ],
  "repeat": "MONTHLY",
  "startDate": "2026-03-01",
  "endDate": "2026-12-01"
}

// Response:
{ "data": { "resourceId": "uuid" } }
```

**CRITICAL**: Scheduled journals use FLAT structure with `schedulerEntries` — NOT a nested `journal` wrapper like scheduled invoices/bills use `invoice`/`bill` wrapper. `reference`, `valueDate`, `saveAsDraft` are at top level alongside `repeat`/`startDate`/`endDate`.

**CRITICAL notes from live testing**:
- Recurrence field is `repeat` — NOT `frequency` or `interval`. Using `frequency` or `interval` silently defaults to ONE_TIME.
- Valid `repeat` values: `"WEEKLY"`, `"MONTHLY"`, `"QUARTERLY"`, `"YEARLY"`
- `saveAsDraft: false` is REQUIRED on the wrapped invoice/bill. Using `saveAsDraft: true` causes `INVALID_SALE_STATUS` (invoices) or `INVALID_PURCHASE_STATUS` (bills).
- Since `saveAsDraft: false`, every line item MUST have `accountResourceId`.
- Response uses `interval` field (not `repeat`): `{ "status": "ACTIVE", "interval": "MONTHLY", ... }`

---

## 17. Reports

### POST /api/v1/generate-reports/trial-balance

```json
// Request:
{ "startDate": "2025-11-10", "endDate": "2026-02-08" }
```

Both dates required.

### POST /api/v1/generate-reports/balance-sheet

```json
// Request:
{ "primarySnapshotDate": "2026-02-28" }
```

Uses `primarySnapshotDate` — NOT `endDate`. Optional: `secondarySnapshotDates` array for comparison periods.

### POST /api/v1/generate-reports/profit-and-loss

```json
// Request:
{ "primarySnapshotDate": "2026-02-28", "secondarySnapshotDate": "2026-01-01" }
```

Both `primarySnapshotDate` and `secondarySnapshotDate` required. NOT `startDate`/`endDate`.

### POST /api/v1/generate-reports/general-ledger

```json
// Request:
{ "startDate": "2026-01-01", "endDate": "2026-02-28", "groupBy": "ACCOUNT" }
```

`groupBy` is required. Valid values: `"ACCOUNT"`. Uses `startDate`/`endDate` like trial balance.

### POST /api/v1/generate-reports/cashflow

```json
{ "primaryStartDate": "2026-01-01", "primaryEndDate": "2026-02-28" }
```

Uses `primaryStartDate`/`primaryEndDate` — NOT `primarySnapshotDate`.

### POST /api/v1/generate-reports/cash-balance

```json
{ "reportDate": "2026-02-28" }
```

Single date field `reportDate`.

### POST /api/v1/generate-reports/ar-report
### POST /api/v1/generate-reports/ap-report

```json
{ "endDate": "2026-02-28" }
```

Single date field `endDate`.

### POST /api/v1/generate-reports/ar-summary-report
### POST /api/v1/generate-reports/ap-summary-report

```json
{ "startDate": "2026-01-01", "endDate": "2026-02-28" }
```

Both `startDate` and `endDate` required.

### POST /api/v1/generate-reports/bank-balance-summary

```json
{ "primarySnapshotDate": "2026-02-28" }
```

### POST /api/v1/generate-reports/equity-movement

```json
{ "primarySnapshotStartDate": "2026-01-01", "primarySnapshotEndDate": "2026-02-28" }
```

Uses `primarySnapshotStartDate`/`primarySnapshotEndDate` — yet another pair of field names.

### Data Exports

Data exports use SIMPLER field names than generate-reports:

| Export | Fields |
|--------|--------|
| `/data-exports/trial-balance` | `startDate`, `endDate` |
| `/data-exports/profit-and-loss` | `startDate`, `endDate` |
| `/data-exports/general-ledger` | `startDate`, `endDate`, `groupBy: "ACCOUNT"` |
| `/data-exports/ar-report` | `endDate` |

**Note**: P&L export uses `startDate`/`endDate` (NOT `primarySnapshotDate`/`secondarySnapshotDate` like generate-reports).

---

## 18. Cashflow Transactions Search

### POST /api/v1/cashflow-transactions/search

Searches across ALL cashflow transactions (invoices, bills, credit notes, journals, cash entries, payments). This is the unified transaction ledger.

```json
// Request:
{
  "filter": {
    "businessTransactionType": { "eq": "SALE" },
    "valueDate": { "gte": "2026-01-01" }
  },
  "sort": { "sortBy": ["valueDate"], "order": "DESC" },
  "limit": 100
}

// Response (flat, same as all other search endpoints):
{
  "totalElements": 1228,
  "totalPages": 13,
  "data": [{
      "resourceId": "uuid",
      "direction": "PAYIN",
      "totalAmount": 2250.00,
      "balanceAmount": 0,
      "grossAmount": 2250.00,
      "feeAmount": 0,
      "valueDate": 1706227200000,
      "matchDate": 1706313600000,
      "businessTransactionType": "SALE",
      "businessTransactionReference": "INV-001",
      "businessTransactionStatus": "POSTED",
      "currencyCode": "SGD",
      "currencySymbol": "S$",
      "functionalCurrencyCode": "SGD",
      "crossCurrency": false,
      "contact": { "name": "Acme Corp", "resourceId": "uuid" },
      "account": { "name": "Accounts Receivable", "resourceId": "uuid" },
      "organizationAccountResourceId": "uuid",
      "tags": ["Department: Sales"]
    }]
}
```

**Response shape**: Standard flat `{ totalElements, totalPages, data: [...] }` (same as all search/list endpoints).

**CRITICAL response dates**: `valueDate` and `matchDate` are `int64` epoch milliseconds (e.g., `1706227200000`), NOT `YYYY-MM-DD` strings. Convert: `new Date(epochMs).toISOString().slice(0, 10)`.

**Valid `businessTransactionType` values**: `SALE`, `PURCHASE`, `SALE_CREDIT_NOTE`, `PURCHASE_CREDIT_NOTE`, `JOURNAL_MANUAL`, `JOURNAL_DIRECT_CASH_IN`, `JOURNAL_DIRECT_CASH_OUT`, `JOURNAL_CASH_TRANSFER`, `FIXED_ASSET`.

**Valid `direction` values**: `PAYIN`, `PAYOUT`.

For full filter/sort field reference, see `references/search-reference.md` section 10.

---

## 19. Bank Records Search

### POST /api/v1/bank-records/:accountResourceId/search

Searches bank statement entries for a specific bank account. The `accountResourceId` path parameter is the UUID of a bank-type CoA account — find it via `POST /chart-of-accounts/search` with `{ "filter": { "accountType": { "eq": "Bank Accounts" } } }`.

```json
// Request:
{
  "filter": {
    "status": { "eq": "UNRECONCILED" },
    "valueDate": { "gte": "2026-01-01" }
  },
  "sort": { "sortBy": ["valueDate"], "order": "DESC" },
  "limit": 100
}

// Response:
{
  "totalElements": 280,
  "totalPages": 3,
  "data": [{
    "resourceId": "uuid",
    "description": "Payment from Acme Corp",
    "netAmount": 2500.00,
    "valueDate": 1706227200000,
    "status": "UNRECONCILED",
    "extContactName": "Acme Corp",
    "extReference": "TXN-12345",
    "extAccountNumber": "****1234"
  }]
}
```

**Valid `status` values**: `RECONCILED`, `UNRECONCILED`, `ARCHIVED`, `POSSIBLE_DUPLICATE`.

For full filter/sort field reference, see `references/search-reference.md` section 11.

---

## 20. Bank Records — JSON POST (Alternative)

### POST /api/v1/bank-records/:accountResourceId

In addition to multipart import (Section 15), bank records can be created via JSON POST:

```json
// Request:
{
  "records": [{
    "description": "Payment from client",
    "payerOrPayee": "Acme Corp",
    "reference": "TXN-001",
    "amount": 2500.00,
    "transactionDate": "2026-02-10",
    "metadata": []
  }]
}

// Response:
{ "data": { "resourceIds": ["uuid1"] } }
```

**Fields**:
- `records` (required): Array of 1-100 records
- `amount` (required): Positive = cash-in, negative = cash-out
- `transactionDate` (required): `YYYY-MM-DD` format
- `description`, `payerOrPayee`, `reference`: Optional strings (max 65536 chars)
- `metadata`: Optional array of `{ index, name, value }` objects (max 100)

**When to use**: JSON POST is best for programmatic creation. Multipart import (`POST /magic/importBankStatementFromAttachment`) is best for CSV/OFX file uploads.

---

## Advanced Search (POST /*/search)

All resources support `POST /api/v1/{resource}/search` with filter syntax. **For per-endpoint filter/sort field lists, see `references/search-reference.md`.**

### Request Example
```json
POST /api/v1/invoices/search
{
  "filter": {
    "status": { "eq": "UNPAID" },
    "valueDate": { "between": ["2026-01-01", "2026-12-31"] }
  },
  "sort": {
    "sortBy": ["valueDate"],
    "order": "DESC"
  },
  "limit": 100,
  "offset": 0
}
```

### Filter Operators
| Type | Operators |
|------|----------|
| String | `eq`, `neq`, `contains`, `in` (max 100), `reg` (max 100), `likeIn` (max 100), `isNull` |
| Numeric | `eq`, `gt`, `gte`, `lt`, `lte`, `in` (max 100) |
| Date | `eq`, `gt`, `gte`, `lt`, `lte`, `between` (exactly 2 YYYY-MM-DD values) |
| DateTime | Same as Date but RFC3339 format (for `createdAt`/`updatedAt`) |
| Boolean | `eq` |
| Logical | `and`, `or`, `not` (nested objects), `andGroup`, `orGroup` (arrays, invoices/bills/journals only) |

### Pagination
- `limit`: max 1000 per page (default 100)
- `offset`: skip N results (max 65536)
- `sort`: **REQUIRED when `offset` is present** (even `offset: 0`)
- Response includes `totalElements` and `totalPages`

---

## Catalogs (Experimental)

> Endpoint availability varies by organization. Use try/catch — if all requests fail, the endpoint may not be enabled.

### Create Catalog
POST /api/v1/catalogs
```json
{
  "name": "Premium Products",
  "itemResourceIds": ["uuid-1", "uuid-2"],
  "description": "Curated product catalog for VIP customers"
}
```

### Response
```json
{ "data": { "resourceId": "catalog-uuid" } }
```

---

## Deposits (Experimental)

> Endpoint availability varies by organization. Use try/catch.

### Create Deposit
POST /api/v1/deposits
```json
{
  "contactResourceId": "contact-uuid",
  "depositDate": "2026-02-01",
  "amount": 5000.00,
  "type": "AR",
  "bankAccountResourceId": "bank-account-uuid",
  "currencyCode": "SGD"
}
```

- `type`: `"AR"` (accounts receivable / customer deposit) or `"AP"` (accounts payable / supplier deposit)
- `depositDate`: YYYY-MM-DD format
- `bankAccountResourceId`: Must be a CoA entry with accountType "Bank Accounts"

### Response
```json
{ "data": { "resourceId": "deposit-uuid" } }
```

---

## Fixed Assets (Experimental)

> Endpoint availability varies by organization. Use try/catch.

### Create Fixed Asset
POST /api/v1/fixed-assets
```json
{
  "name": "Office Laptop - MacBook Pro",
  "purchaseDate": "2026-01-15",
  "purchaseCost": 3500.00,
  "depreciationMethod": "STRAIGHT_LINE",
  "usefulLifeMonths": 36,
  "depreciationStartDate": "2026-01-15",
  "assetAccountResourceId": "fixed-asset-coa-uuid",
  "depreciationAccountResourceId": "depreciation-coa-uuid",
  "expenseAccountResourceId": "expense-coa-uuid",
  "currencyCode": "SGD"
}
```

- `depreciationMethod`: `"STRAIGHT_LINE"` (uppercase)
- `usefulLifeMonths`: Integer
- `depreciationStartDate`: YYYY-MM-DD format (required — omitting causes "Invalid Depreciation date format" error). Typically same as `purchaseDate`.
- All three account fields must reference valid CoA entries

### Response
```json
{ "data": { "resourceId": "asset-uuid" } }
```

---

## Inventory Adjustments (Experimental)

> Endpoint availability varies by organization. Use try/catch.

### Create Adjustment
POST /api/v1/inventory/adjustments
```json
{
  "itemResourceId": "inventory-item-uuid",
  "quantity": 50,
  "adjustmentDate": "2026-02-01",
  "reason": "Initial stock count",
  "accountResourceId": "inventory-coa-uuid"
}
```

- `quantity`: Positive integer (adjustment amount)
- `adjustmentDate`: YYYY-MM-DD format
- `itemResourceId`: Must reference an inventory-type item (not service)

### Response
```json
{ "data": { "resourceId": "adjustment-uuid" } }
```

---

---

## Field Aliases (Create/Update Endpoints)

Middleware on create and update endpoints transparently maps alias field names to canonical names. Both forms are accepted — the alias is only applied if the canonical field is absent.

| Alias | Canonical | Endpoints |
|-------|-----------|-----------|
| `issueDate` | `valueDate` | Invoices, bills, credit notes, journals, cash entries, cash transfers, all scheduled create/update endpoints |
| `date` | `valueDate` | Same as above (including scheduled endpoints) |
| `paymentDate` | `valueDate` | Payments (invoice/bill payments) |
| `bankAccountResourceId` | `accountResourceId` | Payments |
| `paymentAmount` | `refundAmount` | Credit note refunds |
| `paymentMethod` | `refundMethod` | Credit note refunds |
| `name` | `tagName` | Tags (create, update) |
| `name` | `internalName` | Items (create) |
| `accountType` | `classificationType` | Chart of accounts (create, update, bulk-upsert) |
| `currencyCode` | `currency` | Chart of accounts bulk-upsert |

**Note**: Aliases apply only to POST/PUT request bodies. Search filter fields use their canonical names (e.g., `tagName` not `name` in `POST /tags/search`).

---

## Auto-Wrapping (NormalizeToArray)

Middleware on payment, credit, and refund endpoints automatically wraps a flat JSON object into an array. Both formats work:

| Endpoint | Array format (preferred) | Flat format (auto-wrapped) |
|----------|------------------------|---------------------------|
| `POST /invoices/:id/payments` | `{ "payments": [{...}] }` | `{ "paymentAmount": ..., ... }` → auto-wrapped to `{ "payments": [{...}] }` |
| `POST /bills/:id/payments` | `{ "payments": [{...}] }` | Same |
| `POST /invoices/:id/credits` | `{ "credits": [{...}] }` | Same |
| `POST /bills/:id/credits` | `{ "credits": [{...}] }` | Same |
| `POST /customer-credit-notes/:id/refunds` | `{ "refunds": [{...}] }` | Same |
| `POST /supplier-credit-notes/:id/refunds` | `{ "refunds": [{...}] }` | Same |

**Recommendation**: Always use the array format for clarity and consistency.

---

*Last updated: 2026-02-23 — Added: Account single create (POST /chart-of-accounts) and delete (DELETE /chart-of-accounts/:id). Currency list: added customRateCount field, field name gotcha (currencyCode NOT code). Currency enable: 400 on duplicate, one-way operation. Currency rate POST: string response gotcha (no resourceId returned).*
