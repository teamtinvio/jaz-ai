/**
 * O(1) tool lookup via Map.
 * Lazy-initialized on first access — no startup cost if unused (e.g., CLI commands).
 */
import type { ToolDefinition, ToolGroup } from './types.js';
import { TOOL_DEFINITIONS } from './tools.js';

let toolMap: Map<string, ToolDefinition> | null = null;

function ensureMap(): Map<string, ToolDefinition> {
  if (!toolMap) {
    toolMap = new Map();
    for (const tool of TOOL_DEFINITIONS) {
      toolMap.set(tool.name, tool);
    }
  }
  return toolMap;
}

/** Get a single tool by name. O(1). */
export function getToolByName(name: string): ToolDefinition | undefined {
  return ensureMap().get(name);
}

/** Get all tool definitions. */
export function getAllTools(): ToolDefinition[] {
  return TOOL_DEFINITIONS;
}

/** Get tools filtered by group. */
export function getToolsByGroup(group: ToolGroup): ToolDefinition[] {
  return TOOL_DEFINITIONS.filter((t) => t.group === group);
}

/** Get read-only tools (GET, LIST, SEARCH, GENERATE — no mutations). */
export function getReadOnlyTools(): ToolDefinition[] {
  return TOOL_DEFINITIONS.filter((t) => t.readOnly);
}

/** Get write tools (CREATE, UPDATE, DELETE, PAY — mutations). */
export function getWriteTools(): ToolDefinition[] {
  return TOOL_DEFINITIONS.filter((t) => !t.readOnly);
}

/** Get tool count. */
export function getToolCount(): number {
  return TOOL_DEFINITIONS.length;
}
