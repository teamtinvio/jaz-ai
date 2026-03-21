import type { JazClient } from './client.js';
import type {
  Invoice, LineItem, CurrencyExchangeRate, Payment, CreditApplication,
  PaginatedResponse, PaginationParams, SearchParams,
} from './types.js';

export async function listInvoices(
  client: JazClient,
  params?: PaginationParams,
): Promise<PaginatedResponse<Invoice>> {
  return client.list<Invoice>('/api/v1/invoices', params);
}

/**
 * Get a single invoice by resourceId.
 * Note: GET /invoices/:id returns a FLAT object (no { data } wrapper),
 * unlike bills/contacts/journals which wrap in { data }. We normalize here.
 */
export async function getInvoice(
  client: JazClient,
  resourceId: string,
): Promise<{ data: Invoice }> {
  const raw = await client.get<Invoice | { data: Invoice }>(`/api/v1/invoices/${resourceId}`);
  if ('data' in raw && typeof (raw as Record<string, unknown>).data === 'object') {
    return raw as { data: Invoice };
  }
  return { data: raw as Invoice };
}

export async function searchInvoices(
  client: JazClient,
  params: SearchParams,
): Promise<PaginatedResponse<Invoice>> {
  return client.search<Invoice>('/api/v1/invoices/search', params);
}

export async function createInvoice(
  client: JazClient,
  data: {
    reference?: string;
    valueDate: string;
    dueDate: string;
    contactResourceId: string;
    lineItems: LineItem[];
    currency?: CurrencyExchangeRate;
    tag?: string;
    notes?: string;
    isTaxVatApplicable?: boolean;
    taxInclusion?: string;
    saveAsDraft?: boolean;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- pass-through to API
    customFields?: any[];
  },
): Promise<{ data: Invoice }> {
  return client.post('/api/v1/invoices', {
    ...data,
    saveAsDraft: data.saveAsDraft ?? true,
  });
}

export async function updateInvoice(
  client: JazClient,
  resourceId: string,
  data: Partial<{
    reference: string;
    valueDate: string;
    dueDate: string;
    lineItems: LineItem[];
    notes: string;
    tag: string;
    isTaxVatApplicable: boolean;
    taxInclusion: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- pass-through to API
    customFields: any[];
  }>,
): Promise<{ data: Invoice }> {
  return client.put(`/api/v1/invoices/${resourceId}`, data);
}

export async function deleteInvoice(
  client: JazClient,
  resourceId: string,
): Promise<void> {
  await client.delete(`/api/v1/invoices/${resourceId}`);
}

export async function createInvoicePayment(
  client: JazClient,
  invoiceResourceId: string,
  payment: Payment,
): Promise<{ data: unknown }> {
  return client.post(
    `/api/v1/invoices/${invoiceResourceId}/payments`,
    { ...payment, saveAsDraft: payment.saveAsDraft ?? true },
  );
}

export async function createScheduledInvoice(
  client: JazClient,
  data: {
    status: string;
    startDate: string;
    endDate?: string;
    repeat: string;
    invoice: {
      reference?: string;
      valueDate: string;
      dueDate: string;
      contactResourceId: string;
      lineItems: LineItem[];
      currency?: CurrencyExchangeRate;
      tag?: string;
      saveAsDraft?: boolean;
    };
  },
): Promise<{ data: unknown }> {
  return client.post('/api/v1/scheduled/invoices', data);
}

export async function applyCreditsToInvoice(
  client: JazClient,
  invoiceResourceId: string,
  credits: CreditApplication[],
): Promise<{ data: unknown }> {
  return client.post(`/api/v1/invoices/${invoiceResourceId}/credits`, { credits });
}

/**
 * Finalize a draft invoice: update fields + set saveAsDraft=false in one PUT.
 */
export async function finalizeInvoice(
  client: JazClient,
  resourceId: string,
  data: Partial<{
    reference: string;
    valueDate: string;
    dueDate: string;
    contactResourceId: string;
    lineItems: LineItem[];
    notes: string;
    tag: string;
    isTaxVatApplicable: boolean;
    taxInclusion: string;
  }>,
): Promise<{ data: Invoice }> {
  return client.put(`/api/v1/invoices/${resourceId}`, {
    ...data,
    resourceId,
    saveAsDraft: false,
  });
}

export async function downloadInvoicePdf(
  client: JazClient,
  resourceId: string,
): Promise<{ data: { fileUrl: string } }> {
  return client.get(`/api/v1/invoices/${resourceId}/download`);
}

// ── Payment & Credit Sub-resources ───────────────────────────────

/**
 * List payments recorded against an invoice.
 * API returns raw array (not wrapped in {data: [...]}).
 */
export async function listInvoicePayments(
  client: JazClient,
  invoiceId: string,
): Promise<{ data: unknown[] }> {
  const res = await client.get<unknown[]>(`/api/v1/invoices/${invoiceId}/payments`);
  return { data: Array.isArray(res) ? res : (res as { data?: unknown[] }).data ?? [] };
}

/**
 * List credit notes applied to an invoice.
 * API returns raw array (not wrapped in {data: [...]}).
 */
export async function listInvoiceCredits(
  client: JazClient,
  invoiceId: string,
): Promise<{ data: unknown[] }> {
  const res = await client.get<unknown[]>(`/api/v1/invoices/${invoiceId}/credits`);
  return { data: Array.isArray(res) ? res : (res as { data?: unknown[] }).data ?? [] };
}

export async function reverseInvoiceCredit(
  client: JazClient,
  invoiceId: string,
  creditId: string,
): Promise<void> {
  await client.delete(`/api/v1/invoices/${invoiceId}/credits/${creditId}`);
}
