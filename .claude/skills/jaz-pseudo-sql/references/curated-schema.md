# Curated reporting schema (as of 2026-05-27)

Source: live-probed against Jaz Demo (`SELECT * FROM <table> LIMIT 1` for each candidate). Confirms the per-column name + type that the pseudo-SQL engine exposes.

> **This doc is hand-derived.** Once a `get_pseudo_sql_schema` endpoint is published (parallel workstream), this file will be replaced by a live-fetched version. Until then, the doc captures a point-in-time snapshot — re-run the probes (`SELECT * FROM <table> LIMIT 1` against each table) periodically. If you observe drift between this doc and the live API, log it and request a sync. Smoke section 61 spot-checks `invoice_number` column presence but does NOT validate full column inventory drift.

## Conventions

- All `id` / `*_id` columns are `text` (not `uuid`). The engine returns resourceIds as strings here.
- Money columns are `numeric` (Postgres NUMERIC / DECIMAL).
- Timestamps are `timestamptz`. Dates are `date`.
- Booleans are `bool`.
- Soft-deleted rows: behavior depends on table — flag the column you care about explicitly in WHERE.

## Tables

### `invoices` (23 columns)

| Column | Type | Notes |
|---|---|---|
| `id` | text | Invoice resourceId (UUID-shaped string) |
| `invoice_number` | text | Reference, e.g. "INV-2026-0001" |
| `status` | text | DRAFT, SENT, PARTIALLY_PAID, PAID, OVERDUE, VOIDED, ... |
| `contact_id` | text | Customer resourceId |
| `issue_date` | date | YYYY-MM-DD |
| `due_date` | date | YYYY-MM-DD |
| `payment_terms_days` | int | E.g. 30 for NET 30 |
| `currency` | text | ISO 4217 |
| `subtotal` | numeric | Pre-tax |
| `tax_total` | numeric | Aggregate tax across lines |
| `total` | numeric | Final invoiced amount |
| `balance` | numeric | Outstanding amount |
| `amount_paid` | numeric |  |
| `credit_applied` | numeric | Credit notes applied |
| `reconciled` | numeric | Amount reconciled (NOT a boolean) |
| `total_discount` | numeric |  |
| `tax_inclusive` | bool | True when line prices already include tax |
| `internal_notes` | text |  |
| `approval_status` | text | When approval workflow enabled |
| `submitted_at` | timestamptz |  |
| `approved_at` | timestamptz |  |
| `created_at` | timestamptz |  |
| `updated_at` | timestamptz |  |

### `bills` (24 columns)

Same shape as `invoices` plus:

| Column | Type | Notes |
|---|---|---|
| `bill_number` | text | Reference (different name from `invoice_number`) |
| `withholding_tax` | numeric | WHT applied to this bill |

(All other columns mirror `invoices`.)

### `journals` (12 columns)

| Column | Type | Notes |
|---|---|---|
| `id` | text |  |
| `type` | text | MANUAL, DIRECT_CASH_IN, DIRECT_CASH_OUT, CASHFLOW_IN, CASHFLOW_OUT, ... |
| `reference` | text |  |
| `voucher_reference` | text |  |
| `contact_id` | text | Optional |
| `value_date` | date |  |
| `currency` | text |  |
| `total_debit` | numeric |  |
| `total_credit` | numeric | Should equal `total_debit` for posted journals |
| `status` | text | DRAFT, POSTED, ... |
| `internal_notes` | text |  |
| `created_at` | timestamptz |  |

### `payments` (18 columns)

| Column | Type | Notes |
|---|---|---|
| `id` | text |  |
| `status` | text |  |
| `type` | text |  |
| `direction` | text | PAYIN (money in, AR) / PAYOUT (money out, AP) |
| `contact_id` | text |  |
| `account_id` | text | Bank or cash account |
| `value_date` | date |  |
| `amount` | numeric | Gross |
| `net_amount` | numeric | Gross − fees |
| `fee_amount` | numeric |  |
| `currency` | text |  |
| `payment_method` | text |  |
| `reference` | text |  |
| `external_reference` | text |  |
| `transaction_type` | text |  |
| `notes` | text |  |
| `description` | text |  |
| `created_at` | timestamptz |  |

### `contacts` (13 columns)

| Column | Type | Notes |
|---|---|---|
| `id` | text |  |
| `name` | text |  |
| `type` | text |  |
| `relationship` | text | CUSTOMER, SUPPLIER, both |
| `status` | text | ACTIVE, ARCHIVED |
| `email` | text | Primary email (emailList is array-shaped — not exposed here) |
| `phone` | text |  |
| `website` | text |  |
| `tax_id` | text |  |
| `registration_id` | text |  |
| `currency` | text | Default per-contact billing currency |
| `notes` | text |  |
| `created_at` | timestamptz |  |

### `accounts` (11 columns)

| Column | Type | Notes |
|---|---|---|
| `id` | text |  |
| `code` | text | E.g. "1000" for Cash |
| `name` | text |  |
| `type` | text | Cash, Operating Revenue, Finance Cost, ... (classic 12 + 9 IFRS 18) |
| `class` | text | ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE |
| `currency` | text |  |
| `status` | text | ACTIVE, INACTIVE |
| `description` | text |  |
| `is_locked` | bool | True for system accounts that can't be edited |
| `parent_id` | text | For sub-account hierarchies |
| `created_at` | timestamptz |  |

## Tables not yet probed (candidates — verify before relying)

Based on the broader Jaz domain — likely-present but not yet column-confirmed:

- `cash_entries` — cash-in / cash-out journal entries
- `capsules` — capsule entities (transaction groupings, recipe-generated atoms)
- `capsule_atoms` — scheduler atoms generated by capsule recipes
- `customer_credit_notes`, `supplier_credit_notes`
- `subscriptions` — recurring billing schedules
- `tags`, `items`, `tax_profiles`, `currencies`
- `fixed_assets`
- `background_jobs`
- `bank_accounts`, `bank_rules`, `reconciliations`

If you need one of these tables for a query, try `SELECT * FROM <name> LIMIT 1` — the validator returns 422 with the exact "unknown table" message if it's not curated.
