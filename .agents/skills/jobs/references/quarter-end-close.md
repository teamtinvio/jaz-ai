# Quarter-End Close

> Monthly close × 3 + quarterly extras (GST/VAT filing, formal ECL review, bonus true-up, intercompany recon, provision unwinding finalize). Walk the phases below in order, calling the named platform tools directly. (Local CLI convenience: `clio jobs quarter-end --period <YYYY-QN>` prints this same phased checklist.)

## Tools, recipes, calculators this job uses

### Orchestration
- **`month-end-close.md`** — invoked 3× in standalone mode (months 1, 2, 3 of the quarter) before quarterly extras.

### Platform tools — quarterly extras
- **`generate_vat_ledger(period_start: <Q-start>, period_end: <Q-end>)`** — Q1 GST/VAT filing prep: full quarterly tax ledger.
- **`generate_aged_ar(period_end: <Q-end>)`** — Q2 ECL formal review input.
- **`plan_recipe(recipe: 'ecl', ...)` + `execute_recipe(...)`** — Q2 ECL top-up if material.
- **`search_journals(filter: {tag: 'bonus-accrual', valueDate: {between: [<Q-start>, <Q-end>]}})`** — Q3 bonus YTD pull.
- **`create_journal(...)`** — Q3 bonus true-up adjustment (manual one-off).
- **`search_capsules(filter: {capsuleType: {eq: 'Intercompany'}})`** — Q4 IC reconciliation per pair of entities (multi-org coordination — see the `intercompany` recipe).
- **`search_capsules(filter: {capsuleType: {eq: 'Provisions'}})` + `bulk_update_journals(items: [{resourceId: <id>, saveAsDraft: false}, ...])`** — Q5 finalize each provision capsule's quarter-end DRAFT unwinding journals.
- **`generate_trial_balance(period_end: <Q-end>)`** — verification.
- **`update_account(resourceId: <CoA root>, lockDate: <Q-end>)`** — final lock.

### Calculators (cross-check, no API key needed)
- **`clio calc ecl --current --30d --60d --90d --120d --rates --json`** — Q2 ECL.
- **`clio calc provision`** — Q5 provision recompute (verification).

### Cross-references
- Org inputs this job needs (confirm with the user when not already on file): the GST scheme (`quarterly` | `monthly` | `not-registered`), the materiality threshold, any intercompany arrangements, the bonus policy, and the ECL loss-rate matrix.
- Sibling jobs: `month-end-close.md` (Phase 1-5 invokes 3×), `gst-vat-filing.md` (Q1 detail), `year-end-close.md` (annual, builds on this).
- Recipes invoked: `ecl` (bad-debt / collective provision), `accrued-expense` (bonus true-up), `provision` (IAS 37), plus the manual `intercompany` pattern. See the transaction-recipes skill.

---

## Standalone vs Incremental

- **Standalone (default):** Generates full plan — all month-end steps for months 1-3, then quarterly extras. Use when months haven't been closed yet.
- **Incremental** (`--incremental`): Quarterly extras only. Use when all 3 months are already closed and locked.

Months MUST be closed in order. Month 1 locked → Month 2 close → Month 2 locked → Month 3 close. Quarterly extras assume the 3 monthly closes are complete and current.

## Phase sequence

Standalone: run all month-end steps for months 1-3 (Phase 1-5), then the quarterly extras (Phase 6), then quarterly verification + lock (Phase 7-8). Incremental (`--incremental` on the local CLI): quarterly extras only. (Local CLI: `clio jobs quarter-end --period 2025-Q1` prints the same phased checklist.)

## Phase 1-5 — Monthly closes (×3) — IF standalone

Invoke `month-end-close.md` job for each of months 1, 2, 3 of the quarter. By end of phase 5: all 3 months individually closed + locked.

## Phase 6 — Quarterly extras

### Q1 — GST/VAT filing preparation

```
generate_vat_ledger(period_start: '2025-01-01', period_end: '2025-03-31')
```

Save the quarter's VAT ledger. Verify:
- Output tax total == sum of GST on all sales invoices in the quarter (per `search_invoices(filter: {valueDate: {between: [<Q-start>, <Q-end>]}})` × tax-profile lookup).
- Input tax total == sum of GST on all purchase bills less blocked items.

For SG: file F5 via myTax Portal within 1 month of Q-end. Box mappings:
- Box 1 (Total Sales): total revenue including zero-rated and exempt
- Box 6 (Output Tax): tax-ledger output total
- Box 7 (Input Tax): tax-ledger input total (net of blocked input tax — see `gst-vat-filing.md` step 4)

