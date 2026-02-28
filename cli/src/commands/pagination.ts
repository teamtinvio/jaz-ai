import chalk from 'chalk';
import type { PaginatedResponse } from '../core/api/types.js';
import { fetchAllPages } from '../core/api/pagination.js';

export interface PaginatedOpts {
  all?: boolean;
  limit?: number;
  offset?: number;
  maxRows?: number;
  json?: boolean;
}

export interface PaginatedFetchOptions {
  /** Label for progress display (e.g., "Fetching invoices"). */
  label: string;
  /** Default limit for single-page mode (default 100). */
  defaultLimit?: number;
}

export interface PaginatedFetchResult<T> {
  data: T[];
  totalElements: number;
  totalPages: number;
  truncated: boolean;
}

/** Default row cap for --all mode. Prevents runaway fetches and agent token waste. */
const DEFAULT_MAX_ROWS = 10_000;

/** Display cap for human (non-JSON) output. */
const DISPLAY_CAP = 500;

/**
 * Shared pagination handler for all CLI list/search commands.
 *
 * Handles:
 *   - --all + --offset conflict detection
 *   - Auto-pagination with concurrent fetching when --all is set
 *   - --max-rows soft cap (default 10,000) to prevent runaway fetches
 *   - Progress display on stderr (TTY-aware, suppressed for --json)
 *   - Truncation metadata (truncated field) for agent consumption
 *   - Single-page fetch when --all is not set
 *
 * Usage:
 *   const { data, totalElements, truncated } = await paginatedFetch(
 *     opts,
 *     (p) => listInvoices(client, p),
 *     { label: 'Fetching invoices' },
 *   );
 */
export async function paginatedFetch<T>(
  opts: PaginatedOpts,
  fetcher: (params: { limit: number; offset: number }) => Promise<PaginatedResponse<T>>,
  options: PaginatedFetchOptions,
): Promise<PaginatedFetchResult<T>> {
  const defaultLimit = options.defaultLimit ?? 100;

  // ── Conflict check ──
  if (opts.all && opts.offset !== undefined) {
    throw new Error('--all and --offset cannot be used together');
  }

  // ── Auto-paginate mode ──
  if (opts.all) {
    const showProgress = !opts.json && process.stderr.isTTY;

    const result = await fetchAllPages<T>(
      (offset, limit) => fetcher({ limit, offset }),
      {
        pageSize: opts.limit ?? 200,
        onProgress: showProgress
          ? (fetched, total) => {
              process.stderr.write(`\r${chalk.dim(`${options.label}... ${fetched.toLocaleString()}/${total.toLocaleString()}`)}`);
            }
          : undefined,
      },
    );

    if (showProgress) {
      process.stderr.write('\r\x1b[K'); // clear progress line
    }

    // Apply max-rows soft cap
    const maxRows = opts.maxRows ?? DEFAULT_MAX_ROWS;
    let { truncated } = result;
    let { data } = result;
    if (data.length > maxRows) {
      data = data.slice(0, maxRows);
      truncated = true;
    }

    if (truncated && !opts.json) {
      console.error(
        chalk.yellow(
          `Warning: dataset has ${result.totalElements.toLocaleString()} items — showing ${data.length.toLocaleString()} (max-rows: ${maxRows.toLocaleString()})`,
        ),
      );
    }

    const pageSize = opts.limit ?? defaultLimit;
    const totalPages = Math.ceil(result.totalElements / pageSize);
    return { data, totalElements: result.totalElements, totalPages, truncated };
  }

  // ── Single-page mode ──
  const limit = opts.limit ?? defaultLimit;
  const res = await fetcher({
    limit,
    offset: opts.offset ?? 0,
  });

  const truncated = res.totalElements > res.data.length;
  return { data: res.data, totalElements: res.totalElements, totalPages: res.totalPages, truncated };
}

/**
 * Slice data for human-mode display. Cap at 500 rows to keep terminal output readable.
 * Returns the items to display and the overflow count.
 */
export function displaySlice<T>(data: T[], cap = DISPLAY_CAP): { items: T[]; overflow: number } {
  if (data.length <= cap) return { items: data, overflow: 0 };
  return { items: data.slice(0, cap), overflow: data.length - cap };
}

/**
 * Build the standard JSON envelope for paginated list/search commands.
 * Includes truncation metadata when data was capped.
 */
export function paginatedJson(result: PaginatedFetchResult<unknown>, opts: PaginatedOpts): string {
  const { totalElements, totalPages, truncated, data } = result;
  if (truncated) {
    const maxRows = opts.maxRows ?? DEFAULT_MAX_ROWS;
    return JSON.stringify({ totalElements, totalPages, truncated, _meta: { fetchedRows: data.length, maxRows }, data }, null, 2);
  }
  return JSON.stringify({ totalElements, totalPages, truncated, data }, null, 2);
}
