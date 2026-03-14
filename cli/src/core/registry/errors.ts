/**
 * Shared error formatting for tool execution.
 *
 * Used by both MCP (commands/mcp.ts) and daemon executor (registry/executor.ts)
 * to return structured error responses that agents can act on programmatically.
 */
import { JazApiError } from '../api/client.js';

export function statusHint(status: number): string {
  switch (status) {
    case 401: return 'Invalid or missing API key. Run `clio auth add` or set JAZ_API_KEY.';
    case 403: return 'Insufficient permissions for this operation.';
    case 404: return 'Resource not found — check the resourceId. Use a search/list tool to look it up.';
    case 409: return 'Conflict — resource may have been modified. Re-fetch and retry.';
    case 422: return 'Validation error — check field values against the tool description.';
    case 429: return 'Rate limited — wait a moment and retry.';
    default:  return '';
  }
}

export interface ToolErrorResult {
  error: string;
  status?: number;
  endpoint?: string;
  hint?: string;
}

export function formatToolError(err: unknown): ToolErrorResult {
  if (err instanceof JazApiError) {
    const hint = statusHint(err.status);
    return {
      error: err.message,
      status: err.status,
      endpoint: err.endpoint,
      ...(hint ? { hint } : {}),
    };
  }
  const msg = err instanceof Error ? err.message : String(err);
  return { error: msg };
}
