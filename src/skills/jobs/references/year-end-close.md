# Year-End Close

> Annual close = quarter-end close × 4 + annual-only extras (FA reconciliation, true-ups, dividends, retained earnings rollover, statutory tax provision). Walk the phases below in order, calling the named platform tools directly. (Local CLI convenience: `clio jobs year-end --period <YYYY>` prints this same phased checklist.) For most SMBs, annual extras add 2-5 days on top of the quarterly close cadence.

## Tools, recipes, calculators this job uses

### Orchestration
- **`quarter-end-close.md`** — invoked four times in standalone mode (Q1, Q2, Q3, Q4) before annual extras run.

### Platform tools — annual extras
- **`generate_fa_summary(period_end: <FY-end>)`** — Y1 FA reconciliation: full-year depreciation movement per asset.
- **`generate_fa_recon_summary(period_start: <FY-start>, period_end: <FY-end>)`** — Y1 verification: opening NBV + additions − disposals − depreciation = closing NBV.
- **`search_fixed_assets(filter: {status: {in: ['ACTIVE', 'DISPOSED']}})`** — Y1 enumeration of FAs.
- **`update_fixed_asset(resourceId: <id>, status: 'ACTIVE'|'DISPOSED'|'WRITTEN_OFF')`** — Y1 fallback if any FA has incorrect status at FY-end.
- **`search_journals(filter: {tag: 'leave-accrual', valueDate: {between: [<FY-start>, <FY-end>]}})` / `search_journals(filter: {tag: 'bonus-accrual', ...})`** — Y2 true-up: pull all FY accrual journals to compare against actuals.
- **`create_journal(...)`** — Y2 true-up adjustment journals (manual one-off, not recipe-driven).
- **`plan_recipe(recipe: 'dividend', ...)` + `execute_recipe(...)`** — Y3 dividend declaration + payment (engine emits the 2-step pattern: declaration journal + payment cash-out).
- **`plan_recipe(recipe: 'ecl', ...)` + `execute_recipe(...)`** — Y4 IFRS 9 ECL year-end true-up against `generate_aged_ar`.
- **`update_account(resourceId: <CoA root>, lockDate: <FY-end>)`** — Y8 final lock.

### Platform tools — current/non-current reclassification (manual annual journals)
- **`search_capsules(filter: {capsuleType: {eq: 'Loan Repayment'}})`** + per-capsule `clio calc loan` to compute next-12-months principal portion.
- **`search_capsules(filter: {capsuleType: {eq: 'Lease'}})`** + per-capsule `clio calc lease` for IFRS 16 reclassification.
- **`create_journal(...)`** for the reclassification entries (Dr Loan Payable Non-Current / Cr Loan Payable Current; Dr Lease Liability Non-Current / Cr Lease Liability Current).

### Handoff to audit-prep
- See `audit-prep.md` — year-end-close hands off to the audit-prep job, which produces the report pack + supporting schedules + audit analyses.

### Calculators (cross-check, no API key needed)
- **`clio calc depreciation --cost --salvage --life --method --frequency annual --json`** — Y1 per-asset cross-check.
- **`clio calc loan --principal --rate --term --json`** — Y6 reclassification: identify the next-12-months principal portion.
- **`clio calc lease --payment --term --rate --json`** — Y6 reclassification for IFRS 16.
- **`clio calc ecl --receivables <json> --json`** — Y4 ECL calculation.
- **`clio calc dividend --amount <total> --withholding-rate <%> --json`** — Y3 dividend computation.

