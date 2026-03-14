import chalk from 'chalk';
import { Command } from 'commander';
import {
  listItems,
  getItem,
  searchItems,
  createItem,
  updateItem,
  deleteItem,
} from '../core/api/items.js';
import { findExistingItem } from '../core/api/guards.js';
import { apiAction } from './api-action.js';
import { outputList, type OutputOpts } from './output.js';
import type { TableColumn } from './table-formatter.js';
import { parsePositiveInt, parseNonNegativeInt, parseMoney, readBodyInput, requireFields, parseCustomFields } from './parsers.js';
import { paginatedFetch } from './pagination.js';
import { formatId } from './format-helpers.js';

const ITEMS_COLUMNS: TableColumn[] = [
  { key: 'resourceId', header: 'ID', format: formatId },
  { key: 'name', header: 'Name' },
  { key: 'saleItemName', header: 'Sale Name' },
  { key: 'purchaseItemName', header: 'Purchase Name' },
];

export function registerItemsCommand(program: Command): void {
  const items = program
    .command('items')
    .description('Manage items (products & services)');

  // ── clio items list ───────────────────────────────────────────
  items
    .command('list')
    .description('List items')
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
        (p) => listItems(client, p),
        { label: 'Fetching items' },
      );

      outputList(result as any, ITEMS_COLUMNS, opts as OutputOpts, 'Items');  // eslint-disable-line @typescript-eslint/no-explicit-any
    }));

  // ── clio items search ─────────────────────────────────────────
  items
    .command('search')
    .description('Search items with filters')
    .option('--sale', 'Filter items that apply to sales')
    .option('--purchase', 'Filter items that apply to purchases')
    .option('--status <status>', 'Filter by status (ACTIVE, INACTIVE)')
    .option('--category <category>', 'Filter by item category')
    .option('--sort <field>', 'Sort field (default: internalName)')
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
      if (opts.sale) filter.appliesToSale = { eq: true };
      if (opts.purchase) filter.appliesToPurchase = { eq: true };
      if (opts.status) filter.status = { eq: opts.status };
      if (opts.category) filter.itemCategory = { eq: opts.category };

      const searchFilter = Object.keys(filter).length > 0 ? filter : undefined;
      const sort = { sortBy: [opts.sort ?? 'internalName'] as string[], order: (opts.order ?? 'ASC') as 'ASC' | 'DESC' };

      const result = await paginatedFetch(
        opts,
        ({ limit, offset }) => searchItems(client, { filter: searchFilter, limit, offset, sort }),
        { label: 'Searching items', defaultLimit: 20 },
      );

      outputList(result as any, ITEMS_COLUMNS, opts as OutputOpts, 'Items');  // eslint-disable-line @typescript-eslint/no-explicit-any
    }));

  // ── clio items get ────────────────────────────────────────────
  items
    .command('get <resourceId>')
    .description('Get an item by resourceId')
    .option('--api-key <key>', 'API key (overrides stored/env)')
    .option('--format <type>', 'Output format: table, json, csv, yaml')
    .option('--json', 'Output as JSON')
    .action((resourceId: string, opts) => apiAction(async (client) => {
      const res = await getItem(client, resourceId);
      const item = res.data;

      if (opts.json) {
        console.log(JSON.stringify(item, null, 2));
      } else {
        console.log(chalk.bold('Name:'), item.internalName);
        console.log(chalk.bold('Code:'), item.itemCode);
        console.log(chalk.bold('ID:'), item.resourceId);
        const types = [
          item.appliesToSale && 'Sale',
          item.appliesToPurchase && 'Purchase',
        ].filter(Boolean).join(', ');
        if (types) console.log(chalk.bold('Applies to:'), types);
      }
    })(opts));

  // ── clio items create ─────────────────────────────────────────
  items
    .command('create')
    .description('Create a new item')
    .option('--name <name>', 'Item name (internalName)')
    .option('--code <code>', 'Item code')
    .option('--sale', 'Applies to sales')
    .option('--purchase', 'Applies to purchases')
    .option('--sale-name <name>', 'Sale display name (defaults to --name)')
    .option('--purchase-name <name>', 'Purchase display name (defaults to --name)')
    .option('--sale-price <n>', 'Default sale price', parseMoney)
    .option('--purchase-price <n>', 'Default purchase price', parseMoney)
    .option('--sale-account <resourceId>', 'Sale account resourceId')
    .option('--purchase-account <resourceId>', 'Purchase account resourceId')
    .option('--sale-tax <resourceId>', 'Sale tax profile resourceId')
    .option('--purchase-tax <resourceId>', 'Purchase tax profile resourceId')
    .option('--custom-fields <json>', 'Custom field values as JSON array: [{"customFieldName":"PO Number","actualValue":"PO-123"}]')
    .option('--input <file>', 'Read full request body from JSON file (or pipe via stdin)')
    .option('--api-key <key>', 'API key (overrides stored/env)')
    .option('--format <type>', 'Output format: table, json, csv, yaml')
    .option('--json', 'Output as JSON')
    .action(apiAction(async (client, opts) => {
      const body = readBodyInput(opts);

      // Guard: check for existing item before creating
      const itemCode = (body as Record<string, unknown>)?.itemCode as string ?? opts.code;
      if (itemCode) {
        const existing = await findExistingItem(client, itemCode);
        if (existing) {
          if (opts.json) {
            console.log(JSON.stringify(existing, null, 2));
          } else {
            console.log(chalk.cyan(`Item with code "${itemCode}" already exists`));
            console.log(chalk.bold('ID:'), existing.resourceId);
          }
          return;
        }
      }

      let res;
      if (body) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- user-provided JSON, API validates
        res = await createItem(client, body as any);
      } else {
        requireFields(opts as Record<string, unknown>, [
          { flag: '--name', key: 'name' },
          { flag: '--code', key: 'code' },
        ]);
        const customFields = opts.customFields ? parseCustomFields(opts.customFields) : undefined;
        res = await createItem(client, {
          internalName: opts.name,
          itemCode: opts.code,
          appliesToSale: opts.sale ?? undefined,
          appliesToPurchase: opts.purchase ?? undefined,
          saleItemName: opts.sale ? (opts.saleName ?? opts.name) : undefined,
          purchaseItemName: opts.purchase ? (opts.purchaseName ?? opts.name) : undefined,
          salePrice: opts.salePrice,
          purchasePrice: opts.purchasePrice,
          saleAccountResourceId: opts.saleAccount,
          purchaseAccountResourceId: opts.purchaseAccount,
          saleTaxProfileResourceId: opts.saleTax,
          purchaseTaxProfileResourceId: opts.purchaseTax,
          customFields,
        });
      }

      if (opts.json) {
        console.log(JSON.stringify(res.data, null, 2));
      } else {
        console.log(chalk.green(`Item created: ${opts.name}`));
        console.log(chalk.bold('ID:'), res.data.resourceId);
      }
    }));

  // ── clio items update ─────────────────────────────────────────
  items
    .command('update <resourceId>')
    .description('Update an item')
    .option('--name <name>', 'New name')
    .option('--code <code>', 'New item code')
    .option('--sale-price <n>', 'New sale price', parseMoney)
    .option('--purchase-price <n>', 'New purchase price', parseMoney)
    .option('--status <status>', 'Status (ACTIVE/INACTIVE)')
    .option('--custom-fields <json>', 'Custom field values as JSON array')
    .option('--input <file>', 'Read full update body from JSON file (or pipe via stdin)')
    .option('--api-key <key>', 'API key (overrides stored/env)')
    .option('--format <type>', 'Output format: table, json, csv, yaml')
    .option('--json', 'Output as JSON')
    .action((resourceId: string, opts) => apiAction(async (client) => {
      const body = readBodyInput(opts);
      let data: Record<string, unknown>;

      if (body) {
        data = body;
      } else {
        data = {};
        if (opts.name !== undefined) data.internalName = opts.name;
        if (opts.code !== undefined) data.itemCode = opts.code;
        if (opts.salePrice !== undefined) data.salePrice = opts.salePrice;
        if (opts.purchasePrice !== undefined) data.purchasePrice = opts.purchasePrice;
        if (opts.status !== undefined) data.status = opts.status;
        if (opts.customFields) data.customFields = parseCustomFields(opts.customFields);
      }

      const res = await updateItem(client, resourceId, data);

      if (opts.json) {
        console.log(JSON.stringify(res.data, null, 2));
      } else {
        console.log(chalk.green(`Item updated: ${res.data.internalName}`));
      }
    })(opts));

  // ── clio items delete ─────────────────────────────────────────
  items
    .command('delete <resourceId>')
    .description('Delete an item')
    .option('--api-key <key>', 'API key (overrides stored/env)')
    .option('--format <type>', 'Output format: table, json, csv, yaml')
    .option('--json', 'Output as JSON')
    .action((resourceId: string, opts) => apiAction(async (client) => {
      await deleteItem(client, resourceId);

      if (opts.json) {
        console.log(JSON.stringify({ deleted: true, resourceId }));
      } else {
        console.log(chalk.green(`Item ${resourceId} deleted.`));
      }
    })(opts));
}
