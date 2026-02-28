import type { JazClient } from './client.js';
import type { ExportType, ExportResponse } from './types.js';

/**
 * Download a data export. All exports use POST /api/v1/data-exports/{type}.
 * Returns { data: { fileName, fileUrl } }.
 */
export async function downloadExport(
  client: JazClient,
  exportType: ExportType,
  params: {
    startDate?: string;
    endDate?: string;
    currencyCode?: string;
    tags?: string[];
    contactResourceId?: string;
    [key: string]: unknown;
  } = {},
): Promise<ExportResponse> {
  return client.post(`/api/v1/data-exports/${exportType}`, params);
}
