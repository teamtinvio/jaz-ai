# Common CLI Workflows

Real-world multi-command patterns for accounting automation.

---

## 1. Invoice Lifecycle: Create, Finalize, Pay, Verify

Create a sales invoice, approve it, record payment, and confirm the balance.

```bash
# Create invoice as draft (fuzzy-resolves contact and account)
clio invoices create \
  --contact "Acme Corp" \
  --date 2026-03-15 \
  --due 2026-04-15 \
  --ref "INV-2026-042" \
  --lines '[{"name":"Consulting Q1","quantity":1,"unitPrice":5000,"accountResourceId":"Revenue"}]' \
  --json

# Capture the resourceId from output
INVOICE_ID=$(clio invoices search --ref INV-2026-042 --json | jq -r '.data[0].resourceId')

# Finalize (approve) the invoice
clio invoices update "$INVOICE_ID" --finalize

# Record payment against the invoice
clio invoices pay "$INVOICE_ID" \
  --amount 5000 \
  --tx-amount 5000 \
  --account "Bank - SGD" \
  --method BANK_TRANSFER \
  --ref "PAY-042" \
  --date 2026-03-20

# Verify — invoice should now show status PAID
clio invoices get "$INVOICE_ID" --json | jq '{status, totalAmount, amountPaid}'
```

## 2. Bank Statement Import and Auto-Reconciliation

Import a bank statement, trigger auto-reconciliation, and review unmatched records.

```bash
# List bank accounts to find the right one
clio bank accounts --json | jq '.data[] | {resourceId, name, currencyCode}'

BANK_ID="<bank-account-resourceId>"

# Import statement file (CSV, OFX, XLS, or XLSX)
clio bank import "$BANK_ID" ./march-2026-statement.csv

# Trigger auto-reconciliation
clio bank auto-recon "$BANK_ID"

# Review unreconciled records
clio bank records "$BANK_ID" --status UNRECONCILED --from 2026-03-01 --to 2026-03-31 --json

# Check for possible duplicates
clio bank records "$BANK_ID" --status POSSIBLE_DUPLICATE --json
```

## 3. Month-End Close Workflow

Generate a blueprint, run reports, and create any adjusting journals.

```bash
# Generate month-end checklist (offline, no auth)
clio jobs month-end --month 3 --year 2026 --currency SGD --json > month-end-checklist.json

# Run key reports for review
clio reports generate trial-balance --to 2026-03-31 --json > tb-mar.json
clio reports generate profit-loss --from 2026-03-01 --to 2026-03-31 --json > pl-mar.json
clio reports generate balance-sheet --to 2026-03-31 --json > bs-mar.json
clio reports generate bank-recon-summary --to 2026-03-31 --json > recon-mar.json

# Create adjusting journal if needed
clio journals create \
  --date 2026-03-31 \
  --ref "ADJ-MAR-001" \
  --entries '[
    {"accountResourceId":"Accrued Expenses","amount":1500,"type":"DEBIT"},
    {"accountResourceId":"Consulting Expense","amount":1500,"type":"CREDIT"}
  ]' \
  --finalize

# Generate aged AR/AP reports
clio reports generate aged-ar --to 2026-03-31 --json > aged-ar-mar.json
clio reports generate aged-ap --to 2026-03-31 --json > aged-ap-mar.json
```

## 4. FX Transaction: Add Currency, Set Rate, Create Invoice

Handle a foreign currency invoice from start to finish.

```bash
# Add USD currency to the org (idempotent — safe to re-run)
clio currencies add USD

# Set the exchange rate for the period
clio currency-rates add USD --rate 1.3450 --from 2026-03-01 --to 2026-03-31

# Or import rates automatically from ECB/MAS
clio currency-rates import USD --from 2026-03-01 --to 2026-03-31

# Create an invoice in USD (org base is SGD)
clio invoices create \
  --contact "US Client Inc" \
  --date 2026-03-15 \
  --due 2026-04-15 \
  --ref "INV-USD-001" \
  --currency USD \
  --rate 1.3450 \
  --lines '[{"name":"Software License","quantity":1,"unitPrice":2000,"accountResourceId":"Revenue"}]' \
  --finalize

# Record payment (cross-currency: amount in bank currency, tx-amount in invoice currency)
INVOICE_ID=$(clio invoices search --ref INV-USD-001 --json | jq -r '.data[0].resourceId')
clio invoices pay "$INVOICE_ID" \
  --amount 2690 \
  --tx-amount 2000 \
  --account "Bank - SGD" \
  --method BANK_TRANSFER \
  --ref "PAY-USD-001" \
  --date 2026-04-10
```

