# Jaz API Endpoint Reference: Banking and Jaz Magic

> Request/response examples for document extraction (Jaz Magic), bank records and their search, the cashflow ledger search, deposits, bank rules.
> Base URL, auth, date format, pagination and status codes apply to every endpoint: see [endpoints.md](./endpoints.md), which also indexes every section.

---

## 14h. Jaz Magic: Extraction & Autofill

### POST /api/v1/magic/createBusinessTransactionFromAttachment

**When the user starts from an attachment (PDF, JPG, document image), this is the endpoint to use.** Do not manually parse files to construct `POST /invoices` or `POST /bills`; Jaz Magic handles the full extraction-and-autofill pipeline server-side: OCR, line item detection, contact matching, and CoA auto-mapping via ML learning. Creates a complete draft transaction with all fields pre-filled. Use `POST /invoices` or `POST /bills` only when building from structured data where the fields are already known.

Processing is **asynchronous**: the API response confirms file upload immediately. The extraction pipeline runs server-side and pushes status updates via Firebase Realtime Database.

**Supported document types:**
- `INVOICE` → creates a draft sale (response type: `SALE`)
- `BILL` → creates a draft purchase (response type: `PURCHASE`)
- `CUSTOMER_CREDIT_NOTE` → creates a draft customer CN (response type: `SALE_CREDIT_NOTE`)
- `SUPPLIER_CREDIT_NOTE` → creates a draft supplier CN (response type: `PURCHASE_CREDIT_NOTE`)
- `SALE_QUOTE` → creates a DRAFT sale quote (response type: `SALE_QUOTE`); issue it with `isDraftToActiveSaleQuote`
- `SALE_ORDER` → creates a PENDING sale order (response type: `SALE_ORDER`); take it live with `isPendingToActiveSaleOrder`
- `PURCHASE_REQUEST` → creates a DRAFT purchase request (response type: `PURCHASE_REQUEST`); issue it with `isDraftToActivePurchaseRequest`
- `PURCHASE_ORDER` → creates a PENDING purchase order (response type: `PURCHASE_ORDER`); take it live with `isPendingToActivePurchaseOrder`

A PENDING order is on the dashboard's For Review tab, not in the live order lists. Activate it with the order update (`PUT /sale-orders/:id` / `PUT /purchase-orders/:id`); if that call sends `lineItems`, send every stored line with its `resourceId`.

Optional `internalNotes` (max 3000 characters) is set on the created record, e.g. a tag to find an automated upload again. Optional `uploadMode: "MERGED"` splits one PDF into several documents; it is refused (`MAGIC_MERGED_UPLOAD_NOT_SUPPORTED`) for the four quote/order/request types.

**Three modes** (content type depends on `sourceType`):

#### FILE mode (multipart/form-data), most common

```
POST /api/v1/magic/createBusinessTransactionFromAttachment
Content-Type: multipart/form-data

Fields:
  - sourceFile: PDF or JPG file blob (NOT "file")
  - businessTransactionType: "INVOICE", "BILL", "CUSTOMER_CREDIT_NOTE", "SUPPLIER_CREDIT_NOTE", "SALE_QUOTE", "SALE_ORDER", "PURCHASE_REQUEST", or "PURCHASE_ORDER"
  - sourceType: "FILE"
  - internalNotes: optional, max 3000 characters
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

#### URL mode (application/json), for remote files

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

#### HTML mode (raw email/document body)

Use when you hold the invoice/bill as raw HTML (e.g. an email body) rather than a file. The backend renders the HTML to a PDF, then runs the same extraction pipeline.

```json
/ Request:
POST /api/v1/magic/createBusinessTransactionFromAttachment
Content-Type: application/json

{
  "businessTransactionType": "INVOICE",
  "sourceType": "HTML",
  "html": "<html>…invoice markup…</html>"
}

