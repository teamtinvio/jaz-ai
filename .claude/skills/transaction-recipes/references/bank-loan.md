# Recipe: Bank Loan (engine name: `loan`)

> Canonical recipe for term loans with fixed monthly installments. Always invoke the engine — never hand-build the amortization table or the 60+ payment journals.

## Tools, recipes, calculators this recipe uses

### Recipe engine entry point
- **`plan_recipe(recipe: 'loan', ...)`** — used in step 2: returns `RecipePlan` with full amortization schedule, capsule shape, journal templates per period, required accounts.
- **`execute_recipe(recipe: 'loan', ...)`** — used in step 4: posts the disbursement cash-in, creates the loan capsule, creates the monthly repayment scheduler (or per-period journals if `frequency: manual`).

### Calculator (cross-check, no API key needed)
- **`clio calc loan --principal <p> --rate <annual %> --term <months> --start-date <YYYY-MM-DD> --currency <code> --json`** — used in step 1: independently produce the amortization table and verify the engine's `perPeriodAmount`. Returns `{ perPeriodAmount, totalInterest, schedule[n] }`.

### Tools (jaz-api / direct)
- **`list_bank_accounts()`** — used in step 3: resolve the disbursement target bank account by `name + currency` if `CLIENT.bank_accounts[i].jaz_resource_id` is empty.
- **`search_accounts(filter: {name: {in: ['Loan Payable', 'Interest Expense']}})`** — used in step 3: confirm liability + expense GL accounts exist.
- **`search_capsules(filter: {capsuleType: {eq: 'Loan Repayment'}, name: {eq: <capsuleName>}})`** — used in step 0: detect duplicate setup before re-running. Loan capsules are unique per facility — duplicate creation is almost always an agent error.
- **`generate_trial_balance(period_end: <date>)`** — used in step 5: verify the loan liability balance matches the schedule's `closingBalance` column.
- **`update_journal(resourceId: <id>, saveAsDraft: false)`** — used in step 4 verification: lift draft journals to ACTIVE once practitioner confirms.

