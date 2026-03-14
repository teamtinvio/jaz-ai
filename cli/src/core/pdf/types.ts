/**
 * Types for PDF boundary detection and document splitting.
 */

// ── Signal types ─────────────────────────────────────────────

/** Signal type identifiers for boundary detection. */
export type SignalType =
  | 'keyword'           // Document-type keyword in upper portion
  | 'keyword-large'     // Keyword in large font (>18pt) — bonus
  | 'page-one-of'       // "Page 1 of N" pattern
  | 'page-label-reset'  // PDF page label resets to "1"
  | 'outline-bookmark'  // PDF outline/bookmark points here
  | 'doc-ref'           // Document reference pattern (INV-001, etc.)
  | 'continuation'      // Anti-signal: "Page 2 of N", "Continued"
  | 'scanned';          // Informational: page has no extractable text

/** A single piece of evidence that a page is (or is not) a document boundary. */
export interface BoundarySignal {
  type: SignalType;
  /** Human-readable description, e.g. "TAX INVOICE in header". */
  label: string;
  /** Score contribution (positive = boundary evidence, negative = anti). */
  score: number;
}

// ── Per-page detection ───────────────────────────────────────

/** Detection result for a single page. */
export interface PageProbe {
  /** Zero-based page index. */
  pageIndex: number;
  signals: BoundarySignal[];
  /** Aggregate score (sum of signal scores). */
  totalScore: number;
  /** Whether this page is classified as a document boundary. */
  isBoundary: boolean;
}

// ── Document detection ───────────────────────────────────────

export type ConfidenceLevel = 'high' | 'medium' | 'low';

/** A detected document within the merged PDF. */
export interface DetectedDocument {
  /** Zero-based index in the split sequence. */
  index: number;
  /** 1-based page range (inclusive). */
  pageStart: number;
  pageEnd: number;
  /** Human-readable range string, e.g. "1-3" or "7". */
  pageRange: string;
  confidence: ConfidenceLevel;
  /** Signals from the boundary page. */
  signals: BoundarySignal[];
}

/** Full result of boundary detection on a PDF. */
export interface DetectionResult {
  pageCount: number;
  pages: PageProbe[];
  documents: DetectedDocument[];
  /** True if all pages returned empty text (likely scanned/image PDF). */
  isScannedPdf: boolean;
}

// ── Split result ─────────────────────────────────────────────

/** A single split file extracted from the merged PDF. */
export interface SplitFile {
  index: number;
  pageRange: string;
  /** Absolute path to the split temp file. */
  path: string;
  /** Generated filename for upload, e.g. "merged-invoices_1.pdf". */
  fileName: string;
}

/** A split failure for a single range. */
export interface SplitFailure {
  index: number;
  pageRange: string;
  error: string;
}

/** Result of the full split operation. Caller MUST clean up tempDir. */
export interface SplitResult {
  tempDir: string;
  files: SplitFile[];
  failures: SplitFailure[];
}

// ── Upload result (for magic split command) ──────────────────

export interface SplitUploadItem {
  index: number;
  pageRange: string;
  splitFileName: string;
  status: 'uploaded' | 'failed';
  workflowResourceId?: string;
  documentType?: string;
  error?: string;
}

export interface SplitUploadResult {
  file: string;
  pageCount: number;
  documents: SplitUploadItem[];
  summary: {
    total: number;
    uploaded: number;
    failed: number;
  };
}
