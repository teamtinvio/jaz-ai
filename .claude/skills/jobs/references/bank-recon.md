# Bank Reconciliation

> Clear unreconciled bank statement entries by matching, creating, or flagging. Highest-leverage book-accuracy job in Jaz — clean cash means everything else has a fighting chance. Walk the steps below in order, calling the named platform tools directly. (Local CLI convenience: `clio jobs bank-recon` prints this same phased checklist.)

## Tools, recipes, calculators this job uses

### Platform tools — discovery + auto-match
- **`list_bank_accounts()`** — step 1: pull all bank-type CoA accounts (per `jaz-api/SKILL.md` rule 18: GET `/bank-accounts` returns flat array `[{...}]`, NOT the standard paginated `{ data, totalElements, totalPages }` shape — normalize before consuming).
- **`search_accounts(filter: {accountType: {eq: 'Bank Accounts'}})`** — step 1 alternative: same data via standard CoA-search envelope if downstream wants pagination.
- **`search_bank_records(accountResourceId: <id>, status: 'UNRECONCILED', valueDateRange: {from, to}, limit: 200, sort: 'valueDate:asc')`** — step 2: per-account work queue.
- **`search_bank_records(accountResourceId: <id>, status: 'POSSIBLE_DUPLICATE')`** — step 3: handle dups FIRST or you'll double-create reconciling them.
- **`view_auto_reconciliation(bankAccountResourceId: <id>, recommendationType: 'MAGIC_MATCH' | 'MAGIC_RECONCILE_WITH_CASH_TRANSFER' | 'MAGIC_RECONCILE_WITH_BANK_RULE' | 'MAGIC_QUICK_RECONCILE' | 'MAGIC_RECONCILE_WITH_CASH_IN_OUT', autoCommitMaxAmount?: <number>)`** — step 4: READ-ONLY auto-match suggestions. Returns **execution-ready `suggestions[]`** — each carries `recommendedTool`, `execute` (ready-to-pass args), `confidenceTier`, and `autoCommitEligible`. This is the entry point for the auto-match decision gate (step 4a). `MAGIC_RECONCILE_WITH_CASH_IN_OUT` returns Learned-Predictions. Does NOT write. NOTE: 500 quirk on high-volume accounts → degrades to `{degraded:true}`; scope by period or fall back to the cascade matcher (see error table).
- **`search_cashflow_transactions(filter: {organizationAccountResourceId: <bank-id>, totalAmount: {eq: <amt>}, valueDate: {between: [<-3d>, <+3d>]}})`** — step 5 manual match: search book-side transactions for the same amount within ±3 day window.

### Platform tools — execute reconciliation (NOT idempotent — see error table)
**Match to EXISTING (preferred — no duplicates):**
- **`reconcile_with_payments(bankStatementEntryResourceId, businessTransactionPayments: [{cashflowTransactionResourceId, transactionAmount}], matchedPayments?, matchedBatchPayments?, adjustment?)`** — **the primary match path.** Match a bank entry to an EXISTING open bill/invoice/payment; creates the payment AND reconciles in one call (no `pay_bill`/`pay_invoice` first). FX auto-resolved server-side — pass no rate. Sync.
- **`reconcile_magic_match(bankAccountResourceId, entries: [{workflowType:'MAGIC_MATCH', bankStatementEntryResourceId, matchedBusinessTransactions}])`** — bulk-accept MAGIC_MATCH suggestions (max 500). Returns `{reconciled[], failed[]}` — a non-empty `failed[]` is a partial success; loop on it.
- **`reconcile_learned_prediction(bankStatementEntryResourceId, learnedPredictionResourceId, predictedPayload, predictedPayloadSchemaVersion, retryToken?)`** — accept an ML learned-prediction (payload passed verbatim from a `MAGIC_RECONCILE_WITH_CASH_IN_OUT` suggestion).
- **`apply_bank_rule(actionShortcutResourceId, businessTransactionResourceIds)`** — rule-driven recon (async; returns jobId).
- **`quick_reconcile(bankAccountResourceId, journalsForReconciliation)`** — bulk async (max 500); returns jobId.

