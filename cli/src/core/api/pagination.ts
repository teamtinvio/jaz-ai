import type { PaginatedResponse } from './types.js';

/** Hard API limit — offsets beyond this return validation errors */
const MAX_OFFSET = 65_536;

/** Default concurrent batch size */
const DEFAULT_CONCURRENCY = 5;

/** Default page size for auto-pagination */
const DEFAULT_PAGE_SIZE = 200;

export interface FetchAllPagesOptions {
  /** Items per page (default 200, max 1000). */
  pageSize?: number;
  /** Max concurrent requests (default 5). */
  concurrency?: number;
  /** Called after first page and after each concurrent batch. */
  onProgress?: (fetched: number, total: number) => void;
}

export interface FetchAllPagesResult<T> {
  data: T[];
  totalElements: number;
  /** True if dataset exceeded MAX_OFFSET and was truncated. */
  truncated: boolean;
  /** Number of API calls made. */
  requestCount: number;
}

/**
 * Fetch all pages from a paginated endpoint using concurrent batching.
 *
 * Works with any endpoint returning PaginatedResponse<T> — the caller
 * wraps their specific API call into a (offset, limit) => Promise lambda.
 *
 * Strategy:
 *   1. First call at offset=0 → get totalElements
 *   2. Short-circuit if single page (total <= pageSize)
 *   3. Compute remaining offsets, cap at MAX_OFFSET (65,536)
 *   4. Fire batches of `concurrency` concurrent requests via Promise.all
 *   5. Merge results in offset order (Promise.all preserves order)
 */
export async function fetchAllPages<T>(
  fetcher: (offset: number, limit: number) => Promise<PaginatedResponse<T>>,
  options: FetchAllPagesOptions = {},
): Promise<FetchAllPagesResult<T>> {
  const pageSize = Math.min(Math.max(options.pageSize ?? DEFAULT_PAGE_SIZE, 1), 1000);
  const rawConcurrency = options.concurrency ?? DEFAULT_CONCURRENCY;
  const concurrency = Math.max(Math.floor(rawConcurrency), 1);
  const onProgress = options.onProgress;

  // ── Step 1: First page ──
  const firstPage = await fetcher(0, pageSize);
  const total = firstPage.totalElements;
  let requestCount = 1;

  // Short-circuit: single page or empty
  if (total <= pageSize) {
    onProgress?.(firstPage.data.length, total);
    return {
      data: firstPage.data,
      totalElements: total,
      truncated: false,
      requestCount,
    };
  }

  // ── Step 2: Compute remaining offsets ──
  // MAX_OFFSET is inclusive — API accepts offset=65536, rejects 65537+
  const offsets: number[] = [];
  for (let offset = pageSize; offset < total && offset <= MAX_OFFSET; offset += pageSize) {
    offsets.push(offset);
  }
  // Truncated if there are items beyond what we can fetch
  const maxFetchable = (offsets.length + 1) * pageSize;
  const truncated = total > maxFetchable;

  // ── Step 3: Concurrent batched fetching ──
  const allData: T[] = [...firstPage.data];
  onProgress?.(allData.length, total);

  for (let i = 0; i < offsets.length; i += concurrency) {
    const batch = offsets.slice(i, i + concurrency);
    const pages = await Promise.all(
      batch.map((offset) => fetcher(offset, pageSize)),
    );
    requestCount += pages.length;

    for (const page of pages) {
      allData.push(...page.data);
    }
    onProgress?.(allData.length, total);
  }

  return {
    data: allData,
    totalElements: total,
    truncated,
    requestCount,
  };
}
