# Supplier Statement Reconciliation

Compare your accounts payable balance for a supplier against the supplier's own statement. Identify missing bills, duplicate payments, pricing discrepancies, and timing differences. This is how you catch errors before they become disputes.

**CLI:** `clio jobs supplier-recon [--supplier "Acme Corp"] [--period 2025-01] [--json]`

---

## Phase 1: Get Supplier Details

### Step 1: Find the supplier contact

If `--supplier` is specified, search by name:

```
POST /api/v1/contacts/search
{
  "filter": {
    "supplier": { "eq": true },
    "name": { "contains": "Acme Corp" }
  },
  "sort": { "sortBy": ["name"], "order": "ASC" },
  "limit": 10
}
```

If no supplier is specified, list all suppliers:

```
POST /api/v1/contacts/search
{
  "filter": { "supplier": { "eq": true } },
  "sort": { "sortBy": ["name"], "order": "ASC" },
  "limit": 100
}
```

**What you need:** The supplier's `resourceId` and `name` for all subsequent queries.

---

## Phase 2: Pull Your Records

### Step 2: List all bills for the supplier in the period

```
POST /api/v1/bills/search
{
  "filter": {
    "contactResourceId": { "eq": "<supplier-uuid>" },
    "status": { "in": ["POSTED", "VOIDED"] },
    "valueDate": { "between": ["2025-01-01", "2025-01-31"] }
  },
  "sort": { "sortBy": ["valueDate"], "order": "ASC" },
  "limit": 1000
}
```

**Include VOIDED status** — you need to see voided bills to explain differences (e.g., "we voided your invoice #123 because it was a duplicate").

**Record for each bill:**
- Reference number
- Date
- Total amount
- Balance amount (how much is still unpaid)
- Status

### Step 3: List all payments to the supplier in the period

Search for payment transactions against the supplier's bills. First, get all bills (from Step 2), then check each bill's payment records:

```
GET /api/v1/bills/{billResourceId}/payments
```

Alternatively, search cashflow transactions for supplier payments:

```
POST /api/v1/cashflow-transactions/search
{
  "filter": {
    "contact": { "name": { "eq": "Acme Corp" } },
    "businessTransactionType": { "in": ["PURCHASE"] },
    "direction": { "eq": "PAYOUT" },
    "valueDate": { "between": ["2025-01-01", "2025-01-31"] }
  },
  "sort": { "sortBy": ["valueDate"], "order": "ASC" },
  "limit": 1000
}
```

### Step 4: List any supplier credit notes

```
POST /api/v1/supplier-credit-notes/search
{
  "filter": {
    "contactResourceId": { "eq": "<supplier-uuid>" },
    "status": { "eq": "UNAPPLIED" },
    "valueDate": { "between": ["2025-01-01", "2025-01-31"] }
  },
  "sort": { "sortBy": ["valueDate"], "order": "ASC" },
  "limit": 100
}
```

---

## Phase 3: Get the Supplier Statement Balance

### Step 5: Determine the AP balance per your books

Get the AP balance for this specific supplier from the AP aging report:

```
POST /api/v1/generate-reports/ap-report
{ "endDate": "2025-01-31" }
```

Look for the supplier in the report output and note their total balance.

Alternatively, for a quick per-supplier calculation:

```
POST /api/v1/bills/search
{
  "filter": {
    "contactResourceId": { "eq": "<supplier-uuid>" },
    "status": { "eq": "UNPAID" },
    "balanceAmount": { "gt": 0 }
  },
  "sort": { "sortBy": ["dueDate"], "order": "ASC" },
  "limit": 1000
}
```

Sum the `balanceAmount` from all results = your AP balance for this supplier.

### Step 6: Compare to supplier's statement

The supplier's statement is an external document — you'll have it as a PDF, email, or portal download. The key figure is their **closing balance** for the period.

**The reconciliation equation:**

```
Your AP balance (from Step 5)
  SHOULD EQUAL
Supplier's statement closing balance

If they don't match, the difference is explained by reconciling items (Phase 4).
```

---

## Phase 4: Identify Differences

Work through each discrepancy type systematically.

### Difference Type 1: Missing bills (in supplier statement, not in your books)

The supplier has invoiced you, but the bill isn't entered in Jaz.

