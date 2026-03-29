import type { JazClient } from './client.js';
import type { FixedAsset, PaginatedResponse, PaginationParams, SearchParams } from './types.js';

export async function listFixedAssets(
  client: JazClient,
  params?: PaginationParams,
): Promise<PaginatedResponse<FixedAsset>> {
  return client.list<FixedAsset>('/api/v1/fixed-assets', params);
}

export async function getFixedAsset(
  client: JazClient,
  resourceId: string,
): Promise<{ data: FixedAsset }> {
  return client.get(`/api/v1/fixed-assets/${resourceId}`);
}

export async function searchFixedAssets(
  client: JazClient,
  params: SearchParams,
): Promise<PaginatedResponse<FixedAsset>> {
  // FA sort fields: resourceId, name, purchaseDate, typeName, etc. (no createdAt)
  return client.search<FixedAsset>('/api/v1/fixed-assets/search', {
    ...params,
    sort: params.sort ?? { sortBy: ['purchaseDate'], order: 'DESC' },
  });
}

export async function createFixedAsset(
  client: JazClient,
  data: {
    name: string;
    typeCode?: string;
    typeName?: string;
    category?: string;
    purchaseAmount: number;
    purchaseDate: string;
    purchaseAssetAccountResourceId: string;
    depreciationStartDate: string;
    depreciationMethod?: string;
    effectiveLife?: number;
    depreciableValueCostLimitAmount?: number;
    depreciableValueResidualAmount?: number;
    depreciationRateType?: string;
    depreciationExpenseAccountResourceId?: string;
    accumulatedDepreciationAccountResourceId?: string;
    bookValueAccumulatedDepreciationAmount?: number;
    purchaseBusinessTransactionType?: 'PURCHASE' | 'JOURNAL_MANUAL';
    purchaseBusinessTransactionResourceId?: string;
    internalNotes?: string;
    tags?: string[];
    saveAsDraft?: boolean;
    customFields?: any[]; // eslint-disable-line @typescript-eslint/no-explicit-any -- pass-through to API
  },
): Promise<{ data: FixedAsset }> {
  return client.post('/api/v1/fixed-assets', data);
}

export async function updateFixedAsset(
  client: JazClient,
  resourceId: string,
  data: Record<string, unknown>,
): Promise<{ data: FixedAsset }> {
  return client.put(`/api/v1/fixed-assets/${resourceId}`, data);
}

export async function deleteFixedAsset(
  client: JazClient,
  resourceId: string,
): Promise<void> {
  await client.delete(`/api/v1/fixed-assets/${resourceId}`);
}

export async function discardFixedAsset(
  client: JazClient,
  resourceId: string,
  data: {
    disposalDate: string;
    depreciationEndDate: string;
    assetDisposalGainLossAccountResourceId?: string;
  },
): Promise<{ data: unknown }> {
  return client.post(`/api/v1/discard-fixed-assets/${resourceId}`, {
    ...data,
    resourceId,
  });
}

export async function markFixedAssetSold(
  client: JazClient,
  data: {
    resourceId: string;
    depreciationEndDate: string;
    assetDisposalGainLossAccountResourceId: string;
    saleBusinessTransactionType: 'JOURNAL_MANUAL' | 'PURCHASE' | 'SALE';
    saleItemResourceId: string;
  },
): Promise<{ data: unknown }> {
  return client.post('/api/v1/mark-as-sold/fixed-assets', data);
}

export async function transferFixedAsset(
  client: JazClient,
  data: Record<string, unknown>,
): Promise<{ data: unknown }> {
  return client.post('/api/v1/transfer-fixed-assets', data);
}

export async function undoFixedAssetDisposal(
  client: JazClient,
  resourceId: string,
): Promise<{ data: unknown }> {
  return client.post(`/api/v1/undo-disposal/fixed-assets/${resourceId}`, {});
}
