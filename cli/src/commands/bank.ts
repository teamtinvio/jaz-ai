import chalk from 'chalk';
import { readFileSync } from 'node:fs';
import { basename, extname, resolve } from 'node:path';
import { Command } from 'commander';
import {
  listBankAccounts,
  getBankAccount,
  searchBankRecords,
  importBankStatement,
} from '../core/api/bank.js';
import { apiAction } from './api-action.js';
import { parsePositiveInt } from './parsers.js';

const BANK_MIME_MAP: Record<string, string> = {
  '.csv': 'text/csv',
  '.ofx': 'application/x-ofx',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};

export function registerBankCommand(program: Command): void {
  const bank = program
    .command('bank')
    .description('Bank accounts and records');

  // ── clio bank accounts ──────────────────────────────────────────
  bank
    .command('accounts')
    .description('List bank accounts')
    .option('--limit <n>', 'Max results', parsePositiveInt)
    .option('--api-key <key>', 'API key (overrides stored/env)')
    .option('--json', 'Output as JSON')
    .action(apiAction(async (client, opts) => {
      const res = await listBankAccounts(client, {
        limit: opts.limit,
      });

      if (opts.json) {
        console.log(JSON.stringify(res, null, 2));
      } else {
        console.log(chalk.bold(`Bank Accounts (${res.data.length}):\n`));
        for (const a of res.data) {
          console.log(`  ${chalk.cyan(a.resourceId)}  ${a.name}  ${chalk.dim(a.currencyCode)}  ${a.status}`);
        }
      }
    }));

  // ── clio bank get ───────────────────────────────────────────────
  bank
    .command('get <resourceId>')
    .description('Get a bank account by resourceId')
    .option('--api-key <key>', 'API key (overrides stored/env)')
    .option('--json', 'Output as JSON')
    .action((resourceId: string, opts) => apiAction(async (client) => {
      const res = await getBankAccount(client, resourceId);
      const a = res.data;

      if (opts.json) {
        console.log(JSON.stringify(a, null, 2));
      } else {
        console.log(chalk.bold('Name:'), a.name);
        console.log(chalk.bold('ID:'), a.resourceId);
        console.log(chalk.bold('Account ID:'), a.accountResourceId);
        console.log(chalk.bold('Currency:'), a.currencyCode);
        console.log(chalk.bold('Status:'), a.status);
      }
    })(opts));

  // ── clio bank records ───────────────────────────────────────────
  bank
    .command('records <accountResourceId>')
    .description('Search bank records for a bank account')
    .option('--from <YYYY-MM-DD>', 'Filter from date (inclusive)')
    .option('--to <YYYY-MM-DD>', 'Filter to date (inclusive)')
    .option('--status <status>', 'Filter by status (UNRECONCILED, RECONCILED)')
    .option('--limit <n>', 'Max results (default 50)', parsePositiveInt)
    .option('--api-key <key>', 'API key (overrides stored/env)')
    .option('--json', 'Output as JSON')
    .action((accountResourceId: string, opts) => apiAction(async (client) => {
      const filter: Record<string, unknown> = {};
      if (opts.status) filter.status = { eq: opts.status };
      if (opts.from || opts.to) {
        const dateFilter: Record<string, string> = {};
        if (opts.from) dateFilter.gte = opts.from;
        if (opts.to) dateFilter.lte = opts.to;
        filter.date = dateFilter;
      }

      const res = await searchBankRecords(client, accountResourceId, {
        filter: Object.keys(filter).length > 0 ? filter : undefined,
        limit: opts.limit ?? 50,
        offset: 0,
        sort: { sortBy: ['date'], order: 'DESC' },
      });

      if (opts.json) {
        console.log(JSON.stringify(res, null, 2));
      } else {
        if (res.data.length === 0) {
          console.log(chalk.yellow('No records found.'));
          return;
        }
        console.log(chalk.bold(`Bank Records (${res.data.length} of ${res.totalElements}):\n`));
        for (const r of res.data) {
          const amount = r.amount >= 0
            ? chalk.green(`+${r.amount.toFixed(2)}`)
            : chalk.red(r.amount.toFixed(2));
          console.log(`  ${chalk.cyan(r.resourceId)}  ${r.date}  ${amount}  ${r.description}  ${chalk.dim(r.status)}`);
        }
      }
    })(opts));

  // ── clio bank import ──────────────────────────────────────────
  bank
    .command('import')
    .description('Import a bank statement file (CSV, OFX, XLS, XLSX)')
    .requiredOption('--file <path>', 'Bank statement file path')
    .requiredOption('--account <resourceId>', 'Bank account resourceId')
    .option('--api-key <key>', 'API key (overrides stored/env)')
    .option('--json', 'Output as JSON')
    .action(apiAction(async (client, opts) => {
      const filePath = resolve(opts.file);
      const ext = extname(filePath).toLowerCase();
      const mime = BANK_MIME_MAP[ext];
      if (!mime) {
        console.error(chalk.red(`Error: unsupported file type "${ext}". Supported: ${Object.keys(BANK_MIME_MAP).join(', ')}`));
        process.exit(1);
      }

      const buffer = readFileSync(filePath);
      const blob = new Blob([buffer], { type: mime });
      const fileName = basename(filePath);

      const res = await importBankStatement(client, {
        businessTransactionType: 'BANK_STATEMENT',
        accountResourceId: opts.account,
        sourceFile: blob,
        sourceFileName: fileName,
      });

      if (opts.json) {
        console.log(JSON.stringify(res.data, null, 2));
      } else {
        console.log(chalk.green('Bank statement uploaded — processing started.'));
        console.log(chalk.bold('File:'), fileName);
        console.log(chalk.dim('Check status: clio magic search --type bank-statement'));
      }
    }));
}
