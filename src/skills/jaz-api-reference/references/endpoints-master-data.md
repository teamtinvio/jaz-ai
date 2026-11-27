# Jaz API Endpoint Reference: Master Data

> Request/response examples for organization, transaction defaults (document numbering), chart of accounts, tax profiles, currencies and rates, contacts, items, tags, custom fields, inventory items and balances, contact groups, bookmarks, catalogs, nano classifiers.
> Base URL, auth, date format, pagination and status codes apply to every endpoint: see [endpoints.md](./endpoints.md), which also indexes every section.

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
    "country": "SG",
    "status": "ACTIVE",
    "lockDate": null
  }
}
```

Access org via `data` directly (single object). The API previously returned an array but now returns a single object. Use `Array.isArray(data) ? data[0] : data` to handle both formats. Check `lockDate`; don't seed transactions before it.

---

## 1b. Transaction Defaults

The defaults new documents of one transaction family start from (the app's Field Defaults, Document Defaults on quotes and orders). `{family}` is exactly the `type` of `GET /references/next`: `SALE` (invoices), `SALE_CREDIT_NOTE`, `PURCHASE` (bills), `PURCHASE_CREDIT_NOTE`, `JOURNAL_MANUAL`, `CLAIM`, `PAYRUN`, `SALE_QUOTE`, `SALE_ORDER`, `PURCHASE_REQUEST`, `PURCHASE_ORDER`. Fixed assets, deferrals, leases and loans have no readable defaults.

### GET /api/v1/transaction-defaults/{family}

```json
// GET /api/v1/transaction-defaults/SALE
{
  "data": {
    "family": "SALE",
    "numbering": { "prefix": "INV", "separator": "HYPHEN", "dateInclusion": "EXCLUDE", "seriesStart": "0001", "seriesOffset": 0 },
    "currency": "SGD",
    "dueDateTermDays": 30,
    "notes": "Thank you for your business.",
    "itemAccount": { "accountResourceId": "6b1f2c3d-...", "itemLevel": true },
    "itemTax": { "taxProfileResourceId": "0f9e8d7c-...", "taxInclusive": false, "itemLevel": true },
    "itemAttributes": { "discount": true, "quantity": true, "unit": true },
    "paymentSettings": { "accountResourceId": "9a8b7c6d-...", "paymentMethod": "BANK_TRANSFER" },
    "autoEnableEmail": false,
    "autoEnableEInvoice": false
  }
}
```

A field that does not apply to the family, or was never saved, is absent. No `numbering` means the family uses the built-in format; `GET /references/next` shows the number either way.

### PUT /api/v1/transaction-defaults/{family}

```json
// PUT /api/v1/transaction-defaults/SALE: change the prefix and the default term only
{ "numbering": { "prefix": "SI" }, "dueDateTermDays": 14 }
// Response: the family's defaults as the write stored them, same shape as GET.
```

- Partial at every level: a field left out, or sent as `null`, keeps its value (`numbering.prefix` alone keeps the separator, date and series start). An unknown field is a 400 naming it; a field that does not apply to the family is a 422 naming it.
- **One call per family.** The API reads the stored block before it writes, and that read can come from a replica a moment behind, so two updates of a family sent back to back can undo each other. Send every change for a family in one call.
- The next number is `prefix` + separator + (date + separator when `dateInclusion` is `INCLUDE`) + sequence, zero padded to the length of `seriesStart` (max 12). Sequence = `seriesStart` + documents already created in the family − `seriesOffset`, never below 1. Changing `seriesStart` alone does not restart the count: to make the next number N, send `seriesStart` N and `seriesOffset` = `lastCounter` from `GET /references/next`.
- Documents already created keep their numbers. The next document created (or `GET /references/next`) uses the new format at once.
- A family with no numbering of its own yet needs `prefix` and `separator` in the first numbering change (422 otherwise).
- Family-only fields: `dueDateTermDays` (SALE, PURCHASE, quotes, orders, requests; days after the document date, 0 = on delivery), `notes` (SALE, SALE_QUOTE, SALE_ORDER, PURCHASE_REQUEST, PURCHASE_ORDER; GET leaves it out elsewhere), `paymentSettings` (SALE, PURCHASE), `showAccountColumn` (quotes, orders, requests), `autoEnableEmail`, `autoEnableEInvoice`, and the order over-fulfilment and reference display toggles.
- `notes`, `internalNotes`, the resource IDs and `paymentSettings.paymentMethod` take `""` to clear. `currency` must be an active organization currency and cannot be cleared.
- **No tax** is `itemTax: { "itemLevel": false }` alone: it unsets `taxInclusive` and clears the tax profile, so neither can be sent with it. Sending `taxInclusive` sets `itemLevel` true; a tax profile needs `taxInclusive` set (stored or sent).
- `itemAccount` (every family but `JOURNAL_MANUAL`) is an active account that is not bank, cash or control. On quotes, orders and requests it is set only while `showAccountColumn` is true, and `showAccountColumn: false` clears it.
- `paymentSettings.accountResourceId` is a bank or cash account; with a method that moves no money through one (`CREDIT_CARD`, `E_WALLET`, `CLEARING_SETTLEMENT`, `DEBT_WRITE_OFF`, `INTER_COMPANY`, `WITHHOLDING_TAX_CERTIFICATE`, `OTHER`), also the creditable withholding tax account or any active non-control account. Checked against the method sent, else the stored one.
- A refused update is one 422 naming every problem; an update that changes nothing is a 400.

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
{ "data": { "resourceIds": ["uuid1", "uuid2"], "failedRows": [], "failedCount": 0 } }
```

