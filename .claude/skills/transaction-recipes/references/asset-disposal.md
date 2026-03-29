# Recipe: Asset Disposal

## Scenario

Your company disposes of a fixed asset — either selling it, trading it in, or scrapping it. IAS 16.67-72 requires derecognition on disposal or when no future economic benefits are expected. The gain or loss is the difference between net disposal proceeds and the carrying amount (IAS 16.68), and gains are NOT classified as revenue (IAS 16.71) — they appear separately in the P&L under Other Income.

**Pattern:** One-shot calculator (not a schedule) — computes accumulated depreciation to disposal date, net book value, and gain/loss, then produces a single disposal journal

**Why manual:** Jaz's fixed asset register tracks depreciation automatically, but the disposal journal (removing cost + accumulated depreciation + recognizing gain/loss) must be recorded manually. After the journal, the asset is marked as sold or discarded in the FA register.

---

## Accounts Involved

| Account | Type | Subtype | Role |
|---|---|---|---|
| Fixed Asset (at cost) | Asset | Non-Current Asset | Original cost being removed |
| Accumulated Depreciation | Asset | Non-Current Asset (contra) | Contra-asset being cleared |
| Gain on Disposal | Revenue | Other Income | If proceeds > NBV |
| Loss on Disposal | Expense | Other Expense | If proceeds < NBV |
| Cash / Bank Account | Asset | Bank | Receives sale proceeds |

> **Note:** Gain on Disposal is NOT revenue — IAS 16.71 requires it to be classified separately. Use an "Other Income" account, not a sales revenue account.

---

## Journal Entries

### Scenario A: Sale at a Gain (Proceeds > NBV)

Proceeds $12,000, NBV $10,000 — Gain of $2,000:

| Line | Account | Debit | Credit |
|---|---|---|---|
| 1 | Cash / Bank Account | $12,000 | |
| 2 | Accumulated Depreciation | $40,000 | |
| 3 | Fixed Asset (at cost) | | $50,000 |
| 4 | Gain on Disposal | | $2,000 |

### Scenario B: Sale at a Loss (Proceeds < NBV)

Proceeds $8,000, NBV $10,000 — Loss of $2,000:

| Line | Account | Debit | Credit |
|---|---|---|---|
| 1 | Cash / Bank Account | $8,000 | |
| 2 | Accumulated Depreciation | $40,000 | |
| 3 | Loss on Disposal | $2,000 | |
| 4 | Fixed Asset (at cost) | | $50,000 |

### Scenario C: Scrap / Write-Off (Zero Proceeds)

No proceeds, NBV $10,000 — Loss of $10,000:

| Line | Account | Debit | Credit |
|---|---|---|---|
| 1 | Accumulated Depreciation | $40,000 | |
| 2 | Loss on Disposal | $10,000 | |
| 3 | Fixed Asset (at cost) | | $50,000 |

**In all scenarios:** Debits = Credits = Original cost ($50,000).

---

## Capsule Structure

**Capsule:** "Asset Disposal — Delivery Van VH-1234"
**Capsule Type:** "Asset Disposal"

Contents:
- 1 disposal journal (removing cost, clearing accumulated depreciation, recognizing gain/loss)
- **Total entries:** 1

> **Note:** After recording the disposal journal, update the Jaz FA register to mark the asset as sold or discarded. This is a separate step — the register update does not create a journal entry but ensures the asset stops depreciating.

---

## Worked Example

**Asset details:**
- Asset: Delivery Van VH-1234
- Original cost: $50,000
- Salvage value: $5,000
- Useful life: 5 years (60 months)
- Depreciation method: Straight-line
- Acquired: January 1, 2022
- Disposed: June 15, 2025
- Sale proceeds: $12,000

**Step 1 — Calculate months held:**
```
Acquired:  Jan 1, 2022
Disposed:  Jun 15, 2025
Months held: 42 months (Jan 2022 through Jun 2025)
```

**Step 2 — Calculate monthly depreciation (straight-line):**
```
Depreciable base = Cost − Salvage = $50,000 − $5,000 = $45,000
Monthly depreciation = $45,000 / 60 months = $750.00/month
```

**Step 3 — Calculate accumulated depreciation to disposal date:**
```
Accumulated depreciation = $750.00 × 42 months = $31,500.00
```

**Step 4 — Calculate net book value (NBV):**
```
NBV = Cost − Accumulated depreciation
NBV = $50,000 − $31,500 = $18,500.00
```

**Step 5 — Calculate gain or loss:**
```
Gain/(Loss) = Proceeds − NBV
Gain/(Loss) = $12,000 − $18,500 = −$6,500.00  (Loss)
```

**Disposal journal (Jun 15, 2025):**
- Dr Cash $12,000.00
- Dr Accumulated Depreciation $31,500.00
- Dr Loss on Disposal $6,500.00
- Cr Fixed Asset (at cost) $50,000.00
- Description: "Disposal of Delivery Van VH-1234 — sold at loss"
- Assign to capsule

**Verification of debits = credits:**
```
Debits:  $12,000 + $31,500 + $6,500 = $50,000
Credits: $50,000
Balanced: Yes
```

**Use the calculator:** `clio calc asset-disposal --cost 50000 --salvage 5000 --life 5 --acquired 2022-01-01 --disposed 2025-06-15 --proceeds 12000`

The CLI generates a `capsuleDescription` with full workings (cost, accumulated depreciation, NBV, gain/loss breakdown) that can be attached to the capsule for audit trail.

---

## Enrichment Suggestions

| Enrichment | Value | Why |
|---|---|---|
| Tracking Tag | "Asset Disposal" | Filter all disposal transactions in reports |
| Nano Classifier | Disposal Type → "Sale" or "Scrap" | Distinguish sales from write-offs |
| Custom Field | "Asset Description" → "Delivery Van VH-1234" | Identify the specific asset disposed |

---

## Verification

1. **Fixed Asset account** → The original cost for this asset is fully removed (zeroed out).
2. **Accumulated Depreciation account** → The accumulated depreciation for this asset is fully cleared (zeroed out).
3. **P&L** → Gain or Loss on Disposal appears under "Other Income" or "Other Expense" (not revenue).
4. **FA register** → Asset is marked as sold or discarded. No further depreciation is posted.

---

## Variations

**DDB/150DB depreciation:** If the asset uses declining balance instead of straight-line, use `--method ddb` or `--method 150db` in the calculator. The accumulated depreciation will differ, changing the NBV and gain/loss.

**Partial-year depreciation:** The calculator pro-rates automatically based on the acquisition and disposal dates. No manual adjustment needed for mid-month or mid-year disposals.

**Fully depreciated asset:** If the asset is fully depreciated, NBV = salvage value. Gain = proceeds − salvage. If scrapped, loss = salvage value (the remaining book value written off).

**Trade-in:** Record as a disposal (this recipe) plus a new asset acquisition in the same capsule. The trade-in allowance is the "proceeds" for the old asset. The new asset is recorded at its full cost, with the trade-in reducing the cash paid.

**Insurance claim (involuntary disposal):** If the asset is destroyed (fire, theft, accident), the insurance payout is the "proceeds." Same journal structure — the only difference is the source of cash (insurer instead of buyer).

**Jaz FA register update:** After recording the disposal journal, update the FA register:
- Sold: `POST /mark-as-sold/fixed-assets` — marks the asset as sold with the disposal date
- Scrapped: `POST /discard-fixed-assets/:id` — marks the asset as discarded
