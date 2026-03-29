import { highlight, success, warning } from './ui/theme.js';
import { Command } from 'commander';
import {
  listTags,
  getTag,
  searchTags,
  createTag,
  updateTag,
  deleteTag,
} from '../core/api/tags.js';
import { findExistingTag } from '../core/api/guards.js';
import { apiAction } from './api-action.js';
import { outputList, type OutputOpts } from './output.js';
import type { TableColumn } from './table-formatter.js';
import { parsePositiveInt, parseNonNegativeInt, readBodyInput, requireFields } from './parsers.js';
import { paginatedFetch } from './pagination.js';
import { formatId } from './format-helpers.js';

const TAGS_COLUMNS: TableColumn[] = [
  { key: 'resourceId', header: 'ID', format: formatId },
  { key: 'name', header: 'Name' },
];

export function registerTagsCommand(program: Command): void {
  const tags = program
    .command('tags')
    .description('Manage tags');

  // ── clio tags list ────────────────────────────────────────────
  tags
    .command('list')
    .description('List tags')
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
        (p) => listTags(client, p),
        { label: 'Fetching tags' },
      );

      outputList(result as any, TAGS_COLUMNS, opts as OutputOpts, 'Tags');  // eslint-disable-line @typescript-eslint/no-explicit-any
    }));

  // ── clio tags get ────────────────────────────────────────────
  tags
    .command('get <resourceId>')
    .description('Get a tag by resourceId')
    .option('--api-key <key>', 'API key (overrides stored/env)')
    .option('--format <type>', 'Output format: table, json, csv, yaml')
    .option('--json', 'Output as JSON')
    .action((resourceId: string, opts) => apiAction(async (client) => {
      const res = await getTag(client, resourceId);
      const tag = res.data;

      if (opts.json) {
        console.log(JSON.stringify(tag, null, 2));
      } else {
        console.log(highlight('Name:'), tag.name);
        console.log(highlight('ID:'), tag.resourceId);
      }
    })(opts));

  // ── clio tags search ──────────────────────────────────────────
  tags
    .command('search <query>')
    .description('Search tags by name')
    .option('--sort <field>', 'Sort field (default: tagName)')
    .option('--order <direction>', 'Sort order: ASC or DESC (default: ASC)')
    .option('--limit <n>', 'Max results (default 20)', parsePositiveInt)
    .option('--offset <n>', 'Page number offset (0-indexed)', parseNonNegativeInt)
    .option('--all', 'Fetch all pages')
    .option('--max-rows <n>', 'Max rows for --all (default 10000)', parsePositiveInt)
    .option('--api-key <key>', 'API key (overrides stored/env)')
    .option('--format <type>', 'Output format: table, json, csv, yaml')
    .option('--json', 'Output as JSON')
    .action((query: string, opts) => apiAction(async (client) => {
      const filter = { tagName: { contains: query } };
      const sort = { sortBy: [opts.sort ?? 'tagName'] as string[], order: (opts.order ?? 'ASC') as 'ASC' | 'DESC' };

      const result = await paginatedFetch(
        opts,
        ({ limit, offset }) => searchTags(client, { filter, limit, offset, sort }),
        { label: 'Searching tags', defaultLimit: 20 },
      );

      outputList(result as any, TAGS_COLUMNS, opts as OutputOpts, 'Tags');  // eslint-disable-line @typescript-eslint/no-explicit-any
    })(opts));

  // ── clio tags create ──────────────────────────────────────────
  tags
    .command('create')
    .description('Create a new tag')
    .option('--name <name>', 'Tag name')
    .option('--input <file>', 'Read full request body from JSON file (or pipe via stdin)')
    .option('--api-key <key>', 'API key (overrides stored/env)')
    .option('--format <type>', 'Output format: table, json, csv, yaml')
    .option('--json', 'Output as JSON')
    .action(apiAction(async (client, opts) => {
      const body = readBodyInput(opts);

      const tagName: string = body?.name ?? opts.name;
      if (!body) {
        requireFields(opts as Record<string, unknown>, [
          { flag: '--name', key: 'name' },
        ]);
      }

      const existing = await findExistingTag(client, tagName);
      if (existing) {
        if (opts.json) {
          console.log(JSON.stringify(existing, null, 2));
        } else {
          console.log(warning(`Tag "${tagName}" already exists — reusing.`));
          console.log(highlight('ID:'), existing.resourceId);
        }
        return;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- user-provided JSON, API validates
      const res = body ? await createTag(client, body as any) : await createTag(client, { name: tagName });

      if (opts.json) {
        console.log(JSON.stringify(res.data, null, 2));
      } else {
        console.log(success(`Tag created: ${tagName}`));
        console.log(highlight('ID:'), res.data.resourceId);
      }
    }));

  // ── clio tags update ─────────────────────────────────────────
  tags
    .command('update <resourceId>')
    .description('Rename a tag')
    .option('--name <name>', 'New tag name')
    .option('--api-key <key>', 'API key (overrides stored/env)')
    .option('--format <type>', 'Output format: table, json, csv, yaml')
    .option('--json', 'Output as JSON')
    .action((resourceId: string, opts) => apiAction(async (client) => {
      requireFields(opts as Record<string, unknown>, [{ flag: '--name', key: 'name' }]);
      const res = await updateTag(client, resourceId, { name: opts.name });

      if (opts.json) {
        console.log(JSON.stringify(res.data, null, 2));
      } else {
        console.log(success(`Tag renamed to "${opts.name}".`));
        console.log(highlight('ID:'), res.data.resourceId);
      }
    })(opts));

  // ── clio tags delete ──────────────────────────────────────────
  tags
    .command('delete <resourceId>')
    .description('Delete a tag')
    .option('--api-key <key>', 'API key (overrides stored/env)')
    .option('--format <type>', 'Output format: table, json, csv, yaml')
    .option('--json', 'Output as JSON')
    .action((resourceId: string, opts) => apiAction(async (client) => {
      await deleteTag(client, resourceId);

      if (opts.json) {
        console.log(JSON.stringify({ deleted: true, resourceId }));
      } else {
        console.log(success(`Tag ${resourceId} deleted.`));
      }
    })(opts));
}
