# Clio Command Catalog

Complete reference for all 48 command groups. Organized by domain.

---

## Transactions

### `clio invoices` — Sales invoices
| Subcommand | Key flags |
|------------|-----------|
| `list` | `--limit`, `--offset`, `--all`, `--format`, `--json` |
| `get <id>` | `--json` |
| `search` | `--ref`, `--contact`, `--status`, `--from`, `--to`, `--tag`, `--sort`, `--order` |
| `create` | `--contact`, `--date`, `--due`, `--ref`, `--currency`, `--rate`, `--lines`, `--tax-profile`, `--finalize`, `--input` |
| `update <id>` | `--contact`, `--date`, `--due`, `--ref`, `--lines`, `--input` |
| `delete <id>` | |
| `pay <id>` | `--amount`, `--tx-amount`, `--account`, `--method`, `--ref`, `--date` |
| `apply-credits <id>` | `--credit-note`, `--amount` |
| `download <id>` | `--output` (PDF download) |

### `clio bills` — Purchase bills
| Subcommand | Key flags |
|------------|-----------|
| `list` | `--limit`, `--offset`, `--all`, `--format`, `--json` |
| `get <id>` | `--json` |
| `search` | `--ref`, `--contact`, `--status`, `--from`, `--to`, `--tag`, `--sort`, `--order` |
| `create` | `--contact`, `--date`, `--due`, `--ref`, `--currency`, `--rate`, `--lines`, `--tax-profile`, `--finalize`, `--input` |
| `update <id>` | `--contact`, `--date`, `--due`, `--ref`, `--lines`, `--input` |
| `delete <id>` | |
| `pay <id>` | `--amount`, `--tx-amount`, `--account`, `--method`, `--ref`, `--date` |
| `apply-credits <id>` | `--credit-note`, `--amount` |

### `clio customer-credit-notes` — Customer credit notes
| Subcommand | Key flags |
|------------|-----------|
| `list` | `--limit`, `--offset`, `--all`, `--format`, `--json` |
| `get <id>` | `--json` |
| `search` | `--ref`, `--contact`, `--status`, `--from`, `--to`, `--tag`, `--sort`, `--order` |
| `create` | `--contact`, `--date`, `--ref`, `--currency`, `--rate`, `--lines`, `--tax-profile`, `--finalize`, `--input` |
| `update <id>` | `--contact`, `--date`, `--ref`, `--lines`, `--input` |
| `delete <id>` | |
| `refund <id>` | `--amount`, `--account`, `--method`, `--ref`, `--date` |
| `refunds <id>` | List refunds for a credit note |
| `download <id>` | `--output` (PDF download) |

### `clio supplier-credit-notes` — Supplier credit notes
| Subcommand | Key flags |
|------------|-----------|
| `list` | `--limit`, `--offset`, `--all`, `--format`, `--json` |
| `get <id>` | `--json` |
| `search` | `--ref`, `--contact`, `--status`, `--from`, `--to`, `--tag`, `--sort`, `--order` |
| `create` | `--contact`, `--date`, `--ref`, `--currency`, `--rate`, `--lines`, `--tax-profile`, `--finalize`, `--input` |
| `update <id>` | `--contact`, `--date`, `--ref`, `--lines`, `--input` |
| `delete <id>` | |
| `refund <id>` | `--amount`, `--account`, `--method`, `--ref`, `--date` |
| `refunds <id>` | List refunds for a credit note |

### `clio journals` — Journal entries
| Subcommand | Key flags |
|------------|-----------|
| `list` | `--limit`, `--offset`, `--all`, `--format`, `--json` |
| `get <id>` | `--json` |
| `search` | `--ref`, `--from`, `--to`, `--status`, `--tag`, `--type`, `--sort`, `--order` |
| `create` | `--date`, `--ref`, `--entries`, `--currency`, `--rate`, `--finalize`, `--input` |
| `update <id>` | `--date`, `--ref`, `--entries`, `--input` |
| `delete <id>` | |
| `transfer-trial-balance` (alias: `ttb`) | `--from-date`, `--to-date`, `--target-date` |

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
| `create` | `--from-account`, `--to-account`, `--amount`, `--date`, `--ref`, `--rate`, `--input` |
| `delete <id>` | |

