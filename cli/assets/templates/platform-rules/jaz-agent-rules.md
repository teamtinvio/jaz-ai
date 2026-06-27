# Jaz — Agent Operating Rules

How any AI agent (Claude / GPT / Gemini / Copilot / Cursor) should use the Jaz accounting stack in this workspace. Drop this file into the path your platform expects and your agent picks it up automatically.

Source of truth lives in the installed skills (`.claude/skills/jaz-*/SKILL.md` or `.agents/skills/jaz-*/SKILL.md`). This file is a 30-second bias prompt — load the skill for the deep contract.

## Discovery

The Jaz MCP server exposes 345 tools across 40 namespaces via 3 meta-tools. **Use the meta-tool flow — never enumerate tools blindly.**

1. `search_tools(query)` → top-N tool names + namespaces.
2. `describe_tools(names)` → full parameter schemas.
3. `execute_tool(name, args)` → run.

Offline tools (no API key needed): `plan_recipe`, `search_help_center`. The MCP server says `Offline.` at the start of those tools' descriptions.

## API contract — the 6 rules that prevent 90% of 422s

1. **IDs are `resourceId`** — never `id`.
2. **Transaction dates are `valueDate`** (YYYY-MM-DD) — never `issueDate` / `invoiceDate` / `date`.
3. **Line item text field is `name`** — never `description`.
4. **`saveAsDraft` defaults `false`** at the API; CLI/MCP create-tools default `true`. Set explicitly when the user says "finalize".
5. **Pagination uses `limit` / `offset`** — `offset` is a 0-indexed page number (offset=1 = second page), not a row-skip. Sort is required when `offset` is set.
6. **Create responses return `{ resourceId }` only** — re-GET to load the full entity.

## Transactions — never hand-construct journals for IFRS

For depreciation, amortization, ECL, IFRS 16 leases, hire purchase, loans, IAS 37 provisions, deferred revenue, fixed deposits, asset disposal, accrued expenses, leave accrual, dividends — **always use the recipe engine**:

1. `plan_recipe(recipe, ...)` → schedule + journals (offline, no posting).
2. `execute_recipe(recipe, ..., startDate)` → posts capsule + all entries (replaces ~20 manual tool calls).

Exception: `fx-reval` is verification-only — Jaz auto-handles period-end IAS 21.23 FX translation. Calling `execute_recipe(recipe: 'fx-reval')` would double-post.

## Bulk operations

- `bulk_upsert_*` tools accept up to 500 rows per call. Async tools return a `jobId` — poll `search_background_jobs(filter:{resourceId:{eq:jobId}})` until SUCCESS / FAILED / PARTIAL_SUCCESS.
- On `PARTIAL_SUCCESS`: succeeded rows are committed. Inspect `errorDetails[].rowIndex` and re-submit only failed rows.
- Sync `bulk_upsert_chart_of_accounts` returns `failedRows[]` inline — no polling.

## Safety

- Never echo `JAZ_API_KEY` or `jk-*` strings to the user or into generated code.
- Never invent enum values (UPPER_SNAKE_CASE only — match exactly).
- Errors come back structured (`code`, `message`, `failedRows[]`, `errorDetails[]`). Read them — don't guess at what went wrong.