A row with `resourceId` updates that account; a row without one creates an account. Names are unique per organization, and a name match does NOT update: a create whose name is already taken fails with `ORGANIZATION_CHART_OF_ACCOUNT_DUPLICATED`. The call is synchronous and partial: each failed row is in `failedRows[]` (`rowIndex`, `columnName`, `columnValue`, `errorCode`, `errorMessage`), the other rows still commit, and `resourceIds` holds one ID per row that succeeded. Read `failedRows` before treating the import as done (jaz-api rule 141).

**CRITICAL: CoA code mapping (match by NAME, not code)**:
- Pre-existing accounts may have different codes than your templates
- Example: "Cost of Goods Sold" = code 310 in the API, but code 5000 in template
- "Accounts Receivable" can have `code: null` in the API
- Always map template accounts to resource IDs via **name matching**, not code matching
- Resource IDs are the universal identifier, not codes
- Key lookup maps by `name` only. A template code can belong to a different account in the organization, so a code-keyed entry can resolve to the wrong ledger account:
```javascript
ctx.coaIds[acct.name] = acct.resourceId;
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

Creates a single account. Unlike bulk-upsert, this returns the `resourceId` directly, no need to re-fetch.

**Key behaviors**:
- `classificationType` determines the account type (see mapping table below bulk-upsert). Using `"Bank Accounts"` creates an account that appears in the bank accounts list and can be used as `accountResourceId` in payments and cash entries.
- `currency` is optional. If omitted, defaults to the org's base currency. Pass a foreign currency code (e.g., `"USD"`) to create a **foreign-currency account**, useful for foreign-currency bank accounts.
- `code` is optional. If omitted, the system may auto-assign one (behavior varies).
- `name` must be unique within the organization; duplicate names return 409.
- **Alias**: `accountType` is accepted as an alias for `classificationType` (same as bulk-upsert).

**Creating a bank account**: Set `classificationType: "Bank Accounts"` and the account immediately becomes available as a bank account across the platform (payments, cash entries, bank records, reports).

### DELETE /api/v1/chart-of-accounts/:id

```json
// Response:
(empty body, 200 OK)
```

Deletes an account by `resourceId`. Returns 200 on success.

**Restrictions**:
- Cannot delete accounts with `controlFlag: true` (system accounts like Accounts Receivable, Accounts Payable); returns 400.
- Cannot delete accounts that have been used in transactions; returns 400 with `"Account has transactions"`.
- Cannot delete locked accounts (`locked: true`); returns 400.

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

Map `taxTypeCode` to `resourceId`. SG defaults: SR (9%), TX (9%), OS (0%), ZR (0%), ES (0%), EP (0%), IM (9%), plus a few more.

### POST /api/v1/tax-profiles

```json
// Request:
{ "name": "GST 9%", "taxRate": 9, "taxTypeCode": "STANDARD_RATED_SUPPLIES" }
// Response:
{ "data": { "resourceId": "..." } }
```

Name must be unique (422 if duplicate). Agent tools auto-guard with search-before-create.

### POST /api/v1/tax-profiles/search

```json
// Request: filter by appliesTo for transaction type scoping:
{
  "filter": {
    "name": { "contains": "GST" },
    "appliesToPurchase": { "eq": true }
  },
  "limit": 10, "sort": { "sortBy": ["name"], "order": "ASC" }
}
```

Key filters: `appliesToSale`, `appliesToPurchase`, `appliesToSaleCreditNote`, `appliesToPurchaseCreditNote` (all BooleanExpression). Use to avoid picking a sales-only profile for a bill.

### POST /api/v1/filing-submissions/search

Tax return filings (PH BIR forms such as 2550Q, SG GST F5): period, due date, tax payable, lifecycle and payment status. Read only. Tool: `search_filing_submissions`; CLI: `clio filing-submissions search`.

```json
// Request:
{
  "filter": {
    "formType": { "eq": "2550Q" },
    "periodYear": { "eq": 2026 },
    "lifecycleStatus": { "in": ["READY_TO_FILE", "SENT_TO_CLIENT"] }
  },
  "sort": { "sortBy": ["filingDueDate"], "order": "ASC" },
  "limit": 100, "offset": 0
}
```

- Filter fields: `resourceId`, `organizationResourceId`, `formType`, `displayFilingGroupings`, `periodStartDate`, `periodEndDate`, `filingDueDate`, `periodType`, `periodYear`, `periodValue` (month 1-12 or quarter 1-4), `lifecycleStatus`, `paymentStatus`, `taxDueAmount`, `taxForm.categoryCode`, `taxType.categoryCode`, plus `and` / `or` / `andGroup` / `orGroup`. The filter decodes strictly: any other key is a 400.
- Sort fields: `resourceId`, `createdAt`, `updatedAt`, `formType`, `periodType`, `periodYear`, `periodValue`, `periodStartDate`, `periodEndDate`, `filingDueDate`, `lifecycleStatus`, `taxDueAmount`. Default `createdAt` DESC. Sort is required when `offset` is set.
- `limit` 1-1000, default 100. `offset` is treated as a 0-indexed PAGE number, the platform norm. Row vs page is NOT measured here: the orgs probed held 0 and 1 filings, and the handler passes `offset` through unchanged, which both page and row endpoints also do.
- Rows carry `taxForm { formType, formName, categoryCode, ... }`, `periodType`, `periodYear`, `periodStartDate`, `periodEndDate`, `filingDueDate`, `taxDueAmount` (a decimal STRING, e.g. `"-659.11"`), `lifecycleStatus`, `paymentStatus`, `filingMode`.

### PUT /api/v1/cash-in-entries/:parentEntityResourceId

```json
// Request: resourceId required in body, accountEntryResourceId auto-populated:
{ "resourceId": "<parentEntityResourceId>", "reference": "UPDATED-REF" }
// Response:
{ "data": { "resourceId": "..." } }
```

Same pattern for `PUT /cash-out-entries/:id`. URL uses `parentEntityResourceId` (from CREATE response). `accountEntryResourceId` is optional; API auto-populates from existing journal entry.

Measured 2026-09-24 (Global SG Demo): a reference-only PUT succeeds and keeps a taxed entry's tax. Any PUT carrying `internalNotes` returns **500**, on taxed and untaxed entries alike, and any PUT carrying `lines` on a taxed entry (or adding a tax profile to an untaxed one) returns **500**, with or without `saveAsDraft: false` / `taxInclusion`. A `lines` PUT on an untaxed entry succeeds. So a taxed cash entry's lines cannot currently be edited through the API: void it and create a new one.

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

**CRITICAL field names**: Response uses `currencyCode`, `currencyName`, `currencySymbol`, `baseCurrency`, `customRateCount`, NOT `code`/`name`/`symbol`. If you destructure with `{ code, name, symbol }` you get `undefined`. Always use the full prefixed names.

- `customRateCount`: number of org-level custom rates set for this currency (0 if none)
- `baseCurrency`: boolean, `true` for the org's base currency only

### POST /api/v1/organization/currencies

```json
// Request:
{ "currencies": ["USD", "EUR", "GBP"] }

