# Recipe: Employee Benefit Accruals (calculator types: `leave-accrual` + `accrued-expense`)

> Two distinct patterns in one reference: monthly leave accrual (calculator `leave-accrual`, no reversal) + quarterly/annual bonus accrual (calculator `accrued-expense`, reversal pattern). IAS 19 employee benefits. You calculate, create the capsule and post each entry yourself (see `building-blocks.md` § The three-step flow).

## Why two calculators

- **Leave accrual**: accumulates monthly as employees earn leave entitlement. NO reversal pattern (employees don't unaccumulate leave). Released into actual leave taken / paid out via separate journals. Calculator: `leave-accrual`.
- **Bonus accrual**: accrues each quarter against an estimate, reversed at quarter-start, fresh accrual at quarter-end. Same pattern as utility/electricity accrual. Calculator: `accrued-expense`.

The two patterns share the `Employee Benefits` capsule type but use different calculators. Each gets its own capsule per FY.

## Tools and calculators this recipe uses

### Calculators (offline, post nothing)

**Leave:**
- **MCP: `calculate(type: 'leave-accrual', employees, daysPerYear, dailyRate, periods, startDate, currency)`** (step 1A).
- **CLI: `clio calc leave-accrual --employees <n> --days <days per employee per year> --daily-rate <amt> --periods <months> --start-date <YYYY-MM-DD> --currency <code> --json`**: the same result. Returns `{ totalAnnualCost, periodAccrual, schedule[periods], blueprint }`.

**Bonus:**
- **MCP: `calculate(type: 'accrued-expense', amount: <quarterly bonus est>, periods: 1, startDate, currency)`** (step 1B): returns the accrual + reversal pair. See `accrued-expenses.md` for the full pattern.
- **CLI: `clio calc accrued-expense --amount <quarterly bonus> --periods 1 --start-date <YYYY-MM-DD> --json`**.

### Posting tools
- **`list_capsule_types` / `create_capsule_type(displayName: 'Employee Benefits')` / `create_capsule(...)`**.
- **`create_scheduled_journal(...)`** (leave: the same amount every month) or **`create_journal(...)`** per period.
- **`create_journal(...)`** (bonus: accrual and reversal).

### Lookup and verification tools
- **`search_capsules(filter: {status: {eq: 'ACTIVE'}})`** (step 0; capsule type is not filterable, see `jobs/references/building-blocks.md` § Filter limits): discover existing leave + bonus capsules.
- **`search_accounts(filter: {name: {in: ['Leave Expense', 'Leave Liability', 'Bonus Expense', 'Bonus Payable']}})`**: resolve accounts.
- **`search_journals(filter: {reference: {eq: <period reference>}})`** (monthly): find this period's journal.
- **`update_journal(resourceId: <id>, saveAsDraft: false)`**: monthly finalize of a draft.
- **`generate_trial_balance(endDate: <date>)`**: verification.
- For year-end true-up: see `year-end-close.md` Y2 (manual journal pattern with HR-supplied actuals).

### Cross-references
- Operational context: invoked during month-end close (monthly leave) and during year-end close (Y2 in `year-end-close.md`, bonus accrual true-up).
- Sibling: `accrued-expenses.md` (the calculator that drives the bonus pattern); `dividend.md` (annual P&L distribution to shareholders, mirror to bonus).
- IFRS / accounting context: IAS 19.11 (short-term employee benefits, recognized as expense in the period the service is rendered); IAS 19.13 (accrual of leave entitlement); IAS 19.19 (recognition criteria for bonuses: present obligation + reliable estimate).

---

## Pattern A: Monthly leave accrual (calculator: `leave-accrual`)

### Step 0A: Idempotency check

```
search_capsules(filter: {title: {eq: 'Annual Leave Accrual, FY2025'}})
```

If returns: halt. One leave capsule per FY.

### Step 1A: Calculate

```
calculate(
  type: 'leave-accrual',
  employees: 20,
  daysPerYear: 14,
  dailyRate: 300,
  periods: 12,
  startDate: '2025-01-31',
  currency: 'SGD'
)
```

```
clio calc leave-accrual --employees 20 --days 14 --daily-rate 300 --periods 12 --start-date 2025-01-31 --currency SGD --json
```

Returns: `{ totalAnnualCost: 84000, periodAccrual: 7000, schedule: [{ period: 1, date: '2025-01-31', accrual: 7000, cumulativeBalance: 7000, journal }, ...12], blueprint }`. `dailyRate` should be the average daily compensation rate (annual salary / 260 working days). The first accrual is dated ON the start date, so pass the first month-end.

`blueprint.steps`: 12 `journal` steps, one per month: Dr Leave Expense 7,000 / Cr Accrued Leave Liability 7,000.

### Step 2A: Resolve accounts and create the capsule

Map the labels `Leave Expense` and `Accrued Leave Liability` to real accounts with `search_accounts` (create with `create_account` if missing: expense → `Operating Expense`; liability → `Current Liability`). Then:

```
list_capsule_types()
create_capsule(
  capsuleTypeResourceId: <id of 'Employee Benefits'>,
  title: 'Annual Leave Accrual, FY2025',
  description: <blueprint.capsuleDescription>
)
```

If `Employee Benefits` is not in the list: `create_capsule_type(displayName: 'Employee Benefits')` first.

### Step 3A: Post the accruals

The amount is the same every month, so one schedule replaces the twelve journals:

```
create_scheduled_journal(
  startDate: '2025-01-31',
  endDate: '2025-12-31',
  repeat: 'MONTHLY',
  valueDate: '2025-01-31',
  reference: 'LEAVE-FY2025',
  schedulerEntries: [
    { accountResourceId: <Leave Expense>, type: 'DEBIT', amount: 7000, description: 'Leave accrual: {{MONTH_NAME}} {{YEAR}}' },
    { accountResourceId: <Leave Liability>, type: 'CREDIT', amount: 7000, description: 'Leave accrual: {{MONTH_NAME}} {{YEAR}}' }
  ],
  capsuleResourceId: <capsule id>
)
```

Read `building-blocks.md` § "Same amount every period" for the schedule's limits (fixed amount, so if the final period differs by a rounding cent end the schedule one period early and post the last journal by hand). With `capsuleResourceId` on the schedule, every journal it generates lands in the capsule. The alternative is one `create_journal` per blueprint step, each with `valueDate` = the step date, a findable `reference` (`LEAVE-FY2025-01` ...) and `capsuleResourceId`.

### Step 4A: Monthly action

With a schedule, confirm the month's journal posted. With dated draft journals, find this month's by its reference and finalize it:

```
search_journals(filter: {reference: {eq: 'LEAVE-FY2025-03'}})
update_journal(resourceId: <journal id>, saveAsDraft: false)
```

Journals cannot be filtered by capsule, and a date-plus-status search returns every matching DRAFT in the org: never feed one into `bulk_update_journals` or `delete_journal`.

When an employee actually takes leave:
- Manual journal: Dr Leave Liability / Cr Cash (or Salary Payable) for the days × daily-rate. This RELEASES the accrued obligation.
- The leave-accrual calculator does NOT track per-employee balances; that's HR/payroll system territory. The recipe maintains the company-level liability.

Year-end true-up: see `year-end-close.md` Y2a. Compare actual unused-leave-balance × daily-rate per employee at FY-end vs the cumulative accrued. Post adjustment journal for the delta.

---

## Pattern B: Quarterly/annual bonus accrual (calculator: `accrued-expense`)

### Step 0B: Idempotency check

```
search_capsules(filter: {title: {startWith: 'Bonus Accrual, Q'}})
```

If a current-quarter result returns: halt. One bonus capsule per quarter.

### Step 1B: Estimate + calculate

Estimate quarterly bonus per the entity's bonus policy estimation method:
- `revenue_pct` (e.g., 5% of quarterly revenue): pull `generate_profit_and_loss(startDate: <quarter-start>, endDate: <quarter-end>)`, multiply Operating Revenue by the percentage.
- `prior_quarter`: pull last quarter's posted bonus journal via `search_journals` on its reference.
- `fixed_amount`: use the bonus policy's fixed amount per quarter.

```
calculate(
  type: 'accrued-expense',
  amount: <est>,
  periods: 1,
  startDate: '2025-03-31',
  currency: 'SGD'
)
```

```
clio calc accrued-expense --amount <est> --periods 1 --start-date 2025-03-31 --json
```

Returns the accrual (dated `2025-03-31`) and its reversal (the calculator dates it one month on; post it on the first day of the next quarter, `2025-04-01`).

### Step 2B: Capsule + post

Create a `Bonus Accrual, Q1 2025` capsule under `Employee Benefits`, then post the pair with `create_journal`, exactly as in `accrued-expenses.md` step 4: the accrual (Dr Bonus Expense / Cr Bonus Payable) on Mar 31, the reversal as a DRAFT dated Apr 1. Mirror for Q2 / Q3 / Q4.

### Step 3B: Quarterly action

Per quarter-end-close (`quarter-end-close.md`):
- Post this quarter's accrual (in March).
- April's monthly-close finalizes the reversal DRAFT.
- Create the next quarter's accrual capsule and post its pair.

### Year-end true-up

`year-end-close.md` Y2b. Compare cumulative bonus accruals vs actual bonuses declared by management at FY-end. Manual journal for delta. Once paid (typically Q1 next FY): Dr Bonus Payable / Cr Cash.

---

## Common problems and recovery

| Where | Problem | Recovery |
|--------|-------|----------|
| Calculator (leave) | "Employees must be a positive number" / "Days per year must be a positive number" | Fix the input. The CLI flags are `--employees` and `--days`; the MCP params are `employees` and `daysPerYear`. |
| Calculator | Wrong calculator for the benefit | Leave is `leave-accrual` (no reversal); bonus is `accrued-expense` (accrual + reversal). |
| Account resolution | An account is missing | Common gap: `Bonus Payable` (most CoAs lack); create via `create_account(name: 'Bonus Payable', code: <unused account code>, accountType: 'Current Liability')`. |
| Verification | Leave Liability balance > expected | Practitioner posted manual leave-utilization journals against the wrong account, OR the original estimate was high. Year-end Y2a true-up will catch this. |
| Verification | Bonus accrual nonzero after quarterly reversal posts | Reversal didn't finalize. Find the reversal journal by its reference (journals cannot be filtered by capsule), then finalize it with `update_journal(resourceId, saveAsDraft: false)`. |
| 13th-month bonus (PH-specific) | (process, separate from Q4 bonus) | Accrue `<annual base / 12>` each month throughout the FY (Dr 13th Month Expense / Cr Bonus Payable) with NO reversal, since the obligation accumulates: a monthly `create_scheduled_journal` fits. Settle in December via Dr Bonus Payable / Cr Cash. |

---

## Variations

- **Profit-share bonus** (% of net profit, declared post-audit): NOT this recipe. Mirror the `dividend.md` pattern: declaration journal + payment cash-out at year-end after audit closes.
- **PH 13th-month pay**: monthly accrual of `<annual base / 12>` with no reversal (see the problems table). Mandatory by Philippine law (PD 851). Settle in December.
- **Long-term employee benefits** (gratuity, severance, post-employment benefits): NOT supported by these calculators. Per IAS 19.55-58, requires actuarial valuation. Manual journals only; consider hiring an actuary.
- **Stock-based compensation**: NOT supported. IFRS 2 (separate accounting model). Manual journals only.
- **Multi-currency leave** (employees paid in different currencies): one leave capsule per currency. Each gets its own calculation.

---

## Cross-references

- Month-end close: monthly leave-accrual finalize per existing leave capsule.
- Year-end close (Y2 in `year-end-close.md`): both leave and bonus true-ups against actuals; transition from accrual to actual cash payment in early Q1 next FY. (No quarterly bonus-accrual step; true-up runs annually only.)
- Sibling `accrued-expenses.md`: the calculator that drives the bonus pattern; full problems table + variations there.
