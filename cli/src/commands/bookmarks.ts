import chalk from 'chalk';
import { Command } from 'commander';
import {
  listBookmarks, getBookmark, createBookmarks, updateBookmark,
} from '../core/api/bookmarks.js';
import { apiAction } from './api-action.js';
import { parsePositiveInt, parseNonNegativeInt, readBodyInput, requireFields } from './parsers.js';
import { paginatedFetch, paginatedJson, displaySlice } from './pagination.js';

export function registerBookmarksCommand(program: Command): void {
  const bm = program
    .command('bookmarks')
    .description('Manage organization bookmarks');

  // ── clio bookmarks list ───────────────────────────────────────
  bm
    .command('list')
    .description('List bookmarks')
    .option('--limit <n>', 'Max results (default 100)', parsePositiveInt)
    .option('--offset <n>', 'Offset for pagination', parseNonNegativeInt)
    .option('--all', 'Fetch all pages')
    .option('--max-rows <n>', 'Max rows for --all (default 10000)', parsePositiveInt)
    .option('--api-key <key>', 'API key (overrides stored/env)')
    .option('--json', 'Output as JSON')
    .action(apiAction(async (client, opts) => {
      const result = await paginatedFetch(
        opts,
        (p) => listBookmarks(client, p),
        { label: 'Fetching bookmarks' },
      );

      if (opts.json) {
        console.log(paginatedJson(result, opts));
      } else {
        console.log(chalk.bold(`Bookmarks (${result.data.length} of ${result.totalElements}):\n`));
        const { items, overflow } = displaySlice(result.data);
        for (const b of items) {
          console.log(`  ${chalk.cyan(b.resourceId)}  ${b.name}  ${chalk.dim(b.categoryCode)}  ${b.value}`);
        }
        if (overflow > 0) console.log(chalk.dim(`  ... and ${overflow.toLocaleString()} more (use --json for full output)`));
      }
    }));

  // ── clio bookmarks get ────────────────────────────────────────
  bm
    .command('get <resourceId>')
    .description('Get a bookmark by resourceId')
    .option('--api-key <key>', 'API key (overrides stored/env)')
    .option('--json', 'Output as JSON')
    .action((resourceId: string, opts) => apiAction(async (client) => {
      const res = await getBookmark(client, resourceId);
      const b = res.data;

      if (opts.json) {
        console.log(JSON.stringify(b, null, 2));
      } else {
        console.log(chalk.bold('Name:'), b.name);
        console.log(chalk.bold('ID:'), b.resourceId);
        console.log(chalk.bold('Category:'), b.categoryCode);
        console.log(chalk.bold('Value:'), b.value);
      }
    })(opts));

  // ── clio bookmarks create ─────────────────────────────────────
  bm
    .command('create')
    .description('Create bookmark(s)')
    .option('--name <name>', 'Bookmark name')
    .option('--value <value>', 'Bookmark value')
    .option('--category <code>', 'Category code (GENERAL_INFORMATION, TAXATION_AND_COMPLIANCE, etc.)')
    .option('--datatype <code>', 'Datatype code (default: TEXT)')
    .option('--input <file>', 'Read full request body from JSON file (or pipe via stdin)')
    .option('--api-key <key>', 'API key (overrides stored/env)')
    .option('--json', 'Output as JSON')
    .action(apiAction(async (client, opts) => {
      const body = readBodyInput(opts);

      let res;
      if (body) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- user-provided JSON, API validates
        res = await createBookmarks(client, (body as any).items ?? [body]);
      } else {
        requireFields(opts as Record<string, unknown>, [
          { flag: '--name', key: 'name' },
          { flag: '--value', key: 'value' },
          { flag: '--category', key: 'category' },
        ]);
        res = await createBookmarks(client, [{
          name: opts.name,
          value: opts.value,
          categoryCode: opts.category,
          datatypeCode: opts.datatype ?? 'TEXT',
        }]);
      }

      if (opts.json) {
        console.log(JSON.stringify(res.data, null, 2));
      } else {
        console.log(chalk.green(`Bookmark(s) created: ${res.data.length} item(s)`));
        for (const b of res.data) {
          console.log(`  ${chalk.cyan(b.resourceId)}  ${b.name}`);
        }
      }
    }));

  // ── clio bookmarks update ─────────────────────────────────────
  bm
    .command('update <resourceId>')
    .description('Update a bookmark')
    .option('--name <name>', 'New name')
    .option('--value <value>', 'New value')
    .option('--category <code>', 'New category code')
    .option('--input <file>', 'Read full request body from JSON file (or pipe via stdin)')
    .option('--api-key <key>', 'API key (overrides stored/env)')
    .option('--json', 'Output as JSON')
    .action((resourceId: string, opts) => apiAction(async (client) => {
      const body = readBodyInput(opts);

      const data = body
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- user-provided JSON, API validates
        ? (body as any)
        : {
            ...(opts.name && { name: opts.name }),
            ...(opts.value && { value: opts.value }),
            ...(opts.category && { categoryCode: opts.category }),
          };

      const res = await updateBookmark(client, resourceId, data);

      if (opts.json) {
        console.log(JSON.stringify(res.data, null, 2));
      } else {
        console.log(chalk.green(`Bookmark updated: ${res.data.name}`));
      }
    })(opts));
}
