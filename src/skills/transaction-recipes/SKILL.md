---
name: jaz-recipes
version: 5.4.36
description: >-
  Use this skill when modeling complex multi-step accounting transactions —
  anything that spans multiple periods, involves changing amounts, or requires
  linked entries. Covers 16 IFRS-compliant recipes (prepaid amortization,
  deferred revenue, loans, IFRS 16 leases, hire purchase, fixed deposits,
  asset disposal, FX revaluation, ECL, IAS 37 provisions, dividends,
  intercompany, capital WIP) and 13 financial calculators that produce
  execution-ready blueprints. Also use when the user mentions depreciation,
  amortization, lease accounting, loan schedules, or any IFRS calculation.
license: MIT
compatibility: Works with Claude Code, Claude Cowork, Claude.ai, and any agent that reads markdown. For API payloads, load the jaz-api skill alongside this one. For engagement-type context (which recipes typically appear in monthly-close vs quarterly-gst vs annual-statutory), load the jaz-practice skill.
---

# Transaction Recipes Skill

You are modeling **complex multi-step accounting scenarios** in Jaz — transactions that span multiple periods, involve changing amounts, or require several linked entries to complete a single business event.

> **Jaz-native, not generic.** Every recipe in this skill is designed around the Jaz recipe engine (`plan_recipe` / `execute_recipe`), Jaz capsule types, Jaz CoA classifications, and Jaz scheduler primitives. It is NOT an interchangeable IFRS reference; it is the operating manual for posting these transactions through the Jaz ledger. If you find yourself hand-constructing journal entries from this skill, you have skipped step 1 — invoke `plan_recipe(recipe: ...)` first and let the engine emit the entries.

**This skill provides Jaz-contextual recipes with full accounting logic. For API field names and payloads, load the `jaz-api` skill alongside this one. For end-to-end execution within a practitioner engagement (which recipes appear in `monthly-close`, `quarterly-gst`, `annual-statutory`, `onboarding`), load the `jaz-practice` skill — it specifies which `CLIENT.md` fields drive the recipe parameters and what error classes to expect.**

## When to Use This Skill

- Setting up prepaid expenses, deferred revenue, or accrued liabilities
- Modeling loan repayment schedules with amortization tables
- Implementing IFRS 16 lease accounting (right-of-use assets + lease liabilities)
- Recording hire purchase agreements (ownership transfers, depreciate over useful life)
- Recording depreciation using methods Jaz doesn't natively support (declining balance, 150DB)
- Managing fixed deposit placements with interest accrual schedules (IFRS 9)
- Disposing of fixed assets — sale, scrap, or write-off with gain/loss calculation (IAS 16)
- FX revaluation of non-AR/AP monetary items at period-end (IAS 21)
- Calculating expected credit loss provisions on aged receivables (IFRS 9)
- Accruing employee leave and bonus obligations (IAS 19)
- Recognizing provisions at PV with discount unwinding (IAS 37)
- Declaring and paying dividends
- Recording and reconciling intercompany transactions across entities
- Capitalizing costs in WIP and transferring to fixed assets
- Any scenario that groups related transactions in a capsule over multiple periods

## Building Blocks

Every recipe uses a combination of these Jaz features. See `references/building-blocks.md` for details.

| Building Block | Role in Recipes |
|---|---|
| **Capsules** | Group all related entries into one workflow container |
| **Schedulers** | Automate fixed-amount recurring journals (prepaid, deferred, leave) |
| **Manual Journals** | Record variable-amount entries (loan interest, IFRS 16 unwinding, FX reval, ECL) |
| **Fixed Assets** | Native straight-line depreciation for ROU assets and completed capital projects |
| **Invoices / Bills** | Trade documents for intercompany, supplier bills for capital WIP |
| **Tracking Tags** | Tag all entries in a scenario for report filtering |
| **Nano Classifiers** | Classify line items by department, cost center, or project |
| **Custom Fields** | Record reference numbers (policy, loan, lease contract, intercompany ref) |

## Key Principle: Schedulers vs Manual Journals

Jaz schedulers generate **fixed-amount** recurring entries. This determines which recipe pattern to use:

- **Fixed amounts each period** → Use a scheduler inside a capsule (automated)
- **Variable amounts each period** → Use manual journals inside a capsule (calculated per period)
- **One-off or two-entry events** → Use manual journals (e.g., dividend declaration + payment)

