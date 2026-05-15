# Recipe: Deferred Revenue (engine name: `deferred-revenue`)

> Mirror of prepaid-amortization for the income side: customer pays upfront for a service delivered over time. The engine creates 1 invoice + N future-dated DRAFT recognition journals, all attached to one capsule. Same operational pattern; opposite accounting direction.

## Tools, recipes, calculators this recipe uses

### Recipe engine entry point
- **`plan_recipe(name: 'deferred-revenue', ...)`** — used in step 2: returns RecipePlan with the upfront customer invoice + N period-end recognition journals, capsule shape, required accounts, customer requirements.
- **`execute_recipe(name: 'deferred-revenue', ...)`** — used in step 4: posts 1 invoice + N future-dated DRAFT journals (one per recognition period). Customer invoice creates the AR + Deferred Revenue liability; recognition journals roll the liability into Revenue over `periods`.

### Calculator (cross-check, no API key needed)
- **`clio calc deferred-revenue --amount <total> --periods <n> --start-date <YYYY-MM-DD> --currency <code> --json`** — used in step 1: independently produce the recognition schedule. Returns `{ perPeriodAmount, recognitionStartDate, recognitionEndDate, schedule[n] }`. Final period absorbs rounding remainder.

### Tools (jaz-api / direct)
- **`search_contacts(filter: {customer: true, name: {eq: <customer>}})`** — step 3: resolve the paying customer.
- **`create_contact(...)` with `customer: true`** — step 3 fallback: create the customer if `search_contacts` returns empty.
- **`search_accounts(filter: {name: {in: ['<deferred liability GL>', '<revenue GL>']}})`** — step 3: confirm both GL accounts exist.
- **`generate_trial_balance(period_end: <date>)`** — step 5: verify Deferred Revenue balance unwinds correctly.
- **`search_capsules(filter: {capsuleType: {eq: 'Deferred Revenue'}, name: {eq: <capsule.name>}})`** — step 0 idempotency check.
- **`finalize_invoice(resourceId: <id>)`** — step 4 fallback: lift the upfront invoice from DRAFT to ACTIVE once practitioner confirms the engagement is genuinely starting.
- **`bulk_finalize_drafts({kind: 'journal', resourceIds: [...]})`** — step 5 monthly: finalize this period's pre-emitted DRAFT recognition journal.

