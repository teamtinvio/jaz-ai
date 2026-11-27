---
name: jaz-conversion
description: >-
  Use this skill when migrating accounting data into Jaz, importing from Xero,
  QuickBooks, Sage, MYOB, or Excel exports. Covers the full conversion pipeline:
  analyzing source files, mapping Chart of Accounts, contacts, tax profiles, and
  items, creating clearing accounts, running TTB (trial transaction balance),
  and verifying TB. The setup and opening balances go through the data
  transfer tools (upload, preview, start). Also use when the user mentions data migration, conversion,
  import, or switching accounting software, whenever a customer's prior system
  is Xero, QuickBooks, Sage, MYOB, or an Excel-based ledger.
metadata:
  version: "9.15.0"
---

# Jaz Conversion Skill

You are performing an **accounting data conversion**: migrating a customer's financial data from their previous accounting software (Xero, QuickBooks, Sage, MYOB, or Excel-based systems) into Jaz.

> **Jaz-native, not generic.** The clearing-account pattern, the CoA-bulk-upsert all-or-nothing semantics, the `currencyCode`-string-silently-ignored-on-invoices gotcha, the `bulk_upsert_invoice_line_items` PARTIAL_SUCCESS path: every rule in this skill is an opinion shaped by Jaz's specific API behavior, not by generic migration theory. Source-system mapping (Xero, QB, Sage) is included only as input parsing; everything downstream is Jaz-shaped.

**This skill provides Jaz-contextual conversion domain knowledge. For API details (field names, endpoints, gotchas), load the `jaz-api` skill alongside this one.**

## Data transfer: the setup and opening balances (start here)

Bringing in a company's chart of accounts, contacts and items (**FOUNDATIONS**), or those plus its opening balances with the invoices and bills still open (**BALANCES**), goes through the data transfer tools: the same transfer as Settings > Data Transfer in the app. Export files only: there is no sign-in to Xero, QuickBooks, Sage or MYOB.

1. **History first:** `list_data_transfers`. `inProgress: true` means one is running: say so and stop.
2. **One question:** "Should I bring over just your setup (chart of accounts, contacts and items), or your setup plus opening balances and the invoices and bills still open?" Full transaction history is not available: say so.
3. **BALANCES only:** the date the opening balances are as of, usually the last financial year end. It must be before the first transaction already in the organization.
4. **The files, by name:** chart of accounts, contacts and items exports; for BALANCES also the trial balance and the aged receivables and aged payables detail at that date. Up to 10 files, `.xlsx`, `.xls` or `.csv`, 10 MB each, under the names the other system gave them.
5. **Upload and preview:** `upload_data_transfer_file` for each, then `preview_data_transfer` (`tier`, `files`, `asAtDate`). Nothing is written. Report what it found in counts (`review` holds the first rows of each list), then ask **only** its `toAsk`: the source system when none was found, a balance with no aging file (one amount, or send that file), each missing year-end rate (units of the currency for one unit of the base currency), a failed check. Check and detail texts are written for the person: relay them unchanged. `CHECKING` means the check is still running: read on with `get_data_transfer_preview` (the files are not checked again).
6. **Start:** `start_data_transfer` with the `previewId` and the answers; its question takes the date from the preview and shows a sample of each list as a table, the trial balance totals and the exchange rates found and given. It is held: ask its question in its exact words, tables included, as plain text, end the turn, and call it again with the `confirmationId` after the yes. A start can answer a transfer that has already ended: report it with `get_data_transfer`. A start that outlasts its wait reads the list once itself and answers the transfer it finds. An unknown outcome: read `list_data_transfers` before anything else, never start again blindly. A start the API says started nothing (the service could not be reached) can be tried again with the same `previewId`; one refused because another transfer is running or starting, once `list_data_transfers` shows `inProgress` false.
7. **Status and report:** `get_data_transfer` when asked. While it runs it answers the status only, no counts; once it ends, report what each step created and failed, the records skipped (already in the organization) and the warnings, and end with the Data Transfer screen link the result carries. A finished transfer whose result or steps are left out cannot be read yet: read it again later. `cancel_data_transfer` works only before writing starts (QUEUED or IN_REVIEW).

