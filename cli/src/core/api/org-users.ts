import type { JazClient } from './client.js';
import type { OrgUser, ModuleRole, PaginatedResponse, PaginationParams, SearchParams } from './types.js';

export async function listOrgUsers(
  client: JazClient,
  params?: PaginationParams,
): Promise<PaginatedResponse<OrgUser>> {
  return client.list<OrgUser>('/api/v1/organization-users', params);
}

export async function searchOrgUsers(
  client: JazClient,
  params: SearchParams,
): Promise<PaginatedResponse<OrgUser>> {
  return client.search<OrgUser>('/api/v1/organization-users/search', params);
}

export async function inviteOrgUser(
  client: JazClient,
  data: {
    firstName: string;
    lastName: string;
    email: string;
    moduleRoles: ModuleRole[];
  },
): Promise<{ data: OrgUser }> {
  return client.post('/api/v1/organization-users/invite', data);
}

export async function updateOrgUser(
  client: JazClient,
  resourceId: string,
  data: { moduleRoles: ModuleRole[] },
): Promise<{ data: OrgUser }> {
  return client.put(`/api/v1/organization-users/${resourceId}`, data);
}

export async function removeOrgUser(
  client: JazClient,
  resourceId: string,
): Promise<void> {
  await client.delete(`/api/v1/organization-users/${resourceId}`);
}
