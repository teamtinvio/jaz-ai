# Year-End Close

> Annual close = quarter-end close × 4 + annual-only extras (FA reconciliation, true-ups, dividends, retained earnings rollover, statutory tax provision). Walk the phases below in order, calling the named platform tools directly. For most SMBs, annual extras add 2-5 days on top of the quarterly close cadence.

## Tools and calculators this job uses

### Orchestration
- **`quarter-end-close.md`**: invoked four times in standalone mode (Q1, Q2, Q3, Q4) before annual extras run.

### Platform tools: annual extras
- **`generate_fixed_assets_summary(primarySnapshotStartDate: <FY-start>, primarySnapshotEndDate: <FY-end>, groupBy: 'CATEGORY')`**: Y1 FA reconciliation: full-year depreciation movement per asset.
- **`generate_fixed_assets_reconciliation_summary(primarySnapshotStartDate: <FY-start>, primarySnapshotEndDate: <FY-end>)`**: Y1 verification: opening NBV + additions − disposals − depreciation = closing NBV.
- **`search_fixed_assets(filter: {status: {in: ['ACTIVE', 'DISPOSED']}})`**: Y1 enumeration of FAs.
- **`mark_fixed_asset_sold(...)` for a sale or `discard_fixed_asset(...)` for a write-off (both are operations, not status mutations)**: Y1 fallback if any FA has incorrect status at FY-end.
- **`search_journals(filter: {tags: {eq: 'leave-accrual'}, valueDate: {between: [<FY-start>, <FY-end>]}})` / `search_journals(filter: {tags: {eq: 'bonus-accrual'}, ...})`**: Y2 true-up: pull all FY accrual journals to compare against actuals.
- **`create_journal(...)`**: Y2 true-up adjustment journals (manual one-off, no calculator).
- **`calculate(type: 'dividend', ...)`**, then `create_capsule` + `create_journal` (declaration) + `create_cash_out` (payment), each with `capsuleResourceId`: Y3 dividend declaration + payment.
- **`calculate(type: 'ecl', ...)`**, then `create_capsule` + `create_journal` with `capsuleResourceId`: Y4 IFRS 9 ECL year-end true-up against `generate_aged_receivables`.
- **`update_account(resourceId: <CoA root>, lockDate: <FY-end>)`**: Y8 final lock.

### Platform tools: current/non-current reclassification (manual annual journals)
- **`search_capsules(filter: {status: {eq: 'ACTIVE'}})` (capsule type is not filterable; see `building-blocks.md` § Filter limits)** + per-capsule `clio calc loan` to compute next-12-months principal portion.
- **`search_capsules(filter: {status: {eq: 'ACTIVE'}})` (capsule type is not filterable; see `building-blocks.md` § Filter limits)** + per-capsule `clio calc lease` for IFRS 16 reclassification.
- **`create_journal(...)`** for the reclassification entries (Dr Loan Payable Non-current / Cr Loan Payable Current; Dr Lease Liability Non-current / Cr Lease Liability Current).

### Handoff to audit-prep
- See `audit-prep.md`: year-end-close hands off to the audit-prep job, which produces the report pack + supporting schedules + audit analyses.

### Calculators (cross-check, no API key needed)
- **`clio calc depreciation --cost --salvage --life --method --frequency annual --json`**: Y1 per-asset cross-check.
- **`clio calc loan --principal --rate --term --json`**: Y6 reclassification: identify the next-12-months principal portion.
- **`clio calc lease --payment --term --rate --json`**: Y6 reclassification for IFRS 16.
- **`clio calc ecl --current --30d --60d --90d --120d --rates --json`**: Y4 ECL calculation.
- **`clio calc dividend --amount <total> --declaration-date <date> --payment-date <date> --withholding-rate <%> --json`**: Y3 dividend computation.

