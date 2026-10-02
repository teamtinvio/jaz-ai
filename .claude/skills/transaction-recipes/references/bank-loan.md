# Recipe: Bank Loan (calculator type: `loan`)

> Canonical recipe for term loans with fixed monthly installments. Never hand-build the amortization table: the calculator returns it, with the journal lines for every installment. You create the capsule and post the disbursement and each repayment yourself (see `building-blocks.md` § The three-step flow).

## Tools and calculator this recipe uses

### Calculator (offline, posts nothing)
- **MCP: `calculate(type: 'loan', principal, annualRate, termMonths, startDate, currency)`** (step 1).
- **CLI: `clio calc loan --principal <p> --rate <annual %> --term <months> --start-date <YYYY-MM-DD> --currency <code> --json`** (step 1): the same result.

### Posting tools
- **`list_capsule_types` / `create_capsule_type(displayName: 'Loan Repayment')` / `create_capsule(...)`** (step 3).
- **`create_cash_in(...)`** (step 4): the disbursement.
- **`create_journal(...)`** (step 4): one per repayment. The interest portion changes every month, so a fixed-amount schedule does not fit.

### Lookup and verification tools
- **`search_capsules(filter: {title: {eq: <capsule title>}})`** (step 0): detect duplicate setup. Loan capsules are unique per facility; duplicate creation is almost always an agent error.
- **`list_bank_accounts()`** (step 2): resolve the disbursement bank account by `name + currency`.
- **`search_accounts(filter: {name: {in: ['Loan Payable', 'Interest Expense']}})`** (step 2): confirm liability + expense GL accounts exist.
- **`update_journal(resourceId: <id>, saveAsDraft: false)`** (step 5): lift a draft repayment journal to ACTIVE once the bank payment is confirmed.
- **`generate_trial_balance(endDate: <date>)`** (step 5): verify the loan liability balance matches the schedule's `closingBalance` column.

