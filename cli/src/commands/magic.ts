import chalk from 'chalk';
import { mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs';
import { basename, extname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { Command } from 'commander';
import prompts from 'prompts';
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
import {
  detectBoundaries,
  parsePageRanges,
  splitPdf,
  cleanupSplitFiles,
} from '../core/pdf/index.js';
import type { DetectedDocument, SplitUploadItem } from '../core/pdf/types.js';
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
    .option('--api-key <key>', 'API key (overrides stored/env)')
    .option('--json', 'Output as JSON')
    .action(apiAction(async (client, opts) => {
      // Validate required options
      if (!opts.file && !opts.url) {
        console.error(chalk.red('Error: must provide --file or --url'));
        process.exit(1);
      }
      if (opts.file && opts.url) {
        console.error(chalk.red('Error: cannot use both --file and --url'));
        process.exit(1);
      }
      if (!opts.type) {
        console.error(chalk.red(`Error: --type is required (${VALID_TYPES})`));
        process.exit(1);
      }

      const apiType = TYPE_TO_API[opts.type];
      if (!apiType) {
        console.error(chalk.red(`Error: invalid type "${opts.type}". Valid: ${VALID_TYPES}`));
        process.exit(1);
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
          console.error(chalk.red(`Error: unsupported file type "${ext}". Supported: ${Object.keys(MIME_MAP).join(', ')}, .zip`));
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
          console.log(chalk.green('File uploaded — extraction started.'));
          console.log(chalk.bold('Workflow ID:'), validFile.workflowResourceId);
          console.log(chalk.bold('Document Type:'), data.businessTransactionType);
          console.log(chalk.bold('File:'), data.filename);
          console.log(chalk.dim(`\nCheck status: clio magic status ${validFile.workflowResourceId}`));
        } else {
          console.log(chalk.red('Upload failed.'));
          if (invalidFile?.errorMessage) {
            console.log(chalk.red(`Error: ${invalidFile.errorMessage}`));
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
        console.error(chalk.red('Error: provide at least one workflow ID'));
        process.exit(1);
      }

      if (opts.wait) {
        const timeoutMs = (opts.timeout ?? 600) * 1000;
        const results = await waitForWorkflows(client, ids, {
          timeout: timeoutMs,
          onPoll: (items) => {
            if (!opts.json) {
              const completed = items.filter((i) => i.status === 'COMPLETED' || i.status === 'FAILED').length;
              process.stderr.write(chalk.dim(`  Polling... ${completed}/${ids.length} done\n`));
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
              console.log(chalk.yellow(`  ${id}  NOT FOUND`));
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
          console.error(chalk.red(`Error: invalid type "${opts.type}". Valid: ${VALID_SEARCH_TYPES}`));
          process.exit(1);
        }
        filter.documentType = [docType];
      }

      if (opts.status) {
        const status = opts.status.toUpperCase() as MagicWorkflowStatus;
        const valid = ['SUBMITTED', 'PROCESSING', 'COMPLETED', 'FAILED'];
        if (!valid.includes(status)) {
          console.error(chalk.red(`Error: invalid status "${opts.status}". Valid: ${VALID_STATUSES}`));
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
          console.log(chalk.yellow('No workflows found.'));
          return;
        }
        console.log(chalk.bold(`Workflows (${res.data.length} of ${res.totalElements}):\n`));
        const { items, overflow } = displaySlice(res.data);
        for (const w of items) {
          const statusColor = w.status === 'COMPLETED' ? chalk.green : w.status === 'FAILED' ? chalk.red : chalk.yellow;
          const btId = w.businessTransactionDetails?.businessTransactionResourceId;
          const btInfo = btId ? chalk.dim(` → ${btId}`) : '';
          console.log(`  ${chalk.cyan(w.resourceId)}  ${statusColor(w.status)}  ${w.documentType}  ${w.fileName}${btInfo}  ${chalk.dim(w.createdAt)}`);
        }
        if (overflow > 0) console.log(chalk.dim(`  ... and ${overflow.toLocaleString()} more (use --json for full output)`));
      }
    }));

  // ── clio magic split ──────────────────────────────────────────
  magic
    .command('split')
    .description(
      'Split a merged PDF into individual documents and upload each to Magic.\n' +
      'Auto-detects document boundaries using text heuristics (keywords, page numbers, bookmarks).\n' +
      'For scanned PDFs, use --pages to specify boundaries manually.',
    )
    .option('--file <path>', 'Local PDF file path (required). Encrypted PDFs: name__pw__password.pdf')
    .option('--type <type>', `Document type: ${VALID_TYPES}`)
    .option('--pages <ranges>', 'Manual page ranges (e.g. "1-3,4-6,7"). Skips auto-detection')
    .option('--dry-run', 'Detect boundaries only — do not split or upload')
    .option('--api-key <key>', 'API key (overrides stored/env)')
    .option('--json', 'Output as JSON')
    .action(apiAction(async (client, opts) => {
      // ── Validate inputs ──
      if (!opts.file) {
        console.error(chalk.red('Error: --file is required'));
        console.error(chalk.dim('Usage: clio magic split --file merged.pdf --type bill'));
        process.exit(1);
      }
      if (!opts.type) {
        console.error(chalk.red(`Error: --type is required (${VALID_TYPES})`));
        console.error(chalk.dim('Usage: clio magic split --file merged.pdf --type bill'));
        process.exit(1);
      }

      const apiType = TYPE_TO_API[opts.type];
      if (!apiType) {
        console.error(chalk.red(`Error: invalid type "${opts.type}". Valid: ${VALID_TYPES}`));
        process.exit(1);
      }

      const filePath = resolve(opts.file);
      const ext = extname(filePath).toLowerCase();
      if (ext !== '.pdf') {
        console.error(chalk.red('Error: PDF splitting only supports .pdf files'));
        process.exit(1);
      }

      // qpdf only needed when actually splitting (not for dry-run auto-detect)
      const needsQpdf = !opts.dryRun || opts.pages;
      if (needsQpdf && !isQpdfAvailable()) {
        console.error(chalk.red('Error: qpdf is required for PDF splitting.'));
        console.error(chalk.dim('  macOS:   brew install qpdf'));
        console.error(chalk.dim('  Ubuntu:  sudo apt install qpdf'));
        process.exit(1);
      }

      // ── Handle encrypted PDFs ──
      const resolved = await resolveInputPdf(filePath, ext, opts);
      const effectivePath = resolved.effectivePath;
      const sourceBaseName = resolved.cleanName.replace(/\.pdf$/i, '');

      try {
        // ── Determine documents (auto-detect or manual) ──
        let documents: DetectedDocument[];
        let pageCount: number;

        if (opts.pages) {
          // Manual page ranges — need qpdf for page count
          pageCount = (await import('../core/pdf/split.js')).getPageCount(effectivePath);
          documents = parsePageRanges(opts.pages, pageCount);
        } else {
          // Auto-detect boundaries
          const buffer = readFileSync(effectivePath);
          const detection = await detectBoundaries(new Uint8Array(buffer));
          pageCount = detection.pageCount;
          documents = detection.documents;

          // Scanned PDF — can't auto-detect, require --pages
          if (detection.isScannedPdf) {
            if (opts.json) {
              console.log(JSON.stringify({
                file: basename(filePath),
                pageCount,
                isScannedPdf: true,
                error: 'Scanned PDF — no extractable text. Use --pages to specify boundaries manually.',
              }, null, 2));
            } else {
              console.error(chalk.yellow('Scanned PDF detected — no extractable text for boundary detection.'));
              console.error(chalk.dim(`  Use --pages to split manually:`));
              console.error(chalk.dim(`  clio magic split --file ${basename(filePath)} --type ${opts.type} --pages "1-3,4-6,7-9"`));
            }
            process.exit(1);
          }

          // Single document — suggest magic create instead
          if (documents.length <= 1) {
            if (opts.json) {
              console.log(JSON.stringify({
                file: basename(filePath),
                pageCount,
                documentsDetected: documents.length,
                message: 'Only 1 document detected — use `clio magic create` instead, or --pages to override.',
              }, null, 2));
            } else {
              console.log(chalk.yellow(`Only 1 document detected in ${pageCount}-page PDF.`));
              console.log(chalk.dim(`  Use clio magic create --file ${basename(filePath)} --type ${opts.type}`));
              console.log(chalk.dim(`  Or override with --pages: clio magic split --file ${basename(filePath)} --type ${opts.type} --pages "1-3,4-6"`));
            }
            return;
          }
        }

        // ── Dry-run: print detection results only ──
        if (opts.dryRun) {
          if (opts.json) {
            console.log(JSON.stringify({
              file: basename(filePath),
              pageCount,
              documents: documents.map((d) => ({
                index: d.index,
                pageRange: d.pageRange,
                confidence: d.confidence,
                signals: d.signals.map((s) => s.label),
              })),
            }, null, 2));
          } else {
            console.log(chalk.bold(`PDF Split — Boundary Detection`));
            console.log(`  File: ${basename(filePath)} (${pageCount} pages)\n`);
            for (const doc of documents) {
              const conf = doc.confidence === 'high' ? chalk.green(doc.confidence)
                : doc.confidence === 'medium' ? chalk.yellow(doc.confidence)
                : chalk.red(doc.confidence);
              const signals = doc.signals.filter((s) => s.score > 0).map((s) => s.label).join(', ') || 'first page';
              console.log(`  Document ${doc.index + 1}: pages ${doc.pageRange.replace('-', '\u2013')}  (${conf})    ${chalk.dim(signals)}`);
            }
            console.log(`\n  ${documents.length} documents detected. Use --pages to override.`);
          }
          return;
        }

        // ── Confidence check: prompt if any low/medium ──
        const hasLowConfidence = documents.some((d) => d.confidence !== 'high' && d.index > 0);
        if (hasLowConfidence && !opts.json) {
          console.log(chalk.bold(`PDF Split — Boundary Detection`));
          console.log(`  File: ${basename(filePath)} (${pageCount} pages)\n`);
          for (const doc of documents) {
            const conf = doc.confidence === 'high' ? chalk.green(doc.confidence)
              : doc.confidence === 'medium' ? chalk.yellow(doc.confidence)
              : chalk.red(doc.confidence);
            const signals = doc.signals.filter((s) => s.score > 0).map((s) => s.label).join(', ') || 'first page';
            console.log(`  Document ${doc.index + 1}: pages ${doc.pageRange.replace('-', '\u2013')}  (${conf})    ${chalk.dim(signals)}`);
          }
          console.log('');

          const { proceed } = await prompts({
            type: 'confirm',
            name: 'proceed',
            message: 'Some boundaries have low confidence. Split and upload anyway?',
            initial: true,
          });
          if (!proceed) {
            console.log(chalk.dim('Aborted. Use --pages to specify boundaries manually.'));
            return;
          }
        }

        // ── Split + Upload ──
        const splitResult = splitPdf(effectivePath, documents, sourceBaseName);
        const uploadResults: SplitUploadItem[] = [];

        try {
          // Report split failures
          for (const f of splitResult.failures) {
            uploadResults.push({
              index: f.index,
              pageRange: f.pageRange,
              splitFileName: `${sourceBaseName}_${f.index + 1}.pdf`,
              status: 'failed',
              error: `Split failed: ${f.error}`,
            });
            if (!opts.json) {
              console.log(chalk.red(`  \u2717 [${f.index + 1}/${documents.length}] pages ${f.pageRange} — split failed: ${f.error}`));
            }
          }

          // Upload each split file
          for (const file of splitResult.files) {
            try {
              const buffer = readFileSync(file.path);
              const blob = new Blob([buffer], { type: 'application/pdf' });

              const res = await createFromAttachment(client, {
                businessTransactionType: apiType,
                sourceFile: blob,
                sourceFileName: file.fileName,
              });

              const valid = res.data.validFiles?.[0];
              const invalid = res.data.invalidFiles?.[0];

              if (valid) {
                uploadResults.push({
                  index: file.index,
                  pageRange: file.pageRange,
                  splitFileName: file.fileName,
                  status: 'uploaded',
                  workflowResourceId: valid.workflowResourceId,
                  documentType: res.data.businessTransactionType,
                });
                if (!opts.json) {
                  console.log(chalk.green(`  \u2713 [${file.index + 1}/${documents.length}] pages ${file.pageRange} \u2192 ${file.fileName} \u2192 ${opts.type.toUpperCase()} (workflow: ${valid.workflowResourceId})`));
                }
              } else {
                const errMsg = invalid?.errorMessage ?? 'Unknown upload error';
                uploadResults.push({
                  index: file.index,
                  pageRange: file.pageRange,
                  splitFileName: file.fileName,
                  status: 'failed',
                  error: errMsg,
                });
                if (!opts.json) {
                  console.log(chalk.red(`  \u2717 [${file.index + 1}/${documents.length}] pages ${file.pageRange} \u2192 ${file.fileName} \u2192 failed: ${errMsg}`));
                }
              }
            } catch (err) {
              const errMsg = err instanceof Error ? err.message : String(err);
              uploadResults.push({
                index: file.index,
                pageRange: file.pageRange,
                splitFileName: file.fileName,
                status: 'failed',
                error: errMsg,
              });
              if (!opts.json) {
                console.log(chalk.red(`  \u2717 [${file.index + 1}/${documents.length}] pages ${file.pageRange} \u2192 ${file.fileName} \u2192 failed: ${errMsg}`));
              }
            }
          }
        } finally {
          cleanupSplitFiles(splitResult.tempDir);
        }

        // ── Summary ──
        const uploaded = uploadResults.filter((r) => r.status === 'uploaded').length;
        const failed = uploadResults.filter((r) => r.status === 'failed').length;

        if (opts.json) {
          console.log(JSON.stringify({
            file: basename(filePath),
            pageCount,
            documents: uploadResults,
            summary: { total: documents.length, uploaded, failed },
          }, null, 2));
        } else {
          console.log(`\n  ${uploaded} uploaded, ${failed} failed`);
        }
      } finally {
        if (resolved.decryptedPath) cleanupDecryptedFile(resolved.decryptedPath);
      }
    }));
}

// ── Helpers ──────────────────────────────────────────────────────

/**
 * Resolve a PDF input, handling __pw__ password extraction + encrypted PDF decryption.
 * Shared by magic create and magic split (DRY).
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
    console.error(chalk.red('Error: Encrypted PDF detected but qpdf is not installed.'));
    console.error(chalk.dim('  macOS:   brew install qpdf'));
    console.error(chalk.dim('  Ubuntu:  sudo apt install qpdf'));
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
    const response = await prompts({
      type: 'text',
      name: 'password',
      message: `PDF password for ${rawName}`,
    });
    if (!response.password) {
      console.error(chalk.red('Aborted — no password provided.'));
      console.error(chalk.dim('Tip: embed password in filename: name__pw__password.pdf'));
      process.exit(1);
    }
    password = response.password;
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
        console.error(chalk.red('No supported files found in ZIP.'));
        console.error(chalk.dim(`Supported: ${Object.keys(MIME_MAP).join(', ')}`));
      }
      return;
    }

    if (!opts.json) {
      console.log(chalk.dim(`\nZIP: ${basename(zipPath)} → ${files.length} file(s)\n`));
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
              if (!opts.json) console.log(`  ${chalk.red('FAIL')}  ${rawName}  ${chalk.dim(reason)}`);
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
          if (!opts.json) console.log(`  ${chalk.green('OK')}    ${cleanName}  ${chalk.dim(valid.workflowResourceId)}`);
        } else {
          const err = invalid?.errorMessage ?? 'Unknown error';
          uploadResults.push({ file: cleanName, status: 'FAILED', error: err });
          failed++;
          if (!opts.json) console.log(`  ${chalk.red('FAIL')}  ${cleanName}  ${chalk.dim(err)}`);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        uploadResults.push({ file: cleanName, status: 'FAILED', error: msg });
        failed++;
        if (!opts.json) console.log(`  ${chalk.red('FAIL')}  ${cleanName}  ${chalk.dim(msg)}`);
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
      console.log(chalk.dim(`\n  ${submitted} submitted, ${failed} failed (${files.length} total)`));
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
      const statusColor = status === 'COMPLETED' ? chalk.green : status === 'FAILED' ? chalk.red : chalk.yellow;
      console.log(`  ${chalk.cyan(w.resourceId)}  ${statusColor(status)}  ${w.documentType}  ${w.fileName}`);
      if (w.businessTransactionDetails?.businessTransactionResourceId) {
        console.log(chalk.bold('    Draft BT:'), w.businessTransactionDetails.businessTransactionResourceId);
      }
      if (w.failureReason) {
        console.log(chalk.red('    Reason:'), w.failureReason);
      }
    }
  }
}