**CREATE new (only when no existing open transaction matches):**
- **`reconcile_invoice_receipt(...)`** — CREATE a new AR invoice + reconcile. ⚠️ To match an EXISTING invoice use `reconcile_with_payments` instead.
- **`reconcile_bill_receipt(...)`** — CREATE a new AP bill + reconcile. ⚠️ To match an EXISTING bill use `reconcile_with_payments` instead.
- **`reconcile_direct_cash_entry(...)`** — bank entry to a single cash-in / cash-out line (no source document).
- **`reconcile_cash_journal(...)`** — bank entry to a multi-line cash journal.
- **`reconcile_manual_journal(...)`** — bank entry to a manual journal.
- **`reconcile_cash_transfer(...)`** — inter-account transfer.

### Platform tools — create missing transactions
- **`mcp magic create --file <pdf>` / `create_business_transaction_from_attachment(...)`** — step 6 path B: OCR + autofill bill or invoice from receipt PDF/JPG.
- **`create_cash_in_entry(...)` / `create_cash_out_entry(...)`** — step 6 path C: bank fees, interest, FX charges that have no source document.
- **`create_bank_rule(...)`** — preventive: build a rule for any recurring pattern you handled this run (subscription, rent, utility) so it auto-applies next time.

### Platform tools — verification
- **`generate_bank_recon_summary(period_end, accountResourceId)`** — step 7: per-account formal recon statement.
- **`generate_bank_recon_details(period_end, accountResourceId)`** — step 7: line-level recon detail for audit pack.
- **`generate_bank_balance_summary(period_end)`** — step 8: book balance vs bank statement balance per account.

### CLI tools — bulk auto-match cascade (offline)
- **`clio jobs bank-recon match --input <records.json> --tolerance 0.01 --date-window 14 --max-group 5 --json`** — the 5-phase cascade matcher (Phase 1 exact 1:1 hash join, Phase 2 fuzzy 1:1 greedy with weighted scoring, Phase 3 N:1, Phase 4 1:N, Phase 5 N:M). Returns matches sorted by confidence — feed each into the appropriate `reconcile_*` tool. See `bank-match.md` for the full algorithm.

### Cross-references
- Invoked by `month-end-close.md` step 3 (mandatory pre-close gate) — loop over each of the org's bank accounts.
- Sibling job: `bank-match.md` (the cascade matcher algorithm + scoring weights). Always run the cascade matcher for any account with > ~10 unreconciled items.
- API rules: `jaz-api/SKILL.md` rules 18 (bank-accounts envelope), 26 (cash entries `accountResourceId` shape), 50a (search query DSL), 125 (recon NOT idempotent).

---

## Steps

Walk steps 1-8 below. (Local CLI: `clio jobs bank-recon --period 2025-01` prints the same phased checklist.)

## Step 1 — Discover bank accounts

For multi-org agents: invoke `list_bank_accounts()`. For each account: `{resourceId, name, currencyCode, openingBalance, currentBalance}`. Per rule 18, normalize the flat-array response. Use `search_accounts(filter: {accountType: {eq: 'Bank Accounts'}})` if you also need full CoA metadata (parent group, etc.).

If `--account "DBS Current"` flag was passed: filter by `name == 'DBS Current'` first, then run the rest of the playbook on that account only.

## Step 2 — Per-account work queue

For each bank account `B`:

```
search_bank_records(
  accountResourceId: B.resourceId,
  status: 'UNRECONCILED',
  valueDateRange: { from: '2025-01-01', to: '2025-01-31' },
  limit: 200,
  sort: 'valueDate:asc'
)
```

Omit `valueDateRange` for full catch-up across all open periods. Paginate via `offset` if `totalElements > 200`. Each row: `{resourceId, valueDate, netAmount, extContactName, description, balance}`. `netAmount > 0` = cash-in; `< 0` = cash-out. `extContactName + description` are the highest-signal match clues.

Flag any item older than 60 days as red — surface to practitioner.

## Step 3 — Handle duplicates FIRST

```
search_bank_records(accountResourceId: B.resourceId, status: 'POSSIBLE_DUPLICATE', limit: 200)
```

Two bank-feed entries with same `valueDate + netAmount + description` = system-flagged duplicate. Review each pair: archive the duplicate via `archive_bank_record(resourceId: <id>)` BEFORE running step 4. If you reconcile a duplicated row, you'll create double cashflow entries.

