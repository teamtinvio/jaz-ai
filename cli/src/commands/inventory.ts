import { Command } from 'commander';
import { listInventoryItems, createInventoryItem, getInventoryBalance } from '../core/api/inventory.js';
import { apiAction } from './api-action.js';
import { parsePositiveInt, parseNonNegativeInt, readBodyInput, requireFields } from './parsers.js';
import { paginatedFetch } from './pagination.js';
import { outputList, type OutputOpts } from './output.js';
import type { TableColumn } from './table-formatter.js';
import { formatId } from './format-helpers.js';
import { highlight, muted, success } from './ui/theme.js';

const INVENTORY_ITEM_COLUMNS: TableColumn[] = [
  { key: 'resourceId', header: 'ID', format: formatId },
  { key: 'internalName', header: 'Name', format: (v) => String(v ?? '') },
  { key: 'itemCode', header: 'Code', format: (v) => muted(String(v ?? '')) },
];

export function registerInventoryCommand(program: Command): void {
  const cmd = program
    .command('inventory')
    .alias('inv')
    .description('Inventory management');

  cmd
    .command('items')
    .description('List inventory-tracked items')
    .option('--limit <n>', 'Max results', parsePositiveInt)
    .option('--offset <n>', 'Offset', parseNonNegativeInt)
    .option('--all', 'Fetch all pages')
    .option('--format <type>', 'Output format: table, json, csv, yaml')
    .option('--api-key <key>', 'API key')
    .option('--json', 'JSON output')
    .action(apiAction(async (client, opts) => {
      const result = await paginatedFetch(opts, (p) => listInventoryItems(client, p), { label: 'Fetching inventory items' });
      outputList(result as any, INVENTORY_ITEM_COLUMNS, opts as OutputOpts, 'Inventory Items');  // eslint-disable-line @typescript-eslint/no-explicit-any
    }));

  cmd
    .command('balance <itemResourceId>')
    .description('Get inventory balance for an item')
    .option('--format <type>', 'Output format: table, json, csv, yaml')
    .option('--api-key <key>', 'API key')
    .option('--json', 'JSON output')
    .action((itemResourceId: string, opts) => apiAction(async (client) => {
      const res = await getInventoryBalance(client, itemResourceId);
      if (opts.json) { console.log(JSON.stringify(res.data, null, 2)); return; }
      const b = res.data;
      console.log(highlight('Item:'), b.itemResourceId);
      console.log(highlight('Qty:'), `${b.baseQty} ${b.baseUnit}`);
      console.log(highlight('Avg Cost:'), b.latestAverageCostAmount);
    })(opts));

  cmd
    .command('create')
    .description('Create an inventory-tracked item (use --input for full JSON body)')
    .option('--item-code <code>', 'Item code (SKU)')
    .option('--name <name>', 'Item name')
    .option('--unit <unit>', 'Unit of measure')
    .option('--costing-method <method>', 'FIXED or WAC')
    .option('--input <file>', 'Read full request body from JSON file (or pipe via stdin)')
    .option('--api-key <key>', 'API key')
    .option('--format <type>', 'Output format: table, json, csv, yaml')
    .option('--json', 'JSON output')
    .action(apiAction(async (client, opts) => {
      const body = readBodyInput(opts);
      if (!body) {
        requireFields(opts as Record<string, unknown>, [
          { flag: '--item-code', key: 'itemCode' },
          { flag: '--name', key: 'name' },
        ]);
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- user-provided JSON, API validates
      const data = body ?? {
        itemCode: opts.itemCode,
        name: opts.name,
        unit: opts.unit,
        costingMethod: opts.costingMethod,
      };
      const res = await createInventoryItem(client, data as Record<string, unknown>);

      if (opts.json) { console.log(JSON.stringify(res.data, null, 2)); return; }
      console.log(success(`Inventory item created.`));
      console.log(highlight('ID:'), res.data.resourceId);
    }));
}