### Cross-references
- Org inputs this job needs (confirm with the user when not already on file): the FY-end, whether a statutory audit is required, the tax jurisdiction (`SG` | `PH`), the dividend policy, and headcount (for the leave true-up).
- Sibling jobs: `quarter-end-close.md` (must run for all 4 quarters before this job's annual extras), `audit-prep.md` (consumes year-end-close output), and the SG Form C-S statutory filing (consumes the audit-prep pack — see the SG Form C-S section in `SKILL.md`).
- Recipes invoked: `dividend`, `ecl` (year-end bad-debt true-up), `accrued-expense` (employee true-ups, plus manual journals). See the transaction-recipes skill.

---

## Standalone vs Incremental

- **Standalone (default):** Generates the full plan — all quarter-end-close steps for Q1-Q4, then annual extras. Use when quarters haven't been closed yet.
- **Incremental** (`--incremental`): Annual extras only. Use when all 4 quarters are already closed and locked.

Quarters MUST be closed in order: Q1 locked → Q2 close → ... Annual extras assume monthly + quarterly cadence is current.

## Phase sequence

Standalone: run all quarter-end-close steps for Q1-Q4 (Phase 1-7), then the annual extras + final lock + audit-prep handoff (Phase 8 onward). Incremental (`--incremental` on the local CLI): annual extras only. (Local CLI: `clio jobs year-end --period 2025` prints the same phased checklist.)

## Phase 1-7 — Quarterly closes (×4) — IF standalone mode

For each quarter Q1-Q4: invoke `quarter-end-close.md` job. Each builds on its own months (`month-end-close.md` × 3). By end of phase 7: all 12 months individually closed, all 4 quarterly GST F5 returns filed, all quarterly provisions current.

## Phase 8 — Annual extras

### Y1 — Final FA reconciliation

```
generate_fa_summary(period_end: '2025-12-31')
generate_fa_recon_summary(period_start: '2025-01-01', period_end: '2025-12-31')
```

For Jaz native straight-line depreciation: should be automatic and correct. Verify the 12-month aggregate against `generate_general_ledger(accountResourceId: <Depreciation Expense>, period_start, period_end)`.

For non-SL assets (DDB, 150DB) where `plan_recipe(recipe: 'depreciation', method: 'ddb' | '150db')` was used: each capsule pre-emitted 12 future-dated DRAFT journals at recipe-execution time. Confirm all 12 are FINALIZED via `search_journals(filter: {capsuleResourceId: {eq: <dep capsule>}, status: {eq: 'DRAFT'}, valueDate: {between: [<FY-start>, <FY-end>]}})` — should be empty. If non-empty: route back to `month-end-close.md` step 9.

Reconcile `generate_fa_recon_summary` formula: `openingNbv + additions − disposals − depreciation == closingNbv == TB[Fixed Assets].balance`. Mismatch beyond the materiality threshold → investigate via `search_fixed_assets(filter: {status: {eq: 'ACTIVE'}})` cross-referenced against the depreciation capsule's journals (`search_journals(filter: {capsuleResourceId: {eq: <dep capsule>}, startDate: <FY-start>, endDate: <FY-end>})`) — typical cause is a disposal posted without `update_fixed_asset(status: 'DISPOSED')`.

### Y2 — Annual true-ups (manual journals)

**Leave balance true-up:**

```
search_journals(filter: {tag: 'leave-accrual', valueDate: {between: ['2025-01-01', '2025-12-31']}})
```

Sum FY accruals (the recipe-pre-emitted journals already finalized monthly). Compare against actual unused leave days × daily rate per employee at FY-end (HR data). Difference: post manual `create_journal`:

```
create_journal({
  valueDate: '2025-12-31',
  reference: 'YE-LEAVE-TRUEUP-FY25',
  journalEntries: [
    { accountResourceId: <Leave Expense>, amount: <delta>, type: 'DEBIT', name: 'Leave accrual true-up FY2025' },
    { accountResourceId: <Leave Liability>, amount: <delta>, type: 'CREDIT', name: 'Leave accrual true-up FY2025' }
  ],
  saveAsDraft: false
})
```

If accrued > actual: reverse the excess (Dr Leave Liability / Cr Leave Expense).

**Bonus true-up:** mirror pattern, against `tag: 'bonus-accrual'` and actual bonuses declared by management.

**Other recurring accruals**: for each recurring accrual the org runs, compare actual bills received during the FY against accruals posted. Any mismatch beyond materiality → manual true-up journal.

### Y3 — Dividend declaration + payment

If the org declared a final dividend for the FY:

```
plan_recipe(
  // Note: gl*, capsuleType, capsuleName, bankAccountResourceId, vendor, customer below are illustrative — auto-resolved at execute time from the CoA, not real plan_recipe params.
  recipe: 'dividend',
  amount: <gross-dividend>,
  withholdingRate: <dividend withholding rate>,
  declarationDate: '2025-12-31',
  paymentDate: '<paymentDate>',
  glRetainedEarnings: <CoA Retained Earnings>,
  glDividendsPayable: <CoA Dividends Payable>,
  bankAccountResourceId: <bank>,
  capsuleType: 'Dividends',
  capsuleName: 'FY2025 Final Dividend'
)
```

Then `execute_recipe(...)`. Engine emits 2 journals: declaration (Dr Retained Earnings / Cr Dividends Payable, with optional withholding leg) and payment cash-out. Both attached to the dividend capsule. Both can be DRAFT or ACTIVE based on `finalize` flag.

For interim dividends declared during the year: those should already be posted in their respective monthly closes. Y3 covers FY-end final dividend only.

### Y4 — IFRS 9 ECL year-end true-up

```
generate_aged_ar(period_end: '2025-12-31')
```

Bucket AR by aging band per the org's ECL loss-rate matrix (current 0.5%, 30d 2%, 60d 5%, 90d 10%, 120d+ 50% — tune per the org's historical loss data).

