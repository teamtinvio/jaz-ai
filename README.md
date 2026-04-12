# Jaz AI

<p align="center">
  <a href="https://github.com/teamtinvio/jaz-ai/releases"><img src="https://img.shields.io/github/v/release/teamtinvio/jaz-ai?style=for-the-badge&color=blue" alt="GitHub Release"></a>
  <img src="https://img.shields.io/badge/API_rules-117-green?style=for-the-badge" alt="117 API Rules">
  <img src="https://img.shields.io/badge/skills-5-purple?style=for-the-badge" alt="5 Skills">
  <img src="https://img.shields.io/badge/recipes-16-orange?style=for-the-badge" alt="16 Recipes">
  <img src="https://img.shields.io/badge/calculators-13-red?style=for-the-badge" alt="13 Calculators">
  <img src="https://img.shields.io/badge/jobs-12-teal?style=for-the-badge" alt="12 Jobs">
  <a href="https://github.com/teamtinvio/jaz-ai/blob/main/LICENSE"><img src="https://img.shields.io/github/license/teamtinvio/jaz-ai?style=for-the-badge&color=green" alt="License"></a>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/jaz-clio"><img src="https://img.shields.io/npm/v/jaz-clio?style=flat-square&logo=npm&label=CLI" alt="npm"></a>
  <a href="https://www.npmjs.com/package/jaz-clio"><img src="https://img.shields.io/npm/dm/jaz-clio?style=flat-square&label=downloads" alt="npm downloads"></a>
  <a href="https://github.com/teamtinvio/jaz-ai/stargazers"><img src="https://img.shields.io/github/stars/teamtinvio/jaz-ai?style=flat-square&logo=github" alt="GitHub stars"></a>
</p>

**Complete agent stack for all of Jaz, built for AI agents and accountants.**
MCP server, CLI, skills, and plugins for Claude Code, Cowork, Codex, Copilot, Cursor, and 30+ AI tools.