| Recipe | Pattern | Why |
|---|---|---|
| Prepaid Amortization | Scheduler + capsule | Same amount each month |
| Deferred Revenue | Scheduler + capsule | Same amount each month |
| Accrued Expenses | Two schedulers + capsule | Accrual + reversal cycle with end dates |
| Employee Leave Accrual | Scheduler + capsule | Fixed monthly accrual |
| Bank Loan | Manual journals + capsule | Interest changes as principal reduces |
| IFRS 16 Lease | Hybrid (native FA + manual journals) + capsule | ROU depreciation is fixed; liability unwinding changes |
| Declining Balance | Manual journals + capsule | Depreciation changes as book value reduces |
| FX Revaluation | Manual journals + capsule | Rates change each period |
| ECL Provision | Manual journals + capsule | Receivables and rates change each quarter |
| Fixed Deposit | Cash-out + manual journals + cash-in + capsule | Placement, monthly accruals, maturity |
| Hire Purchase | Manual journals + FA registration + capsule | Like IFRS 16 but depreciate over useful life |
| Asset Disposal | Manual journal + FA deregistration | One-off compound entry + FA update |
| Provisions (IAS 37) | Manual journals + cash-out + capsule | Unwinding amount changes each month |
| Bonus Accrual | Manual journals + capsule | Revenue/profit changes each quarter |
| Dividends | Manual journals + capsule | One-off: declaration + payment |
| Intercompany | Invoices/bills + capsule | Mirrored entries in two entities |
| Capital WIP | Bills/journals + FA registration + capsule | Accumulate then transfer |

## Recipe Index

Each recipe includes: scenario description, accounts involved, journal entries, capsule structure, worked example with real numbers, enrichment suggestions, verification steps, and common variations.

### Tier 1 — Scheduler Recipes (Automated)

1. **[Prepaid Amortization](references/prepaid-amortization.md)** — Annual insurance, rent, or subscription paid upfront with monthly expense recognition via scheduler. *Typical engagement context: monthly-close (period-end recognition step inside `generate_month_end_blueprint`); set up once during onboarding when prior firm hands over a prepaid schedule.*

2. **[Deferred Revenue](references/deferred-revenue.md)** — Upfront customer payment for a service delivered over time, with monthly revenue recognition via scheduler. *Typical engagement context: monthly-close (revenue recognition step inside `generate_month_end_blueprint`); also reviewed at year-end inside `generate_year_end_blueprint` for true-up.*

### Tier 2 — Manual Journal Recipes (Calculated)

3. **[Accrued Expenses](references/accrued-expenses.md)** — Month-end expense accrual and start-of-month reversal using two schedulers with end dates, plus the actual supplier bill. *Paired calculator: `clio calc accrued-expense`. Typical engagement context: monthly-close (accruals step inside `generate_month_end_blueprint`, driven by `CLIENT.md.recurring_accruals`).*

4. **[Bank Loan](references/bank-loan.md)** — Loan disbursement, monthly installments splitting principal and interest, full amortization table with worked example. *Typical engagement context: ad-hoc (one-off setup at loan drawdown, then monthly-close picks up each installment journal via the scheduler the recipe creates).*

5. **[IFRS 16 Lease](references/ifrs16-lease.md)** — Right-of-use asset recognition, lease liability unwinding with changing interest, native FA for ROU straight-line depreciation. *Typical engagement context: monthly-close (depreciation + liability unwinding booking each period inside `generate_month_end_blueprint`) and annual-statutory (ROU register sign-off inside `generate_fa_review_blueprint` + `generate_year_end_blueprint`).*

6. **[Declining Balance Depreciation](references/declining-balance.md)** — DDB/150DB methods with switch-to-straight-line logic, for assets where Jaz's native SL isn't appropriate. *Typical engagement context: monthly-close (depreciation booking inside `generate_month_end_blueprint`) and annual-statutory (asset register review inside `generate_fa_review_blueprint`).*

7. **[Fixed Deposit](references/fixed-deposit.md)** — Placement, monthly interest accrual (simple or compound), and maturity settlement. IFRS 9 amortized cost. *Paired calculator: `clio calc fixed-deposit`. Typical engagement context: monthly-close (interest accrual journal each period inside `generate_month_end_blueprint`); placement + maturity events handled ad-hoc.*

8. **[Hire Purchase](references/hire-purchase.md)** — Like IFRS 16 lease but ownership transfers — ROU depreciation over useful life (not lease term). *Paired calculator: `clio calc lease --useful-life <months>`. Typical engagement context: monthly-close (monthly depreciation + interest unwinding inside `generate_month_end_blueprint`) and annual-statutory (asset register sign-off inside `generate_fa_review_blueprint`).*

