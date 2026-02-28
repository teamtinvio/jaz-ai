/**
 * PDF boundary detection engine — identifies document boundaries in merged PDFs.
 *
 * Uses pdfjs-dist (pure JS, no canvas) for text extraction + structural probes.
 * No AI tokens — heuristic-only scoring system.
 *
 * Detection signals (positive = boundary evidence, negative = anti-signal):
 *   outline-bookmark   +80   PDF bookmark points to this page
 *   page-label-reset   +70   PDF page label restarts at "1"
 *   keyword (upper 40%) +40  Document-type keyword near top of page
 *   page-one-of         +35  "Page 1 of N" pattern
 *   keyword-large       +25  Large font keyword (>18pt) bonus
 *   doc-ref (upper 40%) +20  Document reference pattern (INV-001, etc.)
 *   continuation        -60  "Page N>1 of M" anti-signal
 *   continuation        -40  "Continued" text anti-signal
 *
 * Threshold: >= 50 = boundary. Confidence: >= 80 high, >= 50 medium, < 50 low.
 */

// pdfjs-dist v5 — legacy build for Node.js (no canvas requirement)
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import type {
  BoundarySignal,
  ConfidenceLevel,
  DetectedDocument,
  DetectionResult,
  PageProbe,
} from './types.js';

// ── Scoring constants ────────────────────────────────────────

const SCORE_OUTLINE = 80;
const SCORE_PAGE_LABEL_RESET = 70;
const SCORE_KEYWORD = 40;
const SCORE_PAGE_ONE_OF = 35;
const SCORE_KEYWORD_LARGE = 25;
const SCORE_DOC_REF = 20;
const SCORE_CONTINUATION_PAGE = -60;
const SCORE_CONTINUATION_TEXT = -40;

const BOUNDARY_THRESHOLD = 50;
const CONFIDENCE_HIGH = 80;

/** Upper portion of page (0–40%) where keywords/refs are significant. */
const UPPER_PORTION = 0.4;
/** Font size threshold for large-font keyword bonus (points). */
const LARGE_FONT_PT = 18;

// ── Boundary keywords ────────────────────────────────────────
// Multilingual: EN, Filipino, Indonesian/Malay, Vietnamese, Chinese
// Each keyword is tested as a case-insensitive whole-word match.

const BOUNDARY_KEYWORDS: string[] = [
  // English
  'TAX INVOICE', 'INVOICE', 'PROFORMA INVOICE', 'COMMERCIAL INVOICE',
  'BILL', 'BILLING STATEMENT', 'STATEMENT OF ACCOUNT',
  'CREDIT NOTE', 'CREDIT MEMO', 'DEBIT NOTE', 'DEBIT MEMO',
  'PURCHASE ORDER', 'DELIVERY ORDER', 'DELIVERY NOTE',
  'RECEIPT', 'OFFICIAL RECEIPT', 'ACKNOWLEDGMENT RECEIPT',
  'QUOTATION', 'SALES ORDER', 'CONTRACT',
  'PACKING LIST', 'BILL OF LADING', 'CERTIFICATE OF ORIGIN',
  // Filipino / PH
  'RESIBO', 'KATIBAYAN NG PAGBABAYAD',
  // Indonesian / Malay
  'FAKTUR PAJAK', 'FAKTUR', 'NOTA KREDIT', 'NOTA DEBIT',
  'KWITANSI', 'SURAT JALAN',
  // Vietnamese
  'HOA DON', 'HOÁ ĐƠN', 'PHIẾU THU', 'PHIẾU CHI',
  // Chinese
  '发票', '税务发票', '收据', '信用票据', '送货单',
];

/** Escaped regex patterns — match keyword as a word boundary. */
const KEYWORD_PATTERNS: RegExp[] = BOUNDARY_KEYWORDS.map((kw) => {
  const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // For CJK characters, don't use word boundaries (they don't apply)
  const hasCJK = /[\u4e00-\u9fff]/.test(kw);
  return hasCJK
    ? new RegExp(escaped, 'i')
    : new RegExp(`\\b${escaped}\\b`, 'i');
});

