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
  /** Max items to fetch before stopping (default: unlimited). */
  maxItems?: number;
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
 * NOTE: offset = page number (0-indexed), NOT row-skip count.
 * offset=0 is page 1, offset=1 is page 2, etc.
 *
 * Strategy:
 *   1. First call at offset=0 → get totalElements
 *   2. Short-circuit if single page (total <= pageSize)
 *   3. Compute remaining page numbers, cap at MAX_OFFSET (65,536)
 *   4. Fire batches of `concurrency` concurrent requests via Promise.all
 *   5. Merge results in page order (Promise.all preserves order)
 */
export async function fetchAllPages<T>(
  fetcher: (offset: number, limit: number) => Promise<PaginatedResponse<T>>,
  options: FetchAllPagesOptions = {},
): Promise<FetchAllPagesResult<T>> {
  const pageSize = Math.min(Math.max(options.pageSize ?? DEFAULT_PAGE_SIZE, 1), 1000);
  const rawConcurrency = options.concurrency ?? DEFAULT_CONCURRENCY;
  const concurrency = Math.max(Math.floor(rawConcurrency), 1);
  const maxItems = options.maxItems ?? Infinity;
  const onProgress = options.onProgress;

  // ── Step 1: First page ──
  const firstPage = await fetcher(0, pageSize);
  const total = firstPage.totalElements;
  let requestCount = 1;

  // Short-circuit: single page, empty, or maxItems satisfied by first page
  if (total <= pageSize || firstPage.data.length >= maxItems) {
    const data = maxItems < Infinity ? firstPage.data.slice(0, maxItems) : firstPage.data;
    onProgress?.(data.length, total);
    return {
      data,
      totalElements: total,
      truncated: data.length < total,
      requestCount,
    };
  }

  // ── Step 2: Compute remaining page numbers ──
  // offset = page number (0-indexed). MAX_OFFSET is inclusive (API accepts 0–65536).
  const totalPages = Math.ceil(total / pageSize);
  const offsets: number[] = [];
  for (let page = 1; page < totalPages && page <= MAX_OFFSET; page++) {
    offsets.push(page);
  }
  // Truncated if there are pages beyond what the offset cap allows
  const truncated = totalPages > MAX_OFFSET + 1;

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
    if (allData.length >= maxItems) break;
  }

  const cappedData = maxItems < Infinity ? allData.slice(0, maxItems) : allData;

  return {
    data: cappedData,
    totalElements: total,
    truncated: truncated || cappedData.length < allData.length,
    requestCount,
  };
}
