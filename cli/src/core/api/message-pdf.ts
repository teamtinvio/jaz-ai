import type { JazClient } from './client.js';

/**
 * Convert a markdown message to a PDF document.
 * Used by the agent to generate downloadable PDFs from conversation output.
 */
export async function messageToPdf(
  client: JazClient,
  data: { markdown: string; title?: string },
): Promise<{ data: { fileName: string; fileUrl: string } }> {
  return client.post('/api/v1/magic/message-to-pdf', data);
}
