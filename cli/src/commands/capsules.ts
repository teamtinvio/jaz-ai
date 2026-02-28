import chalk from 'chalk';
import { Command } from 'commander';
import {
  listCapsules,
  searchCapsules,
  getCapsule,
  createCapsule,
  updateCapsule,
  deleteCapsule,
  listCapsuleTypes,
  createCapsuleType,
} from '../core/api/capsules.js';
import { apiAction } from './api-action.js';
import { parsePositiveInt, parseNonNegativeInt, readBodyInput, requireFields } from './parsers.js';
import { paginatedFetch, paginatedJson, displaySlice } from './pagination.js';

export function registerCapsulesCommand(program: Command): void {
  const capsules = program
    .command('capsules')
    .description('Manage capsules (transaction grouping)');

  // ── clio capsules list ────────────────────────────────────────
  capsules
    .command('list')
    .description('List capsules')
    .option('--limit <n>', 'Max results (default 100)', parsePositiveInt)
    .option('--offset <n>', 'Offset for pagination', parseNonNegativeInt)
    .option('--all', 'Fetch all pages')
    .option('--max-rows <n>', 'Max rows for --all (default 10000)', parsePositiveInt)
    .option('--api-key <key>', 'API key (overrides stored/env)')
    .option('--json', 'Output as JSON')
    .action(apiAction(async (client, opts) => {
      const result = await paginatedFetch(
        opts,
        (p) => listCapsules(client, p),
        { label: 'Fetching capsules' },
      );

      if (opts.json) {
        console.log(paginatedJson(result, opts));
      } else {
        console.log(chalk.bold(`Capsules (${result.data.length} of ${result.totalElements}):\n`));
        const { items, overflow } = displaySlice(result.data);
        for (const c of items) {
          console.log(`  ${chalk.cyan(c.resourceId)}  ${c.title}${c.description ? chalk.dim(` — ${c.description}`) : ''}`);
        }
        if (overflow > 0) console.log(chalk.dim(`  ... and ${overflow.toLocaleString()} more (use --json for full output)`));
      }
    }));

  // ── clio capsules search ──────────────────────────────────────
  capsules
    .command('search <query>')
    .description('Search capsules by title')
    .option('--sort <field>', 'Sort field (default: title)')
    .option('--order <direction>', 'Sort order: ASC or DESC (default: ASC)')
    .option('--limit <n>', 'Max results (default 20)', parsePositiveInt)
    .option('--offset <n>', 'Offset for pagination', parseNonNegativeInt)
    .option('--all', 'Fetch all pages')
    .option('--max-rows <n>', 'Max rows for --all (default 10000)', parsePositiveInt)
    .option('--api-key <key>', 'API key (overrides stored/env)')
    .option('--json', 'Output as JSON')
    .action((query: string, opts) => apiAction(async (client) => {
      const filter = { title: { contains: query } };
      const sort = { sortBy: [opts.sort ?? 'title'] as string[], order: (opts.order ?? 'ASC') as 'ASC' | 'DESC' };

      const result = await paginatedFetch(
        opts,
        ({ limit, offset }) => searchCapsules(client, { filter, limit, offset, sort }),
        { label: 'Searching capsules', defaultLimit: 20 },
      );

      if (opts.json) {
        console.log(paginatedJson(result, opts));
      } else {
        if (result.data.length === 0) {
          console.log(chalk.yellow('No capsules found.'));
          return;
        }
        console.log(chalk.bold(`Found ${result.data.length} capsule(s):\n`));
        const { items, overflow } = displaySlice(result.data);
        for (const c of items) {
          console.log(`  ${chalk.cyan(c.resourceId)}  ${c.title}`);
        }
        if (overflow > 0) console.log(chalk.dim(`  ... and ${overflow.toLocaleString()} more (use --json for full output)`));
      }
    })(opts));

  // ── clio capsules get ─────────────────────────────────────────
  capsules
    .command('get <resourceId>')
    .description('Get a capsule by resourceId')
    .option('--api-key <key>', 'API key (overrides stored/env)')
    .option('--json', 'Output as JSON')
    .action((resourceId: string, opts) => apiAction(async (client) => {
      const res = await getCapsule(client, resourceId);
      const c = res.data;

      if (opts.json) {
        console.log(JSON.stringify(c, null, 2));
      } else {
        console.log(chalk.bold('Title:'), c.title);
        if (c.description) console.log(chalk.bold('Description:'), c.description);
        console.log(chalk.bold('ID:'), c.resourceId);
        if (c.type) console.log(chalk.bold('Type:'), c.type);
        if (c.capsuleType?.resourceId) console.log(chalk.bold('Type ID:'), c.capsuleType.resourceId);
      }
    })(opts));

  // ── clio capsules create ──────────────────────────────────────
  capsules
    .command('create')
    .description('Create a new capsule')
    .option('--title <title>', 'Capsule title')
    .option('--type <resourceId>', 'Capsule type resourceId')
    .option('--description <text>', 'Description')
    .option('--input <file>', 'Read full request body from JSON file (or pipe via stdin)')
    .option('--api-key <key>', 'API key (overrides stored/env)')
    .option('--json', 'Output as JSON')
    .action(apiAction(async (client, opts) => {
      const body = readBodyInput(opts);

      let res;
      if (body) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- user-provided JSON, API validates
        res = await createCapsule(client, body as any);
      } else {
        requireFields(opts as Record<string, unknown>, [
          { flag: '--title', key: 'title' },
          { flag: '--type', key: 'type' },
        ]);
        res = await createCapsule(client, {
          capsuleTypeResourceId: opts.type,
          title: opts.title,
          description: opts.description,
        });
      }

      if (opts.json) {
        console.log(JSON.stringify(res.data, null, 2));
      } else {
        console.log(chalk.green(`Capsule created: ${opts.title}`));
        console.log(chalk.bold('ID:'), res.data.resourceId);
      }
    }));

  // ── clio capsules update ──────────────────────────────────────
  capsules
    .command('update <resourceId>')
    .description('Update a capsule')
    .option('--title <title>', 'New title')
    .option('--description <text>', 'New description')
    .option('--input <file>', 'Read full update body from JSON file (or pipe via stdin)')
    .option('--api-key <key>', 'API key (overrides stored/env)')
    .option('--json', 'Output as JSON')
    .action((resourceId: string, opts) => apiAction(async (client) => {
      const body = readBodyInput(opts);
      let data: Record<string, unknown>;

      if (body) {
        data = body;
      } else {
        data = {};
        if (opts.title !== undefined) data.title = opts.title;
        if (opts.description !== undefined) data.description = opts.description;
      }

      const res = await updateCapsule(client, resourceId, data);

      if (opts.json) {
        console.log(JSON.stringify(res.data, null, 2));
      } else {
        console.log(chalk.green(`Capsule updated: ${res.data.title}`));
      }
    })(opts));

  // ── clio capsules delete ─────────────────────────────────────
  capsules
    .command('delete <resourceId>')
    .description('Delete a capsule')
    .option('--api-key <key>', 'API key (overrides stored/env)')
    .option('--json', 'Output as JSON')
    .action((resourceId: string, opts) => apiAction(async (client) => {
      await deleteCapsule(client, resourceId);

      if (opts.json) {
        console.log(JSON.stringify({ deleted: true, resourceId }));
      } else {
        console.log(chalk.green(`Capsule ${resourceId} deleted.`));
      }
    })(opts));

  // ── clio capsules types ───────────────────────────────────────
  capsules
    .command('types')
    .description('List capsule types')
    .option('--api-key <key>', 'API key (overrides stored/env)')
    .option('--json', 'Output as JSON')
    .action(apiAction(async (client, opts) => {
      const res = await listCapsuleTypes(client);

      if (opts.json) {
        console.log(JSON.stringify(res.data, null, 2));
      } else {
        console.log(chalk.bold(`Capsule Types (${res.data.length}):\n`));
        for (const t of res.data) {
          console.log(`  ${chalk.cyan(t.resourceId)}  ${t.displayName}${t.description ? chalk.dim(` — ${t.description}`) : ''}`);
        }
      }
    }));

  // ── clio capsules create-type ─────────────────────────────────
  capsules
    .command('create-type')
    .description('Create a new capsule type')
    .option('--name <name>', 'Capsule type display name')
    .option('--description <text>', 'Description')
    .option('--input <file>', 'Read full request body from JSON file (or pipe via stdin)')
    .option('--api-key <key>', 'API key (overrides stored/env)')
    .option('--json', 'Output as JSON')
    .action(apiAction(async (client, opts) => {
      const body = readBodyInput(opts);

      let res;
      if (body) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- user-provided JSON, API validates
        res = await createCapsuleType(client, body as any);
      } else {
        requireFields(opts as Record<string, unknown>, [
          { flag: '--name', key: 'name' },
        ]);
        res = await createCapsuleType(client, {
          displayName: opts.name,
          description: opts.description,
        });
      }

      if (opts.json) {
        console.log(JSON.stringify(res.data, null, 2));
      } else {
        console.log(chalk.green(`Capsule type created: ${opts.name}`));
        console.log(chalk.bold('ID:'), res.data.resourceId);
      }
    }));
}
