/**
 * PDF page-range extraction via qpdf.
 *
 * Creates temporary files for each document range extracted from a merged PDF.
 * Caller is responsible for cleanup (use `cleanupSplitFiles`).
 *
 * Follows the same patterns as decrypt.ts: execFileSync, mkdtempSync, explicit cleanup.
 */

import { execFileSync } from 'node:child_process';
import { mkdtempSync, existsSync } from 'node:fs';
import { join, basename } from 'node:path';
import { tmpdir } from 'node:os';
import { rmSync } from 'node:fs';
import { isQpdfAvailable } from '../jobs/document-collection/tools/ingest/decrypt.js';
import type { DetectedDocument, SplitFailure, SplitFile, SplitResult } from './types.js';

/**
 * Get the page count of a PDF file using qpdf.
 * @throws Error if qpdf is not installed or the file is invalid.
 */
export function getPageCount(filePath: string): number {
  if (!isQpdfAvailable()) {
    throw new Error('qpdf is required — install: brew install qpdf (macOS) or sudo apt install qpdf (Linux)');
  }

  const output = execFileSync('qpdf', ['--show-npages', filePath], {
    encoding: 'utf-8',
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  const count = parseInt(output.trim(), 10);
  if (isNaN(count) || count < 1) {
    throw new Error(`Failed to read page count from "${basename(filePath)}"`);
  }
  return count;
}

/**
 * Split a PDF into multiple files based on detected document ranges.
 *
 * Creates a temp directory and extracts each range as a separate PDF.
 * Continues on failure (never aborts mid-batch, matching upload.ts pattern).
 * Caller MUST call `cleanupSplitFiles()` when done.
 */
export function splitPdf(
  sourcePath: string,
  documents: DetectedDocument[],
  sourceBaseName: string,
): SplitResult {
  if (!isQpdfAvailable()) {
    throw new Error('qpdf is required — install: brew install qpdf (macOS) or sudo apt install qpdf (Linux)');
  }

  const tempDir = mkdtempSync(join(tmpdir(), 'clio-split-'));
  const files: SplitFile[] = [];
  const failures: SplitFailure[] = [];

  for (const doc of documents) {
    const fileName = `${sourceBaseName}_${doc.index + 1}.pdf`;
    const outputPath = join(tempDir, fileName);

    try {
      execFileSync('qpdf', [
        sourcePath,
        '--pages', '.', `${doc.pageStart}-${doc.pageEnd}`, '--',
        outputPath,
      ], { stdio: 'pipe' });

      files.push({
        index: doc.index,
        pageRange: doc.pageRange,
        path: outputPath,
        fileName,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      failures.push({ index: doc.index, pageRange: doc.pageRange, error: msg });
    }
  }

  return { tempDir, files, failures };
}

/**
 * Remove all split temp files and their temp directory.
 * Safe to call with any path — silently ignores missing dirs.
 */
export function cleanupSplitFiles(tempDir: string): void {
  try {
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  } catch { /* best effort */ }
}
