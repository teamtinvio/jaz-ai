# Payment Run

> Process outstanding supplier bills in a structured weekly or fortnightly batch through the Jaz API surface. Driver tool: `generate_payment_run_blueprint`.

## Tools, recipes, calculators this job uses

### MCP tools (jaz-api)
- **`generate_payment_run_blueprint`** — used in step 1: emit phased blueprint for the cutoff date.
- **`search_bills(filter: {status: 'UNPAID', balanceAmount: {gt: 0}, dueDate: {lte: <cutoff>}}, sort: 'dueDate:asc', limit: 200)`** — used in step 2: pull due bills (paginate via `offset` if `>200`).
- **`generate_aged_ap(period_end: <cutoff>)`** — used in step 3: total-AP cross-check; flag bills in 60d+ aging buckets.
- **`generate_bank_balance_summary(period_end: <cutoff>)`** — used in step 5: confirm cash availability before approving the batch.
- **`get_contact(resourceId: <contactResourceId>)`** — used in step 4 (per supplier): pull payment terms / preferred payment method / bank details (especially `taxId`, `bankAccountNumber`, `bicSwift` for GIRO file generation).
- **`create_bill_payment(billResourceId: <id>, payments: [{...}])`** — used in step 6: post the payment per bill. NO BATCH PAYMENT ENDPOINT yet — one POST per bill.
- **`search_payments(filter: {reference: {startsWith: <run-prefix>}, valueDate: {eq: <run-date>}})`** — used in step 8: idempotency / verification check (re-running the run won't duplicate-pay if all references match).
- **`finalize_bill(resourceId: <id>)`** — used in step 0 fallback: bills must be `status: APPROVED` (not `DRAFT`) before they accept payments.

### CLI tools (jaz-cli)
- **`clio jobs payment-run --due-before <YYYY-MM-DD> --json`** — emit blueprint as JSON for downstream agent consumption.
- **`clio jobs payment-run outstanding --due-before <YYYY-MM-DD> --currency SGD --json`** — fetch outstanding bills grouped by supplier (uses API key; equivalent to step 2 + step 4 grouping in one call).

### Cross-references
- Within an engagement: invoked from `practice/references/monthly-close.md` step 8 (run between mid-month and month-end so the close has fewer outstanding payables) and from `practice/references/quarterly-gst.md` step 9 (final pre-filing payment run).
- Sibling jobs: `credit-control.md` (the AR-side mirror), `supplier-recon.md` (run BEFORE payment-run to catch disputed bills that should be excluded).
- API rules: `jaz-api/SKILL.md` rules 4-8 (payment field names — `paymentAmount` vs `transactionAmount` for FX), rule 24 (`currency` field shape), rule 50a (search `query` DSL). The 6 required payment fields are: `paymentAmount`, `transactionAmount`, `accountResourceId`, `paymentMethod`, `reference`, `valueDate` (jaz-api rule 7).

---

## Step 0 — Idempotency precheck

Generate a run prefix: `PAYRUN-<YYYY-MM-DD>-<seq>`. Before proceeding:

```
search_payments(filter: {reference: {startsWith: 'PAYRUN-2025-02-28-'}})
```

If results: surface "A payment run with prefix `PAYRUN-2025-02-28-*` already executed on this date (`<n>` payments totalling `<amt>`). Confirm intent — re-run will create duplicate payments." Halt unless practitioner confirms.

## Step 1 — Emit blueprint

```
generate_payment_run_blueprint(period_end: '2025-02-28', currency: <CLIENT.base_currency>)
```

Save to `recurring/<period>/payment-run-<run-date>/blueprint.json`. The blueprint produces the phased structure this playbook follows.

## Step 2 — Identify bills

```
search_bills(
  filter: {
    status: {eq: 'UNPAID'},
    balanceAmount: {gt: 0},
    dueDate: {lte: '2025-02-28'}
  },
  sort: 'dueDate:asc',
  limit: 200
)
```

Paginate via `offset` if `totalElements > 200`. Add a 7-day grace window (`dueDate.lte: <cutoff + 7 days>`) — pay slightly early beats missing day-after.

For each bill, also collect: `contactResourceId`, `currency`, `originalAmount`, `balanceAmount`, `dueDate`, `reference`. Per `jaz-api/SKILL.md` rule 52, `dueDate` arrives as epoch ms — convert with `new Date(ms)` before display.

## Step 3 — AP aging cross-check

```
generate_aged_ap(period_end: '2025-02-28')
```

Verify: `sum(search_bills.balanceAmount) ≈ generate_aged_ap.totalOutstanding` (within `CLIENT.materiality_threshold`). Mismatch indicates pending bills in non-`UNPAID` status (e.g., `PARTIALLY_PAID`) that need separate handling — surface to practitioner.

Flag any bill in the 60d+ bucket — these need priority OR dispute resolution. Cross-reference `practice/references/monthly-close.md` step 8 sub-clause "disputed bills" to exclude.

## Step 4 — Group by supplier

For each unique `contactResourceId` from step 2:
- `get_contact(resourceId: <id>)` to pull `paymentTerms`, `preferredPaymentMethod`, `bankAccountNumber`, `bicSwift`, `taxId`.
- Aggregate: `{ contactName, billCount, totalDue, currencies[], earliestDueDate, paymentMethod }`.

Suppliers prefer one consolidated payment per run. Multi-currency suppliers need separate per-currency payments (Jaz does NOT auto-net cross-currency).

## Step 5 — Cash availability gate

```
generate_bank_balance_summary(period_end: '2025-02-28')
```

For each `bankAccountResourceId` you'll pay from: confirm `availableBalance >= sum of payments to be drawn from it`. If insufficient: defer the bottom of the priority stack to the next run; surface the deferred list to practitioner with explanation.

Apply `CLIENT.cash_buffer_days` from CLIENT.md (default: 14 days operating expenses) — never drain to zero. Compute buffer-required from last 30 days' opex via `generate_profit_and_loss(period_start: <-30d>, period_end: <today>)`.

## Step 6 — Record payments

For each approved bill (one POST per bill — no batch endpoint):

```
create_bill_payment(
  billResourceId: <id>,
  payments: [{
    paymentAmount: 5350.00,
    transactionAmount: 5350.00,
    accountResourceId: <bank-account-resourceId>,
    paymentMethod: 'BANK_TRANSFER',
    reference: 'PAYRUN-2025-02-28-001',
    valueDate: '2025-02-28'
  }]
)
```

**FX bills (e.g., USD bill paid from SGD account):** `paymentAmount` is the SGD amount that left the bank, `transactionAmount` is the USD amount applied to the bill. The platform calculates the implied rate and posts the FX gain/loss. Per `jaz-api/SKILL.md` rule 4: same-currency means both fields equal; FX means they differ.

**Partial payment:** Set both fields to the partial amount; bill remains `UNPAID` with reduced `balanceAmount`.

**Reference convention:** `PAYRUN-YYYY-MM-DD-NNN` (zero-padded sequence). Bank reconciliation downstream relies on this prefix to auto-match bank statement lines.

**`paymentMethod` enum:** `BANK_TRANSFER` (default — GIRO / FAST / wire), `CHEQUE`, `CASH`, `CREDIT_CARD`, `E_WALLET` (PayNow for business, GrabPay).

## Step 7 — Verify

After all `create_bill_payment` calls succeed:

```
generate_aged_ap(period_end: '2025-02-28')
search_payments(filter: {reference: {startsWith: 'PAYRUN-2025-02-28-'}, valueDate: {eq: '2025-02-28'}})
```

Assert:
- AP aging total reduced by `sum(payments.transactionAmount)` (in base currency, FX-converted at value date).
- Bills fully paid no longer appear in aging; partials show reduced `balanceAmount`.
- `search_payments` returns N rows where N = bills paid in step 6.

```
generate_bank_balance_summary(period_end: '2025-02-28')
```

Assert: per-account balance reduced by `sum(paymentAmount per accountResourceId)`. Cross-reference to actual bank statement when it arrives — this is the next-day bank-recon job.

---

## Common error classes and recovery

| Source | Error | Recovery |
|--------|-------|----------|
| `create_bill_payment` | 422 `bill_not_approved` | Bill is `DRAFT`. `finalize_bill(resourceId: <id>)` first, then retry. Do NOT pay drafts. |
| `create_bill_payment` | 422 `currency_mismatch` | `paymentAmount` currency ≠ bank account currency. Either pay from the matching-currency bank account, or model as FX (different `paymentAmount` and `transactionAmount`). |
| `create_bill_payment` | 422 `bill_already_paid` | Bill went `PAID` since step 2. Re-run `search_bills` for fresh state; remove from batch. |
| `create_bill_payment` | 422 `lock_date_violated` | `valueDate` is in a locked period. Either lift the lock via `update_account` lock_date OR adjust `valueDate` to the next open period. |
| `create_bill_payment` | 500 mid-run | Some payments succeeded; others didn't. NOT idempotent — re-running the loop creates duplicates. Use `search_payments` with the run prefix to identify what succeeded; resume from the next unprocessed bill. |
| `generate_aged_ap` | Total mismatch with `search_bills` | Likely `PARTIALLY_PAID` bills excluded from `search_bills` filter. Add `status: {in: ['UNPAID', 'PARTIALLY_PAID']}` and retry. |

---

## Variations

- **Priority-based payment ordering:** `sort: 'dueDate:asc'` covers chronological. For overdue-first, sort by `daysOverdue:desc`. For supplier-strategic, get the practitioner to mark `CLIENT.priority_suppliers[]` and process those first.
- **Multi-currency runs:** Split the run by currency. SGD bills → SGD bank; USD bills → USD bank or SWIFT-routed. The actual bank disbursement is handled outside Jaz (via the bank's portal); Jaz records the payment after it clears.
- **Approval workflow (multi-signatory SMBs):** Build the batch in step 5, get out-of-band approval, then execute step 6 only after sign-off. Do NOT post payments before the actual bank transfer is initiated — Jaz payments are not "payment instructions", they record completed payments.
- **Early-payment discounts:** If supplier offers `2% 10 Net 30`, computing the equivalent annualized return is `(2% / 98%) × (365 / 20) ≈ 37.2%`. Take it when cash allows. Apply the discount as: pay `transactionAmount = bill.balanceAmount × 0.98`, then post a separate journal Dr Bank Charges/Discount Income for the 2% saved (cleaner than partial payment of the original bill).

---

## Cross-references back to engagements

- `practice/references/monthly-close.md` step 8 — payment-run is invoked between mid-month and month-end so the close has fewer outstanding payables to defer. Practice playbook reads `CLIENT.cash_buffer_days` and `CLIENT.bank_accounts[]` for the gate logic.
- `practice/references/quarterly-gst.md` step 9 — pre-filing payment-run to clear deductible-input-tax bills so they appear in the quarter's filing. Skip bills with `status: DRAFT` (they don't have GST claims yet).
- `practice/references/onboarding.md` — typically NOT invoked during onboarding (opening balances are set via the conversion flow, not a payment run).
