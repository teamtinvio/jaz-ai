---
name: jaz-jobs
version: 6.0.3
description: >-
  Use this skill for recurring accounting workflows: month/quarter/year-end
  close, bank reconciliation, GST/VAT filing, payment runs, credit control,
  supplier recon, audit prep, fixed asset review, and Singapore Form C-S tax
  computation. 12 job playbooks that sequence real platform tools into complete
  business processes. Also use when the user mentions closing the books,
  period-end, tax filing, or any operational accounting task.
license: MIT
compatibility: Works with Claude Code, Claude Cowork, Claude.ai, and any agent that reads markdown. For API payloads, load the jaz-api skill. For individual transaction patterns, load the jaz-recipes skill.
---

# Jobs Skill

You are helping an **SMB accountant or bookkeeper** complete recurring accounting tasks in Jaz: period-end closes, bank reconciliation, tax filing, payment processing, and operational reviews. These are the real jobs that keep the books accurate and the business compliant.

> **Jaz-native, not generic.** Every job in this skill names specific Jaz tools (`search_invoices`, `quick_reconcile`, `bulk_finalize_drafts`, `reconcile_with_payments`, report tools like `generate_trial_balance`, `download_export`), Jaz reconciliation modes, and Jaz capsule patterns. It is NOT an interchangeable accounting workflow reference; it is the operating manual for running these processes through the Jaz platform tools. When the playbook says "match bank entries", it means call the 5-phase cascade matcher (`clio jobs bank-recon match` for a local CLI run, or follow the cascade logic in `references/bank-match.md` and drive the `reconcile_*` tools directly), not "use any matching algorithm".

**Jobs combine accounting patterns, calculators, and platform tools into complete business processes.** Each per-job reference is the only description of its job: it lists the phases, and for each step names the exact report tool, calculator, or API call to run.

## How to run a job

You orchestrate the **real platform tools directly**, following the phase sequence in the per-job reference:

- **The per-job reference is your checklist.** Walk its phases in order and call the named platform tools: `calculate`, `search_invoices` / `search_bills` / `search_bank_records`, the `generate-reports/*` report tools (`generate_trial_balance`, `generate_aged_ar`, `generate_vat_ledger`, …), `reconcile_*`, `create_capsule`, `create_journal`, `bulk_finalize_drafts`, `update_account` lockDate, and so on. There is no "blueprint tool" or checklist command to call; the reference IS the plan.
- **Local CLI helpers:** five `clio jobs` sub-tools do real work for specific steps (see "CLI helpers" below).

### Scheduled and calculated entries

When a step needs a calculated schedule, do it in three steps (there is no one-call recipe execution):

1. **Calculate:** `calculate` with `type` = `loan` | `lease` | `depreciation` | `prepaid-expense` | `deferred-revenue` | `ecl` | `provision` | `fixed-deposit` | `asset-disposal` | `accrued-expense` | `leave-accrual` | `dividend` (CLI: `clio calc <type> ... --json`). Offline; returns the schedule and, with a start date, dated steps with journal lines. Posts nothing.
2. **Group:** `list_capsule_types`, then `create_capsule` with the matching `capsuleTypeResourceId` and a `title`.
3. **Post:** one `create_journal` / `create_bill` / `create_invoice` / `create_cash_in` / `create_cash_out` per step, each with `capsuleResourceId`. A fixed amount repeating every period can be one `create_scheduled_journal` instead of N journals.

`fx-reval` is verification only: Jaz revalues foreign-currency balances itself, so never post its result.

## When to Use This Skill

- Closing the books for a month, quarter, or year
- Catching up on bank reconciliation (with automated pre-matching)
- Collecting and uploading client documents (invoices, bills, bank statements)
- Preparing GST/VAT returns for filing
- Running a payment batch to clear outstanding bills
- Chasing overdue invoices (credit control)
- Reconciling supplier statements against AP ledger
- Preparing for an audit or tax filing
- Reviewing the fixed asset register

## Job Catalog

### Period-Close Jobs (Layered)

Period-close jobs build on each other. Quarter = month + extras. Year = quarter + extras. Each reference covers the full run and marks which phases are the extras.

| Job | Reference | Description |
|-----|-----------|-------------|
| **Month-End Close** | `references/month-end-close.md` | 5 phases: pre-close prep, accruals, valuations, verification, lock. The foundation. |
| **Quarter-End Close** | `references/quarter-end-close.md` | Month-end for each month + GST/VAT, ECL review, bonus accruals, intercompany, provision unwinding. |
| **Year-End Close** | `references/year-end-close.md` | Quarter-end for each quarter + true-ups, dividends, retained-earnings rollover, audit prep, final lock. |

