import chalk from 'chalk';
import { Command } from 'commander';
import type { JazClient } from '../core/api/client.js';
import type { CashflowTransaction, PaginatedResponse, PaginationParams } from '../core/api/types.js';
import { searchCashflowTransactions, deleteCashflowJournal } from '../core/api/cashflow.js';
import { apiAction } from './api-action.js';
import { resolveAccountFlag } from './resolve.js';
import { parsePositiveInt, parseNonNegativeInt, parseJournalEntries, readBodyInput, requireFields } from './parsers.js';
import { paginatedFetch, paginatedJson, displaySlice } from './pagination.js';

// ── Shared helpers (also used by cash-transfer.ts) ──────────────

export function formatCashflowDate(epochMs: number): string {
  if (!Number.isFinite(epochMs) || epochMs === 0) return '—';
  return new Date(epochMs).toISOString().slice(0, 10);
}

export function formatCashflowRow(t: CashflowTransaction): string {
  const status = t.transactionStatus === 'ACTIVE' ? chalk.green(t.transactionStatus) : chalk.red(t.transactionStatus);
  const amount = chalk.dim(`${t.currencySymbol}${t.totalAmount.toFixed(2)}`);
  const date = formatCashflowDate(t.valueDate);
  const acctName = t.account?.name || '—';
  return `  ${chalk.cyan(t.resourceId)}  ${t.transactionReference || '(no ref)'}  ${status}  ${amount}  ${date}  ${acctName}`;
}

export function printCashflowDetail(t: CashflowTransaction): void {
  const status = t.transactionStatus === 'ACTIVE' ? chalk.green(t.transactionStatus)
    : t.transactionStatus === 'VOID' ? chalk.red(t.transactionStatus)
    : chalk.yellow(t.transactionStatus);
  console.log(chalk.bold('Reference:'), t.transactionReference || '(none)');
  console.log(chalk.bold('  ID:'), chalk.cyan(t.resourceId));
  console.log(chalk.bold('  Status:'), status);
  console.log(chalk.bold('  Date:'), formatCashflowDate(t.valueDate));
  console.log(chalk.bold('  Type:'), t.businessTransactionType);
  console.log(chalk.bold('  Direction:'), t.direction);
  console.log(chalk.bold('  Amount:'), `${t.currencySymbol}${t.totalAmount.toFixed(2)} ${t.currencyCode}`);
  console.log(chalk.bold('  Account:'), t.account?.name || '—', chalk.dim(`(${t.organizationAccountResourceId})`));
  if (t.contactResourceId) console.log(chalk.bold('  Contact:'), t.contactResourceId);
}

// ── Factory: generates a full CRUD command group ────────────────

export interface CashEntryConfig {
  name: string;       // 'cash-in' | 'cash-out'
  label: string;      // 'Cash-In' | 'Cash-Out'
  txnType: string;    // 'JOURNAL_DIRECT_CASH_IN' | 'JOURNAL_DIRECT_CASH_OUT'
  listFn: (client: JazClient, params?: PaginationParams) => Promise<PaginatedResponse<CashflowTransaction>>;
  getFn: (client: JazClient, resourceId: string) => Promise<{ data: CashflowTransaction }>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- generic over cash-in/out typed bodies; API validates
  createFn: (client: JazClient, data: any) => Promise<{ data: unknown }>;
  updateFn: (client: JazClient, resourceId: string, data: Record<string, unknown>) => Promise<{ data: unknown }>;
}