### Cross-references
- Within an engagement: invoked from `practice/references/monthly-close.md` step 8 (finalize this period's pre-emitted journal for existing capsules; create a new capsule for any new deferred arrangement starting this period).
- Sibling recipes: `prepaid-amortization.md` (mirror — same engine pattern, opposite direction).
- IFRS / accounting context: IFRS 15 — revenue recognition over time when control transfers gradually (subscriptions, retainers, multi-period service contracts). The recipe assumes ratable straight-line recognition; for stage-based / milestone billing, use a different pattern (see Variations).

---

## Step-by-step

### Step 0 — Idempotency check

```
search_capsules(filter: {capsuleType: {eq: 'Deferred Revenue'}, name: {eq: 'FY2025 Acme Annual License'}})
```

If a result returns: halt and surface "Deferred revenue capsule `<name>` already exists. Re-running would create a duplicate upfront invoice. Confirm intent — if extending an existing arrangement, use `update_capsule` not `execute_recipe`."

### Step 1 — Independent cross-check (calculator)

```
clio calc deferred-revenue --amount 24000 --periods 12 --start-date 2025-01-01 --currency SGD --json
```

Returns: `{ perPeriodAmount: 2000, recognitionStartDate: '2025-01-31', recognitionEndDate: '2025-12-31', schedule: [{period, recognitionDate, amount}, ...12] }`. Verify total recognition matches the invoice amount within 1 cent (engine carries rounding into final period).

### Step 2 — Plan the recipe

```
plan_recipe(
  name: 'deferred-revenue',
  amount: 24000,
  periods: 12,
  startDate: '2025-01-01',
  currency: 'SGD',
  glDeferredLiability: <CLIENT.coa_mapping['Deferred Revenue']>,
  glRevenue: <CLIENT.coa_mapping['Subscription Revenue']>,
  capsuleType: 'Deferred Revenue',
  capsuleName: 'FY2025 Acme Annual License',
  customer: 'Acme Pte Ltd'
)
```

Returns `RecipePlan` with:
- `requiredAccounts`: `['Accounts Receivable', '<deferred liability GL>', '<revenue GL>']`
- `needsContact`: `true` (customer)
- `steps[0]`: invoice (upfront $24,000 to customer; line item codes to Deferred Revenue, NOT to Revenue)
- `steps[1..12]`: 12 future-dated DRAFT journals (Dr Deferred Revenue / Cr Subscription Revenue, $2,000 each, dated end-of-month)

### Step 3 — Resolve dependencies

For each account in `requiredAccounts`:
- `search_accounts(filter: {name: {eq: <accountName>}})`. If empty: halt. Suggested classifications: `Deferred Revenue` → `Current Liability`; `Subscription Revenue` (or whatever revenue line) → `Operating Revenue`.

Customer:
- `search_contacts(filter: {customer: true, name: {eq: 'Acme Pte Ltd'}})`. If empty: halt and surface "Customer `Acme Pte Ltd` not in Jaz contacts (or not flagged customer: true). Create via `create_contact(customer: true, ...)` or remap CLIENT.md before retry."

### Step 4 — Execute

```
execute_recipe(name: 'deferred-revenue', ...same args..., accountMap: <resolved>, contactId: <resolved>)
```

Returns: `{ capsule: {resourceId, type, title}, steps: [{step, action, status, resourceId}, ...], summary: {total: 13, created: 13, ...} }`. The recipe creates **N+1 entries upfront**:
- Step 1: 1 invoice (upfront $24,000 to customer; line coded to Deferred Revenue). DRAFT — finalize via `finalize_invoice(resourceId: <invoiceResourceId>)` once the engagement starts.
- Steps 2..N+1: **N future-dated DRAFT recognition journals** (each Dr Deferred Revenue $2,000 / Cr Subscription Revenue $2,000), dated end-of-month for periods 1 through 12.

All N journals attach to the same capsule. Customer payment: handled separately via the standard payment flow on the invoice (NOT part of this recipe — recipe assumes upfront cash arrives via `create_invoice_payment` separately and rolls into AR settlement).

### Step 5 — Monthly action (during monthly-close)

For each month after recipe execution, the corresponding DRAFT recognition journal already exists in the capsule. Monthly close action:

```
search_journals(filter: {capsuleResourceId: <id>, valueDate: {between: [<period-start>, <period-end>]}, status: {eq: 'DRAFT'}})
bulk_finalize_drafts({kind: 'journal', resourceIds: [<journal id>]})
```

Verify after finalize:
- `generate_trial_balance(period_end: <period-end>)`.
- Assert: `balance['Deferred Revenue'] == amount - (perPeriodAmount × periodsFinalizedSoFar)` (within 1 cent).
- Assert: `balance['Subscription Revenue'] (period MTD) == perPeriodAmount` (within 1 cent).

After the FINAL period is finalized:
- Assert: `balance['Deferred Revenue'] == 0` exactly (final-period rounding absorbed).
- Close the capsule via `update_capsule(resourceId: <id>, status: 'CLOSED')` if the org tracks capsule status.

If customer cancels mid-term: invoke ad-hoc adjustment — delete remaining DRAFT recognition journals via `delete_journal(resourceId: <id>)` per period, and post a customer credit note via `create_customer_credit_note(...)` for the unrecognized portion.

---

## Common error classes and recovery

| Source | Error | Recovery |
|--------|-------|----------|
| `plan_recipe` | 422 `unsupported_recipe` | Use canonical engine name `deferred-revenue` (already canonical — no alias confusion here). |
| `plan_recipe` | 422 `invalid_period` | `periods <= 0` or non-integer. For lump-sum recognition (no deferral), use `create_invoice` directly with line coded to Revenue. |
| `execute_recipe` | 422 `account_not_found` | Step 3 incomplete. `search_accounts`; create via `create_account` if practitioner confirms. |
| `execute_recipe` | 422 `contact_not_customer` | Customer contact exists but `customer: false`. `update_contact(resourceId: <id>, customer: true)` first. |
| `execute_recipe` | 422 `currency_not_enabled` | The recipe currency isn't enabled for the org. `add_currency` first. |
| `execute_recipe` | 409 `capsule_already_exists` | Step 0 should have caught this. Re-run step 0. |
| `finalize_invoice` | 422 `invoice_unbalanced` | Engine output is always balanced. Escalate. |
| `bulk_finalize_drafts` | 422 `journal_in_locked_period` | Period was locked before this monthly-close. Lift lock, finalize, re-lock. |
| Customer cancels mid-term | (process) | Delete remaining DRAFT journals via `delete_journal(resourceId: <id>)` per period; issue customer credit note for the unrecognized portion via `create_customer_credit_note`. |

---

## Variations

- **Quarterly recognition:** `periods: 4, frequency: 'quarterly'`. 4 quarter-end recognition journals at $6,000 each.
- **Partial first period:** Engine prorates first journal to `(days remaining in first period / total days in period) × perPeriodAmount`. Schedule output makes this explicit.
- **Multi-currency:** Pass `currency: 'USD'` if invoice in USD; per `jaz-api/SKILL.md` rule 25, invoice records via `currency: { sourceCurrency: 'USD' }`. Recognition journals also in USD; Jaz auto-handles period-end FX revaluation of the Deferred Revenue liability balance per IAS 21.23 (do NOT invoke `fx-reval` recipe — see `fx-revaluation.md`).
- **Renewal:** New capsule per term (`'FY2026 Acme Annual License'`). Capsule lifecycle is per recognition cycle.
- **Stage-based / milestone billing** (NOT ratable): NOT supported by this recipe. Use `create_invoice` per milestone with line coded directly to Revenue; no deferral capsule needed.
- **Subscription contracts with proration / mid-cycle upgrades:** prefer Jaz native subscription tools (`create_subscription`) over this recipe — subscriptions handle proration natively. Recipe is for non-subscription deferred revenue (one-time annual licences, retainers, prepaid services).

---

## Cross-references back to engagements

- `practice/references/monthly-close.md` step 8 — invoked monthly to finalize this period's pre-emitted recognition journal per existing Deferred Revenue capsule, AND to plan/execute new capsules when a fresh deferred arrangement starts in the period.
- `practice/references/onboarding.md` — opening trial balance may include opening Deferred Revenue (subscriptions in flight at conversion date). Conversion (`jaz-conversion/SKILL.md § Option 2`) loads the opening balance via clearing account; this recipe then sets up forward recognition only (do NOT model historical periods retroactively).
- `practice/references/annual-statutory.md` step 1 — final monthly close before year-end-close handles the December recognition journal; year-end-close confirms Deferred Revenue is correctly classified as current vs non-current liability for BS presentation.
- Sibling recipe `prepaid-amortization.md` — same engine pattern from the buyer's perspective.
