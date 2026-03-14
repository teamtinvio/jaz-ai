import chalk from 'chalk';
import { stringify as yamlStringify } from 'yaml';
import { formatTable, type TableColumn } from './table-formatter.js';
import { displaySlice, paginatedJson, type PaginatedFetchResult, type PaginatedOpts } from './pagination.js';

export type OutputFormat = 'json' | 'table' | 'csv' | 'yaml';

export interface OutputOpts extends PaginatedOpts {
  format?: string;
}

/** Resolve the output format from CLI flags. --json is shorthand for --format json. */
export function resolveFormat(opts: OutputOpts): OutputFormat {
  if (opts.json && opts.format) {
    throw new Error('Cannot use both --json and --format. Use one or the other.');
  }
  if (opts.json) return 'json';
  if (opts.format) {
    const f = opts.format.toLowerCase();
    if (f === 'json' || f === 'table' || f === 'csv' || f === 'yaml') return f;
    throw new Error(`Unknown format "${opts.format}". Supported: json, table, csv, yaml`);
  }
  return 'table';
}

/** Returns true if the resolved format suppresses human-only output (org banner, progress). */
export function isMachineFormat(opts: OutputOpts): boolean {
  const fmt = resolveFormat(opts);
  return fmt !== 'table';
}

// ── CSV helpers ──────────────────────────────────────────────────

/** Strip ANSI escape codes so CSV output is clean. */
function stripAnsi(str: string): string {
  // eslint-disable-next-line no-control-regex
  return str.replace(/\x1b\[[0-9;]*m/g, '');
}

function csvEscape(val: string): string {
  if (val.includes('"') || val.includes(',') || val.includes('\n')) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}

function serializeCsvValue(val: unknown): string {
  if (val == null) return '';
  if (typeof val === 'object') return JSON.stringify(val);
  return String(val);
}

function toCsv(data: Record<string, unknown>[], columns: TableColumn[]): string {
  const header = columns.map((c) => csvEscape(c.header)).join(',');
  const rows = data.map((row) =>
    columns
      .map((col) => {
        const raw = getNestedValue(row, col.key);
        if (raw == null || raw === '') return '';
        const rendered = col.format ? stripAnsi(col.format(raw)) : serializeCsvValue(raw);
        return csvEscape(rendered);
      })
      .join(','),
  );
  return [header, ...rows].join('\n');
}

function getNestedValue(obj: Record<string, unknown>, key: string): unknown {
  const parts = key.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

// ── Public API ───────────────────────────────────────────────────

/**
 * Output a paginated list in the requested format.
 * For table format, applies displaySlice cap and overflow message.
 */
export function outputList(
  result: PaginatedFetchResult<Record<string, unknown>>,
  columns: TableColumn[],
  opts: OutputOpts,
  label: string,
): void {
  const fmt = resolveFormat(opts);

  switch (fmt) {
    case 'json':
      console.log(paginatedJson(result, opts));
      break;

    case 'csv':
      console.log(toCsv(result.data, columns));
      break;

    case 'yaml':
      console.log(yamlStringify({ totalElements: result.totalElements, totalPages: result.totalPages, truncated: result.truncated, data: result.data }).trimEnd());
      break;

    case 'table': {
      console.log(chalk.bold(`${label} (${result.data.length} of ${result.totalElements}):\n`));
      const { items, overflow } = displaySlice(result.data);
      if (items.length === 0) {
        console.log('  No results found.');
        return;
      }
      console.log(formatTable(items as Record<string, unknown>[], columns));
      if (overflow > 0) console.log(chalk.dim(`\n  ... and ${overflow.toLocaleString()} more (use --format json for full output)`));
      break;
    }
  }
}

/**
 * Output a single record in the requested format.
 */
export function outputRecord(record: Record<string, unknown>, opts: OutputOpts): void {
  const fmt = resolveFormat(opts);

  switch (fmt) {
    case 'json':
      console.log(JSON.stringify(record, null, 2));
      break;
    case 'csv': {
      const keys = Object.keys(record);
      console.log(keys.map(csvEscape).join(','));
      console.log(keys.map((k) => csvEscape(serializeCsvValue(record[k]))).join(','));
      break;
    }
    case 'yaml':
      console.log(yamlStringify(record).trimEnd());
      break;
    case 'table':
      console.log(JSON.stringify(record, null, 2));
      break;
  }
}
