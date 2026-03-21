/**
 * PDF encryption detection and decryption via qpdf.
 *
 * Detection: scans PDF bytes for the /Encrypt dictionary entry
 * (present in all PDF encryption types: RC4, AES-128, AES-256).
 *
 * Decryption: delegates to the `qpdf` CLI tool (optional system dependency).
 * If qpdf is not installed, we surface a clear install instruction.
 */

import { execFileSync } from 'node:child_process';
import { mkdtempSync, unlinkSync, rmSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';

/**
 * Check if a PDF buffer is encrypted.
 *
 * Looks for the `/Encrypt` entry in the PDF cross-reference table / trailer.
 * This is present in every encrypted PDF regardless of encryption algorithm.
 * Uses latin1 encoding to avoid multi-byte issues with binary content.
 */
export function isPdfEncrypted(buffer: Buffer): boolean {
  if (buffer.length < 5) return false;

  // Quick sanity check: is this actually a PDF?
  const header = buffer.subarray(0, 5).toString('ascii');
  if (header !== '%PDF-') return false;

  // Search for /Encrypt dictionary entry in the binary content.
  // Use latin1 to get a 1:1 byte→char mapping (no multi-byte decoding issues).
  const content = buffer.toString('latin1');
  return content.includes('/Encrypt');
}

// ── qpdf availability ────────────────────────────────────────

let qpdfChecked = false;
let qpdfAvailable = false;

/**
 * Check if qpdf is installed and available on PATH.
 * Result is cached — only checks once per process.
 */
export function isQpdfAvailable(): boolean {
  if (qpdfChecked) return qpdfAvailable;

  try {
    execFileSync('qpdf', ['--version'], { stdio: 'ignore' });
    qpdfAvailable = true;
  } catch {
    qpdfAvailable = false;
  }
  qpdfChecked = true;
  return qpdfAvailable;
}

/** Reset the cached qpdf check (for testing). */
export function _resetQpdfCache(): void {
  qpdfChecked = false;
  qpdfAvailable = false;
}

// ── Decryption ───────────────────────────────────────────────

/**
 * Decrypt a password-protected PDF using qpdf.
 *
 * Creates a temporary file with the decrypted content.
 * Returns the absolute path to the decrypted file.
 * Caller is responsible for cleanup (use `cleanupDecryptedFile`).
 *
 * @throws Error if qpdf is not installed or decryption fails (wrong password, etc.)
 */
export function decryptPdf(encryptedPath: string, password: string): string {
  if (!isQpdfAvailable()) {
    throw new Error('qpdf is required to decrypt PDFs — install: brew install qpdf (macOS) or sudo apt install qpdf (Linux)');
  }

  const tempDir = mkdtempSync(join(tmpdir(), 'clio-decrypt-'));
  const outputPath = join(tempDir, 'decrypted.pdf');

  try {
    execFileSync('qpdf', [
      '--decrypt',
      `--password=${password}`,
      encryptedPath,
      outputPath,
    ], { stdio: 'pipe' });
  } catch (err) {
    // Clean up temp dir on failure
    cleanupDecryptedFile(outputPath);
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('invalid password')) {
      throw new Error(`Wrong password for ${encryptedPath}`);
    }
    throw new Error(`Failed to decrypt ${encryptedPath}: ${msg}`);
  }

  return outputPath;
}

// ── Filename password extraction ────────────────────────────

/**
 * Extract password from filename pattern: label__pw__password.ext
 *
 * The __pw__ delimiter is case-insensitive (__PW__, __Pw__, etc.).
 * The password after __pw__ is case-sensitive and used as-is.
 * Returns the cleaned display name (without __pw__...) and the extracted password.
 *
 * Examples:
 *   receipt__pw__s3cRetP@ss.pdf  →  { cleanName: "receipt.pdf", password: "s3cRetP@ss" }
 *   normal-file.pdf              →  { cleanName: "normal-file.pdf" }
 */
export function extractFilePassword(filename: string, ext: string): { cleanName: string; password?: string } {
  const escapedExt = ext.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = filename.match(new RegExp(`^(.+?)__pw__(.+)${escapedExt}$`, 'i'));
  if (!match) return { cleanName: filename };
  return { cleanName: `${match[1]}${ext}`, password: match[2] };
}

/**
 * Remove a decrypted temp file and its parent temp directory.
 * Safe to call with any path — silently ignores missing files.
 */
export function cleanupDecryptedFile(decryptedPath: string): void {
  try {
    if (existsSync(decryptedPath)) unlinkSync(decryptedPath);
    // Remove the temp directory
    const dir = dirname(decryptedPath);
    if (existsSync(dir)) {
      try { rmSync(dir, { recursive: true, force: true }); } catch { /* best effort */ }
    }
  } catch { /* best effort */ }
}
