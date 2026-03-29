# File Type Catalog

Comprehensive catalog of all accounting file types encountered across real customer datasets. Use this to identify and classify files during conversion intake (Pipeline Step 1-2).

**Source data:** 76 files across 10 datasets — Sage 300/Accpac, Xero, QuickBooks, MYOB, and generic Excel workpapers.

---

## Quick Reference

| # | Type | Conversion Relevance | Quick | Full |
|---|------|---------------------|-------|------|
| 1 | Trial Balance | HIGH | Required | Required |
| 2 | AR Aging Detail | HIGH | Required | Required |
| 3 | AR Aging Summary | MEDIUM | Fallback | Cross-check |
| 4 | AP Aging Detail | HIGH | Required | Required |
| 5 | AP Aging Summary | MEDIUM | Fallback | Cross-check |
| 6 | Chart of Accounts | HIGH | Required | Required |
| 7 | Contact List | MEDIUM | Supplement | Supplement |
| 8 | General Ledger Detail | HIGH | Not needed | Required |
| 9 | General Ledger Summary | MEDIUM | Cross-check | Cross-check |
| 10 | Account Transactions | MEDIUM | Not needed | Fallback for GL Detail |
| 11 | Balance Sheet | MEDIUM | Cross-check | Cross-check |
| 12 | Profit & Loss | MEDIUM | Cross-check | Cross-check |
| 13 | Journal Report | MEDIUM | Not needed | Validation |
| 14 | Bank Statement (CSV) | LOW | Not needed | Optional |
| 15 | Exchange Rates | MEDIUM | Required (if FX) | Required (if FX) |
| 16 | Fixed Asset Register | MEDIUM | Not needed | Required (if assets) |
| 17 | Sales & Purchases Schedule | LOW | Cross-check | Cross-check |
| 18 | Bank Reconciliation | LOW | Cross-check | Cross-check |
| 19 | GL Subledger (AR/AP/Interco) | HIGH | Context | Required |
| 20 | Import Template | LOW | Skip | Skip |
| 21 | Platform Export (Jaz) | SKIP | Skip | Skip |
| 22 | Multi-Report Workbook | Varies | Varies | Varies |

### Minimum File Sets

**Quick Conversion:** Trial Balance + AR Aging Detail + AP Aging Detail + CoA (if not embedded in TB) + Exchange Rates (if FX currencies)

**Full Conversion:** All of Quick + General Ledger Detail + Contact List + Fixed Asset Register (if applicable)

---

## Type Details

### 1. Trial Balance

The single most important file for any conversion. Contains every GL account with its balance at a point in time.

**Key indicators:**
- Title contains "Trial Balance" or "TB"
- Columns: Account Code + Account Name/Description + Debit + Credit (or single Balance column)
- No dates per row (point-in-time snapshot)
- Balancing totals at bottom (Total Debits = Total Credits)

**Source system patterns:**

| System | Account Codes | Typical Columns | Header Row | Quirks |
|--------|--------------|-----------------|-----------|--------|
| Sage 300/Accpac | 3-4 digit (e.g., `101`, `4730`) | Acc, Dept, Description, Group, Period Debit, Period Credit | Row 4 or 12 | `Dept` column (always `100`), `Group` = account classification (ASSETS/LIABILITY/REVENUE/EXPENSE). Rows 0-11 are report metadata. Merges in header rows. Report ID: GLTRLR1. |
| Xero | 3-digit (e.g., `200`, `400`) | Account Code, Account Name, Account Type, Debit YTD, Credit YTD, Prior Year | Row 4 | Clean flat table. May include prior year comparative column (often zeros for new companies). Account Type column useful for CoA classification. |
| QuickBooks | Variable | Account, Debit, Credit | Row 0-3 | May have grouped/indented sub-accounts. "Total" rows per category. |
| Generic Excel | Variable | No., Name, Debit, Credit | Row 7+ | Manual workpapers. May include classification column (e.g., "Fixed Assets", "Current Asset", "Bank"). Often embedded in multi-sheet workbooks. |

**Watch for:**
- Misleading filenames — "Chart of Accounts.xls" was actually a Trial Balance in one dataset
- TB embedded in a multi-sheet workbook alongside subledger detail
- Duplicate TBs at different dates (e.g., Nov 2023 FYE and Mar 2024 for same company)
- "Period Debit/Credit" in Sage = YTD cumulative balance, not period movement
- Some TBs include a "Net Income (Loss)" line after the total — this is informational, not a GL account