### Ad-Hoc Jobs

| Job | Reference | Description |
|-----|-----------|-------------|
| **Bank Recon** | `references/bank-recon.md` | Clear unreconciled items: match, categorize, resolve. **Match to EXISTING open bills/invoices/payments (`reconcile_with_payments`) is the primary path; create-new only when nothing matches.** Drive end-to-end via the `view_auto_reconciliation` decision gate: per-entry, so fetch ids with `search_bank_records` first (auto-commit high-confidence, checkpoint the rest; see `references/bank-recon.md` Step 4a). Cascade matcher: `clio jobs bank-recon match`. |
| **Document Collection** | `references/document-collection.md` | Scan and classify client documents from local directories and cloud links (Dropbox, Drive, OneDrive). Outputs file paths for upload via Jaz Magic. Ingest helper: `clio jobs document-collection ingest`. |
| **GST/VAT Filing** | `references/gst-vat-filing.md` | Tax ledger review, discrepancy check, filing summary. |
| **Payment Run** | `references/payment-run.md` | Select outstanding bills by due date, process payments. Outstanding-bills helper: `clio jobs payment-run outstanding`. |
| **Credit Control** | `references/credit-control.md` | AR aging review, overdue chase list, bad debt assessment. Run on-demand when AR aging deteriorates. |
| **Supplier Recon** | `references/supplier-recon.md` | AP vs supplier statement, identify mismatches. Run for major suppliers and at year-end for audit AP confirmations. |
| **Audit Preparation** | `references/audit-prep.md` | Compile reports, schedules, reconciliations for auditor/tax. |
| **FA Review** | `references/fa-review.md` | Fixed asset register review, disposal/write-off processing. Run as part of year-end. |
| **Statutory Filing** | `references/sg-tax/wizard-workflow.md` | Corporate income tax computation. CLI engines: `clio jobs statutory-filing sg-cs` (Form C-S computation), `clio jobs statutory-filing sg-ca` (capital allowance schedule). See the SG Form C-S section below. |

## How Jobs Work

Each per-job reference is a **phased checklist** of steps. Each step names:

- **API call**: the exact platform tool + request body to execute the step
- **Recipe reference**: the transaction-recipes pattern behind a complex step
- **Calculator**: the `calculate` type (or `clio calc` command) for the schedule or cross-check
- **Verification check**: how to confirm the step was completed correctly
- **Conditional flag**: steps that only apply in certain situations (e.g., "only if multi-currency org")

Steps that carry real judgment (hold, defer, accept a variance, resume after a failure) also name the jot to record at that moment via the `jot` tool. Mechanical steps never do: a jot marks a choice among real alternatives, not activity.

Use the jaz-api skill for payload shapes.

## CLI helpers

`clio jobs` holds five working sub-tools, not checklists.

```bash
clio jobs bank-recon match --input bank-data.json [--tolerance 0.01] [--date-window 14] [--json]
clio jobs payment-run outstanding [--due-before 2025-02-28] [--supplier "Acme Corp"] [--currency SGD] [--json]
clio jobs document-collection ingest --source ./client-docs [--upload] [--bank-account "DBS Current"] [--json]
```

The other two, `clio jobs statutory-filing sg-cs` and `sg-ca`, are shown in the Singapore Form C-S section below.

## Relationship to Other Skills

| Skill | Role |
|-------|------|
| **jaz-api** | Provides the exact API payloads for each step (field names, gotchas, error handling) |
| **jaz-recipes** | Provides the accounting patterns for complex steps (accruals, FX reval, ECL, etc.) |
| **jaz-jobs** (this skill) | Combines those patterns + platform tools into sequenced, verifiable business processes |

**Load all three skills together** for the complete picture. Jobs reference recipes by name; read the referenced recipe for implementation details.

## Supporting Files

