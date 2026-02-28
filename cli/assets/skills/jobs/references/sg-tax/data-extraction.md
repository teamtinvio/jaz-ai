# Data Extraction for SG CIT Computation

Step-by-step guide to extracting the data you need from the Jaz API to build the `SgFormCsInput` JSON for `clio jobs statutory-filing sg-cs`. Each phase pulls specific data and maps it to input fields.

**CLI:** `clio jobs statutory-filing sg-cs --input tax-data.json --json`

---

## Before You Start

**Confirm the basis period.** The financial year determines which date ranges to use for every API call. Ask the user:
- "What is your financial year-end?" (most SG companies: 31 December)
- "What Year of Assessment are we computing for?"

**Example:** YA 2026 with a Dec year-end means basis period = 1 Jan 2025 to 31 Dec 2025.

**All API calls assume:**
- `Authorization: Bearer <token>` header
- `x-api-key: <key>` header
- Base URL from the organization's Jaz instance
- All dates in `YYYY-MM-DD` format

---

## Phase 1: Organization Context

### Step 1: Get organization details

```
GET /api/v1/organization
```

**What to extract:**

| Response Field | Maps To | Purpose |
|---------------|---------|---------|
| `data.currency` | `currency` input field | Confirm it is `SGD`. If not, FX considerations apply. |
| `data.name` | Display only | Company name for the workpaper header |
| `data.resourceId` | Internal reference | Needed for subsequent API calls |

**Tip:** If the response `currency` is not SGD, the company may have multi-currency transactions. All tax computation must be in SGD — ensure all amounts are converted before feeding into the CLI.

### Step 2: Confirm financial year dates

The Jaz API does not expose financial year settings directly. Confirm the basis period dates with the user:

```
Input fields:
  basisPeriodStart: "2025-01-01"
  basisPeriodEnd:   "2025-12-31"
  ya:               2026
```

---

## Phase 2: Profit & Loss Report

The P&L provides the two most important input fields: `revenue` and `accountingProfit`.

### Step 3: Generate P&L for the basis period

```
POST /api/v1/generate-reports/profit-and-loss
{
  "primarySnapshotDate": "2025-12-31",
  "secondarySnapshotDate": "2025-01-01"
}
```

**What to extract:**

| P&L Line | Maps To | Notes |
|----------|---------|-------|
| Total Revenue / Total Income | `revenue` | Top line — used for C-S eligibility check |
| Net Profit / (Loss) | `accountingProfit` | Bottom line — starting point for tax computation. Use negative for a loss. |
| Depreciation Expense | `addBacks.depreciation` | Always add back — first pass estimate before drilling into GL |
| Interest Expense | Review for `addBacks.leaseInterest` | Only the IFRS 16 lease interest portion |
| Other Expense lines | Scan for add-back candidates | Entertainment, donations, penalties, FX losses |
| Dividend Income | `addBacks.exemptDividends` | SG one-tier dividends are exempt |
| Interest Income | Review for taxability | Usually taxable under Section 10(1)(d) |

**Important:** The P&L gives you summary totals. For add-back classification, you need transaction-level detail from the General Ledger (Phase 5). Use the P&L as a roadmap — identify which account lines need drill-down.

### Step 4: Export P&L for records (optional)

```
POST /api/v1/data-exports/profit-and-loss
{
  "startDate": "2025-01-01",
  "endDate": "2025-12-31"
}
```

**Note:** The data export endpoint uses `startDate`/`endDate` field names, not the `primarySnapshotDate`/`secondarySnapshotDate` used by the report generator.

---

## Phase 3: Trial Balance

The trial balance provides a cross-reference point and catches items that might not appear clearly on the P&L.

### Step 5: Generate trial balance

```
POST /api/v1/generate-reports/trial-balance
{
  "startDate": "2025-01-01",
  "endDate": "2025-12-31"
}
```

**What to check:**

