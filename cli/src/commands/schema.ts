/**
 * `clio schema` — offline API schema introspection.
 * No auth required — reads from compiled tool registry.
 *
 * Three levels:
 *   clio schema                        → list all groups with tool counts
 *   clio schema <group>                → show tools in a group
 *   clio schema <group> <action>       → show detailed params for a tool
 */
import type { Command } from 'commander';
import { danger, success, accent, muted, highlight } from './ui/theme.js';
import { getAllTools, getToolsByGroup } from '../core/registry/lookup.js';
import type { ToolDefinition, ParamDef, ToolGroup } from '../core/registry/types.js';
import { formatTable, type TableColumn } from './table-formatter.js';
import { resolveFormat, outputRecord, type OutputOpts } from './output.js';
import { formatId } from './format-helpers.js';

// ── Group → CLI command mapping ─────────────────────────────────

const GROUP_CLI_MAP: Partial<Record<ToolGroup, string>> = {
  cash_entries: 'cash-in / cash-out',
  cash_transfers: 'cash-transfer',
  customer_credit_notes: 'customer-credit-notes',
  supplier_credit_notes: 'supplier-credit-notes',
  bank_rules: 'bank-rules',
  org_users: 'org-users',
  tax_profiles: 'tax-profiles',
  contact_groups: 'contact-groups',
  custom_fields: 'custom-fields',
  fixed_assets: 'fixed-assets',
};

function groupToCliCommand(group: string): string {
  return GROUP_CLI_MAP[group as ToolGroup] ?? group.replace(/_/g, '-');
}

// ── Singularize helper ──────────────────────────────────────────

function singularize(word: string): string {
  if (word.endsWith('ies')) return word.slice(0, -3) + 'y';
  if (word.endsWith('ses')) return word.slice(0, -2);
  if (word.endsWith('s') && !word.endsWith('ss')) return word.slice(0, -1);
  return word;
}

// ── Tool name resolution ────────────────────────────────────────

function resolveToolName(group: ToolGroup, action: string, tools: ToolDefinition[]): ToolDefinition | undefined {
  // Try exact: action_group (e.g., list_invoices)
  const exactPlural = `${action}_${group}`;
  const found1 = tools.find((t) => t.name === exactPlural);
  if (found1) return found1;

  // Try singular: action_singular (e.g., create_invoice)
  const singular = singularize(group);
  const exactSingular = `${action}_${singular}`;
  const found2 = tools.find((t) => t.name === exactSingular);
  if (found2) return found2;

  // Try with group prefix removed for compound groups (e.g., customer_credit_notes → credit_note)
  // and also try action_group_singular for multi-word groups
  const found3 = tools.find((t) => t.name === `${action}_${group.replace(/_/g, '_')}`);
  if (found3) return found3;

  // Fuzzy: find any tool in group whose name contains the action
  return tools.find((t) => t.name.includes(action));
}

// ── Param flattening ────────────────────────────────────────────

interface FlatParam {
  name: string;
  type: string;
  required: boolean;
  values: string;
  description: string;
}

function flattenParams(
  params: Record<string, ParamDef>,
  required: string[],
  prefix = '',
  depth = 0,
): FlatParam[] {
  if (depth > 3) return [];
  const result: FlatParam[] = [];

  for (const [key, def] of Object.entries(params)) {
    const fullName = prefix ? `${prefix}.${key}` : key;
    const isRequired = required.includes(key) && !prefix;

    result.push({
      name: fullName,
      type: def.type,
      required: isRequired,
      values: def.enum?.join(',') ?? '-',
      description: def.description ?? '-',
    });

    // Recurse into object properties
    if (def.type === 'object' && def.properties) {
      result.push(...flattenParams(def.properties, def.required ?? [], fullName, depth + 1));
    }

    // Recurse into array items
    if (def.type === 'array' && def.items) {
      if (def.items.type === 'object' && def.items.properties) {
        result.push(...flattenParams(def.items.properties, def.items.required ?? [], `${fullName}[]`, depth + 1));
      }
    }
  }

  return result;
}

// ── Output helpers ──────────────────────────────────────────────

function outputGroupList(opts: OutputOpts): void {
  const all = getAllTools();
  const groupMap = new Map<string, ToolDefinition[]>();
  for (const tool of all) {
    const list = groupMap.get(tool.group) ?? [];
    list.push(tool);
    groupMap.set(tool.group, list);
  }

  const groups = Array.from(groupMap.entries())
    .sort(([, a], [, b]) => b.length - a.length)
    .map(([group, tools]) => ({
      group,
      tools: tools.length,
      read: tools.filter((t) => t.readOnly).length,
      write: tools.filter((t) => !t.readOnly).length,
      cliCommand: `clio ${groupToCliCommand(group)}`,
    }));

  const fmt = resolveFormat(opts);

  if (fmt !== 'table') {
    outputRecord({ totalTools: all.length, totalGroups: groups.length, groups } as unknown as Record<string, unknown>, opts);
    return;
  }

  console.log(highlight(`Schema — ${all.length} tools across ${groups.length} groups\n`));

  const columns: TableColumn[] = [
    { key: 'group', header: 'Group', format: (v) => accent(String(v)) },
    { key: 'tools', header: 'Tools', align: 'right' },
    { key: 'read', header: 'Read', align: 'right' },
    { key: 'write', header: 'Write', align: 'right' },
    { key: 'cliCommand', header: 'CLI Command', format: (v) => muted(String(v)) },
  ];

  console.log(formatTable(groups as unknown as Record<string, unknown>[], columns));
}

