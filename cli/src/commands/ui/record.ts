/**
 * Key-value record renderer for single-item display.
 * Replaces the raw JSON.stringify dump in outputRecord() table mode.
 */
import { muted, accent, success, danger, INDENT } from './theme.js';
import { formatStatus, formatId, formatCurrency, formatEpochDate } from '../format-helpers.js';

/**
 * Auto-format a value based on its key name and type.
 */
function autoFormat(key: string, val: unknown): string {
  if (val == null) return muted('-');

  const k = key.toLowerCase();

  // ResourceId fields → cyan
  if (k === 'resourceid' || k.endsWith('resourceid')) return formatId(val);

  // Status fields → colored
  if (k === 'status' || k.endsWith('status')) return formatStatus(String(val));

  // Amount/money fields → currency (NOT rates — rates are plain decimals)
  if (k.includes('amount') || k.includes('total') || k.includes('balance')) {
    const n = Number(val);
    if (!Number.isNaN(n)) return formatCurrency(n);
  }

  // Epoch date fields → YYYY-MM-DD
  if ((k.includes('date') || k.includes('at')) && typeof val === 'number' && val > 1_000_000_000_000) {
    return formatEpochDate(val);
  }

  // Booleans → colored
  if (typeof val === 'boolean') return val ? success('true') : danger('false');

  // Arrays → count hint
  if (Array.isArray(val)) return muted(`[${val.length} items]`);

  // Objects → inline hint
  if (typeof val === 'object') return muted(JSON.stringify(val));

  return String(val);
}

/**
 * Convert camelCase key to Title Case label.
 */
function toLabel(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (c) => c.toUpperCase())
    .trim();
}

/**
 * Render a record as aligned key-value pairs.
 *
 * ```
 *   Reference    INV-001
 *   Status       APPROVED
 *   Total        $1,000.00
 * ```
 */
export function formatRecord(record: Record<string, unknown>): string {
  const entries = Object.entries(record).filter(([, v]) => v !== undefined);
  if (entries.length === 0) return `${INDENT}(empty)`;

  const labels = entries.map(([k]) => toLabel(k));
  const maxLabelLen = Math.max(...labels.map((l) => l.length));

  return entries
    .map(([key, val], i) => {
      const label = labels[i].padEnd(maxLabelLen);
      const value = autoFormat(key, val);
      return `${INDENT}${accent(label)}  ${value}`;
    })
    .join('\n');
}
