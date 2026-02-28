/**
 * Pagination mode helpers for list/search tools.
 * Moved from agent/tools.ts — shared by all list/search tool execute functions.
 */
import { fetchAllPages } from '../api/pagination.js';
import type { PaginatedResponse } from '../api/types.js';

/**
 * Handle pagination mode for list/search tools.
 * DRY helper — all list/search tools route through this.
 *
 * Modes:
 *   - default (omit mode): caller sets limit/offset
 *   - 'sample': returns 20 items + totalElements metadata
 *   - 'all': fetches all pages concurrently via fetchAllPages
 */
export async function handlePaginationMode<T>(
  mode: string | undefined,
  fetcher: (offset: number, limit: number) => Promise<PaginatedResponse<T>>,
  limit: number | undefined,
  offset: number | undefined,
  defaultLimit: number,
): Promise<unknown> {
  switch (mode) {
    case 'all': {
      const pageSize = Math.min(Math.max(limit ?? 200, 1), 1000);
      const result = await fetchAllPages(fetcher, { pageSize, concurrency: 3 });
      return {
        _mode: 'all',
        _note: result.truncated
          ? `Fetched ${result.data.length} of ${result.totalElements} items (offset cap: 65,536). ${result.requestCount} API calls.`
          : `Fetched all ${result.totalElements} items. ${result.requestCount} API calls.`,
        data: result.data,
        totalElements: result.totalElements,
        truncated: result.truncated,
      };
    }
    case 'sample': {
      const result = await fetcher(0, 20);
      return {
        _mode: 'sample',
        _note: `Showing ${result.data.length} of ${result.totalElements} items. Use limit/offset to page, or mode 'all' to fetch everything.`,
        data: result.data,
        totalElements: result.totalElements,
        totalPages: result.totalPages,
      };
    }
    default:
      return fetcher(offset ?? 0, limit ?? defaultLimit);
  }
}

/** Build a credit note search filter from agent input (shared by customer + supplier CN search). */
export function buildCnFilter(input: Record<string, unknown>): Record<string, unknown> | undefined {
  const f: Record<string, unknown> = {};
  if (input.reference) f.reference = { contains: input.reference };
  if (input.status) f.status = { eq: input.status };
  if (input.contactResourceId) f.contactResourceId = { eq: input.contactResourceId };
  return Object.keys(f).length > 0 ? f : undefined;
}
