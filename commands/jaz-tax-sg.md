---
description: "Run Singapore Form C-S / C-S Lite corporate income tax computation using Jaz data — pull P&L, classify add-backs, compute capital allowances, apply exemptions"
argument-hint: "<YA year> [--revenue amount] [--profit amount]"
---

# Singapore Tax Computation (Form C-S)

Execute the SG Form C-S tax computation via `clio jobs statutory-filing sg-cs`. Pulls data from Jaz, classifies GL items, and computes tax payable.

## Usage

```
/jaz-tax-sg YA 2026
/jaz-tax-sg 2026 revenue 3M profit 500K
```

## Workflow

### 1. Pull financial data from Jaz

```bash
clio reports generate profit-loss --from 2025-01-01 --to 2025-12-31 --json
clio reports generate trial-balance --to 2025-12-31 --json
```

### 2. Classify GL items

The wizard workflow (in the jaz-jobs skill reference files) guides you through:
- Identifying non-deductible expenses (add-backs): entertainment, depreciation, donations, fines
- Identifying non-taxable income (deductions): exempt dividends, gains on disposal
- Capital allowance computation for fixed assets

### 3. Run the computation

**Simple mode (manual flags):**

```bash
clio jobs statutory-filing sg-cs \
  --ya 2026 \
  --revenue 3000000 \
  --profit 500000 \
  --depreciation 50000 \
  --exemption pte \
  --json
```

**Full mode (structured input):**

```bash
echo '{
  "ya": 2026,
  "revenue": 3000000,
  "adjustedProfit": 500000,
  "addBacks": {"depreciation": 50000, "entertainment": 5000},
  "capitalAllowances": 35000,
  "exemptionScheme": "pte"
}' | clio jobs statutory-filing sg-cs --input - --json
```

### 4. Capital allowance schedule (standalone)

```bash
clio jobs statutory-filing sg-ca \
  --ya 2026 \
  --cost 50000 \
  --category general \
  --acquired 2024-06-15 \
  --json
```

### 5. Review output

The computation produces:
- Form C-S field values (18 fields for C-S, 6 for C-S Lite)
- Workpaper with add-back details
- Capital allowance schedule
- Carry-forward amounts (losses, CA, donations)

## Key Rules

- YA (Year of Assessment) = FY + 1 (e.g., FY 2025 → YA 2026)
- Form C-S eligibility: revenue ≤ $5M, no capital gains, no loss carry-back
- Form C-S Lite: revenue ≤ $200K (simplified, 6 fields)
- CIT rate: 17% flat
- Exemption schemes: `pte` (partial tax exemption) or `sute` (start-up tax exemption, first 3 YAs)
- Tax reference files are in the jaz-jobs skill: `references/sg-tax/`
