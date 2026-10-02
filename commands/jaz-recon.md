---
description: "Run bank reconciliation in Jaz: match bank records to transactions, categorize unmatched items, resolve discrepancies"
argument-hint: "[bank account] [period YYYY-MM]"
---

# Bank Reconciliation

Run the bank recon playbook from the jaz-jobs skill (`references/bank-recon.md`). Includes automated matching and manual resolution steps.

## Usage

```
/jaz-recon DBS Current 2025-01
/jaz-recon all accounts last month
```

## Workflow

### 1. Open the playbook

The steps are in the jaz-jobs skill: `references/bank-recon.md`. Read it first and walk its steps in order; it names the exact tool or command for each one.

### 2. Import bank statement (if not already imported)

```bash
clio bank import --account "DBS Current" --file statement.csv --json
```

Or for OFX/QIF files, same command (format auto-detected).

### 3. Run automated matching

```bash
clio jobs bank-recon match --input bank-data.json --json
```

`--input` is a JSON file holding the unreconciled `bankRecords` and the candidate `transactions` (format in the jaz-jobs skill, `references/bank-match.md`). The matcher takes no `--account` flag: pull the account's records first (`clio bank records <bankAccountResourceId> --status UNRECONCILED --json`).

The matcher uses a 5-phase cascade: 1:1 exact, N:1 group, 1:N split, N:M complex, fuzzy.

### 4. Review unmatched items

The matcher output lists unmatched bank records and book entries. For each:
- **Bank record with no book entry**: Create the missing transaction (invoice, bill, cash entry, journal)
- **Book entry with no bank record**: Verify timing (may match next period's statement)
- **Partial matches**: Confirm and adjust

### 5. Verify

```bash
clio reports generate cash-balance --to 2025-01-31 --json
```

Compare closing balance per books vs bank statement.

## Key Rules

- `clio bank import --account` accepts the bank account name (fuzzy matched)
- Bank records are imported via `clio bank import` (CSV, OFX, QIF)
- The matcher runs offline; it suggests matches but doesn't auto-confirm
- Bank statement balance vs book balance difference = unreconciled items
