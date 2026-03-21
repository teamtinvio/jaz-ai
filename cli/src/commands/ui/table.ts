/**
 * Modern table renderer — rounded borders, alternating rows, brand colors.
 *
 * Same public API as the old table-formatter.ts: formatTable(data, columns).
 * All 48 command files import via table-formatter.ts (thin re-export).
 */
import { box, muted, highlight, isTTY, COL_GAP } from './theme.js';

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

// ── Helpers ──────────────────────────────────────────────────────

function getNestedValue(obj: Record<string, unknown>, key: string): unknown {
  const parts = key.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

function stripAnsi(str: string): string {
  // eslint-disable-next-line no-control-regex
  return str.replace(/\x1b\[[0-9;]*m/g, '');
}

function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  if (maxLen <= 3) return str.slice(0, maxLen);
  return str.slice(0, maxLen - 1) + '\u2026';
}

function padString(str: string, width: number, align: 'left' | 'right'): string {
  const visibleLen = stripAnsi(str).length;
  const padding = Math.max(0, width - visibleLen);
  if (align === 'right') return ' '.repeat(padding) + str;
  return str + ' '.repeat(padding);
}

// ── Table Renderer ───────────────────────────────────────────────

/**
 * Format data as a polished, bordered table.
 *
 * TTY: rounded borders, alternating row dim, bold header.
 * Non-TTY: borderless plain text (safe for pipes, CI, agents).
 */
export function formatTable(data: Record<string, unknown>[], columns: TableColumn[]): string {
  if (data.length === 0) return '';

  const termWidth = process.stdout.columns || 120;
  const useBorders = isTTY() && termWidth >= 50;

  // Resolve all cell values
  const rows: string[][] = data.map((row) =>
    columns.map((col) => {
      const raw = getNestedValue(row, col.key);
      if (raw == null || raw === '') return '-';
      return col.format ? col.format(raw) : String(raw);
    }),
  );

  // Compute column widths
  const widths = columns.map((col, i) => {
    if (col.width) return col.width;
    const headerLen = col.header.length;
    const maxDataLen = rows.reduce((max, row) => Math.max(max, stripAnsi(row[i]).length), 0);
    return Math.max(headerLen, maxDataLen);
  });

  // Border overhead: │ + space + ... + space + │ = 4 chars
  const borderOverhead = useBorders ? 4 : 0;
  const contentWidth = widths.reduce((sum, w) => sum + w, 0) + COL_GAP * (widths.length - 1);

  // Shrink widest column to fit terminal
  if (contentWidth + borderOverhead > termWidth && widths.length > 0) {
    const excess = contentWidth + borderOverhead - termWidth;
    const widestIdx = widths.indexOf(Math.max(...widths));
    widths[widestIdx] = Math.max(8, widths[widestIdx] - excess);
  }

  const innerWidth = widths.reduce((sum, w) => sum + w, 0) + COL_GAP * (widths.length - 1);
  const gap = ' '.repeat(COL_GAP);

  // ── Build rows ──

  const headerCells = columns
    .map((col, i) => padString(highlight(col.header), widths[i], col.align ?? 'left'))
    .join(gap);

  const dataLines = rows.map((row, rowIdx) => {
    const cells = columns
      .map((col, i) => {
        const plain = stripAnsi(row[i]);
        const display = plain.length > widths[i] ? truncate(plain, widths[i]) : row[i];
        return padString(display, widths[i], col.align ?? 'left');
      })
      .join(gap);

    // Subtle alternating rows (even rows dimmed) — TTY only
    if (useBorders && rowIdx % 2 === 1) return muted(cells);
    return cells;
  });

  if (!useBorders) {
    // Plain mode (pipes, CI, narrow terminal)
    const sepLine = widths.map((w) => muted('\u2500'.repeat(w))).join(gap);
    return [headerCells, sepLine, ...dataLines].join('\n');
  }

  // ── Bordered mode ──

  const hr = box.horizontal.repeat(innerWidth + 2);
  const topBorder = muted(`${box.topLeft}${hr}${box.topRight}`);
  const headerSep = muted(`${box.leftT}${hr}${box.rightT}`);
  const bottomBorder = muted(`${box.bottomLeft}${hr}${box.bottomRight}`);
  const v = muted(box.vertical);

  const headerRow = `${v} ${headerCells}${' '.repeat(Math.max(0, innerWidth - stripAnsi(headerCells).length))} ${v}`;
  const bodyRows = dataLines.map((line) => {
    const pad = Math.max(0, innerWidth - stripAnsi(line).length);
    return `${v} ${line}${' '.repeat(pad)} ${v}`;
  });

  return [topBorder, headerRow, headerSep, ...bodyRows, bottomBorder].join('\n');
}
