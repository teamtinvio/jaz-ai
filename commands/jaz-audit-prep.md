---
description: "Compile an audit preparation pack in Jaz: generate reports, schedules, and reconciliations for auditor or tax agent"
argument-hint: "<period YYYY>"
---

# Audit Preparation

Run the audit prep playbook from the jaz-jobs skill (`references/audit-prep.md`). Generates a comprehensive pack of reports and schedules.

## Usage

```
/jaz-audit-prep 2025
/jaz-audit-prep 2024 for tax filing
```

## Workflow

### 1. Open the playbook

The steps are in the jaz-jobs skill: `references/audit-prep.md`. Read it first and walk its steps in order; it names the exact tool or command for each one.

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

The playbook lists the additional schedules needed:
- Fixed asset register and depreciation schedule
- Loan and lease schedules (recompute with `clio calc loan` / `clio calc lease`)
- Prepaid and accrual schedules
- Intercompany balances
- Bank reconciliation at year-end

### 4. Compile and present

Organize outputs for the auditor. Flag any items that need user confirmation or additional documentation.

## Key Rules

- Report date fields vary: trial-balance uses `endDate`, balance-sheet uses `primarySnapshotDate`, P&L uses `startDate`/`endDate`; the CLI handles this, just use `--from`/`--to`
- Audit prep is typically for a full fiscal year
- Some schedules cover transactions grouped in capsules; list capsules with `clio capsules list --json`
