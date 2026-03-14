import type { JazClient } from './client.js';
import type { PaginatedResponse, SearchParams } from './types.js';

/**
 * Cashflow transaction record — returned by POST /cashflow-transactions/search.
 * This is the unified transaction ledger (invoices, bills, credit notes,
 * journals, cash entries, payments).
 */
export interface CashflowTransaction {
  resourceId: string;
  businessTransactionReference: string;
  businessTransactionResourceId: string;
  businessTransactionType: string;
  direction: string;
  valueDate: number; // epoch ms
  totalAmount: number;
  balanceAmount: number;
  description: string;
  organizationAccountResourceId: string;
}

/**
 * List recent cashflow transactions (payments, invoices, bills, etc.).
 * Uses POST /cashflow-transactions/search — no standalone /payments list exists.
 */
export async function listPayments(
  client: JazClient,
  params?: { limit?: number; offset?: number },
): Promise<PaginatedResponse<CashflowTransaction>> {
  return client.search<CashflowTransaction>('/api/v1/cashflow-transactions/search', {
    limit: params?.limit ?? 100,
    offset: params?.offset ?? 0,
    sort: { sortBy: ['valueDate'], order: 'DESC' },
  });
}

/**
 * Search cashflow transactions with filters.
 * Supports: valueDate, businessTransactionType, direction, etc.
 */
export async function searchPayments(
  client: JazClient,
  params: SearchParams,
): Promise<PaginatedResponse<CashflowTransaction>> {
  return client.search<CashflowTransaction>('/api/v1/cashflow-transactions/search', params);
}

// ── Individual Payment CRUD ──────────────────────────────────────

export interface PaymentRecord {
  resourceId: string;
  reference: string;
  paymentAmount: number;
  transactionAmount: number;
  valueDate: string;
  paymentMethod: string;
  status: string;
  type: string;
  accountResourceId: string;
  crossCurrency: boolean;
  currencyCode: string;
  feeAmount: number;
}

export async function getPayment(
  client: JazClient,
  resourceId: string,
): Promise<{ data: PaymentRecord }> {
  return client.get(`/api/v1/payments/${resourceId}`);
}

export async function updatePayment(
  client: JazClient,
  resourceId: string,
  data: Partial<{
    paymentAmount: number;
    reference: string;
    valueDate: string;
    paymentMethod: string;
    accountResourceId: string;
    currency: { sourceCurrency: string; exchangeRate: number };
    transactionFee: number;
    transactionFeeCollected: boolean;
  }>,
): Promise<{ data: PaymentRecord }> {
  return client.put(`/api/v1/payments/${resourceId}`, data);
}

export async function deletePayment(
  client: JazClient,
  resourceId: string,
): Promise<void> {
  await client.delete(`/api/v1/payments/${resourceId}`);
}
