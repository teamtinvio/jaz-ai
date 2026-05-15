# Recipe: Accrued Expenses (engine name: `accrued-expense`)

> Canonical recipe for month-end expense accruals (utilities, professional fees, cleaning, employee bonuses) — incurred but not yet billed. The engine creates dual-entry accrual + reversal journal pairs, all dated and DRAFT, attached to one capsule.

## Tools, recipes, calculators this recipe uses

### Recipe engine entry point
- **`plan_recipe(name: 'accrued-expense', ...)`** — used in step 2: returns RecipePlan with N accrual + N reversal journals (2N total), capsule shape, required accounts, vendor metadata.
- **`execute_recipe(name: 'accrued-expense', ...)`** — used in step 4: posts 2N future-dated DRAFT journals (one accrual at period-end, one reversal at next-period-start, repeated for `periods`) all attached to the same capsule.

### Calculator (cross-check, no API key needed)
- **`clio calc accrued-expense --amount <per-period> --periods <n> --start-date <YYYY-MM-DD> --currency <code> --json`** — used in step 1: independently produce the schedule. Returns `{ totalAccrued, schedule[n] }` where each row carries `accrualDate`, `reversalDate`, `accrualJournal`, `reversalJournal`.

### Tools (jaz-api / direct)
- **`search_journals(filter: {tag: <accrual.name>, valueDate: <prior-period>-end})`** — step 1 estimation: pull last period's posted accrual amount when `estimation_method: 'prior_month'`.
- **`search_journals(filter: {tag: <accrual.name>, valueDate: {between: [<-3 months>, <today>]}})`** — step 1 alt: trailing 3-month average when `estimation_method: 'trailing_3m_avg'`.
- **`search_contacts(filter: {name: {eq: <vendor>}})`** — step 3: resolve vendor (per `CLIENT.recurring_accruals[i].vendor`).
- **`search_accounts(filter: {name: {in: ['<expense GL>', '<accrued liability GL>']}})`** — step 3: confirm both sides of the journal exist in CoA.
- **`search_journals(filter: {capsuleResourceId: <id>, valueDate: {between: [<period-start>, <period-end>]}, status: 'DRAFT'})`** — step 5 monthly: find this period's pre-emitted DRAFT for finalization.
- **`bulk_finalize_drafts({kind: 'journal', resourceIds: [...]})`** — step 5: finalize this period's accrual + reversal pair.
- **`generate_trial_balance(period_end: <date>)`** — step 5 verification: confirm Accrued Expenses balance and net P&L impact.

### Cross-references
- Within an engagement: invoked from `practice/references/monthly-close.md` step 4 PER `CLIENT.recurring_accruals[]` row whose `last_posted < period_end`. Engagement playbook orchestrates the per-row loop and reads `estimation_method`, `gl_account`, `vendor`, `fixed_amount`, `budget_amount` from CLIENT.md.
- Sibling recipes: `prepaid-amortization.md` (mirror — paid upfront, recognized over time vs incurred over time, billed later); `employee-accruals.md` (the same engine for leave / 13th month bonuses, but with monthly-only, no reversal needed since those accumulate).
- IFRS / accounting context: matching principle (IFRS Conceptual Framework). The reversal pattern eliminates double-counting when the actual bill arrives.

---

## Step-by-step

### Step 1 — Compute the per-period amount

Per `CLIENT.recurring_accruals[i].estimation_method`:

- **`prior_month`**: pull last period's posted amount via `search_journals(filter: {tag: <accrual.name>, valueDate: <prior-period>-end})`. Use that amount.
- **`trailing_3m_avg`**: pull last 3 months' posted amounts and average.
- **`budget`**: read from `CLIENT.recurring_accruals[i].budget_amount`.
- **`fixed_amount`**: use `CLIENT.recurring_accruals[i].fixed_amount` directly.

Cross-check with the calculator:

```
clio calc accrued-expense --amount 3000 --periods 1 --start-date 2025-01-31 --currency SGD --json
```

Returns `{ totalAccrued: 3000, schedule: [{accrualDate: '2025-01-31', reversalDate: '2025-02-01', accrualJournal: {...}, reversalJournal: {...}}] }`. For a single-period accrual, `periods: 1`. For a multi-period rolling accrual (e.g. quarterly bill arriving in month 3), use `periods: 3`.

### Step 2 — Plan the recipe

```
plan_recipe(
  name: 'accrued-expense',
  amount: 3000,
  periods: 1,
  startDate: '2025-01-31',
  currency: 'SGD',
  glExpense: <CLIENT.recurring_accruals[i].gl_account>,
  glAccruedLiability: <CLIENT.coa_mapping['Accrued Expenses']>,
  vendor: 'PowerCo Singapore',
  capsuleType: 'Accrued Expenses',
  capsuleName: 'Electricity Accrual — Jan 2025'
)
```

For multi-period rolling: pass `periods: 3` (engine emits 3 accrual + 3 reversal pairs across the rolling window).

Returns: `RecipePlan` with `requiredAccounts: [<expense GL>, 'Accrued Expenses']`, `needsContact: false` (vendor metadata only — no AR/AP transaction in this recipe), `steps: [{action: 'journal', date: '2025-01-31', ...}, {action: 'journal', date: '2025-02-01', ...}]` (2 journals for `periods: 1`; 6 for `periods: 3`).

### Step 3 — Resolve dependencies

For both accounts in `requiredAccounts`:
- `search_accounts(filter: {name: {eq: <accountName>}})`. If empty: halt and surface "Accrual references GL account `<accountName>` not in `CLIENT.coa_mapping` / Jaz CoA. Create via `create_account` (suggested classifications: expense → `Operating Expense`; accrued liability → `Current Liability`) or remap CLIENT.md before retry."

Vendor: confirm via `search_contacts(filter: {name: {eq: <vendor>}})` for tagging on the journal narrative — but this recipe does NOT require a contact for posting (no AR/AP).

### Step 4 — Execute

```
execute_recipe(name: 'accrued-expense', ...same args..., accountMap: <resolved>)
```

Returns: `{ capsule: {resourceId, type, title}, steps: [{step, action, status, resourceId}, ...], summary: {total: 2N, created: 2N, ...} }`. The recipe creates **2N future-dated DRAFT journals** (for `periods: 1`, that's 2 journals: 1 accrual + 1 reversal). All attach to the same capsule.

Engine output journals:
- Step 1 (date `2025-01-31`): Dr `<expense GL>` 3000 / Cr Accrued Expenses 3000. DRAFT.
- Step 2 (date `2025-02-01`): Dr Accrued Expenses 3000 / Cr `<expense GL>` 3000. DRAFT — reverses step 1 in February.

### Step 5 — Monthly action (finalize)

For the current period (Jan 2025), the accrual journal exists in DRAFT in the capsule. Monthly close action:

```
search_journals(filter: {capsuleResourceId: <id>, valueDate: {between: ['2025-01-01', '2025-01-31']}, status: {eq: 'DRAFT'}})
bulk_finalize_drafts({kind: 'journal', resourceIds: [<accrual journal id>]})
```

The reversal journal (dated 2025-02-01) stays DRAFT until February's monthly-close. **Do NOT finalize both at once** — that defeats the period-matching purpose. February's close finalizes the reversal AND any new accrual for Feb if the bill still hasn't arrived (run `plan_recipe + execute_recipe` again for Feb's `period`).

Verify after January finalize:
- `generate_trial_balance(period_end: '2025-01-31')`.
- Assert: `balance['Accrued Expenses']` increased by 3000.
- Assert: `balance['<expense GL>']` (period MTD) increased by 3000.
- Net P&L impact for January: $3,000 expense.

