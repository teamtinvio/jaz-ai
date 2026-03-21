# Capital Allowances Classification Guide

How to classify fixed assets for Singapore capital allowance claims. Capital allowances (CA) are the tax equivalent of accounting depreciation — they allow the cost of qualifying capital assets to be deducted over time for tax purposes. Accounting depreciation is always added back; CA is claimed separately.

**CLI:** `clio jobs statutory-filing sg-ca --input assets.json --json` (per-asset CA schedule)
**CLI:** `clio jobs statutory-filing sg-cs --input tax-data.json --json` (full tax computation with CA)

---

## The Core Concept

```
Accounting depreciation =/= Capital allowances

Accounting:  Cost spread over useful life per accounting standards (IAS 16)
Tax:         Cost spread over statutory periods per Income Tax Act

Step 1: Add back accounting depreciation (always, in full)
Step 2: Claim capital allowances (per IRAS rules, by asset category)
```

The difference between depreciation added back and CA claimed creates a permanent or temporary tax adjustment. For most SMBs, CA is more generous than accounting depreciation (especially for computers and low-value assets), resulting in lower tax in early years.

---

## Capital Allowance Categories

Six categories, each with a different write-off rate and statutory basis. These map directly to the `AssetCategory` type in the CLI.

### Computer Equipment — Section 19A(1)

| Detail | Value |
|--------|-------|
| **Category code** | `computer` |
| **ITA section** | S19A(1) |
| **Write-off rate** | 100% in year 1 |
| **Claim period** | 1 year (immediate) |

**What qualifies:**
- Desktop computers, laptops, notebooks, tablets used for business
- Servers, network equipment (routers, switches, access points)
- Monitors, printers, scanners directly connected to computing equipment
- Computer peripherals (keyboard, mouse, external drives)
- Bundled software purchased with hardware (e.g., pre-installed OS)

**What does NOT qualify:**
- Standalone software licenses (use `ip` category under S19B)
- Mobile phones (use `general` category unless primarily used as a computing device)
- TV screens, projectors (use `general` unless used as computer monitors)

**Decision tree:**
1. Is this item primarily a computing device or peripheral? --> If yes, classify as `computer`.
2. Was software purchased bundled with the hardware? --> If yes, include the full cost under `computer`.
3. Was software purchased separately as a license? --> Classify under `ip` (S19B).

### Automation Equipment — Section 19A(1)

| Detail | Value |
|--------|-------|
| **Category code** | `automation` |
| **ITA section** | S19A(1) |
| **Write-off rate** | 100% in year 1 |
| **Claim period** | 1 year (immediate) |

**What qualifies:**
- Prescribed automation equipment under the IRAS list
- Robots and robotic arms for manufacturing/warehouse
- IoT sensors and devices for business process automation
- Automated guided vehicles (AGVs)
- CNC machines, 3D printers used in production
- Automated packaging and sorting systems

**What does NOT qualify:**
- General machinery that is not "prescribed" by IRAS
- Equipment that does not meet the automation criteria published by IRAS

**Decision tree:**
1. Is this equipment on the IRAS prescribed automation equipment list? --> If yes, classify as `automation`.
2. If unsure, does it automate a process that was previously manual? --> Check the IRAS list or classify conservatively as `general`.

**Tip:** The automation category is less commonly used by SMBs. If in doubt, classify as `general` (S19, 3-year write-off). The only downside is spreading the claim over 3 years instead of 1.

### Low-Value Assets — Section 19A(2)

| Detail | Value |
|--------|-------|
| **Category code** | `low-value` |
| **ITA section** | S19A(2) |
| **Write-off rate** | 100% in year 1 |
| **Per-item limit** | $5,000 or less |
| **Per-YA cap** | $30,000 total |
| **Claim period** | 1 year (immediate, subject to cap) |

**What qualifies:**
- Any capital asset costing $5,000 or less per item that does not already qualify under another 100% category (computer, automation)
- Office furniture (desks, chairs, shelves) costing $5,000 or less each
- Small equipment (coffee machine, microwave, standing desk converter)
- Tools and instruments under $5,000
- Small appliances for business use

