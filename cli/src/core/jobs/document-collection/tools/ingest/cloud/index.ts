/**
 * Cloud download orchestrator.
 *
 * Detects the cloud provider from a URL, dispatches to the correct
 * downloader, and returns a temp directory with the downloaded files.
 * The caller is responsible for calling cleanup() when done.
 */

import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { CloudDownloadResult, CloudDownloadOptions } from './types.js';
import { detectProvider } from './providers.js';
import { downloadDropbox } from './dropbox.js';
import { downloadGdrive } from './gdrive.js';
import { downloadOnedrive } from './onedrive.js';
import { JobValidationError } from '../../../../validate.js';

export { detectProvider } from './providers.js';
export type { CloudProvider, CloudProviderMatch, CloudDownloadResult, CloudDownloadOptions } from './types.js';

/**
 * Download files from a cloud share link to a local temp directory.
 *
 * The returned CloudDownloadResult includes a cleanup() function that
 * removes the temp directory. Always call cleanup() in a finally block.
 */
export async function downloadCloudSource(
  url: string,
  opts: CloudDownloadOptions = {},
): Promise<CloudDownloadResult> {
  // Only allow HTTPS
  if (!url.startsWith('https://')) {
    throw new JobValidationError(
      'Cloud source URLs must use HTTPS.\n' +
      `  Got: ${url}`
    );
  }

  const match = detectProvider(url);
  if (!match) {
    throw new JobValidationError(
      'Unrecognized cloud provider URL. Supported: Dropbox, Google Drive, OneDrive/SharePoint.\n' +
      `  URL: ${url}\n` +
      'Examples:\n' +
      '  https://www.dropbox.com/scl/fo/.../folder?rlkey=...\n' +
      '  https://drive.google.com/drive/folders/FOLDER_ID\n' +
      '  https://1drv.ms/f/s!...'
    );
  }

  const tempDir = mkdtempSync(join(tmpdir(), 'clio-cloud-'));

  const cleanupFn = () => {
    try {
      rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  };

  try {
    let result: CloudDownloadResult;

    switch (match.provider) {
      case 'dropbox':
        result = await downloadDropbox(match, tempDir, opts);
        break;
      case 'gdrive':
        result = await downloadGdrive(match, tempDir, opts);
        break;
      case 'onedrive':
        result = await downloadOnedrive(match, tempDir, opts);
        break;
    }

    // Attach the real cleanup function
    result.cleanup = cleanupFn;
    return result;
  } catch (err) {
    cleanupFn();
    throw err;
  }
}
