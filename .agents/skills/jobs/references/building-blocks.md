# Building Blocks for Jobs

> Shared concepts every job uses. Names of platform tools + Jaz primitives + recipe-engine entry points. Read this before any per-job reference.

## Accounting periods

Jaz uses a **financial year** (FY) that may not match calendar year. The org's financial-year-end (`MM-DD`) determines period boundaries. Confirm it with the user before deriving period boundaries.

| Format | Pattern | Example |
|--------|---------|---------|
| Month | `YYYY-MM` | `2025-01` = January 2025 |
| Quarter | `YYYY-QN` | `2025-Q1` = Jan-Mar 2025 (cal-year org) |
| Year | `YYYY` | `2025` = FY 2025 |

Period derivation:
- Calendar-year org (FY-end `12-31`): `2025-Q1` = `2025-01-01` to `2025-03-31`.
- June FY org (FY-end `06-30`): `2025-Q1` = `2024-07-01` to `2024-09-30` (FY2025 starts Jul 2024).

**Period boundaries matter for:**
- `search_*` filters — `{valueDate: {between: [<period-start>, <period-end>]}}` per `jaz-api/SKILL.md` rule 2.
- Reports — `period_end` for snapshots; `period_start + period_end` for ranges.
- Lock dates — `update_account` lockDate sets the close marker.

## Lock dates

```
update_account(resourceId: <CoA root>, lockDate: '2025-01-31')
```

Per CoA-root: locks ALL transactions whose `valueDate <= lockDate`. Move forward only. Backward = reopens prior periods (do this only for AJEs and re-lock immediately).

Per-account locks (rare): set `lockDate` on a specific bank account or controlled account. Used after bank-recon to prevent retroactive entries against that account.

## Period verification pattern

Run after every period close:

```
generate_trial_balance(period_end: <period-end>)
generate_profit_and_loss(period_start: <period-start>, period_end: <period-end>)
generate_balance_sheet(period_end: <period-end>)
```

Standard assertions:
- TB: `Debits == Credits` (always; if not, system bug).
- BS: `Total Assets == Total Liabilities + Total Equity`.
- TB AR == `generate_aged_ar(period_end)` total.
- TB AP == `generate_aged_ap(period_end)` total.
- TB Cash == `generate_bank_balance_summary(period_end)` per-bank total (via `bank-recon.md`).

## Pre-emitted DRAFT journal pattern

Recipe engine creates ALL future-dated journals upfront as DRAFT (loan: 60 monthly journals; prepaid-expense: 12 monthly journals; lease: termMonths monthly journals; etc.). The recipe engine does NOT use Jaz schedulers — pre-emitted DRAFTs are the canonical pattern.

Monthly action per recipe-managed capsule:
```
search_journals(filter: {capsuleResourceId: {eq: <id>}, valueDate: {between: [<period-start>, <period-end>]}, status: {eq: 'DRAFT'}})
update_journal(resourceId: <this period's pre-emitted journal>, saveAsDraft: false)
```

For Jaz-scheduler-driven recurrences (`create_scheduled_journal`, `create_scheduled_invoice`, `create_scheduled_bill`, subscriptions): scheduler templates auto-fire and create new ACTIVE entries each period. Different primitive — the recipe engine doesn't use these.

## Capsule conventions

Every recipe-engine call attaches its outputs to a capsule. Search across all capsules of a type for cross-cutting reporting:

```
search_capsules(filter: {capsuleType: {eq: 'Loan Repayment'}, status: {eq: 'ACTIVE'}})
```

Capsule types used by jobs:
- `Prepaid Expenses` — recipe `prepaid-expense`
- `Deferred Revenue` — recipe `deferred-revenue`
- `Accrued Expenses` — recipe `accrued-expense` (also bonus accruals)
- `Loan Repayment` — recipe `loan`
- `Lease` — recipe `lease` (incl. hire-purchase)
- `Depreciation` — recipe `depreciation` (DDB / 150DB; SL goes through Jaz native FA)
- `Fixed Deposit` — recipe `fixed-deposit`
- `Asset Disposal` — recipe `asset-disposal`
- `Provisions` — recipe `provision` (IAS 37)
- `ECL Provision` — recipe `ecl` (IFRS 9 simplified)
- `Employee Benefits` — recipes `leave-accrual` + `accrued-expense` (bonus)
- `Dividends` — recipe `dividend`
- `Intercompany` — manual (no engine)
- `Capital Projects` — manual (CWIP-to-FA)
- `M&A` / `Restructuring` / `Insurance Claim` / `Bad Debt Write-off` / `Investments` — manual (per `transaction-recipes/references/building-blocks.md` § Capsules)

