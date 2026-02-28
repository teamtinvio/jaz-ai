import chalk from 'chalk';
import { Command } from 'commander';
import { listAccounts, searchAccounts, createAccount, deleteAccount } from '../core/api/chart-of-accounts.js';
import { apiAction } from './api-action.js';
import { parsePositiveInt, parseNonNegativeInt, readBodyInput, requireFields } from './parsers.js';
import { paginatedFetch, paginatedJson, displaySlice } from './pagination.js';

export function registerAccountsCommand(program: Command): void {
  const accounts = program
    .command('accounts')
    .description('Chart of accounts');

  // ── clio accounts list ──────────────────────────────────────────
  accounts
    .command('list')
    .description('List accounts')
    .option('--limit <n>', 'Max results (default 100)', parsePositiveInt)
    .option('--offset <n>', 'Offset for pagination', parseNonNegativeInt)
    .option('--all', 'Fetch all pages')
    .option('--max-rows <n>', 'Max rows for --all (default 10000)', parsePositiveInt)
    .option('--api-key <key>', 'API key (overrides stored/env)')
    .option('--json', 'Output as JSON')
    .action(apiAction(async (client, opts) => {
      const result = await paginatedFetch(
        opts,
        (p) => listAccounts(client, p),
        { label: 'Fetching accounts' },
      );

      if (opts.json) {
        console.log(paginatedJson(result, opts));
      } else {
        console.log(chalk.bold(`Accounts (${result.data.length} of ${result.totalElements}):\n`));
        const { items, overflow } = displaySlice(result.data);
        for (const a of items) {
          console.log(`  ${chalk.cyan(a.resourceId)}  ${a.code ?? ''}  ${a.name}  ${chalk.dim(a.accountType)}`);
        }
        if (overflow > 0) console.log(chalk.dim(`  ... and ${overflow.toLocaleString()} more (use --json for full output)`));
      }
    }));

  // ── clio accounts search ────────────────────────────────────────
  accounts
    .command('search <query>')
    .description('Search accounts by name or code')
    .option('--sort <field>', 'Sort field (default: code)')
    .option('--order <direction>', 'Sort order: ASC or DESC (default: ASC)')
    .option('--limit <n>', 'Max results (default 20)', parsePositiveInt)
    .option('--offset <n>', 'Offset for pagination', parseNonNegativeInt)
    .option('--all', 'Fetch all pages')
    .option('--max-rows <n>', 'Max rows for --all (default 10000)', parsePositiveInt)
    .option('--api-key <key>', 'API key (overrides stored/env)')
    .option('--json', 'Output as JSON')
    .action((query: string, opts) => apiAction(async (client) => {
      const filter = { or: { name: { contains: query }, code: { contains: query } } };
      const sort = { sortBy: [opts.sort ?? 'code'] as string[], order: (opts.order ?? 'ASC') as 'ASC' | 'DESC' };

      const result = await paginatedFetch(
        opts,
        ({ limit, offset }) => searchAccounts(client, { filter, limit, offset, sort }),
        { label: 'Searching accounts', defaultLimit: 20 },
      );

      if (opts.json) {
        console.log(paginatedJson(result, opts));
      } else {
        if (result.data.length === 0) {
          console.log(chalk.yellow('No accounts found.'));
          return;
        }
        console.log(chalk.bold(`Found ${result.data.length} account(s):\n`));
        const { items, overflow } = displaySlice(result.data);
        for (const a of items) {
          console.log(`  ${chalk.cyan(a.resourceId)}  ${a.code ?? ''}  ${a.name}  ${chalk.dim(a.accountType)}`);
        }
        if (overflow > 0) console.log(chalk.dim(`  ... and ${overflow.toLocaleString()} more (use --json for full output)`));
      }
    })(opts));

  // ── clio accounts create ──────────────────────────────────────
  accounts
    .command('create')
    .description('Create a new account in the chart of accounts')
    .option('--name <name>', 'Account name')
    .option('--code <code>', 'Account code')
    .option('--type <accountType>', 'Account type (e.g. "Bank Accounts", "Revenue", "Expense")')
    .option('--currency <code>', 'Currency code (defaults to org currency)')
    .option('--status <status>', 'Account status (ACTIVE or INACTIVE)')
    .option('--input <file>', 'Read full request body from JSON file (or pipe via stdin)')
    .option('--api-key <key>', 'API key (overrides stored/env)')
    .option('--json', 'Output as JSON')
    .action(apiAction(async (client, opts) => {
      const body = readBodyInput(opts);

      let res;
      if (body) {
        res = await createAccount(client, body as { code: string; name: string; accountType: string; status?: string; currencyCode?: string });
      } else {
        requireFields(opts as Record<string, unknown>, [
          { flag: '--name', key: 'name' },
          { flag: '--code', key: 'code' },
          { flag: '--type', key: 'type' },
        ]);
        const data: { code: string; name: string; accountType: string; status?: string; currencyCode?: string } = {
          code: opts.code,
          name: opts.name,
          accountType: opts.type,
        };
        if (opts.currency) data.currencyCode = opts.currency;
        if (opts.status) data.status = opts.status;
        res = await createAccount(client, data);
      }

      if (opts.json) {
        console.log(JSON.stringify(res.data, null, 2));
      } else {
        console.log(chalk.green(`Account created: ${res.data.name} (${res.data.code})`));
        console.log(chalk.bold('ID:'), res.data.resourceId);
      }
    }));

  // ── clio accounts delete ──────────────────────────────────────
  accounts
    .command('delete <resourceId>')
    .description('Delete an account from the chart of accounts')
    .option('--api-key <key>', 'API key (overrides stored/env)')
    .option('--json', 'Output as JSON')
    .action((resourceId: string, opts) => apiAction(async (client) => {
      await deleteAccount(client, resourceId);

      if (opts.json) {
        console.log(JSON.stringify({ deleted: true, resourceId }));
      } else {
        console.log(chalk.green(`Account ${resourceId} deleted.`));
      }
    })(opts));
}
