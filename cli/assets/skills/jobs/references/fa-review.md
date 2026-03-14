# Fixed Asset Review

Review the fixed asset register for accuracy, identify assets requiring disposal or write-off, process disposals, and reconcile the register to the trial balance. This is a housekeeping job — ensuring the FA register reflects reality.

**CLI:** `clio jobs fa-review [--json]`

---

## When to Do This

- **Annually (minimum):** As part of year-end close or audit preparation
- **Quarterly:** For growing businesses that acquire assets frequently
- **Ad-hoc:** After a major event (office move, equipment upgrade, insurance claim)

---

## Phase 1: Take Stock

### Step 1: List all fixed assets

```
POST /api/v1/fixed-assets/search
{
  "filter": { "status": { "eq": "ACTIVE" } },
  "sort": { "sortBy": ["purchaseDate"], "order": "ASC" },
  "limit": 1000
}
```

**What you get:** Every active fixed asset with `name`, `purchaseDate`, `purchaseAmount`, `bookValueAmount`, `depreciationMethod`, `typeName`, and `status`.

### Step 2: List fixed asset types

```
POST /api/v1/fixed-assets-types/search
{
  "filter": {},
  "sort": { "sortBy": ["typeName"], "order": "ASC" },
  "limit": 100
}
```

Asset types define the default depreciation method and useful life. Common types for SMBs:

| Type | Typical Useful Life | Depreciation | Examples |
|------|-------------------|--------------|----------|
| **Office Equipment** | 5-7 years | Straight-line | Desks, chairs, shelving |
| **Computer Equipment** | 3-5 years | Straight-line or DDB | Laptops, servers, monitors |
| **Motor Vehicles** | 5-8 years | Straight-line | Delivery vans, company cars |
| **Furniture & Fittings** | 7-10 years | Straight-line | Reception area, meeting rooms |
| **Leasehold Improvements** | Lease term | Straight-line | Renovation, fit-out |
| **Plant & Machinery** | 5-15 years | Straight-line or DDB | Production equipment |
| **Software** | 3-5 years | Straight-line | Licensed software, ERP |

---

## Phase 2: Review

Work through the asset list and classify each asset.

### Step 3: Identify fully depreciated assets still in use

Search for assets where book value equals zero (or equals salvage value):

```
POST /api/v1/fixed-assets/search
{
  "filter": {
    "status": { "eq": "ACTIVE" },
    "bookValueAmount": { "eq": 0 }
  },
  "sort": { "sortBy": ["purchaseDate"], "order": "ASC" },
  "limit": 1000
}
```

**What to do:**
- If the asset is still in use → no action required. It stays on the register at zero NBV. No further depreciation is posted.
- If the asset is no longer in use → dispose (Phase 3)

**Note:** Fully depreciated assets still in use should be reviewed for impairment reversal under IAS 36 if their recoverable amount is significantly higher than carrying amount (zero). In practice, most SMBs don't reverse — the asset just sits at zero until disposal.

### Step 4: Identify assets no longer in use

This is a physical verification step — walk through the office/warehouse and compare the register to reality. Common findings:

- **Thrown away but not written off:** Old laptops, broken equipment disposed of without updating the register
- **Lost or stolen:** Equipment that can't be located
- **Returned under warranty:** Asset was replaced but the old entry wasn't removed
- **Sold informally:** Asset was sold (e.g., to an employee) but the sale wasn't recorded

**Flag these for disposal in Phase 3.**

### Step 5: Review depreciation methods

```
POST /api/v1/fixed-assets/search
{
  "filter": { "status": { "eq": "ACTIVE" } },
  "sort": { "sortBy": ["typeName"], "order": "ASC" },
  "limit": 1000
}
```

Group by asset type and verify:
- All assets of the same type use the same depreciation method (consistency principle)
- Useful lives are reasonable for the asset type
- No assets have an obviously wrong method (e.g., a building on 3-year straight-line)

**Conditional:** Only act on this if you find inconsistencies. Changing depreciation method mid-life is a change in accounting estimate (IAS 8) — apply prospectively, not retrospectively.

---

## Phase 3: Disposals

### Step 6: Sale disposals

When an asset is sold, record the disposal. The calculator computes accumulated depreciation to disposal date, net book value, and gain/loss.

**Calculator:** `clio calc asset-disposal`

```bash
clio calc asset-disposal --cost 50000 --salvage 5000 --life 5 --acquired 2022-01-01 --disposed 2025-06-15 --proceeds 12000
```

**Recipe:** `asset-disposal` — see `transaction-recipes/references/asset-disposal.md` for the full journal pattern.

Record the disposal journal:

```
POST /api/v1/journals
{
  "saveAsDraft": false,
  "reference": "FA-DISP-001",
  "valueDate": "2025-06-15",
  "journalEntries": [
    { "accountResourceId": "<bank-account-uuid>", "amount": 12000.00, "type": "DEBIT", "name": "Proceeds from sale of Delivery Van VH-1234" },
    { "accountResourceId": "<accumulated-depreciation-uuid>", "amount": 31500.00, "type": "DEBIT", "name": "Clear accumulated depreciation — Delivery Van VH-1234" },
    { "accountResourceId": "<loss-on-disposal-uuid>", "amount": 6500.00, "type": "DEBIT", "name": "Loss on disposal — Delivery Van VH-1234" },
    { "accountResourceId": "<fixed-asset-cost-uuid>", "amount": 50000.00, "type": "CREDIT", "name": "Remove cost — Delivery Van VH-1234" }
  ]
}
```

