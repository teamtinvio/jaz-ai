/**
 * CUD (Create/Update/Delete) action summary extraction.
 *
 * Summarizes what actions the agent took during a conversation turn.
 */

// ── Types ────────────────────────────────────────────────────────────

export type CUDAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'NO_ACTION';

export type EntityType =
  | 'INVOICE'
  | 'BILL'
  | 'JOURNAL'
  | 'CONTACT'
  | 'CHART_OF_ACCOUNT'
  | 'CASH_TRANSACTION'
  | 'CURRENCY'
  | 'TAX_PROFILE'
  | 'BOOKMARK'
  | 'ITEM'
  | 'USER'
  | 'CAPSULE'
  | 'REPORT'
  | 'EXPORT'
  | 'CREDIT_NOTE'
  | 'PAYMENT'
  | 'OTHER';

export interface CUDActionSummary {
  action: CUDAction;
  entity_type: EntityType;
  entity_id: string;
  description: string;
  status: 'success' | 'failure';
  error_message: string;
}

export interface ToolCall {
  tool_name: string;
  input: Record<string, unknown>;
  output: unknown;
  error?: string;
}

// ── Entity Type Detection ─────────────────────────────────────────

/** Map tool name prefixes to entity types. */
const TOOL_ENTITY_MAP: Record<string, EntityType> = {
  create_invoice: 'INVOICE',
  update_invoice: 'INVOICE',
  delete_invoice: 'INVOICE',
  void_invoice: 'INVOICE',
  finalize_invoice: 'INVOICE',
  create_bill: 'BILL',
  update_bill: 'BILL',
  delete_bill: 'BILL',
  void_bill: 'BILL',
  finalize_bill: 'BILL',
  create_journal: 'JOURNAL',
  update_journal: 'JOURNAL',
  delete_journal: 'JOURNAL',
  create_contact: 'CONTACT',
  update_contact: 'CONTACT',
  delete_contact: 'CONTACT',
  create_account: 'CHART_OF_ACCOUNT',
  update_account: 'CHART_OF_ACCOUNT',
  delete_account: 'CHART_OF_ACCOUNT',
  create_cash_in: 'CASH_TRANSACTION',
  create_cash_out: 'CASH_TRANSACTION',
  create_cash_transfer: 'CASH_TRANSACTION',
  create_currency: 'CURRENCY',
  import_currency_rates: 'CURRENCY',
  create_tax_profile: 'TAX_PROFILE',
  create_bookmark: 'BOOKMARK',
  update_bookmark: 'BOOKMARK',
  create_item: 'ITEM',
  update_item: 'ITEM',
  delete_item: 'ITEM',
  invite_user: 'USER',
  update_user: 'USER',
  remove_user: 'USER',
  create_capsule: 'CAPSULE',
  update_capsule: 'CAPSULE',
  create_customer_credit_note: 'CREDIT_NOTE',
  create_supplier_credit_note: 'CREDIT_NOTE',
  create_payment: 'PAYMENT',
  apply_payment: 'PAYMENT',
  generate_report: 'REPORT',
  export_data: 'EXPORT',
};

/** Detect CUD action from tool name. */
function detectAction(toolName: string): CUDAction {
  const lower = toolName.toLowerCase();
  if (lower.startsWith('create') || lower.startsWith('invite') || lower.startsWith('import') || lower.startsWith('apply')) {
    return 'CREATE';
  }
  if (lower.startsWith('update') || lower.startsWith('finalize') || lower.startsWith('void')) {
    return 'UPDATE';
  }
  if (lower.startsWith('delete') || lower.startsWith('remove')) {
    return 'DELETE';
  }
  return 'NO_ACTION';
}

/** Detect entity type from tool name. */
function detectEntityType(toolName: string): EntityType {
  return TOOL_ENTITY_MAP[toolName] ?? 'OTHER';
}

/**
 * Extract the entity ID from a tool call's output.
 * Looks for resourceId in common response shapes.
 */
function extractEntityId(output: unknown): string {
  if (output == null) return '';
  if (typeof output === 'object') {
    const obj = output as Record<string, unknown>;
    // Direct resourceId
    if (typeof obj.resourceId === 'string') return obj.resourceId;
    // Nested data.resourceId
    if (typeof obj.data === 'object' && obj.data != null) {
      const data = obj.data as Record<string, unknown>;
      if (typeof data.resourceId === 'string') return data.resourceId;
    }
  }
  return '';
}

// ── Summary Extraction ────────────────────────────────────────────

/**
 * Extract CUD action summaries from a list of tool calls.
 * Filters out read-only operations (search, list, get, generate, export).
 *
 * This is the deterministic version — no LLM needed.
 * Covers 90%+ of cases. Complex edge cases can use LLM extraction later.
 */
export function extractActionsSummary(toolCalls: ToolCall[]): CUDActionSummary[] {
  const summaries: CUDActionSummary[] = [];

  for (const call of toolCalls) {
    const action = detectAction(call.tool_name);

    // Skip read-only tools
    if (action === 'NO_ACTION') continue;

    const entityType = detectEntityType(call.tool_name);
    const entityId = call.error
      ? (call.input?.resourceId as string ?? '')
      : extractEntityId(call.output);

    summaries.push({
      action,
      entity_type: entityType,
      entity_id: entityId || '',
      description: formatDescription(action, entityType, call.tool_name),
      status: call.error ? 'failure' : 'success',
      error_message: call.error ?? '',
    });
  }

  return summaries;
}

/** Human-readable description for an action. */
function formatDescription(
  action: CUDAction,
  entityType: EntityType,
  toolName: string,
): string {
  const entityLabel = entityType
    .toLowerCase()
    .replace(/_/g, ' ');

  switch (action) {
    case 'CREATE':
      return `Created ${entityLabel}`;
    case 'UPDATE':
      if (toolName.includes('finalize')) return `Finalized ${entityLabel}`;
      if (toolName.includes('void')) return `Voided ${entityLabel}`;
      return `Updated ${entityLabel}`;
    case 'DELETE':
      return `Deleted ${entityLabel}`;
    default:
      return toolName;
  }
}

/**
 * Format tool calls for agent callback responses.
 * Returns the tool_calls array expected by the service.
 */
export function formatToolCallsForChannel(
  toolCalls: ToolCall[],
): Array<{ tool_name: string; input: string; output: string }> {
  return toolCalls.map((call) => ({
    tool_name: call.tool_name,
    input: JSON.stringify(call.input),
    output: call.error
      ? JSON.stringify({ error: call.error })
      : JSON.stringify(call.output),
  }));
}
