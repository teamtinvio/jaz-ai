---
name: jaz-recipes
version: 5.24.11
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
compatibility: Works with Claude Code, Claude Cowork, Claude.ai, and any agent that reads markdown. For API payloads, load the jaz-api skill alongside this one. For the operational close workflows these recipes plug into (month-end close, GST/VAT filing, year-end close), load the jaz-jobs skill.
---

# Transaction Recipes Skill

You are modeling **complex multi-step accounting scenarios** in Jaz — transactions that span multiple periods, involve changing amounts, or require several linked entries to complete a single business event.

> **Jaz-native, not generic.** Every recipe in this skill is designed around the Jaz recipe engine (`plan_recipe` / `execute_recipe`), Jaz capsule types, Jaz CoA classifications, and Jaz scheduler primitives. It is NOT an interchangeable IFRS reference; it is the operating manual for posting these transactions through the Jaz ledger. If you find yourself hand-constructing journal entries from this skill, you have skipped step 1 — invoke `plan_recipe(recipe: ...)` first and let the engine emit the entries.

**This skill provides Jaz-contextual recipes with full accounting logic. For API field names and payloads, load the `jaz-api` skill alongside this one. For the operational close workflows that invoke these recipes (month-end close, GST/VAT filing, year-end close), load the `jaz-jobs` skill.**

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

If a scenario genuinely fits either pattern, record the pick once the entries post: `jot(kind: METHOD)` naming the pattern chosen and the deciding fact.

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

1. **[Prepaid Amortization](references/prepaid-amortization.md)** — Annual insurance, rent, or subscription paid upfront with monthly expense recognition via scheduler. *Typical context: month-end close (period-end recognition step inside the month-end close); set up once at data migration when the prior system hands over a prepaid schedule.*

2. **[Deferred Revenue](references/deferred-revenue.md)** — Upfront customer payment for a service delivered over time, with monthly revenue recognition via scheduler. *Typical context: month-end close (revenue recognition step inside the month-end close); also reviewed at year-end inside the year-end close for true-up.*

### Tier 2 — Manual Journal Recipes (Calculated)

3. **[Accrued Expenses](references/accrued-expenses.md)** — Month-end expense accrual and start-of-month reversal using two schedulers with end dates, plus the actual supplier bill. *Paired calculator: `clio calc accrued-expense`. Typical context: month-end close (accruals step inside the month-end close).*

4. **[Bank Loan](references/bank-loan.md)** — Loan disbursement, monthly installments splitting principal and interest, full amortization table with worked example. *Typical context: ad-hoc (one-off setup at loan drawdown, then month-end close picks up each installment journal via the scheduler the recipe creates).*

5. **[IFRS 16 Lease](references/ifrs16-lease.md)** — Right-of-use asset recognition, lease liability unwinding with changing interest, native FA for ROU straight-line depreciation. *Typical context: month-end close (depreciation + liability unwinding booking each period inside the month-end close) and year-end (ROU register sign-off inside the fixed-asset review + the year-end close).*

6. **[Declining Balance Depreciation](references/declining-balance.md)** — DDB/150DB methods with switch-to-straight-line logic, for assets where Jaz's native SL isn't appropriate. *Typical context: month-end close (depreciation booking inside the month-end close) and year-end (asset register review inside the fixed-asset review).*

7. **[Fixed Deposit](references/fixed-deposit.md)** — Placement, monthly interest accrual (simple or compound), and maturity settlement. IFRS 9 amortized cost. *Paired calculator: `clio calc fixed-deposit`. Typical context: month-end close (interest accrual journal each period inside the month-end close); placement + maturity events handled ad-hoc.*

8. **[Hire Purchase](references/hire-purchase.md)** — Like IFRS 16 lease but ownership transfers — ROU depreciation over useful life (not lease term). *Paired calculator: `clio calc lease --useful-life <months>`. Typical context: month-end close (monthly depreciation + interest unwinding inside the month-end close) and year-end (asset register sign-off inside the fixed-asset review).*

9. **[Asset Disposal](references/asset-disposal.md)** — Sale at gain, sale at loss, or scrap/write-off. Computes accumulated depreciation to disposal date and gain/loss. *Paired calculator: `clio calc asset-disposal`. Typical context: ad-hoc (triggered by a disposal event) and year-end (asset register review inside the fixed-asset review surfaces unposted disposals).*

### Tier 3 — Month-End Close Recipes