```
clio calc ecl --current <c> --30d <30> --60d <60> --90d <90> --120d <120> --rates 0.5,2,5,10,50 --existing-provision <ep> --currency <base currency> --json
```

If top-up needed > the materiality threshold:

```
plan_recipe(recipe: 'ecl', receivables: <buckets>, ratesPerBucket: <rates>, existingProvisionAccount: <Allowance for Doubtful Debts>, glBadDebtExpense: <Bad Debt Expense>, valueDate: '2025-12-31', capsuleType: 'ECL Provision', capsuleName: 'FY2025 ECL Year-End True-Up')
```

Then `execute_recipe(...)`. Engine emits 1 journal: Dr Bad Debt Expense / Cr Allowance for Doubtful Debts for the top-up amount. ECL recipe is one-shot per FY (no ongoing schedule) — capsule closes on execution.

For specific large customers requiring stage-3 provision (specific impairment vs collective ECL): use `create_journal` directly with explicit per-customer narrative.

### Y5 — IAS 37 provisions year-end remeasurement

For each existing IAS 37 provision capsule (warranty, legal, decommissioning):

```
search_capsules(filter: {capsuleType: {eq: 'Provision'}, status: 'ACTIVE'})
```

Per capsule, recompute the present value at FY-end (`clio calc provision`). Top-up via additional `plan_recipe(recipe: 'provision', ...)` + `execute_recipe` if required, OR reverse via `create_journal` if the obligation reduced.

### Y6 — Current/non-current reclassification (manual journals)

For each loan capsule:
```
clio calc loan --principal <outstanding-at-FY-end> --rate <r> --term <remaining-months> --json
```
Identify next-12-months total principal portion. Post:
```
create_journal({
  valueDate: '2025-12-31',
  reference: 'YE-RECLASS-LOAN-<facility>',
  journalEntries: [
    { accountResourceId: <Loan Payable Non-Current>, amount: <next-12mo-principal>, type: 'DEBIT' },
    { accountResourceId: <Loan Payable Current>, amount: <next-12mo-principal>, type: 'CREDIT' }
  ],
  saveAsDraft: false
})
```

Mirror for IFRS 16 lease liability (`Lease Liability Non-Current` → `Lease Liability Current`).

