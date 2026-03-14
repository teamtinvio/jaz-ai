import chalk from 'chalk';

export interface TableColumn {
  /** Field key — supports dot notation for nested objects (e.g., "owner.name"). */
  key: string;
  /** Column header label. */
  header: string;
  /** Fixed width. Auto-computed from data if omitted. */
  width?: number;
  /** Text alignment (default: left). */
  align?: 'left' | 'right';
  /** Custom value formatter. Receives the raw value, returns display string. */
  format?: (val: unknown) => string;
}

/** Resolve a dot-notation key from an object (e.g., "owner.name" → obj.owner.name). */
function getNestedValue(obj: Record<string, unknown>, key: string): unknown {
  const parts = key.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

/** Strip ANSI escape codes for accurate width measurement. */
function stripAnsi(str: string): string {
  // eslint-disable-next-line no-control-regex
  return str.replace(/\x1b\[[0-9;]*m/g, '');
}

/** Truncate a string to maxLen, adding ellipsis if needed. ANSI-unaware (operates on plain text). */
function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  if (maxLen <= 3) return str.slice(0, maxLen);
  return str.slice(0, maxLen - 1) + '\u2026';
}

/** Pad a string to width, respecting ANSI codes. */
function padString(str: string, width: number, align: 'left' | 'right'): string {
  const visibleLen = stripAnsi(str).length;
  const padding = Math.max(0, width - visibleLen);
  if (align === 'right') return ' '.repeat(padding) + str;
  return str + ' '.repeat(padding);
}

/**
 * Format data as an aligned, colored table.
 *
 * Automatically computes column widths from data, respects terminal width,
 * and truncates values that don't fit. Headers are bold + dim.
 */
export function formatTable(data: Record<string, unknown>[], columns: TableColumn[]): string {
  if (data.length === 0) return '';

  const GAP = 2; // space between columns
  const termWidth = process.stdout.columns || 120;

  // Resolve all cell values
  const rows: string[][] = data.map((row) =>
    columns.map((col) => {
      const raw = getNestedValue(row, col.key);
      if (raw == null || raw === '') return '-';
      return col.format ? col.format(raw) : String(raw);
    }),
  );

  // Compute column widths: max of (header, all data values), capped by terminal
  const widths = columns.map((col, i) => {
    if (col.width) return col.width;
    const headerLen = col.header.length;
    const maxDataLen = rows.reduce((max, row) => Math.max(max, stripAnsi(row[i]).length), 0);
    return Math.max(headerLen, maxDataLen);
  });

  // Shrink columns to fit terminal width if needed
  const totalWidth = widths.reduce((sum, w) => sum + w, 0) + GAP * (widths.length - 1);
  if (totalWidth > termWidth && widths.length > 0) {
    const excess = totalWidth - termWidth;
    // Find the widest column and shrink it
    const widestIdx = widths.indexOf(Math.max(...widths));
    widths[widestIdx] = Math.max(8, widths[widestIdx] - excess);
  }

  // Build header
  const headerLine = columns
    .map((col, i) => padString(chalk.bold.dim(col.header), widths[i], col.align ?? 'left'))
    .join(' '.repeat(GAP));

  // Build separator
  const sepLine = widths.map((w) => chalk.dim('\u2500'.repeat(w))).join(' '.repeat(GAP));

  // Build data rows
  const dataLines = rows.map((row) =>
    columns
      .map((col, i) => {
        const plain = stripAnsi(row[i]);
        // Only truncate if the plain text exceeds width (don't truncate formatted/colored strings)
        const display = plain.length > widths[i] ? truncate(plain, widths[i]) : row[i];
        return padString(display, widths[i], col.align ?? 'left');
      })
      .join(' '.repeat(GAP)),
  );

  return [headerLine, sepLine, ...dataLines].join('\n');
}