10. **[FX Revaluation — verification only](references/fx-revaluation.md)** — Jaz auto-handles ALL period-end IAS 21.23 FX translation (AR, AP, cash, bank, intercompany, term deposits, FX provisions). The recipe and `clio calc fx-reval` are for VERIFICATION ONLY (independent cross-check vs what Jaz auto-posted). Do NOT invoke `execute_recipe(recipe: 'fx-reval', ...)` — would double-post. *Typical context: period-end / year-end FX verification flow.*

11. **[Bad Debt Provision / ECL](references/bad-debt-provision.md)** — IFRS 9 simplified approach provision matrix using aged receivables and historical loss rates. *Paired calculator: `clio calc ecl`. Typical context: GST/VAT filing cycle (ECL reviewed alongside the return prep since AR aging is already pulled) and year-end (ECL true-up inside the year-end close).*

12. **[Employee Benefit Accruals](references/employee-accruals.md)** — IAS 19 leave accrual (scheduler, fixed monthly) and bonus accrual (manual journals, variable quarterly) with year-end true-up. *Paired calculator: `clio calc leave-accrual`. Typical context: month-end close (leave-accrual scheduler runs inside the month-end close); bonus accrual revisited each quarter and at year-end (true-up inside the year-end close).*

### Tier 4 — Corporate Events & Structures

13. **[Provisions with PV Unwinding](references/provisions.md)** — IAS 37 provision recognized at PV, with monthly discount unwinding schedule. For warranties, legal claims, decommissioning, restructuring. *Paired calculator: `clio calc provision`. Typical context: month-end close (monthly discount-unwinding journal inside the month-end close); initial recognition triggered ad-hoc when the obligating event occurs.*

14. **[Dividend Declaration & Payment](references/dividend.md)** — Board-declared dividend: two journals (declaration reducing retained earnings, then payment). Optional withholding tax adds a third step. *Paired calculator: `clio calc dividend`. Typical context: year-end (dividend declaration is part of the year-end close after profit is finalized) or ad-hoc (interim dividends).*

15. **[Intercompany Transactions](references/intercompany.md)** — Mirrored invoices/bills or journals across two Jaz entities with matching intercompany reference, quarterly settlement. *Typical context: month-end close (mirror entries booked each period inside the month-end close) and year-end (intercompany elimination + confirmation inside audit prep).*

16. **[Capital WIP to Fixed Asset](references/capital-wip.md)** — Cost accumulation in CIP account during construction/development, transfer to FA on completion, auto-depreciation via Jaz FA module. *Typical context: month-end close (cost accumulation each period) and year-end (transfer to FA + commissioning review inside the fixed-asset review).*

## How to Use These Recipes