// Response:
{ "data": { "resourceIds": ["uuid1", "uuid2", "uuid3"] } }
```

Enable currencies first, then set rates via the **separate** rate endpoints below.

**Gotchas**:
- Returns **400** if a currency is already enabled: `"Currency already exists"`. You cannot un-enable currencies from an org; this is a one-way operation.
- To check before enabling: `GET /organization/currencies` and check if the code is already in the list.
- Sending an empty array `{ "currencies": [] }` returns 400.

### Currency Rates: `/organization/currencies/:code/rates`

**Path note**: both enable and rates live under the nested `/organization/currencies` family. The older hyphenated `/organization-currencies/...` rate paths still resolve but are **superseded**. Use the nested form; do not rely on the hyphenated one being documented.

#### POST /api/v1/organization/currencies/:currencyCode/rates

```json
// Request:
{ "rate": 0.74, "rateApplicableFrom": "2026-02-10" }

// Response:
{ "data": "Rate added successfully" }
// HTTP 201
```

**CRITICAL**: Response `data` is a **plain string** `"Rate added successfully"`, NOT a CurrencyRate object. You do NOT get back a `resourceId`. If you need the rate's `resourceId` (e.g., for later PUT/DELETE), you must follow up with `GET /organization/currencies/:code/rates` and match by `rateApplicableFrom` date.

**Required fields**:
- `rate`: positive number (must be > 0). Direction is **functionalToSource** (1 base = X foreign). Example for SGD org setting USD rate: `rate: 0.74` means 1 SGD = 0.74 USD. **If your data is sourceToFunctional (1 USD = 1.35 SGD), invert: `rate = 1 / yourRate`.** You do not have to do this by hand: pass your figure as-is with `rateDirection` (`FUNCTIONAL_TO_SOURCE` | `SOURCE_TO_FUNCTIONAL`), which this endpoint accepts natively and applies server-side. Omitting it means `FUNCTIONAL_TO_SOURCE`. See SKILL.md Rule 49.
- `rateApplicableFrom`: `YYYY-MM-DD` string (NOT ISO datetime; `"2026-02-10T00:00:00Z"` is rejected with "does not match 2006-01-02 format")

**Optional fields**:
- `rateApplicableTo`: `YYYY-MM-DD` string. Must be after `rateApplicableFrom` (422 `INVALID_DATE_RANGE` otherwise).

#### GET /api/v1/organization/currencies/:currencyCode/rates

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

#### PUT /api/v1/organization/currencies/:currencyCode/rates/:resourceId

Takes the same optional `rateDirection` as the POST above, with the same `FUNCTIONAL_TO_SOURCE` default. Edit and add read a bare `rate` identically; supply the label to send an everyday quote verbatim.

```json
// Request:
{ "rate": 0.71, "rateApplicableFrom": "2026-02-10" }

