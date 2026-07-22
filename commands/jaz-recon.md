---
description: "Run bank reconciliation in Jaz — match bank records to transactions, categorize unmatched items, resolve discrepancies"
argument-hint: "[bank account] [period YYYY-MM]"
---

# Bank Reconciliation

Execute the bank recon workflow via `clio jobs bank-recon`. Includes automated matching and manual resolution steps.

## Usage

```
/jaz-recon DBS Current 2025-01
/jaz-recon all accounts last month
```

## Workflow

### 1. Generate the blueprint

```bash
clio jobs bank-recon --account "DBS Current" --period 2025-01 --json
```

### 2. Import bank statement (if not already imported)

```bash
clio bank import --account "DBS Current" --file statement.csv --json
```

Or for OFX/QIF files, same command — format auto-detected.

### 3. Run automated matching

```bash
clio jobs bank-recon match --account "DBS Current" --json
```

The matcher uses a 5-phase cascade: 1:1 exact, N:1 group, 1:N split, N:M complex, fuzzy.

### 4. Review unmatched items

The blueprint lists unmatched bank records and book entries. For each:
- **Bank record with no book entry**: Create the missing transaction (invoice, bill, cash entry, journal)
- **Book entry with no bank record**: Verify timing — may match next period's statement
- **Partial matches**: Confirm and adjust

### 5. Verify

```bash
clio reports generate cash-balance --to 2025-01-31 --json
```

Compare closing balance per books vs bank statement.

## Key Rules

- `--account` accepts bank account name (fuzzy matched)
- Bank records are imported via `clio bank import` (CSV, OFX, QIF)
- The matcher runs offline — it suggests matches but doesn't auto-confirm
- Bank statement balance vs book balance difference = unreconciled items
