import chalk from 'chalk';
import { Command } from 'commander';
import {
  listPayments,
  searchPayments,
  getPayment,
  updatePayment,
  deletePayment,
} from '../core/api/payments.js';
import { apiAction } from './api-action.js';
import { parsePositiveInt, parseNonNegativeInt } from './parsers.js';
import { paginatedFetch } from './pagination.js';
import { outputList, type OutputOpts } from './output.js';
import type { TableColumn } from './table-formatter.js';
import { formatId, formatReference, formatDirection, formatEpochDate } from './format-helpers.js';

const PAYMENT_COLUMNS: TableColumn[] = [
  { key: 'resourceId', header: 'ID', format: formatId },
  { key: 'businessTransactionReference', header: 'Reference', format: formatReference },
  { key: 'direction', header: 'Dir', format: formatDirection },
  { key: 'valueDate', header: 'Date', format: formatEpochDate },
  { key: 'totalAmount', header: 'Amount', align: 'right' },
  { key: 'businessTransactionType', header: 'Type', format: (v) => chalk.dim(String(v ?? '')) },
];

export function registerPaymentsCommand(program: Command): void {
  const payments = program
    .command('payments')
    .description('View cashflow transactions (payments, invoices, bills, journals)');

  // ── clio payments list ──────────────────────────────────────────
  payments
    .command('list')
    .description('List recent cashflow transactions')
    .option('--limit <n>', 'Max results (default 100)', parsePositiveInt)
    .option('--offset <n>', 'Page number offset (0-indexed)', parseNonNegativeInt)
    .option('--all', 'Fetch all pages')
    .option('--max-rows <n>', 'Max rows for --all (default 10000)', parsePositiveInt)
    .option('--format <type>', 'Output format: table, json, csv, yaml')
    .option('--api-key <key>', 'API key (overrides stored/env)')
    .option('--json', 'Output as JSON')
    .action(apiAction(async (client, opts) => {
      const result = await paginatedFetch(
        opts,
        (p) => listPayments(client, p),
        { label: 'Fetching transactions' },
      );

      outputList(result as any, PAYMENT_COLUMNS, opts as OutputOpts, 'Payments');  // eslint-disable-line @typescript-eslint/no-explicit-any
    }));

  // ── clio payments search ────────────────────────────────────────
  payments
    .command('search')
    .description('Search cashflow transactions with filters')
    .option('--from <YYYY-MM-DD>', 'Filter from date (inclusive)')
    .option('--to <YYYY-MM-DD>', 'Filter to date (inclusive)')
    .option('--method <method>', 'Filter by payment method')
    .option('--type <type>', 'Filter by transaction type (SALE, PURCHASE, etc.)')
    .option('--direction <dir>', 'Filter by direction: PAYIN or PAYOUT')
    .option('--account <resourceId>', 'Filter by account resourceId')
    .option('--ref <reference>', 'Filter by reference (contains)')
    .option('--sort <field>', 'Sort field (default: valueDate)')
    .option('--order <direction>', 'Sort order: ASC or DESC (default: DESC)')
    .option('--limit <n>', 'Max results (default 20)', parsePositiveInt)
    .option('--offset <n>', 'Page number offset (0-indexed)', parseNonNegativeInt)
    .option('--all', 'Fetch all pages')
    .option('--max-rows <n>', 'Max rows for --all (default 10000)', parsePositiveInt)
    .option('--format <type>', 'Output format: table, json, csv, yaml')
    .option('--api-key <key>', 'API key (overrides stored/env)')
    .option('--json', 'Output as JSON')
    .action(apiAction(async (client, opts) => {
      const filter: Record<string, unknown> = {};
      if (opts.ref) filter.businessTransactionReference = { contains: opts.ref };
      if (opts.type) filter.businessTransactionType = { eq: opts.type };
      if (opts.direction) filter.direction = { eq: opts.direction };
      if (opts.account) filter.organizationAccountResourceId = { eq: opts.account };
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

      outputList(result as any, PAYMENT_COLUMNS, opts as OutputOpts, 'Payments');  // eslint-disable-line @typescript-eslint/no-explicit-any
    }));

  // ── clio payments get ───────────────────────────────────────────
  payments
    .command('get <resourceId>')
    .description('Get a specific payment record')
    .option('--api-key <key>', 'API key (overrides stored/env)')
    .option('--format <type>', 'Output format: table, json, csv, yaml')
    .option('--json', 'Output as JSON')
    .action((resourceId: string, opts) => apiAction(async (client) => {
      const res = await getPayment(client, resourceId);
      const p = res.data;
      if (opts.json) {
        console.log(JSON.stringify(p, null, 2));
      } else {
        console.log(chalk.bold('ID:'), p.resourceId);
        console.log(chalk.bold('Amount:'), p.paymentAmount);
        console.log(chalk.bold('Date:'), p.valueDate);
        console.log(chalk.bold('Method:'), p.paymentMethod);
        console.log(chalk.bold('Reference:'), p.reference);
      }
    })(opts));

  // ── clio payments update ────────────────────────────────────────
  payments
    .command('update <resourceId>')
    .description('Update a payment record')
    .option('--amount <n>', 'Corrected payment amount')
    .option('--reference <ref>', 'Payment reference')
    .option('--date <YYYY-MM-DD>', 'Payment date')
    .option('--method <method>', 'Payment method (BANK_TRANSFER, CASH, CHEQUE, etc.)')
    .option('--api-key <key>', 'API key (overrides stored/env)')
    .option('--json', 'Output as JSON')
    .action((resourceId: string, opts) => apiAction(async (client) => {
      const data: Record<string, unknown> = {};
      if (opts.amount) data.paymentAmount = parseFloat(opts.amount);
      if (opts.reference) data.reference = opts.reference;
      if (opts.date) data.valueDate = opts.date;
      if (opts.method) data.paymentMethod = opts.method;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res = await updatePayment(client, resourceId, data as any);
      if (opts.json) {
        console.log(JSON.stringify(res.data, null, 2));
      } else {
        console.log(chalk.green(`Payment ${resourceId} updated.`));
      }
    })(opts));

  // ── clio payments delete ────────────────────────────────────────
  payments
    .command('delete <resourceId>')
    .description('Delete (void) a payment record')
    .option('--api-key <key>', 'API key (overrides stored/env)')
    .option('--json', 'Output as JSON')
    .action((resourceId: string, opts) => apiAction(async (client) => {
      await deletePayment(client, resourceId);
      if (opts.json) {
        console.log(JSON.stringify({ deleted: true, resourceId }));
      } else {
        console.log(chalk.green(`Payment ${resourceId} deleted.`));
      }
    })(opts));
}
