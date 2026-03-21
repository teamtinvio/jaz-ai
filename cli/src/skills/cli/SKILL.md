---
name: jaz-cli
version: 4.36.0
description: >-
  Use this skill when running Clio CLI commands, building shell scripts with
  Clio, debugging auth issues, understanding --json output, paginating results,
  or chaining multi-step accounting workflows from the terminal. Covers all 48
  command groups, auth precedence, output formats, entity resolution, and common
  workflow patterns. Also use when the user asks how to use clio, what commands
  are available, or how to automate accounting tasks from the command line.
license: MIT
compatibility: Requires Node.js >= 18.0.0. Install via npm install -g jaz-clio.
---

# Clio CLI Skill

You are working with **Clio** (`jaz-clio`) — the CLI for the Jaz accounting platform. 48 command groups, 13 calculators, 12 job blueprints, 240 agent tools. Also fully compatible with Juan Accounting (same API, same endpoints).

## When to Use This Skill

- Running or composing `clio` commands from the terminal
- Building shell scripts or CI pipelines that automate Jaz workflows
- Debugging authentication issues (wrong org, missing key, env var conflicts)
- Understanding `--json` output structure for piping into `jq` or downstream tools
- Paginating large result sets (`--all`, `--limit`, `--offset`, `--max-rows`)
- Chaining multi-step accounting workflows (create -> finalize -> pay -> verify)
- Answering "what commands are available?" or "how do I do X from the CLI?"

## Auth Precedence

Resolution stops at the first match. Higher priority wins silently.

| Priority | Source | How to set |
|----------|--------|------------|
| 1 | `--api-key <key>` | Per-command flag |
| 2 | `JAZ_API_KEY` env | `export JAZ_API_KEY=jk-...` |
| 3 | `--org <label>` flag | Per-command profile lookup |
| 4 | `JAZ_ORG` env | `export JAZ_ORG=acme-sg` (pinned session) |
| 5 | Active profile | `clio auth switch <label>` (stored in `~/.config/jaz-clio/credentials.json`) |

**Critical gotcha**: If `JAZ_API_KEY` is set in your shell, it overrides `--org` and the active profile. Run `unset JAZ_API_KEY` before switching tenants with `clio auth switch`.

Auth subcommands:
```
clio auth add <key>          # Validate key + save profile (auto-slugifies org name)
clio auth add <key> --as prod-sg   # Save with custom label
clio auth switch <label>     # Set active profile
clio auth list               # Show all saved profiles
clio auth whoami             # Show current org + auth source
clio auth remove <label>     # Delete a profile
clio auth clear              # Remove all profiles
clio auth shell-init         # Print shell exports (for eval)
clio auth unpin              # Unset JAZ_ORG from current shell
```

## Output Formats

Every command supports `--json`. Most list commands also support `--format <type>`.

| Flag | Format | Use case |
|------|--------|----------|
| (default) | `table` | Human-readable, colored, truncated at 500 rows |
| `--json` | `json` | Structured JSON envelope for piping/scripting |
| `--format csv` | `csv` | Spreadsheet import |
| `--format yaml` | `yaml` | Config files, readable structured output |

JSON envelope for list commands:
```json
{ "totalElements": 142, "totalPages": 2, "truncated": false, "data": [...] }
```

When `truncated: true`, a `_meta` object appears with `fetchedRows` and `maxRows`.

Single-record commands (`get`, `create`) output the raw object in `--json` mode.

**Stderr vs stdout**: Resolution feedback (e.g., "Contact: Acme Corp (abc1234-...)") goes to stderr. Only data goes to stdout. This means `clio invoices list --json | jq .` works cleanly.

## Entity Resolution

Flags like `--contact`, `--account`, `--bank-account`, and `--tax-profile` accept either a UUID or a human-readable name. Resolution order:

1. **UUID passthrough** — if the value matches UUID format, use it directly (no API call)
2. **Server-side search** — contacts use name-contains search; accounts/tax-profiles fetch all (orgs have 50-200 accounts)
3. **Exact match** — case-insensitive match on billingName/name/code
4. **Fuzzy match** — score >= 0.7 auto-resolves; multiple close matches throw with candidates
5. **Error with suggestions** — shows available entities (up to 10) for the user to choose

Examples:
```bash
clio invoices create --contact "Acme"           # Fuzzy-resolves to "Acme Corp Pte Ltd"
clio invoices create --contact abc12345-...     # UUID passthrough, no API call
clio journals create --account "Bank - SGD"     # Resolves by account name
clio journals create --account "1000"           # Resolves by account code
```

