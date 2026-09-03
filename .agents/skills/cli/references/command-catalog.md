# Clio Command Catalog

Complete reference for all 66 command groups. Organized by domain.

---

## Transactions

### `clio invoices` — Sales invoices
| Subcommand | Key flags |
|------------|-----------|
| `list` | `--limit`, `--offset`, `--all`, `--format`, `--json` |
| `get <id>` | `--json` |
| `search` | `--reference`, `--contact-name`, `--status`, `--from`, `--to`, `--tag`, `--sort`, `--order` |
| `create` | `--contact`, `--date`, `--due`, `--ref`, `--currency`, `--exchange-rate`, `--lines`, `--finalize`, `--input` |
| `update <id>` | `--date`, `--due`, `--ref`, `--lines`, `--input` |
| `delete <id>` | |
| `pay <id>` | `--amount`, `--transaction-amount`, `--account`, `--method`, `--ref`, `--date` |
| `apply-credits <id>` | `--credit-note`, `--amount` |
| `download <id>` | `--json` — returns the PDF URL; writes no file |
| `draft list` | `--max-rows N`, `--ids`, `--json` — ⚠️ fans out 1 attachment lookup per draft (5 in flight); pass `--max-rows 10` for spot checks |
| `draft finalize <id>` | `--account`, `--input` |
| `bulk-upsert` | `--input <file>`, `--json` — **FLAT** shape (one line per row via `itemDescription`+`totalAmount`+`invoiceAccountResourceId`). Async → jobId. `currencyCode` REQUIRED |
| `bulk-upsert-line-items` | `--input <file>`, `--json` — **NESTED** shape (multi-line per row via `lineItems[]`). Async → jobId. `currencyCode` REQUIRED |

### `clio bills` — Purchase bills
| Subcommand | Key flags |
|------------|-----------|
| `list` | `--limit`, `--offset`, `--all`, `--format`, `--json` |
| `get <id>` | `--json` |
| `search` | `--reference`, `--contact-name`, `--status`, `--from`, `--to`, `--tag`, `--sort`, `--order` |
| `create` | `--contact`, `--date`, `--due`, `--ref`, `--currency`, `--exchange-rate`, `--lines`, `--finalize`, `--input` |
| `update <id>` | `--date`, `--due`, `--ref`, `--lines`, `--input` |
| `delete <id>` | |
| `pay <id>` | `--amount`, `--transaction-amount`, `--account`, `--method`, `--ref`, `--date` |
| `apply-credits <id>` | `--credit-note`, `--amount` |
| `draft list` | `--max-rows N`, `--ids`, `--json` — same attachment fan-out warning as invoices |
| `draft finalize <id>` | `--account`, `--input` |
| `bulk-upsert` | `--input <file>`, `--json` — **FLAT** shape. Async → jobId. `currencyCode` REQUIRED |
| `bulk-upsert-line-items` | `--input <file>`, `--json` — **NESTED** shape. Async → jobId. `currencyCode` REQUIRED |

### `clio customer-credit-notes` — Customer credit notes
| Subcommand | Key flags |
|------------|-----------|
| `list` | `--limit`, `--offset`, `--all`, `--format`, `--json` |
| `get <id>` | `--json` |
| `search` | `--reference`, `--contact-name`, `--status`, `--from`, `--to`, `--tag`, `--sort`, `--order` |
| `create` | `--contact`, `--date`, `--ref`, `--currency`, `--exchange-rate`, `--lines`, `--finalize`, `--input` |
| `update <id>` | `--date`, `--ref`, `--lines`, `--input` |
| `delete <id>` | |
| `refund <id>` | `--amount`, `--account`, `--method`, `--ref`, `--date` |
| `refunds <id>` | List refunds for a credit note |
| `download <id>` | `--json` — returns the PDF URL; writes no file |
| `draft list` | `--max-rows N`, `--ids`, `--json` |
| `bulk-upsert` | `--input <file>`, `--json` — Nested `lineItems[]`. Async → jobId. `currencyCode` REQUIRED |

