import chalk from 'chalk';
import { Command } from 'commander';
import { createCashTransfer, listCashTransfers, getCashTransfer } from '../core/api/cash-transfers.js';
import { searchCashflowTransactions, deleteCashEntry } from '../core/api/cashflow.js';
import { apiAction } from './api-action.js';
import { resolveAccountFlag } from './resolve.js';
import { parsePositiveInt, parseNonNegativeInt, parseMoney, readBodyInput, requireFields } from './parsers.js';
import { paginatedFetch } from './pagination.js';
import { outputList, type OutputOpts } from './output.js';
import type { TableColumn } from './table-formatter.js';
import { formatStatus, formatId, formatReference, formatCurrency } from './format-helpers.js';
import { formatCashflowDate, printCashflowDetail } from './cash-entry.js';

const CASH_TRANSFER_COLUMNS: TableColumn[] = [
  { key: 'resourceId', header: 'ID', format: formatId },
  { key: 'transactionReference', header: 'Reference', format: formatReference },
  { key: 'transactionStatus', header: 'Status', format: (v) => formatStatus(String(v)) },
  { key: 'totalAmount', header: 'Amount', align: 'right', format: formatCurrency },
  { key: 'valueDate', header: 'Date', format: (v) => formatCashflowDate(Number(v)) },
];

export function registerCashTransferCommand(program: Command): void {
  const cmd = program
    .command('cash-transfer')
    .description('Manage cash transfer entries');

  // ── list ──────────────────────────────────────────────────────
  cmd
    .command('list')
    .description('List cash transfers')
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
        (p) => listCashTransfers(client, p),
        { label: 'Fetching cash transfers' },
      );

      outputList(result as any, CASH_TRANSFER_COLUMNS, opts as OutputOpts, 'Cash Transfers');  // eslint-disable-line @typescript-eslint/no-explicit-any
    }));

  // ── get ───────────────────────────────────────────────────────
  cmd
    .command('get <resourceId>')
    .description('Get a cash transfer by ID')
    .option('--api-key <key>', 'API key (overrides stored/env)')
    .option('--json', 'Output as JSON')
    .action((resourceId: string, opts) => apiAction(async (client) => {
      const { data: t } = await getCashTransfer(client, resourceId);

      if (opts.json) {
        console.log(JSON.stringify(t, null, 2));
      } else {
        printCashflowDetail(t);
      }
    })(opts));

  // ── create ────────────────────────────────────────────────────
  cmd
    .command('create')
    .description('Create a cash transfer (saves as draft by default)')
    .option('--from-account <resourceId>', 'Source bank account name or resourceId (cash-out)')
    .option('--to-account <resourceId>', 'Destination bank account name or resourceId (cash-in)')
    .option('--amount <amount>', 'Transfer amount', parseMoney)
    .option('--date <YYYY-MM-DD>', 'Value date')
    .option('--ref <reference>', 'Reference')
    .option('--finalize', 'Finalize instead of saving as draft')
    .option('--input <file>', 'Read full request body from JSON file (or pipe via stdin)')
    .option('--api-key <key>', 'API key (overrides stored/env)')
    .option('--json', 'Output as JSON')
    .action(apiAction(async (client, opts) => {
      const body = readBodyInput(opts);

      let res;
      if (body) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- user-provided JSON, API validates
        res = await createCashTransfer(client, {
          ...body,
          saveAsDraft: body.saveAsDraft ?? !opts.finalize,
        } as any);
      } else {
        requireFields(opts as Record<string, unknown>, [
          { flag: '--from-account', key: 'fromAccount' },
          { flag: '--to-account', key: 'toAccount' },
          { flag: '--amount', key: 'amount' },
          { flag: '--date', key: 'date' },
        ]);
        // Resolve both accounts by name
        const fromResolved = await resolveAccountFlag(client, opts.fromAccount, { filter: 'bank', silent: opts.json });
        opts.fromAccount = fromResolved.resourceId;
        const toResolved = await resolveAccountFlag(client, opts.toAccount, { filter: 'bank', silent: opts.json });
        opts.toAccount = toResolved.resourceId;

        if (opts.fromAccount === opts.toAccount) {
          throw new Error('--from-account and --to-account must be different');
        }

        const data: Record<string, unknown> = {
          valueDate: opts.date,
          cashOut: { accountResourceId: opts.fromAccount, amount: opts.amount },
          cashIn: { accountResourceId: opts.toAccount, amount: opts.amount },
          saveAsDraft: !opts.finalize,
        };
        if (opts.ref) data.reference = opts.ref;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- flag-built object, API validates
        res = await createCashTransfer(client, data as any);
      }

      const created = res.data as Record<string, unknown>;
      if (opts.json) {
        console.log(JSON.stringify(created, null, 2));
      } else {
        const status = opts.finalize ? 'finalized' : 'draft';
        console.log(chalk.green(`Cash transfer created (${status}): ${created.resourceId}`));
        console.log(chalk.bold('ID:'), created.resourceId);
      }
    }));

  // ── search ────────────────────────────────────────────────────
  cmd
    .command('search')
    .description('Search cash transfers')
    .option('--ref <reference>', 'Filter by reference (contains)')
    .option('--account <resourceId>', 'Filter by bank account name or resourceId')
    .option('--from <YYYY-MM-DD>', 'Filter from date (inclusive)')
    .option('--to <YYYY-MM-DD>', 'Filter to date (inclusive)')
    .option('--status <status>', 'Filter by status (ACTIVE, VOID)')
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
      // Resolve account by name if provided
      if (opts.account) {
        const resolved = await resolveAccountFlag(client, opts.account, { filter: 'bank', silent: opts.json });
        opts.account = resolved.resourceId;
      }

      const filter: Record<string, unknown> = {
        businessTransactionType: { eq: 'JOURNAL_CASH_TRANSFER' },
      };
      if (opts.ref) filter.businessTransactionReference = { contains: opts.ref };
      if (opts.account) filter.organizationAccountResourceId = { eq: opts.account };
      if (opts.status) filter.businessTransactionStatus = { eq: opts.status };
      if (opts.from || opts.to) {
        const dateFilter: Record<string, string> = {};
        if (opts.from) dateFilter.gte = opts.from;
        if (opts.to) dateFilter.lte = opts.to;
        filter.valueDate = dateFilter;
      }

      const sort = { sortBy: [opts.sort ?? 'valueDate'] as string[], order: (opts.order ?? 'DESC') as 'ASC' | 'DESC' };

      const result = await paginatedFetch(
        opts,
        ({ limit, offset }) => searchCashflowTransactions(client, { filter, limit, offset, sort }),
        { label: 'Searching cash transfers', defaultLimit: 20 },
      );

      outputList(result as any, CASH_TRANSFER_COLUMNS, opts as OutputOpts, 'Cash Transfers');  // eslint-disable-line @typescript-eslint/no-explicit-any
    }));

  // ── delete ────────────────────────────────────────────────────
  cmd
    .command('delete <resourceId>')
    .description('Delete/void a cash transfer')
    .option('--api-key <key>', 'API key (overrides stored/env)')
    .option('--json', 'Output as JSON')
    .action((resourceId: string, opts) => apiAction(async (client) => {
      await deleteCashEntry(client, resourceId);

      if (opts.json) {
        console.log(JSON.stringify({ deleted: true, resourceId }));
      } else {
        console.log(chalk.green(`Cash transfer ${resourceId} deleted.`));
      }
    })(opts));
}
