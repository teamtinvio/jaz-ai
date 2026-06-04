# Document Collection

> Scan + classify client docs (invoices, bills, credit notes, bank statements) from local dirs or cloud links (Dropbox, Google Drive, OneDrive); decrypt encrypted PDFs (`qpdf`); upload via Jaz Magic. Walk the steps below in order, calling the named platform tools directly. (Local CLI convenience: `clio jobs document-collection` prints this same phased checklist; the `ingest` subcommand below does the local/cloud scan.)

## Tools, recipes, calculators this job uses

### Platform tools
- **`mcp magic create --file <pdf>` / `create_business_transaction_from_attachment(sourceFile, businessTransactionType: 'BILL'|'INVOICE'|'CREDIT_NOTE', sourceType: 'FILE')`** — step 4: OCR + line-item extraction + contact + CoA suggestion. Creates DRAFT transaction.
- **`finalize_bill(...)` / `finalize_invoice(...)` / `finalize_customer_credit_note(...)`** — step 5: finalize practitioner-reviewed Magic-extracted DRAFTs.
- **`import_bank_statement(bankAccountResourceId, sourceFile, sourceType: 'FILE')`** — step 6: bank statements (CSV / OFX / PDF); creates bank records pending reconciliation per `bank-recon.md`.
- **`search_background_jobs(filter: {resourceId: {eq: <jobId>}})`** — step 7: poll Magic / bank-import async jobs to terminal status.

### CLI tools (jaz-cli — offline)
- **`clio jobs document-collection ingest --source <local-dir> --json`** — step 2 ingest local: scan a local directory, classify per file-type heuristics, output JSON with per-file metadata (`{path, classifiedAs, confidence, encrypted, suggestedAction}`).
- **`clio jobs document-collection ingest --source 'https://www.dropbox.com/scl/fo/...' --json`** — step 2 ingest cloud: same flow over a Dropbox / Google Drive / OneDrive shared link. Recursive folder traversal. Files downloaded to a temp dir.
- **`clio jobs document-collection ingest --source <dir> --decrypt --json`** — step 3 decryption: detect password-protected PDFs and decrypt via `qpdf`. Per memory rule: if `__pw__<password>` is in the filename, the ingest tool extracts and uses the password automatically.

### External dependencies
- **`qpdf`** binary — required for encrypted PDF decryption. Document-collection ingest detects encryption + invokes qpdf transparently. If qpdf missing: surface install instruction (`brew install qpdf` on macOS, `apt-get install qpdf` on Linux).

### Cross-references
- Run at the start of the month-end close (collecting late-arriving bills) and during initial client setup (first doc collection from prior firm + first month).
- Sibling jobs: `bank-recon.md` (consumes bank statements imported here), `audit-prep.md` step 13 (data exports vs documents traceability).
- API rules: `jaz-api/SKILL.md` rules 57-63 (Jaz Magic / PDF-JPG OCR specifics).

---

## Steps

Walk steps 1-8 below. (Local CLI: `clio jobs document-collection --period 2025-01` prints the same phased checklist.)

## Step 1 — Identify the source

Source can be:
- Local directory: `./client-docs/2025-01/` (most common, after practitioner downloads from email)
- Dropbox shared link: `https://www.dropbox.com/scl/fo/<token>/<folder>?dl=0`
- Google Drive shared link: `https://drive.google.com/drive/folders/<folder-id>`
- OneDrive shared link: `https://1drv.ms/f/s!<token>`

Use the org's preferred source if the user has one in mind; otherwise ask.

## Step 2 — Ingest

```
clio jobs document-collection ingest --source <source> --json
```

Returns per-file:
```json
{
  "path": "/tmp/dc-ingest/<orig path>",
  "originalName": "Acme Inv 2025-01-15.pdf",
  "classifiedAs": "BILL" | "INVOICE" | "CREDIT_NOTE" | "BANK_STATEMENT" | "RECEIPT" | "UNKNOWN",
  "confidence": 0.92,
  "encrypted": false,
  "fileSize": 124321,
  "suggestedAction": "magic-create-bill" | "magic-create-invoice" | "import-bank-statement" | "manual-review"
}
```

Classification heuristics:
- Filename contains `inv` / `bill` / `purchase` → SALES_INVOICE / BILL
- Filename contains `cn` / `credit` → CREDIT_NOTE
- Filename contains `statement` / `stmt` / `bank` → BANK_STATEMENT
- Per-file content sniff for PDFs (header parsing) — confidence boost when filename is ambiguous

Keep the ingest result for the period.

## Step 3 — Decrypt encrypted PDFs (if any)

For files where `encrypted: true`:

```
clio jobs document-collection ingest --source <dir> --decrypt --json
```

Decryption flow:
- Filename `Bill_Invoice__pw__supersecret.pdf` → ingest extracts `supersecret` from `__pw__<password>` token, invokes `qpdf --password=supersecret --decrypt` to a temp file.
- Filename without `__pw__` → surface to practitioner: "File `<name>` is encrypted; provide password OR rename file with `__pw__<password>` token to enable auto-decryption."
- `qpdf` binary missing → surface install instruction; halt this file but continue rest of batch.

Decrypted files replace the original in the ingest manifest; original kept for audit trail.

## Step 4 — Upload via Jaz Magic

For each file with `suggestedAction: 'magic-create-bill' | 'magic-create-invoice' | 'magic-create-credit-note'`:

```
mcp magic create --file <decrypted path> --type bill
# OR equivalent MCP call:
create_business_transaction_from_attachment(
  sourceFile: <multipart upload>,
  businessTransactionType: 'BILL',
  sourceType: 'FILE'
)
```

