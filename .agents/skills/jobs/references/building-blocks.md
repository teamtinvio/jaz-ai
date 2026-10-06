# Building Blocks for Jobs

> Shared concepts every job uses. Names of platform tools + Jaz primitives + the calculate-then-post flow. Read this before any per-job reference.

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
- `search_*` filters: `{valueDate: {between: [<period-start>, <period-end>]}}` per `jaz-api/SKILL.md` rule 2.
- Reports: each tool names its own dates: `endDate` (trial balance, aged AR/AP, cash balance), `snapshotDate` (balance sheet), `startDate` + `endDate` (P&L, cashflow, general ledger, VAT ledger), `primarySnapshotStartDate` + `primarySnapshotEndDate` (FA summary/recon, equity movement, bank recon), `primarySnapshotDate` (bank balance summary).
- Lock dates: `update_account` lockDate sets the close marker.

## Lock dates

```
update_account(resourceId: <CoA root>, lockDate: '2025-01-31')
```

Per CoA-root: locks ALL transactions whose `valueDate <= lockDate`. Move forward only. Backward = reopens prior periods (do this only for AJEs and re-lock immediately).

Per-account locks (rare): set `lockDate` on a specific bank account or controlled account. Used after bank-recon to prevent retroactive entries against that account.

## Period verification pattern

Run after every period close:

```
generate_trial_balance(endDate: <period-end>)
generate_profit_and_loss(startDate: <period-start>, endDate: <period-end>)
generate_balance_sheet(snapshotDate: <period-end>)
```

Standard assertions:
- TB: `Debits == Credits` (always; if not, system bug).
- BS: `Total Assets == Total Liabilities + Total Equity`.
- TB AR == `generate_aged_receivables(endDate)` total.
- TB AP == `generate_aged_payables(endDate)` total.
- TB Cash == `generate_bank_balance_summary(primarySnapshotDate)` per-bank total (via `bank-recon.md`).

## Calculated schedules: calculate, capsule, post

There is no one-call "recipe" execution. Any job step that needs a schedule (loan, lease, prepaid, deferred revenue, accrual, ECL, provision, dividend, disposal) is three steps you perform yourself:

```
calculate(type: 'prepaid-expense', amount: 12000, periods: 12, startDate: '2025-01-01')
list_capsule_types()
create_capsule(capsuleTypeResourceId: <type id>, title: <blueprint.capsuleName>, description: <blueprint.capsuleDescription>)
create_journal(valueDate: <step date>, autoReference: true, journalEntries: [<step lines>], capsuleResourceId: <capsule id>)
```

1. **`calculate`** is offline and read-only (local CLI: `clio calc <type> ... --json`). It returns the schedule and, when `startDate` is given, a `blueprint`: `capsuleType`, `capsuleName`, `capsuleDescription`, and `steps[]`, each with an `action` (`journal`, `bill`, `invoice`, `cash-in`, `cash-out`, `fixed-asset`, `note`), a `date`, and `lines[]` of `{account, debit, credit}`. Without a start date most calculators return the schedule only. It posts nothing.
2. **Capsule:** `list_capsule_types`, match the blueprint's `capsuleType` by name, then `create_capsule`. If the type is missing, `create_capsule_type(displayName: <capsuleType>)` first.
3. **Post each step** with the tool its `action` names: `create_journal`, `create_bill`, `create_invoice`, `create_cash_in`, `create_cash_out`, each with `capsuleResourceId`. The blueprint's `account` values are generic names ("Prepaid Asset", "Cash / Bank Account"): resolve each to the org's own account with `search_accounts` and confirm the mapping with the user before posting. A cash step can only carry lines on the side opposite the bank: if a cash-in or cash-out step has another line on the bank's side (for example withholding tax), post the net cash entry and a separate journal for that line. A fixed amount repeating every period can be one `create_scheduled_journal` instead of N journals.

`fx-reval` is verification only: Jaz revalues foreign-currency balances at period end, so posting its result double-counts.

## Future-dated DRAFT journal pattern

When a schedule was posted up front as future-dated DRAFT journals (creates default to draft), each close finalizes the current period's journal:

```
search_journals(filter: {valueDate: {between: [<period-start>, <period-end>]}, status: {eq: 'DRAFT'}})
update_journal(resourceId: <this period's journal>, saveAsDraft: false)
```

For Jaz-scheduler-driven recurrences (`create_scheduled_journal`, `create_scheduled_invoice`, `create_scheduled_bill`, subscriptions): scheduler templates auto-fire and create new ACTIVE entries each period, so there is nothing to finalize.

## Capsule conventions

Every calculated schedule is posted into a capsule. Search across capsules for cross-cutting reporting:

```
search_capsules(filter: {status: {eq: 'ACTIVE'}})
```

