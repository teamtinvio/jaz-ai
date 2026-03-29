import type { JazClient } from './client.js';

export interface SearchResult {
  contacts?: unknown[];
  invoices?: unknown[];
  bills?: unknown[];
  credit_notes?: unknown[];
  journals?: unknown[];
  items?: unknown[];
  capsules?: unknown[];
}

export async function universalSearch(
  client: JazClient,
  params: { query: string; limit?: number },
): Promise<{ data: SearchResult }> {
  const qs = new URLSearchParams({ query: params.query });
  if (params.limit) qs.set('limit', String(params.limit));
  return client.get(`/api/v1/search?${qs.toString()}`);
}