### `clio supplier-credit-notes` — Supplier credit notes
| Subcommand | Key flags |
|------------|-----------|
| `list` | `--limit`, `--offset`, `--all`, `--format`, `--json` |
| `get <id>` | `--json` |
| `search` | `--reference`, `--contact-name`, `--status`, `--from`, `--to`, `--tag`, `--sort`, `--order` |
| `create` | `--contact`, `--date`, `--ref`, `--currency`, `--exchange-rate`, `--lines`, `--finalize`, `--input` |
| `update <id>` | `--date`, `--ref`, `--lines`, `--input` |
| `delete <id>` | |
| `refund <id>` | `--amount`, `--account`, `--method`, `--ref`, `--date` |
| `refunds <id>` | List refunds for a credit note |
| `draft list` | `--max-rows N`, `--ids`, `--json` |
| `bulk-upsert` | `--input <file>`, `--json` — Nested `lineItems[]`. Async → jobId. `currencyCode` REQUIRED |

### `clio journals` — Journal entries
| Subcommand | Key flags |
|------------|-----------|
| `list` | `--limit`, `--offset`, `--all`, `--format`, `--json` |
| `get <id>` | `--json` |
| `search` | `--reference`, `--from`, `--to`, `--status`, `--tag`, `--type`, `--sort`, `--order` |
| `create` | `--date`, `--ref`, `--entries`, `--finalize`, `--input` |
| `update <id>` | `--date`, `--ref`, `--entries`, `--input` |
| `delete <id>` | |
| `transfer-trial-balance` (alias: `ttb`) | `--date`, `--entries`, `--input`, `--currency`, `--exchange-rate`, `--rate-direction` |
| `draft list` | `--max-rows N`, `--ids`, `--json` |
| `bulk-upsert` | `--input <file>`, `--json` — ⚠️ Natural key is `journalReference` (NOT `reference`); legs use `journalEntries[]` (NOT `entries[]`); each leg is `organizationAccountResourceId` (NOT `accountResourceId`) + exactly one of `debitAmount`/`creditAmount` (NOT `amount`+`type`), omitting the unused side. No `currencyCode` on journal rows. Async → jobId |

### `clio cash-in` — Direct cash-in entries
| Subcommand | Key flags |
|------------|-----------|
| `list` | `--limit`, `--offset`, `--all`, `--format`, `--json` |
| `get <id>` | `--json` |
| `search` | `--ref`, `--from`, `--to`, `--status` |
| `create` | `--account`, `--date`, `--ref`, `--entries`, `--input` |
| `update <id>` | `--date`, `--ref`, `--entries`, `--input` |
| `delete <id>` | |

### `clio cash-out` — Direct cash-out entries
Same subcommands and flags as `cash-in`.

### `clio cash-transfer` — Cash transfers between accounts
| Subcommand | Key flags |
|------------|-----------|
| `list` | `--limit`, `--offset`, `--all`, `--format`, `--json` |
| `get <id>` | `--json` |
| `search` | `--ref`, `--from`, `--to`, `--status` |
| `create` | `--from-account`, `--to-account`, `--amount`, `--date`, `--ref`, `--input` |
| `delete <id>` | |

### `clio payments` — Cashflow transactions (read-only)
| Subcommand | Key flags |
|------------|-----------|
| `list` | `--limit`, `--offset`, `--all`, `--format`, `--json` |
| `search` | `--from`, `--to`, `--type`, `--direction`, `--ref`, `--sort`, `--order` |
| `get <id>` | `--json` |
| `update <id>` | `--date`, `--reference`, `--input` |
| `delete <id>` | |

### `clio cashflow` — Cashflow search
| Subcommand | Key flags |
|------------|-----------|
| `search` | `--from`, `--to`, `--type`, `--direction`, `--ref`, `--sort`, `--order`, `--limit`, `--offset`, `--all` |

---

## Contacts & Configuration

### `clio contacts` — Customers and suppliers
| Subcommand | Key flags |
|------------|-----------|
| `list` | `--limit`, `--offset`, `--all`, `--format`, `--json` |
| `search <query>` | `--customer`, `--supplier`, `--status`, `--email`, `--sort`, `--order` |
| `get <id>` | `--json` |
| `create` | `--name`, `--customer`, `--supplier`, `--email`, `--phone`, `--input` |
| `update <id>` | `--name`, `--email`, `--phone`, `--input` |
| `delete <id>` | |
| `bulk-upsert` | `--input <file>`, `--json` — async, returns jobId; poll `clio background-jobs get <jobId>` |

### `clio contact-groups` — Contact grouping
| Subcommand | Key flags |
|------------|-----------|
| `list` | `--limit`, `--offset`, `--all`, `--format`, `--json` |
| `get <id>` | `--json` |
| `search <query>` | `--limit`, `--offset` |
| `create` | `--name` |
| `update <id>` | `--name` |
| `delete <id>` | |

