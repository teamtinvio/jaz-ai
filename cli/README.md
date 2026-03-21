# Clio — Jaz AI Command Line Tool

<p align="center">
  <a href="https://www.npmjs.com/package/jaz-clio"><img src="https://img.shields.io/npm/v/jaz-clio?style=for-the-badge&logo=npm" alt="npm"></a>
  <a href="https://www.npmjs.com/package/jaz-clio"><img src="https://img.shields.io/npm/dm/jaz-clio?style=for-the-badge&label=downloads" alt="npm downloads"></a>
  <img src="https://img.shields.io/badge/tools-211-blue?style=for-the-badge" alt="211 Tools">
  <img src="https://img.shields.io/badge/calculators-13-red?style=for-the-badge" alt="13 Calculators">
  <img src="https://img.shields.io/badge/jobs-12-teal?style=for-the-badge" alt="12 Jobs">
  <a href="https://github.com/teamtinvio/jaz-ai/blob/main/LICENSE"><img src="https://img.shields.io/github/license/teamtinvio/jaz-ai?style=for-the-badge&color=green" alt="License"></a>
</p>

**Complete agent stack for all of Jaz, built for AI agents and accountants.**
Create invoices, record bills, manage contacts, run financial calculators, execute accounting jobs, and install AI agent skills — all from your terminal.

