import type { JazClient } from './client.js';
import type { Subscription, PaginatedResponse, PaginationParams, SearchParams } from './types.js';

export async function listSubscriptions(
  client: JazClient,
  params?: PaginationParams,
): Promise<PaginatedResponse<Subscription>> {
  return client.list<Subscription>('/api/v1/scheduled/subscriptions', params);
}

export async function getSubscription(
  client: JazClient,
  resourceId: string,
): Promise<{ data: Subscription }> {
  return client.get(`/api/v1/scheduled/subscriptions/${resourceId}`);
}

export async function createSubscription(
  client: JazClient,
  data: Record<string, unknown>,
): Promise<{ data: Subscription }> {
  return client.post('/api/v1/scheduled/subscriptions', data);
}

export async function updateSubscription(
  client: JazClient,
  resourceId: string,
  data: Record<string, unknown>,
): Promise<{ data: Subscription }> {
  const payload = { ...data };
  // Server requires startDate+repeat when endDate is present (309fcb3 not yet deployed).
  // Auto-fetch from existing subscription — same pattern as updateCashIn.
  if (payload.endDate) {
    const needsStartDate = !payload.startDate;
    const needsRepeat = !payload.repeat && !payload.interval;
    if (needsStartDate || needsRepeat) {
      const existing = await getSubscription(client, resourceId);
      if (needsStartDate) payload.startDate = existing.data.startDate;
      if (needsRepeat) {
        // API response uses `interval`; PUT accepts `repeat` (canonical) or `interval`
        if (!existing.data.interval) throw new Error('Subscription missing repeat configuration — cannot auto-fill for update');
        payload.repeat = existing.data.interval;
      }
    }
  }
  return client.put(`/api/v1/scheduled/subscriptions/${resourceId}`, payload);
}

export async function deleteSubscription(
  client: JazClient,
  resourceId: string,
): Promise<void> {
  await client.delete(`/api/v1/scheduled/subscriptions/${resourceId}`);
}

export async function cancelSubscription(
  client: JazClient,
  resourceId: string,
  opts?: { cancelDateType?: string; proratedAdjustmentLineText?: string; endDate?: string },
): Promise<{ data: unknown }> {
  return client.put(`/api/v1/scheduled/cancel-subscriptions/${resourceId}`, {
    resourceId,
    cancelDateType: opts?.cancelDateType ?? 'END_OF_CURRENT_PERIOD',
    proratedAdjustmentLineText: opts?.proratedAdjustmentLineText ?? 'Prorated adjustment',
    ...(opts?.endDate ? { endDate: opts.endDate } : {}),
  });
}

export async function searchScheduledTransactions(
  client: JazClient,
  params: SearchParams,
): Promise<PaginatedResponse<unknown>> {
  // Scheduled transactions sort fields: startDate, nextScheduleDate, etc. (no createdAt)
  return client.search('/api/v1/scheduled-transaction/search', {
    ...params,
    sort: params.sort ?? { sortBy: ['startDate'], order: 'DESC' },
  });
}
