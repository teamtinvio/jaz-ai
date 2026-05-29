# Clio: Command Line Interface Operator for Jaz AI.

<p align="center">
  <a href="https://www.npmjs.com/package/jaz-clio"><img src="https://img.shields.io/npm/v/jaz-clio?style=for-the-badge&logo=npm" alt="npm"></a>
  <a href="https://www.npmjs.com/package/jaz-clio"><img src="https://img.shields.io/npm/dm/jaz-clio?style=for-the-badge&label=downloads" alt="npm downloads"></a>
  <img src="https://img.shields.io/badge/tools-265-blue?style=for-the-badge" alt="265 Tools">
  <a href="https://github.com/teamtinvio/jaz-ai/blob/main/LICENSE"><img src="https://img.shields.io/github/license/teamtinvio/jaz-ai?style=for-the-badge&color=green" alt="License"></a>
</p>

265 tools. 13 financial calculators. 12 job playbooks. 130 API rules. 16 IFRS recipes.

```bash
npm install -g jaz-clio
```

Requires **Node.js 18+** ([nodejs.org](https://nodejs.org)). Also fully compatible with [Juan Accounting](https://juan.ac).

## Contents

- [Three Ways In](#three-ways-in) — CLI, MCP, Skills
- [CLI](#cli) — 55 command groups
- [MCP Server](#mcp-server) — 288 tools for AI agents
- [Skills](#skills) — Teach any AI the Jaz API
- [Setup](#setup) — Auth, multi-org, automation

## Three Ways In

| | What happens | Try it |
|---|---|---|
| **CLI** | 55 command groups, every accounting operation | `clio invoices list` |
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
clio practice init --firm-name "My Firm"          # Set up a client workspace at ~/Documents/Jaz Practice
clio practice onboard --name "Acme Pte Ltd" --fy-end 12-31 --gst quarterly
clio practice create-engagement acme-pte-ltd --type monthly-close --period 2026-03
```

55 command groups. 16 report types. 13 calculators. 12 job playbooks. New in v5.2.0: practitioner workspace (`clio practice`). Every command supports `--json`. Run `clio --help` for the full list.

---

## MCP Server

288 CLI tools, available to any AI agent that speaks MCP. Runs locally — no cloud, no ports. Includes the v5.2.0 `practice_*` tools (init, onboard_client, list_clients, load_client, create_engagement, load_engagement) so an agent in Claude Desktop or Claude Code can scaffold and load client workspaces conversationally.

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

141 production-tested API rules. Field name mappings. Error recovery patterns. 12 job playbooks. Installable into any AI-aware project.

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

## Privacy

Runs on your machine. Calls go to the Jaz API over HTTPS. No telemetry. No data collection.

## Support

[help.jaz.ai](https://help.jaz.ai) · [GitHub Issues](https://github.com/teamtinvio/jaz-ai/issues) · api-support@jaz.ai

## License

[MIT](LICENSE)
