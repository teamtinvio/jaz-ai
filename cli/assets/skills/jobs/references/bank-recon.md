# Bank Reconciliation

> Clear unreconciled bank statement entries by matching, creating, or flagging. Highest-leverage book-accuracy job in Jaz — clean cash means everything else has a fighting chance. Driver tool: `generate_bank_recon_blueprint`.

## Tools, recipes, calculators this job uses

### MCP tools — discovery + auto-match
- **`generate_bank_recon_blueprint(period: <YYYY-MM>, currency: <base>)`** — step 0: emit phased recon checklist.
- **`list_bank_accounts()`** — step 1: pull all bank-type CoA accounts (per `jaz-api/SKILL.md` rule 18: GET `/bank-accounts` returns flat array `[{...}]`, NOT the standard paginated `{ data, totalElements, totalPages }` shape — normalize before consuming).
- **`search_accounts(filter: {accountType: {eq: 'Bank Accounts'}})`** — step 1 alternative: same data via standard CoA-search envelope if downstream wants pagination.
- **`search_bank_records(accountResourceId: <id>, status: 'UNRECONCILED', valueDateRange: {from, to}, limit: 200, sort: 'valueDate:asc')`** — step 2: per-account work queue.
- **`search_bank_records(accountResourceId: <id>, status: 'POSSIBLE_DUPLICATE')`** — step 3: handle dups FIRST or you'll double-create reconciling them.
- **`view_auto_reconciliation(bankAccountResourceId: <id>, recommendationType: 'MAGIC_MATCH' | 'MAGIC_RECONCILE_WITH_CASH_TRANSFER' | 'MAGIC_RECONCILE_WITH_BANK_RULE' | 'MAGIC_QUICK_RECONCILE')`** — step 4: READ-ONLY auto-match suggestions. Does NOT write. NOTE: documented 500 quirk on high-volume accounts — see error table.
- **`search_cashflow_transactions(filter: {organizationAccountResourceId: <bank-id>, totalAmount: {eq: <amt>}, valueDate: {between: [<-3d>, <+3d>]}})`** — step 5 manual match: search book-side transactions for the same amount within ±3 day window.

### MCP tools — execute reconciliation (NOT idempotent — see error table)
- **`apply_bank_rule(actionShortcutResourceId: <rule-id>, businessTransactionResourceIds: [<bank-entry-ids>])`** — step 4: rule-driven recon (async; returns jobId).
- **`quick_reconcile(bankAccountResourceId, journalsForReconciliation: [...])`** — step 4: bulk async (max 500 per call); returns jobId.
- **`reconcile_invoice_receipt(...)`** — step 4: 1:1 match of bank entry to AR invoice.
- **`reconcile_bill_receipt(...)`** — step 4: 1:1 match to AP bill.
- **`reconcile_direct_cash_entry(...)`** — step 4: bank entry to a single cash-in / cash-out line.
- **`reconcile_cash_journal(...)`** — step 4: bank entry to a multi-line cash journal.
- **`reconcile_manual_journal(...)`** — step 4: bank entry to a manual journal.
- **`reconcile_cash_transfer(...)`** — step 4: inter-account transfer.

### MCP tools — create missing transactions
- **`mcp magic create --file <pdf>` / `create_business_transaction_from_attachment(...)`** — step 6 path B: OCR + autofill bill or invoice from receipt PDF/JPG.
- **`create_cash_in_entry(...)` / `create_cash_out_entry(...)`** — step 6 path C: bank fees, interest, FX charges that have no source document.
- **`create_bank_rule(...)`** — preventive: build a rule for any recurring pattern you handled this run (subscription, rent, utility) so it auto-applies next time.

### MCP tools — verification
- **`generate_bank_recon_summary(period_end, accountResourceId)`** — step 7: per-account formal recon statement.
- **`generate_bank_recon_details(period_end, accountResourceId)`** — step 7: line-level recon detail for audit pack.
- **`generate_bank_balance_summary(period_end)`** — step 8: book balance vs bank statement balance per account.

