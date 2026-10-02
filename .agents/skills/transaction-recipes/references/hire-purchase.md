# Recipe: Hire Purchase (calculator type: `lease`)

> Variant of the IFRS 16 lease recipe where ownership transfers at the end of the term. Same calculator, same step structure as `ifrs16-lease.md`, but the ROU asset depreciates over its USEFUL LIFE (typically longer), not the financing term.

## Why hire-purchase uses the lease calculator

Per IFRS 16.32: when ownership transfers at the end of the lease term, OR a purchase option is reasonably certain, the ROU asset is depreciated to the end of its USEFUL LIFE (not the lease term). For a vehicle on a 36-month HP with 60-month useful life: financing/liability over 36 months, depreciation over 60 months.

The lease calculator handles both: pass `usefulLifeMonths` (CLI `--useful-life`) alongside `termMonths`. The financing schedule (36 monthly payment journals) tracks the liability; the FA register's `effectiveLife: 60` (months) controls depreciation cadence. The useful life must be at least the term, or the calculator refuses.

## Tools and calculator this recipe uses

### Calculator (offline, posts nothing)
- **MCP: `calculate(type: 'lease', monthlyPayment, termMonths, annualRate, usefulLifeMonths, startDate, currency)`**.
- **CLI: `clio calc lease --payment <monthly> --term <months> --rate <annual %> --useful-life <months> --start-date <YYYY-MM-DD> --currency <code> --json`**: the same result.

Returns the lease result shape: `{ presentValue, monthlyRouDepreciation, depreciationMonths, isHirePurchase, totalCashPayments, totalInterest, totalDepreciation, initialJournal, schedule[termMonths], blueprint }`. `isHirePurchase` is `true`, `depreciationMonths` equals the useful life, and `blueprint.capsuleType` is `Hire Purchase`.

### Posting and lookup tools
- All the same as `ifrs16-lease.md`: `list_capsule_types`, `create_capsule_type`, `create_capsule`, `create_journal`, `create_fixed_asset`, plus `search_capsules`, `search_accounts`, `search_contacts` for the financing counterparty, `list_bank_accounts`, `generate_trial_balance` and `generate_fa_summary`.