**What does NOT qualify:**
- Items costing more than $5,000 each (use `general` or another category)
- Items that qualify under `computer` or `automation` (use those categories instead for unlimited 100% write-off — they are not subject to the $30K cap)

**Cap mechanics:**
- The $30,000 cap is per YA, across ALL low-value assets combined
- If total low-value asset cost exceeds $30,000, the excess must be classified as `general` (3-year write-off)
- The CLI automatically enforces the cap and flags when it is breached (`lowValueCapped: true` in output)

**Decision tree:**
1. Does the asset cost $5,000 or less? --> Potential low-value asset.
2. Does it qualify as `computer` or `automation`? --> If yes, use those categories instead (no cap applies).
3. Will total low-value assets for this YA exceed $30,000? --> If yes, prioritize the most expensive items for `low-value` and reclassify the rest as `general`.

**Questions to ask:** "What is the total cost of all assets purchased this year that cost $5,000 or less each? Is the total under $30,000?"

### General Plant & Machinery — Section 19

| Detail | Value |
|--------|-------|
| **Category code** | `general` |
| **ITA section** | S19 |
| **Write-off rate** | 33.33% per year |
| **Claim period** | 3 years (equal installments) |

**What qualifies:**
- Office fit-out and furniture costing more than $5,000 per item
- Q-plated (commercial) motor vehicles
- Machinery and production equipment
- Signage and display fixtures
- Air-conditioning and ventilation systems
- Security systems (CCTV, access control)
- Any qualifying capital asset not covered by another specific category

**What does NOT qualify:**
- S-plated (private) motor vehicles — no CA at all
- Land and buildings (non-industrial) — no CA
- Non-qualifying assets (paintings, antiques, artwork held for decoration)

**Decision tree:**
1. Is this a capital asset used in the business? --> If yes, potential CA claim.
2. Is it a computer, automation equipment, or low-value asset? --> Use those categories.
3. Is it an IP right? --> Use `ip` category (S19B).
4. Is it renovation/refurbishment? --> Use `renovation` category (S14Q).
5. Is it a private (S-plated) motor vehicle? --> NO CA. Not claimable.
6. Everything else? --> `general` at 33.33% x 3 years.

### Intellectual Property — Section 19B

