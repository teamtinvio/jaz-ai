import type { JazClient } from './client.js';
import type { PaginatedResponse, PaginationParams, SearchParams } from './types.js';

export interface Tag {
  resourceId: string;
  name: string;
}

export async function listTags(
  client: JazClient,
  params?: PaginationParams,
): Promise<PaginatedResponse<Tag>> {
  return client.list<Tag>('/api/v1/tags', params);
}

export async function getTag(
  client: JazClient,
  resourceId: string,
): Promise<{ data: Tag }> {
  return client.get(`/api/v1/tags/${resourceId}`);
}

export async function searchTags(
  client: JazClient,
  params: SearchParams,
): Promise<PaginatedResponse<Tag>> {
  return client.search<Tag>('/api/v1/tags/search', params);
}

export async function createTag(
  client: JazClient,
  data: { name: string },
): Promise<{ data: Tag }> {
  return client.post('/api/v1/tags', data);
}

export async function deleteTag(
  client: JazClient,
  resourceId: string,
): Promise<void> {
  await client.delete(`/api/v1/tags/${resourceId}`);
}