### Cross-references
- See `ifrs16-lease.md` for the full step-by-step, problems table, and variations. This file documents only the hire-purchase-specific deltas.
- IFRS / accounting context: IFRS 16.32 (depreciation period for assets where ownership transfers); IAS 16 (depreciation method itself, typically SL for HP'd assets).

---

## Hire-purchase-specific deltas vs `ifrs16-lease.md`

### Step 1: Calculator delta

```
calculate(
  type: 'lease',
  monthlyPayment: 5000,
  termMonths: 36,
  annualRate: 5,
  usefulLifeMonths: 60,
  startDate: '2025-01-01',
  currency: 'SGD'
)
```

```
clio calc lease \
  --payment 5000 \
  --term 36 \
  --rate 5 \
  --useful-life 60 \
  --start-date 2025-01-01 \
  --currency SGD \
  --json
```

`usefulLifeMonths: 60` is the HP-specific input: it tells the calculator the asset will be used for 60 months (vs 36-month financing). Output:
- `presentValue: 166828.51` and `schedule[36]`: the financing schedule (interest + principal split per month for 36 months), identical to the plain lease.
- `monthlyRouDepreciation: 2780.48` (presentValue / 60) and `depreciationMonths: 60`: the SL depreciation for the FA register. The calculator does NOT return a per-row depreciation array; the schedule is the constant monthly amount × 60 months.
- `blueprint.steps`: the initial recognition journal, one `fixed-asset` instruction (life 60 months, straight-line over useful life, not lease term), then the 36 payment journals.

### Step 3: Capsule delta

Use the `Hire Purchase` capsule type (`create_capsule_type(displayName: 'Hire Purchase')` if it is not in `list_capsule_types`), and code the asset to its own class (for example Motor Vehicles) rather than a generic right-of-use account, since ownership passes to the entity.

### Step 4: FA registration delta

```
create_fixed_asset(
  name: 'Motor Vehicle (HP), Truck-002 (FY2025)',
  purchaseAmount: <presentValue from the calculator>,
  purchaseDate: '2025-01-01',
  purchaseAssetAccountResourceId: <Motor Vehicles asset GL>,
  depreciationStartDate: '2025-01-01',
  depreciationMethod: 'STRAIGHT_LINE',
  effectiveLife: 60,            // months. Use USEFUL LIFE, not the term
  depreciationExpenseAccountResourceId: <Depreciation Expense GL>,
  accumulatedDepreciationAccountResourceId: <Accumulated Depreciation GL>,
  purchaseBusinessTransactionType: 'JOURNAL_MANUAL',
  purchaseBusinessTransactionResourceId: <initial-recognition journal's asset LINE id>,
  capsuleResourceId: <capsule id>,
  saveAsDraft: false
)
```

Critical: `effectiveLife: 60` (not 36). After registration, Jaz auto-posts `PV / 60` per month for 60 months. The FA continues depreciating for 24 months AFTER the financing term ends; that's the period during which you OWN the asset outright but it's still in service.

### Step 5: Monthly action

Months 1-36: same as lease; post or finalize this period's payment journal (found by its reference) + verify Jaz auto-posted SL depreciation for this month.

Months 37-60: ONLY verify Jaz auto-posted depreciation. No more financing journals (the schedule ended at month 36). The Lease Liability should be 0 from month 37 onward.

Month 60: final depreciation post. NBV = 0. Decommission FA via `mark_fixed_asset_sold` (sold) or `discard_fixed_asset` (scrapped) if the asset leaves the business, OR keep ACTIVE and continue using (no further depreciation, but asset remains tracked).

---

## Hire-purchase-specific problems

| Where | Problem | Recovery |
|--------|-------|----------|
| Calculator | "Useful life (N months) must be >= lease term (M months) for hire purchase." | The useful life cannot be shorter than the financing term. Check which figure is which. |
| `create_fixed_asset` | `effectiveLife` set to 36 (term) instead of 60 (useful life) | Correct the asset's life and reverse any incorrect depreciation already auto-posted. The most-common HP mistake. |
| Verification month 37+ | Jaz still auto-posting depreciation but TB Lease Liability is 0 | Expected: financing ended at month 36, depreciation continues to month 60 (per IFRS 16.32). |
| Verification month 37+ | Lease Liability nonzero after term end | A payment journal is missing or still a DRAFT, or `termMonths` was wrong. Audit the payment journals against the schedule. |
| Asset sold mid-term | (process) | Two scenarios: (a) sold WHILE still on HP: practitioner pays off remaining liability + follows `asset-disposal.md`; (b) sold AFTER HP ends but before useful life: follow `asset-disposal.md` only. |
| Practitioner upgrades to a longer/shorter term mid-life | (lease modification) | Per IFRS 16.39-46: re-measure liability, adjust ROU. Manual journals; the calculator does not model a modification. |

---

## Variations

- **Purchase option**: HP without explicit ownership transfer but with a purchase option reasonably certain to be exercised (e.g., bargain purchase). Same recipe, with the useful life passed.
- **Lease vs HP for tax**: SG IRAS treats HP differently from operating lease for tax purposes. Document the IFRS 16 capitalized treatment vs the tax-deductible payment-as-expense treatment. Add a tax-only adjustment in the Form C-S computation during year-end close.
- **Multiple assets under one HP agreement** (e.g., fleet of vehicles on one master HP): one capsule per asset; each asset gets its own `create_fixed_asset` invocation. Master HP financing is split across capsules pro-rata to asset cost.

---

## Cross-references

- See `ifrs16-lease.md` cross-references: same operational contexts (month-end close, `jobs/references/year-end-close.md` Y6 for current/non-current reclass).
- Sibling recipe `ifrs16-lease.md`: full step-by-step + problems table + non-HP variations.
- `asset-disposal.md`: when HP'd asset is eventually sold/scrapped (typically after month 60 = end of useful life).