/ Response: same shape as FILE mode
```

`html` is the raw HTML string (max 5 MB); also works as a multipart field. No file or PDF conversion step is needed.

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
- `sourceFile` is the field name (NOT `file`), same pattern as bank statement endpoint
- `EXPENSE` returns 422: use one of the 8 valid types above
- Response maps types: `INVOICE` → `SALE`, `BILL` → `PURCHASE`, `CUSTOMER_CREDIT_NOTE` → `SALE_CREDIT_NOTE`, `SUPPLIER_CREDIT_NOTE` → `PURCHASE_CREDIT_NOTE`; the four quote/order/request types keep their names
- There is no attachment-id source: the sources are `sourceFile`, `sourceURL` and `html` only
- JSON body with `sourceType: "FILE"` always fails (400); MUST use multipart
- `workflowResourceId` in `validFiles[]` is for tracking via `POST /magic/workflows/search`
- `subscriptionFBPath` is the Firebase path for real-time status updates
- All three fields (the source, `sourceFile`/`sourceURL`/`html`, plus `businessTransactionType` and `sourceType`) are required; omitting any returns 422
- File types confirmed: PDF, JPG/JPEG, PNG, HEIC, XLS, XLSX, EML (max 10 MB). HTML mode (`sourceType: "HTML"`) takes the raw HTML body instead of a file (max 5 MB); an `.eml` file is still FILE mode, not HTML mode.

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
- `resourceId`: StringExpression (eq, contains), workflow ID from magic create response
- `documentType`: Array: SALE, PURCHASE, SALE_CREDIT_NOTE, PURCHASE_CREDIT_NOTE, SALE_QUOTE, SALE_ORDER, PURCHASE_REQUEST, PURCHASE_ORDER, BANK_STATEMENT
- `status`: Array (SUBMITTED, PROCESSING, COMPLETED, FAILED)
- `fileName`: StringExpression, original uploaded filename
- `fileType`: Array (PDF, PNG, JPEG, JPG, HEIC, CSV, XLS, XLSX, EML)
- `createdAt`: DateExpression (eq, gte, lte), workflow creation date

**Workflow for agents:**
1. Upload via `POST /magic/createBusinessTransactionFromAttachment` → get `workflowResourceId`
2. Search with `filter.resourceId.eq` → check `status`
3. When `COMPLETED` → read `businessTransactionDetails.businessTransactionResourceId`
4. Use the BT resource ID with `GET /invoices/:id`, `GET /bills/:id`, `GET /customer-credit-notes/:id`, `GET /supplier-credit-notes/:id`, or the matching quote/order/request GET

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

Max 10 MB per file. There is no attachment-id source.

CSV format: `Date,Description,Debit,Credit` (maps to Date, Description, Cash-out, Cash-in).

Multipart import is the more reliable method. Use it when JSON POST returns errors.

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

Searches bank statement entries for a specific bank account. The `accountResourceId` path parameter is the UUID of a bank-type CoA account; find it via `POST /chart-of-accounts/search` with `{ "filter": { "accountType": { "eq": "Bank Accounts" } } }`.

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

## 20. Bank Records: JSON POST (Alternative)

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

## Deposits (a flag on an account, not an entity)

> **There is no deposits entity.** No `/deposits` route exists at any spelling and none is
> planned. A deposit is a *flag on a Chart of Accounts account*, not a document. See
> `feature-glossary.md` → Deposits for the business model, `errors.md` → Deposits Errors for
> the 404.

**The flag**: a CoA account carries `depositContactType`, which is `CUSTOMER` (customer deposit /
advance received, a liability), `SUPPLIER` (supplier deposit / advance paid, an asset), or
`NULL` (an ordinary account). The flag is listed and set through `/deposit-accounts`.

### GET /api/v1/deposit-accounts

`depositContactType=CUSTOMER|SUPPLIER` is required: one side per call. `limit` (max 1000,
default 100) and `offset` (0-indexed page). Returns the active flagged accounts with their
balances per currency:

```json
{ "data": [{ "accountResourceId": "uuid", "accountCode": "2150", "accountName": "Customer Deposits",
  "accountClass": "Liability", "accountType": "Current Liability", "depositContactType": "CUSTOMER",
  "restrictPaymentOverdraft": false,
  "accountBalances": [{ "sourceCurrencyCode": "SGD", "sourceBalanceAmount": 500 }] }],
  "totalElements": 1, "totalPages": 1 }