### CLI tools — bulk auto-match cascade (offline)
- **`clio jobs bank-recon match --input <records.json> --tolerance 0.01 --date-window 14 --max-group 5 --json`** — the 5-phase cascade matcher (Phase 1 exact 1:1 hash join, Phase 2 fuzzy 1:1 greedy with weighted scoring, Phase 3 N:1, Phase 4 1:N, Phase 5 N:M). Returns matches sorted by confidence — feed each into the appropriate `reconcile_*` tool. See `bank-match.md` for the full algorithm.

### Cross-references
- Within an engagement: invoked from `practice/references/monthly-close.md` step 3 (mandatory pre-close gate). Practice playbook reads `CLIENT.bank_accounts[]` for the per-account loop.
- Sibling job: `bank-match.md` (the cascade matcher algorithm + scoring weights). Practitioner-facing recon step always invokes `bank-match` for any account with > ~10 unreconciled items.
- API rules: `jaz-api/SKILL.md` rules 18 (bank-accounts envelope), 26 (cash entries `accountResourceId` shape), 50a (search query DSL), 124 (recon NOT idempotent).

---

## Step 0 — Emit blueprint

```
generate_bank_recon_blueprint(period: '2025-01', currency: <CLIENT.base_currency>)
```

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

## Step 4 — Auto-match cascade

For accounts with > ~10 unreconciled rows, use the cascade matcher first:

```
clio jobs bank-recon match \
  --input recurring/monthly/<period>/bank-records-<account-name>.json \
  --tolerance 0.01 \
  --date-window 14 \
  --max-group 5 \
  --json
```

Returns matches with confidence scores: `exact` (Phase 1 hash), `fuzzy-high` (Phase 2 weighted ≥ 0.85), `fuzzy-medium` (0.70-0.85), `nm-confident` (Phase 5). For each match returned:

| Match type | Tool to invoke |
|------------|----------------|
| AR invoice ↔ bank cash-in | `reconcile_invoice_receipt(bankRecordResourceId, invoiceResourceId, paymentMethod, ...)` |
| AP bill ↔ bank cash-out | `reconcile_bill_receipt(bankRecordResourceId, billResourceId, paymentMethod, ...)` |
| Cash entry (single line) ↔ bank | `reconcile_direct_cash_entry(...)` |
| Cash journal (multi-line) ↔ bank | `reconcile_cash_journal(...)` |
| Manual journal ↔ bank | `reconcile_manual_journal(...)` |
| Inter-account transfer | `reconcile_cash_transfer(...)` |
| Bulk same-shape (>5 items) | `quick_reconcile(bankAccountResourceId, journalsForReconciliation: [...])` (async, returns jobId) |
| Bank rule applies | `apply_bank_rule(actionShortcutResourceId, businessTransactionResourceIds: [...])` (async) |

For `view_auto_reconciliation` suggestions outside the cascade: invoke once per account, walk the suggestions, commit via the matching `reconcile_*`. Pure read — no execution side effect.

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

Widen `valueDate` ±7 days for bank processing delays. Match candidate found → invoke matching `reconcile_*` tool.

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

**Path D — flag for investigation:** if no match and no source document, surface to practitioner with the `extContactName + description` and the `netAmount`. Common: personal transactions, refunds, intercompany unrecorded, bank-feed errors. Document in `ENGAGEMENT.risk_areas`.

## Step 7 — Verify per account

```
search_bank_records(accountResourceId: B.resourceId, status: 'UNRECONCILED', limit: 1)
```

Target: zero rows OR all remaining are documented timing differences (outstanding cheques, deposits in transit clearing next period — practitioner annotates).

```
generate_bank_recon_summary(period_end: '2025-01-31', accountResourceId: B.resourceId)
generate_bank_recon_details(period_end: '2025-01-31', accountResourceId: B.resourceId)
```