---

### 2. AR Aging Detail

Per-invoice outstanding receivables, grouped by customer. Essential for Quick Conversion (creates conversion invoices).

**Key indicators:**
- Title contains "Aged Receivables", "AR Aging", or "A/R Aged"
- Aging bucket columns: Current, 30 Days (or <1 Month), 60 Days, 90 Days, 90+ (or Older)
- Grouped by customer/contact name
- Individual invoice rows with: date, invoice number, reference, amount in bucket

**Source system patterns:**

| System | Grouping | Doc Type | Key Columns | Header Row |
|--------|----------|----------|------------|-----------|
| Sage 300/Accpac | Short code + full name as group header row | `T` column: I=Invoice, N=Credit Note | Doc. Date, Inv No, T, Description, Curr, Curr Amt, Total Amt, Rem Bal, aging buckets | Row 4 (data at row 6) |
| Xero | Contact name as group header row | No type column | Invoice Date, Due Date, Invoice Number, Invoice Reference, aging buckets, Total | Row 5 (data at row 8) |

**Sage-specific quirks:**
- Rows 0-17 are report metadata/filter parameters
- `Totals:` per supplier + `Grand Totals:` at bottom
- Separator rows use `-------` dash patterns
- Date format inconsistency within same column (`2025-11-10` mixed with `30/11/2025`)
- `Curr` and `Curr Amt` columns present but empty when all transactions are base currency

**Xero-specific quirks:**
- "Ageing by due date" stated on row 3
- Invoice Number is Xero's auto-number (INV-XXXX), Invoice Reference is customer's PO
- Percentage row at bottom (exclude from data)
- Credit notes appear as negative amounts

---

### 3. AR Aging Summary

One row per customer with total outstanding per aging bucket. No invoice detail.

**Key indicators:** Same title as Detail but with "Summary" suffix. Flat table (no grouping). One row per contact.

**When to use:** Only if Detail variant is unavailable. Creates a single lump conversion invoice per contact (loses invoice-level granularity and dates).

**Xero quirk:** Header row 5, data starts row 6 (no group header unlike Detail). Subtotal and percentage rows at bottom.

---

### 4. AP Aging Detail

Per-invoice outstanding payables, grouped by supplier. Essential for Quick Conversion (creates conversion bills).

**Key indicators:**
- Title contains "Aged Payables", "AP Aging", or "A/P Aged"
- Same aging bucket structure as AR
- Grouped by supplier/vendor name

**Source system patterns:** Mirrors AR Aging Detail. Same Sage metadata block (rows 0-17), same Xero structure.

**Sage-specific quirks:**
- Two-row header (row 18-19): Row 18 = primary labels (Doc. Date, Doc. Type/Doc. Number, Due Date, aging buckets), Row 19 = sub-labels (Appl. Date, Applied No., App. Type, Current, Days)
- Footer legend: AD = Adjustment, ED = Earned Discount Taken
- Vendor sections: "Vendor No.: OC-F02" as group header

**Xero-specific quirks:**
- No "Invoice Number" column (unlike AR Detail which has it) — only shows supplier's reference
- Row 3 says "Ageing by due date"

---

### 5. AP Aging Summary

One row per supplier with total outstanding per aging bucket. No invoice detail.

**Xero quirk:** May have two sections: "Aged Payables" and "Expense Claims" (Xero-specific — unpaid expense claims show as separate payables category). The Expense Claims section reveals liability that maps to "Unpaid Expense Claims" on the Balance Sheet.

---

### 6. Chart of Accounts

Account code + name + classification. No balances, no dates.

**Key indicators:**
- Title contains "Chart of Accounts" or "CoA"
- Columns: Account Code/Number + Description/Name + Type/Classification
- No debit/credit or balance columns
- Comprehensive list (typically 50-200+ accounts)

**Source system patterns:**

| System | Code Format | Type Codes | Key Columns |
|--------|-----------|-----------|------------|
| Sage 300/Accpac | `XXXX-100` (4 digits + dept suffix) | F=Fixed/Header, C=Control/Category, E=Detail/Postable | Acc No, Description, Type, D/C (normal balance direction) |
| Xero | 3-digit numeric | Full names (e.g., "Current Asset", "Revenue") | Account Code, Account Name, Account Type |
| QuickBooks | Variable | Varies by region | Account, Type, Detail Type |

