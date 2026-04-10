# Jaz API — Search Enum Values & Field Reference

> Valid enum values for every searchable field, organized by entity.
> For filter syntax and operators, see [search-reference.md](./search-reference.md).
> For complex composition and recipes, see [search-recipes.md](./search-recipes.md).

---

## Universal Enums

These values are shared across multiple entities.

### approvalStatus

| Value | Meaning |
|-------|---------|
| `PENDING` | Awaiting approval |
| `APPROVED` | Approved |

Used by: invoices, bills, customer credit notes, supplier credit notes.

### paymentMethod

| Value |
|-------|
| `CASH` |
| `CREDIT_CARD` |
| `BANK_TRANSFER` |
| `E_WALLET` |
| `CHEQUE` |
| `WITHHOLDING_TAX_CERTIFICATE` |
| `CLEARING_SETTLEMENT` |
| `DEBT_WRITE_OFF` |
| `INTER_COMPANY` |
| `OTHER` |
| `PAYMENT_GATEWAY` |

Used by: sale payments, purchase payments, batch payments, credit note refunds.

### currencyCode

ISO 4217 3-letter codes. Common values: `SGD`, `USD`, `PHP`, `MYR`, `IDR`, `THB`, `VND`, `EUR`, `GBP`, `AUD`, `HKD`, `JPY`, `CNY`, `INR`, `KRW`, `NZD`, `CAD`, `CHF`.

Used by: invoices, bills, credit notes, journals, items, scheduled transactions, fixed assets.

### accountClass (Chart of Accounts)

| Value |
|-------|
| `Asset` |
| `Liability` |
| `Equity` |
| `Revenue` |
| `Expense` |

### accountType (Chart of Accounts)

| Value |
|-------|
| `Bank Accounts` |
| `Cash and Cash Equivalents` |
| `Current Assets` |
| `Non-Current Assets` |
| `Current Liabilities` |
| `Non-Current Liabilities` |
| `Equity` |
| `Revenue` |
| `Cost of Goods Sold` |
| `Operating Expenses` |
| `Other Income` |
| `Other Expenses` |

---

## Per-Entity Enum Values

### 1. Invoices (`POST /api/v1/invoices/search`)

| Field | Valid Values |
|-------|-------------|
| `status` | `DRAFT`, `UNPAID`, `PARTIALLY_PAID`, `PAID`, `VOID` |
| `approvalStatus` | `PENDING`, `APPROVED` |
| `currencyCode` | ISO 4217 (see above) |
| `terms` | `0`, `7`, `15`, `30`, `45`, `60` (integer — payment terms in days) |

**Amount fields**: `totalAmount`, `balanceAmount`, `reconciledAmount`, `paymentRecordedAmount`, `creditAppliedAmount`
**Date fields**: `valueDate`, `dueDate`, `createdAt` (DateTime), `updatedAt` (DateTime), `approvedAt`, `submittedAt`

