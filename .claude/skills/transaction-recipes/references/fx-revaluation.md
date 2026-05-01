# Recipe: FX Revaluation — Non-AR/AP Items (IAS 21)

## Scenario

Your Singapore company (base currency SGD) has a USD 50,000 intercompany loan receivable from a subsidiary, originally booked at a rate of 1.35 (SGD 67,500). At the December 31 reporting date, the USD/SGD closing rate is 1.38. IAS 21.23 requires all monetary items translated at the closing rate, so you post a revaluation journal to recognize the unrealized FX gain, then reverse it on Day 1 of the next period.

**Pattern:** Manual journals + capsule (revaluation journal + Day 1 reversal, repeated each period-end)

**When this recipe applies:**
- Intercompany loan receivables/payables booked as manual journals (not invoices/bills)
- Foreign currency term deposits or escrow outside bank accounts
- FX-denominated provisions (e.g., USD warranty obligation)
- Any manual journal balance in a non-AR/AP, non-cash foreign currency account

**When this recipe does NOT apply — the platform handles it automatically:**
- Invoices, bills, customer/supplier credit notes (auto-revalued)
- Cash and bank account balances (auto-revalued)

---

## Accounts Involved

| Account | Type | Subtype | Role |
|---|---|---|---|
| [Source Account] | Asset or Liability | Varies | The FX monetary item being revalued |
| FX Unrealized Gain | Revenue | Other Income | Holds gains when closing rate > book rate |
| FX Unrealized Loss | Expense | Other Expense | Holds losses when closing rate < book rate |

> **Note:** Jaz auto-creates FX gain/loss/rounding accounts when FX features are enabled. Use the platform-created accounts — do not create duplicates.

---

## Journal Entries

### Step 1: Revaluation Journal (period-end)

Calculate the unrealized gain or loss:

```
Gain/Loss = Foreign Amount × (Closing Rate − Book Rate)
```

**If gain (closing rate > book rate):**

| Line | Account | Debit | Credit |
|---|---|---|---|
| 1 | [Source Account] | *gain amount* | |
| 2 | FX Unrealized Gain | | *gain amount* |

**If loss (closing rate < book rate):**

| Line | Account | Debit | Credit |
|---|---|---|---|
| 1 | FX Unrealized Loss | *loss amount* | |
| 2 | [Source Account] | | *loss amount* |

### Step 2: Reversal Journal (Day 1 of next period)

Post the exact opposite of Step 1. This ensures the next period starts clean — the FX impact is recognized in the correct period only.

---

## Capsule Structure

**Capsule:** "FX Revaluation — Non-AR/AP — Dec 2025"
**Capsule Type:** "FX Revaluation"

Contents:
- 1 revaluation journal (period-end)
- 1 reversal journal (Day 1 of next period)
- **Total entries:** 2 per period

For ongoing monthly revaluations, create one capsule per quarter or fiscal year (e.g., "FX Reval — FY2025") containing all months' reval/reversal pairs.

---

## Worked Example

**Setup:**
- Intercompany loan receivable: USD 50,000
- Book rate (at original booking): 1.35 SGD/USD
- Book value: SGD 67,500
- Closing rate (Dec 31): 1.38 SGD/USD
- Closing value: SGD 69,000

**Calculation:**
```
Gain = USD 50,000 × (1.38 − 1.35) = USD 50,000 × 0.03 = SGD 1,500
```

**Dec 31, 2025 — Revaluation journal:**
- Dr Intercompany Loan Receivable SGD 1,500
- Dr/Cr FX Unrealized Gain SGD 1,500
- Description: "FX revaluation — USD 50,000 @ 1.38 (was 1.35)"
- Assign to capsule

**Jan 1, 2026 — Reversal journal:**
- Dr FX Unrealized Gain SGD 1,500
- Cr Intercompany Loan Receivable SGD 1,500
- Description: "Reversal of FX revaluation — USD 50,000"
- Assign to same capsule

**Use the calculator:** `clio calc fx-reval --amount 50000 --book-rate 1.35 --closing-rate 1.38 --currency USD --base-currency SGD`

---

## Enrichment Suggestions

| Enrichment | Value | Why |
|---|---|---|
| Tracking Tag | "FX Revaluation" | Filter all reval entries in GL |
| Tracking Tag | "USD" | Filter by currency for multi-currency reval |
| Custom Field | "Source Account" → "Intercompany Loan — SubCo" | Identify the item being revalued |
| Custom Field | "Period End Date" → "2025-12-31" | Link to reporting period |

---

## Verification

1. **Group General Ledger by Capsule** → Reval + reversal should net to zero across both entries.
2. **Trial Balance at Dec 31** → Intercompany Loan Receivable shows SGD 69,000 (original 67,500 + 1,500 reval). FX Unrealized Gain shows SGD 1,500 credit.
3. **Trial Balance at Jan 1 (after reversal)** → Intercompany Loan Receivable back to SGD 67,500. FX Unrealized Gain cleared.
4. **P&L for December** → FX Unrealized Gain of SGD 1,500 recognized in the correct period.

---

## Variations

**Multiple FX items:** If you have several non-AR/AP FX balances (e.g., USD loan + EUR deposit + JPY provision), you can combine them into a single multi-line revaluation journal. Each pair of lines handles one item. All in the same capsule.

**Loss scenario:** If the closing rate is lower than the book rate, the journal debits FX Unrealized Loss instead of crediting FX Unrealized Gain. The reversal mirrors accordingly.

**No reversal method:** Some firms keep the reval in place and adjust the book rate for the next period. This avoids the reversal journal but requires updating the "book rate" each period. The reversal method shown here is more conservative and widely used.

**Quarterly vs. monthly:** Reval can be done monthly or quarterly depending on materiality. For material FX exposures, monthly is recommended (IAS 21 does not prescribe frequency — it's a reporting date requirement).
