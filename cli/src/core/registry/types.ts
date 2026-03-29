/**
 * LLM-agnostic tool registry types.
 * Define tools once — providers convert to SDK-native format.
 */
import type { JazClient } from '../api/client.js';

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
 * Minimal context required by tool execute functions.
 * Deliberately slim — keeps core/registry/ independent of the daemon layer.
 * Daemon's AgentContext is structurally compatible (has a `client` field).
 */
export interface ToolContext {
  client: JazClient;
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
  execute: (ctx: ToolContext, input: Record<string, unknown>) => Promise<unknown>;
}

/** Tool groups for filtering and gating. */
export type ToolGroup =
  | 'organization'
  | 'accounts'
  | 'contacts'
  | 'invoices'
  | 'bills'
  | 'journals'
  | 'financial_reports'
  | 'operational_reports'
  | 'bank'
  | 'bank_rules'
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
  | 'recipes'
  | 'close_jobs'
  | 'operational_jobs'
  | 'drafts'
  | 'fixed_assets'
  | 'subscriptions'
  | 'contact_groups'
  | 'custom_fields'
  | 'inventory'
  | 'search'
  | 'quick_fix'
  | 'nano_classifiers'
  | 'tui'
  | (string & {}); // Open for plugins — any string is valid
