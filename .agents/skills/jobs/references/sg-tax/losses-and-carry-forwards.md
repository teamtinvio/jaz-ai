# Loss Relief and Carry-Forwards for SG Corporate Tax

When a company's deductions and allowances exceed its income, the excess creates carry-forward amounts that can reduce tax in future years. IRAS prescribes a strict set-off order — items must be applied in sequence, and chargeable income cannot go below zero at any step.

---

## Set-Off Order (IRAS Prescribed)

The computation engine applies reliefs in this exact sequence. At each step, the claim is capped at the remaining chargeable income (which cannot go below zero).

| Order | Relief | Source | Carry-forward if excess? |
|-------|--------|--------|--------------------------|
| 1 | **Current year capital allowances (CA)** | `capitalAllowances.currentYearClaim` | Yes — becomes unabsorbed CA |
| 2 | **Enhanced deductions** | R&D, IP, S14Q (uplift portions) | Limited — varies by scheme |
| 3 | **Unabsorbed CA from prior years** | `capitalAllowances.balanceBroughtForward` | Yes — rolls forward again |
| 4 | **Unabsorbed trade losses from prior years** | `losses.broughtForward` | Yes — rolls forward (indefinite) |
| 5 | **Current year donations (250%)** | `enhancedDeductions.donations250Base` x 2.5 | Yes — up to 5 years |
| 6 | **Unabsorbed donations from prior years** | `donationsCarryForward.broughtForward` | Yes — remaining 5-year window |

**After all reliefs:** the result is **chargeable income**. If it is zero, no tax is payable but the company still files Form C-S.

### How the engine implements the set-off

```
Adjusted profit = Accounting profit + Add-backs - Deductions

Remaining = Adjusted profit
  → Less: Current year CA         (capped at Remaining, excess → carry forward)
  → Less: Enhanced deductions     (capped at Remaining)
  → Less: Unabsorbed CA b/f       (capped at Remaining, excess → carry forward)
  = Chargeable income before losses

  → Less: Unabsorbed trade losses (capped at CI before losses, excess → carry forward)
  → Less: Current year donations  (capped at remaining CI)
  → Less: Unabsorbed donations    (capped at remaining CI, FIFO, excess → carry forward)
  = Chargeable income
```

---

## Trade Losses

### Current year loss

If adjusted profit is **negative** (i.e., the company made a tax-adjusted loss), this is a **current year trade loss**. No further reliefs can be applied — CA, enhanced deductions, and donation claims are all zero because there is no positive income to offset them against.

The current year loss is added to the carry-forward pool:

```
Unabsorbed losses c/f = Prior year unabsorbed losses + Current year loss
```

**Input:** A current year loss is detected automatically by the computation engine when adjusted profit < 0. No separate input field is needed — it is calculated from `accountingProfit` + add-backs - deductions.

### Carry-forward of trade losses

| Rule | Detail |
|------|--------|
| **Duration** | Indefinite — no time limit |
| **Condition** | Shareholding test (see below) |
| **Set-off order** | Applied AFTER CA and enhanced deductions, BEFORE donations |
| **Cap** | Limited to chargeable income before losses (cannot create or increase a loss) |

**Input:** `losses.broughtForward` — the total unabsorbed trade losses from all prior YAs.

### Carry-back of trade losses (optional)

Companies can elect to carry back current year losses to the **immediately preceding YA**, subject to:

| Rule | Detail |
|------|--------|
| **Maximum** | $100,000 per YA |
| **Condition** | Same shareholding test |
| **Timing** | Must be elected in the tax return for the loss year |
| **Effect** | Triggers a refund or reduction of the prior year's tax |

**Note:** Loss carry-back is NOT modeled in the `SgFormCsInput` type. It requires amending the prior year's return and is handled as a separate filing action. The wizard should mention this option but not include it in the computation.

---

## Capital Allowances

### Current year CA excess

If current year CA exceeds the adjusted profit, only the portion up to adjusted profit is claimed. The excess becomes **unabsorbed CA** carried forward.

```
Current year CA claimed = min(CA available, adjusted profit)
Excess CA = CA available - CA claimed → carry forward
```

### Unabsorbed CA from prior years

Applied after enhanced deductions, capped at remaining chargeable income.

| Rule | Detail |
|------|--------|
| **Duration** | Indefinite — no time limit |
| **Condition** | Shareholding test |
| **Set-off order** | Applied AFTER enhanced deductions, BEFORE trade losses |

**Input:** `capitalAllowances.balanceBroughtForward` — total unabsorbed CA from all prior YAs.

### Combined CA carry-forward

The total CA carried forward to the next YA is:

```
Unabsorbed CA c/f = Current year CA excess + Prior year CA excess (unused portion)
```

---

## Donations

### Current year donations

Donations to approved IPCs are claimed at 250% (see `references/sg-tax/enhanced-deductions.md`). The full 250% amount is set off after trade losses.

If the 250% deduction exceeds remaining chargeable income, the excess carries forward.

### Carry-forward of donations

| Rule | Detail |
|------|--------|
| **Duration** | **5 years only** (not indefinite) |
| **Basis** | FIFO — oldest donations used first |
| **Condition** | Shareholding test |
| **Set-off order** | Applied AFTER trade losses |

**Input:** `donationsCarryForward.broughtForward` — total unabsorbed donations from prior YAs (max 5 years old).

**FIFO example:**

| Year donated | Original 250% amount | Used in prior YAs | Remaining | Expires after |
|-------------|---------------------|--------------------|-----------|--------------|
| YA 2022 | $25,000 | $20,000 | $5,000 | YA 2027 |
| YA 2023 | $12,500 | $0 | $12,500 | YA 2028 |
| **Total b/f** | | | **$17,500** | |

