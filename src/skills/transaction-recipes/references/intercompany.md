# Recipe: Intercompany Transactions (manual — no engine)

> Cross-org charge + settlement pattern between two related entities (parent ↔ subsidiary, sister entities). NO recipe engine — built from primitive `create_invoice` + `create_bill` + cross-org capsule per entity. Each leg posts in its own org via separate Jaz API key.

## Why no engine

Intercompany requires posting MIRRORED entries in TWO different Jaz orgs (Entity A invoices Entity B; Entity B records Entity A's invoice as a bill). The recipe engine operates within a single org context. Multi-org coordination is the practitioner's responsibility — `practice/references/onboarding.md` and the multi-org auth pattern (`CLIENT.jaz_api_key_override` per client folder) drive the orchestration.

## Tools, recipes, calculators this recipe uses

### Primitive MCP tools (no engine wrapper)
- **`create_invoice(...)`** — Entity A side: post the management-fee invoice to Entity B (the customer in Entity A's org).
- **`create_bill(...)`** — Entity B side: post the same management-fee as a bill from Entity A (the supplier in Entity B's org).
- **`create_capsule(capsuleType: 'Intercompany', ...)`** — one capsule per entity, both with matching reference (e.g., `IC-MGMT-2025-Q1`).
- **`create_invoice_payment(...)` / `create_bill_payment(...)`** — settlement legs in each entity's org.
- **`apply_credit_to_invoice(...)` / `apply_credit_to_bill(...)`** — netting if both entities owe each other (one entity's invoice clears against the other's bill via credit note).

### Search tools for reconciliation
- **`search_invoices(filter: {capsuleResourceId: {eq: <Entity A IC capsule>}})`** — pull all Entity A intercompany invoices.
- **`search_bills(filter: {capsuleResourceId: {eq: <Entity B IC capsule>}})`** — pull all Entity B intercompany bills.
- **`generate_general_ledger(accountResourceId: <Intercompany Receivable>, period_end: <date>)` / same for Intercompany Payable** — eliminate at consolidation.

### Multi-org auth (CRITICAL)
- Per `CLIENT.jaz_api_key_override`: each entity has its own Jaz org and API key. Intercompany agent must:
  1. Run Entity A invoice creation under Entity A's API key (resolved via `practice_load_client('entity-a')`).
  2. Switch context to Entity B (re-resolve API key via `practice_load_client('entity-b')`).
  3. Run Entity B bill creation under Entity B's API key.
- NEVER mix. Cross-org pollution corrupts both entities' books.

### Cross-references
- Within an engagement: invoked from `practice/references/monthly-close.md` step 7 (intercompany leg of monthly close, only for clients with active intercompany arrangements per `CLIENT.intercompany_arrangements[]`).
- Sibling: `dividend.md` (cross-entity equity distribution — also requires multi-org coordination).
- IFRS / accounting context: IAS 24 (related-party disclosure); intercompany balances ELIMINATE at consolidation per IFRS 10.B86 (consolidation procedures).

---

## Step-by-step (per intercompany transaction)

### Step 0 — Identify the arrangement

Read `CLIENT.intercompany_arrangements[]` from BOTH entities' CLIENT.md (cross-validation: Entity A's outbound charges should match Entity B's inbound charges). Each arrangement has: `name`, `from_entity`, `to_entity`, `amount`, `frequency`, `gl_revenue` (Entity A side), `gl_expense` (Entity B side), `transfer_pricing_basis`.

If the two entities' arrangements don't match: halt and surface to practitioner — likely a setup gap or one side wasn't updated when terms changed.

### Step 1 — Capsules (one per entity)

In Entity A's org:
```
create_capsule(
  capsuleTypeResourceId: <Intercompany capsule type id>,
  title: 'IC Mgmt Fee — to Entity B — Q1 2025',
  description: 'Monthly management services Jan-Mar 2025 per IC arrangement IC-MGMT-2025'
)
```

In Entity B's org (separately, using Entity B's API key):
```
create_capsule(
  capsuleTypeResourceId: <Intercompany capsule type id>,
  title: 'IC Mgmt Fee — from Entity A — Q1 2025',
  description: 'Monthly management services Jan-Mar 2025 per IC arrangement IC-MGMT-2025'
)
```

Both capsules carry the same logical reference (IC-MGMT-2025-Q1) so the practitioner can reconcile across the two orgs.

### Step 2 — Entity A: post the invoice

In Entity A's org (Entity A API key resolved):
```
create_invoice(
  contactResourceId: <Entity B as a customer in Entity A's contacts>,
  reference: 'IC-MGMT-2025-Q1-JAN',
  valueDate: '2025-01-31',
  lineItems: [{
    name: 'Management services — January 2025',
    accountResourceId: <Entity A's 'Intercompany Revenue' GL>,
    amount: 15000,
    quantity: 1
  }],
  capsuleResourceId: <Entity A IC capsule>,
  saveAsDraft: false
)
```

Per `jaz-api/SKILL.md` rule 9: `name` (not `description`) for line items. Per rule 7: invoice creates AR + Revenue split.

### Step 3 — Entity B: post the mirrored bill

In Entity B's org (Entity B API key resolved):
```
create_bill(
  contactResourceId: <Entity A as a supplier in Entity B's contacts>,
  reference: 'IC-MGMT-2025-Q1-JAN',
  valueDate: '2025-01-31',
  lineItems: [{
    name: 'Management services — January 2025',
    accountResourceId: <Entity B's 'Intercompany Expense' or 'Management Fee Expense' GL>,
    amount: 15000,
    quantity: 1
  }],
  capsuleResourceId: <Entity B IC capsule>,
  saveAsDraft: false
)
```

The amount, valueDate, and reference MUST match Entity A's invoice exactly. Reconciliation downstream (step 5) compares these; mismatches mean either the wrong amount got posted or one side hasn't been recorded yet.

### Step 4 — Settlement (varies by arrangement)

**Settlement option A: Cash settlement**

In Entity B's org (the payer):
```
create_bill_payment(
  billResourceId: <Entity B IC bill id>,
  payments: [{
    paymentAmount: 15000,
    transactionAmount: 15000,
    accountResourceId: <Entity B's bank account>,
    paymentMethod: 'BANK_TRANSFER',
    reference: 'IC-PAY-2025-Q1-JAN',
    valueDate: '2025-02-15'
  }]
)
```

In Entity A's org (the payee):
```
create_invoice_payment(
  invoiceResourceId: <Entity A IC invoice id>,
  payments: [{
    paymentAmount: 15000,
    transactionAmount: 15000,
    accountResourceId: <Entity A's bank account>,
    paymentMethod: 'BANK_TRANSFER',
    reference: 'IC-PAY-2025-Q1-JAN',
    valueDate: '2025-02-15'
  }]
)
```

Both payments use the SAME bank reference. Bank-recon (`bank-recon.md`) on each side will match against this reference.

**Settlement option B: Net-off (Entity B also charges Entity A)**

Less cash-flow-intensive: net off intercompany charges across both directions. Requires posting credit notes:

1. In Entity A: `create_customer_credit_note(...)` for the amount Entity B charges back.
2. `apply_credit_to_invoice(invoiceResourceId: <Entity A's outstanding IC invoice to B>, creditNoteResourceId: <CN>, amount: <netting amount>)`.
3. Mirror in Entity B with a supplier credit note + `apply_credit_to_bill`.

**Settlement option C: Loan-account treatment**

Long-term IC balances: instead of settling, keep as a loan. Same as `bank-loan.md` recipe but with the intercompany counterparty as the lender/borrower.

### Step 5 — Monthly reconciliation

In each entity:
```
generate_general_ledger(accountResourceId: <IC Receivable in A | IC Payable in B>, period_end: <month-end>)
```

Cross-entity reconcile:
- Entity A's `Intercompany Receivable` balance == Entity B's `Intercompany Payable` balance (with sign flipped — receivable in A is debit, payable in B is credit)
- Differences indicate timing (one side posted, other hasn't) or amount errors.

For consolidation (if the practitioner manages a group): the matched IC balances ELIMINATE — `Intercompany Receivable` (Entity A) net against `Intercompany Payable` (Entity B), and `Intercompany Revenue` (Entity A) net against `Intercompany Expense` (Entity B). Per IFRS 10.B86. Consolidation typically happens in a separate consolidation worksheet, not in either entity's books.

---

## Common error classes and recovery

| Source | Error | Recovery |
|--------|-------|----------|
| Step 2 / 3 | API key mix-up — Entity A's invoice posted to Entity B's org | DELETE the wrongly-posted entry immediately. Re-resolve API key via `practice_load_client('correct entity')`. Re-post. THIS IS THE #1 IC ERROR — surface multi-org context to practitioner before each call. |
| Step 5 | IC Receivable in A ≠ IC Payable in B | Investigate per-transaction: pull both `search_invoices(capsuleResourceId)` and `search_bills(capsuleResourceId)`, line-by-line compare amounts, valueDates, references. Common: one side posted Jan 31, other posted Feb 1 — timing diff that should resolve next period. Or one side posted USD-denominated and the other SGD — currency confusion. |
| Cross-FX intercompany | Entity A in SGD, Entity B in USD — IC Receivable in A doesn't match USD-equivalent in B | Both sides should agree on the transaction-currency amount (e.g., USD 15,000). Translation to base currency happens at each entity's books separately. Reconciliation at the SOURCE currency level, not base. |
| Transfer-pricing dispute (IRAS audit) | (process — separate from posting) | IC charges must satisfy arm's-length principle (SG: ITA s34D / OECD TPG). Maintain a transfer-pricing study. Practice playbook should reference `CLIENT.transfer_pricing_documentation`. |
| Both entities forget to post | (audit risk) | Year-end audit-prep step — auditor reconciles IC balances. Build a quarterly review into the engagement playbook. |
| Settlement reference mismatch | Bank-recon doesn't match IC payment to bill payment | Use a consistent `IC-PAY-YYYY-MM-XX` reference convention. Document in `practice/references/monthly-close.md` step 7. |

---

## Variations

- **Multi-leg IC** (Entity A → B → C): post 3 capsules (one per pair), each with its own invoice/bill set. Reconciliation is pairwise.
- **Intercompany loans** (long-term, with interest): use `bank-loan.md` recipe in EACH entity (Entity A as lender = invoice + scheduled receipts; Entity B as borrower = bill + scheduled payments). Mirror reconciliation each period.
- **Intercompany cost-sharing arrangements** (CCA, services received in multiple legal entities): pro-rate the charge across all participating entities; mirror in each. Document the allocation methodology.
- **Cross-currency IC**: use `currency: { sourceCurrency: 'USD' }` in the create_invoice/create_bill (per `jaz-api/SKILL.md` rule 25). Both sides agree on transaction-currency amount. Each entity's base-currency translation may differ; reconciliation at source-currency level.
- **Tax-deductibility considerations**: PH BIR may disallow IC charges without a transfer-pricing study; SG IRAS expects IC charges to be at arm's length. Practitioner judgment per jurisdiction.

---

## Cross-references back to engagements

- `practice/references/monthly-close.md` step 7 — invoked monthly per active IC arrangement in `CLIENT.intercompany_arrangements[]`. Practice playbook orchestrates multi-org context switching (load entity A → post → load entity B → post → reconcile).
- `practice/references/annual-statutory.md` step 4g — full FY IC reconciliation; auditor sample-tests.
- `audit-prep.md` step 8 — IC balances supporting schedule; auditor independently confirms with the counter-entity.
- Sibling `dividend.md` — cross-entity equity distribution; same multi-org coordination pattern.
- `practice/references/onboarding.md` — multi-org practitioner workflow setup; CLIENT.md per entity with `jaz_api_key_override` per client.
