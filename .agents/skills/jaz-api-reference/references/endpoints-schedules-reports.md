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

### POST /api/v1/generate-report-packs-pdf

```json
{ "templateResourceId": "...", "dateStart": "2026-10-01", "dateEnd": "2026-10-31" }
```

Renders a report pack as one PDF and returns `{ "data": { "fileId", "fileName", "fileType": "PDF", "fileUrl" } }`.
- **Which pack:** `templateResourceId`, else `templateName` (matched in full, ignoring case), else the default pack (404 `template_not_found` when there is none). An id is handed to the renderer unchecked, so a template that is not a pack fails only after the render; Clio checks it first.
- **Dates** are `YYYY-MM-DD`; left out, the period saved on the pack is used. A start after the end is 422.
- **`fileUrl` expires 30 minutes** after the answer. `fileName` ends in `.pdf`.
- **Slow:** the render happens while the request waits and can take minutes; a request still running at 5 minutes is ended with a plain-text 503 (`Request timed out`, not the JSON error shape). A pack that cannot be rendered is 500 `pdf_generation_failed`. Do not retry either straight away: each send renders the whole pack again.
- **A section that fails is left out of the PDF** and the answer is still 200, with no list of what was left out.

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

---

## 30. PDF Templates

The print layout of each document type (invoice, credit note, receipt, refund, statement, quote, purchase order, delivery slips, sale order, cash in / out, bill payment advice, payment request, payslip), one default per type. The layout keys, the `settings` merge the tools do, page orders and every refusal are in `references/pdf-templates.md`; this section is the wire.

Rules that hold on every route below:
- `templateSettings` is a **JSON object** in every request and response. Keys the reference does not document are kept exactly as sent.
- Writes return only `{ "data": { "resourceId": "..." } }`. Read the template back to see what was stored.
- A locked template (`controlFlag: true`) answers 422 `pdf_template_locked` to an update or delete.
- A changed `documentLogo` or `documentLetterhead` entry must be an image one of the organization's templates already holds there: its `fileId` with the stored `fileUrl`. Anything else is 422; new images are uploaded in the app.

### POST /api/v1/pdf-templates/search

`{ filter, sort, limit, offset }`. Filters (StringExpression / BooleanExpression): `resourceId`, `templateType`, `templateName`, `isDefault`, `styleCode`, `templateOrderType`, `parentBtTemplateResourceId`. Sort by `templateName`, `templateType`, `isDefault`, `styleCode`, `templateOrderType`, `resourceId`; the default template of each type is always first. `limit` defaults to 20 (max 1000); **`offset` is a page number**. Answers `{ totalElements, totalPages, data: [...] }`, each row with its whole layout and `contactResourceIds`.

### GET /api/v1/pdf-templates/{resourceId}

`{ "data": { resourceId, templateName, templateType, isDefault, styleCode, templateSettings, controlFlag, templateOrderType, parentBtTemplateResourceId, contactResourceIds } }`. 404 `PDF template not found`.

### GET /api/v1/pdf-templates/styles

`?templateType=INVOICE` lists `{ resourceId, styleName, styleCode, isDefaultStyle, templateType }`: the only `styleCode` values a template of that type takes.

### POST /api/v1/pdf-templates

```json
{ "templateType": "INVOICE", "templateName": "Invoice with bank details", "templateSettings": { "colorTheme": "calm", "...": "..." }, "styleCode": "STYLE_CODE_CLASSIC" }
```

- **Required:** `templateType`, `templateName` (max 255, unique).
- **Omit `templateSettings`** to start from a copy of the default template's layout, and `styleCode` to take its style. When sent, `templateSettings` is merged onto that layout: objects key by key at any depth; arrays, values and `null` replace whole.
- `templateOrderType` (six types only) defaults to the single-document order; `parentBtTemplateResourceId` per `references/pdf-templates.md` (`null` is the same as leaving it out).
- `isDefault` is refused (400): a new template is never the default. Up to 100 templates per type. Returns 201.

### PUT /api/v1/pdf-templates/{resourceId}

