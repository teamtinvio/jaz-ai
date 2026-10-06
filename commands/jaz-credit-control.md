---
description: "Run credit control workflow in Jaz: review aged receivables, generate overdue chase list, assess bad debts"
argument-hint: "[--overdue-days 30]"
---

# Credit Control

Run the credit control playbook from the jaz-jobs skill (`references/credit-control.md`). Reviews AR aging and generates a chase list.

## Usage

```
/jaz-credit-control overdue more than 30 days
/jaz-credit-control full AR review
```

## Workflow

### 1. Open the playbook

The steps are in the jaz-jobs skill: `references/credit-control.md`. Read it first and walk its steps in order; it names the exact tool or command for each one.

### 2. Review aged receivables

```bash
clio reports generate aged-receivables --to 2025-02-28 --json
```

The report breaks down receivables by aging bucket: current, 1-30, 31-60, 61-90, 91+.

### 3. Generate chase list

From the aging report, build a prioritized list of overdue customers (default threshold: 30 days overdue) with:
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

Re-run the calculator with `--existing-provision <amt>` to get the top-up (`adjustmentRequired`) and its journal lines. It posts nothing. Then book the top-up yourself:

```bash
clio capsules types --json
clio capsules create --type <capsuleTypeId> --title "ECL provision <period>" --json
clio journals create --input ecl-journal.json --json   # body: valueDate, journalEntries, capsuleResourceId
```

The journal is created as a draft unless you pass `--finalize`. Needs Bad Debt Expense and Allowance for Doubtful Debts accounts.

## Key Rules

- Aged Receivables uses the `aged-receivables` report type
- ECL provisioning uses IFRS 9 simplified approach (5-bucket matrix)
- No `amountDue` field on invoices; check `paymentRecords` to determine remaining balance
