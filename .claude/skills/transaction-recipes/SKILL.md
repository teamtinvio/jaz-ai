---
name: jaz-recipes
version: 9.0.0
description: >-
  Use this skill when modeling complex multi-step accounting transactions:
  anything that spans multiple periods, involves changing amounts, or requires
  linked entries. Covers 16 IFRS-compliant recipes (prepaid amortization,
  deferred revenue, loans, IFRS 16 leases, hire purchase, fixed deposits,
  asset disposal, FX revaluation, ECL, IAS 37 provisions, dividends,
  intercompany, capital WIP) and 13 financial calculators that return the
  schedule and the journal lines to post. Also use when the user mentions
  depreciation, amortization, lease accounting, loan schedules, or any IFRS
  calculation.
license: MIT
compatibility: Works with Claude Code, Claude Cowork, Claude.ai, and any agent that reads markdown. For API payloads, load the jaz-api skill alongside this one. For the operational close workflows these recipes plug into (month-end close, GST/VAT filing, year-end close), load the jaz-jobs skill.
---

# Transaction Recipes Skill

You are modeling **complex multi-step accounting scenarios** in Jaz: transactions that span multiple periods, involve changing amounts, or require several linked entries to complete a single business event.

> **Jaz-native, not generic.** Every recipe in this skill is designed around the Jaz calculators (`calculate` / `clio calc`), Jaz capsule types, Jaz CoA classifications, and Jaz scheduler primitives. It is NOT an interchangeable IFRS reference; it is the operating manual for posting these transactions through the Jaz ledger. Never work the amounts by hand: run the calculator first and post the lines it returns. Nothing posts a recipe for you: the calculator posts nothing, and you create the capsule and each entry yourself (see "Posting a Recipe: Three Steps").

**This skill provides Jaz-contextual recipes with full accounting logic. For API field names and payloads, load the `jaz-api` skill alongside this one. For the operational close workflows that invoke these recipes (month-end close, GST/VAT filing, year-end close), load the `jaz-jobs` skill.**

## When to Use This Skill

- Setting up prepaid expenses, deferred revenue, or accrued liabilities
- Modeling loan repayment schedules with amortization tables
- Implementing IFRS 16 lease accounting (right-of-use assets + lease liabilities)
- Recording hire purchase agreements (ownership transfers, depreciate over useful life)
- Recording depreciation using methods Jaz doesn't natively support (declining balance, 150DB)
- Managing fixed deposit placements with interest accrual schedules (IFRS 9)
- Disposing of fixed assets: sale, scrap, or write-off with gain/loss calculation (IAS 16)
- Verifying the period-end FX revaluation Jaz posts itself (IAS 21): the calculator checks the figure, and its result is not posted
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
| **Calculators** | Return the schedule and the journal lines for each step (offline, post nothing) |
| **Schedulers** | Automate fixed-amount recurring journals (prepaid, deferred, leave) |
| **Manual Journals** | Record variable-amount entries (loan interest, IFRS 16 unwinding, ECL) |
| **Fixed Assets** | Native straight-line depreciation for ROU assets and completed capital projects |
| **Invoices / Bills** | Trade documents for intercompany, supplier bills for capital WIP |
| **Tracking Tags** | Tag all entries in a scenario for report filtering |
| **Nano Classifiers** | Classify line items by department, cost center, or project |
| **Custom Fields** | Record reference numbers (policy, loan, lease contract, intercompany ref) |

## Key Principle: Schedulers vs Manual Journals

Jaz schedulers generate **fixed-amount** recurring entries. This determines which recipe pattern to use:

- **Fixed amounts each period** → One scheduler can replace the N dated journals (it posts each occurrence itself)
- **Variable amounts each period** → Use manual journals inside a capsule (one per period, amounts from the calculator)
- **One-off or two-entry events** → Use manual journals (e.g., a dividend declaration; its payment is a cash-out)

If a scenario genuinely fits either pattern, record the pick once the entries post: `jot(kind: METHOD)` naming the pattern chosen and the deciding fact.