### `clio accounts` — Chart of accounts
| Subcommand | Key flags |
|------------|-----------|
| `list` | `--limit`, `--offset`, `--all`, `--format`, `--json` |
| `search <query>` | `--sort`, `--order`, `--limit`, `--offset` |
| `get <id>` | `--json` |
| `create` | `--name`, `--code`, `--type`, `--currency`, `--status`, `--input` |
| `delete <id>` | |

### `clio items` — Products and services
| Subcommand | Key flags |
|------------|-----------|
| `list` | `--limit`, `--offset`, `--all`, `--format`, `--json` |
| `get <id>` | `--json` |
| `search <query>` | `--limit`, `--offset`, `--all` |
| `create` | `--sale-account`, `--purchase-account`, `--sale-tax`, `--purchase-tax`, `--name`, `--sale-name`, `--purchase-name`, `--sale-price`, `--purchase-price`, `--input` |
| `update <id>` | Same as create flags |
| `delete <id>` | |

### `clio tags` — Transaction tags
| Subcommand | Key flags |
|------------|-----------|
| `list` | `--limit`, `--offset`, `--all`, `--format`, `--json` |
| `get <id>` | `--json` |
| `search <query>` | `--limit`, `--offset` |
| `create` | `--name`, `--input` |
| `update <id>` | `--name` |
| `delete <id>` | |

### `clio currencies` — Organization currencies
| Subcommand | Key flags |
|------------|-----------|
| `list` | `--format`, `--json` |
| `add <codes...>` | e.g., `clio currencies add EUR GBP` |

### `clio currency-rates` — Exchange rates
| Subcommand | Key flags |
|------------|-----------|
| `list <code>` | `--limit`, `--offset`, `--all`, `--format`, `--json` |
| `add <code>` | `--rate`, `--rate-direction`, `--from`, `--to` |
| `update <code> <rateId>` | `--rate`, `--rate-direction`, `--from`, `--to` |
| `bulk-upsert` | `--input <file>` (max 500 rates; requires `rateDirection` per rate) |

### `clio tax-profiles` — Tax profiles and tax types
| Subcommand | Key flags |
|------------|-----------|
| `list` | `--limit`, `--offset`, `--all`, `--format`, `--json` |
| `get <id>` | `--json` |
| `search <query>` | `--limit`, `--offset` |
| `create` | `--rate`, `--name`, `--tax-type-code` |
| `update <id>` | `--name`, `--rate` |
| `types` | List available tax type codes |
| `wht-codes` | List withholding tax codes |

### `clio custom-fields` — Custom field definitions
| Subcommand | Key flags |
|------------|-----------|
| `list` | `--limit`, `--offset`, `--all`, `--format`, `--json` |
| `get <id>` | `--json` |
| `search <query>` | `--limit`, `--offset` |
| `create` | `--name`, `--description`, `--print-on-documents`, `--invoices`, `--bills`, `--customer-credits`, `--supplier-credits`, `--payments`, `--field-format` |
| `update <id>` | `--name` |
| `delete <id>` | |

`--field-format` picks the kind of field: `CUSTOM` (default) is free text; `ALL_CUSTOMERS` / `ALL_SUPPLIERS` / `ALL_CONTACTS` / `ALL_EMPLOYEES` / `ALL_USERS` make it a picklist of that population. The datatype is derived from it, not chosen — there is no NUMBER or DATE field. Send at least one applicability flag or the field appears on nothing.

### `clio catalogs` — Price catalogs
| Subcommand | Key flags |
|------------|-----------|
| `list` | `--limit`, `--offset`, `--all`, `--format`, `--json` |
| `search` | `--limit`, `--offset`, `--json` |
| `get <id>` | `--json` |
| `create` | `--name`, `--description`, `--status`, `--input`, `--json` |
| `update <id>` | `--name`, `--description`, `--status`, `--input`, `--json` |
| `delete <id>` | `--json` |

`update` is a FULL REPLACEMENT: pass `--input` with the complete body (get it first), because omitting `items` or `contactGroupResourceIds` drops them. `create` rejects a body with no items.

### `clio bookmarks` — Organization bookmarks
| Subcommand | Key flags |
|------------|-----------|
| `list` | `--limit`, `--offset`, `--all`, `--format`, `--json` |
| `get <id>` | `--json` |
| `create` | `--name`, `--category`, `--value`, `--input` |
| `update <id>` | `--name`, `--value` |

