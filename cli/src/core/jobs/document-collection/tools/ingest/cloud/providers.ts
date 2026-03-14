/**
 * URL → cloud provider detection.
 *
 * Pure functions — no side effects, no network calls. Detects provider,
 * resource type (file vs folder), and extracts the resource ID from the URL.
 */

import type { CloudProviderMatch } from './types.js';

// ── Dropbox patterns ──────────────────────────────────────────────

/** Dropbox file: /scl/fi/{id}/ or legacy /s/{path} */
const DROPBOX_FILE_SCL = /^https:\/\/(?:www\.)?dropbox\.com\/scl\/fi\/([^/]+)\//i;
const DROPBOX_FILE_S = /^https:\/\/(?:www\.)?dropbox\.com\/s\/([^/?]+)/i;

/** Dropbox folder: /scl/fo/{id}/ or legacy /sh/{path} */
const DROPBOX_FOLDER_SCL = /^https:\/\/(?:www\.)?dropbox\.com\/scl\/fo\/([^/]+)\//i;
const DROPBOX_FOLDER_SH = /^https:\/\/(?:www\.)?dropbox\.com\/sh\/([^/?]+)/i;

// ── Google Drive patterns ─────────────────────────────────────────

/** GDrive file: /file/d/{ID}/ */
const GDRIVE_FILE = /^https:\/\/drive\.google\.com\/file\/d\/([^/?]+)/i;

/** GDrive file: /open?id={ID} */
const GDRIVE_OPEN = /^https:\/\/drive\.google\.com\/open\?id=([^&]+)/i;

/** GDrive folder: /drive/folders/{ID} */
const GDRIVE_FOLDER = /^https:\/\/drive\.google\.com\/drive\/folders\/([^/?]+)/i;

// ── OneDrive / SharePoint patterns ────────────────────────────────

/** OneDrive short link: https://1drv.ms/{type}/s!{id} */
const ONEDRIVE_SHORT = /^https:\/\/1drv\.ms\/([a-z])\/s!([^?]+)/i;

/** OneDrive live: onedrive.live.com */
const ONEDRIVE_LIVE = /^https:\/\/onedrive\.live\.com\//i;

/** SharePoint: *.sharepoint.com */
const SHAREPOINT = /^https:\/\/[^.]+\.sharepoint\.com\//i;

/**
 * Detect the cloud provider from a URL and extract resource info.
 * Returns null if the URL doesn't match any known provider.
 */
export function detectProvider(url: string): CloudProviderMatch | null {
  if (!url || !url.startsWith('https://')) return null;

  // ── Dropbox ───────────────────────────────────────────────────

  let match = url.match(DROPBOX_FOLDER_SCL);
  if (match) return { provider: 'dropbox', resourceType: 'folder', resourceId: match[1], url };

  match = url.match(DROPBOX_FOLDER_SH);
  if (match) return { provider: 'dropbox', resourceType: 'folder', resourceId: match[1], url };

  match = url.match(DROPBOX_FILE_SCL);
  if (match) return { provider: 'dropbox', resourceType: 'file', resourceId: match[1], url };

  match = url.match(DROPBOX_FILE_S);
  if (match) return { provider: 'dropbox', resourceType: 'file', resourceId: match[1], url };

  // ── Google Drive ──────────────────────────────────────────────

  match = url.match(GDRIVE_FOLDER);
  if (match) return { provider: 'gdrive', resourceType: 'folder', resourceId: match[1], url };

  match = url.match(GDRIVE_FILE);
  if (match) return { provider: 'gdrive', resourceType: 'file', resourceId: match[1], url };

  match = url.match(GDRIVE_OPEN);
  if (match) return { provider: 'gdrive', resourceType: 'file', resourceId: match[1], url };

  // ── OneDrive / SharePoint ─────────────────────────────────────

  match = url.match(ONEDRIVE_SHORT);
  if (match) {
    // 1drv.ms/{type}: f = folder, u/b/w/t/p = file variants
    const type = match[1].toLowerCase();
    const resourceType = type === 'f' ? 'folder' : 'file';
    return { provider: 'onedrive', resourceType, resourceId: `s!${match[2]}`, url };
  }

  if (ONEDRIVE_LIVE.test(url) || SHAREPOINT.test(url)) {
    // Can't determine type from URL alone — assume folder
    return { provider: 'onedrive', resourceType: 'folder', resourceId: url, url };
  }

  return null;
}
