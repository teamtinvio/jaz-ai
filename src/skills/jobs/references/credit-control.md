# Credit Control / AR Chase

Systematically chase overdue customer invoices, assess collection risk, and manage bad debt exposure. This is not just "send reminders" — it's a structured process to protect your cash flow and recognize when receivables are impaired.

**CLI:** `clio jobs credit-control [--overdue-days 30] [--json]`

---

## Phase 1: Generate the AR Aging

The aging report is your starting point. Everything flows from this.

### Step 1: Generate AR aging report

```
POST /api/v1/generate-reports/ar-report
{ "endDate": "2025-02-28" }
```

**What you get:** All outstanding customer invoices grouped by aging bucket (current, 1-30 days, 31-60 days, 61-90 days, 91-120 days, 120+ days), with totals per customer and grand totals.

### Step 2: Export for working paper (optional)

```
POST /api/v1/data-exports/ar-report
{ "endDate": "2025-02-28" }
```

---

## Phase 2: Prioritize

### Step 3: Filter by overdue threshold

If `--overdue-days` is specified (e.g., 30), focus on invoices overdue by at least that many days. Otherwise, review all overdue items.

**Priority classification:**

| Priority | Overdue | Action |
|----------|---------|--------|
| **Critical** | 90+ days | Escalate to management, consider legal, assess bad debt |
| **High** | 60-90 days | Direct phone call, formal demand letter |
| **Medium** | 30-60 days | Follow-up email with statement of account |
| **Low** | 1-30 days | Gentle reminder, may be processing delay |
| **Current** | Not yet due | No action needed — monitor only |

### Step 4: Group by customer, sort by largest balance

From the AR aging data, rank customers by total overdue amount (descending). The 80/20 rule applies — a handful of customers typically account for most of your overdue AR.

---

## Phase 3: Detailed Customer Review

For each overdue customer (starting with the largest balances), pull the full picture.

### Step 5: List outstanding invoices for a customer

```
POST /api/v1/invoices/search
{
  "filter": {
    "contactResourceId": { "eq": "<customer-uuid>" },
    "status": { "eq": "UNPAID" },
    "balanceAmount": { "gt": 0 }
  },
  "sort": { "sortBy": ["dueDate"], "order": "ASC" },
  "limit": 100
}
```

**What to check per invoice:**
- `dueDate` — How overdue is it?
- `balanceAmount` — How much is still owed? (Could be partially paid)
- `reference` — The invoice number for follow-up correspondence
- `totalAmount` vs `balanceAmount` — Has the customer been making partial payments?

### Step 6: Check for unapplied credit notes

Before chasing, verify there are no unapplied customer credit notes that should reduce the balance:

```
POST /api/v1/customer-credit-notes/search
{
  "filter": {
    "contactResourceId": { "eq": "<customer-uuid>" },
    "status": { "eq": "UNAPPLIED" }
  },
  "sort": { "sortBy": ["valueDate"], "order": "DESC" },
  "limit": 50
}
```

If there are unapplied credit notes, apply them before chasing:

```
POST /api/v1/invoices/{invoiceResourceId}/credits
{
  "credits": [
    { "creditNoteResourceId": "<credit-note-uuid>", "amountApplied": 500.00 }
  ]
}
```

### Step 7: Generate statement of account

```
POST /api/v1/statement-of-account-export
```

The statement of account is what you send to the customer — it shows all invoices, payments, and the running balance. Attach this to follow-up communications.

---

## Phase 4: Follow-Up Priority List

### Step 8: Build the chase list

For each overdue customer, document:

| Customer | Total Overdue | Oldest Invoice | Days Overdue | Priority | Action |
|----------|--------------|----------------|--------------|----------|--------|
| Acme Corp | $45,000 | INV-1023 | 95 | Critical | Phone + demand letter |
| Beta Ltd | $12,500 | INV-1089 | 62 | High | Phone call |
| Gamma Inc | $3,200 | INV-1134 | 35 | Medium | Email reminder |

**Escalation process (typical SMB):**

1. **Day 1-7 overdue:** Automated or gentle email reminder with invoice attached
2. **Day 14 overdue:** Second reminder, direct email to AP contact
3. **Day 30 overdue:** Phone call to AP contact, request payment commitment date
4. **Day 45 overdue:** Escalate to customer's management, send statement of account
5. **Day 60 overdue:** Formal demand letter, consider suspending future sales on credit
6. **Day 90 overdue:** Final demand, engage collections agency or legal counsel
7. **Day 120+ overdue:** Write off if uncollectable (see Phase 5)

---

## Phase 5: Bad Debt Assessment

**Conditional:** Only if there are material amounts in the 90+ day aging bucket.

### Step 9: Assess bad debt risk

For invoices that appear uncollectable, evaluate using the ECL (Expected Credit Loss) model:

