import chalk from 'chalk';
import { Command } from 'commander';
import {
  listPayments,
  searchPayments,
} from '../core/api/payments.js';
import { apiAction } from './api-action.js';
import { parsePositiveInt, parseNonNegativeInt } from './parsers.js';
import { paginatedFetch, paginatedJson, displaySlice } from './pagination.js';

function epochToDate(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export function registerPaymentsCommand(program: Command): void {
  const payments = program
    .command('payments')
    .description('View cashflow transactions (payments, invoices, bills, journals)');

  // ── clio payments list ──────────────────────────────────────────
  payments
    .command('list')
    .description('List recent cashflow transactions')
    .option('--limit <n>', 'Max results (default 100)', parsePositiveInt)
    .option('--offset <n>', 'Offset for pagination', parseNonNegativeInt)
    .option('--all', 'Fetch all pages')
    .option('--max-rows <n>', 'Max rows for --all (default 10000)', parsePositiveInt)
    .option('--api-key <key>', 'API key (overrides stored/env)')
    .option('--json', 'Output as JSON')
    .action(apiAction(async (client, opts) => {
      const result = await paginatedFetch(
        opts,
        (p) => listPayments(client, p),
        { label: 'Fetching transactions' },
      );

      if (opts.json) {
        console.log(paginatedJson(result, opts));
      } else {
        console.log(chalk.bold(`Transactions (${result.data.length} of ${result.totalElements}):\n`));
        const { items, overflow } = displaySlice(result.data);
        for (const t of items) {
          const dir = t.direction === 'PAYIN' ? chalk.green('IN') : chalk.red('OUT');
          const date = epochToDate(t.valueDate);
          console.log(`  ${chalk.cyan(t.resourceId)}  ${t.businessTransactionReference || '(no ref)'}  ${dir}  ${date}  ${t.totalAmount}  ${chalk.dim(t.businessTransactionType)}`);
        }
        if (overflow > 0) console.log(chalk.dim(`  ... and ${overflow.toLocaleString()} more (use --json for full output)`));
      }
    }));

  // ── clio payments search ────────────────────────────────────────
  payments
    .command('search')
    .description('Search cashflow transactions with filters')
    .option('--from <YYYY-MM-DD>', 'Filter from date (inclusive)')
    .option('--to <YYYY-MM-DD>', 'Filter to date (inclusive)')
    .option('--method <method>', 'Filter by payment method')
    .option('--type <type>', 'Filter by transaction type (SALE, PURCHASE, etc.)')
    .option('--ref <reference>', 'Filter by reference (contains)')
    .option('--sort <field>', 'Sort field (default: valueDate)')
    .option('--order <direction>', 'Sort order: ASC or DESC (default: DESC)')
    .option('--limit <n>', 'Max results (default 20)', parsePositiveInt)
    .option('--offset <n>', 'Offset for pagination', parseNonNegativeInt)
    .option('--all', 'Fetch all pages')
    .option('--max-rows <n>', 'Max rows for --all (default 10000)', parsePositiveInt)
    .option('--api-key <key>', 'API key (overrides stored/env)')
    .option('--json', 'Output as JSON')
    .action(apiAction(async (client, opts) => {
      const filter: Record<string, unknown> = {};
      if (opts.ref) filter.businessTransactionReference = { contains: opts.ref };
      if (opts.type) filter.businessTransactionType = { eq: opts.type };
      if (opts.from || opts.to) {
        const dateFilter: Record<string, string> = {};
        if (opts.from) dateFilter.gte = opts.from;
        if (opts.to) dateFilter.lte = opts.to;
        filter.valueDate = dateFilter;
      }

      const searchFilter = Object.keys(filter).length > 0 ? filter : undefined;
      const sort = { sortBy: [opts.sort ?? 'valueDate'] as string[], order: (opts.order ?? 'DESC') as 'ASC' | 'DESC' };

      const result = await paginatedFetch(
        opts,
        ({ limit, offset }) => searchPayments(client, { filter: searchFilter, limit, offset, sort }),
        { label: 'Searching transactions', defaultLimit: 20 },
      );

      if (opts.json) {
        console.log(paginatedJson(result, opts));
      } else {
        if (result.data.length === 0) {
          console.log(chalk.yellow('No transactions found.'));
          return;
        }
        console.log(chalk.bold(`Found ${result.data.length} transaction(s):\n`));
        const { items, overflow } = displaySlice(result.data);
        for (const t of items) {
          const dir = t.direction === 'PAYIN' ? chalk.green('IN') : chalk.red('OUT');
          const date = epochToDate(t.valueDate);
          console.log(`  ${chalk.cyan(t.resourceId)}  ${t.businessTransactionReference || '(no ref)'}  ${dir}  ${date}  ${t.totalAmount}  ${chalk.dim(t.businessTransactionType)}`);
        }
        if (overflow > 0) console.log(chalk.dim(`  ... and ${overflow.toLocaleString()} more (use --json for full output)`));
      }
    }));
}