| Detail | Value |
|--------|-------|
| **Category code** | `ip` |
| **ITA section** | S19B |
| **Write-off rate** | 20% per year (default 5-year) |
| **Claim period** | 5, 10, or 15 years (taxpayer's election) |

**What qualifies:**
- Patents (purchased or self-developed, if capitalized)
- Trademarks and trade names
- Copyrights
- Registered designs
- Software licenses (purchased separately from hardware)
- Know-how (trade secrets, proprietary processes, if capitalized)

**What does NOT qualify:**
- Goodwill (not an IP right under S19B)
- Customer lists, supplier contracts (not qualifying IP)
- Domain names (debatable — generally not qualifying unless tied to a registered trademark)

**Write-off period election:**
- The taxpayer elects the write-off period: 5, 10, or 15 years
- Once elected, the period is irrevocable for that asset
- Default in the CLI is 5 years. To use 10 or 15, set `ipWriteOffYears` on the asset.

**Decision tree:**
1. Is this a qualifying IP right (patent, trademark, copyright, registered design, software license)? --> If yes, classify as `ip`.
2. What write-off period does the user prefer? --> Set `ipWriteOffYears` to 5, 10, or 15.
3. Is the software bundled with hardware? --> Classify the whole purchase under `computer` instead.

**Questions to ask:** "Is this a standalone software license or IP right? Over how many years would you like to write it off for tax purposes (5, 10, or 15)?"

### Renovation & Refurbishment — Section 14Q

| Detail | Value |
|--------|-------|
| **Category code** | `renovation` |
| **ITA section** | S14Q |
| **Write-off rate** | 33.33% per year |
| **Claim period** | 3 years (equal installments) |
| **Cap** | $300,000 per 3-year block |

**What qualifies:**
- Office renovation (wall construction/removal, flooring, ceiling)
- Retail fit-out (shop front, display areas, customer-facing areas)
- General electrical wiring and lighting installation
- Plumbing and sanitary installations
- Painting and finishing works
- Fixed partitions and built-in cabinetry
- Reception area construction and design
- Kitchen and pantry fit-out (for business premises)

**What does NOT qualify:**
- Antiques, paintings, sculptures used for decoration
- Any renovation or refurbishment of residential property
- Renovation costs exceeding the $300,000 cap (excess is non-deductible)

**Cap mechanics:**
- $300,000 is a per-3-year-block cap, not per-year
- The 3-year block follows the first renovation claim in the series
- If renovation costs exceed $300,000 in a 3-year block, the excess cannot be claimed
- A new $300,000 block starts after the first 3-year block is exhausted

**Decision tree:**
1. Is this a renovation or refurbishment of business premises? --> If yes, classify as `renovation`.
2. Is the total renovation cost in the current 3-year block under $300,000? --> If yes, full claim. If no, cap applies.
3. Are there prior-year renovation claims in the same 3-year block? --> Subtract from the $300,000 cap.

**Questions to ask:** "Is this an office or shop renovation? What is the total renovation cost? Have you claimed any renovation deductions in the past 2 years (same 3-year block)?"

---

## Complete CA Rate Table

| Category | Section | Annual Rate | Years | Per-Item Limit | Per-YA Cap | Notes |
|----------|---------|-------------|-------|---------------|-----------|-------|
| Computer | S19A(1) | 100% | 1 | None | None | Immediate write-off |
| Automation | S19A(1) | 100% | 1 | None | None | Must be prescribed equipment |
| Low-value | S19A(2) | 100% | 1 | $5,000/item | $30,000/YA | Excess reclassified to general |
| General | S19 | 33.33% | 3 | None | None | Default for most P&M |
| IP | S19B | 20% (default) | 5/10/15 | None | None | Taxpayer elects period |
| Renovation | S14Q | 33.33% | 3 | None | $300,000/3-yr block | Qualifying expenditure only |

---

## Extracting Assets from Jaz

### Step 1: Pull the FA register

```
POST /api/v1/fixed-assets/search
{
  "filter": { "status": { "eq": "ACTIVE" } },
  "sort": { "sortBy": ["purchaseDate"], "order": "ASC" },
  "limit": 1000
}
```

### Step 2: Map each asset to a CA category

For each asset in the response, classify based on the `typeName` and `name` fields:

| Jaz Asset Type / Name Pattern | Likely CA Category | Verify |
|------------------------------|-------------------|--------|
| "Computer Equipment", "Laptop", "Server" | `computer` | Is it a computing device? |
| "Office Equipment" costing <= $5,000 | `low-value` | Under $5K and $30K cap? |
| "Office Equipment" costing > $5,000 | `general` | Above low-value threshold |
| "Furniture & Fittings" costing <= $5,000 | `low-value` | Under $5K and $30K cap? |
| "Furniture & Fittings" costing > $5,000 | `general` | 3-year write-off |
| "Motor Vehicles" (Q-plate) | `general` | Confirm Q-plate, not S-plate |
| "Motor Vehicles" (S-plate) | **NO CA** | Non-qualifying. Exclude entirely. |
| "Leasehold Improvements" | `renovation` | Under $300K block cap? |
| "Software" (standalone license) | `ip` | Not bundled with hardware? |
| "Plant & Machinery" | `general` | Unless prescribed automation |

### Step 3: Build the CaAsset array

For each qualifying asset:

```json
{
  "description": "MacBook Pro M3 (from Jaz FA register)",
  "cost": 4500.00,
  "acquisitionDate": "2025-03-15",
  "category": "computer",
  "priorYearsClaimed": 0
}
```

**`priorYearsClaimed`:** This field tracks how much CA has already been claimed in prior YAs for this asset. The Jaz API does not store tax-specific CA data — you must ask the user or refer to prior-year tax computations.

- For assets acquired in the current basis period: `priorYearsClaimed = 0`
- For 100% categories (computer, automation, low-value): if acquired in a prior year, `priorYearsClaimed` should equal `cost` (fully claimed in year 1)
- For 3-year assets (general, renovation): `priorYearsClaimed = cost x (1/3) x years already claimed`
- For IP assets: `priorYearsClaimed = cost x (1/N) x years already claimed` where N = elected write-off period

### Step 4: Run the CA schedule

```bash
clio jobs statutory-filing sg-ca --input assets.json --json
```

The output provides a per-asset schedule with:
- Current year claim per asset
- Total claimed to date per asset
- Remaining unabsorbed per asset
- Low-value cap enforcement (total and whether capped)
- Total current year claim (feed into `capitalAllowances.currentYearClaim`)
- Combined total available (current year + brought forward)

---

## Handling Unabsorbed Capital Allowances

If the company has unabsorbed (unclaimed) CA from prior YAs, these are carried forward and can be utilized against current-year income.

**Input field:** `capitalAllowances.balanceBroughtForward`

**When CA becomes unabsorbed:**
- The company had a tax loss in a prior year (adjusted loss after all deductions)
- CA was available but there was no chargeable income to absorb it
- The excess CA carries forward indefinitely (no time limit for unabsorbed CA)

**Questions to ask:** "Do you have any unabsorbed capital allowances from previous years? This would be shown on your prior-year Form C-S (Box 5: Unabsorbed CA c/f)."

---

## Common Mistakes

**1. Claiming CA on S-plated motor vehicles.** No CA is available for private motor vehicles (S-plated). The entire cost of the vehicle, plus all running expenses, is non-deductible for tax. Do not include S-plated vehicles in the CA schedule.

**2. Claiming CA on leasehold land.** The cost of land (including leasehold interest) does not qualify for CA. Only the building or improvements on the land qualify — and only if used for industrial purposes (for S19) or if it constitutes qualifying renovation (S14Q).

**3. Exceeding the low-value cap.** The $30,000/YA cap catches many first-time preparers. If a company buys 8 items at $5,000 each ($40,000 total), only $30,000 qualifies for immediate write-off. The remaining $10,000 must be reclassified to `general` (3-year write-off). The CLI handles this automatically.

**4. Forgetting prior-year claims on multi-year assets.** For `general` (3-year) and `ip` (5/10/15-year) assets, the current-year CA depends on how much was claimed in prior years. Failing to set `priorYearsClaimed` correctly results in double-claiming or under-claiming.

**5. Classifying renovation as general P&M.** Renovation qualifies for S14Q (same 3-year rate as S19, but with a $300K cap). If renovation costs are below the cap, there is no practical difference. But if costs exceed $300K, the S14Q cap applies and the excess is non-deductible — unlike general P&M where the full cost qualifies.

**6. Bundled software classified as IP.** Software purchased pre-installed on hardware (e.g., Windows license with a laptop) should be classified under `computer`, not `ip`. Only standalone software licenses (e.g., Adobe Creative Cloud annual license, purchased separately) go under `ip`.

---

## Practitioner Tips

**Classify assets at acquisition.** The CA category should be determined when the asset is purchased, not at year-end. This ensures the correct claim period starts from the right YA.

**Use `computer` over `low-value` when possible.** Both give 100% year-1 write-off, but `computer` has no per-YA cap. A $4,500 laptop classified as `computer` does not count toward the $30,000 low-value cap. Always check if an asset qualifies for a more specific 100% category before falling back to `low-value`.

**Ask about S-plates early.** If the company has motor vehicles, the S-plate vs Q-plate question is the first thing to resolve. It affects both the CA schedule (no CA for S-plate) and the add-backs (`addBacks.privateCar` for all S-plate expenses).

**The CLI is your calculation engine.** Do not manually compute CA schedules. Feed the asset list into `clio jobs statutory-filing sg-ca` and use the output. It handles: multi-year spreading, low-value cap enforcement, IP write-off period election, and prior-year claim tracking.

**For first-time filers:** All assets acquired since incorporation are potentially claimable. Go through the entire FA register and build the complete CA schedule. For subsequent years, only new acquisitions and continuing multi-year claims are needed.
