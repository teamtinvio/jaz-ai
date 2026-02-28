# SG Corporate Income Tax — Wizard Workflow

Step-by-step procedure an AI agent follows to produce a complete Form C-S corporate income tax computation for a Singapore company. The wizard collects data through four phases — context, extraction, classification, and compute — ultimately assembling a `SgFormCsInput` JSON and running the computation engine.

**CLI:** `clio jobs statutory-filing sg-cs --json`

---

## Phase 1: Context (3 Questions)

Establish the filing parameters before touching any financial data.

### Step 1: Determine YA and basis period

The Year of Assessment (YA) is the year **after** the financial year-end. A company with FY ending 31 Dec 2025 files for YA 2026.

**API call:**
```
GET /api/v1/organization
```

**What to look for:** `data.financialYearEnd` (month number, e.g. 12 = December). The basis period is the 12-month FY ending in the calendar year before the YA. For a standard Dec year-end company filing YA 2026, the basis period is 01 Jan 2025 to 31 Dec 2025.

**Question to ask:** "Your financial year ends in [month]. I'll prepare the computation for YA [N] (basis period [start] to [end]). Is that correct?"

**Maps to:**
- `ya` — Year of Assessment
- `basisPeriodStart` — FY start date (YYYY-MM-DD)
- `basisPeriodEnd` — FY end date (YYYY-MM-DD)

### Step 2: Check Form C-S eligibility

Form C-S is the simplified return for qualifying small companies. A company qualifies if **all** of these are true:

| Criterion | Threshold |
|-----------|-----------|
| Annual revenue | <= $5,000,000 |
| No investment income | Dividends, interest, rental from investments |
| No capital gains/losses on fixed asset disposal | Gains on sale of property, equipment (SG has no CGT but IRAS can treat recurring gains as trading income) |
| No foreign-sourced income | Income earned or received from outside SG |
| Singapore-incorporated | Must be incorporated in SG |

**Question to ask:** "Does the company have any of the following? (a) Revenue over $5M, (b) Investment income (dividends, rental, interest from investments), (c) Capital gains from asset disposal, (d) Foreign-sourced income. If yes to any, Form C-S may not be applicable."

If revenue <= $200,000: the company may use **Form C-S Lite** (even simpler — 6 fields only).

**Maps to:** `revenue` (for threshold check); eligibility is validated by the computation engine.

### Step 3: Determine exemption type (SUTE vs PTE)

**Question to ask:** "When was the company incorporated (year)?"

**Decision logic:**
- If the YA is within the first 3 YAs from incorporation (e.g., incorporated 2024 -> first 3 YAs are 2025, 2026, 2027) **AND** the company meets the SUTE conditions:
  - <= 20 shareholders, all individuals or at least 1 individual holding >= 10%
  -> `exemptionType: 'sute'`
- Otherwise -> `exemptionType: 'pte'`
- In rare cases (e.g., companies electing out) -> `exemptionType: 'none'`

**Follow-up question (if SUTE-eligible):** "Does the company have 20 or fewer shareholders, with at least one individual shareholder holding 10% or more of the shares?"

**Maps to:** `exemptionType`

---

## Phase 2: Data Extraction

Pull the financial reports from the platform. These provide the raw numbers for the computation.

### Step 4: Pull Profit & Loss report

```
POST /api/v1/generate-reports/profit-and-loss
{
  "primarySnapshotDate": "2025-12-31",
  "secondarySnapshotDate": "2025-01-01"
}
```

**What to extract:**
- **Total revenue** — top line. Maps to `revenue`.
- **Total expenses** — for cross-reference.
- **Net profit/(loss)** — bottom line. Maps to `accountingProfit`.
- Scan expense categories for accounts that will need add-back review (depreciation, entertainment, donations, penalties, etc.)

**Maps to:** `revenue`, `accountingProfit`

### Step 5: Pull Trial Balance

```
POST /api/v1/generate-reports/trial-balance
{
  "startDate": "2025-01-01",
  "endDate": "2025-12-31"
}
```

**What to extract:**
- Cross-reference total revenue and total expenses to P&L (they must agree)
- Identify control accounts: GST receivable/payable, fixed asset accumulated depreciation, provision accounts, lease liability, ROU assets
- Note any suspense account balances (these need clearing before tax computation)

**Purpose:** The trial balance gives you the full chart of accounts view. Many add-back items are identified by scanning account names here.

### Step 6: Pull Fixed Asset Summary

