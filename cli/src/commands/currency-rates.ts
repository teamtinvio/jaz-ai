import chalk from 'chalk';
import { Command } from 'commander';
import {
  listCurrencyRates, addCurrencyRate, updateCurrencyRate,
  startCurrencyRatesImportJob, getCurrencyRatesImportJobStatus,
} from '../core/api/currencies.js';
import { apiAction } from './api-action.js';
import { parsePositiveInt, parseNonNegativeInt, requireFields } from './parsers.js';
import { paginatedFetch, paginatedJson, displaySlice } from './pagination.js';

export function registerCurrencyRatesCommand(program: Command): void {
  const cmd = program
    .command('currency-rates')
    .description('Manage currency exchange rates');

  // ── clio currency-rates list ──────────────────────────────────
  cmd
    .command('list <currencyCode>')
    .description('List exchange rates for a currency')
    .option('--limit <n>', 'Max results (default 100)', parsePositiveInt)
    .option('--offset <n>', 'Offset for pagination', parseNonNegativeInt)
    .option('--all', 'Fetch all pages')
    .option('--max-rows <n>', 'Max rows for --all (default 10000)', parsePositiveInt)
    .option('--api-key <key>', 'API key (overrides stored/env)')
    .option('--json', 'Output as JSON')
    .action((currencyCode: string, opts) => apiAction(async (client) => {
      const code = currencyCode.toUpperCase();
      const result = await paginatedFetch(
        opts,
        (p) => listCurrencyRates(client, code, p),
        { label: `Fetching ${code} rates` },
      );

      if (opts.json) {
        console.log(paginatedJson(result, opts));
      } else {
        console.log(chalk.bold(`${code} Rates (${result.data.length} of ${result.totalElements}):\n`));
        const { items, overflow } = displaySlice(result.data);
        for (const r of items) {
          const to = r.rateApplicableTo || '(open)';
          console.log(`  ${chalk.cyan(r.resourceId)}  ${chalk.bold(String(r.rate))}  ${r.rateApplicableFrom} — ${to}`);
        }
        if (overflow > 0) console.log(chalk.dim(`  ... and ${overflow.toLocaleString()} more (use --json for full output)`));
      }
    })(opts));

  // ── clio currency-rates add ───────────────────────────────────
  cmd
    .command('add <currencyCode>')
    .description('Add an exchange rate for a currency')
    .option('--rate <number>', 'Exchange rate', parseFloat)
    .option('--from <YYYY-MM-DD>', 'Rate applicable from date')
    .option('--to <YYYY-MM-DD>', 'Rate applicable to date (optional)')
    .option('--api-key <key>', 'API key (overrides stored/env)')
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

      if (opts.json) {
        console.log(JSON.stringify(res.data, null, 2));
      } else {
        console.log(chalk.green(`Rate added for ${code}: ${opts.rate} (from ${opts.from})`));
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

      if (opts.json) {
        console.log(JSON.stringify(res.data, null, 2));
      } else {
        console.log(chalk.green(`Rate updated for ${code}: ${opts.rate}`));
      }
    })(opts));

  // ── clio currency-rates import ──────────────────────────────
  cmd
    .command('import <currencyCode>')
    .description('Import currency rates from a CSV file URL')
    .option('--csv-url <url>', 'URL of the CSV file to import (required)')
    .option('--api-key <key>', 'API key (overrides stored/env)')
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
        console.log(chalk.green(`Import job started for ${code}`));
        if (jobId) console.log(chalk.bold('Job ID:'), jobId);
        console.log(chalk.dim('Check status: clio currency-rates import-status ' + (jobId ?? '<jobId>')));
      }
    })(opts));

  // ── clio currency-rates import-status ───────────────────────
  cmd
    .command('import-status <jobId>')
    .description('Check the status of a currency rates import job')
    .option('--api-key <key>', 'API key (overrides stored/env)')
    .option('--json', 'Output as JSON')
    .action((jobId: string, opts) => apiAction(async (client) => {
      const res = await getCurrencyRatesImportJobStatus(client, jobId);

      if (opts.json) {
        console.log(JSON.stringify(res.data, null, 2));
      } else {
        const d = res.data as { status?: string; message?: string };
        console.log(chalk.bold('Status:'), d.status ?? 'unknown');
        if (d.message) console.log(chalk.bold('Message:'), d.message);
      }
    })(opts));
}
