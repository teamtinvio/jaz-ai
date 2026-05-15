# Quarterly GST F5 — agent playbook

Canonical playbook the agent walks through when the practitioner says "prep GST for `<quarter>` on `<client>`" and an active engagement of `type: quarterly-gst` is loaded. Driver tool: `generate_gst_vat_blueprint`. Driver context: `CLIENT.md` (must have `gst_scheme: quarterly` and `gst_registration_number` set) + `ENGAGEMENT.md` for the period.

## Tools, recipes, calculators this engagement uses

### Tools (jaz-api / direct API)
- `generate_gst_vat_blueprint` — used in step 1: emit the F5 prep checklist.
- `generate_vat_ledger` — used in step 2: pull the canonical tax ledger for the quarter (this is the source-of-truth for F5 box mapping).
- `search_invoices` — used in step 3: cross-check Box 1/3 (standard-rated supplies) and Box 6 (output tax) against finalized AR.
- `search_bills` — used in step 4: cross-check Box 5 (taxable purchases) and Box 7 (input tax) against finalized AP.
- `search_tax_profiles` — used in step 2: enumerate tax profile → F5 box mapping. NEVER create profiles (jaz-api rule 17).
- `search_customer_credit_notes` / `search_supplier_credit_notes` — used in steps 3 and 4: deduct credit-note tax from output/input totals.
- `search_journals` — used in step 5: catch manual-journal tax adjustments (reverse charge, mixed-supply allocations).
- `generate_trial_balance` — used in step 6: GST output payable + input claimable accounts must reconcile to the F5 net amount.
- `export_records` — used in step 7: emit vat-ledger as XLSX (`outputFormat: 'XLSX'` is mandatory; jaz-api rule on Export Records).
- `download_export` — used in step 7: download the generated CSV/XLSX for IRAS submission attachment.

### Recipes (jaz-recipes)
- None for F5 prep itself. Exception (per jaz-recipes guidance): if ECL review is bundled with F5 prep cycle (since AR aging is already pulled), `plan_recipe(recipe: 'ecl', …)`.

### Calculators (jaz-cli)
- `clio calc ecl` — only if ECL review is bundled (typically the case for quarterly cadence).

### Cross-references
- `jaz-jobs/SKILL.md § generate_gst_vat_blueprint` and `jaz-jobs/references/gst-vat-filing.md` for the canonical blueprint structure and Box 1-16 mapping.
- `jaz-recipes/references/bad-debt-provision.md` for ECL recipe depth (when bundled).
- `jaz-api/SKILL.md § Tax Profile Scoping` (rule 100), `§ Transaction References` (rule 104), `§ Identifiers & Dates` (rules 1–3), `§ Withholding Tax` (45, 98 — for cross-border services), `§ Export Records`.

---

## Step-by-step playbook

### Step 1 — Pre-flight + emit the blueprint

Verify:
- `CLIENT.gst_scheme == 'quarterly'`. If not, halt: "Client is not on quarterly GST per CLIENT.md — confirm scheme before proceeding."
- `CLIENT.gst_registration_number` is non-empty and matches IRAS format (M2-XXXXXXXX-X or 200000000X). If missing/malformed, halt.
- All 3 months in `ENGAGEMENT.period` (YYYY-QN) have signed-off `monthly-close` engagements OR are locked. If not, surface the open monthly closes; halt unless practitioner explicitly authorises continuing.

Resolve the period boundaries from `ENGAGEMENT.period` (e.g. `2026-Q1` → `from: 2026-01-01, to: 2026-03-31`). Map `Q` to month-triple per `CLIENT.fy_end` only when the FY-end is non-calendar; otherwise standard calendar quarters apply.

Invoke `generate_gst_vat_blueprint(period: <ENGAGEMENT.period>, currency: <CLIENT.base_currency>)`. Save to `recurring/quarterly/<period>/blueprint.json`.

**On 422 with reason `gst_not_registered`:** the org's tax setup says non-registered. Halt: "Org is not GST-registered in Jaz — confirm with client before proceeding."

### Step 2 — Pull the VAT ledger

Invoke `generate_vat_ledger(period_start: <Q-start>, period_end: <Q-end>)`. Save to `recurring/quarterly/<period>/vat-ledger.json`.

The ledger emits per-line: `transactionResourceId`, `transactionType` (INVOICE/BILL/JOURNAL/CN), `valueDate`, `taxProfileResourceId`, `taxProfileName`, `taxableAmount`, `taxAmount`, `boxMapping` (1, 2, 3, 4, 5, 6, 7, 8, 14, 15 etc.), `status`.

Aggregate the ledger by `boxMapping`:
- Box 1 — Total value of standard-rated supplies
- Box 2 — Total value of zero-rated supplies
- Box 3 — Total value of exempt supplies
- Box 4 — Total value of (1)+(2)+(3)
- Box 5 — Total value of taxable purchases (excluding imports under MES)
- Box 6 — Output tax due
- Box 7 — Input tax claimed
- Box 8 — Net GST to pay / refundable
- Box 9 — Total value of goods imported under Major Exporter Scheme (if applicable)
- Box 14 — Imported services subject to reverse charge
- Box 15 — Total value of imported services subject to reverse charge
- Box 16 — Did you claim any GST on bad debts? (Yes/No flag)

