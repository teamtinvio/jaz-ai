# Onboarding an organization

Fill ORG.md from the platform first, then ask only what the platform cannot know. An accountant who has been using Jaz for a year should not be interrogated about facts already in their ledger.

## Read first

Every call sources the company's key from its `.env` — `set -a; . "orgs/<slug>/.env"; set +a; clio …` (during setup the key is still in the staging `.new-org.env`). No `--org`; the key is the org.

| Call | Fills |
|---|---|
| `clio org info --json` | `name`, `organization_id`, `base_currency`, `country`, `fy_end` (returned as `financialYearEnd` in `DD-MM` — write it out in full) |
| `clio reports generate ledger-highlights --json` | `multi_currency`, which modules are live, active accounts, period range |
| `search_journals` over the last three months | Candidate `recurring_accruals` |
| `clio context -w <workflow> --json` | Reference detail, only if needed — **always pass `-w`** |

Lead with **ledger-highlights**: it reports what the books actually use rather than what exists. `hasCrossCurrencyActivity` settles multi-currency without listing 19 currencies; `transactionCountByType` shows whether fixed assets, credit notes, or cash transfers are even in play; `distinctAccountCount` and `activeAccountResourceIds` narrow 1,027 accounts to the 144 that matter.

Never transcribe the ledger. One test org had 226 bank accounts. Ask which they reconcile in a close and record those. A bare `clio context --json` is 1.5 MB — always scope with `-w`.

The setup flow's first `clio org info` (step 5.3) already printed the name, currency, and country while validating the key. Do not ask for them again.

**Derive, then confirm.** Multi-currency is inferred from currencies in use. The filing profile is inferred from tax profiles configured. Recurring accruals are inferred from repetition. Present each as *proposed* and let the user correct it — an inference stated as a fact is how a wrong materiality threshold ends up governing a close.

## Then ask four questions

Only four. Each one governs behavior that cannot be inferred, and each maps to a specific step in the close.

### 1. Materiality

> "Above what amount does a discrepancy become worth investigating?"

Used twice, so it earns its place: variance surfacing in the close, and the split between itemized and grouped items in the review queue. Too low buries the accountant in noise; too high hides real problems.

If they are unsure, offer a basis rather than a number — a percentage of revenue or of total assets — and record the reasoning alongside the amount.

### 2. Close cadence and target

> "When do you want the books closed each month?"

Recorded as a working day. Drives urgency in the status view and tells the close flow whether it is early, on time, or late.

### 3. Recurring accruals and how each is estimated

> "Which accruals do you post every month, and how do you work out each amount?"

Show what was inferred from the ledger and let them correct and extend. For each, capture the estimation method, which must be one the month-end playbook understands: prior month, trailing three-month average, budget, or a fixed amount.

This is the single highest-value field in the file. It converts the close's accrual phase from an interview into an execution.

### 4. Review and sign-off

> "Who approves entries before they are finalized, and who signs off the close?"

Sole operator, or a reviewer. Determines whether the review flow presents to the same person doing the work or prepares a pack for someone else, and who must confirm before the period locks.

## Filing profile

Ask only if tax profiles indicate the organization is registered: what the return is called, how often they file, which period ends, and how long after a period end it is due.

Take all four from the user. Do not infer them from the country, and do not offer a jurisdiction default for them to correct — a confident wrong deadline is worse than an open question. If they are unsure, their previously filed returns establish the real pattern.

## Vocabulary

KIT.md's `mode` was set at init. Follow it: *client-books* says "the client" and "the engagement"; *own-books* says "your books" and "your organization". Getting this wrong reads as generic software immediately.

## What not to ask

Do not ask for anything the API already returned, anything derivable from the ledger, or anything not consumed by a flow. Every question needs a reason the user can feel — if you cannot name the close step that consumes an answer, do not ask for it.

Firm-wide preferences belong in `_shared/policies/`, asked once at init, not per organization.
