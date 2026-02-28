# Jaz API Error Catalog

> Every error encountered during live testing against production Jaz API, with root cause and fix.
> Organized by endpoint. Use this to diagnose issues fast.

---

## Error Response Format

All Jaz API errors follow this shape:

```json
{
  "error": {
    "error_type": "validation_error",
    "errors": ["human-readable message"],
    "error_details": [{ "attribute_name": "fieldName", "error_message": "specific issue" }]
  }
}
```

Common `error_type` values:
| error_type | HTTP Status | Meaning |
|-----------|-------------|---------|
| `validation_error` | 422 | Required field missing or invalid value |
| `invalid_request_body` | 400 | Malformed JSON or unexpected structure |
| `not_found` | 404 | Resource or endpoint doesn't exist |
| `internal_server_error` | 500 | Server-side issue (may be transient) |
| `mutation_error` | 422 | GraphQL mutation rejected by platform backend (added in backend PR #112) |

---

## Chart of Accounts Errors

### "Account Classification Type not found" (400)
**Cause**: `classificationType` value doesn't match one of the 12 valid values.
**Wrong values we tried**: `"Revenue"`, `"REVENUE"`, `"revenue"`, `"INCOME"`, `"OPERATING_REVENUE"`, `"Sales"`, `"Asset"`, `"ASSET"`
**Fix**: Use the exact `accountType` values from GET response:
```
"Bank Accounts", "Cash", "Current Asset", "Current Liability", "Direct Costs",
"Fixed Asset", "Inventory", "Non-current Liability", "Operating Expense",
"Operating Revenue", "Other Revenue", "Shareholders Equity"
```
**Key insight**: `classificationType` in POST uses the same values as `accountType` from GET. NOT `accountClass` values (which are broader: Asset, Liability, Equity, Revenue, Expense).

### "ORGANIZATION_CHART_OF_ACCOUNT_DUPLICATED" (400)
**Cause**: Sending an account `name` that already exists in the org.
**Fix**: Fetch existing accounts first (`GET /chart-of-accounts`), skip names already present. Upsert matches by name — if you want to update an existing account, the name match handles it automatically.

### Wrong wrapper field
**Cause**: Using `{ chartOfAccounts: [...] }` instead of `{ accounts: [...] }`.
**Fix**: Body must be `{ "accounts": [...] }`.

### Wrong currency field
**Cause**: Using `currencyCode` instead of `currency` in the POST body.
**Fix**: Use `currency` (not `currencyCode`) even though GET returns `currencyCode`.

---

## Contact Errors

### "phone must be a valid E.164 formatted phone number" (422)
**Cause**: Phone number has spaces, dashes, or wrong digit count.
**Wrong**: `"+65 6234 5678"`, `"+63 2 8876 5432"`, `"6591234567"` (no +)
**Fix**: Strict E.164 — no spaces, no dashes, starts with `+`:
- SG landlines: `+65` + 8 digits → `"+6562345678"`
- SG mobile: `+65` + 8 digits → `"+6591234567"`
- PH mobile: `+63` + 10 digits → `"+639171234567"`
- PH landline: `+63` + 10 digits → `"+63288765432"` (area code included in 10 digits)
- US: `+1` + 10 digits → `"+12125550199"`
- If no valid phone, omit the field entirely (don't send empty string)

### "billingName is a required field" (422)
**Cause**: Missing `billingName` field in POST body.
**Fix**: Always include `billingName` — set it to same value as `name`.

---

## Tag Errors

### "tagName is a required field" (422)
**Cause**: Using an unrecognized field name in POST body.
**Fix**: POST body accepts either `{ "tagName": "Department: Sales" }` or `{ "name": "Department: Sales" }` (alias). Both work after the DX overhaul.

---

## Custom Field Errors

### "Invalid request body" (400) — missing printOnDocuments
**Cause**: Missing the required `printOnDocuments` field.
**Fix**: Always include `printOnDocuments: false` (or `true`) in POST body.
```json
{ "name": "PO Number", "type": "TEXT", "printOnDocuments": false }
```

### "Invalid request body" (400) — appliesTo field
**Cause**: Sending the `appliesTo` array field in the POST body.
**Fix**: Do NOT send `appliesTo` — it causes "Invalid request body". Only send: `name`, `type`, `printOnDocuments` (and `options` for DROPDOWN type).
```json
// WRONG:
{ "name": "PO Number", "type": "TEXT", "printOnDocuments": false, "appliesTo": ["INVOICE"] }

// CORRECT:
{ "name": "PO Number", "type": "TEXT", "printOnDocuments": false }
```
Valid `type` values: `"TEXT"`, `"DATE"`, `"DROPDOWN"` (UPPERCASE).

---

## Invoice / Bill Errors

### "lineItems[0].accountResourceId is required if [saveAsDraft] is false" (422)
**Cause**: `saveAsDraft` defaults to `false`. If omitted or explicitly `false`, line items must have `accountResourceId`.
**Fix**: Either:
1. Include `accountResourceId` on every line item (preferred — needs CoA resolved first)
2. Use `saveAsDraft: true` to create a draft (user finalizes)

### "contactResourceId is a required field" (422)
**Cause**: Missing contact reference.
**Fix**: Ensure the contacts step ran successfully and the template contact index maps to a created contact ID.

### Cascading failures from CoA
**Symptom**: Invoices/bills fail because `accountResourceId` couldn't be resolved.
**Root cause**: CoA step failed → items step failed → invoices/bills fail (no account to assign).
**Fix**: Ensure CoA step succeeds first. Key CoA IDs by both `name` AND `code` (templates reference by code like `"4000"`).

---

## Payment Errors

### Bill payments standalone endpoint — FIXED (PR #112)
**Was**: `POST /bills/{id}/payments` always returned 500 regardless of payload correctness.
**Root cause**: Nil pointer dereference in the API backend `mappings/bills.go` — the `TaxCurrency` nil check was outside the `TransactionFee != nil` guard. Any payment without transaction fees caused a panic.
**Fix**: Backend PR #112 moved the TaxCurrency check inside the nil guard, matching the working pattern in `invoices.go`.
**Status**: Standalone bill payments now work for basic payments. Embed-in-creation pattern remains a valid alternative.
**Note**: `TransactionFeeCollected` is NOT supported on bill payments (model field missing). Only invoice payments support collected fees.

### Various field errors (422) — payments require 6 specific fields
**Cause**: Using wrong field names. Common mistakes:
- `amount` instead of `paymentAmount`
- `paymentDate` instead of `valueDate`
- `bankAccountResourceId` instead of `accountResourceId`
- Missing `transactionAmount`, `paymentMethod`, or `reference`

**Fix**: Payments require ALL 6 fields:
```json
{ "payments": [{
  "paymentAmount": 100,
  "transactionAmount": 100,
  "accountResourceId": "bank-uuid",
  "paymentMethod": "BANK_TRANSFER",
  "reference": "PAY-001",
  "valueDate": "2026-02-08"
}] }
```

**Cross-currency**: `paymentAmount` = bank account currency (actual cash), `transactionAmount` = transaction document currency (invoice/bill/credit note — applied to balance). For same-currency, both equal. For FX (e.g., USD invoice, SGD bank at 1.35): `paymentAmount: 1350`, `transactionAmount: 1000`.

### INSUFFICIENT_BALANCE_ON_SALE (422) — FX payment field swap
**Cause**: Swapping `paymentAmount` and `transactionAmount` in cross-currency payments. If `transactionAmount` exceeds the invoice balance, this error is thrown.
**Fix**: `transactionAmount` = transaction document currency amount (invoice/bill/credit note — must not exceed balance). `paymentAmount` = bank currency amount (the cash).
```json
// WRONG — transactionAmount (1350) exceeds USD invoice balance (1000):
{ "paymentAmount": 1000, "transactionAmount": 1350, ... }

// CORRECT — transactionAmount (1000) matches USD invoice, paymentAmount (1350) is SGD cash:
{ "paymentAmount": 1350, "transactionAmount": 1000, ... }
```

### Missing array wrapper
**Cause**: Sending flat payment object instead of wrapped in `payments` array.
**Fix**: Always wrap: `{ "payments": [{ ... }] }` — even for a single payment.

---

## Currency Errors

### 404 on rate endpoints — WRONG PATH (common mistake)
**Cause**: Using `/organization/currencies` (nested) instead of `/organization-currencies` (hyphenated) for rate endpoints.
**Endpoints that 404 (wrong paths)**:
- `/api/v1/organization/currencies/rates` → 404
- `/api/v1/organization/currencies/USD/rate` → 404
- `/api/v1/organization/currencies/{id}/rate` → 404
**Fix**: Rate endpoints use the **hyphenated** path `/organization-currencies` (NOT `/organization/currencies`):
```
POST   /api/v1/organization-currencies/:currencyCode/rates          Set rate
GET    /api/v1/organization-currencies/:currencyCode/rates          List rates
GET    /api/v1/organization-currencies/:currencyCode/rates/:id      Get rate
PUT    /api/v1/organization-currencies/:currencyCode/rates/:id      Update rate
DELETE /api/v1/organization-currencies/:currencyCode/rates/:id      Delete rate
```
Enable currencies first via `POST /organization/currencies`, then set rates via `/organization-currencies/:code/rates`.

### "Cannot set rate for organization base currency" (400)
**Cause**: Trying to POST/PUT a rate for the org's base currency (e.g., SGD for a Singapore org).
**Fix**: Only set rates for non-base currencies. GET also returns 400: `"Cannot lookup rate for organization base currency"`.

### "rate must be greater than 0" (422)
**Cause**: Sending `rate: 0` or a negative rate.
**Fix**: Rate must be a positive number (> 0). Very small values like `0.0001` are accepted.

### "rateApplicableFrom does not match the 2006-01-02 format" (422)
**Cause**: Using ISO datetime (e.g., `"2026-02-10T00:00:00Z"`) instead of date-only format.
**Fix**: Use `YYYY-MM-DD` format only: `"rateApplicableFrom": "2026-02-10"`.

### "Invalid date range" / INVALID_DATE_RANGE (422)
**Cause**: `rateApplicableTo` is before `rateApplicableFrom`.
**Fix**: Ensure `rateApplicableTo` is after `rateApplicableFrom`, or omit `rateApplicableTo` entirely.

### Rates appear inverted (wrong direction)
**Cause**: POSTing a sourceToFunctional rate (1 foreign = X base) as the `rate` field, which expects functionalToSource (1 base = X foreign).
**Symptom**: UI shows "1 SGD = 0.0088 JPY" instead of "1 SGD ≈ 111 JPY" — the reciprocal of what you intended.
**Fix**: Invert before POSTing: `rate = 1 / yourRate`. If your data says "1 JPY = 0.009 SGD", POST `rate: 111.11`.

### Wrong body format for enabling
**Cause**: Using `{ currencyCode: "USD" }` instead of array format.
**Fix**: `{ "currencies": ["USD", "EUR"] }` — array of ISO code strings.

---

## FX (Foreign Currency) Errors

### `currencyCode` string silently ignored (NO ERROR — major gotcha)
**Cause**: Using `currencyCode: "MYR"` (string) on invoice/bill creation for a foreign currency transaction.
**Behavior**: The API returns 201 (success!) but **silently ignores** the `currencyCode` field. The invoice is created in the org's base currency (e.g., SGD) with rate 1:1. No error is returned.
**Fix**: MUST use the `currency` OBJECT form:
```json
// WRONG — silently ignored, invoice created in base currency (SGD):
{ "contactResourceId": "uuid", "currencyCode": "MYR", "lineItems": [...] }

// WRONG — string causes "Invalid request body" (400):
{ "contactResourceId": "uuid", "currency": "MYR", "lineItems": [...] }

// CORRECT — object form, platform auto-fetches ECB rate:
{ "contactResourceId": "uuid", "currency": { "sourceCurrency": "MYR" }, "lineItems": [...] }

// CORRECT — object form with custom rate:
{ "contactResourceId": "uuid", "currency": { "sourceCurrency": "MYR", "exchangeRate": 3.15 }, "lineItems": [...] }
```

**Rate sources in response** (inspect `currencyExchange.rateSource`):
- `rateSource: "EXTERNAL"`, `providerName: "FRANKFURTER"` — auto-fetched from ECB
- `rateSource: "INTERNAL_TRANSACTION"`, `providerName: "CUSTOM"` — user-specified `exchangeRate`
- `rateSource: "INTERNAL_ORG"` — org-level rate (set via `/organization-currencies/:code/rates`)

### "Invalid request body" (400) — `currency` as string
**Cause**: Using `currency: "USD"` (string) instead of object form.
**Fix**: Use object form `currency: { sourceCurrency: "USD" }` or `currency: { sourceCurrency: "USD", exchangeRate: 1.35 }`.

---

## Date Format Errors

### "does not match 2006-01-02 format" (422) — wrong date format on bill payments
**Cause**: Sending ISO datetime (e.g., `"2026-02-08T00:00:00Z"`) or epoch milliseconds instead of `YYYY-MM-DD`.
**Fix**: All dates must be `YYYY-MM-DD` strings (e.g., `"2026-02-08"`).
```json
// WRONG:
{ "valueDate": "2026-02-08T00:00:00Z" }    // ISO datetime rejected
{ "valueDate": 1770508800000 }              // epoch ms rejected

// CORRECT:
{ "valueDate": "2026-02-08" }               // YYYY-MM-DD string
```

**Note**: The OAS may declare some date fields as `integer/int64` (e.g., cash journals), but `YYYY-MM-DD` strings work in practice. production clients sends all dates as `YYYY-MM-DD` via Python `date` type.

---

## CoA Code Mapping Errors

### Account lookup fails because codes don't match template
**Cause**: Pre-existing accounts may have different codes than templates. For example:
- "Cost of Goods Sold" = code 310 in the API, but code 5000 in template
- "Accounts Receivable" = `code: null` in the API
**Fix**: Map template accounts to resource IDs via **name matching**, not code matching. Resource IDs are the universal identifier.
```typescript
// Build map keyed by BOTH name and code:
ctx.coaIds[acct.name] = acct.resourceId;
if (acct.code) ctx.coaIds[acct.code] = acct.resourceId;
```

---

## Scheduler Errors

### "bill.saveAsDraft is a required field" (422) / "invoice.saveAsDraft is a required field"
**Cause**: Transaction data sent flat instead of wrapped in type key.
**Wrong**:
```json
{ "repeat": "MONTHLY", "startDate": "...", "contactResourceId": "...", "saveAsDraft": false }
```
**Fix**: Wrap in `invoice` or `bill` key:
```json
{ "repeat": "MONTHLY", "startDate": "...", "invoice": { "contactResourceId": "...", "saveAsDraft": false, ... } }
```

### INVALID_SALE_STATUS (422) / INVALID_PURCHASE_STATUS (422)
**Cause**: Scheduled invoice/bill has `saveAsDraft: true` on the wrapped document.
**Fix**: Scheduled transactions MUST use `saveAsDraft: false`. This means every line item needs `accountResourceId`.
```json
// WRONG — causes INVALID_SALE_STATUS:
{ "repeat": "MONTHLY", "invoice": { "saveAsDraft": true, ... } }

// CORRECT:
{ "repeat": "MONTHLY", "invoice": { "saveAsDraft": false, "lineItems": [{ "accountResourceId": "uuid", ... }] } }
```

### Scheduler defaults to ONE_TIME
**Cause**: Using `frequency` or `interval` instead of `repeat` for the recurrence field.
**Fix**: The creation field is `repeat` (NOT `frequency` or `interval`). Both `frequency` and `interval` are silently ignored, defaulting to ONE_TIME.
```json
// WRONG — creates ONE_TIME schedule:
{ "frequency": "MONTHLY", ... }
{ "interval": "MONTHLY", ... }

// CORRECT — creates MONTHLY schedule:
{ "repeat": "MONTHLY", ... }
```

---

## Bank Record Errors

### No JSON POST endpoint exists
There is no JSON POST endpoint for creating bank records. Use multipart import:

**Workaround**: Use multipart import instead:
```
POST /api/v1/magic/importBankStatementFromAttachment
Content-Type: multipart/form-data

Fields:
  - sourceFile: CSV/OFX bank statement file (NOT "file")
  - accountResourceId: UUID of the bank account CoA entry (NOT "bankAccountResourceId")
  - businessTransactionType: "BANK_STATEMENT"
  - sourceType: "FILE" (valid values: URL, FILE)
```

Production clients use this multipart endpoint exclusively. Multipart import is the more reliable method.

**Legacy guidance** (still valid for general bank record handling):
1. Always use `Math.abs()` on amounts — amounts must be positive
2. Use `type: "CREDIT"` or `type: "DEBIT"` to indicate direction
3. Check that `bankAccountResourceId` is a valid CoA entry with `accountType: "Bank Accounts"`

---

## Report Errors

### "endDate is a required field" (422) — trial balance
**Cause**: Missing `endDate` in trial balance request.
**Fix**: Always include both `startDate` and `endDate`:
```json
{ "startDate": "2025-11-10", "endDate": "2026-02-08" }
```

### "primarySnapshotDate is a required field" (422) — balance sheet
**Cause**: Using `endDate` instead of `primarySnapshotDate` for balance sheet.
**Fix**: Balance sheet uses `primarySnapshotDate`:
```json
{ "primarySnapshotDate": "2026-02-28" }
```

### "primarySnapshotDate / secondarySnapshotDate is a required field" (422) — P&L
**Cause**: Using `startDate`/`endDate` instead of snapshot dates for profit & loss.
**Fix**: P&L uses `primarySnapshotDate` and `secondarySnapshotDate`:
```json
{ "primarySnapshotDate": "2026-02-28", "secondarySnapshotDate": "2026-01-01" }
```

### "groupBy is a required field" (422) — general ledger
**Cause**: Missing required `groupBy` field.
**Fix**: Include `groupBy: "ACCOUNT"` along with date fields:
```json
{ "startDate": "2026-01-01", "endDate": "2026-02-28", "groupBy": "ACCOUNT" }
```

### "primaryStartDate / primaryEndDate is a required field" (422) — cashflow
**Cause**: Using `primarySnapshotDate` or `startDate`/`endDate` for cashflow report.
**Fix**: Cashflow uses `primaryStartDate`/`primaryEndDate`:
```json
{ "primaryStartDate": "2026-01-01", "primaryEndDate": "2026-02-28" }
```

### "reportDate is a required field" (422) — cash-balance
**Cause**: Using `startDate`/`endDate` for cash-balance report.
**Fix**: Cash-balance uses single `reportDate` field:
```json
{ "reportDate": "2026-02-28" }
```

### "endDate is a required field" (422) — ar-report / ap-report
**Cause**: Using `primarySnapshotDate` for AR/AP reports.
**Fix**: AR/AP reports use `endDate`:
```json
{ "endDate": "2026-02-28" }
```

### "startDate is a required field" (422) — ar-summary / ap-summary
**Cause**: Missing `startDate` for summary reports.
**Fix**: AR/AP summary reports use `startDate` + `endDate`:
```json
{ "startDate": "2026-01-01", "endDate": "2026-02-28" }
```

### "primarySnapshotStartDate / primarySnapshotEndDate is a required field" (422) — equity-movement
**Cause**: Using other date field names for equity movement report.
**Fix**: Equity movement uses `primarySnapshotStartDate`/`primarySnapshotEndDate`:
```json
{ "primarySnapshotStartDate": "2026-01-01", "primarySnapshotEndDate": "2026-02-28" }
```

### Data export field names differ from generate-reports
**Cause**: Assuming data exports use the same field names as generate-reports.
**Fix**: Data exports generally use simpler names: P&L export uses `startDate`/`endDate` (NOT `primarySnapshotDate`/`secondarySnapshotDate`). AR export uses `endDate`.

---

## Item Errors

### "appliesToSale is required if [salePrice saleAccountResourceId saleTaxProfile] is present" (422)
**Cause**: Missing `appliesToSale: true` when sale-related fields are set.
**Fix**: When creating items with sale fields, MUST include `appliesToSale: true` AND `saleItemName`.
```json
// WRONG — missing appliesToSale and saleItemName:
{ "internalName": "Widget", "salePrice": 25.00, "saleAccountResourceId": "uuid" }

// CORRECT:
{ "internalName": "Widget", "itemCode": "WDG-001", "appliesToSale": true, "saleItemName": "Widget", "salePrice": 25.00, "saleAccountResourceId": "uuid" }
```
Same pattern for purchase side: `appliesToPurchase: true` + `purchaseItemName` required when purchase fields present.

### "itemCode is a required field" (422)
**Cause**: Missing `itemCode` in item creation.
**Fix**: `itemCode` is always required. It's the unique SKU/code for the item.

### POST /items/search — now available
`POST /items/search` is now available with the standard search filter syntax. Previously returned 404.

### "CoA ref 'XXXX' not found"
**Cause**: Template references CoA account by code (e.g., `"4000"`) but the lookup map only has entries keyed by name.
**Fix**: When building CoA ID maps, key by BOTH `name` AND `code`:
```typescript
ctx.coaIds[acct.name] = acct.resourceId;
if (acct.code) ctx.coaIds[acct.code] = acct.resourceId;
```

---

## Inventory Item Errors

### ITEM_UNIT_EMPTY_ERROR (422)
**Cause**: Missing `unit` field on inventory item creation.
**Fix**: Include `unit` (string, e.g., `"pcs"`, `"box"`, `"kg"`). The field is `unit` (NOT `itemUnit`, `unitName`, or `measurementUnit`).

### "costingMethod must be one of [FIXED WAC]" (422)
**Cause**: Invalid costing method value.
**Fix**: Must be `"FIXED"` or `"WAC"` (NOT `"FIXED_COST"` or `"AVERAGE"`).

### INVALID_ACCOUNT_TYPE_INVENTORY (422)
**Cause**: `purchaseAccountResourceId` (or another account field) points to a non-Inventory CoA account.
**Fix**: For inventory items, `purchaseAccountResourceId` MUST point to a CoA account with `accountType: "Inventory"` (NOT Direct Costs). Check CoA accounts via `GET /chart-of-accounts` and find one with `accountType: "Inventory"`.

### INVALID_COST_PRICE (422)
**Cause**: Using `costingMethod: "FIXED"` — the FIXED method requires a valid cost price but the exact field name is not documented.
**Fix**: Use `costingMethod: "WAC"` (Weighted Average Cost) which works without specifying a cost price upfront.

---

## Cash Transfer Errors

### "cashOut is a required field" / "cashIn is a required field" (422)
**Cause**: Using flat fields `fromAccountResourceId`/`toAccountResourceId`/`amount` instead of sub-objects.
**Fix**: Cash transfers use `cashOut`/`cashIn` sub-objects:
```json
// WRONG:
{ "fromAccountResourceId": "uuid", "toAccountResourceId": "uuid", "amount": 500 }

// CORRECT:
{ "cashOut": { "accountResourceId": "uuid-from", "amount": 500 }, "cashIn": { "accountResourceId": "uuid-to", "amount": 500 } }
```

---

## Credit Note Refund Errors

### "refunds is a required field" (422)
**Cause**: Using `payments` wrapper instead of `refunds`.
**Fix**: CN refunds use `refunds` wrapper (NOT `payments`):
```json
// WRONG:
{ "payments": [{ "paymentAmount": 75, "paymentMethod": "BANK_TRANSFER", ... }] }

// CORRECT:
{ "refunds": [{ "refundAmount": 75, "refundMethod": "BANK_TRANSFER", "transactionAmount": 75, "accountResourceId": "uuid-bank", "reference": "REF-001", "valueDate": "2026-02-09" }] }
```

### "refunds[0].refundAmount / refundMethod is a required field" (422)
**Cause**: Using `paymentAmount`/`paymentMethod` instead of `refundAmount`/`refundMethod`.
**Fix**: Use `refundAmount` and `refundMethod` (NOT `paymentAmount`/`paymentMethod`).

---

## Bookmark Errors

### "items is a required field" (422)
**Cause**: Sending flat `name`/`url` instead of `items` array wrapper.
**Fix**: Bookmarks use `items` array:
```json
// WRONG:
{ "name": "My Bookmark", "url": "https://example.com" }

// CORRECT:
{ "items": [{ "name": "My Bookmark", "value": "https://example.com", "categoryCode": "GENERAL_INFORMATION", "datatypeCode": "LINK" }] }
```

### "items[0].categoryCode must be one of [...]" (422)
**Cause**: Invalid category code value.
**Fix**: Must be one of: `AUDIT_AND_ASSURANCE`, `BANKING_AND_FINANCE`, `BUDGETS_AND_CONTROLS`, `EMPLOYEES_AND_PAYROLL`, `EXTERNAL_DOCUMENTS`, `GENERAL_INFORMATION`, `OWNERS_AND_DIRECTORS`, `TAXATION_AND_COMPLIANCE`, `WORKFLOWS_AND_PROCESSES`.

### "items[0].datatypeCode must be one of [...]" (422)
**Cause**: Invalid datatype code.
**Fix**: Must be one of: `TEXT`, `NUMBER`, `BOOLEAN`, `DATE`, `LINK`.

---

## Scheduled Journal Errors

### "schedulerEntries is a required field" (422)
**Cause**: Using nested `journal` wrapper (like scheduled invoices/bills) instead of flat structure.
**Fix**: Scheduled journals use FLAT structure with `schedulerEntries`:
```json
// WRONG (nested like invoices/bills):
{ "repeat": "MONTHLY", "journal": { "journalEntries": [...] } }

// CORRECT (flat with schedulerEntries):
{ "reference": "JNL-001", "valueDate": "2026-03-01", "saveAsDraft": false, "schedulerEntries": [...], "repeat": "MONTHLY", "startDate": "2026-03-01", "endDate": "2026-12-01" }
```

---

## Custom Field PUT Errors

### 500 Internal Server Error on PUT (known bug)
**Cause**: Validation requires `appliesTo.invoices`, `appliesTo.bills`, `appliesTo.customerCredits`, `appliesTo.supplierCredits`, `appliesTo.payments` — but the endpoint 500s even with correct payload.
**Workaround**: Cannot update custom fields via API. Delete and recreate instead.

---

## Contact Group PUT Errors

### 500 Internal Server Error on PUT (known bug)
**Cause**: `PUT /contact-groups/:id` returns 500 regardless of payload structure.
**Workaround**: Cannot update contact groups via API. Delete and recreate instead.

---

## Fixed Assets Errors

### 422 Invalid date format
**Cause**: `depreciationStartDate` or `purchaseDate` not in `YYYY-MM-DD` format.
**Fix**: Use ISO date strings: `"purchaseDate": "2025-01-15"`, `"depreciationStartDate": "2025-02-01"`.

---

## Catalogs POST Errors

### 500 Internal Server Error on POST (known bug)
**Cause**: `POST /catalogs` returns 500 after passing field validation.
**Correct field names** (discovered via 422 validation errors):
- `catalogName` (NOT `name`)
- `items` array with objects: `{ itemResourceId, itemName, price }` (NOT `itemResourceIds` flat array)
**Workaround**: Create catalogs through the Jaz UI.

---

## Deposits Errors

### 404 — Endpoint does not exist
**Cause**: `POST /deposits` returns 404. Also tested: `/customer-deposits`, `/supplier-deposits`, `/cash-entries`, `/cash-in`, `/cash-out` — all 404.
**Note**: This endpoint is not implemented in the API. No workaround.

---

## Inventory Adjustments Errors

### 404 — Endpoint does not exist
**Cause**: `POST /inventory/adjustments` returns 404. Also tested: `/inventory-adjustments`, `/inventory-items/:id/adjustments`, `/items/:id/inventory-adjustments` — all 404.
**Note**: This endpoint is not implemented in the API. Inventory items can be created via `POST /inventory-items` but stock adjustments cannot be made via API.

---

## Attachments Errors

### "Invalid file type" (400)
**Cause**: Uploading `text/plain` files to `POST /:type/:id/attachments`.
**Fix**: API only accepts PDF and image types. Use `application/pdf` or `image/png`. The multipart field name must be `file` (NOT `sourceFile`).

---

## Journal Errors

### Multi-currency journals — `currency` object
Journals support a top-level `currency` object to create entries in a foreign currency — **same format as invoices/bills**: `{ "sourceCurrency": "USD" }` (auto-fetch platform rate) or `{ "sourceCurrency": "USD", "exchangeRate": 1.35 }` (custom rate). The currency must be enabled for the org. Omit the field for base currency journals.

```json
// Base currency journal (omit currency):
{ "saveAsDraft": false, "reference": "JV-001", "valueDate": "2026-02-08", "journalEntries": [...] }

// Foreign currency journal (auto platform rate):
{ "saveAsDraft": false, "reference": "JV-001", "valueDate": "2026-02-08", "currency": { "sourceCurrency": "USD" }, "journalEntries": [...] }

// Foreign currency journal (custom rate):
{ "saveAsDraft": false, "reference": "JV-001", "valueDate": "2026-02-08", "currency": { "sourceCurrency": "USD", "exchangeRate": 1.35 }, "journalEntries": [...] }
```

**Three restrictions apply to foreign currency journals:**
1. **No controlled accounts** — accounts with `controlFlag` (AR, AP) cannot be used. Use invoices/bills for AR/AP entries instead.
2. **No FX accounts** — FX Unrealized Gain/Loss/Rounding accounts are system-managed and cannot be posted to directly.
3. **Bank accounts must match currency** — a USD journal can only post to USD-denominated bank accounts, not SGD bank accounts. All other non-controlled accounts (expenses, revenue, assets, liabilities) are available regardless of journal currency.

### Journal entry field format
**Cause**: Using `debit`/`credit` as separate number fields on journal entries.
**Fix**: Each entry uses `amount` (number) + `type` (`"DEBIT"` or `"CREDIT"`, UPPERCASE strings).
```json
// WRONG:
{ "accountResourceId": "uuid", "debit": 500, "credit": 0 }

// CORRECT:
{ "accountResourceId": "uuid", "amount": 500, "type": "DEBIT" }
```

---

## Cash Entry Errors

### Missing saveAsDraft field (422)
**Cause**: Omitting `saveAsDraft` from `POST /cash-in-journals` or `POST /cash-out-journals`.
**Fix**: `saveAsDraft` is required on cash journal endpoints. Always include it:
```json
{ "saveAsDraft": false, "reference": "CI-001", "valueDate": "2026-02-08",
  "accountResourceId": "uuid-bank", "journalEntries": [...] }
```

### Wrong structure — flat fields vs journalEntries
**Cause**: Using flat structure with `amount`, `bankAccountResourceId`, `description` fields.
**Fix**: Cash entries use `accountResourceId` at top level (the BANK account) + `journalEntries` array for offset entries.
```json
// WRONG:
{ "saveAsDraft": false, "reference": "CI-001", "valueDate": "2026-02-08",
  "amount": 500, "bankAccountResourceId": "uuid", "accountResourceId": "uuid", "description": "Deposit" }

// CORRECT:
{ "saveAsDraft": false, "reference": "CI-001", "valueDate": "2026-02-08",
  "accountResourceId": "uuid-of-bank-account",
  "journalEntries": [{ "accountResourceId": "uuid-of-revenue-account", "amount": 500, "type": "CREDIT" }] }
```

---

## Credit Application Errors

### Wrong structure — flat vs credits array
**Cause**: Sending a flat object `{ creditNoteResourceId, amount }` instead of wrapped in `credits` array.
**Fix**: Wrap in `credits` array and use `amountApplied` (NOT `amount`).
```json
// WRONG:
{ "creditNoteResourceId": "uuid", "amount": 225.00 }

// CORRECT:
{ "credits": [{ "creditNoteResourceId": "uuid", "amountApplied": 225.00 }] }
```

---

## Invoice GET Response Quirks

### Line item account field asymmetry
**Symptom**: Code expecting `accountResourceId` on line items from GET response fails.
**Cause**: GET responses use `organizationAccountResourceId` for line item accounts, but POST uses `accountResourceId`.
**Fix**: When reading invoice data back, use `organizationAccountResourceId` to access the account. When creating, use `accountResourceId`.

---

## Withholding Tax Errors

### WITHHOLDING_CODE_NOT_FOUND (422)

**Request**: POST /api/v1/bills with `withholdingTax` on line items
**Error**: `"WITHHOLDING_CODE_NOT_FOUND"` or similar withholding-related error
**Cause**: The organization does not have withholding tax enabled, or the code is invalid for this region.
**Fix**: Remove the `withholdingTax` field from ALL line items and retry. This is a common pattern for cross-region compatibility — Singapore orgs typically don't use withholding tax, but Philippines orgs do.

**Retry pattern** (from production):
1. Submit bill/credit note with `withholdingTax` fields
2. If error contains "WITHHOLDING" (case-insensitive), strip `withholdingTax` from all line items
3. Retry the same request without withholding tax
4. Log which org doesn't support withholding tax to avoid future retries

---

## Pagination Errors

### `page`/`size` silently ignored (GOTCHA)
**Cause**: Sending `?page=0&size=100` or `?page=1&size=50` to any GET list endpoint.
**Behavior**: These params are silently ignored — API returns default results (limit=100, offset=0). No error is returned, making this bug hard to detect.
**Fix**: Use `?limit=100&offset=0` instead. Never use `page` or `size`.

### "limit must be 1 or greater" (422)
**Cause**: Sending `?limit=0` on a GET endpoint.
**Fix**: Minimum limit is 1.

### "limit must be 1000 or less" (422)
**Cause**: Sending `?limit=1001` or higher on a GET endpoint.
**Fix**: Maximum limit is 1000. To fetch all records, paginate with `limit=1000&offset=0`, then `limit=1000&offset=1000`, etc.

### "offset must be 65536 or less" (422)
**Cause**: Offset exceeds maximum.
**Fix**: Maximum offset is 65536. For datasets larger than ~65K records, use POST /search with filters to narrow results.

---

## Search Errors

### "sort is required if [offset] is present" (422)
**Cause**: Using `offset` in search without providing `sort`.
**Fix**: When paginating with `offset`, MUST include `sort` as an object:
```json
// WRONG — missing sort or using top-level sortBy:
{ "limit": 10, "offset": 0, "sortBy": ["valueDate"], "order": "DESC" }

// CORRECT — sort is an object with sortBy array:
{ "limit": 10, "offset": 0, "sort": { "sortBy": ["valueDate"], "order": "DESC" } }
```

### "Invalid request body" (400) — wrong sort format
**Cause**: `sort` is a string instead of an object, or `sortBy` is a string instead of array.
**Fix**: `sort` must be `{ sortBy: ["field1"], order: "ASC"|"DESC" }`. `sortBy` must be an array.

---

## General / Transient Errors

### 500 Internal Server Error (intermittent)
**Cause**: Server-side transient issue.
**Fix**: Retry once with 1-2 second delay. If persists, skip and log.

### 429 Too Many Requests (rare)
**Cause**: Too many concurrent requests.
**Fix**: Limit to 5 concurrent requests. Use exponential backoff: 1s, 2s, 4s.

### "resourceId must be a valid version 4 UUID" (422)
**Cause**: Passing a non-UUID string where a resource ID is expected.
**Fix**: Ensure all resource IDs are valid UUIDs (format: `xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx`).

---

*Last updated: 2026-02-10 — Currency rates: Fixed "404 on rate endpoints" (wrong path — use hyphenated `/organization-currencies`). Added rate validation errors. Fixed FX: `currencyCode` string is silently ignored, documented `currency` object form and rate sources. Verified via live API testing.*
