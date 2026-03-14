import chalk from 'chalk';
import { Command } from 'commander';
import { listCustomFields, getCustomField, searchCustomFields, createCustomField, updateCustomField, deleteCustomField } from '../core/api/custom-fields.js';
import { apiAction } from './api-action.js';
import { outputList, type OutputOpts } from './output.js';
import type { TableColumn } from './table-formatter.js';
import { parsePositiveInt, parseNonNegativeInt, requireFields } from './parsers.js';
import { paginatedFetch } from './pagination.js';
import { formatId } from './format-helpers.js';

const CUSTOM_FIELDS_COLUMNS: TableColumn[] = [
  { key: 'resourceId', header: 'ID', format: formatId },
  { key: 'customFieldName', header: 'Name' },
];

export function registerCustomFieldsCommand(program: Command): void {
  const cmd = program
    .command('custom-fields')
    .description('Manage custom fields');

  cmd
    .command('list')
    .description('List custom fields')
    .option('--limit <n>', 'Max results', parsePositiveInt)
    .option('--offset <n>', 'Offset', parseNonNegativeInt)
    .option('--all', 'Fetch all pages')
    .option('--api-key <key>', 'API key')
    .option('--format <type>', 'Output format: table, json, csv, yaml')
    .option('--json', 'JSON output')
    .action(apiAction(async (client, opts) => {
      const result = await paginatedFetch(opts, (p) => listCustomFields(client, p), { label: 'Fetching custom fields' });
      outputList(result as any, CUSTOM_FIELDS_COLUMNS, opts as OutputOpts, 'Custom Fields');  // eslint-disable-line @typescript-eslint/no-explicit-any
    }));

  cmd
    .command('get <resourceId>')
    .description('Get a custom field by resourceId')
    .option('--api-key <key>', 'API key')
    .option('--format <type>', 'Output format: table, json, csv, yaml')
    .option('--json', 'JSON output')
    .action((resourceId: string, opts) => apiAction(async (client) => {
      const res = await getCustomField(client, resourceId);
      const f = res.data;
      if (opts.json) { console.log(JSON.stringify(f, null, 2)); return; }
      console.log(chalk.bold('Name:'), f.customFieldName || f.name || '(unnamed)');
      console.log(chalk.bold('ID:'), f.resourceId);
      console.log(chalk.bold('Type:'), f.datatypeCode || f.fieldType || '—');
      if (f.description) console.log(chalk.bold('Description:'), f.description);
      if (f.defaultValue) console.log(chalk.bold('Default:'), f.defaultValue);
      if (f.listOptions?.length) console.log(chalk.bold('Options:'), f.listOptions.join(', '));
      const isTrue = (v: unknown) => v === true || v === 'true';
      const applies: string[] = [];
      if (isTrue(f.applyToSales)) applies.push('invoices');
      if (isTrue(f.applyToPurchase)) applies.push('bills');
      if (isTrue(f.applyToSaleCreditNote)) applies.push('customer CNs');
      if (isTrue(f.applyToPurchaseCreditNote)) applies.push('supplier CNs');
      if (isTrue(f.applyToPayment)) applies.push('payments');
      if (isTrue(f.appliesToFixedAssets)) applies.push('fixed assets');
      if (applies.length) console.log(chalk.bold('Applies to:'), applies.join(', '));
    })(opts));

  cmd
    .command('search')
    .description('Search custom fields with filters')
    .option('--name <name>', 'Filter by field name (contains)')
    .option('--type <type>', 'Filter by datatype code (TEXT, NUMBER, DATE, etc.)')
    .option('--limit <n>', 'Max results (default 20)', parsePositiveInt)
    .option('--offset <n>', 'Offset', parseNonNegativeInt)
    .option('--all', 'Fetch all pages')
    .option('--api-key <key>', 'API key')
    .option('--format <type>', 'Output format: table, json, csv, yaml')
    .option('--json', 'JSON output')
    .action(apiAction(async (client, opts) => {
      const filter: Record<string, unknown> = {};
      if (opts.name) filter.customFieldName = { contains: opts.name };
      if (opts.type) filter.datatypeCode = { eq: opts.type };

      const searchFilter = Object.keys(filter).length > 0 ? filter : undefined;

      const result = await paginatedFetch(
        opts,
        ({ limit, offset }) => searchCustomFields(client, { filter: searchFilter, limit, offset }),
        { label: 'Searching custom fields', defaultLimit: 20 },
      );

      outputList(result as any, CUSTOM_FIELDS_COLUMNS, opts as OutputOpts, 'Custom Fields');  // eslint-disable-line @typescript-eslint/no-explicit-any
    }));

  cmd
    .command('create')
    .description('Create a custom field')
    .option('--name <name>', 'Field name')
    .option('--description <text>', 'Field description')
    .option('--print-on-documents', 'Print this field on PDF documents')
    .option('--invoices', 'Apply to invoices')
    .option('--bills', 'Apply to bills')
    .option('--customer-credits', 'Apply to customer credit notes')
    .option('--supplier-credits', 'Apply to supplier credit notes')
    .option('--payments', 'Apply to payments')
    .option('--field-type <type>', 'Field type (TEXT, NUMBER, DATE, DROPDOWN)', 'TEXT')
    .option('--entity-type <type>', 'Entity type (legacy, prefer --invoices/--bills flags)', 'BUSINESS_TRANSACTION')
    .option('--api-key <key>', 'API key')
    .option('--format <type>', 'Output format: table, json, csv, yaml')
    .option('--json', 'JSON output')
    .action(apiAction(async (client, opts) => {
      requireFields(opts as Record<string, unknown>, [{ flag: '--name', key: 'name' }]);

      const hasAppliesToFlags = opts.invoices || opts.bills || opts.customerCredits || opts.supplierCredits || opts.payments;
      const appliesTo = hasAppliesToFlags
        ? {
            invoices: opts.invoices ?? false,
            bills: opts.bills ?? false,
            customerCredits: opts.customerCredits ?? false,
            supplierCredits: opts.supplierCredits ?? false,
            payments: opts.payments ?? false,
          }
        : undefined;

      const res = await createCustomField(client, {
        name: opts.name,
        description: opts.description,
        printOnDocuments: opts.printOnDocuments ?? false,
        appliesTo,
        fieldType: opts.fieldType,
        entityType: opts.entityType,
      });
      if (opts.json) { console.log(JSON.stringify(res.data, null, 2)); return; }
      console.log(chalk.green(`Custom field "${opts.name}" created.`));
      console.log(chalk.bold('ID:'), res.data.resourceId);
    }));

  cmd
    .command('update <resourceId>')
    .description('Update a custom field')
    .option('--name <name>', 'New field name')
    .option('--description <text>', 'New description')
    .option('--print-on-documents', 'Print on PDF documents')
    .option('--no-print-on-documents', 'Do not print on PDF documents')
    .option('--invoices', 'Apply to invoices')
    .option('--bills', 'Apply to bills')
    .option('--customer-credits', 'Apply to customer credit notes')
    .option('--supplier-credits', 'Apply to supplier credit notes')
    .option('--payments', 'Apply to payments')
    .option('--api-key <key>', 'API key')
    .option('--format <type>', 'Output format: table, json, csv, yaml')
    .option('--json', 'JSON output')
    .action((resourceId: string, opts) => apiAction(async (client) => {
      const data: Record<string, unknown> = {};
      if (opts.name !== undefined) data.name = opts.name;
      if (opts.description !== undefined) data.description = opts.description;
      if (opts.printOnDocuments !== undefined) data.printOnDocuments = opts.printOnDocuments;

      const hasAppliesToFlags = opts.invoices !== undefined || opts.bills !== undefined ||
        opts.customerCredits !== undefined || opts.supplierCredits !== undefined || opts.payments !== undefined;
      if (hasAppliesToFlags) {
        data.appliesTo = {
          invoices: opts.invoices ?? false,
          bills: opts.bills ?? false,
          customerCredits: opts.customerCredits ?? false,
          supplierCredits: opts.supplierCredits ?? false,
          payments: opts.payments ?? false,
        };
      }

      const res = await updateCustomField(client, resourceId, data);
      if (opts.json) { console.log(JSON.stringify(res.data, null, 2)); return; }
      console.log(chalk.green(`Custom field ${resourceId} updated.`));
    })(opts));

  cmd
    .command('delete <resourceId>')
    .description('Delete a custom field')
    .option('--api-key <key>', 'API key')
    .option('--format <type>', 'Output format: table, json, csv, yaml')
    .option('--json', 'JSON output')
    .action((resourceId: string, opts) => apiAction(async (client) => {
      await deleteCustomField(client, resourceId);
      if (opts.json) { console.log(JSON.stringify({ deleted: true, resourceId })); return; }
      console.log(chalk.green(`Custom field ${resourceId} deleted.`));
    })(opts));
}
