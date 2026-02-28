---
name: jaz-recipes
version: 4.16.0
description: 16 IFRS-compliant recipes for complex multi-step accounting in Jaz — prepaid amortization, deferred revenue, loan schedules, IFRS 16 leases, hire purchase, fixed deposits, asset disposal, FX revaluation, ECL provisioning, IAS 37 provisions, dividends, intercompany, and capital WIP. Each recipe includes journal entries, capsule structure, and verification steps. Paired with 13 financial calculators that produce execution-ready blueprints with workings.
license: MIT
compatibility: Works with Claude Code, Claude Cowork, Claude.ai, and any agent that reads markdown. For API payloads, load the jaz-api skill alongside this one.
---

# Transaction Recipes Skill

You are modeling **complex multi-step accounting scenarios** in Jaz — transactions that span multiple periods, involve changing amounts, or require several linked entries to complete a single business event.

**This skill provides conceptual recipes with full accounting logic. For API field names and payloads, load the `jaz-api` skill alongside this one.**

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

1. **[Prepaid Amortization](references/prepaid-amortization.md)** — Annual insurance, rent, or subscription paid upfront with monthly expense recognition via scheduler.

2. **[Deferred Revenue](references/deferred-revenue.md)** — Upfront customer payment for a service delivered over time, with monthly revenue recognition via scheduler.

### Tier 2 — Manual Journal Recipes (Calculated)

3. **[Accrued Expenses](references/accrued-expenses.md)** — Month-end expense accrual and start-of-month reversal using two schedulers with end dates, plus the actual supplier bill. *Paired calculator: `clio calc accrued-expense`*

4. **[Bank Loan](references/bank-loan.md)** — Loan disbursement, monthly installments splitting principal and interest, full amortization table with worked example.

5. **[IFRS 16 Lease](references/ifrs16-lease.md)** — Right-of-use asset recognition, lease liability unwinding with changing interest, native FA for ROU straight-line depreciation.

6. **[Declining Balance Depreciation](references/declining-balance.md)** — DDB/150DB methods with switch-to-straight-line logic, for assets where Jaz's native SL isn't appropriate.

7. **[Fixed Deposit](references/fixed-deposit.md)** — Placement, monthly interest accrual (simple or compound), and maturity settlement. IFRS 9 amortized cost. *Paired calculator: `clio calc fixed-deposit`*

8. **[Hire Purchase](references/hire-purchase.md)** — Like IFRS 16 lease but ownership transfers — ROU depreciation over useful life (not lease term). *Paired calculator: `clio calc lease --useful-life <months>`*

9. **[Asset Disposal](references/asset-disposal.md)** — Sale at gain, sale at loss, or scrap/write-off. Computes accumulated depreciation to disposal date and gain/loss. *Paired calculator: `clio calc asset-disposal`*

### Tier 3 — Month-End Close Recipes

10. **[FX Revaluation — Non-AR/AP Items](references/fx-revaluation.md)** — IAS 21 revaluation of non-AR/AP foreign currency monetary items (intercompany loans, term deposits, FX provisions) with Day 1 reversal. *Paired calculator: `clio calc fx-reval`*

11. **[Bad Debt Provision / ECL](references/bad-debt-provision.md)** — IFRS 9 simplified approach provision matrix using aged receivables and historical loss rates. *Paired calculator: `clio calc ecl`*

12. **[Employee Benefit Accruals](references/employee-accruals.md)** — IAS 19 leave accrual (scheduler, fixed monthly) and bonus accrual (manual journals, variable quarterly) with year-end true-up. *Paired calculator: `clio calc leave-accrual`*

### Tier 4 — Corporate Events & Structures

13. **[Provisions with PV Unwinding](references/provisions.md)** — IAS 37 provision recognized at PV, with monthly discount unwinding schedule. For warranties, legal claims, decommissioning, restructuring. *Paired calculator: `clio calc provision`*

14. **[Dividend Declaration & Payment](references/dividend.md)** — Board-declared dividend: two journals (declaration reducing retained earnings, then payment). Optional withholding tax adds a third step. *Paired calculator: `clio calc dividend`*

15. **[Intercompany Transactions](references/intercompany.md)** — Mirrored invoices/bills or journals across two Jaz entities with matching intercompany reference, quarterly settlement.