```
POST /api/v1/generate-reports/fixed-assets-summary
{}
```

**What to extract:**
- **Total accounting depreciation** for the year — this is always added back. Maps to `addBacks.depreciation`.
- **Asset list** with cost, accumulated depreciation, NBV — needed for capital allowance classification in Phase 3.
- Note any disposals during the year (proceeds vs NBV = gain/loss, which may need add-back or deduction).

### Step 7: Pull GL detail for targeted accounts

For each ambiguous expense account identified in Steps 4-5, drill into the general ledger:

```
POST /api/v1/cashflow-transactions/search
{
  "filter": {
    "chartOfAccountResourceId": { "eq": "<account-resource-id>" },
    "valueDate": { "between": ["2025-01-01", "2025-12-31"] }
  },
  "sort": { "sortBy": ["valueDate"], "order": "ASC" },
  "limit": 1000
}
```

**When to use this:** When an expense account name is ambiguous (e.g., "Professional Fees" could contain deductible audit fees AND non-deductible fines). You need transaction-level detail to classify correctly.

**Common accounts to drill into:**
- "Other Expenses" or "Sundry Expenses" — catch-all accounts often contain non-deductible items
- "Professional Fees" — may include tax penalty payments
- "Motor Vehicle" — need to split S-plated (non-deductible) from commercial vehicles
- "Entertainment" — need to identify non-deductible portion
- "Repairs & Maintenance" — may contain capital expenditure incorrectly expensed

---

## Phase 3: Tax Classification (AI Judgment + Human Confirmation)

This is the core of the tax computation. For each add-back category, scan the data, pattern-match, present to the user for confirmation, and classify.

**Golden rule:** Present your analysis and let the user confirm. Never silently classify an item.

### Steps 8-16: Add-back categories

Work through each add-back category in order. For each one:

1. **Scan** — look at the P&L, TB, and GL data for matching items
2. **Pattern-match** — use account names, transaction descriptions, and amounts to identify candidates
3. **Present** — show the user what you found and your proposed classification
4. **Confirm** — get explicit confirmation before recording the amount
5. **Map** — record the confirmed amount in the corresponding `addBacks` field

| # | Category | What to scan for | Input field |
|---|----------|-----------------|-------------|
| 8 | **Depreciation** | FA summary total, "Depreciation" accounts on TB. Always 100% add-back. | `addBacks.depreciation` |
| 9 | **Amortization** | "Amortization" accounts — intangible assets (goodwill, patents, software). Always add back. | `addBacks.amortization` |
| 10 | **IFRS 16 — ROU depreciation** | "Right-of-Use" or "ROU" accounts. See `references/sg-tax/ifrs16-tax-adjustment.md`. | `addBacks.rouDepreciation` |
| 11 | **IFRS 16 — Lease interest** | "Lease Liability Interest" accounts. See IFRS 16 reference. | `addBacks.leaseInterest` |
| 12 | **Provisions** | "Provision", "ECL", "Warranty", "Restructuring" accounts. General provisions are added back; specific provisions (e.g., specific bad debt write-off) may be deductible. | `addBacks.generalProvisions` |
| 13 | **Donations** | "Donation" accounts. Add back the full amount, then claim 250% as enhanced deduction separately. | `addBacks.donations` |
| 14 | **Entertainment** | "Entertainment", "Meals", "Client hospitality". Ask: "What portion is non-deductible (e.g., personal, excessive)?" | `addBacks.entertainment` |
| 15 | **Penalties & fines** | "Penalty", "Fine", "Surcharge", "Late payment interest". All non-deductible. | `addBacks.penalties` |
| 16 | **Other categories** | Private car (`addBacks.privateCar`), capital items expensed (`addBacks.capitalExpOnPnl`), unrealized FX losses (`addBacks.unrealizedFxLoss`), exempt dividends (`addBacks.exemptDividends`), other (`addBacks.otherNonDeductible`). | Various |

**Question to ask (template):** "I found $X in [account name]. This appears to be [category]. Should I add back $[amount] for [reason]?"

### Step 16b: Deductions

Similarly, identify items that reduce taxable income but weren't deducted in the accounts:

| Item | What to scan for | Input field |
|------|-----------------|-------------|
| **Actual lease payments** | Bank/cash entries to lessors. See IFRS 16 reference. | `deductions.actualLeasePayments` |
| **Unrealized FX gains** | "Unrealized FX Gain" on P&L. Not taxable until crystallized. | `deductions.unrealizedFxGain` |
| **Exempt income** | SG one-tier dividends received, tax-exempt grants. | `deductions.exemptIncome` |
| **Other deductions** | Any other items. | `deductions.otherDeductions` |

