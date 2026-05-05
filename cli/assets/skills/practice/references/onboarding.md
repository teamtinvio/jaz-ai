# Onboarding — agent playbook

Canonical playbook the agent walks through when the practitioner says "onboard `<client>`" or "take over `<client>` from `<prior-firm>`" and an active engagement of `type: onboarding` is loaded. Driver: a sequence of jaz-api setup tools, optionally routed through `jaz-conversion` if the prior firm is Xero / QuickBooks / Sage / MYOB.

**Scope:** ACCOUNTING workflow only — opening balances, COA setup, multi-currency, banking, first reconciliation. KYC, AML, beneficial-ownership, engagement-letter / fee structure are firm-administrative and live elsewhere.

## Tools, recipes, calculators this engagement uses

### Tools (jaz-api / direct API)
- `get_organization` — used in step 1: verify the org behind the JAZ_API_KEY matches the legal entity the practitioner intends to onboard.
- `list_currencies` — used in step 2: see currencies enabled in the org.
- `add_currency` — used in step 2: enable any missing currency from prior-firm TB.
- `add_currency_rate` / `bulk_upsert_currency_rates` — used in step 2: load FYE / takeover-date rates. Bulk auto-enables currencies (jaz-api rule on Bulk Rates).
- `search_accounts` — used in step 3: discover existing CoA + system-generated accounts that cannot be deleted (jaz-conversion rule 6).
- `create_account` — used in step 3: per CoA seed account when creating one-by-one.
- `update_account` — used in step 7: set lock dates per account at takeover date.
- `search_tax_profiles` — used in step 3: enumerate org's pre-existing tax profiles. NEVER create profiles (jaz-api rule 17).
- `bulk_create_contacts` — used in step 4: counterparty migration; max 500 per call.
- `search_background_jobs` — used in step 4 and step 5: poll the async bulk_create_contacts (`UPSERT_CONTACTS`) and bank statement import (`PROCESS_BANK_STATEMENT_FILES`) jobs. Filter must use `resourceId`, NOT `jobId` (jaz-api Background Jobs rule).
- `list_bank_accounts` — used in step 5: resolve `CLIENT.bank_accounts[i].jaz_resource_id`.
- `import_bank_statement` — used in step 5: first-month bank statement import per account.
- `add_bank_records` — used in step 5: only if bank import doesn't fit (manual record-by-record entry for low-volume accounts).
- `create_bank_rule` — used in step 5: bank rules drafted from the practitioner's recurring-counterparty list.
- `create_journal` — used in step 6: TTB opening journal (the conversion pipeline path; jaz-conversion rule 1 — TTB is a regular journal).
- `create_transfer_trial_balance` — used in step 6: alternate path if exposed; jaz-conversion notes the dedicated TTB module isn't yet on the API, so use `create_journal`.
- `bulk_upsert_invoices` / `bulk_upsert_bills` — used in step 6 only when running a full conversion (Phase 2) per `jaz-conversion/references/option1-full.md`.
- `bulk_upsert_customer_credit_notes` / `bulk_upsert_supplier_credit_notes` — used in step 6 for full conversion.
- `bulk_upsert_journals` — used in step 6 for full conversion.
- `generate_trial_balance` — used in step 7: post-execution TB pull for verification (jaz-conversion rule 4 — verify AFTER, never project).
- `bulk_finalize_drafts` — used in steps 4 and 6 (post-import contact and journal drafts, if any).
- `quick_reconcile` / `reconcile_*` family — used in step 5: first-month bank reconciliation post-import.

### Recipes (jaz-recipes)
- Not used during onboarding setup itself. Onboarding's job is to populate `CLIENT.md` so subsequent recurring engagements can drive recipes from it.
- After step 8 hand-off, the first `monthly-close` engagement uses `plan_recipe(name: 'accrued-expense', …)` per `CLIENT.recurring_accruals[]` etc. — see `jaz-practice/references/monthly-close.md`.

