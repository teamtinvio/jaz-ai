# Recipe: Hire Purchase (engine name: `lease`)

> Variant of the IFRS 16 lease recipe where ownership transfers at the end of the term. Same engine, same step structure as `ifrs16-lease.md` — but ROU asset depreciates over its USEFUL LIFE (typically longer), not the financing term.

## Why hire-purchase uses the lease engine

Per IFRS 16.32: when ownership transfers at the end of the lease term, OR a purchase option is reasonably certain, the ROU asset is depreciated to the end of its USEFUL LIFE (not the lease term). For a vehicle on a 36-month HP with 60-month useful life: financing/liability over 36 months, depreciation over 60 months.

The recipe engine handles both: pass `usefulLifeMonths` distinct from `termMonths`. The lease/financing schedule (36 monthly DRAFT journals for the unwinding) tracks the liability; the FA register's `usefulLifeMonths: 60` controls depreciation cadence.

## Tools, recipes, calculators this recipe uses

### Recipe engine entry point
- **`plan_recipe(name: 'lease', ...)`** — used in step 2: same engine as IFRS 16 lease, with `usefulLifeMonths > termMonths` to flag hire-purchase pattern.
- **`execute_recipe(name: 'lease', ...)`** — step 4: posts initial recognition + N future-dated DRAFT unwinding journals over `termMonths`. The fixed-asset step is engine-SKIPPED — practitioner manually invokes `create_fixed_asset(usefulLifeMonths: 60, ...)` with the longer useful life.

### Calculator
- **`clio calc lease --payment <monthly> --term <months> --rate <annual %> --useful-life <months> --start-date <YYYY-MM-DD> --currency <code> --json`** — same calc as IFRS 16 lease, with explicit `--useful-life` flag distinguishing it from the financing term. Returns `{ presentValue, totalInterest, schedule[n], depreciationSchedule[m] }` where `m == usefulLifeMonths` (longer than financing schedule).

### Tools (jaz-api / direct)
- All the same as `ifrs16-lease.md` (search_capsules, search_accounts, search_contacts for the financing counterparty, list_bank_accounts, create_fixed_asset, generate_trial_balance, bulk_finalize_drafts, generate_fa_summary).

### Cross-references
- See `ifrs16-lease.md` for the full step-by-step, error table, and variations. This file documents only the hire-purchase-specific deltas.
- IFRS / accounting context: IFRS 16.32 (depreciation period for assets where ownership transfers); IAS 16 (depreciation method itself — typically SL for HP'd assets).

---

## Hire-purchase-specific deltas vs `ifrs16-lease.md`

### Step 1 — Calculator delta

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

The `--useful-life 60` flag tells the calculator the asset will be used for 60 months (vs 36-month financing). Output includes both:
- `schedule[36]` — the financing/unwinding schedule (interest + principal split per month for 36 months)
- `depreciationSchedule[60]` — the SL depreciation schedule for the FA register ($PV / 60 per month)

### Step 2 — Recipe plan delta

```
plan_recipe(
  name: 'lease',
  monthlyPayment: 5000,
  termMonths: 36,
  annualRate: 5,
  usefulLifeMonths: 60,         ← THIS is the HP-specific input
  startDate: '2025-01-01',
  ... (same as ifrs16-lease) ...
)
```

The engine's `plan_recipe` accepts `usefulLifeMonths` as an explicit input. RecipePlan output is the same shape as the lease recipe (initial journal + 36 unwinding journals + 1 fixed-asset note). The note step references the longer useful life so practitioner uses the right value in step 4 manual FA creation.

### Step 4 — Manual FA creation delta

```
create_fixed_asset(
  name: 'Motor Vehicle — HP — Truck-002 (FY2025)',
  reference: 'HP-TRUCK-002-2025',
  cost: <PV from calc>,
  acquisitionDate: '2025-01-01',
  usefulLifeMonths: 60,         ← Use USEFUL LIFE, not term-months
  depreciationMethod: 'sl',
  capsuleResourceId: <capsule from execute_recipe>,
  saveAsDraft: false
)
```

Critical: `usefulLifeMonths: 60` (not 36). After registration, Jaz auto-posts `PV / 60` per month for 60 months. The FA continues depreciating for 24 months AFTER the financing term ends — that's the period during which you OWN the asset outright but it's still in service.

### Step 5 — Monthly action

Months 1-36: same as lease — finalize this period's unwinding DRAFT (`bulk_finalize_drafts`) + verify Jaz auto-posted SL depreciation for this month.

Months 37-60: ONLY verify Jaz auto-posted depreciation. No more financing journals (the unwinding schedule ended at month 36; the 36 DRAFT journals exhausted). The Lease Liability should be 0 from month 37 onward.

Month 60: final depreciation post. NBV = 0. Decommission FA via `update_fixed_asset(status: 'DISPOSED')` if asset is then sold/scrapped, OR keep ACTIVE and continue using (no further depreciation, but asset remains tracked).

---

## Hire-purchase-specific error classes

| Source | Error | Recovery |
|--------|-------|----------|
| `create_fixed_asset` | `usefulLifeMonths` set to 36 (term) instead of 60 (useful life) | Re-create with correct value. Reverse any incorrect depreciation already auto-posted. The most-common HP mistake. |
| Verification month 37+ | Jaz still auto-posting depreciation but TB Lease Liability is 0 | Expected — financing ended at month 36, depreciation continues to month 60 (per IFRS 16.32). |
| Verification month 37+ | Lease Liability nonzero after term end | The `loan` recipe was used instead of `lease` engine. Or `termMonths` was wrong. Audit the unwinding schedule. |
| Asset sold mid-term | (process) | Two scenarios: (a) sold WHILE still on HP — practitioner pays off remaining liability + invokes `asset-disposal.md` recipe; (b) sold AFTER HP ends but before useful life — invoke `asset-disposal.md` only. |
| Practitioner upgrades to a longer/shorter term mid-life | (lease modification) | Per IFRS 16.39-46 — re-measure liability, adjust ROU. Manual journals; recipe doesn't support modification. |

---

## Variations

- **Purchase option**: HP without explicit ownership transfer but with a purchase option reasonably certain to be exercised (e.g., bargain purchase). Same recipe — `usefulLifeMonths > termMonths` flag.
- **Lease vs HP for tax**: SG IRAS treats HP differently from operating lease for tax purposes. Document the IFRS 16 capitalized treatment vs the tax-deductible payment-as-expense treatment. Practitioner adds a tax-only adjustment in Form C-S computation (`practice/references/annual-statutory.md` step 7).
- **Multiple assets under one HP agreement** (e.g., fleet of vehicles on one master HP): one capsule per asset; each asset gets its own `create_fixed_asset` invocation. Master HP financing is split across capsules pro-rata to asset cost.

---

## Cross-references back to engagements

- See `ifrs16-lease.md` cross-references — same engagement contexts (monthly-close step 7, annual-statutory step 8 for current/non-current reclass).
- Sibling recipe `ifrs16-lease.md` — full step-by-step + error table + non-HP variations.
- `asset-disposal.md` — when HP'd asset is eventually sold/scrapped (typically after month 60 = end of useful life).
