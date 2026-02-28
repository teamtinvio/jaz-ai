---
name: jaz-jobs
version: 4.16.0
description: 12 accounting jobs for SMB bookkeepers and accountants — month-end, quarter-end, and year-end close playbooks plus 9 ad-hoc operational jobs (bank recon, document collection, GST/VAT filing, payment runs, credit control, supplier recon, audit prep, fixed asset review, statutory filing). Jobs can have paired tools as nested subcommands (e.g., `clio jobs bank-recon match`, `clio jobs document-collection ingest`, `clio jobs statutory-filing sg-cs`). Paired with an interactive CLI blueprint generator (clio jobs).
license: MIT
compatibility: Works with Claude Code, Claude Cowork, Claude.ai, and any agent that reads markdown. For API payloads, load the jaz-api skill. For individual transaction patterns, load the jaz-recipes skill.
---

# Jobs Skill

You are helping an **SMB accountant or bookkeeper** complete recurring accounting tasks in Jaz — period-end closes, bank reconciliation, tax filing, payment processing, and operational reviews. These are the real jobs that keep the books accurate and the business compliant.

**Jobs combine recipes, calculators, and API calls into complete business processes.** If recipes are ingredients, jobs are the meal.

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

Period-close jobs build on each other. Quarter = month + extras. Year = quarter + extras. Each level runs **standalone by default** (includes all steps from lower levels). Use `--incremental` to generate only the extras.

| Job | CLI Command | Description |
|-----|-------------|-------------|
| **Month-End Close** | `clio jobs month-end --period YYYY-MM` | 5 phases: pre-close prep, accruals, valuations, verification, lock. The foundation. |
| **Quarter-End Close** | `clio jobs quarter-end --period YYYY-QN` | Month-end for each month + GST/VAT, ECL review, bonus accruals, intercompany, provisions. |
| **Year-End Close** | `clio jobs year-end --period YYYY` | Quarter-end for each quarter + true-ups, dividends, CYE rollover, audit prep, final lock. |

### Ad-Hoc Jobs

| Job | CLI Command | Description |
|-----|-------------|-------------|
| **Bank Recon** | `clio jobs bank-recon` | Clear unreconciled items: match, categorize, resolve. Paired tool: `clio jobs bank-recon match`. |
| **Document Collection** | `clio jobs document-collection` | Scan and classify client documents from local directories and cloud links (Dropbox, Drive, OneDrive). Outputs file paths for agent upload. Paired tool: `clio jobs document-collection ingest`. |
| **GST/VAT Filing** | `clio jobs gst-vat --period YYYY-QN` | Tax ledger review, discrepancy check, filing summary. |
| **Payment Run** | `clio jobs payment-run` | Select outstanding bills by due date, process payments. |
| **Credit Control** | `clio jobs credit-control` | AR aging review, overdue chase list, bad debt assessment. |
| **Supplier Recon** | `clio jobs supplier-recon` | AP vs supplier statement, identify mismatches. |
| **Audit Preparation** | `clio jobs audit-prep --period YYYY` | Compile reports, schedules, reconciliations for auditor/tax. |
| **FA Review** | `clio jobs fa-review` | Fixed asset register review, disposal/write-off processing. |
| **Statutory Filing** | `clio jobs statutory-filing` | Corporate income tax computation and filing. Paired tools: `clio jobs statutory-filing sg-cs`, `clio jobs statutory-filing sg-ca`. |

## How Jobs Work

Each job produces a **blueprint** — a phased checklist of steps, each annotated with:

- **API call** — the exact endpoint + request body to execute the step
- **Recipe reference** — link to the transaction-recipes skill for complex accounting patterns
- **Calculator command** — `clio calc` command for financial calculations
- **Verification check** — how to confirm the step was completed correctly
- **Conditional flag** — steps that only apply in certain situations (e.g., "only if multi-currency org")

**For AI agents:** Read the blueprint and execute each step using the jaz-api skill for payloads.
**For developers:** Use `--json` output to build automation pipelines.
**For accountants:** Use the formatted checklist to work through the close systematically.

## CLI Usage

