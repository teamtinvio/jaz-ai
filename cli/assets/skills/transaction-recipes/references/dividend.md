# Recipe: Dividend (engine name: `dividend`)

> Two-step (or three-step with withholding) recipe for board-declared dividends. Engine emits 1 journal (declaration) + 1 cash-out (payment) + optional 1 cash-out (withholding tax remit). One-shot recipe — no schedule. Used annually (final dividend) or interim (mid-year).

## Tools, recipes, calculators this recipe uses

### Recipe engine entry point
- **`plan_recipe(recipe: 'dividend', ...)`** — used in step 2: returns RecipePlan with declaration journal + payment cash-out + optional withholding cash-out.
- **`execute_recipe(recipe: 'dividend', ...)`** — used in step 4: posts 2-3 entries (no future-dated DRAFTs — dividend is point-in-time).

### Calculator (cross-check, no API key needed)
- **`clio calc dividend --amount <gross> --withholding-rate <%> --currency <code> --json`** — used in step 1: computes net dividend payable to shareholder + withholding tax to remit. Returns `{ grossAmount, withholdingTax, netToShareholder }`.

### Tools (jaz-api / direct)
- **`search_capsules(filter: {capsuleType: {eq: 'Dividends'}, name: {eq: <capsule.name>}})`** — step 0 idempotency check. Each declared dividend gets its own capsule; duplicate setup means double-declaration.
- **`search_accounts(filter: {name: {in: ['Retained Earnings', 'Dividends Payable', 'Withholding Tax Payable']}})`** — step 3.
- **`search_contacts(filter: {name: {eq: <shareholder>}})`** — step 3 (the payee — typically a shareholder or a holding entity).
- **`generate_balance_sheet(period_end: <date>)`** — step 5 verification: Retained Earnings reduced; Dividends Payable nil after payment.
- **`generate_equity_movement(period_start, period_end)`** — step 5: dividends appear as a distinct line item in equity movement, separate from net profit.

