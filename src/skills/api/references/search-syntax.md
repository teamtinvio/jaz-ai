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
| `-$500` | same as above (negative before currency) |
| `$100-500` | amount between 100 and 500 |
| `$100 to 500` | same as above |
| `$500 to $1000` | range with currency on both sides |
| `$-500 to -100` | negative range |
| `-$4000 to -$6000` | negative range with currency |
| `$-100 - -500` | negative range (space-hyphen-space) |
| `$500+` | amount >= 500 |
| `$<200` | amount < 200 |
| `$>=1000` | amount >= 1000 |
| `100-500` | amount range (no symbol needed for ranges) |
| `>500` | amount > 500 (no symbol needed for comparisons) |
| `500+` | amount >= 500 (no symbol needed) |

### Magnitude Suffixes

Use shorthand for large numbers. Case-insensitive.

| Suffix | Aliases | Multiplier | Example |
|--------|---------|-----------|---------|
| `k` | k | 1,000 | `$5k` = 5,000 |
| `m` | m, mn, mm, mil | 1,000,000 | `4.5m` = 4,500,000 |
| `b` | b, bn, bil | 1,000,000,000 | `$1b` = 1,000,000,000 |
| `t` | t, tn, trn | 1,000,000,000,000 | `1trn` = 1,000,000,000,000 |

Works everywhere: `$5k`, `5k+`, `>2m`, `4k-5k`, `$4k to $5k`, `amount:5k+`, `amount:>2m`

### Field:Value Amount Syntax

Use `amount:` prefix for explicit field targeting. Supports currency, suffixes, and `to` ranges.

| Input | Meaning |
|-------|---------|
| `amount:500` | amount = 500 |
| `amount:$500` | same (currency stripped) |
| `amount:-$80000` | amount = -80000 |
| `amount:100-500` | amount between 100 and 500 |
| `amount:4k-5k` | amount between 4000 and 5000 |
| `amount:-4000 to -6000` | amount between -6000 and -4000 |
| `amount:5k+` | amount >= 5000 |
| `amount:>2m` | amount > 2,000,000 |

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
| `date:tomorrow` | tomorrow |
| `date:2 days ago` | 2 days ago |
| `date:this week` | current week (Mon-Sun) |
| `date:last week` | previous week |
| `date:next week` | next week |
| `date:this month` | current month |
| `date:last month` | previous month |
| `date:next month` | next month |
| `date:this quarter` | current quarter |
| `date:last quarter` | previous quarter |
| `date:next quarter` | next quarter |
| `date:this year` | current year |
| `date:last year` | previous year |
| `date:next year` | next year |
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
| `date:next 7 days` | next 7 days from today |
| `date:next 30 days` | next 30 days from today |

### Due Date Semantics

| Input | Meaning |
|-------|---------|
| `due:overdue` | due date before today (past due) |
| `due:past` | same as overdue |
| `due:upcoming` | due in the next 30 days |
| `due:tomorrow` | due tomorrow |
| `due:next 7 days` | due within next 7 days |
| `due:next 30 days` | due within next 30 days |
| `due:this week` | due this week |

### Commas in Amounts

Commas are stripped from amounts: `$1,000` = 1000, `$1,000,000` = 1000000, `$1,000+` = gte 1000

Date field aliases: `due:` (due date), `created:` (created date), `updated:` / `modified:` (updated date), `submitted:` (submitted date), `approved:` (approved date), `lastpayment:` (last payment date)

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

## Boolean Search

Some fields accept yes/no values (e.g. `hasattachment`, `customer`, `supplier`).

| Input | Meaning |
|-------|---------|
| `hasattachment:yes` | has attachments |
| `hasattachment:no` | no attachments |
| `!hasattachment:yes` | no attachments (negated) |
| `attachmentfilename:report` | attachment file name contains "report" |

Accepted truthy values: `yes`, `true`, `y`, `1`. Accepted falsy values: `no`, `false`, `n`, `0`.

---

## Absolute Value Search

Filter by amount magnitude regardless of sign. Useful for cashflow, bank records, and journals with mixed debit/credit amounts.

