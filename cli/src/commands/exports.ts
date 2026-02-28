import chalk from 'chalk';
import { Command } from 'commander';
import { downloadExport } from '../core/api/data-exports.js';
import type { ExportType } from '../core/api/types.js';
import { apiAction } from './api-action.js';
import { requireFields } from './parsers.js';

export function registerExportsCommand(program: Command): void {
  const cmd = program
    .command('exports')
    .description('Manage data exports');

  // ── clio exports download ─────────────────────────────────────
  cmd
    .command('download')
    .description('Download a data export report')
    .option('--type <exportType>', 'Export type (e.g., trial-balance, balance-sheet, profit-and-loss, general-ledger, sales-summary, etc.)')
    .option('--start-date <YYYY-MM-DD>', 'Period start date')
    .option('--end-date <YYYY-MM-DD>', 'Period end date')
    .option('--currency <code>', 'Currency code override')
    .option('--tags <csv>', 'Comma-separated tag names')
    .option('--contact <resourceId>', 'Filter by contact resourceId')
    .option('--api-key <key>', 'API key (overrides stored/env)')
    .option('--json', 'Output as JSON')
    .action(apiAction(async (client, opts) => {
      requireFields(opts as Record<string, unknown>, [
        { flag: '--type', key: 'type' },
      ]);

      const params: Record<string, unknown> = {};
      if (opts.startDate) params.startDate = opts.startDate;
      if (opts.endDate) params.endDate = opts.endDate;
      if (opts.currency) params.currencyCode = opts.currency;
      if (opts.tags) params.tags = (opts.tags as string).split(',').map((t: string) => t.trim());
      if (opts.contact) params.contactResourceId = opts.contact;

      const res = await downloadExport(client, opts.type as ExportType, params);

      if (opts.json) {
        console.log(JSON.stringify(res.data, null, 2));
      } else {
        const d = res.data as { fileName?: string; fileUrl?: string };
        console.log(chalk.green('Export ready'));
        if (d.fileName) console.log(chalk.bold('File:'), d.fileName);
        if (d.fileUrl) console.log(chalk.bold('URL:'), d.fileUrl);
      }
    }));
}
