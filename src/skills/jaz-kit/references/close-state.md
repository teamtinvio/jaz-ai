# Close state, resume safety, and deliverables

How a close survives being interrupted, and what it leaves behind. The close procedure itself is in `flows.md`; the accounting steps are in the jobs skill.

## Two artifacts, two jobs

**CLOSE.md** is working state — terse, updated constantly, read by the agent to know where it is. It answers "what is done, what is left, what was decided".

**The formal close summary** is written once at lock time into `workpapers/`. It is prose, written for a reviewer, a successor, or an auditor reading cold a year later. It answers "what happened in this close and why should I trust it".

Keeping them separate stops the working file from being polished mid-close and stops the deliverable from reading like a scratchpad.

## CLOSE.md

Lives at `closes/<period>/CLOSE.md`.

**Header** — period, resolved date range, playbook (month/quarter/year), status (`in-progress` · `in-review` · `locked`), opened date, last touched.

**Steps** — one row per playbook step:

| Field | Meaning |
|---|---|
| `step` | Number and name, matching the jobs skill playbook |
| `state` | `pending` · `started` · `confirmed` · `skipped` |
| `evidence` | What proves it: a resourceId, a report saved to workpapers, a count. When a step iterates a collection — bank accounts, capsules — record progress here (`18/40 reconciled, last: DBS SGD`) so a resume re-checks only the remainder |
| `note` | Only when something needs explaining — a skip reason, a residual |

**Review queue** — records created and awaiting approval: what it is, amount, link built by `navigate`, and current state (`queued` · `approved` · `rejected` · `withdrawn`, the last meaning it was deleted in the interface after being queued).

**Decisions** — accepted variances, carried residuals, and overrides, each with the reason given and the jot recorded.

**Residuals** — anything knowingly carried into the locked period. This is what the close summary must disclose.

## The resume protocol

The rule that prevents duplicate journals.

Reconciliation endpoints are **not idempotent**: a second call on the same bank statement entry creates a second journal (jaz-api rule 125), and drafts have the same hazard on a repeated conversion (rule 130). A crashed session cannot tell you whether its last write landed.

So state is written in two phases:

1. Mark the step `started` **before** issuing the call that writes.
2. Mark it `confirmed` **after** the platform confirms.

On resume:

- `confirmed` → skip. Done.
- `pending` → run normally. Nothing was attempted.
- `started` → **verify against the platform before touching anything.** The write may have landed. Check actual state — `search_bank_records` filtered by `status` for reconciliation, `search_journals` filtered by `status: DRAFT` for postings — then skip what already exists and complete only what is genuinely missing.

Never retry a write because it *looks* unfinished. Confirm what the ledger says first.

**If CLOSE.md is unparseable or self-contradictory**, treat every step that is not explicitly `confirmed` as `started` — never as `pending`. That forces verification before any re-write, which is the safe direction to fail. Say the file was damaged, and rebuild it from what the platform confirms.

## Review pack

Written to `closes/<period>/workpapers/` after verification, before locking, and summarized in chat. Contains:

- **Awaiting approval**, split at the organization's materiality threshold: items at or above it listed individually with amount, reason, and link; items below grouped by kind with a count and total.
- **Variances** accepted, with the explanation given for each.
- **Residuals** being carried, and why.
- **Reconciliation position** per bank account.
- **Statement totals** — trial balance, and the balance sheet check that assets equal liabilities plus equity.

Present the exceptions in chat. Leave the full detail in the file.

## Formal close summary

Generated at lock time into `workpapers/`. Written so someone who was not there can follow it.

1. **Period and scope** — entity, period, date range, basis.
2. **What was done** — the phases walked, and what each established.
3. **Judgments made** — every accepted variance and carried residual, with reasoning. This is the section a reviewer actually reads.
4. **Evidence** — the workpapers supporting each phase, by filename.
5. **Position at close** — trial balance totals, the balance sheet check, reconciliation status per account.
6. **Approval and lock** — who approved, what they were shown, when the lock date moved.

Name it for the period so a directory listing reads chronologically.

## Retention

`closes/<period>/workpapers/` is permanent. The exit flow sweeps `work/` and never touches workpapers. When a period is locked, its folder becomes the audit file for that period — treat it as immutable. A correction to a locked period is a new entry in a later period with its own trail, never an edit to a closed file.
