import type { JazClient } from './client.js';
import type { PaginatedResponse, StringFilter, DateFilter } from './types.js';

// ── Request Types ────────────────────────────────────────────────

export type MagicDocumentType =
  | 'INVOICE'
  | 'BILL'
  | 'CUSTOMER_CREDIT_NOTE'
  | 'SUPPLIER_CREDIT_NOTE';

export type MagicWorkflowDocumentType =
  | 'SALE'
  | 'PURCHASE'
  | 'SALE_CREDIT_NOTE'
  | 'PURCHASE_CREDIT_NOTE'
  | 'BANK_STATEMENT';

export type MagicWorkflowStatus = 'SUBMITTED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

// ── Response Types ───────────────────────────────────────────────

export interface MagicFileDetails {
  fileId: string;
  fileType: string;
  fileUrl: string;
  fileName: string;
}

export interface MagicFileResult {
  workflowResourceId: string;
  subscriptionFBPath: string;
  errorCode: string | null;
  errorMessage: string | null;
  fileDetails: MagicFileDetails;
}

export interface MagicCreateResponseData {
  businessTransactionType: 'SALE' | 'PURCHASE' | 'SALE_CREDIT_NOTE' | 'PURCHASE_CREDIT_NOTE';
  filename: string;
  validFiles: MagicFileResult[];
  invalidFiles: MagicFileResult[];
}

export interface MagicCreateResponse {
  data: MagicCreateResponseData;
}

export interface MagicWorkflowBTDetails {
  businessTransactionResourceId: string;
  ocrJobType: string;
  parentResourceId?: string;
  workflowStatus: string;
}

export interface MagicWorkflowBankDetails {
  accountNumber?: string;
  importedDate?: string;
  organizationAccountResourceId?: string;
  recordsCount?: number;
  statementEndDate?: string;
  statementStartDate?: string;
  statementStatus?: string;
}

export interface MagicWorkflowItem {
  resourceId: string;
  documentType: string;
  status: MagicWorkflowStatus;
  fileName: string;
  fileType: string;
  fileUrl: string;
  fileId: string;
  createdAt: string;
  updatedAt: string;
  batchId?: string;
  failureReason?: string;
  businessTransactionDetails?: MagicWorkflowBTDetails;
  bankStatementDetails?: MagicWorkflowBankDetails;
}

// ── Search Filter ────────────────────────────────────────────────

export interface MagicWorkflowSearchFilter {
  resourceId?: StringFilter;
  documentType?: MagicWorkflowDocumentType[];
  status?: MagicWorkflowStatus[];
  fileName?: StringFilter;
  fileType?: string[];
  createdAt?: DateFilter;
}

export interface MagicWorkflowSearchParams {
  filter?: MagicWorkflowSearchFilter;
  limit?: number;
  offset?: number;
  sort?: { sortBy: string[]; order: 'ASC' | 'DESC' };
}

// ── API Functions ────────────────────────────────────────────────

/**
 * Upload a file or URL to create a draft business transaction via OCR extraction.
 * Processing is async — response returns immediately with workflowResourceId.
 * Use searchMagicWorkflows() to check status.
 */
export async function createFromAttachment(
  client: JazClient,
  data: {
    businessTransactionType: MagicDocumentType;
    sourceFile?: Blob;
    sourceFileName?: string;
    sourceUrl?: string;
    attachmentId?: string;
  },
): Promise<MagicCreateResponse> {
  const formData = new FormData();
  formData.append('businessTransactionType', data.businessTransactionType);
  formData.append('sourceType', data.sourceFile ? 'FILE' : 'URL');
  if (data.sourceFile) formData.append('sourceFile', data.sourceFile, data.sourceFileName ?? 'file');
  if (data.sourceUrl) formData.append('sourceUrl', data.sourceUrl);
  if (data.attachmentId) formData.append('attachmentId', data.attachmentId);
  return client.postMultipart(
    '/api/v1/magic/createBusinessTransactionFromAttachment',
    formData,
  );
}

/**
 * Search magic workflow tasks — BT extractions and bank statement imports.
 * Filter by resourceId, documentType, status, fileName, fileType, createdAt.
 */
export async function searchMagicWorkflows(
  client: JazClient,
  params: MagicWorkflowSearchParams = {},
): Promise<PaginatedResponse<MagicWorkflowItem>> {
  const body: Record<string, unknown> = {};
  if (params.filter) body.filter = params.filter;
  if (params.limit !== undefined) body.limit = params.limit;
  if (params.offset !== undefined) body.offset = params.offset;
  if (params.sort) {
    body.sort = params.sort;
  } else if (params.offset !== undefined) {
    body.sort = { sortBy: ['createdAt'], order: 'DESC' };
  }
  return client.post('/api/v1/magic/workflows/search', body);
}

/**
 * Poll multiple workflows until all reach a terminal state (COMPLETED or FAILED).
 * Returns the final state of all workflows.
 */
export async function waitForWorkflows(
  client: JazClient,
  workflowIds: string[],
  options: {
    interval?: number;
    timeout?: number;
    onPoll?: (results: MagicWorkflowItem[]) => void;
  } = {},
): Promise<MagicWorkflowItem[]> {
  const interval = options.interval ?? 60_000;
  const timeout = options.timeout ?? 600_000;
  const terminalStatuses = new Set<string>(['COMPLETED', 'FAILED']);
  const startTime = Date.now();

  const results = new Map<string, MagicWorkflowItem>();

  while (true) {
    // Fetch status for all IDs
    for (const id of workflowIds) {
      const res = await searchMagicWorkflows(client, {
        filter: { resourceId: { eq: id } },
        limit: 1,
      });
      if (res.data.length > 0) {
        results.set(id, res.data[0]);
      }
    }

    if (options.onPoll) {
      options.onPoll(Array.from(results.values()));
    }

    // Check if all are terminal
    const allTerminal = workflowIds.every((id) => {
      const item = results.get(id);
      return item && terminalStatuses.has(item.status);
    });

    if (allTerminal) {
      return workflowIds.map((id) => results.get(id)!);
    }

    // Check timeout
    if (Date.now() - startTime >= timeout) {
      throw new Error(
        `Timeout waiting for workflows after ${Math.round(timeout / 1000)}s. ` +
        `${results.size - [...results.values()].filter((r) => terminalStatuses.has(r.status)).length} still processing.`,
      );
    }

    await new Promise((resolve) => setTimeout(resolve, interval));
  }
}
