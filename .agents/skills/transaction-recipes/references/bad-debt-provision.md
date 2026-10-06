# Recipe: Bad Debt / ECL Provision (calculator type: `ecl`)

> One-shot recipe for IFRS 9 simplified-approach ECL on trade receivables. One journal: the top-up (or release) of the existing Allowance for Doubtful Debts to match the per-bucket × loss-rate calculation. Run quarterly or annually (most SMBs); not monthly. You calculate, create the capsule and post the journal yourself (see `building-blocks.md` § The three-step flow).

## Tools and calculator this recipe uses

### Calculator (offline, posts nothing)
- **MCP: `calculate(type: 'ecl', buckets, existingProvision, startDate, currency)`** (step 1). `buckets` is a list of `{ name, balance, rate }` with `rate` in percent; `startDate` is the provision date and dates the journal step.
- **CLI: `clio calc ecl --current <c> --30d <30> --60d <60> --90d <90> --120d <120> --rates <r1>,<r2>,<r3>,<r4>,<r5> --existing-provision <ep> --currency <code> --json`** (step 1): the same calculation over five fixed buckets. The CLI has no date flag, so its journal step is undated.

### Posting tools
- **`list_capsule_types` / `create_capsule_type(displayName: 'ECL Provision')` / `create_capsule(...)`** (step 3).
- **`create_journal(...)`** (step 4): the single ECL adjustment. ONE-SHOT: no schedule, no future-dated entries.

### Lookup and verification tools
- **`generate_aged_receivables(endDate: <date>)`** (step 1 input): AR aged into the buckets the calculator expects.
- **`search_accounts(filter: {name: {in: ['Allowance for Doubtful Debts', 'Bad Debt Expense']}})`**: step 2.
- **`generate_trial_balance(endDate: <date>)`** (step 1 input): pull `existingProvision` from the current `Allowance for Doubtful Debts` balance; step 5 verify the post-journal balance matches the calculated ECL.
- **`search_capsules(filter: {title: {eq: <capsule title>}})`**: step 0 idempotency check (one ECL capsule per period; quarterly = 4 per FY).
- **`apply_credits_to_invoice(...)` / `create_customer_credit_note(...)`** (step 6, specific write-off pattern): when individual invoices are deemed unrecoverable, write them off via credit note OR direct payment with `paymentMethod: 'DEBT_WRITE_OFF'`.

### Cross-references
- Operational context: invoked during year-end close (Y4 in `year-end-close.md`) for FY-end ECL; during the GST/VAT filing cycle if quarterly cadence is set; rarely during month-end close (mental check during variance review only).
- Sibling: `provisions.md` (calculator `provision`): IAS 37 provisions with PV unwinding pattern, more complex than this recipe.
- IFRS / accounting context: IFRS 9.5.5.15 (simplified approach mandatory for trade receivables); IFRS 9.B5.5.35 (provision matrix). For specific large customers in stage-3 (objective evidence of impairment): supplement this recipe with specific impairment via `create_customer_credit_note` per customer.

---

## Step-by-step

### Step 0: Idempotency check

```
search_capsules(filter: {title: {eq: 'FY2025 Year-End ECL True-Up'}})
```

If a result returns: halt. ECL is one-shot per period; duplicate would double-recognize.

### Step 1: Pull AR aging + existing provision, then calculate

```
generate_aged_receivables(endDate: '2025-12-31')
```

Returns aging buckets. Map to calculator inputs:
- `current` (not yet overdue)
- `30d` (1-30 days overdue)
- `60d` (31-60 days overdue)
- `90d` (61-90 days overdue)
- `120d` (91+ days overdue)

```
generate_trial_balance(endDate: '2025-12-31')
```