## Pagination

All list/search commands support pagination. Two modes:

**Single-page mode** (default):
```bash
clio invoices list                    # First 100 results
clio invoices list --limit 50         # First 50 results
clio invoices list --offset 2         # Page 3 (0-indexed)
```

**Auto-paginate mode** (`--all`):
```bash
clio invoices list --all              # Fetch all pages (concurrent, progress on stderr)
clio invoices list --all --max-rows 500   # Cap at 500 rows
clio invoices list --all --json       # Full dataset as JSON (progress suppressed)
```

Rules:
- `--all` and `--offset` cannot be combined (throws error)
- Default `--max-rows` is 10,000 (prevents runaway fetches)
- Table display caps at 500 rows regardless (use `--format json` for full output)
- Progress display on stderr is TTY-aware (suppressed for `--json` and pipes)

## Common Flags

| Flag | Scope | Purpose |
|------|-------|---------|
| `--api-key <key>` | All online commands | Override auth for this command |
| `--org <label>` | All online commands | Use a specific saved profile |
| `--json` | All commands | Structured JSON output |
| `--format <type>` | List commands | table, json, csv, yaml |
| `--limit <n>` | List/search commands | Max results per page |
| `--offset <n>` | List/search commands | Page offset (0-indexed) |
| `--all` | List/search commands | Auto-paginate all pages |
| `--max-rows <n>` | With `--all` | Cap total rows (default 10,000) |
| `--finalize` | Create commands | Approve immediately (skip draft) |
| `--date <YYYY-MM-DD>` | Create/update commands | Transaction date |
| `--due <YYYY-MM-DD>` | Create/update commands | Due date |
| `--status <status>` | Search commands | Filter by status |
| `--from / --to` | Search/report commands | Date range filter |
| `--contact <name>` | Transaction commands | Fuzzy-resolve contact |
| `--account <name>` | Transaction commands | Fuzzy-resolve account |
| `--ref <reference>` | Search/create commands | Reference string |
| `--tag <name>` | Search/create commands | Tag filter or assignment |
| `--input <file>` | Create/update commands | Read full JSON body from file |
| `--plan` | Recipe commands | Offline plan mode (no auth) |

## Body Input

Create/update commands accept payloads three ways (priority order):

1. `--input <file>` — read JSON from a file
2. Stdin pipe — `echo '{"contact":...}' | clio invoices create`
3. CLI flags — `--contact "Acme" --date 2026-01-15 --lines '[...]'`

When `--input` or stdin provides a body, CLI flags are ignored.

## Command Quick Reference

**Transactions**: `invoices`, `bills`, `customer-credit-notes`, `supplier-credit-notes`, `journals`, `cash-in`, `cash-out`, `cash-transfer`, `payments`, `cashflow`

**Contacts & Configuration**: `contacts`, `contact-groups`, `accounts`, `items`, `tags`, `currencies`, `currency-rates`, `tax-profiles`, `custom-fields`, `bookmarks`, `nano-classifiers`

**Bank & Reconciliation**: `bank` (accounts, get, records, add-records, import, auto-recon), `bank-rules`

**Fixed Assets & Inventory**: `fixed-assets` (alias: `fa`), `inventory` (alias: `inv`)

**Subscriptions & Schedulers**: `subscriptions` (alias: `subs`), `schedulers`

**Reports & Exports**: `reports` (16 report types), `exports`

**AI & Automation**: `magic` (create, status, search, split), `search`, `quick-fix`, `capsules`, `capsule-transaction` (alias: `ct`, 13 recipe types)

**Calculators**: `calc` (loan, lease, depreciation, prepaid-expense, deferred-revenue, fx-reval, ecl, provision, fixed-deposit, asset-disposal, accrued-expense, leave-accrual, dividend)

**Jobs**: `jobs` (month-end, quarter-end, year-end, bank-recon, gst-vat, payment-run, credit-control, supplier-recon, audit-prep, fa-review, document-collection, statutory-filing) + tools (match, bank-file, outstanding, ingest, sg-cs, sg-ca)

**Organization**: `org` (info), `org-users`, `auth`

**Utilities**: `help-center` (alias: `hc`), `context`, `mcp`, `serve`, `init`, `versions`, `update`

See `references/command-catalog.md` for the full catalog with subcommands and flags.