Then mark the asset as sold in the FA register:

```
POST /api/v1/mark-as-sold/fixed-assets
```

### Step 7: Scrap / write-off disposals

When an asset is scrapped (no sale proceeds), the full NBV becomes a loss.

**Calculator:**

```bash
clio calc asset-disposal --cost 50000 --salvage 5000 --life 5 --acquired 2022-01-01 --disposed 2025-06-15 --proceeds 0
```

Record the write-off journal:

```
POST /api/v1/journals
{
  "saveAsDraft": false,
  "reference": "FA-WRITEOFF-001",
  "valueDate": "2025-06-15",
  "journalEntries": [
    { "accountResourceId": "<accumulated-depreciation-uuid>", "amount": 31500.00, "type": "DEBIT", "name": "Clear accumulated depreciation — Old Server Rack" },
    { "accountResourceId": "<loss-on-disposal-uuid>", "amount": 18500.00, "type": "DEBIT", "name": "Write-off loss — Old Server Rack" },
    { "accountResourceId": "<fixed-asset-cost-uuid>", "amount": 50000.00, "type": "CREDIT", "name": "Remove cost — Old Server Rack" }
  ]
}
```

Then mark the asset as discarded:

```
POST /api/v1/discard-fixed-assets/{assetResourceId}
```

---

## Phase 4: Verification

### Step 8: FA register reconciliation

```
POST /api/v1/generate-reports/fixed-assets-summary
```

```
POST /api/v1/generate-reports/fixed-assets-recon-summary
```

The reconciliation report shows:

```
Opening NBV (start of period)
+ Additions (new assets acquired)
- Disposals (sold or scrapped)
- Depreciation (period charge)
= Closing NBV (end of period)
```

### Step 9: Reconcile to trial balance

```
POST /api/v1/generate-reports/trial-balance
{ "startDate": "2025-01-01", "endDate": "2025-12-31" }
```

**What must tie:**

| FA Register | Trial Balance Account |
|------------|----------------------|
| Total cost (all active assets) | Fixed Assets (at cost) — total of all FA cost accounts |
| Total accumulated depreciation | Accumulated Depreciation — total of all accum. dep. accounts |
| Closing NBV | Cost minus Accumulated Depreciation = Net Book Value |
| Period depreciation charge | Depreciation Expense on P&L |
| Gain/Loss on disposal | Other Income / Other Expense on P&L |

If the register and trial balance don't tie, investigate:
- Manual journal entries to FA accounts that bypassed the register
- FA register entries that didn't generate journals (system issue)
- Disposed assets not yet removed from the register

---

## FA Review Checklist (Quick Reference)

| # | Step | Phase | What |
|---|------|-------|------|
| 1 | List all fixed assets | Take stock | Search active assets |
| 2 | List asset types | Take stock | Review type definitions |
| 3 | Fully depreciated assets | Review | Identify NBV = 0 assets |
| 4 | Assets no longer in use | Review | Physical verification |
| 5 | Depreciation methods | Review | Consistency check |
| 6 | Sale disposals | Dispose | Calculator + journal + mark as sold |
| 7 | Scrap / write-off | Dispose | Calculator + journal + discard |
| 8 | FA register report | Verify | Reconciliation summary |
| 9 | Reconcile to trial balance | Verify | FA register = TB accounts |

---

## Tips for SMBs

**Keep a low-value asset threshold.** Items under $1,000 (or your chosen threshold) should be expensed immediately, not capitalized as fixed assets. This reduces register clutter and depreciation complexity. Common SG practice is $1,000-$5,000 depending on company size.

**Tag your assets.** Use physical asset tags (numbered stickers) and record the tag number as the asset reference in Jaz. This makes physical verification much faster.

**Review useful lives annually.** If your "3-year laptop" is still going strong at year 5, the useful life estimate was wrong. Adjust prospectively (IAS 8) — extend the remaining life and recalculate monthly depreciation.

**Depreciation for tax (SG-specific):**
- IRAS allows 1-year write-off for assets costing <= S$5,000 (Section 19A(10A))
- IRAS allows 3-year accelerated write-off for all other assets (Section 19A)
- Book depreciation (straight-line over useful life) and tax depreciation (accelerated) can differ — track the deferred tax difference

**Insurance coverage check.** While reviewing assets, verify that your business insurance covers the replacement cost of active assets. Fully depreciated assets may still have significant replacement value — a 5-year-old server at $0 NBV still costs $15,000 to replace.

**Common FA accounts in Jaz:**
- Fixed Assets (at cost) — typically one sub-account per asset type
- Accumulated Depreciation — mirror sub-accounts for each asset type
- Depreciation Expense — on P&L, may be split by asset type for reporting
- Gain on Disposal — Other Income
- Loss on Disposal — Other Expense