Record the judgment per archived pair: `jot(kind: MATCH)` naming the kept entry, the archived entry, and the tie-breaker used.

## Step 4 — Auto-match cascade

For accounts with > ~10 unreconciled rows, use the cascade matcher first:

```
clio jobs bank-recon match \
  --input <bank-records-for-account>.json \
  --tolerance 0.01 \
  --date-window 14 \
  --max-group 5 \
  --json
```

Returns matches with confidence scores: `exact` (Phase 1 hash), `fuzzy-high` (Phase 2 weighted ≥ 0.85), `fuzzy-medium` (0.70-0.85), `nm-confident` (Phase 5). For each match returned — **prefer MATCH-EXISTING over CREATE-NEW** to avoid duplicating a bill/invoice the org already has:

| Match type | Tool to invoke |
|------------|----------------|
| **AP bill ↔ bank cash-out (MATCH EXISTING open bill)** | **`reconcile_with_payments(bankStatementEntryResourceId, businessTransactionPayments:[{cashflowTransactionResourceId, transactionAmount}])`** ← primary |
| **AR invoice ↔ bank cash-in (MATCH EXISTING open invoice)** | **`reconcile_with_payments(...)`** ← primary |
| Existing payment ↔ bank | `reconcile_with_payments(..., matchedPayments:[...])` |
| Bulk accept magic suggestions | `reconcile_magic_match(bankAccountResourceId, entries:[...])` → `{reconciled[],failed[]}` |
| Learned-prediction (cash-in-out) | `reconcile_learned_prediction(...)` |
| AR invoice — CREATE NEW (no existing match) | `reconcile_invoice_receipt(...)` |
| AP bill — CREATE NEW (no existing match) | `reconcile_bill_receipt(...)` |
| Cash entry (single line, no document) ↔ bank | `reconcile_direct_cash_entry(...)` |
| Cash journal (multi-line) ↔ bank | `reconcile_cash_journal(...)` |
| Manual journal ↔ bank | `reconcile_manual_journal(...)` |
| Inter-account transfer | `reconcile_cash_transfer(...)` |
| Bulk same-shape (>5 items) | `quick_reconcile(...)` (async, returns jobId) |
| Bank rule applies | `apply_bank_rule(...)` (async) |

## Step 4a — Auto-match decision gate (the end-to-end driver)

Call `view_auto_reconciliation`. It returns execution-ready `suggestions[]`. On high-volume accounts the engine can 500 (OOM) and the tool returns `{degraded:true}` — recover via the `clio jobs bank-recon match` cascade matcher (Step 4, above), which doesn't hit this endpoint. Walk the suggestions:

- **`autoCommitEligible === true`** (high confidence, has an `execute` plan, under any amount cap) → **auto-commit**: call the suggestion's `recommendedTool` with its `execute` args. For many high-confidence matches, prefer ONE `reconcile_magic_match` call (server idempotency-keyed) over looping `reconcile_with_payments` (non-idempotent).
- **everything else** (medium/low tier, `recommendedTool` undefined, CREATE-NEW, or amount over threshold) → **checkpoint**: surface to the user for confirmation. **The amount threshold is a HARD VETO over confidence** — a high-confidence but large match still checkpoints (pass `autoCommitMaxAmount` to enforce in code).
- **`{degraded:true}`** (500) → fall back to the `clio jobs bank-recon match` cascade (Step 4, above).

**Safety (recon is NOT idempotent):** before EACH auto-commit, re-check `search_bank_records(status:'RECONCILED')` for that entry (guards a concurrent second agent — `reconcile_with_payments` has no client idempotency key). Enforce a per-run auto-commit cap; above it, checkpoint the remainder rather than firing hundreds of irreversible sequential writes.

## Step 4b — Match a bank entry to an existing open bill/invoice

When you have a specific open bill/invoice to match (e.g. from `search_cashflow_transactions`), pass its `cashflowTransactionResourceId` to `reconcile_with_payments` — one call creates the payment AND reconciles. **No `pay_bill`/`pay_invoice` first.** Cross-currency (bank ccy ≠ bill ccy) is auto-resolved server-side — pass no rate; only the rare bill-ccy≠bank-ccy case needs explicit `paymentAmount` + `currencySettings`. On `TOTAL_RECONCILIATION_AMOUNT_MISMATCHED...`, put the delta into an `adjustment.cashAdjustmentEntries[]` leg (over/under-payment or FX write-off — the platform does NOT auto-post FX gain/loss) so the total equals the bank entry, then resend.

