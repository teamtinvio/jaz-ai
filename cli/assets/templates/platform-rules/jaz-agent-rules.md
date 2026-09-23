# Jaz — Agent Operating Rules

Jaz accounting guidance for this workspace. Load the installed Jaz skills for detailed workflows and API contracts.

## Discovery

Jaz exposes **371 tools across 45 namespaces**. Your tool list shows **3, 45, or 371** entries depending on packaging — **never infer capability from its length.**

- **3** — `search_tools(query)` → `describe_tools(names)` → `execute_tool(name, args)`. Empty query returns the namespace map.
- **45** — namespace routers; call one with `{ operation, arguments }`. Its description lists its operations.
- **371** — call operations directly by name.

`describe_capabilities` returns the capability map on all three. **Call it before telling the user Jaz cannot do something.**

No API key needed: `describe_capabilities`, `plan_recipe`, `search_help_center` (marked `Offline.`).

## API contract — the 6 rules that prevent 90% of 422s

1. **IDs are `resourceId`** — never `id`.
2. **Transaction dates are `valueDate`** (YYYY-MM-DD) — never `issueDate` / `invoiceDate` / `date`.
3. **Line item text field is `name`** — never `description`.
4. **`saveAsDraft` defaults `false`** at the API; CLI/MCP create-tools default `true`. Set explicitly when the user says "finalize".
5. **Pagination uses `limit` / `offset`**: `offset` is a 0-indexed page number (offset=1 = second page), not a row-skip. Exceptions, where `offset` is a 0-indexed ROW offset (next page = offset + limit): the general ledger (and templated), the AR/AP details reports (and templated), purchase items (list and search), currency rates, and employee payouts search. Sort is required when `offset` is set.
6. **Create responses return `{ resourceId }` only** — re-GET to load the full entity.

## Transactions — never hand-construct journals for IFRS

For depreciation, amortization, ECL, IFRS 16 leases, hire purchase, loans, IAS 37 provisions, deferred revenue, fixed deposits, asset disposal, accrued expenses, leave accrual, dividends — **always use the recipe engine**:

1. `plan_recipe(recipe, ...)` → schedule + journals (offline, no posting).
2. `execute_recipe(recipe, ..., startDate)` → posts capsule + all entries (replaces ~20 manual tool calls).

Exception: `fx-reval` is verification-only — Jaz auto-handles period-end IAS 21.23 FX translation. Calling `execute_recipe(recipe: 'fx-reval')` would double-post.

## Bulk operations

- Find & fix (recode) many records: `preview_ledger_find_fix`, then apply once the user confirms.
- `bulk_upsert_*` tools accept up to 500 rows per call. Async tools return a `jobId` — poll `search_background_jobs(filter:{resourceId:{eq:jobId}})` until SUCCESS / FAILED / PARTIAL_SUCCESS.
- On `PARTIAL_SUCCESS`: succeeded rows are committed. Inspect `errorDetails[].rowIndex` and re-submit only failed rows.
- Sync `bulk_upsert_chart_of_accounts` returns `failedRows[]` inline — no polling.

## Safety

Prefer OAuth (`clio auth login` locally); API keys are optional.

- Never echo OAuth tokens, `JAZ_API_KEY`, or `jk-*` strings to the user or into generated code.
- Never invent enum values (UPPER_SNAKE_CASE only — match exactly).
- Errors come back structured (`code`, `message`, `failedRows[]`, `errorDetails[]`). Read them — don't guess at what went wrong.

## Jaz Jots: record the judgment behind a write

A jot is a one-line record of a judgment call: the decision and why. The org's judgment journal lets the next agent or human read the basis instead of re-deriving it.

**The one rule:** record a judgment when you chose among real alternatives and a write followed, or when you deliberately decided NOT to write. Skip mechanical actions and calls where the platform, the data, or the user left no choice.

- **Two ways to write one.** The `jot` field on the mutation you are already making (`"MATCH: distinct from BILL bil_x, references differ"`), or the `jot` tool alone. Jot AFTER the write succeeds, never before, and carry the record's resourceId.
- **Recall before repeating.** Call `recall` before repeating a judgment on the same record, kind, or workflow: a prior call with its basis beats re-deriving; a flag on it is a warning.
- **9 kinds:** CLASSIFICATION · MATCH · SCOPE · ASSUMPTION · RISK · METHOD · RECOVERY · DEVIATION · NOTE.
- Optional and non-blocking: a jot never delays or fails the action it rides on.
