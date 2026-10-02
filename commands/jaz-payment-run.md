---
description: "Run a batch payment processing workflow in Jaz: select outstanding bills by due date, process payments in bulk"
argument-hint: "[--due-before YYYY-MM-DD]"
---

# Payment Run

Run the payment run playbook from the jaz-jobs skill (`references/payment-run.md`). Identifies outstanding bills and processes payments.

## Usage

```
/jaz-payment-run due before 2025-02-28
/jaz-payment-run all overdue bills
```

## Workflow

### 1. Open the playbook

The steps are in the jaz-jobs skill: `references/payment-run.md`. Read it first and walk its steps in order.

### 2. Review outstanding bills

```bash
clio jobs payment-run outstanding --due-before 2025-02-28 --json
```

Lists all unpaid bills due on or before the date, grouped by supplier. Add `--supplier <name>` or `--currency <code>` to narrow.

### 3. Confirm payment list

Present the list to the user for approval. They may want to exclude certain bills or adjust amounts.

### 4. Process payments

For each approved bill:

```bash
clio bills pay "<billResourceId>" \
  --amount <amount> \
  --account "DBS Current" \
  --date "2025-02-15" \
  --method BANK_TRANSFER \
  --json
```

### 5. Summary

Report: total bills paid, total amount, by supplier.

## Key Rules

- `--due-before` filters bills with due date on or before the specified date
- Payment method defaults to `BANK_TRANSFER`
- For FX bills, use `--transaction-amount` for the bill currency amount
- Always confirm the payment list with the user before executing
