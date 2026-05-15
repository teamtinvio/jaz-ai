# Recipe: Fixed Deposit (engine name: `fixed-deposit`)

> Recipe for IFRS 9 amortized-cost fixed deposits (hold-to-collect, SPPI). Engine emits 1 cash-out (placement) + N future-dated DRAFT interest accrual journals + 1 cash-in (maturity).

## Tools, recipes, calculators this recipe uses

### Recipe engine entry point
- **`plan_recipe(recipe: 'fixed-deposit', ...)`** — used in step 2: returns RecipePlan with placement + N accrual + maturity steps.
- **`execute_recipe(recipe: 'fixed-deposit', ...)`** — used in step 4: posts the placement cash-out (today), N future-dated DRAFT accrual journals (one per period), and maturity cash-in (dated termMonths later, also DRAFT).

### Calculator (cross-check, no API key needed)
- **`clio calc fixed-deposit --principal <p> --rate <annual %> --term <months> --start-date <YYYY-MM-DD> --currency <code> [--compound monthly|annually] --json`** — used in step 1: compute monthly accrual amounts. Default simple interest; `--compound` for compound interest. Returns `{ totalInterest, schedule[n] }` where each row carries `period`, `accrualDate`, `accrualAmount`, `accruedToDate`, `journal`.

### Tools (jaz-api / direct)
- **`search_capsules(filter: {capsuleType: {eq: 'Fixed Deposit'}, name: {eq: <capsule.name>}})`** — step 0 idempotency check.
- **`search_accounts(filter: {name: {in: ['Fixed Deposit Receivable', 'Accrued Interest Receivable', 'Interest Income']}})`** — step 3.
- **`search_contacts(filter: {supplier: true, name: {eq: <bank>}})`** — step 3 optional: bank contact for narrative.
- **`generate_trial_balance(period_end: <date>)`** — step 5 verify accrued interest unwinds; FD principal stays at carrying amount until maturity.
- **`bulk_update_journals(items: [{resourceId: <id>, saveAsDraft: false}, ...])`** — step 5 monthly finalize.