## Step 5 — Manual match (residuals)

For unreconciled rows the cascade missed:

```
search_cashflow_transactions(
  filter: {
    organizationAccountResourceId: { eq: B.resourceId },
    totalAmount: { eq: 2500.00 },
    valueDate: { between: ['2025-01-08', '2025-01-22'] }
  },
  sort: 'valueDate:desc',
  limit: 20
)
```

Widen `valueDate` ±7 days for bank processing delays. Match candidate found → invoke matching `reconcile_*` tool. Record the judgment: `jot(kind: MATCH)` naming the bank entry, the matched transaction, and the basis (amount, date window, contact).

## Step 6 — Create missing transactions

For unreconciled rows that have no book-side counterpart yet:

**Path B — has document (PDF/JPG):**
```
mcp magic create --file <invoice-or-receipt-path>
# OR equivalent MCP call:
create_business_transaction_from_attachment(
  sourceFile: <base64 or upload>,
  businessTransactionType: 'BILL' | 'INVOICE',
  sourceType: 'FILE'
)
```
Magic does OCR + line item extraction + contact matching + CoA suggestion. Returns draft. Review, finalize via `finalize_bill` / `finalize_invoice`, then loop back to step 4 to reconcile.

**Path C — bank fees / interest / FX charges (no document):**
```
create_cash_out_entry(
  reference: 'BANK-FEE-2025-01-15-001',
  valueDate: '2025-01-15',
  accountResourceId: <bank-account-id>,
  lines: [{
    accountResourceId: <Bank Charges expense GL>,
    amount: 25.00,
    type: 'DEBIT',
    name: 'Monthly service charge — Jan 2025'
  }],
  saveAsDraft: false
)
```

Per rule 26: `accountResourceId` at top level is the BANK account; `lines[]` carries the offset (expense / income).

For interest income: `create_cash_in_entry(...)` with `type: 'CREDIT'` line against `Interest Income`.

After creating, loop back to step 4 to reconcile.

**Preventive — build a bank rule:**
```
create_bank_rule(
  name: 'Monthly DBS Service Charge',
  matchCriteria: {description: {contains: 'service charge'}, amount: {between: [20, 30]}},
  action: 'RECONCILE_WITH_DIRECT_CASH_ENTRY',
  cashEntryTemplate: {accountResourceId: <Bank Charges>, ...}
)
```
Next month's same charge auto-reconciles via `apply_bank_rule`.

**Path D — flag for investigation:** if no match and no source document, surface to the user with the `extContactName + description` and the `netAmount`. Common: personal transactions, refunds, intercompany unrecorded, bank-feed errors. Record the unresolved item so it carries forward.

## Step 7 — Verify per account

```
search_bank_records(accountResourceId: B.resourceId, status: 'UNRECONCILED', limit: 1)
```

Target: zero rows OR all remaining are documented timing differences (outstanding cheques, deposits in transit clearing next period — practitioner annotates). Record the judgment: `jot(kind: SCOPE)` naming each residual accepted as a timing difference and why it clears next period.

```
generate_bank_recon_summary(period_end: '2025-01-31', accountResourceId: B.resourceId)
generate_bank_recon_details(period_end: '2025-01-31', accountResourceId: B.resourceId)
```

Keep both the summary and the line-level detail per account — audit-prep step 7 will require them.

## Step 8 — Cross-account verify

```
generate_bank_balance_summary(period_end: '2025-01-31')
```

Per account: `bookBalance == bankStatementBalance ± documentedTimingDifference`. Discrepancy = unreconciled item missed → loop back to step 2 for that account.

---

## Common error classes and recovery