### `clio nano-classifiers` — Tracking categories
| Subcommand | Key flags |
|------------|-----------|
| `list` | `--limit`, `--offset`, `--all`, `--format`, `--json` |
| `get <id>` | `--json` |
| `search <query>` | `--limit`, `--offset` |
| `create` | `--type`, `--classes`, `--input` |
| `update <id>` | `--input` |
| `delete <id>` | |

---

## Employee Claims & Settings

### `clio claims` — Employee-expense claims
| Subcommand | Key flags |
|------------|-----------|
| `search` | `--status`, `--employee-resource-id`, `--contact-resource-id`, `--reference`, `--from`, `--to`, `--sort`, `--order` |
| `get <id>` | `--json` |
| `create` | `--value-date`*, `--currency`*, `--employee`, `--contact` / `--vendor-name` (XOR), `--items <json>`, `--custom-fields <json>`, `--tags`, `--submit` |
| `update <id>` | partial; `--items` non-empty REPLACES all lines, `--submit` |
| `submit` / `approve` / `unpost <id>` | lifecycle (server-enforced transitions) |
| `reject` / `cancel <id>` | `--reason` (1-1000), required |
| `bulk-submit` / `bulk-approve` / `bulk-delete` | `--ids <csv>` (1-500) — async, returns jobId |
| `bulk-reject` / `bulk-cancel` | `--ids <csv>`, `--reason` — async, returns jobId |
| `delete <id>` | DRAFT / REJECTED / CANCELLED only |
| `delete-attachment <id> <attId>` | remove one receipt |
| `from-attachment` | `--file` / `--source-url` / `--html` (inline or `@path`) — OCR a receipt into a DRAFT claim (async) |
| `preview-conversion` | `--ids`, `--posting-rule`, `--payout-flow` |
| `convert` | `--ids`, `--value-date`*, `--posting-rule`, `--include-payout`, `--idempotency-key` |
| `record-payout` | `--employee`, `--amount`, `--payment-account`, `--payout-for` (REIMBURSEMENT / ADVANCE) |
| `payouts` | `--employee-resource-id`, `--employee-name`, `--reference`, `--payout-status`, `--payout-type` |
| `tracking-tags` / `custom-field-values` | picker arrays |

### `clio employees` — Claim members
| Subcommand | Key flags |
|------------|-----------|
| `search` | `--name`, `--email`, `--active`, `--claim-profile-resource-id`, `--sort`, `--order` |
| `balances` (alias `search-balances`) | per-employee, per-currency reimbursement owed |
| `get <id>` | `--json` |
| `create` | `--name`, `--user`* (bind login), `--claim-profile`*, `--employment-type`, `--email`, `--manager` |
| `update <id>` | `--name`, `--claim-profile`, `--employment-type`, `--archive` / `--activate`, `--clear-employment-type` |
| `bind-user <id> <userId>` | bind a login user to an offline employee (no user yet) — one-way, only while unbound |
| `delete <id>` | only if settled (no outstanding balance) |
| `preprocess <fileUrl>` | `--file-type` (CSV / XLS / XLSX) — preview rows before import |
| `import` | `--create` / `--update` / `--delete` (JSON arrays) — async, returns jobId |

EmploymentType: `FULL_TIME` · `PART_TIME` · `CONTRACTOR` · `INTERN` · `TEMPORARY` · `CONSULTANT`

### `clio claim-types` — Expense categories (master data)
| Subcommand | Key flags |
|------------|-----------|
| `list` / `get <id>` / `search` | `--limit`, `--offset`, `--all`, `--json` |
| `create` | `--name`, `--expense-account <id>`, `--tax-profile <id>`, `--default` |
| `update <id>` / `delete <id>` | partial update; default-protected delete |

### `clio claim-profiles` — Per-employee spend policies (master data)
| Subcommand | Key flags |
|------------|-----------|
| `list` / `get <id>` / `search` | `--limit`, `--offset`, `--all`, `--json` |
| `create` | `--name` (+ approval / limit / account options) |
| `update <id>` / `delete <id>` | partial update; cannot delete the org default |

### `clio posting-rules` — Claim→journal grouping (master data)
| Subcommand | Key flags |
|------------|-----------|
| `list` / `get <id>` / `search` | `--limit`, `--offset`, `--all`, `--json` |
| `create` | `--name`, `--outer-axis`, `--inner-axis`, `--line-template`, `--journal-reference-template`, `--default-bank-account`, `--default` |
| `update <id>` / `delete <id>` | partial update; cannot delete the org default |

`*` = required.

---

