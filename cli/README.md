# Clio: Command Line Interface Operator for Jaz AI.

<p align="center">
  <a href="https://www.npmjs.com/package/jaz-clio"><img src="https://img.shields.io/npm/v/jaz-clio?style=for-the-badge&logo=npm" alt="npm"></a>
  <a href="https://www.npmjs.com/package/jaz-clio"><img src="https://img.shields.io/npm/dm/jaz-clio?style=for-the-badge&label=downloads" alt="npm downloads"></a>
  <img src="https://img.shields.io/badge/tools-247-blue?style=for-the-badge" alt="247 Tools">
  <a href="https://github.com/teamtinvio/jaz-ai/blob/main/LICENSE"><img src="https://img.shields.io/github/license/teamtinvio/jaz-ai?style=for-the-badge&color=green" alt="License"></a>
</p>

247 tools. 13 financial calculators. 12 job playbooks. 117 API rules. 16 IFRS recipes.

```bash
npm install -g jaz-clio
```

Requires **Node.js 18+** ([nodejs.org](https://nodejs.org)). Also fully compatible with [Juan Accounting](https://juan.ac).

## Contents

- [Three Ways In](#three-ways-in) — CLI, MCP, Skills
- [CLI](#cli) — 53 command groups
- [MCP Server](#mcp-server) — 247 tools for AI agents
- [Skills](#skills) — Teach any AI the Jaz API
- [Setup](#setup) — Auth, multi-org, automation

## Three Ways In

| | What happens | Try it |
|---|---|---|
| **CLI** | 53 command groups, every accounting operation | `clio invoices list` |
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
clio search "overdue"                             # Find it across all entities
```

53 command groups. 16 report types. 13 calculators. 12 job playbooks. Every command supports `--json`. Run `clio --help` for the full list.

---

## MCP Server

247 CLI tools, available to any AI agent that speaks MCP. Runs locally — no cloud, no ports.

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

**Multi-org** — comma-separated keys or a personal access token:
```json
{ "env": { "JAZ_API_KEY": "jk-org1-key,jk-org2-key" } }
```

---

## Skills

117 production-tested API rules. Field name mappings. Error recovery patterns. 12 job playbooks. Installable into any AI-aware project.

```bash
clio init
```

Auto-detects the AI tool (Claude Code, Codex, Copilot, Cursor, Antigravity) and installs the right skill files. The skills teach the AI how to call the Jaz API correctly — which fields to use, what to avoid, how to handle edge cases.

---

## Setup

```bash
clio auth add <api-key>      # Get key from Settings > API in Jaz
clio auth whoami              # Verify
```

**Multiple orgs:** `clio auth add` each key, then `clio auth switch <label>` or `--org <label>` per command.

**Automation:** Every CLI command supports `--json` for structured output. Set `JAZ_API_KEY` as an env var for scripts and CI pipelines.

## Privacy

Runs on your machine. Calls go to the Jaz API over HTTPS. No telemetry. No data collection.

## Support

[help.jaz.ai](https://help.jaz.ai) · [GitHub Issues](https://github.com/teamtinvio/jaz-ai/issues) · api-support@jaz.ai

## License

[MIT](LICENSE)