9. **[Asset Disposal](references/asset-disposal.md)** — Sale at gain, sale at loss, or scrap/write-off. Computes accumulated depreciation to disposal date and gain/loss. *Paired calculator: `clio calc asset-disposal`. Typical engagement context: ad-hoc (triggered by client disposal event) and annual-statutory (year-end asset register review inside `generate_fa_review_blueprint` surfaces unposted disposals).*

### Tier 3 — Month-End Close Recipes

10. **[FX Revaluation — verification only](references/fx-revaluation.md)** — Jaz auto-handles ALL period-end IAS 21.23 FX translation (AR, AP, cash, bank, intercompany, term deposits, FX provisions). The recipe and `clio calc fx-reval` are for VERIFICATION ONLY (independent cross-check vs what Jaz auto-posted). Do NOT invoke `execute_recipe(recipe: 'fx-reval', ...)` — would double-post. *Typical engagement context: monthly-close / quarterly-gst / annual-statutory step 6 verification flow.*

11. **[Bad Debt Provision / ECL](references/bad-debt-provision.md)** — IFRS 9 simplified approach provision matrix using aged receivables and historical loss rates. *Paired calculator: `clio calc ecl`. Typical engagement context: quarterly-gst (ECL is reviewed alongside the F5 prep cycle since AR aging is already pulled) and annual-statutory (year-end ECL true-up inside `generate_year_end_blueprint`).*

12. **[Employee Benefit Accruals](references/employee-accruals.md)** — IAS 19 leave accrual (scheduler, fixed monthly) and bonus accrual (manual journals, variable quarterly) with year-end true-up. *Paired calculator: `clio calc leave-accrual`. Typical engagement context: monthly-close (leave-accrual scheduler runs inside `generate_month_end_blueprint`); bonus accrual revisited at quarter and annual-statutory (true-up inside `generate_year_end_blueprint`).*

### Tier 4 — Corporate Events & Structures

13. **[Provisions with PV Unwinding](references/provisions.md)** — IAS 37 provision recognized at PV, with monthly discount unwinding schedule. For warranties, legal claims, decommissioning, restructuring. *Paired calculator: `clio calc provision`. Typical engagement context: monthly-close (monthly discount-unwinding journal inside `generate_month_end_blueprint`); initial recognition triggered ad-hoc when the obligating event occurs.*

14. **[Dividend Declaration & Payment](references/dividend.md)** — Board-declared dividend: two journals (declaration reducing retained earnings, then payment). Optional withholding tax adds a third step. *Paired calculator: `clio calc dividend`. Typical engagement context: annual-statutory (dividend declaration is part of `generate_year_end_blueprint` after profit is finalized) or ad-hoc (interim dividends).*

15. **[Intercompany Transactions](references/intercompany.md)** — Mirrored invoices/bills or journals across two Jaz entities with matching intercompany reference, quarterly settlement. *Typical engagement context: monthly-close (mirror entries booked each period inside `generate_month_end_blueprint`) and annual-statutory (intercompany elimination + confirmation inside `generate_audit_prep_blueprint`).*

16. **[Capital WIP to Fixed Asset](references/capital-wip.md)** — Cost accumulation in CIP account during construction/development, transfer to FA on completion, auto-depreciation via Jaz FA module. *Typical engagement context: monthly-close (cost accumulation each period) and annual-statutory (transfer to FA + commissioning review inside `generate_fa_review_blueprint`).*

## How to Use These Recipes

