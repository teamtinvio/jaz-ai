import { accent, highlight } from './ui/theme.js';
import { Command } from 'commander';
import { universalSearch } from '../core/api/search.js';
import { apiAction } from './api-action.js';
import { parsePositiveInt } from './parsers.js';

export function registerSearchCommand(program: Command): void {
  program
    .command('search <query>')
    .description('Search across all entities (contacts, invoices, bills, credit notes, items)')
    .option('--limit <n>', 'Max results per category', parsePositiveInt)
    .option('--api-key <key>', 'API key')
    .option('--json', 'JSON output')
    .action((query: string, opts) => apiAction(async (client) => {
      const res = await universalSearch(client, { query, limit: opts.limit });

      if (opts.json) { console.log(JSON.stringify(res.data, null, 2)); return; }

      const data = res.data;
      const categories = Object.entries(data).filter(([, v]) => Array.isArray(v) && v.length > 0);

      if (categories.length === 0) {
        console.log('No results found.');
        return;
      }

      console.log(highlight(`Search results for "${query}":\n`));
      for (const [category, items] of categories) {
        console.log(highlight(`  ${category} (${(items as unknown[]).length}):`));
        for (const item of (items as Array<Record<string, unknown>>).slice(0, 10)) {
          const id = item.resource_id ?? item.resourceId ?? '';
          const name = item.name ?? item.reference ?? item.billingName ?? '';
          console.log(`    ${accent(String(id))}  ${name}`);
        }
      }
    })(opts));
}
