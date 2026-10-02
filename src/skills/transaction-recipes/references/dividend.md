# Recipe: Dividend (calculator type: `dividend`)

> Two-step (or three-step with withholding) recipe for board-declared dividends. One journal (declaration), one cash-out (payment) and, with withholding tax, the withholding entries. One-shot recipe: no schedule. Used annually (final dividend) or interim (mid-year). You calculate, create the capsule and post each entry yourself (see `building-blocks.md` § The three-step flow).

## Tools and calculator this recipe uses

### Calculator (offline, posts nothing)
- **MCP: `calculate(type: 'dividend', amount, declarationDate, paymentDate, withholdingRate, currency)`** (step 1).
- **CLI: `clio calc dividend --amount <gross> --declaration-date <YYYY-MM-DD> --payment-date <YYYY-MM-DD> --withholding-rate <%> --currency <code> --json`** (step 1): the same result. Both dates are required.

### Posting tools
- **`list_capsule_types` / `create_capsule_type(displayName: 'Dividends')` / `create_capsule(...)`** (step 3).
- **`create_journal(...)`** (step 4): the declaration, and the withholding transfer when tax is withheld.
- **`create_cash_out(...)`** (step 4): the payment to shareholders, and later the remittance of the withheld tax.

### Lookup and verification tools
- **`search_capsules(filter: {title: {eq: <capsule title>}})`**: step 0 idempotency check. Each declared dividend gets its own capsule; duplicate setup means double-declaration.
- **`search_accounts(filter: {name: {in: ['Retained Earnings', 'Dividends Payable', 'Withholding Tax Payable']}})`**: step 2.
- **`search_contacts(filter: {name: {eq: <shareholder>}})`**: step 2 (the payee, typically a shareholder or a holding entity).
- **`generate_balance_sheet(snapshotDate: <date>)`** (step 2 pre-check and step 5 verification): Retained Earnings available before declaring; reduced after; Dividends Payable nil after payment.
- **`generate_equity_movement(primarySnapshotStartDate, primarySnapshotEndDate)`** (step 5): dividends appear as a distinct line item in equity movement, separate from net profit.