For PH: file BIR Form 2550Q within 25 days of Q-end. Quarterly total = sum of the 3 monthly Form 2550M filings.

Full step-by-step in `gst-vat-filing.md`.

### Q2 — ECL formal review

```
generate_aged_ar(period_end: '2025-03-31')
clio calc ecl --current 100000 --30d 50000 --60d 20000 --90d 10000 --120d 5000 --rates 0.5,2,5,10,50 --existing-provision <TB Allowance balance> --currency <base currency> --json
```

If `topUpRequired > materiality threshold`:

```
plan_recipe(recipe: 'ecl', receivables: <buckets>, ratesPerBucket: <rates from the org ECL loss-rate matrix>, ...)
execute_recipe(...)
update_journal(resourceId: <ecl journal>, saveAsDraft: false)
```

Save the ECL analysis for the quarter — the auditor will request it each quarter.

### Q3 — Bonus accrual true-up

If the org has a bonus policy with an estimation method:

```
search_journals(filter: {tag: 'bonus-accrual', valueDate: {between: ['2025-01-01', '2025-03-31']}})
```

Sum YTD accruals. Re-estimate full-year bonus per current performance data. If revised quarterly estimate ≠ already-accrued amount: post manual `create_journal` true-up against `Bonus Expense` / `Bonus Payable` for the delta.

### Q4 — Intercompany reconciliation

If the org has intercompany arrangements:

For each arrangement (per pair of entities):
1. Per-entity TB pull: `generate_trial_balance(period_end: '2025-03-31')` under EACH entity's org credentials (multi-org work — see the `intercompany` recipe).
2. Verify `Entity A's IC Receivable balance == Entity B's IC Payable balance` (sign flipped).
3. Investigate discrepancies (timing, FX, missing posting).
4. If settling balances: post `create_cash_out_entry` in payer org + `create_cash_in_entry` (or invoice payment) in payee org.

Full pattern in the `intercompany` recipe.

### Q5 — Provision unwinding finalize

For each active IAS 37 provision capsule:

```
search_capsules(filter: {capsuleType: {eq: 'Provisions'}, status: {eq: 'ACTIVE'}})
```

Per capsule: this period's quarter-end unwinding DRAFT journals (3 monthly DRAFTs from `provision` recipe execution) should already be in the capsule. Verify and finalize:

```
search_journals(filter: {capsuleResourceId: {eq: <provision capsule id>}, valueDate: {between: ['2025-01-01', '2025-03-31']}, status: {eq: 'DRAFT'}})
bulk_update_journals(items: [{resourceId: <id>, saveAsDraft: false}, ...])
```

If the user determines remeasurement is needed (cash-flow estimate changed, discount rate moved): recompute, post the adjustment, reverse the remaining DRAFT unwinding journals, and re-execute the `provision` recipe with the new inputs.

## Phase 7 — Quarterly verification

```
generate_trial_balance(period_end: '2025-03-31')
generate_profit_and_loss(period_start: '2025-01-01', period_end: '2025-03-31')
generate_balance_sheet(period_end: '2025-03-31')
```

Save the quarter's reports. Quarterly-specific assertions:
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
| Phase 1-5 (standalone) | Months not all closed | Months incomplete. Route to missing `month-end-close.md`. Run quarterly extras only once all 3 months are locked. |
| Q1 verification | Tax ledger ≠ sum of GST per invoice/bill | Likely tax-profile assignment errors. Audit each invoice / bill for correct tax profile. Quick Fix: `quick_fix_invoices(...)` / `quick_fix_bills(...)`. |
| Q2 ECL recipe | 422 `account_not_found` | `Allowance for Doubtful Debts` missing. Create via `create_account(accountType: 'Current Asset')`. |
| Q3 | YTD accrual mismatches monthly recipe expectations | Likely a manual journal posted directly to Bonus Liability (not via recipe). Audit `generate_general_ledger(accountResourceId: <Bonus Liability>, period_start: <FY-start>, period_end: <today>)`. |
| Q4 IC recon | Entity A IC Receivable ≠ Entity B IC Payable (sign-flipped) | See the `intercompany` recipe error table. Common causes: timing, FX confusion, posting skipped in one entity. |
| Q5 | Provision DRAFTs missing for the quarter | Recipe wasn't executed at provision setup. Re-run the `provision` recipe with current inputs; the engine emits the unwinding schedule for the remaining periods. |

---

## Cross-references

- `month-end-close.md` — Phase 1-5 invokes it 3×.
- `gst-vat-filing.md` — the Q1 detail.
- `year-end-close.md` — invokes this job 4× (one per quarter) in standalone annual close.
