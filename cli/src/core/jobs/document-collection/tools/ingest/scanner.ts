/**
 * Local filesystem scanner for the document-collection ingest tool.
 *
 * Recursively traverses a directory, classifies files by folder name,
 * and produces an IngestPlan (dry-run output). ZIP files are extracted
 * to temp directories and their contents scanned through the same pipeline.
 */

import { mkdtempSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, basename, extname, relative, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import type { DocumentType, FileClassification, FolderSummary, IngestPlan } from '../../../types.js';
import { classifyFolder, checkExtension } from './classify.js';
import { isPdfEncrypted, extractFilePassword } from './decrypt.js';
import { extractZipToDir, flattenSingleRoot } from './cloud/zip.js';

/** Max recursion depth to prevent runaway traversal. */
const MAX_DEPTH = 10;

/** Max ZIP nesting depth (only extract one level). */
const MAX_ZIP_DEPTH = 1;

export interface ScanOptions {
  /** Force all files to a specific document type (--type flag). */
  forceType?: DocumentType;
  /** Max depth for recursion. */
  maxDepth?: number;
}

/**
 * Scan a local directory and produce an IngestPlan.
 *
 * Classification logic:
 * 1. If --type is forced, all supported files get that type.
 * 2. Otherwise, classify each subfolder by name (prefix match).
 * 3. Files in the root (no subfolder) are classified as UNKNOWN.
 * 4. Nested subfolders (depth > 1) inherit from nearest classified ancestor.
 * 5. ZIP files are extracted and their contents scanned recursively.
 */
export function scanLocalDirectory(sourcePath: string, opts: ScanOptions = {}): IngestPlan {
  const base = resolve(sourcePath);
  const maxDepth = opts.maxDepth ?? MAX_DEPTH;
  const files: FileClassification[] = [];
  const tempDirs: string[] = [];

  scanDir(base, base, null, opts.forceType ?? null, 0, maxDepth, files, tempDirs, 0);

  // Group files by folder
  const folderMap = new Map<string, FileClassification[]>();
  for (const f of files) {
    const existing = folderMap.get(f.folder);
    if (existing) {
      existing.push(f);
    } else {
      folderMap.set(f.folder, [f]);
    }
  }

  const folders: FolderSummary[] = [];
  for (const [folder, folderFiles] of folderMap) {
    // Determine folder-level doc type (majority of non-SKIPPED files)
    const uploadable = folderFiles.filter(f => f.documentType !== 'SKIPPED' && f.documentType !== 'UNKNOWN');
    const docType: DocumentType | 'UNKNOWN' = uploadable.length > 0
      ? uploadable[0].documentType as DocumentType
      : 'UNKNOWN';

    folders.push({
      folder,
      documentType: docType,
      files: folderFiles,
      count: folderFiles.length,
    });
  }

  // Sort folders: classified first, UNKNOWN last
  folders.sort((a, b) => {
    if (a.documentType === 'UNKNOWN' && b.documentType !== 'UNKNOWN') return 1;
    if (a.documentType !== 'UNKNOWN' && b.documentType === 'UNKNOWN') return -1;
    return a.folder.localeCompare(b.folder);
  });

  // Build summary
  let total = 0;
  let uploadable = 0;
  let needClassification = 0;
  let skipped = 0;
  let encrypted = 0;
  const byType: Record<string, number> = {};

  for (const f of files) {
    total++;
    if (f.encrypted) encrypted++;
    if (f.documentType === 'SKIPPED') {
      skipped++;
    } else if (f.documentType === 'UNKNOWN') {
      needClassification++;
    } else {
      uploadable++;
      byType[f.documentType] = (byType[f.documentType] ?? 0) + 1;
    }
  }

  return {
    source: base,
    sourceType: 'local',
    localPath: base,
    folders,
    summary: { total, uploadable, needClassification, skipped, byType, encrypted },
    ...(tempDirs.length > 0 && { tempDirs }),
  };
}

/**
 * Recursive directory scanner.
 */
function scanDir(
  rootPath: string,
  dirPath: string,
  inheritedType: DocumentType | null,
  forceType: DocumentType | null,
  depth: number,
  maxDepth: number,
  out: FileClassification[],
  tempDirs: string[],
  zipDepth: number,
): void {
  if (depth > maxDepth) return;

  let entries: string[];
  try {
    entries = readdirSync(dirPath);
  } catch {
    return; // Skip inaccessible directories
  }

  const relDir = relative(rootPath, dirPath) || '.';

  // Classify this folder if not root and not forced
  const folderName = basename(dirPath);
  const folderType = forceType ?? (depth > 0 ? (classifyFolder(folderName) ?? inheritedType) : inheritedType);

  for (const entry of entries) {
    // Skip hidden files/dirs
    if (entry.startsWith('.')) continue;

    const fullPath = join(dirPath, entry);
    let stat;
    try {
      stat = statSync(fullPath);
    } catch {
      continue; // Skip inaccessible entries
    }

    if (stat.isDirectory()) {
      scanDir(rootPath, fullPath, folderType, forceType, depth + 1, maxDepth, out, tempDirs, zipDepth);
    } else if (stat.isFile()) {
      const ext = extname(entry).toLowerCase();
      if (!ext) continue; // Skip extensionless files

      // ── ZIP container: extract and recursively scan ──
      if (ext === '.zip') {
        if (zipDepth >= MAX_ZIP_DEPTH) continue; // Skip nested ZIPs
        try {
          const zipTempDir = mkdtempSync(join(tmpdir(), 'clio-zip-'));
          tempDirs.push(zipTempDir);
          extractZipToDir(fullPath, zipTempDir);
          flattenSingleRoot(zipTempDir);
          const effectiveType = forceType ?? folderType;
          scanDir(zipTempDir, zipTempDir, effectiveType, forceType, 0, maxDepth, out, tempDirs, zipDepth + 1);
        } catch {
          // Emit a SKIPPED entry so corrupt ZIPs are traceable in the plan
          out.push({
            path: relative(rootPath, fullPath),
            filename: entry,
            extension: '.zip',
            documentType: 'SKIPPED',
            folder: relDir,
            confidence: 'auto',
            reason: 'Corrupt or unreadable ZIP',
            absolutePath: fullPath,
            sizeBytes: stat.size,
          });
        }
        continue;
      }

      const relPath = relative(rootPath, fullPath);
      const effectiveType = forceType ?? folderType;
      const extCheck = checkExtension(ext, effectiveType);

      let documentType: FileClassification['documentType'];
      let confidence: FileClassification['confidence'];
      let reason: string;

      if (extCheck === 'skip') {
        documentType = 'SKIPPED';
        confidence = 'auto';
        reason = `Unsupported extension: ${ext}`;
      } else if (forceType) {
        documentType = forceType;
        confidence = 'forced';
        reason = `Forced type: ${forceType}`;
      } else if (effectiveType) {
        documentType = effectiveType;
        confidence = 'auto';
        reason = `Folder "${folderName}" → ${effectiveType}`;
      } else {
        documentType = 'UNKNOWN';
        confidence = 'auto';
        reason = 'No classification — folder name not recognized';
      }

      // Detect password-protected PDFs
      let encrypted: boolean | undefined;
      if (ext === '.pdf' && documentType !== 'SKIPPED') {
        try {
          const buf = readFileSync(fullPath);
          if (isPdfEncrypted(buf)) encrypted = true;
        } catch { /* ignore read errors */ }
      }

      // Extract password from filename pattern: label__pw__password.ext
      const { cleanName, password: filePassword } = extractFilePassword(entry, ext);

      out.push({
        path: relPath,
        filename: cleanName,
        extension: ext,
        documentType,
        folder: relDir,
        confidence,
        reason,
        absolutePath: fullPath,
        sizeBytes: stat.size,
        encrypted,
        filePassword,
      });
    }
  }
}