| Input | Meaning |
|-------|---------|
| `abs:500` | amount = 500 OR amount = -500 |
| `abs:>=500` | amount >= 500 OR amount <= -500 |
| `abs:500+` | same as above |
| `abs:>500` | amount > 500 OR amount < -500 |
| `abs:<100` | amount < 100 OR amount > -100 |
| `abs:100-500` | amount between 100-500 OR between -500 and -100 |
| `abs:$5k+` | currency symbols and suffixes work |
| `!abs:500` | amount != 500 AND amount != -500 |

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
`customer` `ref` `status` `approval` `currency` `tag` `id` `amount` `balance` `paid` `date` `duedate` `createdat` `lastpayment` `submitted` `approved` `updatedat` `paymentrecorded` `creditapplied` `taxid` `regid` `submittedby` `approvedby` `terms` `hasattachment` `attachmentfilename` `saleorderresourceid` `saleresourceid` `lastemail` `changesrequested`

Status values: `unpaid` `paid` `partial` `void` `draft` `overdue`
Approval values: `pending` `approved`
Aliases: `invoicedate:` = `date:`, `billref:` / `invoiceref:` = `ref:`

### Sale Line Items
`amount` `price` `qty` `currency` `name` `desc` `sku` `id` `discount` `taxrate` `account` `accountcode` `customer` `status` `ref` `date` `createdat`

### Purchases / Bills
`supplier` `ref` `status` `approval` `currency` `tag` `id` `amount` `balance` `paid` `date` `duedate` `createdat` `lastpayment` `submitted` `approved` `updatedat` `paymentrecorded` `creditapplied` `taxid` `regid` `submittedby` `approvedby` `terms` `hasattachment` `attachmentfilename` `purchaseorderresourceid` `purchaseresourceid` `changesrequested`

Status values: `unpaid` `paid` `partial` `void` `draft` `overdue`
Aliases: `billdate:` = `date:`, `vendor:` = `supplier:`

### Purchase Line Items
`amount` `price` `qty` `currency` `name` `desc` `sku` `id` `discount` `taxrate` `account` `accountcode` `supplier` `status` `ref` `date` `createdat`

### Billable Items
`id` `status` `item` `desc` `amount` `currency` `assigned` `billed` `account` `accountcode` `customer` `createdat` `supplier` `ref` `date`

### Credit Notes (Sale)
`customer` `ref` `status` `approval` `currency` `tag` `id` `amount` `paid` `date` `createdat` `submitted` `approved` `lastpayment` `taxid` `hasattachment` `lastemail` `changesrequested`

Status values: `unpaid` `paid` `partial` `void` `draft`

### Credit Notes (Purchase)
`supplier` `ref` `status` `approval` `currency` `tag` `id` `amount` `paid` `date` `createdat` `submitted` `approved` `lastpayment` `taxid` `hasattachment` `changesrequested`

Status values: `unpaid` `paid` `partial` `void` `draft`

### Credit Note Line Items (Sale / Purchase)
`amount` `price` `qty` `currency` `name` `desc` `sku` `id` `discount` `taxrate` `account` `accountcode` `createdat`

### Payments
`customer` `ref` `method` `currency` `id` `amount` `date` `createdat` `status` `taxid` `paymentcurrency` `hasattachment`

Sale payments (default). Aliases: `paymentmethod:` = `method:`, `paymentdate:` / `valuedate:` = `date:`, `curr:` = `currency:`, `contact:` = `customer:`

For purchase payments: use `supplier:` / `vendor:` instead of `customer:`.
For batch payments: use `contact:` (matches `customer:` and `supplier:`); amount field → `totalAmount`.

### Payments Due
`amount` `ref` `contact` `currency` `date` `createdat` `tag` `type` `status` `total` `taxid`

Aliases: `balance:` = `amount:`, `reference:` = `ref:`, `customer:` / `supplier:` = `contact:`, `curr:` = `currency:`, `valuedate:` = `date:`, `transactiontype:` = `type:`

### Journals
`contact` `ref` `type` `status` `tag` `id` `debit` `credit` `date` `createdat` `notes`

Status values: `active` `void` `draft`
Type values: `manual` `system` `recurring`
Aliases: `journaltype:` = `type:`, `customer:` / `supplier:` = `contact:`, `amount:` = `debit:`, `internalnotes:` = `notes:`