16. **[Capital WIP to Fixed Asset](references/capital-wip.md)** — Cost accumulation in CIP account during construction/development, transfer to FA on completion, auto-depreciation via Jaz FA module.

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

```bash
# ── Tier 2 Calculators ──────────────────────────────────────────

# Loan amortization (PMT, interest/principal split)
clio calc loan --principal 100000 --rate 6 --term 60 [--start-date 2025-01-01] [--currency SGD] [--json]

# IFRS 16 lease (PV, liability unwinding, ROU depreciation)
clio calc lease --payment 5000 --term 36 --rate 5 [--start-date 2025-01-01] [--currency SGD] [--json]

# Hire purchase (lease + ownership transfer — depreciate over useful life)
clio calc lease --payment 5000 --term 36 --rate 5 --useful-life 60 [--start-date 2025-01-01] [--currency SGD] [--json]

# Depreciation (DDB, 150DB, or straight-line)
clio calc depreciation --cost 50000 --salvage 5000 --life 5 [--method ddb|150db|sl] [--frequency annual|monthly] [--currency SGD] [--json]

# Prepaid expense recognition
clio calc prepaid-expense --amount 12000 --periods 12 [--frequency monthly|quarterly] [--start-date 2025-01-01] [--currency SGD] [--json]

# Deferred revenue recognition
clio calc deferred-revenue --amount 36000 --periods 12 [--frequency monthly|quarterly] [--start-date 2025-01-01] [--currency SGD] [--json]

# Fixed deposit — simple or compound interest accrual (IFRS 9)
clio calc fixed-deposit --principal 100000 --rate 3.5 --term 12 [--compound monthly|quarterly|annually] [--start-date 2025-01-01] [--currency SGD] [--json]

# Asset disposal — gain/loss on sale or scrap (IAS 16)
clio calc asset-disposal --cost 50000 --salvage 5000 --life 5 --acquired 2022-01-01 --disposed 2025-06-15 --proceeds 20000 [--method sl|ddb|150db] [--currency SGD] [--json]

# ── Tier 3 Calculators ──────────────────────────────────────────

# FX revaluation — unrealized gain/loss on non-AR/AP items (IAS 21)
clio calc fx-reval --amount 50000 --book-rate 1.35 --closing-rate 1.38 [--currency USD] [--base-currency SGD] [--json]

# Expected credit loss provision matrix (IFRS 9)
clio calc ecl --current 100000 --30d 50000 --60d 20000 --90d 10000 --120d 5000 --rates 0.5,2,5,10,50 [--existing-provision 3000] [--currency SGD] [--json]

# ── Tier 4 Calculator ───────────────────────────────────────────

# IAS 37 provision PV + discount unwinding schedule
clio calc provision --amount 500000 --rate 4 --term 60 [--start-date 2025-01-01] [--currency SGD] [--json]

# ── New Calculators ────────────────────────────────────────────

# Accrued expense — dual-entry (accrue at period-end, reverse next month)
clio calc accrued-expense --amount 5000 --periods 12 [--frequency monthly|quarterly] [--start-date 2025-01-31] [--currency SGD] [--json]

# Employee leave accrual (IAS 19) — monthly accrual of annual leave entitlements
clio calc leave-accrual --employees 10 --days 14 --daily-rate 250 [--periods 12] [--start-date 2025-01-31] [--currency SGD] [--json]

# Dividend declaration + payment — optional withholding tax
clio calc dividend --amount 200000 --declaration-date 2026-02-15 --payment-date 2026-03-15 [--withholding-rate 15] [--currency SGD] [--json]

# ── Reconciliation Calculator ─────────────────────────────────

# Bank reconciliation matcher — 5-phase cascade (1:1, N:1, 1:N, N:M)
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

## Cross-References

- **API field names and payloads**: Load the `jaz-api` skill — see `references/endpoints.md` and `references/field-map.md`
- **Capsule API**: `POST /capsules`, `POST /capsuleTypes` — see api skill's `references/full-api-surface.md`
- **Scheduler API**: `POST /scheduled/journals`, `POST /scheduled/invoices`, `POST /scheduled/bills`
- **Fixed Assets API**: `POST /fixed-assets` — see api skill's `references/feature-glossary.md`
- **Enrichments overview**: See `references/building-blocks.md` or api skill's `references/feature-glossary.md`
