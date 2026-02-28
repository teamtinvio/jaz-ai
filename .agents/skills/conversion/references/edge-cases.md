# Edge Cases — FX, Clearing Accounts, Rounding, and More

## Foreign Exchange (FX)

### Setting Org-Level FYE Rates
Enable currencies and set FYE closing rates before creating any FX transactions:

```
POST /api/v1/organization/currencies          // Enable currency
{ "currencies": ["USD"] }

POST /api/v1/organization-currencies/USD/rates  // Set FYE rate
{ "rate": 1.35, "rateApplicableFrom": "2024-12-31" }
```

**Rate direction:** Jaz uses `functionalToSource` — how many functional currency units per 1 source currency unit. If base = SGD and "1 USD = 1.35 SGD", then `rate = 1.35`.

**CRITICAL:** `currencyCode: "USD"` (string) is **silently ignored** by the API — it creates the transaction in base currency. You MUST use the `currency` object form.

### Quick Conversion — Explicit FYE Rate on Transactions

FX conversion transactions use **original dates** (for aging) but an **explicit FYE exchange rate** (for zero UGL):

```json
{
  "valueDate": "2024-06-15",
  "dueDate": "2024-07-15",
  "currency": {
    "sourceCurrency": "USD",
    "exchangeRate": 1.35
  }
}
```

The `exchangeRate` field overrides Jaz's rate auto-fetch. This is essential because:

1. **Prior UGL is in the TTB:** The old platform already computed unrealized FX gains/losses up to FYE. That UGL sits in the TTB journal (Unrealized FX Gain/Loss account balance). If conversion invoices used a different rate, Jaz would compute additional UGL — doubling up.

2. **Zero UGL on day 1:** FYE rate = transferred transaction rate → Jaz sees zero unrealized gain/loss from these conversion invoices/bills.

3. **Correct future RGL:** When a payment is recorded against a conversion invoice, Jaz computes realized gain/loss against the FYE rate — which is correct. The balance was already marked-to-market at FYE by the prior platform.

4. **Correct aging:** Original dates preserve the aging schedule (30/60/90/120+ buckets) so the AR/AP aging report in Jaz matches the source.

### Full Conversion — Original Transaction Rates

Full conversion uses the **original exchange rate** from each transaction (the rate at the time the invoice/bill was created). If the source provides per-transaction rates, pass them via `exchangeRate`. If not, Jaz auto-fetches ECB rates via the Frankfurter provider based on `valueDate`.

### Unrealized FX Gains/Losses — Quick vs. Full

**Quick Conversion:** UGL from the prior platform is captured in the TTB journal. Conversion invoices/bills are recorded at FYE rate with explicit `exchangeRate`, producing zero UGL in Jaz. No separate UGL journals are needed.

**Full Conversion:** Replicate any unrealized FX revaluation journals from the source system as manual journals in Jaz, if they fall within the conversion period. These preserve the historical UGL trail.

## Clearing Account Mechanics

### How Clearing Accounts Work

**After Phase 2 (conversion invoices/bills):**
- AR Clearing has a CREDIT balance (from invoice line items)
- AP Clearing has a DEBIT balance (from bill line items)

**After Phase 3 (TTB journal):**
- TTB debits AR Clearing (for the AR balance amount)
- TTB credits AP Clearing (for the AP balance amount)
- Both clearing accounts should now be **exactly zero**

### Debugging Non-Zero Clearing Accounts

If AR Clearing ≠ 0:
```
AR Clearing balance = (TTB AR debit) - (sum of all conversion invoice amounts)
```
- **Positive balance:** TTB AR amount > sum of invoices → missing invoices or wrong amounts
- **Negative balance:** Sum of invoices > TTB AR amount → extra invoices or wrong TB amount

Same logic applies for AP Clearing.

### Common Causes
1. **Rounding in FX conversions** — functional currency amounts may differ by $0.01-0.02
2. **AR aging doesn't match TB** — some aging reports exclude credit balances or include disputed amounts
3. **Missing invoices/bills** — some entries in the aging report were missed during creation
4. **Different FX rates** — invoice created with a different rate than TTB (should not happen if explicit `exchangeRate` is used on FX transactions)

### Fix
Create a small adjustment journal to bring the clearing account to zero. Document the reason (e.g., "FX rounding adjustment — $0.02").

## Idempotency — Stale Conversion Cleanup

The pipeline is safe to re-run. Before creating Phase 2 transactions, it searches for and deletes any existing resources with conversion reference patterns:
- Invoices matching `CONV-INV-*`
- Bills matching `CONV-BILL-*`
- Customer credit notes matching `CONV-CCN-*`
- Supplier credit notes matching `CONV-SCN-*`
- Journals matching the TTB reference

