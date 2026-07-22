---
description: "Migrate accounting data to Jaz from Xero, QuickBooks, Sage, MYOB, or Excel — guided multi-step conversion workflow"
argument-hint: "<source system> [file path]"
---

# Data Migration

Guide the user through migrating accounting data to Jaz. This command loads the jaz-conversion skill and walks through the conversion workflow.

## Usage

```
/jaz-migrate from Xero export files
/jaz-migrate Excel spreadsheet at ~/Downloads/client-data.xlsx
/jaz-migrate QuickBooks Desktop backup
```

## Workflow

### 1. Identify source system

Supported sources: **Xero**, **QuickBooks Online**, **QuickBooks Desktop**, **Sage**, **MYOB**, **Excel/CSV**.

### 2. Load the conversion skill

The jaz-conversion skill (`/jaz-conversion`) contains detailed mapping guides for each source system. Load it for the full reference:
- `references/xero.md` — Xero export format and field mapping
- `references/quickbooks.md` — QBO/QBD export format and field mapping
- `references/sage.md` — Sage export format
- `references/excel.md` — Generic Excel/CSV mapping template

### 3. Follow the 3-phase workflow

**Phase 1 — Config conversion** (setup):
- Chart of accounts mapping (source account types → Jaz classification types)
- Contact mapping (customers + suppliers)
- Tax profile mapping (source tax codes → Jaz tax profiles)
- Item mapping (inventory items, services)
- Currency setup and opening rates

```bash
# Create accounts
clio accounts create --name "Sales Revenue" --type "Revenue" --json

# Create contacts
clio contacts create --name "Acme Corp" --customer --json

# Enable currencies (if multi-currency)
clio currencies add --code USD --json
```

**Phase 2 — Quick conversion** (balances only):
- Opening balances via trial balance journal
- Opening AR/AP via individual invoices/bills at conversion date

```bash
# Opening balance journal
clio journals create --date "2025-01-01" --ref "OB-001" --entries '[...]' --finalize --json
```

**Phase 3 — Full conversion** (historical transactions):
- Historical invoices, bills, payments, journals
- Bank transactions and reconciliation status

### 4. Verify with Trial Balance

```bash
clio reports generate trial-balance --to 2025-01-01 --json
```

Compare Jaz TB against source system TB. They should match.

## Key Rules

- Always map Chart of Accounts FIRST — everything else depends on account resourceIds
- Opening balances: use a single journal dated on conversion date (Day 1 in Jaz)
- Opening AR: create individual invoices (not journal entries) so they appear in AR aging
- Opening AP: create individual bills for the same reason
- Tax profiles are pre-existing in Jaz — map source tax codes to Jaz tax profiles, never create new ones
- The conversion skill has detailed field mapping tables for each source system