// Response:
{ "data": "Rate updated successfully" }
// HTTP 200
```

#### DELETE /api/v1/organization/currencies/:currencyCode/rates/:resourceId

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

#### POST /api/v1/organization/currencies/rates/bulk-upsert

Create exchange rates in bulk (max 500). **Auto-enables currencies not yet enabled in the org.**

```json
// Request:
{
  "rates": [
    {
      "sourceCurrencyCode": "USD",
      "rate": 1.35,
      "rateDirection": "SOURCE_TO_FUNCTIONAL",
      "rateApplicableFrom": "2026-03-29"
    },
    {
      "sourceCurrencyCode": "EUR",
      "rate": 0.68,
      "rateDirection": "FUNCTIONAL_TO_SOURCE",
      "rateApplicableFrom": "2026-03-29",
      "rateApplicableTo": "2026-04-30"
    }
  ]
}

// Response:
{ "data": { "resourceId": null, "resourceIds": ["uuid1", "uuid2"] } }
```

`rateDirection` (SGD-base org, USD source): `FUNCTIONAL_TO_SOURCE` means the value is source-per-base: 1 SGD = 0.74 USD → send `0.74`. `SOURCE_TO_FUNCTIONAL` means base-per-source: 1 USD = 1.35 SGD → send `1.35` as-is, no inversion. All three rate endpoints (single add, single edit, bulk-upsert) accept the everyday quote this way; the difference here is that `rateDirection` is **required** on bulk-upsert and optional on the single-rate pair, where omitting it means `FUNCTIONAL_TO_SOURCE`. Unlike the single-rate POST endpoint, this returns `resourceIds` directly.

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

### GET /api/v1/contacts/{resourceId}/signals?btType=PURCHASE

The contact's usual values for one transaction type (`SALE`, `PURCHASE`, `SALE_CREDIT_NOTE`, `PURCHASE_CREDIT_NOTE`; required), from its posted transactions of the last 12 months (most recent 50). SKILL.md rule 138.

```json
// Response (cadence only for a regular contact; outstanding absent when nothing is open):
{ "data": {
  "sampleSize": 24, "signalQuality": "STABLE",
  "patterns": [
    {"field": "PAYMENT_TERMS", "value": "Net 30", "rawValue": "30", "matchCount": 23, "totalCount": 24, "confidence": 0.958},
    {"field": "TOP_COA", "value": "Office Supplies", "rawValue": "uuid", "matchCount": 30, "totalCount": 33, "confidence": 0.909}
  ],
  "cadence": {"medianIntervalDays": 30, "daysSinceLast": 34, "intervalRatio": 1.13, "lastDate": "2026-09-09", "nextExpectedDate": "2026-10-09"},
  "outstanding": {"totalAmount": "5400.00", "currencyCode": "SGD", "pastDueAmount": "0.00", "pastDueCount": 0,
                  "notYetDueAmount": "5400.00", "notYetDueCount": 2, "activeBillCount": 2}
} }
// No history of the type: sampleSize 0, patterns [], "severitySummary": {"dominantLabel": "NEW", "tone": "BLUE"}.
// Could not compute: "severitySummary": {"dominantLabel": "NO_ALERTS", "tone": "GRAY"}.
// No access to the Sales / Purchases module: 403 NOT_HAVE_ENOUGH_PERMISSION.
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