Pull `balance['Allowance for Doubtful Debts']` (sign-flipped; it's a contra-asset, naturally credit balance). This is `existingProvision`.

```
calculate(
  type: 'ecl',
  buckets: [
    {name: 'Current', balance: 100000, rate: 0.5},
    {name: '1-30 days', balance: 50000, rate: 2},
    {name: '31-60 days', balance: 20000, rate: 5},
    {name: '61-90 days', balance: 10000, rate: 10},
    {name: '91+ days', balance: 5000, rate: 50}
  ],
  existingProvision: 5000,
  currency: 'SGD',
  startDate: '2025-12-31'  // provision date: the aged AR report date. The ECL journal step is dated on it.
)
```

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

Returns `{ totalReceivables: 185000, totalEcl: 6000, weightedRate: 3.2432, adjustmentRequired: 1000, isIncrease: true, bucketDetails: [{ bucket: 'Current', balance: 100000, lossRate: 0.5, ecl: 500 }, ...], journal, blueprint }`. The bucket ECLs are 500 + 1,000 + 1,000 + 1,000 + 2,500 = 6,000; against the existing 5,000 a top-up of $1,000 is needed.

Rates are PERCENT: `0.5,2,5,10,50` means 0.5%, 2%, 5%, 10%, 50% (NOT 50%, 200%, 500%...). Tune them to the entity's historical loss rate. Common starting point for SMBs: `0.5,2,5,10,50` for the 5 buckets. Auditor will sample-test the rates against actual historical losses; keep documentation of how rates were derived.

`blueprint.steps` (single `journal`): Dr Bad Debt Expense 1,000 / Cr Allowance for Doubtful Debts 1,000.

If `adjustmentRequired` is negative (calculated ECL < existing provision; `isIncrease: false`): the journal direction reverses (Dr Allowance for Doubtful Debts / Cr Bad Debt Expense for the release).

If `adjustmentRequired` is 0 there is nothing to post: `blueprint.steps` is empty. Stop here and record that the provision was reviewed and unchanged.

If the adjustment is below the entity's materiality threshold: skip the posting entirely; document the decision in your working notes ("ECL change immaterial: $X below threshold $Y").

### Step 2: Resolve accounts

The blueprint's `Bad Debt Expense` and `Allowance for Doubtful Debts` are labels. Map each to the real account:
- `search_accounts(filter: {name: {in: ['Allowance for Doubtful Debts', 'Bad Debt Expense']}})`. Suggested classifications: `Allowance for Doubtful Debts` → `Current Asset` (contra-AR; sometimes set up as separate account, sometimes as a sub-account of `Accounts Receivable`); `Bad Debt Expense` → `Operating Expense`.

If `Allowance for Doubtful Debts` doesn't exist in the CoA: `create_account(name: 'Allowance for Doubtful Debts', code: <unused account code>, accountType: 'Current Asset')` first. Common gap in CoAs that haven't run formal ECL.

No contact and no bank account are involved.

### Step 3: Create the capsule

```
list_capsule_types()
create_capsule(
  capsuleTypeResourceId: <id of 'ECL Provision'>,
  title: 'FY2025 Year-End ECL True-Up',
  description: <blueprint.capsuleDescription>
)
```

If `ECL Provision` is not in the list: `create_capsule_type(displayName: 'ECL Provision')` first.

### Step 4: Post the journal

Date it on the aged AR report date:

```
create_journal(
  valueDate: '2025-12-31',
  reference: 'ECL-FY2025',
  journalEntries: [
    { accountResourceId: <Bad Debt Expense>, type: 'DEBIT', amount: 1000, description: 'ECL provision increase, IFRS 9 simplified approach' },
    { accountResourceId: <Allowance for Doubtful Debts>, type: 'CREDIT', amount: 1000, description: 'ECL provision increase, IFRS 9 simplified approach' }
  ],
  saveAsDraft: true,
  capsuleResourceId: <capsule id>
)
```

The journal is a DRAFT; finalize via `update_journal(resourceId: <id>, saveAsDraft: false)` once the practitioner confirms the inputs.

### Step 5: Verify

```
generate_trial_balance(endDate: '2025-12-31')
```

Assert:
- `balance['Allowance for Doubtful Debts'] == -totalEcl` (within 1 cent). Updated to match the new computed ECL.
- `balance['Bad Debt Expense'] (period MTD) increased by adjustmentRequired` (or reduced if it is a release).
- `(balance['Accounts Receivable'] - |balance['Allowance for Doubtful Debts']|)` is the net receivables presented on the balance sheet (BS line: `Trade Receivables, net`).

### Step 6: Specific impairment (stage 3, separate from this recipe)

For individual customers with objective evidence of impairment (insolvency filed, repeated dishonor, formal dispute): supplement the simplified-approach ECL with a SPECIFIC write-off:

**Path A: credit note** (cleaner):
```
create_customer_credit_note(
  contactResourceId: <customer>,
  valueDate: '2025-12-31',
  reference: 'WRITE-OFF-<customer>-<inv-ref>',
  lineItems: [{
    name: 'Write-off: uncollectible',
    accountResourceId: <Bad Debt Expense GL>,
    quantity: 1,
    unitPrice: <invoice balance>
  }],
  saveAsDraft: false
)
apply_credits_to_invoice(resourceId: <inv>, credits: [{creditNoteResourceId: <cn>, amountApplied: <balance>}])
```

**Path B: direct write-off** (simpler):
```
pay_invoice(
  resourceId: <inv>,
  paymentAmount: <balance>,
  transactionAmount: <balance>,
  accountResourceId: <Bad Debt Expense GL>,
  paymentMethod: 'DEBT_WRITE_OFF',
  reference: 'WRITE-OFF-<inv-ref>',
  valueDate: '2025-12-31'
)
```

Use the appropriate jurisdiction-specific account if your CoA distinguishes write-offs from generic bad debt expense.

Write-offs reduce both the gross AR balance AND offset against the existing Allowance (since the customer is now provisioned for). Re-run step 1 `generate_aged_receivables` afterwards; the written-off customer should no longer appear, and the corresponding portion of the Allowance should reduce.

---

## Common problems and recovery

| Where | Problem | Recovery |
|--------|-------|----------|
| Calculator | "... balance must be zero or positive" / "... loss rate must be zero or positive" | A bucket balance or rate is negative. A credit balance in an aging bucket is an unapplied receipt or credit note: resolve it in AR first, do not net it into the ECL. |
| Calculator | ECL far larger than expected | Rates were passed as percentages of 100 by mistake, or as decimals where percent is expected. `2` is 2%; `0.02` is 0.02%. |
| Step 2 | `Allowance for Doubtful Debts` is missing | Most-commonly-missing account. Create via `create_account(name: 'Allowance for Doubtful Debts', code: <unused account code>, accountType: 'Current Asset')`. |
| Verification | TB Allowance ≠ calculated ECL after journal posts | Investigate: likely an interim period posted its own ECL adjustment after `existingProvision` was read (cumulative). Audit via `generate_general_ledger(accountResourceIds: [<Allowance>], startDate: <FY-start>, endDate: <today>)`. |
| Specific write-off changes ECL inputs | (process) | After Path A or Path B write-off, re-run step 1 `generate_aged_receivables` and recalculate with updated buckets; the calculated ECL likely reduces because the worst customer is now off the books. |

---

## Variations

- **Quarterly cadence**: same recipe, run quarterly with the journal dated `<quarter-end>`. The review cadence (`monthly` | `quarterly` | `annual`) depends on the entity's policy. Most SMBs run annual (FY-end only) or quarterly.
- **Specific high-risk customer with stage-3 impairment**: combine simplified-approach ECL recipe (collective) + Path A or B specific write-off (individual). Run the collective AFTER the specific write-offs so the buckets reflect post-write-off balances.
- **Multi-currency AR**: ECL is per-currency. Run the recipe per currency (each with its own `Allowance for Doubtful Debts (<currency>)` if you want segregation, or aggregate into one base-currency Allowance). Jaz auto-handles FX revaluation of the AR + Allowance balances per IAS 21.23 (do NOT post an `fx-reval` result).
- **Forward-looking macroeconomic adjustments** (IFRS 9 paragraphs B5.5.51-54): apply a multiplier to the `--rates` to reflect current/expected economic conditions. E.g., recession overlay: `--rates 1.0,3,7,15,60` instead of `0.5,2,5,10,50`. Document the rationale in your working notes.
- **POCI assets** (purchased or originated credit-impaired): NOT supported by this simplified-approach recipe. Use stage-3 specific impairment via Path A/B for each.

---

## Cross-references

- Year-end close (Y4): year-end ECL true-up against the bucket rates and the materiality threshold for the skip-or-post decision.
- GST/VAT filing cycle (where applicable): quarterly ECL review for entities on a quarterly cadence.
- Month-end close: mental ECL cross-check during variance analysis only; formal recipe runs annually/quarterly.
- `audit-prep.md` step 8: supporting schedule via the most recent `ECL Provision` capsule + the underlying `clio calc ecl` JSON. Auditor tests rate appropriateness against actual historical loss data.
- Sibling `provisions.md` (calculator `provision`): IAS 37 provisions with PV unwinding (more complex pattern).
