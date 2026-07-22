---
description: "Prepare GST/VAT filing in Jaz — review tax ledger, identify discrepancies, generate filing summary"
argument-hint: "<period YYYY-QN>"
---

# GST/VAT Filing Preparation

Execute the GST/VAT filing workflow via `clio jobs gst-vat`. Reviews the tax ledger and produces a filing-ready summary.

## Usage

```
/jaz-gst 2025-Q1
/jaz-gst 2025-Q4
```

## Workflow

### 1. Generate the blueprint

```bash
clio jobs gst-vat --period 2025-Q1 --json
```

### 2. Review the tax ledger

The blueprint walks through:
- Output tax (sales) totals by tax code
- Input tax (purchases) totals by tax code
- Exempt and out-of-scope transactions
- Discrepancies (e.g., transactions missing tax codes)

### 3. Fix discrepancies

For transactions missing tax: update them via `clio invoices update`, `clio bills update`, etc.
For misclassified tax codes: correct the underlying transactions.

### 4. Generate reports for filing

```bash
clio reports generate trial-balance --to 2025-03-31 --json
```

The GST summary from the blueprint maps directly to the GST F5 return boxes (Singapore) or equivalent local form.

### 5. File

The actual filing is done outside Jaz (IRAS myTax Portal for Singapore, etc.). The output provides the numbers to enter.

## Key Rules

- Period format: `YYYY-QN` (Q1 = Jan-Mar for standard FY)
- GST/VAT only applies to tax-enabled transactions — `isTaxVatApplicable: true`
- Output tax = collected on sales, Input tax = paid on purchases
- Net GST payable = output tax - input tax
- Singapore-specific: 9% GST, quarterly filing, due 1 month after quarter-end
