/**
 * Programmatic tool input validation.
 *
 * Validates required fields before executing write tools.
 * Read-only tools skip validation entirely.
 *
 * Moved from agent/validation.ts to core/registry/ so both
 * MCP (commands/mcp.ts) and daemon (agent/) can share it
 * without pulling in serve/ dependencies.
 */
import type { ToolDefinition, ParamDef } from './types.js';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validate tool input against the tool's parameter schema.
 * Checks:
 * 1. Required fields are present and non-empty
 * 2. Type constraints (string, number, boolean, array)
 * 3. Enum constraints (if defined)
 *
 * Returns validation result. Always returns valid=true for read-only tools.
 */
export function validateToolInput(
  tool: ToolDefinition,
  input: Record<string, unknown>,
): ValidationResult {
  // Skip validation for read-only tools
  if (tool.readOnly) {
    return { valid: true, errors: [] };
  }

  const errors: string[] = [];

  // Check required fields
  for (const field of tool.required) {
    const value = input[field];
    if (value === undefined || value === null) {
      errors.push(`Missing required field: ${field}`);
      continue;
    }
    // Check for empty strings
    if (typeof value === 'string' && value.trim() === '') {
      errors.push(`Required field "${field}" is empty`);
    }
  }

  // Check type constraints for provided fields
  for (const [key, value] of Object.entries(input)) {
    if (value === undefined || value === null) continue;

    const paramDef = tool.params[key];
    if (!paramDef) continue; // Unknown param — let the API handle it

    const typeError = checkType(key, value, paramDef);
    if (typeError) errors.push(typeError);

    // Check enum constraints
    if (paramDef.enum && typeof value === 'string') {
      if (!paramDef.enum.includes(value)) {
        errors.push(
          `Field "${key}" value "${value}" not in allowed values: ${paramDef.enum.join(', ')}`,
        );
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Check if a value matches the expected type.
 */
export function checkType(key: string, value: unknown, def: ParamDef): string | null {
  switch (def.type) {
    case 'string':
      if (typeof value !== 'string') {
        return `Field "${key}" expected string, got ${typeof value}`;
      }
      break;
    case 'number':
      if (typeof value !== 'number' || !Number.isFinite(value)) {
        return `Field "${key}" expected finite number, got ${typeof value === 'number' ? 'non-finite' : typeof value}`;
      }
      break;
    case 'boolean':
      if (typeof value !== 'boolean') {
        return `Field "${key}" expected boolean, got ${typeof value}`;
      }
      break;
    case 'array':
      if (!Array.isArray(value)) {
        return `Field "${key}" expected array, got ${typeof value}`;
      }
      break;
    case 'object':
      if (typeof value !== 'object' || Array.isArray(value)) {
        return `Field "${key}" expected object, got ${Array.isArray(value) ? 'array' : typeof value}`;
      }
      break;
  }
  return null;
}
