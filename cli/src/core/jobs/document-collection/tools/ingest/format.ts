/**
 * Pretty-print and JSON formatters for document-collection ingest output.
 */

import { success, warning, danger, highlight, subtle } from '../../../../../commands/ui/theme.js';
import type { IngestPlan, IngestWithUploadResult, FileUploadResult } from '../../../types.js';

// ── Shared helpers ────────────────────────────────────────────

const PROVIDER_NAMES: Record<string, string> = { dropbox: 'Dropbox', gdrive: 'Google Drive', onedrive: 'OneDrive' };

function printSourceHeader(plan: IngestPlan, title: string): void {
  console.log();
  console.log(highlight(title));
  console.log(subtle(`Source: ${plan.source}`));
  if (plan.sourceType === 'url' && plan.cloudProvider) {
    console.log(subtle(`Provider: ${PROVIDER_NAMES[plan.cloudProvider] ?? plan.cloudProvider}`));
    console.log(subtle(`Local path: ${plan.localPath}`));
  }
  console.log();
}

function printFolders(plan: IngestPlan): void {
  for (const folder of plan.folders) {
    const typeLabel = folder.documentType === 'UNKNOWN'
      ? warning('UNKNOWN — requires classification')
      : success(folder.documentType);

    const prefix = folder.documentType === 'UNKNOWN' ? warning('[!] ') : '  ';
    console.log(`${prefix}${highlight(folder.folder)}/  (${folder.count} files → ${typeLabel})`);

    const labels = folder.files.map(f => {
      if (f.encrypted && f.filePassword) return `${f.filename} ${success('(pw)')}`;
      if (f.encrypted) return `${f.filename} ${warning('(encrypted)')}`;
      return f.filename;
    });
    const show = labels.slice(0, 8);
    console.log(subtle(`    ${show.join(', ')}${labels.length > 8 ? `, ... and ${labels.length - 8} more` : ''}`));
    console.log();
  }
}

function printSummary(plan: IngestPlan): void {
  console.log(highlight('Summary'));
  console.log(`  Total files: ${plan.summary.total}`);
  console.log(`  Uploadable:  ${success(String(plan.summary.uploadable))}`);
  if (plan.summary.needClassification > 0) {
    console.log(`  Need classification: ${warning(String(plan.summary.needClassification))}`);
  }
  if (plan.summary.skipped > 0) {
    console.log(`  Skipped:     ${subtle(String(plan.summary.skipped))}`);
  }
  if (plan.summary.encrypted > 0) {
    const autoCount = plan.folders.flatMap(f => f.files).filter(f => f.encrypted && f.filePassword).length;
    const remaining = plan.summary.encrypted - autoCount;
    const parts: string[] = [];
    if (autoCount > 0) parts.push(success(`${autoCount} password from filename`));
    if (remaining > 0) parts.push(warning(`${remaining} need __pw__<password> in filename`));
    console.log(`  Encrypted:   ${plan.summary.encrypted} (${parts.join(', ')})`);
  }

  if (Object.keys(plan.summary.byType).length > 0) {
    console.log();
    for (const [type, count] of Object.entries(plan.summary.byType)) {
      console.log(`  ${type}: ${count}`);
    }
  }
}

// ── Scan-only formatters ──────────────────────────────────────

/** Print an ingestion plan in human-readable format. */
export function printIngestPlan(plan: IngestPlan): void {
  printSourceHeader(plan, 'Document Collection — Ingestion Plan');
  printFolders(plan);
  printSummary(plan);
  console.log();
}

/** Print ingestion plan as JSON. */
export function printIngestPlanJson(plan: IngestPlan): void {
  console.log(JSON.stringify(plan, null, 2));
}

// ── Upload progress (live, per-file) ──────────────────────────

/** Print a single file upload result (called as progress callback). */
export function printUploadProgress(result: FileUploadResult, index: number, total: number): void {
  const icon = result.status === 'uploaded' ? success('\u2713') : danger('\u2717');
  const label = result.status === 'uploaded' ? result.type.toLowerCase() : danger(`failed: ${result.error}`);
  process.stderr.write(`  ${icon} [${index + 1}/${total}] ${result.file} → ${label}\n`);
}

// ── Upload result formatters ──────────────────────────────────

/** Print scan + upload result in human-readable format. */
export function printUploadResult(result: IngestWithUploadResult): void {
  printSourceHeader(result, 'Document Collection — Ingest + Upload');
  printFolders(result);

  // Upload results
  console.log(highlight('Upload Results'));
  const { upload } = result;

  if (upload.total === 0) {
    console.log(warning('  No files to upload.'));
  } else {
    console.log(`  ${success(String(upload.success))} uploaded, ${upload.failed > 0 ? danger(String(upload.failed)) : '0'} failed`);

    // Show failures
    const failures = upload.results.filter(r => r.status === 'failed');
    if (failures.length > 0) {
      console.log();
      console.log(danger('  Failed:'));
      for (const f of failures) {
        console.log(danger(`    ${f.file}: ${f.error}`));
      }
    }
  }

  console.log();
}

/** Print scan + upload result as JSON. */
export function printUploadResultJson(result: IngestWithUploadResult): void {
  console.log(JSON.stringify(result, null, 2));
}
