# Audit Preparation

> Compile the report pack + supporting schedules + reconciliations an auditor or tax agent needs to issue an opinion or file a return. Driver tool: `generate_audit_prep_blueprint`.

## Tools, recipes, calculators this job uses

### MCP tools — financial statements
- **`generate_audit_prep_blueprint`** — used in step 1: emit the phased deliverables list for the period.
- **`generate_trial_balance(period_end: <FY-end>)`** — step 2: master reconciliation. Every other report ties back to this.
- **`generate_balance_sheet(period_end: <FY-end>)`** — step 3.
- **`generate_profit_and_loss(period_start: <FY-start>, period_end: <FY-end>)`** — step 3.
- **`generate_cashflow(period_start, period_end)`** — step 4.
- **`generate_equity_movement(period_start, period_end)`** — step 4.
- **`generate_general_ledger(period_start, period_end, groupBy: 'ACCOUNT')`** — step 5: the auditor's primary working document.

### MCP tools — supporting schedules
- **`generate_aged_ar(period_end)` / `generate_aged_ap(period_end)`** — step 6.
- **`generate_bank_recon_summary(period_end)` / `generate_bank_recon_details(period_end)`** — step 7. NON-NEGOTIABLE deliverable.
- **`generate_bank_balance_summary(period_end)`** — step 7. Cross-reference to bank confirmation letters.
- **`generate_fa_summary(period_end)` / `generate_fa_recon_summary(period_start, period_end)`** — step 8.
- **`generate_vat_ledger(period_start, period_end)`** — step 9. Annual total ties to sum of quarterly F5 returns.

### MCP tools — XLSX deliverables
- **`download_export(exportType: '<type>', startDate, endDate)`** — step 10: pre-signed XLSX URL (~5 min expiry). Per `jaz-api/SKILL.md` rule (data-exports), supported types include `trial-balance`, `profit-and-loss`, `balance-sheet`, `general-ledger`, `ar-report`, `ap-report`, `cashflow`, `analysis-anomalous-bills`, `analysis-anomalous-invoices`, `analysis-cashflow-anomalies`, `analysis-gl-journal-audit`, `analysis-exchange-rate-audit`, `analysis-receivables-customer-risk`, `analysis-cash-expense-health`. The audit-analyses are essential pre-emptive flags for the auditor.

### MCP tools — completeness gates
- **`search_journals(filter: {status: {eq: 'DRAFT'}, valueDate: {between: [<FY-start>, <FY-end>]}})`** — step 12: must return zero rows before pack hand-off.
- **`search_invoices(filter: {status: {eq: 'DRAFT'}, valueDate: {between: [<FY-start>, <FY-end>]}})`** — step 12: same gate, sales side.
- **`search_bills(filter: {status: {eq: 'DRAFT'}, valueDate: {between: [<FY-start>, <FY-end>]}})`** — step 12: same gate, purchases side.
- **`bulk_finalize_drafts({kind: 'journal', resourceIds: [...]})`** — step 12 fallback: clear residual drafts before pack hand-off.
- **`update_account(resourceId: <CoA root>, lockDate: <FY-end>)`** — step 12 final: lock the period to prevent backdated entries during fieldwork.

### Calculators (cross-check schedules — no API key needed)
- **`clio calc loan --principal --rate --term --start-date --json`** — step 8: independent loan amortization for the loan schedule.
- **`clio calc lease --payment --term --rate --json`** — step 8: IFRS 16 ROU + lease liability schedule.
- **`clio calc ecl --receivables <json> --json`** — step 8: ECL provision matrix per IFRS 9.
- **`clio calc fixed-deposit --principal --rate --term --json`** — step 8: FD interest accrual.
- **`clio calc depreciation --cost --salvage --life --method --json`** — step 8: per-asset depreciation cross-check vs FA register.

