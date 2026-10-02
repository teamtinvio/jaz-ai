# Recipe: IFRS 16 Lease (calculator type: `lease`)

> Canonical recipe for leases (office, equipment, vehicles) under IFRS 16. An initial recognition journal (Dr ROU Asset / Cr Lease Liability at present value), the ROU asset registered in the Jaz fixed-asset register, and N liability-unwinding journals. ROU depreciation runs through the Jaz native FA register (straight-line, auto-posted by Jaz). You calculate, create the capsule and post each entry yourself (see `building-blocks.md` § The three-step flow).

## Tools and calculator this recipe uses

### Calculator (offline, posts nothing)
- **MCP: `calculate(type: 'lease', monthlyPayment, termMonths, annualRate, startDate, currency)`** (step 1).
- **CLI: `clio calc lease --payment <monthly> --term <months> --rate <annual %> --start-date <YYYY-MM-DD> --currency <code> --json`** (step 1): the same result.

### Posting tools
- **`list_capsule_types` / `create_capsule_type(displayName: 'Lease Accounting')` / `create_capsule(...)`** (step 3).
- **`create_journal(...)`** (step 4): the initial recognition, then one per lease payment. The interest portion changes every month, so a fixed-amount schedule does not fit.
- **`create_fixed_asset(...)`** (step 4): register the ROU asset in Jaz native FA. `purchaseAmount` = PV from the calculator, `effectiveLife` = lease term in months, `depreciationMethod` = 'STRAIGHT_LINE', `depreciationStartDate` = lease start. Jaz auto-posts monthly depreciation thereafter.

### Lookup and verification tools
- **`search_capsules(filter: {title: {eq: <capsule title>}})`**: step 0 idempotency check.
- **`search_accounts(filter: {name: {in: ['Right-of-Use Asset', 'Lease Liability', 'Interest Expense — Leases']}})`**: step 2.
- **`search_contacts(filter: {supplier: true, name: {eq: <lessor>}})`**: step 2 (lease counterparty).
- **`list_bank_accounts()`**: step 2 (the account the lease payments leave from).
- **`generate_trial_balance(endDate: <date>)`**: step 5 verify.
- **`generate_fa_summary(primarySnapshotStartDate: <period-start>, primarySnapshotEndDate: <period-end>, groupBy: 'CATEGORY')`**: step 5 verify Jaz auto-posted ROU depreciation.

### Cross-references
- Operational context: invoked during month-end close (post or finalize this period's unwinding journal + verify Jaz FA posted ROU depreciation) and at `jobs/references/year-end-close.md` Y6 (current/non-current reclassification of the next 12 months' principal portion).
- Sibling recipes: `bank-loan.md` (similar amortization pattern but no FA dimension); `hire-purchase.md` (same calculator with a useful life longer than the term).
- IFRS / accounting context: IFRS 16 paragraphs 22-25 (recognition), 36 (subsequent measurement), 47 (lease liability re-measurement).

---

## Step-by-step

### Step 0: Idempotency check

```
search_capsules(filter: {title: {eq: 'Office Lease, Marina One, 36 months'}})
```

If a result returns: halt and surface "Lease capsule `<name>` already exists. Re-posting would create a duplicate ROU + Lease Liability. Confirm intent: if modifying lease terms (rent revision, term extension), use the IFRS 16 lease re-measurement pattern (manual journal); do NOT post the recognition again."

### Step 1: Calculate

```
calculate(
  type: 'lease',
  monthlyPayment: 5000,
  termMonths: 36,
  annualRate: 5,
  startDate: '2025-01-01',
  currency: 'SGD'
)
```

```
clio calc lease --payment 5000 --term 36 --rate 5 --start-date 2025-01-01 --currency SGD --json
```

Returns `{ presentValue: 166828.51, monthlyRouDepreciation: 4634.13, depreciationMonths: 36, isHirePurchase: false, totalCashPayments: 179999.99, totalInterest: 13171.48, totalDepreciation: 166828.51, initialJournal, schedule: [{ period, date, openingBalance, payment, interest, principal, closingBalance, journal }, ...36], blueprint }`. Save it to `workpapers/<period>/lease-amortization.json` for the workpaper record.

`blueprint.steps` (38):
- Step 1, `journal`, dated `2025-01-01`: initial recognition, Dr Right-of-Use Asset 166,828.51 / Cr Lease Liability 166,828.51. NOT a cash-out; the first payment happens at the end of period 1.
- Step 2, `fixed-asset`, dated `2025-01-01`: an instruction, with no lines. Register the ROU asset: cost 166,828.51, salvage 0, life 36 months, straight-line. Jaz then auto-posts monthly depreciation of 4,634.13.
- Steps 3 to 38, `journal`, dated `2025-02-01` through `2028-01-01`: Dr Lease Liability (principal portion), Dr Interest Expense — Leases (interest portion), Cr Cash / Bank Account 5,000 (the lease payment). Month 1 is 4,304.88 principal + 695.12 interest.