### Cross-references
- Operational context: invoked during year-end close (Y3 in `year-end-close.md`) for the FY-end final dividend; ad-hoc during month-end close when an interim dividend is declared mid-year.
- Sibling: NONE (dividend is one-shot, doesn't share patterns with other recipes).
- IFRS / accounting context: dividends declared but not yet paid are a current liability (Dividends Payable per IAS 1.54(k)); dividends paid reduce equity directly via Retained Earnings (NOT P&L).

---

## Step-by-step

### Step 0: Idempotency check

```
search_capsules(filter: {title: {eq: 'FY2025 Final Dividend'}})
```

If a result returns: halt and surface "Dividend capsule `<name>` already exists. Re-posting would create a duplicate declaration. Confirm: if posting an interim dividend, use a different capsule title (e.g., `Q3 2025 Interim Dividend`)."

### Step 1: Calculate

```
calculate(
  type: 'dividend',
  amount: 200000,
  withholdingRate: 0,
  declarationDate: '2025-12-31',
  paymentDate: '2026-03-15',
  currency: 'SGD'
)
```

```
clio calc dividend --amount 200000 --declaration-date 2025-12-31 --payment-date 2026-03-15 --withholding-rate 0 --currency SGD --json
```

Returns `{ grossAmount: 200000, netToShareholders: 200000, withholdingTax: 0, declarationJournal, paymentJournal, withholdingJournal: null, blueprint }` for SG (no withholding on dividends from SG-resident companies: SG operates a one-tier corporate tax system, dividends are tax-exempt at the shareholder level under ITA s13(1)(z)).

For PH or jurisdictions with withholding (e.g., 10% PH dividend WHT to non-resident foreign corporations under NIRC §28(B)(5)(b)):

```
clio calc dividend --amount 200000 --declaration-date 2025-12-31 --payment-date 2026-03-15 --withholding-rate 10 --currency PHP --json
# → { grossAmount: 200000, netToShareholders: 180000, withholdingTax: 20000, ... }
```

`blueprint.steps`:
- Step 1, `journal`, dated `declarationDate`: Dr Retained Earnings 200,000 / Cr Dividends Payable 200,000.
- Step 2, `cash-out`, dated `paymentDate`: Dr Dividends Payable 200,000 / Cr Cash / Bank Account 200,000. With withholding: Dr Dividends Payable 200,000 / Cr Cash / Bank Account 180,000 / Cr Withholding Tax Payable 20,000.
- Step 3 (only if `withholdingRate > 0`), `cash-out`, dated `paymentDate`: the remittance to the tax authority, Dr Withholding Tax Payable 20,000 / Cr Cash / Bank Account 20,000.

### Step 2: Resolve accounts, bank account and distributable profits

The blueprint's account names are labels. Map each to the real account:
- `search_accounts(filter: {name: {in: ['Retained Earnings', 'Dividends Payable', 'Withholding Tax Payable']}})`. Suggested classifications: `Retained Earnings` → `Shareholders Equity`; `Dividends Payable` → `Current Liability`; `Withholding Tax Payable` → `Current Liability`.

If `Dividends Payable` doesn't exist: `create_account(name: 'Dividends Payable', code: <unused account code>, accountType: 'Current Liability', currencyCode: <base currency>)` first. This is a common gap in CoAs that haven't paid dividends before.

Bank account: `list_bank_accounts()` if the bank account resourceId isn't already known.

Shareholder contact: optional but recommended for narrative tagging. `search_contacts(filter: {name: {eq: <shareholder>}})`. If empty: `create_contact(name: <shareholder>, customer: false, supplier: false)`; mark as "other" / shareholder type if your CoA has a custom field for that.

**Distributable profits check.** Nothing blocks a declaration that exceeds retained earnings, so check it yourself: `generate_balance_sheet(snapshotDate: <declarationDate>)`. If the dividend would push Retained Earnings negative, halt and surface: "Declaration would result in a dividend out of capital. Verify available retained earnings." In Singapore a dividend is payable only out of profits (Companies Act s403).

### Step 3: Create the capsule

```
list_capsule_types()
create_capsule(
  capsuleTypeResourceId: <id of 'Dividends'>,
  title: 'FY2025 Final Dividend',
  description: <blueprint.capsuleDescription>
)
```

If `Dividends` is not in the list: `create_capsule_type(displayName: 'Dividends')` first.

### Step 4: Post the entries

**4a. Declaration** (blueprint step 1), dated the board resolution date:

```
create_journal(
  valueDate: '2025-12-31',
  reference: 'DIV-FY2025-DECL',
  journalEntries: [
    { accountResourceId: <Retained Earnings>, type: 'DEBIT', amount: 200000, description: 'Dividend declaration, FY2025 final' },
    { accountResourceId: <Dividends Payable>, type: 'CREDIT', amount: 200000, description: 'Dividend declaration, FY2025 final' }
  ],
  saveAsDraft: false,
  capsuleResourceId: <capsule id>
)
```

**4b. Payment** (blueprint step 2). Post it on the actual payment date, once the money has left the bank account: a cash entry posts ACTIVE immediately and has no draft state, so a payment recorded ahead of time is a live bank payment that has not happened, which the bank reconciliation will not match until the real payment arrives.

```
create_cash_out(
  valueDate: '2026-03-15',
  accountResourceId: <bank account>,
  reference: 'DIV-FY2025-PAY',
  lines: [{ accountResourceId: <Dividends Payable>, amount: 200000, description: 'Dividend payment to shareholders' }],
  capsuleResourceId: <capsule id>
)
```

**With withholding tax** the payment step has a credit to Withholding Tax Payable beside the bank line, and a cash-out can only debit its lines. Split it in two, both dated `paymentDate`:
- `create_cash_out` for the NET amount (180,000) against Dividends Payable.
- `create_journal`: Dr Dividends Payable 20,000 / Cr Withholding Tax Payable 20,000.

Together they clear Dividends Payable (200,000) and leave the withheld tax owing to the authority.

**4c. Withholding remittance** (blueprint step 3). When the tax is actually remitted: `create_cash_out` for 20,000 against Withholding Tax Payable, with `capsuleResourceId`.

### Step 5: Verify (after the declaration is finalized and the payment is posted)

After declaration finalized (Dec 31, 2025):
- `generate_balance_sheet(snapshotDate: '2025-12-31')`.
- Assert: `balance['Retained Earnings']` reduced by 200,000.
- Assert: `balance['Dividends Payable']` increased by 200,000.

After payment posted (Mar 15, 2026):
- `generate_balance_sheet(snapshotDate: '2026-03-15')`.
- Assert: `balance['Dividends Payable']` is now 0.
- Assert: `balance['Cash']` reduced by 200,000 (or 180,000 if withholding).
- Assert (with withholding): `balance['Withholding Tax Payable']` increased by 20,000, pending separate remittance to tax authority.

`generate_equity_movement(primarySnapshotStartDate: '2025-01-01', primarySnapshotEndDate: '2025-12-31')` should show "Dividends declared: 200,000" as a distinct line below "Net Profit", reducing closing equity.

After payment AND WHT remittance:
- `balance['Withholding Tax Payable']` back to 0.
- Capsule lifecycle complete; close via a manual `update_capsule(resourceId: <id>, title: '<original> [CLOSED]')` (the API has no `status` field for capsules; closure is informational only).

---

## Common problems and recovery

| Where | Problem | Recovery |
|--------|-------|----------|
| Calculator | Withholding rate questioned | The rate is a percentage (10 = 10%). Verify jurisdiction; SG = 0; PH non-resident foreign = 10% (NIRC §28(B)(5)(b)); others vary by treaty. |
| Step 2 | `Dividends Payable` is missing | The most-commonly-missing account. Create via `create_account`. |
| Step 2 | Dividend exceeds retained earnings | Halt (see the distributable profits check). Do not post the declaration. |
| `create_cash_out` | Dividend currency ≠ bank account currency | Pay from a bank account in the dividend's currency, or record the FX on the cash-out. |
| Step 5 verification | Net Profit affected by dividend | Should NEVER happen: the declaration debits Retained Earnings, not P&L. If the TB shows P&L impact, a journal was mis-mapped to an expense account. Reverse it and re-post against Retained Earnings. |
| Withholding tax remitted but `Withholding Tax Payable` still nonzero | (process gap) | The WHT remittance to the authority was not posted. Post `create_cash_out` with a line against Withholding Tax Payable for the WHT amount. |
| Interim dividend declared after final dividend already in capsule | (process) | Use a NEW capsule title (e.g., `Q1 2026 Interim Dividend` if it's the next FY's interim). The idempotency check protects against a duplicate same-title capsule. |

---

## Variations

- **Interim dividend** (mid-year, ad-hoc): same recipe, different `declarationDate` and capsule name. Sometimes paid same day as declaration → `paymentDate == declarationDate`.
- **Stock dividend** (bonus shares, no cash): NOT supported by this recipe. Manual journal pattern: Dr Retained Earnings / Cr Share Capital (or Bonus Issue Reserve) for the par value of new shares issued.
- **Multiple shareholders with different proportions**: Either calculate and post each shareholder's portion separately (each with its own capsule for traceability), or post one combined dividend for the total and use journal narratives + tags to split.
- **Cross-border dividend with treaty rate**: pass the treaty `withholdingRate` (e.g., SG-MY DTA dividend WHT is 0%-10% depending on shareholding). Practitioner confirms treaty applicability before posting.
- **Dividend in foreign currency**: pass `currency: 'USD'` (e.g., dividend to USD-denominated holding company). Per `jaz-api/SKILL.md` rule 25, payment cash-out uses `currency: { sourceCurrency: 'USD' }`. Jaz auto-handles FX revaluation of any USD-denominated `Dividends Payable` outstanding at period-end.
- **Scrip dividend** (option to receive cash or shares): NOT supported. Cash portion via this recipe, share portion via the stock-dividend manual pattern, depending on take-up.

---

## Cross-references

- Year-end close (Y3 in year-end-close): final FY dividend declaration AFTER the FY's audited net profit is determined. The declared amount and withholding rate are the calculator inputs.
- Month-end close: interim dividends declared mid-year are posted in the month they were declared. Book the declaration with `create_journal` in the declaration month; record the payment with `create_cash_out` only when the bank disbursement has happened (typically next month), because a cash entry posts ACTIVE immediately.
- `audit-prep.md` step 8: auditor reviews `generate_equity_movement` to verify dividends are correctly classified as equity reduction (not P&L expense).
