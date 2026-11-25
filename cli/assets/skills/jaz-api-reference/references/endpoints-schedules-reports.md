# Jaz API Endpoint Reference: Schedules and Reports

> Request/response examples for scheduled invoices, bills and journals, subscriptions, financial reports, export records, report templates.
> Base URL, auth, date format, pagination and status codes apply to every endpoint: see [endpoints.md](./endpoints.md), which also indexes every section.

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
// Request (FLAT structure, NOT nested in "journal" wrapper):
{
  "reference": "SCHED-JNL-001",
  "valueDate": "2026-03-01",
  "saveAsDraft": false,
  "schedulerEntries": [
    { "accountResourceId": "uuid", "amount": 100, "type": "DEBIT", "description": "Monthly accrual" },
    { "accountResourceId": "uuid", "amount": 100, "type": "CREDIT", "description": "Monthly accrual" }
  ],
  "repeat": "MONTHLY",
  "startDate": "2026-03-01",
  "endDate": "2026-12-01"
}

// Response:
{ "data": { "resourceId": "uuid" } }
```

**CRITICAL**: Scheduled journals use FLAT structure with `schedulerEntries`, NOT a nested `journal` wrapper like scheduled invoices/bills use `invoice`/`bill` wrapper. `reference`, `valueDate`, `saveAsDraft` are at top level alongside `repeat`/`startDate`/`endDate`.

**CRITICAL notes from live testing**:
- Recurrence field is `repeat`, NOT `frequency` or `interval`. Using `frequency` or `interval` silently defaults to ONE_TIME.
- Valid `repeat` values: `"ONE_TIME"`, `"DAILY"`, `"WEEKLY"`, `"MONTHLY"`, `"YEARLY"` (`"QUARTERLY"` is rejected with 422)
- `saveAsDraft: false` is REQUIRED on the wrapped invoice/bill. Using `saveAsDraft: true` causes `INVALID_SALE_STATUS` (invoices) or `INVALID_PURCHASE_STATUS` (bills).
- Since `saveAsDraft: false`, every line item MUST have `accountResourceId`.
- Response uses `interval` field (not `repeat`): `{ "status": "ACTIVE", "interval": "MONTHLY", ... }`

**`PUT /scheduled/journals/{id}`** (measured 2026-09-24):
- Every update must send `startDate` (422 `INVALID_VALUE_OF_START_DATE` otherwise) and the full `schedulerEntries` (422 `JOURNAL_SCHEDULER_ENTRIES_MISSING_ERROR` otherwise), even for a status or reference change.
- `taxVatApplicable` and `taxInclusion` RESET when omitted. A taxed, tax-inclusive schedule updated with its own entries and no flags stored tax off, inclusion off, VAT 0; the same update with both flags kept its VAT. `GET /scheduled/journals/{id}` returns neither flag (nor line tax profiles), so the stored values cannot be read back: state both on every update of a taxed schedule. `update_scheduled_journal` sends `taxVatApplicable: true` when an entry carries a tax profile and refuses without `taxInclusion`.

---

## 16b. Subscriptions (Recurring Invoices with Auto-Proration)

Subscriptions auto-generate invoices on schedule with proration support. **Different from scheduled invoices**: subscriptions auto-prorate partial periods (generate credit notes for mid-period changes), but currency/tax/account are immutable after creation. Invoices only, no bills.

### POST /api/v1/scheduled/subscriptions

```json
// Request:
{
  "repeat": "MONTHLY",
  "startDate": "2026-04-01",
  "status": "ACTIVE",
  "proratedConfig": {
    "proratedAdjustmentLineText": "Prorated adjustment"
  },
  "invoice": {
    "contactResourceId": "uuid-customer",
    "reference": "SUB-001",
    "valueDate": "2026-04-01",
    "dueDate": "2026-04-30",
    "lineItems": [
      { "name": "Monthly Retainer", "unitPrice": 3000, "quantity": 1, "accountResourceId": "uuid-revenue" }
    ],
    "saveAsDraft": false
  }
}

