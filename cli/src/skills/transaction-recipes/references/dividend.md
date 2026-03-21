# Recipe: Dividend Declaration and Payment

## Scenario

Your company's board declares a final dividend of $200,000 for FY2025, payable on March 15, 2026. Two journal entries are needed: one at the declaration date (creating the obligation) and one at the payment date (settling it). The dividend reduces retained earnings, not current-year profit.

**Pattern:** Two manual journals + capsule (declaration + payment)

---

## Accounts Involved

| Account | Type | Subtype | Role |
|---|---|---|---|
| Retained Earnings | Equity | Retained Earnings | Reduced by declared dividend |
| Dividends Payable | Liability | Current Liability | Obligation from declaration to payment |
| Cash / Bank Account | Asset | Bank | Settlement on payment date |

> **Note:** Some companies use an "Dividends Declared" equity contra account instead of debiting Retained Earnings directly. Either approach is acceptable — the effect on equity is the same.

---

## Journal Entries

### Step 1: Declaration (board resolution date)

| Line | Account | Debit | Credit |
|---|---|---|---|
| 1 | Retained Earnings | $200,000 | |
| 2 | Dividends Payable | | $200,000 |

### Step 2: Payment (settlement date)

| Line | Account | Debit | Credit |
|---|---|---|---|
| 1 | Dividends Payable | $200,000 | |
| 2 | Cash / Bank Account | | $200,000 |

---

## Capsule Structure

**Capsule:** "FY2025 Final Dividend"
**Capsule Type:** "Dividends"

Contents:
- 1 declaration journal
- 1 payment journal
- **Total entries:** 2

---

## Worked Example

**Setup:**
- Declared amount: $200,000
- Declaration date: February 15, 2026 (board resolution)
- Payment date: March 15, 2026

**Feb 15, 2026 — Declaration:**
- Dr Retained Earnings $200,000
- Cr Dividends Payable $200,000
- Description: "FY2025 final dividend declared — Board Resolution #BR-2026-003"
- Assign to capsule

**Mar 15, 2026 — Payment:**
- Dr Dividends Payable $200,000
- Cr Cash / Bank Account $200,000
- Description: "FY2025 final dividend payment"
- Assign to same capsule

**After both entries:**
- Retained Earnings reduced by $200,000
- Dividends Payable cleared to $0
- Cash reduced by $200,000

---

## Enrichment Suggestions

| Enrichment | Value | Why |
|---|---|---|
| Tracking Tag | "Dividend" | Filter all dividend-related entries |
| Custom Field | "Board Resolution #" → "BR-2026-003" | Audit trail to authorization |
| Custom Field | "Fiscal Year" → "FY2025" | Link to the year the dividend relates to |

---

## Verification

1. **Trial Balance at Feb 28 (after declaration, before payment)** → Dividends Payable shows $200,000 credit. Retained Earnings reduced by $200,000.
2. **Trial Balance at Mar 31 (after payment)** → Dividends Payable shows $0. Cash reduced by $200,000.
3. **Statement of Changes in Equity** → Shows the $200,000 dividend reducing retained earnings.
4. **Group General Ledger by Capsule** → Both entries visible under "FY2025 Final Dividend."

---

## Variations

**Interim dividend:** Same structure, just declared mid-year (e.g., after H1 results). Use a separate capsule: "FY2025 Interim Dividend." Some jurisdictions require interim dividends to be based on audited interim accounts.

**Dividend in specie (non-cash):** If the dividend is settled with assets (e.g., property, shares in a subsidiary), replace the Cash credit with the appropriate asset account. Record any gain/loss on the asset transfer in the same journal.

**Withholding tax:** If your jurisdiction requires dividend withholding tax, the payment journal splits into net payment + tax payable:
- Dr Dividends Payable $200,000
- Cr Cash $170,000 (net to shareholders)
- Cr Withholding Tax Payable $30,000 (15% tax)

Then a separate payment when tax is remitted: Dr WHT Payable $30,000 / Cr Cash $30,000.

**Multiple shareholders:** If dividends are paid pro-rata to multiple shareholders, use one multi-line payment journal with a line per shareholder's bank account, or record separate payment journals per shareholder — all in the same capsule.
