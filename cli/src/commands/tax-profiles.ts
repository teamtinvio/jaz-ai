import chalk from 'chalk';
import { Command } from 'commander';
import {
  listTaxProfiles, listTaxTypes, createTaxProfile,
  getTaxProfile, searchTaxProfiles, updateTaxProfile,
  listWithholdingTaxCodes,
} from '../core/api/tax-profiles.js';
import { findExistingTaxProfile } from '../core/api/guards.js';
import { apiAction } from './api-action.js';
import { parsePositiveInt, parseNonNegativeInt, requireFields } from './parsers.js';
import { paginatedFetch } from './pagination.js';
import { outputList, type OutputOpts } from './output.js';
import type { TableColumn } from './table-formatter.js';
import { formatId } from './format-helpers.js';

const TAX_PROFILES_COLUMNS: TableColumn[] = [
  { key: 'resourceId', header: 'ID', format: formatId },
  { key: 'name', header: 'Name' },
  { key: 'taxRate', header: 'Rate (%)' },
  { key: 'taxTypeCode', header: 'Tax Type' },
];

const TAX_TYPES_COLUMNS: TableColumn[] = [
  { key: 'code', header: 'Code' },
  { key: 'name', header: 'Name' },
];

export function registerTaxProfilesCommand(program: Command): void {
  const tp = program
    .command('tax-profiles')
    .description('Manage tax profiles and tax types');

  // ── clio tax-profiles list ────────────────────────────────────
  tp
    .command('list')
    .description('List tax profiles')
    .option('--limit <n>', 'Max results (default 100)', parsePositiveInt)
    .option('--offset <n>', 'Page number offset (0-indexed)', parseNonNegativeInt)
    .option('--all', 'Fetch all pages')
    .option('--max-rows <n>', 'Max rows for --all (default 10000)', parsePositiveInt)
    .option('--api-key <key>', 'API key (overrides stored/env)')
    .option('--format <type>', 'Output format: table, json, csv, yaml')
    .option('--json', 'Output as JSON')
    .action(apiAction(async (client, opts) => {
      const result = await paginatedFetch(
        opts,
        (p) => listTaxProfiles(client, p),
        { label: 'Fetching tax profiles' },
      );

      outputList(result as any, TAX_PROFILES_COLUMNS, opts as OutputOpts, 'Tax Profiles');  // eslint-disable-line @typescript-eslint/no-explicit-any
    }));

  // ── clio tax-profiles types ───────────────────────────────────
  tp
    .command('types')
    .description('List available tax types (GST, VAT, WHT, etc.)')
    .option('--limit <n>', 'Max results (default 100)', parsePositiveInt)
    .option('--offset <n>', 'Page number offset (0-indexed)', parseNonNegativeInt)
    .option('--all', 'Fetch all pages')
    .option('--max-rows <n>', 'Max rows for --all (default 10000)', parsePositiveInt)
    .option('--api-key <key>', 'API key (overrides stored/env)')
    .option('--format <type>', 'Output format: table, json, csv, yaml')
    .option('--json', 'Output as JSON')
    .action(apiAction(async (client, opts) => {
      const result = await paginatedFetch(
        opts,
        (p) => listTaxTypes(client, p),
        { label: 'Fetching tax types' },
      );

      outputList(result as any, TAX_TYPES_COLUMNS, opts as OutputOpts, 'Tax Types');  // eslint-disable-line @typescript-eslint/no-explicit-any
    }));

  // ── clio tax-profiles get ────────────────────────────────────
  tp
    .command('get <resourceId>')
    .description('Get a tax profile by resourceId')
    .option('--api-key <key>', 'API key (overrides stored/env)')
    .option('--json', 'Output as JSON')
    .action((resourceId: string, opts) => apiAction(async (client) => {
      const res = await getTaxProfile(client, resourceId);
      const p = res.data;

      if (opts.json) {
        console.log(JSON.stringify(p, null, 2));
      } else {
        console.log(chalk.bold('Name:'), p.name);
        console.log(chalk.bold('ID:'), p.resourceId);
        console.log(chalk.bold('Rate:'), `${p.taxRate}%`);
        console.log(chalk.bold('Tax Type:'), p.taxTypeCode);
      }
    })(opts));

  // ── clio tax-profiles search ────────────────────────────────
  tp
    .command('search')
    .description('Search tax profiles')
    .option('--name <name>', 'Filter by name (contains)')
    .option('--tax-type-code <code>', 'Filter by tax type code (eq)')
    .option('--sort <field>', 'Sort field (default: name)')
    .option('--order <direction>', 'Sort order: ASC or DESC (default: ASC)')
    .option('--limit <n>', 'Max results (default 20)', parsePositiveInt)
    .option('--offset <n>', 'Page number offset (0-indexed)', parseNonNegativeInt)
    .option('--all', 'Fetch all pages')
    .option('--max-rows <n>', 'Max rows for --all (default 10000)', parsePositiveInt)
    .option('--api-key <key>', 'API key (overrides stored/env)')
    .option('--format <type>', 'Output format: table, json, csv, yaml')
    .option('--json', 'Output as JSON')
    .action(apiAction(async (client, opts) => {
      const filter: Record<string, unknown> = {};
      if (opts.name) filter.name = { contains: opts.name };
      if (opts.taxTypeCode) filter.taxTypeCode = { eq: opts.taxTypeCode };

      const searchFilter = Object.keys(filter).length > 0 ? filter : undefined;
      const sort = { sortBy: [opts.sort ?? 'name'] as string[], order: (opts.order ?? 'ASC') as 'ASC' | 'DESC' };

      const result = await paginatedFetch(
        opts,
        ({ limit, offset }) => searchTaxProfiles(client, { filter: searchFilter, limit, offset, sort }),
        { label: 'Searching tax profiles', defaultLimit: 20 },
      );

      outputList(result as any, TAX_PROFILES_COLUMNS, opts as OutputOpts, 'Tax Profiles');  // eslint-disable-line @typescript-eslint/no-explicit-any
    }));

  // ── clio tax-profiles update ────────────────────────────────
  tp
    .command('update <resourceId>')
    .description('Update a tax profile')
    .option('--name <name>', 'New name')
    .option('--rate <n>', 'New tax rate as percentage', parsePositiveInt)
    .option('--tax-type-code <code>', 'New tax type code')
    .option('--status <status>', 'New status (ACTIVE, INACTIVE)')
    .option('--api-key <key>', 'API key (overrides stored/env)')
    .option('--json', 'Output as JSON')
    .action((resourceId: string, opts) => apiAction(async (client) => {
      const data: Record<string, unknown> = {};
      if (opts.name !== undefined) data.name = opts.name;
      if (opts.rate !== undefined) data.taxRate = opts.rate;
      if (opts.taxTypeCode !== undefined) data.taxTypeCode = opts.taxTypeCode;
      if (opts.status !== undefined) data.status = opts.status;

      const res = await updateTaxProfile(client, resourceId, data);

      if (opts.json) {
        console.log(JSON.stringify(res.data, null, 2));
      } else {
        console.log(chalk.green(`Tax profile updated: ${res.data.name}`));
      }
    })(opts));

  // ── clio tax-profiles wht-codes ─────────────────────────────
  tp
    .command('wht-codes')
    .description('List withholding tax codes')
    .option('--api-key <key>', 'API key (overrides stored/env)')
    .option('--json', 'Output as JSON')
    .action(apiAction(async (client, opts) => {
      const res = await listWithholdingTaxCodes(client);

      if (opts.json) {
        console.log(JSON.stringify(res.data, null, 2));
      } else {
        if (res.data.length === 0) {
          console.log('No withholding tax codes found.');
          return;
        }
        console.log(chalk.bold(`Withholding Tax Codes (${res.data.length}):\n`));
        for (const c of res.data) {
          console.log(`  ${chalk.cyan(c.code ?? c.resourceId ?? '?')}  ${c.description ?? ''}  ${chalk.dim(c.countryCode ?? '')}`);
        }
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

      // Guard: dedup check (same as tool executor)
      const existing = await findExistingTaxProfile(client, opts.name);
      if (existing) {
        if (opts.json) {
          console.log(JSON.stringify({ _guard: 'duplicate_skipped', existing }, null, 2));
        } else {
          console.log(chalk.yellow(`Tax profile "${opts.name}" already exists (${existing.resourceId}).`));
        }
        return;
      }

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
