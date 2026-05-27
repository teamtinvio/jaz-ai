# Error catalog (live-probed 2026-05-27)

Every error code observed during the pseudo-SQL surface scoping. Recovery path per code.

## `validation_error` (request-shape validator)

Surfaces when the request-shape validator (length, type, basic shape) rejects the request before forwarding to the SQL engine.

| Message | Trigger | Recovery |
|---|---|---|
| `query must be a maximum of 16,384 characters in length` | Query > 16384 chars | Shorten the query. Hard cap; no override. |
| (other struct-tag failures) | Malformed body | Inspect the `errors[]` list; fix the field named. |

## `PSEUDOSQL_PARSE_ERROR` (SQL parser)

Surfaces when the SQL parser can read the input but it violates a DSL constraint (statement count, syntax, allowed verbs).

| Message | Trigger | Recovery |
|---|---|---|
| `only a single SELECT statement is allowed per query` | Multi-statement input (`SELECT 1; SELECT 2;`) | Send statements one at a time. Trailing semicolon on ONE statement is fine. |
| `syntax error: at or near "<token>": syntax error` | Bad SQL syntax | Fix the query. The token in the message names the position. |
| `syntax error: lexical error: invalid hexadecimal numeric literal` | Hex-like fragment in identifier / string | Quote string literals; check identifier escaping. |

## `PSEUDOSQL_VALIDATION_ERROR` (SQL semantic validator)

Surfaces when the query is syntactically valid but semantically rejected — wrong verb, unknown table, no FROM, etc.

| Message | Trigger | Recovery |
|---|---|---|
| `only SELECT queries are supported` | DELETE / UPDATE / INSERT verb | Rewrite as SELECT. The DSL is read-only by design. |
| `a query must SELECT FROM at least one table` | `SELECT 1` (constant-only) | Add `FROM <table>` from the curated set. |
| `unknown table "<name>"` (note: lowercased) | Table not in curated schema | Call `get_pseudo_sql_schema` for the live inventory. Common typos: plural vs singular (`invoice` vs `invoices`), wrong case. |

## Export-specific terminal states

The `export_pseudo_sql` + `get_pseudo_sql_export` flow uses status enums (NOT error codes). Terminal states:

| Status | Meaning | Recovery |
|---|---|---|
| `COMPLETED` | Done; `downloadUrl` present | Fetch the URL immediately (15min S3 expiry). |
| `FAILED` | Job errored mid-run; `error` field populated | Inspect `error`; rebuild the query and retry. |
| `EXPIRED` | Job result expired before fetch | Re-run via `export_pseudo_sql` with a fresh query. |

The pre-terminal states are `PENDING` and `RUNNING` — these are normal during polling.

## Edge cases

- **`truncated:true` is NOT an error.** It means "more rows match than were returned in this preview" — inspect `rowCount` vs your `LIMIT` to interpret. To get every row, switch to `export_pseudo_sql`.
- **`downloadUrl` 403 on fetch.** S3 pre-signed URL expired (~15min limit). Call `get_pseudo_sql_export(jobId)` again for a fresh URL.
- **Idempotency-Key reuse with different query.** Server returns the prior job's result — does NOT cross-check the new query body. If you're calling `export_pseudo_sql` directly with manual keys, treat the key as a per-intent token. `run_pseudo_sql_and_download` auto-keys from `sha256(query).slice(0,16)`, so dedup is query-tied.
- **TIMED_OUT from `run_pseudo_sql_and_download`.** Default timeout is 25s; the job is still alive. Retry via `get_pseudo_sql_export(jobId)` — the composite returns `jobId` so you can hand off.

## When to fall back to a different tool

If you hit `PSEUDOSQL_VALIDATION_ERROR: unknown table` repeatedly, the underlying data isn't in the curated schema:

- For canonical analytics reports → `download_export(exportType=...)`. See jaz-api Rule 141.
- For raw entity dumps (e.g., every invoice as a row) → `export_records`.
- For one-off entity lookups → `get_invoice` / `get_bill` / etc.
- For filtered listings with structured criteria → `search_invoices` / `search_bills` / etc.