1. **Read the recipe** for your scenario — understand the accounts, journal entries, and capsule structure.
2. **Create the accounts** listed in the "Accounts Involved" table (if they don't already exist in the CoA).
3. **Create the capsule** with an appropriate capsule type.
4. **Run the calculator** (if available) to generate exact amounts: `clio calc <command> --json` gives you a complete blueprint.
5. **Record the initial transaction** (bill, invoice, or journal) — assign it to the capsule.
6. **For scheduler recipes**: Create the scheduler with the same capsule — it generates all subsequent entries automatically.
7. **For manual journal recipes**: Record each period's journal using the calculator output or worked example, always assigning to the same capsule.
8. **Verify** using the steps in each recipe (ledger grouping by capsule, trial balance checks).

## Financial Calculators (CLI)

The `jaz-clio` CLI includes 13 IFRS-compliant financial calculators. Each produces a formatted schedule + per-period journal entries + human-readable workings. Use `--json` for structured output with a complete **blueprint** — capsule type/name, tags, custom fields, workings (capsuleDescription), and every step with action type, date, accounts, and amounts.

All calculators support `--currency <code>` and `--json`.

Each calculator has a typical engagement context — see the line after each command for which engagement type from `jaz-practice` typically invokes it.

```bash
# ── Tier 2 Calculators ──────────────────────────────────────────

# Loan amortization (PMT, interest/principal split)
# Typical engagement context: ad-hoc (one-off setup at drawdown), then monthly-close (per-installment journal)
clio calc loan --principal 100000 --rate 6 --term 60 [--start-date 2025-01-01] [--currency SGD] [--json]

# IFRS 16 lease (PV, liability unwinding, ROU depreciation)
# Typical engagement context: monthly-close (per-period journal) + annual-statutory (ROU register review)
clio calc lease --payment 5000 --term 36 --rate 5 [--start-date 2025-01-01] [--currency SGD] [--json]

# Hire purchase (lease + ownership transfer — depreciate over useful life)
# Typical engagement context: monthly-close (per-period journal) + annual-statutory (asset register review)
clio calc lease --payment 5000 --term 36 --rate 5 --useful-life 60 [--start-date 2025-01-01] [--currency SGD] [--json]

# Depreciation (DDB, 150DB, or straight-line)
# Typical engagement context: monthly-close (period depreciation booking) + annual-statutory (FA review)
clio calc depreciation --cost 50000 --salvage 5000 --life 5 [--method ddb|150db|sl] [--frequency annual|monthly] [--currency SGD] [--json]

# Prepaid expense recognition
# Typical engagement context: monthly-close (period recognition); set up at onboarding when prior firm hands over the schedule
clio calc prepaid-expense --amount 12000 --periods 12 [--frequency monthly|quarterly] [--start-date 2025-01-01] [--currency SGD] [--json]

# Deferred revenue recognition
# Typical engagement context: monthly-close (period recognition) + annual-statutory (year-end true-up)
clio calc deferred-revenue --amount 36000 --periods 12 [--frequency monthly|quarterly] [--start-date 2025-01-01] [--currency SGD] [--json]

# Fixed deposit — simple or compound interest accrual (IFRS 9)
# Typical engagement context: monthly-close (interest accrual journal); placement + maturity handled ad-hoc
clio calc fixed-deposit --principal 100000 --rate 3.5 --term 12 [--compound monthly|quarterly|annually] [--start-date 2025-01-01] [--currency SGD] [--json]

# Asset disposal — gain/loss on sale or scrap (IAS 16)
# Typical engagement context: ad-hoc (triggered by disposal event) + annual-statutory (FA review surfaces unposted disposals)
clio calc asset-disposal --cost 50000 --salvage 5000 --life 5 --acquired 2022-01-01 --disposed 2025-06-15 --proceeds 20000 [--method sl|ddb|150db] [--currency SGD] [--json]

# ── Tier 3 Calculators ──────────────────────────────────────────

# FX revaluation — unrealized gain/loss on non-AR/AP items (IAS 21)
# Typical engagement context: monthly-close (period-end FX reval) + annual-statutory (year-end revaluation)
clio calc fx-reval --amount 50000 --book-rate 1.35 --closing-rate 1.38 [--currency USD] [--base-currency SGD] [--json]

# Expected credit loss provision matrix (IFRS 9)
# Typical engagement context: quarterly-gst (ECL reviewed alongside F5 prep cycle) + annual-statutory (year-end ECL true-up)
clio calc ecl --current 100000 --30d 50000 --60d 20000 --90d 10000 --120d 5000 --rates 0.5,2,5,10,50 [--existing-provision 3000] [--currency SGD] [--json]

# ── Tier 4 Calculator ───────────────────────────────────────────

# IAS 37 provision PV + discount unwinding schedule
# Typical engagement context: monthly-close (monthly discount unwinding); initial recognition triggered ad-hoc
clio calc provision --amount 500000 --rate 4 --term 60 [--start-date 2025-01-01] [--currency SGD] [--json]

# ── New Calculators ────────────────────────────────────────────

# Accrued expense — dual-entry (accrue at period-end, reverse next month)
# Typical engagement context: monthly-close (driven by CLIENT.md.recurring_accruals during `generate_month_end_blueprint`)
clio calc accrued-expense --amount 5000 --periods 12 [--frequency monthly|quarterly] [--start-date 2025-01-31] [--currency SGD] [--json]

# Employee leave accrual (IAS 19) — monthly accrual of annual leave entitlements
# Typical engagement context: monthly-close (scheduler runs each period); bonus accrual revisited at quarter + annual-statutory true-up
clio calc leave-accrual --employees 10 --days 14 --daily-rate 250 [--periods 12] [--start-date 2025-01-31] [--currency SGD] [--json]

# Dividend declaration + payment — optional withholding tax
# Typical engagement context: annual-statutory (post year-end profit finalization inside `generate_year_end_blueprint`) or ad-hoc (interim dividends)
clio calc dividend --amount 200000 --declaration-date 2026-02-15 --payment-date 2026-03-15 [--withholding-rate 15] [--currency SGD] [--json]

# ── Reconciliation Calculator ─────────────────────────────────

# Bank reconciliation matcher — 5-phase cascade (1:1, N:1, 1:N, N:M)
# Typical engagement context: monthly-close (run inside `generate_bank_recon_blueprint` as part of every period close)
clio jobs bank-recon match --input bank-data.json [--tolerance 0.01] [--date-window 14] [--max-group 5] [--json]
```

### Blueprint Output (`--json`)

Every calculator's `--json` output includes a `blueprint` object — a complete execution plan for creating the capsule and posting all transactions in Jaz:

```json
{
  "type": "loan",
  "currency": "SGD",
  "blueprint": {
    "capsuleType": "Loan Repayment",
    "capsuleName": "Bank Loan — SGD 100,000 — 6% — 60 months",
    "capsuleDescription": "Loan Amortization Workings\nPrincipal: SGD 100,000.00 | Rate: 6% p.a. ...",
    "tags": ["Bank Loan"],
    "customFields": { "Loan Reference": null },
    "steps": [
      {
        "step": 1,
        "action": "cash-in",
        "description": "Record loan proceeds received from bank",
        "date": "2025-01-01",
        "lines": [
          { "account": "Cash / Bank Account", "debit": 100000, "credit": 0 },
          { "account": "Loan Payable", "debit": 0, "credit": 100000 }
        ]
      }
    ]
  }
}
```

**Blueprint action types** — each step tells you HOW to execute it in Jaz:

| Action | When used | Jaz module |
|---|---|---|
| `bill` | Supplier document (prepaid expense) | Bills |
| `invoice` | Customer document (deferred revenue) | Invoices |
| `cash-in` | Cash arrives in bank (loan disbursement, FD maturity) | Bank / Manual Journal |
| `cash-out` | Cash leaves bank (FD placement, provision settlement) | Bank / Manual Journal |
| `journal` | No cash movement (accrual, depreciation, unwinding, reval) | Manual Journals |
| `fixed-asset` | Register/update FA module (ROU asset, capital project) | Fixed Assets |
| `note` | Instruction only (deregister FA on disposal) | N/A |

**Math guarantees:**
- `financial` npm package (TypeScript port of numpy-financial) for PV, PMT — no hand-rolled TVM
- 2dp per period, final period closes balance to exactly $0.00
- Input validation with clear error messages (negative values, invalid dates, salvage > cost)
- DDB→SL switch when straight-line >= declining balance or when DDB would breach salvage floor
- All journal entries balanced (debits = credits in every step)

## Agent Tools (Daemon)

When running as a daemon agent (`clio serve`), recipes are available via two dedicated tools:

- **`plan_recipe`** (read-only): Run a calculator and see what accounts, contacts, and bank accounts are needed — no API calls. Use this first to verify requirements.
- **`execute_recipe`** (write): Full end-to-end recipe execution — run calculator, auto-resolve accounts from chart of accounts, create capsule, post all entries. **1 tool call replaces ~20 manual tool calls.**

Both tools accept all 13 recipe types: loan, lease, depreciation, prepaid-expense, deferred-revenue, fx-reval, ecl, provision, fixed-deposit, asset-disposal, accrued-expense, leave-accrual, dividend.

Scheduler creation tools are also available: `create_scheduled_journal`, `create_scheduled_invoice`, `create_scheduled_bill`.

## See Also

- **API field names and payloads**: Load the `jaz-api` skill — see `references/endpoints.md` and `references/field-map.md`
- **Capsule API**: `POST /capsules`, `POST /capsuleTypes` — see api skill's `references/full-api-surface.md`
- **Scheduler API**: `POST /scheduled/journals`, `POST /scheduled/invoices`, `POST /scheduled/bills`
- **Fixed Assets API**: `POST /fixed-assets` — see api skill's `references/feature-glossary.md`
- **Enrichments overview**: See `references/building-blocks.md` or api skill's `references/feature-glossary.md`
- **Engagement-type wrapper (jaz-practice)**: For the engagement-type that drives these recipes inside a client folder, see `jaz-practice/references/monthly-close.md` (period-end recognition + accruals + FX reval), `jaz-practice/references/quarterly-gst.md` (ECL review during F5 prep), and `jaz-practice/references/annual-statutory.md` (year-end true-ups, dividends, intercompany elimination). The jaz-practice skill supplies CLIENT.md context (COA mapping, materiality, JAZ_API_KEY override) that these recipes consume.
