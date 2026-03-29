import { Command } from 'commander';
import { danger, success, muted, highlight } from './ui/theme.js';
import {
  listBankRules, getBankRule, searchBankRules,
  createBankRule, updateBankRule, deleteBankRule,
} from '../core/api/bank-rules.js';
import { apiAction } from './api-action.js';
import { outputList, type OutputOpts } from './output.js';
import type { TableColumn } from './table-formatter.js';
import { parsePositiveInt, parseNonNegativeInt, readBodyInput } from './parsers.js';
import { paginatedFetch } from './pagination.js';
import { formatId } from './format-helpers.js';

const BANK_RULES_COLUMNS: TableColumn[] = [
  { key: 'resourceId', header: 'ID', format: formatId },
  { key: 'name', header: 'Name' },
];

export function registerBankRulesCommand(program: Command): void {
  const cmd = program
    .command('bank-rules')
    .description('Manage bank reconciliation rules')
    .addHelpText('after', `
Dynamic Strings (usable in name, reference — any free text field):
  {{bankReference}}   Bank record reference (e.g., INV-03/01/2025-01)
  {{bankPayee}}       Payer/payee name (e.g., Fruit Planet)
  {{bankDescription}} Transaction description (e.g., QR Payment)
Strings are replaced with actual bank record values during reconciliation.`);

  cmd
    .command('list')
    .description('List bank rules')
    .option('--limit <n>', 'Max results', parsePositiveInt)
    .option('--offset <n>', 'Offset', parseNonNegativeInt)
    .option('--all', 'Fetch all pages')
    .option('--api-key <key>', 'API key')
    .option('--format <type>', 'Output format: table, json, csv, yaml')
    .option('--json', 'JSON output')
    .action(apiAction(async (client, opts) => {
      const result = await paginatedFetch(opts, (p) => listBankRules(client, p), { label: 'Fetching bank rules' });
      outputList(result as any, BANK_RULES_COLUMNS, opts as OutputOpts, 'Bank Rules');  // eslint-disable-line @typescript-eslint/no-explicit-any
    }));

  cmd
    .command('get <resourceId>')
    .description('Get a bank rule')
    .option('--api-key <key>', 'API key')
    .option('--format <type>', 'Output format: table, json, csv, yaml')
    .option('--json', 'JSON output')
    .action((resourceId: string, opts) => apiAction(async (client) => {
      const res = await getBankRule(client, resourceId);
      if (opts.json) { console.log(JSON.stringify(res.data, null, 2)); return; }
      console.log(highlight('Name:'), res.data.name);
      console.log(highlight('Action:'), res.data.actionType);
      console.log(highlight('ID:'), res.data.resourceId);
    })(opts));

  cmd
    .command('search <query>')
    .description('Search bank rules')
    .option('--account <resourceId>', 'Filter by bank account resourceId')
    .option('--sort <field>', 'Sort field (default: name)')
    .option('--order <direction>', 'Sort order: ASC or DESC (default: ASC)')
    .option('--limit <n>', 'Max results', parsePositiveInt)
    .option('--offset <n>', 'Offset', parseNonNegativeInt)
    .option('--api-key <key>', 'API key')
    .option('--format <type>', 'Output format: table, json, csv, yaml')
    .option('--json', 'JSON output')
    .action((query: string, opts) => apiAction(async (client) => {
      const filter: Record<string, unknown> = { name: { contains: query } };
      if (opts.account) filter.appliesToReconciliationAccount = { eq: opts.account };
      const sort = { sortBy: [opts.sort ?? 'name'] as string[], order: (opts.order ?? 'ASC') as 'ASC' | 'DESC' };
      const result = await paginatedFetch(
        opts,
        ({ limit, offset }) => searchBankRules(client, { filter, limit, offset, sort }),
        { label: 'Searching bank rules', defaultLimit: 20 },
      );
      outputList(result as any, BANK_RULES_COLUMNS, opts as OutputOpts, 'Bank Rules');  // eslint-disable-line @typescript-eslint/no-explicit-any
    })(opts));

  cmd
    .command('create')
    .description('Create a bank reconciliation rule')
    .option('--name <name>', 'Rule name (required)')
    .option('--account <resourceId>', 'Bank account resourceId this rule applies to (required)')
    .option('--config <json>', 'Rule configuration as JSON (nested under reconcileWithDirectCashEntry key)')
    .option('--input <file>', 'Read full request body from JSON file (overrides flags)')
    .option('--api-key <key>', 'API key')
    .option('--format <type>', 'Output format: table, json, csv, yaml')
    .option('--json', 'JSON output')
    .action(apiAction(async (client, opts) => {
      let body = readBodyInput(opts);
      if (!body) {
        if (!opts.name || !opts.account) {
          console.error(danger('Required: --name, --account'));
          console.error(muted('Or use --input <file> to provide full JSON body.'));
          process.exit(1);
        }
        body = {
          name: opts.name,
          appliesToReconciliationAccount: opts.account,
        } as Record<string, unknown>;
        if (opts.config) {
          try { body.configuration = JSON.parse(opts.config); } catch { console.error(danger('Invalid --config JSON')); process.exit(1); }
        }
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res = await createBankRule(client, body as any);
      if (opts.json) { console.log(JSON.stringify(res.data, null, 2)); return; }
      console.log(success('Bank rule created.'));
      console.log(highlight('ID:'), res.data.resourceId);
    }));

  cmd
    .command('update <resourceId>')
    .description('Update a bank rule (FULL REPLACEMENT — reads current state, merges changes, writes back)')
    .option('--name <name>', 'New name')
    .option('--account <resourceId>', 'Bank account resourceId (required — PUT is full replacement)')
    .option('--config <json>', 'Updated configuration as JSON (full replacement)')
    .option('--input <file>', 'Read full update body from JSON file (overrides flags)')
    .option('--api-key <key>', 'API key')
    .option('--format <type>', 'Output format: table, json, csv, yaml')
    .option('--json', 'JSON output')
    .action((resourceId: string, opts) => apiAction(async (client) => {
      const body = readBodyInput(opts);
      let data: Record<string, unknown>;
      if (body) {
        // --input provides full body — ensure resourceId is present
        data = { resourceId, ...body };
      } else {
        // PUT is full replacement — --account is required because GET returns
        // appliesToReconciliationAccount as an object (not UUID), so we can't
        // round-trip it. Require the UUID explicitly.
        if (!opts.account) {
          console.error(danger('--account is required for update (PUT is full replacement — GET does not return the UUID)'));
          console.error(muted('Use: clio bank-rules update <id> --account <bank-account-uuid> [--name ...] [--config ...]'));
          process.exitCode = 1;
          return;
        }
        const current = await getBankRule(client, resourceId);
        const rule = current.data;
        data = {
          resourceId,
          name: opts.name ?? rule.name,
          appliesToReconciliationAccount: opts.account,
          configuration: rule.configuration,
        };
        if (opts.config) {
          try { data.configuration = JSON.parse(opts.config); } catch { console.error(danger('Invalid --config JSON')); process.exit(1); }
        }
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res = await updateBankRule(client, resourceId, data as any);
      if (opts.json) { console.log(JSON.stringify(res.data, null, 2)); return; }
      console.log(success(`Bank rule ${resourceId} updated.`));
    })(opts));

  cmd
    .command('delete <resourceId>')
    .description('Delete a bank rule')
    .option('--api-key <key>', 'API key')
    .option('--format <type>', 'Output format: table, json, csv, yaml')
    .option('--json', 'JSON output')
    .action((resourceId: string, opts) => apiAction(async (client) => {
      await deleteBankRule(client, resourceId);
      if (opts.json) { console.log(JSON.stringify({ deleted: true, resourceId })); return; }
      console.log(success(`Bank rule ${resourceId} deleted.`));
    })(opts));
}
