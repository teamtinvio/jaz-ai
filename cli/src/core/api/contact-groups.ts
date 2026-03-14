import type { JazClient } from './client.js';
import type { ContactGroup, PaginatedResponse, PaginationParams, SearchParams } from './types.js';

export async function listContactGroups(
  client: JazClient,
  params?: PaginationParams,
): Promise<PaginatedResponse<ContactGroup>> {
  return client.list<ContactGroup>('/api/v1/contact-groups', params);
}

export async function getContactGroup(
  client: JazClient,
  resourceId: string,
): Promise<{ data: ContactGroup }> {
  return client.get(`/api/v1/contact-groups/${resourceId}`);
}

export async function searchContactGroups(
  client: JazClient,
  params: SearchParams,
): Promise<PaginatedResponse<ContactGroup>> {
  return client.search<ContactGroup>('/api/v1/contact-groups/search', params);
}

export async function createContactGroup(
  client: JazClient,
  data: { name: string; contactResourceIds?: string[] },
): Promise<{ data: ContactGroup }> {
  return client.post('/api/v1/contact-groups', data);
}

export async function updateContactGroup(
  client: JazClient,
  resourceId: string,
  data: { name?: string; contactResourceIds?: string[] },
): Promise<{ data: ContactGroup }> {
  return client.put(`/api/v1/contact-groups/${resourceId}`, data);
}

export async function deleteContactGroup(
  client: JazClient,
  resourceId: string,
): Promise<void> {
  await client.delete(`/api/v1/contact-groups/${resourceId}`);
}