## Offline vs Online

Offline commands (no auth needed): `calc`, `jobs` (blueprints only), `capsule-transaction --plan`, `help-center`, `init`, `versions`, `update`

Everything else requires authentication (API key).

## Error Handling

CLI commands exit with standard codes:
- **Exit 0** — success
- **Exit 1** — user error (missing flags, invalid input, validation failure)
- **Exit 2** — auth error (invalid key, unreachable API)

Error messages go to stderr. When `--json` is set, the error is still on stderr so stdout stays parseable. Common errors:

```bash
# Missing required flag
Error: missing required option(s): --contact, --lines

# Fuzzy resolution ambiguity
Multiple contacts match "Acme":
  Acme Corp Pte Ltd (92%)
  Acme Holdings (87%)
Be more specific, or use the full billingName.

# Auth not configured
No API key configured. Run `clio auth add <key>`, set JAZ_API_KEY, or pass --api-key.

# API validation error (422)
API error 422: lineItems[0].accountResourceId is required when saveAsDraft is false
```

## Draft Validation

Transaction create commands (`invoices`, `bills`, `customer-credit-notes`, `supplier-credit-notes`, `journals`) perform client-side draft validation before hitting the API. The validation:

1. Checks required fields are present (contact, date, at least one line item)
2. Sanitizes line items (strips unknown fields, normalizes dates)
3. Prints a draft report showing what will be created
4. When `--finalize` is set, validates that every line item has `accountResourceId`

This catches mistakes before the API call, saving round-trip time and providing clearer error messages.

## Capsule-Transaction Recipes

The `capsule-transaction` (alias: `ct`) command group is the most powerful CLI feature. Each subcommand:

1. Runs a financial calculator (same as `clio calc`)
2. Creates a capsule to group the transactions
3. Posts all transactions (invoices, bills, journals) in sequence

Two entry paths:
- **Full**: provide `--input` (account mapping) or let it auto-resolve from your chart of accounts
- **Attach**: provide `--existing-txn <id>` to skip the initial transaction and create only the delta (e.g., attach depreciation to an existing purchase bill)

Plan mode (`--plan`) is offline and shows what accounts are needed and what steps will be created, without making any API calls.

```bash
# Plan mode — see what's needed (offline)
clio ct loan --principal 100000 --rate 5 --term 60 --plan

# Execute with auto-resolve (uses fuzzy matching against your chart of accounts)
clio ct loan --principal 100000 --rate 5 --term 60 --start-date 2026-01-01 --ref LOAN-001

# Execute with explicit account mapping
clio ct loan --principal 100000 --rate 5 --term 60 --start-date 2026-01-01 \
  --input account-mapping.json --bank-account "Bank - SGD" --contact "HSBC"
```

## Tips

1. **Pipe JSON to jq**: `clio invoices list --json | jq '.data[] | {ref: .reference, amount: .totalAmount}'`
2. **Export to CSV**: `clio contacts list --all --format csv > contacts.csv`
3. **Multi-org scripts**: `clio invoices list --org acme-sg --json && clio invoices list --org acme-ph --json`
4. **Draft-then-finalize**: The CLI defaults to saving as draft (overrides the API default of `saveAsDraft: false`). Use `--finalize` to create a finalized transaction immediately. Note: cash entries (`cash-in`, `cash-out`) do NOT override — they follow the API default (`saveAsDraft: false`, i.e. finalized).
5. **Idempotent creates**: Use `--input` with the same JSON to get consistent results. The API dedup guards catch duplicate contacts, items, and accounts.
6. **Check before bulk ops**: Always preview with `--json | jq length` before piping IDs into `quick-fix`.
7. **Offline calculators for exploration**: `clio calc` commands need no auth -- use them to explore scenarios before committing with `clio ct`.
8. **Help center for guidance**: `clio hc "how to reconcile"` searches the full Jaz help center locally (hybrid: embeddings + keyword).

See `references/common-workflows.md` for end-to-end multi-command patterns.

## See Also

- **jaz-api** — Field names, endpoints, error codes, and 117 production gotchas
- **jaz-recipes** — 16 IFRS-compliant transaction recipes with calculators and capsules
- **jaz-jobs** — 12 accounting job playbooks (month-end close, bank recon, GST/VAT filing, etc.)
- **jaz-conversion** — Data migration workflows from Xero, QuickBooks, Sage, MYOB, and Excel
