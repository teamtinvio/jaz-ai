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
  const result = await client.get<{ data?: Attachment[]; attachments?: Attachment[] }>(
    `/api/v1/${btType}/${btResourceId}/attachments`,
  );
  // API returns { attachments: [...] } (non-standard shape, not { data: [...] }).
  // Normalize to { data: [...] } and map attachmentResourceId → resourceId for consumers.
  const raw = result?.attachments ?? result?.data;
  const items = Array.isArray(raw) ? raw.map(a => ({
    ...a,
    resourceId: a.resourceId ?? a.attachmentResourceId ?? '',
  })) : [];
  return { data: items };
}

export async function addAttachment(
  client: JazClient,
  data: {
    businessTransactionType: BusinessTransactionType;
    businessTransactionResourceId: string;
    file?: Blob;
    fileName?: string;
    attachmentId?: string;
  },
): Promise<{ data: unknown }> {
  const { businessTransactionType: btType, businessTransactionResourceId: btId, ...rest } = data;
  const formData = new FormData();
  if (rest.file) formData.append('file', rest.file, rest.fileName ?? 'file');
  if (rest.attachmentId) formData.append('attachmentId', rest.attachmentId);
  return client.postMultipart(`/api/v1/${btType}/${btId}/attachments`, formData);
}

/**
 * Delete an attachment from a business transaction.
 */
export async function deleteAttachment(
  client: JazClient,
  btType: BusinessTransactionType,
  btResourceId: string,
  attachmentResourceId: string,
): Promise<unknown> {
  return client.delete(`/api/v1/${btType}/${btResourceId}/attachments/${attachmentResourceId}`);
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