### Step 17: Capital allowances

Present the fixed asset list from Step 6 and ask the user to classify each asset.

**Question to ask:** "Here are your fixed assets. For each, I need to know the IRAS capital allowance category:"

| Category | Code | Rate | Section |
|----------|------|------|---------|
| Computer equipment | `computer` | 100% Year 1 | S19A(1) |
| Automation equipment | `automation` | 100% Year 1 | S19A(1) |
| Low-value assets (<= $5K each) | `low-value` | 100% Year 1 (cap $30K/YA total) | S19A(2) |
| General P&M | `general` | 33.33% x 3 years | S19 |
| IP / patents | `ip` | 20% x 5 years (or 10/15 years) | S19B |
| Renovation | `renovation` | 33.33% x 3 years ($300K per 3-year block cap) | S14Q |

For each asset, record: `description`, `cost`, `acquisitionDate`, `category`, `priorYearsClaimed`.

**Maps to:** `capitalAllowances.currentYearClaim` (compute via `clio calc` or the CA schedule engine), `capitalAllowances.assets`

**Calculator:** `clio jobs statutory-filing sg-ca --json` computes the per-asset CA schedule.

### Step 18: Enhanced deductions

**Questions to ask:**

1. "Does the company do research and development? How much qualifying expenditure? Is it under S14C (250%) or S14E (400%, requires pre-approval)?"
   - Maps to: `enhancedDeductions.rdExpenditure`, `enhancedDeductions.rdMultiplier` (2.5 or 4.0)

2. "Did the company register any patents, trademarks, or designs this year? What was the cost?"
   - Maps to: `enhancedDeductions.ipRegistration`, `enhancedDeductions.ipMultiplier` (2.0 or 4.0)

3. "Were any donations made to approved IPCs (Institutions of a Public Character)?"
   - This should already be captured in `addBacks.donations` — confirm the same amount.
   - Maps to: `enhancedDeductions.donations250Base` (should equal `addBacks.donations`)

4. "Did the company incur renovation/refurbishment costs for business premises?"
   - Maps to: `enhancedDeductions.s14qRenovation` (the net uplift portion)

See `references/sg-tax/enhanced-deductions.md` for full detail.

### Step 19: Carry-forwards from prior years

**Questions to ask:**

1. "Does the company have unabsorbed trade losses from prior years? If so, how much?"
   - Maps to: `losses.broughtForward`

2. "Does the company have unabsorbed capital allowances from prior years?"
   - Maps to: `capitalAllowances.balanceBroughtForward`

3. "Does the company have unabsorbed donation deductions from prior years? (Maximum 5 years old, FIFO basis.)"
   - Maps to: `donationsCarryForward.broughtForward`

4. "Has the company's shareholding remained at least 50% the same between the relevant dates?" (Required for loss and CA carry-forward claims.)

See `references/sg-tax/losses-and-carry-forwards.md` for the set-off order and rules.

---

## Phase 4: Compute

### Step 20: Assemble the `SgFormCsInput` JSON

Compile all gathered data into the input structure. Example:

```json
{
  "ya": 2026,
  "basisPeriodStart": "2025-01-01",
  "basisPeriodEnd": "2025-12-31",
  "currency": "SGD",
  "revenue": 2500000,
  "accountingProfit": 350000,
  "addBacks": {
    "depreciation": 45000,
    "amortization": 0,
    "rouDepreciation": 18000,
    "leaseInterest": 4200,
    "generalProvisions": 12000,
    "donations": 5000,
    "entertainment": 3500,
    "penalties": 800,
    "privateCar": 6000,
    "capitalExpOnPnl": 0,
    "unrealizedFxLoss": 2100,
    "exemptDividends": 0,
    "otherNonDeductible": 0
  },
  "deductions": {
    "actualLeasePayments": 20000,
    "unrealizedFxGain": 1500,
    "exemptIncome": 0,
    "otherDeductions": 0
  },
  "capitalAllowances": {
    "currentYearClaim": 62000,
    "assets": [],
    "balanceBroughtForward": 15000
  },
  "enhancedDeductions": {
    "rdExpenditure": 0,
    "rdMultiplier": 2.5,
    "ipRegistration": 0,
    "ipMultiplier": 2.0,
    "donations250Base": 5000,
    "s14qRenovation": 0
  },
  "losses": { "broughtForward": 0 },
  "donationsCarryForward": { "broughtForward": 0 },
  "exemptionType": "pte"
}
```