### `clio payments` — Cashflow transactions (read-only)
| Subcommand | Key flags |
|------------|-----------|
| `list` | `--limit`, `--offset`, `--all`, `--format`, `--json` |
| `search` | `--from`, `--to`, `--type`, `--direction`, `--ref`, `--sort`, `--order` |
| `get <id>` | `--json` |
| `update <id>` | `--date`, `--ref`, `--input` |
| `delete <id>` | |

### `clio cashflow` — Cashflow search
| Subcommand | Key flags |
|------------|-----------|
| `search` | `--from`, `--to`, `--type`, `--direction`, `--ref`, `--sort`, `--order`, `--limit`, `--offset`, `--all` |
| `delete <id>` | |

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

### `clio contact-groups` — Contact grouping
| Subcommand | Key flags |
|------------|-----------|
| `list` | `--limit`, `--offset`, `--all`, `--format`, `--json` |
| `get <id>` | `--json` |
| `search <query>` | `--limit`, `--offset` |
| `create` | `--name`, `--input` |
| `update <id>` | `--name`, `--input` |
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
| `create` | `--name`, `--sale-name`, `--purchase-name`, `--sale-price`, `--purchase-price`, `--account`, `--tax-profile`, `--input` |
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
| `add <code>` | `--rate`, `--from`, `--to` |
| `update <rateId>` | `--rate`, `--from`, `--to` |
| `import <code>` | `--from`, `--to` (auto-fetch from ECB/MAS) |
| `import-status <jobId>` | Check import job status |

### `clio tax-profiles` — Tax profiles and tax types
| Subcommand | Key flags |
|------------|-----------|
| `list` | `--limit`, `--offset`, `--all`, `--format`, `--json` |
| `get <id>` | `--json` |
| `search <query>` | `--limit`, `--offset` |
| `create` | `--name`, `--rate`, `--tax-type`, `--input` |
| `update <id>` | `--name`, `--rate` |
| `types` | List available tax type codes |
| `wht-codes` | List withholding tax codes |

### `clio custom-fields` — Custom field definitions
| Subcommand | Key flags |
|------------|-----------|
| `list` | `--limit`, `--offset`, `--all`, `--format`, `--json` |
| `get <id>` | `--json` |
| `search <query>` | `--limit`, `--offset` |
| `create` | `--name`, `--input` |
| `update <id>` | `--name` |
| `delete <id>` | |

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

## Bank & Reconciliation

### `clio bank` — Bank accounts and records
| Subcommand | Key flags |
|------------|-----------|
| `accounts` | `--limit`, `--format`, `--json` |
| `get <id>` | `--json` |
| `records <accountId>` | `--from`, `--to`, `--status`, `--description`, `--limit`, `--offset`, `--all` |
| `add-records <accountId>` | `--input` (JSON array of bank records) |
| `import <accountId> <file>` | Supports CSV, OFX, XLS, XLSX |
| `auto-recon <accountId>` | Trigger auto-reconciliation |

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
| `create` | `--name`, `--type`, `--purchase-price`, `--purchase-date`, `--input` |
| `update <id>` | `--name`, `--input` |
| `delete <id>` | |
| `discard <id>` | `--date`, `--account` |
| `sell <id>` | `--date`, `--amount`, `--account` |
| `transfer <id>` | `--date`, `--to-type` |
| `undo-disposal <id>` | Reverse a discard or sale |

