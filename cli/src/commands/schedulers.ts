import chalk from 'chalk';
import { Command } from 'commander';
import {
  listScheduledInvoices, listScheduledBills, listScheduledJournals,
} from '../core/api/schedulers.js';
import { createScheduledInvoice } from '../core/api/invoices.js';
import { createScheduledBill } from '../core/api/bills.js';
import { createScheduledJournal } from '../core/api/journals.js';
import { apiAction } from './api-action.js';
import { parsePositiveInt, parseNonNegativeInt, readBodyInput, requireFields, parseLineItems, parseJournalEntries } from './parsers.js';
import { paginatedFetch, paginatedJson, displaySlice } from './pagination.js';

export function registerSchedulersCommand(program: Command): void {
  const cmd = program
    .command('schedulers')
    .description('Manage scheduled (recurring) transactions');

  // ── clio schedulers list-invoices ──────────────────────────────
  cmd
    .command('list-invoices')
    .description('List scheduled invoices')
    .option('--limit <n>', 'Max results (default 100)', parsePositiveInt)
    .option('--offset <n>', 'Offset for pagination', parseNonNegativeInt)
    .option('--all', 'Fetch all pages')
    .option('--max-rows <n>', 'Max rows for --all (default 10000)', parsePositiveInt)
    .option('--api-key <key>', 'API key (overrides stored/env)')
    .option('--json', 'Output as JSON')
    .action(apiAction(async (client, opts) => {
      const result = await paginatedFetch(
        opts,
        (p) => listScheduledInvoices(client, p),
        { label: 'Fetching scheduled invoices' },
      );

      if (opts.json) {
        console.log(paginatedJson(result, opts));
      } else {
        console.log(chalk.bold(`Scheduled Invoices (${result.data.length} of ${result.totalElements}):\n`));
        const { items, overflow } = displaySlice(result.data);
        for (const s of items) {
          console.log(`  ${chalk.cyan(s.resourceId)}  ${s.repeat}  ${s.startDate}  ${chalk.dim(s.status)}`);
        }
        if (overflow > 0) console.log(chalk.dim(`  ... and ${overflow.toLocaleString()} more (use --json for full output)`));
      }
    }));

  // ── clio schedulers list-bills ────────────────────────────────
  cmd
    .command('list-bills')
    .description('List scheduled bills')
    .option('--limit <n>', 'Max results (default 100)', parsePositiveInt)
    .option('--offset <n>', 'Offset for pagination', parseNonNegativeInt)
    .option('--all', 'Fetch all pages')
    .option('--max-rows <n>', 'Max rows for --all (default 10000)', parsePositiveInt)
    .option('--api-key <key>', 'API key (overrides stored/env)')
    .option('--json', 'Output as JSON')
    .action(apiAction(async (client, opts) => {
      const result = await paginatedFetch(
        opts,
        (p) => listScheduledBills(client, p),
        { label: 'Fetching scheduled bills' },
      );

      if (opts.json) {
        console.log(paginatedJson(result, opts));
      } else {
        console.log(chalk.bold(`Scheduled Bills (${result.data.length} of ${result.totalElements}):\n`));
        const { items, overflow } = displaySlice(result.data);
        for (const s of items) {
          console.log(`  ${chalk.cyan(s.resourceId)}  ${s.repeat}  ${s.startDate}  ${chalk.dim(s.status)}`);
        }
        if (overflow > 0) console.log(chalk.dim(`  ... and ${overflow.toLocaleString()} more (use --json for full output)`));
      }
    }));

  // ── clio schedulers list-journals ─────────────────────────────
  cmd
    .command('list-journals')
    .description('List scheduled journals')
    .option('--limit <n>', 'Max results (default 100)', parsePositiveInt)
    .option('--offset <n>', 'Offset for pagination', parseNonNegativeInt)
    .option('--all', 'Fetch all pages')
    .option('--max-rows <n>', 'Max rows for --all (default 10000)', parsePositiveInt)
    .option('--api-key <key>', 'API key (overrides stored/env)')
    .option('--json', 'Output as JSON')
    .action(apiAction(async (client, opts) => {
      const result = await paginatedFetch(
        opts,
        (p) => listScheduledJournals(client, p),
        { label: 'Fetching scheduled journals' },
      );

      if (opts.json) {
        console.log(paginatedJson(result, opts));
      } else {
        console.log(chalk.bold(`Scheduled Journals (${result.data.length} of ${result.totalElements}):\n`));
        const { items, overflow } = displaySlice(result.data);
        for (const s of items) {
          console.log(`  ${chalk.cyan(s.resourceId)}  ${s.repeat}  ${s.startDate}  ${chalk.dim(s.status)}`);
        }
        if (overflow > 0) console.log(chalk.dim(`  ... and ${overflow.toLocaleString()} more (use --json for full output)`));
      }
    }));

  // ── clio schedulers create-invoice ────────────────────────────
  cmd
    .command('create-invoice')
    .description('Create a scheduled (recurring) invoice')
    .option('--start-date <YYYY-MM-DD>', 'First occurrence date')
    .option('--end-date <YYYY-MM-DD>', 'Last occurrence date (optional)')
    .option('--repeat <interval>', 'Recurrence: WEEKLY, MONTHLY, QUARTERLY, YEARLY')
    .option('--contact <resourceId>', 'Customer contact resourceId')
    .option('--reference <ref>', 'Invoice reference')
    .option('--value-date <YYYY-MM-DD>', 'Template issue date')
    .option('--due-date <YYYY-MM-DD>', 'Template due date')
    .option('--line-items <json>', 'Line items as JSON string')
    .option('--tag <name>', 'Tag name')
    .option('--input <file>', 'Read full request body from JSON file (or pipe via stdin)')
    .option('--api-key <key>', 'API key (overrides stored/env)')
    .option('--json', 'Output as JSON')
    .action(apiAction(async (client, opts) => {
      const body = readBodyInput(opts);

      let res;
      if (body) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- user-provided JSON, API validates
        res = await createScheduledInvoice(client, body as any);
      } else {
        requireFields(opts as Record<string, unknown>, [
          { flag: '--start-date', key: 'startDate' },
          { flag: '--repeat', key: 'repeat' },
          { flag: '--contact', key: 'contact' },
          { flag: '--value-date', key: 'valueDate' },
          { flag: '--due-date', key: 'dueDate' },
          { flag: '--line-items', key: 'lineItems' },
        ]);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- user-provided JSON, API validates
        const lineItems = parseLineItems(opts.lineItems) as any[];
        res = await createScheduledInvoice(client, {
          status: 'ACTIVE',
          startDate: opts.startDate,
          endDate: opts.endDate,
          repeat: opts.repeat,
          invoice: {
            reference: opts.reference,
            valueDate: opts.valueDate,
            dueDate: opts.dueDate,
            contactResourceId: opts.contact,
            lineItems,
            tag: opts.tag,
            saveAsDraft: false,
          },
        });
      }

      if (opts.json) {
        console.log(JSON.stringify(res.data, null, 2));
      } else {
        console.log(chalk.green('Scheduled invoice created'));
      }
    }));

  // ── clio schedulers create-bill ───────────────────────────────
  cmd
    .command('create-bill')
    .description('Create a scheduled (recurring) bill')
    .option('--start-date <YYYY-MM-DD>', 'First occurrence date')
    .option('--end-date <YYYY-MM-DD>', 'Last occurrence date (optional)')
    .option('--repeat <interval>', 'Recurrence: WEEKLY, MONTHLY, QUARTERLY, YEARLY')
    .option('--contact <resourceId>', 'Supplier contact resourceId')
    .option('--reference <ref>', 'Bill reference')
    .option('--value-date <YYYY-MM-DD>', 'Template issue date')
    .option('--due-date <YYYY-MM-DD>', 'Template due date')
    .option('--line-items <json>', 'Line items as JSON string')
    .option('--tag <name>', 'Tag name')
    .option('--input <file>', 'Read full request body from JSON file (or pipe via stdin)')
    .option('--api-key <key>', 'API key (overrides stored/env)')
    .option('--json', 'Output as JSON')
    .action(apiAction(async (client, opts) => {
      const body = readBodyInput(opts);

      let res;
      if (body) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- user-provided JSON, API validates
        res = await createScheduledBill(client, body as any);
      } else {
        requireFields(opts as Record<string, unknown>, [
          { flag: '--start-date', key: 'startDate' },
          { flag: '--repeat', key: 'repeat' },
          { flag: '--contact', key: 'contact' },
          { flag: '--value-date', key: 'valueDate' },
          { flag: '--due-date', key: 'dueDate' },
          { flag: '--line-items', key: 'lineItems' },
        ]);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- user-provided JSON, API validates
        const lineItems = parseLineItems(opts.lineItems) as any[];
        res = await createScheduledBill(client, {
          status: 'ACTIVE',
          startDate: opts.startDate,
          endDate: opts.endDate,
          repeat: opts.repeat,
          bill: {
            reference: opts.reference,
            valueDate: opts.valueDate,
            dueDate: opts.dueDate,
            contactResourceId: opts.contact,
            lineItems,
            tag: opts.tag,
            saveAsDraft: false,
          },
        });
      }

      if (opts.json) {
        console.log(JSON.stringify(res.data, null, 2));
      } else {
        console.log(chalk.green('Scheduled bill created'));
      }
    }));

  // ── clio schedulers create-journal ────────────────────────────
  cmd
    .command('create-journal')
    .description('Create a scheduled (recurring) journal')
    .option('--start-date <YYYY-MM-DD>', 'First occurrence date')
    .option('--end-date <YYYY-MM-DD>', 'Last occurrence date (optional)')
    .option('--repeat <interval>', 'Recurrence: WEEKLY, MONTHLY, QUARTERLY, YEARLY')
    .option('--reference <ref>', 'Journal reference')
    .option('--value-date <YYYY-MM-DD>', 'Template date')
    .option('--entries <json>', 'Scheduler entries as JSON string')
    .option('--notes <text>', 'Journal notes')
    .option('--input <file>', 'Read full request body from JSON file (or pipe via stdin)')
    .option('--api-key <key>', 'API key (overrides stored/env)')
    .option('--json', 'Output as JSON')
    .action(apiAction(async (client, opts) => {
      const body = readBodyInput(opts);

      let res;
      if (body) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- user-provided JSON, API validates
        res = await createScheduledJournal(client, body as any);
      } else {
        requireFields(opts as Record<string, unknown>, [
          { flag: '--start-date', key: 'startDate' },
          { flag: '--repeat', key: 'repeat' },
          { flag: '--entries', key: 'entries' },
        ]);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- user-provided JSON, API validates
        const schedulerEntries = parseJournalEntries(opts.entries) as any[];
        res = await createScheduledJournal(client, {
          status: 'ACTIVE',
          startDate: opts.startDate,
          endDate: opts.endDate,
          repeat: opts.repeat,
          schedulerEntries,
          reference: opts.reference,
          notes: opts.notes,
        });
      }

      if (opts.json) {
        console.log(JSON.stringify(res.data, null, 2));
      } else {
        console.log(chalk.green('Scheduled journal created'));
      }
    }));
}
