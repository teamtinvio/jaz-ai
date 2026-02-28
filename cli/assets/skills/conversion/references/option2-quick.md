# Quick Conversion (Option 2) — Opening Balances at FYE

## Overview

The Quick Conversion transfers **opening balances** into Jaz as at the Financial Year End (FYE) date. It creates open AR/AP as conversion transactions (invoices/bills) and transfers all other balances via a TTB journal entry.

**Result:** On Jaz, the Trial Balance at FYE matches the source system. Open receivables and payables exist as documents that can receive future payments.

## Required Input Files

1. **Chart of Accounts** — full CoA list from source system
2. **Trial Balance at FYE** — all account balances as at the FYE date
3. **AR Aging at FYE** — outstanding receivable invoices (per customer, per currency)
4. **AP Aging at FYE** — outstanding payable bills (per supplier, per currency)
5. **Contact list** — customer and supplier details
6. **Tax profiles** — tax codes used in the source system
7. **Exchange rates** — closing rates for all currencies as at FYE

## Execution Order

### Phase 1: Foundation

#### 1.1 Currencies
- Enable all required currencies on the org
- Set FYE closing exchange rates
- These must exist before creating CoA entries with foreign currency

#### 1.2 Chart of Accounts
Two modes:

**Fresh org (default system CoA):**
1. GET existing CoA from Jaz
2. Identify system-generated accounts (cannot delete)
3. Delete non-system accounts that aren't in the source CoA
4. Create/update accounts to match source CoA
5. Create two clearing accounts:
   - **"AR Conversion Clearing"** — `classificationType: "Current Asset"`, code: `1299`
   - **"AP Conversion Clearing"** — `classificationType: "Current Liability"`, code: `2199`

**Existing org:**
1. GET existing CoA from Jaz
2. Fuzzy match source accounts to existing (by code AND name)
3. Create any missing accounts
4. Create clearing accounts if they don't exist

#### 1.3 Tax Profiles
- GET existing tax profiles from Jaz (read-only — cannot create)
- Match source tax codes to Jaz tax profiles
- Common mappings: "GST 9%" → SR (Standard Rated), "No Tax" → ES (Exempt Supply)

#### 1.4 Contacts
- Create customer and supplier contacts from source data
- Ensure each contact has: name, type (customer/supplier/both), currency if FX

### Phase 1D: Cleanup Stale Conversions (Idempotency)

Before creating new conversion transactions, the executor searches for and deletes any existing resources with matching references:
- `CONV-INV-*` — stale conversion invoices
- `CONV-BILL-*` — stale conversion bills
- `CONV-CCN-*` — stale customer credit notes
- `CONV-SCN-*` — stale supplier credit notes
- `TTB-*` — stale TTB journals

This makes the pipeline **safe to re-run** — if a previous execution partially completed or needs to be redone, Phase 1D cleans up the old resources first.

### Phase 2: Conversion Transactions

#### 2.1 Conversion Invoices (AR)
For each line in the AR Aging report:

```
POST /api/v1/invoices
{
  "contactResourceId": "<customer resource ID>",
  "reference": "CONV-INV-<sequence>",
  "valueDate": "<original invoice date or FYE date>",
  "dueDate": "<original due date or FYE date>",
  "currency": {                                       // ONLY if FX
    "sourceCurrency": "<invoice currency>",
    "exchangeRate": <FYE closing rate>                // explicit — ensures zero UGL
  },
  "lineItems": [{
    "name": "Conversion balance — <original invoice ref>",
    "quantity": 1,
    "unitPrice": <outstanding amount in source currency>,
    "accountResourceId": "<AR Conversion Clearing account ID>",
    "taxProfileResourceId": "<exempt tax profile ID>"
  }]
}
```

**Effect:** DR Accounts Receivable, CR AR Conversion Clearing

**Dates:** Use original dates from the aging report (preserves aging schedules). Fall back to FYE date if not available.

**FX invoices:** Use `currency: { sourceCurrency: "USD", exchangeRate: 1.35 }` (object form with explicit FYE rate). The `exchangeRate` field overrides Jaz's auto-fetch, ensuring zero UGL on day 1. See "FX Invoices/Bills — Dates vs. Rates" in Edge Cases below.

#### 2.2 Conversion Bills (AP)
For each line in the AP Aging report:

```
POST /api/v1/bills
{
  "contactResourceId": "<supplier resource ID>",
  "reference": "CONV-BILL-<sequence>",
  "valueDate": "<original bill date or FYE date>",
  "dueDate": "<original due date or FYE date>",
  "currency": {                                       // ONLY if FX
    "sourceCurrency": "<bill currency>",
    "exchangeRate": <FYE closing rate>
  },
  "lineItems": [{
    "name": "Conversion balance — <original bill ref>",
    "quantity": 1,
    "unitPrice": <outstanding amount in source currency>,
    "accountResourceId": "<AP Conversion Clearing account ID>",
    "taxProfileResourceId": "<exempt tax profile ID>"
  }]
}
```