**Sage-specific quirks:**
- Department suffix `-100` in account codes (strip for Jaz mapping)
- Type codes must be decoded: F = parent/header account (not postable), C = control account, E = detail account (postable)
- No classification grouping column — must infer Assets/Liabilities/Equity/Revenue/Expense from code ranges
- Column E may be entirely empty (unused field)

**Watch for:** Trial Balance sometimes doubles as a partial CoA (if it includes an account type/classification column). If no separate CoA file exists, extract account structure from the TB.

---

### 7. Contact List

Customer and/or supplier names with optional contact details.

**Key indicators:**
- Title contains "Customer", "Supplier", "Contact", "Vendor"
- Name column + optional: address, phone, email, tax ID (UEN/TIN/ABN)

**Quality varies dramatically:**
- **Best case (Xero/QB export):** Full contact details — company name, address lines, phone, email, tax registration
- **Worst case (manual Excel):** Single column with names only — no addresses, phones, emails, or tax IDs

**Watch for:**
- Separate sheets for customers vs suppliers in same workbook
- Names may be truncated or abbreviated (especially in Sage exports)
- May not exist at all — contacts must then be extracted from AR/AP aging group headers

---

### 8. General Ledger Detail

Every transaction posted to every GL account. The most comprehensive transactional report. Required for Full Conversion.

**Key indicators:**
- Title contains "General Ledger" or "G/L" + "Detail" or "Transactions Listing"
- Grouped by GL account (account header → transaction rows → subtotal/closing balance)
- Per-transaction: Date, Source module, Description, Reference, Debit, Credit
- Running balance per account
- Very large (hundreds to thousands of rows)

**Source system patterns:**

| System | Unique Features | Tax Info | Currency | Typical Size |
|--------|----------------|----------|----------|-------------|
| Sage 300/Accpac | Dual-currency columns (Source Currency + Functional Currency side by side), 3-row header (rows 19-21), Source module code (AP/AR/GL), Batch-Entry numbers | No tax column | Parallel Source + Functional amounts with exchange rate | 6,000+ rows, 64+ columns |
| Xero (GL Detail) | Tax Rate Name column, Tax Rate (%) column, Tax amount column | Yes — Tax Rate Name is critical for tax code mapping | Single currency | 400-500 rows, 10 columns |
| Xero (Account Transactions) | Gross + Tax columns (no rate name) | Partial — amount only, no code name | Single currency | 400-500 rows, 9 columns |

**Sage-specific quirks:**
- Rows 0-18 are report metadata/filter parameters (largest metadata block of any report type)
- 13,000+ merged cells in a typical GL file
- Source module codes: AP = payables, AR = receivables, GL = general journal
- Column A is entirely empty (data starts col B)
- Account sections: header row → period transactions → "Net Change" / "Ending Balance" subtotals

**Xero preference hierarchy:** GL Detail > Account Transactions. GL Detail includes Tax Rate Name (needed for mapping to Jaz tax profiles). Account Transactions only shows tax amount — would need to reverse-engineer the tax code from the rate.

---

### 9. General Ledger Summary

One row per account showing total debits, credits, and net movement for a period. No transaction detail.

**Key indicators:**
- Title contains "General Ledger" + "Summary"
- Flat table: Account Name, Account Code, Debit total, Credit total, Net Movement, Account Type
- Much smaller than GL Detail (30-100 rows vs hundreds/thousands)

**Use:** Validation tool. Net Movement should reconcile with TB changes between periods. Provides Account Type column useful for CoA classification. Redundant with TB for Quick Conversion.

---

### 10. Account Transactions (Xero-specific)

Nearly identical to GL Detail but with different tax columns.

**Key indicators:**
- Title contains "Account Transactions"
- Same grouped-by-account structure as GL Detail
- Columns: Date, Source, Description, Reference, Debit, Credit, Running Balance, Gross, Tax

**Difference from GL Detail:** Has `Gross` + `Tax` columns instead of `Tax` + `Tax Rate (%)` + `Tax Rate Name`. Missing Tax Rate Name means you cannot directly identify which tax code was applied.