### Calculators (jaz-cli)
- Not used during setup. Used in subsequent engagements after onboarding closes.

### Cross-references
- `jaz-conversion/SKILL.md` end-to-end (THE canonical source for any data move from Xero / QuickBooks / Sage / MYOB / Excel).
- `jaz-conversion/references/{option2-quick,option1-full,mapping-rules,verification,edge-cases,file-types,file-analysis}.md` — the conversion pipeline depth.
- `jaz-api/SKILL.md § Chart of Accounts` (rules 17–22), `§ Bulk Upsert (Items, Contacts & Rates)`, `§ Background Jobs` (Universal Async Tracking), `§ Identifiers & Dates` (1–3), `§ Names & Fields` (9–13), `§ Pagination` (38).
- `jaz-jobs/SKILL.md § generate_document_collection_blueprint` and `jaz-jobs/references/document-collection.md` for the initial doc-capture step (when the prior firm hands over loose files rather than a structured export).

---

## Step-by-step playbook

### Step 1 — Org verification + CLIENT.md basics

Read `CLIENT.md` if it exists, otherwise treat it as freshly scaffolded with template defaults.

Capture from practitioner (or pre-filled by `practice_onboard_client`):
- `CLIENT.legal_entity_name` (full ACRA-registered name)
- `CLIENT.uen` (must match SG UEN format `\d{9}[A-Z]` or `T\d{2}[A-Z]{2}\d{4}[A-Z]`); if format invalid, halt: "UEN format invalid — confirm with client."
- `CLIENT.registered_address`
- `CLIENT.fy_end` (MM-DD format)
- `CLIENT.base_currency` (default SGD)
- `CLIENT.gst_scheme` (`quarterly` / `monthly` / `not-registered`); if registered, `CLIENT.gst_registration_number`
- `CLIENT.corporate_tax_bracket` (`standard` / `startup_exemption` / `partial_exemption`)
- `CLIENT.jaz_api_key_override` (optional — required if multi-org agency model)

Resolve the API key per the precedence chain (CLIENT override → PRACTICE.md default → JAZ_API_KEY env). Invoke `get_organization()`. Compare:
- `response.legalEntityName` ≈ `CLIENT.legal_entity_name` (Levenshtein distance ≤ 3 OR practitioner confirms)
- `response.uen` == `CLIENT.uen` (exact match required)
- `response.baseCurrency` == `CLIENT.base_currency`

If any mismatch: halt and surface the diff. Wrong API key → wrong org → catastrophic data corruption risk.

On match: write `response.resourceId` to `CLIENT.jaz_org_id` for future scoping.

**On 401 from `get_organization`:** API key invalid or expired. Surface "JAZ_API_KEY for `<client>` does not authenticate — confirm key with client or rotate." Halt.
**On 403:** key valid but insufficient scope. Halt: "Key authenticates but lacks org access — practitioner needs an admin-scope key."

### Step 2 — Currency setup

Invoke `list_currencies()` → set `enabled_currencies`.

Read prior-firm TB (or practitioner-supplied closing-balance file). Identify all distinct currencies in the source.

For each currency in source NOT in `enabled_currencies` AND ≠ `CLIENT.base_currency`:
- Pull the takeover-date rate from a market source (practitioner provides) OR from prior firm's reported closing rate.
- Build a `bulk_upsert_currency_rates` payload with one row per currency: `{ sourceCurrency: <ccy>, valueDate: <takeover-date>, exchangeRate: <rate>, rateDirection: 'FUNCTIONAL_TO_SOURCE' }`.
- Invoke `bulk_upsert_currency_rates(rates: [...])`. The call auto-enables currencies (jaz-api Bulk Rates rule).

**On 422 from `bulk_upsert_currency_rates` with `rateDirection_required`:** the field is mandatory per row. Re-emit with `rateDirection: 'FUNCTIONAL_TO_SOURCE'`. Retry.

### Step 3 — Chart of Accounts setup

Decide the CoA path:

