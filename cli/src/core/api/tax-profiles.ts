import type { JazClient } from './client.js';
import type { TaxProfile, TaxType, WithholdingTaxCode, PaginatedResponse, PaginationParams } from './types.js';

export async function listTaxProfiles(
  client: JazClient,
  params?: PaginationParams,
): Promise<PaginatedResponse<TaxProfile>> {
  return client.list<TaxProfile>('/api/v1/tax-profiles', params);
}

export async function listTaxTypes(
  client: JazClient,
  params?: PaginationParams,
): Promise<PaginatedResponse<TaxType>> {
  return client.list<TaxType>('/api/v1/tax-types', params);
}

export async function createTaxProfile(
  client: JazClient,
  data: {
    name: string;
    taxRate: number;
    taxTypeCode: string;
  },
): Promise<{ data: TaxProfile }> {
  return client.post('/api/v1/tax-profiles', data);
}

export async function searchTaxProfiles(
  client: JazClient,
  params: { filter?: Record<string, unknown>; limit?: number; offset?: number; sort?: { sortBy: string[]; order: 'ASC' | 'DESC' } },
): Promise<PaginatedResponse<TaxProfile>> {
  return client.post('/api/v1/tax-profiles/search', params);
}

export async function getTaxProfile(
  client: JazClient,
  resourceId: string,
): Promise<{ data: TaxProfile }> {
  return client.get(`/api/v1/tax-profiles/${resourceId}`);
}

export async function updateTaxProfile(
  client: JazClient,
  resourceId: string,
  data: Partial<{ name: string; taxRate: number; taxTypeCode: string; status: string }>,
): Promise<{ data: TaxProfile }> {
  return client.put(`/api/v1/tax-profiles/${resourceId}`, data);
}

export async function listWithholdingTaxCodes(
  client: JazClient,
): Promise<{ data: WithholdingTaxCode[] }> {
  // WHT codes endpoint returns a flat array (no pagination). Wrap for consistency.
  const raw = await client.get<WithholdingTaxCode[]>('/api/v1/withholding-tax-codes');
  return { data: Array.isArray(raw) ? raw : (raw as { data: WithholdingTaxCode[] }).data ?? [] };
}
