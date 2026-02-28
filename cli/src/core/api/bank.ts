import type { JazClient } from './client.js';
import type { BankAccount, BankRecord, PaginatedResponse, PaginationParams } from './types.js';

/**
 * List bank accounts. Note: GET /bank-accounts returns a flat array
 * (not paginated { data, totalElements }), so we normalize to
 * PaginatedResponse for consistency with all other list commands.
 */
export async function listBankAccounts(
  client: JazClient,
  _params?: PaginationParams,
): Promise<PaginatedResponse<BankAccount>> {
  const raw = await client.get<BankAccount[] | PaginatedResponse<BankAccount>>('/api/v1/bank-accounts');
  if (Array.isArray(raw)) {
    return { data: raw, totalElements: raw.length, totalPages: 1 };
  }
  return raw;
}

export async function getBankAccount(
  client: JazClient,
  resourceId: string,
): Promise<{ data: BankAccount }> {
  return client.get(`/api/v1/bank-accounts/${resourceId}`);
}

export async function searchBankRecords(
  client: JazClient,
  accountResourceId: string,
  params: {
    filter?: Record<string, unknown>;
    sort?: { sortBy: string[]; order: 'ASC' | 'DESC' };
    limit?: number;
    offset?: number;
  },
): Promise<PaginatedResponse<BankRecord>> {
  return client.post(`/api/v1/bank-records/${accountResourceId}/search`, params);
}

export async function importBankStatement(
  client: JazClient,
  data: {
    businessTransactionType: string;
    accountResourceId: string;
    sourceFile?: Blob;
    sourceFileName?: string;
    sourceUrl?: string;
    attachmentId?: string;
  },
): Promise<{ data: unknown }> {
  const formData = new FormData();
  formData.append('businessTransactionType', data.businessTransactionType);
  formData.append('accountResourceId', data.accountResourceId);
  formData.append('sourceType', data.sourceFile ? 'FILE' : 'URL');
  if (data.sourceFile) formData.append('sourceFile', data.sourceFile, data.sourceFileName ?? 'file');
  if (data.sourceUrl) formData.append('sourceUrl', data.sourceUrl);
  if (data.attachmentId) formData.append('attachmentId', data.attachmentId);
  return client.postMultipart('/api/v1/magic/importBankStatementFromAttachment', formData);
}
