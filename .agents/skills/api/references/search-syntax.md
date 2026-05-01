---
name: jaz-structured-search
description: >
  Generate structured search queries for the Jaz dashboard search bars.
  Use this skill whenever the user wants to search, filter, or find
  transactions, invoices, sales, purchases, payments, credit notes,
  journals, contacts, items, bank records, or any business data in Jaz.
  Also use when the user asks how to search, what search syntax is
  available, or wants help constructing a complex filter query.
  Converts natural language search intent into the Jaz structured
  search syntax that the dashboard search bars understand.
  Works with Juan Accounting too.
---

# Jaz Structured Search Syntax

Every search bar in the Jaz dashboard understands structured queries. Type a query and press Enter. If no structured syntax is detected, the search bar falls back to plain text search (contains match across multiple fields).

Your job is to translate the user's search intent into a valid structured search query string. Output ONLY the query string, nothing else, unless the user asks for explanation.

---

## Quick Reference

```
$500              → amount = 500
$100-500          → amount between 100 and 500
$500+             → amount >= 500
date:today        → transactions dated today
date:jan-mar 2025 → Jan 1 to Mar 31, 2025
date:-30d         → last 30 days
status:paid       → paid transactions
customer:sakura   → customer name contains "sakura"
ref:INV-2026      → reference contains "INV-2026"
```

---

## Combining Conditions

```
customer:sakura $500+                          → AND (implicit)
customer:sakura AND $500+                      → AND (explicit)
$500+ OR status:overdue                        → OR
(status:paid OR status:overdue) AND $500+      → grouped OR + AND
NOT status:void                                → exclude void
```

Space between conditions = AND (implicit). AND binds tighter than OR. Parentheses override precedence.

---

## Amount Search

Prefix with any currency symbol or type a numeric range.

| Input | Meaning |
|-------|---------|
| `$500` | amount = 500 |
| `$-500` | amount = -500 (negative) |
| `$100-500` | amount between 100 and 500 |
| `$100 to 500` | same as above |
| `$-500 to -100` | negative range |
| `$-100 - -500` | negative range (space-hyphen-space) |
| `$500+` | amount >= 500 |
| `$<200` | amount < 200 |
| `$>=1000` | amount >= 1000 |
| `100-500` | amount range (no symbol needed for ranges) |
| `>500` | amount > 500 (no symbol needed for comparisons) |
| `500+` | amount >= 500 (no symbol needed) |

Supported currency symbols: `$` `€` `£` `¥` `₱` `₹` `₩` `฿` `₫` `₺` `R$` `RM` `Rp` `kr` `Fr` `zł` `R`

Also works with ISO codes: `SGD500`, `PHP1000`, `EUR200-500`

A bare number like `500` searches all text fields (reference, ID, etc.). Add `$` or use range/comparison syntax to search amounts specifically.

---

## Date Search

Prefix with `date:` for invoice/transaction date, or `due:` for due date.

| Input | Meaning |
|-------|---------|
| `date:today` | today |
| `date:yesterday` | yesterday |
| `date:this week` | current week (Mon-Sun) |
| `date:last week` | previous week |
| `date:this month` | current month |
| `date:last month` | previous month |
| `date:this quarter` | current quarter |
| `date:last quarter` | previous quarter |
| `date:this year` | current year |
| `date:last year` | previous year |
| `date:jan 2025` | January 2025 |
| `date:jan-mar 2025` | Jan 1 to Mar 31, 2025 |
| `date:jan to mar 2025` | same as above |
| `date:2025-01-15` | exact date |
| `date:>2025-06-01` | after Jun 1, 2025 |
| `date:>=2025-06-01` | on or after Jun 1, 2025 |
| `date:-30d` | last 30 days |
| `date:-7d` | last 7 days |
| `date:-2w` | last 2 weeks |
| `date:-3m` | last 3 months |
| `date:last 30 days` | same as -30d |
| `date:last 2 weeks` | same as -2w |

Date field aliases: `due:` (due date), `created:` (created date), `submitted:` (submitted date), `approved:` (approved date), `lastpayment:` (last payment date)

---

## Field Search

| Input | Meaning |
|-------|---------|
| `status:paid` | status is Paid |
| `status:unpaid` | status is Unpaid |
| `status:overdue` | past due date AND unpaid/partially paid |
| `status:void` | status is Void |
| `status:draft` | status is Draft |
| `approval:pending` | approval status is Pending |
| `approval:approved` | approval status is Approved |
| `approval:rejected` | approval status is Rejected |
| `customer:sakura` | customer name contains "sakura" |
| `supplier:acme` | supplier name contains "acme" (purchases) |
| `ref:INV-2026` | reference contains "INV-2026" |
| `currency:SGD` | currency is SGD |
| `tag:priority` | tags contain "priority" |
| `balance:>0` | balance greater than 0 |
| `paid:>1000` | paid amount greater than 1000 |
| `id:abc-123` | resource ID contains "abc-123" |
---