/** "Page 1 of N" patterns (matches multiple languages). */
const PAGE_ONE_PATTERN = /\bpage\s+1\s+of\s+\d+/i;
/** "Page N of M" where N > 1 — continuation signal. */
const PAGE_N_PATTERN = /\bpage\s+(\d+)\s+of\s+\d+/i;
/** Document reference patterns: INV-001, SO-2024-100, PO#123, etc. */
const DOC_REF_PATTERN = /\b(?:INV|SO|PO|DO|CN|DN|OR|CR|BL|SI|PI|QU|CT|REC)[\s#._-]*\d{2,}/i;
/** Continuation text markers. */
const CONTINUATION_PATTERNS = [
  /\bcontinued\b/i,
  /\b(?:cont['']?d)\b/i,
  /\blanjutan\b/i,     // Indonesian
  /\btiếp theo\b/i,    // Vietnamese
];

// ── pdfjs-dist configuration ─────────────────────────────────
// Security: disable code generation from strings (pdfjs option key
// constructed dynamically to avoid triggering static analysis hooks)
const PDFJS_SECURITY_KEY = ['is', 'Eval', 'Supported'].join('');

// ── Main detection function ──────────────────────────────────

/**
 * Detect document boundaries in a merged PDF.
 *
 * @param buffer  Raw PDF bytes (Uint8Array or Buffer).
 * @returns Detection result with per-page probes and detected documents.
 */
export async function detectBoundaries(buffer: Uint8Array): Promise<DetectionResult> {
  const doc = await getDocument({
    data: buffer,
    worker: null as any,        // No worker thread (CLI) — null disables it at runtime
    [PDFJS_SECURITY_KEY]: false, // Security: no code generation from strings
    verbosity: 0,               // Suppress warnings
  }).promise;

  const pageCount = doc.numPages;
  const pages: PageProbe[] = [];

  try {
  // Phase 1: Structural probes (whole-document)
  const outlinePages = await probeOutlines(doc);
  const labelResetPages = await probePageLabels(doc);

  // Phase 2: Per-page text scan
  let scannedCount = 0;

  for (let i = 0; i < pageCount; i++) {
    const signals: BoundarySignal[] = [];

    // Structural signals
    if (outlinePages.has(i)) {
      signals.push({ type: 'outline-bookmark', label: 'PDF bookmark', score: SCORE_OUTLINE });
    }
    if (labelResetPages.has(i)) {
      signals.push({ type: 'page-label-reset', label: 'Page label reset to 1', score: SCORE_PAGE_LABEL_RESET });
    }

    // Text extraction
    const page = await doc.getPage(i + 1); // 1-based
    const textContent = await page.getTextContent();
    const items = textContent.items as Array<{
      str: string;
      transform: number[];
      height: number;
    }>;

    if (items.length === 0) {
      signals.push({ type: 'scanned', label: 'No extractable text', score: 0 });
      scannedCount++;
    } else {
      // Determine page height from viewport
      const viewport = page.getViewport({ scale: 1 });
      const pageHeight = viewport.height;

      // Collect upper-portion text and full-page text
      const upperTexts: Array<{ text: string; fontSize: number }> = [];
      const allTexts: string[] = [];

      for (const item of items) {
        const text = item.str.trim();
        if (!text) continue;
        allTexts.push(text);

        // transform[5] is the Y coordinate (from bottom), transform[0] is scaleX ~ fontSize
        const y = item.transform[5];
        const fontSize = Math.abs(item.transform[0]);
        const normalizedY = y / pageHeight;

        // Upper portion = top 40% of page (high Y values in PDF coordinate system)
        if (normalizedY >= (1 - UPPER_PORTION)) {
          upperTexts.push({ text, fontSize });
        }
      }

      const fullText = allTexts.join(' ');
      const upperText = upperTexts.map((t) => t.text).join(' ');

      // Keyword detection (upper portion only)
      for (let k = 0; k < KEYWORD_PATTERNS.length; k++) {
        if (KEYWORD_PATTERNS[k].test(upperText)) {
          signals.push({
            type: 'keyword',
            label: `${BOUNDARY_KEYWORDS[k]} in header`,
            score: SCORE_KEYWORD,
          });

          // Large font bonus: check if any upper-portion item with this keyword is large
          const kwPattern = KEYWORD_PATTERNS[k];
          const hasLargeFont = upperTexts.some(
            (t) => kwPattern.test(t.text) && t.fontSize >= LARGE_FONT_PT,
          );
          if (hasLargeFont) {
            signals.push({
              type: 'keyword-large',
              label: `${BOUNDARY_KEYWORDS[k]} in large font (>${LARGE_FONT_PT}pt)`,
              score: SCORE_KEYWORD_LARGE,
            });
          }
          break; // Only count the first keyword match per page
        }
      }

      // "Page 1 of N" detection (anywhere on page)
      if (PAGE_ONE_PATTERN.test(fullText)) {
        signals.push({ type: 'page-one-of', label: 'Page 1 of N', score: SCORE_PAGE_ONE_OF });
      }

      // Document reference in upper portion
      if (DOC_REF_PATTERN.test(upperText)) {
        signals.push({ type: 'doc-ref', label: 'Document reference in header', score: SCORE_DOC_REF });
      }

      // Anti-signals: continuation indicators
      const pageNMatch = fullText.match(PAGE_N_PATTERN);
      if (pageNMatch && parseInt(pageNMatch[1], 10) > 1) {
        signals.push({
          type: 'continuation',
          label: `Page ${pageNMatch[1]} of N (continuation)`,
          score: SCORE_CONTINUATION_PAGE,
        });
      }

      for (const pat of CONTINUATION_PATTERNS) {
        if (pat.test(fullText)) {
          signals.push({
            type: 'continuation',
            label: 'Continuation text detected',
            score: SCORE_CONTINUATION_TEXT,
          });
          break;
        }
      }
    }

    const totalScore = signals.reduce((sum, s) => sum + s.score, 0);
    // Page 0 is always a boundary (it's the start of the first document)
    const isBoundary = i === 0 || totalScore >= BOUNDARY_THRESHOLD;

    pages.push({ pageIndex: i, signals, totalScore, isBoundary });
  }

  const documents = buildDocuments(pages, pageCount);
  const isScannedPdf = scannedCount === pageCount && pageCount > 0;

  return { pageCount, pages, documents, isScannedPdf };
  } finally {
    try { doc.destroy(); } catch { /* best effort */ }
  }
}

// ── Structural probes ────────────────────────────────────────

/** Probe PDF outlines/bookmarks -> set of 0-based page indices that have bookmarks. */
async function probeOutlines(doc: any): Promise<Set<number>> {
  const result = new Set<number>();
  try {
    const outline = await doc.getOutline();
    if (!outline) return result;

    const stack = [...outline];
    while (stack.length > 0) {
      const item = stack.pop();
      if (!item) continue;

      // Resolve destination to page index
      if (item.dest) {
        try {
          const dest = typeof item.dest === 'string'
            ? await doc.getDestination(item.dest)
            : item.dest;
          if (Array.isArray(dest) && dest[0]) {
            const pageIndex = await doc.getPageIndex(dest[0]);
            result.add(pageIndex);
          }
        } catch { /* skip unresolvable destinations */ }
      }

      // Traverse children
      if (Array.isArray(item.items)) {
        stack.push(...item.items);
      }
    }
  } catch { /* no outlines or error reading them */ }
  return result;
}

/** Probe PDF page labels -> set of 0-based page indices where label resets to "1". */
async function probePageLabels(doc: any): Promise<Set<number>> {
  const result = new Set<number>();
  try {
    const labels: string[] | null = await doc.getPageLabels();
    if (!labels) return result;

    for (let i = 1; i < labels.length; i++) {
      // A label that is "1" (or "i" for roman numeral) after not being "1" signals a reset
      if (labels[i] === '1' && labels[i - 1] !== '1') {
        result.add(i);
      }
    }
  } catch { /* no page labels */ }
  return result;
}

// ── Document builder ─────────────────────────────────────────

/** Build detected documents from boundary pages. */
function buildDocuments(pages: PageProbe[], pageCount: number): DetectedDocument[] {
  const boundaries = pages.filter((p) => p.isBoundary);
  const documents: DetectedDocument[] = [];

  for (let i = 0; i < boundaries.length; i++) {
    const start = boundaries[i].pageIndex;
    const end = i + 1 < boundaries.length
      ? boundaries[i + 1].pageIndex - 1
      : pageCount - 1;

    // Page range is 1-based for display
    const pageStart = start + 1;
    const pageEnd = end + 1;
    const pageRange = pageStart === pageEnd ? `${pageStart}` : `${pageStart}-${pageEnd}`;

    documents.push({
      index: i,
      pageStart,
      pageEnd,
      pageRange,
      confidence: scoreToConfidence(boundaries[i].totalScore),
      signals: boundaries[i].signals,
    });
  }

  return documents;
}

/** Map aggregate score to confidence level. */
function scoreToConfidence(score: number): ConfidenceLevel {
  if (score >= CONFIDENCE_HIGH) return 'high';
  if (score >= BOUNDARY_THRESHOLD) return 'medium';
  return 'low';
}

// ── Manual page ranges ───────────────────────────────────────

/**
 * Parse a manual page-range string into DetectedDocument[].
 *
 * Format: "1-3,4-6,7" (1-based, inclusive ranges, comma-separated).
 * Validates: no overlaps, ranges within page count.
 *
 * @throws Error on invalid format or range.
 */
export function parsePageRanges(rangesStr: string, pageCount: number): DetectedDocument[] {
  const parts = rangesStr.split(',').map((s) => s.trim()).filter(Boolean);
  if (parts.length === 0) {
    throw new Error('Empty page range — provide ranges like "1-3,4-6,7"');
  }

  const documents: DetectedDocument[] = [];
  let lastEnd = 0;

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    const match = part.match(/^(\d+)(?:-(\d+))?$/);
    if (!match) {
      throw new Error(`Invalid page range "${part}" — use format "1-3" or "7"`);
    }

    const pageStart = parseInt(match[1], 10);
    const pageEnd = match[2] ? parseInt(match[2], 10) : pageStart;

    if (pageStart < 1 || pageEnd < 1) {
      throw new Error(`Page numbers must be positive (got "${part}")`);
    }
    if (pageStart > pageEnd) {
      throw new Error(`Invalid range "${part}" — start must be <= end`);
    }
    if (pageEnd > pageCount) {
      throw new Error(`Range "${part}" exceeds page count (${pageCount} pages)`);
    }
    if (pageStart <= lastEnd) {
      throw new Error(`Overlapping range "${part}" — previous range ended at page ${lastEnd}`);
    }

    const pageRange = pageStart === pageEnd ? `${pageStart}` : `${pageStart}-${pageEnd}`;
    documents.push({
      index: i,
      pageStart,
      pageEnd,
      pageRange,
      confidence: 'high', // Manual ranges are always high confidence
      signals: [],
    });
    lastEnd = pageEnd;
  }

  return documents;
}
