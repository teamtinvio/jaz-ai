import { Command } from 'commander';
import {
  listCurrencyRates, addCurrencyRate, updateCurrencyRate,
  startCurrencyRatesImportJob, getCurrencyRatesImportJobStatus,
  bulkUpsertCurrencyRates,
} from '../core/api/currencies.js';
import { apiAction } from './api-action.js';
import { outputList, type OutputOpts } from './output.js';
import type { TableColumn } from './table-formatter.js';
import { formatId } from './format-helpers.js';
import { highlight, muted, success } from './ui/theme.js';
import { parsePositiveInt, parseNonNegativeInt, requireFields, readBodyInput } from './parsers.js';
import { paginatedFetch } from './pagination.js';

const RATES_COLUMNS: TableColumn[] = [
  { key: 'resourceId', header: 'ID', format: formatId },
  { key: 'rate', header: 'Rate' },
  { key: 'rateApplicableFrom', header: 'From' },
  { key: 'rateApplicableTo', header: 'To' },
];

export function registerCurrencyRatesCommand(program: Command): void {
  const cmd = program
    .command('currency-rates')
    .description('Manage currency exchange rates');

  // ── clio currency-rates list ──────────────────────────────────
  cmd
    .command('list <currencyCode>')
    .description('List exchange rates for a currency')
    .option('--limit <n>', 'Max results (default 100)', parsePositiveInt)
    .option('--offset <n>', 'Page number offset (0-indexed)', parseNonNegativeInt)
    .option('--all', 'Fetch all pages')
    .option('--max-rows <n>', 'Max rows for --all (default 10000)', parsePositiveInt)
    .option('--api-key <key>', 'API key (overrides stored/env)')
    .option('--format <type>', 'Output format: table, json, csv, yaml')
    .option('--json', 'Output as JSON')
    .action((currencyCode: string, opts) => apiAction(async (client) => {
      const code = currencyCode.toUpperCase();
      const result = await paginatedFetch(
        opts,
        (p) => listCurrencyRates(client, code, p),
        { label: `Fetching ${code} rates` },
      );

      outputList(result as any, RATES_COLUMNS, opts as OutputOpts, `${code} Rates`);  // eslint-disable-line @typescript-eslint/no-explicit-any
    })(opts));

  // ── clio currency-rates add ───────────────────────────────────
  cmd
    .command('add <currencyCode>')
    .description('Add an exchange rate for a currency')
    .option('--rate <number>', 'Exchange rate', parseFloat)
    .option('--from <YYYY-MM-DD>', 'Rate applicable from date')
    .option('--to <YYYY-MM-DD>', 'Rate applicable to date (optional)')
    .option('--api-key <key>', 'API key (overrides stored/env)')
    .option('--format <type>', 'Output format: table, json, csv, yaml')
    .option('--json', 'Output as JSON')
    .action((currencyCode: string, opts) => apiAction(async (client) => {
      requireFields(opts as Record<string, unknown>, [
        { flag: '--rate', key: 'rate' },
        { flag: '--from', key: 'from' },
      ]);

      const code = currencyCode.toUpperCase();
      const data: { rate: number; rateApplicableFrom: string; rateApplicableTo?: string } = {
        rate: opts.rate,
        rateApplicableFrom: opts.from,
      };
      if (opts.to) data.rateApplicableTo = opts.to;

      const res = await addCurrencyRate(client, code, data);

      if (opts.json || opts.format) {
        const result = { data: [res.data], totalElements: 1, totalPages: 1, truncated: false };
        outputList(result as any, RATES_COLUMNS, opts as OutputOpts, `${code} Rates`);  // eslint-disable-line @typescript-eslint/no-explicit-any
      } else {
        console.log(success(`Rate added for ${code}: ${opts.rate} (from ${opts.from})`));
      }
    })(opts));

  // ── clio currency-rates update ────────────────────────────────
  cmd
    .command('update <currencyCode> <rateResourceId>')
    .description('Update an exchange rate')
    .option('--rate <number>', 'Exchange rate', parseFloat)
    .option('--from <YYYY-MM-DD>', 'Rate applicable from date')
    .option('--to <YYYY-MM-DD>', 'Rate applicable to date (optional)')
    .option('--api-key <key>', 'API key (overrides stored/env)')
    .option('--format <type>', 'Output format: table, json, csv, yaml')
    .option('--json', 'Output as JSON')
    .action((currencyCode: string, rateResourceId: string, opts) => apiAction(async (client) => {
      requireFields(opts as Record<string, unknown>, [
        { flag: '--rate', key: 'rate' },
        { flag: '--from', key: 'from' },
      ]);

      const code = currencyCode.toUpperCase();
      const data: { rate: number; rateApplicableFrom: string; rateApplicableTo?: string } = {
        rate: opts.rate,
        rateApplicableFrom: opts.from,
      };
      if (opts.to) data.rateApplicableTo = opts.to;

      const res = await updateCurrencyRate(client, code, rateResourceId, data);

      if (opts.json || opts.format) {
        const result = { data: [res.data], totalElements: 1, totalPages: 1, truncated: false };
        outputList(result as any, RATES_COLUMNS, opts as OutputOpts, `${code} Rates`);  // eslint-disable-line @typescript-eslint/no-explicit-any
      } else {
        console.log(success(`Rate updated for ${code}: ${opts.rate}`));
      }
    })(opts));

  // ── clio currency-rates import ──────────────────────────────
  cmd
    .command('import <currencyCode>')
    .description('Import currency rates from a CSV file URL')
    .option('--csv-url <url>', 'URL of the CSV file to import (required)')
    .option('--api-key <key>', 'API key (overrides stored/env)')
    .option('--format <type>', 'Output format: table, json, csv, yaml')
    .option('--json', 'Output as JSON')
    .action((currencyCode: string, opts) => apiAction(async (client) => {
      requireFields(opts as Record<string, unknown>, [
        { flag: '--csv-url', key: 'csvUrl' },
      ]);

      const code = currencyCode.toUpperCase();
      const res = await startCurrencyRatesImportJob(client, code, opts.csvUrl);

      if (opts.json) {
        console.log(JSON.stringify(res.data, null, 2));
      } else {
        const jobId = (res.data as { jobId?: string }).jobId;
        console.log(success(`Import job started for ${code}`));
        if (jobId) console.log(highlight('Job ID:'), jobId);
        console.log(muted('Check status: clio currency-rates import-status ' + (jobId ?? '<jobId>')));
      }
    })(opts));

  // ── clio currency-rates import-status ───────────────────────
  cmd
    .command('import-status <jobId>')
    .description('Check the status of a currency rates import job')
    .option('--api-key <key>', 'API key (overrides stored/env)')
    .option('--format <type>', 'Output format: table, json, csv, yaml')
    .option('--json', 'Output as JSON')
    .action((jobId: string, opts) => apiAction(async (client) => {
      const res = await getCurrencyRatesImportJobStatus(client, jobId);

      if (opts.json) {
        console.log(JSON.stringify(res.data, null, 2));
      } else {
        const d = res.data as { status?: string; message?: string };
        console.log(highlight('Status:'), d.status ?? 'unknown');
        if (d.message) console.log(highlight('Message:'), d.message);
      }
    })(opts));

  // ── clio currency-rates bulk-upsert ─────────────────────────
  cmd
    .command('bulk-upsert')
    .description('Create exchange rates in bulk (max 500). Auto-enables currencies not yet in the org.')
    .option('--input <file>', 'Read JSON body from file (or pipe via stdin with --input -)')
    .option('--api-key <key>', 'API key (overrides stored/env)')
    .option('--json', 'Output as JSON')
    .action(apiAction(async (client, opts) => {
      const body = readBodyInput(opts);
      if (!body) {
        console.error('Error: --input <file> is required (JSON with { "rates": [...] })');
        process.exit(1);
      }
      const rates = (body as Record<string, unknown>).rates ?? body;
      if (!Array.isArray(rates)) {
        console.error('Error: expected { "rates": [...] } or a JSON array');
        process.exit(1);
      }
      if (rates.length > 500) {
        console.error(`Error: max 500 rates per call (got ${rates.length}). Split into batches.`);
        process.exit(1);
      }
      const res = await bulkUpsertCurrencyRates(client, rates);
      if (opts.json) {
        console.log(JSON.stringify(res.data, null, 2));
      } else {
        const ids = res.data.resourceIds ?? [];
        console.log(success(`${ids.length} rate(s) upserted.`));
        ids.forEach((id: string) => console.log(`  ${id}`));
      }
    }));
}
