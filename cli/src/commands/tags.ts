import chalk from 'chalk';
import { Command } from 'commander';
import {
  listTags,
  getTag,
  searchTags,
  createTag,
  deleteTag,
} from '../core/api/tags.js';
import { apiAction } from './api-action.js';
import { parsePositiveInt, parseNonNegativeInt, readBodyInput, requireFields } from './parsers.js';
import { paginatedFetch, paginatedJson, displaySlice } from './pagination.js';

export function registerTagsCommand(program: Command): void {
  const tags = program
    .command('tags')
    .description('Manage tags');

  // ── clio tags list ────────────────────────────────────────────
  tags
    .command('list')
    .description('List tags')
    .option('--limit <n>', 'Max results (default 100)', parsePositiveInt)
    .option('--offset <n>', 'Offset for pagination', parseNonNegativeInt)
    .option('--all', 'Fetch all pages')
    .option('--max-rows <n>', 'Max rows for --all (default 10000)', parsePositiveInt)
    .option('--api-key <key>', 'API key (overrides stored/env)')
    .option('--json', 'Output as JSON')
    .action(apiAction(async (client, opts) => {
      const result = await paginatedFetch(
        opts,
        (p) => listTags(client, p),
        { label: 'Fetching tags' },
      );

      if (opts.json) {
        console.log(paginatedJson(result, opts));
      } else {
        console.log(chalk.bold(`Tags (${result.data.length} of ${result.totalElements}):\n`));
        const { items, overflow } = displaySlice(result.data);
        for (const tag of items) {
          console.log(`  ${chalk.cyan(tag.resourceId)}  ${tag.name}`);
        }
        if (overflow > 0) console.log(chalk.dim(`  ... and ${overflow.toLocaleString()} more (use --json for full output)`));
      }
    }));

  // ── clio tags get ────────────────────────────────────────────
  tags
    .command('get <resourceId>')
    .description('Get a tag by resourceId')
    .option('--api-key <key>', 'API key (overrides stored/env)')
    .option('--json', 'Output as JSON')
    .action((resourceId: string, opts) => apiAction(async (client) => {
      const res = await getTag(client, resourceId);
      const tag = res.data;

      if (opts.json) {
        console.log(JSON.stringify(tag, null, 2));
      } else {
        console.log(chalk.bold('Name:'), tag.name);
        console.log(chalk.bold('ID:'), tag.resourceId);
      }
    })(opts));

  // ── clio tags search ──────────────────────────────────────────
  tags
    .command('search <query>')
    .description('Search tags by name')
    .option('--sort <field>', 'Sort field (default: tagName)')
    .option('--order <direction>', 'Sort order: ASC or DESC (default: ASC)')
    .option('--limit <n>', 'Max results (default 20)', parsePositiveInt)
    .option('--offset <n>', 'Offset for pagination', parseNonNegativeInt)
    .option('--all', 'Fetch all pages')
    .option('--max-rows <n>', 'Max rows for --all (default 10000)', parsePositiveInt)
    .option('--api-key <key>', 'API key (overrides stored/env)')
    .option('--json', 'Output as JSON')
    .action((query: string, opts) => apiAction(async (client) => {
      const filter = { tagName: { contains: query } };
      const sort = { sortBy: [opts.sort ?? 'tagName'] as string[], order: (opts.order ?? 'ASC') as 'ASC' | 'DESC' };

      const result = await paginatedFetch(
        opts,
        ({ limit, offset }) => searchTags(client, { filter, limit, offset, sort }),
        { label: 'Searching tags', defaultLimit: 20 },
      );

      if (opts.json) {
        console.log(paginatedJson(result, opts));
      } else {
        if (result.data.length === 0) {
          console.log(chalk.yellow('No tags found.'));
          return;
        }
        console.log(chalk.bold(`Found ${result.data.length} tag(s):\n`));
        const { items, overflow } = displaySlice(result.data);
        for (const tag of items) {
          console.log(`  ${chalk.cyan(tag.resourceId)}  ${tag.name}`);
        }
        if (overflow > 0) console.log(chalk.dim(`  ... and ${overflow.toLocaleString()} more (use --json for full output)`));
      }
    })(opts));

  // ── clio tags create ──────────────────────────────────────────
  tags
    .command('create')
    .description('Create a new tag')
    .option('--name <name>', 'Tag name')
    .option('--input <file>', 'Read full request body from JSON file (or pipe via stdin)')
    .option('--api-key <key>', 'API key (overrides stored/env)')
    .option('--json', 'Output as JSON')
    .action(apiAction(async (client, opts) => {
      const body = readBodyInput(opts);

      let res;
      if (body) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- user-provided JSON, API validates
        res = await createTag(client, body as any);
      } else {
        requireFields(opts as Record<string, unknown>, [
          { flag: '--name', key: 'name' },
        ]);
        res = await createTag(client, { name: opts.name });
      }

      if (opts.json) {
        console.log(JSON.stringify(res.data, null, 2));
      } else {
        console.log(chalk.green(`Tag created: ${opts.name}`));
        console.log(chalk.bold('ID:'), res.data.resourceId);
      }
    }));

  // ── clio tags delete ──────────────────────────────────────────
  tags
    .command('delete <resourceId>')
    .description('Delete a tag')
    .option('--api-key <key>', 'API key (overrides stored/env)')
    .option('--json', 'Output as JSON')
    .action((resourceId: string, opts) => apiAction(async (client) => {
      await deleteTag(client, resourceId);

      if (opts.json) {
        console.log(JSON.stringify({ deleted: true, resourceId }));
      } else {
        console.log(chalk.green(`Tag ${resourceId} deleted.`));
      }
    })(opts));
}