// Response:
{ "data": { "resourceId": "uuid" } }
```

**CRITICAL notes**:
- `proratedConfig` is **REQUIRED** on create; omitting it causes 500 (server null pointer). An update succeeds without it (measured 2026-09-24), so send it only to amend proration (jaz-api rule 93). Cancel takes the flat `proratedAdjustmentLineText` field instead (below).
- `businessTransactionType` is NOT in the OAS; the API ignores it. Don't send it.
- Uses `repeat` + `invoice` wrapper, same structure as scheduled invoices (`POST /scheduled/invoices`).
- `repeat`: `"ONE_TIME"`, `"DAILY"`, `"WEEKLY"`, `"MONTHLY"`, `"YEARLY"` (`"QUARTERLY"` is rejected with 422).
- `saveAsDraft: false` is REQUIRED inside the `invoice` wrapper.
- Currency, tax, and account details are the SAME for all items and CANNOT be changed after creation.
- Mid-period cancellations or amount changes auto-generate prorated credit notes.

### PUT /api/v1/scheduled/cancel-subscriptions/:id

Cancel is **PUT** (not POST). Requires body fields; empty `{}` returns 422.

```json
// Request:
{
  "cancelDateType": "END_OF_CURRENT_PERIOD",
  "proratedAdjustmentLineText": "Prorated adjustment",
  "resourceId": "uuid-subscription"
}

// Response:
{ "data": { "resourceId": "uuid", "status": "SUCCEEDED" } }
```

`cancelDateType` values: `END_OF_CURRENT_PERIOD` (default), `END_OF_LAST_PERIOD`, `CUSTOM_DATE` (requires `endDate: "YYYY-MM-DD"`).

Note the different path pattern from CRUD: cancel is at `/scheduled/cancel-subscriptions/:id`, not `/scheduled/subscriptions/:id/cancel`. Must cancel before delete; cannot delete ACTIVE subscriptions.

### Other subscription endpoints

- `GET /api/v1/scheduled/subscriptions`: List all subscriptions
- `GET /api/v1/scheduled/subscriptions/:id`: Get subscription details
- `PUT /api/v1/scheduled/subscriptions/:id`: Update subscription. The `invoice` template is required on every update (create shape; without it every update is a 422 `GENERAL_ERROR`, even endDate-only). `startDate` and `repeat` are kept when omitted. `status` is NOT: an update without it made an INACTIVE subscription ACTIVE (measured 2026-09-24), so Clio restates the stored status when you omit it.
- `DELETE /api/v1/scheduled/subscriptions/:id`: Delete subscription (must be cancelled first)

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

Uses `primarySnapshotDate`, NOT `endDate`. Optional: `secondarySnapshotDates` array for comparison periods.

### POST /api/v1/generate-reports/profit-and-loss

```json
// Request:
{ "primarySnapshotDate": "2026-02-28", "secondarySnapshotDate": "2026-01-01" }
```

Both `primarySnapshotDate` and `secondarySnapshotDate` required. NOT `startDate`/`endDate`.

### POST /api/v1/generate-reports/general-ledger

```json
// Request:
{ "startDate": "2026-01-01", "endDate": "2026-02-28", "groupBy": "ACCOUNT", "limit": 200, "offset": 0,
  "filter": { "account": { "resourceId": { "in": ["<accountResourceId>"] } } } }
