# Clio

<p align="center">
  <a href="https://www.npmjs.com/package/jaz-clio"><img src="https://img.shields.io/npm/v/jaz-clio?style=for-the-badge&logo=npm" alt="npm"></a>
  <a href="https://www.npmjs.com/package/jaz-clio"><img src="https://img.shields.io/npm/dm/jaz-clio?style=for-the-badge&label=downloads" alt="npm downloads"></a>
  <img src="https://img.shields.io/badge/tools-386-blue?style=for-the-badge" alt="386 tools">
  <a href="https://github.com/teamtinvio/jaz-ai/blob/main/LICENSE"><img src="https://img.shields.io/github/license/teamtinvio/jaz-ai?style=for-the-badge&color=green" alt="License"></a>
</p>

<p align="center"><b>Jaz accounting on the command line, and inside any AI agent.</b></p>

386 tools · 76 command groups · 7 skills · 13 calculators · 12 close playbooks · 160 field-tested API rules.

```bash
npm install -g jaz-clio
```

Node.js 18+. Works with [Jaz](https://jaz.ai) and [Juan Accounting](https://juan.ac) on the same API.

## Contents

- [Three ways in](#three-ways-in)
- [Auth](#auth)
- [CLI](#cli)
- [MCP server](#mcp-server)
- [Skills](#skills)
- [Jaz Kit · run your practice](#jaz-kit--run-your-practice)
- [Semantic help-center search](#semantic-help-center-search-optional)
- [Privacy](#privacy) · [Support](#support) · [License](#license)

## Three ways in

| | What it is | Try it |
|---|---|---|
| **CLI** | Every accounting operation as a command | `clio invoices list` |
| **MCP** | A local server for Claude Code, Cursor, Codex, Copilot | `clio mcp` |
| **Skills** | Teach any agent the Jaz API, no server needed | `clio init` |

On top of these, one layer for accountants closing real books across many companies: **[Jaz Kit](#jaz-kit--run-your-practice)**.

## Auth

```bash
clio auth login           # sign in to Jaz in your browser (OAuth, the default)
clio auth whoami          # verify
```

`clio auth login` opens Jaz sign-in. The CLI and local MCP share the session and refresh its tokens automatically. Add `--no-browser` to open the printed link yourself on the same computer. Agents can use `--json`: the sign-in link goes to stderr, and stdout carries only the result and the organization choices.

Use `clio auth organizations --json` to list accessible organizations, `clio auth select <resourceId>` to select one, and `--org oauth:<resourceId>` on every organization-scoped command to pin it. `clio auth logout` removes the local session and keeps any API-key profiles; revoke the grant in Jaz to remove remote access.

API-key profiles, `--api-key`, `JAZ_API_KEY`, and PATs remain supported. Use `--org oauth:<resourceId>` for OAuth or `--org <label>` for a saved key profile (`clio auth add <key>`); either overrides an inherited `JAZ_API_KEY`. Without `--org`, the environment key still takes precedence. Do not combine `--api-key` with `--org`. Do not share OAuth storage or commit it to a workspace. Every command takes `--json` for structured output.

## CLI

```bash
clio invoices create --contact "ACME" --json           # draft an invoice, JSON back
clio bank import --file statement.csv --account <id>    # import and auto-reconcile
clio exports download --type profit-and-loss --format PDF  # download the P&L as a PDF
clio calc lease --payment 5000 --term 36 --rate 5      # IFRS 16, offline, instant
clio jobs month-end --period 2026-03                   # step-by-step close playbook
clio magic create --file receipt.pdf                   # AI extracts, drafts the transaction
clio invoices search --query 'status:unpaid AND $500+' # structured per-entity search
clio ledger-find-fix preview --level TRANSACTIONS --input recode.json  # find & fix (recode) across record types
clio approvals approve <resourceId> --entity invoices  # approve a document waiting on you
clio sql preview "SELECT invoice_number, balance FROM invoices WHERE balance > 0 LIMIT 10"  # read-only pseudo-SQL
clio report-templates update "Board P&L" --set colorTheme=calm  # customize a report layout
clio exports download --type profit-and-loss --template "Board P&L" --format PDF --start-date 2026-01-01 --end-date 2026-06-30
clio modules list                                      # which features are switched on
clio navigate reports.profit-and-loss                  # deep link into the Jaz dashboard (offline)
```

76 command groups, 17 report types, 13 calculators, 12 job playbooks. Every command takes `--json`. Run `clio --help` for the full list.

Command groups by area:

- **Sales and purchases**: `invoices`, `bills`, `customer-credit-notes`, `supplier-credit-notes`, `sale-orders`, `purchase-orders`, `payments`, `unapplied-payments`, `approvals`, `drafts`, `schedulers`, `subscriptions`
- **Ledger and banking**: `journals`, `cash-in`, `cash-out`, `cash-transfer`, `cashflow`, `bank`, `bank-rules`, `reconciliations` (`recon`), `ledger-find-fix`, `quick-fix`, `fixed-assets` (`fa`)
- **Master data**: `accounts`, `contacts`, `contact-groups`, `items`, `purchase-items`, `catalogs`, `inventory` (`inv`), `tags`, `custom-fields`, `nano-classifiers`, `tax-profiles`, `currencies`, `currency-rates`, `capsules`, `capsule-recipes`
- **Claims**: `claims`, `claim-types`, `claim-profiles`, `posting-rules`, `employees`
- **Reports and data**: `reports`, `exports`, `export-records`, `report-templates`, `pseudo-sql` (`sql`), `filing-submissions`, `background-jobs`
- **Organization**: `org`, `org-users`, `references`, `modules` (`features`), `bookmarks`, `attachments`, `magic`, `jots`, `navigate` (`nav`), `help-center` (`hc`)
- **Offline**: `calc`, `capsule-transaction` (`ct`), `jobs`
- **Setup and tooling**: `auth`, `init`, `update`, `versions`, `version`, `health`, `completion`, `context`, `schema`, `resolve`, `mcp`, `mcp-call`, `serve`

### Foreign currency

Rates read **base→source**: `1` unit of your organization's base currency `= N` units of the
foreign one. Whether that matches how the rate was quoted to you depends on which side your base
currency is on: an SGD-base org quoting "1 USD = 1.35 SGD" has it backwards and needs `0.74`, while
a USD-base org quoting "1 USD = 56.5 PHP" already has it right and sends `56.5` unchanged.

You do not have to flip it. Pass the number as you have it and say which way it reads:

```bash
# "1 USD = 1.35 SGD", from a bank statement, on an SGD-base org
clio invoices create --currency USD --exchange-rate 1.35 \
  --rate-direction SOURCE_TO_FUNCTIONAL ...

# 0.74, straight out of clio currency-rates list
clio invoices create --currency USD --exchange-rate 0.74 ...
```

Omit `--exchange-rate` entirely to use the organization's stored rate, or the platform daily rate
when none is set. `clio calc fx-reval` requires `--rate-direction` explicitly; that calculator
takes rates in the opposite direction to the API, and guessing would silently change a number
that ends up in a journal.

## MCP server

386 tools for any AI agent that speaks MCP. Runs locally: no cloud, no ports.

> **No install at all?** Claude.ai, ChatGPT, Cowork, and Microsoft Copilot Studio can use Jaz through the hosted connector. Add `https://mcp.jaz.ai/mcp` as a custom connector and sign in with OAuth, no key. The local setup below is for terminal use, scripting, and editors that run MCP servers as local processes.

Run `clio auth login` once on this computer before enabling local MCP, then pin the organization with `--org` (`clio auth organizations` lists the IDs).

**Claude Code**

```bash
claude mcp add jaz -- npx -y jaz-clio@latest mcp --org oauth:<resourceId>
```

**Cursor · VS Code · Windsurf**

```json
{
  "mcpServers": {
    "jaz": {
      "command": "npx",
      "args": ["-y", "jaz-clio@latest", "mcp", "--org", "oauth:<resourceId>"]
    }
  }
}
```

OAuth can reach the organizations granted at sign-in; `--org` pins one, and without it name the organization on each call. Optional key-based access also supports comma-separated keys or a personal access token.

```json
{ "env": { "JAZ_API_KEY": "jk-org1-key,jk-org2-key" } }
```

## Skills

160 API rules from production testing: field-name maps, error-recovery patterns, response-shape quirks, plus 12 job playbooks. Installable into any agent project, no server involved.

```bash
clio init                     # auto-detect the agent, install skills + agent-rules
clio init --platform cursor   # explicit platform
clio init --no-rules          # skills only, skip the agent-rules file
```

`init` detects the agent (Claude Code, Codex, Copilot, Cursor, Antigravity, Gemini, Windsurf, Goose) and installs the right skill files. It also writes a one-page `jaz-agent-rules.md` to the file your platform reads on open (`CLAUDE.md`, `AGENTS.md`, `.github/copilot-instructions.md`, `.cursor/rules/jaz.mdc`, `.windsurf/rules/jaz.md`, or `GEMINI.md`), so every session starts with the tool-discovery flow and the API gotchas already loaded.

## Jaz Kit · run your practice

The workspace layer for closing real books, whether that is one company or fifty.

A close is not one conversation. Month-end runs many steps over several days, and an accountant serving eight clients runs it eight times, with eight different sets of bank accounts, materiality thresholds, and recurring entries. Jaz Kit gives each company a folder that remembers all of it, so no session re-asks what it should already know.

```
/jk-setup                 create a company workspace, connect it with OAuth
/jk-open acme             load its context, verify the connection
/jk-close 2026-06         run the close, resumable across sessions
/jk-review                approve the drafts waiting on you
/jk-status                every company: what is due, what is pending
/jk-exit                  wrap up and journal the session
```

Also `/jk-keys`, `/jk-policy`, `/jk-teach`, `/jk-save`, `/jk-help`. **`/jaz-*` runs a single workflow; `/jk-*` runs your practice.**

Each company lives under `~/Documents/Jaz Kit/orgs/<company>/`, holding its close config, policies, and organization ID. OAuth credentials stay outside the kit. Pin that ID on every CLI or MCP call and verify it before working. Existing per-company API keys remain optional.

Everything is drafted first, every record carries a link into Jaz for you to review, and an interrupted close resumes exactly where it stopped. Multi-company work needs this CLI, which you already have. Full guide in the [repository README](https://github.com/teamtinvio/jaz-ai#jaz-kit--run-your-practice).

## Semantic help-center search (optional)

`search_help_center` runs keyword search over the bundled help-center corpus by default. Set `CLIO_HELP_CENTER_OPENAI_API_KEY` to add semantic search, which matches on intent rather than exact keywords: the CLI embeds only your query through the OpenAI embeddings API (`text-embedding-3-small`, the model the bundled index was built with) and merges both rankings. On an auth failure it warns once and falls back to keyword search. Use a project-scoped key restricted to embedding models with a low monthly cap. CLI only: MCPB installs ship without the embedding index and always use keyword search.

## Privacy

Runs on your machine. Calls go to the Jaz API over HTTPS. No telemetry, no data collection.

## Support

[help.jaz.ai](https://help.jaz.ai) · build.with@jaz.ai

## License

[MIT](LICENSE)