**Path A — Migrate from prior firm (Xero / QB / Sage / MYOB / Excel CoA export).** Run `jaz-conversion` Phases 0 and 1B per `jaz-conversion/references/option2-quick.md`:
1. Phase 0 — Probe: `search_accounts()` paginated → discover existing accounts (system-generated cannot be deleted; jaz-conversion rule 6).
2. Phase 1A — Currencies + FX rates (already done in step 2 above).
3. Phase 1B — `POST /api/v1/chart-of-accounts/bulk-upsert` (this is a Jaz backend HTTP endpoint, NOT exposed as an MCP tool today; agent invokes via the `jaz-conversion` skill's pipeline). Bulk-upsert wrapper field is `accounts` (jaz-api rule 19).

Mapping rules (jaz-conversion `references/mapping-rules.md`):
- Match by NAME, not code (jaz-api rule 22). Pre-existing accounts may have different codes.
- POST uses `currency` (jaz-api rule 20) and `classificationType` (rule 21) — note GET asymmetry.
- For low-confidence mappings (Levenshtein > 5 or class mismatch): flag for human review per jaz-conversion Step 3 confidence-score guidance.

**Path B — Seed from Jaz template by industry.** Use the industry-specific seed list (practitioner-selected). Invoke `create_account` per seed account. Document the industry choice in `CLIENT.COA mapping notes`.

For both paths: verify `search_tax_profiles(filter: {appliesToSale: true})` and `(appliesToPurchase: true)` cover every transaction profile the client uses. NEVER create a tax profile (jaz-api rule 17). If a needed profile is missing: halt and surface "Tax profile `<name>` missing in Jaz org — confirm with Jaz support before continuing onboarding."

### Step 4 — Counterparty (contact) migration

Pull contact list from prior firm. Apply jaz-conversion rule 9 (filter noise from aging reports — reject subtotal rows, dates, column headers, numeric-only strings).

Build payload for `bulk_create_contacts(contacts: [...])`. Required fields per row: `billingName`. Optional but expected: `email`, `phone` (E.164 — `+65XXXXXXXX` for SG, `+63XXXXXXXXXX` for PH; jaz-api rule 16), `customer`, `supplier` (booleans).

Max 500 per call. Slice the list into batches.

For each batch: invoke `bulk_create_contacts` (or `bulk_upsert_contacts` if updating existing too). Response: `{ jobId, status: 'QUEUED', totalRecords }`.

Poll: `search_background_jobs(filter: {resourceId: {eq: <jobId>}})`. Use `resourceId`, NOT `jobId` (jaz-api Background Jobs rule — `jobId` filter is silently ignored). Use `createdAt` for date filtering, NOT `startedAt` (also silently ignored). Poll until `status ∈ {SUCCESS, FAILED, PARTIAL_SUCCESS}`.

On `PARTIAL_SUCCESS`: `errorDetails` is an array of per-record failures. Surface to practitioner with row numbers + reasons; fix and retry the failed slice.

On `SUCCESS`: confirm `processedCount == totalRecords` and `errorDetails == []` (empty array on success, not null — jaz-api Background Jobs rule).

### Step 5 — Banking + first-period import

For each `CLIENT.bank_accounts[i]`:

1. Confirm or create the corresponding Jaz CoA bank account. `search_accounts(filter: {accountType: {eq: 'Bank Accounts'}, name: {contains: <bank name fragment>}})`. If missing: `create_account(name: <e.g. "DBS SGD Operating">, classificationType: 'Bank Accounts', currency: <ccy>, …)`. Note: bank accounts are CoA entries; the convenience endpoint `/bank-accounts` returns a flat array, NOT the standard paginated shape (jaz-api rule 18).
2. Capture the resourceId into `CLIENT.bank_accounts[i].jaz_resource_id`.
3. Invoke `import_bank_statement(accountResourceId: <id>, file: <CSV/XLSX of first month's statement>)`. Returns `{ jobId }`.
4. Poll: `search_background_jobs(filter: {resourceId: {eq: <jobId>}})` until status terminal. JobType is `PROCESS_BANK_STATEMENT_FILES`. On `PARTIAL_SUCCESS`: review `errorDetails[]`; fix mis-formatted rows; resubmit slice via `add_bank_records` for residuals.
5. After import, draft bank rules per practitioner's recurring-counterparty list: `create_bank_rule({ name: <rule>, matchField: 'description', matchValue: <regex>, applyTo: { contactResourceId: <id>, accountResourceId: <gl> } })` per pattern.
6. First-pass reconciliation: `search_bank_records(accountResourceId: <id>, status: 'UNRECONCILED', valueDateRange: { from: <takeover-date>, to: <takeover-month-end> })`. Run the cascade matcher (`clio jobs bank-recon match`) and reconcile per `monthly-close` step 3 logic. This validates that the bank import + bank rules + COA + contacts work end-to-end.

**On 422 from `import_bank_statement` with `unsupported_file_format`:** Jaz expects CSV/XLSX in a known statement layout. Convert the file (the practitioner may need to re-export from the bank) and retry.

### Step 6 — Opening balances (TTB)

Pull the prior-firm TB at takeover date. Reconcile to source-system reports (the practitioner does this manually before agent intervention).

**Path A — Quick conversion (recommended starting point per jaz-conversion).** Per `jaz-conversion/references/option2-quick.md`:
- Phase 2 — Conversion invoices (open AR) and bills (open AP). Each conversion invoice/bill posts to a clearing account, NOT directly to the AR/AP control. References: `CONV-INV-<n>`, `CONV-BILL-<n>`, `CONV-CN-<n>`, `CONV-SCN-<n>`.
- Phase 2 cleanup: jaz-conversion Step 6 Phase 1D — `search` + `delete` any stale conversion records before re-running.
- Phase 3 — TTB journal: a single `create_journal` posting opening balances. AR / AP routes through clearing accounts (the conversion invoices / bills hold the real balances). Clearing accounts MUST net to zero (jaz-conversion rule 3).
- Phase 4 — Lock dates per account at takeover date, via `update_account` (lock-date field).

**Path B — Full conversion** (entire FY + FY-1 history). Per `jaz-conversion/references/option1-full.md`. Uses `bulk_upsert_invoices`, `bulk_upsert_bills`, `bulk_upsert_journals`, `bulk_upsert_customer_credit_notes`, `bulk_upsert_supplier_credit_notes`, plus `bulk_upsert_fixed_assets` for FA register preservation. TTB routing differs (jaz-conversion rule 10 — Full posts directly to all accounts since detailed transactions follow).

For both paths: rollback on Phase 2 / 3 failure is automatic per jaz-conversion contract.

**FX handling at takeover (jaz-conversion rule 5).** For Quick: use original transaction dates (so AR aging looks right) but explicit FYE rate via `currency: { sourceCurrency, exchangeRate }` on every FX transaction. Prior UGL is in the TTB; explicit rate ensures zero UGL in Jaz at takeover.

**FA handling (jaz-conversion rule 2).** Use `POST /api/v1/transfer-fixed-assets` (NOT `POST /fixed-assets`) to preserve accumulated depreciation. The MCP tool surface for this lives under the `fixed_assets` namespace; verify exact tool name before invoking — if no transfer-specific tool is exposed, fall back to direct HTTP per jaz-api § Fixed Assets.

### Step 7 — Verification

`generate_trial_balance(period_end: <takeover-date>)`. Compare to source TB.

100% accuracy required (jaz-conversion rule 7). The practitioner's accountant signs off on TB match. No rounding errors, no missing balances.

If TB mismatches: triage per `jaz-conversion/references/verification.md` checklist:
- Missing accounts → `create_account` + adjusting journal.
- Rounding drift → small adjustment journal.
- FX differences → check rates, maybe unrealized gain/loss journal.
- Missed transactions → create them.

Re-pull TB after each fix until clean.

**Do NOT project TB before execution** (jaz-conversion rule 4). Verify AFTER, then triage.

### Step 8 — Hand-off to recurring cadence

Populate the rest of `CLIENT.md`:

- `CLIENT.bank_accounts[]` — every active bank with `name`, `account_number_ref` (last 4 digits ONLY — never store full number), `currency`, `jaz_resource_id`.
- `CLIENT.recurring_accruals[]` — for every recurring expense the prior firm tracked as an accrual (utilities, professional fees, rent, employee benefits): `name`, `gl_account` (verify in Jaz CoA), `vendor` (verify in Jaz contacts), `estimation_method` (`prior_month` / `trailing_3m_avg` / `budget` / `fixed_amount`), `fixed_amount` if applicable.
- `CLIENT.recurring_engagements[]` — typical SMB: `[{ type: 'monthly-close', cadence: 'monthly' }, { type: 'quarterly-gst', cadence: 'quarterly' }, { type: 'annual-statutory', cadence: 'annual' }]`. Adjust based on `CLIENT.gst_scheme` and the practitioner's scope of work.
- `CLIENT.materiality_threshold` — confirm with practitioner (default seeded from `PRACTICE.md.materiality_default`).
- `CLIENT.key_contacts[]` — director, CFO, finance manager, prior auditor.
- `CLIENT.industry & business model` — short narrative; agent uses for ambiguous-transaction disambiguation.
- `CLIENT.COA mapping notes` — material customizations, departmental cost centers, project-tracking dimensions.
- `CLIENT.tax setup quirks` — blocked-input-tax categories, group-relief eligibility, prior-year losses, withholding-tax obligations.
- `CLIENT.banking & multi-currency exposures` — FX policy, signatory rules, hedging.
- `CLIENT.known issues / quirks` — old systems still feeding data, manual journals that recur, related-party balances.

Scaffold the first downstream engagement: typically `monthly-close` for the first month after takeover. The agent (or `practice_create_engagement`) writes the new ENGAGEMENT.md from the engagement-type template.

Update `ENGAGEMENT.status` to `signed-off`. Append to `CLIENT.daily_journal`: "<takeover-date> — onboarding complete; recurring cadence handed off."

---

## Common error classes and recovery

| Error class | Where | Recovery |
|---|---|---|
| 401 from `get_organization` | step 1 | API key invalid; halt and rotate or confirm with client. |
| 403 from `get_organization` | step 1 | Insufficient scope; need admin-scope key. |
| Levenshtein mismatch on legal entity | step 1 | Wrong org behind the API key; halt, do NOT proceed. |
| 422 `rateDirection_required` | step 2 | Missing field per row in `bulk_upsert_currency_rates`; add `rateDirection: 'FUNCTIONAL_TO_SOURCE'`; retry. |
| 422 `system_account_not_deletable` | step 3 path A wipe-and-replace | jaz-conversion rule 6 — system accounts cannot be deleted; route around them. |
| `jobId` filter ignored on `search_background_jobs` | steps 4, 5 | Switch to `resourceId` filter (jaz-api Background Jobs rule). |
| `PARTIAL_SUCCESS` on bulk_create_contacts | step 4 | Inspect `errorDetails[]`; retry failed slice with fixed payloads. |
| 422 `unsupported_file_format` | step 5 | Statement file isn't in a recognised layout; re-export or convert. |
| Phase 2/3 failure | step 6 | Automatic rollback per jaz-conversion contract; investigate cause, fix, re-run. |
| TB mismatch at verification | step 7 | Triage per `jaz-conversion/references/verification.md`; do NOT release client to recurring cadence until TB ties. |
| Missing tax profile | step 3 | Halt — tax profiles cannot be created (jaz-api rule 17); confirm with Jaz support. |

(Field-name and error-recovery depth lives in `jaz-api/SKILL.md`. Migration depth lives in `jaz-conversion/SKILL.md`. This file enumerates only what onboarding-as-engagement-type specifically encounters.)
