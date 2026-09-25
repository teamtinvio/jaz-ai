# Report Templates

A **report template** is the saved layout of one report: its title, fonts, colours, the period it opens on, its columns and (for the financial statements) the tree of rows and totals. A **report pack** is a template that bundles several reports, plus an optional cover page, contents, signature page and appendix, into one document.

Every report type can hold many templates. **Exactly one per type is the default**, and the default is what every export and every dashboard view of that report uses when no template is named.

Measured against production on 2026-09-24. Everything below that says "measured" was probed live, not read from a spec.

---

## The surfaces

Every surface uses the same eight verbs, and each takes a template by **resourceId or exact name**:

| Verb | MCP tool | CLI | API |
|---|---|---|---|
| list | `list_organization_report_templates` | `clio report-templates list` | `GET /organization-report-template` |
| read | `get_organization_report_template` | `clio report-templates get <template>` | `GET /organization-report-template/{id}` |
| search | `search_organization_report_templates` | `clio report-templates search` | (evaluated over the list, see below) |
| default layout | `get_default_organization_report_template_configuration` | `clio report-templates default-config --type <T>` | `GET /organization-report-template/default-configuration` |
| create | `create_organization_report_template` | `clio report-templates create` | `POST /organization-report-template` |
| update | `update_organization_report_template` | `clio report-templates update <template>` | `PUT /organization-report-template/{id}` |
| make default | `set_default_organization_report_template` | `clio report-templates set-default <template>` | `POST /organization-report-template/{id}/set-default` |
| delete | `delete_organization_report_template` | `clio report-templates delete <template>` | `DELETE /organization-report-template/{id}` |
| **render** | `download_export` with `template` | `clio exports download --template <template>` | `POST /data-exports/{type}` with `templateResourceId` |

Resolve a name to its id on its own with `clio resolve report-template <name>`.

---

## Report types

| reportType | What it lays out | Renders through export | Period | `framework` |
|---|---|---|---|---|
| `PROFIT_AND_LOSS` | Profit and loss | `profit-and-loss` | range | yes; picks the starting layout |
| `BALANCE_SHEET` | Balance sheet | `balance-sheet` | as at a date | accepted; one layout for all |
| `CASHFLOW` | Cashflow statement | `cashflow` | range | yes; picks the starting layout |
| `EQUITY_MOVEMENT` | Statement of changes in equity | `equity-movement` | range | accepted; one layout for all |
| `TRIAL_BALANCE` | Trial balance | `trial-balance` | as at a date | no |
| `GENERAL_LEDGER` | General ledger | `general-ledger` | range | no |
| `VAT_LEDGER` | Tax (GST/VAT) ledger | `tax-ledger` | range | no |
| `CASH_BALANCE` | Cash balance | `cash-balance` | as at a date | no |
| `AGED_RECEIVABLES_SUMMARY` | Aged receivables | `ar-report` | as at a date | no |
| `AGED_RECEIVABLES_DETAILS` | Aged receivables, per document | `ar-details-report` | as at a date | no |
| `AGED_PAYABLES_SUMMARY` | Aged payables | `ap-report` | as at a date | no |
| `AGED_PAYABLES_DETAILS` | Aged payables, per document | `ap-details-report` | as at a date | no |
| `REPORT_PACK` | Several reports in one document | not through the public API | range | no |

- Bank balance summary and the two bank reconciliation reports have a fixed layout. No template applies to them.
- **`framework`** takes `IAS_1`, `IFRS_18`, `GAAP`, `IND_AS` or `IFRS_SME`, and defaults to `IAS_1`.
  - **For P&L and cashflow, only `IAS_1` and `IFRS_18` have a default layout.** The other three pass validation, then answer `422 NO_TEMPLATE_FOUND` when no layout is given. Balance sheet and equity movement have one default layout whatever the framework, so every framework works there.
  - To use one of them, create from an existing template's layout.
  - The framework is set on create and cannot change. The list and get responses do not return it.

---

## Reading layouts

`templateConfiguration` is stored as a **JSON-encoded string**. Clio tools and the CLI hand it over as an **object**, and accept an object or a string back.

**`coaSnapshot` is never shown and never sent.**
- The server adds it to profit-and-loss and balance-sheet layouts on every save: a copy of the organization's whole chart of accounts. It measured 166-324 KB on a sandbox.
- It exists only to detect later chart changes. The server rebuilds it on every write, so sending a layout without it is safe (measured).

