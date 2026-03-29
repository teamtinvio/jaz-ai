import { success, highlight } from './ui/theme.js';
import { Command } from 'commander';
import {
  listScheduledInvoices, listScheduledBills, listScheduledJournals,
  getScheduledInvoice, updateScheduledInvoice, deleteScheduledInvoice,
  getScheduledBill, updateScheduledBill, deleteScheduledBill,
  getScheduledJournal, updateScheduledJournal, deleteScheduledJournal,
} from '../core/api/schedulers.js';
import { createScheduledInvoice } from '../core/api/invoices.js';
import { createScheduledBill } from '../core/api/bills.js';
import { createScheduledJournal } from '../core/api/journals.js';
import { apiAction } from './api-action.js';
import { outputList, type OutputOpts } from './output.js';
import type { TableColumn } from './table-formatter.js';
import { formatId } from './format-helpers.js';
import { parsePositiveInt, parseNonNegativeInt, readBodyInput, requireFields, parseLineItems, parseJournalEntries } from './parsers.js';
import { paginatedFetch } from './pagination.js';

const SCHEDULER_COLUMNS: TableColumn[] = [
  { key: 'resourceId', header: 'ID', format: formatId },
  { key: 'interval', header: 'Repeat' },
  { key: 'startDate', header: 'Start' },
  { key: 'status', header: 'Status' },
];

