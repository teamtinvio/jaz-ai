/**
 * `clio mcp` — MCP stdio server for Claude Code / Cowork.
 *
 * Runs entirely on the user's machine as a local stdio child process.
 * Claude Code / Cowork spawns it, communicates over stdin/stdout,
 * and kills it when the session ends. No network server, no ports.
 *
 * Auth resolves once at startup (same chain as CLI):
 *   1. --api-key flag  2. JAZ_API_KEY env  3. credentials file
 *
 * API calls go directly from the user's machine to api.getjaz.com.
 */

import { Command } from 'commander';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  McpError,
  ErrorCode,
} from '@modelcontextprotocol/sdk/types.js';

import { TOOL_DEFINITIONS } from '../core/registry/tools.js';
import { getToolByName } from '../core/registry/lookup.js';
import { formatToolError } from '../core/registry/errors.js';
import { validateToolInput } from '../core/registry/validate.js';
import { resolveAuth, resolvedProfileLabel } from '../core/auth/resolve.js';
import { getProfile } from '../core/auth/credentials.js';
import { JazClient } from '../core/api/client.js';
import { getOrganization } from '../core/api/organization.js';
import type { ParamDef } from '../core/registry/types.js';

// ── ParamDef → JSON Schema conversion ───────────────────────────

/** @internal Exported for testing */
export function paramDefToJsonSchema(def: ParamDef): Record<string, unknown> {
  const schema: Record<string, unknown> = { type: def.type };
  if (def.description) schema.description = def.description;
  if (def.enum) schema.enum = def.enum;

  if (def.type === 'array' && def.items) {
    schema.items = paramDefToJsonSchema(def.items);
  }

  if (def.type === 'object' && def.properties) {
    const properties: Record<string, unknown> = {};
    for (const [key, propDef] of Object.entries(def.properties)) {
      properties[key] = paramDefToJsonSchema(propDef);
    }
    schema.properties = properties;
    if (def.required?.length) {
      schema.required = def.required;
    }
  }

  return schema;
}

/** @internal Exported for testing */
export function buildInputSchema(
  params: Record<string, ParamDef>,
  required: string[],
): Record<string, unknown> {
  const properties: Record<string, unknown> = {};
  for (const [key, def] of Object.entries(params)) {
    properties[key] = paramDefToJsonSchema(def);
  }
  return {
    type: 'object',
    properties,
    ...(required.length > 0 ? { required } : {}),
  };
}

// ── Destructive tool check ──────────────────────────────────────

function isDestructive(name: string): boolean {
  return (
    name.startsWith('delete_') ||
    name.startsWith('pay_') ||
    name.startsWith('finalize_') ||
    name.includes('refund') ||
    name === 'remove_org_user'
  );
}

// ── Command registration ────────────────────────────────────────

export function registerMcpCommand(program: Command): void {
  program
    .command('mcp')
    .description('Start MCP stdio server for Claude Code / Cowork')
    .option('--api-key <key>', 'API key (overrides stored/env)')
    .action(async (opts: { apiKey?: string }) => {
      // Resolve auth once at startup — reused across all tool calls
      const auth = resolveAuth(opts.apiKey);
      if (!auth) {
        process.stderr.write(
          'Error: No API key found. Set JAZ_API_KEY env var, run `clio auth add`, or pass --api-key.\n',
        );
        process.exit(1);
      }

      const client = new JazClient(auth);
      const version = program.version() ?? '0.0.0';

      // ── Resolve org display (profile → stored name, raw key → API call)
      let orgDisplay = '';
      let orgStderr = '';
      const label = resolvedProfileLabel();
      if (label) {
        const entry = getProfile(label);
        if (entry?.orgName) {
          orgDisplay = `Connected to: ${entry.orgName} (${entry.currency}).`;
          orgStderr = `${entry.orgName} (${label})`;
        }
      }
      if (!orgDisplay) {
        // Raw API key — fetch org info with a short timeout to avoid blocking startup
        const org = await Promise.race([
          getOrganization(client),
          new Promise<null>((r) => setTimeout(() => r(null), 3000)),
        ]).catch((e) => {
          process.stderr.write(`org lookup failed: ${e instanceof Error ? e.message : 'unknown'}\n`);
          return null;
        });
        if (org) {
          orgDisplay = `Connected to: ${org.name} (${org.currency}).`;
          orgStderr = org.name;
        }
      }

      const server = new Server(
        { name: 'jaz-ai', version },
        {
          capabilities: { tools: {} },
          instructions: [
            `Jaz accounting platform — ${TOOL_DEFINITIONS.length} tools.`,
            orgDisplay,
            'Manage invoices, bills, journals, contacts, bank, reports, and more.',
            'Includes 13 IFRS-compliant financial calculators and 12 accounting job blueprints (offline, no auth).',
            'All API tools hit api.getjaz.com using the configured API key.',
          ].filter(Boolean).join(' '),
        },
      );

      // ── List tools ──────────────────────────────────────────────
      server.setRequestHandler(ListToolsRequestSchema, async () => ({
        tools: TOOL_DEFINITIONS.map((t) => ({
          name: t.name,
          description: t.description,
          inputSchema: buildInputSchema(t.params, t.required),
          annotations: {
            readOnlyHint: t.readOnly,
            destructiveHint: !t.readOnly && isDestructive(t.name),
            openWorldHint: true,
          },
        })),
      }));

      // ── Call tool ───────────────────────────────────────────────
      server.setRequestHandler(CallToolRequestSchema, async (request) => {
        const toolName = request.params.name;
        const tool = getToolByName(toolName);

        if (!tool) {
          throw new McpError(
            ErrorCode.MethodNotFound,
            `Unknown tool: ${toolName}`,
          );
        }

        const input = (request.params.arguments ?? {}) as Record<string, unknown>;

        // Validate write tool inputs before hitting the API
        const validation = validateToolInput(tool, input);
        if (!validation.valid) {
          return {
            content: [{
              type: 'text' as const,
              text: JSON.stringify({
                error: `Validation: ${validation.errors.join('; ')}`,
                hint: 'Check required fields and types in the tool schema.',
              }),
            }],
            isError: true,
          };
        }

        try {
          const result = await tool.execute({ client }, input);
          const text = typeof result === 'string' ? result : JSON.stringify(result, null, 2);

          return {
            content: [{ type: 'text' as const, text }],
          };
        } catch (err) {
          return {
            content: [{
              type: 'text' as const,
              text: JSON.stringify(formatToolError(err)),
            }],
            isError: true,
          };
        }
      });

      // ── Start stdio transport ───────────────────────────────────
      const transport = new StdioServerTransport();
      await server.connect(transport);

      // Graceful shutdown on signal or stdin close
      const shutdown = async () => {
        await server.close();
        process.exit(0);
      };
      process.on('SIGINT', shutdown);
      process.on('SIGTERM', shutdown);
      process.stdin.on('end', shutdown);

      // Log to stderr (never stdout — that's the MCP channel)
      const orgSuffix = orgStderr ? ` — ${orgStderr}` : '';
      process.stderr.write(`jaz-ai MCP server v${version} started (${TOOL_DEFINITIONS.length} tools)${orgSuffix}\n`);
    });
}
