# Jaz API Endpoint Reference: Transactions

> Request/response examples for invoices, bills, journals, cash entries, payments and payment records, credit notes and refunds, cash transfers, attachments, transfer trial balance, approvals and request changes, jots, unapplied payments, comments and notifications.
> Base URL, auth, date format, pagination and status codes apply to every endpoint: see [endpoints.md](./endpoints.md), which also indexes every section.

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

**saveAsDraft**: Defaults to `false`; omitting it creates a finalized transaction. Sending `saveAsDraft: true` creates a draft.

**GET response note**: When fetching invoices via GET, line items use `organizationAccountResourceId` (not `accountResourceId`). POST uses `accountResourceId`. Request-side aliases resolve `issueDate` → `valueDate`, `bankAccountResourceId` → `accountResourceId`, etc.

**FX (foreign currency) invoices**: For invoices in a non-base currency, use the `currency` OBJECT form:
- **`currency: { sourceCurrency: "MYR" }`**: platform auto-fetches rate from ECB (FRANKFURTER). Response shows `rateSource: "EXTERNAL"`, `providerName: "FRANKFURTER"`.
- **`currency: { sourceCurrency: "MYR", exchangeRate: 3.15 }`**: custom rate. Response shows `rateSource: "INTERNAL_TRANSACTION"`, `providerName: "CUSTOM"`.
- **`currencyCode: "MYR"` (string) is SILENTLY IGNORED**: the invoice is created in the org's base currency (e.g., SGD) with rate 1:1. No error returned. This is a major gotcha.
- **`currency: "USD"` (string)** causes "Invalid request body" error (400).

**Rate hierarchy** (when using `currency: { sourceCurrency }` without `exchangeRate`):
1. Org-level rate (set via `/organization/currencies/:code/rates`), auto-filled if exists
2. Platform rate (ECB via FRANKFURTER), auto-fetched if no org rate
3. Transaction-level rate (via `exchangeRate` in the `currency` object), overrides all

**Invoice payments**: `POST /invoices/{invoiceResourceId}/payments` works reliably as a standalone endpoint.

---

## 8. Bills

### POST /api/v1/bills

Same structure as invoices. All field names identical. FX currency rules also apply; use `currency` object form (see Section 7 FX notes).

**Bill payments**: The standalone `POST /bills/{id}/payments` endpoint was broken (nil pointer dereference in the API backend), **fixed in backend PR #112**. Both standalone and embedded payment approaches now work. The embed-in-creation pattern remains a valid alternative:

```json
// Request: Bill with embedded payment:
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

Bills and supplier credit notes support expanded withholding tax (EWT, Philippines) per line item. Copy `code`, `rate`, `type` and `description` from one `GET /withholding-codes` row (`list_withholding_codes`); a field left out is not stored:

```json
{
  "lineItems": [{
    "name": "Consulting services",
    "unitPrice": 10000,
    "quantity": 1,
    "accountResourceId": "expense-uuid",
    "withholdingTax": {
      "code": "WC 158",
      "rate": 1,
      "type": "corp",
      "description": "Income Payment Made By Top Withholding Agents To Their Local/Resident Supplier Of Goods Other Than Those Covered By Other Rates Of Withholding Tax"
    }
  }]
}
```

**On `WITHHOLDING_CODE_NOT_FOUND`**: check the code against `list_withholding_codes` (codes contain a space). If the organization does not use withholding (non-PH), remove `withholdingTax` and say so; never strip it silently. See errors.md.

Customer-side withholding (CWT) is not a line field: record the customer's BIR Form 2307 with `record_withholding_tax_certificate` (`POST /sales/batch-payments`, `paymentMethod: WITHHOLDING_TAX_CERTIFICATE`, `ph2307Details`). SKILL.md rule 98 has the rules.

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
    { "accountResourceId": "uuid", "amount": 500, "type": "DEBIT", "description": "Line note" },
    { "accountResourceId": "uuid", "amount": 500, "type": "CREDIT" }
  ]
}

// Response:
{ "data": { "resourceId": "uuid" } }
```

**CRITICAL corrections from live testing**:
- Each entry uses `amount` (number) + `type`: `"DEBIT"` or `"CREDIT"` (UPPERCASE strings)
- Do NOT use `debit`/`credit` as separate number fields; that is WRONG
- Top-level `currency: { sourceCurrency, exchangeRate? }` IS accepted: it makes a foreign-currency journal
  whose amounts are in `sourceCurrency` (verified 2026-09-24: `{sourceCurrency: "USD", exchangeRate: 0.75}`
  created a draft reading back `currencyExchange.sourceCurrencyCode: USD`, `baseToSourceRate: 0.75`).
