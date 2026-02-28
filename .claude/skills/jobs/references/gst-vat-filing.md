# GST/VAT Filing Preparation

Prepare your GST/VAT return by generating the tax ledger, reviewing output and input tax, identifying errors, and producing the filing summary. This job does NOT file the return for you — it produces the numbers and supporting detail you need to file accurately via IRAS myTax Portal (SG) or the equivalent authority.

**CLI:** `clio jobs gst-vat --period 2025-Q1 [--json]`

---

## Background: SG GST Basics

| Item | Detail |
|------|--------|
| **Current rate** | 9% (effective Jan 1, 2024) |
| **Filing frequency** | Quarterly (most SMBs) or monthly (if approved) |
| **Due date** | 1 month after the end of the quarter (e.g., Q1 Jan-Mar due Apr 30) |
| **Return form** | GST F5 (standard) or GST F7 (group registration) |
| **Penalty** | 5% surcharge on unpaid tax + $200/month late filing penalty |

**Tax codes in Jaz (SG defaults):**

| Code | Description | Rate |
|------|-------------|------|
| SR | Standard-Rated Supplies (output tax) | 9% |
| TX | Taxable Purchases (input tax) | 9% |
| ZR | Zero-Rated Supplies | 0% |
| ES | Exempt Supplies | 0% |
| OS | Out-of-Scope Supplies | 0% |
| EP | Exempt Purchases | 0% |
| IM | Import of Goods (subject to GST) | 9% |

---

## Phase 1: Generate the Tax Ledger

The tax ledger is your primary working paper. It lists every transaction that has a tax component.

### Step 1: Generate tax ledger for the quarter

```
POST /api/v1/generate-reports/vat-ledger
{ "startDate": "2025-01-01", "endDate": "2025-03-31" }
```

**What you get:** Every invoice, bill, credit note, and journal with a tax profile attached — grouped by tax code, showing gross amount, tax amount, and net amount.

### Step 2: Export for offline review (optional)

```
POST /api/v1/data-exports/vat-ledger
{ "startDate": "2025-01-01", "endDate": "2025-03-31" }
```

This gives you the Excel/CSV version for spreadsheet review.

---

## Phase 2: Review Output Tax (Sales GST Collected)

Output tax is the GST you charged customers on your sales. This is what you owe IRAS.

### Step 3: Cross-reference invoices to tax ledger

```
POST /api/v1/invoices/search
{
  "filter": {
    "status": { "eq": "UNPAID" },
    "valueDate": { "between": ["2025-01-01", "2025-03-31"] }
  },
  "sort": { "sortBy": ["valueDate"], "order": "ASC" },
  "limit": 1000
}
```

**What to check:**
- Total standard-rated sales (SR) on the tax ledger matches total invoiced amount at 9%
- Zero-rated sales (ZR) have proper documentation (export evidence, international service proof)
- Exempt sales (ES) are correctly classified (financial services, residential property, etc.)
- Customer credit notes are deducted from output tax (they reduce your GST liability)

### Step 4: Check for missing tax profiles

Look for invoices with no tax profile — these won't appear on the tax ledger and could mean under-declared output tax.

```
POST /api/v1/cashflow-transactions/search
{
  "filter": {
    "businessTransactionType": { "eq": "SALE" },
    "valueDate": { "between": ["2025-01-01", "2025-03-31"] }
  },
  "sort": { "sortBy": ["valueDate"], "order": "ASC" },
  "limit": 1000
}
```

Compare the count and total to the invoices search above. Discrepancies may indicate missing tax codes.

---

## Phase 3: Review Input Tax (Purchases GST Paid)

Input tax is the GST you paid on business purchases. This is what you can claim back from IRAS.

### Step 5: Cross-reference bills to tax ledger

```
POST /api/v1/bills/search
{
  "filter": {
    "status": { "eq": "UNPAID" },
    "valueDate": { "between": ["2025-01-01", "2025-03-31"] }
  },
  "sort": { "sortBy": ["valueDate"], "order": "ASC" },
  "limit": 1000
}
```

**What to check:**
- Total taxable purchases (TX) on the tax ledger matches total bills with 9% GST
- Supplier credit notes are deducted from input tax claims
- No claims on exempt purchases (EP) — these should not have claimable GST

### Step 6: Identify blocked input tax (SG-specific)

Certain purchases have GST that CANNOT be claimed even though the supplier charged it. These are "blocked" under the GST Act:

| Blocked Category | Examples |
|-----------------|----------|
| **Club subscription fees** | Country clubs, social clubs |
| **Medical/accident insurance** | Employee medical insurance (unless contractual) |
| **Medical expenses** | GP visits, dental, specialist |
| **Family benefits** | Housing, school fees, holiday passage |
| **Motor vehicle expenses** | Purchase, maintenance, fuel for non-commercial vehicles |
| **Entertainment** | Client entertainment, staff entertainment (> $50/person) |

**Conditional:** Only relevant if your business has expenses in these categories. Most SMBs will have at least motor vehicle and entertainment expenses to review.

