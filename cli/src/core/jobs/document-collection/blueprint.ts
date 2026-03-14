/**
 * Document Collection blueprint generator.
 * Produces a structured JobBlueprint describing the document intake workflow —
 * scan folders, classify files, upload to Jaz Magic APIs.
 */

import type { JobBlueprint, JobPhase } from '../types.js';
import { buildSummary } from '../types.js';

export interface DocumentCollectionOptions {
  /** Reporting currency (e.g., SGD, PHP). */
  currency?: string;
}

export function generateDocumentCollectionBlueprint(opts: DocumentCollectionOptions = {}): JobBlueprint {
  const currency = opts.currency ?? 'SGD';

  // Phase 1: Intake
  const intake: JobPhase = {
    name: 'Intake',
    description: 'Identify document source and prepare for scanning.',
    steps: [
      {
        order: 1,
        description: 'Identify document source',
        category: 'verify',
        notes: 'Supported sources: local folders, Dropbox/GDrive/OneDrive shared links.',
      },
      {
        order: 2,
        description: 'Verify source accessibility',
        category: 'verify',
        notes: 'For local: check folder exists and is readable. For URLs: verify link resolves and is publicly accessible.',
      },
    ],
  };

  // Phase 2: Scan
  const scan: JobPhase = {
    name: 'Scan',
    description: 'Traverse folder tree and list all files with metadata.',
    steps: [
      {
        order: 3,
        description: 'Scan folder structure',
        category: 'verify',
        notes: 'Recursively list all files. Record: path, filename, extension, parent folder name.',
        calcCommand: 'clio jobs document-collection ingest --source <path>',
      },
      {
        order: 4,
        description: 'Filter by supported file types',
        category: 'verify',
        notes: 'Invoices/Bills: .pdf, .jpg, .jpeg, .png. Bank statements: .csv, .ofx. Skip unsupported types with warning.',
      },
    ],
  };

  // Phase 3: Classify
  const classify: JobPhase = {
    name: 'Classify',
    description: 'Auto-classify files by folder name, flag unknowns for user review.',
    steps: [
      {
        order: 5,
        description: 'Auto-classify by folder name',
        category: 'verify',
        notes: 'Pattern matching: invoice*/sales*/ar* → INVOICE, bill*/purchase*/expense*/ap* → BILL, bank*/statement*/recon* → BANK_STATEMENT.',
      },
      {
        order: 6,
        description: 'Flag unclassified files for user input',
        category: 'review',
        notes: 'Folders with unrecognized names need manual classification: INVOICE, BILL, BANK_STATEMENT, or SKIP.',
      },
    ],
  };

  // Phase 4: Review
  const review: JobPhase = {
    name: 'Review',
    description: 'Present dry-run plan for user approval before uploading.',
    steps: [
      {
        order: 7,
        description: 'Generate ingestion plan',
        category: 'review',
        notes: 'Show: folder → doc type mapping, file counts, any skipped/unknown files. No API calls yet.',
        calcCommand: 'clio jobs document-collection ingest --source <path> --json',
      },
      {
        order: 8,
        description: 'Confirm plan with user',
        category: 'review',
        notes: 'User reviews classification, approves or adjusts. Agent then uploads each file using the api skill.',
      },
    ],
  };

  // Phase 5: Upload (agent-executed — uses file paths from ingest plan)
  const upload: JobPhase = {
    name: 'Upload',
    description: 'Agent uploads each classified file to the appropriate Jaz Magic API endpoint using absolute paths from the ingest plan.',
    steps: [
      {
        order: 9,
        description: 'Upload invoices and bills via Magic API',
        category: 'resolve',
        apiCall: 'POST /magic/createBusinessTransactionFromAttachment',
        apiBody: {
          sourceType: 'FILE',
          businessTransactionType: '(INVOICE or BILL per classification)',
        },
        notes: 'Agent uses curl -F "sourceFile=@<absolutePath>" for each file. Extraction is async — returns subscriptionFBPath for tracking.',
      },
      {
        order: 10,
        description: 'Upload bank statements via Magic API',
        category: 'resolve',
        apiCall: 'POST /magic/importBankStatementFromAttachment',
        apiBody: {
          sourceType: 'FILE',
          businessTransactionType: 'BANK_STATEMENT',
        },
        notes: 'Agent uses curl -F "sourceFile=@<absolutePath>". Requires accountResourceId for the target bank account. Supports CSV and OFX.',
      },
    ],
  };

  // Phase 6: Verify (agent-executed)
  const verify: JobPhase = {
    name: 'Verify',
    description: 'Agent checks extraction results and flags failures.',
    steps: [
      {
        order: 11,
        description: 'Check extraction status for each uploaded file',
        category: 'verify',
        notes: 'Track subscriptionFBPath for invoice/bill uploads. Confirm recordsCreated for bank statements.',
        verification: 'All uploads should have a success status or documented failure reason.',
      },
      {
        order: 12,
        description: 'Review extracted data quality',
        category: 'review',
        notes: 'Check draft transactions created by Magic API — verify contact, amounts, line items, dates are correct.',
        verification: 'Flag any transactions that need manual correction.',
      },
      {
        order: 13,
        description: 'Generate ingestion summary',
        category: 'report',
        notes: 'Document: total files, uploaded, skipped, failed. List errors for retry.',
      },
    ],
  };

  const phases = [intake, scan, classify, review, upload, verify];

  return {
    jobType: 'document-collection',
    period: 'current',
    currency,
    mode: 'standalone',
    phases,
    summary: buildSummary(phases),
  };
}