## Bank & Reconciliation

### `clio bank` — Bank accounts and records
| Subcommand | Key flags |
|------------|-----------|
| `accounts` | `--limit`, `--json` |
| `get <id>` | `--json` |
| `records <accountId>` | `--from`, `--to`, `--status`, `--description`, `--limit`, `--offset`, `--all` |
| `add-records <accountId>` | `--records`, (JSON array of bank records) |
| `import <accountId> <file>` | `--file`, `--account`, Supports CSV, OFX, XLS, XLSX |
| `auto-recon` | `--type`, `--entries`, READ-ONLY reconciliation suggestions. `--type <workflow>` and `--entries <id,...>` are both REQUIRED (per-entry; no account-wide mode). `--account` optional. |

### `clio bank-rules` — Bank reconciliation rules
| Subcommand | Key flags |
|------------|-----------|
| `list` | `--limit`, `--offset`, `--all`, `--format`, `--json` |
| `get <id>` | `--json` |
| `search <query>` | `--limit`, `--offset` |
| `create` | `--input` (JSON body with rule definition) |
| `update <id>` | `--input` |
| `delete <id>` | |

Dynamic strings in rules: `{{bankReference}}`, `{{bankPayee}}`, `{{bankDescription}}`

---

## Fixed Assets & Inventory