## Negation

Use `!` or `NOT`. Never use `-` for negation (reserved for negative amounts).

| Input | Meaning |
|-------|---------|
| `!status:paid` | exclude paid |
| `NOT customer:sakura` | exclude customer sakura |
| `!$500` | exclude amount = 500 |
| `NOT (status:paid OR status:void)` | exclude paid and void |

---

## Multi-Value

Comma-separated values search for any match.

| Input | Meaning |
|-------|---------|
| `status:paid,overdue` | paid OR overdue |
| `currency:SGD,USD,EUR` | any of these currencies |

---

## Blank / Empty Checks

| Input | Meaning |
|-------|---------|
| `ref:blank` | reference is empty |
| `ref:!blank` | reference is not empty |
| `tag:blank` | no tags |
| `due:blank` | no due date set |

---

## Wildcards

| Input | Meaning |
|-------|---------|
| `ref:INV-*` | reference starts with "INV-" |
| `ref:*-2026` | reference ends with "-2026" |
| `customer:sak*` | customer name starts with "sak" |

---

## Exact Match

By default, text fields use "contains" matching. Prefix with `=` for exact match.

| Input | Meaning |
|-------|---------|
| `ref:INV-2026` | reference contains "INV-2026" |
| `=ref:INV-20260314-7500` | reference exactly equals "INV-20260314-7500" |
| `=customer:"Sakura Trading KK"` | exact customer name match |

---

## Regex

Slash-delimited patterns for advanced matching.

| Input | Meaning |
|-------|---------|
| `ref:/INV-\d{8}/` | reference matches regex pattern |
| `customer:/^sak/` | customer name starts with "sak" (regex) |

---

## Sort

Override default sorting inline.

| Input | Meaning |
|-------|---------|
| `sort:amount` | sort by amount ascending |
| `sort:amount:desc` | sort by amount descending |
| `sort:date:desc` | sort by date descending |
| `sort:customer` | sort by customer name ascending |
| `sort:balance:desc` | sort by balance descending |

---

## Quoting

Use double quotes for values with spaces.

```
customer:"Sakura Trading KK"
=ref:"INV-20260314-7500"
```

---

## Parentheses

Group conditions to control evaluation order.

```
(status:paid OR status:overdue) AND $500+
(customer:sakura OR customer:atlas) AND date:this month
NOT (status:paid OR status:void)
```

---

## Available Fields by Entity

### Sales / Invoices
`customer` `ref` `status` `approval` `currency` `tag` `id` `amount` `balance` `paid` `date` `duedate` `created` `lastpayment` `submitted` `approved` `updated` `paymentrecorded` `creditapplied` `taxid` `regid` `submittedby` `approvedby` `terms`

### Purchases / Bills
`supplier` `ref` `status` `approval` `currency` `tag` `id` `amount` `balance` `paid` `date` `duedate` `created` `lastpayment` `submitted` `approved` `updated` `paymentrecorded` `creditapplied` `taxid` `regid` `submittedby` `approvedby` `terms`

### Credit Notes (Sale)
`customer` `ref` `status` `approval` `currency` `tag` `id` `amount` `balance` `paid` `date` `created` `submitted` `approved` `lastpayment` `taxid`

### Credit Notes (Purchase)
`supplier` `ref` `status` `approval` `currency` `tag` `id` `amount` `balance` `date` `created` `submitted` `approved` `lastpayment` `taxid`

### Payments
`customer` `ref` `status` `method` `currency` `id` `amount` `date` `created`

### Journals
`contact` `ref` `type` `status` `tag` `id` `debit` `credit` `date` `created` `notes`

### Cashflow / Bank Entries
`description` `payee` `ref` `status` `review` `id` `amount` `date`

### Contacts
`name` `email` `status` `registration` `taxid` `customer` `supplier` `id`

### Items / Products
`name` `sku` `status` `type` `id`

---

## Complex Query Examples

```
# Find overdue invoices from Sakura above $5,000
customer:sakura AND status:overdue AND $5000+

# Find all SGD transactions in January 2025
currency:SGD AND date:jan 2025

# Find paid or partially paid invoices in the last 30 days
(status:paid OR status:partial) AND date:-30d

# Find invoices with reference starting with INV- and balance > 0
ref:INV-* AND balance:>0

# Exclude voided transactions, sort by amount descending
NOT status:void sort:amount:desc

# Find negative journal entries in a date range
$-1000 to -5000 AND date:feb-mar 2025

# Find all unpaid purchases from a specific supplier in EUR
supplier:acme AND status:unpaid AND currency:EUR

# Find transactions submitted by a specific user this quarter
submittedby:usr-abc AND date:this quarter

# Find contacts with a specific tax ID
taxid:T1234567

# Find all transactions with balance > 0 and due before today
balance:>0 AND duedate:<2026-03-15
```
