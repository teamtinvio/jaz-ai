# Jaz API — Search Endpoint Reference

> Single source of truth for all `POST /*/search` endpoints. Every filter field,
> sort field, and operator is extracted from the API backend Go structs and validated
> against the live production API. **Do not guess — look up the exact fields here.**

---

## Universal Search Pattern

All search endpoints share this identical structure:

```json
{
  "filter": { "fieldName": { "operator": "value" } },
  "sort": { "sortBy": ["field1"], "order": "ASC" },
  "limit": 100,
  "offset": 0
}
```

| Property | Type | Required | Constraints |
|----------|------|----------|-------------|
| `filter` | object | No | Per-endpoint fields (see tables below) |
| `sort` | object | **Yes if `offset` is present** | `sortBy`: array of field names; `order`: `"ASC"` or `"DESC"` |
| `limit` | int | No | Default: 100, min: 1, max: 1000 |
| `offset` | int | No | Default: 0, min: 0, max: 65536 |

**Response shape**: `{ totalElements, totalPages, data: [...] }` — all search/list endpoints return this flat structure directly (no outer `data` wrapper).

> **Exception**: `POST /organization-report-template/search` returns a plain array (no pagination metadata, no `totalElements`/`totalPages`).

---

## Filter Operators

### String Operators (`StringExpression`)

| Operator | Type | Example | Notes |
|----------|------|---------|-------|
| `eq` | string | `{ "status": { "eq": "ACTIVE" } }` | Exact match |
| `neq` | string | `{ "status": { "neq": "DRAFT" } }` | Not equal |
| `contains` | string | `{ "reference": { "contains": "INV" } }` | Substring match |
| `in` | string[] | `{ "status": { "in": ["ACTIVE", "DRAFT"] } }` | Max 100 values |
| `reg` | string[] | `{ "name": { "reg": ["^Acme.*"] } }` | Regex patterns, max 100 |
| `likeIn` | string[] | `{ "name": { "likeIn": ["Acme%"] } }` | SQL LIKE patterns, max 100 |
| `isNull` | string | `{ "reference": { "isNull": "true" } }` | Null check |

### Numeric Operators (`BigDecimalExpression`)

| Operator | Type | Example |
|----------|------|---------|
| `eq` | number | `{ "totalAmount": { "eq": 1000 } }` |
| `gt` | number | `{ "totalAmount": { "gt": 500 } }` |
| `gte` | number | `{ "totalAmount": { "gte": 500 } }` |
| `lt` | number | `{ "totalAmount": { "lt": 10000 } }` |
| `lte` | number | `{ "totalAmount": { "lte": 10000 } }` |
| `in` | number[] | `{ "totalAmount": { "in": [100, 200, 300] } }` |

### Integer Operators (`IntExpression`)

Same as numeric: `eq`, `gt`, `gte`, `lt`, `lte`, `in` (used by `terms` field on invoices/bills).

### Date Operators (`DateExpression`) — format: `YYYY-MM-DD`

| Operator | Type | Example |
|----------|------|---------|
| `eq` | string | `{ "valueDate": { "eq": "2026-01-15" } }` |
| `gt` | string | `{ "valueDate": { "gt": "2026-01-01" } }` |
| `gte` | string | `{ "valueDate": { "gte": "2026-01-01" } }` |
| `lt` | string | `{ "valueDate": { "lt": "2026-12-31" } }` |
| `lte` | string | `{ "valueDate": { "lte": "2026-12-31" } }` |
| `between` | string[2] | `{ "valueDate": { "between": ["2026-01-01", "2026-03-31"] } }` |

**CRITICAL**: `between` requires EXACTLY 2 values. All date strings must be `YYYY-MM-DD`.

### DateTime Operators (`DateTimeExpression`) — format: RFC3339

Same operators as DateExpression but accepts RFC3339 strings (e.g., `"2026-01-15T00:00:00Z"`).
Used by `createdAt` and `updatedAt` fields. Internally converted to epoch milliseconds.

### Boolean Operators (`BooleanExpression`)

| Operator | Type | Example |
|----------|------|---------|
| `eq` | boolean | `{ "customer": { "eq": true } }` |

### JSON Operators (`JsonExpression`)

