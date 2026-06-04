# Credit Control / AR Chase

> Systematically chase overdue customer invoices, assess collection risk, identify bad debt. Walk the steps below in order, calling the named platform tools directly. (Local CLI convenience: `clio jobs credit-control` prints this same phased checklist.)

## Tools, recipes, calculators this job uses

### Platform tools
- **`generate_aged_ar(period_end: <date>)`** — step 1: AR aging report with bucket breakdown.
- **`search_invoices(filter: {status: {eq: 'UNPAID'}, dueDate: {lt: <date>}, contactResourceId: <customer>}, sort: 'dueDate:asc', limit: 200)`** — step 2: per-customer overdue detail. Paginate.
- **`get_contact(resourceId: <customer id>)`** — step 2: pull contact info (email, phone, primary contact).
- **`get_contact_signals(resourceId: <id>, btType: 'SALE')`** — step 3: pull cadence + outlier signals + outstanding balance for the customer. Mid-7 endpoint.
- **`apply_credit_to_invoice(...)`** / **`create_customer_credit_note(...)`** — step 6: write-off path A for stage-3 specific impairment.
- **`create_invoice_payment(... paymentMethod: 'DEBT_WRITE_OFF' ...)`** — step 6: write-off path B (direct).
- **`plan_recipe(recipe: 'ecl', ...)` + `execute_recipe(...)`** — step 7: ECL collective top-up if material change in aging.
- **`download_export(exportType: 'analysis-receivables-customer-risk', startDate, endDate)`** — step 8: pre-empt audit by surfacing high-risk customers.

### Cross-references
- Run inside the month-end close (AR aging review + flag overdue) and ad-hoc whenever the overdue threshold is hit.
- Sibling jobs: `bank-recon.md` (newly-cleared customer payments shift the aging), `audit-prep.md` step 6 (year-end AR aging review).
- Recipes: `ecl` for the collective provision; path A/B for specific write-offs. See the transaction-recipes skill.

---

## Steps

Walk steps 1-8 below. (Local CLI: `clio jobs credit-control --overdue-days 30` prints the same phased checklist.)

## Step 1 — AR aging snapshot

```
generate_aged_ar(period_end: '2025-01-31')
```

Save the AR aging snapshot. Returns aging buckets (current, 30d, 60d, 90d, 120d+) per customer. Total per bucket informs collection priority.

## Step 2 — Identify overdue invoices per customer

For each customer with `60d` or `90d` or `120d+` balance > the materiality threshold:

```
search_invoices(
  filter: {
    status: {eq: 'UNPAID'},
    contactResourceId: <customer id>,
    dueDate: {lt: '2025-01-31'}
  },
  sort: 'dueDate:asc',
  limit: 200
)
```

```
get_contact(resourceId: <customer id>)
```

For each customer build a chase record: `{customerName, totalOverdue, oldestDaysOverdue, invoices: [{reference, valueDate, dueDate, daysOverdue, balanceAmount}], primaryContact}`.

## Step 3 — Contact-signals pull (Mid-7)

```
get_contact_signals(resourceId: <customer id>, btType: 'SALE')
```

Returns: `{ cadence, outlierFlags[], severitySummary, patternDivergenceFlags, outstandingSnapshot, revealedPatterns[] }`. High-signal data for collection prioritization:
- **Cadence outliers** (this customer typically pays N days late): expected vs current overdue.
- **Severity** (`LOW` / `MEDIUM` / `HIGH`): customer-specific risk index.
- **Pattern divergence**: a customer who's never been overdue is now — escalate.

Keep the contact-signals output per customer.

## Step 4 — Categorize for action

Per customer, classify based on aging bucket + contact-signals:

| Bucket | Signal | Action |
|--------|--------|--------|
| < 30d | (any) | Soft reminder email — automated tooling outside Jaz. |
| 30-60d | severity LOW | Phone call OR formal email. Document in narrative. |
| 30-60d | severity MEDIUM/HIGH | Phone call + escalation to AR manager. |
| 60-90d | (any) | Formal demand letter. Begin specific-provision review (path A/B if appropriate). |
| 90-120d | (any) | Final demand. Suspend further credit. Begin write-off review. |
| 120d+ | severity LOW | Final demand + small claims / mediation option. |
| 120d+ | severity HIGH | Likely uncollectible — proceed to step 6 specific write-off. |

The contact-signals `outstandingSnapshot.recoverabilityScore` (0-100) is a useful tie-breaker.

## Step 5 — Document chase activities

For each customer chased: keep a chase log with:
- Date contacted
- Method (email / phone / letter)
- Person spoken to
- Promised payment date (if any)
- Next action date

Capsule alternative: `create_capsule(capsuleType: 'Bad Debt Write-off', title: 'Credit Control — <customer> — FY2025')` with the chase log as the description; attach any eventual write-off journal / credit note to the same capsule for audit trail.

## Step 6 — Specific write-off (stage-3 impairment)

For customers where objective evidence of impairment exists (formal insolvency, repeated dishonor, ceased trading): write off the bills (specific stage-3 impairment) via one of the two paths below.