1. **Read the recipe** for your scenario — understand the accounts, journal entries, and capsule structure.
2. **Create the accounts** listed in the "Accounts Involved" table (if they don't already exist in the CoA).
3. **Create the capsule** with an appropriate capsule type.
4. **Run the calculator** (if available) to generate exact amounts: `clio calc <command> --json` gives you a complete blueprint. Where you picked the method yourself (e.g. `--method ddb` over `sl`), record the judgment after the entries post: `jot(kind: METHOD)` naming the method and why.
5. **Record the initial transaction** (bill, invoice, or journal) — assign it to the capsule.
6. **For scheduler recipes**: Create the scheduler with the same capsule — it generates all subsequent entries automatically.
7. **For manual journal recipes**: Record each period's journal using the calculator output or worked example, always assigning to the same capsule.
8. **Verify** using the steps in each recipe (ledger grouping by capsule, trial balance checks).

## Financial Calculators (CLI)

The `jaz-clio` CLI includes 13 IFRS-compliant financial calculators. Each produces a formatted schedule + per-period journal entries + human-readable workings. Use `--json` for structured output with a complete **blueprint** — capsule type/name, tags, custom fields, workings (capsuleDescription), and every step with action type, date, accounts, and amounts.

All calculators support `--currency <code>` and `--json`.

Inputs the data does not hand you (loss rates, discount rate, salvage value, useful life) are assumptions: once the entries post, lock each with `jot(kind: ASSUMPTION)` naming the value and its source.

Each calculator has a typical context — see the line after each command for the operational workflow that typically invokes it.

```bash
# ── Tier 2 Calculators ──────────────────────────────────────────

# Loan amortization (PMT, interest/principal split)
# Typical context: ad-hoc (one-off setup at drawdown), then month-end close (per-installment journal)
clio calc loan --principal 100000 --rate 6 --term 60 [--start-date 2025-01-01] [--currency SGD] [--json]

# IFRS 16 lease (PV, liability unwinding, ROU depreciation)
# Typical context: month-end close (per-period journal) + year-end (ROU register review)
clio calc lease --payment 5000 --term 36 --rate 5 [--start-date 2025-01-01] [--currency SGD] [--json]

# Hire purchase (lease + ownership transfer — depreciate over useful life)
# Typical context: month-end close (per-period journal) + year-end (asset register review)
clio calc lease --payment 5000 --term 36 --rate 5 --useful-life 60 [--start-date 2025-01-01] [--currency SGD] [--json]

# Depreciation (DDB, 150DB, or straight-line)
# Typical context: month-end close (period depreciation booking) + year-end (FA review)
clio calc depreciation --cost 50000 --salvage 5000 --life 5 [--method ddb|150db|sl] [--frequency annual|monthly] [--currency SGD] [--json]

# Prepaid expense recognition
# Typical context: month-end close (period recognition); set up at data migration when the prior system hands over the schedule
clio calc prepaid-expense --amount 12000 --periods 12 [--frequency monthly|quarterly] [--start-date 2025-01-01] [--currency SGD] [--json]

# Deferred revenue recognition
# Typical context: month-end close (period recognition) + year-end (true-up)
clio calc deferred-revenue --amount 36000 --periods 12 [--frequency monthly|quarterly] [--start-date 2025-01-01] [--currency SGD] [--json]

# Fixed deposit — simple or compound interest accrual (IFRS 9)
# Typical context: month-end close (interest accrual journal); placement + maturity handled ad-hoc
clio calc fixed-deposit --principal 100000 --rate 3.5 --term 12 [--compound monthly|quarterly|annually] [--start-date 2025-01-01] [--currency SGD] [--json]

# Asset disposal — gain/loss on sale or scrap (IAS 16)
# Typical context: ad-hoc (triggered by a disposal event) + year-end (FA review surfaces unposted disposals)
clio calc asset-disposal --cost 50000 --salvage 5000 --life 5 --acquired 2022-01-01 --disposed 2025-06-15 --proceeds 20000 [--method sl|ddb|150db] [--currency SGD] [--json]

# ── Tier 3 Calculators ──────────────────────────────────────────

# FX revaluation — unrealized gain/loss on non-AR/AP items (IAS 21)
# Typical context: month-end close (period-end FX reval) + year-end (revaluation)
clio calc fx-reval --amount 50000 --book-rate 1.35 --closing-rate 1.38 [--currency USD] [--base-currency SGD] [--json]

# Expected credit loss provision matrix (IFRS 9)
# Typical context: GST/VAT filing cycle (ECL reviewed alongside the return prep) + year-end (ECL true-up)
clio calc ecl --current 100000 --30d 50000 --60d 20000 --90d 10000 --120d 5000 --rates 0.5,2,5,10,50 [--existing-provision 3000] [--currency SGD] [--json]

# ── Tier 4 Calculator ───────────────────────────────────────────

# IAS 37 provision PV + discount unwinding schedule
# Typical context: month-end close (monthly discount unwinding); initial recognition triggered ad-hoc
clio calc provision --amount 500000 --rate 4 --term 60 [--start-date 2025-01-01] [--currency SGD] [--json]

# ── New Calculators ────────────────────────────────────────────

# Accrued expense — dual-entry (accrue at period-end, reverse next month)
# Typical context: month-end close (accruals step inside the month-end close)
clio calc accrued-expense --amount 5000 --periods 12 [--frequency monthly|quarterly] [--start-date 2025-01-31] [--currency SGD] [--json]

# Employee leave accrual (IAS 19) — monthly accrual of annual leave entitlements
# Typical context: month-end close (scheduler runs each period); bonus accrual revisited each quarter + year-end true-up
clio calc leave-accrual --employees 10 --days 14 --daily-rate 250 [--periods 12] [--start-date 2025-01-31] [--currency SGD] [--json]

# Dividend declaration + payment — optional withholding tax
# Typical context: year-end (post profit finalization inside the year-end close) or ad-hoc (interim dividends)
clio calc dividend --amount 200000 --declaration-date 2026-02-15 --payment-date 2026-03-15 [--withholding-rate 15] [--currency SGD] [--json]

# ── Reconciliation Calculator ─────────────────────────────────

# Bank reconciliation matcher — 5-phase cascade (1:1, N:1, 1:N, N:M)
# Typical context: month-end close (run inside the bank reconciliation as part of every period close)
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

## Server-side recipe execution (Jaz API)

A second path: 5 IFRS recipes (Loan Amortization, Accrual Reversal, Prepaid Amortization, Deferred Revenue, IFRS 16 Lease) also have a SERVER-SIDE lifecycle via Jaz REST. This produces real capsule entities + scheduler atoms (recurring journal postings) — distinct from the offline `plan_recipe` / `execute_recipe` path which is client-side compute.

**Two distinct execution paths:**

| Path | When to use | Tools |
|---|---|---|
| **Offline calculator** | Plan first, post manually. Agent has CoA picked. No need for a server-side capsule entity. Works without an API key. | `plan_recipe` → `execute_recipe` |
| **Server-side trigger** | "Create the bill AND the prepaid amortization schedule in one shot." Capsule entity needed for FE/reporting. Requires API key. | Trigger via `capsuleRecipe` payload on `create_bill` / `create_invoice` / `create_journal` / `create_cash_in` / `create_cash_out` (and their `update_*` variants), OR standalone `preview_capsule_recipe` first. |

**Server-side tools** (group: `capsule_recipes`):

- `list_capsule_recipes` (read-only) — list registered IFRS recipes + per-version JSON Schemas. SOURCE OF TRUTH for `recipeName` values; don't hard-code.
- `get_capsule_recipe(name)` (read-only) — one descriptor by enum name with `versions[].inputSchema`.
- `preview_capsule_recipe({recipeName, recipeVersion?, inputs, baseTransactionResourceId?, baseTransactionType?, organizationResourceId?})` (read-only) — pure compute, no side effects. Returns `{legs[], expectedOutput[], previewMarkdown}`. Use BEFORE triggering via `capsuleRecipe` payload to validate inputs.
- `resume_capsule_recipe(capsuleResourceId)` (write, NOT idempotent) — retry a FAILED recipe job from its failed leg. ≤3 same-leg attempts then terminal `BLOCKED_AFTER_3_RESUME_ATTEMPTS`.
- `rollback_capsule_recipe(capsuleResourceId, dryRun?: boolean)` (write; dryRun IS idempotent) — delete every scheduler atom created by the recipe. Preview with `dryRun=true` before committing.

**Trigger-mutation payload** — to create a base-trx AND fire a recipe in one shot, pass `capsuleRecipe: {recipeName, recipeVersion?, inputs}` to the create/update mutation. Mutually exclusive with `capsuleResourceId` (the "attach to existing capsule" path).

### Three pre-flight gates BEFORE sending `capsuleRecipe` (else the response silently nulls)

The trigger mutation is **best-effort post-commit**: if the recipe publish fails inside customer-service, the base-trx still commits, the response still returns 201, but `capsuleRecipeJob` is null and **no error reason is surfaced on the response body**. Three causes of silent null — gate every one of them before sending:

| Gate | Constraint | Pre-flight check |
|---|---|---|
| **Base trx type** | `recipeName` must match a trigger mutation in the recipe's `allowedBaseTransactionTypes`. PREPAID_AMORTIZATION→PURCHASE, DEFERRED_REVENUE→SALE, ACCRUAL_REVERSAL→JOURNAL_MANUAL, IFRS16_LEASE→JOURNAL_MANUAL, LOAN_AMORTIZATION→JOURNAL_DIRECT_CASH_IN \| JOURNAL_MANUAL | `get_capsule_recipe(name).allowedBaseTransactionTypes` ↔ trigger mutation |
| **Currency** | Recipe `currency`, every `*AccountResourceId` account's `currencyCode`, and base trx `currencyCode` ALL must match (v1 recipes are single-currency) | `get_account(<id>).currencyCode` for every input account |
| **Account class** | Each `*AccountResourceId` slot has an `x-accountClass` constraint in the recipe inputSchema (Asset/Liability/Expense/Revenue) | `get_capsule_recipe(name).versions[0].inputSchema.properties.<field>['x-accountClass']` vs `get_account(<id>).accountClass` |

**The canonical pre-flight is one call**: `preview_capsule_recipe(recipeName, inputs)`. Pure-compute (no side effects). Surfaces every input/class/currency violation as a clean 422 with a concrete `error_type`. The trigger mutation does NOT surface these — it just returns 201 with no `capsuleRecipeJob`. Always preview first if you can't trust the inputs.

See `jaz-api` Rule 143 (silent-null failure mode + diagnosis sequence), Rule 144 (closed enum on `recipeName`), Rule 150 (RECIPE_INVALID_BASE_TRANSACTION_TYPE — preview-only, NOT trigger), Rule 156 (ERR_RECIPE_ACCOUNT_CURRENCY_MISMATCH), Rule 157 (x-accountClass slot constraint).

**Recovery flow** (when `capsuleRecipeJob` is null on the response):

1. **Re-run `preview_capsule_recipe`** with the same `recipeName` + `inputs`. The 422 you get back is the exact reason the trigger mutation silently nulled. Fix the input and retry.
2. **Poll `search_background_jobs --filter '{"baseTransactionResourceId":{"eq":"<id>"}}'`** — if a `FAILED` job exists, `errorDetails` has the publish failure. If no job exists, the publish never queued (validation rejected pre-queue).
3. **Job status `FAILED`** → `resume_capsule_recipe` (≤3 attempts) OR `rollback_capsule_recipe(dryRun=true)` first, then `rollback_capsule_recipe(dryRun=false)`. Record the judgment: `jot(kind: RECOVERY)` naming resume or rollback and the basis.
4. **Capsule wasn't created via the recipe engine** → rollback returns 422 `RECIPE_ROLLBACK_JOB_NOT_FOUND`; use `delete_capsule` for legacy capsules.

**DO NOT** use server-side execution for `fx-reval` — Jaz auto-handles ALL period-end IAS 21.23 FX translation; double-posting risk identical to the offline `execute_recipe(recipe: 'fx-reval')` warning.

### Template Customization (optional) — `templateOverrides`

A recipe generates text for the capsule title/description, each scheduled posting's label/description, the journal-line memos, and the schedule reference. To customize any of those, pass `templateOverrides` alongside `inputs` on `preview_capsule_recipe` and on the `capsuleRecipe` trigger payload:

```
capsuleRecipe: {
  recipeName: "LOAN_AMORTIZATION",
  inputs: { ... },
  templateOverrides: [
    { slotKey: "capsule.title", template: "Loan {{loanReference}}" },
    { slotKey: "leg.description.payment", template: "" }   // empty string clears a nullable slot
  ]
}
```

Discovery + rules:
- **Discover the slots first**: `get_capsule_recipe(name).data.versions[].templateSlots[]` lists each `slotKey`, its `uiLabel`, `defaultTemplate`, `supportedVariables`, and `nullable`. Send only the slots you change.
- Each `slotKey` MUST be one the recipe publishes; every `{{var}}` in `template` MUST be in that slot's `supportedVariables`; `template` ≤2000 chars; an empty `template` clears a `nullable` slot (omit the entry to keep the default; a non-nullable slot rejects a blank).
- **Preview is the gate.** `preview_capsule_recipe` surfaces override mistakes as clean 422 `ERR_RECIPE_OVERRIDE_*` codes. On the trigger path, an invalid override falls under the same best-effort silent-null behavior as everything else in the payload (see the three gates above) — so preview before you trigger.
- CLI: `clio capsule-recipes get <name>` prints the slots; `clio capsule-recipes preview --recipe <name> --inputs '{...}' --template-override capsule.title='Loan {{loanReference}}'` (repeatable).

## See Also

- **API field names and payloads**: Load the `jaz-api` skill — see `references/endpoints.md` and `references/field-map.md`
- **Capsule API**: `POST /capsules`, `POST /capsuleTypes` — see api skill's `references/full-api-surface.md`
- **Scheduler API**: `POST /scheduled/journals`, `POST /scheduled/invoices`, `POST /scheduled/bills`
- **Fixed Assets API**: `POST /fixed-assets` — see api skill's `references/feature-glossary.md`
- **Enrichments overview**: See `references/building-blocks.md` or api skill's `references/feature-glossary.md`
- **Operational close workflows (jaz-jobs)**: For the close playbooks that drive these recipes, load the `jaz-jobs` skill — month-end close (period-end recognition + accruals + FX reval), GST/VAT filing (ECL review during return prep), and year-end close (year-end true-ups, dividends, intercompany elimination).