| Recipe | Pattern | Why |
|---|---|---|
| Prepaid Amortization | Scheduler + capsule | Same amount each month |
| Deferred Revenue | Scheduler + capsule | Same amount each month |
| Accrued Expenses | Manual journals + capsule | Accrual + reversal pair per period, re-estimated each time |
| Employee Leave Accrual | Scheduler + capsule | Fixed monthly accrual |
| Bank Loan | Manual journals + capsule | Interest changes as principal reduces |
| IFRS 16 Lease | Hybrid (native FA + manual journals) + capsule | ROU depreciation is fixed; liability unwinding changes |
| Declining Balance | Manual journals + capsule | Depreciation changes as book value reduces |
| FX Revaluation | Verification only: nothing posted, no capsule | Jaz revalues foreign-currency balances itself at period end; the calculator verifies that figure and its result is not posted |
| ECL Provision | Manual journals + capsule | Receivables and rates change each quarter |
| Fixed Deposit | Cash-out + manual journals + cash-in + capsule | Placement, monthly accruals, maturity |
| Hire Purchase | Manual journals + FA registration + capsule | Like IFRS 16 but depreciate over useful life |
| Asset Disposal | Manual journal + FA deregistration | One-off compound entry + FA update |
| Provisions (IAS 37) | Manual journals + cash-out + capsule | Unwinding amount changes each month |
| Bonus Accrual | Manual journals + capsule | Revenue/profit changes each quarter |
| Dividends | Manual journal + cash-out + capsule | One-off: declaration journal, then the payment as a cash-out (with withholding tax, a journal for the withheld amount too) |
| Intercompany | Invoices/bills + capsule | Mirrored entries in two entities |
| Capital WIP | Bills/journals + FA registration + capsule | Accumulate then transfer |

## Recipe Index

Each recipe includes: scenario description, accounts involved, journal entries, capsule structure, worked example with real numbers, enrichment suggestions, verification steps, and common variations.

### Tier 1: Scheduler Recipes (Automated)

1. **[Prepaid Amortization](references/prepaid-amortization.md)**: Annual insurance, rent, or subscription paid upfront with monthly expense recognition via scheduler. *Typical context: month-end close (period-end recognition step inside the month-end close); set up once at data migration when the prior system hands over a prepaid schedule.*

2. **[Deferred Revenue](references/deferred-revenue.md)**: Upfront customer payment for a service delivered over time, with monthly revenue recognition via scheduler. *Typical context: month-end close (revenue recognition step inside the month-end close); also reviewed at year-end inside the year-end close for true-up.*

### Tier 2: Manual Journal Recipes (Calculated)

3. **[Accrued Expenses](references/accrued-expenses.md)**: Month-end expense accrual and next-period reversal as a journal pair per period, plus the actual supplier bill. *Paired calculator: `clio calc accrued-expense`. Typical context: month-end close (accruals step inside the month-end close).*

4. **[Bank Loan](references/bank-loan.md)**: Loan disbursement, monthly installments splitting principal and interest, full amortization table with worked example. *Paired calculator: `clio calc loan`. Typical context: ad-hoc (one-off setup at loan drawdown, then month-end close posts or finalizes each installment journal).*

5. **[IFRS 16 Lease](references/ifrs16-lease.md)**: Right-of-use asset recognition, lease liability unwinding with changing interest, native FA for ROU straight-line depreciation. *Typical context: month-end close (depreciation + liability unwinding booking each period inside the month-end close) and year-end (ROU register sign-off inside the fixed-asset review + the year-end close).*

6. **[Declining Balance Depreciation](references/declining-balance.md)**: DDB/150DB methods with switch-to-straight-line logic, for assets where Jaz's native SL isn't appropriate. *Typical context: month-end close (depreciation booking inside the month-end close) and year-end (asset register review inside the fixed-asset review).*

7. **[Fixed Deposit](references/fixed-deposit.md)**: Placement, monthly interest accrual (simple or compound), and maturity settlement. IFRS 9 amortized cost. *Paired calculator: `clio calc fixed-deposit`. Typical context: month-end close (interest accrual journal each period inside the month-end close); placement + maturity events handled ad-hoc.*

8. **[Hire Purchase](references/hire-purchase.md)**: Like IFRS 16 lease but ownership transfers; ROU depreciation over useful life (not lease term). *Paired calculator: `clio calc lease --useful-life <months>`. Typical context: month-end close (monthly depreciation + interest unwinding inside the month-end close) and year-end (asset register sign-off inside the fixed-asset review).*

9. **[Asset Disposal](references/asset-disposal.md)**: Sale at gain, sale at loss, or scrap/write-off. Computes accumulated depreciation to disposal date and gain/loss. *Paired calculator: `clio calc asset-disposal`. Typical context: ad-hoc (triggered by a disposal event) and year-end (asset register review inside the fixed-asset review surfaces unposted disposals).*

