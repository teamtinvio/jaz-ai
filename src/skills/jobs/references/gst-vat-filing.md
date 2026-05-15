# GST/VAT Filing

> Produce the filing-ready summary + supporting detail for IRAS F5 (SG) or BIR Form 2550Q (PH). Does NOT file — produces the numbers + supporting detail. Driver tool: `generate_gst_vat_blueprint`.

## Tools, recipes, calculators this job uses

### MCP tools
- **`generate_gst_vat_blueprint(period: <YYYY-Q[1-4]>)`** — step 0: emit phased blueprint.
- **`generate_vat_ledger(period_start: <period-start>, period_end: <period-end>)`** — step 1: the canonical tax ledger. Returns input + output tax totals + per-tax-profile breakdown.
- **`search_tax_profiles(filter: {})`** — step 2 setup verification: confirm all expected tax profiles exist (`SR`, `ZR`, `ES`, `IES`, `OS`, `TX`, `BL`, `OP`, `EP`, `RC` for SG; `VAT-RC`, `VAT-EXP`, `VAT-ZR`, `VAT-EXM`, `VAT-EXC` for PH).
- **`search_invoices(filter: {valueDate: {between: [<period-start>, <period-end>]}}, limit: 200)`** — step 3 output-tax detail: per-invoice GST cross-check against tax ledger.
- **`search_bills(filter: {valueDate: {between: [<period-start>, <period-end>]}, status: {ne: 'DRAFT'}}, limit: 200)`** — step 4 input-tax detail: per-bill GST cross-check, with blocked-input filter.
- **`quick_fix_invoices(...)` / `quick_fix_bills(...)`** — step 5 corrections: bulk-update tax-profile / tax-vat-applicable across multiple transactions if errors found.
- **`download_export(exportType: 'analysis-exchange-rate-audit', startDate, endDate)`** — step 6 pre-filing check: FX rates outside expected band can shift GST on FX invoices.
- **`generate_trial_balance(period_end: <period-end>)`** — step 7 GST account reconciliation: `GST Control` / `Input Tax Recoverable` / `Output Tax Payable` accounts.

### Cross-references
- Within an engagement: invoked from `practice/references/quarterly-gst.md` end-to-end. Practice playbook reads `CLIENT.gst_scheme`, `CLIENT.gst_registration_number`, `CLIENT.country_code`.
- Sibling jobs: `quarter-end-close.md` Q1 (this job is the canonical Q1 detail), `month-end-close.md` (monthly tax-profile maintenance feeds this).
- API rules: `jaz-api/SKILL.md` rule 100 (tax-profile scoping), rule 45 (withholding tax codes for PH), rule 98 (WHT codes).

---

## Step 0 — Emit blueprint

```
generate_gst_vat_blueprint(period: '2025-Q1')
```

## Step 1 — Pull the tax ledger

```
generate_vat_ledger(period_start: '2025-01-01', period_end: '2025-03-31')
```

Save to `recurring/quarterly/2025-Q1/vat-ledger.json`. Returns:
- `outputTax`: per-tax-profile breakdown of GST collected on sales
- `inputTax`: per-tax-profile breakdown of GST paid on purchases
- `netPayable`: outputTax total - claimable inputTax total
- `byProfile`: per-tax-profile transaction count + total

## Step 2 — Tax-profile setup verification

```
search_tax_profiles(filter: {})
```

For SG (CLIENT.country_code: 'SG'), verify all standard profiles exist:
- `SR` (Standard-rated 9%): sales of taxable goods/services
- `ZR` (Zero-rated): exports, international services
- `ES` (Exempt): financial services, sale/lease of residential property
- `IES` (Out-of-scope exempt): supplies to non-Singapore residents
- `OS` (Out-of-scope): non-business supplies
- `TX` (Taxable purchase 9%): claimable input tax
- `BL` (Blocked input tax): per IRAS Reg 26/27 (entertainment, motor cars, club subscriptions, etc.)
- `OP` (Out-of-scope purchases)
- `EP` (Exempt purchase)
- `RC` (Reverse charge): imports of services from overseas suppliers

