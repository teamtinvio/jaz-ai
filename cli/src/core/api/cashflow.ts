import type { JazClient } from './client.js';
import type {
  CashflowTransaction, PaginatedResponse, SearchParams,
} from './types.js';

export async function deleteCashEntry(
  client: JazClient,
  resourceId: string,
): Promise<void> {
  await client.delete(`/api/v1/cash-entries/${resourceId}`);
}

export async function searchCashflowTransactions(
  client: JazClient,
  params: SearchParams,
): Promise<PaginatedResponse<CashflowTransaction>> {
  return client.search<CashflowTransaction>('/api/v1/cashflow-transactions/search', params);
}
