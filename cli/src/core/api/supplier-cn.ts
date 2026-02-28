import type { JazClient } from './client.js';
import type { LineItem, CurrencyExchangeRate, Payment, Refund, PaginatedResponse, PaginationParams, SearchParams } from './types.js';

export interface SupplierCreditNote {
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

export async function listSupplierCreditNotes(
  client: JazClient,
  params?: PaginationParams,
): Promise<PaginatedResponse<SupplierCreditNote>> {
  return client.list<SupplierCreditNote>('/api/v1/supplier-credit-notes', params);
}

export async function getSupplierCreditNote(
  client: JazClient,
  resourceId: string,
): Promise<{ data: SupplierCreditNote }> {
  return client.get(`/api/v1/supplier-credit-notes/${resourceId}`);
}

export async function searchSupplierCreditNotes(
  client: JazClient,
  params: SearchParams,
): Promise<PaginatedResponse<SupplierCreditNote>> {
  return client.search<SupplierCreditNote>('/api/v1/supplier-credit-notes/search', params);
}

export async function createSupplierCreditNote(
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
): Promise<{ data: SupplierCreditNote }> {
  return client.post('/api/v1/supplier-credit-notes', {
    ...data,
    saveAsDraft: data.saveAsDraft ?? true,
  });
}

export async function updateSupplierCreditNote(
  client: JazClient,
  resourceId: string,
  data: Partial<{
    reference: string;
    valueDate: string;
    lineItems: LineItem[];
    notes: string;
  }>,
): Promise<{ data: SupplierCreditNote }> {
  return client.put(`/api/v1/supplier-credit-notes/${resourceId}`, data);
}

/**
 * Finalize a draft supplier credit note: update fields + set saveAsDraft=false in one PUT.
 */
export async function finalizeSupplierCreditNote(
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
): Promise<{ data: SupplierCreditNote }> {
  return client.put(`/api/v1/supplier-credit-notes/${resourceId}`, {
    ...data,
    resourceId,
    saveAsDraft: false,
  });
}

export async function deleteSupplierCreditNote(
  client: JazClient,
  resourceId: string,
): Promise<void> {
  await client.delete(`/api/v1/supplier-credit-notes/${resourceId}`);
}

export async function createSupplierCreditNoteRefund(
  client: JazClient,
  creditNoteId: string,
  payment: Payment,
): Promise<{ data: unknown }> {
  return client.post(
    `/api/v1/supplier-credit-notes/${creditNoteId}/refunds`,
    { ...payment, saveAsDraft: payment.saveAsDraft ?? true },
  );
}

export async function listSupplierCreditNoteRefunds(
  client: JazClient,
  creditNoteId: string,
): Promise<{ data: Refund[] }> {
  return client.get(`/api/v1/supplier-credit-notes/${creditNoteId}/refunds`);
}
