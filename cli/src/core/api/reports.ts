import type { JazClient } from './client.js';

export async function generateTrialBalance(
  client: JazClient,
  data: { endDate: string; currencyCode?: string },
): Promise<{ data: unknown }> {
  return client.post('/api/v1/generate-reports/trial-balance', data);
}

export async function generateBalanceSheet(
  client: JazClient,
  data: {
    primarySnapshotDate: string;
    currencyCode?: string;
  },
): Promise<{ data: unknown }> {
  return client.post('/api/v1/generate-reports/balance-sheet', data);
}

export async function generateProfitAndLoss(
  client: JazClient,
  data: {
    startDate: string;
    endDate: string;
    tags?: string[];
    compareWith?: string;
    compareCount?: number;
    currencyCode?: string;
  },
): Promise<{ data: unknown }> {
  return client.post('/api/v1/generate-reports/profit-and-loss', data);
}

export async function generateCashflow(
  client: JazClient,
  data: { startDate: string; endDate: string; tags?: string[] },
): Promise<{ data: unknown }> {
  return client.post('/api/v1/generate-reports/cashflow', data);
}

export async function generateArSummary(
  client: JazClient,
  data: { startDate: string; endDate: string; tags?: string[] },
): Promise<{ data: unknown }> {
  return client.post('/api/v1/generate-reports/ar-summary-report', data);
}

export async function generateApSummary(
  client: JazClient,
  data: { startDate: string; endDate: string; tags?: string[] },
): Promise<{ data: unknown }> {
  return client.post('/api/v1/generate-reports/ap-summary-report', data);
}

export async function generateCashBalance(
  client: JazClient,
  data: { endDate: string },
): Promise<{ data: unknown }> {
  return client.post('/api/v1/generate-reports/cash-balance', data);
}

export async function generateGeneralLedger(
  client: JazClient,
  data: { startDate: string; endDate: string; groupBy: string },
): Promise<{ data: unknown }> {
  return client.post('/api/v1/generate-reports/general-ledger', data);
}

export async function generateVatLedger(
  client: JazClient,
  data: { startDate: string; endDate: string },
): Promise<{ data: unknown }> {
  return client.post('/api/v1/generate-reports/vat-ledger', data);
}

export async function generateEquityMovement(
  client: JazClient,
  data: {
    primarySnapshotStartDate: string;
    primarySnapshotEndDate: string;
    currencyCode?: string;
    compareWith?: string;
    compareCount?: number;
  },
): Promise<{ data: unknown }> {
  return client.post('/api/v1/generate-reports/equity-movement', data);
}

export async function generateBankBalanceSummary(
  client: JazClient,
  data: { primarySnapshotDate: string; currencyCode?: string },
): Promise<{ data: unknown }> {
  return client.post('/api/v1/generate-reports/bank-balance-summary', data);
}

export async function generateBankReconSummary(
  client: JazClient,
  data: {
    bankAccountResourceId: string;
    primarySnapshotStartDate: string;
    primarySnapshotEndDate: string;
    currencyCode?: string;
    tags?: string[];
  },
): Promise<{ data: unknown }> {
  return client.post('/api/v1/generate-reports/bank-reconciliation-summary', data);
}

export async function generateBankReconDetails(
  client: JazClient,
  data: {
    bankAccountResourceId: string;
    primarySnapshotStartDate: string;
    primarySnapshotEndDate: string;
    filter: Record<string, unknown>;
    currencyCode?: string;
    tags?: string[];
  },
): Promise<{ data: unknown }> {
  return client.post('/api/v1/generate-reports/bank-reconciliation-details', data);
}

export async function generateFaSummary(
  client: JazClient,
  data: {
    primarySnapshotStartDate: string;
    primarySnapshotEndDate: string;
    groupBy: string;
    currencyCode?: string;
  },
): Promise<{ data: unknown }> {
  return client.post('/api/v1/generate-reports/fixed-assets-summary', data);
}

export async function generateFaReconSummary(
  client: JazClient,
  data: {
    primarySnapshotStartDate: string;
    primarySnapshotEndDate: string;
    accountResourceIds?: string[];
    currencyCode?: string;
  },
): Promise<{ data: unknown }> {
  return client.post('/api/v1/generate-reports/fixed-assets-recon-summary', data);
}

export async function generateArReport(
  client: JazClient,
  data: { endDate: string },
): Promise<{ data: unknown }> {
  return client.post('/api/v1/generate-reports/ar-report', data);
}