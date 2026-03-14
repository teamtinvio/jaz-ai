import chalk from 'chalk';
import { Command } from 'commander';
import { listCurrencies, addCurrency } from '../core/api/currencies.js';
import { apiAction } from './api-action.js';
import { outputList, type OutputOpts } from './output.js';
import type { TableColumn } from './table-formatter.js';

const CURRENCIES_COLUMNS: TableColumn[] = [
  { key: 'currencyCode', header: 'Code' },
  { key: 'currencyName', header: 'Name' },
  { key: 'currencySymbol', header: 'Symbol' },
  { key: 'baseCurrency', header: 'Base' },
];

export function registerCurrenciesCommand(program: Command): void {
  const cmd = program
    .command('currencies')
    .description('Manage organization currencies');

  // ── clio currencies list ──────────────────────────────────────
  cmd
    .command('list')
    .description('List enabled currencies for the organization')
    .option('--api-key <key>', 'API key (overrides stored/env)')
    .option('--format <type>', 'Output format: table, json, csv, yaml')
    .option('--json', 'Output as JSON')
    .action(apiAction(async (client, opts) => {
      const res = await listCurrencies(client);
      const result = { data: res.data, totalElements: res.data.length, totalPages: 1, truncated: false };

      outputList(result as any, CURRENCIES_COLUMNS, opts as OutputOpts, 'Currencies');  // eslint-disable-line @typescript-eslint/no-explicit-any
    }));

  // ── clio currencies add ───────────────────────────────────────
  cmd
    .command('add <codes...>')
    .description('Add currencies to the organization (e.g. clio currencies add EUR GBP)')
    .option('--api-key <key>', 'API key (overrides stored/env)')
    .option('--format <type>', 'Output format: table, json, csv, yaml')
    .option('--json', 'Output as JSON')
    .action((codes: string[], opts) => apiAction(async (client) => {
      const upperCodes = codes.map(c => c.toUpperCase());
      const res = await addCurrency(client, upperCodes);

      if (opts.json || opts.format) {
        const data = Array.isArray(res.data) ? res.data : [res.data];
        const result = { data, totalElements: data.length, totalPages: 1, truncated: false };
        outputList(result as any, CURRENCIES_COLUMNS, opts as OutputOpts, 'Currencies');  // eslint-disable-line @typescript-eslint/no-explicit-any
      } else {
        console.log(chalk.green(`Added currencies: ${upperCodes.join(', ')}`));
      }
    })(opts));
}