The CLI's printed table also shows the monthly ROU depreciation entry (Dr Depreciation Expense — ROU / Cr Accumulated Depreciation — ROU). Do not post it: the fixed-asset register posts depreciation once the asset is registered.

### Step 2: Resolve accounts, lessor and bank account

The blueprint's account names are labels. Map each to the real account:
- `search_accounts(filter: {name: {in: ['Right-of-Use Asset', 'Lease Liability', 'Interest Expense — Leases']}})`. Suggested classifications: `Right-of-Use Asset` → `Non-current Asset`; `Lease Liability` → `Non-current Liability`; `Interest Expense — Leases` → `Operating Expense`. Also resolve the depreciation expense and accumulated depreciation accounts the fixed-asset registration needs.

Lessor:
- `search_contacts(filter: {supplier: true, name: {eq: 'Marina One Holdings'}})`. If empty: `create_contact(supplier: true, ...)`.

Bank account:
- `list_bank_accounts()` for the account the lease payments leave from.

### Step 3: Create the capsule

```
list_capsule_types()
create_capsule(
  capsuleTypeResourceId: <id of 'Lease Accounting'>,
  title: 'Office Lease, Marina One, 36 months',
  description: <blueprint.capsuleDescription>
)
```

If `Lease Accounting` is not in the list: `create_capsule_type(displayName: 'Lease Accounting')` first.

### Step 4: Post the entries

**4a. Initial recognition** (blueprint step 1). Post it ACTIVE: the fixed asset in 4b links to one of its lines.

```
create_journal(
  valueDate: '2025-01-01',
  reference: 'LEASE-MARINA-RECOG',
  journalEntries: [
    { accountResourceId: <Right-of-Use Asset>, type: 'DEBIT', amount: 166828.51, description: 'Initial recognition, IFRS 16 lease' },
    { accountResourceId: <Lease Liability>, type: 'CREDIT', amount: 166828.51, description: 'Initial recognition, IFRS 16 lease' }
  ],
  saveAsDraft: false,
  capsuleResourceId: <capsule id>
)
```

