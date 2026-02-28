import type { JazClient } from './client.js';
import type { Item, PaginatedResponse, PaginationParams, SearchParams } from './types.js';

export async function listItems(
  client: JazClient,
  params?: PaginationParams,
): Promise<PaginatedResponse<Item>> {
  return client.list<Item>('/api/v1/items', params);
}

export async function getItem(
  client: JazClient,
  resourceId: string,
): Promise<{ data: Item }> {
  return client.get(`/api/v1/items/${resourceId}`);
}

export async function searchItems(
  client: JazClient,
  params: SearchParams,
): Promise<PaginatedResponse<Item>> {
  return client.search<Item>('/api/v1/items/search', params);
}

export async function createItem(
  client: JazClient,
  data: {
    itemCode: string;
    internalName: string;
    appliesToSale?: boolean;
    appliesToPurchase?: boolean;
    saleItemName?: string;
    purchaseItemName?: string;
    salePrice?: number;
    purchasePrice?: number;
    saleAccountResourceId?: string;
    purchaseAccountResourceId?: string;
    saleTaxProfileResourceId?: string;
    purchaseTaxProfileResourceId?: string;
  },
): Promise<{ data: Item }> {
  // Auto-set saleItemName/purchaseItemName from internalName if not provided
  const payload = { ...data };
  if (data.appliesToSale && !payload.saleItemName) {
    payload.saleItemName = data.internalName;
  }
  if (data.appliesToPurchase && !payload.purchaseItemName) {
    payload.purchaseItemName = data.internalName;
  }
  return client.post('/api/v1/items', payload);
}

export async function updateItem(
  client: JazClient,
  resourceId: string,
  data: Partial<{
    itemCode: string;
    internalName: string;
    appliesToSale: boolean;
    appliesToPurchase: boolean;
    salePrice: number;
    purchasePrice: number;
    status: string;
  }>,
): Promise<{ data: Item }> {
  // Items PUT requires itemCode + internalName even for partial updates.
  // Also: appliesToSale triggers saleItemName requirement, etc.
  // Read-modify-write: fetch full current state, merge updates, send complete payload.
  const current = await getItem(client, resourceId);
  const c = current.data;
  const merged: Record<string, unknown> = {
    itemCode: c.itemCode,
    internalName: c.internalName,
    appliesToSale: c.appliesToSale,
    appliesToPurchase: c.appliesToPurchase,
  };
  // Include sale/purchase fields if applicable (required when appliesToSale/Purchase is true)
  if (c.appliesToSale) {
    if (c.saleItemName) merged.saleItemName = c.saleItemName;
    if (c.salePrice !== undefined) merged.salePrice = c.salePrice;
    if (c.saleAccountResourceId) merged.saleAccountResourceId = c.saleAccountResourceId;
  }
  if (c.appliesToPurchase) {
    if (c.purchaseItemName) merged.purchaseItemName = c.purchaseItemName;
    if (c.purchasePrice !== undefined) merged.purchasePrice = c.purchasePrice;
    if (c.purchaseAccountResourceId) merged.purchaseAccountResourceId = c.purchaseAccountResourceId;
  }
  // User's updates override everything
  Object.assign(merged, data);
  return client.put(`/api/v1/items/${resourceId}`, merged);
}

export async function deleteItem(
  client: JazClient,
  resourceId: string,
): Promise<void> {
  await client.delete(`/api/v1/items/${resourceId}`);
}