| Operator | Type | Example |
|----------|------|---------|
| `jsonIn` | array | `{ "createdBy": { "jsonIn": [{ "key": "email", "value": "admin@co.sg" }] } }` |
| `jsonNotIn` | array | Same structure, excludes matches |

### Logical Operators

Nest filters inside `and`, `or`, `not` objects:

```json
{
  "filter": {
    "status": { "eq": "UNPAID" },
    "and": {
      "totalAmount": { "gt": 1000 }
    }
  }
}
```

Invoices, bills, and journals also support `andGroup` / `orGroup` (arrays of filter groups):

```json
{
  "filter": {
    "andGroup": [
      { "and": { "status": { "eq": "UNPAID" } } },
      { "or": { "valueDate": { "gte": "2026-01-01" } } }
    ]
  }
}
```

### Nested Filter Objects

Some fields accept nested object filters:

**`contact` (ContactNestedFilter)**: `name`, `resourceId`, `status`, `taxId`
```json
{ "filter": { "contact": { "name": { "contains": "Acme" } } } }
```

**`account` (OrganizationAccountNestedFilter)**: `accountType`, `accountClass`, `code`, `name`, `resourceId`
```json
{ "filter": { "account": { "accountType": { "eq": "Bank Accounts" } } } }
```

**`approvedBy` / `submittedBy` / `reconciledBy` (UserNestedFilter)**: `email`, `firstName`, `lastName`, `phoneRegistered`, `resourceId`, `status`

**`attachments` (AttachmentNestedFilter)**: `fileName`, `fileType`, `fileUrl`, `resourceId`

---

## Date Format Asymmetry (CRITICAL)

| Direction | Format | Fields |
|-----------|--------|--------|
| **Request** (filter dates) | `YYYY-MM-DD` strings | `valueDate`, `dueDate`, `startDate`, `endDate`, `purchaseDate`, etc. |
| **Request** (filter datetimes) | RFC3339 strings | `createdAt`, `updatedAt` |
| **Response** (ALL dates) | `int64` epoch milliseconds | `valueDate`, `createdAt`, `updatedAt`, `approvedAt`, `submittedAt`, `matchDate`, etc. |

To convert response dates: `new Date(epochMs).toISOString().slice(0, 10)` → `YYYY-MM-DD`

**Timezone convention**: All business dates (`valueDate`, `dueDate`, etc.) are in the **organization's timezone** — both in requests and responses. The DB stores epoch ms representing the org-local date (no timezone conversion is ever performed). Only audit timestamps (`createdAt`, `updatedAt`) are UTC.

---

## Per-Endpoint Filter & Sort Fields

### 1. POST /api/v1/invoices/search

**Filter fields** (`SaleFilter`):
| Field | Type | Notes |
|-------|------|-------|
| `resourceId` | StringExpression | |
| `contactResourceId` | StringExpression | |
| `status` | StringExpression | POSTED, DRAFT, VOIDED, etc. |
| `reference` | StringExpression | Invoice number |
| `terms` | IntExpression | Payment terms (days) |
| `contact` | ContactNestedFilter | Nested: name, resourceId, status, taxId |
| `valueDate` | DateExpression | |
| `dueDate` | DateExpression | |
| `tags` | StringExpression | |
| `currencyCode` | StringExpression | |
| `approvalStatus` | StringExpression | |
| `approvedAt` | DateExpression | |
| `approvedBy` | UserNestedFilter | |
| `submittedAt` | DateExpression | |
| `submittedBy` | UserNestedFilter | |
| `balanceAmount` | BigDecimalExpression | |
| `creditAppliedAmount` | BigDecimalExpression | |
| `paymentRecordedAmount` | BigDecimalExpression | |
| `reconciledAmount` | BigDecimalExpression | |
| `totalAmount` | BigDecimalExpression | |
| `createdAt` | DateTimeExpression | RFC3339 input |
| `createdBy` | JsonExpression | |
| `updatedAt` | DateTimeExpression | RFC3339 input |
| `updatedBy` | JsonExpression | |
| `attachments` | AttachmentNestedFilter | |

**Logical**: `and`, `or`, `andGroup`, `orGroup`

