import type { JazClient } from './client.js';
import type {
  JournalEntry, CurrencyExchangeRate,
  CashflowTransaction, PaginatedResponse, PaginationParams,
} from './types.js';

export async function createCashTransfer(
  client: JazClient,
  data: {
    reference?: string;
    valueDate: string;
    cashOut: {
      accountResourceId: string;
      journalEntries: JournalEntry[];
    };
    cashIn: {
      accountResourceId: string;
      journalEntries: JournalEntry[];
    };
    currency?: CurrencyExchangeRate;
    saveAsDraft?: boolean;
  },
): Promise<{ data: unknown }> {
  return client.post('/api/v1/cash-transfer-journals', {
    ...data,
    saveAsDraft: data.saveAsDraft ?? true,
  });
}

export async function listCashTransfers(
  client: JazClient,
  params?: PaginationParams,
): Promise<PaginatedResponse<CashflowTransaction>> {
  return client.list<CashflowTransaction>('/api/v1/cash-transfer-journals', params);
}

export async function getCashTransfer(
  client: JazClient,
  resourceId: string,
): Promise<{ data: CashflowTransaction }> {
  return client.get(`/api/v1/cash-transfer-journals/${resourceId}`);
}
