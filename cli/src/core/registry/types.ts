/**
 * LLM-agnostic tool registry types.
 * Define tools once — providers convert to SDK-native format.
 */
import type { JazClient } from '../api/client.js';
import type { AgentContext } from '../../agent/context.js';

/**
 * Neutral JSON Schema property definition.
 * Mirrors JSON Schema subset used by both Anthropic and OpenAI.
 */
export interface ParamDef {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description?: string;
  enum?: string[];
  items?: ParamDef;
  properties?: Record<string, ParamDef>;
  required?: string[];
}

/**
 * SDK-agnostic tool definition.
 * Single source of truth — all providers consume this.
 */
export interface ToolDefinition {
  /** Unique tool name (e.g., 'create_invoice'). */
  name: string;

  /** Rich description with field rules and gotchas. */
  description: string;

  /** Parameter definitions (JSON Schema properties). */
  params: Record<string, ParamDef>;

  /** Required parameter names. */
  required: string[];

  /** Tool group for filtering and organization. */
  group: ToolGroup;

  /** True for GET/LIST/SEARCH/GENERATE tools — no data mutation. */
  readOnly: boolean;

  /**
   * Execute the tool against the API.
   * Returns the result (will be JSON.stringify'd for the LLM).
   */
  execute: (ctx: AgentContext, input: Record<string, unknown>) => Promise<unknown>;
}

/** Tool groups for filtering and gating. */
export type ToolGroup =
  | 'organization'
  | 'accounts'
  | 'contacts'
  | 'invoices'
  | 'bills'
  | 'journals'
  | 'reports'
  | 'bank'
  | 'items'
  | 'tags'
  | 'capsules'
  | 'customer_credit_notes'
  | 'supplier_credit_notes'
  | 'currencies'
  | 'tax_profiles'
  | 'cash_entries'
  | 'cash_transfers'
  | 'schedulers'
  | 'bookmarks'
  | 'org_users'
  | 'attachments'
  | 'exports'
  | 'payments'
  | 'cashflow'
  | 'magic'
  | 'recipes';
