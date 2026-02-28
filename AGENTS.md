# Jaz AI — Agent Skills

Agent skills for the [Jaz](https://jaz.ai) accounting platform. Works with [Claude Code](https://claude.com/claude-code), [Google Antigravity](https://antigravity.google), [OpenAI Codex](https://openai.com/codex), [GitHub Copilot](https://github.com/features/copilot), [Cursor](https://cursor.com), and any tool that supports the [Agent Skills](https://agentskills.io) open standard.

> Also fully compatible with [Juan Accounting](https://juan.ac).

## Skills

| Skill | What It Does |
|-------|-------------|
| **jaz-api** | 80 rules, full endpoint catalog, error catalog, field mapping — agents write correct Jaz API code on the first try |
| **jaz-conversion** | Xero, QuickBooks, Sage, Excel migration playbook — CoA mapping, tax profiles, FX, trial balance verification |
| **jaz-recipes** | 16 IFRS-compliant recipes (loans, leases, depreciation, FX reval, ECL, provisions) + 10 CLI financial calculators with blueprint output |
| **jaz-jobs** | 12 accounting jobs (month/quarter/year-end close, bank recon, document collection, GST/VAT, payment runs, credit control, supplier recon, audit prep, FA review, statutory filing) + Singapore Form C-S tax computation |

## Install

```bash
# CLI (recommended — auto-detects your AI tool)
npm install -g jaz-clio
clio init

# Or install a specific skill
clio init --skill jaz-api
clio init --skill jaz-conversion
```

## Skill Paths

Skills are available at both discovery paths:

- **`.agents/skills/`** — Agent Skills open standard (Codex, Copilot, Cursor, etc.)
- **`.claude/skills/`** — Claude Code native path

Both point to the same source content in `src/skills/`.

## Documentation

- [README](README.md) — Full documentation, architecture, and examples
- [help.jaz.ai](https://help.jaz.ai) — Jaz Help Center