### Cross-references
- Org inputs this job needs (confirm with the user when not already on file): the FY-end, whether a statutory audit is required, the tax jurisdiction (`SG` | `PH`), the dividend policy, and headcount (for the leave true-up).
- Sibling jobs: `quarter-end-close.md` (must run for all 4 quarters before this job's annual extras), `audit-prep.md` (consumes year-end-close output), and the SG Form C-S statutory filing (consumes the audit-prep pack; see the SG Form C-S section in `SKILL.md`).
- Calculator types used: `dividend`, `ecl` (year-end bad-debt true-up), `accrued-expense` (employee true-ups, plus manual journals). See the transaction-recipes skill for the accounting pattern behind each.

---

## Standalone vs Incremental

- **Standalone:** all quarter-end-close steps for Q1-Q4, then annual extras. Use when quarters haven't been closed yet.
- **Incremental:** annual extras only. Use when all 4 quarters are already closed and locked.

Quarters MUST be closed in order: Q1 locked → Q2 close → ... Annual extras assume monthly + quarterly cadence is current.

## Phase sequence

Standalone: run all quarter-end-close steps for Q1-Q4 (Phase 1-7), then the annual extras + final lock + audit-prep handoff (Phase 8 onward). Incremental: annual extras only.

## Phase 1-7: Quarterly closes (×4), IF standalone mode

For each quarter Q1-Q4: invoke `quarter-end-close.md` job. Each builds on its own months (`month-end-close.md` × 3). By end of phase 7: all 12 months individually closed, all 4 quarterly GST F5 returns filed, all quarterly provisions current.

## Phase 8: Annual extras

### Y1: Final FA reconciliation

```
generate_fixed_assets_summary(primarySnapshotStartDate: '2025-01-01', primarySnapshotEndDate: '2025-12-31', groupBy: 'CATEGORY')
generate_fixed_assets_reconciliation_summary(primarySnapshotStartDate: '2025-01-01', primarySnapshotEndDate: '2025-12-31')
```

For Jaz native straight-line depreciation: should be automatic and correct. Verify the 12-month aggregate against `generate_general_ledger(accountResourceIds: [<Depreciation Expense>], startDate, endDate)`.

For non-SL assets (DDB, 150DB) depreciated from a `calculate(type: 'depreciation', method: 'ddb' | '150db')` schedule: the year's journals were posted into the asset's capsule (up front as future-dated DRAFTs, or one per monthly close). Confirm all are FINALIZED via `search_journals(filter: {status: {eq: 'DRAFT'}, valueDate: {between: [<FY-start>, <FY-end>]}})` (should be empty). If non-empty: route back to `month-end-close.md` step 9.

Reconcile `generate_fixed_assets_reconciliation_summary` formula: `openingNbv + additions − disposals − depreciation == closingNbv == TB[Fixed Assets].balance`. Mismatch beyond the materiality threshold → investigate via `search_fixed_assets(filter: {status: {eq: 'ACTIVE'}})` cross-referenced against the depreciation capsule's journals (`search_journals(filter: {valueDate: {between: [<FY-start>, <FY-end>]}})`); typical cause is a disposal posted without `mark_fixed_asset_sold` / `discard_fixed_asset`.

### Y2: Annual true-ups (manual journals)

**Leave balance true-up:**

```
search_journals(filter: {tags: {eq: 'leave-accrual'}, valueDate: {between: ['2025-01-01', '2025-12-31']}})
```

Sum FY accruals (the scheduled leave-accrual journals already finalized monthly). Compare against actual unused leave days × daily rate per employee at FY-end (HR data). Difference: post manual `create_journal`:

```
create_journal({
  valueDate: '2025-12-31',
  reference: 'YE-LEAVE-TRUEUP-FY25',
  journalEntries: [
    { accountResourceId: <Leave Expense>, amount: <delta>, type: 'DEBIT', description: 'Leave accrual true-up FY2025' },
    { accountResourceId: <Leave Liability>, amount: <delta>, type: 'CREDIT', description: 'Leave accrual true-up FY2025' }
  ],
  saveAsDraft: false
})
```

If accrued > actual: reverse the excess (Dr Leave Liability / Cr Leave Expense).

**Bonus true-up:** mirror pattern, against `tag: 'bonus-accrual'` and actual bonuses declared by management.

**Other recurring accruals**: for each recurring accrual the org runs, compare actual bills received during the FY against accruals posted. Any mismatch beyond materiality → manual true-up journal.

### Y3: Dividend declaration + payment

If the org declared a final dividend for the FY:

```
calculate(
  type: 'dividend',
  amount: <gross-dividend>,
  withholdingRate: <dividend withholding rate>,
  declarationDate: '2025-12-31',
  paymentDate: '<paymentDate>'
)
```

The calculator returns three dated steps: a declaration journal (Dr Retained Earnings / Cr Dividends Payable), a payment cash-out, and a withholding cash-out when `withholdingRate > 0`. It posts nothing. Then:

1. `list_capsule_types` + `create_capsule` (type `Dividends`).
2. Declaration: `create_journal(valueDate: '2025-12-31', autoReference: true, journalEntries: [<declaration lines>], capsuleResourceId: <capsule id>)`. Book this in the FY-end close.
3. Payment, no withholding: `create_cash_out(valueDate: '<paymentDate>', accountResourceId: <bank account>, lines: [{accountResourceId: <Dividends Payable>, amount: <gross dividend>}], capsuleResourceId: <capsule id>)`.
4. Payment, with withholding: the payment step has a credit to Withholding Tax Payable beside the bank line, and a cash-out debits every one of its lines, so it cannot carry that credit. Split it in two, both dated `<paymentDate>`:
   - `create_cash_out(valueDate: '<paymentDate>', accountResourceId: <bank account>, lines: [{accountResourceId: <Dividends Payable>, amount: <NET dividend>}], capsuleResourceId: <capsule id>)`.
   - `create_journal(valueDate: '<paymentDate>', autoReference: true, journalEntries: [<Dr Dividends Payable / Cr Withholding Tax Payable, for the withholding amount>], capsuleResourceId: <capsule id>)`.
   Together they clear Dividends Payable (gross) and leave the withheld tax owing to the authority.
5. Withholding remittance, when the tax is actually remitted: `create_cash_out(valueDate: <remittance date>, accountResourceId: <bank account>, lines: [{accountResourceId: <Withholding Tax Payable>, amount: <withholding amount>}], capsuleResourceId: <capsule id>)`.

Cash-outs post ACTIVE immediately (cash entries have no draft state), so record them when the money leaves the account, not at FY-end when the dividend is only declared. Full walkthrough: `transaction-recipes/references/dividend.md` step 4.

For interim dividends declared during the year: those should already be posted in their respective monthly closes. Y3 covers FY-end final dividend only.

### Y4: IFRS 9 ECL year-end true-up

```
generate_aged_receivables(endDate: '2025-12-31')
```

Bucket AR by aging band per the org's ECL loss-rate matrix (current 0.5%, 30d 2%, 60d 5%, 90d 10%, 120d+ 50%; tune per the org's historical loss data).

