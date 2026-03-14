import chalk from 'chalk';
import { readFileSync } from 'node:fs';
import { basename, extname, resolve } from 'node:path';
import { Command } from 'commander';
import {
  listBankAccounts,
  getBankAccount,
  searchBankRecords,
  addBankRecords,
  importBankStatement,
} from '../core/api/bank.js';
import { buildBankRecordFilter } from '../core/registry/pagination.js';
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
    .option('--format <type>', 'Output format: table, json, csv, yaml')
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
    .option('--format <type>', 'Output format: table, json, csv, yaml')
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
    .option('--status <status>', 'Filter by status (UNRECONCILED, RECONCILED, ARCHIVED, POSSIBLE_DUPLICATE)')
    .option('--description <text>', 'Filter by description (contains)')
    .option('--payer <name>', 'Filter by payer/payee name (contains)')
    .option('--reference <ref>', 'Filter by reference (contains)')
    .option('--amount-min <n>', 'Filter by minimum amount', parseFloat)
    .option('--amount-max <n>', 'Filter by maximum amount', parseFloat)
    .option('--limit <n>', 'Max results (default 50)', parsePositiveInt)
    .option('--format <type>', 'Output format: table, json, csv, yaml')
    .option('--api-key <key>', 'API key (overrides stored/env)')
    .option('--json', 'Output as JSON')
    .action((accountResourceId: string, opts) => apiAction(async (client) => {
      const filter = buildBankRecordFilter({
        status: opts.status,
        from: opts.from,
        to: opts.to,
        description: opts.description,
        payer: opts.payer,
        reference: opts.reference,
        amountMin: opts.amountMin,
        amountMax: opts.amountMax,
      });

      const res = await searchBankRecords(client, accountResourceId, {
        filter,
        limit: opts.limit ?? 50,
        offset: 0,
        sort: { sortBy: ['valueDate'], order: 'DESC' },
      });

      if (opts.json) {
        console.log(JSON.stringify(res, null, 2));
      } else {
        if (res.data.length === 0) {
          console.log('No records found.');
          return;
        }
        console.log(chalk.bold(`Bank Records (${res.data.length} of ${res.totalElements}):\n`));
        for (const r of res.data) {
          const net = typeof r.netAmount === 'number' && Number.isFinite(r.netAmount) ? r.netAmount : 0;
          const amount = net >= 0
            ? chalk.green(`+${net.toFixed(2)}`)
            : chalk.red(net.toFixed(2));
          const payer = r.extContactName ? `  ${chalk.yellow(r.extContactName)}` : '';
          console.log(`  ${chalk.cyan(r.resourceId)}  ${r.valueDate}  ${amount}  ${r.description ?? ''}${payer}  ${chalk.dim(r.status)}`);
        }
      }
    })(opts));

  // ── clio bank add-records ──────────────────────────────────────
  bank
    .command('add-records <accountResourceId>')
    .description('Add bank records via JSON (1-100 records per call)')
    .requiredOption('--records <json>', 'JSON array: [{amount, transactionDate, description?, payerOrPayee?, reference?}]')
    .option('--format <type>', 'Output format: table, json, csv, yaml')
    .option('--api-key <key>', 'API key (overrides stored/env)')
    .option('--json', 'Output as JSON')
    .action((accountResourceId: string, opts) => apiAction(async (client) => {
      const parsed = JSON.parse(opts.records);
      if (!Array.isArray(parsed)) throw new Error('--records must be a JSON array');
      if (parsed.length < 1 || parsed.length > 100) throw new Error('--records must contain 1-100 entries');
      for (const [i, r] of parsed.entries()) {
        if (typeof r !== 'object' || r === null) throw new Error(`records[${i}] must be an object`);
        if (typeof r.amount !== 'number' || !Number.isFinite(r.amount)) throw new Error(`records[${i}].amount must be a finite number`);
        if (typeof r.transactionDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(r.transactionDate)) throw new Error(`records[${i}].transactionDate must be YYYY-MM-DD`);
      }
      const res = await addBankRecords(client, accountResourceId, parsed);
      const errors = Array.isArray(res?.data?.errors) ? res.data.errors : [];

      if (opts.json) {
        console.log(JSON.stringify(res.data, null, 2));
      } else {
        if (errors.length > 0) {
          console.log(chalk.red(`${errors.length} error(s):`));
          for (const e of errors) console.log(`  ${chalk.red(String(e))}`);
        } else {
          console.log(chalk.green(`Created ${parsed.length} bank record(s).`));
        }
      }
    })(opts));

  // ── clio bank auto-recon ─────────────────────────────────────
  const RECON_TYPES = ['MAGIC_MATCH', 'MAGIC_RECONCILE_WITH_CASH_TRANSFER', 'MAGIC_RECONCILE_WITH_BANK_RULE', 'MAGIC_QUICK_RECONCILE'] as const;
  bank
    .command('auto-recon')
    .description('Get auto-reconciliation recommendations for a bank account')
    .requiredOption('--type <type>', `Recommendation type (${RECON_TYPES.join(', ')})`)
    .option('--account <resourceId>', 'Bank account resourceId (omit for all accounts)')
    .option('--format <type>', 'Output format: table, json, csv, yaml')
    .option('--api-key <key>', 'API key (overrides stored/env)')
    .option('--json', 'Output as JSON')
    .action(apiAction(async (client, opts) => {
      const recType = (opts.type as string).toUpperCase();
      if (!RECON_TYPES.includes(recType as typeof RECON_TYPES[number])) {
        console.error(chalk.red(`Invalid --type: ${recType}`));
        console.error(chalk.dim(`Valid types: ${RECON_TYPES.join(', ')}`));
        process.exit(1);
      }

      try {
        const res = await client.post('/api/v1/search-magic-reconciliation', {
          bankAccountResourceId: opts.account,
          recommendationType: recType,
        });

        if (opts.json) {
          console.log(JSON.stringify(res, null, 2));
        } else {
          const data = (res as { data?: unknown[] }).data;
          const count = Array.isArray(data) ? data.length : 0;
          console.log(chalk.bold(`Auto-Reconciliation Suggestions (${recType}): ${count} found\n`));
          if (Array.isArray(data)) {
            for (const item of data.slice(0, 50)) {
              const r = item as Record<string, unknown>;
              const desc = r.description ?? r.bankRecordDescription ?? '';
              const amount = typeof r.amount === 'number' ? chalk.dim(` $${r.amount.toFixed(2)}`) : '';
              console.log(`  ${chalk.cyan(String(r.bankRecordResourceId ?? r.resourceId ?? '?'))}  ${desc}${amount}`);
            }
            if (data.length > 50) console.log(chalk.dim(`  ... and ${data.length - 50} more (use --json for full output)`));
          } else {
            console.log(JSON.stringify(res, null, 2));
          }
        }
      } catch (e) {
        const status = (e as { status?: number }).status ?? (e as { response?: { status?: number } }).response?.status;
        if (status === 404) {
          console.error(chalk.yellow('Auto-reconciliation endpoint not available on this server.'));
          process.exit(1);
        }
        throw e;
      }
    }));

  // ── clio bank import ──────────────────────────────────────────
  bank
    .command('import')
    .description('Import a bank statement file (CSV, OFX, XLS, XLSX)')
    .requiredOption('--file <path>', 'Bank statement file path')
    .requiredOption('--account <resourceId>', 'Bank account resourceId')
    .option('--format <type>', 'Output format: table, json, csv, yaml')
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
