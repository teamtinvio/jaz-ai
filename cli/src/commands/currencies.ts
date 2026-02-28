import chalk from 'chalk';
import { Command } from 'commander';
import { listCurrencies, addCurrency } from '../core/api/currencies.js';
import { apiAction } from './api-action.js';

export function registerCurrenciesCommand(program: Command): void {
  const cmd = program
    .command('currencies')
    .description('Manage organization currencies');

  // ── clio currencies list ──────────────────────────────────────
  cmd
    .command('list')
    .description('List enabled currencies for the organization')
    .option('--api-key <key>', 'API key (overrides stored/env)')
    .option('--json', 'Output as JSON')
    .action(apiAction(async (client, opts) => {
      const res = await listCurrencies(client);

      if (opts.json) {
        console.log(JSON.stringify(res.data, null, 2));
      } else {
        console.log(chalk.bold(`Currencies (${res.data.length}):\n`));
        for (const c of res.data) {
          const base = c.baseCurrency ? chalk.dim(' (base)') : '';
          console.log(`  ${chalk.cyan(c.currencyCode)}  ${c.currencyName}  ${chalk.dim(c.currencySymbol)}${base}`);
        }
      }
    }));

  // ── clio currencies add ───────────────────────────────────────
  cmd
    .command('add <codes...>')
    .description('Add currencies to the organization (e.g. clio currencies add EUR GBP)')
    .option('--api-key <key>', 'API key (overrides stored/env)')
    .option('--json', 'Output as JSON')
    .action((codes: string[], opts) => apiAction(async (client) => {
      const upperCodes = codes.map(c => c.toUpperCase());
      const res = await addCurrency(client, upperCodes);

      if (opts.json) {
        console.log(JSON.stringify(res.data, null, 2));
      } else {
        console.log(chalk.green(`Added currencies: ${upperCodes.join(', ')}`));
      }
    })(opts));
}
