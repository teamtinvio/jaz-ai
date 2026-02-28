import type { JazClient } from './client.js';
import type { Bookmark, PaginatedResponse, PaginationParams } from './types.js';

export async function listBookmarks(
  client: JazClient,
  params?: PaginationParams,
): Promise<PaginatedResponse<Bookmark>> {
  return client.list<Bookmark>('/api/v1/organization/bookmarks', params);
}

export async function getBookmark(
  client: JazClient,
  resourceId: string,
): Promise<{ data: Bookmark }> {
  return client.get(`/api/v1/organization/bookmarks/${resourceId}`);
}

export async function createBookmarks(
  client: JazClient,
  items: Array<{ name: string; value: string; categoryCode: string; datatypeCode?: string }>,
): Promise<{ data: Bookmark[] }> {
  return client.post('/api/v1/organization/bookmarks', { items });
}

export async function updateBookmark(
  client: JazClient,
  resourceId: string,
  data: Partial<{ name: string; value: string; categoryCode: string }>,
): Promise<{ data: Bookmark }> {
  return client.put(`/api/v1/organization/bookmarks/${resourceId}`, data);
}