```

`groupBy` is required. Valid values: `"ACCOUNT"`, `"CONTACT"`, `"TRANSACTION"`, `"RELATIONSHIP"`, `"CAPSULE"`. Uses `startDate`/`endDate` like trial balance.

**Paging**: `limit` 1-1000; **omit it and the whole report comes back in one response** (630 rows is ~628KB). `offset` is a 0-indexed **ROW** offset, not a page number: the next page is `offset + limit`. Max offset 65536; past that, narrow the dates. Rows sit under `data.searchGeneralLedgersReport.data`, with `totalElements` and `totalPages` beside them.

**Filter**: `filter.account.resourceId` (StringExpression, e.g. `{ "in": [...] }`, max 100) narrows to accounts; `filter.account.accountType`, `contactResourceId.name`, `businessTransactionType`, `businessTransactionReference`, `description`, `tags` and the amount expressions are also accepted.

### POST /api/v1/generate-reports/cashflow

```json
{ "primaryStartDate": "2026-01-01", "primaryEndDate": "2026-02-28" }
```

Uses `primaryStartDate`/`primaryEndDate`, NOT `primarySnapshotDate`.

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

Uses `primarySnapshotStartDate`/`primarySnapshotEndDate`, yet another pair of field names.

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

## 21. Scheduler GET/PUT/DELETE

### GET /api/v1/scheduled/invoices/{resourceId}

```json
// Response (uses `interval`, NOT `repeat`):
{
  "data": {
    "resourceId": "uuid",
    "status": "ACTIVE",
    "interval": "MONTHLY",
    "startDate": "2026-03-01",
    "endDate": "2026-12-01",
    "nextScheduleDate": "2026-04-01",
    "businessTransactionType": "SALE"
  }
}
```

### PUT /api/v1/scheduled/invoices/{resourceId}

Accepts scheduling fields AND the full invoice template (same structure as POST):

```json
// Request:
{
  "repeat": "MONTHLY",
  "startDate": "2026-03-01",
  "endDate": "2027-03-01",
  "invoice": {
    "contactResourceId": "uuid",
    "saveAsDraft": false,
    "reference": "SCH-INV-001-UPDATED",
    "valueDate": "2026-03-01",
    "dueDate": "2026-03-31",
    "lineItems": [{ "name": "Quarterly retainer", "unitPrice": 9000, "quantity": 1, "accountResourceId": "uuid" }]
  }
}
```

Same pattern for `PUT /scheduled/bills/:id` (uses `bill` wrapper) and `PUT /scheduled/journals/:id` (flat structure with `schedulerEntries`, same as POST).

---

## 24. Export Records

### GET /api/v1/export-records/columns/:entityType

```json
// Response
{
  "data": {
    "columns": [
      { "path": "s.reference", "header": "Invoice Ref #", "type": "STRING", "isDefault": true },
      { "path": "s.total_amount", "header": "Total Amount", "type": "CURRENCY", "isDefault": true },
      { "path": "s.value_date", "header": "Invoice Date", "type": "DATE", "isDefault": true }
    ]
  }
}
```

### POST /api/v1/export-records/preview

```json
// Request
{
  "entityType": "INVOICE",
  "outputFormat": "XLSX",
  "query": "status:unpaid $500+"
}

// Response
{
  "data": {
    "totalRecords": 127,
    "filterDescription": "127 records | Status in: UNPAID | Amount >= 500",
    "resolvedColumns": [
      { "path": "s.reference", "header": "Invoice Ref #", "type": "STRING", "isDefault": true }
    ],
    "previewRows": [
      { "Invoice Ref #": "INV-001", "Customer": "Acme Corp", "Total Amount": "1500.00" }
    ],
    "warnings": null
  }
}
```

Note: `previewRows` keys are column **headers** (not paths). `filter` and `query` are mutually exclusive.

### POST /api/v1/export-records

```json
// Request
{
  "entityType": "INVOICE",
  "outputFormat": "XLSX",
  "filter": { "status": { "in": ["UNPAID"] } }
}

