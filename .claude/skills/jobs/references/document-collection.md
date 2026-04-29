# Document Collection

Scan and classify client documents (invoices, bills, credit notes, bank statements) from local directories or cloud share links (Dropbox, Google Drive, OneDrive). Outputs classified file paths with metadata. Supports encrypted PDF detection and decryption via `qpdf`. The AI agent handles uploads via the api skill.

## When to Use

- Client sends a folder of PDFs (invoices, bills, credit notes, receipts) for bulk processing
- Processing bank statement CSVs/OFX files for import
- Migrating documents from file dumps (Dropbox, shared folders, email attachments)
- Processing documents from a shared Dropbox, Google Drive, or OneDrive link
- Batch-processing scanned documents during onboarding
- Handling password-protected bank statement PDFs (auto-detection + decryption)

## How It Works

```
Source (local or cloud)              CLI Output (IngestPlan)
┌───────────────┐                    ┌──────────────────────────────────────────┐
│ invoices/     │── scan + classify ─► documentType: INVOICE                    │
│   inv-001.pdf │                    │ sizeBytes: 45230                         │
│ credit-notes/ │── scan + classify ─► documentType: CUSTOMER_CREDIT_NOTE      │
│   cn-001.pdf  │                    │                                          │
│ bills/        │── scan + classify ─► documentType: BILL                       │
│   acme-jan.pdf│                    │                                          │
│ bank/         │── scan + classify ─► documentType: BANK_STATEMENT             │
│   dbs-jan.csv │                    │ encrypted: true (if password-protected)  │
│   dbs-feb.pdf │                    │                                          │
└───────────────┘                    └──────────────────────────────────────────┘
                                                    │
                                            AI Agent reads plan,
                                        uploads via api skill / clio magic
```

Cloud links are downloaded to a temp directory first, then scanned through the same pipeline.

## Folder Classification

The tool auto-classifies documents by **folder name** (case-insensitive prefix match):

| Folder name pattern | Classification |
|---|---|
| `invoice*`, `sales*`, `ar*`, `receivable*`, `revenue*`, `customer*` | INVOICE |
| `credit-note*`, `cn*`, `customer-credit*`, `sales-credit*` | CUSTOMER_CREDIT_NOTE |
| `debit-note*`, `dn*`, `supplier-credit*`, `vendor-credit*`, `purchase-credit*` | SUPPLIER_CREDIT_NOTE |
| `bill*`, `purchase*`, `expense*`, `ap*`, `payable*`, `supplier*`, `vendor*`, `cost*` | BILL |
| `bank*`, `statement*`, `recon*`, `payment*`, `transaction*` | BANK_STATEMENT |
| (unknown) | UNKNOWN — skipped unless `--type` forced |

Multilingual support: Filipino/Tagalog, Bahasa Indonesia/Malay, Vietnamese, and Mandarin (pinyin) folder names are also recognized for all five document types.

### File Extension Filters

- **Invoices/Bills/Credit Notes**: `.pdf`, `.jpg`, `.jpeg`, `.png`
- **Bank Statements**: `.csv`, `.ofx`
- **Containers** (auto-extracted): `.zip` — contents extracted and processed individually
- **Skipped** (with warning): `.xlsx`, `.xls`, `.doc`, `.docx`, `.txt`, `.rar`, `.7z`

### Traversal Rules

1. **Subfolders** — each classified by name; nested subfolders inherit from nearest classified ancestor
2. **Root-level files** — classified as UNKNOWN (no folder context)
3. **Max depth** — 10 levels (prevents runaway recursion)
4. **Hidden files/dirs** — skipped (anything starting with `.`)
5. **ZIP files** — extracted to temp dir, contents scanned through same pipeline (max 1 level, no nested ZIPs)

## Cloud Provider Support

The `--source` flag accepts public share links from Dropbox, Google Drive, and OneDrive. Files are downloaded to a temp directory, then processed through the same scan/classify pipeline as local directories.

| Provider | File Links | Folder Links | Auth Required |
|----------|-----------|--------------|---------------|
| **Dropbox** | Direct download (dl=1 trick) | ZIP download + extract | No |
| **Google Drive** | Direct download (large file confirmation) | Not supported (requires API key) | No |
| **OneDrive/SharePoint** | MS Graph sharing API | MS Graph sharing API (first page only) | No (best-effort) |

### Cloud Limitations

- **Google Drive folders** require authentication — download manually and use a local path
- **OneDrive** is best-effort: Microsoft has restricted public link access since Feb 2025
- **Dropbox folders** download as ZIP — extracted automatically, macOS metadata stripped
- **Max file size**: 100MB per file, 500MB total for folder downloads
- **Timeout**: Default 30s (files) / 120s (folders). Override with `--timeout <ms>`

## CLI Usage

```bash
# Scan + classify local directory
clio jobs document-collection ingest --source ./client-docs/ [--json]

# Scan + classify a ZIP file (auto-extracted)
clio jobs document-collection ingest --source ./client-docs.zip [--json]

# Cloud sources — Dropbox, Google Drive, OneDrive
clio jobs document-collection ingest --source "https://www.dropbox.com/scl/fo/.../folder?rlkey=..." [--json]
clio jobs document-collection ingest --source "https://drive.google.com/file/d/FILE_ID/view" [--json]
clio jobs document-collection ingest --source "https://1drv.ms/f/s!..." [--json]

# Dropbox file link to a ZIP (auto-extracted)
clio jobs document-collection ingest --source "https://www.dropbox.com/scl/fi/.../docs.zip?rlkey=...&dl=0" [--json]

# With timeout for large cloud downloads
clio jobs document-collection ingest --source "https://www.dropbox.com/..." --timeout 120000 [--json]

# Force classification (skip auto-detect)
clio jobs document-collection ingest --source ./scans/ --type invoice [--json]
clio jobs document-collection ingest --source ./scans/ --type credit-note-customer [--json]

# Upload a ZIP of invoices via Magic (all files treated as same type)
clio magic create --file ./invoices.zip --type invoice --json

# Scan + upload (encrypted PDFs with password embedded in filename)
clio jobs document-collection ingest --source ./bank-docs/ --upload --bank-account "DBS Checking" --json
# To decrypt: rename encrypted PDF to: receipt__pw__actualPassword.pdf
# The __pw__ delimiter is case-insensitive; the password itself is case-sensitive.
```

