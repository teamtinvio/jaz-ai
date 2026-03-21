import type { JazClient } from './client.js';
import type { InventoryBalance, PaginatedResponse, PaginationParams, SearchParams } from './types.js';

export async function listInventoryItems(
  client: JazClient,
  params?: PaginationParams,
): Promise<PaginatedResponse<unknown>> {
  return client.list('/api/v1/inventory-items', params);
}

export async function searchInventoryItems(
  client: JazClient,
  params: SearchParams,
): Promise<PaginatedResponse<unknown>> {
  return client.search('/api/v1/inventory-items/search', params);
}

export async function createInventoryItem(
  client: JazClient,
  data: Record<string, unknown>,
): Promise<{ data: { resourceId: string } }> {
  return client.post('/api/v1/inventory-items', data);
}

export async function getInventoryBalance(
  client: JazClient,
  itemResourceId: string,
): Promise<{ data: InventoryBalance }> {
  return client.get(`/api/v1/inventory-item-balance/${itemResourceId}`);
}