```

Paging counts one row per account AND currency, so an account holding several currencies can
appear on two pages, each with part of its balances: merge by `accountResourceId`. An account
with no entries yet has no `accountBalances`.

### PUT /api/v1/deposit-accounts

```json
{ "accounts": [
  { "organizationAccountResourceId": "uuid", "depositContactType": "CUSTOMER", "restrictPaymentOverdraft": true },
  { "organizationAccountResourceId": "uuid-2", "depositContactType": null }
] }
```

- 1-500 entries, each account once. `depositContactType` is required on every entry: `null`
  unflags, a missing key is refused (so a missing value can never unflag by accident).
- `restrictPaymentOverdraft` is required when flagging: the PUT sets both fields every time, so
  a default would clear a stored `true`. `true` refuses a payment against the account that
  exceeds the contact's remaining deposit balance. It cannot be `true` on an unflag.
- `CUSTOMER` needs an active **liability** account, `SUPPLIER` an active **asset** account.
  Control accounts and Bank Accounts, Cash and Inventory accounts cannot be deposit accounts.
- Applied as one change: an account not found in the organization, or one that cannot take the
  setting, refuses the whole request with a 422 naming every such account; nothing changes.
- Unflagging takes the account and its balances out of the list; payments already recorded on
  it are kept.
- Tools: `list_deposit_accounts`, `flag_deposit_accounts`. CLI: `clio accounts deposit-accounts`,
  `clio accounts flag-deposit-accounts`.

**The movement**: once an account is flagged, a deposit is an *ordinary transaction posted
against that account*. Nothing about the call is deposit-specific. The transaction types that
land on a deposit account are the normal ones: `SALE`, `PURCHASE`, `PAYMENT_SALE`,
`PAYMENT_PURCHASE`, `JOURNAL_DIRECT_CASH_IN`, `JOURNAL_DIRECT_CASH_OUT`, `JOURNAL_MANUAL`.

| Movement | Call |
|----------|------|
| Top up (advance received or paid) | `POST /api/v1/journals`, or `POST /api/v1/cash-in-entries` / `POST /api/v1/cash-out-entries`; one leg on the flagged account |
| Draw down against an invoice | `POST /api/v1/invoices/:resourceId/payments` with `accountResourceId` = the flagged account **and `paymentMethod: "OTHER"`** |
| Draw down against a bill | `POST /api/v1/bills/:resourceId/payments` with `accountResourceId` = the flagged account **and `paymentMethod: "OTHER"`** |
| Read deposit movements | `POST /api/v1/cashflow-transactions/search` filtered on the flagged account's `organizationAccountResourceId` |

> **The payment method is load-bearing on a drawdown.** The platform gates the payment
> account's TYPE on the method: `BANK_TRANSFER`, `CASH` and `CHEQUE` require a Bank
> Accounts or Cash account and reject anything else with
> `INVALID_ACCOUNT_FOR_BUSINESS_TRANSACTION_FOUND`. A deposit account is a Liability or
> Asset by construction, so it is only reachable under another method; `OTHER` is the
> plain choice. The tools default `paymentMethod` to `BANK_TRANSFER`, so a drawdown that
> does not set it explicitly will 422. See SKILL.md Rule 80.

**What the chart-of-accounts calls cannot do**: `depositContactType` is not on any
chart-of-accounts request or response model, so `POST /chart-of-accounts` cannot create a
deposit account and `GET /chart-of-accounts` does not show the flag. Create the account, then
flag it with `PUT /deposit-accounts`; read the flag with `GET /deposit-accounts`.

---

## 26. Bank Rules CRUD

A bank rule has two halves: the **WHEN** (`searchFilter`, the condition deciding which statement lines it applies to) and the **THEN** (`configuration.reconcileWithDirectCashEntry`, the allocation). **A rule with no `searchFilter` is never suggested**: auto-reconciliation only considers rules whose stored condition is non-null, so it exists, lists, and can be applied by hand, but is never offered. See jaz-api rules 90a-90d for the full payload.

### GET /api/v1/bank-rules

Lists bank rules. Standard pagination (`limit`, `offset`).

### GET /api/v1/bank-rules/:resourceId

Returns one rule, including its `searchFilter`.

```json
// Response (data):
{
  "resourceId": "uuid",
  "name": "Grab rides",
  "actionType": "RECONCILE_WITH_DIRECT_CASH_ENTRY",
  "appliesToReconciliationAccount": { "code": "1001", "currencyCode": "SGD", "name": "Business Bank Account" },
  "searchFilter": {
    "version": 1,
    "raw": "description:grab",
    "parsed": { "description": { "contains": "grab" } }
  },
  "configuration": { "reconcileWithDirectCashEntry": { "...": "..." } }
}
```

`appliesToReconciliationAccount` comes back as an OBJECT on read but is sent as a bare UUID on write, so a rule cannot be round-tripped without substituting it.

### POST /api/v1/bank-rules

Creates a rule. `searchFilter` is optional on the wire and effectively required in practice.

```json
// Request:
{
  "name": "Grab rides",
  "appliesToReconciliationAccount": "<bank-account-uuid>",
  "searchFilter": {
    "version": 1,
    "raw": "description:grab",
    "parsed": { "description": { "contains": "grab" } }
  },
  "configuration": {
    "reconcileWithDirectCashEntry": {
      "amountAllocationType": "PERCENTAGE",
      "reference": "AUTO-{{bankReference}}",
      "percentageAllocation": [{ "organizationAccountResourceId": "<acct-uuid>", "amount": 100 }]
    }
  }
}
```

`searchFilter` rules: `version` must be `1`; `raw` must be PRESENT but **may be the empty string** (the app itself saves conditions that way); `parsed` must be a non-empty object. Condition fields are `description`, `extReference`, `extContactName`, `netAmount`, `valueDate`, plus the account's active custom Bank Fields. An unsupported field path does NOT error; the rule saves and then never fires.

### PUT /api/v1/bank-rules/:resourceId

Full replacement: send `resourceId`, `appliesToReconciliationAccount` and the whole `configuration` every time.

**`searchFilter` is the one exception to full replacement.** Omit the key and the stored condition is KEPT; send `null` to remove it; send an object to replace it. This matters because the obvious read-modify-write (GET, change the name, PUT) drops the condition unless you carry it across, which silently stops the rule ever being suggested again.

### DELETE /api/v1/bank-rules/:resourceId

Deletes a rule.

### POST /api/v1/bank-rules/search

Searches rules. Filter fields: `name`, `resourceId`, `actionType`, `appliesToReconciliationAccount`, `businessTransactionType`, `reference`, plus `and`/`or`.

```json
{ "filter": { "name": { "contains": "grab" } }, "sort": { "sortBy": ["name"], "order": "ASC" }, "limit": 100 }
```

**There is no filter on `searchFilter`**, so "which of my rules have no condition" cannot be asked server-side; list the rules and check the field client-side.
