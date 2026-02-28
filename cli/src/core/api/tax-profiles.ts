import type { JazClient } from './client.js';
import type { TaxProfile, TaxType, PaginatedResponse, PaginationParams } from './types.js';

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