**Use:** Fallback for GL Detail. Only use if GL Detail is unavailable.

---

### 11. Balance Sheet

Hierarchical financial statement showing Assets, Liabilities, and Equity at a point in time.

**Key indicators:**
- Title contains "Balance Sheet" or "Statement of Financial Position"
- Hierarchical: top-level sections (Assets/Liabilities/Equity) → sub-categories → accounts
- Total rows at each level
- One or more period columns

**Source system patterns:**

| System | Layout | Period Columns |
|--------|--------|---------------|
| Xero | Col A = section headers, Col B = account names, Col C = balance | Single date or comparative |
| Sage | Formatted report with merged section headers | May have multiple periods |

**Use:** Cross-check only. Confirms account classification hierarchy (which accounts are Bank vs Current Assets vs Fixed Assets etc.). Not directly used for conversion since TB already has account types.

---

### 12. Profit & Loss

Income statement showing Revenue and Expenses for a period.

**Key indicators:**
- Title contains "Profit and Loss", "P&L", or "Income Statement"
- Sections: Revenue/Trading Income, Cost of Sales, Gross Profit, Operating Expenses, Net Profit
- One or more period columns

**Use:** Cross-check only. Net Profit should equal Current Year Earnings on the Balance Sheet. Confirms revenue and expense account names. Redundant if TB is available.

---

### 13. Journal Report (Xero-specific)

Every double-entry journal in chronological order, grouped by journal ID.

**Key indicators:**
- Title contains "Journal Report"
- Grouped by journal: ID + date as group header, then debit/credit line items
- Columns: Date, Journal ID, Account Code, Account Name, Debit, Credit, Posted Date, Posted By
- Typically the largest file by row count (1000+ rows)

**Use:** Validation for Full Conversion. Every journal should balance (debits = credits). Can identify manual journals vs system-generated. Contains reversed journal entries (labeled "Reversed: ..."). Not the preferred conversion source — GL Detail is better because it groups by account rather than by journal.

---

### 14. Bank Statement (CSV)

Simple transaction list for a bank account.

**Key indicators:**
- CSV format
- Columns: Date, Description, Debit (or Withdrawal), Credit (or Deposit)
- No account codes — single account only
- May come from Jaz export or bank download

**Formats seen:**
- Jaz export: `Date,Description,Debit,Credit` (simple 4-column CSV)
- Bank download: varies by bank

**Use:** Optional for Full Conversion. Can be imported as bank records for reconciliation. Not needed for Quick Conversion.

---

### 15. Exchange Rates

Currency cross-rates, typically for FYE closing rates.

**Key indicators:**
- Title contains "Exchange Rates" or "Currency"
- Currency code + rate columns
- Short file (5-20 rows, or a matrix grid)

**Formats seen:**
- QuickBooks template: 18x18 currency matrix with cross-rates
- Simple list: Currency Code, Rate

**Use:** Required for any conversion involving foreign currencies. FYE closing rates are used for Quick Conversion transactions. Original transaction rates are used for Full Conversion.

---

### 16. Fixed Asset Register

List of fixed assets with cost, accumulated depreciation, and net book value.

**Key indicators:**
- Title contains "Fixed Asset", "Asset Register", or "Schedule of Fixed Assets"
- Columns: Asset Code/Name, Description, Cost/Original Value, Accumulated Depreciation, Net Book Value
- May include: Purchase Date, Category, Depreciation Rate/Method

**Use:** Required for Full Conversion if the company has fixed assets. Assets are imported via `POST /api/v1/transfer-fixed-assets` (dedicated endpoint that preserves accumulated depreciation).

**Watch for:** "Schedule 8" or similar numbered schedules may be auditor-prepared Sales & Purchases schedules (type 17), not Fixed Asset Registers — always check content.

---

### 17. Sales & Purchases Schedule (Auditor-prepared)

Supplementary audit schedule showing transaction detail with operational information (shipping, FX).

**Key indicators:**
- Title contains "Schedule" + number (e.g., "Schedule 8")
- Subtitle: "Schedules to the Accounts for the year ended..."
- Dual-frame layout: SALES columns + PURCHASES columns side by side
- Includes: Line numbers, dates, descriptions, invoice numbers, receipt/payment voucher numbers, FX rates, gross profit

