/**
 * Shared utilities for cloud downloads.
 */

import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { JobValidationError } from '../../../../validate.js';

/**
 * Fetch with a timeout. Throws JobValidationError on timeout.
 */
export async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { signal: controller.signal, redirect: 'follow' });
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new JobValidationError(
        `Download timed out after ${Math.round(timeoutMs / 1000)}s. Try again or use --timeout to increase the limit.`
      );
    }
    throw new JobValidationError(
      `Download failed: ${err instanceof Error ? err.message : String(err)}`
    );
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Parse the filename from a Content-Disposition header.
 * Supports both `filename="..."` and `filename*=UTF-8''...` forms.
 */
export function parseContentDisposition(header: string | null): string | null {
  if (!header) return null;

  // Try filename*= (RFC 5987) first
  const utf8Match = header.match(/filename\*=(?:UTF-8|utf-8)''([^;\s]+)/);
  if (utf8Match) {
    try {
      return decodeURIComponent(utf8Match[1]);
    } catch {
      // Fall through to plain filename
    }
  }

  // Try plain filename=
  const plainMatch = header.match(/filename="?([^";\s]+)"?/);
  if (plainMatch) return plainMatch[1];

  return null;
}

/**
 * Count the number of files in a directory (recursive).
 */
export function countFilesInDir(dir: string): number {
  let count = 0;
  try {
    const entries = readdirSync(dir);
    for (const entry of entries) {
      if (entry.startsWith('.')) continue;
      const path = join(dir, entry);
      try {
        const stat = statSync(path);
        if (stat.isFile()) count++;
        else if (stat.isDirectory()) count += countFilesInDir(path);
      } catch { /* skip */ }
    }
  } catch { /* skip */ }
  return count;
}

/**
 * Calculate total size of all files in a directory (recursive, in bytes).
 */
export function dirSizeBytes(dir: string): number {
  let total = 0;
  try {
    const entries = readdirSync(dir);
    for (const entry of entries) {
      if (entry.startsWith('.')) continue;
      const path = join(dir, entry);
      try {
        const stat = statSync(path);
        if (stat.isFile()) total += stat.size;
        else if (stat.isDirectory()) total += dirSizeBytes(path);
      } catch { /* skip */ }
    }
  } catch { /* skip */ }
  return total;
}