For PH (CLIENT.country_code: 'PH'):
- `VAT-RC`: regular vatable transactions 12%
- `VAT-EXP`: exempt VAT
- `VAT-ZR`: zero-rated (exports)
- `VAT-EXM`: VAT-exempt
- `VAT-EXC`: VAT-exclusive (international)

Halt if any expected profile is missing — surface to practitioner with create instructions.

## Step 3 — Output-tax detail review

```
search_invoices(filter: {valueDate: {between: ['2025-01-01', '2025-03-31']}, status: {in: ['ACTIVE', 'PAID', 'PARTIALLY_PAID']}}, limit: 200, sort: 'valueDate:asc')
```

Paginate via offset if `totalElements > 200`. For each invoice:
- Per-line-item tax-profile: should match the item / service nature.
- Compute expected GST: `lineAmount × profile.taxRate`.
- Sum per profile; compare against `vat-ledger.outputTax.byProfile`.

Flag invoices where:
- Tax profile is missing (defaults to SR — verify intent)
- Zero-rate applied to local supply (likely error)
- Exempt applied to standard taxable (revenue leakage)

## Step 4 — Input-tax detail review

```
search_bills(filter: {valueDate: {between: ['2025-01-01', '2025-03-31']}, status: {ne: 'DRAFT'}}, limit: 200)
```

For each bill:
- Confirm tax profile is `TX` (claimable) only when input tax is recoverable.
- Flag bills with `BL` (blocked input tax) — these should NOT appear in claimable input tax. Per IRAS Reg 27: entertainment (clients + suppliers), club subscriptions, family benefits, medical / dental, motor car running costs for non-trade vehicles.
- Verify supplier is GST-registered (SG) / VAT-registered (PH) for the input tax to be claimable.

Flag bills where:
- `BL` items incorrectly tagged `TX` (over-claim risk; auditor / IRAS will catch).
- `TX` items from non-registered suppliers (no GST to claim).
- Foreign supplier with `TX` instead of `RC` (reverse-charge applies for imported services).

## Step 5 — Corrections (if errors found)

For tax-profile errors detected in steps 3-4:

```
quick_fix_invoices({
  resourceIds: [<list of invoice ids>],
  attributes: { taxProfileResourceId: <correct profile id> }
})
```

Mirror for bills via `quick_fix_bills`. For line-item-level fixes:

```
quick_fix_invoices({
  lineItemResourceIds: [<list of line item ids>],
  attributes: { taxProfileResourceId: <correct profile> }
})
```

Per `jaz-api/SKILL.md` rule 107: Quick Fix returns 207 Multi-Status on partial failures; retry only failed resourceIds.

After corrections: re-run step 1 `generate_vat_ledger` for the corrected period. Totals will shift.

## Step 6 — Pre-filing audit checks

```
download_export(exportType: 'analysis-exchange-rate-audit', startDate: '2025-01-01', endDate: '2025-03-31')
```

Returns XLSX with FX rates outside expected band for the period. FX invoices use the rate at value date to compute GST in base currency — wrong rate means wrong GST. Investigate flagged rows before filing.

For PH (CLIENT.country_code: 'PH'): also run `download_export(exportType: 'analysis-anomalous-bills', ...)` — BIR audits flag unusual bill patterns; pre-empt.

## Step 7 — GST account reconciliation

```
generate_trial_balance(period_end: '2025-03-31')
```

For SG: balance['GST Control'] should equal tax-ledger's `netPayable` for the quarter. Pre-existing balance from prior quarter (carried forward) must be netted.

For PH: separate accounts for Input VAT Recoverable + Output VAT Payable; verify each independently.

If TB doesn't tie to tax ledger: likely a manual journal posted directly to GST accounts (bypassing the per-transaction tax-profile). Audit via `generate_general_ledger(accountResourceId: <GST Control>, period_start, period_end)` — surface any non-source-system entries.

## Step 8 — Filing summary

Produce the filing summary:

