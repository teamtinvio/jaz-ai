---
name: jaz-pseudo-sql
version: 5.20.0
description: >-
  Use this skill when answering ad-hoc data questions that aren't covered by
  download_export (canonical reports — anomaly, audit, aging, P&L, BS, GL,
  statement of account) or search_* tools (entity listings with structured
  filters). Pseudo-SQL is a read-only DSL against Jaz's curated reporting
  schema — single SELECT statement, ≤100 row sync preview or full async CSV
  export. Tools: get_pseudo_sql_schema (call FIRST — returns live catalog +
  downloadable jaz-pseudo-sql.md skill body), preview_pseudo_sql,
  export_pseudo_sql, get_pseudo_sql_export, run_pseudo_sql_and_download.
license: MIT
compatibility: Works with Claude Code, Claude Cowork, Claude.ai, and any agent that reads markdown. For canonical report types and the standard analytics surface, load the jaz-api skill alongside this one.
---

# Jaz Pseudo-SQL Skill

You are running ad-hoc data queries against the **curated reporting schema** in Jaz — a read-only SQL DSL exposed via the Jaz API at `/api/v1/reports/sql-query/*`. Use this skill when:

- The user asks a custom analytical question that doesn't match any `download_export(exportType=...)` canonical report.
- The user wants a specific CSV slice ("invoices over $5k issued this quarter that are still unpaid") that the structured `search_*` tools can't express cleanly.
- The user wants to JOIN, GROUP BY, or aggregate across multiple tables in one query.

> **NOT a general-purpose database surface.** Curated schema only — no DML (DELETE/UPDATE/INSERT), no multi-statement input, no access to private columns. Validators reject anything that isn't a single SELECT against an allowed table. See `references/error-catalog.md` for the full error vocabulary.

## Source of truth for the schema

**Always call `get_pseudo_sql_schema` first.** The response returns the live curated catalog (~70 tables, 91 join edges, 47 functions) AND the canonical `jaz-pseudo-sql.md` skill body in `agentSkillsDoc.content`. That `.md` body is the authoritative syntax guide — drop it into your context and use it instead of any cached column list.

The `version` field is a stable 16-char hex hash; cache by it. If you've already called the tool this session and the version is unchanged on a re-call, the schema and skill body are identical to your cached copy — no need to re-read.

Don't write a pseudo-SQL query from memory. The catalog grows; column names change; the live schema is the only source you should trust.

## When NOT to use this skill

| Use this instead | When |
|---|---|
| `download_export(exportType='analysis-anomalous-invoices')` etc. | Canonical anomaly / audit / risk reports — they're tuned, parameterized, and faster than re-deriving them in SQL. See jaz-api Rule 141. |
| `download_export(exportType='trial-balance')` etc. | Statements (TB, BS, P&L, GL, cashflow). The reporting engine handles period closing rules, intercompany eliminations, FX revaluation. SQL would miss these. |
| `search_invoices(filter:...)`, `search_bills`, etc. | Listing entities with structured filters. Returns typed objects, supports pagination, faster than SQL. |
| `get_invoice(resourceId)` etc. | Single-entity lookup by ID. |
| `view_auto_reconciliation` | Bank reconciliation match suggestions. |

## Tool selection within pseudo-SQL

- **`get_pseudo_sql_schema`** — call FIRST. Returns the live curated catalog (tables/columns/joins/functions) plus the canonical `jaz-pseudo-sql.md` skill body in `agentSkillsDoc.content`. Drop the `.md` body into context as the syntax guide. Use the response's `version` (16-char hex) as a session-stable cache key. Org-agnostic.
- **`preview_pseudo_sql`** — sync, ≤100 rows. Use for any agent-loop question where you need to look at the data quickly.
- **`export_pseudo_sql` + `get_pseudo_sql_export`** — async kickoff + polling. Use when you want explicit job control (manual retry, parallel jobs, polling at your own cadence) or when the result set is too big for preview's 100-row cap.
- **`run_pseudo_sql_and_download`** — one-shot composite: kickoff + poll + fetch CSV. Use for "give me the file" flows. Default returns the CSV buffer; pass `downloadToFile=true` to write to `~/Downloads/`.

## DSL rules (load-bearing)

1. **SELECT only.** DELETE/UPDATE/INSERT → 422 `PSEUDOSQL_VALIDATION_ERROR` "only SELECT queries are supported".
2. **Single statement.** `SELECT 1; SELECT 2;` → 422 `PSEUDOSQL_PARSE_ERROR` "only a single SELECT statement is allowed per query". A trailing semicolon on one statement is fine.
3. **Must SELECT FROM at least one table.** `SELECT 1` (no FROM) → 422 `PSEUDOSQL_VALIDATION_ERROR`.
4. **Max 16,384 characters.** Over → 422 `validation_error` "query must be a maximum of 16,384 characters in length". Note: this is the request-shape validator (different error_type from the SQL-engine validators).
5. **Curated tables only.** Unknown table → 422 `PSEUDOSQL_VALIDATION_ERROR` "unknown table <name>" (lowercased in the error message). Call `get_pseudo_sql_schema` for the live inventory.
6. **Preview cap is 100 rows.** `truncated:true` means "MORE rows matched than were returned in this preview" — NOT "you hit the cap". To interpret: compare `rowCount` against your `LIMIT` clause or the preview cap (100). If you need every row, switch to `export_pseudo_sql`.
7. **Export `downloadUrl` is short-lived.** S3 pre-signed, ~15min expiry (`X-Amz-Expires=900`). Fetch immediately. If a fetch returns 403, call `get_pseudo_sql_export(jobId)` again for a fresh URL.
8. **`Idempotency-Key` dedups server-side.** Same key + DIFFERENT query body returns the prior job's result (the server doesn't cross-check). `run_pseudo_sql_and_download` auto-keys from `sha256(query).slice(0,16)` so dedup is query-tied automatically. If you call `export_pseudo_sql` directly with a manual key, don't reuse it across different intents.

## Reference docs

- **Schema inventory** — call `get_pseudo_sql_schema` (live, ~30 KB response with tables / joins / functions + the canonical `jaz-pseudo-sql.md` body for context).
- **[Query patterns](references/query-patterns.md)** — example SELECTs by user intent (top customers, unpaid invoices, FX-exposed bills, etc.).
- **[Error catalog](references/error-catalog.md)** — every observed error code + recovery action.

## Quick example — preview an ad-hoc query

```
Agent intent: "show me the 10 largest unpaid invoices"

preview_pseudo_sql({
  query: `
    SELECT invoice_number, total, balance, contact_id, due_date
    FROM invoices
    WHERE balance > 0
    ORDER BY balance DESC
    LIMIT 10
  `
})
→ { data: { columns: [...], rows: [...], rowCount: 10, truncated: false } }
```