The pipeline below stays for an operator building a conversion by hand, and for full transaction history (Full Conversion), which the transfer does not do.

## When to Use This Skill

- Analyzing customer-provided Excel/CSV files for conversion
- Mapping source Chart of Accounts, contacts, tax codes, or items to Jaz
- Creating conversion transactions (invoices, bills, journals)
- Building or reviewing TTB (Transfer Trial Balance) entries
- Verifying post-conversion Trial Balance accuracy
- Troubleshooting TB mismatches after a conversion

## Three Conversion Types

All types use the **same pipeline**; only the scope (which entity types) differs.

Config Mode and Quick Conversion are the data transfer's FOUNDATIONS and BALANCES (above): use the tools unless an operator builds them by hand.

### Config Mode (foundation only)
- **Scope:** CoA, contacts, items, currencies, tax mapping; NO transactions or journal
- **Creates:** Foundation entities only (Phases 0-1)
- **When:** Setting up an org before a conversion, or populating a fresh org with the customer's chart of accounts and contacts
- **Manifest field:** `"conversionType": "config"`
- **Requires:** At least one of `coa` or `tb` file (no AR/AP needed)

### Quick Conversion (Option 2, recommended starting point)
- **Scope:** Open AR/AP at FYE + TTB opening balances
- **Creates:** CoA, contacts, currencies, tax mapping, conversion invoices/bills, TTB journal, lock date
- **When:** Customer wants to start fresh on Jaz with correct opening balances
- **Accuracy check:** TB at FYE must match between source and Jaz
- **See:** `references/option2-quick.md`

### Full Conversion (Option 1)
- **Scope:** ALL transactions for FY + FY-1 (complete history)
- **Creates:** Everything in Quick + items, detailed invoices, bills, payments, journals, credit notes, cash-in/out/transfers, bank records, fixed assets
- **When:** Customer needs full audit trail preserved
- **Accuracy check:** TB at multiple dates, plus detailed ledger comparison
- **See:** `references/option1-full.md`

## Conversion Pipeline

Every conversion follows this pipeline. Steps 1-3 use the parser + AI. Steps 4-8 use the jaz-api skill.

### Step 1: Intake
Receive customer files. Organize by type. Expect messy Excel files with grouped sections, merged cells, subtotals, and inconsistent formatting.

**Common file types:**
- Chart of Accounts (CoA export)
- Trial Balance (TB at FYE)
- AR Aging / AP Aging (outstanding receivables/payables at FYE)
- Contact list (customers and suppliers)
- Tax profile list
- Exchange rates (closing rates at FYE)
- General Ledger detail (for Full only)
- Invoice/bill detail (for Full only)

### Step 2: Parse (3-pass approach)
See `references/file-analysis.md` for parsing guidance and `references/file-types.md` for the comprehensive file type catalog (22 types across all source systems).

**Pass A (Raw dump):** There is no raw cell parser in the tools. `read_spreadsheet_rows` reads a clean table: the first non-empty row is the header (a blank or repeated header cell is refused), 500 rows a call, `sheetIndex` for each sheet in `availableSheets`. A report export with title rows, merged cells or subtotals is dumped outside the tools, or goes through the data transfer tools above, which read these exports themselves.

**Pass B (AI structure detection):** Read the raw JSON dump and identify:
- Where are the data tables? (header row + data rows)
- What are subtotal/total rows? (exclude from data extraction)
- What is metadata vs actual data? (company name, report date = metadata)
- Are there multiple data frames per sheet? (some exports have AR and AP on same sheet)

**Pass C (AI classification):** For each identified data table:
- What type of data is this? (TB, AR aging, AP aging, CoA, contacts, etc.)
- What are the column headers mapped to? (Account Code, Account Name, Debit, Credit, etc.)
- What date range does it cover?
- What currency is it in?

### Step 3: Map
See `references/mapping-rules.md` for detailed rules.

For each entity type, map source data → Jaz entities:
- **CoA:** Match by code AND name. Fresh org = replace non-system accounts. Existing org = fuzzy match.
- **Contacts:** Match by name. Create if not found.
- **Tax:** Read-only in Jaz; discover existing profiles, match source codes to Jaz tax types.
- **Currencies:** Enable required currencies, set FYE exchange rates.

