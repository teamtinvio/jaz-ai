# Jaz: Agent Operating Rules

Jaz accounting guidance for this workspace. Load the installed Jaz skills for detailed workflows and API contracts.

## Discovery

Jaz exposes **476 tools across 56 namespaces**. Your tool list shows **3, 56, or 476** entries depending on packaging; **never infer capability from its length.**

- **3**: `search_tools(query)` → `describe_tools(names)` → `execute_tool(name, args)`. Empty query returns the namespace map.
- **56**: namespace routers; call one with `{ operation, arguments }`.
- **476**: call operations directly by name.

**Before telling the user Jaz cannot do something, call `describe_capabilities`** (the capability map, on all three).

No API key needed: `describe_capabilities`, `calculate` (marked `Offline.`), and `search_help_center`.

## API contract: the 6 rules that prevent 90% of 422s

1. **IDs are `resourceId`**, never `id`.
2. **Transaction dates are `valueDate`** (YYYY-MM-DD), never `issueDate` / `invoiceDate` / `date`.
3. **Line item text field is `name`**, never `description`.
4. **`saveAsDraft` defaults `false`** at the API; CLI/MCP create-tools default `true`. Set explicitly when the user says "finalize".
5. **Pagination uses `limit` / `offset`**: `offset` is a 0-indexed page number (offset=1 = second page), not a row-skip. Exceptions use a 0-indexed ROW offset (next page = offset + limit): general ledger, AR/AP details reports (both also templated), purchase items, currency rates, employee payouts search. Sort is required when `offset` is set.
6. **Create responses return `{ resourceId }` only**; re-GET to load the full entity.

## Transactions: registers first, then calculators

A lease, hire purchase, loan, prepaid expense, deferred revenue or fixed asset kept on the books goes in its register (`leases`, `loans`, `loan_events`, `deferrals`, `fixed_assets`, `fixed_asset_schedules`, `register_reports`), which posts the periodic entries itself, never cash. On a 403 (plan or role) do not fall back to journals: say it is not available, name the alternative (a calculated schedule with manual journals), and wait for the user to ask.

For what-ifs and for ECL, IAS 37 provisions, fixed deposits, accrued expenses, leave accrual and dividends, **run the calculator, then post its steps**:

1. `calculate(type, ...)` → schedule + journal lines (offline).
2. `create_capsule` (type from `list_capsule_types`).
3. Post each step with `create_journal` / `create_bill` / `create_invoice` / `create_cash_in` / `create_cash_out` with `capsuleResourceId`.

Exception: `fx-reval` is verification-only; Jaz revalues FX at period end (IAS 21.23). Never post it.

## Bulk operations

- Find & fix (recode) many records: `preview_ledger_find_fix`, then apply once the user confirms.
- `bulk_upsert_*` tools accept up to 500 rows per call. Async tools return a `jobId`; poll `search_background_jobs(filter:{resourceId:{eq:jobId}})` until SUCCESS / FAILED / PARTIAL_SUCCESS.
- On `PARTIAL_SUCCESS`: succeeded rows are committed. Inspect `errorDetails[].rowIndex` and re-submit only failed rows.
- Sync `bulk_upsert_chart_of_accounts` returns `failedRows[]` inline, no polling.

## Safety

Prefer OAuth (`clio auth login` locally); API keys are optional.

- Never echo OAuth tokens, `JAZ_API_KEY`, or `jk-*` strings to the user or into generated code.
- Never invent enum values (UPPER_SNAKE_CASE only, match exactly).
- Errors come back structured (`code`, `message`, `failedRows[]`, `errorDetails[]`). Read them, do not guess.

## Jaz Jots: record the judgment behind a write

A jot is a one-line record of a judgment call: the decision and why.

**The one rule:** record a judgment when you chose among real alternatives and a write followed, or when you deliberately decided NOT to write. Skip mechanical actions and calls with no real choice.

- **Two ways to write one.** The `jot` field on the mutation you are already making, or the `jot` tool alone. Jot AFTER the write succeeds, never before, and carry the record's resourceId.
- **Recall before repeating.** Call `recall` before repeating a judgment on the same record, kind, or workflow; a flag on a prior one is a warning.
- **9 kinds:** CLASSIFICATION · MATCH · SCOPE · ASSUMPTION · RISK · METHOD · RECOVERY · DEVIATION · NOTE.
- Optional: a jot never delays or fails the action it rides on.
