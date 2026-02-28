import chalk from 'chalk';
import { Command } from 'commander';
import {
  listTaxProfiles, listTaxTypes, createTaxProfile,
} from '../core/api/tax-profiles.js';
import { apiAction } from './api-action.js';
import { parsePositiveInt, parseNonNegativeInt, requireFields } from './parsers.js';
import { paginatedFetch, paginatedJson, displaySlice } from './pagination.js';

export function registerTaxProfilesCommand(program: Command): void {
  const tp = program
    .command('tax-profiles')
    .description('Manage tax profiles and tax types');

  // ── clio tax-profiles list ────────────────────────────────────
  tp
    .command('list')
    .description('List tax profiles')
    .option('--limit <n>', 'Max results (default 100)', parsePositiveInt)
    .option('--offset <n>', 'Offset for pagination', parseNonNegativeInt)
    .option('--all', 'Fetch all pages')
    .option('--max-rows <n>', 'Max rows for --all (default 10000)', parsePositiveInt)
    .option('--api-key <key>', 'API key (overrides stored/env)')
    .option('--json', 'Output as JSON')
    .action(apiAction(async (client, opts) => {
      const result = await paginatedFetch(
        opts,
        (p) => listTaxProfiles(client, p),
        { label: 'Fetching tax profiles' },
      );

      if (opts.json) {
        console.log(paginatedJson(result, opts));
      } else {
        console.log(chalk.bold(`Tax Profiles (${result.data.length} of ${result.totalElements}):\n`));
        const { items, overflow } = displaySlice(result.data);
        for (const tp of items) {
          console.log(`  ${chalk.cyan(tp.resourceId)}  ${tp.name}  ${tp.taxRate}%  ${chalk.dim(tp.taxTypeCode)}`);
        }
        if (overflow > 0) console.log(chalk.dim(`  ... and ${overflow.toLocaleString()} more (use --json for full output)`));
      }
    }));

  // ── clio tax-profiles types ───────────────────────────────────
  tp
    .command('types')
    .description('List available tax types (GST, VAT, WHT, etc.)')
    .option('--limit <n>', 'Max results (default 100)', parsePositiveInt)
    .option('--offset <n>', 'Offset for pagination', parseNonNegativeInt)
    .option('--all', 'Fetch all pages')
    .option('--max-rows <n>', 'Max rows for --all (default 10000)', parsePositiveInt)
    .option('--api-key <key>', 'API key (overrides stored/env)')
    .option('--json', 'Output as JSON')
    .action(apiAction(async (client, opts) => {
      const result = await paginatedFetch(
        opts,
        (p) => listTaxTypes(client, p),
        { label: 'Fetching tax types' },
      );

      if (opts.json) {
        console.log(paginatedJson(result, opts));
      } else {
        console.log(chalk.bold(`Tax Types (${result.data.length} of ${result.totalElements}):\n`));
        const { items, overflow } = displaySlice(result.data);
        for (const tt of items) {
          console.log(`  ${chalk.cyan(tt.code)}  ${tt.name}`);
        }
        if (overflow > 0) console.log(chalk.dim(`  ... and ${overflow.toLocaleString()} more (use --json for full output)`));
      }
    }));

  // ── clio tax-profiles create ──────────────────────────────────
  tp
    .command('create')
    .description('Create a new tax profile')
    .option('--name <name>', 'Tax profile name (e.g., "GST 9%")')
    .option('--rate <n>', 'Tax rate as percentage (e.g., 9)', parsePositiveInt)
    .option('--tax-type-code <code>', 'Tax type code (from tax-profiles types)')
    .option('--api-key <key>', 'API key (overrides stored/env)')
    .option('--json', 'Output as JSON')
    .action(apiAction(async (client, opts) => {
      requireFields(opts as Record<string, unknown>, [
        { flag: '--name', key: 'name' },
        { flag: '--rate', key: 'rate' },
        { flag: '--tax-type-code', key: 'taxTypeCode' },
      ]);

      const res = await createTaxProfile(client, {
        name: opts.name,
        taxRate: opts.rate,
        taxTypeCode: opts.taxTypeCode,
      });

      if (opts.json) {
        console.log(JSON.stringify(res.data, null, 2));
      } else {
        console.log(chalk.green(`Tax profile created: ${opts.name} (${opts.rate}%)`));
        console.log(chalk.bold('ID:'), res.data.resourceId);
      }
    }));
}