Assign confidence scores (high/medium/low) to each mapping. Flag low-confidence for human review.

### Step 4: Transform
Convert mapped data into Jaz API payloads. Different per conversion type:
- **Quick:** See `references/option2-quick.md`, clearing account pattern
- **Full:** See `references/option1-full.md`, detailed transaction creation

### Step 5: Dry Run
Before any API calls, present a summary for human review:
- Entity counts (how many of each type will be created)
- CoA mapping table (source → Jaz, with confidence)
- Contact list to be created
- For Quick: each conversion invoice/bill (contact, amount, currency)
- Edge cases flagged (FX, unmapped accounts, partial payments)

**Do NOT project a Trial Balance.** TB comes from the ledger after execution. Projecting it is unreliable and misleading.

### Step 6: Execute
Create records via Jaz API. Follow the dependency order:
1. **Phase 0:** Probe (discover existing resources: accounts, contacts, tax profiles)
2. **Phase 1A:** Currencies → FX Rates (rates must come AFTER currencies are enabled)
3. **Phase 1B:** CoA via `POST /api/v1/chart-of-accounts/bulk-upsert`
4. **Phase 1C:** Contacts → Items (items reference accounts + tax profiles)
5. **Phase 1D:** Cleanup stale conversions (search + delete CONV-INV-*, CONV-BILL-*, etc.)
6. **Phase 2:** Conversion invoices (AR), bills (AP), customer credit notes, supplier credit notes
7. **Phase 3:** TTB journal (routes AR/AP through clearing accounts)
8. **Phase 4:** Lock dates (per-account, at FYE date)

**Rollback:** If Phase 2 or 3 fails, all Phase 2 resources are automatically rolled back.

### Step 7: Verify
After execution, pull the Trial Balance from Jaz and compare against the source TB.
See `references/verification.md` for the full checklist format.

### Step 8: Triage (if TB doesn't match)
If TB doesn't match, identify the discrepancy:
- Missing accounts? → Create them + journal adjustment
- Rounding drift? → Small adjustment journal
- FX differences? → Check rates, may need unrealized gain/loss journal
- Missed transactions? → Create them
- Re-verify after each fix until TB matches

## Critical Rules

1. **TTB has its own tool**: `create_transfer_trial_balance` (`POST /api/v1/transfer-trial-balance`) posts the opening balance entries, always ACTIVE, with its own reference and no lock date check. Lock date is set separately via CoA API.
2. **Fixed asset transfers use `POST /api/v1/transfer-fixed-assets`**, not the "new asset" endpoint. Preserves accumulated depreciation.
3. **Clearing accounts must net to zero**: if they don't, something was missed in the conversion.
4. **Never project TB before execution**: verify AFTER, then triage.
5. **FYE exchange rates + original dates**: Quick conversion uses original dates (for aging) but explicit FYE rate via `currency: { sourceCurrency, exchangeRate }` on every FX transaction. Prior UGL is in the TTB; explicit rate ensures zero UGL in Jaz. See `references/edge-cases.md`.
6. **System-generated CoA accounts cannot be deleted**: discover them via API before attempting a wipe-and-replace.
7. **100% accuracy is required**: customer's accountant signs off on TB match. No rounding errors, no missing balances.
8. **Always load `jaz-api` skill alongside this one**: this skill has conversion domain knowledge, `jaz-api` has API field names and gotchas, and `jaz-api-reference` has the endpoints.
9. **Filter noise from aging reports before creating contacts**: AR/AP aging reports contain subtotal rows, dates, column headers, and numeric-only strings that are NOT contact names. Reject them to avoid creating garbage contacts. See `references/mapping-rules.md`.
10. **TTB routing differs between Quick and Full**: Quick routes AR/AP through clearing accounts (conversion invoices already hold the real AR/AP). Full posts directly to all accounts (detailed transactions follow). See `references/option1-full.md`.

## See Also

- **jaz-api**: Field names, error codes, and gotchas (load alongside this skill)
- **jaz-api-reference**: Endpoint request/response examples, the endpoint catalog, and search filters
- **jaz-recipes**: Transaction recipes for complex IFRS scenarios encountered during conversion
- **jaz-jobs**: Post-conversion operational workflows (month-end close, bank recon, etc.)