Capsule types used by jobs (the `capsuleType` each calculator's blueprint names):
- `Prepaid Expenses`: calculator `prepaid-expense`
- `Deferred Revenue`: calculator `deferred-revenue`
- `Accrued Expenses`: calculator `accrued-expense` (also bonus accruals)
- `Loan Repayment`: calculator `loan`
- `Lease Accounting`: calculator `lease`
- `Hire Purchase`: calculator `lease` with a useful life (hire purchase)
- `Depreciation`: calculator `depreciation` (DDB / 150DB; SL goes through Jaz native FA)
- `Fixed Deposit`: calculator `fixed-deposit`
- `Asset Disposal`: calculator `asset-disposal`
- `Provisions`: calculator `provision` (IAS 37)
- `ECL Provision`: calculator `ecl` (IFRS 9 simplified)
- `Employee Benefits`: calculators `leave-accrual` + `accrued-expense` (bonus)
- `Dividends`: calculator `dividend`
- `Intercompany`: manual (no calculator)
- `Capital Projects`: manual (CWIP-to-FA)
- `M&A` / `Restructuring` / `Insurance Claim` / `Bad Debt Write-off` / `Investments`: manual (per `transaction-recipes/references/building-blocks.md` § Capsules)

Group GL by capsule for the auditor:
```
generate_general_ledger(startDate: <period-start>, endDate: <period-end>, groupBy: 'CAPSULE')   # the ledger grouped by capsule
get_capsule(resourceId)   # returns totalTransactions (a COUNT), not the transactions
```

## Platform tools every job uses

| Tool | Job usage |
|------|-----------|
| `generate_trial_balance` | Verification, every job |
| `generate_balance_sheet` | Verification |
| `generate_profit_and_loss` | Verification + period analysis |
| `generate_aged_receivables` / `generate_aged_payables` | Aging-aware jobs (credit-control, payment-run, audit-prep) |
| `generate_bank_reconciliation_summary` / `generate_bank_reconciliation_details` | Bank-recon, audit-prep |
| `generate_vat_ledger` | GST/VAT, quarter-end Q1 |
| `generate_general_ledger` | Investigation + audit-prep |
| `generate_fixed_assets_summary` / `generate_fixed_assets_reconciliation_summary` | FA review, year-end |
| `search_journals` / `search_invoices` / `search_bills` | Discovery + filter, every job |
| `calculate` | Schedules + journal lines for every calculated step (posts nothing) |
| `search_capsules` | Capsule lifecycle discovery |
| `bulk_finalize_drafts` / `bulk_update_journals` | Monthly-close + every job that finalizes DRAFTs (journals go through `bulk_update_journals`) |
| `update_account` lockDate | Period close |

## Job sequencing

Period-close jobs layer on each other; the ad-hoc jobs slot into the period close or run on demand:

| Job | Builds on / invokes |
|-----|---------------------|
| `month-end-close` | foundation: bank-recon (step 3), document-collection (capture late bills), per-schedule finalize (accruals, prepaid, deferred, depreciation, loan) |
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

Every leg carries its own explicit `org_id`: a wrong "active" org silently posts to the wrong tenant and corrupts both books. See the `intercompany` recipe for the canonical pattern.

## Error handling conventions across jobs

| Severity | Behavior |
|----------|----------|
| 422 expected (per documented contract) | Per-source recovery in the per-job error table; surface specific fix path |
| 422 unexpected | Halt; surface to the user with the raw error message |
| 500 | Retry once with 5s backoff; on second 500 surface "escalate to support with `requestId`" |
| 404 (resource gone) | Stale resource id (e.g., a cached `bank_account` resourceId). Re-resolve via search; surface |
| Async PARTIAL_SUCCESS | Read `data[0].errorDetails[]`; loop back to re-execute failed rows only |
| NOT idempotent on retry | Per `jaz-api/SKILL.md` rule 125; confirm state via search before retrying |

---

## Cross-references

- `transaction-recipes/references/building-blocks.md`: recipe-side primitives (capsules, schedulers, calculators). Pair with this file for full context.
- `jaz-api/SKILL.md`: endpoint-by-endpoint API rules. Cited per-job for specific gotchas.

### Filter limits on capsules and journals (measured 2026-09-07)

Two things these playbooks used to instruct are **not supported by the search filters**, and an
undeclared filter field is REJECTED, not ignored: the call returns a 400 rather than a wider result.

**Capsules cannot be filtered by type.** `CapsuleFilter` declares only `and`, `description`,
`endDate`, `or`, `resourceId`, `startDate`, `status`, `title`. Fetch with the filters that exist and
narrow client-side on the row: `type` is the flat string, `capsuleType` is an OBJECT
(`{name, displayName, resourceId, status, ...}`). Match on `type` or `capsuleType.name`, and expect
BOTH casings: the same field carries `Prepaid Expenses` on one row and `TAX_PAYMENT` on another, so
compare case-insensitively with separators normalized rather than testing equality against a label.

**Journals cannot be filtered by capsule or by fixed asset.** `JournalFilter` declares `and`,
`andGroup`, `contact`, `createdAt`, `creator`, `internalNotes`, `or`, `orGroup`, `reference`,
`resourceId`, `status`, `tags`, `templateType`, `type`, `updatedAt`, `valueDate`; no
`capsuleResourceId`, no `fixedAssetResourceId`. There is no reverse route either: a capsule exposes
only `totalTransactions` (a count), and no `/capsules/{id}/journals` endpoint exists. Narrow with
the declared fields (`valueDate`, `status`, `type`, `templateType`, `tags`, `reference`) and report the capsule
and its `totalTransactions` count and let the practitioner identify the journals. `get_journal` does
return the link per journal as `capsule: {resourceId, type, title}`, so a candidate can be checked
one at a time. When you post a schedule yourself, give its journals a shared `reference` prefix or
tag so the next close can find them. Note `tags` is PLURAL; `tag` is rejected.

**Capsules cannot be filtered by date either.** `startDate` and `endDate` are declared on
`CapsuleFilter` and pass validation, but every form measured on 2026-09-07 (`{gte}`, `{between}`,
and `{gte}` paired with `{lte}`) answers `500 Internal Server Error`. Filter on `status`/`title`
and narrow dates on the rows.