### Cross-references
- Within an engagement: invoked from `practice/references/annual-statutory.md` step 4 (Y3 in `year-end-close.md`) for FY-end final dividend; from `practice/references/monthly-close.md` ad-hoc when interim dividend is declared mid-year.
- Sibling: NONE (dividend is one-shot, doesn't share patterns with other recipes).
- IFRS / accounting context: dividends declared but not yet paid are a current liability (Dividends Payable per IAS 1.54(k)); dividends paid reduce equity directly via Retained Earnings (NOT P&L).

---

## Step-by-step

### Step 0 — Idempotency check

```
search_capsules(filter: {capsuleType: {eq: 'Dividends'}, name: {eq: 'FY2025 Final Dividend'}})
```

If a result returns: halt and surface "Dividend capsule `<name>` already exists. Re-running would create a duplicate declaration. Confirm — if posting an interim dividend, use a different capsule name (e.g., `Q3 2025 Interim Dividend`)."

### Step 1 — Independent cross-check (calculator)

```
clio calc dividend --amount 200000 --withholding-rate 0 --currency SGD --json
```

Returns: `{ grossAmount: 200000, withholdingTax: 0, netToShareholder: 200000 }` for SG (no withholding on dividends from SG-resident companies — SG operates a one-tier corporate tax system, dividends are tax-exempt at the shareholder level under ITA s13(1)(z)).

For PH or jurisdictions with withholding (e.g., 10% PH dividend WHT to non-resident foreign corporations under NIRC §28(B)(5)(b)):

```
clio calc dividend --amount 200000 --withholding-rate 10 --currency PHP --json
# → { grossAmount: 200000, withholdingTax: 20000, netToShareholder: 180000 }
```

### Step 2 — Plan the recipe

```
plan_recipe(
  // Note: gl*, capsuleType, capsuleName, bankAccountResourceId, vendor, customer below are illustrative — auto-resolved at execute time from CoA / CLIENT.md, not real plan_recipe params.
  recipe: 'dividend',
  amount: 200000,
  withholdingRate: 0,
  declarationDate: '2025-12-31',
  paymentDate: '2026-03-15',
  currency: 'SGD',
  glRetainedEarnings: <CLIENT.coa_mapping['Retained Earnings']>,
  glDividendsPayable: <CLIENT.coa_mapping['Dividends Payable']>,
  glWithholdingPayable: <CLIENT.coa_mapping['Withholding Tax Payable']>,
  bankAccountResourceId: <CLIENT.bank_accounts[i].jaz_resource_id>,
  shareholder: 'TIN Holdings Pte Ltd',
  capsuleType: 'Dividends',
  capsuleName: 'FY2025 Final Dividend'
)
```

Returns `RecipePlan` with `requiredAccounts: ['Retained Earnings', 'Dividends Payable', 'Cash / Bank Account']` (+ `Withholding Tax Payable` if `withholdingRate > 0`), `needsContact: false` (shareholder is metadata only), `needsBankAccount: true`, `steps`:
- Step 1: declaration journal dated `declarationDate` — Dr Retained Earnings 200,000 / Cr Dividends Payable 200,000
- Step 2: payment cash-out dated `paymentDate` — Dr Dividends Payable 200,000 / Cr Cash 200,000 (or net amount if withholding)
- Step 3 (if withholdingRate > 0): withholding cash-out dated `paymentDate` — Dr Dividends Payable (withholding portion) / Cr Withholding Tax Payable

### Step 3 — Resolve dependencies

For each account in `requiredAccounts`:
- `search_accounts(filter: {name: {eq: <accountName>}})`. Suggested classifications: `Retained Earnings` → `Shareholders Equity`; `Dividends Payable` → `Current Liability`; `Withholding Tax Payable` → `Current Liability`.

If `Dividends Payable` doesn't exist: `create_account(name: 'Dividends Payable', accountType: 'Current Liability', currency: <CLIENT.base_currency>)` first. This is a common gap in CoAs that haven't paid dividends before.

Bank account: resolve `bankAccountResourceId` via `list_bank_accounts()` if `CLIENT.bank_accounts[i].jaz_resource_id` is empty.

Shareholder contact: optional but recommended for narrative tagging. `search_contacts(filter: {name: {eq: <shareholder>}})`. If empty: `create_contact(name: <shareholder>, customer: false, supplier: false)` — mark as "other" / shareholder type if your CoA has a custom field for that.

### Step 4 — Execute

```
execute_recipe(recipe: 'dividend', ...same args...)  // accounts auto-resolved from CoA; pass `bankAccountName` / `contactName` for fuzzy resolve
```

Returns: `{ capsule: {resourceId, type, title}, steps: [{step, action, status, resourceId}, ...], summary: {total: 2 or 3, created: 2 or 3} }`. The recipe creates 2 entries (or 3 with withholding), all attached to the same capsule:
- Declaration journal (DRAFT or ACTIVE per `finalize` flag)
- Payment cash-out (DRAFT — the actual bank payment hasn't happened yet at recipe-execution time; finalize when payment leaves the account)
- Withholding cash-out (DRAFT — same; finalize when the WHT remittance is made to tax authority)

### Step 5 — Verify (after both finalized)

After declaration finalized (Dec 31, 2025):
- `generate_balance_sheet(period_end: '2025-12-31')`.
- Assert: `balance['Retained Earnings']` reduced by 200,000.
- Assert: `balance['Dividends Payable']` increased by 200,000.

After payment finalized (Mar 15, 2026):
- `generate_balance_sheet(period_end: '2026-03-15')`.
- Assert: `balance['Dividends Payable']` is now 0.
- Assert: `balance['Cash']` reduced by 200,000 (or 180,000 if withholding).
- Assert (with withholding): `balance['Withholding Tax Payable']` increased by 20,000 — pending separate remittance to tax authority.

`generate_equity_movement(period_start: '2025-01-01', period_end: '2025-12-31')` should show "Dividends declared: 200,000" as a distinct line below "Net Profit", reducing closing equity.

After payment AND WHT remittance:
- `balance['Withholding Tax Payable']` back to 0.
- Capsule lifecycle complete; close via a manual `update_capsule(title: '<original> [CLOSED]')` (the API has no `status` field for capsules — closure is informational only).

---

## Common error classes and recovery

| Source | Error | Recovery |
|--------|-------|----------|
| `plan_recipe` | 422 `unsupported_recipe` | Use canonical engine name `dividend` (already canonical). |
| `plan_recipe` | 422 `withholding_rate_invalid` | Rate must be 0-100. Verify jurisdiction; SG = 0; PH non-resident foreign = 10% (NIRC §28(B)(5)(b)); others vary by treaty. |
| `execute_recipe` | 422 `account_not_found` | Step 3 incomplete. `Dividends Payable` is the most-commonly-missing account. Create via `create_account`. |
| `execute_recipe` | 422 `negative_retained_earnings` | The dividend would push Retained Earnings negative. SG ITA s403(2) — companies cannot declare dividends out of capital (must be from accumulated profits). Halt and surface to practitioner: "Declaration would result in dividend out of capital. Verify available retained earnings via `generate_balance_sheet`." |
| `execute_recipe` | 422 `currency_mismatch_bank_account` | Dividend currency ≠ bank account currency. Pass `currency` matching the disbursement bank, or model as FX cash-out (different `paymentAmount` and `transactionAmount`). |
| Step 5 verification | Net Profit affected by dividend | Should NEVER happen via recipe (engine debits Retained Earnings, not P&L). If TB shows P&L impact: practitioner posted a manual journal mis-mapping. Reverse and re-run via recipe. |
| Withholding tax remitted but `Withholding Tax Payable` still nonzero | (process gap) | Practitioner forgot to post the WHT remittance to authority. Post `create_cash_out_entry` with line: Dr Withholding Tax Payable / Cr Cash for the WHT amount. |
| Interim dividend declared after final dividend already in capsule | (process) | Use a NEW capsule name (e.g., `Q1 2026 Interim Dividend` if it's the next FY's interim). Idempotency check protects against duplicate same-name. |

---

## Variations

- **Interim dividend** (mid-year, ad-hoc): same recipe, different `declarationDate` and capsule name. Sometimes paid same day as declaration → `paymentDate == declarationDate`.
- **Stock dividend** (bonus shares, no cash): NOT supported by this recipe. Manual journal pattern: Dr Retained Earnings / Cr Share Capital (or Bonus Issue Reserve) for the par value of new shares issued.
- **Multiple shareholders with different proportions**: For each shareholder, run `plan_recipe + execute_recipe` separately with their portion of the dividend. Each gets its own capsule for traceability. Or run one combined recipe with the total amount and use journal narratives + tags to split.
- **Cross-border dividend with treaty rate**: pass the treaty `withholdingRate` (e.g., SG-MY DTA dividend WHT is 0%-10% depending on shareholding). Practitioner confirms treaty applicability before invoking.
- **Dividend in foreign currency**: pass `currency: 'USD'` (e.g., dividend to USD-denominated holding company). Per `jaz-api/SKILL.md` rule 25, payment cash-out uses `currency: { sourceCurrency: 'USD' }`. Jaz auto-handles FX revaluation of any USD-denominated `Dividends Payable` outstanding at period-end.
- **Scrip dividend** (option to receive cash or shares): NOT supported. Two recipe invocations OR manual pattern depending on take-up.

---

## Cross-references back to engagements

- `practice/references/annual-statutory.md` step 4 (Y3 in year-end-close) — final FY dividend declaration AFTER the FY's audited net profit is determined. Practice playbook reads `CLIENT.dividend_policy.declared_for_FY` and `CLIENT.dividend_policy.withholding_rate` to drive recipe inputs.
- `practice/references/monthly-close.md` — interim dividends declared mid-year are posted in the month they were declared. Recipe runs once at declaration; payment cash-out finalizes when the actual bank disbursement happens (typically next month).
- `audit-prep.md` step 8 — auditor reviews `generate_equity_movement` to verify dividends are correctly classified as equity reduction (not P&L expense).
- `statutory-filing.md` — SG Form C-S Box 12 (dividends paid during YA) reads from this capsule's payment cash-out entries.