**Action:** Ensure blocked input tax items are coded to a non-claimable tax code (EP or no tax profile), NOT TX. If they're coded as TX, they'll inflate your input tax claim and trigger IRAS scrutiny.

---

## Phase 4: Error Checks

### Step 7: Check for common GST errors

Run these checks against your tax ledger data:

**1. Zero-rated sales without documentation:**
- Every ZR sale needs export evidence (bill of lading, airway bill) or proof of international service
- IRAS can reclassify ZR to SR (9%) on audit if documentation is missing

**2. Exempt supplies miscoded as standard-rated:**
- Financial services, residential rental, sale of residential property are exempt (ES)
- If coded as SR, you've over-declared output tax and customers were overcharged

**3. Input tax claimed on non-business purchases:**
- Personal purchases through the business account with GST claimed
- Capital items used partly for non-business purposes (apportion the claim)

**4. Timing errors:**
- Invoice dated in Q1 but goods/services delivered in Q2 (tax point = earlier of invoice date or payment date)
- Supplier bill received in Q2 but dated Q1 — claim in the quarter of the tax invoice date

**5. FX transactions:**
- GST on FX transactions is calculated on the SGD equivalent at the transaction date rate
- Verify FX invoices/bills show the correct SGT amount for GST purposes

---

## Phase 5: GST Return Summary

### Step 8: Compile the GST F5 box mapping

Map your tax ledger totals to the IRAS GST F5 return boxes:

| Box | Description | Source |
|-----|-------------|--------|
| **Box 1** | Total value of standard-rated supplies | SR gross amount from tax ledger |
| **Box 2** | Total value of zero-rated supplies | ZR gross amount from tax ledger |
| **Box 3** | Total value of exempt supplies | ES gross amount from tax ledger |
| **Box 4** | Total value of supplies (Box 1 + 2 + 3) | Sum |
| **Box 5** | Total value of taxable purchases | TX + IM gross amount from tax ledger |
| **Box 6** | Output tax due (Box 1 x 9%) | SR tax amount from tax ledger |
| **Box 7** | Input tax and refunds claimed | TX + IM tax amount from tax ledger (minus blocked items) |
| **Box 8** | Net GST to pay/claim (Box 6 - Box 7) | If positive = pay IRAS. If negative = refund claim. |

### Step 9: Generate supporting reports

```
POST /api/v1/generate-reports/profit-and-loss
{ "primarySnapshotDate": "2025-03-31", "secondarySnapshotDate": "2025-01-01" }
```

```
POST /api/v1/generate-reports/trial-balance
{ "startDate": "2025-01-01", "endDate": "2025-03-31" }
```

**What to check:**
- GST Receivable (input tax) and GST Payable (output tax) accounts on the trial balance should reconcile to your Box 6 and Box 7 amounts
- Revenue on P&L should be consistent with Box 1 + Box 2 + Box 3 (total supplies)

---

## Phase 6: Export and File

### Step 10: Export the tax ledger for records

```
POST /api/v1/data-exports/vat-ledger
{ "startDate": "2025-01-01", "endDate": "2025-03-31" }
```

Keep this export as your supporting workpaper. IRAS can request transaction-level detail on audit.

**Filing:** Log into IRAS myTax Portal > GST > File GST Return (F5). Enter the box amounts from Step 8. Submit before the due date.

---

## GST Filing Checklist (Quick Reference)

| # | Step | Phase | Conditional |
|---|------|-------|-------------|
| 1 | Generate tax ledger | Generate | Always |
| 2 | Export for offline review | Generate | Optional |
| 3 | Cross-reference invoices | Output tax | Always |
| 4 | Check missing tax profiles | Output tax | Always |
| 5 | Cross-reference bills | Input tax | Always |
| 6 | Identify blocked input tax | Input tax | If blocked categories exist |
| 7 | Run error checks | Errors | Always |
| 8 | Compile F5 box mapping | Summary | Always |
| 9 | Generate supporting reports | Summary | Always |
| 10 | Export and file | File | Always |

---

## Common SMB GST Mistakes

1. **Claiming input tax on blocked items** — Motor vehicle fuel and entertainment are the most common. IRAS audits specifically look for these.

2. **Late registration** — If your taxable turnover exceeds $1M in any 12-month period (or you expect it to in the next 12 months), you must register within 30 days. Penalties apply retroactively.

3. **Wrong tax point** — GST is due on the earlier of: invoice date, payment date, or delivery date. Backdating invoices to shift GST to a later quarter is a compliance risk.

4. **Not claiming input tax on imports** — If you import goods and pay GST at customs, you CAN claim this as input tax. Many SMBs forget to include import GST in their returns.

5. **Mixing exempt and taxable supplies** — If you make both exempt and taxable supplies, you must apportion input tax. Only the portion attributable to taxable supplies is claimable. Use the standard method (revenue ratio) unless IRAS has approved a special method.

6. **Filing after the deadline** — Even if you owe nothing, late filing triggers a $200/month penalty. Set a calendar reminder for the 15th of the month after quarter-end to give yourself buffer time.