**SG F5 box mappings:**
- Box 1 (Total Sales): sum of all sales invoice values (incl. zero-rated + exempt, EXCL. GST)
- Box 2 (Total exports of goods + international services): from `taxProfile: ZR` invoices
- Box 3 (Total taxable goods + services to non-GST registered persons): subset of Box 1
- Box 5 (Total taxable purchases): from `taxProfile: TX` bills excl. blocked
- Box 6 (Output tax due): tax-ledger `outputTax.total`
- Box 7 (Input tax + refunds claimed): tax-ledger `inputTax.claimable.total`
- Box 8 (Net GST payable): Box 6 - Box 7
- Box 13 (Revenue): from P&L Total Revenue
- Box 14 (Pre-registration GST claim): if applicable
- Box 15 (Bad debt relief claim): from credit-note write-offs in the quarter

**PH 2550Q box mappings:**
- Line 12 (Sales/Receipts for the quarter): per-month split + total
- Line 13 (Output Tax): from tax ledger
- Line 17 (Total Allowable Input Tax): from tax ledger
- Line 19 (VAT Payable/Refundable)
- Plus per-month 2550M sub-totals

Save filing summary to `recurring/quarterly/2025-Q1/filing-summary.json`. Practitioner files via the appropriate portal (myTax / BIR). This job does NOT auto-file.

---

## Common error classes and recovery

| Source | Error | Recovery |
|--------|-------|----------|
| Step 1 | `generate_vat_ledger` returns 0 for input tax despite bills exist | Likely all bills are DRAFT. `search_bills(filter: {status: 'DRAFT', valueDate: {between: [<Q-start>, <Q-end>]}})`; finalize via `bulk_finalize_drafts` (or `finalize_bill` per ID). |
| Step 2 | Tax profile missing for jurisdiction | `create_tax_profile(...)` per IRAS / BIR spec. Halt and surface to practitioner — practitioner judgment on rate. |
| Step 3 | Per-invoice GST ≠ tax-ledger output total | Investigate per-invoice tax-profile assignment. Quick Fix typically resolves. |
| Step 4 | BL bills coded as TX | Quick Fix re-assigns to BL. Practitioner approval required (changes input tax claim). |
| Step 5 | `quick_fix_invoices` 207 Multi-Status | Retry only failed resourceIds (per rule 107). Likely cause: invoice in locked period. |
| Step 7 | TB GST Control ≠ tax-ledger net | Surface to practitioner. Investigate manual journals against GST accounts. Auditor will catch this if unresolved. |
| Step 8 | Box 13 Revenue ≠ P&L Operating Revenue | Box 13 includes ALL revenue (zero-rated + exempt + standard); P&L may show split. Re-confirm Box 13 definition with IRAS. |
| Filing rejected by myTax / BIR | (post-filing) | Pull rejection reason. Amend filing summary; refile within allowed window. Practitioner judgment on penalty exposure. |

---

## Tips

- **Run weekly during the quarter, not just at quarter-end.** Each month's monthly close should validate the tax-profile assignments on that month's invoices/bills. Quarter-end then just runs the aggregated ledger.
- **PH 2550M monthly filings** (in addition to quarterly 2550Q) must be filed within 25 days after each month-end. Quarterly 2550Q reconciles the 3 monthly returns.
- **Reverse-charge supplies** (SG imported services per GST Act s14): supplier doesn't charge GST; you self-account. Tag with `RC` profile so both output AND input legs post.
- **Partial-exemption** (mixed taxable + exempt supplies): apportion input tax. Per IRAS Reg 28 — complex; flag to practitioner if `taxProfile: ES` invoices exist.
- **Audit defense**: keep the per-quarter `vat-ledger.json` + `filing-summary.json` + supporting per-invoice/bill detail in `recurring/quarterly/<period>/`. IRAS audits within 5 years; PH BIR within 3.

---

## Cross-references back to engagements

- `practice/references/quarterly-gst.md` — orchestrates this job. CLIENT.md drives gst_scheme + registration_number.
- `quarter-end-close.md` Q1 — this job is the canonical Q1 detail of quarter-end close.
- `audit-prep.md` step 9 — annual reconciliation: sum of 4 quarterly filings = annual VAT ledger.
- `statutory-filing.md` — separate filing flow (Form C-S corporate income tax), not GST.
