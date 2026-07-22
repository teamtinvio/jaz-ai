---
description: "Reconcile supplier statements against AP ledger in Jaz — identify mismatches, missing bills, timing differences"
argument-hint: "[--supplier <name>] [--period YYYY-MM]"
---

# Supplier Statement Reconciliation

Execute the supplier recon workflow via `clio jobs supplier-recon`. Compares your AP ledger to the supplier's statement.

## Usage

```
/jaz-supplier-recon "Acme Supplies" 2025-01
/jaz-supplier-recon all suppliers Q1
```

## Workflow

### 1. Generate the blueprint

```bash
clio jobs supplier-recon --supplier "Acme Supplies" --period 2025-01 --json
```

### 2. Pull AP data for the supplier

```bash
clio bills search --contact "Acme Supplies" --from 2025-01-01 --to 2025-01-31 --json
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
clio reports generate aged-ap --to 2025-01-31 --json
```

## Key Rules

- `--supplier` accepts supplier name (fuzzy matched)
- Supplier statements are external documents — user must provide them
- Common discrepancies: missing credit notes, FX rate differences, GST/tax differences
