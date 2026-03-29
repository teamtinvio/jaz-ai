import { success, danger, warning, muted, accent } from './ui/theme.js';

const STATUS_COLORS: Record<string, (s: string) => string> = {
  DRAFT: warning,
  VOID: danger,
  VOIDED: danger,
  FAILED: danger,
  DELETED: danger,
  OVERDUE: danger,
  CANCELLED: muted,
  PENDING: warning,
  SUBMITTED: warning,
  PROCESSING: warning,
};

export function formatStatus(status?: string): string {
  const s = status || 'UNKNOWN';
  return (STATUS_COLORS[s] ?? success)(s);
}

// ── Shared column formatters (DRY across all command files) ─────

/** Format a resource ID in accent color. */
export function formatId(v: unknown): string {
  return accent(String(v));
}

/** Format a reference field, showing '(no ref)' for empty values. */
export function formatReference(v: unknown): string {
  return String(v || muted('(no ref)'));
}

/** Format a currency amount to 2 decimal places. Preserves decimal string precision. */
export function formatCurrency(v: unknown): string {
  if (v == null || v === '') return muted('-');
  const s = String(v);
  // If already a valid decimal string, format without binary float conversion
  if (/^-?\d+(\.\d+)?$/.test(s)) {
    const [int, dec] = s.split('.');
    return `$${int}.${(dec ?? '').padEnd(2, '0').slice(0, 2)}`;
  }
  const n = Number(v);
  return Number.isNaN(n) ? muted('-') : `$${n.toFixed(2)}`;
}

/** Format a payment direction as colored IN/OUT. */
export function formatDirection(v: unknown): string {
  return String(v) === 'PAYIN' ? success('IN') : danger('OUT');
}

/** Format an epoch-ms timestamp as YYYY-MM-DD. */
export function formatEpochDate(v: unknown): string {
  if (typeof v !== 'number' || v === 0 || Number.isNaN(v)) return muted('-');
  return new Date(v).toISOString().slice(0, 10);
}