**Sort fields** (max 25): `resourceId`, `contactResourceId`, `status`, `reference`, `terms`, `contact`, `valueDate`, `dueDate`, `tags`, `currencyCode`, `createdAt`, `createdBy`, `attachments`, `balanceAmount`, `creditAppliedAmount`, `paymentRecordedAmount`, `reconciledAmount`, `totalAmount`, `approvalStatus`, `approvedAt`, `approvedBy`, `submittedAt`, `submittedBy`, `updatedAt`, `updatedBy`

---

### 2. POST /api/v1/bills/search

**Filter fields** (`PurchaseFilter`):
| Field | Type | Notes |
|-------|------|-------|
| `resourceId` | StringExpression | |
| `contactResourceId` | StringExpression | |
| `contact` | ContactNestedFilter | |
| `status` | StringExpression | |
| `reference` | StringExpression | |
| `valueDate` | DateExpression | |
| `dueDate` | DateExpression | |
| `terms` | IntExpression | |
| `tags` | StringExpression | |
| `currencyCode` | StringExpression | |
| `approvalStatus` | StringExpression | |
| `submittedBy` | UserNestedFilter | |
| `submittedAt` | DateExpression | |
| `approvedBy` | UserNestedFilter | |
| `approvedAt` | DateExpression | |
| `createdBy` | JsonExpression | |
| `createdAt` | DateTimeExpression | |
| `totalAmount` | BigDecimalExpression | |
| `attachments` | AttachmentNestedFilter | |
| `balanceAmount` | BigDecimalExpression | |
| `paymentRecordedAmount` | BigDecimalExpression | |
| `reconciledAmount` | BigDecimalExpression | |
| `creditAppliedAmount` | BigDecimalExpression | |
| `updatedBy` | JsonExpression | |
| `updatedAt` | DateTimeExpression | |

**Logical**: `and`, `or`, `andGroup`, `orGroup`

**Sort fields** (max 25): `resourceId`, `contactResourceId`, `contactName`, `status`, `reference`, `valueDate`, `dueDate`, `terms`, `tags`, `currencyCode`, `approvalStatus`, `submittedBy`, `submittedAt`, `approvedBy`, `approvedAt`, `createdBy`, `createdAt`, `totalAmount`, `attachments`, `balanceAmount`, `paymentRecordedAmount`, `reconciledAmount`, `creditAppliedAmount`, `updatedBy`, `updatedAt`

---

### 3. POST /api/v1/customer-credit-notes/search

**Filter fields** (`CustomerCreditNoteFilter`):
| Field | Type |
|-------|------|
| `resourceId` | StringExpression |
| `contactResourceId` | StringExpression |
| `status` | StringExpression |
| `reference` | StringExpression |
| `tags` | StringExpression |
| `valueDate` | DateExpression |
| `contact` | ContactNestedFilter |
| `currencyCode` | StringExpression |
| `approvalStatus` | StringExpression |
| `submittedBy` | UserNestedFilter |
| `submittedAt` | DateExpression |
| `approvedBy` | UserNestedFilter |
| `approvedAt` | DateExpression |
| `createdAt` | DateTimeExpression |
| `updatedAt` | DateTimeExpression |
| `createdBy` | JsonExpression |

**Logical**: `and`, `or`

**Sort fields** (max 15): `resourceId`, `contactResourceId`, `status`, `reference`, `tags`, `valueDate`, `contact`, `currencyCode`, `approvalStatus`, `submittedBy`, `submittedAt`, `approvedBy`, `approvedAt`, `createdAt`, `createdBy`

---

### 4. POST /api/v1/supplier-credit-notes/search

**Filter fields** (`SupplierCreditNoteFilter`): Same as customer-credit-notes (resourceId, contactResourceId, status, reference, tags, valueDate, contact, currencyCode, approvalStatus, submittedBy, submittedAt, approvedBy, approvedAt, createdAt, createdBy, updatedAt).

**Logical**: `and`, `or`

**Sort fields** (max 15): Same as customer-credit-notes.

---

### 5. POST /api/v1/journals/search

