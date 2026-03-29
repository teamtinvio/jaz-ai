import type { JazClient } from './client.js';
import type { PaginatedResponse, PaginationParams } from './types.js';

export interface CustomFieldAppliesTo {
  invoices?: boolean;
  bills?: boolean;
  customerCredits?: boolean;
  supplierCredits?: boolean;
  payments?: boolean;
}

export interface CustomField {
  resourceId: string;
  customFieldName: string;
  datatypeCode: string;
  defaultValue?: string;
  description?: string;
  listOptions?: string[];
  printOnDocuments?: boolean;
  applyToSales?: string;
  applyToPurchase?: string;
  applyToSaleCreditNote?: string;
  applyToPurchaseCreditNote?: string;
  applyToCreditNote?: string;
  applyToPayment?: string;
  appliesToFixedAssets?: string;
  appliesToItems?: string;
  actualValue?: string;
  // Legacy aliases (some responses use these)
  name?: string;
  fieldType?: string;
  entityType?: string;
}

/** Custom field value as set on a transaction (invoice, bill, CN, payment). */
export interface CustomFieldValue {
  customFieldName: string;
  actualValue: string;
}

export async function listCustomFields(
  client: JazClient,
  params?: PaginationParams,
): Promise<PaginatedResponse<CustomField>> {
  return client.list<CustomField>('/api/v1/custom-fields', params);
}

export async function getCustomField(
  client: JazClient,
  resourceId: string,
): Promise<{ data: CustomField }> {
  return client.get(`/api/v1/custom-fields/${resourceId}`);
}

export async function searchCustomFields(
  client: JazClient,
  params: { filter?: Record<string, unknown>; limit?: number; offset?: number; sort?: { sortBy: string[]; order: 'ASC' | 'DESC' } },
): Promise<PaginatedResponse<CustomField>> {
  return client.search<CustomField>('/api/v1/custom-fields/search', params);
}

export async function createCustomField(
  client: JazClient,
  data: {
    name: string;
    description?: string;
    printOnDocuments?: boolean;
    appliesTo?: CustomFieldAppliesTo;
    // Legacy params still accepted
    fieldType?: string;
    entityType?: string;
  },
): Promise<{ data: CustomField }> {
  return client.post('/api/v1/custom-fields', data);
}

export async function updateCustomField(
  client: JazClient,
  resourceId: string,
  data: {
    name?: string;
    description?: string;
    printOnDocuments?: boolean;
    appliesTo?: CustomFieldAppliesTo;
  },
): Promise<{ data: CustomField }> {
  return client.put(`/api/v1/custom-fields/${resourceId}`, data);
}

export async function deleteCustomField(
  client: JazClient,
  resourceId: string,
): Promise<void> {
  await client.delete(`/api/v1/custom-fields/${resourceId}`);
}
