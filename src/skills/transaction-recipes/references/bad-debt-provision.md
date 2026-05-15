# Recipe: Bad Debt / ECL Provision (engine name: `ecl`)

> One-shot recipe for IFRS 9 simplified-approach ECL on trade receivables. Engine emits 1 journal — top-up (or reversal) of the existing Allowance for Doubtful Debts to match the per-bucket × loss-rate calculation. Run quarterly or annually (most SMBs); not monthly.

## Tools, recipes, calculators this recipe uses

### Recipe engine entry point
- **`plan_recipe(name: 'ecl', ...)`** — used in step 2: returns RecipePlan with one journal: top-up amount (Dr Bad Debt Expense / Cr Allowance for Doubtful Debts) for the delta between calculated ECL and existing provision. If existing > calculated: reversal direction.
- **`execute_recipe(name: 'ecl', ...)`** — used in step 4: posts the single ECL journal. ONE-SHOT — no schedule, no future-dated entries.

### Calculator (cross-check, no API key needed)
- **`clio calc ecl --current <c> --30d <30> --60d <60> --90d <90> --120d <120> --rates <r1>,<r2>,<r3>,<r4>,<r5> --existing-provision <ep> --currency <code> --json`** — used in step 1: applies per-bucket loss rates to receivables aged into 5 buckets. Returns `{ totalReceivables, calculatedEcl, existingProvision, topUpRequired, perBucket: [{bucket, balance, lossRate, ecl}, ...] }`. Top-up positive = increase provision; negative = release / reverse.

### Tools (jaz-api / direct)
- **`generate_aged_ar(period_end: <date>)`** — step 1 input: pull AR aged into the same 5 buckets the calculator expects (current, 30d, 60d, 90d, 120d+).
- **`search_accounts(filter: {name: {in: ['Allowance for Doubtful Debts', 'Bad Debt Expense']}})`** — step 3.
- **`generate_trial_balance(period_end: <date>)`** — step 1 input: pull `existingProvision` from current `Allowance for Doubtful Debts` balance; step 5 verify post-journal balance matches calculated ECL.
- **`search_capsules(filter: {capsuleType: {eq: 'ECL Provision'}, name: {eq: <capsule.name>}})`** — step 0 idempotency check (one ECL capsule per period; quarterly = 4 per FY).
- **`apply_credit_to_invoice(...)` / `create_customer_credit_note(...)`** — step 6 specific write-off pattern: when individual invoices are deemed unrecoverable, write them off via credit note OR direct payment with `paymentMethod: 'DEBT_WRITE_OFF'` (per memory rule).

### Cross-references
- Within an engagement: invoked from `practice/references/annual-statutory.md` step 4d (Y4 in `year-end-close.md`) for FY-end ECL; from `practice/references/quarterly-gst.md` step Q if quarterly cadence is set; rarely from monthly-close (mental check only).
- Sibling: `provisions.md` (engine `provision`) — IAS 37 provisions with PV unwinding pattern, more complex than this recipe.
- IFRS / accounting context: IFRS 9.5.5.15 (simplified approach mandatory for trade receivables); IFRS 9.B5.5.35 (provision matrix). For specific large customers in stage-3 (objective evidence of impairment): supplement this recipe with specific impairment via `create_customer_credit_note` per customer.

---

## Step-by-step

### Step 0 — Idempotency check

```
search_capsules(filter: {capsuleType: {eq: 'ECL Provision'}, name: {eq: 'FY2025 Year-End ECL True-Up'}})
```

If a result returns: halt. ECL is one-shot per period; duplicate would double-recognize.

### Step 1 — Pull AR aging + existing provision

```
generate_aged_ar(period_end: '2025-12-31')
```

Returns aging buckets. Map to calculator inputs:
- `current` (0-30d, not yet due or just due)
- `30d` (31-60d)
- `60d` (61-90d)
- `90d` (91-120d)
- `120d+` (over 120d)

```
generate_trial_balance(period_end: '2025-12-31')
```