## 5. Equipment Purchase with Depreciation

Record a fixed asset purchase, calculate depreciation, and create journal entries via capsule-transaction.

```bash
# Create the fixed asset record
clio fixed-assets create \
  --name "Office Printer" \
  --type "Office Equipment" \
  --purchase-price 3600 \
  --purchase-date 2026-01-01 \
  --input '{"depreciationMethod":"STRAIGHT_LINE","usefulLifeMonths":36,"salvageValue":0}'

# Preview the depreciation schedule (offline — no auth)
clio calc depreciation \
  --cost 3600 \
  --salvage 0 \
  --life 36 \
  --method straight-line \
  --start-date 2026-01-01 \
  --currency SGD \
  --json

# Execute as a capsule-transaction (creates capsule + monthly journals)
clio ct depreciation \
  --cost 3600 \
  --salvage 0 \
  --life 36 \
  --method straight-line \
  --start-date 2026-01-01 \
  --ref "DEP-PRINTER" \
  --json

# Or plan first (offline) to see what accounts are needed
clio ct depreciation \
  --cost 3600 \
  --salvage 0 \
  --life 36 \
  --method straight-line \
  --plan
```

## 6. Search, Filter, and Bulk-Update Workflow

Find transactions matching criteria and bulk-update them.

```bash
# Universal search across all entities
clio search "Acme" --json

# Search invoices with specific filters
clio invoices search --contact "Acme Corp" --status DRAFT --from 2026-01-01 --json

# Extract IDs of matching drafts
DRAFT_IDS=$(clio invoices search --status DRAFT --from 2026-03-01 --to 2026-03-31 --json \
  | jq -r '[.data[].resourceId] | join(",")')

# Bulk-update: set tag and due date on all matching invoices
clio quick-fix invoices --ids "$DRAFT_IDS" --tag "Q1-Review" --due 2026-04-30

# Bulk-update line items (e.g., reassign account)
clio quick-fix invoices --line-items --ids "$LINE_ITEM_IDS" \
  --account "<target-account-resourceId>"
```

## 7. Multi-Org Management

Manage multiple organizations from one machine.

```bash
# Add multiple org keys
clio auth add jk-sg-key-here --as acme-sg
clio auth add jk-ph-key-here --as acme-ph
clio auth add jk-us-key-here --as acme-us

# List all profiles
clio auth list

# Switch active org
clio auth switch acme-sg
clio auth whoami

# Run commands against specific orgs without switching
clio invoices list --org acme-ph --json > ph-invoices.json
clio invoices list --org acme-us --json > us-invoices.json

# Pin an org for the session (all commands use this until unpin)
export JAZ_ORG=acme-sg
clio invoices list     # Uses acme-sg
clio contacts list     # Uses acme-sg

# Unpin
clio auth unpin
# Or: unset JAZ_ORG

# Generate shell exports for scripting
eval "$(clio auth shell-init)"
```

## 8. Document Collection and AI Extraction

Ingest documents, extract data via AI, and review results.

```bash
# Ingest a folder of mixed PDFs (invoices, bills, bank statements)
clio jobs ingest ./inbox/ --json

# Or extract a single document
clio magic create ./invoice-from-supplier.pdf --type bill --wait --json

# Check workflow status
clio magic status "wf-id-1,wf-id-2,wf-id-3" --json

# Search past magic workflows
clio magic search --type bill --status COMPLETED --from 2026-03-01 --json

# For encrypted PDFs
clio magic create ./encrypted-file.pdf --type invoice --password "secret123" --wait
```
