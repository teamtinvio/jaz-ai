# Building Blocks for Jobs

> Shared concepts every job uses. Names of MCP tools + Jaz primitives + recipe-engine entry points + practitioner-engagement orchestration. Read this before any per-job reference.

## Accounting periods

Jaz uses a **financial year** (FY) that may not match calendar year. The org's `fy_end` (`MM-DD`) determines period boundaries. Read from `CLIENT.fy_end` per practice playbook.

| Format | Pattern | Example |
|--------|---------|---------|
| Month | `YYYY-MM` | `2025-01` = January 2025 |
| Quarter | `YYYY-QN` | `2025-Q1` = Jan-Mar 2025 (cal-year org) |
| Year | `YYYY` | `2025` = FY 2025 |

Period derivation:
- Calendar-year org (`fy_end: '12-31'`): `2025-Q1` = `2025-01-01` to `2025-03-31`.
- June FY org (`fy_end: '06-30'`): `2025-Q1` = `2024-07-01` to `2024-09-30` (FY2025 starts Jul 2024).

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

## MCP tools every job uses

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

## Engagement playbooks

Jobs are invoked from practitioner engagement playbooks. Practice playbooks own the CLIENT.md / ENGAGEMENT.md context, the per-row loops (per bank account, per recurring accrual, per FA), and the cross-job orchestration:

| Engagement type | Playbook | Jobs invoked |
|-----------------|----------|--------------|
| `monthly-close` | `practice/references/monthly-close.md` | month-end-close (foundation), bank-recon (step 3), document-collection (step 2 if late docs), per-recipe finalize (steps 7-11) |
| `quarterly-gst` | `practice/references/quarterly-gst.md` | quarter-end-close, gst-vat-filing (Q1), credit-control (Q1 review) |
| `annual-statutory` | `practice/references/annual-statutory.md` | year-end-close (orchestrator), audit-prep (step 5), fa-review (step 4b), supplier-recon (step 4 majors), statutory-filing / SG Form C-S (step 7) |
| `onboarding` | `practice/references/onboarding.md` | jaz-conversion (Phase 0-4), document-collection (initial doc batch) |

When a job runs OUTSIDE an engagement (rare — typically ad-hoc spot use): the agent does NOT have CLIENT.md context. Halt or surface assumptions to practitioner.

## Multi-org auth (intercompany / multi-entity engagements)

Per `CLIENT.jaz_api_key_override`: each entity has its own Jaz org and API key. Multi-org operations (intercompany, consolidation, transfer-pricing) require explicit context switch:

1. `practice_load_client(<entity-a slug>)` → loads Entity A's API key + CLIENT.md.
2. Run any per-entity tools under that context.
3. `practice_load_client(<entity-b slug>)` → switches to Entity B.
4. Run mirror operations under Entity B's context.

NEVER mix. Wrong API key → wrong org → catastrophic data corruption. See `intercompany.md` recipe for the canonical pattern.

## Error handling conventions across jobs

| Severity | Behavior |
|----------|----------|
| 422 expected (per documented contract) | Per-source recovery in the per-job error table; surface specific fix path |
| 422 unexpected | Halt; surface to practitioner with the raw error message |
| 500 | Retry once with 5s backoff; on second 500 surface "escalate to support with `requestId`" |
| 404 (resource gone) | Likely stale `CLIENT.md` reference (e.g., `bank_accounts[i].jaz_resource_id`). Re-resolve via search; update CLIENT.md; surface |
| Async PARTIAL_SUCCESS | Read `data[0].errorDetails[]`; loop back to re-execute failed rows only |
| NOT idempotent on retry | Per `jaz-api/SKILL.md` rule 124 — confirm state via search before retrying |

---

## Cross-references

- `transaction-recipes/references/building-blocks.md` — recipe-side primitives (capsules, schedulers, the engine itself, recipe-name aliases). Pair with this file for full context.
- `practice/references/monthly-close.md` / `quarterly-gst.md` / `annual-statutory.md` / `onboarding.md` — engagement-type playbooks. The canonical orchestration layer.
- `jaz-api/SKILL.md` — endpoint-by-endpoint API rules. Cited per-job for specific gotchas.