export function registerSchedulersCommand(program: Command): void {
  const cmd = program
    .command('schedulers')
    .description('Manage scheduled (recurring) transactions')
    .addHelpText('after', `
Dynamic Strings (usable in reference, line item name, notes):
  {{Day}}          Day name (Monday)
  {{Date}}         Full date (09 Mar 2026)
  {{Date+X}}       Date + X days (e.g., {{Date+7}} → 16 Mar 2026)
  {{DateRange:X}}  Date range spanning X days (e.g., {{DateRange:7}} → 09 Mar - 15 Mar 2026)
  {{Month}}        Month name (March)
  {{Month+X}}      Month + X months (e.g., {{Month+1}} → April)
  {{MonthRange:X}} Month range spanning X months
  {{Year}}         Year (2026)
  {{Year+X}}       Year + X years (e.g., {{Year+1}} → 2027)
Strings are replaced with values relative to the transaction date.`);

  // ── clio schedulers list-invoices ──────────────────────────────
  cmd
    .command('list-invoices')
    .description('List scheduled invoices')
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
        (p) => listScheduledInvoices(client, p),
        { label: 'Fetching scheduled invoices' },
      );

      outputList(result as any, SCHEDULER_COLUMNS, opts as OutputOpts, 'Scheduled Invoices');  // eslint-disable-line @typescript-eslint/no-explicit-any
    }));

  // ── clio schedulers list-bills ────────────────────────────────
  cmd
    .command('list-bills')
    .description('List scheduled bills')
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
        (p) => listScheduledBills(client, p),
        { label: 'Fetching scheduled bills' },
      );

      outputList(result as any, SCHEDULER_COLUMNS, opts as OutputOpts, 'Scheduled Bills');  // eslint-disable-line @typescript-eslint/no-explicit-any
    }));

  // ── clio schedulers list-journals ─────────────────────────────
  cmd
    .command('list-journals')
    .description('List scheduled journals')
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
        (p) => listScheduledJournals(client, p),
        { label: 'Fetching scheduled journals' },
      );

      outputList(result as any, SCHEDULER_COLUMNS, opts as OutputOpts, 'Scheduled Journals');  // eslint-disable-line @typescript-eslint/no-explicit-any
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
          { flag: '--reference', key: 'reference' },
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
        console.log(success('Scheduled invoice created'));
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
          { flag: '--reference', key: 'reference' },
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
        console.log(success('Scheduled bill created'));
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
          { flag: '--value-date', key: 'valueDate' },
          { flag: '--entries', key: 'entries' },
        ]);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- user-provided JSON, API validates
        const schedulerEntries = parseJournalEntries(opts.entries) as any[];
        res = await createScheduledJournal(client, {
          status: 'ACTIVE',
          startDate: opts.startDate,
          endDate: opts.endDate,
          repeat: opts.repeat,
          valueDate: opts.valueDate,
          schedulerEntries,
          reference: opts.reference,
          notes: opts.notes,
        });
      }

      if (opts.json) {
        console.log(JSON.stringify(res.data, null, 2));
      } else {
        console.log(success('Scheduled journal created'));
      }
    }));

  // ── clio schedulers get-invoice ─────────────────────────────────
  cmd
    .command('get-invoice <resourceId>')
    .description('Get a scheduled invoice by resourceId')
    .option('--api-key <key>', 'API key (overrides stored/env)')
    .option('--json', 'Output as JSON')
    .action((resourceId: string, opts) => apiAction(async (client) => {
      const res = await getScheduledInvoice(client, resourceId);
      if (opts.json) {
        console.log(JSON.stringify(res.data, null, 2));
      } else {
        const s = res.data;
        console.log(highlight('ID:'), s.resourceId);
        console.log(highlight('Status:'), s.status);
        console.log(highlight('Repeat:'), s.interval ?? s.repeat);
        console.log(highlight('Start:'), s.startDate);
        if (s.endDate) console.log(highlight('End:'), s.endDate);
      }
    })(opts));

  // ── clio schedulers update-invoice ──────────────────────────────
  cmd
    .command('update-invoice <resourceId>')
    .description('Update a scheduled invoice')
    .option('--repeat <interval>', 'Recurrence: WEEKLY, MONTHLY, QUARTERLY, YEARLY')
    .option('--start-date <YYYY-MM-DD>', 'First occurrence date')
    .option('--end-date <YYYY-MM-DD>', 'Last occurrence date')
    .option('--status <status>', 'Status: ACTIVE or PAUSED')
    .option('--input <file>', 'Read full request body from JSON file (or pipe via stdin)')
    .option('--api-key <key>', 'API key (overrides stored/env)')
    .option('--json', 'Output as JSON')
    .action((resourceId: string, opts) => apiAction(async (client) => {
      const body = readBodyInput(opts);
      const data = body ?? {} as Record<string, unknown>;
      if (!body) {
        if (opts.repeat) (data as Record<string, unknown>).repeat = opts.repeat;
        if (opts.startDate) (data as Record<string, unknown>).startDate = opts.startDate;
        if (opts.endDate) (data as Record<string, unknown>).endDate = opts.endDate;
        if (opts.status) (data as Record<string, unknown>).status = opts.status;
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res = await updateScheduledInvoice(client, resourceId, data as any);
      if (opts.json) {
        console.log(JSON.stringify(res.data, null, 2));
      } else {
        console.log(success(`Scheduled invoice ${resourceId} updated.`));
      }
    })(opts));

  // ── clio schedulers delete-invoice ──────────────────────────────
  cmd
    .command('delete-invoice <resourceId>')
    .description('Delete a scheduled invoice')
    .option('--api-key <key>', 'API key (overrides stored/env)')
    .option('--json', 'Output as JSON')
    .action((resourceId: string, opts) => apiAction(async (client) => {
      await deleteScheduledInvoice(client, resourceId);
      if (opts.json) {
        console.log(JSON.stringify({ deleted: true, resourceId }));
      } else {
        console.log(success(`Scheduled invoice ${resourceId} deleted.`));
      }
    })(opts));

  // ── clio schedulers get-bill ────────────────────────────────────
  cmd
    .command('get-bill <resourceId>')
    .description('Get a scheduled bill by resourceId')
    .option('--api-key <key>', 'API key (overrides stored/env)')
    .option('--json', 'Output as JSON')
    .action((resourceId: string, opts) => apiAction(async (client) => {
      const res = await getScheduledBill(client, resourceId);
      if (opts.json) {
        console.log(JSON.stringify(res.data, null, 2));
      } else {
        const s = res.data;
        console.log(highlight('ID:'), s.resourceId);
        console.log(highlight('Status:'), s.status);
        console.log(highlight('Repeat:'), s.interval ?? s.repeat);
        console.log(highlight('Start:'), s.startDate);
        if (s.endDate) console.log(highlight('End:'), s.endDate);
      }
    })(opts));

  // ── clio schedulers update-bill ─────────────────────────────────
  cmd
    .command('update-bill <resourceId>')
    .description('Update a scheduled bill')
    .option('--repeat <interval>', 'Recurrence: WEEKLY, MONTHLY, QUARTERLY, YEARLY')
    .option('--start-date <YYYY-MM-DD>', 'First occurrence date')
    .option('--end-date <YYYY-MM-DD>', 'Last occurrence date')
    .option('--status <status>', 'Status: ACTIVE or PAUSED')
    .option('--input <file>', 'Read full request body from JSON file (or pipe via stdin)')
    .option('--api-key <key>', 'API key (overrides stored/env)')
    .option('--json', 'Output as JSON')
    .action((resourceId: string, opts) => apiAction(async (client) => {
      const body = readBodyInput(opts);
      const data = body ?? {} as Record<string, unknown>;
      if (!body) {
        if (opts.repeat) (data as Record<string, unknown>).repeat = opts.repeat;
        if (opts.startDate) (data as Record<string, unknown>).startDate = opts.startDate;
        if (opts.endDate) (data as Record<string, unknown>).endDate = opts.endDate;
        if (opts.status) (data as Record<string, unknown>).status = opts.status;
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res = await updateScheduledBill(client, resourceId, data as any);
      if (opts.json) {
        console.log(JSON.stringify(res.data, null, 2));
      } else {
        console.log(success(`Scheduled bill ${resourceId} updated.`));
      }
    })(opts));

  // ── clio schedulers delete-bill ─────────────────────────────────
  cmd
    .command('delete-bill <resourceId>')
    .description('Delete a scheduled bill')
    .option('--api-key <key>', 'API key (overrides stored/env)')
    .option('--json', 'Output as JSON')
    .action((resourceId: string, opts) => apiAction(async (client) => {
      await deleteScheduledBill(client, resourceId);
      if (opts.json) {
        console.log(JSON.stringify({ deleted: true, resourceId }));
      } else {
        console.log(success(`Scheduled bill ${resourceId} deleted.`));
      }
    })(opts));

  // ── clio schedulers get-journal ─────────────────────────────────
  cmd
    .command('get-journal <resourceId>')
    .description('Get a scheduled journal by resourceId')
    .option('--api-key <key>', 'API key (overrides stored/env)')
    .option('--json', 'Output as JSON')
    .action((resourceId: string, opts) => apiAction(async (client) => {
      const res = await getScheduledJournal(client, resourceId);
      if (opts.json) {
        console.log(JSON.stringify(res.data, null, 2));
      } else {
        const s = res.data;
        console.log(highlight('ID:'), s.resourceId);
        console.log(highlight('Status:'), s.status);
        console.log(highlight('Repeat:'), s.interval ?? s.repeat);
        console.log(highlight('Start:'), s.startDate);
        if (s.endDate) console.log(highlight('End:'), s.endDate);
      }
    })(opts));

  // ── clio schedulers update-journal ──────────────────────────────
  cmd
    .command('update-journal <resourceId>')
    .description('Update a scheduled journal')
    .option('--repeat <interval>', 'Recurrence: WEEKLY, MONTHLY, QUARTERLY, YEARLY')
    .option('--start-date <YYYY-MM-DD>', 'First occurrence date')
    .option('--end-date <YYYY-MM-DD>', 'Last occurrence date')
    .option('--status <status>', 'Status: ACTIVE or PAUSED')
    .option('--input <file>', 'Read full request body from JSON file (or pipe via stdin)')
    .option('--api-key <key>', 'API key (overrides stored/env)')
    .option('--json', 'Output as JSON')
    .action((resourceId: string, opts) => apiAction(async (client) => {
      const body = readBodyInput(opts);
      const data = body ?? {} as Record<string, unknown>;
      if (!body) {
        if (opts.repeat) (data as Record<string, unknown>).repeat = opts.repeat;
        if (opts.startDate) (data as Record<string, unknown>).startDate = opts.startDate;
        if (opts.endDate) (data as Record<string, unknown>).endDate = opts.endDate;
        if (opts.status) (data as Record<string, unknown>).status = opts.status;
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res = await updateScheduledJournal(client, resourceId, data as any);
      if (opts.json) {
        console.log(JSON.stringify(res.data, null, 2));
      } else {
        console.log(success(`Scheduled journal ${resourceId} updated.`));
      }
    })(opts));

  // ── clio schedulers delete-journal ──────────────────────────────
  cmd
    .command('delete-journal <resourceId>')
    .description('Delete a scheduled journal')
    .option('--api-key <key>', 'API key (overrides stored/env)')
    .option('--json', 'Output as JSON')
    .action((resourceId: string, opts) => apiAction(async (client) => {
      await deleteScheduledJournal(client, resourceId);
      if (opts.json) {
        console.log(JSON.stringify({ deleted: true, resourceId }));
      } else {
        console.log(success(`Scheduled journal ${resourceId} deleted.`));
      }
    })(opts));
}