### Cross-references
- Within an engagement: invoked from `practice/references/onboarding.md` (when the prior firm's loan transfers in via the conversion clearing account, then forward-recognition starts here) and from `practice/references/monthly-close.md` step 4 (monthly accruals do NOT include loan interest — interest is auto-emitted by the loan scheduler).
- Sibling recipes: `fixed-deposit.md` (mirror — placement instead of disbursement, interest income instead of expense), `hire-purchase.md` (loan + depreciation combo for asset purchases).
- IFRS / accounting context: IFRS 9 amortized cost measurement. The engine uses effective interest method (constant rate × outstanding balance), not straight-line.

---

## Step-by-step

### Step 0 — Idempotency check

```
search_capsules(filter: {capsuleType: {eq: 'Loan Repayment'}, name: {eq: 'Bank Loan — ABC Bank — 2025'}})
```

If a result returns: halt and surface "Loan capsule `<name>` already exists (resourceId `<id>`). Re-running the recipe would create a duplicate disbursement. Confirm the practitioner intent — if extending an existing loan, use `update_capsule` not `execute_recipe`."

### Step 1 — Independent cross-check (calculator)

```
clio calc loan --principal 100000 --rate 6 --term 60 --start-date 2025-01-01 --currency SGD --json
```

Returns: `{ perPeriodAmount: 1933.28, totalInterest: 15996.80, schedule: [{period, openingBalance, interest, principal, closingBalance}, ...] }`. Save to `workpapers/<period>/loan-amortization.json` for the engagement archive.

### Step 2 — Plan the recipe

```
plan_recipe(
  // Note: gl*, capsuleType, capsuleName, bankAccountResourceId, vendor, customer below are illustrative — auto-resolved at execute time from CoA / CLIENT.md, not real plan_recipe params.
  recipe: 'loan',
  principal: 100000,
  annualRate: 6,
  termMonths: 60,
  startDate: '2025-01-01',
  currency: 'SGD',
  glLoanLiability: <CLIENT.coa_mapping['Loan Payable']>,
  glInterestExpense: <CLIENT.coa_mapping['Interest Expense']>,
  bankAccountResourceId: <CLIENT.bank_accounts[i].jaz_resource_id>,
  capsuleType: 'Loan Repayment',
  capsuleName: 'Bank Loan — ABC Bank — 2025',
  vendor: 'ABC Bank Singapore'
)
```

Returns: `RecipePlan` with `requiredAccounts`, `needsContact: true`, `steps[0]` = disbursement cash-in, `steps[1..60]` = monthly repayment journals (template: 3-line entry — debit Loan Payable, debit Interest Expense, credit Cash). `capsule.contents` = `{ disbursementResourceId, schedulerResourceId, journalTemplate }`.

### Step 3 — Resolve dependencies

For every account in `requiredAccounts`:
- `search_accounts(filter: {name: {eq: <accountName>}})`. If empty, halt: "Loan recipe references GL account `<accountName>` not in CoA. Create via `create_account` (suggested classifications: `Loan Payable` → `Non-Current Liability`; `Interest Expense` → `Operating Expense`) or remap CLIENT.md before retry."

If `bankAccountResourceId` resolution failed:
- `list_bank_accounts()`, match by `name + currency` from `CLIENT.bank_accounts[i]`. If still no match: halt and surface to practitioner.

For the lender contact:
- `search_contacts(filter: {name: {eq: <vendor>}})`. If empty: halt and surface "Lender `<vendor>` not in Jaz contacts. Create as `supplier: true` via `create_contact` before retry."

### Step 4 — Execute

```
execute_recipe(recipe: 'loan', ...same args...)  // accounts auto-resolved from CoA; pass `bankAccountName` / `contactName` for fuzzy resolve
```

Returns: `{ capsule: {resourceId, type, title}, steps: [{step, action, status, resourceId}, ...], summary: {total, created, ...} }`. The recipe creates **termMonths + 1 entries upfront**:
- Step 1: 1 cash-in for the loan disbursement (per `jaz-api/SKILL.md` rule 26: `accountResourceId` at top level for the bank account, `lines: [{accountResourceId: <Loan Payable>, amount: 100000}]` for the offset). Posted ACTIVE if `finalize: true` was passed; otherwise DRAFT.
- Steps 2..termMonths+1: **N future-dated DRAFT journals** (one per repayment period, dated end-of-month for each month from `<startDate>+1 month` through `<startDate>+termMonths`). Each is a 3-line entry: debit Loan Payable (principal portion per amortization schedule), debit Interest Expense (interest portion), credit Cash.

All N journals attach to the same capsule. They sit DRAFT until you finalize them — typically one per month during monthly-close after the actual bank payment posts.

Note: This is NOT the Jaz scheduler primitive. The recipe pre-emits all 60 journals as DRAFT for upfront capsule visibility (the auditor can see the full amortization). Practitioner alternative: skip the recipe and invoke `create_scheduled_journal(...)` directly with monthly cadence — but the recipe path is canonical for loans because the amortization schedule is non-fixed (interest portion changes each month) which scheduler templates don't handle natively.

### Step 5 — Monthly action (during monthly-close)

After the actual bank payment posts each month, the corresponding repayment journal already exists in the capsule as DRAFT. Monthly close action:

```
search_journals(filter: {capsuleResourceId: {eq: <id>}, valueDate: {between: [<period-start>, <period-end>]}, status: {eq: 'DRAFT'}})
```

Returns the one DRAFT for that period (the engine pre-emitted it). Finalize:

```
update_journal(resourceId: <journal id>, saveAsDraft: false)
```

After disbursement (period 0):
- `generate_trial_balance(period_end: <startDate>)`.
- Assert: `balance['Cash / Bank Account']` increased by `principal`.
- Assert: `balance['Loan Payable']` = `-principal` (credit).

After each monthly finalize:
- `generate_trial_balance(period_end: <month-end>)`.
- Assert: `balance['Loan Payable'] == -schedule[periodIndex].closingBalance` (within 1 cent).
- Assert: `balance['Interest Expense'] (period MTD) == schedule[periodIndex].interest` (within 1 cent).

After the FINAL period (60th repayment) is finalized:
- Assert: `balance['Loan Payable'] == 0` exactly.
- Assert: `balance['Interest Expense'] (life-to-date)` matches `totalInterest` from the calculator within ±1 cent (engine forces final-period adjustment for rounding).
- Close the capsule via a manual `update_capsule(title: '<original> [CLOSED]')` (the API has no `status` field for capsules — closure is informational only) if the org tracks capsule status.

---

## Common error classes and recovery

| Source | Error | Recovery |
|--------|-------|----------|
| `plan_recipe` | 422 `unsupported_recipe` | File-name alias `bank-loan` was used. Use canonical engine name `loan`. |
| `plan_recipe` | 422 `term_too_short` (`termMonths < 2`) | Term loans must be ≥2 periods. For single-shot principal-plus-interest, model as `accrued-expense` for the interest leg + manual journal for principal repayment. |
| `execute_recipe` | 422 `bank_account_not_found` | Step 3 resolution stale. Re-run `list_bank_accounts` and update `CLIENT.bank_accounts[i].jaz_resource_id`. |
| `execute_recipe` | 422 `currency_mismatch_bank_account` | Loan currency ≠ bank account currency. Either pass a `currencyAccount` for FX-on-disbursement, or pick a bank account in the loan's source currency (per `jaz-api/SKILL.md` rule 24). |
| `execute_recipe` | 409 `capsule_already_exists` | Duplicate setup. Step 0 idempotency check should have caught this — go back to step 0. |
| Scheduler | Repayment journal posts but interest amount is off by cents | Engine uses effective interest method per period; if `CLIENT.materiality_threshold` is below 1 cent, narrow the assertion. Otherwise expected behavior. |
| Scheduler | Repayment journal does NOT post on expected date | `update_scheduler` may have paused it. `search_journals(filter: {capsuleResourceId: {eq: <id>}, valueDate: {eq: <expected>}})` — if empty, check scheduler status. Resume or document in `ENGAGEMENT.md`. |
| `update_capsule` | 422 `capsule_locked` | The capsule is in a closed period (lock date passed). Lift the lock first via `update_account` lock_date OR add the new entry in the next open period. |

---

## Variations

- **Variable-rate loan:** Cannot model in a single `plan_recipe` call. Run the recipe for the initial fixed period; when the rate changes, halt the existing scheduler (`update_scheduler(status: 'PAUSED')`), recompute with new rate via `clio calc loan` from the current outstanding balance, and run `plan_recipe` again with the new schedule plus an `existingCapsuleResourceId` pointer so the new repayments append to the same capsule.
- **Lump-sum principal repayment:** Post a manual journal (`create_journal`) Dr Loan Payable / Cr Cash. Then halt the existing scheduler and re-plan with the new outstanding balance.
- **Interest-only period:** Not supported by the loan calculator. Workaround: post N manual interest-only journals via `create_journal` (Dr Interest Expense / Cr Cash) for the interest-only window, then run `plan_recipe(recipe: 'loan', ...)` from the start of the amortizing window with the full outstanding principal.
- **Multi-currency loan (USD loan with SGD base):** Pass `currency: 'USD'`. Disbursement records via `currency: { sourceCurrency: 'USD' }` per `jaz-api/SKILL.md` rule 25. Monthly repayments stay in USD. Period-end FX revaluation against base currency is auto-handled by Jaz (Loan Payable is a monetary item per IAS 21.23 — Jaz auto-translates at closing rate). Verify via `practice/references/monthly-close.md` step 6 verification flow; do NOT invoke `execute_recipe(recipe: 'fx-reval', ...)`.
- **Loan origination fees:** Out of scope for this recipe (the engine's IFRS 9 effective-interest treatment doesn't currently amortize fees into the EIR). Post fees as a separate manual journal: Dr `Operating Expense > Loan Origination Fee` / Cr Cash. For IFRS 9 EIR-amortized fees, model the fee as `prepaid-expense` over the loan term.
- **Year-end current/non-current reclassification:** Out of scope for the engine — manual annual journal: Dr Loan Payable Non-Current / Cr Loan Payable Current for the next 12 months' principal portion. Job blueprint `jobs/references/year-end-close.md` Y6 covers this.

---

## Cross-references back to engagements

- `practice/references/monthly-close.md` step 4 — explicitly excludes loan interest from monthly accruals because the loan scheduler emits it automatically. Practitioner should never post a manual loan-interest accrual.
- `jobs/references/year-end-close.md` Y6 — current/non-current reclassification of the next 12 months' principal portion (manual journal pattern, not engine-managed).
- `practice/references/onboarding.md` — when the prior firm carried a loan, the opening trial balance includes the outstanding balance. Conversion (`jaz-conversion/SKILL.md § Option 2`) loads it via the `Conversion Clearing > Loan` account; this recipe then runs from the migration date forward only (do NOT model historical periods retroactively).