**Layouts are large.** A real P&L or balance sheet layout is 16-59 KB even without the snapshot. So:
- `list` / `search` return no layouts at all, only `configurationChars` (the size).
- `get` returns the whole layout when it fits (up to 15,000 characters). Otherwise it returns:
  - `configurationKeys`: each top-level key and its size.
  - `rowOutline`: the row tree as ids, names, types and formulas, with no matching rules.
- Then ask for what you need:
  - MCP: `keys: ["pdfTitleConfigs", "columnConfigs"]`, or `row: "<row id>"` for one row in full.
  - CLI: `--keys pdfTitleConfigs,columnConfigs`, `--row <id>`.
  - CLI: `--config-out layout.json` writes the whole layout to a file.

---

## Changing layouts: `edits`

Upstream replaces the whole layout on every write. To change part of it, send **`edits`**: Clio applies them to the stored layout and sends the result.

- **All or nothing.** The first edit that cannot apply stops everything, names its position, and nothing is written.
- **Checked.** An edit is refused if it *introduces* one of these problems:
  - a value outside a fixed set
  - a formula that names a missing row
  - a removed total the report engine reads
  - a period type the report cannot use

  A value the layout already had is never held against you.

| op | Shape | Does |
|---|---|---|
| `set` | `{ op, path, value }` | Set a value (any JSON). On a list position it **replaces** that entry. |
| `insert` | `{ op, path, value }` | Insert into a list at that position (`.-` appends). Use this to add a component. |
| `remove` | `{ op, path }` | Remove a key or a list entry. |
| `updateRow` | `{ op, rowId, fields }` | Merge fields into a row: `name`, `actionCriteria`, `formulaConfig`, `showGroupTotal`, `hideRowIfZeroValue`, ... |
| `addRow` | `{ op, row, parentId?, index? }` | Add a row (`id`, `name`, `rowType`, then criteria or formula). Omit `parentId` for top level. |
| `removeRow` | `{ op, rowId }` | Remove a row and its children. Refused while a formula uses it. |
| `moveRow` | `{ op, rowId, parentId?, index? }` | Move a row under another parent or to another position. |

**Paths** are dotted keys and list positions (`pdfTitleConfigs.title`, `columnConfigs.0.type`), or a JSON Pointer (`/pdfTitleConfigs/title`).

**Rows are addressed by id**, never by position, because positions shift as rows move.

```jsonc
// Retitle a P&L, calm colours, and rename a group
{
  "template": "Board P&L",
  "edits": [
    { "op": "set", "path": "pdfTitleConfigs.title", "value": "Monthly Board P&L" },
    { "op": "set", "path": "colorTheme", "value": "calm" },
    { "op": "updateRow", "rowId": "OPERATING_REVENUE", "fields": { "name": "Revenue from operations" } }
  ]
}
```

```bash
# The same from the CLI: one flag per change, or a file of edits
clio report-templates update "Board P&L" \
  --set pdfTitleConfigs.title="Monthly Board P&L" --set colorTheme=calm
clio report-templates update "Board P&L" --edits edits.json
```

**What the server did not keep.** Profit-and-loss and balance-sheet layouts pass through a fixed layout model on every save, and a key it does not model is dropped with no error. Measured 2026-09-24: `showZeroValueAccounts: true` set on a P&L through the API was not kept (older templates saved another way can still carry that key). Every write re-reads the template, and `notSaved` lists any edited path whose value did not survive. The rest of the write went through.

---

## Layout fields

Shared by every single-report type. Every value in the table is from the report engine's own list: anything else falls back silently, so an edit that writes it is refused.

