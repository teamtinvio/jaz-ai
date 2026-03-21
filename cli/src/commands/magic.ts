import { danger, success, accent, warning, muted, highlight } from './ui/theme.js';
import { mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs';
import { formatStatus } from './format-helpers.js';
import { basename, extname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { Command } from 'commander';
import * as p from '@clack/prompts';
import type { JazClient } from '../core/api/client.js';
import {
  createFromAttachment,
  searchMagicWorkflows,
  waitForWorkflows,
} from '../core/api/magic.js';
import type {
  MagicDocumentType,
  MagicWorkflowDocumentType,
  MagicWorkflowStatus,
  MagicWorkflowSearchFilter,
  MagicWorkflowItem,
} from '../core/api/magic.js';
import {
  extractFilePassword,
  isPdfEncrypted,
  isQpdfAvailable,
  decryptPdf,
  cleanupDecryptedFile,
} from '../core/jobs/document-collection/tools/ingest/decrypt.js';
import { extractZipToDir, flattenSingleRoot } from '../core/jobs/document-collection/tools/ingest/cloud/zip.js';
import { apiAction } from './api-action.js';
import { parsePositiveInt } from './parsers.js';
import { displaySlice } from './pagination.js';

// ── Type Mappings ────────────────────────────────────────────────

/** CLI --type values → API request enum */
const TYPE_TO_API: Record<string, MagicDocumentType> = {
  invoice: 'INVOICE',
  bill: 'BILL',
  'credit-note-customer': 'CUSTOMER_CREDIT_NOTE',
  'credit-note-supplier': 'SUPPLIER_CREDIT_NOTE',
};

/** CLI --type values → API workflow search documentType enum */
const TYPE_TO_SEARCH: Record<string, MagicWorkflowDocumentType> = {
  invoice: 'SALE',
  bill: 'PURCHASE',
  'credit-note-customer': 'SALE_CREDIT_NOTE',
  'credit-note-supplier': 'PURCHASE_CREDIT_NOTE',
  'bank-statement': 'BANK_STATEMENT',
};

/** Extension → MIME type for multipart uploads */
const MIME_MAP: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.heic': 'image/heic',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.eml': 'message/rfc822',
};

const VALID_TYPES = Object.keys(TYPE_TO_API).join(', ');
const VALID_SEARCH_TYPES = Object.keys(TYPE_TO_SEARCH).join(', ');
const VALID_STATUSES = 'submitted, processing, completed, failed';

export function registerMagicCommand(program: Command): void {
  const magic = program
    .command('magic')
    .description('AI-powered document extraction and workflow tracking');

  // ── clio magic create ─────────────────────────────────────────
  magic
    .command('create')
    .description('Upload a file to create a draft transaction via AI extraction. Encrypted PDFs auto-decrypt via __pw__ in filename (e.g. receipt__pw__pass.pdf)')
    .option('--file <path>', 'Local file path (PDF, JPG, PNG, HEIC, XLS, XLSX, EML, ZIP). ZIP: extracts and uploads each file. Encrypted PDFs: name__pw__password.pdf')
    .option('--url <url>', 'Remote file URL (alternative to --file)')
    .option('--type <type>', `Document type: ${VALID_TYPES}`)
    .option('--merged', 'Treat file as a merged PDF containing multiple documents (split before extraction)')
    .option('--api-key <key>', 'API key (overrides stored/env)')
    .option('--json', 'Output as JSON')
    .action(apiAction(async (client, opts) => {
      // Validate required options
      if (!opts.file && !opts.url) {
        console.error(danger('Error: must provide --file or --url'));
        process.exit(1);
      }
      if (opts.file && opts.url) {
        console.error(danger('Error: cannot use both --file and --url'));
        process.exit(1);
      }
      if (!opts.type) {
        console.error(danger(`Error: --type is required (${VALID_TYPES})`));
        process.exit(1);
      }

      const apiType = TYPE_TO_API[opts.type];
      if (!apiType) {
        console.error(danger(`Error: invalid type "${opts.type}". Valid: ${VALID_TYPES}`));
        process.exit(1);
      }

      // Validate --merged constraints
      if (opts.merged) {
        if (opts.url) {
          console.error(danger('Error: --merged is only supported with --file, not --url'));
          process.exit(1);
        }
        const ext = extname(opts.file).toLowerCase();
        if (ext !== '.pdf') {
          console.error(danger('Error: --merged requires a PDF file (got ' + ext + ')'));
          process.exit(1);
        }
      }

      let sourceFile: Blob | undefined;
      let sourceFileName: string | undefined;
      let decryptedPath: string | undefined;

      if (opts.file) {
        const filePath = resolve(opts.file);
        const ext = extname(filePath).toLowerCase();

        // ── ZIP: extract and upload each file individually ──
        if (ext === '.zip') {
          await handleZipUpload(client, filePath, apiType, opts);
          return;
        }

        const mime = MIME_MAP[ext];
        if (!mime) {
          console.error(danger(`Error: unsupported file type "${ext}". Supported: ${Object.keys(MIME_MAP).join(', ')}, .zip`));
          process.exit(1);
        }

        const resolved = await resolveInputPdf(filePath, ext, opts);
        decryptedPath = resolved.decryptedPath;

        try {
          const buffer = readFileSync(resolved.effectivePath);
          sourceFile = new Blob([buffer], { type: mime });
          sourceFileName = resolved.cleanName;
        } finally {
          if (decryptedPath) cleanupDecryptedFile(decryptedPath);
        }
      }

      const res = await createFromAttachment(client, {
        businessTransactionType: apiType,
        sourceFile,
        sourceFileName,
        sourceUrl: opts.url,
        uploadMode: opts.merged ? 'MERGED' : undefined,
      });

      const data = res.data;
      const validFile = data.validFiles?.[0];
      const invalidFile = data.invalidFiles?.[0];

      if (opts.json) {
        console.log(JSON.stringify({
          workflowResourceId: validFile?.workflowResourceId ?? null,
          status: validFile ? 'SUBMITTED' : 'FAILED',
          documentType: data.businessTransactionType,
          fileName: data.filename,
          ...(invalidFile?.errorMessage && { error: invalidFile.errorMessage }),
        }, null, 2));
      } else {
        if (validFile) {
          console.log(success('File uploaded — extraction started.'));
          console.log(highlight('Workflow ID:'), validFile.workflowResourceId);
          console.log(highlight('Document Type:'), data.businessTransactionType);
          console.log(highlight('File:'), data.filename);
          console.log(muted(`\nCheck status: clio magic status ${validFile.workflowResourceId}`));
        } else {
          console.error(danger('Upload failed.'));
          if (invalidFile?.errorMessage) {
            console.error(danger(`Error: ${invalidFile.errorMessage}`));
          }
        }
      }
    }));

  // ── clio magic status ─────────────────────────────────────────
  magic
    .command('status <workflowIds>')
    .description('Check status of one or more magic workflows (comma-separated IDs)')
    .option('--wait', 'Poll every 60s until all workflows complete or fail')
    .option('--timeout <secs>', 'Max wait time in seconds (default: 600)', parsePositiveInt)
    .option('--api-key <key>', 'API key (overrides stored/env)')
    .option('--json', 'Output as JSON')
    .action((workflowIds: string, opts) => apiAction(async (client) => {
      const ids = workflowIds.split(',').map((id) => id.trim()).filter(Boolean);
      if (ids.length === 0) {
        console.error(danger('Error: provide at least one workflow ID'));
        process.exit(1);
      }

      if (opts.wait) {
        const timeoutMs = (opts.timeout ?? 600) * 1000;
        const results = await waitForWorkflows(client, ids, {
          timeout: timeoutMs,
          onPoll: (items) => {
            if (!opts.json) {
              const completed = items.filter((i) => i.status === 'COMPLETED' || i.status === 'FAILED').length;
              process.stderr.write(muted(`  Polling... ${completed}/${ids.length} done\n`));
            }
          },
        });
        outputWorkflowResults(results, opts.json);
      } else {
        // One-shot lookup
        const results: MagicWorkflowItem[] = [];
        for (const id of ids) {
          const res = await searchMagicWorkflows(client, {
            filter: { resourceId: { eq: id } },
            limit: 1,
          });
          if (res.data.length > 0) {
            results.push(res.data[0]);
          } else {
            // Not found — show a placeholder
            if (!opts.json) {
              console.error(warning(`  ${id}  NOT FOUND`));
            }
          }
        }
        outputWorkflowResults(results, opts.json);
      }
    })(opts));

  // ── clio magic search ─────────────────────────────────────────
  magic
    .command('search')
    .description('Search magic workflows with filters')
    .option('--type <type>', `Document type: ${VALID_SEARCH_TYPES}`)
    .option('--status <status>', `Status: ${VALID_STATUSES}`)
    .option('--file-name <name>', 'Filter by filename (contains)')
    .option('--from <YYYY-MM-DD>', 'Created from date (inclusive)')
    .option('--to <YYYY-MM-DD>', 'Created to date (inclusive)')
    .option('--limit <n>', 'Max results (default 20)', parsePositiveInt)
    .option('--api-key <key>', 'API key (overrides stored/env)')
    .option('--json', 'Output as JSON')
    .action(apiAction(async (client, opts) => {
      const filter: MagicWorkflowSearchFilter = {};

      if (opts.type) {
        const docType = TYPE_TO_SEARCH[opts.type];
        if (!docType) {
          console.error(danger(`Error: invalid type "${opts.type}". Valid: ${VALID_SEARCH_TYPES}`));
          process.exit(1);
        }
        filter.documentType = [docType];
      }

      if (opts.status) {
        const status = opts.status.toUpperCase() as MagicWorkflowStatus;
        const valid = ['SUBMITTED', 'PROCESSING', 'COMPLETED', 'FAILED'];
        if (!valid.includes(status)) {
          console.error(danger(`Error: invalid status "${opts.status}". Valid: ${VALID_STATUSES}`));
          process.exit(1);
        }
        filter.status = [status];
      }

      if (opts.fileName) {
        filter.fileName = { contains: opts.fileName };
      }

      if (opts.from || opts.to) {
        filter.createdAt = {};
        if (opts.from) filter.createdAt.gte = opts.from;
        if (opts.to) filter.createdAt.lte = opts.to;
      }

      const res = await searchMagicWorkflows(client, {
        filter: Object.keys(filter).length > 0 ? filter : undefined,
        limit: opts.limit ?? 20,
        offset: 0,
        sort: { sortBy: ['createdAt'], order: 'DESC' },
      });

      const truncated = res.totalElements > res.data.length;
      if (opts.json) {
        console.log(JSON.stringify({ totalElements: res.totalElements, truncated, data: res.data }, null, 2));
      } else {
        if (res.data.length === 0) {
          console.log('No workflows found.');
          return;
        }
        console.log(highlight(`Workflows (${res.data.length} of ${res.totalElements}):\n`));
        const { items, overflow } = displaySlice(res.data);
        for (const w of items) {
          const btId = w.businessTransactionDetails?.businessTransactionResourceId;
          const btInfo = btId ? muted(` → ${btId}`) : '';
          console.log(`  ${accent(w.resourceId)}  ${formatStatus(w.status)}  ${w.documentType}  ${w.fileName}${btInfo}  ${muted(w.createdAt)}`);
        }
        if (overflow > 0) console.log(muted(`  ... and ${overflow.toLocaleString()} more (use --json for full output)`));
      }
    }));

}

// ── Helpers ──────────────────────────────────────────────────────

/**
 * Resolve a PDF input, handling __pw__ password extraction + encrypted PDF decryption.
 * Handles __pw__ password extraction and encrypted PDF decryption.
 *
 * For non-PDF files, returns the original path with a clean filename (no __pw__ suffix).
 */
async function resolveInputPdf(
  filePath: string,
  ext: string,
  opts: { json?: boolean },
): Promise<{ effectivePath: string; cleanName: string; decryptedPath?: string }> {
  const rawName = basename(filePath);
  const { cleanName, password: filePassword } = extractFilePassword(rawName, ext);

  if (ext !== '.pdf') {
    return { effectivePath: filePath, cleanName };
  }

  const buffer = readFileSync(filePath);
  if (!isPdfEncrypted(buffer)) {
    return { effectivePath: filePath, cleanName };
  }

  // Encrypted PDF — need qpdf to decrypt
  if (!isQpdfAvailable()) {
    console.error(danger('Error: Encrypted PDF detected but qpdf is not installed.'));
    console.error(muted('  macOS:   brew install qpdf'));
    console.error(muted('  Ubuntu:  sudo apt install qpdf'));
    process.exit(1);
  }

  let password = filePassword;
  if (!password) {
    if (opts.json) {
      console.log(JSON.stringify({
        error: 'ENCRYPTED_PDF_NO_PASSWORD',
        message: 'Encrypted PDF — embed password in filename: name__pw__password.pdf',
        file: rawName,
      }));
      process.exit(1);
    }
    const pwInput = await p.text({
      message: `PDF password for ${rawName}`,
    });
    if (p.isCancel(pwInput) || !pwInput) {
      console.error(danger('Aborted — no password provided.'));
      console.error(muted('Tip: embed password in filename: name__pw__password.pdf'));
      process.exit(1);
    }
    password = pwInput;
  }

  const decryptedPath = decryptPdf(filePath, password!);
  return { effectivePath: decryptedPath, cleanName, decryptedPath };
}

// ── ZIP Upload ───────────────────────────────────────────────────

const MAX_ZIP_FILES = 2000;
const MAX_ZIP_TOTAL_BYTES = 500 * 1024 * 1024; // 500MB

/** Recursively collect files with MIME_MAP-supported extensions from a directory (with limits) */
function collectSupportedFiles(dir: string): string[] {
  const results: string[] = [];
  const stack = [dir];
  let totalBytes = 0;

  while (stack.length > 0) {
    const d = stack.pop()!;
    for (const entry of readdirSync(d, { withFileTypes: true })) {
      if (entry.name.startsWith('.')) continue;
      const full = join(d, entry.name);
      if (entry.isDirectory()) {
        stack.push(full);
      } else if (entry.isFile()) {
        const ext = extname(entry.name).toLowerCase();
        if (!MIME_MAP[ext]) continue;
        const st = statSync(full);
        totalBytes += st.size;
        if (totalBytes > MAX_ZIP_TOTAL_BYTES) throw new Error(`ZIP contents exceed ${MAX_ZIP_TOTAL_BYTES / 1024 / 1024}MB limit`);
        results.push(full);
        if (results.length > MAX_ZIP_FILES) throw new Error(`ZIP contains more than ${MAX_ZIP_FILES} files`);
      }
    }
  }

  return results;
}

/** Extract ZIP → upload each supported file as the same --type */
async function handleZipUpload(
  client: JazClient,
  zipPath: string,
  apiType: MagicDocumentType,
  opts: { json?: boolean },
): Promise<void> {
  const tempDir = mkdtempSync(join(tmpdir(), 'clio-magic-zip-'));
  try {
    extractZipToDir(zipPath, tempDir);
    flattenSingleRoot(tempDir);

    const files = collectSupportedFiles(tempDir);
    if (files.length === 0) {
      if (opts.json) {
        console.log(JSON.stringify({
          zipFile: basename(zipPath),
          total: 0, submitted: 0, failed: 0, files: [],
          error: 'No supported files found in ZIP',
        }, null, 2));
      } else {
        console.error(danger('No supported files found in ZIP.'));
        console.error(muted(`Supported: ${Object.keys(MIME_MAP).join(', ')}`));
      }
      return;
    }

    if (!opts.json) {
      console.log(muted(`\nZIP: ${basename(zipPath)} → ${files.length} file(s)\n`));
    }

    const uploadResults: { file: string; status: string; workflowResourceId?: string; error?: string }[] = [];
    let submitted = 0;
    let failed = 0;

    for (const filePath of files) {
      const ext = extname(filePath).toLowerCase();
      const rawName = basename(filePath);
      const mime = MIME_MAP[ext];
      if (!mime) { failed++; continue; }

      // Handle encrypted PDFs inside ZIP
      let effectivePath = filePath;
      let decryptedPath: string | undefined;
      const { cleanName, password: filePassword } = extractFilePassword(rawName, ext);

      if (ext === '.pdf') {
        try {
          const buf = readFileSync(filePath);
          if (isPdfEncrypted(buf)) {
            if (!isQpdfAvailable() || !filePassword) {
              const reason = !isQpdfAvailable()
                ? 'qpdf not installed'
                : 'no __pw__ password in filename';
              uploadResults.push({ file: rawName, status: 'FAILED', error: `Encrypted PDF: ${reason}` });
              failed++;
              if (!opts.json) console.log(`  ${danger('FAIL')}  ${rawName}  ${muted(reason)}`);
              continue;
            }
            decryptedPath = decryptPdf(filePath, filePassword);
            effectivePath = decryptedPath;
          }
        } catch {
          // Not a valid PDF — try uploading anyway
        }
      }

      try {
        const buffer = readFileSync(effectivePath);
        const sourceFile = new Blob([buffer], { type: mime });
        const res = await createFromAttachment(client, {
          businessTransactionType: apiType,
          sourceFile,
          sourceFileName: cleanName,
        });

        const valid = res.data.validFiles?.[0];
        const invalid = res.data.invalidFiles?.[0];
        if (valid) {
          uploadResults.push({ file: cleanName, status: 'SUBMITTED', workflowResourceId: valid.workflowResourceId });
          submitted++;
          if (!opts.json) console.log(`  ${success('OK')}    ${cleanName}  ${muted(valid.workflowResourceId)}`);
        } else {
          const err = invalid?.errorMessage ?? 'Unknown error';
          uploadResults.push({ file: cleanName, status: 'FAILED', error: err });
          failed++;
          if (!opts.json) console.log(`  ${danger('FAIL')}  ${cleanName}  ${muted(err)}`);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        uploadResults.push({ file: cleanName, status: 'FAILED', error: msg });
        failed++;
        if (!opts.json) console.log(`  ${danger('FAIL')}  ${cleanName}  ${muted(msg)}`);
      } finally {
        if (decryptedPath) cleanupDecryptedFile(decryptedPath);
      }
    }

    if (opts.json) {
      console.log(JSON.stringify({
        zipFile: basename(zipPath),
        total: files.length,
        submitted,
        failed,
        files: uploadResults,
      }, null, 2));
    } else {
      console.log(muted(`\n  ${submitted} submitted, ${failed} failed (${files.length} total)`));
    }
  } finally {
    try { rmSync(tempDir, { recursive: true }); } catch { /* ignore */ }
  }
}

function outputWorkflowResults(results: MagicWorkflowItem[], json?: boolean): void {
  if (json) {
    const workflows = results.map((w) => ({
      workflowResourceId: w.resourceId,
      status: w.status || 'SUBMITTED',
      documentType: w.documentType,
      fileName: w.fileName,
      ...(w.businessTransactionDetails?.businessTransactionResourceId && {
        businessTransactionResourceId: w.businessTransactionDetails.businessTransactionResourceId,
      }),
      ...(w.failureReason && { failureReason: w.failureReason }),
    }));
    console.log(JSON.stringify({ workflows }, null, 2));
  } else {
    for (const w of results) {
      const status = w.status || 'SUBMITTED';
      console.log(`  ${accent(w.resourceId)}  ${formatStatus(status)}  ${w.documentType}  ${w.fileName}`);
      if (w.businessTransactionDetails?.businessTransactionResourceId) {
        console.log(highlight('    Draft BT:'), w.businessTransactionDetails.businessTransactionResourceId);
      }
      if (w.failureReason) {
        console.error(danger('    Reason:'), w.failureReason);
      }
    }
  }
}