- `PUT /journals/{id}` does NOT keep `taxVatApplicable` or `taxInclusion` when they are omitted:
  `taxVatApplicable` falls to false, which strips every line's tax profile once lines are sent, and
  `taxInclusion` is cleared. Measured 2026-09-24: an ACTIVE taxed journal edited with its own lines and a
  note came back with no tax profile and VAT 0 (HTTP 200). Always restate both from a GET of the journal.
  The Clio tools and CLI do this for you (`update_journal`, `bulk_update_journals`, `clio journals update`,
  `clio journals draft finalize`).
- Total DEBIT amounts MUST equal total CREDIT amounts
- `contactResourceId` is a TOP-LEVEL field, NOT per entry. Probed 2026-09-02: an entry-level
  `contactResourceId` is silently discarded (an int there is accepted like any unknown key, while an
  int on `description` or `taxProfileResourceId` returns 400), and a real contact id on an entry does
  not appear on the created journal. Put it at the top level, where it does land.
- Per-line `exchangeRate` (optional, number): the rate from the LINE's account currency to the
  organization's base currency. This is the OPPOSITE direction to the journal's `currency.exchangeRate`
  (base to source). Only a line posting to an account held in another currency takes one:
  `exchangeRate: 0` is a 422, and a rate other than exactly 1 on a base-currency line is a 422. Honoured
  by `POST /journals`, `POST /transfer-trial-balance` and `POST /reconciliations/manual-journal` (the
  reconcile path applies it as sent and skips the base-currency check). `PUT /journals/{id}` validates it
  but does not apply it, so an update cannot change a line's rate. Send the top-level `exchangeRate`
  only: a nested line `currency: { exchangeRate }` spelling is accepted upstream but unpublished, and
  sending both with different values is a 422.

---

## 10. Cash Entries

### POST /api/v1/cash-in-entries
### POST /api/v1/cash-out-entries

```json
// Request (Cash-In example):
{
  "saveAsDraft": false,
  "reference": "CI-001",
  "valueDate": "2026-02-08",
  "accountResourceId": "uuid-of-bank-account",
  "lines": [
    { "accountResourceId": "uuid-of-revenue-account", "amount": 500, "type": "CREDIT" }
  ]
}

// Request (Cash-Out example):
{
  "saveAsDraft": false,
  "reference": "CO-001",
  "valueDate": "2026-02-08",
  "accountResourceId": "uuid-of-bank-account",
  "lines": [
    { "accountResourceId": "uuid-of-expense-account", "amount": 300, "type": "DEBIT" }
  ]
}

// Response:
{ "data": { "resourceId": "uuid" } }
```

**CRITICAL corrections from live testing**:
- `saveAsDraft` is REQUIRED; omitting it causes validation failure
- `accountResourceId` at top level = the BANK account (NOT `bankAccountResourceId`)
- `lines` array for the offset entries, same `amount` + `type` format as regular journals. (`journalEntries` is accepted as an alias but `lines` is now canonical for cash entries.)
- Do NOT use a flat structure with `amount`, `bankAccountResourceId`, `description`; that is WRONG
- The system auto-creates the bank-side entry; you only specify the offset entries in `lines`
- For cash-in: offset entries are typically CREDIT (revenue/liability)
- For cash-out: offset entries are typically DEBIT (expense/asset)

### GET /api/v1/cash-in-entries (LIST)
### GET /api/v1/cash-out-entries (LIST)

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

### GET /api/v1/cash-in-entries/:resourceId
### GET /api/v1/cash-out-entries/:resourceId

Same shape as list items, wrapped in `{ data: {...} }`. Use the `resourceId` from LIST (cashflow-transaction ID), NOT the CREATE-returned resourceId.

### PUT /api/v1/cash-in-entries/:resourceId
### PUT /api/v1/cash-out-entries/:resourceId

Same request body as POST. Use the `parentEntityResourceId` (= the CREATE-returned resourceId).

### DELETE /api/v1/cash-entries/:resourceId

Shared delete endpoint for ALL cash entry types (cash-in, cash-out, cash-transfer). Use the `parentEntityResourceId` from LIST (= the CREATE-returned resourceId). NOT the cashflow-transaction `resourceId`.

```json
// Response:
(empty body, 200 OK)
```

