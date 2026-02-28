/**
 * Upload orchestrator for document-collection ingest.
 *
 * Takes a classified IngestPlan + authenticated JazClient,
 * uploads each file to the correct Magic API endpoint:
 *   INVOICE / BILL / CUSTOMER_CREDIT_NOTE / SUPPLIER_CREDIT_NOTE → createBusinessTransactionFromAttachment
 *   BANK_STATEMENT → importBankStatementFromAttachment
 *
 * Continues on failure — records per-file status, never aborts mid-batch.
 */

import { readFileSync } from 'node:fs';
import { extname } from 'node:path';
import type { JazClient } from '../../../../api/client.js';
import { createFromAttachment } from '../../../../api/magic.js';
import { importBankStatement } from '../../../../api/bank.js';
import { decryptPdf, cleanupDecryptedFile } from './decrypt.js';
import type { IngestPlan, DocumentType, FileUploadResult, UploadResult } from '../../../types.js';

/** Extension → MIME type for multipart uploads. */
const MIME_MAP: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.csv': 'text/csv',
  '.ofx': 'application/x-ofx',
};

export interface UploadOptions {
  plan: IngestPlan;
  client: JazClient;
  bankAccountId?: string;
  /** Optional progress callback — called after each file. */
  onProgress?: (result: FileUploadResult, index: number, total: number) => void;
}

/**
 * Upload all classified files from an IngestPlan.
 *
 * Only uploads files with a classified documentType (INVOICE, BILL,
 * CUSTOMER_CREDIT_NOTE, SUPPLIER_CREDIT_NOTE, or BANK_STATEMENT).
 * UNKNOWN and SKIPPED files are excluded.
 */
export async function uploadClassifiedFiles(opts: UploadOptions): Promise<UploadResult> {
  const { plan, client, bankAccountId, onProgress } = opts;

  // Collect all uploadable files across folders
  const uploadable = plan.folders.flatMap((folder) =>
    folder.files.filter(
      (f) => f.documentType === 'INVOICE' || f.documentType === 'BILL' || f.documentType === 'CUSTOMER_CREDIT_NOTE' || f.documentType === 'SUPPLIER_CREDIT_NOTE' || f.documentType === 'BANK_STATEMENT',
    ),
  );

  const results: FileUploadResult[] = [];

  for (let i = 0; i < uploadable.length; i++) {
    const file = uploadable[i];
    const docType = file.documentType as DocumentType;

    let decryptedPath: string | undefined;
    try {
      // Decrypt encrypted PDFs using password from filename (__pw__ pattern)
      let effectivePath = file.absolutePath;
      if (file.encrypted && file.filePassword) {
        decryptedPath = decryptPdf(file.absolutePath, file.filePassword);
        effectivePath = decryptedPath;
      }

      // Read file into a Blob with correct MIME type (required by the Magic API)
      const buffer = readFileSync(effectivePath);
      const ext = extname(file.filename).toLowerCase();
      const mime = MIME_MAP[ext];
      if (!mime) {
        throw new Error(`Unsupported file extension "${ext}" — expected one of: ${Object.keys(MIME_MAP).join(', ')}`);
      }
      const blob = new Blob([buffer], { type: mime });

      let response: unknown;

      if (docType === 'BANK_STATEMENT') {
        const res = await importBankStatement(client, {
          businessTransactionType: docType,
          accountResourceId: bankAccountId!,
          sourceFile: blob,
          sourceFileName: file.filename,
        });
        response = res.data;
      } else {
        // INVOICE, BILL, CUSTOMER_CREDIT_NOTE, or SUPPLIER_CREDIT_NOTE
        const res = await createFromAttachment(client, {
          businessTransactionType: docType,
          sourceFile: blob,
          sourceFileName: file.filename,
        });
        response = res.data;
      }

      const result: FileUploadResult = {
        file: `${file.folder}/${file.filename}`,
        type: docType,
        status: 'uploaded',
        response,
      };
      results.push(result);
      onProgress?.(result, i, uploadable.length);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      const result: FileUploadResult = {
        file: `${file.folder}/${file.filename}`,
        type: docType,
        status: 'failed',
        error: errMsg,
      };
      results.push(result);
      onProgress?.(result, i, uploadable.length);
    } finally {
      if (decryptedPath) cleanupDecryptedFile(decryptedPath);
    }
  }

  return {
    total: uploadable.length,
    success: results.filter((r) => r.status === 'uploaded').length,
    failed: results.filter((r) => r.status === 'failed').length,
    results,
  };
}

// Re-export bank account resolution from shared intelligence layer (DRY)
export { resolveBankAccount } from '../../../../intelligence/bank-resolver.js';