```bash
# Period-close (standalone = full plan, --incremental = extras only)
clio jobs month-end --period 2025-01 [--currency SGD] [--json]
clio jobs quarter-end --period 2025-Q1 [--incremental] [--json]
clio jobs year-end --period 2025 [--incremental] [--json]

# Ad-hoc
clio jobs bank-recon [--account "DBS Current"] [--period 2025-01] [--json]
clio jobs gst-vat --period 2025-Q1 [--json]
clio jobs payment-run [--due-before 2025-02-28] [--json]
clio jobs credit-control [--overdue-days 30] [--json]
clio jobs supplier-recon [--supplier "Acme Corp"] [--period 2025-01] [--json]
clio jobs audit-prep --period 2025 [--json]
clio jobs fa-review [--json]
```

## Relationship to Other Skills

| Skill | Role |
|-------|------|
| **jaz-api** | Provides the exact API payloads for each step (field names, gotchas, error handling) |
| **jaz-recipes** | Provides the accounting patterns for complex steps (accruals, FX reval, ECL, etc.) |
| **jaz-jobs** (this skill) | Combines recipes + API into sequenced, verifiable business processes |

**Load all three skills together** for the complete picture. Jobs reference recipes by name — an AI agent should read the referenced recipe for implementation details.

## Supporting Files

- **[references/building-blocks.md](./references/building-blocks.md)** — Shared concepts: accounting periods, lock dates, period verification, conventions
- **[references/month-end-close.md](./references/month-end-close.md)** — Month-end close: 5 phases, ~18 steps
- **[references/quarter-end-close.md](./references/quarter-end-close.md)** — Quarter-end close: monthly + quarterly extras
- **[references/year-end-close.md](./references/year-end-close.md)** — Year-end close: quarterly + annual extras
- **[references/bank-recon.md](./references/bank-recon.md)** — Bank reconciliation catch-up
- **[references/bank-match.md](./references/bank-match.md)** — Bank reconciliation matcher: 5-phase cascade algorithm (1:1, N:1, 1:N, N:M matches)
- **[references/document-collection.md](./references/document-collection.md)** — Document collection: scan, classify, upload — local + cloud (Dropbox, Drive, OneDrive)
- **[references/gst-vat-filing.md](./references/gst-vat-filing.md)** — GST/VAT filing preparation
- **[references/payment-run.md](./references/payment-run.md)** — Payment run (bulk bill payments)
- **[references/credit-control.md](./references/credit-control.md)** — Credit control / AR chase
- **[references/supplier-recon.md](./references/supplier-recon.md)** — Supplier statement reconciliation
- **[references/audit-prep.md](./references/audit-prep.md)** — Audit preparation pack
- **[references/fa-review.md](./references/fa-review.md)** — Fixed asset register review

## Tax Computation — Singapore Form C-S

Corporate income tax computation for Singapore-incorporated companies. The AI agent acts as the **tax wizard** — pulling data from Jaz, classifying GL items, asking the user targeted questions, and assembling the input for the CLI computation engine.

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

- **[references/sg-tax/overview.md](./references/sg-tax/overview.md)** — SG CIT framework: 17% rate, YA concept, Form C-S eligibility, key deadlines
- **[references/sg-tax/form-cs-fields.md](./references/sg-tax/form-cs-fields.md)** — All 18 Form C-S + 6 C-S Lite fields with IRAS labels and CLI mapping
- **[references/sg-tax/wizard-workflow.md](./references/sg-tax/wizard-workflow.md)** — Step-by-step wizard procedure for AI agents (the main playbook)
- **[references/sg-tax/data-extraction.md](./references/sg-tax/data-extraction.md)** — How to pull P&L, TB, GL, FA data from Jaz API for tax purposes
- **[references/sg-tax/add-backs-guide.md](./references/sg-tax/add-backs-guide.md)** — Classification guide: which expenses are non-deductible
- **[references/sg-tax/capital-allowances-guide.md](./references/sg-tax/capital-allowances-guide.md)** — CA rules per asset category with IRAS sections
- **[references/sg-tax/ifrs16-tax-adjustment.md](./references/sg-tax/ifrs16-tax-adjustment.md)** — IFRS 16 lease reversal procedure
- **[references/sg-tax/enhanced-deductions.md](./references/sg-tax/enhanced-deductions.md)** — R&D, IP, donations 250%, S14Q renovation
- **[references/sg-tax/exemptions-and-rebates.md](./references/sg-tax/exemptions-and-rebates.md)** — SUTE, PTE, CIT rebate schedule
- **[references/sg-tax/losses-and-carry-forwards.md](./references/sg-tax/losses-and-carry-forwards.md)** — Set-off order, loss/CA/donation carry-forward rules