### Tier 3: Month-End Close Recipes

10. **[FX Revaluation (verification only)](references/fx-revaluation.md)**: Jaz auto-handles ALL period-end IAS 21.23 FX translation (AR, AP, cash, bank, intercompany, term deposits, FX provisions). The recipe and `clio calc fx-reval` / `calculate(type: 'fx-reval')` are for VERIFICATION ONLY (independent cross-check vs what Jaz auto-posted). Do NOT post the calculator's result (it would double-count). *Typical context: period-end / year-end FX verification flow.*

11. **[Bad Debt Provision / ECL](references/bad-debt-provision.md)**: IFRS 9 simplified approach provision matrix using aged receivables and historical loss rates. *Paired calculator: `clio calc ecl`. Typical context: GST/VAT filing cycle (ECL reviewed alongside the return prep since AR aging is already pulled) and year-end (ECL true-up inside the year-end close).*

12. **[Employee Benefit Accruals](references/employee-accruals.md)**: IAS 19 leave accrual (scheduler, fixed monthly) and bonus accrual (manual journals, variable quarterly) with year-end true-up. *Paired calculator: `clio calc leave-accrual`. Typical context: month-end close (leave-accrual scheduler runs inside the month-end close); bonus accrual revisited each quarter and at year-end (true-up inside the year-end close).*

### Tier 4: Corporate Events & Structures

13. **[Provisions with PV Unwinding](references/provisions.md)**: IAS 37 provision recognized at PV, with monthly discount unwinding schedule. For warranties, legal claims, decommissioning, restructuring. *Paired calculator: `clio calc provision`. Typical context: month-end close (monthly discount-unwinding journal inside the month-end close); initial recognition triggered ad-hoc when the obligating event occurs.*

14. **[Dividend Declaration & Payment](references/dividend.md)**: Board-declared dividend: a declaration journal reducing retained earnings, then the payment as a cash-out. Optional withholding tax adds a journal for the withheld amount and a cash-out for its remittance. *Paired calculator: `clio calc dividend`. Typical context: year-end (dividend declaration is part of the year-end close after profit is finalized) or ad-hoc (interim dividends).*

15. **[Intercompany Transactions](references/intercompany.md)**: Mirrored invoices/bills or journals across two Jaz entities with matching intercompany reference, quarterly settlement. *Typical context: month-end close (mirror entries booked each period inside the month-end close) and year-end (intercompany elimination + confirmation inside audit prep).*

16. **[Capital WIP to Fixed Asset](references/capital-wip.md)**: Cost accumulation in CIP account during construction/development, transfer to FA on completion, auto-depreciation via Jaz FA module. *Typical context: month-end close (cost accumulation each period) and year-end (transfer to FA + commissioning review inside the fixed-asset review).*

## Posting a Recipe: Three Steps

No tool runs a recipe end to end. You perform three explicit steps (full detail, the action-to-tool mapping and the draft / reference rules are in `references/building-blocks.md`):

1. **Calculate.** `calculate(type, ...)` (MCP) or `clio calc <type> ... --json` (CLI). Offline, read-only, no account needed. It returns the schedule and, when a start date is given, a `blueprint` with dated steps and the journal lines for each step. It posts nothing.
2. **Create the capsule.** `list_capsule_types` (create the type with `create_capsule_type` if it is missing), then `create_capsule`.
3. **Post each blueprint step** with the real transaction tools, each carrying `capsuleResourceId`: `create_journal`, `create_bill`, `create_invoice`, `create_cash_in`, `create_cash_out`. Where the same amount repeats every period, one `create_scheduled_journal` can replace the N dated journals. Fixed assets go through the fixed-asset tools (`create_fixed_asset`, `mark_fixed_asset_sold`, `discard_fixed_asset`).

Around those three steps:

- **Read the recipe** for your scenario first: the accounts, the journal entries, the capsule structure and the worked example.
- **Resolve every account yourself.** Blueprint lines carry labels (`Cash / Bank Account`, `Loan Payable`), not accounts. Map each with `search_accounts` / `list_accounts` (bank accounts via `list_bank_accounts`); create a missing account only after the practitioner confirms its classification.
- **Record judgment.** Where you picked the method yourself (e.g. `method: 'ddb'` over `'sl'`), record it after the entries post: `jot(kind: METHOD)` naming the method and why.
- **Verify** using the steps in each recipe (general ledger grouped by capsule, trial balance checks).
- **`fx-reval` is VERIFICATION ONLY.** Jaz revalues foreign-currency balances at period end (IAS 21.23); posting the calculator's result double-counts.