| Key | Values |
|---|---|
| `colorTheme` | `default` `calm` `bold` `trust` `social` `ivory` `gold` `peach` |
| `margins` | `default` `compact` `comfortable` |
| `fontSize` | `default` `smaller` `larger` |
| `templateFont` | `Inter` `LatoFont` `Roboto` `Figtree` `SourceSans3` |
| `templateStyle` | `REPORT_TEMPLATE_CLASSIC` `REPORT_TEMPLATE_BALANCED` `REPORT_TEMPLATE_MODERN` `REPORT_TEMPLATE_UNIFORM` |
| `isDecorator`, `isUppercase` | booleans |
| `lineBreak` | `L0` `L1` `L2` `L3`: spacer rows in Excel down to that tree level |
| `pdfTitleConfigs` | `{ title, layout, headline, dateTitle, isUppercase }`; `layout` is `left_aligned` or `center_aligned`, `headline` is `HEADLINE_COMPANY_NAME` or `HEADLINE_REPORT_TITLE` |
| `documentDetailConfigs` | `{ documentTitle, currency: { currencyCode, currencyName, currencySymbol }, enableOrganizationName, enableReportPeriod }`. An empty currency means the organization's own. |
| `pageFooterConfigs` | `{ enablePageNumber, enableGeneratedBy, enableDatestamp, enableTimeStamp }` |
| `footerDetailsConfigs` | `{ enableCurrencyDetails, enableReportNotes, enableRoundedValues }` |
| `reportNotesConfig` | `{ reportNotesValue, reportNotesJson }`, both **base64-encoded** |
| `documentLogo` | `[{ fileId, fileUrl, fileName, fileType }]` |
| `sortConfigs` | `{ type, primarySortBy, secondarySortBy }`; `type` is `FIXED` or `CUSTOM`, each sort `CODE_ASC` `CODE_DESC` `NAME_ASC` `NAME_DESC` `AMOUNT_ASC` `AMOUNT_DESC` |

**`dateTitle` placeholders:**
- `{{DateAt}}`: balance sheet, trial balance, aging and cash balance.
- `{{DateFrom}}` and `{{DateTo}}`: every period report.

**`basePeriodConfig.periodType`** depends on whether the report covers a range or is as at a date. Dates are epoch milliseconds and are needed only for `custom`.
- **Range reports:**
  - `this_month` `last_month` `this_quarter` `last_quarter` `this_year` `last_year` `this_week`
  - `this_financial_year` `last_financial_year` (also `previous_financial_year`)
  - `this_financial_quarter` (also `this_financial_year_this_quarter`), `last_financial_quarter` (also `previous_financial_quarter`, `this_financial_year_last_quarter`)
  - `custom`, with `startDate` and `endDate`
- **As-at reports:**
  - `today` `end_of_this_month` `end_of_last_month` `end_of_last_quarter` `end_of_last_financial_quarter` `end_of_last_financial_year`
  - `custom`, with `endDate`

### Columns

`columnConfigs[].type` takes one of the following. With no `COMPARE` column, the engine adds one.

| type | Config |
|---|---|
| `COMPARE` | `{ dateRange, compareWith: PREVIOUS_DAYS \| PREVIOUS_MONTHS \| PREVIOUS_QUARTERS \| PREVIOUS_YEARS, compareCount, columnOrder: RECENT_TO_OLDEST \| OLDEST_TO_RECENT }` |
| `YEAR_TO_DATE` | `{ periodType: CALENDAR_YEAR \| FINANCIAL_YEAR, rangeType: THROUGH_TODAY \| THROUGH_PERIOD_END, columnNameType }` |
| `VARIANCE` | `{ displayAs: ABSOLUTE \| PERCENTAGE, firstColumn, secondColumn }` |
| `ACCOUNT_CODE` | Shows the account code column |
| `TOTAL` | Total column |
| `MONTH_TO_DATE` | Month to date |
| `CURRENT_PERIOD` | The period itself |

There is no budget column.

### Per report type

- **Trial balance, `reportSelectedColumns`:** `accountCode` `accountName` `accountType` `status` `accountCurrency` `debitAmount` `creditAmount` `debitAmountIso` `creditAmountIso`.
- **Aged receivables / payables summary, `reportSelectedColumns`:**
  - Name: `customerName` (payables: `supplierName`).
  - Buckets: `current` `lessThanOneMonth` `oneMonth` `twoMonths` `threeMonths` `older` `balance`.
  - Optional: `customerTaxId` / `supplierTaxId`, `contactGroup`, `contactRelationship`, `balanceSource`.
- **General ledger:**
  - `groupByConfigs.groupBy` is one of `ACCOUNT` `CONTACT` `TRANSACTION` `RELATIONSHIP` `CAPSULE`.
  - `groupByColumns` is `[{ type: <groupBy>, columns: [codes] }]`; the entry matching the active groupBy is used.
  - Column codes: `vldt` date, `btty` type, `trde` description, `btrf` reference, `acna` account, `acty` account type, `cnnm` contact, `debt` debit, `crdt` credit, `amnt` balance, `scc` source currency, `rsf` rate, `sca`/`sda` source credit/debit, `tags` tags, `cpsl` capsule, `cogr` contact groups, `corl` contact relationships, `clfs` classifiers, `ntr` nature.
- **Aging details:** `groupBy` is `CONTACT` `CONTACT_GROUP` `DUE_MONTH` `RELATIONSHIP` or `CURRENCY`.
- **Tax ledger:** groups by tax return box (e.g. `IRAS_F5`).