### Journal Entry Lines
`amount` `currency` `desc` `id` `contact` `ref` `status` `date`

Aliases: `debit:` / `credit:` = `amount:`, `curr:` = `currency:`, `description:` / `notes:` = `desc:`, `customer:` / `supplier:` = `contact:`, `reference:` = `ref:`, `valuedate:` = `date:`

### Cashflow / Bank Records / Bank Entries
`description` `payee` / `payer` `ref` `status` `review` `id` `amount` `date`

Status values: `unreconciled` `reconciled` `excluded`
Review values: `reviewed` `unreviewed`
Aliases: `desc:` = `description:`, `contact:` / `extcontactname:` = `payee:`, `reference:` / `extreference:` = `ref:`, `netamount:` = `amount:`, `valuedate:` = `date:`, `reviewstate:` = `review:`

### Cash Entries
`status` `ref` `contact` `currency` `amount` `date` `createdat` `id`

Status values: `active` `void`
Aliases: `reference:` = `ref:`, `payee:` = `contact:`, `curr:` = `currency:`, `balance:` = `amount:`, `valuedate:` = `date:`

### Cash Entry Lines
`amount` `currency` `ref` `type` `contact` `date` `createdat` `tag` `id`

Aliases: `balance:` = `amount:`, `curr:` = `currency:`, `reference:` = `ref:`, `payee:` = `contact:`, `valuedate:` = `date:`

### Contacts
`name` `email` `status` `registration` `taxid` `customer` `supplier` `id`

Status values: `active` `inactive`
Boolean: `customer:yes` / `customer:no`, `supplier:yes` / `supplier:no`

### Items / Products
`name` `sku` `status` `id` `costing` `purchasename` `salename` `cogsaccount` `purchaseaccount` `saleaccount`

Status values: `active` `inactive`
Aliases: `item:` / `product:` = `name:`, `code:` = `sku:`

### Fixed Assets
`name` `ref` `status` `id` `amount` `date`

Status values: `registered` `disposed` `draft`
Aliases: `asset:` = `name:`, `reference:` = `ref:`, `price:` / `cost:` = `amount:`, `purchasedate:` = `date:`

### Disposal Assets
`name` `ref` `status` `id` `amount` `date` `type` `tag` `bookvalue` `gainloss`

Status values: `registered` `disposed` `draft`
Aliases: `asset:` = `name:`, `reference:` = `ref:`, `price:` / `cost:` = `amount:`, `disposaldate:` = `date:`, `purchasedate:` = purchase date (separate field), `netbook:` = `bookvalue:`, `gain:` / `loss:` = `gainloss:`

### Capsules / Capsule Transactions
`name` `ref` `status` `id` `date`

Aliases: `capsule:` = `name:`, `reference:` = `ref:`, `valuedate:` = `date:`

### Inventory Balance
`name` `sku` `id`

Aliases: `item:` = `name:`, `code:` = `sku:`

### Inventory Transactions
`ref` `type` `date` `id`

Aliases: `reference:` = `ref:`, `valuedate:` = `date:`

### Deposits / Deposit Balances
`status` `ref` `contact` `id` `amount` `date`

Aliases: `reference:` = `ref:`, `customer:` / `supplier:` = `contact:`, `total:` = `amount:`, `valuedate:` = `date:`

### Bank Accounts
`name` `code` `status` `currency` `id` `balance`

Status values: `active` `inactive`
Aliases: `account:` = `name:`, `curr:` = `currency:`, `amount:` = `balance:`

### Match Transactions (Bank Reconciliation)
`ref` `contact` `id` `amount` `balance` `date`

Aliases: `reference:` = `ref:`, `customer:` / `supplier:` / `payee:` = `contact:`, `total:` = `amount:`, `bal:` = `balance:`, `valuedate:` = `date:`

### Scheduled Transactions (Invoices / Bills / Subscriptions)
`contact` `customer` `supplier` `ref` `reference` `status` `currency` `curr` `id` `amount` `total` `date` `nextdate` (→ nextScheduleDate)

### Scheduled Journals
`contact` `customer` `supplier` `ref` `reference` `status` `tag` `tags` `interval` `id` `date` `start` `startdate` (→ startDate) `end` `enddate` `last` `lastdate`
NOTE: No amount fields — JournalSchedulerFilter has no BigDecimalExpression fields.

