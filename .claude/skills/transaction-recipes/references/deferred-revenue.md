# Recipe: Deferred Revenue (calculator type: `deferred-revenue`)

> Mirror of prepaid-amortization for the income side: customer pays upfront for a service delivered over time. One upfront invoice coded to the Deferred Revenue liability, then N recognition entries that roll the liability into revenue, all in one capsule. Same operational pattern; opposite accounting direction. You calculate, create the capsule and post each entry yourself (see `building-blocks.md` § The three-step flow).

## Tools and calculator this recipe uses

### Calculator (offline, posts nothing)
- **MCP: `calculate(type: 'deferred-revenue', amount, periods, frequency, startDate, currency)`** (step 1).
- **CLI: `clio calc deferred-revenue --amount <total> --periods <n> --start-date <YYYY-MM-DD> --currency <code> --json`** (step 1): the same result.

### Posting tools
- **`list_capsule_types` / `create_capsule_type(displayName: 'Deferred Revenue')` / `create_capsule(...)`** (step 3).
- **`create_invoice(...)`** (step 4): the upfront customer invoice, line coded to Deferred Revenue (NOT to Revenue).
- **`create_scheduled_journal(...)`** (step 4, equal monthly amounts) or **`create_journal(...)`** per period.

### Lookup and verification tools
- **`search_capsules(filter: {title: {eq: <capsule title>}})`** (step 0): idempotency check.
- **`search_contacts(filter: {customer: true, name: {eq: <customer>}})`** (step 2): resolve the paying customer; `create_contact(...)` with `customer: true` if it does not exist.
- **`search_accounts(filter: {name: {in: ['<deferred liability GL>', '<revenue GL>']}})`** (step 2): confirm both GL accounts exist.
- **`finalize_invoice(resourceId: <id>)`** (step 4): lift the upfront invoice from DRAFT to ACTIVE once the practitioner confirms the engagement is genuinely starting.
- **`generate_trial_balance(endDate: <date>)`** (step 5): verify the Deferred Revenue balance unwinds correctly.