Save the aggregated totals to `recurring/quarterly/<period>/f5-boxes.json`.

**On 500 from `generate_vat_ledger`:** retry once. On second 500: surface "VAT ledger generation failing — escalate with `requestId`." Halt.

### Step 3 — Output tax cross-check (Box 1, 2, 3, 6)

Invoke `search_invoices(status: 'APPROVED,PARTIALLY_PAID,PAID,VOID', valueDateRange: { from: <Q-start>, to: <Q-end> }, limit: 200, sort: 'valueDate:asc')` paginated. (Status is comma-separated per jaz-api rule.)

For each invoice, sum line-item tax amounts grouped by `taxProfileResourceId`. Call `search_tax_profiles(filter: {appliesToSale: true})` once and build a profile → box mapping cache.

Sum by box:
- Standard-rated profiles (e.g. SR / SRCA-S) → Box 1 (taxable) + Box 6 (tax)
- Zero-rated profiles (ZR-S, OS) → Box 2
- Exempt profiles (ES33, ES43) → Box 3

Subtract `search_customer_credit_notes(status: 'APPLIED,PARTIALLY_APPLIED', valueDateRange: …)` line-item tax sums by the same box mapping (CNs reduce output tax).

Compare to the aggregated ledger from Step 2: per-box `|cross_check_total - ledger_total| ≤ 0.01` (rounding tolerance). For any mismatch > 0.01: surface to practitioner with the per-box delta and a suggested investigation ("Box 6 cross-check shows SGD 142.30 less than VAT ledger — likely a manual journal with a sales tax-profile that bypassed the invoices. Check `search_journals(filter: {tag: 'GST', valueDate: …})`.").

**On 422 from `search_invoices` with reason `sort_required_when_offset_set`:** add `sort: 'valueDate:asc'` to all paginated calls (jaz-api pagination rule).

### Step 4 — Input tax cross-check (Box 5, 7)

Invoke `search_bills(status: 'APPROVED,PARTIALLY_PAID,PAID,VOID', valueDateRange: { from: <Q-start>, to: <Q-end> }, limit: 200, sort: 'valueDate:asc')` paginated.

For each bill, sum line-item tax amounts grouped by `taxProfileResourceId`.

**Critical filter — blocked input tax.** Per Singapore GST Act Reg 26/27, input tax on these expense categories is BLOCKED:
- Entertainment (food/beverage/recreation provided to non-employees)
- Motor cars (private passenger vehicles + running expenses unless taxi)
- Medical expenses for employees (unless statutory or in standard fringe-benefit list)
- Family benefits / club subscriptions

Read `CLIENT.tax setup quirks` for the practitioner's documented blocked-input-tax categories and GL accounts. For each bill line whose `accountResourceId` falls in a blocked GL: exclude its tax from Box 7. Save the excluded list to `recurring/quarterly/<period>/blocked-input-tax.md` for audit trail.

**Mixed-supply allocation.** If `CLIENT.corporate_tax_bracket == 'partial_exemption'` OR `CLIENT.tax setup quirks` mentions partial-exemption: apply the agreed apportionment ratio (read from `CLIENT.tax setup quirks` or query the practitioner). Document the ratio used in the engagement decisions log.

Subtract `search_supplier_credit_notes(status: 'APPLIED,PARTIALLY_APPLIED', valueDateRange: …)` line-item tax sums.

Compare to ledger Box 5 + Box 7 with the same 0.01 tolerance.

**On 422 from `search_bills` with `sort_required_when_offset_set`:** as Step 3.
**On 404 from `search_tax_profiles`:** the namespace is `tax_profiles`; check filter field names against jaz-api § Tax Profile Scoping.

### Step 5 — Reverse charge on imported services (Box 14, 15, 7)

Per IRAS imported-services rules (effective 2020-01-01 for B2B): if the registered org's exempt supplies > 5% of total OR the org is GST-registered and procures services from overseas vendors that aren't otherwise charged with GST.

Search journals tagged for reverse charge:
`search_journals(filter: {tag: {eq: 'reverse-charge'}, valueDate: { from: <Q-start>, to: <Q-end> }})`.

Sum the imported-service taxable values → Box 15. Sum the deemed output tax → Box 14 (this also flows into Box 6). The matching deemed input tax (claimable subject to partial-exemption rules) → Box 7.

If `search_journals` returns no reverse-charge entries but `CLIENT.tax setup quirks` says the client receives imported services: surface to practitioner: "No reverse-charge journals booked this quarter — confirm whether imported services were received and process via manual journal before F5 submission." Halt unless practitioner authorises proceeding.

### Step 6 — TB reconciliation