## Financial Calculators

13 IFRS-compliant financial calculators, reachable two ways with the same result: the MCP tool `calculate(type: <type>, ...)` and the CLI `clio calc <type>`. Each produces a schedule + per-period journal entries + human-readable workings. On the CLI use `--json` for structured output with the **blueprint**: capsule type/name, tags, custom fields, workings (capsuleDescription), and every step with action type, date, accounts, and amounts.

The MCP param names differ from the CLI flags: `annualRate` (`--rate`), `termMonths` (`--term`), `monthlyPayment` (`--payment`), `usefulLifeMonths` (`--useful-life`), `salvageValue` (`--salvage`), `usefulLifeYears` (`--life`), `acquisitionDate` / `disposalDate` (`--acquired` / `--disposed`), `compounding` (`--compound`), `daysPerYear` (`--days`), and `buckets: [{ name, balance, rate }]` for ECL (`--current`, `--30d` ... `--rates`).

All calculators support `--currency <code>` and `--json`.

Inputs the data does not hand you (loss rates, discount rate, salvage value, useful life) are assumptions: once the entries post, lock each with `jot(kind: ASSUMPTION)` naming the value and its source.

Each calculator has a typical context; see the line after each command for the operational workflow that typically invokes it.

```bash
# ── Tier 2 Calculators ──────────────────────────────────────────

# Loan amortization (PMT, interest/principal split)
# Typical context: ad-hoc (one-off setup at drawdown), then month-end close (per-installment journal)
clio calc loan --principal 100000 --rate 6 --term 60 [--start-date 2025-01-01] [--currency SGD] [--json]

# IFRS 16 lease (PV, liability unwinding, ROU depreciation)
# Typical context: month-end close (per-period journal) + year-end (ROU register review)
clio calc lease --payment 5000 --term 36 --rate 5 [--start-date 2025-01-01] [--currency SGD] [--json]

# Hire purchase (lease + ownership transfer, depreciate over useful life)
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

# Fixed deposit: simple or compound interest accrual (IFRS 9)
# Typical context: month-end close (interest accrual journal); placement + maturity handled ad-hoc
clio calc fixed-deposit --principal 100000 --rate 3.5 --term 12 [--compound monthly|quarterly|annually] [--start-date 2025-01-01] [--currency SGD] [--json]

# Asset disposal: gain/loss on sale or scrap (IAS 16)
# Typical context: ad-hoc (triggered by a disposal event) + year-end (FA review surfaces unposted disposals)
clio calc asset-disposal --cost 50000 --salvage 5000 --life 5 --acquired 2022-01-01 --disposed 2025-06-15 --proceeds 20000 [--method sl|ddb|150db] [--currency SGD] [--json]

# ── Tier 3 Calculators ──────────────────────────────────────────

# FX revaluation (IAS 21): VERIFICATION ONLY. Checks the revaluation Jaz posts itself; never post this result.
# Typical context: month-end close + year-end (cross-check the platform's period-end revaluation)
# --rate-direction is REQUIRED: these rates read foreign-first (1 USD = 1.35 SGD).
# A list_currency_rates value would be FUNCTIONAL_TO_SOURCE instead.
clio calc fx-reval --amount 50000 --book-rate 1.35 --closing-rate 1.38 --rate-direction SOURCE_TO_FUNCTIONAL [--position ASSET|LIABILITY] [--currency USD] [--base-currency SGD] [--json]

# Expected credit loss provision matrix (IFRS 9)
# Typical context: GST/VAT filing cycle (ECL reviewed alongside the return prep) + year-end (ECL true-up)
clio calc ecl --current 100000 --30d 50000 --60d 20000 --90d 10000 --120d 5000 --rates 0.5,2,5,10,50 [--existing-provision 3000] [--currency SGD] [--json]

# ── Tier 4 Calculator ───────────────────────────────────────────

# IAS 37 provision PV + discount unwinding schedule
# Typical context: month-end close (monthly discount unwinding); initial recognition triggered ad-hoc
clio calc provision --amount 500000 --rate 4 --term 60 [--start-date 2025-01-01] [--currency SGD] [--json]

# ── New Calculators ────────────────────────────────────────────

# Accrued expense: dual-entry (accrue at period-end, reverse next month)
# Typical context: month-end close (accruals step inside the month-end close)
clio calc accrued-expense --amount 5000 --periods 12 [--frequency monthly|quarterly] [--start-date 2025-01-31] [--currency SGD] [--json]

# Employee leave accrual (IAS 19): monthly accrual of annual leave entitlements
# Typical context: month-end close (scheduler runs each period); bonus accrual revisited each quarter + year-end true-up
clio calc leave-accrual --employees 10 --days 14 --daily-rate 250 [--periods 12] [--start-date 2025-01-31] [--currency SGD] [--json]

# Dividend declaration + payment: optional withholding tax
# Typical context: year-end (post profit finalization inside the year-end close) or ad-hoc (interim dividends)
clio calc dividend --amount 200000 --declaration-date 2026-02-15 --payment-date 2026-03-15 [--withholding-rate 15] [--currency SGD] [--json]

# ── Reconciliation Calculator ─────────────────────────────────

# Bank reconciliation matcher: 5-phase cascade (1:1, N:1, 1:N, N:M)
# Typical context: month-end close (run inside the bank reconciliation as part of every period close)
clio jobs bank-recon match --input bank-data.json [--tolerance 0.01] [--date-window 14] [--max-group 5] [--json]
```

