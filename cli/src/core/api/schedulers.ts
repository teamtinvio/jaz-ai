import type { JazClient } from './client.js';
import type { PaginatedResponse, PaginationParams } from './types.js';

export interface Scheduler {
  resourceId: string;
  status: string;
  repeat?: string;           // field name used in create/update requests
  interval?: string;         // field name returned in responses (same value as repeat)
  startDate: string;
  endDate?: string;
  nextScheduleDate?: string;
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

// ── Scheduled Invoice CRUD ───────────────────────────────────────

export async function getScheduledInvoice(
  client: JazClient,
  resourceId: string,
): Promise<{ data: Scheduler }> {
  return client.get(`/api/v1/scheduled/invoices/${resourceId}`);
}

/**
 * Update a scheduled invoice.
 * Accepts scheduling fields (repeat, startDate, endDate, status) AND the full
 * invoice template (invoice: { reference, valueDate, dueDate, contactResourceId, lineItems, ... }).
 */
export async function updateScheduledInvoice(
  client: JazClient,
  resourceId: string,
  data: Record<string, unknown>,
): Promise<{ data: Scheduler }> {
  return client.put(`/api/v1/scheduled/invoices/${resourceId}`, data);
}

export async function deleteScheduledInvoice(
  client: JazClient,
  resourceId: string,
): Promise<void> {
  await client.delete(`/api/v1/scheduled/invoices/${resourceId}`);
}

// ── Scheduled Bill CRUD ──────────────────────────────────────────

export async function getScheduledBill(
  client: JazClient,
  resourceId: string,
): Promise<{ data: Scheduler }> {
  return client.get(`/api/v1/scheduled/bills/${resourceId}`);
}

/**
 * Update a scheduled bill.
 * Accepts scheduling fields (repeat, startDate, endDate, status) AND the full
 * bill template (bill: { reference, valueDate, dueDate, contactResourceId, lineItems, ... }).
 */
export async function updateScheduledBill(
  client: JazClient,
  resourceId: string,
  data: Record<string, unknown>,
): Promise<{ data: Scheduler }> {
  return client.put(`/api/v1/scheduled/bills/${resourceId}`, data);
}

export async function deleteScheduledBill(
  client: JazClient,
  resourceId: string,
): Promise<void> {
  await client.delete(`/api/v1/scheduled/bills/${resourceId}`);
}

// ── Scheduled Journal CRUD ───────────────────────────────────────

export async function getScheduledJournal(
  client: JazClient,
  resourceId: string,
): Promise<{ data: Scheduler }> {
  return client.get(`/api/v1/scheduled/journals/${resourceId}`);
}

/**
 * Update a scheduled journal.
 * Accepts scheduling fields (repeat, startDate, endDate, status) AND the full
 * journal template (valueDate, schedulerEntries, reference, notes).
 */
export async function updateScheduledJournal(
  client: JazClient,
  resourceId: string,
  data: Record<string, unknown>,
): Promise<{ data: Scheduler }> {
  return client.put(`/api/v1/scheduled/journals/${resourceId}`, data);
}

export async function deleteScheduledJournal(
  client: JazClient,
  resourceId: string,
): Promise<void> {
  await client.delete(`/api/v1/scheduled/journals/${resourceId}`);
}