```
clio calc ecl --current <c> --30d <30> --60d <60> --90d <90> --120d <120> --rates 0.5,2,5,10,50 --existing-provision <ep> --currency <base currency> --json
```

If top-up needed > the materiality threshold:

```
calculate(type: 'ecl', buckets: <[{name, balance, rate}]>, existingProvision: <Allowance for Doubtful Debts balance>, startDate: '2025-12-31')
```

Then `list_capsule_types` + `create_capsule` (type `ECL Provision`) and post the one journal the calculator returns with `create_journal` and `capsuleResourceId`: Dr Bad Debt Expense / Cr Allowance for Doubtful Debts for the top-up amount. ECL is one-shot per FY (no ongoing schedule).

For specific large customers requiring stage-3 provision (specific impairment vs collective ECL): use `create_journal` directly with explicit per-customer narrative.

### Y5: IAS 37 provisions year-end remeasurement

For each existing IAS 37 provision capsule (warranty, legal, decommissioning):

```
search_capsules(filter: {status: {eq: 'ACTIVE'}})
```

Per capsule, recompute the present value at FY-end (`clio calc provision`). Top-up via `create_journal` into the provision's capsule (amount from `calculate(type: 'provision', ...)`) if required, OR reverse via `create_journal` if the obligation reduced.

