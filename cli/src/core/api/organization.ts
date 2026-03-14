import type { JazClient } from './client.js';
import type { OrgDetails } from './types.js';

export async function getOrganization(client: JazClient): Promise<OrgDetails> {
  const res = await client.get<{ data: OrgDetails | OrgDetails[] }>('/api/v1/organization');
  // API may return single object or array — normalize
  const data = Array.isArray(res.data) ? res.data[0] : res.data;
  return data;
}