| Source | Error | Recovery |
|--------|-------|----------|
| `view_auto_reconciliation` | 500 on high-volume account → returns `{degraded:true}` | Documented OOM quirk on accounts with thousands of unreconciled rows. The tool degrades (doesn't throw): scope per-period (`valueDateRange`) OR fall back to `clio jobs bank-recon match` cascade. |
| `view_auto_reconciliation` | 404 → returns `{notSupported:true}` | Endpoint not enabled for the org's plan tier. Use cascade matcher only. |
| `quick_reconcile` | PARTIAL_SUCCESS jobId | Async result. Poll `search_background_jobs(filter: {resourceId: {eq: <jobId>}})` until terminal. Read `data[0].errorDetails[]` for per-row failures; loop back to step 4 for the failed rows. |
| `quick_reconcile` / `reconcile_*` | (any) — NOT idempotent (rule 125) | On 500 / network error, do NOT retry. Confirm reconciled state via `view_auto_reconciliation` OR `search_bank_records(status: 'RECONCILED')` first. |
| `reconcile_with_payments` | (any 5xx/network) — NOT idempotent, **no client key** | A blind retry **double-creates a payment**. ALWAYS re-check `search_bank_records(status:'RECONCILED')` for the entry before retrying. (magic_match is entry-level idempotency-keyed; learned_prediction takes a `retryToken`.) |
| `reconcile_magic_match` | 200 with non-empty `failed[]` | PARTIAL success — `reconciled[]` succeeded, `failed[]` carries per-entry `errorCode`. Surface failures + loop only on the failed entries. **All-fail** (empty `reconciled[]`) = hard stop, surface. A re-submit returns already-done entries in `reconciled[]` (not `failed[]`) — don't treat them as new failures. |
| `reconcile_learned_prediction` | error (stale/invalid `predictedPayload`) | Do NOT retry the same opaque payload. Fall back to `reconcile_with_payments` or manual match. `retryToken` forces a fresh journal on an intentional edit-retry; omit for idempotent replay. |
| `reconcile_with_payments` | 422 `TOTAL_RECONCILIATION_AMOUNT_MISMATCHED...` | Payments + adjustments ≠ bank entry amount. Add the delta as an `adjustment.cashAdjustmentEntries[]` leg (over/under-payment or FX write-off) so the total matches, then resend. |
| `reconcile_with_payments` | 422 `...does not exist` / invalid status | The BT isn't an open bill/invoice (wrong id, already paid, or draft). Re-fetch via `search_cashflow_transactions`; finalize if draft. |
| `reconcile_invoice_receipt` | 422 `invoice_status_invalid` | Matched invoice still DRAFT. `finalize_invoice(resourceId: <id>)` first. |
| `reconcile_invoice_receipt` | 422 `amount_mismatch` | Bank amount ≠ invoice balance. Either partial payment (post via `create_invoice_payment` with partial amount, then reconcile), or wrong match (revisit step 4/5). |
| `apply_bank_rule` | 422 `rule_action_unsupported` | Rule's configured action doesn't match the bank entry shape (e.g., rule expects positive amount, entry is negative). Edit the rule via `update_bank_rule`. |
| `create_cash_out_entry` | 422 `lock_date_violated` | `valueDate` in locked period. Lift lock via `update_account` lockDate, post, re-lock. |
| Step 7 `unreconciledCount > 0` after step 6 | (residual misses) | Surface to the user with categorized residual ("3 bank charges to expense via path C, 1 unidentified deposit pending client query"). Record the residuals. Do NOT progress the month-end close with open items. |

---

## Tips

- **Weekly cadence beats monthly catch-up.** Monday-morning 15-min recon vs end-of-month 3-hour scramble. Recipe + cascade matcher amortize across short queues much faster.
- **Bank rules are the highest-ROI investment.** Every recurring transaction (rent, subscription, utility) handled this run = a one-line `create_bank_rule` away from never seeing it again.
- **Aspire + Airwallex direct feeds eliminate CSV imports.** No file step before step 2.
- **Common bank-fee account suggestions:** `Bank Charges` / `Bank Fees` (Operating Expense), `Interest Expense` (for overdraft / loan interest paid to bank), `Interest Income` (savings / deposits), `Foreign Exchange Gain/Loss` (for FX conversion spreads).

---

## Cross-references

- `month-end-close.md` step 3 — invoked for every bank account as a mandatory pre-close gate.
- `quarter-end-close.md` — same recon job scoped to the quarter; F5 Box-1 cash receipts must reconcile against bank cash-in totals.
- `audit-prep.md` step 7 — the final pre-FYE recon output feeds the audit pack (NON-NEGOTIABLE deliverable: `unreconciledCount == 0` per account).
- `bank-match.md` — the cascade matcher algorithm.