### Cross-references
- Within an engagement: invoked from `practice/references/annual-statutory.md` step 5 (audit-prep is the bridge between year-end close and statutory filing). Practice playbook reads `CLIENT.statutory_audit_required`, `CLIENT.tax_jurisdiction` (`SG` | `PH`), and `CLIENT.fy_end` to scope the deliverables.
- Sibling jobs: `year-end-close.md` (must complete BEFORE this job — audit-prep assumes books are closed), `statutory-filing.md` (the SG Form C-S / PH ITR step that consumes the pack this job produces — see audit step 13 cross-reference).
- API rules: `jaz-api/SKILL.md` rule 36 (`endDate` not `startDate` for AR/AP point-in-time reports), rule 38 (pagination for `general-ledger`), rule 52 (response dates are epoch ms).

---

## Who needs this

| Situation | SG | PH |
|-----------|----|----|
| Statutory audit required | Revenue > S$10M, assets > S$10M, or employees > 50 | All stock corporations, paid-up capital > PHP 50K |
| Tax filing only | All companies file Form C / C-S with IRAS | All companies file ITR with BIR |
| Compilation by accountant | Small exempt private companies | N/A |

Even small exempt SG companies need this pack for the external accountant who prepares the financial statements + Form C-S.

## Step 1 — Emit blueprint

```
generate_audit_prep_blueprint(period_start: '2025-01-01', period_end: '2025-12-31', currency: <CLIENT.base_currency>, jurisdiction: <CLIENT.tax_jurisdiction>)
```

Save to `recurring/annual/<period>/audit-prep/blueprint.json`. Blueprint emits jurisdiction-specific deliverable list (SG: TB / BS / P&L / CF / EM / AR aging / AP aging / bank recon / FA register / GST F5 yearly / supporting schedules. PH: same + ITR-specific schedules).

## Step 2 — Trial balance (the master)

```
generate_trial_balance(period_end: '2025-12-31', currency: <CLIENT.base_currency>)
```

Save to `recurring/annual/<period>/audit-prep/tb.json`. Verify: every report from step 3 onwards must tie back to a TB line.

## Step 3 — Primary financial statements

```
generate_balance_sheet(period_end: '2025-12-31')
generate_profit_and_loss(period_start: '2025-01-01', period_end: '2025-12-31')
```

Optional comparative:
```
generate_profit_and_loss(period_start: '2024-01-01', period_end: '2024-12-31')
generate_balance_sheet(period_end: '2024-12-31')
```

Assert: BS Total Assets = Total Liabilities + Total Equity. P&L Net Profit ties to Equity Movement (step 4) `netProfit` line.

## Step 4 — Cashflow + Equity Movement

```
generate_cashflow(period_start: '2025-01-01', period_end: '2025-12-31')
generate_equity_movement(period_start: '2025-01-01', period_end: '2025-12-31')
```

Cashflow classifies into Operating / Investing / Financing per IAS 7. Equity Movement reconciles opening equity → net profit → dividends → other movements → closing equity. The closing equity must tie to BS step 3 Total Equity.

## Step 5 — General Ledger (auditor's working document)

```
generate_general_ledger(period_start: '2025-01-01', period_end: '2025-12-31', groupBy: 'ACCOUNT')
```

Per `jaz-api/SKILL.md` rule 38, paginate via `offset` if `totalElements > <page-size>`. Save full GL to `recurring/annual/<period>/audit-prep/gl.json`. Auditor will sample-test from this.

## Step 6 — AR / AP aging

```
generate_aged_ar(period_end: '2025-12-31')
generate_aged_ap(period_end: '2025-12-31')
```

Use `endDate` not `startDate` (rule 36 — point-in-time snapshot). Assert:
- `aged_ar.totalOutstanding == TB['Accounts Receivable'].balance` (recoverability gate; auditor tests > 90d aging for ECL adequacy).
- `aged_ap.totalOutstanding == TB['Accounts Payable'].balance` (completeness gate).

If ECL provision feels inadequate for the > 90d bucket, run the ECL recipe immediately:
```
plan_recipe(name: 'ecl', receivables: <aged_ar.buckets converted to ECL input>, ...)
```
And post any top-up provision via `execute_recipe`. This avoids an auditor-proposed adjustment at fieldwork.

## Step 7 — Bank reconciliation (NON-NEGOTIABLE)

```
generate_bank_recon_summary(period_end: '2025-12-31')
generate_bank_recon_details(period_end: '2025-12-31')
generate_bank_balance_summary(period_end: '2025-12-31')
```

