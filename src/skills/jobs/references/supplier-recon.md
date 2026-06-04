# Supplier Statement Reconciliation

> Compare AP balance per Jaz vs supplier's statement. Identify missing bills, duplicate payments, pricing discrepancies, timing differences. Walk the steps below in order, calling the named platform tools directly. (Local CLI convenience: `clio jobs supplier-recon` prints this same phased checklist.)

## Tools, recipes, calculators this job uses

### Platform tools
- **`search_contacts(filter: {supplier: true, name: {eq: <supplier>}})`** — step 1: resolve the supplier resourceId. Use fuzzy match if exact fails.
- **`get_contact(resourceId: <supplier id>)`** — step 1 detail: pull the supplier's payment terms, contact info.
- **`search_bills(filter: {contactResourceId: <supplier id>, valueDate: {between: [<period-start>, <period-end>]}}, limit: 200)`** — step 2: pull all bills from this supplier in the period. Paginate.
- **`search_payments(filter: {contactResourceId: <supplier id>, valueDate: {between: [<period-start>, <period-end>]}, type: 'PAYOUT'})`** — step 3: pull all payments to this supplier.
- **`search_supplier_credit_notes(filter: {contactResourceId: <supplier id>, valueDate: {between: [<period-start>, <period-end>]}})`** — step 4: pull credit notes that may have been applied.
- **`generate_aged_ap(period_end: <date>)`** — step 5: per-supplier outstanding balance.
- **`create_bill(...)`** / **`apply_credit_to_bill(...)`** / **`create_supplier_credit_note(...)`** — step 6: post any missing items identified during recon.

### Cross-references
- Run ad-hoc per major supplier, and at year-end as a mandatory recon for major suppliers (feeds `audit-prep.md` AP confirmations).
- Sibling jobs: `payment-run.md` (run BEFORE supplier-recon to capture pending payments; or AFTER to settle balances identified in recon), `audit-prep.md` step 6 AP aging.

---

## Steps

Walk steps 1-8 below. (Local CLI: `clio jobs supplier-recon --supplier "<name>" --period 2025-01` prints the same phased checklist.)

## Step 1 — Resolve supplier

```
search_contacts(filter: {supplier: true, name: {eq: 'Acme Corp Pte Ltd'}})
```

If empty: try fuzzy match (omit `eq` for `contains`). If still no match: surface "Supplier `<name>` not found in Jaz contacts (or not flagged supplier: true). Confirm spelling or create via `create_contact(supplier: true, ...)`."

```
get_contact(resourceId: <supplier id>)
```

Pull `paymentTerms`, `bankAccountNumber`, `taxId`, `paymentMethod` for narrative + cross-check vs the supplier's statement header.

## Step 2 — Pull Jaz-side bills

```
search_bills(
  filter: {contactResourceId: <supplier id>, valueDate: {between: ['2025-01-01', '2025-01-31']}},
  sort: 'valueDate:asc',
  limit: 200
)
```

Per bill: `{resourceId, reference, valueDate, currency, originalAmount, balanceAmount, status, dueDate}`. Keep the Jaz-side bill list for the recon pack.

For an opening-balance recon: also pull the supplier's pre-period balance via `generate_aged_ap(period_end: <period-start - 1 day>)` and filter to this supplier.

## Step 3 — Pull payments

```
search_payments(filter: {contactResourceId: <supplier id>, valueDate: {between: ['2025-01-01', '2025-01-31']}, type: {eq: 'PAYOUT'}})
```

Per payment: `{resourceId, reference, valueDate, paymentAmount, transactionAmount, paymentMethod, billResourceId}`. Save.

## Step 4 — Pull credit notes

```
search_supplier_credit_notes(filter: {contactResourceId: <supplier id>, valueDate: {between: [<period-start>, <period-end>]}})
```

Save. Each credit note may have been applied to one or more bills; the application reduces the bill balance.

## Step 5 — Compute Jaz-side closing balance

```
generate_aged_ap(period_end: '2025-01-31')
```

Filter to this supplier. Compute: opening balance + new bills (step 2) - payments (step 3) - applied credit notes (step 4) = closing balance per Jaz.

## Step 6 — Compare against supplier statement