### Cross-references
- Operational context: invoked during data migration (when the prior system's loan transfers in via the conversion clearing account, then forward-recognition starts here) and during month-end close (monthly accruals do NOT include loan interest; each repayment journal from this recipe carries it).
- Sibling recipes: `fixed-deposit.md` (mirror: placement instead of disbursement, interest income instead of expense), `hire-purchase.md` (loan + depreciation combo for asset purchases).
- IFRS / accounting context: IFRS 9 amortized cost measurement. The calculator uses the effective interest method (constant rate × outstanding balance), not straight-line.

---

## Step-by-step

### Step 0: Idempotency check

```
search_capsules(filter: {title: {eq: 'Bank Loan, ABC Bank, LN-2025-0042'}})
```

If a result returns: halt and surface "Loan capsule `<name>` already exists (resourceId `<id>`). Re-posting would create a duplicate disbursement. Confirm the practitioner intent: if this is the same facility, continue posting its remaining repayments into the existing capsule."

### Step 1: Calculate

```
calculate(
  type: 'loan',
  principal: 100000,
  annualRate: 6,
  termMonths: 60,
  startDate: '2025-01-01',
  currency: 'SGD'
)
```

```
clio calc loan --principal 100000 --rate 6 --term 60 --start-date 2025-01-01 --currency SGD --json
```

Returns `{ monthlyPayment: 1933.28, totalPayments: 115996.84, totalInterest: 15996.84, totalPrincipal: 100000, schedule: [{ period, date, openingBalance, payment, interest, principal, closingBalance, journal }, ...60], blueprint }`. Save it to `workpapers/<period>/loan-amortization.json` for the workpaper record.

`blueprint.steps` (61):
- Step 1, `cash-in`, dated `2025-01-01`: Dr Cash / Bank Account 100,000 / Cr Loan Payable 100,000.
- Steps 2 to 61, `journal`, dated `2025-02-01` through `2030-01-01`: Dr Loan Payable (principal portion), Dr Interest Expense (interest portion), Cr Cash / Bank Account (the installment). Month 1 is 1,433.28 principal + 500.00 interest = 1,933.28. The final installment is 1,933.32: it absorbs the rounding so the balance closes at exactly 0.

Without `startDate` the calculator returns the schedule only (`blueprint: null`). Set it to the drawdown date so the repayment dates match the bank's.

### Step 2: Resolve accounts and the bank account

The blueprint's `Loan Payable`, `Interest Expense` and `Cash / Bank Account` are labels. Map each to the real account:
- `search_accounts(filter: {name: {in: ['Loan Payable', 'Interest Expense']}})`. If one is missing, halt: "Loan recipe needs GL account `<accountName>`, which is not in the CoA. Create via `create_account` (suggested classifications: `Loan Payable` → `Non-current Liability`; `Interest Expense` → `Operating Expense`) or remap the account."
- `list_bank_accounts()`, match by `name + currency`. If no match: halt and surface it.

For the lender contact (optional, for the cash-in's `contactResourceId`):
- `search_contacts(filter: {name: {eq: <lender>}})`. If empty and the practitioner wants the lender recorded: create as `supplier: true` via `create_contact`.

### Step 3: Create the capsule

```
list_capsule_types()
create_capsule(
  capsuleTypeResourceId: <id of 'Loan Repayment'>,
  title: 'Bank Loan, ABC Bank, LN-2025-0042',
  description: <blueprint.capsuleDescription>
)
```

If `Loan Repayment` is not in the list: `create_capsule_type(displayName: 'Loan Repayment')` first.

### Step 4: Post the entries

**4a. Disbursement** (blueprint step 1). Per `jaz-api/SKILL.md` rule 26: `accountResourceId` at top level is the bank account; `lines` carries the offset.

```
create_cash_in(
  valueDate: '2025-01-01',
  accountResourceId: <bank account>,
  reference: 'LN-2025-0042-DISB',
  lines: [{ accountResourceId: <Loan Payable>, amount: 100000, description: 'Loan proceeds, ABC Bank LN-2025-0042' }],
  capsuleResourceId: <capsule id>
)
```

It posts ACTIVE immediately: cash entries have no draft state. Post it once the funds have actually arrived. If the disbursement is already in the books (created from the bank feed), do not post it again: move it into the capsule with `move_transaction_capsules` if it sits in another capsule, or leave it and note its reference in the capsule description.

**4b. Repayments** (blueprint steps 2 to 61). One `create_journal` per step, using that step's amounts:

```
create_journal(
  valueDate: '2025-02-01',
  reference: 'LN-2025-0042-01',
  journalEntries: [
    { accountResourceId: <Loan Payable>, type: 'DEBIT', amount: 1433.28, description: 'Loan payment, month 1 of 60' },
    { accountResourceId: <Interest Expense>, type: 'DEBIT', amount: 500.00, description: 'Loan payment, month 1 of 60' },
    { accountResourceId: <bank account>, type: 'CREDIT', amount: 1933.28, description: 'Loan payment, month 1 of 60' }
  ],
  saveAsDraft: true,
  capsuleResourceId: <capsule id>
)
```

Two workable cadences; agree one with the practitioner:
- **Post each month's journal at that month's close**, after the bank payment clears, from the saved schedule (`saveAsDraft: false`).
- **Post all 60 now as drafts** so the full amortization is visible in the capsule, then finalize one per month.

Either way the reference pattern (`LN-2025-0042-01` to `-60`) is what lets you find a specific month's journal later.

### Step 5: Monthly action (during monthly-close)

After the actual bank payment posts each month, find that month's journal by its reference and finalize it (or post it now if you are posting month by month):

```
search_journals(filter: {reference: {eq: 'LN-2025-0042-03'}})
update_journal(resourceId: <journal id>, saveAsDraft: false)
```

Journals cannot be filtered by capsule, and a date-plus-status search returns every matching DRAFT in the org: never feed one into `bulk_update_journals` or `delete_journal`.

After disbursement (period 0):
- `generate_trial_balance(endDate: <startDate>)`.
- Assert: `balance['Cash / Bank Account']` increased by `principal`.
- Assert: `balance['Loan Payable']` = `-principal` (credit).

After each monthly finalize:
- `generate_trial_balance(endDate: <month-end>)`.
- Assert: `balance['Loan Payable'] == -schedule[periodIndex].closingBalance` (within 1 cent).
- Assert: `balance['Interest Expense'] (period MTD) == schedule[periodIndex].interest` (within 1 cent).

After the FINAL period (60th repayment) is finalized:
- Assert: `balance['Loan Payable'] == 0` exactly.
- Assert: `balance['Interest Expense'] (life-to-date)` matches `totalInterest` from the calculator (the final period carries the rounding adjustment).
- Close the capsule via a manual `update_capsule(resourceId: <id>, title: '<original> [CLOSED]')` (the API has no `status` field for capsules; closure is informational only) if the org tracks capsule status.

---

## Common problems and recovery

| Where | Problem | Recovery |
|--------|-------|----------|
| Calculator | "Principal must be a positive number" / "Term (months) must be a positive integer" | Fix the input. For a single-shot principal-plus-interest loan (one period), a schedule adds nothing: post the interest as an accrual and the principal repayment as a manual journal. |
| Step 2 | Bank account not found | Re-run `list_bank_accounts` and re-resolve the bank account resourceId. |
| `create_cash_in` | Loan currency ≠ bank account currency | Pick a bank account in the loan's currency, or record the FX on disbursement (per `jaz-api/SKILL.md` rule 24). |
| `create_capsule` | Returns the existing capsule instead of a new one | Duplicate setup. Step 0 should have caught this; go back to step 0. |
| Verification | Interest amount off by cents against the bank's statement | The calculator uses the effective interest method per period, rounded to 2dp. If the bank's own schedule differs by cents, post the bank's figures: the bank's statement is the record. |
| Monthly finalize | Journal falls in a locked period | The lock date has passed. Lift the lock first, or post the entry in the next open period, with the practitioner's agreement. |
| A step failed midway | Disbursement posted, some repayments not | Do not start again: `search_journals` by reference to see which months exist, then continue from the first missing one. |

---

## Variations

- **Variable-rate loan:** One calculation covers one fixed rate. When the rate changes, delete the remaining DRAFT repayment journals (each found by its reference, then `delete_journal(resourceId: <id>)`), recalculate from the current outstanding balance with the new rate (`principal: <outstanding>`, `termMonths: <remaining>`), and post the new repayment journals into the SAME capsule. Skip the new blueprint's `cash-in` step: the disbursement is already in the books.
- **Lump-sum principal repayment:** Post a manual journal (`create_journal`) Dr Loan Payable / Cr Cash. Then replace the remaining repayments as for a rate change, from the new outstanding balance.
- **Interest-only period:** Not supported by the loan calculator. Workaround: post N manual interest-only journals via `create_journal` (Dr Interest Expense / Cr Cash) for the interest-only window, then calculate from the start of the amortizing window with the full outstanding principal.
- **Multi-currency loan (USD loan with SGD base):** Pass `currency: 'USD'`. Disbursement records via `currency: { sourceCurrency: 'USD' }` per `jaz-api/SKILL.md` rule 25. Monthly repayments stay in USD. Period-end FX revaluation against base currency is auto-handled by Jaz (Loan Payable is a monetary item per IAS 21.23; Jaz auto-translates at closing rate). Verify via the month-end close FX verification flow; do NOT post an `fx-reval` result.
- **Loan origination fees:** Out of scope for the calculator (its effective-interest schedule does not amortize fees into the EIR). Post fees as a separate manual journal: Dr `Operating Expense > Loan Origination Fee` / Cr Cash. For IFRS 9 EIR-amortized fees, model the fee as `prepaid-expense` over the loan term.
- **Year-end current/non-current reclassification:** Not part of the schedule; manual annual journal: Dr Loan Payable Non-current / Cr Loan Payable Current for the next 12 months' principal portion. Job playbook `jobs/references/year-end-close.md` Y6 covers this.

---

## Cross-references

- Month-end close: explicitly excludes loan interest from monthly accruals because each month's repayment journal from this recipe already carries the interest. Never post a separate loan-interest accrual on top of it.
- `jobs/references/year-end-close.md` Y6: current/non-current reclassification of the next 12 months' principal portion (manual journal pattern).
- Data migration: when the prior system carried a loan, the opening trial balance includes the outstanding balance. Conversion (`jaz-conversion/SKILL.md § Option 2`) loads it via the `Conversion Clearing > Loan` account; this recipe then runs from the migration date forward only (do NOT model historical periods retroactively), and the blueprint's `cash-in` step is skipped.