> Also fully compatible with [Juan Accounting](https://juan.ac).

## Contents

- [Quickstart](#quickstart)
- [Install](#install)
- [Authenticate](#authenticate)
- [Commands](#commands)
- [MCP Server](#mcp-server)
- [Install AI Skills](#install-ai-skills)
- [Privacy & Security](#privacy--security)
- [Support](#support)

## Quickstart

```bash
npm install -g jaz-clio
clio auth add <your-api-key>    # Get key from Settings > API in Jaz app
clio invoices list               # You're in
```

## Install

**Node.js 18+** required. If `node --version` works, you're set. Otherwise: [nodejs.org](https://nodejs.org) (LTS).

```bash
npm install -g jaz-clio
```

## Authenticate

```bash
clio auth add <your-api-key>    # Add your Jaz API key
clio auth whoami                 # Verify it works
```

| I have... | Use |
|-----------|-----|
| API key from Jaz app | `clio auth add <key>` |
| Environment variable | `export JAZ_API_KEY=jk-...` |
| Multiple orgs | `clio auth add <key>` + `clio auth switch <label>` |

### Auth Precedence

When multiple credentials are available, Clio resolves them in this order:

| Priority | Source | Set via |
|----------|--------|---------|
| 1 | `--api-key` flag | Explicit per-command |
| 2 | `JAZ_API_KEY` env var | Shell or `.env` |
| 3 | `--org` flag / `JAZ_ORG` env | Named profile lookup |
| 4 | Active profile | `clio auth switch` |

> **Warning:** If `JAZ_API_KEY` is set in your shell, it overrides `--org` and the active profile. Unset it (`unset JAZ_API_KEY`) before switching tenants with `clio auth switch`, or use per-command `--api-key` instead.

<details>
<summary>All auth subcommands</summary>

```bash
clio auth add <key>              # Add API key (validates against API)
clio auth list                   # List all saved profiles
clio auth switch <label>         # Switch active org
clio auth remove <label>         # Remove a profile
clio auth whoami                 # Show current org
clio auth clear                  # Remove all profiles
```

</details>

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
clio capsules list                     # List capsules (transaction groups)
```

### Contacts, Accounts & Items

```bash
clio contacts search "ACME"            # Fuzzy search contacts
clio contacts create --name "ACME Ltd" # Create a contact
clio accounts list                     # Chart of accounts
clio items list                        # Products and services
clio tags list                         # Tracking tags
clio contact-groups list               # Contact groups
clio custom-fields list                # Custom field definitions
```

### Bank & Reconciliation

```bash
clio bank import --file statement.csv  # Import bank statement
clio bank accounts                     # List bank accounts
clio bank records                      # List bank records
clio bank add-records                  # Create bank records (JSON)
clio bank auto-recon                   # Auto-reconciliation
clio bank-rules list                   # List auto-tagging rules
clio bank-rules create                 # Create auto-tagging rule
```

### Fixed Assets

```bash
clio fixed-assets list                 # List fixed assets (alias: clio fa list)
clio fixed-assets get <id>             # Get fixed asset details
clio fixed-assets create               # Register a new asset
clio fixed-assets sell <id>            # Record asset sale
clio fixed-assets discard <id>         # Discard/scrap an asset
clio fixed-assets transfer <id>        # Transfer between accounts
clio fixed-assets undo-disposal <id>   # Reverse a disposal
```

### Subscriptions

```bash
clio subscriptions list                # List recurring subscriptions (alias: clio subs)
clio subscriptions create              # Create a subscription
clio subscriptions cancel <id>         # Cancel a subscription
clio subscriptions search-scheduled    # Search scheduled transactions
```

### Financial Calculators

13 IFRS-compliant calculators that output structured blueprints with journal entries, workings, and execution plans.

```bash
clio calc loan --principal 100000 --rate 6 --term 60 --json
clio calc depreciation --cost 50000 --salvage 5000 --life 5 --method ddb --json
clio calc lease --value 120000 --term 36 --rate 5 --json
clio calc ecl --receivables '[{"bucket":"0-30","balance":50000,"rate":0.5}]' --json
clio calc provision --amount 100000 --rate 4 --periods 24 --json
clio calc fx-reval --account "USD Cash" --balance 10000 --old-rate 1.35 --new-rate 1.34 --json
clio calc fixed-deposit --principal 100000 --rate 3.5 --term 12 --json
clio calc disposal --cost 50000 --accum-dep 30000 --proceeds 15000 --json
clio calc prepaid-expense --amount 12000 --periods 12 --start 2025-01-01 --json
clio calc deferred-revenue --amount 24000 --periods 12 --start 2025-01-01 --json
clio calc accrued-expense --amount 5000 --periods 3 --json
clio calc leave-accrual --employees 50 --avg-daily-rate 200 --avg-days 15 --json
clio calc dividend --amount 100000 --json
```

### Transaction Recipes (Capsule Transactions)

13 recipe subcommands that compute, plan, and optionally execute multi-step transactions from calculator output.

```bash
clio capsule-transaction loan --principal 100000 --rate 6 --term 60    # alias: clio ct loan
clio ct lease --payment 5000 --term 36 --rate 5
clio ct depreciation --cost 50000 --salvage 5000 --life 5
clio ct prepaid-expense --amount 12000 --periods 12 --start 2025-01-01
clio ct fx-reval --account "USD Cash" --balance 10000 --old-rate 1.35 --new-rate 1.34
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

### Reports

16 report types:

```bash
clio reports generate <type>           # Generate a report
clio reports pdf <type>                # Download report as PDF
```

Types: `trial-balance`, `balance-sheet`, `profit-loss`, `cashflow`, `aged-ar`, `aged-ap`, `cash-balance`, `general-ledger`, `vat-ledger`, `equity-movement`, `bank-balance-summary`, `bank-recon-summary`, `bank-recon-details`, `fa-summary`, `fa-recon-summary`, `ar-report`.

### Other Commands

```bash
clio org info                          # Current org details
clio org-users list                    # Organization members
clio currencies list                   # Enabled currencies
clio currency-rates list               # Exchange rates
clio payments search                   # Search payments
clio tax-profiles list                 # Tax profiles
clio cashflow search                   # Search cashflow transactions
clio schedulers list-invoices          # Scheduled (recurring) invoices
clio exports download --type INVOICES  # Download data export
clio attachments list <id>             # List attachments on a transaction
clio bookmarks list                    # Saved bookmarks
clio inventory items                   # Inventory items
clio inventory balance <item-id>       # Inventory balance for an item
clio search "query"                    # Universal cross-entity search
clio magic create --file receipt.pdf   # AI-extract from attachment
clio kb "topic"                        # Search help center (alias: clio hc)
clio context                           # Generate agent context summary
clio versions                          # Show version info
clio update                            # Update to latest
```

Every command supports `--json` for structured output — ideal for piping to other tools or for AI agents.

## MCP Server

Expose all 241 CLI tools to AI coding and coworking agents via the Model Context Protocol (MCP). The server runs locally on your machine — no cloud, no ports. API calls go directly from your machine to the Jaz API.

**Claude Code:**

```bash
claude mcp add jaz -- npx jaz-clio mcp
```

**Cursor / VS Code / Windsurf** — add to your MCP config:

```json
{
  "mcpServers": {
    "jaz": {
      "command": "npx",
      "args": ["-y", "jaz-clio", "mcp"],
      "env": {
        "JAZ_API_KEY": "jk-your-api-key"
      }
    }
  }
}
```

Auth resolves the same way as the CLI: `JAZ_API_KEY` env var, `--api-key` flag, or existing credentials from `clio auth add`. Offline tools (calculators, job blueprints) work without any API key.

## Install AI Skills

Clio also installs AI agent skills into your project. Skills are knowledge files that teach AI tools (Claude Code, Antigravity, Codex, Copilot, Cursor) how to work with the Jaz API.

```bash
cd /path/to/your/project
clio init                              # Auto-detects your AI tool, installs all 4 skills
clio init --skill jaz-api              # Install a specific skill
clio init --platform claude            # Force a specific platform
```

See the [full README](https://github.com/teamtinvio/jaz-ai) for skill details, reference file catalogs, and plugin installation.

## Privacy & Security

Jaz AI runs entirely on your machine. API calls go directly from your machine to the Jaz API over HTTPS. This tool does not include telemetry or collect data. Your API key is stored locally in `~/.config/jaz-clio/credentials.json`.

See our full privacy policy: [jaz.ai/legal](https://jaz.ai/legal)

## Support

- Help center: [help.jaz.ai](https://help.jaz.ai)
- GitHub Issues: [github.com/teamtinvio/jaz-ai/issues](https://github.com/teamtinvio/jaz-ai/issues)
- Email: api-support@jaz.ai

## License

[MIT](https://github.com/teamtinvio/jaz-ai/blob/main/LICENSE) - Copyright (c) 2026 Tinvio / Jaz
