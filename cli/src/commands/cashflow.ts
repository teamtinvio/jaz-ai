import { muted } from './ui/theme.js';
import { Command } from 'commander';
import { searchCashflowTransactions } from '../core/api/cashflow.js';
import { apiAction } from './api-action.js';
import { parsePositiveInt, parseNonNegativeInt } from './parsers.js';
import { paginatedFetch } from './pagination.js';
import { buildCashflowFilter } from '../core/registry/pagination.js';
import { outputList, type OutputOpts } from './output.js';
import type { TableColumn } from './table-formatter.js';
import { formatId, formatReference, formatDirection, formatEpochDate } from './format-helpers.js';

const CASHFLOW_COLUMNS: TableColumn[] = [
  { key: 'resourceId', header: 'ID', format: formatId },
  { key: 'transactionReference', header: 'Reference', format: formatReference },
  { key: 'direction', header: 'Dir', format: formatDirection },
  { key: 'valueDate', header: 'Date', format: formatEpochDate },
  { key: 'totalAmount', header: 'Amount', align: 'right' },
  { key: 'currencyCode', header: 'Ccy' },
  { key: 'businessTransactionType', header: 'Type', format: (v) => muted(String(v ?? '')) },
];

export function registerCashflowCommand(program: Command): void {
  const cf = program
    .command('cashflow')
    .description('Search cashflow transactions');

  // ── clio cashflow search ──────────────────────────────────────
  cf
    .command('search')
    .description('Search cashflow transactions with filters')
    .option('--from <YYYY-MM-DD>', 'Filter from date (inclusive)')
    .option('--to <YYYY-MM-DD>', 'Filter to date (inclusive)')
    .option('--type <type>', 'Filter by transaction type')
    .option('--direction <dir>', 'Filter by direction: PAYIN or PAYOUT')
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
      const searchFilter = buildCashflowFilter({
        reference: opts.ref, businessTransactionType: opts.type,
        direction: opts.direction, startDate: opts.from, endDate: opts.to,
      });
      const sort = { sortBy: [opts.sort ?? 'valueDate'] as string[], order: (opts.order ?? 'DESC') as 'ASC' | 'DESC' };

      const result = await paginatedFetch(
        opts,
        ({ limit, offset }) => searchCashflowTransactions(client, { filter: searchFilter, limit, offset, sort }),
        { label: 'Searching cashflow transactions', defaultLimit: 20 },
      );

      outputList(result as any, CASHFLOW_COLUMNS, opts as OutputOpts, 'Cashflow');  // eslint-disable-line @typescript-eslint/no-explicit-any
    }));
}