**4b. Register the ROU asset** (blueprint step 2). Read the journal back with `get_journal(resourceId: <id>)` and take the resourceId of its ROU debit LINE (not the journal's own id):

```
create_fixed_asset(
  name: 'Right-of-Use Asset, Marina One Office (FY2025)',
  purchaseAmount: 166828.51,
  purchaseDate: '2025-01-01',
  purchaseAssetAccountResourceId: <Right-of-Use Asset GL>,
  depreciationStartDate: '2025-01-01',
  depreciationMethod: 'STRAIGHT_LINE',
  effectiveLife: 36,                     // months
  depreciationExpenseAccountResourceId: <Depreciation Expense GL>,
  accumulatedDepreciationAccountResourceId: <Accumulated Depreciation GL>,
  purchaseBusinessTransactionType: 'JOURNAL_MANUAL',
  purchaseBusinessTransactionResourceId: <initial-recognition journal's ROU LINE id>,
  capsuleResourceId: <capsule id>,
  saveAsDraft: false
)
```

Once registered in FA, **Jaz auto-posts monthly straight-line ROU depreciation** ($166,828.51 / 36 = $4,634.13 per month) for 36 months. Practitioner does NOT post depreciation manually.

**4c. Lease payments** (blueprint steps 3 to 38). One `create_journal` per step, using that step's amounts:

```
create_journal(
  valueDate: '2025-02-01',
  reference: 'LEASE-MARINA-01',
  journalEntries: [
    { accountResourceId: <Lease Liability>, type: 'DEBIT', amount: 4304.88, description: 'Lease payment, month 1 of 36' },
    { accountResourceId: <Interest Expense — Leases>, type: 'DEBIT', amount: 695.12, description: 'Lease payment, month 1 of 36' },
    { accountResourceId: <bank account>, type: 'CREDIT', amount: 5000, description: 'Lease payment, month 1 of 36' }
  ],
  saveAsDraft: true,
  capsuleResourceId: <capsule id>
)
```

Post each month's journal at that month's close, or post all 36 now as drafts and finalize one per month. Agree the cadence with the practitioner; the reference pattern (`LEASE-MARINA-01` to `-36`) is what finds a month's journal later.

### Step 5: Monthly action (during monthly-close)

**5a. Post or finalize this period's payment journal:**

```
search_journals(filter: {reference: {eq: 'LEASE-MARINA-03'}})
update_journal(resourceId: <journal id>, saveAsDraft: false)
```

This posts the cash payment + interest split per the amortization schedule. Journals cannot be filtered by capsule, and a date-plus-status search returns every matching DRAFT in the org: never feed one into `bulk_update_journals` or `delete_journal`.

**5b. Verify Jaz auto-posted ROU depreciation:**

```
get_fixed_asset(resourceId: <ROU asset id>)
```

`netBookValueAmount` should have fallen by this month's $4,634.13. If it has not, the asset is probably still a DRAFT (`status: 'DRAFT'`): `update_fixed_asset(resourceId: <id>, isDraftToActive: true)` first, then re-check.

**5c. Verify TB:**
- `generate_trial_balance(endDate: <month-end>)`.
- Assert: `balance['Lease Liability'] == -schedule[periodIndex].closingBalance` (within 1 cent).
- Assert: `balance['Interest Expense — Leases'] (period MTD) == schedule[periodIndex].interest`.
- Assert: `balance['Right-of-Use Asset'] - balance['Accumulated Depreciation — ROU'] == 166828.51 - (4634.13 × monthsElapsed)`.

After the FINAL period (month 36):
- Assert: `balance['Lease Liability'] == 0` exactly.
- Assert: `balance['Right-of-Use Asset']` net of accumulated depreciation `== 0`.
- Close capsule via a manual `update_capsule(resourceId: <id>, title: '<original> [CLOSED]')` (the API has no `status` field for capsules; closure is informational only). Decommission FA via `discard_fixed_asset(resourceId, disposalDate, depreciationEndDate)` (the right to use the asset ends with the lease).

---

## Common problems and recovery

| Where | Problem | Recovery |
|--------|-------|----------|
| Calculator | "Term (months) must be a positive integer" / "Monthly payment must be a positive number" | Fix the input. Short-term lease exemption (IFRS 16.5): for ≤12 months, expense as incurred via `create_bill` per period; do NOT capitalize. Skip this recipe. |
| `create_fixed_asset` | Rejected because the purchase line does not exist or is already linked | `purchaseBusinessTransactionResourceId` must be the ROU LINE of the initial-recognition journal, not the journal's id, and that line must not already back another fixed asset. |
| `create_fixed_asset` | Registered cost differs from the lease liability | `purchaseAmount` must equal the calculator's `presentValue`. If they diverge, the calculator was re-run with different inputs; recalculate and correct. |
| `create_fixed_asset` | No depreciation is posting | `effectiveLife` (months), the depreciation start date and both depreciation accounts are needed for straight-line; otherwise Jaz can't auto-depreciate. |
| Jaz auto-depreciation not running | (verification fail in 5b) | FA may still be DRAFT. `update_fixed_asset(resourceId: <id>, isDraftToActive: true)`. Or the depreciation start date is wrong; verify the asset's `depreciationStartDate` matches the lease `startDate`. |
| Lease re-measurement (rent revision) | (process) | NOT supported by this recipe. Manual journal pattern: revalue Lease Liability at new PV, offset Dr/Cr Right-of-Use Asset for the same delta (per IFRS 16.39-46). Do NOT post the recognition again; it would duplicate the entire amortization. |
| Lease termination (early exit) | (process) | Manual journal pattern: derecognize remaining ROU + Lease Liability balances; post any termination penalty as P&L. Delete the remaining DRAFT payment journals. Decommission FA via `discard_fixed_asset(resourceId, disposalDate, depreciationEndDate)`. |

---

## Variations

- **Hire purchase** (useful life longer than the financing term): same calculator with `usefulLifeMonths: <asset's life>` (CLI `--useful-life`) alongside `termMonths: <financing term>`. ROU depreciates over useful life, liability unwinds over financing term. See `hire-purchase.md`.
- **Variable rent** (CPI-linked, turnover-linked): NOT supported. Recompute PV at each reset event and re-measure manually.
- **Multi-currency lease** (USD payments from SGD bank): pass `currency: 'USD'`. ROU + Lease Liability denominate in USD; Jaz auto-translates BS balances at closing rate per IAS 21.23 (do NOT post an `fx-reval` result).
- **Lease with prepayments** (initial payment at signing): post the prepayment as `create_cash_out` against ROU Asset BEFORE the recognition. The PV calculation should exclude the upfront payment portion.
- **Year-end current/non-current reclassification**: not part of the schedule. Manual annual journal: Dr Lease Liability (Non-current) / Cr Lease Liability (Current) for the next 12 months' principal portion. Job playbook `jobs/references/year-end-close.md` Y6 covers this.

---

## Cross-references

- Month-end close: invoked monthly to post or finalize this period's payment journal (5a) + verify Jaz auto-posted ROU depreciation (5b).
- `jobs/references/year-end-close.md` Y6: current/non-current reclassification (manual annual journal) + auditor sample-test of the lease schedule via `clio calc lease`.
- Data migration: opening lease balances loaded via conversion (`jaz-conversion/SKILL.md § Option 2` with the Conversion Clearing > Lease account); recipe runs forward only from migration date.
- `audit-prep.md` step 8: supporting schedule via `search_capsules(filter: {status: {eq: 'ACTIVE'}})` (capsule type is not filterable; see `jobs/references/building-blocks.md` § Filter limits) + per-capsule `clio calc lease` recompute. Auditor reconciles to TB Lease Liability + ROU Asset NBV.
- Sibling recipe `hire-purchase.md`: same calculator, with a useful life.