| TB Account | Purpose |
|-----------|---------|
| Depreciation Expense | Must match P&L depreciation. If different, investigate. |
| Accumulated Depreciation | Cross-reference to FA register (Phase 4) |
| Provision accounts (ECL, warranty, restructuring) | Identify general provisions for add-back |
| Unrealized FX Gain/Loss | May need to add back unrealized FX loss and deduct unrealized FX gain |
| Donation accounts | Identify IPC donations for 250% claim |
| Penalty/Fine accounts | Non-deductible — always add back |

**Tip:** Look for balance sheet accounts with P&L impact — provisions that increased during the year indicate a general provision expense that may need to be added back.

---

## Phase 4: Fixed Asset Summary

Fixed assets drive two key tax adjustments: depreciation add-back and capital allowance claims.

### Step 6: Get FA summary

```
POST /api/v1/generate-reports/fixed-assets-summary
```

**What to extract:**

| FA Data | Maps To | Notes |
|---------|---------|-------|
| Total depreciation charge for the period | `addBacks.depreciation` | Verify this matches the P&L depreciation line |
| Asset list with cost, type, useful life | `capitalAllowances.assets[]` | Each asset needs classification by CA category |
| Net book value per asset | Reference only | For the tax working paper |

### Step 7: Get FA reconciliation (movements)

```
POST /api/v1/generate-reports/fixed-assets-recon-summary
```

This shows opening NBV, additions, disposals, depreciation, and closing NBV. Use the depreciation figure to confirm the P&L charge.

### Step 8: Search fixed assets for per-item detail

```
POST /api/v1/fixed-assets/search
{
  "filter": { "status": { "eq": "ACTIVE" } },
  "sort": { "sortBy": ["purchaseDate"], "order": "ASC" },
  "limit": 1000
}
```

**What to extract per asset:**

| FA Field | Maps To (`CaAsset`) | Notes |
|----------|---------------------|-------|
| `name` | `description` | Asset description |
| `purchaseAmount` | `cost` | Original cost |
| `purchaseDate` | `acquisitionDate` | Date acquired |
| `typeName` | Used to determine `category` | Map to: computer, automation, low-value, general, ip, renovation |
| Prior years CA | `priorYearsClaimed` | User must provide — not stored in Jaz |

**Mapping asset types to CA categories:** See `capital-allowances-guide.md` for the full classification guide. The key question for each asset: "Which ITA section applies?"

---

## Phase 5: General Ledger Drill-Down

The GL provides transaction-level detail for accounts that need add-back classification. Do NOT pull the entire GL — target specific accounts identified in Phase 2.

### Step 9: Drill into specific accounts

```
POST /api/v1/generate-reports/general-ledger
{
  "startDate": "2025-01-01",
  "endDate": "2025-12-31",
  "groupBy": "ACCOUNT"
}
```

**Target these account categories:**

| GL Account Keywords | Add-Back Category | What to Look For |
|--------------------|--------------------|------------------|
| "Depreciation", "Amortization" | `depreciation`, `amortization` | Full amount — always add back |
| "Right-of-Use", "ROU" | `rouDepreciation` | IFRS 16 lease depreciation |
| "Lease Interest", "Lease Liability" | `leaseInterest` | IFRS 16 interest on lease liability |
| "Provision", "ECL", "Allowance" | `generalProvisions` | Only general (estimated) provisions — not specific write-offs |
| "Donation" | `donations` | Confirm if to approved IPC recipients |
| "Entertainment", "Meals" | `entertainment` | Non-deductible portion only |
| "Penalty", "Fine", "Surcharge" | `penalties` | Always non-deductible |
| "Motor Vehicle", "Car", "Parking" | `privateCar` | Only S-plated vehicles |
| "Unrealized", "FX", "Foreign Exchange" | `unrealizedFxLoss` / `deductions.unrealizedFxGain` | Separate gains from losses |
| "Dividend Income" | `exemptDividends` | SG one-tier dividends only |

**Tip:** For large GLs, you may need to paginate. Check the response for pagination metadata and follow up with offset/limit parameters.

