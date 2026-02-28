---
name: jaz-conversion
version: 4.16.0
description: Accounting data conversion skill — migrates customer data from Xero, QuickBooks, Sage, MYOB, and Excel exports to Jaz. Covers config, quick, and full conversion workflows, Excel parsing, CoA/contact/tax/items mapping, clearing accounts, TTB, and TB verification.
---

# Jaz Conversion Skill

You are performing an **accounting data conversion** — migrating a customer's financial data from their previous accounting software (Xero, QuickBooks, Sage, MYOB, or Excel-based systems) into Jaz.

**This skill provides conversion domain knowledge. For API details (field names, endpoints, gotchas), load the `jaz-api` skill alongside this one.**

## When to Use This Skill

- Analyzing customer-provided Excel/CSV files for conversion
- Mapping source Chart of Accounts, contacts, tax codes, or items to Jaz
- Creating conversion transactions (invoices, bills, journals)
- Building or reviewing TTB (Transfer Trial Balance) entries
- Verifying post-conversion Trial Balance accuracy
- Troubleshooting TB mismatches after a conversion

## Three Conversion Types

All types use the **same pipeline** — only the scope (which entity types) differs.

### Config Mode (foundation only)
- **Scope:** CoA, contacts, items, currencies, tax mapping — NO transactions or journal
- **Creates:** Foundation entities only (Phases 0-1)
- **When:** Setting up an org before a conversion, or populating a fresh org with the customer's chart of accounts and contacts
- **Manifest field:** `"conversionType": "config"`
- **Requires:** At least one of `coa` or `tb` file (no AR/AP needed)

### Quick Conversion (Option 2 — recommended starting point)
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

**Pass A — Raw dump:** Run the parser (`parseFile()`) to extract all cells + merge metadata from Excel files. The parser handles merged cell propagation automatically.

**Pass B — AI structure detection:** Read the raw JSON dump and identify:
- Where are the data tables? (header row + data rows)
- What are subtotal/total rows? (exclude from data extraction)
- What is metadata vs actual data? (company name, report date = metadata)
- Are there multiple data frames per sheet? (some exports have AR and AP on same sheet)

**Pass C — AI classification:** For each identified data table:
- What type of data is this? (TB, AR aging, AP aging, CoA, contacts, etc.)
- What are the column headers mapped to? (Account Code, Account Name, Debit, Credit, etc.)
- What date range does it cover?
- What currency is it in?

### Step 3: Map
See `references/mapping-rules.md` for detailed rules.

For each entity type, map source data → Jaz entities:
- **CoA:** Match by code AND name. Fresh org = replace non-system accounts. Existing org = fuzzy match.
- **Contacts:** Match by name. Create if not found.
- **Tax:** Read-only in Jaz — discover existing profiles, match source codes to Jaz tax types.
- **Currencies:** Enable required currencies, set FYE exchange rates.

Assign confidence scores (high/medium/low) to each mapping. Flag low-confidence for human review.

### Step 4: Transform
Convert mapped data into Jaz API payloads. Different per conversion type:
- **Quick:** See `references/option2-quick.md` — clearing account pattern
- **Full:** See `references/option1-full.md` — detailed transaction creation

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
1. **Phase 0:** Probe (discover existing resources — accounts, contacts, tax profiles)
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

1. **TTB is a regular journal entry** — Jaz's TTB module is not yet on the API. Create via `POST /journals`. Lock date is set separately via CoA API.
2. **Fixed asset transfers use `POST /api/v1/transfer-fixed-assets`** — not the "new asset" endpoint. Preserves accumulated depreciation.
3. **Clearing accounts must net to zero** — if they don't, something was missed in the conversion.
4. **Never project TB before execution** — verify AFTER, then triage.
5. **FYE exchange rates + original dates** — Quick conversion uses original dates (for aging) but explicit FYE rate via `currency: { sourceCurrency, exchangeRate }` on every FX transaction. Prior UGL is in the TTB; explicit rate ensures zero UGL in Jaz. See `references/edge-cases.md`.
6. **System-generated CoA accounts cannot be deleted** — discover them via API before attempting a wipe-and-replace.
7. **100% accuracy is required** — customer's accountant signs off on TB match. No rounding errors, no missing balances.
8. **Always load `jaz-api` skill alongside this one** — this skill has conversion domain knowledge, `jaz-api` has API field names, endpoints, and gotchas.
