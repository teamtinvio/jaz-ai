# Recipe: Prepaid Amortization (calculator type: `prepaid-expense`)

> Canonical recipe for prepaid expenses paid upfront and recognized over a fixed schedule. Calculate the schedule, create the capsule, then post the supplier bill and the recognition entries yourself (see `building-blocks.md` § The three-step flow).

## Tools and calculator this recipe uses

### Calculator (offline, posts nothing)
- **MCP: `calculate(type: 'prepaid-expense', amount, periods, frequency, startDate, currency)`** (step 1).
- **CLI: `clio calc prepaid-expense --amount <total> --periods <n> --start-date <YYYY-MM-DD> --currency <code> --json`** (step 1): the same result.

### Posting tools
- **`list_capsule_types` / `create_capsule_type(displayName: 'Prepaid Expenses')` / `create_capsule(...)`** (step 3).
- **`create_bill(...)`** (step 4): the supplier bill, coded to the prepaid asset account.
- **`create_scheduled_journal(...)`** (step 4, equal monthly amounts) or **`create_journal(...)`** per period (quarterly, or when the final period differs).

### Lookup and verification tools
- **`search_capsules(filter: {title: {eq: <capsule title>}})`** (step 0): detect a duplicate setup.
- **`search_contacts(filter: {name: {eq: <vendor>}})`** (step 2): resolve the supplier before the bill; `create_contact(...)` if it does not exist.
- **`search_accounts(filter: {name: {in: ['<asset GL>', '<expense GL>']}})`** (step 2): confirm the prepaid asset and expense GL accounts exist.
- **`generate_trial_balance(endDate: <date>)`** (step 5): verify the recognition has unwound the prepaid balance correctly.

### Cross-references
- Operational context: invoked during month-end close (initial setup of new prepaids; ongoing recognition runs from the schedule created here).
- IFRS / accounting context: IAS 38 (intangible) does NOT apply; this is a current asset under IAS 1. The prepaid balance sits in a `Current Asset` account.
- Sibling recipe: `deferred-revenue.md` (mirror image: upfront receipt, monthly recognition).

---

## Step-by-step

### Step 0: Idempotency check

```
search_capsules(filter: {title: {eq: 'FY2025 Office Insurance, POL-88213'}})
```

If a result returns: halt. The prepaid is already set up; re-posting would duplicate the bill and the recognition.

### Step 1: Calculate

```
calculate(
  type: 'prepaid-expense',
  amount: 12000,
  periods: 12,
  startDate: '2025-01-01',
  currency: 'SGD'
)
```

```
clio calc prepaid-expense --amount 12000 --periods 12 --start-date 2025-01-01 --currency SGD --json
```

Returns `{ perPeriodAmount: 1000, schedule: [{ period, date, amortized, remainingBalance, journal }, ...12], blueprint }`. The final period absorbs any rounding remainder, so `remainingBalance` ends at exactly 0.

`blueprint.steps`:
- Step 1, `bill`, dated `2025-01-01`: Dr Prepaid Asset 12,000 / Cr Cash / Bank Account 12,000.
- Steps 2 to 13, `journal`, dated `2025-02-01` through `2026-01-01`: Dr Expense 1,000 / Cr Prepaid Asset 1,000.

Recognition dates run one period after the start date. For month-end recognition, pass a month-end start date (`2024-12-31` gives `2025-01-31`, `2025-02-28`, ...) and date the bill separately.

### Step 2: Resolve accounts and the supplier

The blueprint's `Prepaid Asset`, `Expense` and `Cash / Bank Account` are labels. Map each to the real account:
- `search_accounts(filter: {name: {in: ['Prepaid Insurance', 'Insurance Expense']}})`. If one is missing, halt and surface: "Prepaid recipe needs GL account `<accountName>`, which is not in the CoA. Create it via `create_account` (prepaid asset → `Current Asset`; expense → `Operating Expense`) or remap." Do not pick a near match silently.
- `search_contacts(filter: {name: {eq: <vendor>}})`. If empty: halt and surface "Vendor `<vendor>` not in Jaz contacts. Create via `create_contact(...)` or remap the vendor."

### Step 3: Create the capsule

```
list_capsule_types()
create_capsule(
  capsuleTypeResourceId: <id of 'Prepaid Expenses'>,
  title: 'FY2025 Office Insurance, POL-88213',
  description: <blueprint.capsuleDescription>
)
```

If `Prepaid Expenses` is not in the list: `create_capsule_type(displayName: 'Prepaid Expenses')` first.

### Step 4: Post the entries

**4a. The supplier bill** (blueprint step 1). The debit line becomes the bill's line item; the bank line is the payment, recorded when the supplier is paid:

```
create_bill(
  contactResourceId: <supplier>,
  valueDate: '2025-01-01',
  dueDate: '2025-01-31',
  reference: <supplier invoice number>,
  lineItems: [{ name: 'Office insurance FY2025 (prepaid)', quantity: 1, unitPrice: 12000, accountResourceId: <Prepaid Insurance> }],
  saveAsDraft: true,
  capsuleResourceId: <capsule id>
)
```

The bill is a DRAFT. Finalize it once the supplier invoice is on hand: `finalize_bill(resourceId: <id>)`. Record the payment with `pay_bill` when it leaves the bank.

