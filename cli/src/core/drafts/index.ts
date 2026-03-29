/**
 * Draft business logic — validation, sanitization, merge.
 *
 * Pure functions, no CLI dependencies. Shared by:
 * - CLI commands (src/commands/draft-helpers.ts re-exports + adds chalk/Commander)
 * - MCP tools (via registry)
 * - Daemon agent tools (via registry)
 */

// Validation & field specs
export {
  validateDraft,
  buildValidation,
  buildDraftReport,
  BILL_REQUIRED_FIELDS,
  INVOICE_REQUIRED_FIELDS,
  CREDIT_NOTE_REQUIRED_FIELDS,
  JOURNAL_REQUIRED_FIELDS,
} from './validate.js';

export type {
  DraftFieldSpec,
  FieldValidation,
  LineItemValidation,
  DraftValidation,
  DraftReport,
} from './validate.js';

// GET → PUT sanitization
export {
  sanitizeLineItem,
  sanitizeJournalEntry,
  normalizeDate,
} from './sanitize.js';

// Flag merge
export {
  mergeDraftFlags,
  mergeJournalDraftFlags,
} from './merge.js';
