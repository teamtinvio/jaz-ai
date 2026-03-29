import type { JazClient } from './client.js';
import type { BankRule, PaginatedResponse, PaginationParams, SearchParams } from './types.js';

export async function listBankRules(
  client: JazClient,
  params?: PaginationParams,
): Promise<PaginatedResponse<BankRule>> {
  return client.list<BankRule>('/api/v1/bank-rules', params);
}

export async function getBankRule(
  client: JazClient,
  resourceId: string,
): Promise<{ data: BankRule }> {
  // GET /bank-rules/:id returns { data: { data: [...], totalElements, totalPages } } (double-nested).
  // We unwrap to match the standard { data: T } pattern.
  const raw = await client.get<unknown>(`/api/v1/bank-rules/${resourceId}`);
  // Shape A: double-nested { data: { data: [BankRule], totalElements, totalPages } }
  const a = raw as { data?: { data?: BankRule[] } };
  if (a?.data && Array.isArray(a.data.data) && a.data.data.length > 0) {
    return { data: a.data.data[0] };
  }
  // Shape B: standard { data: BankRule }
  const b = raw as { data?: BankRule };
  if (b?.data && typeof b.data === 'object' && b.data !== null && 'resourceId' in b.data) {
    return { data: b.data };
  }
  throw new Error(`Unexpected response shape from GET /bank-rules/${resourceId}`);
}

export async function searchBankRules(
  client: JazClient,
  params: SearchParams,
): Promise<PaginatedResponse<BankRule>> {
  return client.search<BankRule>('/api/v1/bank-rules/search', params);
}

export async function createBankRule(
  client: JazClient,
  data: {
    name: string;
    actionType?: string;
    appliesToReconciliationAccount: string;
    configuration: Record<string, unknown>;
  },
): Promise<{ data: BankRule }> {
  return client.post('/api/v1/bank-rules', data);
}

export async function updateBankRule(
  client: JazClient,
  resourceId: string,
  data: {
    resourceId: string;
    name: string;
    appliesToReconciliationAccount: string;
    configuration: Record<string, unknown>;
  },
): Promise<{ data: BankRule }> {
  return client.put(`/api/v1/bank-rules/${resourceId}`, data);
}

export async function deleteBankRule(
  client: JazClient,
  resourceId: string,
): Promise<void> {
  await client.delete(`/api/v1/bank-rules/${resourceId}`);
}
