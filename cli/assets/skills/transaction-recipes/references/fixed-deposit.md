# Recipe: Fixed Deposit (calculator type: `fixed-deposit`)

> Recipe for IFRS 9 amortized-cost fixed deposits (hold-to-collect, SPPI). One cash-out (placement), N interest accrual journals, one cash-in (maturity), all in one capsule. You calculate, create the capsule and post each entry yourself (see `building-blocks.md` § The three-step flow).

## Tools and calculator this recipe uses

### Calculator (offline, posts nothing)
- **MCP: `calculate(type: 'fixed-deposit', principal, annualRate, termMonths, compounding, startDate, currency)`** (step 1). `compounding` is `none` (simple interest, the default), `monthly`, `quarterly` or `annually`.
- **CLI: `clio calc fixed-deposit --principal <p> --rate <annual %> --term <months> --start-date <YYYY-MM-DD> --currency <code> [--compound monthly|quarterly|annually] --json`** (step 1): the same result.

### Posting tools
- **`list_capsule_types` / `create_capsule_type(displayName: 'Fixed Deposit')` / `create_capsule(...)`** (step 3).
- **`create_cash_out(...)`** (step 4): the placement.
- **`create_journal(...)`** (step 4): one per accrual period.
- **`create_cash_in(...)`** (step 6): the maturity receipt, posted when the bank pays out.

### Lookup and verification tools
- **`search_capsules(filter: {title: {eq: <capsule title>}})`**: step 0 idempotency check.
- **`search_accounts(filter: {name: {in: ['Fixed Deposit Receivable', 'Accrued Interest Receivable', 'Interest Income']}})`**: step 2.
- **`list_bank_accounts()`**: step 2, the operating account the placement leaves from.
- **`search_contacts(filter: {supplier: true, name: {eq: <bank>}})`**: step 2 optional: bank contact for narrative.
- **`generate_trial_balance(endDate: <date>)`**: step 5 verify accrued interest builds; FD principal stays at carrying amount until maturity.

