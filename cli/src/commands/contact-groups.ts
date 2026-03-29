import { accent, highlight, success } from './ui/theme.js';
import { Command } from 'commander';
import {
  listContactGroups, getContactGroup, searchContactGroups, createContactGroup,
  updateContactGroup, deleteContactGroup,
} from '../core/api/contact-groups.js';
import { apiAction } from './api-action.js';
import { outputList, type OutputOpts } from './output.js';
import type { TableColumn } from './table-formatter.js';
import { parsePositiveInt, parseNonNegativeInt, requireFields } from './parsers.js';
import { paginatedFetch } from './pagination.js';
import { formatId } from './format-helpers.js';

const CONTACT_GROUPS_COLUMNS: TableColumn[] = [
  { key: 'resourceId', header: 'ID', format: formatId },
  { key: 'name', header: 'Name' },
];

export function registerContactGroupsCommand(program: Command): void {
  const cmd = program
    .command('contact-groups')
    .description('Manage contact groups');

  cmd
    .command('list')
    .description('List contact groups')
    .option('--limit <n>', 'Max results', parsePositiveInt)
    .option('--offset <n>', 'Offset', parseNonNegativeInt)
    .option('--all', 'Fetch all pages')
    .option('--api-key <key>', 'API key')
    .option('--format <type>', 'Output format: table, json, csv, yaml')
    .option('--json', 'JSON output')
    .action(apiAction(async (client, opts) => {
      const result = await paginatedFetch(opts, (p) => listContactGroups(client, p), { label: 'Fetching contact groups' });
      outputList(result as any, CONTACT_GROUPS_COLUMNS, opts as OutputOpts, 'Contact Groups');  // eslint-disable-line @typescript-eslint/no-explicit-any
    }));

  cmd
    .command('get <resourceId>')
    .description('Get contact group details')
    .option('--api-key <key>', 'API key')
    .option('--format <type>', 'Output format: table, json, csv, yaml')
    .option('--json', 'JSON output')
    .action((resourceId: string, opts) => apiAction(async (client) => {
      const res = await getContactGroup(client, resourceId);
      if (opts.json) { console.log(JSON.stringify(res.data, null, 2)); return; }
      const g = res.data;
      console.log(highlight('Name:'), g.name);
      console.log(highlight('Contacts:'), g.associatedContacts?.length ?? 0);
      for (const c of (g.associatedContacts ?? [])) console.log(`  ${accent(c.resourceId)}  ${c.name}`);
      console.log(highlight('ID:'), g.resourceId);
    })(opts));

  cmd
    .command('search <query>')
    .description('Search contact groups by name')
    .option('--limit <n>', 'Max results', parsePositiveInt)
    .option('--offset <n>', 'Offset', parseNonNegativeInt)
    .option('--api-key <key>', 'API key')
    .option('--format <type>', 'Output format: table, json, csv, yaml')
    .option('--json', 'JSON output')
    .action((query: string, opts) => apiAction(async (client) => {
      const result = await paginatedFetch(
        opts,
        ({ limit, offset }) => searchContactGroups(client, { filter: { name: { contains: query } }, limit, offset }),
        { label: 'Searching contact groups', defaultLimit: 20 },
      );
      outputList(result as any, CONTACT_GROUPS_COLUMNS, opts as OutputOpts, 'Contact Groups');  // eslint-disable-line @typescript-eslint/no-explicit-any
    })(opts));

  cmd
    .command('create')
    .description('Create a contact group')
    .option('--name <name>', 'Group name')
    .option('--api-key <key>', 'API key')
    .option('--format <type>', 'Output format: table, json, csv, yaml')
    .option('--json', 'JSON output')
    .action(apiAction(async (client, opts) => {
      requireFields(opts as Record<string, unknown>, [{ flag: '--name', key: 'name' }]);
      const res = await createContactGroup(client, { name: opts.name });
      if (opts.json) { console.log(JSON.stringify(res.data, null, 2)); return; }
      console.log(success(`Contact group "${opts.name}" created.`));
      console.log(highlight('ID:'), res.data.resourceId);
    }));

  cmd
    .command('update <resourceId>')
    .description('Update a contact group')
    .option('--name <name>', 'New group name')
    .option('--api-key <key>', 'API key')
    .option('--format <type>', 'Output format: table, json, csv, yaml')
    .option('--json', 'JSON output')
    .action((resourceId: string, opts) => apiAction(async (client) => {
      const data: Record<string, unknown> = {};
      if (opts.name) data.name = opts.name;
      const res = await updateContactGroup(client, resourceId, data);
      if (opts.json) { console.log(JSON.stringify(res.data, null, 2)); return; }
      console.log(success(`Contact group updated.`));
      console.log(highlight('ID:'), res.data.resourceId);
    })(opts));

  cmd
    .command('delete <resourceId>')
    .description('Delete a contact group')
    .option('--api-key <key>', 'API key')
    .option('--json', 'JSON output')
    .action((resourceId: string, opts) => apiAction(async (client) => {
      await deleteContactGroup(client, resourceId);
      if (opts.json) { console.log(JSON.stringify({ deleted: true, resourceId })); return; }
      console.log(success(`Contact group ${resourceId} deleted.`));
    })(opts));
}