Includes 117 API rules, 13 financial calculators, 16 IFRS recipes, 12 accounting jobs, and data conversion playbooks so that agents work with [Jaz](https://jaz.ai) correctly and autonomously.

> All skills, CLI commands, MCP tools, and the plugin are fully compatible with [Juan Accounting](https://juan.ac) too.

## Contents

- [Quickstart](#quickstart)
- [Skills](#skills)
- [Installation](#installation)
- [Usage](#usage)
- [For AI Agents](#for-ai-agents)
- [For Accountants](#for-accountants)
- [What's Inside](#whats-inside)
- [Architecture](#architecture)
- [Troubleshooting](#troubleshooting)
- [Privacy & Security](#privacy--security)
- [Support](#support)

## Quickstart

Pick your path — all three take under 30 seconds:

**Skills** (any AI tool, zero dependencies):
```bash
# Download ZIP from GitHub, then copy:
cp -r jaz-ai-main/.claude/skills/ your-project/.claude/skills/     # Claude Code
cp -r jaz-ai-main/.agents/skills/ your-project/.agents/skills/     # Codex, Copilot, Cursor
```

**CLI** (developers, accountants & AI agents):
```bash
npm install -g jaz-clio && clio auth add <your-api-key> && clio invoices list
```

**Plugin** (Claude Code):
```
/plugin marketplace add teamtinvio/jaz-ai
```

## Skills

| Skill | What It Does |
|-------|-------------|
| **jaz-api** | 117 rules, full endpoint catalog, error catalog, field mapping. Agents write correct Jaz API code on the first try instead of guessing |
| **jaz-conversion** | Xero, QuickBooks, Sage, Excel migration playbook. CoA mapping, tax profiles, FX, clearing accounts, trial balance verification |
| **jaz-recipes** | 16 IFRS-compliant recipes (loans, leases, depreciation, FX reval, ECL, provisions, and more) + 13 CLI financial calculators with blueprint output |
| **jaz-jobs** | 12 accounting jobs (month/quarter/year-end close, bank recon, document collection, GST/VAT filing, payment runs, credit control, supplier recon, audit prep, FA review, statutory filing) + Singapore Form C-S tax computation with AI-guided wizard workflow |

## Installation

There are four ways to use Jaz AI, depending on what you need:

| Method | What You Get | Best For |
|--------|-------------|----------|
| **Skills** | Knowledge files your AI reads automatically | Anyone using an AI coding tool with Jaz |
| **Plugins** | One-click install via marketplace / extensions | Claude Code, Claude Cowork, Gemini CLI |
| **CLI** | `clio` command-line tool with calculators, jobs, and full API access | AI agents |
| **MCP Server** | 247 tools your AI can call directly | AI agents and accountants that need live API access |

### Option 1: Install Skills (for any AI tool)

Skills are markdown files that teach your AI tool how to work with Jaz — API rules, field names, recipes, and more. Your AI reads them automatically. No npm, Node.js, or git required.

**Download and copy** — works on any machine:

1. [Download this repo as ZIP](https://github.com/teamtinvio/jaz-ai/archive/refs/heads/main.zip) and extract it
2. Copy the skills folder into your project:

| Your AI Tool | Copy To |
|-------------|---------|
| Claude Code | `.claude/skills/` |
| Codex, Copilot, Cursor, Windsurf, Antigravity | `.agents/skills/` |

```bash
# For Claude Code
cp -r jaz-ai-main/.claude/skills/ /path/to/your/project/.claude/skills/

# For Codex, Copilot, Cursor, Windsurf, Antigravity (Agent Skills standard)
cp -r jaz-ai-main/.agents/skills/ /path/to/your/project/.agents/skills/
```

Supports 30+ platforms via the [Agent Skills](https://agentskills.io) open standard: Claude Code, Codex, Copilot, Cursor, Antigravity, Windsurf, Goose, Gemini CLI, Roo Code, Junie, Amp, and more.

<details>
<summary>With a terminal (auto-detect platform)</summary>

If you have Node.js installed, you can use `npx` to auto-detect your AI tool and install skills in one command — no global install needed:

```bash
cd /path/to/your/project

# Install all 5 skills (auto-detects your AI tool)
npx jaz-clio init

# Or specify a platform
npx jaz-clio init --platform claude       # .claude/skills/
npx jaz-clio init --platform codex        # .agents/skills/
npx jaz-clio init --platform copilot      # .agents/skills/
npx jaz-clio init --platform cursor       # .agents/skills/
npx jaz-clio init --platform windsurf     # .agents/skills/
npx jaz-clio init --platform agents       # .agents/skills/ (universal)

# Or install a specific skill only
npx jaz-clio init --skill jaz-api
```

</details>

### Option 2: Install Plugins

**Claude Code / Claude Cowork:**
```
/plugin marketplace add teamtinvio/jaz-ai
```

**Gemini CLI:**
```bash
gemini extensions install https://github.com/teamtinvio/jaz-ai
```

Both register skills and the MCP server automatically.

### Option 3: Use the CLI (for AI agents)

The CLI gives you direct access to 53 command groups — financial calculators, job blueprints, API commands, and more — from your terminal.

**Requires Node.js 18+.** If `node --version` works, you're set. Otherwise, download from [nodejs.org](https://nodejs.org) (LTS).

```bash
npm install -g jaz-clio

# Authenticate with your Jaz API key
clio auth add <your-api-key>

# Now use any command
clio invoices list
clio calc loan --principal 100000 --rate 6 --term 60
clio jobs bank-recon match --input bank-data.json
clio --help                # See all commands
```

Full command reference: [README-cli.md](README-cli.md)

### Option 4: MCP Server (for AI agents and accountants)

The MCP server gives AI coding assistants direct access to 247 accounting tools — invoices, bills, journals, contacts, reports, financial calculators, job blueprints, and more. Runs locally on your machine.

**Claude Code:**

```bash
claude mcp add jaz -- npx jaz-clio mcp
```

**Claude Desktop / Cowork / Cursor / VS Code / Windsurf** — add to your MCP config:

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

> Offline tools (calculators, job blueprints) work without an API key. For API tools, set `JAZ_API_KEY` or run `clio auth add` first.

**Multi-org** — access multiple organizations in one session:

```json
{
  "env": {
    "JAZ_API_KEY": "jk-org-one-key,jk-org-two-key"
  }
}
```

Comma-separated API keys enable multi-org mode. Claude sees a `list_organizations` tool and routes each request to the correct org via `org_id`. Switch orgs naturally in conversation: *"Show Acme's invoices"* then *"Now check Beta's AR aging"*.

Personal access tokens (`pat_...`) also work for multi-org once available — one token for all your organizations.

<details>
<summary>Available tool categories (247 tools)</summary>

| Category | Tools | Auth Required |
|----------|-------|---------------|
| **Invoices** | list, get, search, create, update, delete, pay, apply-credits, download | Yes |
| **Bills** | list, get, search, create, update, delete, pay, apply-credits | Yes |
| **Journals** | list, get, search, create, delete | Yes |
| **Contacts** | list, get, search, create, update, delete | Yes |
| **Accounts** | list, get, search, create, delete | Yes |
| **Items** | list, get, search, create, update, delete | Yes |
| **Bank** | import, accounts, records, add-records, auto-recon | Yes |
| **Bank Rules** | list, get, search, create, update, delete | Yes |
| **Fixed Assets** | list, get, search, create, update, delete, discard, sell, transfer, undo-disposal | Yes |
| **Subscriptions** | list, get, create, update, delete, cancel, search-scheduled | Yes |
| **Reports** | generate (16 types), pdf | Yes |
| **Credit Notes** | customer + supplier CRUD, refunds, download | Yes |
| **Cash Entries** | cash-in, cash-out, cash-transfer | Yes |
| **Other API** | org, currencies, rates, tags, capsules, tax-profiles, bookmarks, payments, cashflow, schedulers, exports, attachments, org-users, contact-groups, custom-fields, inventory, search, magic | Yes |
| **Calculators** | loan, depreciation, lease, ECL, provision, FX reval, fixed deposit, disposal, prepaid-expense, deferred-revenue, accrued-expense, leave-accrual, dividend | No |
| **Job Blueprints** | month-end, quarter-end, year-end, bank-recon, document-collection, GST/VAT, payment-run, credit-control, supplier-recon, audit-prep, FA-review, statutory-filing | No |
| **Draft Validation** | validate invoice, bill, journal, credit note drafts | Yes |

</details>

## Usage

Skills activate automatically when you or your agent work with Jaz API code or data conversion tasks. Just describe what you need:

### API Skill

```
Create an invoice with 3 line items and 7% GST

Build a payment for invoice INV-001 in USD

Query all overdue bills with pagination

Set up chart of accounts for a Singapore company
```

### Conversion Skill

```
Convert this Xero trial balance export to Jaz

Migrate QuickBooks aged receivables to conversion invoices

Map this Excel chart of accounts to Jaz CoA structure

Verify the trial balance after conversion
```

### Transaction Recipes Skill

```
Set up a 5-year bank loan with monthly repayment schedule

Model IFRS 16 lease for a 3-year office lease at 5% IBR

Calculate ECL provision on aged receivables

Record prepaid insurance with monthly amortization via capsule
```

### Jobs Skill

```
Close the books for January 2025

Run bank reconciliation for DBS Current account

Prepare GST return for Q1 2025

Generate a payment run for all overdue bills

Prepare audit pack for FY 2025
```

### Financial Calculators & Job Tools (CLI)

```bash
clio calc loan --principal 100000 --rate 6 --term 60 --json
clio calc depreciation --cost 50000 --salvage 5000 --life 5 --method ddb --json
clio jobs bank-recon match --input bank-data.json --json
clio jobs document-collection ingest --source "https://www.dropbox.com/scl/fo/..." --json
clio jobs statutory-filing sg-cs --ya 2026 --revenue 500000 --profit 120000 --json
```

13 financial calculators, 12 job blueprints, and paired tools (bank matcher, document ingest with cloud support, SG Form C-S tax computation). Add `--json` for structured blueprint output with capsule type, journal entries, workings, and step-by-step execution plan.

Full command reference: [README-cli.md](README-cli.md), [transaction-recipes skill](src/skills/transaction-recipes/SKILL.md), and [jobs skill](src/skills/jobs/SKILL.md).

## For AI Agents

### Skill Discovery

AI tools automatically discover skills from standard paths:

| Your AI Tool | Skills loaded from |
|-------------|-------------------|
| Claude Code | `.claude/skills/` |
| Codex, Copilot, Cursor, Windsurf | `.agents/skills/` |

Skills are pure markdown — no runtime, no dependencies. Your agent reads them and gains domain knowledge about Jaz accounting.

### MCP Tools

With the MCP server running (`claude mcp add jaz -- npx jaz-clio mcp`), your agent has 247 tools for direct API access. Every tool returns structured JSON. See [tool categories](#option-4-mcp-server-for-ai-agents) for the full breakdown.

### Structured Output

Every CLI command supports `--json` for machine-readable output:

```bash
clio invoices list --json              # JSON array of invoices
clio calc loan --principal 100000 --rate 6 --term 60 --json   # Blueprint with journal entries
clio context --json                    # Full org context for agent bootstrapping
```

### OpenAPI Spec

Full OpenAPI specification available at `spec/openapi.yaml` — synced weekly from the API source.

## For Accountants

### What Jaz AI Does

Jaz AI gives your AI assistant deep knowledge of accounting — so when you describe what you need in plain English, it does the right thing. No need to know API codes or field names.

### Calculator Examples

```bash
# "I took a $100k bank loan at 6% for 5 years — give me the amortization schedule"
clio calc loan --principal 100000 --rate 6 --term 60

# "Depreciate a $50k machine over 5 years, $5k salvage, declining balance"
clio calc depreciation --cost 50000 --salvage 5000 --life 5 --method ddb

# "What's the ECL provision on our aged receivables?"
clio calc ecl --receivables '[{"bucket":"0-30","balance":50000,"rate":0.5}]'
```

### Job Blueprints

```bash
# "Close the books for January" — gives you a full checklist
clio jobs month-end --period 2025-01

# "Prepare for the auditor" — compiles reports, schedules, reconciliations
clio jobs audit-prep --period 2025

# "File GST for Q1" — walks through tax ledger review and filing
clio jobs gst-vat --period 2025-Q1
```

## What's Inside

### API Skill (`jaz-api`)

| Reference | Lines | Content |
|-----------|-------|---------|
| `SKILL.md` | 396 | 117 rules — auth, IDs, dates, FX, payments, field aliases, response shapes |
| `endpoints.md` | 2342 | Request/response examples for every core endpoint |
| `errors.md` | 860 | Error catalog with root causes and fixes |
| `field-map.md` | 635 | Intuitive name → actual field name mapping |
| `search-reference.md` | 769 | Filter fields, sort fields, operators for 28 search endpoints |
| `full-api-surface.md` | 726 | Complete endpoint catalog (80+), enums, limits |
| `dependencies.md` | 140 | Resource creation order (currencies → CoA → transactions) |
| `feature-glossary.md` | 248 | Business context per feature |

### Conversion Skill (`jaz-conversion`)

| Reference | Content |
|-----------|---------|
| `SKILL.md` | Conversion domain knowledge, clearing account pattern, FX handling |
| `mapping-rules.md` | CoA, contact, and tax code mapping rules |
| `option1-full.md` | Full conversion workflow (all transactions FY + FY-1) |
| `option2-quick.md` | Quick conversion workflow (opening balances at FYE) |
| `file-types.md` | Supported file formats and detection heuristics |
| `edge-cases.md` | Platform-specific quirks (Sage 300 preambles, Xero rounding) |
| `verification.md` | Trial balance comparison and verification checklist |
| `file-analysis.md` | Excel/CSV structure analysis and smart detection |

### Transaction Recipes Skill (`jaz-recipes`)

| Reference | Content |
|-----------|---------|
| `SKILL.md` | 16 recipes in 4 tiers, building blocks, key principles, calculator index |
| `building-blocks.md` | Capsules, schedulers, manual journals, FA, tracking tags, nano classifiers |
| `prepaid-amortization.md` | Annual insurance/rent paid upfront, monthly scheduler recognition |
| `deferred-revenue.md` | Upfront customer payment, monthly revenue recognition |
| `accrued-expenses.md` | Month-end accrual + reversal cycle using dual schedulers |
| `bank-loan.md` | Loan disbursement, amortization table, monthly installments |
| `ifrs16-lease.md` | ROU asset + lease liability unwinding (IFRS 16) |
| `declining-balance.md` | DDB/150DB with switch-to-SL logic |
| `fixed-deposit.md` | Placement, compound interest accrual, maturity (IFRS 9) |
| `hire-purchase.md` | Like IFRS 16 but depreciate over useful life |
| `asset-disposal.md` | Sale/scrap/write-off with gain/loss (IAS 16) |
| `fx-revaluation.md` | Non-AR/AP FX revaluation with Day 1 reversal (IAS 21) |
| `bad-debt-provision.md` | ECL simplified approach provision matrix (IFRS 9) |
| `employee-accruals.md` | Leave (scheduler) + bonus (manual) accruals (IAS 19) |
| `provisions.md` | PV recognition + monthly discount unwinding (IAS 37) |
| `dividend.md` | Declaration + payment (two manual journals) |
| `intercompany.md` | Mirrored invoices/bills across two entities |
| `capital-wip.md` | CIP accumulation → FA transfer on completion |


### Jobs Skill (`jaz-jobs`)

| Reference | Content |
|-----------|---------|
| `SKILL.md` | 12 accounting jobs + SG tax computation, CLI commands, wizard workflow overview |
| `building-blocks.md` | Shared concepts: accounting periods, lock dates, period verification |
| `month-end-close.md` | 5 phases, ~18 steps — the foundation for all period closes |
| `quarter-end-close.md` | Monthly + quarterly extras (GST/VAT, ECL, bonus accruals) |
| `year-end-close.md` | Quarterly + annual extras (true-ups, dividends, CYE rollover) |
| `bank-recon.md` | Match, categorize, resolve unreconciled items |
| `bank-match.md` | Bank reconciliation matcher — 5-phase cascade algorithm (1:1, N:1, 1:N, N:M) |
| `document-collection.md` | Scan and classify documents from local directories and cloud links (Dropbox, Google Drive, OneDrive) — outputs file paths for agent upload |
| `gst-vat-filing.md` | Tax ledger review, discrepancy check, filing summary |
| `payment-run.md` | Select outstanding bills by due date, process payments |
| `credit-control.md` | AR aging review, overdue chase list, bad debt assessment |
| `supplier-recon.md` | AP vs supplier statement, identify mismatches |
| `audit-prep.md` | Compile reports, schedules, reconciliations for auditor |
| `fa-review.md` | Fixed asset register review, disposal/write-off processing |
| `sg-tax/overview.md` | SG CIT framework: 17% rate, YA concept, Form C-S eligibility |
| `sg-tax/form-cs-fields.md` | 18 Form C-S + 6 C-S Lite fields with IRAS labels |
| `sg-tax/wizard-workflow.md` | Step-by-step AI agent wizard procedure |
| `sg-tax/data-extraction.md` | How to pull P&L, TB, GL, FA from Jaz API for tax |
| `sg-tax/add-backs-guide.md` | Which expenses are non-deductible + GL patterns |
| `sg-tax/capital-allowances-guide.md` | S19, S19A, S19B, S14Q rules per asset category |
| `sg-tax/ifrs16-tax-adjustment.md` | IFRS 16 lease reversal for tax purposes |
| `sg-tax/enhanced-deductions.md` | R&D (250-400%), IP, donations (250% IPC), S14Q |
| `sg-tax/exemptions-and-rebates.md` | SUTE, PTE, CIT rebate schedule by YA |
| `sg-tax/losses-and-carry-forwards.md` | Set-off order, carry-forward rules |

## Architecture

Full OpenAPI specification available at `spec/openapi.yaml` — synced weekly from the API source.

Skills are written once in `src/skills/` and copied to platform-specific discovery paths. Each path is a standard defined by the platform — not a naming choice we made.

```
src/skills/                      Source of truth — all skills live here
├── api/                         117 rules + 7 reference files
├── conversion/                  Conversion domain + 7 reference files
├── transaction-recipes/         16 recipes + 18 reference files
└── jobs/                        12 jobs + 12 job files + 10 sg-tax files
```

**Discovery paths** (identical copies of `src/skills/`, one per platform standard):

| Path | Platform Standard | Used By |
|------|-------------------|---------|
| `.agents/skills/` | [Agent Skills](https://agentskills.io) open standard | Antigravity, Codex, Copilot, Cursor |
| `.claude/skills/` | Claude Code skill discovery | Claude Code |
| `.claude-plugin/` | Claude Code marketplace | Claude Code (plugin install) |
| `gemini-extension.json` | Gemini CLI extension | Gemini CLI |
| `assets/skills/` | npm bundle | `jaz-clio` CLI package |

**CLI source** (`jaz-clio` on npm):

```
src/
├── commands/                    53 command groups (invoices, bills, contacts, calc, jobs, mcp, ...)
├── core/
│   ├── api/                     Jaz REST client (30+ modules, 70+ endpoints)
│   ├── calc/                    13 financial calculators
│   ├── jobs/                    12 job blueprints + paired tools
│   ├── drafts/                  Draft validation, sanitization, merge logic
│   ├── auth/                    Credential management
│   └── intelligence/            Fuzzy matching, date parsing, contact resolution
└── assets/skills/               Bundled skill content for npm package
```

## Troubleshooting

### `command not found: clio`

**Cause:** Node.js is not installed, or npm's global bin directory is not in your `PATH`.

**Fix:**
```bash
# 1. Check if Node.js is installed
node --version    # Should print v18+ — if not, install from https://nodejs.org (LTS)

# 2. Install Clio globally
npm install -g jaz-clio

# 3. If clio still not found, add npm global bin to PATH
npm config get prefix    # e.g. /usr/local or ~/.nvm/versions/node/v22.x.x
export PATH="$(npm config get prefix)/bin:$PATH"   # Add to ~/.bashrc or ~/.zshrc
```

### Auth error / 401 Unauthorized

**Cause:** Missing or invalid API key. Keys expire if regenerated in the Jaz app.

**Fix:**
```bash
clio auth whoami                   # Check current auth status
clio auth add <your-api-key>       # Add or replace key (get from Settings > API in Jaz app)
clio auth list                     # Verify the right org is active
```

If using env vars, ensure `JAZ_API_KEY` is set in the current shell or your MCP config's `env` block.

### MCP not connecting

**Cause:** MCP config path or command is wrong, or the server crashes on startup.

**Fix:**
```bash
# 1. Test the MCP server directly
npx jaz-clio mcp    # Should start without errors (Ctrl+C to stop)

# 2. For Claude Code, verify registration
claude mcp list      # Should show "jaz" in the list

# 3. Re-add if missing
claude mcp add jaz -- npx jaz-clio mcp
```

For Cursor/VS Code/Windsurf, check that your MCP config JSON is valid and includes an explicit API key to pin the org:

```json
{
  "command": "npx",
  "args": ["-y", "jaz-clio", "mcp"],
  "env": {
    "JAZ_API_KEY": "jk-your-api-key"
  }
}
```

> **Tip:** Pin `JAZ_API_KEY` in your MCP config rather than relying on the active profile. MCP servers cache credentials at startup — profile switches via `clio auth switch` won't take effect until the server restarts. For multi-org, use comma-separated keys: `"jk-aaa,jk-bbb"`.

### Skills not loading

**Cause:** Skill files are in the wrong directory, or your AI tool doesn't auto-discover from that path.

**Fix:**
```bash
# Check files are in the correct discovery path
ls .claude/skills/       # Claude Code
ls .agents/skills/       # Codex, Copilot, Cursor, Windsurf

# Re-install with auto-detection
npx jaz-clio init
```

Files must be markdown (`.md`). Each skill folder should contain a `SKILL.md` plus reference files. If you copied manually, ensure the full folder structure was preserved (not just `SKILL.md`).

### `EACCES` permission denied on npm install

**Cause:** npm's global directory requires elevated permissions (common on macOS/Linux without nvm).

**Fix:**
```bash
# Option A: Use nvm (recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
nvm install --lts && npm install -g jaz-clio

# Option B: Fix npm permissions
mkdir -p ~/.npm-global && npm config set prefix ~/.npm-global
export PATH="$HOME/.npm-global/bin:$PATH"    # Add to ~/.bashrc or ~/.zshrc
npm install -g jaz-clio
```

### Stale data after org switch

**Cause:** You switched orgs with `clio auth switch` but your AI tool's MCP server is still using the previous org's credentials (MCP servers cache auth at startup).

**Fix:**
```bash
# 1. Switch org in CLI
clio auth switch <label>
clio auth whoami                # Confirm new org

# 2. Restart MCP server — required for the switch to take effect
# Claude Code: remove and re-add
claude mcp remove jaz && claude mcp add jaz -- npx jaz-clio mcp

# Cursor/VS Code: restart the editor or reload MCP servers from the command palette
```

Alternatively, use **multi-org mode** to avoid restarts entirely — set `JAZ_API_KEY` to comma-separated keys (`jk-aaa,jk-bbb`) and switch orgs in conversation.

## Privacy & Security

Jaz AI runs entirely on your machine. API calls go directly from your machine to the Jaz API over HTTPS. This tool does not include telemetry or collect data. Your API key is stored locally in `~/.config/jaz-clio/credentials.json`.

See our full privacy policy: [jaz.ai/legal](https://jaz.ai/legal)

## Support

- Help center: [help.jaz.ai](https://help.jaz.ai)
- GitHub Issues: [github.com/teamtinvio/jaz-ai/issues](https://github.com/teamtinvio/jaz-ai/issues)
- Email: api-support@jaz.ai

## License

[MIT](LICENSE) - Copyright (c) 2026 Tinvio / Jaz

Clio is a registered trademark owned by Tinvio.
