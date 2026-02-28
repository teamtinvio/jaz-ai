import type { JazClient } from './client.js';
import type { PaginatedResponse, PaginationParams } from './types.js';

export interface Scheduler {
  resourceId: string;
  status: string;
  repeat: string;
  startDate: string;
  endDate?: string;
  businessTransactionType: string;
}

export async function listScheduledInvoices(
  client: JazClient,
  params?: PaginationParams,
): Promise<PaginatedResponse<Scheduler>> {
  return client.list<Scheduler>('/api/v1/scheduled/invoices', params);
}

export async function listScheduledBills(
  client: JazClient,
  params?: PaginationParams,
): Promise<PaginatedResponse<Scheduler>> {
  return client.list<Scheduler>('/api/v1/scheduled/bills', params);
}

export async function listScheduledJournals(
  client: JazClient,
  params?: PaginationParams,
): Promise<PaginatedResponse<Scheduler>> {
  return client.list<Scheduler>('/api/v1/scheduled/journals', params);
}