**Distinguishing from Fixed Asset Register:** These schedules are NOT ERP exports — they are manually prepared by the accountant/auditor. Very few merged cells (4 vs hundreds in Sage exports). Contain operational detail (shipping routes, origin/destination countries) not found in standard accounting reports.

**Use:** Cross-check only. Useful for validating invoice/bill amounts and FX rates during Full Conversion. Contains operational context not available in other reports.

---

### 18. Bank Reconciliation

Narrative-format bank balance reconciliation, not a standard tabular report.

**Key indicators:**
- Title contains "Bank Reconciliation" or "Bank Recon"
- Narrative format: "Balance as per Bank Statement", "Less: Unpresented cheques", "Balance as per General Ledger"
- Very small (10-20 rows)
- May include FX conversion rate (for foreign currency bank accounts)

**Use:** Cross-check reference only. Confirms the GL bank account balance ties to the actual bank statement. Not directly importable.

---

### 19. GL Subledger (AR/AP/Intercompany Detail)

Detailed transaction history for a single GL control account, typically found as sheets within a multi-report workbook.

**Key indicators:**
- Sheet name indicates the account: "OTHER RECEIVABLES", "SUPPLIERS", "INTERCOMPANY", "RELATED PARTY AP"
- Single GL account (e.g., Account 133001, 310001, 330005)
- Contains: Description, Document No, Date, Currency, Amount (source), Exchange Rate, Amount (functional)
- Opening balance row, then chronological transactions, then closing balance

**Common sub-types:**
- **Other Receivables** — non-trade receivables (intercompany charges, rechargeable costs)
- **Suppliers** — grouped by supplier code (V0030, V0050, etc.) with invoices (negative) and payments (positive)
- **Intercompany** — multi-section: summary of all interco balances + detailed sections per related entity
- **Related Party AP** — related party payables with cash calls, management fees, charter hire

**Quirks:**
- Accounting-format negatives: `(8,812.50)` instead of `-8,812.50`
- Multi-currency within same subledger (e.g., mostly EUR transactions, some SGD at different FX rates)
- May include month-on-month reconciliation columns (sparsely populated)
- Date format mixing: ISO `YYYY-MM-DD` + `DD/MM/YY` in same column

**Use:** HIGH for Full Conversion — needed to reconstruct individual receivable/payable/intercompany balances. For Quick Conversion, provides context for understanding what makes up the AR/AP balances on the TB.

---

### 20. Import Template (QuickBooks)

Template file with instructions sheet + blank data template for data entry.

**Key indicators:**
- Title contains "Template" or "Import"
- First sheet is instructions/guidance
- Subsequent sheets have column headers but few/no data rows
- May include dropdown validation lists

**Use:** Skip. These are blank templates, not source data. May be useful to understand the source system's expected data structure.

---

### 21. Platform Export (Jaz/Internal)

Raw data exports from the Jaz platform itself. Contains UUIDs, internal field names, `jaz.ai` email addresses.

**Key indicators:**
- CSV format with Jaz-specific columns: `resource_id`, `organization_resource_id`, `business_transaction_type`, `value_date`
- UUID values (e.g., `550e8400-e29b-41d4-a716-446655440000`)
- References to `jaz.ai` email domains
- Column names use snake_case (Jaz API conventions)

**Sub-types:**
- **Org Usage Stats:** `org_resource_id`, `day`, `daily_imports` count
- **Transaction Line Items:** `resource_id`, `business_transaction_type` (PURCHASE/SALE/PAYMENT_PURCHASE), `account_resource_id`, `value_date`

**Use:** SKIP. These are NOT source accounting system data. They are Jaz platform exports that may be mixed in with conversion files. Exclude entirely from the conversion pipeline.

---

### 22. Multi-Report Workbook

A single Excel file containing multiple report types across different sheets.

**Key indicators:**
- Multiple sheets with different structures (different header rows, different column counts)
- Sheet names indicate different reports (e.g., "TB (YTD)", "BANK SGD (DBS)", "OTHER RECEIVABLES", "SUPPLIERS")
- May contain reports for the same entity at the same date, or related reports

**Examples seen:**
- `SY RoRo 3 - TB AP AR as at 30 Apr 2025.xlsx` — 6 sheets: TB, Bank Recon, Other Receivables subledger, Intercompany subledger, Suppliers subledger, Related Party AP subledger
- `Medical Net Schedule 8.xlsx` — multiple sheets with different schedule sections