Practitioner provides the supplier's statement (PDF, email, paper). Per-line-item match against Jaz data:

| Discrepancy | Likely cause | Fix |
|-------------|--------------|-----|
| Bill on supplier statement, not in Jaz | Missed bill (most common) | `mcp magic create --file <statement-pdf>` extracts the missing bill, OR manual `create_bill(...)`; pay if owed. |
| Bill in Jaz, not on supplier statement | Supplier hasn't issued / lost the invoice | Verify with supplier; if confirmed bogus, `delete_bill` (DRAFT) OR `create_supplier_credit_note` (if ACTIVE). |
| Different amounts on same reference | Pricing dispute | Practitioner contacts supplier for clarification. Possible adjustment journal post-resolution. |
| Bill paid per Jaz, supplier says unpaid | Bank reconciliation gap | Pull bank statement for the payment date; verify the wire/cheque cleared. If cleared, send remittance proof to supplier. |
| Bill unpaid per Jaz, supplier says paid | Payment recorded against wrong supplier OR bill | Audit `search_payments(filter: {valueDate: {eq: <date>}, paymentAmount: {eq: <amount>}})`; identify mis-routing; post correcting journal OR re-issue payment. |
| Supplier credit note not in Jaz | Missed credit | `create_supplier_credit_note(...)` per supplier statement. Then `apply_credit_to_bill(...)` to the offsetting bill. |
| Currency mismatch | FX bills with different rates | Confirm Jaz used the right rate per `jaz-api/SKILL.md` rule 25; the supplier statement may use spot rate, Jaz uses recorded rate. Document the FX gap. |

## Step 7 — Post corrections + verify

For each missing bill / credit note: post via `create_bill` / `create_supplier_credit_note`. For each duplicate payment: post correcting journal. Document the audit trail (per-correction narrative) for the recon pack.

After corrections:
```
generate_aged_ap(period_end: '2025-01-31')
```

Filter to supplier. New closing balance should match the supplier statement closing balance within tolerance (typically zero — pricing rounding on long-running accounts can leave cents).

## Step 8 — Save reconciliation pack

Keep, per supplier:
- the supplier statement (received from supplier)
- the Jaz-side bills + payments + credit notes
- a recon summary — per-discrepancy analysis + corrections posted
- The auditor will request these for major suppliers.

---

## Common error classes and recovery

| Source | Error | Recovery |
|--------|-------|----------|
| Step 1 | Supplier name doesn't fuzzy-match | Practitioner-side spelling difference. Surface candidates; let practitioner pick. |
| Step 2 | Bill count > page limit | Paginate via `offset`. |
| Step 6 | Currency mismatch on supplier statement | Standard FX handling — supplier records in the supplier's base currency, Jaz records in the org's base currency. Compare in the supplier's currency for the parity check; FX gap goes to FX gain/loss separately. |
| Step 7 | `create_bill` 422 `valueDate_in_locked_period` | The missing bill belongs to a locked period. Lift lock via `update_account` lockDate, post, re-lock. Surface to practitioner — auditor will see late posting. |
| Step 7 | `apply_credit_to_bill` 422 `credit_exceeds_balance` | Trying to apply more credit than the bill has remaining. Practitioner judgment — split the credit across multiple bills OR carry forward. |

---

## Tips

- **Run for major suppliers only.** Top 10 suppliers by total spend cover 80% of AP risk. Mid + tail suppliers: skip or batch annually.
- **Quarterly cadence** for major suppliers; **annual** for tier-2.
- **Statement format varies wildly.** PDF / Excel / paper. `mcp magic create` works on most PDFs but not all — fallback to manual.
- **Pre-payment-run check.** Run supplier-recon BEFORE `payment-run.md` to capture any disputed bills (don't pay) and missing bills (post + pay this run).

---

## Cross-references

- `month-end-close.md` — run ad-hoc per major supplier inside the period close.
- `year-end-close.md` / `audit-prep.md` — mandatory year-end recon for major suppliers; output feeds the audit pack.
- `payment-run.md` — typically run after supplier-recon (pay any newly-identified bills, defer disputed).
- `audit-prep.md` step 6 — AP aging year-end requires supplier confirmations for major balances; supplier-recon files are the supporting evidence.