**Calculator:** `clio calc ecl`

```bash
clio calc ecl --current 100000 --30d 50000 --60d 20000 --90d 10000 --120d 5000 --rates 0.5,2,5,10,50
```

This produces the provision matrix — the estimated total bad debt exposure based on aging buckets and historical loss rates.

**Recipe:** `bad-debt-provision` — see `transaction-recipes/references/bad-debt-provision.md` for the full ECL provision pattern.

### Step 10: Record bad debt write-off (if uncollectable)

When a specific invoice is confirmed uncollectable (customer bankrupt, dissolved, or dispute resolution failed), write it off:

**Option A: Customer credit note + write-off journal**

Create a customer credit note to clear the invoice balance:

```
POST /api/v1/customer-credit-notes
{
  "contactResourceId": "<customer-uuid>",
  "saveAsDraft": false,
  "reference": "CN-BADDEBT-001",
  "valueDate": "2025-02-28",
  "lineItems": [{
    "name": "Bad debt write-off — INV-1023",
    "unitPrice": 45000.00,
    "quantity": 1,
    "accountResourceId": "<bad-debt-expense-uuid>"
  }]
}
```

Then apply the credit note to the invoice:

```
POST /api/v1/invoices/{invoiceResourceId}/credits
{
  "credits": [
    { "creditNoteResourceId": "<credit-note-uuid>", "amountApplied": 45000.00 }
  ]
}
```

**Option B: Use DEBT_WRITE_OFF payment method**

Record as a payment using the special write-off method:

```
POST /api/v1/invoices/{invoiceResourceId}/payments
{
  "payments": [{
    "paymentAmount": 45000.00,
    "transactionAmount": 45000.00,
    "accountResourceId": "<bad-debt-expense-uuid>",
    "paymentMethod": "DEBT_WRITE_OFF",
    "reference": "WRITEOFF-INV-1023",
    "valueDate": "2025-02-28"
  }]
}
```

**Accounting effect:** DR Bad Debt Expense, CR Accounts Receivable — removes the receivable from the books and recognizes the expense.

---

## Phase 6: Verification

### Step 11: Re-run AR aging after actions

```
POST /api/v1/generate-reports/ar-report
{ "endDate": "2025-02-28" }
```

**What to check:**
- Credit notes have reduced the correct invoice balances
- Written-off invoices no longer appear in the aging
- Total AR ties to the Accounts Receivable balance on the trial balance

### Step 12: Review trial balance impact

```
POST /api/v1/generate-reports/trial-balance
{ "startDate": "2025-02-01", "endDate": "2025-02-28" }
```

**What to check:**
- Accounts Receivable balance reflects all collections, credit notes, and write-offs
- Bad Debt Expense (if write-offs were made) shows the correct amount
- Allowance for Doubtful Debts (if using provision method) reflects the ECL calculation

---

## Credit Control Checklist (Quick Reference)

| # | Step | Phase | Conditional |
|---|------|-------|-------------|
| 1 | Generate AR aging | Assess | Always |
| 2 | Export working paper | Assess | Optional |
| 3 | Filter by overdue threshold | Prioritize | If --overdue-days specified |
| 4 | Group by customer | Prioritize | Always |
| 5 | List outstanding invoices | Review | Always |
| 6 | Check unapplied credit notes | Review | Always |
| 7 | Generate statement of account | Review | Always |
| 8 | Build chase list | Follow-up | Always |
| 9 | Assess bad debt (ECL) | Bad debt | If material 90d+ balances |
| 10 | Record write-off | Bad debt | If confirmed uncollectable |
| 11 | Re-run AR aging | Verify | Always |
| 12 | Review trial balance | Verify | Always |

---

## Tips for SMBs

**Typical credit terms:** Net 30 is standard in Singapore. Some industries use Net 60 or Net 14. Whatever your terms, enforce them consistently — if you let one customer pay at 60 when terms are 30, everyone will.

**Prevention is cheaper than collection.** Before extending credit to a new customer, do a basic credit check (ACRA business profile for SG companies, $5.50). Set a credit limit and stick to it.

**The phone is more effective than email.** After 30 days, email follow-ups have diminishing returns. A 5-minute phone call to the AP department resolves more overdue invoices than 10 emails.

**Document everything.** Keep records of all follow-up attempts (dates, who you spoke to, commitments made). If it goes to legal, you need an evidence trail.

**When to involve legal:** If the amount exceeds $20,000 and the customer is unresponsive after 90 days, consider a letter of demand from a lawyer ($300-500). For amounts under $10,000, the Small Claims Tribunal (SG) is a cost-effective option.

**Bad debt tax deduction (SG):** Bad debts written off are deductible for income tax purposes if you can prove the debt is genuinely irrecoverable and reasonable steps were taken to collect. Keep documentation.
