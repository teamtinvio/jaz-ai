import chalk from 'chalk';

const STATUS_COLORS: Record<string, (s: string) => string> = {
  DRAFT: chalk.yellow,
  VOID: chalk.red,
  VOIDED: chalk.red,
  FAILED: chalk.red,
  DELETED: chalk.red,
};

export function formatStatus(status?: string): string {
  const s = status || 'UNKNOWN';
  return (STATUS_COLORS[s] ?? chalk.green)(s);
}

// ── Shared column formatters (DRY across all command files) ─────

/** Format a resource ID in cyan. */
export function formatId(v: unknown): string {
  return chalk.cyan(String(v));
}

/** Format a reference field, showing '(no ref)' for empty values. */
export function formatReference(v: unknown): string {
  return String(v || '(no ref)');
}

/** Format a currency amount to 2 decimal places. */
export function formatCurrency(v: unknown): string {
  return v != null ? `$${Number(v).toFixed(2)}` : '-';
}

/** Format a payment direction as colored IN/OUT. */
export function formatDirection(v: unknown): string {
  return String(v) === 'PAYIN' ? chalk.green('IN') : chalk.red('OUT');
}

/** Format an epoch-ms timestamp as YYYY-MM-DD. */
export function formatEpochDate(v: unknown): string {
  if (typeof v !== 'number' || v === 0 || Number.isNaN(v)) return '-';
  return new Date(v).toISOString().slice(0, 10);
}
