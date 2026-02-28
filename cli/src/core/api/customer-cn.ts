import type { JazClient } from './client.js';
import type { LineItem, CurrencyExchangeRate, Payment, Refund, PaginatedResponse, PaginationParams, SearchParams } from './types.js';

export interface CustomerCreditNote {
  resourceId: string;
  reference: string;
  valueDate: string;
  status: string;
  contactResourceId: string;
  lineItems: LineItem[];
  notes?: string;
  totalAmount?: number;
  isTaxVATApplicable?: boolean;
  taxInclusion?: boolean;
}

export async function listCustomerCreditNotes(
  client: JazClient,
  params?: PaginationParams,
): Promise<PaginatedResponse<CustomerCreditNote>> {
  return client.list<CustomerCreditNote>('/api/v1/customer-credit-notes', params);
}

export async function getCustomerCreditNote(
  client: JazClient,
  resourceId: string,
): Promise<{ data: CustomerCreditNote }> {
  return client.get(`/api/v1/customer-credit-notes/${resourceId}`);
}

export async function searchCustomerCreditNotes(
  client: JazClient,
  params: SearchParams,
): Promise<PaginatedResponse<CustomerCreditNote>> {
  return client.search<CustomerCreditNote>('/api/v1/customer-credit-notes/search', params);
}

export async function createCustomerCreditNote(
  client: JazClient,
  data: {
    reference?: string;
    valueDate: string;
    contactResourceId: string;
    lineItems: LineItem[];
    currency?: CurrencyExchangeRate;
    notes?: string;
    saveAsDraft?: boolean;
  },
): Promise<{ data: CustomerCreditNote }> {
  return client.post('/api/v1/customer-credit-notes', {
    ...data,
    saveAsDraft: data.saveAsDraft ?? true,
  });
}

export async function updateCustomerCreditNote(
  client: JazClient,
  resourceId: string,
  data: Partial<{
    reference: string;
    valueDate: string;
    lineItems: LineItem[];
    notes: string;
  }>,
): Promise<{ data: CustomerCreditNote }> {
  return client.put(`/api/v1/customer-credit-notes/${resourceId}`, data);
}

/**
 * Finalize a draft customer credit note: update fields + set saveAsDraft=false in one PUT.
 */
export async function finalizeCustomerCreditNote(
  client: JazClient,
  resourceId: string,
  data: Partial<{
    reference: string;
    valueDate: string;
    contactResourceId: string;
    lineItems: LineItem[];
    notes: string;
    tag: string;
    isTaxVatApplicable: boolean;
    taxInclusion: string;
  }>,
): Promise<{ data: CustomerCreditNote }> {
  return client.put(`/api/v1/customer-credit-notes/${resourceId}`, {
    ...data,
    resourceId,
    saveAsDraft: false,
  });
}

export async function deleteCustomerCreditNote(
  client: JazClient,
  resourceId: string,
): Promise<void> {
  await client.delete(`/api/v1/customer-credit-notes/${resourceId}`);
}

export async function createCustomerCreditNoteRefund(
  client: JazClient,
  creditNoteId: string,
  payment: Payment,
): Promise<{ data: unknown }> {
  return client.post(
    `/api/v1/customer-credit-notes/${creditNoteId}/refunds`,
    { ...payment, saveAsDraft: payment.saveAsDraft ?? true },
  );
}

export async function listCustomerCreditNoteRefunds(
  client: JazClient,
  creditNoteId: string,
): Promise<{ data: Refund[] }> {
  return client.get(`/api/v1/customer-credit-notes/${creditNoteId}/refunds`);
}