**Validation:** Before running the computation, verify:
- `addBacks.donations` == `enhancedDeductions.donations250Base` (they must match)
- `revenue` is consistent with the P&L
- `accountingProfit` is consistent with the P&L
- All amounts are >= 0 (the engine validates this too)

### Step 21: Run the computation

**CLI:**
```bash
clio jobs statutory-filing sg-cs --json
```

Or call `computeFormCs(input)` directly if running programmatically.

**What you get back:** A `SgFormCsResult` containing:
- `schedule` — the full tax computation schedule (line-by-line workpaper)
- `formFields` — mapped to Form C-S box numbers
- `workings` — human-readable text version of the computation
- Carry-forward amounts for next YA

### Step 22: Present results

Present the results to the user in three sections:

**a) Tax Computation Schedule**
The `schedule` array rendered as a table — this is the workpaper.

**b) Form C-S Field Mapping**
Show the `formFields` mapped to the actual form boxes:

| Box | Field | Amount | Source |
|-----|-------|--------|--------|
| 1 | Adjusted profit/loss | $X | Accounting profit + add-backs - deductions |
| 2 | Chargeable income | $X | After all reliefs |
| 4 | Revenue | $X | P&L total revenue |
| 6 | Tax at 17% | $X | Taxable income x 17% |
| 7 | Net tax payable | $X | Gross tax - CIT rebate |

**c) Carry-forwards**
Report amounts to carry forward:
- Unabsorbed trade losses: `unabsorbedLosses`
- Unabsorbed capital allowances: `unabsorbedCapitalAllowances`
- Unabsorbed donations: `unabsorbedDonations`

### Step 23: Filing guidance

**Filing:** Log into IRAS myTax Portal > Corporate Tax > File Form C-S (or C-S Lite). Enter the box amounts from the form field mapping. Submit before 30 November of the YA.

**Key dates:**
| Event | Deadline |
|-------|----------|
| ECI filing | Within 3 months of FY end |
| Form C-S filing | 30 November of the YA |
| Tax payment | Within 1 month of Notice of Assessment |

**Offer:** "Would you like me to save the workpaper as a PDF/export for your records?"

---

## Wizard Checklist (Quick Reference)

| # | Step | Phase | Conditional |
|---|------|-------|-------------|
| 1 | Determine YA and basis period | Context | Always |
| 2 | Check C-S eligibility | Context | Always |
| 3 | Determine exemption type | Context | Always |
| 4 | Pull P&L report | Extraction | Always |
| 5 | Pull Trial Balance | Extraction | Always |
| 6 | Pull FA Summary | Extraction | If fixed assets exist |
| 7 | Pull GL for targeted accounts | Extraction | If ambiguous accounts exist |
| 8-16 | Classify add-backs | Classification | Always (per category) |
| 16b | Classify deductions | Classification | If IFRS 16 / FX / exempt income |
| 17 | Capital allowances | Classification | If fixed assets exist |
| 18 | Enhanced deductions | Classification | If R&D / IP / donations / renovation |
| 19 | Carry-forwards | Classification | If prior year losses/CA/donations |
| 20 | Assemble input JSON | Compute | Always |
| 21 | Run computation | Compute | Always |
| 22 | Present results | Compute | Always |
| 23 | Filing guidance | Compute | Always |

---

## Common Mistakes

1. **Forgetting to add back accounting depreciation.** This is the single most common error. Accounting depreciation is ALWAYS added back — the tax deduction comes through capital allowances instead.

2. **Double-counting donations.** Donations are added back (Step 13) AND claimed at 250% as an enhanced deduction (Step 18). The add-back removes the P&L expense; the enhanced deduction gives the 250% tax deduction. If you skip the add-back, you get 250% + 100% = 350%.

3. **IFRS 16 confusion.** Three adjustments are needed (add back ROU depreciation, add back lease interest, deduct actual payments). Missing any one produces an incorrect result. See `references/sg-tax/ifrs16-tax-adjustment.md`.

4. **Using PTE when SUTE applies.** SUTE saves significantly more tax in the first 3 YAs. Always check incorporation year.

5. **Forgetting the shareholding test.** Carry-forward losses and CA require >= 50% shareholder continuity. If ownership changed, the carry-forwards may be lost.
