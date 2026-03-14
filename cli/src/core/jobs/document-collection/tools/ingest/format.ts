/**
 * Pretty-print and JSON formatters for document-collection ingest output.
 */

import chalk from 'chalk';
import type { IngestPlan, IngestWithUploadResult, FileUploadResult } from '../../../types.js';

// ── Shared helpers ────────────────────────────────────────────

const PROVIDER_NAMES: Record<string, string> = { dropbox: 'Dropbox', gdrive: 'Google Drive', onedrive: 'OneDrive' };

function printSourceHeader(plan: IngestPlan, title: string): void {
  console.log();
  console.log(chalk.bold(title));
  console.log(chalk.gray(`Source: ${plan.source}`));
  if (plan.sourceType === 'url' && plan.cloudProvider) {
    console.log(chalk.gray(`Provider: ${PROVIDER_NAMES[plan.cloudProvider] ?? plan.cloudProvider}`));
    console.log(chalk.gray(`Local path: ${plan.localPath}`));
  }
  console.log();
}

function printFolders(plan: IngestPlan): void {
  for (const folder of plan.folders) {
    const typeLabel = folder.documentType === 'UNKNOWN'
      ? chalk.yellow('UNKNOWN — requires classification')
      : chalk.green(folder.documentType);

    const prefix = folder.documentType === 'UNKNOWN' ? chalk.yellow('[!] ') : '  ';
    console.log(`${prefix}${chalk.bold(folder.folder)}/  (${folder.count} files → ${typeLabel})`);

    const labels = folder.files.map(f => {
      if (f.encrypted && f.filePassword) return `${f.filename} ${chalk.green('(pw)')}`;
      if (f.encrypted) return `${f.filename} ${chalk.yellow('(encrypted)')}`;
      return f.filename;
    });
    const show = labels.slice(0, 8);
    console.log(chalk.gray(`    ${show.join(', ')}${labels.length > 8 ? `, ... and ${labels.length - 8} more` : ''}`));
    console.log();
  }
}

function printSummary(plan: IngestPlan): void {
  console.log(chalk.bold('Summary'));
  console.log(`  Total files: ${plan.summary.total}`);
  console.log(`  Uploadable:  ${chalk.green(String(plan.summary.uploadable))}`);
  if (plan.summary.needClassification > 0) {
    console.log(`  Need classification: ${chalk.yellow(String(plan.summary.needClassification))}`);
  }
  if (plan.summary.skipped > 0) {
    console.log(`  Skipped:     ${chalk.gray(String(plan.summary.skipped))}`);
  }
  if (plan.summary.encrypted > 0) {
    const autoCount = plan.folders.flatMap(f => f.files).filter(f => f.encrypted && f.filePassword).length;
    const remaining = plan.summary.encrypted - autoCount;
    const parts: string[] = [];
    if (autoCount > 0) parts.push(chalk.green(`${autoCount} password from filename`));
    if (remaining > 0) parts.push(chalk.yellow(`${remaining} need __pw__<password> in filename`));
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
  const icon = result.status === 'uploaded' ? chalk.green('\u2713') : chalk.red('\u2717');
  const label = result.status === 'uploaded' ? result.type.toLowerCase() : chalk.red(`failed: ${result.error}`);
  process.stderr.write(`  ${icon} [${index + 1}/${total}] ${result.file} → ${label}\n`);
}

// ── Upload result formatters ──────────────────────────────────

/** Print scan + upload result in human-readable format. */
export function printUploadResult(result: IngestWithUploadResult): void {
  printSourceHeader(result, 'Document Collection — Ingest + Upload');
  printFolders(result);

  // Upload results
  console.log(chalk.bold('Upload Results'));
  const { upload } = result;

  if (upload.total === 0) {
    console.log(chalk.yellow('  No files to upload.'));
  } else {
    console.log(`  ${chalk.green(String(upload.success))} uploaded, ${upload.failed > 0 ? chalk.red(String(upload.failed)) : '0'} failed`);

    // Show failures
    const failures = upload.results.filter(r => r.status === 'failed');
    if (failures.length > 0) {
      console.log();
      console.log(chalk.red('  Failed:'));
      for (const f of failures) {
        console.log(chalk.red(`    ${f.file}: ${f.error}`));
      }
    }
  }

  console.log();
}

/** Print scan + upload result as JSON. */
export function printUploadResultJson(result: IngestWithUploadResult): void {
  console.log(JSON.stringify(result, null, 2));
}
