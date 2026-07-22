---
description: "Compile an audit preparation pack in Jaz — generate reports, schedules, and reconciliations for auditor or tax agent"
argument-hint: "<period YYYY>"
---

# Audit Preparation

Execute the audit prep workflow via `clio jobs audit-prep`. Generates a comprehensive pack of reports and schedules.

## Usage

```
/jaz-audit-prep 2025
/jaz-audit-prep 2024 for tax filing
```

## Workflow

### 1. Generate the blueprint

```bash
clio jobs audit-prep --period 2025 --json
```

### 2. Generate core reports

```bash
# Trial Balance
clio reports generate trial-balance --to 2025-12-31 --json

# Balance Sheet
clio reports generate balance-sheet --to 2025-12-31 --json

# Profit & Loss
clio reports generate profit-loss --from 2025-01-01 --to 2025-12-31 --json

# Cash Flow Statement
clio reports generate cashflow --from 2025-01-01 --to 2025-12-31 --json

# Aged AR
clio reports generate aged-ar --to 2025-12-31 --json

# Aged AP
clio reports generate aged-ap --to 2025-12-31 --json
```

### 3. Supporting schedules

The blueprint identifies additional schedules needed:
- Fixed asset register and depreciation schedule
- Loan and lease schedules (from capsule transactions)
- Prepaid and accrual schedules
- Intercompany balances
- Bank reconciliation at year-end

### 4. Compile and present

Organize outputs for the auditor. Flag any items that need user confirmation or additional documentation.

## Key Rules

- Report date fields vary: trial-balance uses `endDate`, balance-sheet uses `primarySnapshotDate`, P&L uses `startDate`/`endDate` — the CLI handles this, just use `--from`/`--to`
- Audit prep is typically for a full fiscal year
- Some schedules come from capsule transaction data — list capsules with `clio capsules list --json`
