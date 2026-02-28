# Bank Reconciliation Catch-Up

Clear unreconciled bank statement entries by matching them to existing transactions, creating missing ones, and flagging duplicates. This is the single most impactful thing you can do for book accuracy — a clean bank recon means cash is right, and cash being right means everything else has a fighting chance.

**CLI:** `clio jobs bank-recon [--account "DBS Current"] [--period 2025-01] [--json]`

---

## Phase 1: Identify Bank Accounts

List all bank accounts in the org. If `--account` is specified, filter to that one. Otherwise, reconcile all of them.

### Step 1: List bank accounts

```
GET /api/v1/bank-accounts?limit=100&offset=0
```

Or via CoA search (more reliable — gives you the resourceId directly):

```
POST /api/v1/chart-of-accounts/search
{
  "filter": { "accountType": { "eq": "Bank Accounts" } },
  "sort": { "sortBy": ["name"], "order": "ASC" }
}
```

**What you get:** A list of bank-type CoA accounts with `resourceId`, `name`, `currencyCode`. You need the `resourceId` for every subsequent step.

---

## Phase 2: Pull Unreconciled Items

For each bank account, pull all unreconciled bank records. This is your working list.

### Step 2: Search unreconciled bank records

```
POST /api/v1/bank-records/{accountResourceId}/search
{
  "filter": {
    "status": { "eq": "UNRECONCILED" },
    "valueDate": { "between": ["2025-01-01", "2025-01-31"] }
  },
  "sort": { "sortBy": ["valueDate"], "order": "ASC" },
  "limit": 1000
}
```

**Omit the `valueDate` filter** if you want to see ALL unreconciled items regardless of date. For a catch-up, you usually want everything.

**What to check:**
- Count of unreconciled items — this is your work queue
- Any items older than 60 days are red flags (investigate immediately)
- `netAmount` positive = cash-in, negative = cash-out
- `extContactName` and `description` are your best clues for matching

### Step 3: Check for possible duplicates

```
POST /api/v1/bank-records/{accountResourceId}/search
{
  "filter": { "status": { "eq": "POSSIBLE_DUPLICATE" } },
  "sort": { "sortBy": ["valueDate"], "order": "ASC" },
  "limit": 1000
}
```

**Handle duplicates first.** If two bank feed entries have the same date, amount, and description, the system flags them as `POSSIBLE_DUPLICATE`. Review and archive the genuine duplicates before proceeding — otherwise you'll create double entries trying to reconcile them.

---

## Phase 3: Categorize and Resolve

Work through each unreconciled item. There are four resolution paths.

### Path A: Match to existing transaction

The bank record matches an invoice payment, bill payment, or journal already in the books. This is the ideal case — the transaction exists, it just hasn't been linked to the bank record.

**For large volumes:** Use `clio jobs bank-recon match --input data.json --json` to auto-match bank records to transactions before manual review. The calculator finds 1:1, N:1, 1:N, and N:M matches with confidence scores. See the [bank-match reference](./bank-match.md) for input format and algorithm details.

**How to find the match manually:** Search cashflow transactions for the same amount and approximate date:

```
POST /api/v1/cashflow-transactions/search
{
  "filter": {
    "organizationAccountResourceId": { "eq": "<bank-account-uuid>" },
    "totalAmount": { "eq": 2500.00 },
    "valueDate": { "between": ["2025-01-10", "2025-01-20"] }
  },
  "sort": { "sortBy": ["valueDate"], "order": "DESC" },
  "limit": 20
}
```

**Tip:** Widen the date range by a few days — bank processing delays mean the book date and bank date often differ by 1-3 business days.

### Path B: Create missing transaction from attachment

The bank record represents a real transaction, but nothing has been entered in the books yet. If you have the receipt, invoice, or bill document, use Jaz Magic to create the transaction automatically.

```
POST /api/v1/magic/createBusinessTransactionFromAttachment
Content-Type: multipart/form-data

Fields:
  - sourceFile: <PDF or JPG of the invoice/receipt>
  - businessTransactionType: "BILL" (for expenses) or "INVOICE" (for income)
  - sourceType: "FILE"
```

Jaz Magic handles OCR, line item extraction, contact matching, and CoA mapping. It creates a draft transaction that you review and post.

**When you don't have a document:** Create the transaction manually using the appropriate endpoint (invoice, bill, cash-in, cash-out).

