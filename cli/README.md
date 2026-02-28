# Clio — Jaz AI Command Line Tool

<p align="center">
  <a href="https://www.npmjs.com/package/jaz-clio"><img src="https://img.shields.io/npm/v/jaz-clio?style=for-the-badge&logo=npm" alt="npm"></a>
  <a href="https://www.npmjs.com/package/jaz-clio"><img src="https://img.shields.io/npm/dm/jaz-clio?style=for-the-badge&label=downloads" alt="npm downloads"></a>
  <img src="https://img.shields.io/badge/calculators-10-red?style=for-the-badge" alt="10 Calculators">
  <img src="https://img.shields.io/badge/jobs-12-teal?style=for-the-badge" alt="12 Jobs">
  <a href="https://github.com/teamtinvio/jaz-ai/blob/main/LICENSE"><img src="https://img.shields.io/github/license/teamtinvio/jaz-ai?style=for-the-badge&color=green" alt="License"></a>
</p>

CLI for the [Jaz](https://jaz.ai) accounting platform. Create invoices, record bills, manage contacts, run financial calculators, execute accounting jobs, and install AI agent skills — all from your terminal.

> Also fully compatible with [Juan Accounting](https://juan.ac).

## Prerequisites

**Node.js 18 or later** is required. If `node --version` works, skip ahead.

Otherwise: download the LTS installer from [nodejs.org](https://nodejs.org). It includes `npm`.

## Install

```bash
npm install -g jaz-clio
```

## Authenticate

```bash
# Add your Jaz API key (get one from Settings > API in the Jaz app)
clio auth add <your-api-key>

# Verify it works
clio auth whoami

# Manage multiple orgs
clio auth add <another-key>     # Adds a second profile
clio auth list                  # See all profiles
clio auth switch <label>        # Switch active org
```

## Commands

### Transactions

```bash
clio invoices list                     # List invoices
clio invoices create --contact "ACME"  # Create a draft invoice
clio invoices pay <id>                 # Record payment
clio bills list --status APPROVED      # List approved bills
clio bills pay <id>                    # Pay a bill
clio customer-credit-notes list        # List customer credit notes
clio supplier-credit-notes list        # List supplier credit notes
clio journals list                     # List journal entries
clio cash-in list                      # List cash-in entries
clio cash-out list                     # List cash-out entries
clio cash-transfer list                # List cash transfers
```

### Contacts, Accounts & Items

```bash
clio contacts search "ACME"            # Fuzzy search contacts
clio contacts create --name "ACME Ltd" # Create a contact
clio accounts list                     # Chart of accounts
clio items list                        # Products and services
clio tags list                         # Tracking tags
```

### Financial Calculators

10 IFRS-compliant calculators that output structured blueprints with journal entries, workings, and execution plans.

```bash
clio calc loan --principal 100000 --rate 6 --term 60 --json
clio calc depreciation --cost 50000 --salvage 5000 --life 5 --method ddb --json
clio calc lease --value 120000 --term 36 --rate 5 --json
clio calc ecl --receivables '[{"bucket":"0-30","balance":50000,"rate":0.5}]' --json
clio calc provision --amount 100000 --rate 4 --periods 24 --json
clio calc fx-reval --account "USD Cash" --balance 10000 --old-rate 1.35 --new-rate 1.34 --json
clio calc fixed-deposit --principal 100000 --rate 3.5 --term 12 --json
clio calc disposal --cost 50000 --accum-dep 30000 --proceeds 15000 --json
clio calc amortization --amount 12000 --periods 12 --start 2025-01-01 --json
clio calc hire-purchase --value 80000 --term 48 --rate 4.5 --json
```

### Accounting Jobs

12 job blueprints that generate step-by-step playbooks with checklists and paired tools.

```bash
clio jobs month-end --period 2025-01                            # Month-end close
clio jobs quarter-end --period 2025-Q1                          # Quarter-end close
clio jobs year-end --period 2025                                # Year-end close
clio jobs bank-recon match --input bank-data.json --json        # Bank reconciliation matcher
clio jobs document-collection ingest --source "./receipts" --json  # Document scanner
clio jobs gst-vat --period 2025-Q1                              # GST/VAT filing prep
clio jobs payment-run --due-before 2025-02-28                   # Payment run
clio jobs credit-control                                        # AR aging + chase list
clio jobs supplier-recon                                        # AP vs supplier statements
clio jobs audit-prep --period 2025                              # Audit pack
clio jobs fa-review                                             # Fixed asset review
clio jobs statutory-filing sg-cs --ya 2026 --revenue 500000 --profit 120000 --json  # SG Form C-S
```

### Other

```bash
clio org info                          # Current org details
clio currencies list                   # Enabled currencies
clio currency-rates list               # Exchange rates
clio payments search                   # Search payments
clio bank import --file statement.csv  # Import bank statement
clio reports generate --type pnl       # Generate reports
clio capsules list                     # List capsules (transaction groups)
clio versions                          # Show version info
clio update                            # Update to latest
```

Every command supports `--json` for structured output — ideal for piping to other tools or for AI agents.

## Install AI Skills

Clio also installs AI agent skills into your project. Skills are knowledge files that teach AI tools (Claude Code, Antigravity, Codex, Copilot, Cursor) how to work with the Jaz API.

```bash
cd /path/to/your/project
clio init                              # Auto-detects your AI tool, installs all 4 skills
clio init --skill jaz-api              # Install a specific skill
clio init --platform claude            # Force a specific platform
```

See the [full README](https://github.com/teamtinvio/jaz-ai) for skill details, reference file catalogs, and plugin installation.

## Common API Gotchas

Mistakes the CLI and skills prevent:

| Gotcha | Wrong | Right |
|--------|-------|-------|
| Auth header | `Authorization: Bearer ...` | `x-jk-api-key: ...` |
| ID field | `id` | `resourceId` |
| Date field | `issueDate`, `date` | `valueDate` |
| FX currency | `currencyCode: "USD"` | `currency: { sourceCurrency: "USD" }` |
| Org endpoint | `{ data: [...] }` | `{ data: { ... } }` (single object) |
| Payments | `[{ ... }]` | `{ payments: [{ ... }] }` (wrapped) |
| CN Refunds | `{ payments: [{ paymentAmount }] }` | `{ refunds: [{ refundAmount }] }` |
| Apply credits | `{ amount: 100 }` | `{ credits: [{ creditNoteResourceId, amountApplied }] }` |

## License

[MIT](https://github.com/teamtinvio/jaz-ai/blob/main/LICENSE) - Copyright (c) 2026 Tinvio / Jaz
