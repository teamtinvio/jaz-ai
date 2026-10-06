---
description: "Reconcile supplier statements against AP ledger in Jaz: identify mismatches, missing bills, timing differences"
argument-hint: "[--supplier <name>] [--period YYYY-MM]"
---

# Supplier Statement Reconciliation

Run the supplier recon playbook from the jaz-jobs skill (`references/supplier-recon.md`). Compares your AP ledger to the supplier's statement.

## Usage

```
/jaz-supplier-recon "Acme Supplies" 2025-01
/jaz-supplier-recon all suppliers Q1
```

## Workflow

### 1. Open the playbook

The steps are in the jaz-jobs skill: `references/supplier-recon.md`. Read it first and walk its steps in order; it names the exact tool or command for each one.

### 2. Pull AP data for the supplier

```bash
clio bills search --contact-name "Acme Supplies" --from 2025-01-01 --to 2025-01-31 --json
```

### 3. Compare against supplier statement

The user provides the supplier statement (PDF, email, or manually entered). Compare:
- Bills in Jaz vs items on supplier statement
- Amounts match vs discrepancies
- Items on statement not in Jaz (missing bills)
- Items in Jaz not on statement (timing differences or errors)

### 4. Resolve differences

- **Missing bills**: Create via `/jaz-bill`
- **Amount discrepancies**: Check tax, currency, credit notes
- **Timing differences**: Note for next period reconciliation

### 5. Generate aged AP for verification

```bash
clio reports generate aged-payables --to 2025-01-31 --json
```

## Key Rules

- `--contact-name` filters bills by supplier name
- Supplier statements are external documents; user must provide them
- Common discrepancies: missing credit notes, FX rate differences, GST/tax differences