**CRITICAL ID gotcha (verified via live testing)**:
- CREATE returns `resourceId = A` (this is `parentEntityResourceId`)
- LIST returns `resourceId = B` (cashflow-transaction ID), `parentEntityResourceId = A`
- GET accepts `B` (cashflow-transaction ID) or `A` (parentEntityResourceId; a transfer's two rows share one `A`, so GET by `A` returns the first)
- DELETE expects `A` (parentEntityResourceId, via `/cash-entries/A`)
- `businessTransactionResourceId = C` (underlying journal ID); do NOT use for any CRUD operation

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

**CRITICAL corrections from live testing**. Payments require 6 fields:
- `paymentAmount`: NOT `amount`. The **bank account currency** amount (actual cash moved from bank).
- `transactionAmount`: The **transaction document currency (invoice/bill/credit note)** amount (applied to the balance). Equal to `paymentAmount` for same-currency. For cross-currency (e.g., USD invoice paid from SGD bank at 1.35): `paymentAmount: 1350` (SGD), `transactionAmount: 1000` (USD).
- `accountResourceId`: NOT `bankAccountResourceId`. This IS the bank account UUID.
- `paymentMethod`: required string: `"BANK_TRANSFER"` (other values may exist but this works universally)
- `reference`: payment reference string (required)
- `valueDate`: NOT `paymentDate`. ISO date string.

Always wrap in `{ payments: [...] }` even for single payment.

**Bill payments standalone endpoint**: Was broken (nil pointer dereference), **fixed in backend PR #112**. Now works for basic payments. Embed-in-creation pattern also remains valid (see Section 8). production clients uses embedded payments for bills.

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

## 14c. Cash Transfers

### POST /api/v1/cash-transfers

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

**CRITICAL**: Uses `cashOut`/`cashIn` sub-objects, NOT `fromAccountResourceId`/`toAccountResourceId`/`amount` flat fields. Each sub-object has `accountResourceId` and `amount`. Must use TWO DIFFERENT bank accounts; same account for both fails.

### GET /api/v1/cash-transfers (LIST)

Same cashflow-transaction response shape as cash-in/out list. `businessTransactionType` = `"JOURNAL_CASH_TRANSFER"`.

### GET /api/v1/cash-transfers/:resourceId

Accepts the cashflow-transaction `resourceId` from LIST or the `parentEntityResourceId` from CREATE (both legs share it; GET by it returns the first). Returns same shape wrapped in `{ data: {...} }`.

**Cash transfers have NO update (PUT) endpoint.**

DELETE uses shared `/cash-entries/:id` with the CREATE-returned resourceId (= `parentEntityResourceId`).

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

**CRITICAL**: Uses `refunds` wrapper with `refundAmount`/`refundMethod`, NOT `payments` wrapper with `paymentAmount`/`paymentMethod`.

---

## 14g. Attachments

### GET /api/v1/:type/:resourceId/attachments

List attachments on a record. `:type` is `invoices`, `bills`, `journals`, `customer-credit-notes`, `supplier-credit-notes`, `sale-quotes`, `sale-orders`, `purchase-requests`, `purchase-orders`, `fixed-assets`, `deferrals`, `leases`, `loans`, `cash-in-entries`, `cash-out-entries`, `cash-transfers`, or scheduled variants. A cash entry answers 404 under the other direction's path.

Response (non-standard shape):
```json
{
  "reference": "INV-001",
  "resourceId": "<transactionId>",
  "attachments": [
    {
      "fileName": "receipt.pdf",
      "fileType": "PDF",
      "fileId": "abc123",
      "attachmentResourceId": "a2f1aa45-..."
    }
  ]
}
```

**Note:** Response uses `attachments` array (not the standard `data` wrapper). Attachment ID field is `attachmentResourceId` (not `resourceId`).

### POST /api/v1/:type/:resourceId/attachments (multipart)

Upload a file attachment. Multipart form-data with `file` field (binary, `application/pdf` or `image/*`). Returns the parent transaction with updated `attachments` array.

Optional form field `attachmentType`: `INTERNAL` or `EXTERNAL`; left out, the attachment is stored as Internal. Only invoices, customer credit notes, sale quotes, sale orders, purchase orders and purchase requests take it, and only the attachment lists of those six return `attachmentType` for each attachment. Every other record type answers 400 `attachmentType is not supported on <record type>`, whatever the value.

### DELETE /api/v1/:type/:resourceId/attachments/:attachmentResourceId

Delete an attachment. Returns the parent transaction with the attachment removed from the `attachments` array. HTTP 200 on success.

```
DELETE /api/v1/invoices/fe7a92fa-.../attachments/a2f1aa45-...
→ 200 { "reference": "INV-001", "resourceId": "fe7a92fa-...", "attachments": [] }
```

---

## 18b. Transfer Trial Balance

### POST /api/v1/transfer-trial-balance

Create opening balance entries for an organization. Used during onboarding to transfer balances from a prior accounting system. Entries are always created as ACTIVE (no draft state). The reference is auto-generated by the server; do not send one.

```json
// Request:
{
  "valueDate": "2026-01-01",
  "journalEntries": [
    { "accountResourceId": "uuid-bank", "amount": 50000, "type": "DEBIT" },
    { "accountResourceId": "uuid-retained-earnings", "amount": 50000, "type": "CREDIT" }
  ]
}

// Response:
{ "data": { "resourceId": "uuid" } }
```

**Key behaviors**:
- Always ACTIVE; no `saveAsDraft` field (ignored if sent)
- Reference is auto-generated; do not include `reference` in the request body
- Uses `journalEntries` (NOT `lines`), same as regular journals
- Debit/credit must balance (same as regular journals)
- Per-line `exchangeRate` works as on `POST /journals` (line account currency to base, foreign-currency account lines only)
- Creates a non-editable transfer journal visible in the general ledger

---

## 19. Payment Record CRUD

### GET /api/v1/payments/{resourceId}

Get a single payment record by its payment resourceId (NOT cashflow transaction ID).

```json
// Response:
{
  "data": {
    "resourceId": "uuid-payment",
    "reference": "PAY-001",
    "paymentAmount": 2250.00,
    "transactionAmount": 2250.00,
    "valueDate": "2026-03-01",
    "paymentMethod": "BANK_TRANSFER",
    "status": "ACTIVE",
    "type": "SALE_PAYMENT",
    "accountResourceId": "uuid-bank",
    "crossCurrency": false,
    "currencyCode": "SGD",
    "feeAmount": 0
  }
}
```

### PUT /api/v1/payments/{resourceId}

Update an existing payment record. All fields optional; only included fields are changed.

```json
// Request:
{
  "paymentAmount": 2500.00,
  "reference": "PAY-001-REV",
  "valueDate": "2026-03-02",
  "paymentMethod": "BANK_TRANSFER",
  "accountResourceId": "uuid-bank",
  "currency": { "sourceCurrency": "USD", "exchangeRate": 0.74 },
  // Both fees are OBJECTS, not a number and not a boolean. A bare value is rejected.
  "transactionFee": {
    "feeAccountResourceId": "uuid-fee-expense",
    "feeType": "FLAT",
    "feeValue": 5.00,
    "feeTaxVatApplicable": false
  },
  "transactionFeeCollected": {
    "feeAccountResourceId": "uuid-fee-income",
    "feeType": "FLAT",
    "feeValue": 2.00,
    "feeTaxVatApplicable": false
  },
  // Cash-leg adjustment: overpayment or rounding. Bank leg only, never AR/AP.
  // On update, add and change APPLY; remove does not (0 rejected, null reads as
  // omitted). Rejected if the payment is reconciled or an account on its ledger
  // rows is lock-dated. See rule 160.
  "adjustment": {
    "adjustmentValue": -0.03,
    "adjustmentAccountResourceId": "uuid-rounding-account",
    "adjustmentDescription": "rounding difference"
  }
}

// Response: same shape as GET
{ "data": { "resourceId": "uuid", ... } }
```

**Where to find payment resourceIds**: GET an invoice/bill → `paymentRecords[].resourceId`. These are payment IDs. Do NOT use cashflow transaction IDs from `POST /cashflow-transactions/search`.

---

## 19b. Invoice/Bill Sub-Resource Endpoints

### GET /api/v1/invoices/{resourceId}/payments

```json
// Response ({data: [...]} envelope):
{
  "data": [
    {
      "resourceId": "uuid-payment",
      "paymentAmount": 2250.00,
      "transactionAmount": 2250.00,
      "valueDate": 1709251200000,
      "paymentMethod": "BANK_TRANSFER",
      "reference": "PAY-001"
    }
  ]
}
```

Same envelope for `GET /bills/{resourceId}/payments`.

**CRITICAL**: `GET /invoices/{resourceId}/credits` and `GET /bills/{resourceId}/credits` differ:
`{ "TotalElements": n, "data": [...] }` when credits are applied, but a BARE `[]` when none
are (read from the API source; the empty case measured raw 2026-09-24). The CLI and tools normalize both to `{data: [...]}`.

---

## 19c. Request Changes

Sends a **submitted** record back to its creator for edits: the record returns to draft, its
approval markers are cleared, and `message` is posted as the first comment on a new
collaboration thread. Records in any other state are skipped and reported in the response.

> **Wrapped.** MCP tools `request_document_changes` / `bulk_request_document_changes`, CLI
> `clio approvals request-changes` / `clio approvals bulk-request-changes`.

Nine entities, each with a single-record and a bulk form:

| Entity | Single | Bulk |
|--------|--------|------|
| Invoices | `POST /api/v1/invoices/:resourceId/request-changes` | `POST /api/v1/invoices/bulk-request-changes` |
| Bills | `POST /api/v1/bills/:resourceId/request-changes` | `POST /api/v1/bills/bulk-request-changes` |
| Customer credit notes | `POST /api/v1/customer-credit-notes/:resourceId/request-changes` | `POST /api/v1/customer-credit-notes/bulk-request-changes` |
| Supplier credit notes | `POST /api/v1/supplier-credit-notes/:resourceId/request-changes` | `POST /api/v1/supplier-credit-notes/bulk-request-changes` |
| Purchase orders | `POST /api/v1/purchase-orders/:resourceId/request-changes` | `POST /api/v1/purchase-orders/bulk-request-changes` |
| Purchase requests | `POST /api/v1/purchase-requests/:resourceId/request-changes` | `POST /api/v1/purchase-requests/bulk-request-changes` |
| Sale orders | `POST /api/v1/sale-orders/:resourceId/request-changes` | `POST /api/v1/sale-orders/bulk-request-changes` |
| Sale quotes | `POST /api/v1/sale-quotes/:resourceId/request-changes` | `POST /api/v1/sale-quotes/bulk-request-changes` |
| Claims | `POST /api/v1/claims/:resourceId/request-changes` | `POST /api/v1/claims/bulk/request-changes` |

**Claims breaks the bulk path pattern**: `/claims/bulk/request-changes`, not
`/claims/bulk-request-changes`. The other eight are all `bulk-request-changes`.

### Single: request body (200)
```json
{ "message": "Please attach the signed delivery note before resubmitting." }
```
`message` is required and `minLength: 1`; a blank value is rejected. It is the only place the
reason is recorded.

```json
// Response: 200 (per-record outcome; a skipped record does NOT fail the call)
{
  "data": {
    "records": [
      {
        "resourceId": "...",
        "isSuccess": true,
        "status": "DRAFT",
        "approvalStatus": "...",
        "collaborationThreadPath": "...",
        "errorCode": null,
        "failureReason": null
      }
    ]
  }
}
```
**Check `isSuccess` per record**: a record in the wrong state comes back with
`isSuccess: false` + `errorCode`/`failureReason`, inside a 200.

### Bulk: request body (202)
```json
{
  "message": "Please attach the signed delivery note before resubmitting.",
  "resourceIds": ["b7a2c3d4-e5f6-7890-abcd-ef1234567890"]
}
```
`resourceIds`: 1 to 500 per call. `message` applies to every record in the batch.

```json
// Response: 202 (async job handle, NOT the outcome)
{ "data": { "jobId": "...", "status": "...", "totalRecords": 12, "totalChunks": 1, "subscriptionFBPath": "..." } }
```
Poll the result with `POST /api/v1/background-jobs/search` (section 23, in endpoints-bulk-edits.md); the 202 only means
the job was accepted.

---

## 19d. Approve

Approves a record awaiting approval. **Irreversible**: it posts the ledger (and for invoices and
bills also confirms a linked order and consumes the document reference). There is nothing to undo, and approving is one-shot
(a record not awaiting approval, including an already-approved one, is refused).
MCP tools `approve_documents` / `bulk_approve_documents`, CLI `clio approvals approve` /
`clio approvals bulk-approve`. Four entities: `invoices`, `bills`, `customer-credit-notes`,
`supplier-credit-notes` (claims approve through their own claims routes).

| Form | Route | Response |
|------|-------|----------|
| Single | `POST /api/v1/{entity}/:resourceId/approve` (no body) | 200, `{ "data": { "records": [ { resourceId, status, approvalStatus, isSuccess, failureReason, errorCode } ] } }` |
| Bulk | `POST /api/v1/{entity}/bulk-approve` | 202, job handle (same shape as 19c bulk); poll `POST /api/v1/background-jobs/search` |

- Bulk body `{ "resourceIds": [...] }`: 1-100 **unique** UUIDs. Over 100 or a duplicate is 422
  with nothing written.
- Single form: an id not found in your organization is 404.
- An id not found in your organization rejects the **whole** bulk batch with 422 and no job is
  dispatched: fix the list and retry.
- Bulk: records not awaiting approval are skipped and reported on the job tasks; only a foreign
  id fails the batch.
- Refusal channel differs: invoices/bills return 422 on a refused single approve; credit notes
  return 200 with `isSuccess: false` while `approvalStatus` still reads the document's state.
  Check `isSuccess`, never `approvalStatus`.
- On a timeout or 500, read the record back and check its approval status before retrying.

---

## 25. Jots (Judgment Journal)

### POST /api/v1/jots

Batch-record judgment entries (1-100 per call). Per-entry independent: acks come back in input order, and a bad entry never fails the batch, it acks with `error` + `errorCode` while siblings persist. Rate valve: 600 writes per organization per minute.

```json
// Request
{
  "entries": [
    {
      "kind": "CLASSIFICATION",
      "tier": "MEDIUM",
      "call": "Posted to 6420 Travel: recurring vendor pattern",
      "why": "Same vendor posted to 6420 in 11 prior bills",
      "refs": [{ "raw": "BILL:41f626a3-...:CREATE" }],
      "idempotencyKey": "close-2026-06-bill-41f626a3"
    }
  ]
}

// Response
{ "data": { "records": [{ "resourceId": "...", "replayed": false, "duplicateCount": 0 }] } }
```

`kind`: CLASSIFICATION, MATCH, SCOPE, ASSUMPTION, RISK, METHOD, RECOVERY, DEVIATION, NOTE (the neutral fallback for a judgment logged without a declared type; a missing or blank `kind` defaults to NOTE and is flagged, not rejected; never declare NOTE deliberately). `tier`: LOW, MEDIUM, HIGH, CRITICAL. `refs` entries are OBJECTS: the string grammar `TYPE:resourceId[#field][:RELATION]` travels in `raw` (an unparseable ref is stored with `parsed: false`, never bounced). Optional fields: `ruledOut`, `frame`, `confidence`, `citedRule`, `workflowLabel`, `agentLabel`. `idempotencyKey` makes retries safe: a replay returns the existing entry with `replayed: true`.

**Jot doctrine (fill fields consistently; the server re-scores tier from kind + refs, and declared-vs-computed agreement is a review signal):**

- **When**: log a judgment when you chose among real alternatives and a write followed, or when you deliberately decided NOT to write. Skip mechanical actions. Jot AFTER the write succeeds; carry the written record's resourceId in `refs`.
- **Tier anchors** (mirror the server's rules): CRITICAL = money leaves (`PAY` ref), data destroyed (`DELETE` ref), external send or period lock (`FINALIZE` ref), or a RECOVERY that still drove a write. HIGH = the withheld write (RECOVERY with no mutation ref; it pins via withheld-write, not tier), or RISK/MATCH backed by a write. LOW = a DEVIATION detached from any write. MEDIUM = everything else.
- **Kind boundaries**: where a value LANDS (account, tax code) = CLASSIFICATION; how it is COMPUTED = METHOD. Filling one missing fact = ASSUMPTION; drawing a set boundary = SCOPE (carry `frame`). A decided omission after failure = RECOVERY, never DEVIATION.
- **Refs relation** is load-bearing: state what the write did (CREATE/UPDATE/DELETE/FINALIZE/PAY/RECONCILE/TRIGGER); SUBJECT only for no-write entries. PAY/DELETE/FINALIZE pin the jot regardless of declared tier.
- **confidence**: HIGH = clear rule or precedent; MEDIUM = pattern inference; LOW = a guess a reviewer should check.
- **workflowLabel**: use a canonical job name when one fits (`month-end-close`, `quarter-end-close`, `year-end-close`, `bank-recon`, `gst-vat-filing`, `payment-run`, `credit-control`, `supplier-recon`, `audit-prep`, `fa-review`, `document-collection`, `statutory-filing`), else short kebab-case.
- **Style**: tight, factual, plain punctuation; one line per field; never repeat content across fields; a call without a `why` is half a record. `duplicateCount > 0` on the ack = already recorded; do not re-jot; search first on repeated workflows.

### POST /api/v1/jots/search

Plain-value filter (no expression envelopes): `ref` (TYPE:resourceId containment), `kind`, `tier`, `dispositionVerb`, `freetext` (case-insensitive substring over call and why), `createdFrom` / `createdTo` (epoch ms, inclusive). Sort is pinned server-side (CRITICAL and withheld-write entries first, then newest); no client sort. `includeStats: true` adds per-credential disposition counts alongside the page.

```json
// Request
{ "limit": 100, "offset": 0, "filter": { "kind": "CLASSIFICATION" }, "includeStats": true }
```

### POST /api/v1/jots/:resourceId/disposition

Append one review verb to a jot (append-only: annotates, never mutates).

```json
// Request
{ "verb": "FLAG", "note": "Re-check the account mapping next close" }
```

`verb`: FLAG, REJECT, ENDORSE. REJECT with `rollback:true` queues an async rollback in the platform; the per-ref outcomes land on the disposition's `rollbackOutcome` and are readable via jot search (recall).

---

## 27. Unapplied Payments

Cash received (or paid) before anyone says what it pays for. Stored as a payment batch, so there is **no GET**: read it back through `POST /api/v1/batch-payments/search` with `"origin": ["UNAPPLIED"]` (a sibling of `filter`; the search defaults to `ALL`, which mixes ordinary batches in). Each row carries `hash`, `unappliedStatus` (`DRAFT` / `UNAPPLIED` / `APPLIED`), `consumedAmount` and `unappliedBalance`.

Rules that hold on every route below:
- **Every write after the create takes `hash`** (optimistic lock), from the search row or the previous write's response. A stale hash is refused (422 `INVALID_CHECK_SUM`). Writes that return the record return its new hash; delete and unbatch return only `{ resourceId }`.
- **`totalAmount` is the cash that arrived; attributions consume it** (`unappliedBalance = totalAmount - consumedAmount`). On an ordinary batch the total is the sum of its records instead.
- **Using up the balance converts the record into an ordinary batch payment, one-way** (attributions or attach). The response cannot say so (it has no `origin`): detect it from `unappliedBalance` reaching 0. Its `origin` becomes `BATCH`, so the `UNAPPLIED` search no longer returns it: a record missing from that search may have become a batch payment, so check the batch-payment search with `origin` `BATCH` or `ALL` before concluding it is gone.
- `paymentMethod` is the same 11-value enum as payments; lowercase or unknown values are 422.
- Not idempotent. Clio sends every one of these once and reports a lost answer as UNCONFIRMED with the read-back, never as success.
- **Search filters** (`BatchPaymentFilter`): `resourceId`, `type` (`AR` received / `AP` paid), `reference`, `organizationAccountResourceId`, `bankStatementEntryResourceId`, `paymentMethod`, `currencyCode`, `status`, `valueDate`, `createdAt`, `totalAmount`. Every one is an expression: `{"totalAmount": {"eq": 500}}`, never a bare `500` (400). There is **no contact filter**: a `contactResourceId` key is dropped, not refused, and every row comes back, so read the contact on the rows. `sortBy` takes `resourceId`, `reference`, `status`, `type`, `paymentMethod`, `valueDate`, `totalAmount`, `currencyCode`, `createdAt`; anything else (e.g. `amount`) is a 422. `search_unapplied_payments` sends these as `amount` / `minAmount` / `maxAmount` and `currencyCode`.

### POST /api/v1/unapplied-payments

```json
{ "businessTransactionType": "SALE", "organizationAccountResourceId": "<bank-uuid>", "paymentMethod": "BANK_TRANSFER",
  "amount": 500, "valueDate": "2026-09-23", "currencyCode": "SGD", "contactResourceId": "<contact-uuid>",
  "reference": "DEP-1", "saveAsDraft": true }
```

Required: `businessTransactionType` (`SALE` received / `PURCHASE` paid), `organizationAccountResourceId`, `paymentMethod`, `amount` (> 0), `valueDate`, `currencyCode`. `rateToFunctional` is required for a foreign currency. `contactResourceId` is optional. `saveAsDraft: true` posts nothing until activate. Optional: `functionalCurrencyCode`, `externalReference`, `notes`, `customFields`, `attachments`.

### PUT /api/v1/unapplied-payments/{resourceId}

`hash` plus any of `reference`, `externalReference`, `notes`, `paymentMethod`, `amount`, `organizationAccountResourceId`, `valueDate`, `rateToFunctional`, `customFields`, `attachments`, `children`. Changing `amount`, the account or the date releases an existing bank match. There is no `currencyCode`: the currency follows the account, and a move to an account in another currency needs `amount` restated in the new currency (or it is refused `CONTAINER_CURRENCY_CHANGE_INCOMPLETE`) and `rateToFunctional` when that currency is not the organization's own. The agent tool does not expose `children`; send them with `clio unapplied-payments update <id> --hash <hash> --input body.json`. `children` is a replacement list where a row LEFT OUT is KEPT: send `{ "resourceId": "<payment>", "deleted": true }` to remove one.

### DELETE /api/v1/unapplied-payments/{resourceId}

Body `{ "hash": "..." }` (a DELETE with a body). Deletes the record AND every payment record under it, so each document it settled is unpaid again, and reverses its unapplied remainder. **A reconciled record is not refused: its bank match is released and the delete proceeds**, leaving the bank record unreconciled. When `bankStatementEntryResourceId` is set, warn the user and confirm before deleting. Returns `{ resourceId }`.

### POST /api/v1/unapplied-payments/{resourceId}/activate

Body `{ "hash": "..." }`. Draft to active; the ledger entry posts here.

### POST /api/v1/unapplied-payments/{resourceId}/attributions

```json
{ "hash": "...", "attributions": [ { "businessTransactionResourceId": "<invoice-uuid>", "businessTransactionType": "SALE", "amount": 200 } ] }
```

1-500 entries; `businessTransactionType` is `SALE`, `PURCHASE`, `SALE_CREDIT_NOTE` or `PURCHASE_CREDIT_NOTE`. Each creates a payment record on that document. Optional per entry: `transactionAmount` (document currency), `transactionFee`, `transactionFeeCollected`. **The fee shape differs from a payment record's fee**: `{ feeValue, feeType: "AMOUNT" | "PERCENTAGE", feeOrganizationAccountResourceId, taxVatProfileResourceId?, feeTaxVatApplicable?, feeDescription? }` (not `FLAT`, not `feeAccountResourceId`).

### POST /api/v1/unapplied-payments/{resourceId}/payments

Body `{ "hash": "...", "paymentResourceId": "<payment-uuid>" }`. Groups an EXISTING standalone payment under this record: the payment keeps its document, the balance falls, the total stays.

### DELETE /api/v1/unapplied-payments/{resourceId}/children/{childResourceId}

Body `{ "hash": "..." }`. Removes one child; its cash returns to the balance. The child's `childOrigin` decides the rest: `ATTRIBUTED` (created here) is deleted, `ATTACHED` (existed before) survives as a standalone payment.

### POST /api/v1/unapplied-payments/{resourceId}/unbatch

Body `{ "hash": "..." }`. Deletes the record but RELEASES its payment records as standalone payments, each keeping its document, and reverses its unapplied remainder. Refused while reconciled: unmatch first. Returns `{ resourceId }`.

### POST /api/v1/reconciliations/unapplied-payment

```json
{ "bankStatementEntryResourceId": "<bse-uuid>", "unappliedPaymentDetails": { "paymentMethod": "BANK_TRANSFER", "contactResourceId": "<contact-uuid>" } }
```

Records an unapplied payment for the bank record and matches the two. Direction, account, currency, date and amount come from the bank record. `amount` is optional and, when sent, must EQUAL the bank record's amount (`TOTAL_RECONCILIATION_AMOUNT_MISMATCHED_WITH_STATEMENT_ENTRY_AMOUNT` otherwise); there is no partial match. `rateToFunctional` is required for a foreign-currency account. `amount` belongs INSIDE `unappliedPaymentDetails`: at the top level it is silently dropped. Returns `{ bankStatementEntryResourceId, status, reference, valueDate, unappliedPaymentResourceId }`.

---

## 29. Collaboration (Comments and Notifications)

Comment threads on a record, and the notifications for the caller about them. `{entityType}` is one of `bills`, `invoices`, `supplier-credit-notes`, `customer-credit-notes`, `bank-records`; a bank record also takes `?bankAccountResourceId=` (the bank account it belongs to). Every call acts as a user: an API key acts as the member who created it, and a key with no user is refused 401. Timestamps are epoch milliseconds.

### GET /api/v1/collaboration/{entityType}/{resourceId}/threads

Lists the comment threads on one record, newest thread first, each with its newest `commentLimit` comments (default 5, 0 for counts only); `commentsTruncated` says older comments exist.

### POST /api/v1/collaboration/{entityType}/{resourceId}/comments

Adds a comment (`content`, optional `threadId`) to one record; without `threadId` it joins the open thread or opens one. A mention is `<@userResourceId>` written in `content`, at most 20 distinct users, each an active member of the organization or the whole comment is refused 422; the answer carries `content` (saved markup `<Name@userResourceId>`), `text` (`@Name`) and `mentions`. Not idempotent: list the threads before retrying.

### GET /api/v1/collaboration/{entityType}/{resourceId}/threads/{threadId}/comments

Lists the comments of one thread on one record, newest first, paged with `limit` (at most 50) and `offset`.

### PUT /api/v1/collaboration/{entityType}/{resourceId}/threads/{threadId}/comments/{commentId}

Replaces the text of your own comment on one record while its thread is open. The new `content` is judged whole, so an edit can add mentions (`<@userResourceId>`) and remove them by leaving the markup out.

### DELETE /api/v1/collaboration/{entityType}/{resourceId}/threads/{threadId}/comments/{commentId}

Deletes your own comment on one record while its thread is open; a repeat answers 404.

### POST /api/v1/collaboration/{entityType}/{resourceId}/threads/{threadId}/resolve

Resolves a thread on one record, after which it accepts no new, edited or deleted comments; a repeat answers 422.

### GET /api/v1/collaboration/notifications

Lists the notifications for the caller about comments on bills, invoices, supplier credit notes, customer credit notes and bank records, newest first; unread only unless `status=all`.

### PUT /api/v1/collaboration/notifications/{notificationId}

Marks one notification read or unread with `{ "isRead": true | false }`; unread clears `readAt`.

### POST /api/v1/collaboration/notifications/read-all

Marks up to 2000 unread notifications of the caller read; call again while `more` is true.
