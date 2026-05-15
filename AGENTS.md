# Jaz AI · Agent Skills

Agent skills for the [Jaz](https://jaz.ai) accounting platform. Works with [Claude Code](https://claude.com/claude-code), [Google Antigravity](https://antigravity.google), [OpenAI Codex](https://openai.com/codex), [GitHub Copilot](https://github.com/features/copilot), [Cursor](https://cursor.com), and any tool that supports the [Agent Skills](https://agentskills.io) open standard.

> Also fully compatible with [Juan Accounting](https://juan.ac).

## Skills

| Skill | What it teaches an agent |
|-------|--------------------------|
| **jaz-api** | 141 production rules, every endpoint, error catalog, field mapping. Agents write correct Jaz API code on the first call. |
| **jaz-cli** | The `clio` command surface, auth precedence, output formats, pagination |
| **jaz-conversion** | Xero, QuickBooks, Sage, MYOB, Excel migration: CoA mapping, FX, clearing accounts, trial balance verification |
| **jaz-jobs** | 12 close playbooks (month / quarter / year-end, bank-recon, GST/VAT, payment-run, credit-control, supplier-recon, audit-prep, FA-review, statutory-filing) + Singapore Form C-S |
| **jaz-recipes** | 16 IFRS recipes (loans, IFRS 16 leases, depreciation, FX reval, ECL, IAS 37 provisions, asset disposal) + 13 calculators |
| **jaz-practice** | Multi-client practitioner workspace, engagement scaffolding, per-client config |

## Install

```bash
# Auto-detect your AI tool and install all 6 skills
npx jaz-clio init

# Or one skill at a time
npx jaz-clio init --skill jaz-api
npx jaz-clio init --skill jaz-conversion
```

For Claude Code, prefer the marketplace plugin (skills + MCP server in one install):

```
/plugin marketplace add teamtinvio/jaz-ai
```

## Skill paths

Skills are available at both standard discovery paths in this repo:

- **`.agents/skills/`** · [Agent Skills](https://agentskills.io) open standard (Codex, Copilot, Cursor, Antigravity, Windsurf, Goose, Roo Code, Junie, Amp)
- **`.claude/skills/`** · Claude Code native path

Both point to the same source content in `src/skills/`.

## More

- **[README.md](README.md)** · full agent stack overview, MCP install, multi-org, troubleshooting
- **[CONTEXT.md](CONTEXT.md)** · runtime rules-of-engagement for agents using the stack
- **[help.jaz.ai](https://help.jaz.ai)** · Jaz product help center