**Filter fields** (`JournalFilter`):
| Field | Type | Notes |
|-------|------|-------|
| `resourceId` | StringExpression | |
| `tags` | StringExpression | |
| `reference` | StringExpression | |
| `status` | StringExpression | |
| `contact` | ContactNestedFilter | |
| `creator` | UserNestedFilter | |
| `createdAt` | DateTimeExpression | |
| `updatedAt` | DateTimeExpression | |
| `valueDate` | DateExpression | |
| `type` | StringExpression | JOURNAL_MANUAL, JOURNAL_DIRECT_CASH_IN, etc. |
| `templateType` | StringExpression | |
| `internalNotes` | StringExpression | |

**Logical**: `and`, `or`, `andGroup`, `orGroup`

**Sort fields** (max 10): `resourceId`, `reference`, `status`, `contact`, `creator`, `createdAt`, `valueDate`, `type`, `templateType`

---

### 6. POST /api/v1/contacts/search

**Filter fields** (`ContactFilter`):
| Field | Type |
|-------|------|
| `resourceId` | StringExpression |
| `customer` | BooleanExpression |
| `supplier` | BooleanExpression |
| `email` | StringExpression |
| `name` | StringExpression |
| `networkId` | StringExpression |
| `notes` | StringExpression |
| `organizationId` | StringExpression |
| `registrationId` | StringExpression |
| `status` | StringExpression |
| `taxId` | StringExpression |
| `website` | StringExpression |
| `createdAt` | DateExpression |
| `updatedAt` | DateExpression |

**Logical**: `not`, `and`, `or`

**Sort fields** (max 13): `resourceId`, `customer`, `supplier`, `name`, `networkId`, `notes`, `organizationId`, `registrationId`, `status`, `taxId`, `website`, `createdAt`, `updatedAt`

---

### 7. POST /api/v1/items/search

**Filter fields** (`ItemFilter`):
| Field | Type |
|-------|------|
| `resourceId` | StringExpression |
| `appliesToPurchase` | BooleanExpression |
| `purchaseAccountResourceId` | StringExpression |
| `appliesToSale` | BooleanExpression |
| `saleAccountResourceId` | StringExpression |
| `status` | StringExpression |
| `itemCategory` | StringExpression |

**Sort fields** (max 10): `resourceId`, `internalName`, `itemCode`, `itemCategory`, `status`, `updatedAt`, `createdAt`

> **Note**: Filter uses `itemCategory` but sort uses `internalName` and `itemCode` — these are sort-only fields not available as filters.

---

### 8. POST /api/v1/tags/search

**Filter fields** (`TagFilter`):
| Field | Type |
|-------|------|
| `resourceId` | StringExpression |
| `organizationResourceId` | StringExpression |
| `status` | StringExpression |
| `tagName` | StringExpression |

**Logical**: `not`, `and`, `or`

**Sort fields** (max 13): `resourceId`, `organizationResourceId`, `tagName`, `status`

---

### 9. POST /api/v1/chart-of-accounts/search

**Filter fields** (`AccountFilter`):
| Field | Type |
|-------|------|
| `accountClass` | StringExpression |
| `accountType` | StringExpression |
| `appliesTo` | StringExpression |
| `code` | StringExpression |
| `controlFlag` | BooleanExpression |
| `name` | StringExpression |
| `currencyCode` | StringExpression |
| `resourceId` | StringExpression |
| `sgaName` | StringExpression |
| `status` | StringExpression |
| `createdAt` | DateExpression |
| `updatedAt` | DateExpression |

**Logical**: `and`, `or`

**Sort fields** (max 10): `accountClass`, `accountType`, `appliesTo`, `code`, `controlFlag`, `currencyCode`, `name`, `resourceId`, `sgaName`, `status`

---

### 10. POST /api/v1/cashflow-transactions/search

**Filter fields** (`TransactionsFilter`):
| Field | Type | Notes |
|-------|------|-------|
| `resourceId` | StringExpression | |
| `contact` | ContactNestedFilter | |
| `businessTransactionReference` | StringExpression | |
| `direction` | StringExpression | `PAYIN` or `PAYOUT` |
| `businessTransactionStatus` | StringExpression | |
| `account` | OrganizationAccountNestedFilter | Nested: accountType, accountClass, code, name, resourceId |
| `organizationAccountResourceId` | StringExpression | |
| `bankStatementEntryResourceId` | StringExpression | |
| `businessTransactionType` | StringExpression | SALE, PURCHASE, JOURNAL_MANUAL, etc. |
| `valueDate` | DateExpression | |
| `matchDate` | DateExpression | |
| `balanceAmount` | BigDecimalExpression | |
| `totalAmount` | BigDecimalExpression | |