### Y6: Current/non-current reclassification (manual journals)

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
    { accountResourceId: <Loan Payable Non-current>, amount: <next-12mo-principal>, type: 'DEBIT' },
    { accountResourceId: <Loan Payable Current>, amount: <next-12mo-principal>, type: 'CREDIT' }
  ],
  saveAsDraft: false
})
```

Mirror for IFRS 16 lease liability (`Lease Liability Non-current` → `Lease Liability Current`).

### Y7: Final TB + draft gate + report pack handoff

```
generate_trial_balance(endDate: '2025-12-31')
```

Save the final FY trial balance. Assert: BS Total Assets = Total Liabilities + Total Equity; P&L Net Profit ties to Equity Movement closing balance.

Run completeness gates:
```
search_journals(filter: {status: {eq: 'DRAFT'}, valueDate: {between: ['2025-01-01', '2025-12-31']}})
search_invoices(filter: {status: {eq: 'DRAFT'}, valueDate: {between: ['2025-01-01', '2025-12-31']}})
search_bills(filter: {status: {eq: 'DRAFT'}, valueDate: {between: ['2025-01-01', '2025-12-31']}})
```

ALL three must return zero. If any: `bulk_update_journals(items: [{resourceId, saveAsDraft: false}, ...]) for journals; bulk_finalize_drafts(items: [{type, resourceId}, ...]) for invoices/bills/CN` for the keep-set; `delete_*` for the discards.

### Y8: Lock the year

```
update_account(resourceId: <CoA root>, lockDate: '2025-12-31')
```

Locks FY2025. Auditor may need temporary lift for AJEs: lift, post, re-lock. Do NOT leave open during fieldwork.

### Y9: Handoff to audit-prep

Invoke `audit-prep.md` job. Year-end-close output (TB final, all reports, all reconciliations) feeds into audit-prep's report-pack assembly + audit-analyses pre-empt step + statutory filing.

---

## Common error classes and recovery

| Source | Error | Recovery |
|--------|-------|----------|
| Phase 1-7 (standalone) | Quarters not all closed | One or more quarters incomplete. Route back to the missing `quarter-end-close.md`. Run annual extras only once all 4 quarters are locked. |
| Y1 FA recon | NBV doesn't tie | Investigate disposed assets posted without status update. `search_fixed_assets(filter: {status: {eq: 'ACTIVE'}})` then check each against current physical existence. |
| Y3 dividend declaration journal | No `Dividends Payable` account to resolve the blueprint line to | Create `Dividends Payable` account (`Current Liability`) via `create_account` first. |
| Y4 ECL | top-up amount surprisingly large | Possibly the existing provision is stale (no monthly mental ECL check ran). Confirm `--existing-provision` matches `TB[Allowance for Doubtful Debts].balance`. If yes, real impairment event occurred; surface to practitioner. |
| Y6 reclassification | Existing reclassification entry from prior year still present | Reverse the prior-year reclassification first (it sits in opening balances). The reclassification entry is per-FY; should be reset at the start of each FY. |
| Y7 completeness gate | Drafts present at FY-end | Either clear (finalize) or document the residuals and surface to the user. NEVER hand the pack to the auditor with FY-period drafts. |
| Y8 lock | 422 `lock_violates_open_journal` | Run Y7 again; a draft snuck in. |

---

## Tips

- **Run in January for prior FY.** Standalone mode includes all 4 quarter closes; allow 5-10 days for full FY catch-up if quarterly cadence has slipped.
- **External audit timeline:** auditor typically arrives 4-6 weeks after FY-end. Year-end-close + audit-prep should complete within 6 weeks of FY-end. Faster = cheaper audit.
- **Reclassification reversal:** the Y6 entries are FY-specific. Next year's first monthly close (or a Y1 reverse step in next year's year-end-close) should reverse them before fresh classification.
- **Form C-S timing:** SG IRAS deadline is November 30 of the FOLLOWING year. ECI: within 3 months of FY-end. Plan year-end-close to feed audit-prep within 3 months for ECI compliance.

---

## Cross-references

- `audit-prep.md`: Y9 handoff. Year-end-close output is required input.
- SG Form C-S statutory filing (see the SG Form C-S section in `SKILL.md`): consumes the audit-prep pack post Y9.
- `month-end-close.md`, `quarter-end-close.md`: prerequisites; Phase 1-7 invokes them in standalone mode.