When claiming, the $5,000 from YA 2022 is used first (oldest first). If only $10,000 of CI is available, $5,000 comes from YA 2022 (exhausted) and $5,000 from YA 2023 ($7,500 remaining).

---

## The Shareholding Test

Carry-forward claims for trade losses, CA, and donations all require the **shareholding test** to be satisfied.

| Requirement | Detail |
|------------|--------|
| **Rule** | >= 50% of the company's shareholders (by voting power) must be substantially the same at two dates |
| **Date 1** | Last day of the YA in which the loss/CA/donation arose |
| **Date 2** | First day of the YA in which the loss/CA/donation is to be deducted |
| **"Substantially the same"** | Same persons holding >= 50% of total voting shares |

**Example:** A company has unabsorbed losses from YA 2024. To claim them in YA 2026:
- Shareholders on 31 Dec 2024 (last day of YA 2024) must be >= 50% the same as
- Shareholders on 1 Jan 2026 (first day of YA 2026)

If a majority ownership change occurred between those dates, the carry-forward is **forfeited**.

### Exceptions

- **Listed companies** are exempt from the shareholding test (publicly traded companies have frequent shareholder changes)
- **Shareholders can be traced through** — if the ultimate beneficial owners are the same even though the intermediate holding company changed, IRAS may accept the claim on appeal

---

## Current Year Loss Scenario (Worked Example)

**Scenario:** Company with an accounting loss, prior year carry-forwards.

```
Accounting profit (loss):        ($50,000)
Add-backs:
  Depreciation:                   $30,000
  Entertainment:                   $2,000
  Total add-backs:                $32,000
Deductions:
  Actual lease payments:           $5,000
  Total deductions:                $5,000

Adjusted profit/(loss):          ($23,000)   ← negative = current year loss
```

**What happens:**
- Current year CA: $0 (cannot apply CA against a loss)
- Enhanced deductions: $0 (cannot apply against a loss)
- Prior year CA: $0 (cannot apply against a loss)
- Trade losses: $0 (cannot apply against a loss)
- Donations: $0 (cannot apply against a loss)
- Chargeable income: $0
- Tax payable: $0

**Carry-forwards to next YA:**
- Current year trade loss: $23,000
- Total unabsorbed losses c/f: prior year $40,000 + current year $23,000 = $63,000
- Unabsorbed CA: prior year $15,000 + current year CA of $20,000 (could not be claimed) = $35,000
- Unabsorbed donations: prior year $5,000 (unchanged, ages by 1 year)

---

## Profitable Year with Carry-Forwards (Worked Example)

**Scenario:** Company turns profitable, has carry-forwards from prior years.

```
Adjusted profit:                  $180,000

Step 1 — Current year CA:       ($45,000)    Remaining: $135,000
Step 2 — Enhanced deductions:     ($8,000)    Remaining: $127,000
Step 3 — Unabsorbed CA b/f:     ($35,000)    Remaining:  $92,000
         Chargeable income before losses:      $92,000
Step 4 — Trade losses b/f:      ($63,000)    Remaining:  $29,000
Step 5 — Current year donations: ($12,500)    Remaining:  $16,500
Step 6 — Prior year donations:    ($5,000)    Remaining:  $11,500

Chargeable income:                 $11,500
```

**Carry-forwards to next YA:**
- Unabsorbed losses: $0 (fully absorbed)
- Unabsorbed CA: $0 (fully absorbed)
- Unabsorbed donations: $0 (fully absorbed)

---

## Questions for the Wizard

Ask these during Phase 3 (Step 19) of the wizard workflow:

1. **"Does the company have unabsorbed trade losses from prior years? If so, how much?"**
   - Record in `losses.broughtForward`
   - Note: the total across all prior years, not per-year breakdown

2. **"Does the company have unabsorbed capital allowances from prior years? If so, how much?"**
   - Record in `capitalAllowances.balanceBroughtForward`

3. **"Does the company have unabsorbed donation deductions from prior years?"**
   - If yes: "How much, and from which YAs? (Donations older than 5 years have expired.)"
   - Record the valid total in `donationsCarryForward.broughtForward`

4. **"Has the company's shareholding remained at least 50% the same since the year the losses/CA/donations arose?"**
   - If no: the carry-forward claims may be forfeited. Advise the user to check with their tax advisor.
   - If unsure: flag as a risk item in the workpaper.

---

## Summary: Carry-Forward Input Fields

| Item | Input field | Duration | Condition |
|------|------------|----------|-----------|
| Trade losses | `losses.broughtForward` | Indefinite | Shareholding test |
| Capital allowances | `capitalAllowances.balanceBroughtForward` | Indefinite | Shareholding test |
| Donations | `donationsCarryForward.broughtForward` | 5 years (FIFO) | Shareholding test |

---

## Common Mistakes

1. **Applying CA against a loss.** If adjusted profit is negative, no CA, enhanced deductions, or other reliefs can be applied. Everything carries forward. The engine handles this correctly, but users sometimes try to force a CA claim in a loss year.

2. **Forgetting the set-off order.** Current year CA comes FIRST, then enhanced deductions, then prior year CA, then losses, then donations. Applying them out of order can produce different carry-forward amounts.

3. **Claiming expired donations.** Donations older than 5 years cannot be carried forward. If a user provides a brought-forward donation amount, verify it only includes amounts from the last 5 YAs.

4. **Ignoring the shareholding test.** If ownership changed significantly (e.g., company was acquired), all carry-forwards may be forfeited. Always ask.

5. **Double-counting current year losses.** If the company made a loss this year, that loss is automatically added to the carry-forward pool by the computation engine. Do not also include it in `losses.broughtForward` (which is prior year losses only).