**Path A — credit note** (preferred for paper trail):
```
create_customer_credit_note(
  contactResourceId: <customer>,
  valueDate: '2025-01-31',
  reference: 'WRITE-OFF-<customer>-FY2025',
  lineItems: [{
    name: 'Write-off — uncollectible (formal insolvency)',
    accountResourceId: <Bad Debt Expense GL>,
    amount: <balance to write off>,
    saveAsDraft: false
  }],
  capsuleResourceId: <credit-control capsule>
)
apply_credit_to_invoice(invoiceResourceId: <inv>, creditNoteResourceId: <cn>, amount: <balance>)
```

**Path B — direct write-off**:
```
create_invoice_payment(
  invoiceResourceId: <inv>,
  payments: [{
    paymentAmount: <balance>,
    transactionAmount: <balance>,
    accountResourceId: <Bad Debt Expense GL>,
    paymentMethod: 'DEBT_WRITE_OFF',
    reference: 'WRITE-OFF-<inv>',
    valueDate: '2025-01-31'
  }]
)
```

Per memory rule [Bad Debt Write-off]: `paymentMethod: 'DEBT_WRITE_OFF'` is the canonical method enum. Bad Debt Expense GL must exist in CoA.

Future-receivable reversal: if the customer eventually pays after write-off (rare but possible), post via `create_journal`: Dr Cash / Cr Bad Debt Recoveries (separate revenue line for transparency).

## Step 7 — ECL collective top-up (if material aging shift)

If the AR aging shifted materially this period (e.g., $50K moved from current to 90d+): invoke the `ecl` recipe for the collective top-up.

```
clio calc ecl --current <c> --30d <30> --60d <60> --90d <90> --120d <120> --rates <org ECL loss-rate matrix> --existing-provision <TB Allowance balance> --json
```

If `topUpRequired > materiality threshold`:
```
plan_recipe(recipe: 'ecl', ..., capsuleResourceId: <credit-control capsule OR new ECL Provision capsule>)
execute_recipe(...)
bulk_finalize_drafts({kind: 'journal'}, resourceIds: [...]})
```

Note: monthly ECL is typically a mental check; formal ECL provision recompute is quarterly (per `quarter-end-close.md` Q2). Trigger this monthly only on material shifts.

## Step 8 — Pre-empt audit signals

```
download_export(exportType: 'analysis-receivables-customer-risk', startDate: <FY-start>, endDate: <today>)
```

Returns XLSX with high-risk customer flags (rising aging trends, recently-defaulted, concentration risk). Auditor will run similar analysis at year-end; surface now to address rather than react.

---

## Common error classes and recovery

| Source | Error | Recovery |
|--------|-------|----------|
| Step 2 | `search_invoices` returns 0 despite aging shows overdue | Aging report may include `PARTIALLY_PAID` invoices; expand filter `status: {in: ['UNPAID', 'PARTIALLY_PAID']}`. |
| Step 3 | `get_contact_signals` returns `null` | The freshness layer is offline; skip the signals step and use aging alone. Don't halt the job. |
| Step 6 Path A | `apply_credit_to_invoice` 422 `credit_exceeds_balance` | Split the credit across multiple invoices, OR reduce the credit amount to match the bill balance. |
| Step 6 Path B | `paymentMethod: 'DEBT_WRITE_OFF'` rejected | Verify the enum value via `jaz-api/SKILL.md` (some orgs may have custom payment-method config; default supports DEBT_WRITE_OFF). |
| Step 7 ECL recipe | Top-up causes Bad Debt Expense to spike | Expected — material aging shift = material P&L impact. Surface to practitioner; potentially split across multiple periods if it's a known one-off (rare). |
| Customer files insolvency mid-chase | (process) | Stop chase. Move directly to step 6 specific write-off. Document the insolvency filing reference. |
| Customer pays post-write-off | (rare) | Post `create_journal`: Dr Cash / Cr Bad Debt Recoveries. Don't reverse the original write-off — keep the audit trail clean. |

---

## Tips

- **Run weekly, not monthly.** Aging gets worse the longer you wait. A 30-day-overdue invoice has a 70% recovery rate; 90-day-overdue drops to 40%; 120+ days to 20%.
- **Contact-signals is the differentiator.** `get_contact_signals` surfaces who's likely to pay and who's behaving abnormally. Without this, credit control is just "send reminders to everyone."
- **Capsule per customer write-off** = audit trail. Even small write-offs ($500+) should have a capsule with the chase history.
- **Year-end specific impairment** is harder than monthly. Catch it monthly — auditor will sample-test path A/B write-offs as part of audit-prep.

---

## Cross-references

- `month-end-close.md` — AR aging review + chase activity log inside the period close.
- `quarter-end-close.md` Q2 — formal ECL provision review (collective).
- `audit-prep.md` step 6 — year-end AR aging; specific impairments documented via path A/B with capsules.
- Recipes: `ecl`. See the transaction-recipes skill.