This ensures a clean slate before each execution. The search uses `/api/v1/{entity}/search` with `filter: { reference: { contains: "CONV-INV" } }`.

## CoA Bulk-Upsert Batch Rejection

**Gotcha:** `POST /api/v1/chart-of-accounts/bulk-upsert` rejects the **entire batch** if any single account in the batch already exists (returns a `DUPLICATED` error). This is all-or-nothing.

The executor handles this by treating the entire batch as "skipped" and then re-fetching all accounts via `/api/v1/chart-of-accounts/search` to get resource IDs.

If calling manually, either:
1. Filter out existing accounts before sending the batch
2. Catch `DUPLICATED` errors and fall through to a search

## Rounding

### The $0.01 Problem
Accounting systems often produce rounding differences when converting between currencies. A source TB may show $1,234.57 but the sum of individual conversion invoices totals $1,234.56.

**Rules:**
1. Always use the source's exact amounts — never round or truncate
2. If the source has amounts to more than 2 decimal places, use them as-is (Jaz supports up to 6 decimals on unit prices)
3. If a rounding difference exists after all transactions are created, add a small adjustment journal

### Rounding in Tax Calculations
If the source calculates tax differently from Jaz (e.g., tax per line item vs tax on total), small differences may arise. Create an adjustment journal if needed.

## Partial Payments in AR/AP Aging

### Quick Conversion
The AR/AP Aging report shows **outstanding amounts only**. Partial payments are already factored in — the aging shows what's still owed.

Create conversion invoices/bills for the outstanding amount, not the original amount. Historical payments are not relevant.

### Full Conversion
Each payment must be linked to its invoice/bill. If a single payment covers multiple invoices, create separate payment records:

```
POST /api/v1/invoices/<invoice1>/payments
{ "payments": [{ "paymentAmount": 500, "transactionAmount": 500, ... }] }

POST /api/v1/invoices/<invoice2>/payments
{ "payments": [{ "paymentAmount": 300, "transactionAmount": 300, ... }] }
```

## Credit Balances

### Negative AR (Customer Credit Balance)
If the AR Aging shows a negative amount for a customer, they have a credit balance (overpayment or unapplied credit note).

**Options:**
1. Create a customer credit note for the amount
2. Create a conversion invoice with negative amount (if the API allows)
3. Include in the TTB journal as a credit to AR

### Negative AP (Supplier Credit Balance)
Same logic — create a supplier credit note or include in TTB.

## System-Generated Accounts

When doing a CoA wipe-and-replace on a fresh org:

### Accounts That Cannot Be Deleted
- **Retained Earnings** — system-controlled, used for year-end close
- **Unrealized Currency Gain/Loss** — system auto-creates for FX revaluation
- **Rounding** — system account for rounding adjustments
- **Bank accounts linked to payment methods** — must unlink first

### Discovery
```
POST /api/v1/chart-of-accounts/search
{ "limit": 200, "offset": 0 }
```
Check for `isSystemGenerated: true` flag. These must be preserved.

### Strategy
1. Map source accounts to system accounts where possible (e.g., source "Retained Earnings" → Jaz's system "Retained Earnings")
2. Skip deletion of system accounts
3. Create only the accounts that don't already exist

## Void and Rollback

If a conversion goes wrong mid-execution:

### For Invoices/Bills
- `DELETE /api/v1/invoices/<id>` — deletes the invoice (conversion invoices can be deleted directly)
- `DELETE /api/v1/bills/<id>` — deletes the bill
- `DELETE /api/v1/customer-credit-notes/<id>` — deletes customer CN
- `DELETE /api/v1/supplier-credit-notes/<id>` — deletes supplier CN

### For Journals
- `DELETE /api/v1/journals/<id>` — deletes the journal entry

### For Contacts/Items
- `DELETE /api/v1/contacts/<id>` — only if no transactions reference them
- `DELETE /api/v1/items/<id>` — only if no transactions reference them

### For CoA
- `DELETE /api/v1/chart-of-accounts/<id>` — only if no transactions reference them

### Automatic Rollback (Pipeline)
The automated pipeline has built-in rollback:
- **Phase 2 failure:** If any conversion invoice/bill/credit note fails, ALL successfully created Phase 2 resources are automatically deleted, and Phases 3-4 are skipped.
- **Phase 3 failure:** If the TTB journal fails, ALL Phase 2 resources are automatically rolled back.
- This ensures the org is left clean — no partial conversions with unbalanced clearing accounts.

### Manual Rollback Strategy
If rolling back manually:
1. Delete in reverse order: journal → credit notes → bills → invoices → contacts → CoA
2. Some entities may be undeletable if they have dependencies
3. Clearing accounts MUST net to zero — never leave a partial conversion in place
