import { Command } from 'commander';
import { danger, success, muted, highlight } from './ui/theme.js';
import {
  listSubscriptions, getSubscription,
  createSubscription, updateSubscription, deleteSubscription, cancelSubscription,
  searchScheduledTransactions,
} from '../core/api/subscriptions.js';
import { apiAction } from './api-action.js';
import { parsePositiveInt, parseNonNegativeInt, parseMoney, readBodyInput } from './parsers.js';
import { paginatedFetch } from './pagination.js';
import { outputList, type OutputOpts } from './output.js';
import type { TableColumn } from './table-formatter.js';
import { formatId } from './format-helpers.js';

const SUBSCRIPTION_COLUMNS: TableColumn[] = [
  { key: 'resourceId', header: 'ID', format: formatId },
  { key: 'status', header: 'Status', format: (v) => String(v) === 'ACTIVE' ? success(String(v)) : muted(String(v)) },
  { key: 'interval', header: 'Interval' },
  { key: 'totalAmount', header: 'Amount', align: 'right' },
  { key: 'businessTransactionType', header: 'Type' },
];

const SCHEDULED_TX_COLUMNS: TableColumn[] = [
  { key: 'resourceId', header: 'ID', format: formatId },
  { key: 'scheduledTransactionType', header: 'Type' },
  { key: 'status', header: 'Status', format: (v) => muted(String(v ?? '')) },
];