export function registerCashEntryCommand(program: Command, config: CashEntryConfig): void {
  const cmd = program
    .command(config.name)
    .description(`Manage ${config.label.toLowerCase()} entries`);

  // ── list ──────────────────────────────────────────────────────
  cmd
    .command('list')
    .description(`List ${config.label.toLowerCase()} entries`)
    .option('--limit <n>', 'Max results (default 100)', parsePositiveInt)
    .option('--offset <n>', 'Offset for pagination', parseNonNegativeInt)
    .option('--all', 'Fetch all pages')
    .option('--max-rows <n>', 'Max rows for --all (default 10000)', parsePositiveInt)
    .option('--api-key <key>', 'API key (overrides stored/env)')
    .option('--json', 'Output as JSON')
    .action(apiAction(async (client, opts) => {
      const result = await paginatedFetch(
        opts,
        (p) => config.listFn(client, p),
        { label: `Fetching ${config.label.toLowerCase()} entries` },
      );

      if (opts.json) {
        console.log(paginatedJson(result, opts));
      } else {
        console.log(chalk.bold(`${config.label} (${result.data.length} of ${result.totalElements}):\n`));
        const { items, overflow } = displaySlice(result.data);
        for (const t of items) {
          console.log(formatCashflowRow(t));
        }
        if (overflow > 0) console.log(chalk.dim(`  ... and ${overflow.toLocaleString()} more (use --json for full output)`));
      }
    }));

  // ── get ───────────────────────────────────────────────────────
  cmd
    .command('get <resourceId>')
    .description(`Get a ${config.label.toLowerCase()} entry by ID`)
    .option('--api-key <key>', 'API key (overrides stored/env)')
    .option('--json', 'Output as JSON')
    .action((resourceId: string, opts) => apiAction(async (client) => {
      const { data: t } = await config.getFn(client, resourceId);

      if (opts.json) {
        console.log(JSON.stringify(t, null, 2));
      } else {
        printCashflowDetail(t);
      }
    })(opts));

  // ── create ────────────────────────────────────────────────────
  cmd
    .command('create')
    .description(`Create a ${config.label.toLowerCase()} entry (saves as draft by default)`)
    .option('--account <resourceId>', 'Bank account name or resourceId')
    .option('--entries <json>', 'Journal entries as JSON array (offset entries)', parseJournalEntries)
    .option('--date <YYYY-MM-DD>', 'Value date')
    .option('--ref <reference>', 'Reference')
    .option('--notes <text>', 'Notes')
    .option('--currency <code>', 'Source currency code (for cross-currency)')
    .option('--exchange-rate <rate>', 'Exchange rate (for cross-currency)', parseFloat)
    .option('--finalize', 'Finalize instead of saving as draft')
    .option('--input <file>', 'Read full request body from JSON file (or pipe via stdin)')
    .option('--api-key <key>', 'API key (overrides stored/env)')
    .option('--json', 'Output as JSON')
    .action(apiAction(async (client, opts) => {
      const body = readBodyInput(opts);

      let res;
      if (body) {
        res = await config.createFn(client, {
          ...body,
          saveAsDraft: body.saveAsDraft ?? !opts.finalize,
        });
      } else {
        requireFields(opts as Record<string, unknown>, [
          { flag: '--account', key: 'account' },
          { flag: '--entries', key: 'entries' },
          { flag: '--date', key: 'date' },
        ]);

        // Resolve bank account by name
        const acctResolved = await resolveAccountFlag(client, opts.account, { filter: 'bank', silent: opts.json });
        opts.account = acctResolved.resourceId;

        const data: Record<string, unknown> = {
          accountResourceId: opts.account,
          journalEntries: opts.entries,
          valueDate: opts.date,
          saveAsDraft: !opts.finalize,
        };
        if (opts.ref) data.reference = opts.ref;
        if (opts.notes) data.notes = opts.notes;
        if (opts.currency) {
          data.currency = {
            sourceCurrency: opts.currency,
            exchangeRate: opts.exchangeRate,
          };
        }
        res = await config.createFn(client, data);
      }

      const created = res.data as Record<string, unknown>;
      if (opts.json) {
        console.log(JSON.stringify(created, null, 2));
      } else {
        const status = opts.finalize ? 'finalized' : 'draft';
        console.log(chalk.green(`${config.label} created (${status}): ${created.resourceId}`));
        console.log(chalk.bold('ID:'), created.resourceId);
      }
    }));

  // ── update ────────────────────────────────────────────────────
  cmd
    .command('update <resourceId>')
    .description(`Update a ${config.label.toLowerCase()} entry`)
    .option('--entries <json>', 'Journal entries as JSON array', parseJournalEntries)
    .option('--date <YYYY-MM-DD>', 'Value date')
    .option('--ref <reference>', 'Reference')
    .option('--notes <text>', 'Notes')
    .option('--finalize', 'Finalize instead of saving as draft')
    .option('--input <file>', 'Read full request body from JSON file (or pipe via stdin)')
    .option('--api-key <key>', 'API key (overrides stored/env)')
    .option('--json', 'Output as JSON')
    .action((resourceId: string, opts) => apiAction(async (client) => {
      const body = readBodyInput(opts);

      let res;
      if (body) {
        res = await config.updateFn(client, resourceId, {
          ...body,
          saveAsDraft: body.saveAsDraft ?? !opts.finalize,
        });
      } else {
        const data: Record<string, unknown> = {};
        if (opts.entries) data.journalEntries = opts.entries;
        if (opts.date) data.valueDate = opts.date;
        if (opts.ref) data.reference = opts.ref;
        if (opts.notes) data.notes = opts.notes;
        data.saveAsDraft = !opts.finalize;
        res = await config.updateFn(client, resourceId, data);
      }

      const updated = res.data as Record<string, unknown>;
      if (opts.json) {
        console.log(JSON.stringify(updated, null, 2));
      } else {
        const status = opts.finalize ? 'finalized' : 'draft';
        console.log(chalk.green(`${config.label} updated (${status}): ${updated.resourceId || resourceId}`));
      }
    })(opts));

  // ── search ────────────────────────────────────────────────────
  cmd
    .command('search')
    .description(`Search ${config.label.toLowerCase()} entries`)
    .option('--ref <reference>', 'Filter by reference (contains)')
    .option('--account <resourceId>', 'Filter by bank account name or resourceId')
    .option('--from <YYYY-MM-DD>', 'Filter from date (inclusive)')
    .option('--to <YYYY-MM-DD>', 'Filter to date (inclusive)')
    .option('--status <status>', 'Filter by status (ACTIVE, VOID)')
    .option('--sort <field>', 'Sort field (default: valueDate)')
    .option('--order <direction>', 'Sort order: ASC or DESC (default: DESC)')
    .option('--limit <n>', 'Max results (default 20)', parsePositiveInt)
    .option('--offset <n>', 'Offset for pagination', parseNonNegativeInt)
    .option('--all', 'Fetch all pages')
    .option('--max-rows <n>', 'Max rows for --all (default 10000)', parsePositiveInt)
    .option('--api-key <key>', 'API key (overrides stored/env)')
    .option('--json', 'Output as JSON')
    .action(apiAction(async (client, opts) => {
      // Resolve account by name if provided
      if (opts.account) {
        const resolved = await resolveAccountFlag(client, opts.account, { filter: 'bank', silent: opts.json });
        opts.account = resolved.resourceId;
      }

      const filter: Record<string, unknown> = {
        businessTransactionType: { eq: config.txnType },
      };
      if (opts.ref) filter.businessTransactionReference = { contains: opts.ref };
      if (opts.account) filter.organizationAccountResourceId = { eq: opts.account };
      if (opts.status) filter.businessTransactionStatus = { eq: opts.status };
      if (opts.from || opts.to) {
        const dateFilter: Record<string, string> = {};
        if (opts.from) dateFilter.gte = opts.from;
        if (opts.to) dateFilter.lte = opts.to;
        filter.valueDate = dateFilter;
      }

      const sort = { sortBy: [opts.sort ?? 'valueDate'] as string[], order: (opts.order ?? 'DESC') as 'ASC' | 'DESC' };

      const result = await paginatedFetch(
        opts,
        ({ limit, offset }) => searchCashflowTransactions(client, { filter, limit, offset, sort }),
        { label: `Searching ${config.label.toLowerCase()}`, defaultLimit: 20 },
      );

      if (opts.json) {
        console.log(paginatedJson(result, opts));
      } else {
        if (result.data.length === 0) {
          console.log(chalk.yellow(`No ${config.label.toLowerCase()} entries found.`));
          return;
        }
        console.log(chalk.bold(`Found ${result.data.length} ${config.label.toLowerCase()} entry/entries:\n`));
        const { items, overflow } = displaySlice(result.data);
        for (const t of items) {
          console.log(formatCashflowRow(t));
        }
        if (overflow > 0) console.log(chalk.dim(`  ... and ${overflow.toLocaleString()} more (use --json for full output)`));
      }
    }));

  // ── delete ────────────────────────────────────────────────────
  cmd
    .command('delete <resourceId>')
    .description(`Delete/void a ${config.label.toLowerCase()} entry`)
    .option('--api-key <key>', 'API key (overrides stored/env)')
    .option('--json', 'Output as JSON')
    .action((resourceId: string, opts) => apiAction(async (client) => {
      await deleteCashflowJournal(client, resourceId);

      if (opts.json) {
        console.log(JSON.stringify({ deleted: true, resourceId }));
      } else {
        console.log(chalk.green(`${config.label} ${resourceId} deleted.`));
      }
    })(opts));
}
