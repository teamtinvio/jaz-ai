/**
 * Rich error formatting — left-border framed errors with actionable suggestions.
 */
import { danger, warning, muted, box, sym, INDENT } from './theme.js';

// ── Status → Suggestion mapping ─────────────────────────────────

const SUGGESTIONS: Record<number, string> = {
  400: 'Check request format. The server could not parse the request body.',
  401: 'API key may be invalid. Run `clio auth whoami` to check.',
  403: 'Permission denied. Check your API key scope.',
  404: 'Resource not found. Check the ID and try again.',
  409: 'Conflict — the resource may have been modified. Refresh and retry.',
  422: 'Validation failed. Check your input fields.',
  429: 'Rate limited. Wait a moment and try again.',
};

function getSuggestion(status: number): string {
  if (SUGGESTIONS[status]) return SUGGESTIONS[status];
  if (status >= 500) return 'Server error. Try again shortly.';
  return '';
}

// ── Public API ───────────────────────────────────────────────────

/**
 * Format an API error with left-border framing and suggestion.
 *
 * ```
 *   │
 *   │  API Error (404)
 *   │  GET /api/v1/invoices/bad-id
 *   │
 *   │  Resource not found. Check the ID and try again.
 *   │
 * ```
 */
export function formatApiError(status: number, message: string, endpoint?: string): string {
  const v = danger(box.vertical);
  const lines: string[] = [
    `${INDENT}${v}`,
    `${INDENT}${v}  ${danger(`API Error (${status})`)}`,
  ];
  if (endpoint) {
    lines.push(`${INDENT}${v}  ${muted(endpoint)}`);
  }
  lines.push(`${INDENT}${v}`);

  const suggestion = getSuggestion(status);
  if (suggestion) {
    lines.push(`${INDENT}${v}  ${suggestion}`);
    lines.push(`${INDENT}${v}`);
  }

  // Include the raw message if it adds info beyond the suggestion
  const msgClean = message.replace(/^.*?→\s*\d+:\s*/, '').trim();
  if (msgClean && msgClean !== suggestion) {
    // Insert after title+endpoint (or just title if no endpoint)
    const insertIdx = endpoint ? 3 : 2;
    lines.splice(insertIdx, 0, `${INDENT}${v}  ${muted(msgClean)}`);
  }

  return lines.join('\n');
}

/**
 * Format an auth error with left-border framing.
 */
export function formatAuthError(message: string): string {
  const v = danger(box.vertical);
  return [
    `${INDENT}${v}`,
    `${INDENT}${v}  ${danger(`${sym.cross} Auth Error`)}`,
    `${INDENT}${v}  ${message}`,
    `${INDENT}${v}`,
    `${INDENT}${v}  Run ${muted('clio auth add <key>')} to authenticate.`,
    `${INDENT}${v}`,
  ].join('\n');
}

/**
 * Format a generic error with left-border framing.
 */
export function formatGenericError(message: string): string {
  const v = danger(box.vertical);
  return [
    `${INDENT}${v}`,
    `${INDENT}${v}  ${danger(`${sym.cross} Error`)}`,
    `${INDENT}${v}  ${message}`,
    `${INDENT}${v}`,
  ].join('\n');
}

/**
 * Format a warning (non-fatal) with left-border framing.
 */
export function formatWarning(message: string): string {
  const v = warning(box.vertical);
  return [
    `${INDENT}${v}`,
    `${INDENT}${v}  ${warning(`${sym.warning} Warning`)}`,
    `${INDENT}${v}  ${message}`,
    `${INDENT}${v}`,
  ].join('\n');
}