**Common causes:**
- Bill arrived late (still in someone's inbox or physical mailbox)
- Bill was emailed to the wrong person
- Bill was received but not yet entered by the bookkeeper

**Resolution:** Obtain the bill from the supplier and enter it:

```
POST /api/v1/bills
{
  "contactResourceId": "<supplier-uuid>",
  "saveAsDraft": false,
  "reference": "BILL-MISSING-001",
  "valueDate": "2025-01-15",
  "dueDate": "2025-02-14",
  "lineItems": [{
    "name": "Office supplies — Jan 2025",
    "unitPrice": 850.00,
    "quantity": 1,
    "accountResourceId": "<expense-account-uuid>",
    "taxProfileResourceId": "<tax-profile-uuid>"
  }]
}
```

Or use Jaz Magic if you have the document:

```
POST /api/v1/magic/createBusinessTransactionFromAttachment
Content-Type: multipart/form-data

Fields:
  - sourceFile: <PDF of the missing bill>
  - businessTransactionType: "BILL"
  - sourceType: "FILE"
```

### Difference Type 2: Duplicate payments

You paid the same bill twice, or the supplier hasn't credited a payment you made.

**How to check:** Look for two payments with the same amount and similar dates against different bills from the same supplier.

**Resolution:**
- If genuinely paid twice → request a refund or credit note from the supplier
- If the supplier hasn't recorded your payment → send them the bank transfer reference/proof

### Difference Type 3: Timing differences

The most common and least worrying type. Your payment was made on Jan 30 but the supplier didn't record it until Feb 3.

**Resolution:** No action needed — these resolve themselves in the next period. Note them as reconciling items.

### Difference Type 4: Pricing discrepancies

The supplier's invoice amount differs from what you expected (wrong unit price, quantity, or missing discount).

**Resolution:**
- Contact the supplier to clarify
- If they agree to the correction → request a supplier credit note
- Enter the credit note when received:

```
POST /api/v1/supplier-credit-notes
{
  "contactResourceId": "<supplier-uuid>",
  "saveAsDraft": false,
  "reference": "SCN-DISPUTE-001",
  "valueDate": "2025-01-31",
  "lineItems": [{
    "name": "Price correction — Invoice #12345",
    "unitPrice": 150.00,
    "quantity": 1,
    "accountResourceId": "<expense-account-uuid>",
    "taxProfileResourceId": "<tax-profile-uuid>"
  }]
}
```

### Difference Type 5: Bills in your books, not in supplier statement

You have a bill entered, but the supplier doesn't show it.

**Common causes:**
- You entered a bill from a pro-forma/estimate instead of the actual invoice
- The bill was entered under the wrong supplier contact
- The supplier issued a credit note you haven't processed

**Resolution:** Investigate and either void the incorrect bill or request clarification from the supplier.

---

## Phase 5: Verification

### Step 7: Re-check after adjustments

After entering missing bills, credit notes, and resolving discrepancies:

```
POST /api/v1/bills/search
{
  "filter": {
    "contactResourceId": { "eq": "<supplier-uuid>" },
    "status": { "eq": "UNPAID" },
    "balanceAmount": { "gt": 0 }
  },
  "sort": { "sortBy": ["dueDate"], "order": "ASC" },
  "limit": 1000
}
```

Sum `balanceAmount` again. The difference between this and the supplier's statement should now be explainable entirely by timing differences.

### Step 8: Verify AP aging

```
POST /api/v1/generate-reports/ap-report
{ "endDate": "2025-01-31" }
```

**What to check:**
- Supplier's balance reflects all adjustments
- Total AP still ties to the Accounts Payable control account on the trial balance

---

## Supplier Recon Checklist (Quick Reference)

| # | Step | Phase | What |
|---|------|-------|------|
| 1 | Find supplier contact | Setup | Search contacts with supplier=true |
| 2 | List bills for period | Your records | Bills by contact + date range |
| 3 | List payments for period | Your records | Payment records per bill |
| 4 | List credit notes | Your records | Supplier credit notes in period |
| 5 | Get your AP balance | Compare | Sum of unpaid bill balances |
| 6 | Compare to supplier statement | Compare | External document comparison |
| — | Missing bills | Resolve | Enter missing, use Jaz Magic |
| — | Duplicate payments | Resolve | Request refund/credit |
| — | Timing differences | Resolve | Note only, resolves next period |
| — | Pricing discrepancies | Resolve | Request supplier credit note |
| — | Phantom bills | Resolve | Investigate and void if needed |
| 7 | Re-check balance | Verify | Should match or explain difference |
| 8 | Verify AP aging | Verify | Total AP ties to trial balance |

---

## Common Discrepancy Types (Summary)

| Type | Direction | Action |
|------|-----------|--------|
| Missing bill | You owe more than your books show | Enter the bill |
| Duplicate payment | You've overpaid | Request refund or credit |
| Timing difference | Payment in transit | No action, resolves next period |
| Price discrepancy | Amount disagrees | Request credit note or re-invoice |
| Phantom bill | Your books show more than supplier | Investigate, void if error |
| Unapplied credit | Credit note not yet applied | Apply to outstanding bill |

---

## Tips for SMBs

**Do this quarterly at minimum, monthly for high-volume suppliers.** Most supplier disputes become much harder to resolve after 90 days because people forget the details and documents get lost.

**Request statements proactively.** Don't wait for the supplier to send one — email their accounts department at the start of each quarter requesting a statement for the prior period. Many suppliers have online portals where you can download statements on demand.

**The most common issue is missing bills.** In our experience, 80% of supplier recon differences are bills you haven't entered yet. The fix is process, not technology — create a shared inbox or folder for bills and check it daily.

**GST implications of discrepancies.** If you discover missing bills during reconciliation, the input tax claim on those bills belongs to the quarter the bill is dated, not when you entered it. If you've already filed the GST return for that quarter, you may need to adjust in the next return or file a voluntary disclosure.
