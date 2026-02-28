import chalk from 'chalk';
import { readFileSync } from 'node:fs';

/**
 * Parse a positive integer from CLI input.
 * Validates base-10, finite, and > 0. Exits with code 1 on invalid input.
 */
export function parsePositiveInt(raw: string): number {
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n <= 0) {
    console.error(chalk.red(`Error: invalid positive integer: ${raw}`));
    process.exit(1);
  }
  return n;
}

/**
 * Parse a non-negative integer from CLI input (allows 0).
 * Exits with code 1 on invalid input.
 */
export function parseNonNegativeInt(raw: string): number {
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 0) {
    console.error(chalk.red(`Error: invalid non-negative integer: ${raw}`));
    process.exit(1);
  }
  return n;
}

/**
 * Parse a money amount from CLI input.
 * Validates max 2 decimal places and normalizes to 2dp.
 * Exits with code 1 on invalid input.
 */
export function parseMoney(raw: string): number {
  if (!/^-?\d+(\.\d{1,2})?$/.test(raw)) {
    console.error(chalk.red(`Error: invalid amount: ${raw} (max 2 decimal places)`));
    process.exit(1);
  }
  return Math.round(Number(raw) * 100) / 100;
}

/**
 * Parse a positive exchange rate from CLI input.
 * Exits with code 1 on invalid input.
 */
export function parseRate(raw: string): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) {
    console.error(chalk.red(`Error: invalid exchange rate: ${raw}`));
    process.exit(1);
  }
  return n;
}

/**
 * Parse a JSON array of line items from CLI input.
 * Validates it's a valid JSON array. Exits with code 1 on invalid input.
 */
export function parseLineItems(raw: string): Array<Record<string, unknown>> {
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new Error('Line items must be a JSON array');
    return parsed;
  } catch {
    console.error(chalk.red('Error: --lines must be valid JSON array'));
    console.error(chalk.dim('Example: --lines \'[{"name":"Service","quantity":1,"unitPrice":100,"accountResourceId":"..."}]\''));
    console.error(chalk.dim('Tip: pipe the full request body via stdin, or use --input <file>'));
    process.exit(1);
  }
}

/**
 * Parse a JSON array of journal entries from CLI input.
 * Validates it's a valid JSON array. Exits with code 1 on invalid input.
 */
export function parseJournalEntries(raw: string): Array<Record<string, unknown>> {
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new Error('Entries must be a JSON array');
    return parsed;
  } catch {
    console.error(chalk.red('Error: --entries must be valid JSON array'));
    console.error(chalk.dim('Example: --entries \'[{"accountResourceId":"...","amount":100,"type":"DEBIT"},...]\''));
    console.error(chalk.dim('Tip: pipe the full request body via stdin, or use --input <file>'));
    process.exit(1);
  }
}

/**
 * Read a full JSON request body from --input file or stdin (non-TTY).
 * Returns the parsed object if available, null otherwise.
 *
 * Priority: --input <file> > stdin (non-TTY) > null (use flags).
 * Exits with code 1 on invalid JSON or unreadable file.
 */
export function readBodyInput(opts: { input?: string }): Record<string, unknown> | null {
  if (opts.input) {
    let raw: string;
    try {
      raw = readFileSync(opts.input, 'utf-8');
    } catch {
      console.error(chalk.red(`Error: cannot read file: ${opts.input}`));
      process.exit(1);
    }
    try {
      const parsed = JSON.parse(raw);
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        console.error(chalk.red('Error: --input file must contain a JSON object'));
        process.exit(1);
      }
      return parsed as Record<string, unknown>;
    } catch {
      console.error(chalk.red('Error: --input file contains invalid JSON'));
      process.exit(1);
    }
  }

  if (!process.stdin.isTTY) {
    try {
      const raw = readFileSync(0, 'utf-8').trim();
      if (raw) {
        const parsed = JSON.parse(raw);
        if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
          console.error(chalk.red('Error: stdin must contain a JSON object'));
          process.exit(1);
        }
        return parsed as Record<string, unknown>;
      }
    } catch (err) {
      if ((err as Error).message?.includes('JSON')) {
        console.error(chalk.red('Error: stdin contains invalid JSON'));
        process.exit(1);
      }
    }
  }

  return null;
}

/**
 * Validate that required fields are present when not using --input/stdin.
 * Exits with code 1 if any required field is missing.
 */
export function requireFields(
  opts: Record<string, unknown>,
  fields: Array<{ flag: string; key: string }>,
): void {
  const missing = fields.filter(f => opts[f.key] === undefined);
  if (missing.length > 0) {
    const flags = missing.map(f => f.flag).join(', ');
    console.error(chalk.red(`Error: missing required option(s): ${flags}`));
    console.error(chalk.dim('Provide flags, or pipe JSON via stdin, or use --input <file>'));
    process.exit(1);
  }
}

/**
 * Get today's date in YYYY-MM-DD format using local timezone (not UTC).
 */
export function todayLocal(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
