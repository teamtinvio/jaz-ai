# Clio

<p align="center">
  <a href="https://www.npmjs.com/package/jaz-clio"><img src="https://img.shields.io/npm/v/jaz-clio?style=for-the-badge&logo=npm" alt="npm"></a>
  <a href="https://www.npmjs.com/package/jaz-clio"><img src="https://img.shields.io/npm/dm/jaz-clio?style=for-the-badge&label=downloads" alt="npm downloads"></a>
  <img src="https://img.shields.io/badge/tools-357-blue?style=for-the-badge" alt="357 tools">
  <a href="https://github.com/teamtinvio/jaz-ai/blob/main/LICENSE"><img src="https://img.shields.io/github/license/teamtinvio/jaz-ai?style=for-the-badge&color=green" alt="License"></a>
</p>

<p align="center"><b>Jaz accounting on the command line, and inside any AI agent.</b></p>

357 tools · 66 command groups · 7 skills · 13 calculators · 12 close playbooks · 158 field-tested API rules.

```bash
npm install -g jaz-clio
```

Node.js 18+. Works with [Jaz](https://jaz.ai) and [Juan Accounting](https://juan.ac) on the same API.

## Contents

- [Three ways in](#three-ways-in)
- [CLI](#cli)
- [MCP server](#mcp-server)
- [Skills](#skills)
- [Jaz Kit · run your practice](#jaz-kit--run-your-practice)
- [Auth](#auth)
- [Semantic help-center search](#semantic-help-center-search-optional)
- [Privacy](#privacy) · [Support](#support) · [License](#license)

## Three ways in

| | What it is | Try it |
|---|---|---|
| **CLI** | Every accounting operation as a command | `clio invoices list` |
| **MCP** | A local server for Claude Code, Cursor, Codex, Copilot | `clio mcp` |
| **Skills** | Teach any agent the Jaz API, no server needed | `clio init` |

On top of these, one layer for accountants closing real books across many companies: **[Jaz Kit](#jaz-kit--run-your-practice)**.

## CLI

```bash
clio invoices create --contact "ACME" --json           # draft an invoice, JSON back
clio bank import statement.csv                          # import and auto-reconcile
clio reports pdf profit-loss                            # download the P&L as a PDF
clio calc lease --payment 5000 --term 36 --rate 5      # IFRS 16, offline, instant
clio jobs month-end --period 2026-03                   # step-by-step close playbook
clio magic create --file receipt.pdf                   # AI extracts, drafts the transaction
clio invoices search --query 'status:unpaid AND $500+' # structured per-entity search
```

66 command groups, 16 report types, 13 calculators, 12 job playbooks. Every command takes `--json`. Run `clio --help` for the full list.

## MCP server

357 tools for any AI agent that speaks MCP. Runs locally: no cloud, no ports.

> **No install at all?** Claude.ai, ChatGPT, Cowork, and Microsoft Copilot Studio can use Jaz through the hosted connector. Add `https://mcp.jaz.ai/mcp` as a custom connector and sign in with OAuth, no key. The local setup below is for terminal use, scripting, and editors that run MCP servers as local processes.

**Claude Code**

```bash
claude mcp add jaz -- npx jaz-clio mcp
```

**Cursor · VS Code · Windsurf**

```json
{
  "mcpServers": {
    "jaz": {
      "command": "npx",
      "args": ["-y", "jaz-clio", "mcp"],
      "env": { "JAZ_API_KEY": "jk-your-api-key" }
    }
  }
}
```

Several companies at once: comma-separate the keys, or use a personal access token.

```json
{ "env": { "JAZ_API_KEY": "jk-org1-key,jk-org2-key" } }
```

## Skills

158 API rules from production testing: field-name maps, error-recovery patterns, response-shape quirks, plus 12 job playbooks. Installable into any agent project, no server involved.

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
/jk-setup                 create a company workspace, connect its key
/jk-open acme             load its context, verify the connection
/jk-close 2026-06         run the close, resumable across sessions
/jk-review                approve the drafts waiting on you
/jk-status                every company: what is due, what is pending
/jk-exit                  wrap up and journal the session
```

Also `/jk-keys`, `/jk-policy`, `/jk-teach`, `/jk-save`, `/jk-help`. **`/jaz-*` runs a single workflow; `/jk-*` runs your practice.**

Each company lives under `~/Documents/Jaz Kit/orgs/<company>/`, holding its close config, its policies, and its own API key in a gitignored `.env`. A Jaz key is scoped to one company, so the folder you open is the company you work on: nothing to switch, and no way to post to the wrong books once a folder's key checks out.

Everything is drafted first, every record carries a link into Jaz for you to review, and an interrupted close resumes exactly where it stopped. Multi-company work needs this CLI, which you already have. Full guide in the [repository README](https://github.com/teamtinvio/jaz-ai#jaz-kit--run-your-practice).

## Auth

```bash
clio auth add <api-key>   # from Settings → API keys in Jaz
clio auth whoami          # verify
```

Or set `JAZ_API_KEY` in your environment for scripts and CI. For several companies from the CLI, register each with `clio auth add` and pass `--org <label>` per command, or let Jaz Kit keep one key per company folder for you. Every command takes `--json` for structured output.

## Semantic help-center search (optional)

`search_help_center` runs keyword search over the bundled help-center corpus by default. Set `CLIO_HELP_CENTER_OPENAI_API_KEY` to add semantic search, which matches on intent rather than exact keywords: the CLI embeds only your query through the OpenAI embeddings API (`text-embedding-3-small`, the model the bundled index was built with) and merges both rankings. On an auth failure it warns once and falls back to keyword search. Use a project-scoped key restricted to embedding models with a low monthly cap. CLI only: MCPB installs ship without the embedding index and always use keyword search.

## Privacy

Runs on your machine. Calls go to the Jaz API over HTTPS. No telemetry, no data collection.

## Support

[help.jaz.ai](https://help.jaz.ai) · [GitHub Issues](https://github.com/teamtinvio/jaz-ai/issues) · api-support@jaz.ai

## License

[MIT](LICENSE)