### Step 10: Search for capital items on P&L

Look for large one-off expenses that might be capital in nature but were expensed on the P&L:

```
POST /api/v1/generate-reports/general-ledger
{
  "startDate": "2025-01-01",
  "endDate": "2025-12-31",
  "groupBy": "ACCOUNT"
}
```

Review expense accounts like "Miscellaneous Expenses", "Office Expenses", "Repairs & Maintenance" for items that:
- Exceed $5,000 in a single transaction
- Describe a new asset (e.g., "Purchase of air-conditioning unit")
- Improve or extend the useful life of an existing asset

These should be added back via `addBacks.capitalExpOnPnl` and may qualify for capital allowances.

---

## Phase 6: Transaction Search for Specific Items

For specific line items that need verification, use the transaction search endpoints.

### Step 11: Search invoices for revenue verification

```
POST /api/v1/invoices/search
{
  "filter": {
    "status": { "eq": "UNPAID" },
    "valueDate": { "between": ["2025-01-01", "2025-12-31"] }
  },
  "sort": { "sortBy": ["valueDate"], "order": "ASC" },
  "limit": 1000
}
```

Use this to verify the `revenue` figure if the P&L total seems inconsistent with invoice volume.

### Step 12: Search journals for specific adjustments

```
POST /api/v1/journals/search
{
  "filter": {
    "valueDate": { "between": ["2025-01-01", "2025-12-31"] }
  },
  "sort": { "sortBy": ["valueDate"], "order": "ASC" },
  "limit": 1000
}
```

Manual journal entries often contain year-end adjustments (provisions, accruals, write-offs) that are relevant to add-back classification.

### Step 13: Search for FX transactions

```
POST /api/v1/cashflow-transactions/search
{
  "filter": {
    "businessTransactionType": { "eq": "FX_REVALUATION" },
    "valueDate": { "between": ["2025-01-01", "2025-12-31"] }
  },
  "sort": { "sortBy": ["valueDate"], "order": "ASC" },
  "limit": 1000
}
```

FX revaluation journals create unrealized gains and losses. The loss portion maps to `addBacks.unrealizedFxLoss` and the gain portion maps to `deductions.unrealizedFxGain`.

---

## Handling Pagination

All search endpoints support pagination. The standard pattern:

```json
{
  "limit": 1000,
  "offset": 0
}
```

**Check the response metadata:**
- If `totalCount` exceeds your `limit`, make additional requests incrementing `offset` by `limit`
- Always aggregate totals across all pages before mapping to input fields
- Do not assume a single page contains all results

---

## Building the Input JSON

After completing all phases, assemble the `SgFormCsInput`:

```json
{
  "ya": 2026,
  "basisPeriodStart": "2025-01-01",
  "basisPeriodEnd": "2025-12-31",
  "currency": "SGD",
  "revenue": 1200000.00,
  "accountingProfit": 180000.00,
  "addBacks": {
    "depreciation": 45000.00,
    "amortization": 0.00,
    "rouDepreciation": 12000.00,
    "leaseInterest": 3500.00,
    "generalProvisions": 8000.00,
    "donations": 5000.00,
    "entertainment": 3200.00,
    "penalties": 500.00,
    "privateCar": 6000.00,
    "capitalExpOnPnl": 0.00,
    "unrealizedFxLoss": 2800.00,
    "exemptDividends": 10000.00,
    "otherNonDeductible": 0.00
  },
  "deductions": {
    "actualLeasePayments": 14400.00,
    "unrealizedFxGain": 1500.00,
    "exemptIncome": 10000.00,
    "otherDeductions": 0.00
  },
  "capitalAllowances": {
    "currentYearClaim": 52000.00,
    "balanceBroughtForward": 0.00,
    "assets": [
      {
        "description": "MacBook Pro M3",
        "cost": 4500.00,
        "acquisitionDate": "2025-03-15",
        "category": "computer",
        "priorYearsClaimed": 0
      },
      {
        "description": "Office Renovation",
        "cost": 85000.00,
        "acquisitionDate": "2024-06-01",
        "category": "renovation",
        "priorYearsClaimed": 28333.33
      }
    ]
  },
  "enhancedDeductions": {
    "rdExpenditure": 0.00,
    "rdMultiplier": 2.5,
    "ipRegistration": 0.00,
    "ipMultiplier": 2.0,
    "donations250Base": 5000.00,
    "s14qRenovation": 0.00
  },
  "losses": {
    "broughtForward": 0.00
  },
  "donationsCarryForward": {
    "broughtForward": 0.00
  },
  "exemptionType": "pte"
}
```

