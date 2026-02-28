/**
 * Google Drive public share link downloader.
 *
 * Single files: uc?export=download trick. Handles large-file confirmation page.
 * Folders: Not supported without authentication — error with clear message.
 */

import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { CloudProviderMatch, CloudDownloadResult, CloudDownloadOptions } from './types.js';
import { fetchWithTimeout } from './utils.js';
import { JobValidationError } from '../../../../validate.js';

/**
 * Download from a Google Drive public share link.
 */
export async function downloadGdrive(
  match: CloudProviderMatch,
  tempDir: string,
  opts: CloudDownloadOptions,
): Promise<CloudDownloadResult> {
  const warnings: string[] = [];

  if (match.resourceType === 'folder') {
    throw new JobValidationError(
      'Google Drive folder links cannot be listed without authentication.\n' +
      'Options:\n' +
      '  1. Share individual file links instead of a folder link\n' +
      '  2. Use Dropbox for folder sharing (folder ZIP download works without auth)\n' +
      '  3. Download the folder manually and use a local directory path'
    );
  }

  return downloadGdriveFile(match.resourceId, null, tempDir, opts, warnings);
}

/**
 * Download a single Google Drive file.
 * Uses the uc?export=download trick. For large files, parses the
 * confirmation page to get the download token.
 */
async function downloadGdriveFile(
  fileId: string,
  suggestedName: string | null,
  tempDir: string,
  opts: CloudDownloadOptions,
  warnings: string[],
): Promise<CloudDownloadResult> {
  const timeout = opts.timeout ?? 30_000;
  const maxFileBytes = opts.maxFileBytes ?? 100 * 1024 * 1024;

  const directUrl = `https://drive.google.com/uc?id=${fileId}&export=download`;
  const response = await fetchWithTimeout(directUrl, timeout);

  if (!response.ok) {
    if (response.status === 404) {
      throw new JobValidationError('Google Drive file not found (404). Check the URL and sharing settings.');
    }
    if (response.status === 403) {
      throw new JobValidationError('Google Drive file is not publicly accessible (403). Set sharing to "Anyone with the link".');
    }
    throw new JobValidationError(`Google Drive download failed: ${response.status} ${response.statusText}`);
  }

  // Check if Google returned an HTML confirmation page (large file)
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('text/html')) {
    const html = await response.text();
    const confirmToken = extractConfirmToken(html);
    if (confirmToken) {
      // Retry with confirmation token
      const confirmUrl = `https://drive.google.com/uc?id=${fileId}&export=download&confirm=${confirmToken}`;
      const retryResponse = await fetchWithTimeout(confirmUrl, timeout);
      if (!retryResponse.ok) {
        throw new JobValidationError(`Google Drive confirmed download failed: ${retryResponse.status}`);
      }
      return saveResponse(retryResponse, fileId, suggestedName, tempDir, maxFileBytes, warnings);
    }
    // No confirm token found — could be a different error page
    throw new JobValidationError(
      'Google Drive returned an unexpected page. The file may be too large or not shared publicly.'
    );
  }

  return saveResponse(response, fileId, suggestedName, tempDir, maxFileBytes, warnings);
}

/**
 * Save a successful response to disk.
 */
async function saveResponse(
  response: Response,
  fileId: string,
  suggestedName: string | null,
  tempDir: string,
  maxFileBytes: number,
  warnings: string[],
): Promise<CloudDownloadResult> {
  const buffer = Buffer.from(await response.arrayBuffer());

  if (buffer.length > maxFileBytes) {
    throw new JobValidationError(
      `File exceeds maximum size (${Math.round(maxFileBytes / 1024 / 1024)}MB). Download manually and use a local directory path.`
    );
  }

  // Determine filename
  const cdHeader = response.headers.get('content-disposition');
  let filename = suggestedName;
  if (!filename && cdHeader) {
    const match = cdHeader.match(/filename="?([^";\s]+)"?/);
    if (match) filename = match[1];
  }
  if (!filename) filename = `gdrive-${fileId}`;

  writeFileSync(join(tempDir, filename), buffer);

  return {
    localPath: tempDir,
    fileCount: 1,
    totalBytes: buffer.length,
    provider: 'gdrive',
    warnings,
    cleanup: () => {},
  };
}

/**
 * Extract the download confirmation token from Google Drive's HTML page.
 * Google shows this for large files to prevent automated abuse.
 */
function extractConfirmToken(html: string): string | null {
  // Pattern: confirm=XXXXX in hidden form or link
  const match = html.match(/confirm=([0-9A-Za-z_-]+)/);
  return match ? match[1] : null;
}