### Cross-references
- Operational context: invoked during month-end close (confirm this period's recognition for existing capsules; set up a new capsule for any new deferred arrangement starting this period).
- Sibling recipes: `prepaid-amortization.md` (mirror: same pattern, opposite direction).
- IFRS / accounting context: IFRS 15, revenue recognition over time when control transfers gradually (subscriptions, retainers, multi-period service contracts). The recipe assumes ratable straight-line recognition; for stage-based / milestone billing, use a different pattern (see Variations).

---

## Step-by-step

### Step 0: Idempotency check

```
search_capsules(filter: {title: {eq: 'FY2025 Acme Annual License'}})
```

If a result returns: halt and surface "Deferred revenue capsule `<name>` already exists. Re-posting would create a duplicate upfront invoice. Confirm intent; if extending an existing arrangement, post the extra entries into the existing capsule."

### Step 1: Calculate

```
calculate(
  type: 'deferred-revenue',
  amount: 24000,
  periods: 12,
  startDate: '2025-01-01',
  currency: 'SGD'
)
```

```
clio calc deferred-revenue --amount 24000 --periods 12 --start-date 2025-01-01 --currency SGD --json
```

Returns `{ perPeriodAmount: 2000, schedule: [{ period, date, amortized, remainingBalance, journal }, ...12], blueprint }`. Total recognition equals the invoice amount: the final period absorbs any rounding remainder.

`blueprint.steps`:
- Step 1, `invoice`, dated `2025-01-01`: Dr Cash / Bank Account 24,000 / Cr Deferred Revenue 24,000.
- Steps 2 to 13, `journal`, dated `2025-02-01` through `2026-01-01`: Dr Deferred Revenue 2,000 / Cr Revenue 2,000.

For month-end recognition dates, pass a month-end start date (`2024-12-31` gives `2025-01-31`, `2025-02-28`, ...) and date the invoice separately.

### Step 2: Resolve accounts and the customer

The blueprint's `Deferred Revenue`, `Revenue` and `Cash / Bank Account` are labels. Map each to the real account:
- `search_accounts(filter: {name: {in: ['Deferred Revenue', 'Subscription Revenue']}})`. If one is missing: halt. Suggested classifications: `Deferred Revenue` → `Current Liability`; `Subscription Revenue` (or whatever revenue line) → `Operating Revenue`.

Customer:
- `search_contacts(filter: {customer: true, name: {eq: 'Acme Pte Ltd'}})`. If empty: halt and surface "Customer `Acme Pte Ltd` not in Jaz contacts (or not flagged customer: true). Create via `create_contact(customer: true, ...)` or remap the customer."

### Step 3: Create the capsule

```
list_capsule_types()
create_capsule(
  capsuleTypeResourceId: <id of 'Deferred Revenue'>,
  title: 'FY2025 Acme Annual License',
  description: <blueprint.capsuleDescription>
)
```

If `Deferred Revenue` is not in the list: `create_capsule_type(displayName: 'Deferred Revenue')` first.

### Step 4: Post the entries

**4a. The upfront invoice** (blueprint step 1). The credit line becomes the invoice's line item; the bank line is the receipt, recorded when the customer pays:

```
create_invoice(
  contactResourceId: <customer>,
  autoReference: true,
  valueDate: '2025-01-01',
  dueDate: '2025-01-31',
  lineItems: [{ name: 'Annual licence FY2025', quantity: 1, unitPrice: 24000, accountResourceId: <Deferred Revenue> }],
  saveAsDraft: true,
  capsuleResourceId: <capsule id>
)
```

The invoice is a DRAFT; finalize via `finalize_invoice(resourceId: <invoiceResourceId>)` once the engagement starts. Customer payment is recorded separately with `pay_invoice` when the cash arrives; it settles AR and is not part of the recognition schedule.

**4b. The recognition entries** (blueprint steps 2 to 13). **Create these only after the invoice is finalized.** A schedule posts on its own dates: one created while the invoice is still a draft starts recognising revenue out of a deferred balance the books do not hold yet. If the invoice cannot be finalized now, stop here and come back.

Equal monthly amounts, so one schedule replaces the twelve journals:

```
create_scheduled_journal(
  startDate: '2025-02-01',
  endDate: '2026-01-01',
  repeat: 'MONTHLY',
  valueDate: '2025-02-01',
  reference: 'DEFREV-ACME-2025',
  schedulerEntries: [
    { accountResourceId: <Deferred Revenue>, type: 'DEBIT', amount: 2000, description: 'Licence revenue: {{MONTH_NAME}} {{YEAR}}' },
    { accountResourceId: <Subscription Revenue>, type: 'CREDIT', amount: 2000, description: 'Licence revenue: {{MONTH_NAME}} {{YEAR}}' }
  ],
  capsuleResourceId: <capsule id>
)
```

Read `building-blocks.md` § "Same amount every period" for the schedule's limits (no quarterly repeat, fixed amount). With `capsuleResourceId` on the schedule, every journal it generates lands in the capsule. The alternative is one `create_journal` per blueprint step, each with `valueDate` = the step date, a findable `reference` (`DEFREV-ACME-2025-01` ...) and `capsuleResourceId`.

### Step 5: Monthly action (during monthly-close)

With a schedule, confirm the period's journal posted. With dated draft journals, find this period's journal by its reference and finalize it:

```
search_journals(filter: {reference: {eq: 'DEFREV-ACME-2025-03'}})
update_journal(resourceId: <journal id>, saveAsDraft: false)
```

Journals cannot be filtered by capsule, and a date-plus-status search returns every matching DRAFT in the org: never feed one into `bulk_update_journals` or `delete_journal`.

Verify after each period:
- `generate_trial_balance(endDate: <period-end>)`.
- Assert: `balance['Deferred Revenue'] == amount - (perPeriodAmount × periodsRecognizedSoFar)` (within 1 cent).
- Assert: `balance['Subscription Revenue'] (period MTD) == perPeriodAmount` (within 1 cent).

After the FINAL period:
- Assert: `balance['Deferred Revenue'] == 0` exactly (final-period rounding absorbed).
- Close the capsule via a manual `update_capsule(resourceId: <id>, title: '<original> [CLOSED]')` (the API has no `status` field for capsules; closure is informational only) if the org tracks capsule status.

If the customer cancels mid-term: stop the remaining recognition (end the schedule with `update_scheduled_journal(resourceId: <scheduler id>, status: 'INACTIVE')`, or `delete_journal(resourceId: <id>)` for each remaining DRAFT), and post a customer credit note via `create_customer_credit_note(...)` for the unrecognized portion.

---

## Common problems and recovery

| Where | Problem | Recovery |
|--------|-------|----------|
| Calculator | "must be a positive number" / "must be a positive integer" | `amount` must be positive and `periods` a positive integer. For lump-sum recognition (no deferral), use `create_invoice` directly with the line coded to Revenue. |
| Step 2 | An account is missing | `search_accounts`; create via `create_account` if the practitioner confirms. |
| Step 2 | Contact exists but is not a customer | `update_contact(resourceId: <id>, customer: true)` first. |
| `create_invoice` | Currency not enabled for the org | `add_currency` first. |
| `create_capsule` | Returns the existing capsule instead of a new one | Step 0 should have caught this. Re-run step 0 and confirm intent. |
| Monthly finalize | Journal falls in a locked period | The period was locked before this monthly-close. Lift the lock, finalize, re-lock. |
| Customer cancels mid-term | (process) | Stop the remaining recognition (see step 5); issue a customer credit note for the unrecognized portion via `create_customer_credit_note`. |

---

## Variations

- **Quarterly recognition:** `periods: 4, frequency: 'quarterly'`. 4 quarterly recognition journals at $6,000 each. Post them as dated journals (schedules have no quarterly repeat).
- **Partial first period:** The calculator does NOT prorate. Schedule entries are equal full-period amounts (`amount / periods`). For partial-period revenue (e.g. annual subscription starting mid-month), use `create_subscription` (handles proration natively) rather than this recipe.
- **Multi-currency:** Pass `currency: 'USD'` if invoice in USD; per `jaz-api/SKILL.md` rule 25, invoice records via `currency: { sourceCurrency: 'USD' }`. Recognition journals also in USD; Jaz auto-handles period-end FX revaluation of the Deferred Revenue liability balance per IAS 21.23 (do NOT post an `fx-reval` result; see `fx-revaluation.md`).
- **Renewal:** New capsule per term (`'FY2026 Acme Annual License'`). Capsule lifecycle is per recognition cycle.
- **Stage-based / milestone billing** (NOT ratable): NOT supported by this recipe. Use `create_invoice` per milestone with line coded directly to Revenue; no deferral capsule needed.
- **Subscription contracts with proration / mid-cycle upgrades:** prefer Jaz native subscription tools (`create_subscription`) over this recipe; subscriptions handle proration natively. Recipe is for non-subscription deferred revenue (one-time annual licences, retainers, prepaid services).

---

## Cross-references

- Month-end close: invoked monthly to confirm this period's recognition per existing Deferred Revenue capsule, AND to set up new capsules when a fresh deferred arrangement starts in the period.
- Data migration: opening trial balance may include opening Deferred Revenue (subscriptions in flight at conversion date). Conversion (`jaz-conversion/SKILL.md § Option 2`) loads the opening balance via clearing account; this recipe then sets up forward recognition only (do NOT model historical periods retroactively).
- Year-end close: the final monthly close before year-end handles the December recognition journal; year-end close confirms Deferred Revenue is correctly classified as current vs non-current liability for BS presentation.
- Sibling recipe `prepaid-amortization.md`: the same pattern from the buyer's perspective.