### Y7 — Final TB + draft gate + report pack handoff

```
generate_trial_balance(period_end: '2025-12-31')
```

Save the final FY trial balance. Assert: BS Total Assets = Total Liabilities + Total Equity; P&L Net Profit ties to Equity Movement closing balance.

Run completeness gates:
```
search_journals(filter: {status: {eq: 'DRAFT'}, valueDate: {between: ['2025-01-01', '2025-12-31']}})
search_invoices(filter: {status: {eq: 'DRAFT'}, valueDate: {between: ['2025-01-01', '2025-12-31']}})
search_bills(filter: {status: {eq: 'DRAFT'}, valueDate: {between: ['2025-01-01', '2025-12-31']}})
```

ALL three must return zero. If any: `bulk_update_journals(items: [{resourceId, saveAsDraft: false}, ...]) for journals; bulk_finalize_drafts(items: [{type, resourceId}, ...]) for invoices/bills/CN` for the keep-set; `delete_*` for the discards.

### Y8 — Lock the year

```
update_account(resourceId: <CoA root>, lockDate: '2025-12-31')
```

Locks FY2025. Auditor may need temporary lift for AJEs — lift, post, re-lock. Do NOT leave open during fieldwork.

### Y9 — Handoff to audit-prep

Invoke `audit-prep.md` job. Year-end-close output (TB final, all reports, all reconciliations) feeds into audit-prep's report-pack assembly + audit-analyses pre-empt step + statutory filing.

---

## Common error classes and recovery

| Source | Error | Recovery |
|--------|-------|----------|
| Phase 1-7 (standalone) | Quarters not all closed | One or more quarters incomplete. Route back to the missing `quarter-end-close.md`. Run annual extras only once all 4 quarters are locked. |
| Y1 FA recon | NBV doesn't tie | Investigate disposed assets posted without status update. `search_fixed_assets(filter: {status: 'ACTIVE'})` then check each against current physical existence. |
| Y3 `execute_recipe` for dividend | 422 `dividends_payable_account_missing` | Create `Dividends Payable` account (`Current Liability`) via `create_account` first. |
| Y4 ECL | top-up amount surprisingly large | Possibly the existing provision is stale (no monthly mental ECL check ran). Confirm `--existing-provision` matches `TB[Allowance for Doubtful Debts].balance`. If yes, real impairment event occurred — surface to practitioner. |
| Y6 reclassification | Existing reclassification entry from prior year still present | Reverse the prior-year reclassification first (it sits in opening balances). The reclassification entry is per-FY; should be reset at the start of each FY. |
| Y7 completeness gate | Drafts present at FY-end | Either clear (finalize) or document the residuals and surface to the user. NEVER hand the pack to the auditor with FY-period drafts. |
| Y8 lock | 422 `lock_violates_open_journal` | Run Y7 again — a draft snuck in. |

---

## Tips

- **Run in January for prior FY.** Standalone mode includes all 4 quarter closes; allow 5-10 days for full FY catch-up if quarterly cadence has slipped.
- **External audit timeline:** auditor typically arrives 4-6 weeks after FY-end. Year-end-close + audit-prep should complete within 6 weeks of FY-end. Faster = cheaper audit.
- **Reclassification reversal:** the Y6 entries are FY-specific. Next year's first monthly close (or a Y1 reverse step in next year's year-end-close) should reverse them before fresh classification.
- **Form C-S timing:** SG IRAS deadline is November 30 of the FOLLOWING year. ECI: within 3 months of FY-end. Plan year-end-close to feed audit-prep within 3 months for ECI compliance.

---

## Cross-references

- `audit-prep.md` — Y9 handoff. Year-end-close output is required input.
- SG Form C-S statutory filing (see the SG Form C-S section in `SKILL.md`) — consumes the audit-prep pack post Y9.
- `month-end-close.md`, `quarter-end-close.md` — prerequisites; Phase 1-7 invokes them in standalone mode.
