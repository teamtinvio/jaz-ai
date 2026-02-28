import type { JazClient } from './client.js';
import type { PaginatedResponse, PaginationParams } from './types.js';

export interface CustomField {
  resourceId: string;
  name: string;
  fieldType: string;
  entityType: string;
}

export async function listCustomFields(
  client: JazClient,
  params?: PaginationParams,
): Promise<PaginatedResponse<CustomField>> {
  return client.list<CustomField>('/api/v1/custom-fields', params);
}

export async function createCustomField(
  client: JazClient,
  data: { name: string; fieldType: string; entityType: string },
): Promise<{ data: CustomField }> {
  return client.post('/api/v1/custom-fields', data);
}

export async function deleteCustomField(
  client: JazClient,
  resourceId: string,
): Promise<void> {
  await client.delete(`/api/v1/custom-fields/${resourceId}`);
}
