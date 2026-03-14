import type { JazClient } from './client.js';
import type {
  CashflowTransaction, PaginatedResponse, PaginationParams,
} from './types.js';

export async function createCashTransfer(
  client: JazClient,
  data: {
    reference?: string;
    valueDate: string;
    cashOut: {
      accountResourceId: string;
      amount?: number;
    };
    cashIn: {
      accountResourceId: string;
      amount?: number;
    };
    saveAsDraft?: boolean;
  },
): Promise<{ data: unknown }> {
  return client.post('/api/v1/cash-transfers', {
    ...data,
    saveAsDraft: data.saveAsDraft ?? false,
  });
}

export async function listCashTransfers(
  client: JazClient,
  params?: PaginationParams,
): Promise<PaginatedResponse<CashflowTransaction>> {
  return client.list<CashflowTransaction>('/api/v1/cash-transfers', params);
}

export async function getCashTransfer(
  client: JazClient,
  resourceId: string,
): Promise<{ data: CashflowTransaction }> {
  return client.get(`/api/v1/cash-transfers/${resourceId}`);
}