Pull `balance['Allowance for Doubtful Debts']` (sign-flipped — it's a contra-asset, naturally credit balance). This is `existingProvision`.

```
clio calc ecl \
  --current 100000 \
  --30d 50000 \
  --60d 20000 \
  --90d 10000 \
  --120d 5000 \
  --rates 0.5,2,5,10,50 \
  --existing-provision 5000 \
  --currency SGD \
  --json
```

Returns: `{ totalReceivables: 185000, calculatedEcl: 5750, existingProvision: 5000, topUpRequired: 750, perBucket: [{bucket: 'current', balance: 100000, lossRate: 0.005, ecl: 500}, ...] }`. Top-up of $750 needed.

`--rates` defaults: tune to client historical loss rate (per `CLIENT.ecl_loss_rate_matrix`). Common starting point for SMBs: `0.5,2,5,10,50` (%) for the 5 buckets. Auditor will sample-test the rates against actual historical losses — keep documentation of how rates were derived.

If `topUpRequired` is below `CLIENT.materiality_threshold`: skip the recipe entirely; document in `ENGAGEMENT.md` ("ECL change immaterial: $X below threshold $Y").

### Step 2 — Plan the recipe

```
plan_recipe(
  name: 'ecl',
  receivables: [
    {bucket: 'current', balance: 100000, lossRate: 0.005},
    {bucket: '30d', balance: 50000, lossRate: 0.02},
    {bucket: '60d', balance: 20000, lossRate: 0.05},
    {bucket: '90d', balance: 10000, lossRate: 0.10},
    {bucket: '120d+', balance: 5000, lossRate: 0.50}
  ],
  existingProvision: 5000,
  currency: 'SGD',
  glAllowance: <CLIENT.coa_mapping['Allowance for Doubtful Debts']>,
  glBadDebtExpense: <CLIENT.coa_mapping['Bad Debt Expense']>,
  valueDate: '2025-12-31',
  capsuleType: 'ECL Provision',
  capsuleName: 'FY2025 Year-End ECL True-Up'
)
```

Returns `RecipePlan` with `requiredAccounts: ['Allowance for Doubtful Debts', 'Bad Debt Expense']`, `needsContact: false`, `needsBankAccount: false`, `steps[1]` (single journal): Dr Bad Debt Expense 750 / Cr Allowance for Doubtful Debts 750.

If `topUpRequired` is negative (calculated ECL < existing provision): the journal direction reverses — Dr Allowance for Doubtful Debts / Cr Bad Debt Expense for the release.

### Step 3 — Resolve dependencies

For each account in `requiredAccounts`:
- `search_accounts(filter: {name: {eq: <accountName>}})`. Suggested classifications: `Allowance for Doubtful Debts` → `Current Asset` (contra-AR; sometimes set up as separate account, sometimes as a sub-account of `Accounts Receivable`); `Bad Debt Expense` → `Operating Expense`.

If `Allowance for Doubtful Debts` doesn't exist in the CoA: `create_account(name: 'Allowance for Doubtful Debts', accountType: 'Current Asset')` first. Common gap in CoAs that haven't run formal ECL.

### Step 4 — Execute

```
execute_recipe(name: 'ecl', ...same args..., accountMap: <resolved>)
```

Returns: `{ capsule: {resourceId, type, title}, steps: [{step: 1, action: 'journal', status: 'created', resourceId: <journal id>}], summary: {total: 1, created: 1} }`. The single journal is DRAFT — finalize via `bulk_finalize_drafts({kind: 'journal', resourceIds: [<id>]})` once the practitioner confirms the inputs.

### Step 5 — Verify

```
generate_trial_balance(period_end: '2025-12-31')
```

Assert:
- `balance['Allowance for Doubtful Debts'] == -calculatedEcl` (within 1 cent). Updated to match the new computed ECL.
- `balance['Bad Debt Expense'] (period MTD) increased by topUpRequired` (or reduced if reversal direction).
- `(balance['Accounts Receivable'] - |balance['Allowance for Doubtful Debts']|)` is the net receivables presented on the balance sheet (BS line: `Trade Receivables, net`).

### Step 6 — Specific impairment (stage 3, separate from this recipe)

For individual customers with objective evidence of impairment (insolvency filed, repeated dishonor, formal dispute): supplement the simplified-approach ECL with a SPECIFIC write-off:

**Path A — credit note** (cleaner):
```
create_customer_credit_note(
  contactResourceId: <customer>,
  valueDate: '2025-12-31',
  reference: 'WRITE-OFF-<customer>-<inv-ref>',
  lineItems: [{
    name: 'Write-off — uncollectible',
    accountResourceId: <Bad Debt Expense GL>,
    amount: <invoice balance>,
    saveAsDraft: false
  }]
)
apply_credit_to_invoice(invoiceResourceId: <inv>, creditNoteResourceId: <cn>, amount: <balance>)
```

**Path B — direct write-off** (simpler):
```
create_invoice_payment(
  invoiceResourceId: <inv>,
  payments: [{
    paymentAmount: <balance>,
    transactionAmount: <balance>,
    accountResourceId: <Bad Debt Expense GL>,
    paymentMethod: 'DEBT_WRITE_OFF',
    reference: 'WRITE-OFF-<inv-ref>',
    valueDate: '2025-12-31'
  }]
)
```

Per memory rule [PH IBO VAT proforma rule] and [Bank FX is Revaluation, not Realized]: use the appropriate jurisdiction-specific account if your CoA distinguishes write-offs from generic bad debt expense.

Write-offs reduce both the gross AR balance AND offset against the existing Allowance (since the customer is now provisioned for). Re-run step 1 `generate_aged_ar` afterwards — the written-off customer should no longer appear, and the corresponding portion of the Allowance should reduce.

---

## Common error classes and recovery

| Source | Error | Recovery |
|--------|-------|----------|
| `plan_recipe` | 422 `unsupported_recipe` | File-name alias `bad-debt-provision` was used. Use canonical engine name `ecl`. |
| `plan_recipe` | 422 `bucket_count_invalid` | Engine expects exactly 5 buckets: current, 30d, 60d, 90d, 120d+. Adjust input. |
| `plan_recipe` | 422 `loss_rate_invalid` | Each rate must be 0-1 (decimal) OR 0-100 (percent). Engine accepts both — verify your --rates 0.5,2,5,10,50 means 0.5%, 2%, 5%, 10%, 50% (NOT 50%, 200%, 500%...). |
| `execute_recipe` | 422 `account_not_found` for `Allowance for Doubtful Debts` | Step 3 incomplete. Most-commonly-missing account. Create via `create_account(accountType: 'Current Asset')`. |
| Verification | TB Allowance ≠ calculated ECL after journal posts | Investigate — likely an interim period had its own ECL recipe that wasn't reversed (cumulative). Audit via `generate_general_ledger(accountResourceId: <Allowance>, period_end: <today>)`. |
| Specific write-off changes ECL inputs | (process) | After Path A or Path B write-off, re-run step 1 `generate_aged_ar` and re-execute the ECL recipe with updated buckets — the calculated ECL likely reduces because the worst customer is now off the books. |

---

## Variations

- **Quarterly cadence**: same recipe, run quarterly with `valueDate: <quarter-end>`. Practice playbook controls the cadence per `CLIENT.ecl_review_frequency` (`monthly` | `quarterly` | `annual`). Most SMBs run annual (FY-end only) or quarterly.
- **Specific high-risk customer with stage-3 impairment**: combine simplified-approach ECL recipe (collective) + Path A or B specific write-off (individual). Run the collective AFTER the specific write-offs so the buckets reflect post-write-off balances.
- **Multi-currency AR**: ECL is per-currency. Run the recipe per currency (each with its own `Allowance for Doubtful Debts — <currency>` if you want segregation, or aggregate into one base-currency Allowance). Jaz auto-handles FX revaluation of the AR + Allowance balances per IAS 21.23 (do NOT invoke `fx-reval`).
- **Forward-looking macroeconomic adjustments** (IFRS 9 paragraphs B5.5.51-54): apply a multiplier to the `--rates` to reflect current/expected economic conditions. E.g., recession overlay: `--rates 1.0,3,7,15,60` instead of `0.5,2,5,10,50`. Document the rationale in `ENGAGEMENT.md`.
- **POCI assets** (purchased or originated credit-impaired): NOT supported by this simplified-approach recipe. Use stage-3 specific impairment via Path A/B for each.

---

## Cross-references back to engagements

- `practice/references/annual-statutory.md` step 4d (Y4) — year-end ECL true-up. Practice playbook reads `CLIENT.ecl_loss_rate_matrix` for the bucket rates and `CLIENT.materiality_threshold` for skip-or-post decision.
- `practice/references/quarterly-gst.md` step Q (where applicable) — quarterly ECL review for clients on quarterly cadence.
- `practice/references/monthly-close.md` step 13 — mental ECL check only; formal recipe runs annually/quarterly.
- `audit-prep.md` step 8 — supporting schedule via the most recent `ECL Provision` capsule + the underlying `clio calc ecl` JSON. Auditor tests rate appropriateness against actual historical loss data.
- Sibling `provisions.md` (engine `provision`) — IAS 37 provisions with PV unwinding (more complex pattern).
