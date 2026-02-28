/**
 * Dropbox public share link downloader.
 *
 * Single files: Replace dl=0 → dl=1 for direct download.
 * Folders: Append ?dl=1 → Dropbox serves entire folder as ZIP → extract.
 */

import { unlinkSync, writeFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import type { CloudProviderMatch, CloudDownloadResult, CloudDownloadOptions } from './types.js';
import { extractZipToDir, flattenSingleRoot } from './zip.js';
import { fetchWithTimeout, parseContentDisposition, countFilesInDir, dirSizeBytes } from './utils.js';
import { JobValidationError } from '../../../../validate.js';

/**
 * Download from a Dropbox public share link.
 */
export async function downloadDropbox(
  match: CloudProviderMatch,
  tempDir: string,
  opts: CloudDownloadOptions,
): Promise<CloudDownloadResult> {
  const warnings: string[] = [];

  if (match.resourceType === 'file') {
    return downloadDropboxFile(match, tempDir, opts, warnings);
  } else {
    return downloadDropboxFolder(match, tempDir, opts, warnings);
  }
}

/**
 * Download a single file from Dropbox.
 * Trick: replace dl=0 with dl=1 (or append ?dl=1) for direct download.
 */
async function downloadDropboxFile(
  match: CloudProviderMatch,
  tempDir: string,
  opts: CloudDownloadOptions,
  warnings: string[],
): Promise<CloudDownloadResult> {
  const directUrl = toDirectDownloadUrl(match.url);
  const timeout = opts.timeout ?? 30_000;
  const maxFileBytes = opts.maxFileBytes ?? 100 * 1024 * 1024; // 100MB

  const response = await fetchWithTimeout(directUrl, timeout);

  if (!response.ok) {
    if (response.status === 404) {
      throw new JobValidationError('Dropbox link not found (404). Check the URL is correct and still shared.');
    }
    if (response.status === 403) {
      throw new JobValidationError('Dropbox link is not publicly accessible (403). Enable sharing for "Anyone with the link".');
    }
    throw new JobValidationError(`Dropbox download failed: ${response.status} ${response.statusText}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());

  if (buffer.length > maxFileBytes) {
    throw new JobValidationError(
      `File exceeds maximum size (${Math.round(maxFileBytes / 1024 / 1024)}MB). Download manually and use a local directory path.`
    );
  }

  // Determine filename from Content-Disposition or URL path
  const cdFilename = parseContentDisposition(response.headers.get('content-disposition'));
  const urlFilename = extractFilenameFromUrl(match.url);
  const filename = cdFilename || urlFilename || `dropbox-file-${match.resourceId}`;

  writeFileSync(join(tempDir, filename), buffer);

  // If the downloaded file is a ZIP, extract it (same as folder downloads)
  // Verify ZIP magic bytes (PK\x03\x04) — don't trust filename alone
  const isZipContent = buffer.length >= 4 && buffer[0] === 0x50 && buffer[1] === 0x4b && buffer[2] === 0x03 && buffer[3] === 0x04;
  if (extname(filename).toLowerCase() === '.zip' && isZipContent) {
    const zipPath = join(tempDir, filename);
    try {
      extractZipToDir(zipPath, tempDir);
      try { unlinkSync(zipPath); } catch { /* ignore */ }
      flattenSingleRoot(tempDir);
      return {
        localPath: tempDir,
        fileCount: countFilesInDir(tempDir),
        totalBytes: dirSizeBytes(tempDir),
        provider: 'dropbox',
        warnings,
        cleanup: () => {},
      };
    } catch (err) {
      warnings.push(`Failed to extract ZIP: ${err instanceof Error ? err.message : String(err)}`);
      // Fall through to return the ZIP file as-is
    }
  }

  return {
    localPath: tempDir,
    fileCount: 1,
    totalBytes: buffer.length,
    provider: 'dropbox',
    warnings,
    cleanup: () => {},
  };
}

/**
 * Download a Dropbox folder as ZIP and extract it.
 */
async function downloadDropboxFolder(
  match: CloudProviderMatch,
  tempDir: string,
  opts: CloudDownloadOptions,
  warnings: string[],
): Promise<CloudDownloadResult> {
  const directUrl = toDirectDownloadUrl(match.url);
  const timeout = opts.timeout ?? 120_000; // Folders can be large
  const maxTotalBytes = opts.maxTotalBytes ?? 500 * 1024 * 1024; // 500MB

  const response = await fetchWithTimeout(directUrl, timeout);

  if (!response.ok) {
    if (response.status === 404) {
      throw new JobValidationError('Dropbox folder not found (404). Check the URL is correct and still shared.');
    }
    if (response.status === 403) {
      throw new JobValidationError('Dropbox folder is not publicly accessible (403). Enable sharing for "Anyone with the link".');
    }
    throw new JobValidationError(`Dropbox folder download failed: ${response.status} ${response.statusText}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());

  if (buffer.length > maxTotalBytes) {
    throw new JobValidationError(
      `ZIP download exceeds maximum size (${Math.round(maxTotalBytes / 1024 / 1024)}MB). Download manually and use a local directory path.`
    );
  }

  // Write ZIP to temp file, extract, then delete ZIP
  const zipPath = join(tempDir, '__download.zip');
  writeFileSync(zipPath, buffer);

  try {
    const extracted = extractZipToDir(zipPath, tempDir);
    // Remove the ZIP file before flattening (so it doesn't block single-root detection)
    try { unlinkSync(zipPath); } catch { /* ignore */ }

    // Flatten single-root-folder ZIPs (Dropbox wraps contents in a named folder)
    flattenSingleRoot(tempDir);

    return {
      localPath: tempDir,
      fileCount: countFilesInDir(tempDir),
      totalBytes: dirSizeBytes(tempDir),
      provider: 'dropbox',
      warnings,
      cleanup: () => {},
    };
  } catch (err) {
    throw new JobValidationError(
      `Failed to extract Dropbox ZIP: ${err instanceof Error ? err.message : String(err)}`
    );
  }
}

/**
 * Convert a Dropbox share URL to a direct download URL.
 * Replaces dl=0 with dl=1, or appends dl=1 if not present.
 */
function toDirectDownloadUrl(url: string): string {
  const parsed = new URL(url);
  parsed.searchParams.set('dl', '1');
  return parsed.toString();
}

/** Extract a filename from a Dropbox URL path. */
function extractFilenameFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    const parts = parsed.pathname.split('/').filter(Boolean);
    // For /scl/fi/{id}/{filename}, the filename is the last segment
    const last = parts[parts.length - 1];
    if (last && last.includes('.')) {
      return decodeURIComponent(last);
    }
    return null;
  } catch {
    return null;
  }
}
