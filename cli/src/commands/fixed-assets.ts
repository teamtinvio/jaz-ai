import chalk from 'chalk';
import { Command } from 'commander';
import {
  listFixedAssets, getFixedAsset, searchFixedAssets,
  createFixedAsset, updateFixedAsset, deleteFixedAsset,
  discardFixedAsset, markFixedAssetSold, transferFixedAsset, undoFixedAssetDisposal,
} from '../core/api/fixed-assets.js';
import { apiAction } from './api-action.js';
import { parsePositiveInt, parseNonNegativeInt, parseMoney, readBodyInput, parseCustomFields } from './parsers.js';
import { paginatedFetch } from './pagination.js';
import { outputList, type OutputOpts } from './output.js';
import type { TableColumn } from './table-formatter.js';
import { formatId, formatCurrency } from './format-helpers.js';

const FA_COLUMNS: TableColumn[] = [
  { key: 'resourceId', header: 'ID', format: formatId },
  { key: 'name', header: 'Name' },
  { key: 'status', header: 'Status' },
  { key: 'purchasePrice', header: 'Cost', align: 'right', format: formatCurrency },
];

export function registerFixedAssetsCommand(program: Command): void {
  const cmd = program
    .command('fixed-assets')
    .alias('fa')
    .description('Manage fixed assets');

  cmd
    .command('list')
    .description('List fixed assets')
    .option('--limit <n>', 'Max results', parsePositiveInt)
    .option('--offset <n>', 'Offset', parseNonNegativeInt)
    .option('--all', 'Fetch all pages')
    .option('--format <type>', 'Output format: table, json, csv, yaml')
    .option('--api-key <key>', 'API key')
    .option('--json', 'JSON output')
    .action(apiAction(async (client, opts) => {
      const result = await paginatedFetch(opts, (p) => listFixedAssets(client, p), { label: 'Fetching fixed assets' });
      outputList(result as any, FA_COLUMNS, opts as OutputOpts, 'Fixed Assets');  // eslint-disable-line @typescript-eslint/no-explicit-any
    }));

  cmd
    .command('get <resourceId>')
    .description('Get fixed asset details')
    .option('--format <type>', 'Output format: table, json, csv, yaml')
    .option('--api-key <key>', 'API key')
    .option('--json', 'JSON output')
    .action((resourceId: string, opts) => apiAction(async (client) => {
      const res = await getFixedAsset(client, resourceId);
      if (opts.json) { console.log(JSON.stringify(res.data, null, 2)); return; }
      const a = res.data;
      console.log(chalk.bold('Name:'), a.name);
      console.log(chalk.bold('Ref:'), a.reference);
      console.log(chalk.bold('Status:'), a.status);
      console.log(chalk.bold('Type:'), a.typeName);
      console.log(chalk.bold('Purchase:'), a.purchaseAmount);
      console.log(chalk.bold('NBV:'), a.netBookValueAmount);
      console.log(chalk.bold('ID:'), a.resourceId);
    })(opts));

  cmd
    .command('search')
    .description('Search fixed assets')
    .option('--query <term>', 'Search by name')
    .option('--status <status>', 'Filter by status (ONGOING, COMPLETED, DISPOSED, DRAFT)')
    .option('--tag <name>', 'Filter by tag')
    .option('--category <cat>', 'Filter by category')
    .option('--reference <ref>', 'Filter by reference (contains)')
    .option('--sort <field>', 'Sort field (default: name)')
    .option('--order <direction>', 'Sort order: ASC or DESC (default: ASC)')
    .option('--limit <n>', 'Max results', parsePositiveInt)
    .option('--offset <n>', 'Offset', parseNonNegativeInt)
    .option('--format <type>', 'Output format: table, json, csv, yaml')
    .option('--api-key <key>', 'API key')
    .option('--json', 'JSON output')
    .action(apiAction(async (client, opts) => {
      const filter: Record<string, unknown> = {};
      if (opts.query) filter.name = { contains: opts.query };
      if (opts.status) filter.status = { eq: opts.status };
      if (opts.tag) filter.tags = { name: { eq: opts.tag } };
      if (opts.category) filter.category = { eq: opts.category };
      if (opts.reference) filter.reference = { contains: opts.reference };
      const sort = { sortBy: [opts.sort ?? 'name'] as string[], order: (opts.order ?? 'ASC') as 'ASC' | 'DESC' };
      const result = await paginatedFetch(
        opts,
        ({ limit, offset }) => searchFixedAssets(client, { filter, limit, offset, sort }),
        { label: 'Searching fixed assets', defaultLimit: 20 },
      );
      outputList(result as any, FA_COLUMNS, opts as OutputOpts, 'Fixed Assets');  // eslint-disable-line @typescript-eslint/no-explicit-any
    }));

  cmd
    .command('create')
    .description('Register a new fixed asset')
    .option('--name <name>', 'Asset name (required)')
    .option('--type <typeName>', 'Asset type (e.g., "Buildings", "Vehicles", "Furniture")')
    .option('--category <cat>', 'TANGIBLE or INTANGIBLE')
    .option('--amount <n>', 'Purchase cost (required)', parseMoney)
    .option('--date <YYYY-MM-DD>', 'Purchase date (required)')
    .option('--depreciation-start <YYYY-MM-DD>', 'Depreciation start date (required)')
    .option('--asset-account <id>', 'Asset account resourceId (required)')
    .option('--depreciation-method <method>', 'STRAIGHT_LINE or NO_DEPRECIATION')
    .option('--effective-life <months>', 'Effective life in months', parsePositiveInt)
    .option('--residual <n>', 'Residual/salvage value', parseMoney)
    .option('--depreciation-expense-account <id>', 'Depreciation expense account resourceId')
    .option('--accumulated-depreciation-account <id>', 'Accumulated depreciation account resourceId')
    .option('--purchase-bt-type <type>', 'Linked purchase BT type: PURCHASE (bill) or JOURNAL_MANUAL')
    .option('--purchase-bt-id <id>', 'Linked purchase BT resourceId (required for ACTIVE assets)')
    .option('--notes <text>', 'Internal notes')
    .option('--draft', 'Save as draft (default: true)')
    .option('--finalize', 'Activate immediately (saveAsDraft: false)')
    .option('--tag <name>', 'Tag name')
    .option('--custom-fields <json>', 'Custom field values as JSON array')
    .option('--input <file>', 'Read full request body from JSON file (overrides flags)')
    .option('--format <type>', 'Output format: table, json, csv, yaml')
    .option('--api-key <key>', 'API key')
    .option('--json', 'JSON output')
    .action(apiAction(async (client, opts) => {
      let body = readBodyInput(opts);
      if (!body) {
        // Build body from flags
        if (!opts.name || opts.amount === undefined || !opts.date || !opts.assetAccount || !opts.depreciationStart) {
          console.error(chalk.red('Required: --name, --amount, --date, --depreciation-start, --asset-account'));
          console.error(chalk.dim('Or use --input <file> to provide full JSON body.'));
          process.exit(1);
        }
        body = {
          name: opts.name,
          purchaseAmount: opts.amount,
          purchaseDate: opts.date,
          depreciationStartDate: opts.depreciationStart,
          purchaseAssetAccountResourceId: opts.assetAccount,
        } as Record<string, unknown>;
        if (opts.type) body.typeName = opts.type;
        if (opts.category) body.category = opts.category;
        if (opts.depreciationMethod) body.depreciationMethod = opts.depreciationMethod;
        if (opts.effectiveLife) body.effectiveLife = opts.effectiveLife;
        if (opts.residual !== undefined) body.depreciableValueResidualAmount = opts.residual;
        if (opts.depreciationExpenseAccount) body.depreciationExpenseAccountResourceId = opts.depreciationExpenseAccount;
        if (opts.accumulatedDepreciationAccount) body.accumulatedDepreciationAccountResourceId = opts.accumulatedDepreciationAccount;
        if (opts.purchaseBtType) body.purchaseBusinessTransactionType = opts.purchaseBtType;
        if (opts.purchaseBtId) body.purchaseBusinessTransactionResourceId = opts.purchaseBtId;
        if (opts.notes) body.internalNotes = opts.notes;
        if (opts.tag) body.tags = [opts.tag];
        if (opts.finalize) body.saveAsDraft = false;
      }
      if (opts.customFields) body.customFields = parseCustomFields(opts.customFields);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res = await createFixedAsset(client, body as any);
      if (opts.json) { console.log(JSON.stringify(res.data, null, 2)); return; }
      console.log(chalk.green('Fixed asset created.'));
      console.log(chalk.bold('ID:'), res.data.resourceId);
    }));

  cmd
    .command('delete <resourceId>')
    .description('Delete a draft fixed asset')
    .option('--format <type>', 'Output format: table, json, csv, yaml')
    .option('--api-key <key>', 'API key')
    .option('--json', 'JSON output')
    .action((resourceId: string, opts) => apiAction(async (client) => {
      await deleteFixedAsset(client, resourceId);
      if (opts.json) { console.log(JSON.stringify({ deleted: true, resourceId })); return; }
      console.log(chalk.green(`Fixed asset ${resourceId} deleted.`));
    })(opts));

  cmd
    .command('update <resourceId>')
    .description('Update a fixed asset')
    .option('--name <name>', 'New name')
    .option('--notes <text>', 'Internal notes')
    .option('--depreciation-method <method>', 'STRAIGHT_LINE or NO_DEPRECIATION')
    .option('--effective-life <months>', 'Effective life in months', parsePositiveInt)
    .option('--tag <name>', 'Tag name')
    .option('--custom-fields <json>', 'Custom field values as JSON array')
    .option('--input <file>', 'Read full update body from JSON file (overrides flags)')
    .option('--format <type>', 'Output format: table, json, csv, yaml')
    .option('--api-key <key>', 'API key')
    .option('--json', 'JSON output')
    .action((resourceId: string, opts) => apiAction(async (client) => {
      const body = readBodyInput(opts);
      let data: Record<string, unknown>;
      if (body) {
        data = body;
      } else {
        data = {};
        if (opts.name !== undefined) data.name = opts.name;
        if (opts.notes !== undefined) data.internalNotes = opts.notes;
        if (opts.depreciationMethod) data.depreciationMethod = opts.depreciationMethod;
        if (opts.effectiveLife) data.effectiveLife = opts.effectiveLife;
        if (opts.tag) data.tags = [opts.tag];
      }
      if (opts.customFields) data.customFields = parseCustomFields(opts.customFields);
      const res = await updateFixedAsset(client, resourceId, data);
      if (opts.json) { console.log(JSON.stringify(res.data, null, 2)); return; }
      console.log(chalk.green(`Fixed asset ${resourceId} updated.`));
    })(opts));

  cmd
    .command('sell')
    .description('Mark a fixed asset as sold')
    .option('--id <resourceId>', 'Fixed asset resourceId')
    .option('--depreciation-end-date <date>', 'Final depreciation date (YYYY-MM-DD)')
    .option('--gain-loss-account <id>', 'Gain/loss account resourceId')
    .option('--sale-type <type>', 'Sale BT type (JOURNAL_MANUAL, PURCHASE, SALE)')
    .option('--sale-item <id>', 'Sale item resourceId')
    .option('--input <file>', 'Read full body from JSON file')
    .option('--format <type>', 'Output format: table, json, csv, yaml')
    .option('--api-key <key>', 'API key')
    .option('--json', 'JSON output')
    .action(apiAction(async (client, opts) => {
      const body = readBodyInput(opts);
      if (body) {
        const res = await markFixedAssetSold(client, body as Parameters<typeof markFixedAssetSold>[1]);
        if (opts.json) { console.log(JSON.stringify(res.data, null, 2)); return; }
        console.log(chalk.green('Fixed asset marked as sold.'));
        return;
      }
      if (!opts.id || !opts.depreciationEndDate || !opts.gainLossAccount || !opts.saleType || !opts.saleItem) {
        console.error(chalk.red('Required: --id, --depreciation-end-date, --gain-loss-account, --sale-type, --sale-item'));
        process.exit(1);
      }
      const res = await markFixedAssetSold(client, {
        resourceId: opts.id,
        depreciationEndDate: opts.depreciationEndDate,
        assetDisposalGainLossAccountResourceId: opts.gainLossAccount,
        saleBusinessTransactionType: opts.saleType,
        saleItemResourceId: opts.saleItem,
      });
      if (opts.json) { console.log(JSON.stringify(res.data, null, 2)); return; }
      console.log(chalk.green(`Fixed asset ${opts.id} marked as sold.`));
    }));

  cmd
    .command('transfer')
    .description('Transfer a fixed asset to a different type/account')
    .option('--id <resourceId>', 'Source fixed asset resourceId (required)')
    .option('--name <name>', 'New asset name')
    .option('--type <typeName>', 'New asset type')
    .option('--asset-account <id>', 'New asset account resourceId')
    .option('--input <file>', 'Read full transfer body from JSON file (overrides flags)')
    .option('--format <type>', 'Output format: table, json, csv, yaml')
    .option('--api-key <key>', 'API key')
    .option('--json', 'JSON output')
    .action(apiAction(async (client, opts) => {
      let body = readBodyInput(opts);
      if (!body) {
        if (!opts.id) {
          console.error(chalk.red('Required: --id <resourceId>'));
          console.error(chalk.dim('Or use --input <file> to provide full JSON body.'));
          process.exit(1);
        }
        body = { resourceId: opts.id } as Record<string, unknown>;
        if (opts.name) body.name = opts.name;
        if (opts.type) body.typeName = opts.type;
        if (opts.assetAccount) body.purchaseAssetAccountResourceId = opts.assetAccount;
      }
      const res = await transferFixedAsset(client, body);
      if (opts.json) { console.log(JSON.stringify(res.data, null, 2)); return; }
      console.log(chalk.green('Fixed asset transferred.'));
    }));

  cmd
    .command('discard <resourceId>')
    .description('Discard (write off) a fixed asset')
    .option('--disposal-date <date>', 'Disposal date (YYYY-MM-DD)')
    .option('--depreciation-end-date <date>', 'Final depreciation date (YYYY-MM-DD)')
    .option('--gain-loss-account <id>', 'Gain/loss account resourceId')
    .option('--format <type>', 'Output format: table, json, csv, yaml')
    .option('--api-key <key>', 'API key')
    .option('--json', 'JSON output')
    .action((resourceId: string, opts) => apiAction(async (client) => {
      if (!opts.disposalDate || !opts.depreciationEndDate) {
        console.error(chalk.red('--disposal-date and --depreciation-end-date are required.'));
        process.exit(1);
      }
      const res = await discardFixedAsset(client, resourceId, {
        disposalDate: opts.disposalDate,
        depreciationEndDate: opts.depreciationEndDate,
        assetDisposalGainLossAccountResourceId: opts.gainLossAccount,
      });
      if (opts.json) { console.log(JSON.stringify(res.data, null, 2)); return; }
      console.log(chalk.green(`Fixed asset ${resourceId} discarded.`));
    })(opts));

  cmd
    .command('undo-disposal <resourceId>')
    .description('Undo a fixed asset disposal')
    .option('--format <type>', 'Output format: table, json, csv, yaml')
    .option('--api-key <key>', 'API key')
    .option('--json', 'JSON output')
    .action((resourceId: string, opts) => apiAction(async (client) => {
      const res = await undoFixedAssetDisposal(client, resourceId);
      if (opts.json) { console.log(JSON.stringify(res.data, null, 2)); return; }
      console.log(chalk.green(`Disposal undone for ${resourceId}.`));
    })(opts));
}
