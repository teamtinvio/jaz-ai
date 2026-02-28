import type { JazClient } from './client.js';
import type { Attachment } from './types.js';

type BusinessTransactionType =
  | 'invoices'
  | 'bills'
  | 'journals'
  | 'scheduled_journals'
  | 'customer-credit-notes'
  | 'supplier-credit-notes';

/**
 * List attachments for any business transaction type.
 * Works for bills, invoices, journals, and credit notes.
 */
export async function listAttachments(
  client: JazClient,
  btType: BusinessTransactionType,
  btResourceId: string,
): Promise<{ data: Attachment[] }> {
  return client.get(`/api/v1/${btType}/${btResourceId}/attachments`);
}

export async function addAttachment(
  client: JazClient,
  data: {
    businessTransactionType: BusinessTransactionType;
    businessTransactionResourceId: string;
    attachmentId?: string;
    sourceUrl?: string;
  },
): Promise<{ data: unknown }> {
  const { businessTransactionType: btType, businessTransactionResourceId: btId, ...rest } = data;
  const formData = new FormData();
  if (rest.attachmentId) formData.append('attachmentId', rest.attachmentId);
  if (rest.sourceUrl) formData.append('sourceUrl', rest.sourceUrl);
  return client.postMultipart(`/api/v1/${btType}/${btId}/attachments`, formData);
}

/**
 * Fetch extracted table data from an attachment (OCR/AI extraction).
 */
export async function fetchAttachmentTable(
  client: JazClient,
  attachmentId: string,
): Promise<{ data: unknown }> {
  return client.get(`/api/v1/attachments/${attachmentId}/table`);
}
