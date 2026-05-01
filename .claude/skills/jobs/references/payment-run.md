# Payment Run (Bulk Bill Payments)

Process outstanding supplier bills in a structured batch. A payment run typically happens weekly or fortnightly — you identify what's due, group by supplier, approve the batch, and record the payments. This keeps supplier relationships healthy and avoids late payment penalties.

**CLI:** `clio jobs payment-run [--due-before 2025-02-28] [--json]`

---

## Phase 1: Identify Outstanding Bills

### Step 1: List all unpaid bills

Pull every posted bill with an outstanding balance:

```
POST /api/v1/bills/search
{
  "filter": {
    "status": { "eq": "UNPAID" },
    "balanceAmount": { "gt": 0 }
  },
  "sort": { "sortBy": ["dueDate"], "order": "ASC" },
  "limit": 1000
}
```

**What you get:** All unpaid bills sorted by due date (earliest first). Each result includes `balanceAmount` (remaining unpaid), `totalAmount` (original), `dueDate`, and contact details.

### Step 2: Filter by due date

If `--due-before` is specified, narrow to bills due on or before that date:

```
POST /api/v1/bills/search
{
  "filter": {
    "status": { "eq": "UNPAID" },
    "balanceAmount": { "gt": 0 },
    "dueDate": { "lte": "2025-02-28" }
  },
  "sort": { "sortBy": ["dueDate"], "order": "ASC" },
  "limit": 1000
}
```

**Tip:** Include bills due in the next 7 days beyond your cutoff — paying a few days early is better than missing one because it was due the day after your run.

---

## Phase 2: Group and Summarize

### Step 3: Group by supplier

Organize the bills by `contactResourceId`. For each supplier, summarize:

- Number of bills
- Total amount due
- Earliest due date
- Currency (important for FX payments)

**Why group:** Suppliers prefer a single consolidated payment over multiple small ones. It also reduces bank transaction fees for the payer.

### Step 4: Generate AP aging for context

```
POST /api/v1/generate-reports/ap-report
{ "endDate": "2025-02-28" }
```

**What to check:**
- Total AP aging should match the sum of all unpaid bills from Step 1
- Identify any bills in the 60d+ aging buckets — these are overdue and may need priority payment or dispute resolution
- Flag disputed bills (do NOT include them in the payment run)

---

## Phase 3: Select and Approve

### Step 5: Build the payment batch

Select which bills to pay. Three common approaches:

**All-due:** Pay everything due on or before the cutoff date. Simplest, works for most SMBs.

**Priority-based:** Pay overdue first (60d+, then 30d+), then current. Useful when cash is tight.

**Supplier-based:** Pay strategic suppliers first (sole suppliers, key relationships), then others. Business judgment call.

**Before proceeding:** Confirm cash availability. Check the bank balance:

```
POST /api/v1/generate-reports/bank-balance-summary
{ "primarySnapshotDate": "2025-02-28" }
```

If total payments exceed available cash, prioritize and defer the rest to the next run.

---

## Phase 4: Record Payments

### Step 6: Record payment for each bill

For each bill in the approved batch, record the payment:

```
POST /api/v1/bills/{billResourceId}/payments
{
  "payments": [{
    "paymentAmount": 5350.00,
    "transactionAmount": 5350.00,
    "accountResourceId": "<bank-account-uuid>",
    "paymentMethod": "BANK_TRANSFER",
    "reference": "PAYRUN-2025-02-28-001",
    "valueDate": "2025-02-28"
  }]
}
```

**CRITICAL field notes:**
- `paymentAmount` — The amount leaving the bank account (bank currency)
- `transactionAmount` — The amount applied to the bill balance (bill currency). Same as `paymentAmount` for same-currency. Different for FX (see below).
- `accountResourceId` — The bank account UUID (NOT the expense account)
- `paymentMethod` — Use `"BANK_TRANSFER"` for electronic payments. Other options: `"CHEQUE"`, `"CASH"`, `"CREDIT_CARD"`, `"E_WALLET"`
- `reference` — Use a consistent naming convention (e.g., `PAYRUN-{date}-{seq}`)
- `valueDate` — The date the payment is made (YYYY-MM-DD format)

Always wrap in `{ "payments": [...] }` even for a single payment.

**Note:** There is no batch payment endpoint yet. Each bill requires an individual `POST /bills/{id}/payments` call. If you're paying 50 bills, that's 50 API calls. The batch endpoint is planned but not yet available.

