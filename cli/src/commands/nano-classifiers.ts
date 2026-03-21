import { Command } from 'commander';
import {
  listNanoClassifiers,
  getNanoClassifier,
  searchNanoClassifiers,
  createNanoClassifier,
  updateNanoClassifier,
  deleteNanoClassifier,
} from '../core/api/nano-classifiers.js';
import { apiAction } from './api-action.js';
import { outputList, type OutputOpts } from './output.js';
import type { TableColumn } from './table-formatter.js';
import { parsePositiveInt, parseNonNegativeInt, readBodyInput, requireFields } from './parsers.js';
import { paginatedFetch } from './pagination.js';
import { formatId } from './format-helpers.js';
import { highlight, success } from './ui/theme.js';

const NC_COLUMNS: TableColumn[] = [
  { key: 'resourceId', header: 'ID', format: formatId },
  { key: 'type', header: 'Type' },
  { key: 'classes', header: 'Classes', format: (v) => Array.isArray(v) ? v.map((c: { className: string }) => c.className).join(', ') : '' },
];

export function registerNanoClassifiersCommand(program: Command): void {
  const cmd = program
    .command('nano-classifiers')
    .description('Manage nano classifiers (tracking categories)');

  // ── clio nano-classifiers list ──────────────────────────────────
  cmd
    .command('list')
    .description('List nano classifiers')
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
        (p) => listNanoClassifiers(client, p),
        { label: 'Fetching nano classifiers' },
      );

      outputList(result as any, NC_COLUMNS, opts as OutputOpts, 'Nano Classifiers');  // eslint-disable-line @typescript-eslint/no-explicit-any
    }));

  // ── clio nano-classifiers get ───────────────────────────────────
  cmd
    .command('get <resourceId>')
    .description('Get a nano classifier by resourceId')
    .option('--api-key <key>', 'API key (overrides stored/env)')
    .option('--format <type>', 'Output format: table, json, csv, yaml')
    .option('--json', 'Output as JSON')
    .action((resourceId: string, opts) => apiAction(async (client) => {
      const res = await getNanoClassifier(client, resourceId);
      const nc = res.data;

      if (opts.json) {
        console.log(JSON.stringify(nc, null, 2));
      } else {
        console.log(highlight('Type:'), nc.type);
        console.log(highlight('ID:'), nc.resourceId);
        console.log(highlight('Classes:'));
        for (const cls of nc.classes) {
          console.log(`  ${cls.className} (${cls.resourceId})`);
        }
      }
    })(opts));

  // ── clio nano-classifiers search ────────────────────────────────
  cmd
    .command('search <query>')
    .description('Search nano classifiers by type')
    .option('--limit <n>', 'Max results (default 20)', parsePositiveInt)
    .option('--offset <n>', 'Page number offset (0-indexed)', parseNonNegativeInt)
    .option('--all', 'Fetch all pages')
    .option('--max-rows <n>', 'Max rows for --all (default 10000)', parsePositiveInt)
    .option('--api-key <key>', 'API key (overrides stored/env)')
    .option('--format <type>', 'Output format: table, json, csv, yaml')
    .option('--json', 'Output as JSON')
    .action((query: string, opts) => apiAction(async (client) => {
      const filter = { type: { contains: query } };
      const sort = { sortBy: ['type'] as string[], order: 'ASC' as const };

      const result = await paginatedFetch(
        opts,
        ({ limit, offset }) => searchNanoClassifiers(client, { filter, limit, offset, sort }),
        { label: 'Searching nano classifiers', defaultLimit: 20 },
      );

      outputList(result as any, NC_COLUMNS, opts as OutputOpts, 'Nano Classifiers');  // eslint-disable-line @typescript-eslint/no-explicit-any
    })(opts));

  // ── clio nano-classifiers create ────────────────────────────────
  cmd
    .command('create')
    .description('Create a nano classifier')
    .option('--type <type>', 'Classifier type name')
    .option('--classes <json>', 'Class names as JSON array: ["Sales","Marketing"] or comma-separated: Sales,Marketing')
    .option('--printable', 'Show on printed documents (default: false)')
    .option('--input <file>', 'Read full request body from JSON file (or pipe via stdin)')
    .option('--api-key <key>', 'API key (overrides stored/env)')
    .option('--format <type>', 'Output format: table, json, csv, yaml')
    .option('--json', 'Output as JSON')
    .action(apiAction(async (client, opts) => {
      const body = readBodyInput(opts);

      let res;
      if (body) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- user-provided JSON, API validates
        res = await createNanoClassifier(client, body as any);
      } else {
        requireFields(opts as Record<string, unknown>, [
          { flag: '--type', key: 'type' },
          { flag: '--classes', key: 'classes' },
        ]);
        let classes: string[];
        try {
          classes = JSON.parse(opts.classes);
        } catch {
          classes = (opts.classes as string).split(',').map((s: string) => s.trim());
        }
        res = await createNanoClassifier(client, {
          type: opts.type,
          classes,
          printable: opts.printable === true,
        });
      }

      if (opts.json) {
        console.log(JSON.stringify(res.data, null, 2));
      } else {
        console.log(success(`Nano classifier created: ${res.data.type ?? opts.type}`));
        console.log(highlight('ID:'), res.data.resourceId);
      }
    }));

  // ── clio nano-classifiers update ────────────────────────────────
  cmd
    .command('update <resourceId>')
    .description('Update a nano classifier')
    .option('--type <type>', 'New classifier type name')
    .option('--classes <json>', 'Updated class names as JSON array or comma-separated')
    .option('--printable', 'Show on printed documents')
    .option('--input <file>', 'Read full request body from JSON file (or pipe via stdin)')
    .option('--api-key <key>', 'API key (overrides stored/env)')
    .option('--format <type>', 'Output format: table, json, csv, yaml')
    .option('--json', 'Output as JSON')
    .action((resourceId: string, opts) => apiAction(async (client) => {
      const body = readBodyInput(opts);

      let res;
      if (body) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- user-provided JSON, API validates
        res = await updateNanoClassifier(client, resourceId, body as any);
      } else {
        const data: Record<string, unknown> = {};
        if (opts.type) data.type = opts.type;
        if (opts.classes) {
          try { data.classes = JSON.parse(opts.classes); } catch { data.classes = (opts.classes as string).split(',').map((s: string) => s.trim()); }
        }
        if (opts.printable !== undefined) data.printable = opts.printable;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        res = await updateNanoClassifier(client, resourceId, data as any);
      }

      if (opts.json) {
        console.log(JSON.stringify(res.data, null, 2));
      } else {
        console.log(success(`Nano classifier ${resourceId} updated.`));
      }
    })(opts));

  // ── clio nano-classifiers delete ────────────────────────────────
  cmd
    .command('delete <resourceId>')
    .description('Delete a nano classifier')
    .option('--api-key <key>', 'API key (overrides stored/env)')
    .option('--format <type>', 'Output format: table, json, csv, yaml')
    .option('--json', 'Output as JSON')
    .action((resourceId: string, opts) => apiAction(async (client) => {
      await deleteNanoClassifier(client, resourceId);

      if (opts.json) {
        console.log(JSON.stringify({ deleted: true, resourceId }));
      } else {
        console.log(success(`Nano classifier ${resourceId} deleted.`));
      }
    })(opts));
}