### Cross-references
- Operational context: invoked during month-end close (existing FD capsules: post or finalize this month's accrual; new FD placements during the period: set the capsule up).
- Sibling: `bank-loan.md` (mirror pattern: money out instead of in, interest expense vs income); `provisions.md` (similar PV-unwinding pattern but for liabilities).
- IFRS / accounting context: IFRS 9.4.1 (amortized cost classification: hold to collect, SPPI). IFRS 9.5.4.1 (effective interest method). For FDs that don't meet SPPI (e.g., structured deposits with embedded derivatives): use FVTPL or FVOCI classification; different recipe pattern needed (NOT this recipe).

---

## Step-by-step

### Step 0: Idempotency check

```
search_capsules(filter: {title: {eq: 'DBS FD, SGD 100,000, 12 months, 3.5%, FD-2025-0193'}})
```

If a result returns: halt. Each FD placement is unique; duplicate setup means double-counted financial asset.

### Step 1: Calculate

```
calculate(
  type: 'fixed-deposit',
  principal: 100000,
  annualRate: 3.5,
  termMonths: 12,
  startDate: '2025-01-01',
  currency: 'SGD'
)
```

```
clio calc fixed-deposit --principal 100000 --rate 3.5 --term 12 --start-date 2025-01-01 --currency SGD --json
```

Returns `{ maturityValue: 103500, totalInterest: 3500, effectiveRate: 3.5, schedule: [{ period, date, openingBalance, interest, closingBalance, journal }, ...12], placementJournal, maturityJournal, blueprint }`. For simple interest at 3.5% annual: `100,000 × 3.5% / 12 = $291.67/month`, with the final month at $291.63 so the total is exactly $3,500. For compound: pass `compounding: 'monthly'` (CLI `--compound monthly`) → `100,000 × ((1 + 0.035/12)^12 - 1) = $3,556.70` total, with each month's accrual on the carrying amount including prior accrued interest. The term must be a multiple of the compounding interval.

`blueprint.steps` (14):
- Step 1, `cash-out`, dated `2025-01-01`: placement, Dr Fixed Deposit 100,000 / Cr Cash / Bank Account 100,000.
- Steps 2 to 13, `journal`, dated `2025-02-01` through `2026-01-01`: Dr Accrued Interest Receivable / Cr Interest Income (291.67 per period, 291.63 in the last).
- Step 14, `cash-in`, dated `2026-01-01`: maturity, Dr Cash / Bank Account 103,500 / Cr Fixed Deposit 100,000 / Cr Accrued Interest Receivable 3,500 (settles both balances).

Save the schedule to `workpapers/<period>/fd-<bank>-<reference>.json`.

### Step 2: Resolve accounts and the bank account

The blueprint's account names are labels. Map each to the real account:
- `search_accounts(filter: {name: {in: ['Fixed Deposit Receivable', 'Accrued Interest Receivable', 'Interest Income']}})`. Suggested classifications: `Fixed Deposit Receivable` → `Current Asset` (≤12-month FD) OR `Non-current Asset` (>12-month); `Accrued Interest Receivable` → `Current Asset`; `Interest Income` → `Other Revenue`.

Bank account: `list_bank_accounts()` for the account the cash leaves from. It should be the actual operational bank account, NOT the FD itself; the FD becomes its own balance-sheet line, separate from cash.

### Step 3: Create the capsule

```
list_capsule_types()
create_capsule(
  capsuleTypeResourceId: <id of 'Fixed Deposit'>,
  title: 'DBS FD, SGD 100,000, 12 months, 3.5%, FD-2025-0193',
  description: <blueprint.capsuleDescription>
)
```

If `Fixed Deposit` is not in the list: `create_capsule_type(displayName: 'Fixed Deposit')` first.

### Step 4: Post the placement and the accruals

**4a. Placement** (blueprint step 1). Posts ACTIVE immediately: cash entries have no draft state, so post it once the money has left the operating account.

```
create_cash_out(
  valueDate: '2025-01-01',
  accountResourceId: <operating bank account>,
  reference: 'FD-2025-0193-PLACE',
  lines: [{ accountResourceId: <Fixed Deposit Receivable>, amount: 100000, description: 'FD placement, DBS FD-2025-0193' }],
  capsuleResourceId: <capsule id>
)
```

**4b. Interest accruals** (blueprint steps 2 to 13). One `create_journal` per step:

```
create_journal(
  valueDate: '2025-02-01',
  reference: 'FD-2025-0193-01',
  journalEntries: [
    { accountResourceId: <Accrued Interest Receivable>, type: 'DEBIT', amount: 291.67, description: 'Interest accrual, month 1 of 12' },
    { accountResourceId: <Interest Income>, type: 'CREDIT', amount: 291.67, description: 'Interest accrual, month 1 of 12' }
  ],
  saveAsDraft: true,
  capsuleResourceId: <capsule id>
)
```

Post each month's accrual at that month's close, or post all of them now as drafts and finalize one per month. A simple-interest deposit accrues the same amount every month except the last, so a `create_scheduled_journal` for the first 11 months plus one manual final journal also works (see `building-blocks.md` § "Same amount every period"). Compound interest changes every month: dated journals only.

Do NOT post the maturity cash-in (blueprint step 14) now. It would record a bank receipt that has not happened.

### Step 5: Monthly action (during monthly-close)

Post this period's accrual, or find it by its reference and finalize it:

```
search_journals(filter: {reference: {eq: 'FD-2025-0193-03'}})
update_journal(resourceId: <journal id>, saveAsDraft: false)
```

Journals cannot be filtered by capsule, and a date-plus-status search returns every matching DRAFT in the org: never feed one into `bulk_update_journals` or `delete_journal`.

Verify after each period:
- `generate_trial_balance(endDate: <month-end>)`.
- Assert: `balance['Accrued Interest Receivable']` equals the sum of `schedule[].interest` up to this period (within 1 cent).
- Assert: `balance['Interest Income'] (period MTD) == schedule[periodIndex].interest`.
- `balance['Fixed Deposit Receivable']` stays at `100,000` until maturity.

### Step 6: Maturity

When the bank pays out, post the maturity receipt (blueprint step 14) with the amounts actually received:

```
create_cash_in(
  valueDate: '2026-01-01',
  accountResourceId: <operating bank account>,
  reference: 'FD-2025-0193-MATURITY',
  lines: [
    { accountResourceId: <Fixed Deposit Receivable>, amount: 100000, description: 'FD principal returned' },
    { accountResourceId: <Accrued Interest Receivable>, amount: 3500, description: 'FD interest received' }
  ],
  capsuleResourceId: <capsule id>
)
```

If it needs correcting afterwards: `update_cash_in(resourceId: <cash-in id>, lines: [...])`.

Verify after maturity:
- `balance['Fixed Deposit Receivable'] == 0` (FD asset extinguished).
- `balance['Accrued Interest Receivable'] == 0` (settled into Cash).
- `balance['Cash']` increased by 103,500 ($100K principal + $3.5K interest).

Close capsule via a manual `update_capsule(resourceId: <id>, title: '<original> [CLOSED]')` (the API has no `status` field for capsules; closure is informational only).

If the bank auto-rolls the FD at maturity: do NOT close the capsule. Instead, post the rollover via `create_journal` (Dr Fixed Deposit Receivable New / Cr Fixed Deposit Receivable Old + Cr Accrued Interest Receivable for any settled interest), then calculate afresh for the rolled term and start a new FD capsule.

---

## Common problems and recovery

| Where | Problem | Recovery |
|--------|-------|----------|
| Calculator | "Term (months) must be a positive integer" | FD term must be ≥ 1 month. For overnight / call deposits: classify as Cash equivalent (IAS 7.6); treat the deposit account as a bank account, no recipe. |
| Calculator | "Term (N months) must be a multiple of M for ... compounding." | The term does not align with the compounding interval. Check the bank's confirmation for both. |
| Step 2 | `Accrued Interest Receivable` is missing | Common gap: many CoAs lack this account. Create via `create_account(name: 'Accrued Interest Receivable', code: <unused account code>, accountType: 'Current Asset')`. |
| `create_cash_out` | Placement bank currency ≠ FD currency | Either use a matching-currency bank account, OR record the FX leg on the placement (USD FD funded from an SGD account). |
| Premature withdrawal (penalty) | (process) | Bank pays reduced interest. Manual journal: Dr Cash (reduced amount), Dr Loss on Premature Withdrawal (penalty), Cr Fixed Deposit Receivable (full principal), Cr Accrued Interest Receivable (any settled portion). Delete the remaining DRAFT accrual journals (`delete_journal` per future period). |
| Compound vs simple mismatch | Verification fails: accrued interest off by cents | The calculator uses simple interest by default. If the bank actually compounds: recalculate with `compounding: 'monthly'`, correct the accruals already posted, and post the remaining periods from the corrected schedule. |
| FX-denominated FD | (verification) | Jaz auto-handles period-end FX revaluation of the FD principal AND accrued interest balances per IAS 21.23 (do NOT post an `fx-reval` result; see `fx-revaluation.md`). |

---

## Variations

- **Compound interest**: `compounding: 'monthly'` (or `quarterly`, `annually`; CLI `--compound`). Each period's accrual is on the carrying amount (principal + interest compounded to date), not principal only, so later periods accrue slightly more than under simple interest.
- **FX-denominated**: `currency: 'USD'`. Placement records in USD via `currency: { sourceCurrency: 'USD' }`. Monthly accruals also USD. Period-end FX reval is auto-handled by Jaz.
- **Auto-rollover**: don't close capsule at maturity; post rollover via manual journal then start a new FD capsule for the rolled term.
- **Tiered-rate FD** (rate steps up over the term): NOT supported by a single calculation. Calculate each rate tier as its own shorter-term deposit, back-to-back, and post them into one capsule.
- **Stepped-coupon bond** (similar economic substance but legally a bond): different IFRS 9 classification (FVOCI typically); use a PV-unwinding pattern like `provisions.md`, not this recipe.

---

## Cross-references

- Month-end close: invoked monthly to post or finalize this period's accrual for each existing FD capsule. New FD placements during the period: set up the capsule and post the placement.
- Year-end close: final FY accrual cross-check + classification (current vs non-current depending on remaining term at FY-end).
- `audit-prep.md` step 8: supporting schedule via `search_capsules(filter: {status: {eq: 'ACTIVE'}})` (capsule type is not filterable; see `jobs/references/building-blocks.md` § Filter limits) + per-capsule recompute via `clio calc fixed-deposit`. Auditor reconciles to bank confirmation letters.
- `bank-loan.md`: mirror pattern (money out instead of in, expense vs income).