For each bank account: `unreconciledCount` MUST be 0 OR every unreconciled item has a documented timing-difference explanation in `ENGAGEMENT.risk_areas`. The auditor will request bank confirmation letters DIRECTLY from your banks — `generate_bank_balance_summary` total must reconcile to those letters within tolerance.

If `unreconciledCount > 0`: halt audit-prep and route back to `bank-recon.md` job. Do NOT hand the pack to the auditor with unreconciled items.

## Step 8 — Fixed assets + supporting schedules

```
generate_fa_summary(period_end: '2025-12-31')
generate_fa_recon_summary(period_start: '2025-01-01', period_end: '2025-12-31')
```

Assert: `fa_recon.openingNbv + additions - disposals - depreciation == fa_recon.closingNbv == TB['Fixed Assets'].balance`.

For non-FA-register schedules (loan, lease, ECL, fixed-deposit, prepaid, intercompany), pull the underlying capsules:
```
search_capsules(filter: {capsuleType: {in: ['Loan Repayment', 'Lease', 'Fixed Deposit', 'Prepaid Expenses', 'Provision']}})
```
For each capsule, run the matching `clio calc <type>` to produce the independent schedule. Save to `recurring/annual/<period>/audit-prep/schedules/<capsule-name>.json`. Auditor uses these to test the IFRS 9 / IFRS 16 / IAS 37 measurements.

## Step 9 — Tax ledger

```
generate_vat_ledger(period_start: '2025-01-01', period_end: '2025-12-31')
```

For SG: annual total ties to sum of 4 quarterly GST F5 returns. For PH: annual total ties to monthly VAT returns + quarterly summary. Cross-reference: `practice/references/quarterly-gst.md` keeps the per-quarter F5/VAT submissions; the annual reconciliation should already be clean if quarterly-gst engagements ran each period.

## Step 10 — XLSX deliverables (pre-empt auditor requests)

For each report the auditor needs in their workpapers:

```
download_export(exportType: 'trial-balance', startDate: '2025-01-01', endDate: '2025-12-31', currencyCode: <CLIENT.base_currency>)
```

Returns `{ fileName, fileUrl }` (pre-signed, ~5 min). Download immediately to `recurring/annual/<period>/audit-prep/xlsx/`. Repeat for: `profit-and-loss`, `balance-sheet`, `general-ledger`, `ar-report`, `ap-report`, `cashflow`.