function outputGroupDetail(group: ToolGroup, tools: ToolDefinition[], opts: OutputOpts): void {
  const readCount = tools.filter((t) => t.readOnly).length;
  const writeCount = tools.filter((t) => !t.readOnly).length;
  const fmt = resolveFormat(opts);

  if (fmt !== 'table') {
    outputRecord({
      group,
      cliCommand: `clio ${groupToCliCommand(group)}`,
      toolCount: tools.length,
      read: readCount,
      write: writeCount,
      tools: tools.map((t) => ({
        name: t.name,
        type: t.readOnly ? 'read' : 'write',
        params: Object.keys(t.params).length,
        description: t.description.slice(0, 120),
      })),
    } as unknown as Record<string, unknown>, opts);
    return;
  }

  console.log(highlight(`${group} — ${tools.length} tools (${readCount} read, ${writeCount} write)\n`));

  const columns: TableColumn[] = [
    { key: 'name', header: 'Tool', format: formatId },
    { key: 'type', header: 'Type' },
    { key: 'params', header: 'Params', align: 'right' },
    { key: 'description', header: 'Description' },
  ];

  const rows = tools.map((t) => ({
    name: t.name,
    type: t.readOnly ? 'read' : 'write',
    params: Object.keys(t.params).length,
    description: t.description.length > 80 ? t.description.slice(0, 79) + '\u2026' : t.description,
  }));

  console.log(formatTable(rows as unknown as Record<string, unknown>[], columns));
  console.log(muted(`\n  Use: clio schema ${groupToCliCommand(group)} <action>`));
}

function outputToolDetail(tool: ToolDefinition, opts: OutputOpts): void {
  const flat = flattenParams(tool.params, tool.required);
  const fmt = resolveFormat(opts);

  if (fmt !== 'table') {
    outputRecord({
      tool: tool.name,
      group: tool.group,
      description: tool.description,
      readOnly: tool.readOnly,
      requiredParams: tool.required,
      params: tool.params,
    } as unknown as Record<string, unknown>, opts);
    return;
  }

  console.log(highlight(`${tool.name}`) + muted(` — ${tool.description}\n`));

  if (flat.length === 0) {
    console.log('  No parameters.');
    return;
  }

  const columns: TableColumn[] = [
    { key: 'name', header: 'Parameter', format: (v) => accent(String(v)) },
    { key: 'type', header: 'Type' },
    { key: 'required', header: 'Required', format: (v) => (v === true || v === 'true') ? success('Yes') : 'No' },
    { key: 'values', header: 'Values' },
    { key: 'description', header: 'Description' },
  ];

  console.log(formatTable(flat as unknown as Record<string, unknown>[], columns));
}

// ── Command registration ────────────────────────────────────────

export function registerSchemaCommand(program: Command): void {
  program
    .command('schema')
    .description('Introspect API schema — discover fields, types, and constraints')
    .argument('[group]', 'Entity group (e.g., invoices, contacts)')
    .argument('[action]', 'Action (e.g., create, search, list)')
    .option('--format <type>', 'Output format: table, json, csv, yaml')
    .option('--json', 'Output as JSON')
    .action((group: string | undefined, action: string | undefined, opts: OutputOpts) => {
      // Level 1: list all groups
      if (!group) {
        outputGroupList(opts);
        return;
      }

      // Normalize group: hyphens → underscores to match ToolGroup
      const normalizedGroup = group.replace(/-/g, '_') as ToolGroup;
      const tools = getToolsByGroup(normalizedGroup);

      if (tools.length === 0) {
        // Try as-is in case it's already correct
        const directTools = getToolsByGroup(group as ToolGroup);
        if (directTools.length === 0) {
          console.error(danger(`Unknown group: ${group}`));
          console.error(muted('Run `clio schema` to see available groups.'));
          process.exit(1);
        }
        // Level 2: show group tools
        if (!action) {
          outputGroupDetail(group as ToolGroup, directTools, opts);
          return;
        }
        const tool = resolveToolName(group as ToolGroup, action, directTools);
        if (!tool) {
          console.error(danger(`Unknown action: ${action} in group ${group}`));
          console.error(muted(`Available: ${directTools.map((t) => t.name).join(', ')}`));
          process.exit(1);
        }
        outputToolDetail(tool, opts);
        return;
      }

      // Level 2: show tools in group
      if (!action) {
        outputGroupDetail(normalizedGroup, tools, opts);
        return;
      }

      // Level 3: show tool detail
      const tool = resolveToolName(normalizedGroup, action, tools);
      if (!tool) {
        console.error(danger(`Unknown action: ${action} in group ${group}`));
        console.error(muted(`Available: ${tools.map((t) => t.name).join(', ')}`));
        process.exit(1);
      }
      outputToolDetail(tool, opts);
    });
}