Interval values: `daily` `weekly` `monthly` `quarterly` `yearly` `onetime`

### Scheduled Line Items (Invoice / Bill / Subscription)
`name` `item` `desc` `description` `sku` `itemcode` `code` `contact` `customer` `supplier` `currency` `curr` `status` `ref` `reference` `date` `valuedate` (→ businessTransactionValueDate) `start` `startdate` `end` `enddate` `next` `nextdate`

Status values: `active` `completed` `cancelled`

### Journal Scheduler Line Items
`contact` `customer` `supplier` `desc` `description` `currency` `curr` `ref` `reference` `status` `date` `start` `startdate` (→ startDate) `end` `enddate` `next` `nextdate` `id`

### Mandate Batches (E-invoicing)
`name` `desc` `status` `mandate` `provider` `id` `startdate` `enddate` `createdat` `updatedat` `submissions`

Status values: `draft` `submitted` `accepted` `rejected` `cancelled`
Aliases: `batchname:` = `name:`, `mandatecode:` = `mandate:`, `providercode:` = `provider:`, `periodstart:` = `startdate:`, `periodend:` = `enddate:`, `count:` = `submissions:`

### Mandate Submissions (E-invoicing)
`ref` `contact` `type` `doctype` `direction` `status` `response` `id` `btid` `submittedat` `responseat` `workflowupdated` `mandate`

Direction values: `supply` `purchase`
Status values: `draft` `queued` `submitted` `accepted` `completed` `rejected` `cancelled` `failed`
Aliases: `bttype:` = `type:`, `documenttype:` = `doctype:`, `workflowstatus:` = `status:`, `responsestatus:` = `response:`, `btresourceid:` = `btid:`, `workflowupdatedat:` = `workflowupdated:`, `mandatecode:` = `mandate:`

### Sale Orders
`id` `ref` `date` `due` `approved` `currency` `amount` `customer` `regid` `taxid` `tag` `created` `status` `customfields`

### Sale Order Line Items
`id` `name` `currency` `amount` `customer` `status` `ref` `date`

### Sale Quotes
`id` `ref` `date` `due` `currency` `amount` `customer` `regid` `taxid` `tag` `created` `status` `customfields` `signing` `changesrequested`

### Sale Quote Line Items
`id` `name` `currency` `amount` `customer` `status` `ref` `date`

### Purchase Orders
`id` `ref` `date` `due` `approved` `currency` `amount` `supplier` `regid` `taxid` `tag` `created` `status` `customfields`

### Purchase Order Line Items
`id` `name` `currency` `amount` `supplier` `status` `ref` `date`

### Purchase Requests
`id` `ref` `date` `due` `currency` `amount` `supplier` `regid` `taxid` `tag` `created` `status` `customfields` `signing` `changesrequested`

### Purchase Request Line Items
`id` `name` `currency` `amount` `supplier` `status` `ref` `date`

### Employees / Directory
`id` `name` `email` `phone` `currency` `employmenttype` `beneficiary` `paymentmethod` `manager` `claimprofile` `created` `updated`

### Employees / Claims
`id` `ref` `currency` `date` `created` `amount` `employee` `vendor` `customfields` `hasattachment` `createdby` `changesrequested`

### Employees / Payouts
`employee` `ref` `type` `valuedate`

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

# Match transactions between $4k and $5k for reconciliation
amount:4k to 5k

# Find purchases over $2 million
supplier:acme AND amount:>2m

# Find all unpaid purchases from a specific supplier in EUR
supplier:acme AND status:unpaid AND currency:EUR

# Find transactions submitted by a specific user this quarter
submittedby:usr-abc AND date:this quarter

# Find contacts with a specific tax ID
taxid:T1234567

# Find all transactions with balance > 0 and due before today
balance:>0 AND duedate:<2026-03-15

# Find unreconciled bank entries above $1,000
status:unreconciled AND $1000+

# Find manual journals from this month
type:manual AND date:this month

# Find active items of type service
status:active AND type:service

# Find registered fixed assets purchased this year
status:registered AND date:this year

# Find batch e-invoice submissions that were rejected
status:rejected

# Find capsules with no reference
ref:blank
```