Invoke `generate_trial_balance(period_end: <Q-end>)`.

The GST output payable account (typically `2200 - GST Output Tax Payable` or org-specific code) and GST input claimable account (typically `1500 - GST Input Tax Claimable`) must net to the Box 8 figure (net GST to pay / refundable):
- `output_payable_balance - input_claimable_balance == box_8_total`

If the two sides don't tie within `CLIENT.materiality_threshold`: surface "GST control accounts don't tie to F5 Box 8 — investigate manual journals or prior-quarter carry-forwards." Halt.

### Step 7 — Export and submit

Invoke `export_records({ entityType: 'VAT_LEDGER', period: <ENGAGEMENT.period>, outputFormat: 'XLSX' })`. (`outputFormat: 'XLSX'` is mandatory per jaz-api § Export Records — no other format works.)

The export call returns a `jobId`. Poll `search_background_jobs(filter: {resourceId: {eq: <jobId>}})` until `status == SUCCESS` (or `FAILED`/`PARTIAL_SUCCESS`). Filter must use `resourceId`, not `jobId` (jaz-api rule on Background Jobs).

On `SUCCESS`: invoke `download_export(resourceId: <jobId>)`. Save to `deliverables/gst-f5-<period>.xlsx`.

Submission to IRAS happens on myTax Portal manually — Jaz does not file directly. Surface to practitioner: "F5 ready at `deliverables/gst-f5-<period>.xlsx`. Submit via myTax Portal; capture submission reference into `deliverables/iras-ack.txt`."

### Step 8 — Bundled ECL review (optional)

If the practitioner has scoped ECL into this engagement (typical for quarterly cadence):

1. Invoke `generate_aged_ar(period_end: <Q-end>)`.
2. Bucket receivables by aging band (current, 30, 60, 90, 120+ days).
3. Read `CLIENT` decisions log for the historical loss-rate matrix.
4. Invoke `clio calc ecl --current <c> --30d <30> --60d <60> --90d <90> --120d <120> --rates <r1>,<r2>,<r3>,<r4>,<r5> --existing-provision <ep> --currency <CLIENT.base_currency> --json`.
5. If the calc surfaces a top-up provision > `CLIENT.materiality_threshold`: invoke `plan_recipe(recipe: 'ecl', …)` then `execute_recipe`.
6. `bulk_finalize_drafts` for the journal(s) created.

### Step 9 — Sign-off + transition

Update `ENGAGEMENT.status` to `filed` after IRAS acknowledgement is captured.

---

## Common error classes and recovery

| Error class | Where | Recovery |
|---|---|---|
| 422 `gst_not_registered` | `generate_gst_vat_blueprint` | Org not GST-registered in Jaz; verify with client and update Jaz settings before retry. |
| 422 `sort_required_when_offset_set` | `search_invoices` / `search_bills` paginated | Add `sort: 'valueDate:asc'` (jaz-api pagination rule). |
| 422 `period_already_locked` | manual journal posting (e.g. step 8 ECL) | The closed month is locked. Lift lock for that account, post journal, re-lock. |
| 404 unknown filter field | any `search_*` | Field-name drift; check jaz-api § Search filter syntax. |
| Filter ignored on `search_background_jobs` | step 7 | Used `jobId` instead of `resourceId`; switch to `resourceId` (jaz-api Background Jobs rule). |
| Mismatch > 0.01 box-vs-cross-check | steps 3, 4 | Investigate manual journals or off-ledger transactions; do NOT submit until resolved. |
| Mismatch > materiality TB-vs-Box-8 | step 6 | Output/input control accounts don't tie; investigate prior-period carry, mis-tagged journals, lock-date violations. |

(Field-name and error-recovery depth lives in `jaz-api/SKILL.md`. This file enumerates only what quarterly-gst specifically encounters.)

---

## Singapore-specific F5 box reference

Single-line summaries — for full mapping logic and edge cases see `jaz-jobs/references/gst-vat-filing.md`.

| Box | Label | Source |
|-----|-------|--------|
| 1 | Total value standard-rated supplies | search_invoices SR profiles + reverse-charge supplies |
| 2 | Total value zero-rated supplies | search_invoices ZR/OS profiles |
| 3 | Total value exempt supplies | search_invoices ES profiles |
| 4 | Total value of (1)+(2)+(3) | computed |
| 5 | Total value taxable purchases | search_bills SR profiles minus blocked-input-tax |
| 6 | Output tax due | search_invoices SR tax + reverse-charge deemed tax |
| 7 | Input tax claimed | search_bills SR tax (post blocked filter, post partial-exemption ratio) + reverse-charge claimable |
| 8 | Net GST | (6) − (7) |
| 9 | MES imports value | bills with MES-flagged tax profile |
| 14 | Reverse charge — Yes/No | flag if any reverse-charge journals this quarter |
| 15 | Imported services value | reverse-charge taxable amount |
| 16 | Bad debt relief — Yes/No | flag if step 8 ECL produced a write-off this quarter |