**Logical**: `and`, `or`

**Sort fields** (max 13): `resourceId`, `contact`, `businessTransactionReference`, `direction`, `businessTransactionStatus`, `account`, `organizationAccountResourceId`, `bankStatementEntryResourceId`, `businessTransactionType`, `valueDate`, `matchDate`, `balanceAmount`, `totalAmount`

**Response shape**: `{ totalElements, totalPages, data: [...] }` (flat, same as all other search endpoints).

---

### 11. POST /api/v1/bank-records/:accountResourceId/search

**Path parameter**: `accountResourceId` (UUID of a bank-type CoA account — required)

**Filter fields** (`BankStatementEntryFilter`):
| Field | Type | Notes |
|-------|------|-------|
| `resourceId` | StringExpression | |
| `description` | StringExpression | |
| `extAccountNumber` | StringExpression | |
| `extContactName` | StringExpression | |
| `extReference` | StringExpression | |
| `netAmount` | BigDecimalExpression | |
| `status` | StringExpression | `RECONCILED`, `UNRECONCILED`, `ARCHIVED`, `POSSIBLE_DUPLICATE` |
| `valueDate` | DateExpression | |
| `reconciledBy` | UserNestedFilter | |

**Logical**: `and`, `or`

**Sort fields** (max 9): `description`, `extAccountNumber`, `extContactName`, `extReference`, `netAmount`, `reconciledBy`, `resourceId`, `status`, `valueDate`

---

### 12. POST /api/v1/tax-profiles/search

**Filter fields** (`TaxProfileFilter`):
| Field | Type |
|-------|------|
| `resourceId` | StringExpression |
| `appliesToPurchase` | BooleanExpression |
| `appliesToPurchaseCreditNote` | BooleanExpression |
| `appliesToSale` | BooleanExpression |
| `appliesToSaleCreditNote` | BooleanExpression |
| `organizationResourceId` | StringExpression |
| `description` | StringExpression |
| `name` | StringExpression |
| `status` | StringExpression |
| `taxTypeCode` | StringExpression |
| `taxTypeName` | StringExpression |
| `isDefault` | BooleanExpression |
| `isShipping` | BooleanExpression |
| `vatValue` | BigDecimalExpression |
| `withholdingValue` | BigDecimalExpression |

**Logical**: `not`, `and`, `or`

**Sort fields** (max 15): `resourceId`, `organizationResourceId`, `name`, `description`, `status`, `taxTypeCode`, `taxTypeName`, `isDefault`, `isShipping`, `vatValue`, `withholdingValue`, `appliesToPurchase`, `appliesToPurchaseCreditNote`, `appliesToSale`, `appliesToSaleCreditNote`

---

### 13. POST /api/v1/custom-fields/search

**Filter fields** (`CustomFieldFilter`):
| Field | Type |
|-------|------|
| `resourceId` | StringExpression |
| `organizationResourceId` | StringExpression |
| `status` | StringExpression |
| `applyToPurchase` | StringExpression |
| `applyToPurchaseCreditNote` | StringExpression |
| `applyToSales` | StringExpression |
| `applyToSaleCreditNote` | StringExpression |
| `appliesToFixedAssets` | StringExpression |
| `appliesToItems` | StringExpression |
| `applyToCreditNote` | StringExpression |
| `applyToPayment` | StringExpression |
| `datatypeCode` | StringExpression |
| `customFieldName` | StringExpression |

**Logical**: `not`, `and`, `or`

**Sort fields** (max 13): `resourceId`, `organizationResourceId`, `customFieldName`, `datatypeCode`, `status`, `appliesToPurchase`, `appliesToPurchaseCreditNote`, `appliesToSale`, `appliesToSaleCreditNote`, `appliesToFixedAssets`, `appliesToItems`, `applyToCreditNote`, `applyToPayment`

---

### 14. POST /api/v1/contact-groups/search