Any of `templateName`, `isDefault` (only `true`: makes it the default and clears the previous one), `templateSettings` (**replaces** the stored layout in full), `styleCode`, `templateOrderType`, `parentBtTemplateResourceId` (`null` removes a payment request's; on a `RECEIPT` or `REFUND` whose page order prints the second document it is a 422).
- Page order and parent left out are kept.
- `templateType` is refused with 400: the type cannot change.

### POST /api/v1/pdf-templates/bulk-delete

`{ "resourceIds": ["..."] }`, 1 to 100, all or none. Refused when one is unknown (404), locked (422), or the batch would delete every template of a type (422). A deleted default passes to the most recently created remaining template of its type. Answers `{ "data": { "resourceIds": [...] } }`.

---

## 31. Email Templates

The emails an organization sends: with an invoice, credit note, payment or refund receipt, quote, purchase order, cash-in receipt, collection request or payslip, and on a schedule as payment reminders, subscription reminders and customer statement emails. One default per type; a contact can name its own template for a type (the contact's `*EmailTemplateResourceId` fields). Rule 163 in jaz-api covers how Clio writes them.

Rules that hold on every route below:
- `templateType` is one of `INVOICE`, `CUSTOMER_CREDIT_NOTE`, `INVOICE_PAYMENT_RECEIPT`, `CUSTOMER_REFUND_RECEIPT`, `INVOICE_PAYMENT_REMINDER`, `SUBSCRIPTION_REMINDER`, `CUSTOMER_STATEMENT_SCHEDULE`, `SALE_QUOTE`, `PURCHASE_ORDER`, `CASH_IN_RECEIPT`, `COLLECTION_REQUEST`, `PAYSLIP`. It cannot change on update.
- `emailBody` is **HTML** with `{{placeholder}}` tokens filled at send time; a token the type does not fill is sent as written. The web app's editor reads the message back only from `<div id="extract-email-body">`, one `<span>` per line: a body without it opens in the app with an empty message.
- `INVOICE` and `CUSTOMER_CREDIT_NOTE` emails send the **variant** of the document's balance state (`BALANCE_DUE`, `NO_BALANCE_DUE`), not the template's own subject and body.
- Writes return only `{ "data": { "resourceId": "..." } }`. Read the template back to see what was stored.
- Names are unique per type, ignoring case and treating space and `_` alike (422 `ORGANIZATION_EMAIL_TEMPLATE_EXIST`). At most 100 active templates per type (422 `ORGANIZATION_EMAIL_TEMPLATE_ACTIVE_LIMIT_REACHED`).

### GET /api/v1/email-templates

`?limit=&offset=` (`limit` 1-100, default 100). `{ totalElements, totalPages, data }`, each type's default first, then the rest by name. Rows: `resourceId`, `templateType`, `templateName`, `isDefault`, `status` (`ACTIVE` / `INACTIVE`), `emailSubject`, `emailBody`, `emailCurrencyFormat`, `schedule`, `reminderSchedules` (`[{ key, value }]`), `emailCcList` (`[{ userResourceId, name, email }]`), `additionalEmailCcList` (`[{ name, email }]`), `receiptEmailTemplateResourceId`, `countryCode`, `variants` (`[{ paymentState, emailSubject, emailBody }]`).

### POST /api/v1/email-templates/search

`{ filter, sort, limit, offset }`, `limit` 1-100 (default 100). Filter: `resourceId`, `templateType`, `templateName`, `status`, `emailCurrencyFormat` (string expressions), `isDefault` (`{ "eq": true }`), `and`, `or`. Sort `{ sortBy: [...], order }` over `templateName`, `templateType`, `isDefault`, `status`, `createdAt`, `updatedAt`. No `query`.

### GET /api/v1/email-templates/types

`?templateType=` optional. `{ "data": [...] }`, each type once, in the version for the organization's country (else the default version): `templateType`, `templateName`, `countryCode`, `emailSubject` and `emailBody` (the type's starting subject and body), `emailCurrencyFormat`, `schedule`, `emailBodyPlaceholders` (`[{ name, type, example }]`), `scheduleConfig` (`[{ key, type, value: [...] }]`), and `emailBodyTemplate`, the page every email of the type is sent in, where the body replaces `{{SUBSTITUTION_EMAIL_BODY}}`.

### GET /api/v1/email-templates/{resourceId}

`{ "data": { ...one row... } }`. 404 `Email template not found` for an unknown id.

### POST /api/v1/email-templates

```json
{ "templateType": "INVOICE_PAYMENT_REMINDER", "templateName": "Gentle nudge", "emailSubject": "{{invoiceReference}} is due soon", "emailBody": "<table id=\"email-content-for-api\">...</table>", "reminderSchedules": [{ "key": "BEFORE_DUE_DATE", "value": "3" }, { "key": "ON_DUE_DATE" }] }
```

- **Required:** `templateType`, `templateName` (max 255), `emailSubject` (max 500), `emailBody`.
- `emailCurrencyFormat`: `CURRENCY_CODE_APPENDED` (default) or `CURRENCY_SYMBOL_PREPENDED`.
- `emailCcList: [{ email }]` names organization users; `additionalEmailCcList: [{ name, email }]` any other address. Both are copied on every email.
- `reminderSchedules` only on the three reminder types, with that type's keys: `INVOICE_PAYMENT_REMINDER` `BEFORE_DUE_DATE` / `AFTER_DUE_DATE` (value: days, 1 or more) and `ON_DUE_DATE` (no value); `SUBSCRIPTION_REMINDER` `BEFORE_NEXT_INVOICE_DATE` (days); `CUSTOMER_STATEMENT_SCHEDULE` `DAY_OF_WEEK` (`SUNDAY` to `SATURDAY`), `DAY_OF_MONTH` (`FIRST_DATE`, `LAST_DATE`, `FIRST_` / `LAST_` and a weekday), `DAY_OF_QUARTER` (`FIRST_DAY`, `LAST_DAY`). Anything else is 422 before the write.
- `variants` only on `INVOICE` and `CUSTOMER_CREDIT_NOTE`, both states or neither; omitted, both start as copies of the subject and body.
- `receiptEmailTemplateResourceId` only on `COLLECTION_REQUEST`: a `CASH_IN_RECEIPT` template; omitted, the organization's default receipt template is linked.
- Starts `ACTIVE`, **not** the default. Returns 201.

### PUT /api/v1/email-templates/{resourceId}

Any of `templateName`, `status`, `emailSubject`, `emailBody`, `emailCurrencyFormat`, `emailCcList`, `additionalEmailCcList`, `reminderSchedules`, `receiptEmailTemplateResourceId` (`""` removes it), `variants` (one or both states; a state left out keeps its stored subject and body).
- `emailCcList`, `additionalEmailCcList` and `reminderSchedules` each **replace** the stored list; `[]` removes every entry. `variants` changes only the states it names, and `[]` is refused (422). Any other field, `templateType` included, is 400.
- `status: "INACTIVE"` on the default template of a type sent with documents is 422; set another default first.
- `{}` is 422.

### POST /api/v1/email-templates/{resourceId}/set-default

No body. Makes the template its type's default and clears the previous one. An `INACTIVE` template of a type sent with documents (any but the three reminder types) is 422: set it `ACTIVE` first. 404 for an unknown id.

### DELETE /api/v1/email-templates/{resourceId}

Deletes the template and removes it from every contact and scheduled transaction that named it, which then use the type's default. **Refused** for the default of a type (422 `CANNOT_DELETE_DEFAULT_ORGANIZATION_EMAIL_TEMPLATE`). 404 for an unknown id.

---

## 32. Signature Profiles (E-sign Templates)

The defaults a sale quote or purchase request is sent for signature with: signers, cc, the invitation, reminder and completion emails, reminder schedule, movement alerts, expiry, appended PDFs and the completion rule. One default per document type. **Sending a document for signature is not an API call**: the send needs the app's signing editor, so the user sends it from the quote or purchase request.

Rules that hold on every route below:
- `docType` is `SALE_QUOTE` or `PURCHASE_REQUEST`, set on create, never changed.
- Email `body` is **plain text** in and out (line breaks kept, `<` refused); the app lays it out with the signing buttons when it sends. `{{placeholders}}` such as `{{senderName}}`, `{{signerName}}`, `{{documentTitle}}`, `{{expiryDate}}`, `{{quoteReference}}` / `{{requestReference}}` are filled in at send time.
- Signers sign in the order listed. `INTERNAL` takes `internalUserId`, the **`userResourceId`** of an organization user (from `POST /api/v1/organization-users/search`, not the org-user `resourceId`; an id that is not a user of the organization is 422); its name and email come from the user. `EXTERNAL` takes `name` + `email`.
- Responses never carry `createdBy` / `updatedBy`.

### POST /api/v1/signature-profiles/search

`{ filter, sort, limit, offset }`. Filter on `resourceId`, `docType`, `name` (string expressions, with `and` / `or`); sort by `name`, `docType`, `createdAt`, `updatedAt`, `resourceId`. `offset` is a page number; sort is required with it. No `query` (400). Rows are whole profiles.

### GET /api/v1/signature-profiles/{resourceId}

`{ "data": { ...profile... } }`; 404 `Signature profile not found`.

### POST /api/v1/signature-profiles

```json
{ "docType": "SALE_QUOTE", "name": "Standard quote",
  "signers": [{ "type": "EXTERNAL", "name": "Jane Tan", "email": "jane@example.com" }, { "type": "INTERNAL", "internalUserId": "<userResourceId>" }],
  "invitationEmail": { "subject": "{{senderName}} has sent you a document to sign", "body": "Please review and sign by {{expiryDate}}." },
  "reminderSchedule": { "firstReminderAfterDays": 3, "everyDays": 4, "stopAfterDays": 0 },
  "movementAlerts": { "senderNotificationCadence": "MILESTONES_ONLY", "alertAfterDaysOfNoActivity": 5 },
  "postCompletionAction": "AUTO_ACCEPT" }
```

- **Required:** `docType`, `name` (max 255), `invitationEmail` (`subject` + `body`).
- Defaults: `defaultExpiryDays` 30 (1-365), `declineReasonRequired` / `voidReasonRequired` true, `onExpiryAction` `AUTO_VOID` (`ALERT_THEN_VOID`, `MANUAL_ONLY`), `postCompletionAction` `DO_NOTHING`, cadence `MILESTONES_ONLY` (`EVERY_EVENT`, `COMPLETION_ONLY`, `NONE`).
- `postCompletionAction`: `AUTO_ACCEPT_AND_INVOICE` is for sale quotes only, `AUTO_ACCEPT_AND_BILL` for purchase requests only (422 otherwise).
- `stopAfterDays: 0` reminds until expiry; `alertAfterDaysOfNoActivity: 0` turns the alert off.
- `defaultAppendices` (`[{ fileId, fileName, fileType?, fileUrl }]`, up to 10, each once): the PDFs merged after the document, in order. Each is a file `POST /api/v1/signature-profiles/appendices` answered, passed as is, or one the profile holds, sent back as read; anything else is 422.
- Not the default unless `isDefault: true`. Returns 201 with the whole profile.

### PUT /api/v1/signature-profiles/{resourceId}

Any field of the create except `docType` and `isDefault` (both 400).
- Fields left out keep their values. `signers`, `ccObservers` and `defaultAppendices` **replace** the stored list; `[]` clears it.
- `reminderSchedule`, `movementAlerts` and each email change only the values sent; an email the profile does not have yet needs both `subject` and `body`.
- Returns 200 with the whole profile.

### POST /api/v1/signature-profiles/appendices

Multipart, one key: `file`, a PDF of at most 8 MB (its type is read from the bytes, not the name). Answers `{ "data": { "fileId", "fileName", "fileType": "PDF", "fileUrl" } }`, the entry `defaultAppendices` takes. Changes no profile. 400 names the problem (not a PDF, too large, empty, wrong key).

### POST /api/v1/signature-profiles/{resourceId}/set-default

No body. Makes it its document type's default and clears the previous one. 404 for an unknown id.

### DELETE /api/v1/signature-profiles/{resourceId}

Refused (422) for the default of a document type: make another the default first.
