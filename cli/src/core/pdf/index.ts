/**
 * PDF boundary detection + splitting for merged documents.
 *
 * Usage:
 *   import { detectBoundaries, parsePageRanges, splitPdf, ... } from '../core/pdf/index.js';
 */

export { detectBoundaries, parsePageRanges } from './detect.js';
export { getPageCount, splitPdf, cleanupSplitFiles } from './split.js';
export type {
  SignalType,
  BoundarySignal,
  PageProbe,
  ConfidenceLevel,
  DetectedDocument,
  DetectionResult,
  SplitFile,
  SplitResult,
  SplitUploadItem,
  SplitUploadResult,
} from './types.js';