### POST /api/v1/items/bulk-upsert

Create or update items in bulk (max 500). Provide `resourceId` to update (partial: server merges with existing). Omit to create.

```json
// Request:
{
  "items": [
    {
      "itemCode": "BULK-001",
      "internalName": "Bulk Item",
      "appliesToSale": true,
      "saleItemName": "Bulk Item",
      "salePrice": 99.99
    },
    {
      "resourceId": "existing-uuid",
      "salePrice": 149.99
    }
  ]
}

// Response:
{ "data": { "resourceId": null, "resourceIds": ["uuid1", "uuid2"] } }
```

Create defaults: `status=ACTIVE`, `itemCategory=NON_INVENTORY`. Update: only send changed fields.

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
// Request (free-text field on invoices and bills):
{ "name": "PO Number", "printOnDocuments": false, "appliesTo": { "invoices": true, "bills": true } }

// Request (picklist of every customer):
{ "name": "Account Manager", "printOnDocuments": false, "format": "ALL_CUSTOMERS", "appliesTo": { "invoices": true } }

// Response:
{ "data": { "customFieldName": "PO Number", "name": "PO Number", "status": "ACTIVE", "resourceId": "uuid" } }
```

**CRITICAL notes (re-probed live 2026-09-02, correcting several earlier entries)**:
- **PUT works.** The 500 this file and SKILL.md rule 46 recorded is gone: a PUT returned 200 and applied the change. But it is a FULL REPLACE of `appliesTo` + `printOnDocuments`, and the GET returns `printOnDocuments` as null; the truth is in the `applyTo*` enum, where `PRINT` means it prints and `SHOW` means it does not. `updateCustomField` hydrates from that enum; a raw caller that omits `printOnDocuments` will silently turn printing off.
- POST uses `name`, GET returns both `customFieldName` and `name`
- `printOnDocuments` is REQUIRED and is not defaulted server-side; omitting it returns 422 `printOnDocuments is a required field` (recorded as a 400 before that). `create_custom_field` sends `false` when you omit it.
- **`appliesTo` WORKS and you should send it.** `{ invoices, bills, customerCredits, supplierCredits, payments }` sets the matching `applyTo*` response fields to `SHOW`. Omit it and every one stays `NULL`, i.e. the field appears on nothing. The previous "do NOT send appliesTo, causes Invalid request body" entry is wrong.
- **`format` is the only control over the KIND of field**, and the datatype is derived from it, not chosen: `CUSTOM` (default) yields `datatypeCode: TEXT`; any `ALL_*` value (`ALL_CUSTOMERS`, `ALL_SUPPLIERS`, `ALL_CONTACTS`, `ALL_EMPLOYEES`, `ALL_USERS`) yields `datatypeCode: LIST`, a picklist of that population.
- **There is no NUMBER, DATE or DROPDOWN custom field, and `type`/`fieldType`/`entityType`/`datatypeCode`/`options` are all silently dropped**: sent with a value, they return 200 and the field is created as plain TEXT. Verified by readback across five spellings; `datatypeCode: 12345` also returns 200, so the DTO does not declare it. `datatypeCode` on the response is derived and read-only; `format` is settable on POST **and** PUT (both verified 2026-09-02).

### GET /api/v1/custom-fields/:resourceId

Returns full custom field definition including `applyToSales`, `applyToPurchase`, `applyToCreditNote`, `applyToPayment`, `printOnDocuments`, `listOptions`, `datatypeCode`.

### POST /api/v1/custom-fields/search

```json
// Request:
{ "filter": { "customFieldName": { "contains": "PO" } }, "sort": { "sortBy": ["customFieldName"], "order": "ASC" }, "limit": 20, "offset": 0 }
```

### Setting Custom Field Values on Transactions

```json
// On invoice/bill/CN create or update: add at transaction level (NOT line item level):
{
  "valueDate": "2026-03-06",
  "contactResourceId": "...",
  "lineItems": [...],
  "customFields": [
    { "customFieldName": "PO Number", "actualValue": "PO-2026-001" },
    { "customFieldName": "Department", "actualValue": "Engineering" }
  ]
}
// Applies to: invoices, bills, customer credit notes, supplier credit notes
// Does NOT apply to: journals, cash entries, cash transfers
```

### Nano Classifiers on Line Items

```json
// On invoice/bill/CN line items: add classifierConfig per line item:
{
  "lineItems": [
    {
      "name": "Consulting Services",
      "quantity": 1,
      "unitPrice": 5000,
      "classifierConfig": [
        {
          "resourceId": "<nanoClassifierResourceId>",
          "type": "invoice",
          "selectedClasses": [{ "className": "Project Alpha", "resourceId": "<classResourceId>" }],
          "printable": true
        }
      ]
    }
  ]
}
// Create the nano classifier first: POST /api/v1/nano-classifiers (not a capsule type)
// Then reference it and its classes in classifierConfig on line items
```

---

## 14b. Inventory Items

### POST /api/v1/inventory-items

```json
// Request:
{
  "name": "Widget A",
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
  "blockInsufficientDeductions": false
}

