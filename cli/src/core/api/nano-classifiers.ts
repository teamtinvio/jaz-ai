import type { JazClient } from './client.js';
import type { PaginatedResponse, PaginationParams, SearchParams } from './types.js';

export interface NanoClassifierClass {
  className: string;
  resourceId: string;
}

export interface NanoClassifier {
  resourceId: string;
  type: string;
  printable: boolean;
  classes: NanoClassifierClass[];
}

export async function listNanoClassifiers(
  client: JazClient,
  params?: PaginationParams,
): Promise<PaginatedResponse<NanoClassifier>> {
  return client.list<NanoClassifier>('/api/v1/nano-classifiers', params);
}

/**
 * Get a nano classifier by resourceId.
 * API returns double-wrapped: `{ data: { data: [...], totalElements, totalPages } }`.
 * Extract the first element from the inner paginated response.
 */
export async function getNanoClassifier(
  client: JazClient,
  resourceId: string,
): Promise<{ data: NanoClassifier }> {
  const res = await client.get<{ data: PaginatedResponse<NanoClassifier> }>(`/api/v1/nano-classifiers/${resourceId}`);
  return { data: res.data.data[0] };
}

export async function searchNanoClassifiers(
  client: JazClient,
  params: SearchParams,
): Promise<PaginatedResponse<NanoClassifier>> {
  return client.search<NanoClassifier>('/api/v1/nano-classifiers/search', params);
}

/**
 * Create a nano classifier.
 * API expects `classes: string[]` (simple string array, not `[{className}]`)
 * and `printable: boolean` is required.
 */
export async function createNanoClassifier(
  client: JazClient,
  data: { type: string; classes: string[]; printable?: boolean },
): Promise<{ data: NanoClassifier }> {
  return client.post('/api/v1/nano-classifiers', {
    ...data,
    printable: data.printable ?? false,
  });
}

/**
 * Update a nano classifier.
 * `classes` can be either string[] (new class names) or
 * NanoClassifierClass[] (existing classes with resourceIds).
 */
export async function updateNanoClassifier(
  client: JazClient,
  resourceId: string,
  data: { type?: string; classes?: string[] | NanoClassifierClass[]; printable?: boolean },
): Promise<{ data: NanoClassifier }> {
  return client.put(`/api/v1/nano-classifiers/${resourceId}`, data);
}

export async function deleteNanoClassifier(
  client: JazClient,
  resourceId: string,
): Promise<void> {
  await client.delete(`/api/v1/nano-classifiers/${resourceId}`);
}