### `clio fixed-assets` (alias: `fa`) — Fixed asset management
| Subcommand | Key flags |
|------------|-----------|
| `list` | `--limit`, `--offset`, `--all`, `--format`, `--json` |
| `get <id>` | `--json` |
| `search <query>` | `--limit`, `--offset` |
| `create` | `--amount`, `--name`, `--type`, `--date`, `--input` |
| `update <id>` | `--name`, `--input` |
| `delete <id>` | |
| `discard <id>` | `--disposal-date`, `--gain-loss-account` |
| `sell <id>` | `--id`, `--depreciation-end-date`, `--sale-type`, `--gain-loss-account` |
| `transfer <id>` | `--date`, `--type` |
| `undo-disposal <id>` | Reverse a discard or sale |
| `bulk-upsert` | `--input <file>`, `--json` — ⚠️ Date field is `valueDate` (NOT `purchaseDate` — that's the GET response field; bulk request uses `valueDate`). `cost`/`purchaseAmount` synonyms accepted. `effectiveLife`/`usefulLifeMonths` synonyms accepted. Required: `reference`, `registrationType` ("NEW" or "TRANSFER"). Async → jobId |

### `clio reconciliations` (alias: `recon`) — Bank reconciliation actions (8 tools)
2 async + 6 sync. Sync endpoints are NOT idempotent — re-running creates duplicate journals.

| Subcommand | Type | Key flags |
|------------|------|-----------|
| `quick-reconcile` | async | `--input <file>` — bulk match BSEs to journals (max 500) |
| `bank-rule` | async | `--input <file>` — apply bank rule action to BSEs (max 500) |
| `direct-cash-entry` | sync | `--input <file>` — single cash-in/out line; direction inferred from BSE sign |
| `cash-journal` | sync | `--input <file>` — multi-line cashflow journal (max 200 lines) |
| `manual-journal` | sync | `--input <file>` — ⚠️ caller provides ONLY offset side; backend auto-adds bank-side leg. Sending both → 422 unbalanced |
| `cash-transfer` | sync | `--input <file>` — inter-account transfer; `accountResourceId` is counterparty |
| `invoice-receipt` | sync | `--input <file>` — ⚠️ requires BSE from `bank import` (BANK_STATEMENT_ENTRY type). `bank add-records` BSEs (BANK_RECORD type) → 422 "Invalid business transaction type" |
| `bill-receipt` | sync | `--input <file>` — same BSE-type warning as invoice-receipt |

### `clio drafts` — Server-side draft lifecycle (3 tools)
Bulk-friendly: one call accepts mixed btTypes (max 500). NOT idempotent on already-promoted drafts (422).

| Subcommand | Type | Key flags |
|------------|------|-----------|
| `validate` | sync | `--input <file>` — pre-flight; returns per-item errors. Idempotent. |
| `convert-to-active` | async | `--input <file>` — promote DRAFT → ACTIVE. Async → jobId |
| `submit-for-approval` | async | `--input <file>` — route into approval workflow. Async → jobId |

Body shape (all 3): `{ items: [{ btResourceId, btType }] }` with `btType ∈ {SALE | PURCHASE | SALE_CREDIT_NOTE | PURCHASE_CREDIT_NOTE}`.

### `clio inventory` (alias: `inv`) — Inventory tracking
| Subcommand | Key flags |
|------------|-----------|
| `items` | `--limit`, `--offset`, `--all`, `--format`, `--json` |
| `balance <itemId>` | `--json` |
| `create` | `--item-code`, `--name`, `--unit`, `--costing-method`, `--cogs-account`, `--purchase-account`, `--sale-account`, `--block-insufficient`, `--input` |

All seven of `--item-code`, `--name`, `--unit`, `--costing-method`, `--cogs-account`, `--purchase-account` and `--sale-account` are required. `--cogs-account` must be a Direct Costs account and `--purchase-account` an Inventory account. There are no `--sale`/`--purchase` flags: the API rejects either as false once COGS is set, so both are always sent as `true`.

---

## Subscriptions & Schedulers

### `clio subscriptions` (alias: `subs`) — Recurring subscriptions
| Subcommand | Key flags |
|------------|-----------|
| `list` | `--limit`, `--offset`, `--all`, `--format`, `--json` |
| `get <id>` | `--json` |
| `create` | `--input` (full JSON body) |
| `update <id>` | `--input` |
| `delete <id>` | |
| `cancel <id>` | |
| `search-scheduled` | `--limit`, `--offset`, `--all` |

### `clio schedulers` — Scheduled (recurring) transactions
| Subcommand | Key flags |
|------------|-----------|
| `list-invoices` | `--limit`, `--offset`, `--all`, `--format`, `--json` |
| `list-bills` | `--limit`, `--offset`, `--all`, `--format`, `--json` |
| `list-journals` | `--limit`, `--offset`, `--all`, `--format`, `--json` |
| `create-invoice` | `--contact`, `--reference`, `--repeat`, `--start-date`, `--line-items`, `--input` |
| `create-bill` | `--contact`, `--reference`, `--repeat`, `--start-date`, `--line-items`, `--input` |
| `create-journal` | `--reference`, `--repeat`, `--start-date`, `--entries`, `--input` |

Dynamic strings in schedulers: `{{Day}}`, `{{Date}}`, `{{Date+X}}`, `{{DateRange:X}}`, `{{Month}}`, `{{Month+X}}`, `{{MonthRange:X}}`, `{{Year}}`, `{{Year+X}}`

---

## Reports & Exports

### `clio reports` — Generate financial reports
```
clio reports generate <type> [flags]
```

Types: `trial-balance`, `balance-sheet`, `profit-loss`, `cashflow`, `aged-ar`, `aged-ap`, `cash-balance`, `general-ledger`, `vat-ledger`, `equity-movement`, `bank-balance-summary`, `bank-recon-summary`, `bank-recon-details`, `fa-summary`, `fa-recon-summary`, `ar-report`, `ledger-highlights`

| Flag | Purpose |
|------|---------|
| `--from` | Start date (P&L, cashflow, equity, recon) |
| `--to` | End/snapshot date |
| `--currency` | Currency code override |
| `--group-by` | GL: ACCOUNT, CONTACT, TRANSACTION, RELATIONSHIP · FA summary: ACCOUNT, TYPE, CATEGORY, STATUS |
| `--bank-account` | Bank account ID (for bank-recon-*) |

Also: `clio reports pdf` — generate PDF from a message/document.

### `clio exports` — Data export downloads
| Subcommand | Key flags |
|------------|-----------|
| `download` | `--type`, `--start-date`, `--end-date`, `--currency`, `--tags`, `--contact` |

---

## AI & Automation

### `clio magic` — AI document extraction
| Subcommand | Key flags |
|------------|-----------|
| `create` | one of `--file <path>` / `--url <url>` / `--html <string\|@file>`; `--type` (invoice, bill, credit-note-customer, credit-note-supplier); `--merged` (split a multi-doc PDF). `--html` takes raw HTML (e.g. an email body), rendered to a PDF server-side. Encrypted PDFs: `name__pw__password.pdf`. |
| `status <workflowIds>` | Comma-separated workflow IDs |

### `clio quick-fix <entity>` — Bulk-update transactions
Entities: `invoices`, `bills`, `customer-credit-notes`, `supplier-credit-notes`, `journals`, `cash-entries`, `sale-schedules`, `purchase-schedules`, `subscription-schedules`, `journal-schedules`

| Flag | Purpose |
|------|---------|
| `--ids <csv>` | Comma-separated resourceIds |
| `--line-items` | Target line items instead of transactions |
| `--attributes <json>` | Attributes JSON |
| `--date`, `--due`, `--tag`, `--contact`, `--account`, `--tax-profile` | Shorthand flags |
| `--input <file>` | Full request body from file |

### `clio capsules` — Transaction grouping
| Subcommand | Key flags |
|------------|-----------|
| `list` | `--limit`, `--offset`, `--all`, `--format`, `--json` |
| `get <id>` | `--json` |
| `search <query>` | `--limit`, `--offset` |
| `create` | `--title`, `--type`, `--input` |
| `update <id>` | `--title`, `--input` |
| `delete <id>` | |

### `clio capsule-transaction` (alias: `ct`) — Transaction recipes
13 IFRS-compliant recipe subcommands. Each runs a calculator, creates a capsule, and posts all transactions.

Subcommands: `loan`, `lease`, `depreciation`, `prepaid-expense`, `deferred-revenue`, `fx-reval`, `ecl`, `provision`, `fixed-deposit`, `asset-disposal`, `accrued-expense`, `leave-accrual`, `dividend`

Shared flags: `--plan`, `--input`, `--bank-account`, `--contact`, `--existing-txn`, `--ref`, `--finalize`, `--json`

Each subcommand has calculator-specific required options (e.g., `--principal`, `--rate`, `--term` for loan).

---

## Calculators (Offline)

### `clio calc` — 13 financial calculators
All calculators work offline (no auth). Use `--json` for structured output.

| Subcommand | Required flags |
|------------|----------------|
| `loan` | `--principal`, `--rate`, `--term` |
| `lease` | `--payment`, `--term`, `--rate` (optional: `--useful-life` for hire purchase) |
| `depreciation` | `--cost`, `--salvage`, `--life`, `--method` |
| `prepaid-expense` | `--amount`, `--periods`, `--frequency`, `--start-date` |
| `deferred-revenue` | `--amount`, `--periods`, `--frequency`, `--start-date` |
| `fx-reval` | `--amount`, `--book-rate`, `--closing-rate`, `--rate-direction`, `--currency` |
| `ecl` | `--current`, `--30d`, `--60d`, `--90d`, `--120d`, `--rates`, `--existing-provision` |
| `provision` | `--amount`, `--rate`, `--term`, `--start-date` |
| `fixed-deposit` | `--principal`, `--rate`, `--term` |
| `asset-disposal` | `--cost`, `--salvage`, `--life`, `--acquired`, `--disposed`, `--proceeds`, `--method` |
| `accrued-expense` | `--amount`, `--periods`, `--frequency`, `--start-date` |
| `leave-accrual` | `--employees`, `--days`, `--daily-rate`, `--periods`, `--start-date` |
| `dividend` | `--amount`, `--declaration-date`, `--payment-date`, `--withholding-rate` |

Common optional flags: `--start-date`, `--currency`, `--json`

---

## Jobs (Offline Blueprints + Online Tools)

### `clio jobs` — 12 job blueprints + tools
Blueprints are offline (no auth). Tools require auth.

| Subcommand | Type | Key flags |
|------------|------|-----------|
| `month-end` | Blueprint | `--period`, `--currency` |
| `quarter-end` | `--period`, Blueprint | `--currency` |
| `year-end` | `--period`, Blueprint | `--currency` |
| `bank-recon` | Blueprint | `--account`, `--period`, `--currency` |
| `match` | Tool | `--input` (bank records + transactions JSON) |
| `gst-vat` | Blueprint | `--period` |
| `payment-run` | Blueprint | `--due-before`, `--currency` |
| `outstanding` | Tool | `--limit` (group outstanding bills) |
| `credit-control` | `--overdue-days`, Blueprint | |
| `supplier-recon` | `--supplier`, `--period`, Blueprint | |
| `audit-prep` | `--period`, Blueprint | |
| `fa-review` | `--currency`, Blueprint | |
| `document-collection` | Blueprint | `--currency` |
| `ingest` | `--source`, Tool | `<path>` (classify + upload documents) |
| `statutory-filing` | Blueprint | `--ya`, `--jurisdiction`, `--currency` |
| `sg-cs` | Tool | `--input` (compute Singapore Form C-S) |
| `sg-ca` | Tool | `--input` (compute Singapore capital allowances) |

---

## Judgment Journal

### `clio jots` · Judgment journal
| Subcommand | Key flags |
|------------|-----------|
| `create` | `--kind` (CLASSIFICATION, MATCH, SCOPE, ASSUMPTION, RISK, METHOD, RECOVERY, DEVIATION, NOTE), `--tier` (LOW, MEDIUM, HIGH, CRITICAL), `--call`, `--why`, `--ruled-out`, `--ref` (repeatable, grammar `TYPE:resourceId[#field][:RELATION]`), `--frame`, `--confidence`, `--cited-rule`, `--workflow-label`, `--agent-label`, `--idempotency-key`, `--input` (batch JSON), `--json` |
| `recall` | `--ref`, `--kind`, `--tier`, `--disposition-verb` (FLAG, REJECT, ENDORSE), `--freetext`, `--created-from`, `--created-to`, `--stats`, `--limit`, `--offset`, `--all`, `--max-rows`, `--format`, `--json` |
| `dispose <resourceId>` | `--verb` (FLAG, REJECT, ENDORSE), `--note`, `--json` |

Batch create via `--input` file or stdin (`{ "entries": [...] }`, 1-100 per call, per-entry acks). `recall` sort is pinned server-side: critical and withheld-write entries first, then newest. `--stats` adds per-credential disposition counts (in the JSON/YAML envelope for machine formats). An all-error batch exits 1.

---

## Organization

### `clio org` — Organization info
| Subcommand | Key flags |
|------------|-----------|
| `info` | `--json` (shows name, ID, currency, country, lock date, fiscal year) |

### `clio org-users` — User management
| Subcommand | Key flags |
|------------|-----------|
| `list` | `--limit`, `--offset`, `--all`, `--format`, `--json` |
| `search <query>` | `--limit`, `--offset` |
| `invite` | `--email`, `--first-name`, `--last-name`, `--role`, `--input` |
| `update <id>` | `--role`, `--input` |
| `remove <id>` | |

### `clio auth` — Authentication
See SKILL.md Auth Precedence section for full details.

---

## Utilities

### `clio attachments` — Transaction attachments
| Subcommand | Key flags |
|------------|-----------|
| `list` | `--type` (invoices, bills, journals, etc.), `--id` |
| `add` | `--type`, `--id`, `<file>` |
| `delete <attachmentId>` | `--type`, `--id` (the transaction; the attachment id is positional) |

`list` renders the tabular view — pass `--format table` (the default) or `--format csv`.

### `clio help-center` (alias: `hc`) — Help center search
```
clio hc <query>          # Hybrid search (embeddings + keyword)
clio hc "bank recon" --section settings --limit 3
```

### `clio context` — Agent reference data
```
clio context                        # All reference data
clio context --workflow sales       # Sales workflow only
clio context -w purchases --json   # JSON output
```

### `clio export-records` — Export to XLSX
| Subcommand | Key flags |
|------------|-----------|
| `columns <entityType>` | `--json` — list exportable columns with paths and types |
| `preview <entityType>` | `--query`, `--filter`, `--columns`, `--sort-field`, `--sort-dir`, `--json` |
| `download <entityType>` | `--query`, `--filter`, `--columns`, `--sort-field`, `--sort-dir`, `--json` |

Valid entity types: INVOICE, BILL, CUSTOMER_CREDIT_NOTE, SUPPLIER_CREDIT_NOTE, SALE_PAYMENT, PURCHASE_PAYMENT, BATCH_PAYMENT, CONTACT, ITEM, CAPSULE, SCHEDULED_TRANSACTION, JOURNAL, BANK_RECORD, CASHFLOW_TRANSACTION, FIXED_ASSET, CHART_OF_ACCOUNT, TAX_PROFILE. `--query` and `--filter` are mutually exclusive. Returns pre-signed URL (expires ~5 min).

### `clio background-jobs` — Background job tracking
| Subcommand | Key flags |
|------------|-----------|
| `search` | `--status`, `--type`, `--from`, `--to`, `--limit`, `--offset`, `--json` |
| `get <jobId>` | `--json` — poll a specific job by ID |

Universal async tracker — any operation returning a jobId (contacts bulk-upsert, items bulk-upsert, bank import, magic processing) can be polled here.

### `clio mcp` — MCP stdio server
Starts an MCP server for Claude Code / AI tool integration. Exposes all 367 operations.

### `clio serve` — HTTP daemon
Starts the HTTP daemon for ChatKit and email channel integrations.

### `clio init` — Skill installer
Installs AI agent skills into your project.

### `clio versions` — Version info
Shows CLI version, Node.js version, and platform info.

### `clio update` — Self-update
Updates to the latest version via npm.