**Effect:** DR AP Conversion Clearing, CR Accounts Payable

### Phase 3: Transfer Trial Balance (TTB)

Create a single journal entry that transfers ALL balances from the source TB, with special handling for AR and AP:

```
POST /api/v1/journals
{
  "reference": "TTB-CONVERSION",
  "valueDate": "<FYE date>",
  "journalEntries": [
    // For each account in the TB (except AR and AP):
    { "accountResourceId": "<account ID>", "amount": <balance>, "type": "DEBIT" },
    { "accountResourceId": "<account ID>", "amount": <balance>, "type": "CREDIT" },

    // For AR: debit to AR Conversion Clearing (NOT to Accounts Receivable)
    { "accountResourceId": "<AR Clearing ID>", "amount": <AR balance>, "type": "DEBIT" },

    // For AP: credit to AP Conversion Clearing (NOT to Accounts Payable)
    { "accountResourceId": "<AP Clearing ID>", "amount": <AP balance>, "type": "CREDIT" }
  ]
}
```

**Why AR/AP are different:** The conversion invoices (Phase 2) already created the AR/AP balances. If the TTB also put balances into AR/AP, they'd be doubled. Instead, the TTB debits/credits the clearing accounts, which nets them to zero.

**The clearing accounts MUST net to zero after the TTB.** If they don't:
- AR Clearing balance ≠ 0 → the AR aging total doesn't match the TB's AR balance
- AP Clearing balance ≠ 0 → the AP aging total doesn't match the TB's AP balance

### Phase 4: Lock & Verify

#### 4.1 Lock Date
Set the lock date on **each account individually** to the FYE date:

```
PUT /api/v1/chart-of-accounts/<accountResourceId>
{ "lockDate": "<FYE date>" }
```

This is NOT a single org-level call — it requires N API calls (one per account). The lock date prevents accidental edits to the converted data on or before the FYE date.

#### 4.2 Verify
Pull the Trial Balance from Jaz at the FYE date. Compare against the source TB.
See `verification.md` for the full checklist format.

## Edge Cases

### FX Invoices/Bills — Dates vs. Rates (Critical)

Quick conversion transfers **open** (unpaid) FX invoices/bills from the prior platform. These must be handled carefully to avoid unrealized gain/loss (UGL) variances:

**The problem:** The prior platform already computed UGL up to the FYE date. That UGL is captured in the TTB journal (Phase 3) as part of the Unrealized FX Gain/Loss account balance. If we record conversion invoices at a different rate, Jaz would compute its own UGL — doubling up.

**The solution:** Record FX conversion invoices/bills with:
- **Original dates** (valueDate + dueDate from the aging report) — so aging schedules are correct
- **Explicit FYE exchange rate** — so Jaz sees zero UGL on day 1

```
POST /api/v1/invoices
{
  "valueDate": "<original invoice date>",     // preserves aging schedule
  "dueDate": "<original due date>",           // preserves aging buckets
  "currency": {
    "sourceCurrency": "USD",
    "exchangeRate": 1.35                      // explicit FYE rate — overrides auto-fetch
  },
  ...
}
```

**Why this works:**
1. FYE rate = transferred transaction rate → zero UGL in Jaz on day 1
2. Prior platform's UGL is already in the TTB journal (Unrealized FX Gain/Loss account)
3. When a future payment is recorded against the conversion invoice, Jaz computes RGL against the FYE rate only — which is correct, because the balance was already marked-to-market at FYE
4. Original dates on the invoices preserve correct aging bucket positions (30/60/90/120+ days)

**When dates aren't available:** Some aging reports only show contact name + amount (no individual dates). In this case, fall back to FYE date for both valueDate and dueDate. Aging schedules will be flat ("current") but FX handling remains correct.

**Rate source:** FYE rates come from the exchange rates file (e.g., MAS closing rates). They're set on the org in Phase 1 via `POST /organization-currencies/:code/rates` and also passed explicitly on each FX transaction to guarantee the rate is used regardless of valueDate.

### Partially Paid Invoices in AR Aging
The AR Aging shows only the **outstanding** balance. Create the conversion invoice for the outstanding amount only — the historical payments are not relevant for Quick Conversion.

### Negative Balances in AR/AP Aging
A negative AR balance = customer overpayment (credit balance). Create as a customer credit note, not a negative invoice.
A negative AP balance = supplier overpayment. Create as a supplier credit note.

### Multiple Invoices Per Customer
The AR Aging may show multiple outstanding invoices per customer. Create separate conversion invoices for each — they may need to be paid separately later.

### Rounding
Always use the exact amounts from the source. If the source TB has $1,234.57, the TTB journal must use $1,234.57. Rounding errors of even $0.01 will cause TB mismatch.