### Path C: Create cash journal for bank fees/charges

Bank fees, interest charges, service charges, and similar items don't have a corresponding invoice or bill. Record them as cash-out journals.

```
POST /api/v1/cash-out-journals
{
  "saveAsDraft": false,
  "reference": "BANK-FEE-JAN25-001",
  "valueDate": "2025-01-15",
  "accountResourceId": "<bank-account-uuid>",
  "journalEntries": [
    { "accountResourceId": "<bank-fees-expense-uuid>", "amount": 25.00, "type": "DEBIT", "name": "Monthly service charge — Jan 2025" }
  ]
}
```

For bank interest earned (cash-in):

```
POST /api/v1/cash-in-journals
{
  "saveAsDraft": false,
  "reference": "BANK-INT-JAN25-001",
  "valueDate": "2025-01-31",
  "accountResourceId": "<bank-account-uuid>",
  "journalEntries": [
    { "accountResourceId": "<interest-income-uuid>", "amount": 12.50, "type": "CREDIT", "name": "Interest earned — Jan 2025" }
  ]
}
```

### Path D: Flag for investigation

Some items don't have an obvious match or explanation. Flag these for the business owner or finance manager to investigate. Common causes:
- Personal transactions through the business account
- Refunds or chargebacks
- Intercompany transfers not yet recorded
- Errors in the bank feed (rare but happens)

---

## Phase 4: Verification

After resolving all items, verify the reconciliation is clean.

### Step 4: Re-check unreconciled count

```
POST /api/v1/bank-records/{accountResourceId}/search
{
  "filter": { "status": { "eq": "UNRECONCILED" } },
  "sort": { "sortBy": ["valueDate"], "order": "ASC" },
  "limit": 1
}
```

**Target:** Zero unreconciled items for the period, or only genuine timing differences (outstanding cheques, deposits in transit that will clear next period).

### Step 5: Bank balance summary

```
POST /api/v1/generate-reports/bank-balance-summary
{ "primarySnapshotDate": "2025-01-31" }
```

**What to check:**
- Book balance per Jaz should match the bank statement closing balance
- Any difference should equal the sum of known timing items
- Zero unreconciled difference = clean recon

### Step 6: Bank reconciliation summary report

```
POST /api/v1/generate-reports/bank-reconciliation-summary
{ "primarySnapshotDate": "2025-01-31" }
```

This gives you the formal reconciliation statement showing: opening balance + cash in - cash out = closing balance, with the reconciling items listed.

---

## Bank Recon Checklist (Quick Reference)

| # | Step | Phase | What |
|---|------|-------|------|
| 1 | List bank accounts | Identify | Get all bank-type CoA accounts |
| 2 | Pull unreconciled items | Pull | Search by status = UNRECONCILED |
| 3 | Check duplicates | Pull | Review POSSIBLE_DUPLICATE items |
| A | Match to existing | Resolve | Link to existing invoice/bill/journal |
| B | Create from attachment | Resolve | Use Jaz Magic for documents |
| C | Create cash journal | Resolve | Bank fees, interest, charges |
| D | Flag for investigation | Resolve | Unexplained items |
| 4 | Re-check count | Verify | Should be zero (or timing items only) |
| 5 | Bank balance summary | Verify | Book balance = bank statement |
| 6 | Reconciliation report | Verify | Formal reconciliation statement |

---

## Tips for SMBs

**Do this weekly, not monthly.** A weekly 15-minute recon is far easier than a monthly 3-hour catch-up. Monday morning is ideal — reconcile the prior week's bank activity before the new week starts.

**Set up bank rules for recurring items.** If you pay the same rent, subscription, or utility every month, create a bank rule to auto-categorize it. This eliminates the most repetitive part of recon.

```
POST /api/v1/bank-rules
```

**Use bank feeds if available.** Aspire and Airwallex direct feeds auto-import bank records daily. This eliminates the CSV import step entirely.

**Don't let it pile up.** The longer a bank record sits unreconciled, the harder it is to figure out what it was. After 90 days, you're essentially doing forensic accounting. Stay current.

**Common SMB bank fee accounts:**
- Bank Charges / Bank Fees (operating expense)
- Interest Expense (for overdraft/loan interest)
- Interest Income (for savings/deposit interest)
- Foreign Exchange Gain/Loss (for FX conversion fees)
