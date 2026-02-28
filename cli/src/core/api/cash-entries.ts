import type { JazClient } from './client.js';
import type {
  JournalEntry, CurrencyExchangeRate,
  CashflowTransaction, PaginatedResponse, PaginationParams,
} from './types.js';

// ── Cash-In ─────────────────────────────────────────────────────

export async function createCashIn(
  client: JazClient,
  data: {
    reference?: string;
    valueDate: string;
    accountResourceId: string;
    journalEntries: JournalEntry[];
    notes?: string;
    currency?: CurrencyExchangeRate;
    saveAsDraft?: boolean;
  },
): Promise<{ data: unknown }> {
  return client.post('/api/v1/cash-in-journals', {
    ...data,
    saveAsDraft: data.saveAsDraft ?? true,
  });
}

export async function listCashIn(
  client: JazClient,
  params?: PaginationParams,
): Promise<PaginatedResponse<CashflowTransaction>> {
  return client.list<CashflowTransaction>('/api/v1/cash-in-journals', params);
}

export async function getCashIn(
  client: JazClient,
  resourceId: string,
): Promise<{ data: CashflowTransaction }> {
  return client.get(`/api/v1/cash-in-journals/${resourceId}`);
}

export async function updateCashIn(
  client: JazClient,
  resourceId: string,
  data: Record<string, unknown>,
): Promise<{ data: unknown }> {
  return client.put(`/api/v1/cash-in-journals/${resourceId}`, data);
}

// ── Cash-Out ────────────────────────────────────────────────────

export async function createCashOut(
  client: JazClient,
  data: {
    reference?: string;
    valueDate: string;
    accountResourceId: string;
    journalEntries: JournalEntry[];
    notes?: string;
    currency?: CurrencyExchangeRate;
    saveAsDraft?: boolean;
  },
): Promise<{ data: unknown }> {
  return client.post('/api/v1/cash-out-journals', {
    ...data,
    saveAsDraft: data.saveAsDraft ?? true,
  });
}

export async function listCashOut(
  client: JazClient,
  params?: PaginationParams,
): Promise<PaginatedResponse<CashflowTransaction>> {
  return client.list<CashflowTransaction>('/api/v1/cash-out-journals', params);
}

export async function getCashOut(
  client: JazClient,
  resourceId: string,
): Promise<{ data: CashflowTransaction }> {
  return client.get(`/api/v1/cash-out-journals/${resourceId}`);
}

export async function updateCashOut(
  client: JazClient,
  resourceId: string,
  data: Record<string, unknown>,
): Promise<{ data: unknown }> {
  return client.put(`/api/v1/cash-out-journals/${resourceId}`, data);
}
