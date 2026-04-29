# Recipe: Declining Balance Depreciation

## Scenario

Your company purchases a delivery vehicle for $50,000 with a 5-year useful life and $5,000 salvage value. Management wants to use **double declining balance (DDB)** depreciation instead of straight-line because the vehicle loses more value in early years. Jaz only supports straight-line natively, so you record depreciation manually.

**Pattern:** Manual journals + capsule (depreciation amount changes each period)

**Why manual:** Jaz's fixed asset register only supports straight-line depreciation. Declining balance produces different amounts each period as the book value decreases, so a scheduler (fixed-amount) won't work either.

---

## Accounts Involved

| Account | Type | Subtype | Role |
|---|---|---|---|
| Vehicles | Asset | Non-Current Asset | The asset at cost |
| Accumulated Depreciation — Vehicles | Asset | Non-Current Asset | Contra-asset reducing net book value |
| Depreciation Expense | Expense | Expense | Monthly/annual depreciation charge |

> **Do NOT register the asset in Jaz's fixed asset register** — that would trigger automatic straight-line depreciation. Track the asset in the CoA only.

---

## DDB Method — How It Works

**Double Declining Balance Rate:**
```
DDB Rate = 2 / Useful Life = 2 / 5 = 40% per year
```

**Each period:**
```
Depreciation = Book Value at Start of Period × DDB Rate
```

**Key constraint:** Book value can never go below salvage value. When the declining balance amount would push book value below salvage, **switch to straight-line** for the remaining life.

**Switch-to-straight-line rule:** At the start of each period, compare:
- DDB depreciation = Book value × DDB rate
- Straight-line for remaining life = (Book value − Salvage value) / Remaining years

When straight-line ≥ DDB, switch to straight-line for all remaining periods.

---

## Journal Entry (Each Period)

| Line | Account | Debit | Credit |
|---|---|---|---|
| 1 | Depreciation Expense | *calculated amount* | |
| 2 | Accumulated Depreciation — Vehicles | | *calculated amount* |

---

## Capsule Structure

**Capsule:** "Depreciation — Delivery Vehicle VH-001"
**Capsule Type:** "Depreciation (Non-Standard)"

Contents:
- 5 annual depreciation journals (or 60 monthly if recording monthly)
- **Total entries:** 5 (annual) or 60 (monthly)

---

## Worked Example — Annual

**Asset details:**
- Cost: $50,000
- Salvage value: $5,000
- Useful life: 5 years
- DDB rate: 40%
- Depreciable base: $45,000

### Annual Depreciation Schedule

| Year | Opening Book Value | DDB (40%) | SL for Remaining | Use | Depreciation | Closing Book Value |
|---|---|---|---|---|---|---|
| 1 | $50,000 | $20,000 | $9,000 (45k/5) | DDB | **$20,000** | $30,000 |
| 2 | $30,000 | $12,000 | $6,250 (25k/4) | DDB | **$12,000** | $18,000 |
| 3 | $18,000 | $7,200 | $4,333 (13k/3) | DDB | **$7,200** | $10,800 |
| 4 | $10,800 | $4,320 | $2,900 (5.8k/2) | DDB | **$4,320** | $6,480 |
| 5 | $6,480 | $2,592 | $1,480 (1.48k/1) | **Switch** | **$1,480** | $5,000 |

**Year 5 switch logic:**
- DDB = $6,480 × 40% = $2,592 → would give closing BV of $3,888 (below salvage)
- SL = ($6,480 − $5,000) / 1 = $1,480
- Since we can't go below salvage, depreciate only $1,480

**Total depreciation:** $20,000 + $12,000 + $7,200 + $4,320 + $1,480 = **$45,000** ✓

### Year 1 Journal Entry

- Dr Depreciation Expense $20,000
- Cr Accumulated Depreciation — Vehicles $20,000
- Description: "DDB depreciation — Delivery Vehicle VH-001 — Year 1 of 5"
- Assign to capsule

### Year 4 Journal Entry

- Dr Depreciation Expense $4,320
- Cr Accumulated Depreciation — Vehicles $4,320
- Description: "DDB depreciation — Delivery Vehicle VH-001 — Year 4 of 5"
- Assign to capsule

