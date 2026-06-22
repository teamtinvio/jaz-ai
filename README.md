# Jaz AI · Agent stack for the ledger

<p align="center">
  <a href="https://github.com/teamtinvio/jaz-ai/releases"><img src="https://img.shields.io/github/v/release/teamtinvio/jaz-ai?style=for-the-badge&color=blue" alt="GitHub Release"></a>
  <img src="https://img.shields.io/badge/tools-295-blue?style=for-the-badge" alt="295 tools">
  <img src="https://img.shields.io/badge/API_rules-158-green?style=for-the-badge" alt="158 API rules">
  <img src="https://img.shields.io/badge/skills-6-purple?style=for-the-badge" alt="6 skills">
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

The complete agent surface for [Jaz](https://jaz.ai) accounting. 295 tools, 6 skills, 16 IFRS recipes, 13 calculators, 12 close playbooks. Works with any agent: Claude, GPT, Gemini, Copilot, Cursor. Token-lean discovery, one-shot tool selection, structured errors an agent can recover from.

> Also fully compatible with [Juan Accounting](https://juan.ac) (same API surface).

## Contents

- [Install · 30 seconds](#install--30-seconds)
- [What you get](#what-you-get)
- [Three layers](#three-layers)
- [Quick start](#quick-start)
- [Token economics + speed](#token-economics--speed)
- [For AI agents](#for-ai-agents)
- [For accountants](#for-accountants)
- [Reference](#reference)
- [Troubleshooting](#troubleshooting)
- [Privacy & security](#privacy--security)
- [Support](#support)

## Install · 30 seconds

| Your agent | Install |
|------------|---------|
| **Claude.ai · ChatGPT · Cowork** (hosted, no install) | Add a custom connector → `https://mcp.jaz.ai/mcp` → sign in. See [Remote connector](#remote-connector--no-install). |
| **Microsoft 365 Copilot · Copilot Studio** (hosted, no install) | Add an MCP tool → `https://mcp.jaz.ai/mcp` → OAuth sign-in. See [Microsoft 365 Copilot](#microsoft-365-copilot--copilot-studio). |
| **Claude Code** | `/plugin marketplace add teamtinvio/jaz-ai` |
| **Claude Desktop** | Install the `.mcpb` from [latest release](https://github.com/teamtinvio/jaz-ai/releases/latest) |
| **Cursor / Windsurf** | Add the stdio MCP config (below) |
| **VS Code (incl. GitHub Copilot)** | Add the VS Code MCP config (below) to `.vscode/mcp.json` |
| **Gemini CLI** | `gemini extensions install https://github.com/teamtinvio/jaz-ai` |
| **OpenAI Codex CLI / Agents SDK** | Add the stdio MCP config (below) |
| **OpenAI Responses API** | Hosted HTTP MCP only (see [Responses API note](#openai-responses-api)) |
| **npm (CLI)** | `npm install -g jaz-clio && clio auth add <jk-your-api-key>` |

**Stdio MCP config** (Claude Desktop, Cursor, Windsurf, OpenAI Codex CLI / Agents SDK, any host that runs MCP servers as local processes):

```json
{
  "mcpServers": {
    "jaz": {
      "command": "npx",
      "args": ["-y", "jaz-clio@5.20.21", "mcp"],
      "env": { "JAZ_API_KEY": "jk-your-api-key" }
    }
  }
}
```

**VS Code MCP config** (`.vscode/mcp.json`, workspace-scoped, read by VS Code and the GitHub Copilot Chat extension):

```json
{
  "servers": {
    "jaz": {
      "command": "npx",
      "args": ["-y", "jaz-clio@5.20.21", "mcp"],
      "env": { "JAZ_API_KEY": "jk-your-api-key" }
    }
  }
}
```

Pin `jaz-clio@5.20.21` for stability, or `jaz-clio@latest` for auto-updates. **Multi-org**: comma-separated keys, e.g. `"JAZ_API_KEY": "jk-aaa,jk-bbb"`. Personal access tokens (`pat-...`) also work for multi-org.

### Remote connector · no install

Bring Jaz into **Claude** (claude.ai, Desktop, mobile, Cowork) and **ChatGPT** with no install and no API key in any config. Just sign in.

1. In Claude: **Settings → Connectors → Add custom connector** (ChatGPT: **Add a connector**).
2. Enter the URL `https://mcp.jaz.ai/mcp`.
3. Sign in with your Jaz account (email one-time code or passkey) and **Allow**.

It uses OAuth 2.1 + PKCE: the agent receives a scoped, time-limited token tied to your account, never your password. One sign-in reaches **every organization you belong to**; name the org in your request (e.g. *"in Acme Pte Ltd, list unpaid invoices"*), and access to each is checked on every call. Same tool surface as the local server, with honest read-only / write / destructive hints. Bookkeeping only: it records entries and reads data. It moves no money.

### Microsoft 365 Copilot · Copilot Studio

Bring Jaz into Microsoft 365 Copilot through a Copilot Studio agent. Cloud to cloud: no install, no API key in any config.

1. In [Copilot Studio](https://copilotstudio.microsoft.com), open your agent and go to **Tools → Add a tool → New tool → Model Context Protocol**.
2. Enter the server name (Jaz), a short description, and the URL `https://mcp.jaz.ai/mcp`.
3. Authentication: **OAuth 2.0 → Dynamic discovery** → **Create** → **Next**.
4. On the **Add tool** dialog, select **Create a new connection**, sign in with your Jaz account, and **Allow**.
5. Select **Add to agent**, then publish the agent to Microsoft 365 Copilot or Teams as usual.

Same tool surface and per-call organization checks as the [remote connector](#remote-connector--no-install); the sign-in here uses OAuth 2.0 dynamic client registration. If your tenant restricts custom connectors, a Power Platform admin needs to allow this one.

**Prefer a local install on the Microsoft stack?** Copilot Studio is cloud-only and cannot run local MCP servers. Use VS Code with GitHub Copilot Chat instead: the [VS Code MCP config](#install--30-seconds) runs Jaz locally with an API key, and `npx jaz-clio init --platform copilot` installs the skills to `.github/copilot-instructions.md`.

### OpenAI Responses API

The Responses API only accepts **HTTP MCP** (no stdio). Point it at the hosted Jaz connector:

```json
{
  "type": "mcp",
  "server_label": "jaz",
  "server_url": "https://mcp.jaz.ai/mcp",
  "headers": { "Authorization": "Bearer <your-oauth-token>" },
  "require_approval": "never"
}
```

The endpoint is OAuth-gated (no static API key). Obtain a token through the [remote connector](#remote-connector--no-install) sign-in and pass it as a bearer token. To use a plain API key instead, take the OpenAI Codex CLI / Agents SDK stdio path above.

**Just want skills** (no MCP, any agent on the [Agent Skills](https://agentskills.io) standard):

```bash
npx jaz-clio init                  # auto-detects your tool
npx jaz-clio init --platform cursor
npx jaz-clio init --no-rules       # skills only, skip the agent-rules file
npx jaz-clio init --check          # report drift between installed agent-rules version and current
```

Skills install to `.agents/skills/` (Agent Skills standard, used by Cursor, Copilot, Codex, Antigravity, Windsurf, Goose, Roo Code, Junie, Amp, and more) or `.claude/skills/` (Claude Code).

`init` also writes a one-page `jaz-agent-rules.md` block to the path your platform reads on workspace open, so any agent (Claude / GPT / Gemini / Copilot / Cursor) starts every session with the meta-tool discovery flow, the 6 API gotchas, and the recipe-engine carve-outs.

The block is wrapped in version-stamped markers (`<!-- BEGIN jaz-agent-rules vX.Y.Z -->` / `<!-- END jaz-agent-rules -->`), so re-running `init` updates only the Jaz block; your own rules above and below stay untouched. Run `clio init --check` to report drift between your installed version and the current package version (exit 1 = drift, exit 0 = current).

| Platform | Rules file path |
|---|---|
| Claude Code | `CLAUDE.md` |
| Codex / Antigravity / Goose | `AGENTS.md` |
| GitHub Copilot | `.github/copilot-instructions.md` |
| Cursor | `.cursor/rules/jaz.mdc` (auto-loaded via `alwaysApply: true`) |
| Windsurf | `.windsurf/rules/jaz.md` |
| Gemini CLI | `GEMINI.md` |

## What you get

- **295 tools** covering every Jaz endpoint. Each tool description disambiguates against similar tools, lists enum values inline, and flags idempotency. The LLM picks right on the first call.
- **6 skills** with the production-grade rules and playbooks any agent needs:

| Skill | What it teaches an agent |
|-------|--------------------------|
| **jaz-api** | 158 API rules, every endpoint, error catalog, field aliases, response shapes |
| **jaz-cli** | The `clio` command surface, auth precedence, output formats, pagination |
| **jaz-conversion** | Xero / QuickBooks / Sage / MYOB / Excel migration, CoA mapping, FX, clearing accounts, TB verification |
| **jaz-jobs** | 12 close playbooks (month-end / quarter-end / year-end / bank-recon / GST-VAT / payment-run / credit-control / supplier-recon / audit-prep / FA-review / statutory-filing) + Singapore Form C-S |
| **jaz-recipes** | 16 IFRS recipes (loans, IFRS 16 leases, depreciation, FX reval, ECL, IAS 37 provisions, asset disposal, etc.) + 13 calculators |
| **jaz-pseudo-sql** | Read-only SQL over the curated reporting schema: ad-hoc questions, joins and aggregates, sync preview or async CSV export |

- **3 meta-tools** (`search_tools`, `describe_tools`, `execute_tool`) for deferred discovery so the full catalog never has to load into context.
- **Help center mirror** at `help-center-mirror/` synced weekly from Intercom.
- **Structured-search DSL** for natural-feeling queries (`status:unpaid amount:>500 contact:Acme`).

## Three layers

The stack is one binary plus markdown skills, exposed through three layers that compose. The default agent setup is **Skills + MCP**. The CLI is the same binary as the MCP server with a different transport flag.

| Layer | What it is | Use it alone when |
|-------|------------|-------------------|
| **Skills** | Domain knowledge as markdown (158 API rules, 16 recipes, 12 jobs, conversion playbooks). The agent reads these at session start. | Your AI tool reads markdown but cannot call binaries (e.g., a Custom GPT with no actions). |
| **CLI** (`jaz-clio`) | A `clio` binary: 58 command groups + 13 offline calculators + 12 offline blueprints + live API access. Humans run it; agents shell out to it. | You're scripting CI / running offline calculators / a human is at the terminal. |
| **MCP server** (`clio mcp`) | The same binary in MCP mode: 295 tools as agent-callable functions with structured envelopes. | This is the default for any agent (Claude / GPT / Gemini / Copilot / Cursor) that takes accounting actions. |

Skills layer on top of either. Most installs (Claude Code plugin, Claude Desktop MCPB, Cursor + MCP, Gemini extension) load Skills + MCP together. The MCP server runs **locally** (stdio, via the CLI binary) or **hosted** (the [remote connector](#remote-connector--no-install) at `mcp.jaz.ai`, no install). Same tools either way.

## Quick start

Once installed, skills load automatically when an agent works with Jaz. Describe what you need:

```
Close the books for Acme for January. Bank-recon DBS Current first.
Then file GST for Q1.
```

Or call the CLI directly:

```bash
clio invoices list --json
clio calc loan --principal 100000 --rate 6 --term 60 --json
clio jobs month-end --period 2025-01 --json
```

Or via MCP from any agent:

```
search_tools("anomalous bills")
  → download_export at rank 1
execute_tool("download_export", { exportType: "analysis-anomalous-bills" })
  → { fileName, fileUrl }
```

## Token economics + speed

Built so any LLM sees the right tool fast and calls it once.

| What | How |
|------|-----|
| **MCP delivery** | 3 meta-tools (~600 tokens) instead of all 295 tools (~78KB). LLM searches into the catalog only when needed. |
| **OpenAI Responses API** | Native deferred tool_search with namespace bundles. ~78% token reduction over a static tool list. |
| **Anthropic delivery** | Tool list cached via prompt-cache breakpoints (5-min TTL). System blocks cached. ~5KB/request savings after v5.4.4 cleanup. |
| **Discovery ranker** | In-memory, no network round-trip. Scans tool name + description + searchHint + namespace. |
| **Disambiguation** | Every tricky pair (`download_export` vs `export_records`, `view_auto_reconciliation` vs `quick_reconcile`, `validate_drafts` vs per-entity validators) has explicit "USE THIS, not X" preambles. Saves the 1-3 wrong-tool turns. |
| **Median tool call** | Subsecond for read tools; bounded by the Jaz API + network. |
| **Errors are structured** | 422 responses carry field-level details so the LLM can self-correct without human input. |

## For AI agents

- **Skills load automatically** from `.claude/skills/`, `.agents/skills/`, the Claude Code marketplace, the Gemini CLI extension, or the Claude Desktop MCPB.
- **Discovery is one-shot.** 68 canonical-query lock-in tests guarantee the right tool at rank 1 for the queries that matter.
- **Disambiguation is explicit.** Tools that look similar carry "USE THIS, not X" preambles. No more guessing.
- **Errors are structured.** Server validation failures return field-level details so the agent can self-correct.
- **Multi-org is native.** Comma-separated keys (`jk-aaa,jk-bbb`) or PATs unlock cross-org tools (`list_organizations`, per-call `org_id`).
- **CONTEXT.md** captures runtime rules-of-engagement (bootstrap with `clio context --json`, search before create, mutate as draft first, never echo API keys).

## For accountants

Run period work conversationally. Describe it to any agent:

> Close March for Acme. Bank-recon DBS Current first.
> File GST for Q1.

13 calculators (`clio calc loan / depreciation / lease / ecl / fx-reval / provision / fixed-deposit / asset-disposal / prepaid-expense / deferred-revenue / accrued-expense / leave-accrual / dividend`), 12 job blueprints (`clio jobs month-end / quarter-end / year-end / bank-recon / document-collection / gst-vat / payment-run / credit-control / supplier-recon / audit-prep / fa-review / statutory-filing`), all with `--json` for structured blueprint output.

## Reference

- **[CONTEXT.md](CONTEXT.md)** · runtime rules-of-engagement for agents using the stack
- **[CHANGELOG.md](CHANGELOG.md)** · release notes
- **[Skills source](src/skills/)** · all 6 skills (jaz-api / jaz-cli / jaz-conversion / jaz-jobs / jaz-recipes / jaz-pseudo-sql)
- **[OpenAPI spec](spec/openapi.yaml)** · full HTTP surface, synced weekly
- **[README-cli.md](README-cli.md)** · npm-package README, full CLI command catalog
- **[help.jaz.ai](https://help.jaz.ai)** · Jaz product help center
- **CLI surface**: 58 command groups across the `clio` binary

<details>
<summary><strong>What's inside · skill file catalog</strong></summary>

### jaz-api

| Reference | Content |
|-----------|---------|
| `SKILL.md` | 158 API rules: auth, IDs, dates, FX, payments, field aliases, response shapes |
| `endpoints.md` | Request/response examples for every core endpoint |
| `errors.md` | Error catalog with root causes and fixes |
| `field-map.md` | Intuitive name → actual field name mapping |
| `search-reference.md` | Filter fields, sort fields, operators for 28 search endpoints |
| `full-api-surface.md` | Complete endpoint catalog, enums, limits |
| `dependencies.md` | Resource creation order (currencies → CoA → transactions) |
| `feature-glossary.md` | Business context per feature |

### jaz-recipes (16 IFRS recipes + 13 calculators)

| Reference | Content |
|-----------|---------|
| `SKILL.md` | 16 recipes in 4 tiers, building blocks, calculator index |
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

### jaz-jobs (12 close playbooks + Singapore Form C-S)

| Reference | Content |
|-----------|---------|
| `SKILL.md` | 12 jobs + SG tax computation, CLI commands, wizard workflow |
| `building-blocks.md` | Shared concepts: accounting periods, lock dates, period verification |
| `month-end-close.md` | 5 phases, ~18 steps. Foundation for all period closes. |
| `quarter-end-close.md` | Monthly + quarterly extras (GST/VAT, ECL, bonus accruals) |
| `year-end-close.md` | Quarterly + annual extras (true-ups, dividends, CYE rollover) |
| `bank-recon.md` | Match, categorize, resolve unreconciled items |
| `bank-match.md` | 5-phase cascade matcher (1:1, N:1, 1:N, N:M) |
| `document-collection.md` | Local + cloud (Dropbox / Drive / OneDrive) doc capture |
| `gst-vat-filing.md` | Tax ledger review, discrepancy check, filing summary |
| `payment-run.md` | Select bills by due date, process payments |
| `credit-control.md` | AR aging review, overdue chase list, bad debt |
| `supplier-recon.md` | AP vs supplier statement reconciliation |
| `audit-prep.md` | Compile reports, schedules, reconciliations for auditor |
| `fa-review.md` | Fixed asset register review, disposal/write-off |
| `sg-tax/*.md` | 10 files: SG CIT framework, Form C-S fields, wizard, data extraction, add-backs, capital allowances, IFRS 16 tax adj, enhanced deductions, exemptions, loss carry-forward |

### jaz-conversion

| Reference | Content |
|-----------|---------|
| `SKILL.md` | Conversion domain knowledge, clearing account pattern, FX handling |
| `mapping-rules.md` | CoA, contact, and tax code mapping rules |
| `option1-full.md` | Full conversion (all transactions FY + FY-1) |
| `option2-quick.md` | Quick conversion (opening balances at FYE) |
| `file-types.md` | Supported file formats and detection heuristics |
| `edge-cases.md` | Platform-specific quirks (Sage 300, Xero rounding) |
| `verification.md` | Trial balance comparison and verification checklist |
| `file-analysis.md` | Excel/CSV structure analysis and smart detection |

</details>

## Troubleshooting

### `command not found: clio`

Node.js is not installed, or npm's global bin directory is not on `PATH`.

```bash
node --version    # Need v18+. If missing, install LTS from https://nodejs.org
npm install -g jaz-clio
npm config get prefix    # e.g. /usr/local or ~/.nvm/versions/node/v22.x.x
export PATH="$(npm config get prefix)/bin:$PATH"   # Add to ~/.bashrc or ~/.zshrc
```

### Auth error / 401 Unauthorized

Missing or invalid API key. Keys expire if regenerated in the Jaz app.

```bash
clio auth whoami
clio auth add <your-api-key>       # Get from Settings > API in Jaz
clio auth list                     # Confirm the right org is active
```

If you use env vars, set `JAZ_API_KEY` in the current shell or your MCP config's `env` block.

### MCP not connecting

The config path is wrong, the command is wrong, or the server crashes on startup.

```bash
npx jaz-clio mcp                   # Smoke-test the server (Ctrl+C to stop)
claude mcp list                    # Confirm Claude Code sees "jaz"
claude mcp add jaz -- npx jaz-clio mcp
```

For Cursor / VS Code / Windsurf, validate the JSON and pin the API key:

```json
{
  "command": "npx",
  "args": ["-y", "jaz-clio@5.20.21", "mcp"],
  "env": { "JAZ_API_KEY": "jk-your-api-key" }
}
```

> Pin `JAZ_API_KEY` in MCP config rather than relying on the active CLI profile. MCP servers cache credentials at startup so `clio auth switch` won't take effect until restart. For multi-org, use comma-separated keys.

### Skills not loading

Files are in the wrong path, or your tool doesn't auto-discover from there.

```bash
ls .claude/skills/                 # Claude Code
ls .agents/skills/                 # Agent Skills standard (Cursor, Copilot, etc.)
npx jaz-clio init                  # Re-install with auto-detection
```

Each skill folder must contain `SKILL.md` plus its reference files. Manual copies often miss subdirectories.

### `EACCES` permission denied on npm install

npm's global directory needs elevated permissions on macOS/Linux without nvm.

```bash
# Option A: nvm (recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
nvm install --lts && npm install -g jaz-clio

# Option B: fix npm permissions
mkdir -p ~/.npm-global && npm config set prefix ~/.npm-global
export PATH="$HOME/.npm-global/bin:$PATH"   # Add to ~/.bashrc or ~/.zshrc
npm install -g jaz-clio
```

### Stale data after org switch

You ran `clio auth switch` but the MCP server still uses the previous org (it cached auth at startup).

```bash
# In Claude Code: remove and re-add
claude mcp remove jaz && claude mcp add jaz -- npx jaz-clio mcp

# In Cursor / VS Code: restart the editor or reload MCP servers
```

Or use multi-org mode and skip restarts: comma-separated keys (`jk-aaa,jk-bbb`) and switch orgs in conversation.

## Privacy & security

Runs entirely on your machine. API calls go directly from your machine to the Jaz API over HTTPS. No telemetry. The API key lives locally in `~/.config/jaz-clio/credentials.json`.

The **hosted remote connector** (`mcp.jaz.ai`) is different by design: you connect over OAuth 2.1 + PKCE (no API key stored anywhere, never your password), requests run server-side over HTTPS, and the connector reaches the organizations your Jaz account belongs to; access is checked on every call.

Full policy: [jaz.ai/legal](https://jaz.ai/legal). Vulnerability disclosure: [SECURITY.md](SECURITY.md).

## Support

- **Help center**: [help.jaz.ai](https://help.jaz.ai)
- **Issues**: [github.com/teamtinvio/jaz-ai/issues](https://github.com/teamtinvio/jaz-ai/issues)
- **Email**: api-support@jaz.ai

## License

[MIT](LICENSE) · Copyright (c) 2026 Jaz · Clio is a registered trademark.