### Rows (profit and loss, balance sheet, cashflow)

`rowConfigs` is a tree, and each row has these fields:

| Field | Meaning |
|---|---|
| `id` | Unique in the layout. A system group (`OPERATING_REVENUE`) or an account's resourceId (an account row). |
| `name` | Label shown on the report |
| `rowType` | `GROUP` collects accounts. `SECTION` is structure only. `TOTAL` is a formula. `COMBINE_ACCOUNT` merges accounts into one line. `TEXT` is a label. `ROW` is one account. `GROUP_TOTAL` is a group's total line (id `<group id>__GT`), which the dashboard stores for every group that shows its total. |
| `actionCriteria` | Which accounts a `GROUP` collects: `[{ criteriaVariable, criteriaCondition, criteriaValue }]`, all must match |
| `formulaConfig.formula` | For `TOTAL`: row ids joined by `+` / `-`, e.g. `OPERATING_REVENUE-COST_OF_SALE`. A group whose id is a UUID is written `GT(<uuid>)`, so its dashes are not read as minus signs. **A missing id silently counts as 0.** |
| `showGroupTotal`, `hideGroupIfAllRowsHidden`, `hideRowIfZeroValue` | Display switches |
| `negativeBalanceCriteria` | `MOVE_TO` another group when negative (the only action the engine applies) |
| `children` | Nested rows |

**Criteria fields:**
- `criteriaVariable`: `ACCOUNT_TYPE` `ACCOUNT_CODE` `ACCOUNT_NAME` `ACCOUNT_CLASS`.
- `criteriaCondition`: `IS` `IS_NOT` `IS_IN` `IS_NOT_IN` `CONTAINS` `DOES_NOT_CONTAIN` `STARTS_WITH` `ENDS_WITH`. Matching ignores case.
- `IS_IN A|B` works for `ACCOUNT_TYPE` only. Account types are written uppercase with underscores (`OPERATING_REVENUE`).

**Totals the engine reads by id.** Removing one changes the report silently, so `edits` refuses it:
- **P&L:**
  - `TOTAL_GROSS_PROFIT`, `TOTAL_OPERATING_PROFIT`, `TOTAL_OTHER_PROFIT`
  - `TOTAL_NET_PROFIT`, `TOTAL_NET_PROFIT_BEFORE_TAX`, `TOTAL_NET_PROFIT_AFTER_TAX`
  - IFRS 18 only: `TOTAL_PBFIT`, `TOTAL_PROFIT_BEFORE_INCOME_TAX`, `TOTAL_PROFIT`
- **Balance sheet:** `TOTAL_ASSETS`, `TOTAL_LIABILITIES_AND_EQUITY`.
- **Cashflow:** `NET_CASHFLOW`, `CASH_SUMMARY_BEGINNING_CASH_BALANCE`, `CASH_SUMMARY_NET_INCREASE_IN_CASH`, `CASH_SUMMARY_ENDING_CASH_BALANCE`.

---

## Report packs

| Key | Values |
|---|---|
| `reportPackType` | `ACCOUNTING` `FINANCIALS` `MANAGEMENT` `PAYABLES` `RECEIVABLES` `CUSTOM` |
| `decorator` | `FIRST_PAGE_ONLY` `ALL_PAGES` `NO_DECORATOR` |
| `roundedValuesMode` | `AS_PER_TEMPLATE` `ROUNDED_VALUES` `EXACT_VALUES` |
| `basePeriodConfig`, `templateFont`, `isUppercase`, `enablePageNumber` | as above |
| `includedComponents` | The document, in order. Each entry is `{ id, type, <config> }`. |

**Component types:**

| type | Config |
|---|---|
| `COVER_PAGE` | `coverPageConfig { title, subtitle, notes, position, logo[], enableOrganizationName, enableReportPeriod, enablePreparedBy }` |
| `TABLE_OF_CONTENTS` | `tableOfContentsConfig { title, position, dotLeaders: DOTS \| DASHES \| NONE, startNumberingAt: <component id>, enableSerialNumber }` |
| `TEMPLATE` | One report: `templateConfig { templateResourceId, templateName, reportType }` |
| `SIGNATURE_PAGE` | `signaturePageConfig { title, notes, position, labelLines: [{ label, enabled }] }` |
| `APPENDIX` | `appendixPageConfig { title, position, appendixNotesConfig }` |