**Handling:** Classify each sheet independently. Different sheets within the same workbook may be different file types with different header rows, data structures, and conversion relevance levels.

---

## Functional vs Source Currency Pairs (Sage 300/Accpac)

Sage 300 exports AP and AR aging in **matched pairs**: one file in Functional Currency (base currency, e.g., SGD) and one in Vendor/Customer Currency (original transaction currency).

| Pair | Functional Currency File | Source Currency File |
|------|------------------------|---------------------|
| AP at Date X | AP FUNCTIONAL CURRENCY.xls | AP VENDOR CURRENCY.xls |
| AR at Date X | AR FUNCTIONAL CURRENCY.xls | AR CUSTOMER CURRENCY.xls |

**Which to use:**
- **Quick Conversion (TTB journal):** Use Functional Currency version — amounts in base currency match the Trial Balance
- **Quick Conversion (FX conversion bills/invoices):** Use Source Currency version — original transaction amounts needed for FX-denominated conversion documents
- **Full Conversion:** Use both — Functional for TB verification, Source for reconstructing original transaction amounts

**Differences between the pair:**
- Source Currency version may have more rows (FX conversion creates additional applied detail lines)
- Source Currency version has an extra column for currency code indicator
- Source Currency version shows amounts in vendor's/customer's native currency
- Functional Currency version shows all amounts converted to base currency at transaction-date rates

---

## Source System Detection

When analyzing an unknown file, look for these system signatures:

| System | Signature |
|--------|-----------|
| **Sage 300/Accpac** | 17+ metadata rows before headers. Hundreds of merged cells. Account codes `XXXX-100` (with dept suffix). Report IDs like GLTRLR1. Filter parameters in header block. `T` column (I/N doc type). Dual-currency column sections. Two-row headers. |
| **Xero** | Clean flat exports. 4-5 metadata rows. Account codes 3-digit. Tax Rate Name column in GL Detail. "Ageing by due date" text. Auto-numbered invoices (INV-XXXX). "Demo Company (Global)" in demo data. |
| **QuickBooks** | Grouped/indented sub-accounts. "Total <category>" rows. Template files with instructions sheets. Exchange rate matrices. Account numbers optional. |
| **MYOB** | 3 preamble rows before data. Per-row aging grouping. Filenames often contain "myob". Classification types: asset, bank, fixed asset, liability, equity, income, cost of sales, expense. |
| **Generic Excel / Manual** | Very few merged cells (<10). No report metadata block. Custom layouts. May have been prepared by accountant/auditor for statutory purposes. Named schedules ("Schedule 8"). |
| **Jaz Platform** | CSV with snake_case columns. UUIDs. `jaz.ai` email references. `business_transaction_type` enum values. `resource_id` columns. |

---

## Common Pitfalls

1. **Misleading filenames.** "Chart of Accounts.xls" was a Trial Balance. Always verify content, not filename.
2. **Duplicate files.** Customers often include the same report multiple times (e.g., "AP AGING (1).xlsx" = exact copy). Deduplicate by comparing dimensions + cell counts.
3. **Two entities in one dataset.** SY RoRo contained files for two separate companies (POH WAH SGD + SY RORO 3 EUR). Different base currencies, different source systems, different reporting dates. These need separate conversion workstreams.
4. **Damaged/modified files.** A "-modified" suffix may indicate someone opened the file and broke merge metadata. Check for 0 merges in a file where you'd expect hundreds (Sage exports). Prefer the unmodified original.
5. **Date format mixing.** Sage reports commonly mix `YYYY-MM-DD` and `DD/MM/YYYY` within the same column. The parser preserves the raw values — normalization happens during mapping.
6. **Different cutoff dates.** Multiple TBs at different dates may exist (e.g., Nov 2023 FYE + Mar 2024). Confirm which is the conversion cutoff before proceeding.
7. **Empty sheets.** Multi-sheet workbooks often have empty "Sheet1", "Sheet2", "Sheet3" sheets. These are noise — skip.
8. **TB date ≠ Aging date.** Verify the TB date and AR/AP aging dates match. If they don't, the AR/AP totals on the aging won't reconcile with the TB receivables/payables balances.