// Response
{
  "data": {
    "fileUrl": "https://s3.amazonaws.com/exports/Invoices.xlsx?X-Amz-Expires=300&...",
    "fileName": "Invoices.xlsx",
    "totalRecords": 127
  }
}
```

`fileUrl` is a pre-signed S3 URL expiring in ~5 minutes. Download immediately.

---

## 28. Report Templates

The saved layout of a report, one default per report type, plus report packs. The layout fields, `edits`, and every measured quirk are in `references/report-templates.md`; this section is the wire.

Rules that hold on every route below:
- `templateConfiguration` is a **JSON-encoded string** in every request and response. Profit-and-loss and balance-sheet layouts come back with a server-owned `coaSnapshot` (a copy of the chart of accounts, rebuilt on every save; omit it when sending).
- Writes return only `{ "data": { "resourceId": "..." } }`. Read the template back to see what was stored.
- Names are unique per report type, ignoring case and treating space and `_` alike (422 `DUPLICATE_REPORT_TEMPLATE_EXISTS`).

### GET /api/v1/organization-report-template

Every template of the organization in one response, **under `reportTemplates`, not `data`**, and ignoring `limit`/`offset`. Rows: `resourceId`, `templateName`, `reportType`, `reportCategory`, `isDefault`, `templateConfiguration`, and on packs `reportPackType` and `packTemplates` (`[{ templateResourceId, templateName, templateOrder, reportType }]`).

### GET /api/v1/organization-report-template/{resourceId}

`{ "data": { ...one row... } }`. 404 `Report template not found` for an unknown id. A template read in the same second it was created can 404 once.

### POST /api/v1/organization-report-template/search

`{ filter, sort }`, answers a bare array. Honours `isDefault`, `reportCategory`, `resourceId`, `reportType` (plain string), `reportTypes` (plain array) and `templateName` (eq, contains); refuses `and` / `or` (400) and sorting by `templateName` (422). Measured 2026-10-01. Clio filters the full list instead, which supports all of them.

### GET /api/v1/organization-report-template/default-configuration

`?reportType=PROFIT_AND_LOSS&framework=IFRS_18` returns `{ "data": { "templateConfiguration": "..." } }`, the layout a new template starts from, in the organization's own currency. The 12 single-report types only (not `REPORT_PACK`). `framework` is accepted for `PROFIT_AND_LOSS` and `CASHFLOW` only, and **only `IAS_1` and `IFRS_18` have a layout**: the other three answer 422 `NO_TEMPLATE_FOUND`. Takes 0.1-5 s (it builds a report preview).

### POST /api/v1/organization-report-template

```json
{ "templateName": "Board P&L", "reportType": "PROFIT_AND_LOSS", "framework": "IAS_1", "templateConfiguration": "{...}" }
```

- **Required:** `templateName` (max 255) and `reportType`.
- **Omit `templateConfiguration`** to start from the default layout. Any well-formed JSON is accepted as a layout, and an unusable one renders as the default.
- **`framework`** is for P&L, balance sheet, cashflow and equity movement only; it defaults to `IAS_1` and cannot change later.
- **`REPORT_PACK` requires both** `templateConfiguration` and `packTemplates: [{ templateResourceId, templateOrder }]`. They are refused on any other type.
  - Keep `packTemplates` and the layout's `TEMPLATE` components in step, or the missing report renders as an error page.
  - Refusals: `TEMPLATE_NOT_FOUND` for an unknown member, `DUPLICATE_TEMPLATE_ORDER` for a repeated position.
- **Not made the default**, except that the first template of a type (in practice, the first pack) becomes its default.
- Returns 201.

### PUT /api/v1/organization-report-template/{resourceId}

Any of `templateName`, `templateConfiguration`, `packTemplates`.
- `templateConfiguration` and `packTemplates` each **replace** the stored value in full.
- Report type and framework cannot change; other fields are ignored without an error.
- `packTemplates` on a non-pack is 422.

### POST /api/v1/organization-report-template/{resourceId}/set-default

No body. Makes the template its report type's default and clears the previous one. **Every export and dashboard view of that report then uses it.** 404 for an unknown id.

### DELETE /api/v1/organization-report-template/{resourceId}

Removes the template from every pack that includes it.
- **Refused:** the default of a report type (422 `CANNOT_DELETE_REPORT_TEMPLATE`, "Set another template as the default first"), and the only template of a type.
- **Not refused:** a pack's last report whenever the pack has any other component, which leaves the pack with no reports. Clio refuses that one itself.
- Packs can always be deleted. Deleting the default pack hands the default to the newest remaining pack.

### Rendering with a template

`POST /api/v1/data-exports/{type}` takes `templateResourceId` (or `templateName`) for these types, each rendering one report type:

| Export type | Report type |
|---|---|
| `profit-and-loss` | `PROFIT_AND_LOSS` |
| `balance-sheet` | `BALANCE_SHEET` |
| `cashflow` | `CASHFLOW` |
| `equity-movement` | `EQUITY_MOVEMENT` |
| `trial-balance` | `TRIAL_BALANCE` |
| `general-ledger` | `GENERAL_LEDGER` |
| `tax-ledger` | `VAT_LEDGER` |
| `cash-balance` | `CASH_BALANCE` |
| `ar-report` | `AGED_RECEIVABLES_SUMMARY` |
| `ar-details-report` | `AGED_RECEIVABLES_DETAILS` |
| `ap-report` | `AGED_PAYABLES_SUMMARY` |
| `ap-details-report` | `AGED_PAYABLES_DETAILS` |

- **A template that is unknown, or of another report type, answers HTTP 200 with an EMPTY body.** It is not an error status, and there is no file.
- Omit the template to render the organization's default.
- The `generate-reports/templated-*` endpoints take `reportTemplateResourceId` and return the report as JSON; a template of the wrong type answers 404 `template_not_found`.
