/**
 * Pure grouping logic for outstanding bills.
 * Takes a Bill[] (already fetched via paginatedFetch) and groups by supplier.
 *
 * No API calls here — fetching + pagination is handled by the command layer
 * using paginatedFetch (DRY: same pattern as bills search/list).
 */

import type { Bill } from '../../../../api/types.js';
import type { OutstandingResult, SupplierGroup, OutstandingBill } from './types.js';

export interface GroupOutstandingOptions {
  currency?: string;
  dueBefore?: string;
}

/**
 * Normalize date — API may return epoch ms (int64) or YYYY-MM-DD string.
 * Field-map says all response dates are epoch ms, but Bill type has string.
 * Handle both defensively. Always returns zero-padded YYYY-MM-DD for safe
 * lexicographic comparison.
 */
function normalizeDate(d: string | number): string {
  if (typeof d === 'number') return new Date(d).toISOString().slice(0, 10);
  // Ensure zero-padded YYYY-MM-DD (handles non-padded like "2026-1-5")
  const m = d.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  return d;
}

/**
 * Group fetched bills by supplier and compute summary statistics.
 * Suppliers are sorted by total balance descending (highest owed first).
 */
export function groupOutstandingBills(
  bills: Bill[],
  opts: GroupOutstandingOptions = {},
): OutstandingResult {
  const today = new Date().toISOString().slice(0, 10);

  if (bills.length === 0) {
    return {
      type: 'outstanding',
      totalBills: 0,
      totalBalance: 0,
      currency: opts.currency ?? 'SGD',
      supplierCount: 0,
      overdueCount: 0,
      asOfDate: today,
      dueBefore: opts.dueBefore,
      suppliers: [],
    };
  }

  // Group by supplier
  const groupMap = new Map<string, OutstandingBill[]>();
  for (const b of bills) {
    const key = b.contactResourceId ?? '__unassigned__';
    const currency = b.currency?.sourceCurrency ?? opts.currency ?? 'SGD';
    const dueDate = normalizeDate(b.dueDate as string | number);
    const outstanding: OutstandingBill = {
      resourceId: b.resourceId,
      reference: b.reference,
      valueDate: normalizeDate(b.valueDate as string | number),
      dueDate,
      totalAmount: b.totalAmount ?? 0,
      balanceAmount: b.balanceAmount ?? b.totalAmount ?? 0,
      contactResourceId: b.contactResourceId,
      contactName: b.contactName ?? b.contactResourceId ?? 'Unassigned',
      currency,
      isOverdue: dueDate < today,
    };
    const group = groupMap.get(key) ?? [];
    group.push(outstanding);
    groupMap.set(key, group);
  }

  // Build supplier groups sorted by total balance descending
  const suppliers: SupplierGroup[] = [...groupMap.entries()]
    .map(([contactResourceId, groupBills]) => ({
      contactResourceId,
      contactName: groupBills[0].contactName,
      billCount: groupBills.length,
      totalBalance: groupBills.reduce((s, b) => s + b.balanceAmount, 0),
      earliestDueDate: groupBills.reduce((min, b) => b.dueDate < min ? b.dueDate : min, groupBills[0].dueDate),
      overdueCount: groupBills.filter(b => b.isOverdue).length,
      bills: groupBills,
    }))
    .sort((a, b) => b.totalBalance - a.totalBalance);

  const totalBalance = suppliers.reduce((s, g) => s + g.totalBalance, 0);
  const overdueCount = bills.filter(b => normalizeDate(b.dueDate as string | number) < today).length;
  const currency = opts.currency ?? bills[0]?.currency?.sourceCurrency ?? 'SGD';

  return {
    type: 'outstanding',
    totalBills: bills.length,
    totalBalance,
    currency,
    supplierCount: suppliers.length,
    overdueCount,
    asOfDate: today,
    dueBefore: opts.dueBefore,
    suppliers,
  };
}
