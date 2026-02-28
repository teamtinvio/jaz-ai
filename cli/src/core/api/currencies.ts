import type { JazClient } from './client.js';
import type { PaginatedResponse, PaginationParams } from './types.js';

export interface Currency {
  currencyCode: string;
  currencyName: string;
  currencySymbol: string;
  customRateCount: number;
  baseCurrency: boolean;
}

export interface CurrencyRate {
  resourceId: string;
  rate: number;
  rateApplicableFrom: string;
  rateApplicableTo?: string;
}

export async function listCurrencies(
  client: JazClient,
): Promise<{ data: Currency[] }> {
  return client.get('/api/v1/organization/currencies');
}

export async function addCurrency(
  client: JazClient,
  currencies: string[],
): Promise<{ data: unknown }> {
  return client.post('/api/v1/organization/currencies', { currencies });
}

export async function listCurrencyRates(
  client: JazClient,
  currencyCode: string,
  params?: PaginationParams,
): Promise<PaginatedResponse<CurrencyRate>> {
  return client.list<CurrencyRate>(
    `/api/v1/organization/currencies/${currencyCode}/rates`,
    params,
  );
}

export async function addCurrencyRate(
  client: JazClient,
  currencyCode: string,
  data: {
    rate: number;
    rateApplicableFrom: string;
    rateApplicableTo?: string;
  },
): Promise<{ data: CurrencyRate }> {
  return client.post(`/api/v1/organization/currencies/${currencyCode}/rates`, data);
}

export async function updateCurrencyRate(
  client: JazClient,
  currencyCode: string,
  resourceId: string,
  data: {
    rate: number;
    rateApplicableFrom: string;
    rateApplicableTo?: string;
  },
): Promise<{ data: CurrencyRate }> {
  return client.put(
    `/api/v1/organization/currencies/${currencyCode}/rates/${resourceId}`,
    data,
  );
}

export async function startCurrencyRatesImportJob(
  client: JazClient,
  currencyCode: string,
  csvUrl: string,
): Promise<{ data: { jobId: string } }> {
  return client.post(`/api/v1/organization/currencies/${currencyCode}/rates/import`, {
    sourceUrl: csvUrl,
  });
}

export async function getCurrencyRatesImportJobStatus(
  client: JazClient,
  jobId: string,
): Promise<{ data: { status: string; message?: string } }> {
  return client.get(`/api/v1/jobs/${jobId}/status`);
}
