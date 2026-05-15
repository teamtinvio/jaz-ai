# Recipe: FX Revaluation — verification-only (engine name: `fx-reval`)

> **Jaz auto-handles FX revaluation for ALL foreign-currency monetary balances.** AR, AP, cash, bank accounts, intercompany journals, term deposits, FX-denominated provisions — all of it. Period-end translation per IAS 21.23 happens inside the platform with no manual journal required.
>
> **DO NOT invoke `execute_recipe(name: 'fx-reval', ...)` in normal operation.** It would double-post against Jaz's auto-emitted FX gain/loss journals. The recipe survives in the engine for one purpose: **independent cross-check** of what Jaz auto-posted.

## What this recipe is for now

- **Verification:** confirm Jaz's auto-posted FX gain/loss for the period matches your independent calculation
- **Audit support:** produce a worked schedule the auditor can tie back to (closing rate, book rate, foreign amount, computed gain/loss)
- **Variance investigation:** when `generate_trial_balance` shows an unexpected FX Unrealized Gain/Loss balance, recompute what it *should* be and surface the delta

## What this recipe is NOT for anymore

- Posting FX reval journals — Jaz already did it
- Posting Day 1 reversals — Jaz already did it
- Hand-building FX schedules — `clio calc fx-reval` does it offline
- Setting up scheduled FX reval — Jaz handles it on the reporting date

## Tools, recipes, calculators this recipe uses

### Calculator (cross-check, no API key needed)
- **`clio calc fx-reval --amount <foreign> --book-rate <historical> --closing-rate <period-end> --currency <code> --base-currency <CLIENT.base_currency> --json`** — independent gain/loss computation. Returns `{ gainLoss, baseCurrencyValueAtClose, classification: 'gain' | 'loss' }`. Use this to verify what Jaz auto-posted, not to feed `execute_recipe`.

### Tools (jaz-api / direct) — verification only
- **`generate_general_ledger(period_end: <date>, accountResourceId: <FX Unrealized Gain | Loss>)`** — pull what Jaz auto-posted to the FX accounts during the period.
- **`generate_general_ledger(period_end: <date>)`** — discover all foreign-currency monetary balances at period end.
- **`list_currency_rates(currencyCode: 'USD', valueDate: <period-end>)`** — confirm the closing rate Jaz used. Per `jaz-api/SKILL.md` rule 39, rates are direction-aware (`SOURCE_TO_FUNCTIONAL`).
- **`generate_trial_balance(period_end: <date>)`** — confirm foreign-currency monetary balances translated correctly at the closing rate.
- **`generate_balance_sheet(period_end: <date>)`** — IAS 21.23 verification (all monetary items at closing rate).

### Engine entry points (DO NOT INVOKE in normal operation)
- ~~`plan_recipe(name: 'fx-reval', ...)`~~ — engine still accepts this for legacy reasons; output is for inspection only.
- ~~`execute_recipe(name: 'fx-reval', ...)`~~ — **double-posts. Never invoke in a production org.**

