# Query patterns by user intent

Patterns vetted against the curated schema (call `get_pseudo_sql_schema` for the live inventory). Each example uses `preview_pseudo_sql` for quick agent-loop questions; switch to `run_pseudo_sql_and_download` (or `export_pseudo_sql` + `get_pseudo_sql_export`) when you need the full result set as a CSV.

---

## Outstanding receivables / payables

**"Top 10 customers by outstanding balance"**

```sql
SELECT contact_id, SUM(balance) AS outstanding
FROM invoices
WHERE balance > 0 AND status NOT IN ('DRAFT', 'VOIDED')
GROUP BY contact_id
ORDER BY outstanding DESC
LIMIT 10
```

**"How much do we owe each supplier"**

```sql
SELECT contact_id, currency, SUM(balance) AS outstanding
FROM bills
WHERE balance > 0 AND status NOT IN ('DRAFT', 'VOIDED')
GROUP BY contact_id, currency
ORDER BY outstanding DESC
LIMIT 50
```

**"All overdue invoices"**

```sql
SELECT invoice_number, contact_id, total, balance, due_date
FROM invoices
WHERE balance > 0
  AND due_date < CURRENT_DATE
  AND status NOT IN ('DRAFT', 'VOIDED')
ORDER BY due_date ASC
```

---

## Period analysis

**"Invoices issued last month grouped by status"**

```sql
SELECT status, COUNT(*) AS count, SUM(total) AS total_issued
FROM invoices
WHERE issue_date >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')
  AND issue_date <  DATE_TRUNC('month', CURRENT_DATE)
GROUP BY status
ORDER BY total_issued DESC
```

**"Monthly invoice totals for this calendar year"**

```sql
SELECT
  DATE_TRUNC('month', issue_date) AS month,
  COUNT(*) AS invoice_count,
  SUM(total) AS gross_total
FROM invoices
WHERE issue_date >= DATE_TRUNC('year', CURRENT_DATE)
  AND status NOT IN ('DRAFT', 'VOIDED')
GROUP BY DATE_TRUNC('month', issue_date)
ORDER BY month
```

---

## FX exposure

**"Bills in non-functional currencies that are still unpaid"**

```sql
SELECT bill_number, contact_id, currency, total, balance, due_date
FROM bills
WHERE balance > 0
  AND currency != 'SGD'   -- or whatever the org's functional currency is
ORDER BY balance DESC
```

**"FX-exposed customer credit notes"**

(`customer_credit_notes` table not yet column-confirmed; call `get_pseudo_sql_schema` and inspect its `tables[]` for the current column list.)

---

## Reconciliation surfacing

**"Journals posted this month with no reconciliation"**

```sql
SELECT id, type, reference, value_date, currency, total_debit
FROM journals
WHERE value_date >= DATE_TRUNC('month', CURRENT_DATE)
  AND status = 'POSTED'
ORDER BY value_date DESC, total_debit DESC
LIMIT 100
```

---

## Customer/supplier analysis

**"Customers with no invoice activity this quarter"**

```sql
SELECT c.id, c.name
FROM contacts c
WHERE c.relationship IN ('CUSTOMER', 'BOTH')
  AND c.status = 'ACTIVE'
  AND c.id NOT IN (
    SELECT contact_id
    FROM invoices
    WHERE issue_date >= DATE_TRUNC('quarter', CURRENT_DATE)
  )
ORDER BY c.name
LIMIT 50
```

**"Suppliers with the most bills this year"**

```sql
SELECT contact_id, COUNT(*) AS bill_count, SUM(total) AS spend
FROM bills
WHERE issue_date >= DATE_TRUNC('year', CURRENT_DATE)
GROUP BY contact_id
ORDER BY bill_count DESC
LIMIT 20
```

---

## Account / CoA queries

**"All accounts of a specific IFRS 18 classification"**

```sql
SELECT code, name, currency, status
FROM accounts
WHERE type IN ('Finance Cost', 'Financing Income')
ORDER BY code
```

**"Locked system accounts"**

```sql
SELECT code, name, type, class
FROM accounts
WHERE is_locked = true
ORDER BY type, code
```

---

## Quick joins

The pseudo-SQL validator supports JOIN clauses across curated tables (subject to its own constraints). Example: enrich invoices with contact names.

```sql
SELECT
  i.invoice_number,
  i.total,
  i.balance,
  i.due_date,
  c.name AS customer_name
FROM invoices i
JOIN contacts c ON c.id = i.contact_id
WHERE i.balance > 0
ORDER BY i.balance DESC
LIMIT 25
```

If a particular JOIN shape fails validation, the error message names the column/table that's outside the curated set — adjust the query and retry.

---

## Pattern when intent doesn't match

If none of the above fits and you're tempted to write a complex multi-CTE / window-function query: first check whether `download_export(exportType=...)` covers the canonical version of the report (faster, parameterized, period-aware). Pseudo-SQL is the escape hatch, not the default.