Per `jaz-api/SKILL.md` rules 57-63:
- Multipart endpoint (NOT JSON): `Content-Type: multipart/form-data`
- `sourceType: 'FILE'` for direct upload (vs `URL` for cloud-hosted)
- Returns `{ jobId }` for async OCR processing
- Poll via `search_background_jobs(filter: {resourceId: {eq: <jobId>}})` until terminal
- On `SUCCESS`: returns the resourceId of the DRAFT bill / invoice / credit note created
- Magic does: OCR + line-item extraction + contact matching (creates new contact if no match) + CoA mapping suggestion + tax-profile suggestion

## Step 5 — Practitioner review + finalize

For each Magic-extracted DRAFT:

```
get_bill(resourceId: <bill id>)  # or get_invoice / get_customer_credit_note
```

Surface to practitioner: extracted contact, line items, totals, suggested GL coding, tax profile. Practitioner reviews + adjusts any miscoding via `update_bill(...)` if needed.

When approved:
```
finalize_bill(resourceId: <id>)
# OR for batch:
bulk_finalize_drafts({kind: 'bill', resourceIds: [...]})
```

## Step 6 — Bank statement import

For files with `suggestedAction: 'import-bank-statement'`:

Resolve target bank account:
```
list_bank_accounts()  # or search_accounts(filter: {accountType: 'Bank Accounts'})
```

Match by name + currency to the statement (typically the bank logo + account number in the PDF header gives the practitioner the right account).

```
import_bank_statement(
  bankAccountResourceId: <bank id>,
  sourceFile: <statement file>,
  sourceType: 'FILE'
)
```

Returns `{ jobId }`. Poll via `search_background_jobs`. On terminal: returns count of bank records imported.

Imported bank records are PENDING reconciliation — feed into `bank-recon.md` job for matching.

## Step 7 — Async polling

For all `jobId`s from steps 4 + 6:

```
search_background_jobs(filter: {resourceId: {in: [<all jobIds>]}})
```

Per `jaz-api/SKILL.md` rules 92-96: filter by `resourceId` (NOT `jobId`); poll until terminal status (`SUCCESS` / `FAILED` / `PARTIAL_SUCCESS`); on `PARTIAL_SUCCESS` read `errorDetails[]` for per-record failures.

For `FAILED` Magic jobs: file may be unreadable (corrupted PDF, image-only without OCR support, password issue post-decryption). Surface to practitioner; manual posting required for that file.

## Step 8 — Save audit trail

Per file processed: capture `{originalPath, classifiedAs, magicJobId, resultingResourceId, finalizedTimestamp}` in a per-period audit record.

Auditor sample-test traces from a posted bill back to the source PDF. Audit trail makes that trivial.

---

## Common error classes and recovery

| Source | Error | Recovery |
|--------|-------|----------|
| Step 2 ingest | Cloud link returns 404 / shared-link expired | Practitioner re-shares link; re-run ingest. |
| Step 2 ingest | Local directory empty | Confirm the staging directory with the user — the path may be wrong. |
| Step 3 decryption | `qpdf` binary missing | `brew install qpdf` (macOS) / `apt-get install qpdf` (Linux). Re-run with `--decrypt`. |
| Step 3 decryption | Password wrong (file remains encrypted) | Surface to practitioner with the file path. Manual decryption + re-ingest. |
| Step 4 Magic | 422 `unsupported_file_type` | Convert to PDF / JPG first. Excel / Word formats not supported by Magic OCR. |
| Step 4 Magic | Job stays in QUEUED for > 5 minutes | Magic queue is backed up. Check status; consider manual posting if blocking close. |
| Step 4 Magic | `PARTIAL_SUCCESS` with low-confidence extractions | Review each in step 5; practitioner overrides. Magic confidence < 0.7 = manual review required. |
| Step 5 review | Wrong contact assigned | `update_bill(contactResourceId: <correct id>)` before finalize. |
| Step 5 review | Wrong line-item GL | `update_bill(lineItems: [<corrected>])` before finalize. |
| Step 6 bank import | 422 `bank_format_unsupported` | Bank format not supported (some niche banks). Manual `add_bank_records(bankAccountResourceId, records: [...])` per statement line. |
| Step 7 polling | Job stuck in PROCESSING > 10 minutes | Escalate; usually a Magic backend issue. |

---

## Tips

- **Cloud ingest > local.** Practitioners often have client docs in shared Dropbox folders. Ingesting directly from the link skips the manual download step.
- **Encrypt convention.** `__pw__` token in filename is a safe workaround when forwarding password-protected client PDFs. Share this convention with the client during onboarding.
- **Magic confidence bands.** > 0.85 = auto-finalize after light review; 0.70-0.85 = practitioner-review-then-finalize; < 0.70 = manual posting (Magic was wrong about something material).
- **Bank statement import** is the highest-leverage path. A 1-min import handles 50-200 bank records. Manual entry for the same is hours.
- **Keep a per-month audit record** of every processed file (source path → resulting transaction). It is a lightweight audit pack the auditor can trace instantly.

---

## Cross-references

- `month-end-close.md` step 2 — run at the start of the monthly close to capture late-arriving bills.
- Initial client setup — run during onboarding; the first batch is often large (prior-firm export + current month).
- `bank-recon.md` — consumes the step 6 bank-statement imports.
- `audit-prep.md` step 13 — XLSX exports plus the per-file audit record give the auditor full traceability.