### Cross-references
- Within an engagement: invoked from `practice/references/monthly-close.md` step 6 only as a VERIFICATION step (cross-check Jaz's auto-posted reval against an independent calculation; surface variance to practitioner). Same in `quarterly-gst.md` and `annual-statutory.md`.
- IFRS / accounting context: IAS 21.23 (closing-rate translation of monetary items); IAS 21.16 (non-monetary items stay at historical rate). Jaz implements IAS 21.23 automatically.

---

## Verification flow (what to actually do)

### Step 1 — Pull what Jaz auto-posted

```
search_accounts(filter: {name: {in: ['FX Unrealized Gain', 'FX Unrealized Loss', 'FX Bank Revaluation', 'FX Realized Gain', 'FX Realized Loss']}})
```

Get the resourceIds for every FX account in the org. Per memory rule [Bank FX is Revaluation, not Realized]: bank/cash FX is always "FX Bank Revaluation" (not "Realized"). AR/AP FX uses "Realized" (settlement-time) and "Unrealized" (period-end translation). All emitted automatically.

```
generate_general_ledger(
  period_end: '2025-12-31',
  accountResourceIds: [<FX Unrealized Gain id>, <FX Unrealized Loss id>, <FX Bank Revaluation id>],
  groupBy: 'ACCOUNT'
)
```

This is the FX activity Jaz posted during the period. Each row carries the source transaction (the underlying foreign-currency journal / cash entry / invoice / bill) and the rate Jaz applied.

### Step 2 — Discover the eligible foreign-currency balances at period-end

```
generate_general_ledger(period_end: '2025-12-31')
```

Filter to accounts with non-zero balances whose underlying transactions carry a non-base-currency `currency.sourceCurrency`. These are the balances Jaz translated. For each, capture: `{accountName, foreignAmount, sourceCurrency, baseAmountPerJaz}`.

### Step 3 — Independent calculation

For each foreign balance from step 2:

```
list_currency_rates(currencyCode: 'USD', valueDate: '2025-12-31')
```

Then run the calculator:

```
clio calc fx-reval \
  --amount 50000 \
  --book-rate <pull from earliest unposted-against rate>  \
  --closing-rate <list_currency_rates result> \
  --currency USD \
  --base-currency SGD \
  --json
```

Returns `{ gainLoss, baseCurrencyValueAtClose }`. This is what the FX gain/loss for that balance *should* be in isolation.

### Step 4 — Reconcile expected vs actual

Sum your independent gain/loss across all foreign balances. Compare against the FX gain/loss totals from step 1. They should agree within `CLIENT.materiality_threshold`.

If they don't agree:
- **Likely cause 1:** Jaz used a different `book rate` than your independent calc assumed. Settlement-realized FX (when an FX invoice/bill was actually paid in the period) shifts the book rate forward.
- **Likely cause 2:** A new foreign-currency transaction posted with an explicit `currency.exchangeRate` override (per `jaz-api/SKILL.md` rule 25) — overrides the platform-resolved rate.
- **Likely cause 3:** Multi-leg FX (e.g., USD invoice paid from SGD bank with bank-side FX spread) — Jaz splits the FX impact between AR and bank-side.

Surface the variance to practitioner with both numbers and the breakdown by account.

### Step 5 — Document and move on

Save the verification to `recurring/<period>/fx-reval-verification.{json,csv}`:
- Per-balance: foreign amount, book rate, closing rate, expected gain/loss, actual gain/loss (per Jaz GL), variance.
- Total: expected vs actual.
- Variance commentary for any line beyond materiality.

This file feeds `audit-prep.md` step 8 supporting schedules. Auditors love independent FX cross-checks.

---

## When this recipe DOESN'T apply

- Pure SGD-only org (no foreign currencies) — skip entirely.
- Org with multi-currency disabled — `list_currency_rates` returns nothing useful; skip and document.
- An auto-posted FX journal that an auditor questions (post-hoc): use this verification flow to demonstrate the calculation; do NOT correct via `execute_recipe`. If a real correction is needed, post a manual journal targeting `FX Unrealized Gain` / `Loss` directly and document why.

---

## Common error classes and recovery

| Source | Error | Recovery |
|--------|-------|----------|
| Independent calc disagrees with Jaz | Variance > `CLIENT.materiality_threshold` | Investigate per "Likely causes" in step 4. Common false positive: book rate drift after a settlement event mid-period. Re-run with the post-settlement book rate. |
| `list_currency_rates` returns empty for `period_end` | No closing rate set | Practitioner must `add_currency_rate(...)` for the period-end. Without it, Jaz can't translate either — this is also why your variance is suspect (Jaz may have used the most recent rate before period-end as a fallback, not the actual closing rate). |
| Practitioner asks to post a manual reval anyway | (process error) | Halt and explain: Jaz already posted. Manual posting will double-count. If they insist there's a real correction needed, route through a manual journal against `FX Unrealized Gain/Loss` with a clear narrative — NOT through `execute_recipe`. |

---

## Why the engine still accepts the recipe

Historical: pre-platform-auto-FX-reval orgs needed this. Some orgs may still run on a configuration where auto-FX is disabled (rare, legacy). For those orgs, `execute_recipe(name: 'fx-reval', ...)` posts the manual reval per the prior version of this recipe (period-end journal + Day 1 reversal). DO NOT use this path in any modern org.

If you genuinely need to know whether auto-FX is enabled for a specific org: check organization settings via `get_organization()`. If the auto-FX flag is on (default and typical), this recipe is verification-only as documented above.

---

## Cross-references back to engagements

- `practice/references/monthly-close.md` step 6 — VERIFICATION ONLY. Confirm Jaz's auto-posted FX gain/loss matches independent calc; surface variance only. The prior step-6 wording calling for `plan_recipe` + `execute_recipe` is wrong and will be corrected in a follow-up R8.x patch.
- `practice/references/quarterly-gst.md` step 6 — same.
- `practice/references/annual-statutory.md` step 4f — FY-end FX verification feeds audit-prep step 8 supporting schedules; auditors want the independent recomputation alongside Jaz's auto-posted journals.
- `audit-prep.md` step 8 — receives the verification file as a supporting schedule.