**Filter fields** (`ContactGroupFilter`):
| Field | Type |
|-------|------|
| `resourceId` | StringExpression |
| `name` | StringExpression |

**Logical**: `and`, `or`

**Sort fields** (max 13): `resourceId`, `name`

---

### 15. POST /api/v1/capsules/search

**Filter fields** (`CapsuleFilter`):
| Field | Type |
|-------|------|
| `resourceId` | StringExpression |
| `description` | StringExpression |
| `endDate` | DateExpression |
| `startDate` | DateExpression |
| `status` | StringExpression |
| `title` | StringExpression |

**Logical**: `and`, `or`

**Sort fields** (max 10): `resourceId`, `title`, `status`, `description`, `attributes`, `endDate`, `startDate`, `organizationResourceId`, `totalSchedulers`, `totalTransactions`

> **Note**: Capsules uses `title` (not `name`) for the display name field.

---

### 16. POST /api/v1/capsuleTypes/search

**Filter fields** (`CapsuleTypesFilter`):
| Field | Type |
|-------|------|
| `resourceId` | StringExpression |
| `description` | StringExpression |
| `displayName` | StringExpression |
| `name` | StringExpression |
| `status` | StringExpression |
| `controlFlag` | BooleanExpression |
| `isLocked` | BooleanExpression |

**Logical**: `and`, `or`

**Sort fields** (max 10): `resourceId`, `title`, `status`, `description`, `displayName`, `name`

---

### 17. POST /api/v1/fixed-assets/search

**Filter fields** (`FixedAssetsFilter`):
| Field | Type |
|-------|------|
| `resourceId` | StringExpression |
| `name` | StringExpression |
| `reference` | StringExpression |
| `category` | StringExpression |
| `currencyCode` | StringExpression |
| `depreciationEndDate` | DateExpression |
| `depreciationStartDate` | DateExpression |
| `depreciationMethod` | StringExpression |
| `disposalType` | StringExpression |
| `typeName` | StringExpression |
| `typeCode` | StringExpression |
| `tags` | StringExpression |
| `status` | StringExpression |
| `registrationType` | StringExpression |
| `purchaseBusinessTransactionType` | StringExpression |
| `purchaseDate` | DateExpression |
| `disposalValueDate` | DateExpression |
| `purchaseAmount` | BigDecimalExpression |
| `netBookAtDisposalAmount` | BigDecimalExpression |
| `bookValueAmount` | BigDecimalExpression |
| `assetDisposalGainLossAmount` | BigDecimalExpression |

**Logical**: `and`, `or`

**Sort fields** (max 13): `resourceId`, `name`, `purchaseDate`, `disposalValueDate`, `purchaseAmount`, `bookValueAmount`, `netBookAtDisposalAmount`, `assetDisposalGainLossAmount`, `typeName`, `typeCode`, `category`

---

### 18. POST /api/v1/fixed-assets-types/search

**Filter fields** (`FixedAssetsTypesFilter`):
| Field | Type |
|-------|------|
| `categoryCode` | StringExpression |
| `typeName` | StringExpression |
| `typeCode` | StringExpression |
| `resourceId` | StringExpression |

**Logical**: `and`, `or`

**Sort fields**: `resourceId`, `typeName`, `typeCode`, `categoryCode`

---

### 19. POST /api/v1/scheduled-transaction/search

**Filter fields** (`TransactionScheduleFilter`):
| Field | Type | Notes |
|-------|------|-------|
| `resourceId` | StringExpression | |
| `businessTransactionReference` | StringExpression | |
| `businessTransactionResourceId` | StringExpression | |
| `businessTransactionType` | StringExpression | |
| `schedulerType` | StringExpression | |
| `contactResourceId` | StringExpression | |
| `contact` | ContactNestedFilter | |
| `status` | StringExpression | |
| `currencyCode` | StringExpression | |
| `startDate` | DateExpression | |
| `endDate` | DateExpression | |
| `subscriptionStatus` | StringExpression | |
| `interval` | StringExpression | WEEKLY, MONTHLY, QUARTERLY, YEARLY |
| `lastScheduleDate` | DateExpression | |
| `nextScheduleDate` | DateExpression | |
| `paymentRecordedAmount` | BigDecimalExpression | |
| `totalAmount` | BigDecimalExpression | |
| `referenceGenerationMode` | StringExpression | |
| `proratedStartDate` | DateExpression | |

