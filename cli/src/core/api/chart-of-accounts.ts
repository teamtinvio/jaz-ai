import type { JazClient } from './client.js';
import type { Account, PaginatedResponse, PaginationParams, SearchParams } from './types.js';

export async function listAccounts(
  client: JazClient,
  params?: PaginationParams,
): Promise<PaginatedResponse<Account>> {
  return client.list<Account>('/api/v1/chart-of-accounts', params);
}

export async function searchAccounts(
  client: JazClient,
  params: SearchParams,
): Promise<PaginatedResponse<Account>> {
  return client.search<Account>('/api/v1/chart-of-accounts/search', params);
}

export async function createAccount(
  client: JazClient,
  data: {
    code: string;
    name: string;
    accountType: string;
    status?: string;
    currencyCode?: string;
  },
): Promise<{ data: Account }> {
  return client.post('/api/v1/chart-of-accounts', data);
}

export async function updateAccount(
  client: JazClient,
  resourceId: string,
  data: Partial<{ code: string; name: string; status: string }>,
): Promise<{ data: Account }> {
  return client.put(`/api/v1/chart-of-accounts/${resourceId}`, data);
}

export async function bulkUpsertAccounts(
  client: JazClient,
  accounts: Array<{
    code: string;
    name: string;
    accountType: string;
    status?: string;
    currencyCode?: string;
  }>,
): Promise<{ data: Account[] }> {
  return client.post('/api/v1/chart-of-accounts/bulk-upsert', { data: accounts });
}

export async function deleteAccount(
  client: JazClient,
  resourceId: string,
): Promise<void> {
  await client.delete(`/api/v1/chart-of-accounts/${resourceId}`);
}
