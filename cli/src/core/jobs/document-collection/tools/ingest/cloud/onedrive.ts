/**
 * OneDrive / SharePoint public share link downloader (best-effort).
 *
 * Uses the MS Graph sharing API: encode share URL as base64url,
 * prefix with "u!", call the shares endpoint. This works for
 * "Anyone with the link" sharing but has been unreliable since Feb 2025.
 *
 * All operations emit a best-effort warning.
 */

import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { CloudProviderMatch, CloudDownloadResult, CloudDownloadOptions } from './types.js';
import { fetchWithTimeout, dirSizeBytes } from './utils.js';
import { JobValidationError } from '../../../../validate.js';

const BEST_EFFORT_WARNING =
  'OneDrive/SharePoint public link support is best-effort. ' +
  'If this fails, download the files manually and use a local directory path.';

/** MS Graph response shape for a DriveItem. */
interface DriveItem {
  name: string;
  size?: number;
  file?: { mimeType: string };
  folder?: { childCount: number };
  '@microsoft.graph.downloadUrl'?: string;
  '@content.downloadUrl'?: string;
}

/** MS Graph response for children listing. */
interface DriveChildrenResponse {
  value?: DriveItem[];
  '@odata.nextLink'?: string;
}

/**
 * Download from an OneDrive/SharePoint public share link.
 */
export async function downloadOnedrive(
  match: CloudProviderMatch,
  tempDir: string,
  opts: CloudDownloadOptions,
): Promise<CloudDownloadResult> {
  const warnings: string[] = [BEST_EFFORT_WARNING];

  try {
    const encodedUrl = encodeShareUrl(match.url);

    if (match.resourceType === 'file') {
      return await downloadOnedriveFile(encodedUrl, tempDir, opts, warnings);
    } else {
      return await downloadOnedriveFolder(encodedUrl, tempDir, opts, warnings);
    }
  } catch (err) {
    if (err instanceof JobValidationError) throw err;
    throw new JobValidationError(
      `OneDrive download failed: ${err instanceof Error ? err.message : String(err)}\n` +
      'Download the files manually and use a local directory path instead.'
    );
  }
}

/**
 * Download a single file from OneDrive via the sharing API.
 */
async function downloadOnedriveFile(
  encodedUrl: string,
  tempDir: string,
  opts: CloudDownloadOptions,
  warnings: string[],
): Promise<CloudDownloadResult> {
  const timeout = opts.timeout ?? 30_000;
  const maxFileBytes = opts.maxFileBytes ?? 100 * 1024 * 1024;

  // Get the DriveItem metadata to find the download URL and filename
  const metaUrl = `https://api.onedrive.com/v1.0/shares/${encodedUrl}/root`;
  const metaResponse = await fetchWithTimeout(metaUrl, timeout);

  if (!metaResponse.ok) {
    handleOnedriveError(metaResponse.status);
  }

  const item = (await metaResponse.json()) as DriveItem;
  const downloadUrl = item['@microsoft.graph.downloadUrl'] || item['@content.downloadUrl'];

  if (!downloadUrl) {
    throw new JobValidationError(
      'OneDrive did not provide a download URL. The link may not be publicly accessible.'
    );
  }

  const response = await fetchWithTimeout(downloadUrl, timeout);
  if (!response.ok) {
    throw new JobValidationError(`OneDrive file download failed: ${response.status}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length > maxFileBytes) {
    throw new JobValidationError(
      `File exceeds maximum size (${Math.round(maxFileBytes / 1024 / 1024)}MB). Download manually.`
    );
  }

  const filename = item.name || `onedrive-file`;
  writeFileSync(join(tempDir, filename), buffer);

  return {
    localPath: tempDir,
    fileCount: 1,
    totalBytes: buffer.length,
    provider: 'onedrive',
    warnings,
    cleanup: () => {},
  };
}

/**
 * List and download files from an OneDrive folder via the sharing API.
 */
async function downloadOnedriveFolder(
  encodedUrl: string,
  tempDir: string,
  opts: CloudDownloadOptions,
  warnings: string[],
): Promise<CloudDownloadResult> {
  const timeout = opts.timeout ?? 30_000;
  const maxTotalBytes = opts.maxTotalBytes ?? 500 * 1024 * 1024;
  const maxFileBytes = opts.maxFileBytes ?? 100 * 1024 * 1024;

  // List children of the shared folder
  const listUrl = `https://api.onedrive.com/v1.0/shares/${encodedUrl}/root/children`;
  const listResponse = await fetchWithTimeout(listUrl, timeout);

  if (!listResponse.ok) {
    handleOnedriveError(listResponse.status);
  }

  const data = (await listResponse.json()) as DriveChildrenResponse;
  const items = data.value ?? [];

  if (items.length === 0) {
    warnings.push('OneDrive folder is empty or files are not publicly shared.');
    return {
      localPath: tempDir,
      fileCount: 0,
      totalBytes: 0,
      provider: 'onedrive',
      warnings,
      cleanup: () => {},
    };
  }

  let totalBytes = 0;
  let fileCount = 0;

  for (const item of items) {
    // Skip subfolders (no recursive traversal for OneDrive)
    if (item.folder) {
      warnings.push(`Skipped subfolder: "${item.name}" (OneDrive subfolder traversal not supported)`);
      continue;
    }

    if (totalBytes > maxTotalBytes) {
      warnings.push(`Reached maximum total download size. Some files were skipped.`);
      break;
    }

    const downloadUrl = item['@microsoft.graph.downloadUrl'] || item['@content.downloadUrl'];
    if (!downloadUrl) {
      warnings.push(`Skipped "${item.name}": no download URL provided`);
      continue;
    }

    try {
      const response = await fetchWithTimeout(downloadUrl, timeout);
      if (!response.ok) {
        warnings.push(`Skipped "${item.name}": download returned ${response.status}`);
        continue;
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      if (buffer.length > maxFileBytes) {
        warnings.push(`Skipped "${item.name}": exceeds max file size`);
        continue;
      }

      writeFileSync(join(tempDir, item.name), buffer);
      totalBytes += buffer.length;
      fileCount++;
    } catch (err) {
      warnings.push(`Skipped "${item.name}": ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return {
    localPath: tempDir,
    fileCount,
    totalBytes,
    provider: 'onedrive',
    warnings,
    cleanup: () => {},
  };
}

/**
 * Encode a share URL for the MS Graph sharing API.
 * Algorithm: base64url-encode the URL, prefix with "u!".
 */
export function encodeShareUrl(shareUrl: string): string {
  const base64 = Buffer.from(shareUrl, 'utf-8').toString('base64');
  // Convert to base64url: replace +→-, /→_, strip trailing =
  const base64url = base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `u!${base64url}`;
}

/** Map OneDrive HTTP errors to user-friendly messages. */
function handleOnedriveError(status: number): never {
  if (status === 401 || status === 403) {
    throw new JobValidationError(
      'OneDrive link requires authentication (401/403). ' +
      'Microsoft has restricted public link access. ' +
      'Download the files manually and use a local directory path.'
    );
  }
  if (status === 404) {
    throw new JobValidationError(
      'OneDrive link not found (404). Check the URL is correct and still shared.'
    );
  }
  throw new JobValidationError(`OneDrive API error: ${status}`);
}
