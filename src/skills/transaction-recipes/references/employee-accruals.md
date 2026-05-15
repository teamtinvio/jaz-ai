# Recipe: Employee Benefit Accruals (engine names: `leave-accrual` + `accrued-expense`)

> Two distinct patterns in one reference: monthly leave accrual (engine `leave-accrual`, no reversal) + quarterly/annual bonus accrual (engine `accrued-expense`, reversal pattern). IAS 19 employee benefits.

## Why two engines

- **Leave accrual** — accumulates monthly as employees earn leave entitlement. NO reversal pattern (employees don't unaccumulate leave). Released into actual leave taken / paid out via separate journals. Engine: `leave-accrual`.
- **Bonus accrual** — accrues each quarter against an estimate, reversed at quarter-start, fresh accrual at quarter-end. Same pattern as utility/electricity accrual. Engine: `accrued-expense`.

The two patterns share the same `Employee Benefits` capsule type but use different engines. Each gets its own capsule invocation per FY.

## Tools, recipes, calculators this recipe uses

### Recipe engine entry points

**Leave (engine: `leave-accrual`):**
- **`plan_recipe(recipe: 'leave-accrual', ...)`** — used in step 2A: returns RecipePlan with N future-dated DRAFT accrual journals (one per month, fixed amount). NO reversal.
- **`execute_recipe(recipe: 'leave-accrual', ...)`** — used in step 4A: posts N future-dated DRAFT journals upfront.

**Bonus (engine: `accrued-expense`):**
- **`plan_recipe(recipe: 'accrued-expense', amount: <quarterly bonus est>, periods: 1, ...)`** — used in step 2B: returns 2-journal pair (accrual at period-end + reversal at next-period-start). See `accrued-expenses.md` for the full pattern.

### Calculators
- **`clio calc leave-accrual --headcount <n> --days-per-employee <days> --daily-rate <amt> --periods <months> --start-date <YYYY-MM-DD> --currency <code> --json`** — leave cross-check. Returns `{ totalAnnualCost, perPeriodAmount, schedule[periods] }`.
- **`clio calc accrued-expense --amount <quarterly bonus> --periods 1 --json`** — bonus cross-check.

### Tools (jaz-api / direct)
- **`search_capsules(filter: {capsuleType: {eq: 'Employee Benefits'}})`** — step 0: discover existing leave + bonus capsules.
- **`search_accounts(filter: {name: {in: ['Leave Expense', 'Leave Liability', 'Bonus Expense', 'Bonus Payable']}})`** — step 3.
- **`search_journals(filter: {tag: 'leave-accrual', valueDate: {between: [<period-start>, <period-end>]}, status: 'DRAFT'})`** — step 5 monthly: pull this period's pre-emitted leave DRAFT.
- **`bulk_update_journals(items: [{resourceId: <id>, saveAsDraft: false}, ...])`** — monthly finalize.
- **`generate_trial_balance(period_end: <date>)`** — verification.
- For year-end true-up: see `year-end-close.md` Y2 — manual journal pattern with HR-supplied actuals.

### Cross-references
- Within an engagement: invoked from `practice/references/monthly-close.md` step 10 (monthly leave) and `practice/references/annual-statutory.md` Y2 (annual leave + bonus true-ups).
- Sibling: `accrued-expenses.md` (the engine that drives the bonus pattern); `dividend.md` (annual P&L distribution to shareholders, mirror to bonus).
- IFRS / accounting context: IAS 19.11 (short-term employee benefits — recognized as expense in the period the service is rendered); IAS 19.13 (accrual of leave entitlement); IAS 19.19 (recognition criteria for bonuses — present obligation + reliable estimate).

---

## Pattern A — Monthly leave accrual (engine: `leave-accrual`)

### Step 0A — Idempotency check

```
search_capsules(filter: {capsuleType: {eq: 'Employee Benefits'}, name: {eq: 'Annual Leave Accrual — FY2025'}})
```

If returns: halt. One leave capsule per FY.

### Step 1A — Cross-check (calculator)

```
clio calc leave-accrual --headcount 20 --days-per-employee 14 --daily-rate 300 --periods 12 --start-date 2025-01-01 --currency SGD --json
```

Returns: `{ totalAnnualCost: 84000, perPeriodAmount: 7000, schedule: [{period: 1, accrualDate: '2025-01-31', accrualAmount: 7000, journal: {...}}, ...12] }`. `daily-rate` should be average daily compensation rate (annual salary / 260 working days).

### Step 2A — Plan + execute

```
plan_recipe(
  // Note: gl*, capsuleType, capsuleName, bankAccountResourceId, vendor, customer below are illustrative — auto-resolved at execute time from CoA / CLIENT.md, not real plan_recipe params.
  recipe: 'leave-accrual',
  headcount: 20,
  daysPerEmployee: 14,
  dailyRate: 300,
  periods: 12,
  startDate: '2025-01-01',
  currency: 'SGD',
  glLeaveExpense: <CLIENT.coa_mapping['Leave Expense']>,
  glLeaveLiability: <CLIENT.coa_mapping['Leave Liability']>,
  capsuleType: 'Employee Benefits',
  capsuleName: 'Annual Leave Accrual — FY2025'
)
execute_recipe(recipe: 'leave-accrual', ...same args...)  // accounts auto-resolved from CoA; pass `bankAccountName` / `contactName` for fuzzy resolve
```

Engine emits **12 future-dated DRAFT journals** (one per month, fixed $7,000 each: Dr Leave Expense / Cr Leave Liability).

### Step 5A — Monthly action

```
search_journals(filter: {capsuleResourceId: {eq: <leave capsule id>}, valueDate: {between: [<period-start>, <period-end>]}, status: {eq: 'DRAFT'}})
update_journal(resourceId: <journal id>, saveAsDraft: false)
```

When an employee actually takes leave:
- Manual journal: Dr Leave Liability / Cr Cash (or Salary Payable) for the days × daily-rate. This RELEASES the accrued obligation.
- The leave-accrual recipe does NOT track per-employee balances — that's HR/payroll system territory. The recipe maintains the company-level liability.

Year-end true-up: see `year-end-close.md` Y2a. Compare actual unused-leave-balance × daily-rate per employee at FY-end vs the cumulative accrued. Post adjustment journal for the delta.

---

## Pattern B — Quarterly/annual bonus accrual (engine: `accrued-expense`)

### Step 0B — Idempotency check

```
search_capsules(filter: {capsuleType: {eq: 'Employee Benefits'}, name: {startsWith: 'Bonus Accrual — Q'}})
```

If a current-quarter result returns: halt. One bonus capsule per quarter.

### Step 1B — Cross-check + estimate

Estimate quarterly bonus per `CLIENT.bonus_policy.estimation_method`:
- `revenue_pct` (e.g., 5% of quarterly revenue): pull `generate_profit_and_loss(period_start: <quarter-start>, period_end: <quarter-end>)`, multiply Operating Revenue by the percentage.
- `prior_quarter`: pull last quarter's posted bonus journal via `search_journals(filter: {tag: 'bonus-accrual', valueDate: <prior-quarter>-end})`.
- `fixed_amount`: read from `CLIENT.bonus_policy.fixed_amount` per quarter.

```
clio calc accrued-expense --amount <est> --periods 1 --start-date 2025-03-31 --json
```

### Step 2B — Plan + execute

```
plan_recipe(
  // Note: gl*, capsuleType, capsuleName, bankAccountResourceId, vendor, customer below are illustrative — auto-resolved at execute time from CoA / CLIENT.md, not real plan_recipe params.
  recipe: 'accrued-expense',
  amount: <est>,
  periods: 1,
  startDate: '2025-03-31',
  currency: 'SGD',
  glExpense: <CLIENT.coa_mapping['Bonus Expense']>,
  glAccruedLiability: <CLIENT.coa_mapping['Bonus Payable']>,
  vendor: 'Employee Bonus Pool',
  capsuleType: 'Employee Benefits',
  capsuleName: 'Bonus Accrual — Q1 2025'
)
execute_recipe(recipe: 'accrued-expense', ...)
```

Engine emits 2 journals: accrual (Mar 31) + reversal (Apr 1). Mirror Q2 / Q3 / Q4.

### Step 5B — Quarterly action

Per quarter-end-close (`quarter-end-close.md`):
- Finalize this quarter's accrual DRAFT (in March).
- April's monthly-close finalizes the reversal DRAFT.
- Create the next quarter's accrual capsule + execute.

### Year-end true-up

`year-end-close.md` Y2b. Compare cumulative bonus accruals vs actual bonuses declared by management at FY-end. Manual journal for delta. Once paid (typically Q1 next FY): Dr Bonus Payable / Cr Cash.

---

## Common error classes and recovery

| Source | Error | Recovery |
|--------|-------|----------|
| `plan_recipe` (leave) | 422 `unsupported_recipe` | Use canonical engine name `leave-accrual` (file alias `employee-accruals` covers BOTH leave and bonus). |
| `plan_recipe` (bonus) | 422 `unsupported_recipe` | Use `accrued-expense` for bonus — leave is `leave-accrual`. |
| `execute_recipe` | 422 `account_not_found` | Step 3 incomplete. Common gap: `Bonus Payable` (most CoAs lack); create via `create_account(accountType: 'Current Liability')`. |
| Verification | Leave Liability balance > expected | Practitioner posted manual leave-utilization journals against the wrong account, OR the original recipe estimate was high. Year-end Y2a true-up will catch this. |
| Verification | Bonus accrual nonzero after quarterly reversal posts | Reversal didn't finalize. `search_journals(filter: {capsuleResourceId: {eq: <bonus capsule>}, valueDate: <reversal date>, status: 'DRAFT'})` then `bulk_finalize_drafts`. |
| 13th-month bonus (PH-specific) | (process — separate from Q4 bonus) | Use `accrued-expense` recipe with `amount: <annual base / 12>`, `periods: 12`, accruing throughout FY. Settle in December via Dr Bonus Payable / Cr Cash. |

---

## Variations

- **Profit-share bonus** (% of net profit, declared post-audit): NOT this recipe. Mirror `dividend` recipe pattern — declaration journal + payment cash-out at year-end after audit closes.
- **PH 13th-month pay**: monthly accrual via `accrued-expense` recipe (`amount: <annual base / 12>`, `periods: 12`). Mandatory by Philippine law (PD 851). Settle in December.
- **Long-term employee benefits** (gratuity, severance, post-employment benefits): NOT supported by these engines. Per IAS 19.55-58, requires actuarial valuation. Manual journals only; consider hiring an actuary.
- **Stock-based compensation**: NOT supported. IFRS 2 — separate accounting model. Manual journals only.
- **Multi-currency leave** (employees paid in different currencies): one leave capsule per currency. Each gets its own recipe invocation.

---

## Cross-references back to engagements

- `practice/references/monthly-close.md` step 10 — monthly leave-accrual finalize per existing leave capsule.
- `practice/references/quarterly-gst.md` step Q (where applicable) — quarterly bonus accrual + reversal pair finalize.
- `practice/references/annual-statutory.md` Y2 — both leave and bonus true-ups against actuals; transition from accrual to actual cash payment in early Q1 next FY.
- Sibling `accrued-expenses.md` — the engine that drives the bonus pattern; full error table + variations there.