### Year 5 Journal Entry (Switched to SL)

- Dr Depreciation Expense $1,480
- Cr Accumulated Depreciation — Vehicles $1,480
- Description: "SL depreciation (switched from DDB) — Delivery Vehicle VH-001 — Year 5 of 5"
- Assign to capsule

---

## Worked Example — Monthly

For monthly recording, divide each year's depreciation by 12:

| Year | Annual Depreciation | Monthly Depreciation |
|---|---|---|
| 1 | $20,000 | $1,666.67 |
| 2 | $12,000 | $1,000.00 |
| 3 | $7,200 | $600.00 |
| 4 | $4,320 | $360.00 |
| 5 | $1,480 | $123.33 |

**Month 1 (Year 1) journal:**
- Dr Depreciation Expense $1,666.67
- Cr Accumulated Depreciation — Vehicles $1,666.67
- Description: "DDB depreciation — Delivery Vehicle VH-001 — Month 1 of 60"

**Month 13 (Year 2, Month 1) journal:**
- Dr Depreciation Expense $1,000.00
- Cr Accumulated Depreciation — Vehicles $1,000.00
- Description: "DDB depreciation — Delivery Vehicle VH-001 — Month 13 of 60"

> The monthly amount changes at the start of each year, not each month. Within a year, the monthly amount is constant.

---

## Enrichment Suggestions

| Enrichment | Value | Why |
|---|---|---|
| Tracking Tag | "Vehicle Depreciation" | Filter all vehicle depreciation entries |
| Nano Classifier | Asset Class → "Motor Vehicles" | Break down depreciation by asset class |
| Custom Field | "Asset ID" → "VH-001" | Record the internal asset tracking number |

---

## Verification

1. **Group General Ledger by Capsule** → Shows all depreciation entries. Accumulated Depreciation should sum to $45,000 at end of Year 5.
2. **Trial Balance at any date** → Vehicles account shows $50,000 (cost, unchanged). Accumulated Depreciation shows the running total. Net book value = Cost − Accumulated Depreciation.
3. **Net book value check:**
   - End of Year 1: $50,000 − $20,000 = $30,000
   - End of Year 3: $50,000 − $39,200 = $10,800
   - End of Year 5: $50,000 − $45,000 = $5,000 (= salvage value) ✓
4. **P&L per year** → Depreciation Expense matches the annual schedule: $20K, $12K, $7.2K, $4.32K, $1.48K.

---

## Variations

**150% declining balance:** Use rate = 1.5 / Useful Life instead of 2 / Useful Life. Same switch-to-SL logic applies.

**No salvage value:** If salvage = $0, the switch-to-SL happens when SL depreciation ≥ DDB. The entire cost is depreciated.

**Mid-year acquisition:** If the vehicle is purchased in July, Year 1 gets 6/12 of the annual DDB amount. The remaining 6/12 rolls into a 6th partial year. Adjust the schedule accordingly.

**Disposal before end of life:** If the vehicle is sold in Year 3:
1. Record depreciation up to the disposal date (prorated if mid-year)
2. Remove the asset: Dr Cash (proceeds) + Dr Accumulated Depreciation + Dr/Cr Gain or Loss on Disposal / Cr Vehicles (cost)
3. All entries stay in the same capsule for audit trail

**Multiple assets:** Create a separate capsule per asset. Use the same "Depreciation (Non-Standard)" capsule type. Tags and nano classifiers help aggregate across assets in reports.

### Comparison: DDB vs Straight-Line

| Year | DDB | Straight-Line ($9,000/yr) | Difference |
|---|---|---|---|
| 1 | $20,000 | $9,000 | +$11,000 |
| 2 | $12,000 | $9,000 | +$3,000 |
| 3 | $7,200 | $9,000 | −$1,800 |
| 4 | $4,320 | $9,000 | −$4,680 |
| 5 | $1,480 | $9,000 | −$7,520 |
| **Total** | **$45,000** | **$45,000** | **$0** |

Both methods depreciate the same total ($45,000). DDB front-loads the expense — higher expense in early years, lower in later years.
