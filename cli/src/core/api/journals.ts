import type { JazClient } from './client.js';
import type {
  Journal, JournalEntry,
  PaginatedResponse, PaginationParams, SearchParams,
} from './types.js';

export async function listJournals(
  client: JazClient,
  params?: PaginationParams,
): Promise<PaginatedResponse<Journal>> {
  return client.list<Journal>('/api/v1/journals', params);
}

export async function searchJournals(
  client: JazClient,
  params: SearchParams,
): Promise<PaginatedResponse<Journal>> {
  return client.search<Journal>('/api/v1/journals/search', params);
}

export async function createJournal(
  client: JazClient,
  data: {
    reference?: string;
    valueDate: string;
    journalEntries: JournalEntry[];
    notes?: string;
    saveAsDraft?: boolean;
  },
): Promise<{ data: Journal }> {
  return client.post('/api/v1/journals', {
    ...data,
    saveAsDraft: data.saveAsDraft ?? true,
  });
}

export async function deleteJournal(
  client: JazClient,
  resourceId: string,
): Promise<void> {
  await client.delete(`/api/v1/journals/${resourceId}`);
}

export async function getJournal(
  client: JazClient,
  resourceId: string,
): Promise<{ data: Journal }> {
  return client.get(`/api/v1/journals/${resourceId}`);
}

export async function updateJournal(
  client: JazClient,
  resourceId: string,
  data: {
    reference?: string;
    valueDate?: string;
    journalEntries?: JournalEntry[];
    notes?: string;
    saveAsDraft?: boolean;
  },
): Promise<{ data: Journal }> {
  return client.put(`/api/v1/journals/${resourceId}`, data);
}

/**
 * Finalize a draft journal: update fields + set saveAsDraft=false in one PUT.
 */
export async function finalizeJournal(
  client: JazClient,
  resourceId: string,
  data: Partial<{
    reference: string;
    valueDate: string;
    journalEntries: JournalEntry[];
    notes: string;
  }>,
): Promise<{ data: Journal }> {
  return client.put(`/api/v1/journals/${resourceId}`, {
    ...data,
    resourceId,
    saveAsDraft: false,
  });
}

export async function createScheduledJournal(
  client: JazClient,
  data: {
    status: string;
    startDate: string;
    endDate?: string;
    repeat: string;
    schedulerEntries: JournalEntry[];
    reference?: string;
    notes?: string;
  },
): Promise<{ data: unknown }> {
  return client.post('/api/v1/scheduled/journals', data);
}
