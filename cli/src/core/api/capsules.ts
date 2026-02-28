import type { JazClient } from './client.js';
import type { Capsule, CapsuleType, PaginatedResponse, PaginationParams, SearchParams } from './types.js';

// ── Capsule Types ───────────────────────────────────────────────

export async function listCapsuleTypes(
  client: JazClient,
): Promise<{ data: CapsuleType[] }> {
  return client.get('/api/v1/capsuleTypes');
}

export async function searchCapsuleTypes(
  client: JazClient,
  params: SearchParams,
): Promise<PaginatedResponse<CapsuleType>> {
  return client.search<CapsuleType>('/api/v1/capsuleTypes/search', params);
}

export async function createCapsuleType(
  client: JazClient,
  data: { displayName: string; description?: string },
): Promise<{ data: CapsuleType }> {
  return client.post('/api/v1/capsuleTypes', data);
}

export async function updateCapsuleType(
  client: JazClient,
  resourceId: string,
  data: Partial<{ displayName: string; description: string }>,
): Promise<{ data: CapsuleType }> {
  return client.put(`/api/v1/capsuleTypes/${resourceId}`, data);
}

// ── Capsule Instances ───────────────────────────────────────────

export async function listCapsules(
  client: JazClient,
  params?: PaginationParams,
): Promise<PaginatedResponse<Capsule>> {
  return client.list<Capsule>('/api/v1/capsules', params);
}

export async function searchCapsules(
  client: JazClient,
  params: SearchParams,
): Promise<PaginatedResponse<Capsule>> {
  return client.search<Capsule>('/api/v1/capsules/search', params);
}

export async function getCapsule(
  client: JazClient,
  resourceId: string,
): Promise<{ data: Capsule }> {
  return client.get(`/api/v1/capsules/${resourceId}`);
}

export async function createCapsule(
  client: JazClient,
  data: {
    capsuleTypeResourceId: string;
    title: string;
    description?: string;
  },
): Promise<{ data: Capsule }> {
  return client.post('/api/v1/capsules', data);
}

export async function updateCapsule(
  client: JazClient,
  resourceId: string,
  data: Partial<{ title: string; description: string }>,
): Promise<{ data: Capsule }> {
  // Capsules PUT requires resourceId + capsuleTypeResourceId even for partial updates.
  // Read-modify-write: fetch current state, merge updates, send full payload.
  const current = await getCapsule(client, resourceId);
  const capsuleTypeResourceId = current.data.capsuleType?.resourceId;
  if (!capsuleTypeResourceId) {
    throw new Error(`Cannot update capsule ${resourceId}: missing capsuleType.resourceId from GET response`);
  }
  const merged = {
    resourceId,
    capsuleTypeResourceId,
    title: current.data.title,
    description: current.data.description,
    ...data,
  };
  return client.put(`/api/v1/capsules/${resourceId}`, merged);
}

export async function deleteCapsule(
  client: JazClient,
  resourceId: string,
): Promise<void> {
  await client.delete(`/api/v1/capsules/${resourceId}`);
}