// Response:
{ "data": { "resourceId": "uuid" } }
```

**CRITICAL notes from live testing**:
- Send `name`, not `internalName`. The endpoint declares no `name` property and marks `internalName` required, but the API populates `internalName` from the `name` you send (verified by readback 2026-09-02)
- `unit` is REQUIRED (e.g., `"pcs"`, `"box"`, `"kg"`); omitting causes ITEM_UNIT_EMPTY_ERROR
- `blockInsufficientDeductions` is REQUIRED and is NOT defaulted server-side; omitting it fails with "blockInsufficientDeductions is a required field"
- `costingMethod` must be `"FIXED"` or `"WAC"` (NOT `"FIXED_COST"`)
- `cogsResourceId` is required, and MUST point to a Direct Costs account; wrong type causes INVALID_ACCOUNT_TYPE_DIRECT_COST
- `purchaseAccountResourceId` MUST point to an Inventory-type CoA account (NOT Direct Costs); wrong type causes INVALID_ACCOUNT_TYPE_INVENTORY. An inventory purchase debits the asset; COGS is recognised on sale
- Because `cogsResourceId` is always required, so are `purchaseAccountResourceId`, `saleAccountResourceId`, `appliesToSale` and `appliesToPurchase`; the API reports them as "required if [cogsResourceId] is present", but that condition always holds
- `appliesToSale` and `appliesToPurchase` must both be `true`, not merely present: `false` returns APPLIES_TO_SALE_ERROR / APPLIES_TO_PURCHASE_ERROR, "must be true when cogs selected". An inventory-tracked item with COGS is necessarily both sale- and purchase-applicable
- There is no `inventoryAccountResourceId`; it appears in no request schema and a create succeeds without it
- Delete inventory items via `DELETE /items/:id` (NOT `/inventory-items/:id`)
- `GET /inventory-item-balance/:id` returns balance per item
- `GET /inventory-balances/:balanceStatus` lists balances across items; `balanceStatus` is `ALL`, `AVAILABLE` or `FULLY_DRAWN` (else 422). An empty result is a 404, which `list_inventory_balances` returns as `data: []`

---

## 14e. Contact Groups

### POST /api/v1/contact-groups

```json
// Request:
{ "name": "VIP Clients", "description": "Top-tier customers" }