### Options

| Flag | Description |
|------|-------------|
| `--source <path\|url>` | Local directory, .zip file, or public cloud share link — Dropbox, Google Drive, OneDrive (required). ZIPs are auto-extracted. |
| `--type <type>` | Force all files to: `invoice`, `bill`, `credit-note-customer`, `credit-note-supplier`, or `bank-statement` |
| `--upload` | Upload classified files to Jaz after scanning (requires auth) |
| `--bank-account <name-or-id>` | Bank account name or resourceId (required for bank statements) |
| `--api-key <key>` | API key for upload (or use `JAZ_API_KEY` env var) |
| `--timeout <ms>` | Download timeout in milliseconds (default: 30000 for files, 120000 for folders) |
| `--currency <code>` | Functional/reporting currency label |
| `--json` | Structured JSON output with absolute file paths |

### Encrypted PDF Passwords

Embed the password in the filename using the `__pw__` pattern:
```
receipt__pw__s3cRetP@ss.pdf  →  password: "s3cRetP@ss", display name: "receipt.pdf"
```
- `__pw__` is case-insensitive (`__PW__`, `__Pw__`, etc.)
- The password after `__pw__` is case-sensitive
- Requires `qpdf` installed (`brew install qpdf`)

### JSON Output

The `--json` output includes absolute file paths, classification, and size for each file. The AI agent uses these paths to upload via the api skill.

```json
{
  "source": "./client-docs/",
  "sourceType": "local",
  "localPath": "/tmp/client-docs",
  "folders": [{
    "folder": "invoices",
    "documentType": "INVOICE",
    "files": [{
      "path": "invoices/inv-001.pdf",
      "filename": "inv-001.pdf",
      "extension": ".pdf",
      "documentType": "INVOICE",
      "absolutePath": "/tmp/client-docs/invoices/inv-001.pdf",
      "sizeBytes": 45230,
      "confidence": "auto",
      "reason": "Folder \"invoices\" → INVOICE"
    }],
    "count": 1
  }],
  "summary": {
    "total": 1,
    "uploadable": 1,
    "needClassification": 0,
    "skipped": 0,
    "encrypted": 0,
    "byType": { "INVOICE": 1 }
  }
}
```

For cloud sources, `localPath` points to the temp directory where files were downloaded.

## Encrypted PDF Support

Bank statements and some government documents are often delivered as password-protected PDFs. The Magic API cannot process encrypted PDFs, so the tool detects them during scan and decrypts before upload.

### Detection

During scan, each `.pdf` file is checked for a `/Encrypt` dictionary entry in the PDF binary. Encrypted files are flagged with `encrypted: true` in the plan and shown with a `(encrypted)` tag in the output.

### Decryption

Decryption requires `qpdf` (a system CLI tool):

```bash
# Install qpdf
brew install qpdf        # macOS
sudo apt install qpdf    # Ubuntu/Debian
choco install qpdf       # Windows
```

Passwords are embedded in the filename using the `__pw__` pattern: `receipt__pw__myPass.pdf`. During upload, encrypted PDFs with a filename password are decrypted to a temp file, uploaded, then cleaned up.

### Error Handling (JSON mode)

If encrypted PDFs are found during `--upload` without the required dependencies, the tool outputs structured errors for agent consumption:

| Error Code | Condition | Action |
|------------|-----------|--------|
| `ENCRYPTED_PDF_NO_QPDF` | qpdf not installed | Install qpdf, then retry |
| `ENCRYPTED_PDF_NO_PASSWORD` | Encrypted PDF without `__pw__` in filename | Rename file to embed password: `name__pw__password.pdf` |

## Phases (Blueprint)

When run without `ingest` subcommand, produces a 4-phase blueprint:

1. **Intake** — Identify source, validate access
2. **Scan** — Traverse directory tree, list all files
3. **Classify** — Auto-classify by folder name
4. **Review** — Present plan for user/agent action

The AI agent then uses the classified file paths to upload via the Jaz Magic API (see api skill for endpoint details).

## ZIP File Support

ZIP files are treated as containers — their contents are extracted and each file is processed individually through the same scan/classify pipeline.

### Supported Scenarios

1. **ZIP in a scanned directory**: Extracted to a temp dir, contents scanned recursively
2. **ZIP as --source**: `clio jobs document-collection ingest --source ./archive.zip` extracts and scans
3. **ZIP from Dropbox file link**: Auto-extracted after download
4. **ZIP via clio magic create**: `clio magic create --file archive.zip --type invoice` extracts and uploads each file

### Limitations

- Nested ZIPs (ZIP inside ZIP) are not extracted — only one level
- Password-protected ZIPs are not supported (adm-zip limitation)
- Max ZIP size: 500MB
- `.rar` and `.7z` are still skipped (no built-in support)

## Relationship to Other Skills

- **api skill** — Field names, auth headers, error codes for Magic endpoints. Agent uses this to upload classified files.
- **bank-recon job** — After bank statement import, use bank-recon to match and reconcile
- **transaction-recipes** — After Magic creates draft transactions, use recipes for complex accounting patterns
