/**
 * CLI output formatting for outstanding bills.
 * Follows the same chalk + table pattern as bank-file/format.ts.
 */

import { muted, success, danger, highlight } from '../../../../../commands/ui/theme.js';
import type { OutstandingResult } from './types.js';

const fmt = (n: number): string =>
  n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtR = (n: number, w = 14): string => fmt(n).padStart(w);
const line = (w: number): string => muted('─'.repeat(w));

/** Print outstanding bills as human-readable summary + supplier table. */
export function printOutstandingResult(result: OutstandingResult): void {
  const W = 80;

  console.log();
  console.log(highlight(`Outstanding Bills — as of ${result.asOfDate}`));
  console.log(line(W));
  console.log(`  Bills:      ${result.totalBills}`);
  console.log(`  Suppliers:  ${result.supplierCount}`);
  console.log(`  Total:      ${result.currency} ${fmt(result.totalBalance)}`);
  if (result.overdueCount > 0) {
    console.log(`  Overdue:    ${danger(String(result.overdueCount))} bill${result.overdueCount === 1 ? '' : 's'}`);
  }
  if (result.dueBefore) {
    console.log(`  Due before: ${result.dueBefore}`);
  }
  console.log(line(W));

  if (result.suppliers.length === 0) {
    console.log(success('\n  No outstanding bills found.\n'));
    return;
  }

  // Supplier table
  const header = [
    'Supplier'.padEnd(30),
    'Bills'.padStart(6),
    'Balance'.padStart(14),
    'Earliest Due'.padStart(13),
    'Overdue'.padStart(8),
  ].join('  ');

  console.log();
  console.log(muted(header));
  console.log(line(W));

  for (const s of result.suppliers) {
    const raw = s.contactName || 'Unknown';
    const name = raw.length > 28 ? raw.slice(0, 27) + '\u2026' : raw;
    const overdueCol = s.overdueCount > 0
      ? danger(String(s.overdueCount).padStart(8))
      : muted('0'.padStart(8));
    console.log([
      name.padEnd(30),
      String(s.billCount).padStart(6),
      fmtR(s.totalBalance),
      s.earliestDueDate.padStart(13),
      overdueCol,
    ].join('  '));
  }

  console.log(line(W));
  console.log(highlight([
    'Total'.padEnd(30),
    String(result.totalBills).padStart(6),
    fmtR(result.totalBalance),
  ].join('  ')));
  console.log();
}