**4b. The recognition entries** (blueprint steps 2 to 13). **Create these only after the bill is finalized.** A schedule posts on its own dates: one created while the bill is still a draft starts expensing a prepaid asset the books do not hold yet. If the bill cannot be finalized now, stop here and come back.

The amount is the same every month, so one schedule replaces the twelve journals:

```
create_scheduled_journal(
  startDate: '2025-02-01',
  endDate: '2026-01-01',
  repeat: 'MONTHLY',
  valueDate: '2025-02-01',
  reference: 'PREPAID-POL-88213',
  schedulerEntries: [
    { accountResourceId: <Insurance Expense>, type: 'DEBIT', amount: 1000, description: 'Insurance recognition: {{MONTH_NAME}} {{YEAR}}' },
    { accountResourceId: <Prepaid Insurance>, type: 'CREDIT', amount: 1000, description: 'Insurance recognition: {{MONTH_NAME}} {{YEAR}}' }
  ],
  capsuleResourceId: <capsule id>
)
```

Read `building-blocks.md` § "Same amount every period" before choosing the schedule: it has no quarterly repeat, and the amount is fixed (if the final period differs by a rounding cent, end the schedule one period early and post the last journal by hand). With `capsuleResourceId` on the schedule, every journal it generates lands in the capsule.

The alternative is one `create_journal` per blueprint step, each with `valueDate` = the step date, a findable `reference` (`PREPAID-POL-88213-01` ...) and `capsuleResourceId`.

### Step 5: Monthly action (during monthly-close)

With a schedule, the journal posts itself on its date: confirm it exists for the period. With dated draft journals, find this period's journal by its reference and finalize it:

```
search_journals(filter: {reference: {eq: 'PREPAID-POL-88213-03'}})
update_journal(resourceId: <journal id>, saveAsDraft: false)
```

Journals cannot be filtered by capsule, and a date-plus-status search returns every matching DRAFT in the org: never feed one into `bulk_update_journals` or `delete_journal`.

After each period:
- `generate_trial_balance(endDate: <period-end>)`.
- Assert: `balance['Prepaid Insurance'] == amount - (perPeriodAmount × periodsRecognizedSoFar)` (within 1 cent).
- Assert: `balance['Insurance Expense'] (period MTD) == perPeriodAmount` (within 1 cent).

After the FINAL period:
- Assert: `balance['Prepaid Insurance'] == 0` exactly (the calculator's final period absorbs any rounding remainder).
- The capsule lifecycle is now complete; close via a manual `update_capsule(resourceId: <id>, title: '<original> [CLOSED]')` (the API has no `status` field for capsules; closure is informational only) if the org tracks capsule status.

---

## Common problems and recovery

| Where | Problem | Recovery |
|--------|-------|----------|
| Calculator | "must be a positive number" / "must be a positive integer" | `amount` must be positive and `periods` a positive integer. Quarterly = `periods: 4` with `frequency: 'quarterly'` (NOT 12). |
| Step 2 | An account or the supplier is missing | Create it (`create_account`, `create_contact`) after the practitioner confirms, then continue. Nothing has been posted yet. |
| `create_bill` | Currency not enabled for the org | `add_currency(currencies: [...])` first; rates default-resolve from the latest `list_currency_rates`. |
| `create_capsule` | Returns the existing capsule instead of a new one | A capsule with that title exists. Step 0 should have caught it. Confirm whether this is a re-run before posting anything into it. |
| Schedule | Missing recognition journal at month-end | Check the schedule's status with `list_scheduled_journals`. If `INACTIVE`, it was halted during a period-end review. Resume via `update_scheduled_journal(resourceId: <scheduler id>, status: 'ACTIVE')` or document the pause in your working notes. |
| A step failed midway | Bill posted, recognition not | Do not start again: continue from the failed step into the same capsule. |

---

## Variations

- **Quarterly recognition:** `periods: 4, frequency: 'quarterly'`. The calculator returns 4 quarterly journals at $3,000 each. Post them as dated journals (schedules have no quarterly repeat).
- **Partial first period:** The calculator does NOT prorate. Schedule entries are equal full-period amounts (`amount / periods`) starting from `startDate`. For partial-period accuracy on a mid-period start (e.g. insurance starting Feb 15), either accept the slight timing mismatch (most prepaids are immaterial), or post a manual partial-period journal first then calculate from the next full period.
- **Multi-currency:** Pass `currency: 'USD'` if the premium is in USD; the bill is recorded in USD via the standard `currency: { sourceCurrency: 'USD' }` field (per `jaz-api/SKILL.md` rule 25). Monthly recognition journals are also in USD. **Note:** Prepaid Insurance is a NON-MONETARY item per IAS 21.16; it stays at historical (booking) rate and is NOT FX-revalued at period-end. Jaz's period-end revaluation knows this; no action needed.
- **Renewal:** New capsule per year (`'FY2026 Office Insurance, ...'`). Do not extend or re-use the prior capsule; capsule lifecycle is per recognition cycle.

---

## Cross-references

- Month-end close: invoked here only on initial setup of a new prepaid; ongoing recognition runs from the schedule (or the dated journals) created in step 4.
- Data migration: initial trial-balance load may include a non-zero prepaid balance. Conversion via `jaz-conversion/SKILL.md § Option 2 Quick` posts the opening balance via the `Conversion Clearing` account; this recipe then sets up forward recognition only (no historical recognition).
