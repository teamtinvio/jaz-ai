# Full Conversion (Option 1) — Complete Transaction History

> **Note:** Full Conversion automation is NOT yet implemented in the pipeline. The `conversionType: "full"` manifest option is reserved for future use. This document describes the **manual process** — an agent or human must execute these steps individually using the API. For automated conversion, use Quick Conversion (`conversionType: "quick"`).

## Overview

The Full Conversion transfers **all transaction details** for FY and FY-1 (typically 2 financial years). This preserves the complete audit trail including individual invoices, bills, payments, journals, and more.

**Result:** On Jaz, the ledger shows every transaction from the source system. The Trial Balance at any date within the conversion period matches the source.

## Required Input Files

**No date range (reference data):**
1. Chart of Accounts — full CoA list
2. Contact list (customers + suppliers) with details
3. Item list (products/services)
4. Tax profile list
5. Exchange rate table (rates for the conversion period)

**As-on date (FYE or start date):**
6. Trial Balance — opening balances at conversion start
7. AR Aging — outstanding receivables at conversion start
8. AP Aging — outstanding payables at conversion start
9. Fixed Asset Register — assets with accumulated depreciation

**Conversion period range:**
10. Detailed invoice listing (with line items)
11. Detailed bill listing (with line items)
12. Payment details (invoice payments + bill payments)
13. General Ledger report (all journal entries)
14. Credit note listing (customer + supplier)
15. Bank statement / bank records
16. Cash-in / cash-out entries
17. Cash transfer records

## Execution Order

### Phase 1: Foundation (same as Quick)
1. Currencies + exchange rates
2. Chart of Accounts (full match or replace)
3. Tax profile discovery + mapping
4. Contacts (customers + suppliers)
5. Items (products/services with pricing)

### Phase 2: Opening Balances
If converting mid-FY (not from the very start of the ledger):
- Create a TTB journal for opening balances at the conversion start date
- This is the same pattern as Quick Conversion Phase 3

### Phase 3: Transactions (chronological order within the period)

#### 3.1 Invoices
Create each source invoice with its original:
- Date (`valueDate`)
- Reference number
- Contact
- Line items (account, description, quantity, unit price, tax)
- Currency + exchange rate (for FX invoices)

#### 3.2 Bills
Same pattern as invoices but via `POST /api/v1/bills`.

#### 3.3 Journal Entries
Source GL entries that aren't invoices/bills/payments → create as journal entries.
- Map each line to the correct CoA account
- Preserve debit/credit direction
- Note: Journals have NO top-level currency field

#### 3.4 Credit Notes
- Customer credit notes via `POST /api/v1/customer-credit-notes`
- Supplier credit notes via `POST /api/v1/supplier-credit-notes`

#### 3.5 Cash Entries
- Cash-in entries (deposits received)
- Cash-out entries (payments made directly from bank)
- Cash transfers between bank accounts

### Phase 4: Settlements

#### 4.1 Invoice Payments
For each payment in the source:
```
POST /api/v1/invoices/<invoiceResourceId>/payments
{
  "payments": [{
    "paymentAmount": <bank currency amount>,
    "transactionAmount": <invoice currency amount>,
    "accountResourceId": "<bank account ID>",
    "paymentMethod": "BANK_TRANSFER",
    "reference": "<payment ref>",
    "valueDate": "<payment date>"
  }]
}
```

#### 4.2 Bill Payments
Same pattern via `POST /api/v1/bills/<billResourceId>/payments`.

#### 4.3 Credit Note Applications
Apply credit notes to invoices/bills if the source shows them as applied.

### Phase 5: Post-Transaction Data

#### 5.1 Bank Records
Import bank statements for reconciliation:
- Via `POST /api/v1/magic/importBankStatementFromAttachment` (multipart form with fields: `sourceFile`, `accountResourceId`, `businessTransactionType: "BANK_STATEMENT"`, `sourceType: "FILE"`)
- Or via individual `POST /api/v1/bank-records/:accountResourceId` (JSON)

#### 5.2 Fixed Assets
Transfer existing assets with accumulated depreciation:
```
POST /api/v1/transfer-fixed-assets
```
This preserves the asset's cost basis and accumulated depreciation — do NOT use the "new asset" endpoint which would reset depreciation.

### Phase 6: Verify
Pull TB from Jaz at multiple dates (conversion start, mid-period, period end) and compare against source.

## Key Differences from Quick Conversion

| Aspect | Quick | Full |
|--------|-------|------|
| Transactions created | Conversion invoices/bills only | All original transactions |
| Date on documents | Original dates (FYE fallback) | Original dates |
| Exchange rates | Explicit FYE rate (zero UGL) | Original rates per transaction |
| Payments | None (just open balances) | All payments linked to documents |
| Journals | TTB only | TTB + all source journals |
| Verification points | TB at FYE only | TB at multiple dates |
| Complexity | Low-medium | High |
| Time to execute | Hours | Days |

## Edge Cases

### Payments That Cross Invoices
A single payment may cover multiple invoices. Create separate payment records for each invoice, splitting the amount.

### Void/Deleted Transactions
Skip voided transactions — they don't affect balances. If the source shows a void + reversal, only the reversal matters.

### Inter-Company Transactions
If the source has inter-company entries, these must map to the correct contact + accounts on each side.

### Unrealized FX Gains/Losses
Unlike Quick Conversion (where prior UGL is captured in the TTB and conversion invoices use explicit FYE rate for zero UGL), Full Conversion replicates **all transactions at their original rates**. Any unrealized FX revaluation journals from the source system should be replicated as manual journals in Jaz if they fall within the conversion period. This preserves the full historical UGL trail.

### Inventory
If the source has inventory items with WAC (Weighted Average Cost), the opening inventory value must match. Create inventory adjustments if needed.
