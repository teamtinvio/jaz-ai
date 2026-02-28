import type { JazClient } from './client.js';
import type {
  Bill, LineItem, CurrencyExchangeRate, Payment, CreditApplication,
  PaginatedResponse, PaginationParams, SearchParams,
} from './types.js';

export async function listBills(
  client: JazClient,
  params?: PaginationParams,
): Promise<PaginatedResponse<Bill>> {
  return client.list<Bill>('/api/v1/bills', params);
}

export async function getBill(
  client: JazClient,
  resourceId: string,
): Promise<{ data: Bill }> {
  return client.get(`/api/v1/bills/${resourceId}`);
}

export async function searchBills(
  client: JazClient,
  params: SearchParams,
): Promise<PaginatedResponse<Bill>> {
  return client.search<Bill>('/api/v1/bills/search', params);
}

export async function createBill(
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
  },
): Promise<{ data: Bill }> {
  return client.post('/api/v1/bills', {
    ...data,
    saveAsDraft: data.saveAsDraft ?? true,
  });
}

export async function updateBill(
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
    tags: string[];
    capsuleResourceId: string;
    isTaxVatApplicable: boolean;
    taxInclusion: string;
    saveAsDraft: boolean;
  }>,
): Promise<{ data: Bill }> {
  return client.put(`/api/v1/bills/${resourceId}`, data);
}

/**
 * Finalize a draft bill: update fields + set saveAsDraft=false in one PUT.
 * Throws if the bill is not in DRAFT status.
 */
export async function finalizeBill(
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
    tags: string[];
    capsuleResourceId: string;
    isTaxVatApplicable: boolean;
    taxInclusion: string;
  }>,
): Promise<{ data: Bill }> {
  return client.put(`/api/v1/bills/${resourceId}`, {
    ...data,
    resourceId,
    saveAsDraft: false,
  });
}

export async function deleteBill(
  client: JazClient,
  resourceId: string,
): Promise<void> {
  await client.delete(`/api/v1/bills/${resourceId}`);
}

export async function createBillPayment(
  client: JazClient,
  billResourceId: string,
  payment: Payment,
): Promise<{ data: unknown }> {
  return client.post(
    `/api/v1/bills/${billResourceId}/payments`,
    { ...payment, saveAsDraft: payment.saveAsDraft ?? true },
  );
}

export async function applyCreditsToBill(
  client: JazClient,
  billResourceId: string,
  credits: CreditApplication[],
): Promise<{ data: unknown }> {
  return client.post(`/api/v1/bills/${billResourceId}/credits`, { credits });
}

export async function createScheduledBill(
  client: JazClient,
  data: {
    status: string;
    startDate: string;
    endDate?: string;
    repeat: string;
    bill: {
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
  return client.post('/api/v1/scheduled/bills', data);
}
