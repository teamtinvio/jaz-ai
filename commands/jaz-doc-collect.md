---
description: "Scan and classify client documents for upload to Jaz — local files and cloud links (Dropbox, Drive, OneDrive)"
argument-hint: "<directory or cloud link>"
---

# Document Collection

Execute the document collection workflow via `clio jobs document-collection`. Scans directories, classifies documents, and prepares them for upload.

## Usage

```
/jaz-doc-collect ~/Downloads/client-docs/
/jaz-doc-collect scan the January invoices folder
```

## Workflow

### 1. Generate the blueprint

```bash
clio jobs document-collection --json
```

### 2. Scan and classify

Point the workflow at a directory:

```bash
clio jobs document-collection ingest --path ~/Downloads/client-docs/ --json
```

The ingestor:
- Scans for PDF, JPG, PNG files
- Classifies each as: invoice, bill, receipt, bank statement, other
- Groups by type and date

### 3. Upload to Jaz

For invoices and bills, use Jaz Magic (server-side OCR + autofill). The Magic endpoint accepts multipart form data:

- **Endpoint:** `POST /api/v1/magic/createBusinessTransactionFromAttachment`
- **Fields:** `sourceFile` (PDF/JPG), `businessTransactionType` (`"BILL"` or `"INVOICE"`), `sourceType` (`"FILE"` or `"URL"`)
- **Auth:** Uses the same API key from `clio auth` — clio handles auth automatically

Magic extraction is async — the upload returns immediately, OCR runs in background. Use `clio bills search` or `clio invoices search` to verify the extracted documents.

For bank statements:

```bash
clio bank import --account "DBS Current" --file statement.csv --json
```

### 4. Verify uploads

Check that uploaded documents appear in Jaz:

```bash
clio bills search --from 2025-01-01 --to 2025-01-31 --json
clio invoices search --from 2025-01-01 --to 2025-01-31 --json
```

## Key Rules

- Jaz Magic accepts PDF and JPG/JPEG — use `businessTransactionType: "BILL"` or `"INVOICE"` (not `"EXPENSE"`)
- Multipart field names are camelCase: `sourceFile`, `businessTransactionType`, `sourceType`
- Magic extraction is async — the upload returns immediately, OCR runs in background
- Cloud links (Dropbox, Drive, OneDrive) can use `sourceType: "URL"` with `sourceURL` instead of file upload