**Logical**: `and`, `or`

**Sort fields** (max 25): `resourceId`, `businessTransactionReference`, `businessTransactionResourceId`, `businessTransactionType`, `schedulerType`, `contactResourceId`, `status`, `currencyCode`, `startDate`, `endDate`, `subscriptionStatus`, `interval`, `lastScheduleDate`, `nextScheduleDate`, `paymentRecordedAmount`, `totalAmount`, `referenceGenerationMode`, `proratedStartDate`

---

### 20. POST /api/v1/nano-classifiers/search

**Filter fields** (`NanoClassifiersFilter`):
| Field | Type |
|-------|------|
| `resourceId` | StringExpression |
| `type` | StringExpression |
| `classes` | ClassifierClassFilter (nested: `className`, `resourceId`) |

**Logical**: `not`, `and`, `or`

**Sort fields**: `resourceId`, `type`

---

### 21. POST /api/v1/organization-users/search

**Filter fields** (`OrganizationUserFilter`): `name`, `email`, `role`, `status`

**Sort fields**: `name`, `email`, `createdAt`

Standard pattern with limit/offset/filter/sort. Rarely used in conversions.

---

### 22. POST /api/v1/bank-rules/search

**Filter fields** (`BankRuleFilter`): `name`, `bankAccountResourceId`, `status`

**Sort fields**: `name`, `createdAt`

Standard pattern with limit/offset/filter/sort. Used for managing bank reconciliation auto-matching rules.

---

### 23. POST /api/v1/purchase-items/search

**Filter fields** (`PurchaseItemFilter`): `currencyCode`, `name`, `purchaseResourceId`, `resourceId`, `reference` (plain strings — NOT expression objects. Operators like `contains`, `in` are not supported on this endpoint).

**Sort fields** (max 13): `resourceId`, `name`, `reference`, `currencyCode`, `status`, `valueDate`, `totalItemAmount`, `description`

---

## Quick Lookup: Common Search Patterns

### Find all invoices for a contact
```json
POST /api/v1/invoices/search
{
  "filter": { "contactResourceId": { "eq": "uuid-here" } },
  "sort": { "sortBy": ["valueDate"], "order": "DESC" },
  "limit": 100
}
```

### Find unpaid invoices in a date range
```json
POST /api/v1/invoices/search
{
  "filter": {
    "status": { "eq": "UNPAID" },
    "balanceAmount": { "gt": 0 },
    "valueDate": { "between": ["2026-01-01", "2026-06-30"] }
  },
  "sort": { "sortBy": ["valueDate"], "order": "ASC" }
}
```

### Find bank accounts (via CoA search)
```json
POST /api/v1/chart-of-accounts/search
{
  "filter": { "accountType": { "eq": "Bank Accounts" } },
  "sort": { "sortBy": ["name"], "order": "ASC" }
}
```

### Find unreconciled bank records
```json
POST /api/v1/bank-records/:accountResourceId/search
{
  "filter": { "status": { "eq": "UNRECONCILED" } },
  "sort": { "sortBy": ["valueDate"], "order": "DESC" }
}
```

### Find contacts by name pattern
```json
POST /api/v1/contacts/search
{
  "filter": { "name": { "contains": "Sterling" } },
  "sort": { "sortBy": ["name"], "order": "ASC" }
}
```

### Find all cashflow transactions for a bank account
```json
POST /api/v1/cashflow-transactions/search
{
  "filter": {
    "organizationAccountResourceId": { "eq": "bank-uuid" },
    "valueDate": { "gte": "2026-01-01" }
  },
  "sort": { "sortBy": ["valueDate"], "order": "DESC" }
}
```

---

*Source of truth: Go structs in the API backend (`models/*.go`). All filter/sort fields extracted from Go struct validation tags and verified against live production API. Last updated: 2026-02-14 — All search/list responses standardized to flat shape. Capsules/capsuleTypes sort now array. Purchase-items sort fields corrected. Tax-profiles max fixed. Catalogs search returns paginated response.*