### Step 7: Partial payments

If paying less than the full balance (e.g., cash constraints or instalment arrangement), set `paymentAmount` and `transactionAmount` to the partial amount. The bill remains in `UNPAID` status with a reduced `balanceAmount`.

```
POST /api/v1/bills/{billResourceId}/payments
{
  "payments": [{
    "paymentAmount": 2000.00,
    "transactionAmount": 2000.00,
    "accountResourceId": "<bank-account-uuid>",
    "paymentMethod": "BANK_TRANSFER",
    "reference": "PAYRUN-2025-02-28-PARTIAL",
    "valueDate": "2025-02-28"
  }]
}
```

---

## Phase 5: FX Payments

**Conditional:** Only if paying bills in a non-base currency.

### Step 8: Record FX payment

When paying a foreign currency bill from a base currency bank account (e.g., paying a USD bill from an SGD account):

```
POST /api/v1/bills/{billResourceId}/payments
{
  "payments": [{
    "paymentAmount": 6750.00,
    "transactionAmount": 5000.00,
    "accountResourceId": "<sgd-bank-account-uuid>",
    "paymentMethod": "BANK_TRANSFER",
    "reference": "PAYRUN-2025-02-28-FX",
    "valueDate": "2025-02-28"
  }]
}
```

Here `paymentAmount` is 6,750 SGD (what left the bank) and `transactionAmount` is 5,000 USD (what was applied to the bill). The platform calculates the implied exchange rate and posts any FX gain/loss automatically.

**Tip:** Check the actual bank debit amount against your bank statement. Banks often add a spread to the exchange rate — the SGD amount debited may differ from what you'd calculate using the mid-market rate.

---

## Phase 6: Verification

### Step 9: Verify AP aging reflects the payments

```
POST /api/v1/generate-reports/ap-report
{ "endDate": "2025-02-28" }
```

**What to check:**
- Total AP should be reduced by the sum of all payments made
- Bills that were fully paid should no longer appear in the aging
- Partially paid bills should show the correct reduced balance

### Step 10: Verify bank balance

```
POST /api/v1/generate-reports/bank-balance-summary
{ "primarySnapshotDate": "2025-02-28" }
```

**What to check:**
- Bank balance should be reduced by the total payment amount
- Cross-reference to the actual bank statement to confirm all payments cleared

---

## Payment Run Checklist (Quick Reference)

| # | Step | Phase | Conditional |
|---|------|-------|-------------|
| 1 | List unpaid bills | Identify | Always |
| 2 | Filter by due date | Identify | If --due-before specified |
| 3 | Group by supplier | Summarize | Always |
| 4 | Generate AP aging | Summarize | Always |
| 5 | Build payment batch | Select | Always |
| 6 | Record each payment | Pay | Always |
| 7 | Partial payments | Pay | If cash constraints |
| 8 | FX payments | Pay | If multi-currency bills |
| 9 | Verify AP aging | Verify | Always |
| 10 | Verify bank balance | Verify | Always |

---

## Payment Method Options

| Method | When to Use | Code |
|--------|-------------|------|
| Bank transfer | Most common for SMBs — GIRO, FAST, wire | `BANK_TRANSFER` |
| Cheque | Decreasing usage but some suppliers still require it | `CHEQUE` |
| Cash | Petty cash payments, small amounts | `CASH` |
| Credit card | Corporate card payments | `CREDIT_CARD` |
| E-wallet | GrabPay, PayNow for business | `E_WALLET` |

---

## Tips for SMBs

**Run payments on a schedule.** Weekly (Friday) or fortnightly. Predictable payment cycles help with cash flow planning and reduce the "can you pay this urgently" interruptions.

**Use payment terms strategically.** If a supplier offers 2% 10 Net 30 (2% discount for paying within 10 days), that's equivalent to a 36% annualized return. Take early payment discounts when cash allows.

**Keep a buffer.** Don't pay everything that's due if it drains the account. Always maintain a cash buffer of at least 2 weeks of operating expenses.

**Payment reference convention:** Use a consistent format like `PAYRUN-YYYY-MM-DD-SEQ` so payments are easy to trace in both your books and the bank statement. This makes bank reconciliation much easier downstream.

**Approval workflow:** For SMBs with multiple signatories, build the payment list first, get approval, then execute. Don't record payments in Jaz until the actual bank transfer is initiated.