### Blueprint Output (`--json`)

The result includes a `blueprint` object: the capsule to create and the steps to post, in order. The dated calculators (loan, lease, prepaid, deferred revenue, provision, fixed deposit, accrued expense, leave accrual) return `blueprint: null` when no start date is given.

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

**Blueprint action types** (each step tells you which tool posts it):

| Action | When used | Tool |
|---|---|---|
| `bill` | Supplier document (prepaid expense) | `create_bill` |
| `invoice` | Customer document (deferred revenue) | `create_invoice` |
| `cash-in` | Cash arrives in bank (loan disbursement, FD maturity) | `create_cash_in` |
| `cash-out` | Cash leaves bank (FD placement, provision settlement) | `create_cash_out` |
| `journal` | Accrual, depreciation, unwinding, installment split | `create_journal` |
| `fixed-asset` | Instruction: register the asset (ROU asset) | `create_fixed_asset` |
| `note` | Instruction: update the FA register on disposal | `mark_fixed_asset_sold` / `discard_fixed_asset` |

Account names in `lines` are labels to map to real accounts, and cash entries post ACTIVE immediately (no draft state): post a future-dated cash step when the money moves. A cash step can only carry lines on the side opposite the bank: if a cash-in or cash-out step has another line on the bank's side (for example withholding tax), post the net cash entry and a separate journal for that line.

**Math guarantees:**
- `financial` npm package (TypeScript port of numpy-financial) for PV, PMT, no hand-rolled TVM
- 2dp per period, final period closes balance to exactly $0.00
- Input validation with clear error messages (negative values, invalid dates, salvage > cost)
- DDB→SL switch when straight-line >= declining balance or when DDB would breach salvage floor
- All journal entries balanced (debits = credits in every step)

## See Also

- **API field names and payloads**: Load the `jaz-api` skill (see `references/endpoints.md` and `references/field-map.md`)
- **Three-step flow, action-to-tool mapping, capsule rules**: `references/building-blocks.md`
- **Capsule API**: `POST /capsules`, `POST /capsuleTypes` (see api skill's `references/full-api-surface.md`)
- **Scheduler API**: `POST /scheduled/journals`, `POST /scheduled/invoices`, `POST /scheduled/bills`
- **Fixed Assets API**: `POST /fixed-assets` (see api skill's `references/feature-glossary.md`)
- **Enrichments overview**: See `references/building-blocks.md` or api skill's `references/feature-glossary.md`
- **Scheduler tools**: `create_scheduled_journal`, `create_scheduled_invoice`, `create_scheduled_bill`
- **Operational close workflows (jaz-jobs)**: For the close playbooks that drive these recipes, load the `jaz-jobs` skill: month-end close (period-end recognition + accruals + a check of the platform's FX revaluation), GST/VAT filing (ECL review during return prep), and year-end close (year-end true-ups, dividends, intercompany elimination).
