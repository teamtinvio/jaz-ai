# Quarter-End Close

> Monthly close × 3 + quarterly extras (GST/VAT filing, formal ECL review, bonus true-up, intercompany recon, provision unwinding finalize). Driver tool: `generate_quarter_end_blueprint`.

## Tools, recipes, calculators this job uses

### MCP tools — orchestration
- **`generate_quarter_end_blueprint(period: <YYYY-Q[1-4]>, currency: <base>)`** — step 0: emit phased blueprint.
- **`generate_month_end_blueprint(...)`** — invoked 3× in standalone mode (months 1, 2, 3 of the quarter) before quarterly extras.

### MCP tools — quarterly extras
- **`generate_vat_ledger(period_start: <Q-start>, period_end: <Q-end>)`** — Q1 GST/VAT filing prep: full quarterly tax ledger.
- **`generate_aged_ar(period_end: <Q-end>)`** — Q2 ECL formal review input.
- **`plan_recipe(recipe: 'ecl', ...)` + `execute_recipe(...)`** — Q2 ECL top-up if material.
- **`search_journals(filter: {tag: 'bonus-accrual', valueDate: {between: [<Q-start>, <Q-end>]}})`** — Q3 bonus YTD pull.
- **`create_journal(...)`** — Q3 bonus true-up adjustment (manual one-off).
- **`search_capsules(filter: {capsuleType: {eq: 'Intercompany'}})`** — Q4 IC reconciliation per pair of entities (multi-org coordination — see `intercompany.md` recipe).
- **`search_capsules(filter: {capsuleType: {eq: 'Provisions'}})` + `bulk_update_journals(items: [{resourceId: <id>, saveAsDraft: false}, ...])`** — Q5 finalize each provision capsule's quarter-end DRAFT unwinding journals.
- **`generate_trial_balance(period_end: <Q-end>)`** — verification.
- **`update_account(resourceId: <CoA root>, lockDate: <Q-end>)`** — final lock.

### Calculators (cross-check, no API key needed)
- **`clio calc ecl --current --30d --60d --90d --120d --rates --json`** — Q2 ECL.
- **`clio calc provision`** — Q5 provision recompute (verification).

### Cross-references
- Within an engagement: invoked from `practice/references/quarterly-gst.md` end-to-end. Practice playbook reads `CLIENT.gst_scheme` (`quarterly` | `monthly` | `not-registered`), `CLIENT.materiality_threshold`, `CLIENT.intercompany_arrangements[]`, `CLIENT.bonus_policy`, `CLIENT.ecl_loss_rate_matrix`.
- Sibling jobs: `month-end-close.md` (Phase 1-5 invokes 3×), `gst-vat-filing.md` (Q1 detail), `year-end-close.md` (annual, builds on this).
- Recipes invoked: `bad-debt-provision.md` (engine `ecl`), `employee-accruals.md` (bonus true-up via `accrued-expense`), `intercompany.md` (manual), `provisions.md`.

---

## Standalone vs Incremental

- **Standalone (default):** Generates full plan — all month-end steps for months 1-3, then quarterly extras. Use when months haven't been closed yet.
- **Incremental** (`--incremental`): Quarterly extras only. Use when all 3 months are already closed and locked.

Months MUST be closed in order. Month 1 locked → Month 2 close → Month 2 locked → Month 3 close. Quarterly extras assume the 3 monthly closes are complete and current.

## Step 0 — Emit blueprint

```
generate_quarter_end_blueprint(period: '2025-Q1', currency: <CLIENT.base_currency>)
```

Save to `recurring/quarterly/2025-Q1/blueprint.json`.

## Phase 1-5 — Monthly closes (×3) — IF standalone

Invoke `month-end-close.md` job for each of months 1, 2, 3 of the quarter. By end of phase 5: all 3 months individually closed + locked.

## Phase 6 — Quarterly extras

### Q1 — GST/VAT filing preparation

```
generate_vat_ledger(period_start: '2025-01-01', period_end: '2025-03-31')
```

Save to `recurring/quarterly/2025-Q1/vat-ledger.json`. Verify:
- Output tax total == sum of GST on all sales invoices in the quarter (per `search_invoices(filter: {valueDate: {between: [<Q-start>, <Q-end>]}})` × tax-profile lookup).
- Input tax total == sum of GST on all purchase bills less blocked items.

For SG: file F5 via myTax Portal within 1 month of Q-end. Box mappings:
- Box 1 (Total Sales): total revenue including zero-rated and exempt
- Box 6 (Output Tax): tax-ledger output total
- Box 7 (Input Tax): tax-ledger input total (net of blocked per `practice/references/quarterly-gst.md` step 4)

For PH: file BIR Form 2550Q within 25 days of Q-end. Quarterly total = sum of the 3 monthly Form 2550M filings.

Full step-by-step in `gst-vat-filing.md`.

### Q2 — ECL formal review

```
generate_aged_ar(period_end: '2025-03-31')
clio calc ecl --current 100000 --30d 50000 --60d 20000 --90d 10000 --120d 5000 --rates 0.5,2,5,10,50 --existing-provision <TB Allowance balance> --currency <CLIENT.base_currency> --json
```

If `topUpRequired > CLIENT.materiality_threshold`:

```
plan_recipe(recipe: 'ecl', receivables: <buckets>, ratesPerBucket: <rates from CLIENT.ecl_loss_rate_matrix>, ...)
execute_recipe(...)
update_journal(resourceId: <ecl journal>, saveAsDraft: false)
```

Document the analysis in `recurring/quarterly/2025-Q1/ecl-review.json`. Auditor will request this each quarter.

### Q3 — Bonus accrual true-up

If `CLIENT.bonus_policy.estimation_method` is set:

```
search_journals(filter: {tag: 'bonus-accrual', valueDate: {between: ['2025-01-01', '2025-03-31']}})
```

Sum YTD accruals. Re-estimate full-year bonus per current performance data. If revised quarterly estimate ≠ already-accrued amount: post manual `create_journal` true-up against `Bonus Expense` / `Bonus Payable` for the delta.

### Q4 — Intercompany reconciliation

If `CLIENT.intercompany_arrangements[]` non-empty:

For each arrangement (per pair of entities):
1. Per-entity TB pull: `generate_trial_balance(period_end: '2025-03-31')` in EACH entity's org (multi-org context switch — see `intercompany.md` recipe).
2. Verify `Entity A's IC Receivable balance == Entity B's IC Payable balance` (sign flipped).
3. Investigate discrepancies (timing, FX, missing posting).
4. If settling balances: post `create_cash_out_entry` in payer org + `create_cash_in_entry` (or invoice payment) in payee org.

Full pattern in `intercompany.md` recipe.

### Q5 — Provision unwinding finalize

For each active IAS 37 provision capsule:

```
search_capsules(filter: {capsuleType: {eq: 'Provisions'}, status: {eq: 'ACTIVE'}})
```

Per capsule: this period's quarter-end unwinding DRAFT journals (3 monthly DRAFTs from `provisions.md` recipe execution) should already be in the capsule. Verify and finalize:

```
search_journals(filter: {capsuleResourceId: {eq: <provision capsule id>}, valueDate: {between: ['2025-01-01', '2025-03-31']}, status: {eq: 'DRAFT'}})
bulk_update_journals(items: [{resourceId: <id>, saveAsDraft: false}, ...])
```

If practitioner determines remeasurement is needed (cash-flow estimate changed, discount rate moved): see `provisions.md` step 6 — recompute, post adjustment, reverse remaining DRAFT unwinding journals, re-execute recipe with new inputs.

## Phase 7 — Quarterly verification

```
generate_trial_balance(period_end: '2025-03-31')
generate_profit_and_loss(period_start: '2025-01-01', period_end: '2025-03-31')
generate_balance_sheet(period_end: '2025-03-31')
```

Save to `recurring/quarterly/2025-Q1/`. Quarterly-specific assertions:
- Tax ledger output tax == sum-of-quarter sales GST.
- Tax ledger input tax == sum-of-quarter purchase GST less blocked.
- `Allowance for Doubtful Debts` == calculated ECL from Q2.
- `Bonus Liability` reasonable vs YTD accrual + true-ups.
- IC balances net to zero across paired entities (Q4 verification).

## Phase 8 — Lock the quarter

Run completeness gates (drafts must be zero) per `month-end-close.md` step 17 pattern, then:

```
update_account(resourceId: <CoA root>, lockDate: '2025-03-31')
```

---

## Common error classes and recovery

| Source | Error | Recovery |
|--------|-------|----------|
| `generate_quarter_end_blueprint` | 422 `months_not_closed` (standalone) | Months incomplete. Route to missing `month-end-close.md`. Use `--incremental` only when all 3 months locked. |
| Q1 verification | Tax ledger ≠ sum of GST per invoice/bill | Likely tax-profile assignment errors. Audit each invoice / bill for correct tax profile. Quick Fix: `quick_fix_invoices(...)` / `quick_fix_bills(...)`. |
| Q2 ECL recipe | 422 `account_not_found` | `Allowance for Doubtful Debts` missing. Create via `create_account(accountType: 'Current Asset')`. |
| Q3 | YTD accrual mismatches monthly recipe expectations | Likely a manual journal posted directly to Bonus Liability (not via recipe). Audit `generate_general_ledger(accountResourceId: <Bonus Liability>, period_start: <FY-start>, period_end: <today>)`. |
| Q4 IC recon | Entity A IC Receivable ≠ Entity B IC Payable (sign-flipped) | See `intercompany.md` error table. Common causes: timing, FX confusion, posting skipped in one entity. |
| Q5 | Provision DRAFTs missing for the quarter | Recipe wasn't executed at provision setup. Re-run `provisions.md` recipe with current inputs; the engine emits the unwinding schedule for the remaining periods. |

---

## Cross-references back to engagements

- `practice/references/quarterly-gst.md` — orchestrates this job for clients on quarterly cadence. Reads `CLIENT.gst_scheme`, `CLIENT.gst_registration_number`, `CLIENT.bonus_policy`, `CLIENT.ecl_loss_rate_matrix`.
- `practice/references/annual-statutory.md` — invokes 4× of this (one per quarter) in standalone year-end-close mode.
- `gst-vat-filing.md` — Q1 detail.
- `year-end-close.md` — incremental quarterly extras run within annual close.
