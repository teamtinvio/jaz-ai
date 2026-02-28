import type { AuthConfig } from '../auth/types.js';
import type { PaginatedResponse, PaginationParams, SearchParams } from './types.js';

const DEFAULT_BASE_URL = 'https://api.getjaz.com';
const DEFAULT_TIMEOUT = 30_000;
const MAX_RETRIES = 3;
const RETRY_STATUS_CODES = [429, 503];

export interface ClientOptions {
  baseUrl?: string;
  timeout?: number;
  maxRetries?: number;
}

export class JazApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body: unknown,
    public readonly endpoint: string,
  ) {
    super(message);
    this.name = 'JazApiError';
  }
}

/**
 * Jaz REST API client.
 *
 * All dates: YYYY-MM-DD strings.
 * Pagination: limit/offset (NOT page/size).
 * Entity IDs: resourceId (NOT id).
 */
export class JazClient {
  private readonly baseUrl: string;
  private readonly timeout: number;
  private readonly maxRetries: number;
  private readonly auth: AuthConfig;

  constructor(auth: AuthConfig, options: ClientOptions = {}) {
    this.auth = auth;
    this.baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, '');
    this.timeout = options.timeout ?? DEFAULT_TIMEOUT;
    this.maxRetries = options.maxRetries ?? MAX_RETRIES;
  }

  // ── Auth Headers ──────────────────────────────────────────────

  private buildHeaders(extra?: Record<string, string>): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...extra,
    };

    headers["x-jk-api-key"] = (this.auth as any).apiKey;

    return headers;
  }

  // ── Core Request ──────────────────────────────────────────────

  private async request<T>(
    method: string,
    path: string,
    options: {
      body?: unknown;
      query?: Record<string, string | number | undefined>;
      headers?: Record<string, string>;
      raw?: boolean;
    } = {},
  ): Promise<T> {
    const url = new URL(`${this.baseUrl}${path}`);
    if (options.query) {
      for (const [k, v] of Object.entries(options.query)) {
        if (v !== undefined) url.searchParams.set(k, String(v));
      }
    }

    const headers = this.buildHeaders(options.headers);
    if (options.raw) {
      delete headers['Content-Type'];
    }

    const fetchOptions: RequestInit = {
      method,
      headers,
      signal: AbortSignal.timeout(this.timeout),
    };

    if (options.body !== undefined && method !== 'GET' && method !== 'DELETE') {
      fetchOptions.body = options.raw
        ? (options.body as BodyInit)
        : JSON.stringify(options.body);
    }

    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await fetch(url.toString(), fetchOptions);

        if (RETRY_STATUS_CODES.includes(response.status) && attempt < this.maxRetries) {
          const delay = Math.min(1000 * 2 ** attempt, 8000);
          await sleep(delay);
          continue;
        }

        if (!response.ok) {
          let body: unknown;
          try {
            body = await response.json();
          } catch {
            body = await response.text();
          }
          throw new JazApiError(
            `${method} ${path} → ${response.status}: ${formatErrorBody(body)}`,
            response.status,
            body,
            path,
          );
        }

        // Some endpoints return 204 No Content
        if (response.status === 204) {
          return undefined as T;
        }

        return (await response.json()) as T;
      } catch (err) {
        if (err instanceof JazApiError) throw err;
        lastError = err as Error;
        if (attempt < this.maxRetries) {
          const delay = Math.min(1000 * 2 ** attempt, 8000);
          await sleep(delay);
          continue;
        }
      }
    }

    throw lastError ?? new Error(`Request failed: ${method} ${path}`);
  }

  // ── Convenience Methods ───────────────────────────────────────

  async get<T>(path: string, query?: Record<string, string | number | undefined>): Promise<T> {
    return this.request<T>('GET', path, { query });
  }

  async post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('POST', path, { body });
  }

  async put<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('PUT', path, { body });
  }

  async delete<T>(path: string): Promise<T> {
    return this.request<T>('DELETE', path);
  }

  async postMultipart<T>(path: string, formData: FormData): Promise<T> {
    return this.request<T>('POST', path, { body: formData, raw: true });
  }

  // ── Pagination Helpers ────────────────────────────────────────

  async list<T>(path: string, params?: PaginationParams): Promise<PaginatedResponse<T>> {
    return this.get<PaginatedResponse<T>>(path, {
      limit: params?.limit ?? 100,
      offset: params?.offset ?? 0,
    });
  }

  async search<T>(path: string, params: SearchParams): Promise<PaginatedResponse<T>> {
    const body: Record<string, unknown> = {};
    if (params.filter) body.filter = params.filter;
    if (params.limit !== undefined) body.limit = params.limit;
    if (params.offset !== undefined) body.offset = params.offset;
    // sort is REQUIRED when offset is present
    if (params.sort) {
      body.sort = params.sort;
    } else if (params.offset !== undefined) {
      body.sort = { sortBy: ['createdAt'], order: 'DESC' };
    }
    return this.post<PaginatedResponse<T>>(path, body);
  }

  /**
   * Fetch all pages of a list endpoint.
   * Use with caution — only for bounded datasets (e.g. chart of accounts, tax profiles).
   */
  async listAll<T>(path: string, pageSize = 200): Promise<T[]> {
    const all: T[] = [];
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      const page = await this.list<T>(path, { limit: pageSize, offset });
      all.push(...page.data);
      offset += pageSize;
      hasMore = offset < page.totalElements;
    }

    return all;
  }
}

// ── Helpers ─────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatErrorBody(body: unknown): string {
  if (typeof body === 'string') return body;
  if (body && typeof body === 'object') {
    const obj = body as Record<string, unknown>;
    if (typeof obj.message === 'string') return obj.message;
    if (typeof obj.error === 'string') return obj.error;
    // API error shape: { error: { error_type, errors: string[] } }
    if (obj.error && typeof obj.error === 'object') {
      const err = obj.error as Record<string, unknown>;
      if (Array.isArray(err.errors) && err.errors.length > 0) {
        return err.errors.join('; ');
      }
      if (typeof err.error_type === 'string') return err.error_type;
    }
    return JSON.stringify(body);
  }
  return String(body);
}
