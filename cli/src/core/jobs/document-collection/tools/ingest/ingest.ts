/**
 * Document Collection ingest tool.
 *
 * Scans a local directory (or ZIP file) or cloud share link, classifies documents
 * by folder name, and produces an IngestPlan with absolute file paths for the
 * AI agent to upload.
 *
 * The CLI does NOT make API calls — the agent uses the api skill for that.
 */

import { existsSync, mkdtempSync, rmSync, statSync } from 'node:fs';
import { extname, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { IngestPlan } from '../../../types.js';
import { JobValidationError } from '../../../validate.js';
import { scanLocalDirectory } from './scanner.js';
import { downloadCloudSource } from './cloud/index.js';
import type { CloudDownloadResult } from './cloud/types.js';
import { extractZipToDir, flattenSingleRoot } from './cloud/zip.js';

export interface IngestOptions {
  /** Source path (local directory or .zip file) or URL (public share link). */
  source: string;
  /** Force all files to a specific document type. */
  type?: 'INVOICE' | 'BILL' | 'CUSTOMER_CREDIT_NOTE' | 'SUPPLIER_CREDIT_NOTE' | 'BANK_STATEMENT';
  /** Functional/reporting currency. */
  currency?: string;
  /** Download timeout in milliseconds for cloud sources. */
  timeout?: number;
}

/**
 * Detect if a source string is a URL (public share link) or local path.
 */
export function isUrl(source: string): boolean {
  return /^https?:\/\//i.test(source);
}

/**
 * Validate that the source is a local directory or ZIP file. Returns the resolved path and type.
 */
function validateLocalSource(source: string): { path: string; isZip: boolean } {
  if (!existsSync(source)) {
    throw new JobValidationError(`Source not found: ${source}`);
  }

  let stat;
  try {
    stat = statSync(source);
  } catch {
    throw new JobValidationError(`Cannot access source: ${source}`);
  }

  if (stat.isDirectory()) {
    return { path: resolve(source), isZip: false };
  }

  if (stat.isFile() && extname(source).toLowerCase() === '.zip') {
    return { path: resolve(source), isZip: true };
  }

  throw new JobValidationError(`Source must be a directory or .zip file, not a regular file: ${source}`);
}

/**
 * Resolve a source (local path, ZIP file, or URL) to a local directory path.
 * For URLs, downloads to a temp dir. For ZIPs, extracts to a temp dir.
 */
async function resolveSource(
  opts: IngestOptions,
): Promise<{ localPath: string; originalSource: string; cloud: CloudDownloadResult | null; tempDir?: string }> {
  if (isUrl(opts.source)) {
    const cloud = await downloadCloudSource(opts.source, {
      timeout: opts.timeout,
    });
    return { localPath: cloud.localPath, originalSource: opts.source, cloud };
  }

  const { path: sourcePath, isZip } = validateLocalSource(opts.source);

  if (isZip) {
    const tempDir = mkdtempSync(join(tmpdir(), 'clio-zip-source-'));
    try {
      extractZipToDir(sourcePath, tempDir);
      flattenSingleRoot(tempDir);
    } catch (e) {
      try { rmSync(tempDir, { recursive: true, force: true }); } catch { /* ignore */ }
      const msg = e instanceof Error ? e.message : String(e);
      throw new JobValidationError(`Invalid ZIP source: ${msg}`);
    }
    return { localPath: tempDir, originalSource: opts.source, cloud: null, tempDir };
  }

  return { localPath: sourcePath, originalSource: opts.source, cloud: null };
}

/**
 * Scan, classify, and return an IngestPlan with absolute file paths.
 *
 * For cloud sources, files are downloaded to a temp directory first.
 * For ZIP sources, files are extracted to a temp directory first.
 * The temp dir is preserved so the agent can use the file paths for uploads.
 */
export async function ingest(opts: IngestOptions): Promise<IngestPlan> {
  const { localPath, originalSource, cloud, tempDir } = await resolveSource(opts);

  const plan = scanLocalDirectory(localPath, { forceType: opts.type });

  // Override source display and localPath for URL sources
  if (cloud) {
    plan.source = originalSource;
    plan.sourceType = 'url';
    plan.cloudProvider = cloud.provider;
    plan.localPath = localPath;
  } else if (tempDir) {
    // Source was a ZIP file — keep original source for display
    plan.source = originalSource;
    plan.localPath = localPath;
    // Merge temp dirs: the top-level extraction dir + any from nested ZIPs in scanner
    plan.tempDirs = [tempDir, ...(plan.tempDirs ?? [])];
  }

  return plan;
}
