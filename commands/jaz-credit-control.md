---
description: "Run credit control workflow in Jaz — review aged receivables, generate overdue chase list, assess bad debts"
argument-hint: "[--overdue-days 30]"
---

# Credit Control

Execute the credit control workflow via `clio jobs credit-control`. Reviews AR aging and generates a chase list.

## Usage

```
/jaz-credit-control overdue more than 30 days
/jaz-credit-control full AR review
```

## Workflow

### 1. Generate the blueprint

```bash
clio jobs credit-control --overdue-days 30 --json
```

### 2. Review aged receivables

```bash
clio reports generate aged-ar --to 2025-02-28 --json
```

The blueprint breaks down receivables by aging bucket: current, 1-30, 31-60, 61-90, 91+.

### 3. Generate chase list

The blueprint produces a prioritized list of overdue customers with:
- Contact details
- Invoice references and amounts
- Days overdue
- Suggested action (reminder, follow-up, escalation)

### 4. Assess bad debts

For severely overdue amounts, consider ECL provisioning:

```bash
clio calc ecl --current <amt> --30d <amt> --60d <amt> --90d <amt> --120d <amt> --rates 0.5,1,3,10,50 --json
```

### 5. Record provisions (if needed)

Post the provision journal with the same buckets and rates:

```bash
clio ct ecl --current <amt> --30d <amt> --60d <amt> --90d <amt> --120d <amt> --rates 0.5,1,3,10,50 \
  --existing-provision <amt> --start-date <YYYY-MM-DD> --plan --json
```

Review the plan output, then re-run without `--plan` to post. Entries are created as drafts unless you pass `--finalize`. Needs Bad Debt Expense and Allowance for Doubtful Debts accounts.

## Key Rules

- `--overdue-days` sets the threshold for the chase list (default: 30)
- AR aging report uses `aged-ar` report type
- ECL provisioning uses IFRS 9 simplified approach (5-bucket matrix)
- No `amountDue` field on invoices — check `paymentRecords` to determine remaining balance