Group GL by capsule for the auditor:
```
generate_general_ledger(period_start, period_end, groupBy: 'CAPSULE')
```

## Platform tools every job uses

| Tool | Job usage |
|------|-----------|
| `generate_trial_balance` | Verification — every job |
| `generate_balance_sheet` | Verification |
| `generate_profit_and_loss` | Verification + period analysis |
| `generate_aged_ar` / `generate_aged_ap` | Aging-aware jobs (credit-control, payment-run, audit-prep) |
| `generate_bank_recon_summary` / `generate_bank_recon_details` | Bank-recon, audit-prep |
| `generate_vat_ledger` | GST/VAT, quarter-end Q1 |
| `generate_general_ledger` | Investigation + audit-prep |
| `generate_fa_summary` / `generate_fa_recon_summary` | FA review, year-end |
| `search_journals` / `search_invoices` / `search_bills` | Discovery + filter — every job |
| `search_capsules` | Recipe-managed lifecycle discovery |
| `bulk_finalize_drafts` | Monthly-close + every job that finalizes pre-emitted DRAFTs |
| `update_account` lockDate | Period close |

## Job sequencing

Period-close jobs layer on each other; the ad-hoc jobs slot into the period close or run on demand:

| Job | Builds on / invokes |
|-----|---------------------|
| `month-end-close` | foundation — bank-recon (step 3), document-collection (capture late bills), per-recipe finalize (accruals, prepaid, deferred, depreciation, loan) |
| `quarter-end-close` | month-end-close ×3 + GST/VAT filing, ECL review, bonus true-up, intercompany recon, provision unwinding |
| `year-end-close` | quarter-end-close ×4 + FA reconciliation, true-ups, dividends, retained-earnings rollover; hands off to audit-prep |
| `audit-prep` | runs after year-end-close; consumes fa-review, supplier-recon (majors), bank-recon outputs; feeds statutory-filing |
| `gst-vat-filing` | the canonical Q1 detail of quarter-end-close |
| `payment-run` / `credit-control` / `supplier-recon` | ad-hoc AP / AR / supplier maintenance; run on demand or inside the period close |

Each job's per-row loops (per bank account, per recurring accrual, per fixed asset) and the org-specific values it needs (FY-end, materiality threshold, CoA mapping, recurring accruals, bank accounts) come from the org's setup in Jaz and from the user. Confirm these with the user when they aren't already on file; never assume.

## Multi-org work (intercompany / multi-entity)

Each entity is a separate Jaz org. Multi-org operations (intercompany, consolidation, transfer-pricing) must pin the org **explicitly per call** with `org_id` (from `list_organizations`), never via ambient session / `--org` alias / `JAZ_API_KEY` env state:

1. Confirm Entity A via `get_organization(org_id: <Entity A org>)`, then run Entity A's legs with `org_id: <Entity A org>`.
2. Confirm Entity B via `get_organization(org_id: <Entity B org>)`, then run the mirror legs with `org_id: <Entity B org>`.

Every leg carries its own explicit `org_id` — a wrong "active" org silently posts to the wrong tenant and corrupts both books. See the `intercompany` recipe for the canonical pattern.

## Error handling conventions across jobs

| Severity | Behavior |
|----------|----------|
| 422 expected (per documented contract) | Per-source recovery in the per-job error table; surface specific fix path |
| 422 unexpected | Halt; surface to the user with the raw error message |
| 500 | Retry once with 5s backoff; on second 500 surface "escalate to support with `requestId`" |
| 404 (resource gone) | Stale resource id (e.g., a cached `bank_account` resourceId). Re-resolve via search; surface |
| Async PARTIAL_SUCCESS | Read `data[0].errorDetails[]`; loop back to re-execute failed rows only |
| NOT idempotent on retry | Per `jaz-api/SKILL.md` rule 125 — confirm state via search before retrying |

---

## Cross-references

- `transaction-recipes/references/building-blocks.md` — recipe-side primitives (capsules, schedulers, the engine itself, recipe-name aliases). Pair with this file for full context.
- `jaz-api/SKILL.md` — endpoint-by-endpoint API rules. Cited per-job for specific gotchas.
