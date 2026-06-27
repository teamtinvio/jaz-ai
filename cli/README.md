# Clio: Command Line Interface Operator for Jaz AI.

<p align="center">
  <a href="https://www.npmjs.com/package/jaz-clio"><img src="https://img.shields.io/npm/v/jaz-clio?style=for-the-badge&logo=npm" alt="npm"></a>
  <a href="https://www.npmjs.com/package/jaz-clio"><img src="https://img.shields.io/npm/dm/jaz-clio?style=for-the-badge&label=downloads" alt="npm downloads"></a>
  <img src="https://img.shields.io/badge/tools-340-blue?style=for-the-badge" alt="340 tools">
  <a href="https://github.com/teamtinvio/jaz-ai/blob/main/LICENSE"><img src="https://img.shields.io/github/license/teamtinvio/jaz-ai?style=for-the-badge&color=green" alt="License"></a>
</p>

340 tools. 64 command groups. 13 calculators. 12 job playbooks. 158 API rules. 16 IFRS recipes.

```bash
npm install -g jaz-clio
```

Requires **Node.js 18+** ([nodejs.org](https://nodejs.org)). Also fully compatible with [Juan Accounting](https://juan.ac).

## Contents

- [Three Ways In](#three-ways-in) · CLI, MCP, Skills
- [CLI](#cli) · 64 command groups
- [MCP Server](#mcp-server) · 340 tools for AI agents
- [Skills](#skills) · Teach any AI the Jaz API
- [Setup](#setup) · Auth, multi-org, automation
- [Semantic help-center search](#help-center-semantic-search-optional) · Optional OpenAI-backed retrieval

## Three Ways In

| | What happens | Try it |
|---|---|---|
| **CLI** | Every accounting operation as a command | `clio invoices list` |
| **MCP** | Plug into Claude Code, Cursor, Codex, Copilot | `clio mcp` |
| **Skills** | Teach any AI tool the Jaz API | `clio init` |

---

## CLI

```bash
clio invoices create --contact "ACME" --json     # Create draft, get JSON back
clio bank import statement.csv                    # Import and auto-reconcile
clio reports pdf profit-loss                       # Download P&L as PDF
clio calc lease --payment 5000 --term 36 --rate 5 # IFRS 16 (offline, instant)
clio jobs month-end --period 2026-03              # Step-by-step close playbook
clio magic create --file receipt.pdf              # AI extracts → draft transaction
clio invoices search --query 'status:unpaid AND $500+'  # Structured per-entity search
clio invoices search --query 'status:unpaid' --view lean # Compact summary rows (id + key fields), then drill in with get
```

64 command groups. 16 report types. 13 calculators. 12 job playbooks. Every command supports `--json`. Run `clio --help` for the full list.

---

## MCP Server

340 tools, available to any AI agent that speaks MCP. Runs locally: no cloud, no ports.

> **No install at all?** Claude.ai, ChatGPT, Cowork, and Microsoft Copilot Studio can use Jaz via the **hosted connector**: add `https://mcp.jaz.ai/mcp` as a custom connector (Claude/ChatGPT) or MCP tool (Copilot Studio) and sign in (OAuth, no key). The local setup below is for terminal use, scripting, and editors that run MCP servers as local processes.

**Claude Code:**
```bash
claude mcp add jaz -- npx jaz-clio mcp
```

**Cursor / VS Code / Windsurf:**
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

**Multi-org**: comma-separated keys or a personal access token:
```json
{ "env": { "JAZ_API_KEY": "jk-org1-key,jk-org2-key" } }
```

---

## Skills

158 API rules from production testing. Field-name maps. Error-recovery patterns. 12 job playbooks. Installable into any AI-aware project.

```bash
clio init                            # auto-detect tool + install skills + agent-rules
clio init --platform cursor          # explicit platform
clio init --no-rules                 # skills only, skip the agent-rules file
```

Auto-detects the AI tool (Claude Code, Codex, Copilot, Cursor, Antigravity, Gemini, Windsurf, Goose) and installs the right skill files. `init` also writes a one-page `jaz-agent-rules.md` to the path your platform reads on workspace open (`CLAUDE.md` / `AGENTS.md` / `.github/copilot-instructions.md` / `.cursor/rules/jaz.mdc` / `.windsurf/rules/jaz.md` / `GEMINI.md`) so any agent starts every session with the meta-tool flow, the 6 API gotchas, and the recipe-engine carve-outs.

---

## Setup

```bash
clio auth add <api-key>      # Get key from Settings > API in Jaz
clio auth whoami              # Verify
```

**Multiple orgs:** `clio auth add` each key, then `clio auth switch <label>` or `--org <label>` per command.

**Automation:** Every CLI command supports `--json` for structured output. Set `JAZ_API_KEY` as an env var for scripts and CI pipelines.

## Help-center semantic search (optional)

`search_help_center` uses built-in BM25 lexical search over the bundled help-center corpus. Set `CLIO_HELP_CENTER_OPENAI_API_KEY` to add semantic retrieval: the CLI embeds only your query via the OpenAI embeddings API (`text-embedding-3-small`, the model the bundled index was built with) and merges both rankings. On auth failure it warns once and falls back to BM25. Use a project-scoped key restricted to embedding models with a low monthly cap. CLI-only: MCPB installs ship without the embedding index and always use BM25.

## Privacy

Runs on your machine. Calls go to the Jaz API over HTTPS. No telemetry. No data collection.

## Support

[help.jaz.ai](https://help.jaz.ai) · [GitHub Issues](https://github.com/teamtinvio/jaz-ai/issues) · api-support@jaz.ai

## License

[MIT](LICENSE)