- **[references/building-blocks.md](./references/building-blocks.md)**: Shared concepts: accounting periods, lock dates, period verification, conventions
- **[references/month-end-close.md](./references/month-end-close.md)**: Month-end close: 5 phases, ~18 steps
- **[references/quarter-end-close.md](./references/quarter-end-close.md)**: Quarter-end close: monthly + quarterly extras
- **[references/year-end-close.md](./references/year-end-close.md)**: Year-end close: quarterly + annual extras
- **[references/bank-recon.md](./references/bank-recon.md)**: Bank reconciliation catch-up
- **[references/bank-match.md](./references/bank-match.md)**: Bank reconciliation matcher: 5-phase cascade algorithm (1:1, N:1, 1:N, N:M matches)
- **[references/document-collection.md](./references/document-collection.md)**: Document collection: scan, classify, upload; local + cloud (Dropbox, Drive, OneDrive)
- **[references/gst-vat-filing.md](./references/gst-vat-filing.md)**: GST/VAT filing preparation
- **[references/payment-run.md](./references/payment-run.md)**: Payment run (bulk bill payments)
- **[references/credit-control.md](./references/credit-control.md)**: Credit control / AR chase
- **[references/supplier-recon.md](./references/supplier-recon.md)**: Supplier statement reconciliation
- **[references/audit-prep.md](./references/audit-prep.md)**: Audit preparation pack
- **[references/fa-review.md](./references/fa-review.md)**: Fixed asset register review

## Tax Computation: Singapore Form C-S

Corporate income tax computation for Singapore-incorporated companies. The AI agent acts as the **tax wizard**, pulling data from Jaz, classifying GL items, asking the user targeted questions, and assembling the input for the CLI computation engine.

**Scope:** Form C-S (revenue ≤ $5M, 18 fields) and Form C-S Lite (revenue ≤ $200K, 6 fields). NOT Form C.

### How It Works

```
┌──────────────────────────────┐     ┌───────────────────────────────┐
│  Reference Docs (this skill) │     │  CLI Computation Engine        │
│  "The Wizard Script"         │     │  clio jobs statutory-filing sg-cs [--json]       │
│  - Guides AI agent           │     │  - Pure deterministic math     │
│  - API calls to make         │     │  - Accepts structured JSON     │
│  - Questions to ask user     │     │  - Outputs workpaper +         │
│  - Classification rules      │     │    Form C-S fields +           │
│  - SG tax rules reference    │     │    carry-forwards              │
└──────────────┬───────────────┘     └───────────────┬───────────────┘
               │                                      │
               └────────►  AI Agent  ◄────────────────┘
                    1. Reads reference docs
                    2. Pulls Jaz API data
                    3. Classifies GL items
                    4. Asks user questions
                    5. Assembles input JSON
                    6. Runs clio jobs statutory-filing sg-cs
                    7. Presents results + filing guidance
```

### CLI Commands

```bash
# Full computation (JSON input from wizard or file)
clio jobs statutory-filing sg-cs --input tax-data.json [--json]
echo '{ "ya": 2026, ... }' | clio jobs statutory-filing sg-cs --json

# Simple mode (manual flags)
clio jobs statutory-filing sg-cs --ya 2026 --revenue 500000 --profit 120000 --depreciation 15000 --exemption pte [--json]

# Capital allowance schedule (standalone)
clio jobs statutory-filing sg-ca --input assets.json [--json]
clio jobs statutory-filing sg-ca --ya 2026 --cost 50000 --category general --acquired 2024-06-15 [--json]
```

### Tax Reference Files

- **[references/sg-tax/overview.md](./references/sg-tax/overview.md)**: SG CIT framework: 17% rate, YA concept, Form C-S eligibility, key deadlines
- **[references/sg-tax/form-cs-fields.md](./references/sg-tax/form-cs-fields.md)**: All 18 Form C-S + 6 C-S Lite fields with IRAS labels and CLI mapping
- **[references/sg-tax/wizard-workflow.md](./references/sg-tax/wizard-workflow.md)**: Step-by-step wizard procedure for AI agents (the main playbook)
- **[references/sg-tax/data-extraction.md](./references/sg-tax/data-extraction.md)**: How to pull P&L, TB, GL, FA data from Jaz API for tax purposes
- **[references/sg-tax/add-backs-guide.md](./references/sg-tax/add-backs-guide.md)**: Classification guide: which expenses are non-deductible
- **[references/sg-tax/capital-allowances-guide.md](./references/sg-tax/capital-allowances-guide.md)**: CA rules per asset category with IRAS sections
- **[references/sg-tax/ifrs16-tax-adjustment.md](./references/sg-tax/ifrs16-tax-adjustment.md)**: IFRS 16 lease reversal procedure
- **[references/sg-tax/enhanced-deductions.md](./references/sg-tax/enhanced-deductions.md)**: R&D, IP, donations 250%, S14Q renovation
- **[references/sg-tax/exemptions-and-rebates.md](./references/sg-tax/exemptions-and-rebates.md)**: SUTE, PTE, CIT rebate schedule
- **[references/sg-tax/losses-and-carry-forwards.md](./references/sg-tax/losses-and-carry-forwards.md)**: Set-off order, loss/CA/donation carry-forward rules