**Pre-emptive audit analyses** (run BEFORE handing over the pack — fix what they'd find):
- `download_export(exportType: 'analysis-anomalous-bills', startDate, endDate)` — flag bills with unusual amounts vs supplier history
- `download_export(exportType: 'analysis-anomalous-invoices', startDate, endDate)` — same, customer side
- `download_export(exportType: 'analysis-gl-journal-audit', startDate, endDate)` — flags unbalanced / round-number / large-value journals likely to draw auditor scrutiny
- `download_export(exportType: 'analysis-exchange-rate-audit', startDate, endDate)` — FX rates outside expected band
- `download_export(exportType: 'analysis-cash-expense-health', startDate, endDate)` — cash-only expense patterns auditors flag

If any analysis surfaces issues, fix BEFORE auditor sees them. Document the corrections in `ENGAGEMENT.md`.

## Step 11 — Reconciliation checklist

Before pack hand-off, assert each row:

| Account | Source | Must match |
|---------|--------|------------|
| Cash / Bank | step 7 bank recon | bank confirmation letters |
| Accounts Receivable | step 6 AR aging | TB AR line |
| Accounts Payable | step 6 AP aging | TB AP line |
| Fixed Assets NBV | step 8 FA register | TB FA lines (gross + accumulated dep) |
| Loan Payable | step 8 loan schedule (per capsule) | TB Loan Payable line |
| Lease Liability | step 8 lease schedule (per capsule) | TB Lease Liability line |
| Revenue | step 3 P&L | step 9 VAT ledger Box 1+2+3 totals |
| GST Receivable / Payable | step 9 VAT ledger | TB GST Control account |

Any mismatch beyond `CLIENT.materiality_threshold` halts the pack and routes back to the originating job.

## Step 12 — Completeness gates (final)

```
search_journals(filter: {status: {eq: 'DRAFT'}, valueDate: {between: ['2025-01-01', '2025-12-31']}})
search_invoices(filter: {status: {eq: 'DRAFT'}, valueDate: {between: ['2025-01-01', '2025-12-31']}})
search_bills(filter: {status: {eq: 'DRAFT'}, valueDate: {between: ['2025-01-01', '2025-12-31']}})
```

ALL three must return zero. If any return rows: collect `resourceId`s, classify (delete vs finalize) per practitioner judgment, and `bulk_finalize_drafts({kind, resourceIds: [...]})` for the keep-set.

Then lock the period:
```
update_account(resourceId: <CoA root>, lockDate: '2025-12-31')
```

This prevents backdated entries during fieldwork. If the auditor needs to post AJEs, lift the lock temporarily, post, re-lock — do NOT leave it open during fieldwork.

## Step 13 — Hand-off to statutory filing

The pack is now ready. Cross-reference to `practice/references/annual-statutory.md` step 6-7 (statutory filing) which consumes:
- TB + P&L + BS for Form C-S Lite eligibility check (revenue ≤ S$200K)
- Audit-analyses for management-letter content
- Loan / lease / FA schedules for tax computation add-backs
- VAT ledger annual reconciliation for IRAS Box 1-7 cross-tie

The SG Form C-S wizard (`practice/references/annual-statutory.md` step 7) walks the practitioner field-by-field through the C-S form, prefilling from the audit-prep pack.

---

## Common error classes and recovery

| Source | Error | Recovery |
|--------|-------|----------|
| `generate_*` | 422 `period_not_closed` | Year-end close incomplete. Route to `year-end-close.md` first. |
| `generate_bank_recon_*` | `unreconciledCount > 0` | Route to `bank-recon.md`; do NOT hand pack with this open. |
| `download_export` | 422 `period_too_long` | GL XLSX rejected for >12 months. Split into per-quarter exports. |
| `download_export` | 504 timeout | Large org. Re-run with smaller `endDate` range or contact infrastructure team. |
| `update_account` | 422 `lock_date_in_future` | The CoA `lockDate` must be ≤ `period_end`. Use today if unsure. |
| Reconciliation | TB AR ≠ AR aging | Likely a mid-period credit-note application missed. `search_customer_credit_notes(filter: {valueDate: {between: ...}})` and verify each was applied via `apply_credit_to_invoice`. |
| Reconciliation | TB Cash ≠ bank balance summary | Unposted bank journal or unreconciled item. Re-run step 7. |
| Step 12 gate | Drafts present at year-end | Either clear (finalize) or document in `ENGAGEMENT.risk_areas`. NEVER hand pack with drafts in the audit period. |

---

## Tips

- **Start in January for prior FY.** Don't wait for the auditor's request list. Generate the pack in early January; have it ready before the engagement begins. Faster + cheaper audit.
- **Bank confirmation letters take 2-4 weeks.** Request them from each bank in early January. The auditor will independently request these — yours is for self-verification.
- **Pre-emptive audit-analyses are the differentiator.** Most accountants hand over the standard pack and wait for queries. Running the 5 `analysis-*` exports proactively in step 10 catches what the auditor would catch — at zero auditor cost.
- **SG IRAS deadlines:** Form C-S/C: November 30 of the following year. ECI: within 3 months of FY-end. GST F5: 1 month after each quarter-end.
- **Common audit queries:** "Revenue by customer" → AR Summary; "Top 10 expenses" → P&L sorted; "Related party transactions" → tag during the year, not at audit time; "Variance explanation" → month-by-month P&L.

---

## Cross-references back to engagements

- `practice/references/annual-statutory.md` step 5 — audit-prep is the bridge between `year-end-close` and `statutory-filing` engagement steps. Practice playbook orchestrates audit-prep deliverables into the Form C-S wizard.
- `practice/references/quarterly-gst.md` — keeps per-quarter F5 reconciliations clean; audit-prep step 9 trusts those.
- `practice/references/onboarding.md` — only relevant when conversion happened mid-FY (rare). Then the audit pack must include a "conversion period" note explaining the mid-FY data load.