Save both to `recurring/monthly/<period>/bank-recon-<account-name>.{json,details.json}`. Audit-prep step 7 will require these files.

## Step 8 — Cross-account verify

```
generate_bank_balance_summary(period_end: '2025-01-31')
```

Per account: `bookBalance == bankStatementBalance ± documentedTimingDifference`. Discrepancy = unreconciled item missed → loop back to step 2 for that account.

---

## Common error classes and recovery

| Source | Error | Recovery |
|--------|-------|----------|
| `view_auto_reconciliation` | 500 on high-volume account | Documented quirk — service can OOM on accounts with thousands of unreconciled rows. Workaround: invoke per-period (`valueDateRange: {from, to}`) instead of all-time, OR fall back to `clio jobs bank-recon match` cascade which doesn't hit this endpoint. |
| `view_auto_reconciliation` | 404 | Endpoint not enabled for the org's plan tier. Use cascade matcher only. |
| `quick_reconcile` | PARTIAL_SUCCESS jobId | Async result. Poll `search_background_jobs(filter: {resourceId: {eq: <jobId>}})` until terminal. Read `data[0].errorDetails[]` for per-row failures; loop back to step 4 for the failed rows. |
| `quick_reconcile` / `reconcile_*` | (any) — NOT idempotent (rule 124) | On 500 / network error, do NOT retry. Confirm reconciled state via `view_auto_reconciliation` OR `search_bank_records(status: 'RECONCILED')` first. |
| `reconcile_invoice_receipt` | 422 `invoice_status_invalid` | Matched invoice still DRAFT. `finalize_invoice(resourceId: <id>)` first. |
| `reconcile_invoice_receipt` | 422 `amount_mismatch` | Bank amount ≠ invoice balance. Either partial payment (post via `create_invoice_payment` with partial amount, then reconcile), or wrong match (revisit step 4/5). |
| `apply_bank_rule` | 422 `rule_action_unsupported` | Rule's configured action doesn't match the bank entry shape (e.g., rule expects positive amount, entry is negative). Edit the rule via `update_bank_rule`. |
| `create_cash_out_entry` | 422 `lock_date_violated` | `valueDate` in locked period. Lift lock via `update_account` lockDate, post, re-lock. |
| Step 7 `unreconciledCount > 0` after step 6 | (residual misses) | Surface to practitioner with categorized residual ("3 bank charges to expense via path C, 1 unidentified deposit pending client query"). Document in `ENGAGEMENT.risk_areas`. Do NOT progress to monthly-close step 4 with open items. |

---

## Tips

- **Weekly cadence beats monthly catch-up.** Monday-morning 15-min recon vs end-of-month 3-hour scramble. Recipe + cascade matcher amortize across short queues much faster.
- **Bank rules are the highest-ROI investment.** Every recurring transaction (rent, subscription, utility) handled this run = a one-line `create_bank_rule` away from never seeing it again.
- **Aspire + Airwallex direct feeds eliminate CSV imports.** No file step before step 2.
- **Common bank-fee account suggestions:** `Bank Charges` / `Bank Fees` (Operating Expense), `Interest Expense` (for overdraft / loan interest paid to bank), `Interest Income` (savings / deposits), `Foreign Exchange Gain/Loss` (for FX conversion spreads).

---

## Cross-references back to engagements

- `practice/references/monthly-close.md` step 3 — invoked for every bank account in `CLIENT.bank_accounts[]`. Practice playbook owns the per-account orchestration.
- `practice/references/quarterly-gst.md` step 3 — same recon job, scoped to the quarter; F5 Box-1 cash receipts must reconcile against bank cash-in totals.
- `practice/references/annual-statutory.md` step 3 — final pre-FYE recon. Output feeds into `audit-prep.md` step 7 (NON-NEGOTIABLE deliverable: `unreconciledCount == 0` per account).
