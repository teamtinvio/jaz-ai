/**
 * Shared types for clio jobs blueprint generators.
 */

export type JobType =
  | 'month-end-close'
  | 'quarter-end-close'
  | 'year-end-close'
  | 'bank-recon'
  | 'gst-vat-filing'
  | 'payment-run'
  | 'credit-control'
  | 'supplier-recon'
  | 'audit-prep'
  | 'fa-review'
  | 'document-collection'
  | 'statutory-filing';

export const JOB_TYPES: JobType[] = [
  'month-end-close',
  'quarter-end-close',
  'year-end-close',
  'bank-recon',
  'gst-vat-filing',
  'payment-run',
  'credit-control',
  'supplier-recon',
  'audit-prep',
  'fa-review',
  'document-collection',
  'statutory-filing',
];

export type StepCategory = 'verify' | 'accrue' | 'adjust' | 'value' | 'report' | 'lock' | 'resolve' | 'export' | 'review';

export interface JobStep {
  order: number;
  description: string;
  category: StepCategory;
  apiCall?: string;
  apiBody?: Record<string, unknown>;
  recipeRef?: string;
  calcCommand?: string;
  conditional?: string;
  verification?: string;
  notes?: string;
}

export interface JobPhase {
  name: string;
  description: string;
  steps: JobStep[];
}

export interface JobBlueprint {
  jobType: JobType;
  period: string;
  currency: string;
  mode: 'standalone' | 'incremental';
  phases: JobPhase[];
  summary: {
    totalSteps: number;
    recipeReferences: string[];
    calcReferences: string[];
    apiCalls: string[];
  };
}

// ── Document ingestion types ──────────────────────────────────

export type DocumentType = 'INVOICE' | 'BILL' | 'CUSTOMER_CREDIT_NOTE' | 'SUPPLIER_CREDIT_NOTE' | 'BANK_STATEMENT';

export interface FileClassification {
  path: string;
  filename: string;
  extension: string;
  documentType: DocumentType | 'UNKNOWN' | 'SKIPPED';
  folder: string;
  confidence: 'auto' | 'user' | 'forced';
  reason: string;
  /** Absolute path to the file on disk. Agent uses this for uploads. */
  absolutePath: string;
  /** File size in bytes. */
  sizeBytes: number;
  /** True if the file is a password-protected PDF. */
  encrypted?: boolean;
  /** Password extracted from filename pattern: name__pw__password.ext */
  filePassword?: string;
}

export interface FolderSummary {
  folder: string;
  documentType: DocumentType | 'UNKNOWN';
  files: FileClassification[];
  count: number;
}

export interface IngestPlan {
  source: string;
  sourceType: 'local' | 'url';
  /** Absolute path to the local directory containing files. For cloud sources, this is the temp dir. */
  localPath: string;
  /** Cloud provider info, present when sourceType is 'url'. */
  cloudProvider?: 'dropbox' | 'gdrive' | 'onedrive';
  folders: FolderSummary[];
  summary: {
    total: number;
    uploadable: number;
    needClassification: number;
    skipped: number;
    byType: Record<string, number>;
    encrypted: number;
  };
  /** Temp directories created during ZIP extraction. Caller should clean up after upload. */
  tempDirs?: string[];
}

// ── Upload result types ───────────────────────────────────────

export interface FileUploadResult {
  file: string;
  type: DocumentType;
  status: 'uploaded' | 'failed' | 'skipped';
  error?: string;
  response?: unknown;
}

export interface UploadResult {
  total: number;
  success: number;
  failed: number;
  results: FileUploadResult[];
}

export interface IngestWithUploadResult extends IngestPlan {
  upload: UploadResult;
}

/** Build the summary from phases. */
export function buildSummary(phases: JobPhase[]): JobBlueprint['summary'] {
  const allSteps = phases.flatMap(p => p.steps);
  const recipeSet = new Set<string>();
  const calcSet = new Set<string>();
  const apiSet = new Set<string>();

  for (const step of allSteps) {
    if (step.recipeRef) recipeSet.add(step.recipeRef);
    if (step.calcCommand) calcSet.add(step.calcCommand);
    if (step.apiCall) apiSet.add(step.apiCall);
  }

  return {
    totalSteps: allSteps.length,
    recipeReferences: [...recipeSet].sort(),
    calcReferences: [...calcSet].sort(),
    apiCalls: [...apiSet].sort(),
  };
}