After February finalize (with reversal + new Feb accrual posted):
- `balance['Accrued Expenses']` reflects only the Feb accrual (Jan's reversed cleanly).

When the actual quarterly bill arrives (typically Mar 31, $9,000 total): post a normal `create_bill(...)` for the full $9,000 against `<expense GL>`. The capsule may or may not include this bill — practitioner's call. The accrual capsule's net P&L impact is zero across the rolling window once all reversals post.

---

## Common error classes and recovery

| Source | Error | Recovery |
|--------|-------|----------|
| `plan_recipe` | 422 `unsupported_recipe` | File-name alias `accrued-expenses` was used. Use canonical engine name `accrued-expense` (singular). |
| `plan_recipe` | 422 `invalid_amount` | Amount is non-positive. Computed amount may have been a credit (e.g. `prior_month` returned a credit balance). Switch `estimation_method` to `fixed_amount` for this row this period, OR investigate the credit. |
| `execute_recipe` | 422 `account_not_found` | Step 3 resolution incomplete. `search_accounts`; create via `create_account` if the practitioner confirms classification. |
| `bulk_finalize_drafts` | 422 `journal_unbalanced` | Engine-emitted journals are always balanced. If you see this, the source schema changed — escalate (do not retry). |
| Verification | Net P&L impact stuck after reversal posts | Likely the reversal hasn't been finalized yet. `search_journals(filter: {capsuleResourceId: <id>, valueDate: <reversal-date>, status: 'DRAFT'})` — if non-empty, finalize. |
| Verification | Accrued Expenses balance nonzero after the actual bill posts AND all reversals run | Either the bill amount diverged from the accrual estimate (post a true-up journal: Dr/Cr `<expense GL>` for the difference) OR a reversal was missed. Audit via `generate_general_ledger(accountResourceId: 'Accrued Expenses', period_end: <today>)`. |
| Practitioner posts the actual bill against `Accrued Expenses` instead of `<expense GL>` | (process error) | If they do this, the reversal AND the bill both touch `Accrued Expenses` — net to zero on liability, but expense gets double-recognized. Reverse the bill, re-post against `<expense GL>`. Document in `ENGAGEMENT.risk_areas`. |

---

## Variations

- **Multi-period rolling accrual** (quarterly bill, monthly accrual): `periods: 3` with `frequency: 'monthly'`. Engine emits 3 accrual + 3 reversal pairs. Each month's monthly-close finalizes that month's pair.
- **One-shot accrual** (year-end true-up where you don't know the per-period split): `periods: 1`, `startDate: <FY-end>`. The reversal posts on FY-end+1 day. Practitioner posts the actual bill in the next FY when it arrives.
- **Quarterly cadence**: `frequency: 'quarterly', periods: 4` for an annual rolling accrual (rare for SMBs).
- **Different estimation per period**: not supported by a single `plan_recipe` call — engine assumes constant per-period amount. For variable amounts: invoke once per period with the new amount each time.
- **Vendor unknown** (estimating an accrual but supplier not yet identified): pass `vendor: null` or skip the field. Engine still posts; practitioner can update the journal narrative later via `update_journal`.

---

## Cross-references back to engagements

- `practice/references/monthly-close.md` step 4 — invoked PER `CLIENT.recurring_accruals[]` row whose `last_posted < period_end`. Practice playbook reads `estimation_method`, `gl_account`, `vendor`, `fixed_amount`, `budget_amount` per row.
- `practice/references/quarterly-gst.md` step 4 — same per-row loop, plus quarter-specific accruals (e.g. ECL top-up if AR aging shifted, employee bonus accruals if contractually due quarterly).
- `practice/references/annual-statutory.md` step 4a — full FY-end accrual sweep + employee bonus accrual + dividend declarations.
- `practice/references/onboarding.md` — opening balance load may include opening accrued liabilities; conversion handles those, this recipe runs forward only from the migration date.
