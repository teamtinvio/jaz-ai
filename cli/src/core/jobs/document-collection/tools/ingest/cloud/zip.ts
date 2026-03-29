/**
 * ZIP extraction utility for cloud folder downloads.
 *
 * Uses adm-zip. Sanitizes paths to prevent traversal attacks,
 * skips macOS metadata, and flattens single-root-folder ZIPs.
 */

import AdmZip from 'adm-zip';
import { existsSync, mkdirSync, writeFileSync, readdirSync, statSync, renameSync, rmSync } from 'node:fs';
import { join, normalize, dirname } from 'node:path';

/** Files/directories to skip during extraction. */
const SKIP_PATTERNS = [
  '__MACOSX',
  '.DS_Store',
  'Thumbs.db',
  'desktop.ini',
];

/**
 * Extract a ZIP file to a target directory.
 * Returns the list of extracted file paths (relative to outputDir).
 */
export function extractZipToDir(zipPath: string, outputDir: string): string[] {
  const zip = new AdmZip(zipPath);
  const entries = zip.getEntries();
  const extracted: string[] = [];

  for (const entry of entries) {
    if (entry.isDirectory) continue;

    const safeName = sanitizePath(entry.entryName);
    if (!safeName) continue;
    if (shouldSkip(safeName)) continue;

    const targetPath = join(outputDir, safeName);
    const targetDir = dirname(targetPath);

    if (!existsSync(targetDir)) {
      mkdirSync(targetDir, { recursive: true });
    }

    writeFileSync(targetPath, entry.getData());
    extracted.push(safeName);
  }

  return extracted;
}

/**
 * Sanitize a ZIP entry path to prevent path traversal.
 * Returns the safe path or empty string if the entry should be skipped.
 */
function sanitizePath(entryName: string): string {
  // Normalize and remove leading slashes / drive letters
  let safe = entryName
    .replace(/\\/g, '/')          // normalize separators
    .replace(/^\/+/, '')          // strip leading slashes
    .replace(/^[A-Za-z]:\//, ''); // strip drive letters

  // Remove .. path segments
  const parts = safe.split('/').filter(p => p !== '..' && p !== '.');
  safe = parts.join('/');

  // Final normalize
  safe = normalize(safe);
  if (safe === '.' || safe === '') return '';

  return safe;
}

/** Check if a path component matches a skip pattern. */
function shouldSkip(path: string): boolean {
  const parts = path.split(/[/\\]/);
  return parts.some(part =>
    SKIP_PATTERNS.some(pattern =>
      part === pattern || part.startsWith(pattern + '/')
    )
  );
}

/**
 * If outputDir has exactly one subdirectory and no files at root,
 * move the subdirectory's contents up one level and remove it.
 * This handles Dropbox's behavior of wrapping folder downloads
 * in a named root directory.
 */
export function flattenSingleRoot(dir: string): void {
  let entries: string[];
  try {
    entries = readdirSync(dir).filter(e => !e.startsWith('.'));
  } catch {
    return;
  }

  if (entries.length !== 1) return;

  const singleEntry = join(dir, entries[0]);
  let stat;
  try {
    stat = statSync(singleEntry);
  } catch {
    return;
  }

  if (!stat.isDirectory()) return;

  // Move all contents of the single subdirectory up to dir
  const innerEntries = readdirSync(singleEntry);
  for (const inner of innerEntries) {
    const src = join(singleEntry, inner);
    const dest = join(dir, inner);
    renameSync(src, dest);
  }

  // Remove the now-empty subdirectory
  try {
    rmSync(singleEntry, { recursive: true, force: true });
  } catch {
    // Ignore cleanup errors
  }
}
