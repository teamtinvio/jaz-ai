import type { JazClient } from './client.js';
import type {
  JournalEntry, CurrencyExchangeRate,
  CashflowTransaction, PaginatedResponse, PaginationParams,
} from './types.js';

// ── Shared type ──────────────────────────────────────────────────

export interface CashEntryCreateData {
  reference?: string;
  valueDate: string;
  accountResourceId: string;
  lines: JournalEntry[];
  notes?: string;
  currency?: CurrencyExchangeRate;
  saveAsDraft?: boolean;
}

// ── Factory (cash-in and cash-out differ only by path segment) ──

function cashEntryApi(segment: 'cash-in-entries' | 'cash-out-entries') {
  const base = `/api/v1/${segment}`;

  return {
    create: (client: JazClient, data: CashEntryCreateData): Promise<{ data: unknown }> =>
      client.post(base, { ...data, saveAsDraft: data.saveAsDraft ?? false }),

    list: (client: JazClient, params?: PaginationParams): Promise<PaginatedResponse<CashflowTransaction>> =>
      client.list<CashflowTransaction>(base, params),

    get: (client: JazClient, resourceId: string): Promise<{ data: CashflowTransaction }> =>
      client.get(`${base}/${resourceId}`),

    update: async (client: JazClient, resourceId: string, data: Record<string, unknown>): Promise<{ data: unknown }> => {
      const payload = { ...data };
      // API requires accountResourceId on PUT — auto-fetch from existing entry if not provided
      if (!payload.accountResourceId) {
        const existing: { data: CashflowTransaction } = await client.get(`${base}/${resourceId}`);
        payload.accountResourceId = existing.data.organizationAccountResourceId ?? existing.data.account?.resourceId;
        if (!payload.accountResourceId) throw new Error(`accountResourceId required for ${segment} update and could not be derived from existing entry`);
      }
      return client.put(`${base}/${resourceId}`, payload);
    },
  };
}

const cashIn = cashEntryApi('cash-in-entries');
const cashOut = cashEntryApi('cash-out-entries');

// ── Public exports (preserve existing names for all consumers) ──

export const createCashIn = cashIn.create;
export const listCashIn = cashIn.list;
export const getCashIn = cashIn.get;
export const updateCashIn = cashIn.update;

export const createCashOut = cashOut.create;
export const listCashOut = cashOut.list;
export const getCashOut = cashOut.get;
export const updateCashOut = cashOut.update;
