/**
 * clio context — show minified reference data for a workflow.
 *
 * Same infrastructure as daemon prefetch: same specs, same minifier.
 * Triple-duty: daemon prefetch + CLI context + executor cache.
 *
 * Usage:
 *   clio context                        # All reference data
 *   clio context --workflow sales        # Sales workflow data only
 *   clio context -w purchases --json    # JSON output
 */
import chalk from 'chalk';
import { Command } from 'commander';
import { apiAction } from './api-action.js';
import { prefetchForWorkflows, WORKFLOW_PREFETCH } from '../agent/prefetch.js';
import { createEntityCache } from '../agent/entity-cache.js';
import type { WorkflowId } from '../agent/workflow-gating.js';

const VALID_WORKFLOWS = Object.keys(WORKFLOW_PREFETCH) as WorkflowId[];

export function registerContextCommand(program: Command): void {
  program
    .command('context')
    .description('Show minified reference data (same as agent prefetch)')
    .option('-w, --workflow <id>', `Workflow: ${VALID_WORKFLOWS.join(', ')}`)
    .option('--api-key <key>', 'API key (overrides stored/env)')
    .option('--json', 'Output as JSON')
    .option('--timeout <ms>', 'Timeout in ms (default 10000)', '10000')
    .action(apiAction(async (client, opts) => {
      const { workflow, json, timeout } = opts as { workflow?: string; json?: boolean; timeout?: string };
      const parsed = Number.parseInt(timeout ?? '10000', 10);
      const timeoutMs = Number.isFinite(parsed) && parsed > 0 ? parsed : 10000;
      const cache = createEntityCache();

      if (workflow) {
        // Single workflow
        if (!VALID_WORKFLOWS.includes(workflow as WorkflowId)) {
          console.error(chalk.red(`Unknown workflow: ${workflow}. Valid: ${VALID_WORKFLOWS.join(', ')}`));
          process.exit(1);
        }

        const result = await prefetchForWorkflows(client, [workflow as WorkflowId], cache, { timeoutMs });

        if (json) {
          console.log(JSON.stringify({
            workflow,
            entityCount: result.entityCount,
            contextText: result.contextText,
          }, null, 2));
        } else {
          if (result.contextText) {
            console.log(result.contextText);
          } else {
            console.log(chalk.dim(`No prefetch data for workflow: ${workflow}`));
          }
        }
      } else {
        // All workflows with prefetch mappings
        const sections: string[] = [];
        let totalEntities = 0;

        for (const wf of VALID_WORKFLOWS) {
          const result = await prefetchForWorkflows(client, [wf], cache, { timeoutMs });
          if (result.contextText) {
            if (!json) {
              console.log(chalk.bold.cyan(`\n── ${wf} ──`));
              console.log(result.contextText);
            }
            sections.push(result.contextText);
            totalEntities += result.entityCount;
          }
        }

        if (json) {
          console.log(JSON.stringify({
            workflows: VALID_WORKFLOWS,
            totalEntities,
            sections,
          }, null, 2));
        } else if (sections.length === 0) {
          console.log(chalk.dim('No reference data available.'));
        } else {
          console.log(chalk.dim(`\n${totalEntities} entity groups loaded across ${sections.length} sections`));
        }
      }
    }));
}