### Cross-references
- Within an engagement: invoked from `practice/references/monthly-close.md` step 7 (existing FD capsules — finalize this month's accrual; new FD setups during the period — invoke recipe).
- Sibling: `bank-loan.md` (mirror pattern — money out instead of in, interest expense vs income); `provisions.md` (similar PV-unwinding pattern but for liabilities).
- IFRS / accounting context: IFRS 9.4.1 (amortized cost classification — hold to collect, SPPI). IFRS 9.5.4.1 (effective interest method). For FDs that don't meet SPPI (e.g., structured deposits with embedded derivatives): use FVTPL or FVOCI classification — different recipe pattern needed (NOT this recipe).

---

## Step-by-step

### Step 0 — Idempotency check

```
search_capsules(filter: {capsuleType: {eq: 'Fixed Deposit'}, name: {eq: 'DBS FD — SGD 100,000 — 12 months — 3.5% (FY2025)'}})
```

If a result returns: halt. Each FD placement is unique; duplicate setup means double-counted financial asset.

### Step 1 — Independent cross-check (calculator)

```
clio calc fixed-deposit --principal 100000 --rate 3.5 --term 12 --start-date 2025-01-01 --currency SGD --json
```

Returns: `{ totalInterest: 3500, schedule: [{period: 1, accrualDate: '2025-01-31', accrualAmount: 291.67, accruedToDate: 291.67, ...}, ...12] }`. For simple interest at 3.5% annual: `100,000 × 3.5% / 12 = $291.67/month`. For compound: pass `--compound monthly` → `100,000 × ((1 + 0.035/12)^12 - 1) ≈ $3,556.46` total, with each month's accrual on the carrying amount including prior accrued interest.

Save schedule to `workpapers/<period>/fd-<bank>-<reference>.json`.

### Step 2 — Plan the recipe

```
plan_recipe(
  recipe: 'fixed-deposit',
  principal: 100000,
  annualRate: 3.5,
  termMonths: 12,
  startDate: '2025-01-01',
  currency: 'SGD',
  glFdReceivable: <CLIENT.coa_mapping['Fixed Deposit Receivable']>,
  glAccruedInterestReceivable: <CLIENT.coa_mapping['Accrued Interest Receivable']>,
  glInterestIncome: <CLIENT.coa_mapping['Interest Income']>,
  bankAccountResourceId: <CLIENT.bank_accounts[i].jaz_resource_id>,
  bank: 'DBS Bank',
  capsuleType: 'Fixed Deposit',
  capsuleName: 'DBS FD — SGD 100,000 — 12 months — 3.5% (FY2025)'
)
```

Returns `RecipePlan` with `requiredAccounts: ['Fixed Deposit Receivable', 'Accrued Interest Receivable', 'Interest Income', 'Cash / Bank Account']`, `needsContact: false` (bank is metadata), `needsBankAccount: true`, `steps`:
- Step 1 (placement, dated startDate): cash-out — Dr Fixed Deposit Receivable 100,000 / Cr Cash 100,000.
- Steps 2..13 (accrual, dated end-of-month): journal — Dr Accrued Interest Receivable 291.67 / Cr Interest Income 291.67 (per period).
- Step 14 (maturity, dated `startDate + termMonths`): cash-in — Dr Cash 103,500 / Cr Fixed Deposit Receivable 100,000 / Cr Accrued Interest Receivable 3,500 (settles both balances).

### Step 3 — Resolve dependencies

For each account in `requiredAccounts`:
- `search_accounts(filter: {name: {eq: <accountName>}})`. Suggested classifications: `Fixed Deposit Receivable` → `Current Asset` (≤12-month FD) OR `Non-Current Asset` (>12-month); `Accrued Interest Receivable` → `Current Asset`; `Interest Income` → `Other Revenue`.

Bank account: resolve `bankAccountResourceId` for the disbursement bank (where the cash leaves to placement). Should be the actual operational bank account, NOT the FD account itself — the FD becomes its own balance-sheet line, separate from cash.

### Step 4 — Execute

```
execute_recipe(recipe: 'fixed-deposit', ...same args...)  // accounts auto-resolved from CoA; pass `bankAccountName` / `contactName` for fuzzy resolve
```

Returns: `{ capsule: {resourceId, type, title}, steps: [{step, action, status, resourceId}, ...14], summary: {total: 14, created: 14} }`. The recipe creates 14 entries upfront: 1 placement cash-out (immediately ACTIVE if `finalize: true`), 12 future-dated DRAFT accrual journals, 1 future-dated DRAFT maturity cash-in (dated `startDate + termMonths`).

### Step 5 — Monthly action (during monthly-close)

For each month after recipe execution, this period's DRAFT accrual journal already exists. Monthly close action:

```
search_journals(filter: {capsuleResourceId: {eq: <id>}, valueDate: {between: [<period-start>, <period-end>]}, status: {eq: 'DRAFT'}})
update_journal(resourceId: <journal id>, saveAsDraft: false)
```

Verify after finalize:
- `generate_trial_balance(period_end: <month-end>)`.
- Assert: `balance['Accrued Interest Receivable'] == schedule[periodIndex].accruedToDate` (within 1 cent).
- Assert: `balance['Interest Income'] (period MTD) == schedule[periodIndex].accrualAmount`.
- `balance['Fixed Deposit Receivable']` stays at `100,000` until maturity.

At maturity (month 12), finalize the maturity cash-in:
```
search_journals(filter: {capsuleResourceId: {eq: <id>}, valueDate: {eq: <maturityDate>}, status: {eq: 'DRAFT'}})
update_cash_in(resourceId: <cash-in id>, saveAsDraft: false)
```

Verify after maturity:
- `balance['Fixed Deposit Receivable'] == 0` (FD asset extinguished).
- `balance['Accrued Interest Receivable'] == 0` (settled into Cash).
- `balance['Cash']` increased by 103,500 ($100K principal + $3.5K interest).

Close capsule via a manual `update_capsule(title: '<original> [CLOSED]')` (the API has no `status` field for capsules — closure is informational only).

If the bank auto-rolls the FD at maturity: do NOT close the capsule. Instead, post the rollover via `create_journal` (Dr Fixed Deposit Receivable New / Cr Fixed Deposit Receivable Old + Cr Accrued Interest Receivable for any settled interest), then start a new FD capsule via fresh `plan_recipe` for the rolled term.

---

## Common error classes and recovery

| Source | Error | Recovery |
|--------|-------|----------|
| `plan_recipe` | 422 `unsupported_recipe` | Use canonical engine name `fixed-deposit` (already canonical). |
| `plan_recipe` | 422 `term_too_short` | FD term must be ≥ 1 month. For overnight / call deposits: classify as Cash equivalent (IAS 7.6); use `create_cash_in` with a bank-side FD account, no recipe. |
| `execute_recipe` | 422 `account_not_found` for `Accrued Interest Receivable` | Step 3 incomplete. Common gap — many CoAs lack this account. Create via `create_account(accountType: 'Current Asset')`. |
| `execute_recipe` | 422 `currency_mismatch_bank_account` | Placement bank ≠ FD currency. Either pass matching-currency bank account, OR model as FX (USD FD funded from SGD account → different `paymentAmount` and `transactionAmount`). |
| Premature withdrawal (penalty) | (process) | Bank pays reduced interest. Manual journal: Dr Cash (reduced amount), Dr Loss on Premature Withdrawal (penalty), Cr Fixed Deposit Receivable (full principal), Cr Accrued Interest Receivable (any settled portion). Reverse remaining DRAFT accrual journals (`delete_journal` per future period). |
| Compound vs simple mismatch | Verification fails — accrued interest off by cents | Engine uses simple interest by default. If bank actually compounds: re-run calc with `--compound monthly`, recompute schedule, halt and re-execute with corrected inputs. |
| FX-denominated FD | (verification) | Jaz auto-handles period-end FX revaluation of the FD principal AND accrued interest balances per IAS 21.23 (do NOT invoke `fx-reval` recipe — see `fx-revaluation.md`). |

---

## Variations

- **Compound interest**: `--compound monthly` (or `annually`). Engine adjusts each period's accrual to be on the carrying amount (principal + accrued-to-date), not principal only. Final period's interest is slightly higher than simple.
- **FX-denominated**: `currency: 'USD'`. Placement records in USD via `currency: { sourceCurrency: 'USD' }`. Monthly accruals also USD. Period-end FX reval is auto-handled by Jaz.
- **Auto-rollover**: don't close capsule at maturity; post rollover via manual journal then start a new FD capsule for the rolled term.
- **Tiered-rate FD** (rate steps up over the term): NOT supported by single `plan_recipe`. Run multiple shorter-term FD recipes back-to-back, each at its own rate.
- **Stepped-coupon bond** (similar economic substance but legally a bond): use the `provision` engine's PV-unwinding pattern instead — different IFRS 9 classification (FVOCI typically).

---

## Cross-references back to engagements

- `practice/references/monthly-close.md` step 7 — invoked monthly to finalize this period's pre-emitted accrual DRAFT for each existing FD capsule. New FD placements during the period: invoke recipe; this period's accrual auto-included in the bulk_finalize queue.
- `practice/references/annual-statutory.md` step 4 — final FY accrual cross-check + classification (current vs non-current depending on remaining term at FY-end).
- `audit-prep.md` step 8 — supporting schedule via `search_capsules(filter: {capsuleType: {eq: 'Fixed Deposit'}})` + per-capsule recompute via `clio calc fixed-deposit`. Auditor reconciles to bank confirmation letters.
- `bank-loan.md` — mirror pattern (money out instead of in, expense vs income).