export function registerSubscriptionsCommand(program: Command): void {
  const cmd = program
    .command('subscriptions')
    .alias('subs')
    .description('Manage recurring subscriptions');

  cmd
    .command('list')
    .description('List subscriptions')
    .option('--limit <n>', 'Max results', parsePositiveInt)
    .option('--offset <n>', 'Offset', parseNonNegativeInt)
    .option('--all', 'Fetch all pages')
    .option('--format <type>', 'Output format: table, json, csv, yaml')
    .option('--api-key <key>', 'API key')
    .option('--json', 'JSON output')
    .action(apiAction(async (client, opts) => {
      const result = await paginatedFetch(opts, (p) => listSubscriptions(client, p), { label: 'Fetching subscriptions' });
      outputList(result as any, SUBSCRIPTION_COLUMNS, opts as OutputOpts, 'Subscriptions');  // eslint-disable-line @typescript-eslint/no-explicit-any
    }));

  cmd
    .command('get <resourceId>')
    .description('Get subscription details')
    .option('--format <type>', 'Output format: table, json, csv, yaml')
    .option('--api-key <key>', 'API key')
    .option('--json', 'JSON output')
    .action((resourceId: string, opts) => apiAction(async (client) => {
      const res = await getSubscription(client, resourceId);
      if (opts.json) { console.log(JSON.stringify(res.data, null, 2)); return; }
      const s = res.data;
      console.log(highlight('Status:'), s.status);
      console.log(highlight('Interval:'), s.interval);
      console.log(highlight('Amount:'), s.totalAmount);
      console.log(highlight('Next:'), s.nextScheduleDate ?? 'N/A');
      console.log(highlight('ID:'), s.resourceId);
    })(opts));

  cmd
    .command('create')
    .description('Create a recurring subscription (invoices only, with proration)')
    .option('--interval <interval>', 'WEEKLY, MONTHLY, QUARTERLY, or YEARLY (required)')
    .option('--start-date <YYYY-MM-DD>', 'Start date (required)')
    .option('--end-date <YYYY-MM-DD>', 'End date (optional, omit for ongoing)')
    .option('--contact <name|resourceId>', 'Customer contact (required)')
    .option('--ref <reference>', 'Invoice reference')
    .option('--date <YYYY-MM-DD>', 'Invoice date')
    .option('--due <YYYY-MM-DD>', 'Due date')
    .option('--account <name|resourceId>', 'Revenue account — applied to ALL line items (required)')
    .option('--tax-profile <name|resourceId>', 'Tax profile — applied to ALL line items')
    .option('--lines <json>', 'Line items as JSON array (name, unitPrice, quantity)')
    .option('--amount <n>', 'Single line item amount (shorthand)', parseMoney)
    .option('--line-name <name>', 'Line item name (used with --amount)')
    .option('--input <file>', 'Read full request body from JSON file (overrides flags)')
    .option('--format <type>', 'Output format: table, json, csv, yaml')
    .option('--api-key <key>', 'API key')
    .option('--json', 'JSON output')
    .action(apiAction(async (client, opts) => {
      let body = readBodyInput(opts);
      if (!body) {
        if (!opts.interval || !opts.startDate) {
          console.error(danger('Required: --interval, --start-date'));
          console.error(muted('Or use --input <file> to provide full JSON body.'));
          process.exit(1);
        }
        // Build line items from --lines or --amount shorthand
        let lineItems: unknown[] | undefined;
        if (opts.lines) {
          try { lineItems = JSON.parse(opts.lines); } catch { console.error(danger('Invalid --lines JSON')); process.exit(1); }
        } else if (opts.amount !== undefined) {
          lineItems = [{ name: opts.lineName ?? 'Subscription', unitPrice: opts.amount, quantity: 1 }];
        }
        // Apply shared account/tax to all line items (subscriptions require same for all)
        if (lineItems && (opts.account || opts.taxProfile)) {
          lineItems = (lineItems as Record<string, unknown>[]).map((li) => ({
            ...li,
            ...(opts.account && !li.accountResourceId ? { accountResourceId: opts.account } : {}),
            ...(opts.taxProfile && !li.taxProfileResourceId ? { taxProfileResourceId: opts.taxProfile } : {}),
          }));
        }
        // Subscriptions use repeat + invoice wrapper + proratedConfig (required)
        body = {
          repeat: opts.interval,
          startDate: opts.startDate,
          status: 'ACTIVE',
          proratedConfig: { proratedAdjustmentLineText: 'Prorated adjustment' },
          invoice: {
            contactResourceId: opts.contact,
            reference: opts.ref,
            valueDate: opts.date,
            dueDate: opts.due,
            lineItems,
            saveAsDraft: false,
          },
        } as Record<string, unknown>;
        if (opts.endDate) body.endDate = opts.endDate;
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res = await createSubscription(client, body as any);
      if (opts.json) { console.log(JSON.stringify(res.data, null, 2)); return; }
      console.log(success('Subscription created.'));
      console.log(highlight('ID:'), res.data.resourceId);
    }));

  cmd
    .command('update <resourceId>')
    .description('Update a subscription')
    .option('--input <file>', 'Read full update body from JSON file')
    .option('--format <type>', 'Output format: table, json, csv, yaml')
    .option('--api-key <key>', 'API key')
    .option('--json', 'JSON output')
    .action((resourceId: string, opts) => apiAction(async (client) => {
      const body = readBodyInput(opts);
      if (!body) { console.error(danger('Use --input <file> to provide update data.')); process.exit(1); }
      const res = await updateSubscription(client, resourceId, body);
      if (opts.json) { console.log(JSON.stringify(res.data, null, 2)); return; }
      console.log(success(`Subscription ${resourceId} updated.`));
    })(opts));

  cmd
    .command('delete <resourceId>')
    .description('Delete a subscription')
    .option('--format <type>', 'Output format: table, json, csv, yaml')
    .option('--api-key <key>', 'API key')
    .option('--json', 'JSON output')
    .action((resourceId: string, opts) => apiAction(async (client) => {
      await deleteSubscription(client, resourceId);
      if (opts.json) { console.log(JSON.stringify({ deleted: true, resourceId })); return; }
      console.log(success(`Subscription ${resourceId} deleted.`));
    })(opts));

  cmd
    .command('cancel <resourceId>')
    .description('Cancel an active subscription (prorates remaining period)')
    .option('--cancel-date-type <type>', 'END_OF_CURRENT_PERIOD, END_OF_LAST_PERIOD, or CUSTOM_DATE', 'END_OF_CURRENT_PERIOD')
    .option('--end-date <YYYY-MM-DD>', 'Custom cancel date (only with CUSTOM_DATE)')
    .option('--prorated-text <text>', 'Prorated adjustment line text', 'Prorated adjustment')
    .option('--format <type>', 'Output format: table, json, csv, yaml')
    .option('--api-key <key>', 'API key')
    .option('--json', 'JSON output')
    .action((resourceId: string, opts) => apiAction(async (client) => {
      await cancelSubscription(client, resourceId, {
        cancelDateType: opts.cancelDateType,
        proratedAdjustmentLineText: opts.proratedText,
        endDate: opts.endDate,
      });
      if (opts.json) { console.log(JSON.stringify({ cancelled: true, resourceId })); return; }
      console.log(success(`Subscription ${resourceId} cancelled.`));
    })(opts));

  // ── clio subscriptions search-scheduled ───────────────────────
  cmd
    .command('search-scheduled')
    .description('Search scheduled transactions across all types')
    .option('--status <status>', 'Filter by status')
    .option('--type <type>', 'Filter by transaction type (SALE, PURCHASE, JOURNAL)')
    .option('--scheduler-type <type>', 'Filter by scheduler type (RECURRING, SUBSCRIPTION)')
    .option('--limit <n>', 'Max results', parsePositiveInt)
    .option('--offset <n>', 'Offset', parseNonNegativeInt)
    .option('--format <type>', 'Output format: table, json, csv, yaml')
    .option('--api-key <key>', 'API key')
    .option('--json', 'JSON output')
    .action(apiAction(async (client, opts) => {
      const filter: Record<string, unknown> = {};
      if (opts.status) filter.status = { eq: opts.status };
      if (opts.type) filter.businessTransactionType = { eq: opts.type };
      if (opts.schedulerType) filter.schedulerType = { eq: opts.schedulerType };
      const searchFilter = Object.keys(filter).length > 0 ? filter : undefined;

      const result = await paginatedFetch(
        opts,
        ({ limit, offset }) => searchScheduledTransactions(client, { filter: searchFilter, limit, offset }),
        { label: 'Searching scheduled transactions', defaultLimit: 20 },
      );
      outputList(result as any, SCHEDULED_TX_COLUMNS, opts as OutputOpts, 'Scheduled Transactions');  // eslint-disable-line @typescript-eslint/no-explicit-any
    }));
}