Cover and notes text may use `{{OrganizationName}}`, `{{PreparedBy}}`, `{{DateFrom}}` and `{{DateTo}}`.

**A pack's reports are recorded twice upstream**: in its `TEMPLATE` components and in `packTemplates`. A report missing from either renders as an error page. Clio keeps them in step with one rule:
- **`packTemplates` decides which reports** are in the pack. Give it names or resourceIds, in order. Clio writes both places from it.
- **The layout decides everything else**: cover page, contents, signature, styling. Change those with `edits`. Use `insert` (not `set`) to add a component.
- **Edits that would change the reports are refused** instead of silently dropping one.
- A new pack starts with its reports and nothing else. Upstream has no default pack layout.
- A pack cannot contain a pack. The first pack an organization creates becomes its default pack.

```bash
clio report-templates create --name "Board pack" --type REPORT_PACK \
  --report "Board P&L" --report "Standard Balance Sheet" --set reportPackType=MANAGEMENT
```

---

## Rules and refusals

| Situation | Result |
|---|---|
| Name already used by a template of the same type | Refused before sending. Names are unique per report type, ignoring case and treating space and `_` alike. |
| The same name on another report type | Allowed |
| Name blank or only spaces | Refused (upstream accepts whitespace; Clio does not) |
| `framework` on a type without one | Refused |
| `framework` GAAP / IND_AS / IFRS_SME on a P&L or cashflow with no layout | `422 NO_TEMPLATE_FOUND`, with a hint to use IAS_1 / IFRS_18 or start from an existing layout |
| `framework` not one of the five, or on a type without one | Refused before sending, naming the allowed values |
| A whole replacement layout that leaves out a key the stored one has, or introduces a problem | Refused (the usual cause is a file written from part of a layout) |
| Update with nothing to change | Refused |
| Report type or framework on update | Cannot change. Upstream ignores them silently. |
| Delete the default of a report type | Refused; set another default first (the error names candidates) |
| Delete a pack's last report | Refused by Clio. Upstream deletes it whenever the pack has any other component (a cover page, say), leaving a pack with no reports. |
| Delete a report that is in a pack with others | Allowed. It leaves each pack; the answer lists them in `removedFromPacks`. |
| Delete the default pack | Allowed. The newest remaining pack becomes default, named in `newDefault`. |
| Set default | Every export and dashboard view of that report changes, org-wide. The answer carries `previousDefault` to undo. Already default: nothing is sent. |
| A new template straight after create | Can 404 for a moment; the read-back retries briefly |
| Two edits to the same template at the same moment | The last write wins: upstream has no version check. Clio re-reads just before writing and re-applies its edits on anything changed since it first read, which keeps an earlier change; it cannot protect against one sent in the same instant. |
| A pack whose layout and report list disagree (written by another client) | A styling edit is refused, naming both lists; pass `packTemplates` to set the reports, and both are rewritten from it |
| A whole layout on create | Must have every top-level key the report type's default has, and no refused value |
| `--set path=value` on the CLI | The text is read as the kind of value already stored there: a title stays text, a flag becomes true/false, a list or object is parsed as JSON |

### Rendering

`download_export` / `clio exports download` take `template` (name or resourceId). Clio checks that the template exists and is of that export's report type before asking for the file.

**Upstream answers a template it cannot use with HTTP 200 and an EMPTY body.** That covers a template that doesn't exist, one of another report type, or an unknown `templateName`, and was measured on all 12 exports. If you pass `templateResourceId` directly, Clio turns that empty answer into a named error instead of retrying it.

`fixed-assets-register` accepts a template id and ignores it.

### Search

Upstream's search endpoint answers 500 for four of its five filters, and has no name filter, so `search_organization_report_templates` filters the full list instead. That matches because the list is every template at once. It uses the same filter grammar, plus `templateName`:

```jsonc
{ "filter": { "or": [ { "templateName": { "contains": "board" } }, { "isDefault": { "eq": true }, "reportType": "REPORT_PACK" } ] } }
```

- **Fields:**
  - `resourceId`, `templateName`, `reportType`, `reportCategory` (string operators)
  - `reportTypes` (a list)
  - `isDefault`
  - `and` / `or`
- **String operators:** `eq` `neq` `in` `contains` `notContains` `likeIn` `reg` `startWith` `notStartWith` `endWith` `isNull`. The `contains` family ignores case.
- **Sort:** `reportType` `templateName` `isDefault` `resourceId`.
- An unknown field or operator is refused rather than matching everything.