### `clio inventory` (alias: `inv`) — Inventory tracking
| Subcommand | Key flags |
|------------|-----------|
| `items` | `--limit`, `--offset`, `--all`, `--format`, `--json` |
| `balance <itemId>` | `--json` |

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
| `create-invoice` | `--contact`, `--ref`, `--interval`, `--start-date`, `--lines`, `--input` |
| `create-bill` | `--contact`, `--ref`, `--interval`, `--start-date`, `--lines`, `--input` |
| `create-journal` | `--ref`, `--interval`, `--start-date`, `--entries`, `--input` |

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
| `--group-by` | ACCOUNT, TRANSACTION, or CAPSULE (for GL/FA) |
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
| `create <file>` | `--type` (invoice, bill, credit-note-customer, credit-note-supplier), `--wait`, `--password` |
| `status <workflowIds>` | Comma-separated workflow IDs |
| `search` | `--type`, `--status`, `--from`, `--to`, `--limit`, `--offset` |

### `clio search <query>` — Universal cross-entity search
Searches contacts, invoices, bills, credit notes, items. Returns grouped results.
Flags: `--limit`, `--json`

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
| `prepaid-expense` | `--amount`, `--start-date`, `--months` |
| `deferred-revenue` | `--amount`, `--start-date`, `--months` |
| `fx-reval` | `--amount`, `--original-rate`, `--new-rate`, `--currency` |
| `ecl` | `--receivables`, `--aging-buckets` (via `--input`) |
| `provision` | `--amount`, `--rate`, `--periods` |
| `fixed-deposit` | `--principal`, `--rate`, `--term` |
| `asset-disposal` | `--cost`, `--accumulated-dep`, `--proceeds` |
| `accrued-expense` | `--amount`, `--start-date`, `--months` |
| `leave-accrual` | `--daily-rate`, `--days`, `--employees` (via `--input`) |
| `dividend` | `--total-dividend`, `--shares` (via `--input`) |

Common optional flags: `--start-date`, `--currency`, `--json`

---

## Jobs (Offline Blueprints + Online Tools)

### `clio jobs` — 12 job blueprints + tools
Blueprints are offline (no auth). Tools require auth.

| Subcommand | Type | Key flags |
|------------|------|-----------|
| `month-end` | Blueprint | `--month`, `--year`, `--currency` |
| `quarter-end` | Blueprint | `--quarter`, `--year`, `--currency` |
| `year-end` | Blueprint | `--year`, `--currency` |
| `bank-recon` | Blueprint | `--bank-account`, `--month` |
| `match` | Tool | `--input` (bank records + transactions JSON) |
| `gst-vat` | Blueprint | `--period`, `--jurisdiction` |
| `payment-run` | Blueprint | `--date` |
| `bank-file` | Tool | `--format`, `--input` (generates GIRO/FAST/PayNow file) |
| `outstanding` | Tool | `--contact`, `--limit` (group outstanding bills) |
| `credit-control` | Blueprint | `--aging-days` |
| `supplier-recon` | Blueprint | `--contact` |
| `audit-prep` | Blueprint | `--year` |
| `fa-review` | Blueprint | `--year` |
| `document-collection` | Blueprint | `--month` |
| `ingest` | Tool | `<path>` (classify + upload documents) |
| `statutory-filing` | Blueprint | `--jurisdiction`, `--year` |
| `sg-cs` | Tool | `--input` (compute Singapore Form C-S) |
| `sg-ca` | Tool | `--input` (compute Singapore capital allowances) |

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
| `invite` | `--email`, `--first-name`, `--last-name`, `--roles`, `--input` |
| `update <id>` | `--roles`, `--input` |
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
| `delete` | `--type`, `--id`, `--attachment-id` |
| `table` | `--type`, `--id` (tabular view) |

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

### `clio mcp` — MCP stdio server
Starts an MCP server for Claude Code / AI tool integration. Exposes all 240 tools.

### `clio serve` — HTTP daemon
Starts the HTTP daemon for ChatKit and email channel integrations.

### `clio init` — Skill installer
Installs AI agent skills into your project.

### `clio versions` — Version info
Shows CLI version, Node.js version, and platform info.

### `clio update` — Self-update
Updates to the latest version via npm.
