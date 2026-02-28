# Recipe: Capital WIP to Fixed Asset Transfer

## Scenario

Your company is renovating its office at a total estimated cost of $150,000, incurred over 4 months through multiple bills (contractor, materials, permits). During construction, all costs are accumulated in a Capital Work-in-Progress (CIP/CWIP) account. Once the renovation is complete, the total cost is transferred to a Fixed Asset and registered in Jaz's FA module for automatic straight-line depreciation.

**Pattern:** Bills/journals coded to CIP (accumulation phase) + transfer journal + FA registration + capsule

---

## Accounts Involved

| Account | Type | Subtype | Role |
|---|---|---|---|
| Capital Work-in-Progress | Asset | Non-Current Asset | Accumulates costs during construction/development |
| Fixed Asset — [Asset Name] | Asset | Non-Current Asset | Completed asset (after transfer) |
| Accumulated Depreciation | Asset | Non-Current Asset (contra) | Depreciation reserve (auto by Jaz FA module) |
| Depreciation Expense | Expense | Expense | Monthly depreciation charge (auto by Jaz FA module) |
| Cash / Bank Account | Asset | Bank | Pays supplier bills |
| Accounts Payable | Liability | Current Liability | When bills are recorded |

---

## Journal Entries

### Phase 1: Cost Accumulation (during construction)

Each supplier bill or expense is coded to the CIP account — **not** to expense.

**Supplier bill example:**
- Create bill: $40,000 to "ABC Contractors"
- Code to: Capital Work-in-Progress
- Assign to capsule

**Internal labor capitalization (if applicable):**

| Line | Account | Debit | Credit |
|---|---|---|---|
| 1 | Capital Work-in-Progress | *labor cost* | |
| 2 | Salaries Expense | | *labor cost* |

### Phase 2: Transfer to Fixed Asset (on completion)

When the project is complete, transfer the total accumulated cost from CIP to the fixed asset account:

| Line | Account | Debit | Credit |
|---|---|---|---|
| 1 | Fixed Asset — Office Renovation | $150,000 | |
| 2 | Capital Work-in-Progress | | $150,000 |

### Phase 3: Register Fixed Asset

Register the completed asset in Jaz's Fixed Asset module:
- Asset name: "Office Renovation — 2025"
- Cost: $150,000 (must match the transfer amount)
- Salvage value: $0 (or estimated residual)
- Useful life: 60 months (5 years for leasehold improvements)
- Method: Straight-line (Jaz native FA module)

Jaz will then auto-post monthly depreciation:
- Dr Depreciation Expense $2,500 / Cr Accumulated Depreciation $2,500

---

## Capsule Structure

**Capsule:** "Office Renovation — 2025"
**Capsule Type:** "Capital Projects"

Contents:
- Multiple supplier bills (Phase 1)
- Internal labor journals (if any)
- 1 transfer journal (Phase 2)
- **Total entries:** Varies (typically 5-20 depending on project complexity)

> **Note:** The auto-generated depreciation entries from the FA module are separate from the capsule. If you want them tracked, assign the FA to the same capsule tags.

---

## Worked Example

**Project: Office Renovation**
- Budget: $150,000
- Duration: Jan 2025 — Apr 2025
- Useful life after completion: 5 years (60 months)
- Salvage value: $0

**Jan 15 — Contractor deposit:**
- Create bill: $40,000 to "ABC Contractors"
- Code to Capital Work-in-Progress
- Capsule: "Office Renovation — 2025"
- Pay bill when due

**Feb 10 — Materials purchase:**
- Create bill: $35,000 to "BuildMart Supplies"
- Code to Capital Work-in-Progress
- Capsule: same

**Mar 5 — Permits and fees:**
- Create bill: $5,000 to "City Planning Authority"
- Code to Capital Work-in-Progress
- Capsule: same

**Mar 28 — Contractor final payment:**
- Create bill: $60,000 to "ABC Contractors"
- Code to Capital Work-in-Progress
- Capsule: same

**Apr 1 — Internal labor capitalized:**
- Journal: Dr CIP $10,000 / Cr Salaries Expense $10,000
- Description: "Capitalize internal project management labor — Office Renovation"
- Capsule: same

**Apr 15 — CIP balance check:**
- CIP account: $150,000 debit ($40K + $35K + $5K + $60K + $10K)

**Apr 15 — Transfer journal:**
- Dr Fixed Asset — Office Renovation $150,000
- Cr Capital Work-in-Progress $150,000
- Description: "Transfer CIP to Fixed Asset — renovation complete"
- Capsule: same

**Apr 15 — Register in FA module:**
- Name: "Office Renovation — 2025"
- Cost: $150,000
- Salvage: $0
- Life: 60 months
- Start date: April 2025

**May 31 onwards — Auto-depreciation:**
- $150,000 / 60 months = $2,500/month
- Jaz auto-posts: Dr Depreciation Expense $2,500 / Cr Accumulated Depreciation $2,500

---

## Enrichment Suggestions

| Enrichment | Value | Why |
|---|---|---|
| Tracking Tag | "Capital Project" | Filter all CWIP and transfer entries |
| Tracking Tag | "Office Renovation" | Project-specific filter |
| Nano Classifier | Cost Category → "Contractor" / "Materials" / "Permits" | Break down project costs by category |
| Custom Field | "Project #" → "CAPEX-2025-001" | Internal project reference |

---

## Verification

1. **Trial Balance during accumulation** → Capital Work-in-Progress balance should equal the sum of all bills and journals coded to CIP.
2. **After transfer** → CIP balance should be $0. Fixed Asset balance should equal the total project cost.
3. **After FA registration** → Monthly depreciation should start from the completion month. Check first month's entry.
4. **Group General Ledger by Capsule** → "Office Renovation — 2025" shows all bills + transfer. Complete project audit trail.
5. **Fixed Asset Register** → Asset appears with correct cost, salvage, life, and monthly depreciation amount.

---

## Variations

**Software development capitalization (IAS 38):** Same pattern but for internal software development. Research phase costs are expensed; development phase costs (once feasibility is established) are capitalized to CIP. Transfer to "Intangible Asset — Software" on go-live.

**Multi-phase project:** If a large project has distinct milestones (e.g., Building A, Building B), you can create sub-capsules per phase or use nano classifiers to tag costs by phase. Transfer each phase to a separate fixed asset when that phase completes.

**Cost overrun:** If actual costs exceed budget, the full actual cost is capitalized. The higher cost simply means higher depreciation per period. No separate treatment needed — CIP captures everything.

**Borrowing costs (IAS 23):** If the project is funded by a specific loan, the interest during construction can be capitalized: Dr CIP / Cr Interest Expense. Stop capitalizing when the asset is ready for use.

**Asset under construction — partial use:** If part of the asset starts being used before the project is complete (e.g., one floor of a building), transfer and register that portion. Continue accumulating costs for the remainder in CIP.