---

## Data Extraction Checklist

| # | Step | Phase | API Endpoint | Input Fields Populated |
|---|------|-------|-------------|----------------------|
| 1 | Organization context | Org | `GET /organization` | `currency` |
| 2 | Confirm FY dates | Org | User-provided | `ya`, `basisPeriodStart`, `basisPeriodEnd` |
| 3 | P&L report | P&L | `POST /generate-reports/profit-and-loss` | `revenue`, `accountingProfit`, initial add-back estimates |
| 4 | P&L export | P&L | `POST /data-exports/profit-and-loss` | Working paper backup |
| 5 | Trial balance | TB | `POST /generate-reports/trial-balance` | Cross-reference all amounts |
| 6 | FA summary | FA | `POST /generate-reports/fixed-assets-summary` | `addBacks.depreciation` verification |
| 7 | FA reconciliation | FA | `POST /generate-reports/fixed-assets-recon-summary` | Depreciation charge confirmation |
| 8 | FA search | FA | `POST /fixed-assets/search` | `capitalAllowances.assets[]` |
| 9 | GL drill-down | GL | `POST /generate-reports/general-ledger` | All `addBacks.*` and `deductions.*` fields |
| 10 | Capital items on P&L | GL | `POST /generate-reports/general-ledger` | `addBacks.capitalExpOnPnl` |
| 11 | Invoice search | Txn | `POST /invoices/search` | `revenue` verification |
| 12 | Journal search | Txn | `POST /journals/search` | Year-end adjustment review |
| 13 | FX transactions | Txn | `POST /cashflow-transactions/search` | `addBacks.unrealizedFxLoss`, `deductions.unrealizedFxGain` |

---

## Practitioner Tips

**Work top-down.** Start with the P&L summary (Phase 2) to identify which accounts are material. Only drill into the GL (Phase 5) for accounts that need classification. For a typical SMB with 20-30 expense accounts, you will drill into 5-8 accounts.

**Depreciation is the easiest add-back.** Get it from the FA summary (Phase 4), verify it matches the P&L. This single item is often the largest add-back and requires zero judgment.

**Ask the user for carry-forwards.** The Jaz API does not store prior-year tax computation data. You MUST ask: "Do you have any unabsorbed losses, capital allowances, or donations brought forward from previous YAs?" If they have a prior-year Form C-S or tax computation, the carry-forward figures are on that document.

**IFRS 16 is a common gotcha.** If the company has operating leases accounted for under IFRS 16, the P&L will show ROU depreciation and lease interest instead of the actual lease payments. For tax purposes: add back the ROU depreciation (`addBacks.rouDepreciation`) and lease interest (`addBacks.leaseInterest`), then deduct the actual lease payments (`deductions.actualLeasePayments`). Ask: "Do you have any operating leases (office, equipment) accounted for under IFRS 16?"

**Currency matters.** If the company's base currency in Jaz is SGD, all report figures are already in SGD. If the base currency is different (e.g., USD for a holding company), every amount must be converted to SGD at the appropriate exchange rate before building the input JSON.

**Do not over-extract.** Pulling every single transaction is unnecessary and slow. The phased approach (P&L summary first, then targeted GL drill-down) is faster and produces the same result. Only go to Phase 6 (transaction search) if Phases 2-5 leave ambiguity.