// Response:
{ "data": { "resourceId": "uuid" } }
```

`PUT /contact-groups/:id` updates the group in place: re-probed live 2026-09-02, it answered 200 and applied the change (jaz-api rule 46). It used to answer 500. Do not delete and recreate a group, which gives it a new `resourceId`.

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

## Catalogs (Experimental)

> Endpoint availability varies by organization. Use try/catch; if all requests fail, the endpoint may not be enabled.

### Create Catalog
POST /api/v1/catalogs
```json
{
  "catalogName": "Premium Products",
  "items": [
    { "itemResourceId": "uuid-1", "itemName": "Premium Coffee Beans", "price": 45.00 },
    { "itemResourceId": "uuid-2", "itemName": "Cold Brew Kit", "price": 30.00 }
  ],
  "description": "Curated product catalog for VIP customers"
}
```

`catalogName` and `items` are required, and each item requires `itemResourceId`, `itemName` and `price` (`unit` is optional: none means the item's own unit).

### Response
201 with counts (`createdCatalogs`, `createdCatalogItems`), not a `resourceId`. Find the new catalog with `POST /catalogs/search` (the `search_catalogs` tool) by `catalogName` (jaz-api rule 46).

---

## Inventory (read-only balances, no adjustment write path)

> **There is no stock-adjustment endpoint at any spelling.** `POST /inventory/adjustments`,
> `/inventory-adjustments`, `/inventory-items/:id/adjustments` and
> `/items/:id/inventory-adjustments` all 404; none is registered. See `errors.md` →
> Inventory Adjustments Errors.

The complete inventory surface is three routes plus the item create/list pair:

| Method | Path | Notes |
|--------|------|-------|
| POST | `/api/v1/inventory-items` | Create an inventory-tracked item |
| GET | `/api/v1/inventory-items` | List inventory-tracked items |
| GET | `/api/v1/inventory-item-balance/:resourceId` | Balance for one item |
| GET | `/api/v1/inventory-balances/:balanceStatus` | Balances across items by status: `ALL`, `AVAILABLE`, `FULLY_DRAWN` (SKILL.md Rule 97) |

Stock moves only as a side effect of a transaction that carries the item (invoice, bill,
credit note). There is no direct quantity write.

---

## 20. Nano-Classifier CRUD

### POST /api/v1/nano-classifiers: Create

```json
// Request:
{
  "type": "Region",
  "classes": ["North", "South", "East", "West"],
  "printable": false
}

// Response:
{ "data": { "resourceId": "uuid" } }
```

**CRITICAL**: `classes` is a `string[]` (NOT `classNames`, NOT `[{className}]`). `printable` is required, defaults to `false`.

### GET /api/v1/nano-classifiers/{resourceId}: Double-wrapped response

```json
// Response (DOUBLE-WRAPPED):
{
  "data": {
    "data": [
      {
        "resourceId": "uuid",
        "type": "Region",
        "printable": false,
        "classes": [
          { "className": "North", "resourceId": "uuid-class-1" },
          { "className": "South", "resourceId": "uuid-class-2" }
        ]
      }
    ],
    "totalElements": 1,
    "totalPages": 1
  }
}
```

**CRITICAL**: GET single is double-wrapped: `{data: {data: [...], totalElements, totalPages}}`. Extract `res.data.data[0]` to get the classifier. Classes in response are objects (`{className, resourceId}`), not strings.
