import chalk from 'chalk';
import { Command } from 'commander';
import {
  loadIndex,
  searchArticles,
} from '../core/kb/index.js';
import {
  loadEmbeddings,
  semanticSearch,
  isSemanticAvailable,
} from '../core/kb/embeddings.js';

export function registerKbCommand(program: Command): void {
  program
    .command('help-center')
    .alias('hc')
    .description('Search the Jaz help center')
    .argument('<query...>', 'Search query (e.g. "bank recon", "how to apply credit")')
    .option('--limit <n>', 'Max results (default 5)', parseInt)
    .option('--section <slug>', 'Filter by section (e.g. invoices, bills, settings)')
    .option('--json', 'Output as JSON')
    .action(async (queryParts: string[], opts: Record<string, unknown>) => {
      try {
        const index = loadIndex();
        const query = queryParts.join(' ');
        const limit = (opts.limit as number) ?? 5;
        const section = opts.section as string | undefined;

        // Auto-detect best search mode: hybrid if available, else keyword
        const embeddings = loadEmbeddings();
        const useHybrid = isSemanticAvailable(embeddings);

        const results = useHybrid
          ? await semanticSearch(index, embeddings, query, { mode: 'hybrid', limit, section })
          : searchArticles(index, query, { limit, section });

        const modeLabel = useHybrid ? 'hybrid' : 'keyword';

        if (opts.json) {
          console.log(JSON.stringify({
            query,
            mode: modeLabel,
            resultCount: results.length,
            results: results.map((r, i) => ({
              rank: i + 1,
              score: Math.round(r.score * 10000) / 10000,
              title: r.article.title,
              section: r.article.section,
              sourceUrl: r.article.sourceUrl,
              snippet: r.article.snippet,
              questions: r.article.questions,
              matchedTerms: r.matchedTerms,
            })),
          }, null, 2));
          return;
        }

        if (results.length === 0) {
          console.log(chalk.yellow(`  No results for "${query}"`));
          return;
        }

        console.log('');
        console.log(chalk.bold(`  ${results.length} result${results.length !== 1 ? 's' : ''} for "${query}"`));
        console.log('');

        for (let i = 0; i < results.length; i++) {
          const r = results[i];
          console.log(chalk.cyan(`  ${i + 1}. ${r.article.title}`) + chalk.dim(` (${r.section.name})`));
          if (r.article.snippet) {
            console.log(chalk.dim(`     ${r.article.snippet.slice(0, 120)}${r.article.snippet.length > 120 ? '...' : ''}`));
          }
          if (r.article.sourceUrl) {
            console.log(chalk.dim(`     ${r.article.sourceUrl}`));
          }
          console.log('');
        }
      } catch (err) {
        console.error(chalk.red(`Error: ${err instanceof Error ? err.message : String(err)}`));
        process.exit(1);
      }
    });
}
