# Analyzing Excel Accounting Reports

## The Challenge

Accounting exports from Xero, QuickBooks, Sage, and generic Excel are messy:
- **Merged cells** — headers span multiple columns, category labels span rows
- **Grouped sections** — rows grouped by account type, customer, date range
- **Subtotals everywhere** — per group, per page, grand totals
- **Metadata rows** — company name, report title, date range, print date (not data)
- **Multiple data frames** — some sheets have AR and AP in different sections
- **Inconsistent formatting** — bold totals, blank separator rows, indented sub-accounts

The parser library handles raw cell extraction and merged cell propagation. **You** do the intelligent work of understanding the structure.

## 3-Pass Approach

### Pass A: Raw Dump
Run the parser to get `ParsedFile` with cells + merge metadata.

When reviewing the raw output, note:
- **Row 0-5:** Usually metadata (company name, report title, date generated)
- **First row with many populated cells:** Likely the header row
- **Rows with cells only in column 0-1:** Category labels or group headers
- **Rows where numeric columns sum to a group total:** Subtotal rows
- **Blank rows:** Section separators

### Pass B: Structure Detection
For each sheet, identify:

1. **Header row(s):** The row(s) containing column labels. Look for:
   - Row with the most populated cells
   - Keywords: "Account", "Code", "Name", "Debit", "Credit", "Balance", "Amount", "Contact", "Date", "Reference"
   - Sometimes headers span 2 rows (main header + sub-header)

2. **Data rows:** Rows between header and first total/blank section. Characteristics:
   - Have values in the same columns as headers
   - Account codes are numeric or alphanumeric (e.g., "1000", "4-1000", "GST7")
   - Amounts are numeric (possibly with accounting formatting: parentheses for negatives)

3. **Subtotal/total rows:** Rows to EXCLUDE. Characteristics:
   - Contain keywords: "Total", "Sub-total", "Grand Total", "Net", "Balance"
   - Have values only in amount columns (not in code/name columns)
   - Often preceded or followed by blank rows
   - In merged cell sheets, the label cell often spans multiple columns

4. **Group headers:** Category rows (e.g., "Current Assets", "Revenue"). Characteristics:
   - Text in column 0-1 only, no amounts
   - Often merged across columns
   - Followed by indented data rows

5. **Multiple data frames:** Some exports put different reports on the same sheet:
   - Look for a second header row mid-sheet
   - Blank rows or merged section titles between frames
   - Different column structures in different sections

### Pass C: Classification
For each identified data table, determine the type. See `references/file-types.md` for the comprehensive catalog of all 22 file types with source-system-specific patterns.

Quick reference for the most common types:

| Type | Key Indicators |
|------|---------------|
| **Trial Balance** | "Debit" + "Credit" columns OR "Balance" column. Account codes + names. No dates per row. |
| **AR Aging Detail** | Customer names. Aging buckets (Current/30/60/90+). Per-invoice rows. |
| **AP Aging Detail** | Supplier names. Same aging bucket pattern as AR. |
| **Chart of Accounts** | Account code + name + type/classification. No balances or dates. |
| **General Ledger Detail** | Dates + account + source module + description + debit/credit per transaction. Grouped by account. |
| **Contact List** | Names + addresses/phones/emails. No financial data. |
| **GL Subledger** | Single control account detail (AR/AP/Intercompany). Sheet within multi-report workbook. |
| **Platform Export (Jaz)** | CSV with UUIDs, `resource_id`, `jaz.ai` emails. **SKIP — not source data.** |

## Common Source System Patterns

### Xero Exports
- Clean CSV/Excel exports with consistent headers
- Account codes are numeric (e.g., "200", "400")
- Tax codes: "GST on Income", "GST on Expenses", "BAS Excluded", "GST Free"
- Contact type clearly labeled as "Customer" or "Supplier"

### QuickBooks Exports
- Often have grouped/indented accounts (sub-accounts indented under parents)
- May use "Total <category>" rows extensively
- Account numbers may be optional (some QB setups don't use them)
- Tax codes vary by region

### Sage Exports
- Typically clean tabular exports
- Account codes often in "XXXX" format (4 digits)
- May include "Nominal Code" + "Nominal Name" columns
- Tax codes: "T0" (Zero Rated), "T1" (Standard Rate), etc.

### Generic Excel (manual)
- Most unpredictable format
- May have custom formulas, conditional formatting
- Watch for:
  - Hidden rows/columns (SheetJS extracts these)
  - Grouped/outlined rows (collapsed sections)
  - Cross-sheet references (formulas referencing other sheets)

## Amount Parsing

Accounting exports use various number formats:
- `1,234.56` — standard with comma grouping
- `(1,234.56)` — parentheses = negative (accounting convention)
- `-1,234.56` — negative sign
- `1234.56` — no grouping
- `$1,234.56` — with currency symbol (strip the symbol)
- Blank or `-` — zero / no value

The CSV parser handles these automatically. For Excel files, SheetJS provides the numeric value directly.

## Confidence Scoring for AI Classification

When analyzing a sheet, assign confidence:

- **High (>80%):** Headers clearly match a known type, data structure is consistent
- **Medium (50-80%):** Partial match — some expected columns present, some missing or renamed
- **Low (<50%):** Ambiguous — could be multiple types, or unknown format

Flag medium and low confidence for human review before proceeding.
