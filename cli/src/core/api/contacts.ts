import type { JazClient } from './client.js';
import type { Contact, PaginatedResponse, PaginationParams, SearchParams } from './types.js';

export async function listContacts(
  client: JazClient,
  params?: PaginationParams,
): Promise<PaginatedResponse<Contact>> {
  return client.list<Contact>('/api/v1/contacts', params);
}

export async function searchContacts(
  client: JazClient,
  params: SearchParams,
): Promise<PaginatedResponse<Contact>> {
  return client.search<Contact>('/api/v1/contacts/search', params);
}

export async function createContact(
  client: JazClient,
  data: {
    billingName: string;
    name?: string;
    emails?: string[];
    customer?: boolean;
    supplier?: boolean;
    taxRegistrationNumber?: string;
    address?: string;
    phone?: string;
    currency?: { sourceCurrency: string };
    paymentTermDays?: number;
  },
): Promise<{ data: Contact }> {
  return client.post('/api/v1/contacts', data);
}

export async function updateContact(
  client: JazClient,
  resourceId: string,
  data: Partial<{
    billingName: string;
    name: string;
    emails: string[];
    customer: boolean;
    supplier: boolean;
    taxRegistrationNumber: string;
    address: string;
    phone: string;
    status: string;
  }>,
): Promise<{ data: Contact }> {
  return client.put(`/api/v1/contacts/${resourceId}`, data);
}

export async function getContact(
  client: JazClient,
  resourceId: string,
): Promise<{ data: Contact }> {
  return client.get(`/api/v1/contacts/${resourceId}`);
}

export async function deleteContact(
  client: JazClient,
  resourceId: string,
): Promise<void> {
  await client.delete(`/api/v1/contacts/${resourceId}`);
}
