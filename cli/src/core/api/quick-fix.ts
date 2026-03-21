import type { JazClient } from './client.js';

// ── Entity Groups ────────────────────────────────────────────────
// Grouped by domain — values are API path segments for /api/v1/quick-fix/{entity}
export const QUICK_FIX_ARAP = ['invoices', 'bills', 'customer-credit-notes', 'supplier-credit-notes'] as const;
const QUICK_FIX_ACCOUNTING = ['journals', 'cash-entries'] as const;
const QUICK_FIX_SCHEDULERS = ['sale-schedules', 'purchase-schedules', 'subscription-schedules', 'journal-schedules'] as const;

export const QUICK_FIX_ENTITIES = [...QUICK_FIX_ARAP, ...QUICK_FIX_ACCOUNTING, ...QUICK_FIX_SCHEDULERS] as const;
export type QuickFixEntity = (typeof QUICK_FIX_ENTITIES)[number];

// ── Response Shape (identical for all 20 endpoints) ──────────────
export interface QuickFixResult {
  updated: string[];
  failed: Array<{ resourceId: string; error: string; errorCode: string }>;
}

/** Normalize API response — guarantee errorCode is always present. */
export function normalizeQuickFixResult(raw: { updated?: string[]; failed?: Array<{ resourceId: string; error: string; errorCode?: string }> }): QuickFixResult {
  return {
    updated: raw.updated ?? [],
    failed: (raw.failed ?? []).map(f => ({ ...f, errorCode: f.errorCode ?? 'UNKNOWN_ERROR' })),
  };
}

// ── Transaction-Level Quick Fix ──────────────────────────────────
export async function quickFix(
  client: JazClient,
  entity: QuickFixEntity,
  body: { resourceIds: string[]; attributes: Record<string, unknown> },
): Promise<QuickFixResult> {
  const raw = await client.post<QuickFixResult>(`/api/v1/quick-fix/${entity}`, body);
  return normalizeQuickFixResult(raw);
}

// ── Line-Item-Level Quick Fix ────────────────────────────────────
// ARAP: { lineItemResourceIds: string[], attributes: {...} }
// Schedulers: { schedulerUpdates: [{ schedulerResourceId, lineItemUpdates: [...] }] }
export async function quickFixLineItems(
  client: JazClient,
  entity: QuickFixEntity,
  body: Record<string, unknown>,
): Promise<QuickFixResult> {
  const raw = await client.post<QuickFixResult>(`/api/v1/quick-fix/${entity}/line-items`, body);
  return normalizeQuickFixResult(raw);
}