> **Note**: `OVERDUE` is not a direct status value. To find overdue invoices, use a compound filter: `status IN [UNPAID, PARTIALLY_PAID] AND dueDate < {today}`. See [search-recipes.md](./search-recipes.md#virtual-statuses).

---

### 2. Bills (`POST /api/v1/bills/search`)

| Field | Valid Values |
|-------|-------------|
| `status` | `DRAFT`, `UNPAID`, `PARTIALLY_PAID`, `PAID`, `VOID` |
| `approvalStatus` | `PENDING`, `APPROVED` |
| `currencyCode` | ISO 4217 |
| `terms` | `0`, `7`, `15`, `30`, `45`, `60` |

**Amount fields**: `totalAmount`, `balanceAmount`, `reconciledAmount`, `paymentRecordedAmount`, `creditAppliedAmount`
**Date fields**: `valueDate`, `dueDate`, `createdAt` (DateTime), `updatedAt` (DateTime), `approvedAt`, `submittedAt`

> Same status values and structure as invoices. Same overdue caveat applies.

---

### 3. Customer Credit Notes (`POST /api/v1/customer-credit-notes/search`)

| Field | Valid Values |
|-------|-------------|
| `status` | `DRAFT`, `UNAPPLIED`, `PARTIALLY_APPLIED`, `APPLIED`, `VOID` |
| `approvalStatus` | `PENDING`, `APPROVED` |
| `currencyCode` | ISO 4217 |

**Date fields**: `valueDate`, `createdAt` (DateTime), `updatedAt` (DateTime), `approvedAt`, `submittedAt`

> **No amount filter fields** — use `totalAmount` only via sort. To find available credits, filter `status IN [UNAPPLIED, PARTIALLY_APPLIED]`.

---

### 4. Supplier Credit Notes (`POST /api/v1/supplier-credit-notes/search`)

| Field | Valid Values |
|-------|-------------|
| `status` | `DRAFT`, `UNAPPLIED`, `PARTIALLY_APPLIED`, `APPLIED`, `VOID` |
| `approvalStatus` | `PENDING`, `APPROVED` |
| `currencyCode` | ISO 4217 |

**Date fields**: `valueDate`, `createdAt` (DateTime), `updatedAt` (DateTime), `approvedAt`, `submittedAt`

> Same structure as customer credit notes.

---

### 5. Journals (`POST /api/v1/journals/search`)

| Field | Valid Values |
|-------|-------------|
| `status` | `DRAFT`, `ACTIVE`, `VOID` |
| `type` | `JOURNAL_MANUAL`, `JOURNAL_DIRECT_CASH_IN`, `JOURNAL_DIRECT_CASH_OUT`, `JOURNAL_CASHFLOW`, `JOURNAL_CASH_TRANSFER`, `JOURNAL_TRANSFER_BALANCE`, `JOURNAL_CASHFLOW_BANK_RECON`, `JOURNAL_CASHFLOW_ADJUSTMENT` |
| `templateType` | `CASH_TRANSFER`, `DIRECT_CASH_IN`, `DIRECT_CASH_OUT` |

**Date fields**: `valueDate`, `createdAt` (DateTime), `updatedAt` (DateTime)
**String fields**: `reference`, `tags`, `internalNotes`

> **Gotcha**: Journal status uses `ACTIVE` (not `APPROVED` or `POSTED`). Use `type` to distinguish manual journals from system-generated ones.

---

### 6. Contacts (`POST /api/v1/contacts/search`)

| Field | Valid Values |
|-------|-------------|
| `status` | `ACTIVE`, `INACTIVE` |
| `customer` | `true`, `false` (BooleanExpression) |
| `supplier` | `true`, `false` (BooleanExpression) |

**String fields**: `name`, `email`, `taxId`, `registrationId`, `website`, `notes`, `networkId`, `organizationId`
**Date fields**: `createdAt`, `updatedAt`

> **Gotcha**: Use `customer` (not `isCustomer`) and `supplier` (not `isSupplier`). These are boolean filters: `{ "customer": { "eq": true } }`.

---

### 7. Items (`POST /api/v1/items/search`)

| Field | Valid Values |
|-------|-------------|
| `status` | `ACTIVE`, `INACTIVE` |
| `itemCategory` | `INVENTORY`, `NON_INVENTORY` |
| `appliesToSale` | `true`, `false` (BooleanExpression) |
| `appliesToPurchase` | `true`, `false` (BooleanExpression) |

**String fields**: `resourceId`, `saleAccountResourceId`, `purchaseAccountResourceId`

> **Gotcha**: Sort uses `internalName` and `itemCode` — these are sort-only fields, NOT available as filter fields.

---

### 8. Chart of Accounts (`POST /api/v1/chart-of-accounts/search`)

| Field | Valid Values |
|-------|-------------|
| `status` | `ACTIVE`, `INACTIVE` |
| `accountClass` | `Asset`, `Liability`, `Equity`, `Revenue`, `Expense` |
| `accountType` | See 12 values in Universal Enums above |
| `appliesTo` | `Sales & Sale Credits`, `Purchases & Purchase Credits`, `Payments` |
| `controlFlag` | `true`, `false` (BooleanExpression) |

**String fields**: `code`, `name`, `currencyCode`, `sgaName`
**Date fields**: `createdAt`, `updatedAt`

---

### 9. Bank Records (`POST /api/v1/bank-records/:accountResourceId/search`)

| Field | Valid Values |
|-------|-------------|
| `status` | `RECONCILED`, `UNRECONCILED`, `ARCHIVED`, `POSSIBLE_DUPLICATE` |

**Amount fields**: `netAmount`
**Date fields**: `valueDate`
**String fields**: `description`, `extAccountNumber`, `extContactName`, `extReference`
**Nested**: `reconciledBy` (UserNestedFilter)

> **Gotcha**: Requires `accountResourceId` as a **path parameter** (UUID of a bank-type CoA account). This is NOT a filter field — it's in the URL.

---

### 10. Cashflow Transactions (`POST /api/v1/cashflow-transactions/search`)

| Field | Valid Values |
|-------|-------------|
| `direction` | `PAYIN`, `PAYOUT` |
| `businessTransactionType` | `SALE`, `PURCHASE`, `SALE_CREDIT_NOTE`, `PURCHASE_CREDIT_NOTE`, `JOURNAL_MANUAL`, `JOURNAL_DIRECT_CASH_IN`, `JOURNAL_DIRECT_CASH_OUT`, `JOURNAL_CASHFLOW`, `JOURNAL_CASH_TRANSFER`, `JOURNAL_CASHFLOW_BANK_RECON`, `JOURNAL_CASHFLOW_ADJUSTMENT`, `PAYMENT_SALE`, `PAYMENT_PURCHASE`, `PAYMENT_SALE_CREDIT_NOTE`, `PAYMENT_PURCHASE_CREDIT_NOTE`, `BATCH_SALE`, `BATCH_PURCHASE`, `FIXED_ASSETS` |
| `businessTransactionStatus` | `ACTIVE`, `UNPAID`, `PARTIALLY_PAID`, `PAID`, `VOID`, `DRAFT`, `UNAPPLIED`, `PARTIALLY_APPLIED`, `APPLIED` |

**Amount fields**: `totalAmount`, `balanceAmount`
**Date fields**: `valueDate`, `matchDate`
**String fields**: `businessTransactionReference`, `organizationAccountResourceId`, `bankStatementEntryResourceId`
**Nested**: `contact` (ContactNestedFilter), `account` (OrganizationAccountNestedFilter)

> **Gotcha**: `businessTransactionStatus` values vary by transaction type — invoices use UNPAID/PAID, credit notes use UNAPPLIED/APPLIED, journals use ACTIVE.

---

### 11. Tax Profiles (`POST /api/v1/tax-profiles/search`)

| Field | Valid Values |
|-------|-------------|
| `status` | `ACTIVE`, `INACTIVE` |
| `isDefault` | `true`, `false` (BooleanExpression) |
| `isShipping` | `true`, `false` (BooleanExpression) |
| `appliesToSale` | `true`, `false` (BooleanExpression) |
| `appliesToSaleCreditNote` | `true`, `false` (BooleanExpression) |
| `appliesToPurchase` | `true`, `false` (BooleanExpression) |
| `appliesToPurchaseCreditNote` | `true`, `false` (BooleanExpression) |

**Amount fields**: `vatValue`, `withholdingValue`
**String fields**: `name`, `description`, `taxTypeCode`, `taxTypeName`, `organizationResourceId`

---

### 12. Fixed Assets (`POST /api/v1/fixed-assets/search`)

| Field | Valid Values |
|-------|-------------|
| `status` | `ACTIVE`, `DRAFT`, `DISPOSED`, `SOLD`, `DISCARDED`, `COMPLETED`, `ONGOING` |
| `category` | `TANGIBLE`, `INTANGIBLE` |
| `depreciationMethod` | `NO_DEPRECIATION`, `STRAIGHT_LINE` |
| `disposalType` | `SOLD`, `DISCARDED` |
| `registrationType` | `NEW`, `TRANSFER` |

**Amount fields**: `purchaseAmount`, `bookValueAmount`, `netBookAtDisposalAmount`, `assetDisposalGainLossAmount`
**Date fields**: `purchaseDate`, `disposalValueDate`, `depreciationStartDate`, `depreciationEndDate`
**String fields**: `name`, `reference`, `typeName`, `typeCode`, `tags`, `currencyCode`, `purchaseBusinessTransactionType`

---

### 13. Fixed Asset Types (`POST /api/v1/fixed-assets-types/search`)

No enum fields. String filters only: `categoryCode`, `typeName`, `typeCode`, `resourceId`.

---

### 14. Scheduled Transactions (`POST /api/v1/scheduled-transaction/search`)

| Field | Valid Values |
|-------|-------------|
| `status` | `ACTIVE`, `INACTIVE` |
| `subscriptionStatus` | `ACTIVE`, `CANCELLED`, `INACTIVE` |
| `interval` | `ONE_TIME`, `DAILY`, `WEEKLY`, `MONTHLY`, `QUARTERLY`, `YEARLY` |

**Amount fields**: `totalAmount`, `paymentRecordedAmount`
**Date fields**: `startDate`, `endDate`, `lastScheduleDate`, `nextScheduleDate`, `proratedStartDate`
**String fields**: `businessTransactionReference`, `businessTransactionResourceId`, `businessTransactionType`, `schedulerType`, `contactResourceId`, `currencyCode`, `referenceGenerationMode`
**Nested**: `contact` (ContactNestedFilter)

---

### 15. Tags (`POST /api/v1/tags/search`)

| Field | Valid Values |
|-------|-------------|
| `status` | `ACTIVE`, `INACTIVE` |

**String fields**: `tagName`, `organizationResourceId`

---

### 16. Custom Fields (`POST /api/v1/custom-fields/search`)

| Field | Valid Values |
|-------|-------------|
| `status` | `ACTIVE`, `INACTIVE` |
| `datatypeCode` | `TEXT`, `NUMBER`, `BOOLEAN`, `DATE`, `LINK` |

**String fields**: `customFieldName`, `organizationResourceId`, `applyToPurchase`, `applyToPurchaseCreditNote`, `applyToSales`, `applyToSaleCreditNote`, `appliesToFixedAssets`, `appliesToItems`, `applyToCreditNote`, `applyToPayment`

---

### 17. Contact Groups (`POST /api/v1/contact-groups/search`)

No enum fields. String filters only: `resourceId`, `name`.

---

### 18. Capsules (`POST /api/v1/capsules/search`)

| Field | Valid Values |
|-------|-------------|
| `status` | `ACTIVE`, `INACTIVE` |

**Date fields**: `startDate`, `endDate`
**String fields**: `title`, `description`

> **Gotcha**: Capsules use `title` (not `name`) for the display name.

---

### 19. Capsule Types (`POST /api/v1/capsuleTypes/search`)

| Field | Valid Values |
|-------|-------------|
| `status` | `ACTIVE`, `INACTIVE` |
| `controlFlag` | `true`, `false` (BooleanExpression) |
| `isLocked` | `true`, `false` (BooleanExpression) |

**String fields**: `name`, `displayName`, `description`

---

### 20. Nano Classifiers (`POST /api/v1/nano-classifiers/search`)

No enum fields on the top level. String filters: `resourceId`, `type`.
**Nested**: `classes` (className, resourceId).

---

### 21. Organization Users (`POST /api/v1/organization-users/search`)

| Field | Valid Values |
|-------|-------------|
| `status` | `ACTIVE`, `INACTIVE` |
| `role` | `ADMIN`, `CUSTOM_USER` |

**String fields**: `name`, `email`

---

### 22. Bank Rules (`POST /api/v1/bank-rules/search`)

No documented enum values for `actionType` or `businessTransactionType` in the filter schema. Use string operators.

**String fields**: `name`, `reference`, `resourceId`, `appliesToReconciliationAccount`, `actionType`, `businessTransactionType`

---

### 23. Purchase Items (`POST /api/v1/purchase-items/search`)

No enum fields. Plain string filters (no operators): `currencyCode`, `name`, `purchaseResourceId`, `resourceId`, `reference`.

> **Gotcha**: This endpoint uses **plain string matching** — filter values are NOT expression objects. `{ "name": "Widget" }` instead of `{ "name": { "contains": "Widget" } }`.

### 24. Background Jobs (`POST /api/v1/background-jobs/search`)

#### status

| Value | Meaning |
|-------|---------|
| `QUEUED` | Job queued, not yet started |
| `DISPATCHING` | Job being dispatched to workers |
| `PROCESSING` | Job actively running |
| `SUCCESS` | Completed successfully |
| `FAILED` | Failed entirely |
| `PARTIAL_SUCCESS` | Completed with some errors — check `errorDetails` |

> **Filter path**: Use `filter.resourceId.eq` (not `filter.jobId.eq`) to look up a specific job by its ID. Filter by `status` to find all jobs in a given state.

---

## Nested Filter Paths

Several endpoints support filtering on nested relationships. The nested object wraps standard operators.

### contact (ContactNestedFilter)

Available on: invoices, bills, credit notes, journals, cashflow transactions, scheduled transactions.

| Nested Field | Type | Example |
|-------------|------|---------|
| `contact.name` | StringExpression | `{ "contact": { "name": { "contains": "Acme" } } }` |
| `contact.resourceId` | StringExpression | `{ "contact": { "resourceId": { "eq": "uuid" } } }` |
| `contact.status` | StringExpression | `{ "contact": { "status": { "eq": "ACTIVE" } } }` |
| `contact.taxId` | StringExpression | `{ "contact": { "taxId": { "contains": "T12" } } }` |

### account (OrganizationAccountNestedFilter)

Available on: cashflow transactions.

| Nested Field | Type | Example |
|-------------|------|---------|
| `account.accountType` | StringExpression | `{ "account": { "accountType": { "eq": "Bank Accounts" } } }` |
| `account.accountClass` | StringExpression | `{ "account": { "accountClass": { "eq": "Asset" } } }` |
| `account.code` | StringExpression | `{ "account": { "code": { "eq": "1000" } } }` |
| `account.name` | StringExpression | `{ "account": { "name": { "contains": "DBS" } } }` |
| `account.resourceId` | StringExpression | `{ "account": { "resourceId": { "eq": "uuid" } } }` |

### approvedBy / submittedBy / reconciledBy (UserNestedFilter)

Available on: invoices, bills, credit notes (approvedBy, submittedBy); bank records (reconciledBy).

| Nested Field | Type |
|-------------|------|
| `*.email` | StringExpression |
| `*.firstName` | StringExpression |
| `*.lastName` | StringExpression |
| `*.resourceId` | StringExpression |
| `*.status` | StringExpression |

Example: `{ "approvedBy": { "email": { "contains": "admin@" } } }`

### attachments (AttachmentNestedFilter)

Available on: invoices, bills.

| Nested Field | Type |
|-------------|------|
| `attachments.fileName` | StringExpression |
| `attachments.fileType` | StringExpression |
| `attachments.fileUrl` | StringExpression |
| `attachments.resourceId` | StringExpression |

To check if attachments exist: `{ "attachments": { "resourceId": { "isNull": "false" } } }`
To check no attachments: `{ "attachments": { "resourceId": { "isNull": "true" } } }`

### createdBy / updatedBy (JsonExpression)

Available on: invoices, bills.

Uses `jsonIn` / `jsonNotIn` operators with key-value pairs:
```json
{ "createdBy": { "jsonIn": [{ "key": "email", "value": "admin@company.com" }] } }
```

### creator (UserNestedFilter)

Available on: journals only (not `createdBy` — journals use `creator`).

| Nested Field | Type |
|-------------|------|
| `creator.email` | StringExpression |
| `creator.firstName` | StringExpression |
| `creator.lastName` | StringExpression |
| `creator.resourceId` | StringExpression |

---

## Response Field Mapping

### Date Format Asymmetry

| Direction | Format | Example |
|-----------|--------|---------|
| **Request** (filter dates) | `YYYY-MM-DD` string | `"2026-01-15"` |
| **Request** (filter datetimes) | RFC3339 string | `"2026-01-15T00:00:00Z"` |
| **Response** (ALL dates) | `int64` epoch milliseconds | `1705276800000` |

Convert response dates: `new Date(epochMs).toISOString().slice(0, 10)` -> `YYYY-MM-DD`

### Which Fields Use DateTimeExpression (RFC3339)?

Only `createdAt` and `updatedAt` on invoices, bills, customer credit notes, supplier credit notes, and journals use `DateTimeExpression` (RFC3339 input format).

All other date fields (`valueDate`, `dueDate`, `startDate`, `endDate`, `purchaseDate`, `approvedAt`, `submittedAt`, `matchDate`, etc.) use `DateExpression` (`YYYY-MM-DD` input format).

### Response Shapes

All search endpoints return:
```json
{
  "totalElements": 142,
  "totalPages": 2,
  "data": [...]
}
```

**Exception**: `POST /organization-report-template/search` returns a plain array (no pagination metadata).

---

*Source of truth: Jaz API backend Go structs + OpenAPI specification. Last updated: 2026-03-31.*