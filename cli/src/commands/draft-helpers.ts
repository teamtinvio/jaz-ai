/**
 * Shared draft finalization helpers — DRY across all business transaction types.
 *
 * Each BT type (bills, invoices, credit notes, journals) provides:
 *   1. A field spec array (what's mandatory for finalization)
 *   2. Its own API functions (get, update, search)
 *
 * Everything else (validation, JSON/human output, CLI flags) is shared here.
 */

import chalk from 'chalk';
import type { Command } from 'commander';
import type { LineItem } from '../core/api/types.js';
import { parseLineItems, parseJournalEntries, parseRate } from './parsers.js';

// ── Field Spec ──────────────────────────────────────────────────

export interface DraftFieldSpec {
  /** JSON field name: 'contactResourceId', 'accountResourceId', etc. */
  field: string;
  /** Human-readable label: 'Contact', 'Account', etc. */
  label: string;
  /** CLI hint shown when missing: '--contact <name or UUID>' */
  hint: string;
  /** Returns true if the field is present/valid on the item. */
  check: (item: any) => boolean;  // eslint-disable-line @typescript-eslint/no-explicit-any
  /** True = check on each lineItems[i] (or journalEntries[i]), not the top-level item. */
  perLineItem?: boolean;
}

// ── Bill / Invoice / Credit Note field specs ────────────────────

export const BILL_REQUIRED_FIELDS: DraftFieldSpec[] = [
  { field: 'contactResourceId', label: 'Contact', hint: '--contact <name or UUID>', check: (b) => !!b.contactResourceId },
  { field: 'valueDate', label: 'Date', hint: '--date <YYYY-MM-DD>', check: (b) => !!b.valueDate },
  { field: 'dueDate', label: 'Due date', hint: '--due <YYYY-MM-DD>', check: (b) => !!b.dueDate },
  { field: 'lineItems', label: 'Line items', hint: '--lines <json>', check: (b) => b.lineItems?.length > 0 },
  { field: 'name', label: 'Item name', hint: 'via --lines', check: (li) => !!li.name, perLineItem: true },
  { field: 'unitPrice', label: 'Unit price', hint: 'via --lines', check: (li) => li.unitPrice != null, perLineItem: true },
  // GET returns organizationAccountResourceId; CREATE/PUT use accountResourceId — check both
  { field: 'accountResourceId', label: 'Account', hint: '--account <name or UUID>', check: (li) => !!(li.accountResourceId || li.organizationAccountResourceId), perLineItem: true },
];

export const INVOICE_REQUIRED_FIELDS: DraftFieldSpec[] = [...BILL_REQUIRED_FIELDS];
export const CREDIT_NOTE_REQUIRED_FIELDS: DraftFieldSpec[] =
  BILL_REQUIRED_FIELDS.filter((s) => s.field !== 'dueDate');

// ── Journal field specs ─────────────────────────────────────────

export const JOURNAL_REQUIRED_FIELDS: DraftFieldSpec[] = [
  { field: 'valueDate', label: 'Date', hint: '--date <YYYY-MM-DD>', check: (j) => !!j.valueDate },
  { field: 'journalEntries', label: 'Journal entries', hint: '--entries <json>', check: (j) => j.journalEntries?.length > 0 },
  { field: 'accountResourceId', label: 'Account', hint: '--account <name or UUID>', check: (e) => !!(e.accountResourceId || e.organizationAccountResourceId), perLineItem: true },
  { field: 'amount', label: 'Amount', hint: 'via --entries', check: (e) =>
    (e.amount != null && e.amount > 0) ||
    (e.debitAmount != null && e.debitAmount > 0) ||
    (e.creditAmount != null && e.creditAmount > 0), perLineItem: true },
];

// ── Validation Types ────────────────────────────────────────────

export interface FieldValidation {
  status: 'ok' | 'missing';
  value?: string | number;
  resourceId?: string;
  hint?: string;
}

export interface LineItemValidation {
  index: number;
  name: string | null;
  nameStatus: 'ok' | 'missing';
  unitPrice: number | null;
  unitPriceStatus: 'ok' | 'missing';
  account: FieldValidation;
  taxProfile?: FieldValidation;
}

export interface DraftValidation {
  contact?: FieldValidation;
  valueDate: FieldValidation;
  dueDate?: FieldValidation;
  lineItems: LineItemValidation[];
}

export interface DraftReport {
  resourceId: string;
  reference: string | null;
  totalAmount: number;
  attachmentCount: number;
  ready: boolean;
  missingCount: number;
  missingFields: string[];
  validation: DraftValidation;
}

// ── Core Validation ─────────────────────────────────────────────

/**
 * Validate a draft against its field specs.
 *
 * Returns the list of missing field paths (e.g. ['contactResourceId', 'lineItems[0].accountResourceId']).
 */
export function validateDraft(
  item: any,  // eslint-disable-line @typescript-eslint/no-explicit-any
  specs: DraftFieldSpec[],
  lineItemsKey = 'lineItems',
): { missingFields: string[]; missingCount: number; ready: boolean } {
  const missingFields: string[] = [];

  for (const spec of specs) {
    if (spec.perLineItem) {
      const items = item[lineItemsKey] ?? [];
      for (let i = 0; i < items.length; i++) {
        if (!spec.check(items[i])) {
          missingFields.push(`${lineItemsKey}[${i}].${spec.field}`);
        }
      }
    } else {
      if (!spec.check(item)) {
        missingFields.push(spec.field);
      }
    }
  }

  return {
    missingFields,
    missingCount: missingFields.length,
    ready: missingFields.length === 0,
  };
}

/**
 * Build structured per-field validation for JSON output.
 *
 * Produces the validation object with status/value/hint per field,
 * making it crystal clear to agents what's present and what's missing.
 */
export function buildValidation(
  item: any,  // eslint-disable-line @typescript-eslint/no-explicit-any
  specs: DraftFieldSpec[],
  lineItemsKey = 'lineItems',
): DraftValidation {
  const topSpecs = specs.filter((s) => !s.perLineItem);
  const liSpecs = specs.filter((s) => s.perLineItem);

  // Build result — only include top-level fields that exist in the specs
  const result: DraftValidation = {
    valueDate: buildFieldValidation(item, 'valueDate', 'Date', '--date <YYYY-MM-DD>', topSpecs),
    lineItems: [],
  };

  // Only include contact/dueDate when they're in the field specs
  if (topSpecs.some((s) => s.field === 'contactResourceId')) {
    result.contact = buildFieldValidation(item, 'contactResourceId', 'Contact', '--contact <name or UUID>', topSpecs);
  }
  if (topSpecs.some((s) => s.field === 'dueDate')) {
    result.dueDate = buildFieldValidation(item, 'dueDate', 'Due date', '--due <YYYY-MM-DD>', topSpecs);
  }

  // Build per-line-item validations using liSpecs for consistent status reporting
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- journal entries don't match LineItem shape
  const items: any[] = item[lineItemsKey] ?? [];
  result.lineItems = items.map((li: any, i: number) => {  // eslint-disable-line @typescript-eslint/no-explicit-any
    // GET returns organizationAccountResourceId; CREATE/PUT use accountResourceId — check both
    const acctId = li.accountResourceId || li.organizationAccountResourceId;
    const account: FieldValidation = acctId
      ? { status: 'ok', resourceId: acctId }
      : { status: 'missing', hint: '--account <name or UUID>' };

    // Journal entries: show amount/type instead of name/unitPrice
    // GET returns debitAmount/creditAmount (not amount/type)
    if (lineItemsKey === 'journalEntries') {
      const amountSpec = liSpecs.find((s) => s.field === 'amount');
      const amountOk = amountSpec ? amountSpec.check(li) : true;
      const entryAmount = li.amount ?? li.debitAmount ?? li.creditAmount ?? null;
      const entryType = li.type ?? (li.debitAmount > 0 ? 'DEBIT' : li.creditAmount > 0 ? 'CREDIT' : null);
      return {
        index: i,
        name: li.description || entryType || null,
        nameStatus: 'ok' as const,
        unitPrice: entryAmount,
        unitPriceStatus: amountOk ? 'ok' as const : 'missing' as const,
        account,
      };
    }

    // Line items: use name/unitPrice specs
    const nameSpec = liSpecs.find((s) => s.field === 'name');
    const priceSpec = liSpecs.find((s) => s.field === 'unitPrice');
    const nameOk = nameSpec ? nameSpec.check(li) : true;
    const priceOk = priceSpec ? priceSpec.check(li) : true;

    return {
      index: i,
      name: li.name || null,
      nameStatus: nameOk ? 'ok' as const : 'missing' as const,
      unitPrice: li.unitPrice ?? null,
      unitPriceStatus: priceOk ? 'ok' as const : 'missing' as const,
      account,
    };
  });

  return result;
}

function buildFieldValidation(
  item: any,  // eslint-disable-line @typescript-eslint/no-explicit-any
  field: string,
  label: string,
  hint: string,
  specs: DraftFieldSpec[],
): FieldValidation {
  const spec = specs.find((s) => s.field === field);
  if (!spec) {
    // Field not in specs — treat as optional, report value if present
    const value = item[field];
    return value ? { status: 'ok', value } : { status: 'ok' };
  }

  if (spec.check(item)) {
    const value = item[field];
    // For contacts, include both displayName and resourceId
    if (field === 'contactResourceId') {
      return { status: 'ok', value: item.contactName || value, resourceId: value };
    }
    return { status: 'ok', value };
  }

  return { status: 'missing', hint };
}

// ── Build DraftReport ───────────────────────────────────────────

export function buildDraftReport(
  item: any,  // eslint-disable-line @typescript-eslint/no-explicit-any
  specs: DraftFieldSpec[],
  attachmentCount: number,
  lineItemsKey = 'lineItems',
): DraftReport {
  const { missingFields, missingCount, ready } = validateDraft(item, specs, lineItemsKey);
  const validation = buildValidation(item, specs, lineItemsKey);

  return {
    resourceId: item.resourceId,
    reference: item.reference || null,
    totalAmount: item.totalAmount ?? 0,
    attachmentCount,
    ready,
    missingCount,
    missingFields,
    validation,
  };
}

// ── Human-Readable Formatting ───────────────────────────────────

export function formatDraftTable(label: string, drafts: DraftReport[]): void {
  const readyCount = drafts.filter((d) => d.ready).length;
  const needsAttention = drafts.length - readyCount;

  if (drafts.length === 0) {
    console.log(chalk.yellow(`No draft ${label.toLowerCase()} found.`));
    return;
  }

  const summary = readyCount === drafts.length
    ? chalk.green(`${drafts.length} drafts, all ready`)
    : `${drafts.length} drafts, ${chalk.green(`${readyCount} ready`)}, ${chalk.yellow(`${needsAttention} need attention`)}`;
  console.log(chalk.bold(`Draft ${label} — ${summary}\n`));

  for (let idx = 0; idx < drafts.length; idx++) {
    const d = drafts[idx];
    const ref = d.reference || '(no ref)';
    const amount = d.totalAmount > 0 ? `$${d.totalAmount.toFixed(2)}` : '$0.00';
    const shortId = d.resourceId.length > 12 ? d.resourceId.slice(0, 8) + '-...' : d.resourceId;

    console.log(`  ${chalk.bold(`${idx + 1}.`)} ${ref} ${chalk.dim(`(${shortId})`)}  ${chalk.dim(amount)}`);

    // Top-level fields (only show those present in validation)
    const v = d.validation;
    if (v.contact) formatFieldLine('Contact', v.contact);
    formatFieldLine('Date', v.valueDate);
    if (v.dueDate) formatFieldLine('Due', v.dueDate);

    // Line items
    for (const li of v.lineItems) {
      const name = li.name || '(unnamed)';
      const price = li.unitPrice != null ? `$${li.unitPrice.toFixed(2)}` : 'no price';
      const acctStatus = li.account.status === 'ok'
        ? chalk.green('✓')
        : chalk.red('MISSING');
      console.log(`     Line ${li.index + 1}:  ${name} — ${price} — account: ${acctStatus}`);
    }

    // Attachments
    const attachLabel = d.attachmentCount > 0
      ? `${d.attachmentCount} file${d.attachmentCount > 1 ? 's' : ''}`
      : 'none';
    console.log(`     Attach:  ${chalk.dim(attachLabel)}`);

    // Summary
    if (d.ready) {
      console.log(chalk.green('     ✓ READY TO FINALIZE'));
    } else {
      const hints = uniqueHints(d);
      console.log(chalk.yellow(`     → ${d.missingCount} issue${d.missingCount > 1 ? 's' : ''}: ${hints}`));
    }
    console.log('');
  }
}

function formatFieldLine(label: string, fv: FieldValidation): void {
  const padLabel = label.padEnd(8);
  if (fv.status === 'ok') {
    const display = fv.value != null ? String(fv.value) : '';
    console.log(`     ${padLabel} ${display}  ${chalk.green('✓')}`);
  } else {
    console.log(`     ${padLabel} ${chalk.red('MISSING')}`);
  }
}

function uniqueHints(d: DraftReport): string {
  // Collect unique hints from missing fields
  const hints = new Set<string>();
  const v = d.validation;
  if (v.contact?.status === 'missing' && v.contact.hint) hints.add(v.contact.hint);
  if (v.valueDate.status === 'missing' && v.valueDate.hint) hints.add(v.valueDate.hint);
  if (v.dueDate?.status === 'missing' && v.dueDate.hint) hints.add(v.dueDate.hint);
  for (const li of v.lineItems) {
    if (li.account.status === 'missing' && li.account.hint) hints.add(li.account.hint);
  }
  return Array.from(hints).join(', ');
}

// ── Shared CLI Options ──────────────────────────────────────────

/**
 * Register shared draft finalize flags on a Commander command.
 * Used by `clio bills draft finalize`, `clio invoices draft finalize`, etc.
 */
export function addDraftFinalizeOptions(cmd: Command): Command {
  return cmd
    .option('--contact <name/uuid>', 'Set/override contact (fuzzy resolved)')
    .option('--date <YYYY-MM-DD>', 'Set/override date (valueDate)')
    .option('--due <YYYY-MM-DD>', 'Set/override due date')
    .option('--lines <json>', 'Override all line items (JSON array)', parseLineItems)
    .option('--account <name/uuid>', 'Set account on ALL line items missing it (fuzzy resolved)')
    .option('--tax-profile <name/uuid>', 'Set tax profile on ALL line items missing it (fuzzy resolved)')
    .option('--ref <reference>', 'Set reference')
    .option('--notes <text>', 'Set notes')
    .option('--tag <tag>', 'Set tag')
    .option('--tax', 'Enable tax/VAT')
    .option('--tax-inclusive', 'Prices are tax-inclusive (requires --tax)')
    .option('--dry-run', 'Validate only — show what\'s present/missing, don\'t finalize')
    .option('--input <file>', 'Read full JSON override body from file (or pipe via stdin)')
    .option('--api-key <key>', 'API key (overrides stored/env)')
    .option('--json', 'Output as JSON');
}

/**
 * Sanitize a line item from GET response to PUT-compatible format.
 *
 * The GET response includes response-only fields (organizationAccountResourceId,
 * taxProfile as object, withholdingTaxAmount, line-item resourceId, etc.) that
 * the PUT endpoint rejects as "invalid request body". This function extracts
 * only the fields that the CreateBillClientRequestLineItem schema accepts.
 */
function sanitizeLineItem(li: any): Record<string, unknown> {  // eslint-disable-line @typescript-eslint/no-explicit-any
  const clean: Record<string, unknown> = {};

  // Core fields
  if (li.name != null) clean.name = li.name;
  if (li.quantity != null) clean.quantity = li.quantity;
  if (li.unitPrice != null) clean.unitPrice = li.unitPrice;
  if (li.unit) clean.unit = li.unit;

  // Account: GET uses organizationAccountResourceId, PUT uses accountResourceId
  const acctId = li.accountResourceId || li.organizationAccountResourceId;
  if (acctId) clean.accountResourceId = acctId;

  // Tax profile: GET returns { resourceId } object, PUT expects string UUID
  const tpId = li.taxProfileResourceId
    || (li.taxProfile && typeof li.taxProfile === 'object' ? li.taxProfile.resourceId : null);
  if (tpId) clean.taxProfileResourceId = tpId;

  // Optional fields the PUT accepts
  if (li.itemResourceId) clean.itemResourceId = li.itemResourceId;
  if (li.discount != null) {
    // PUT expects a number (flat discount); GET returns { rateType, rateValue } object
    clean.discount = typeof li.discount === 'object' ? (li.discount.rateValue ?? 0) : li.discount;
  }

  return clean;
}

/**
 * Normalize a date from GET response format (ISO with time: "2026-02-27T00:00:00Z")
 * to PUT format (YYYY-MM-DD only). Returns as-is if already in YYYY-MM-DD format.
 */
function normalizeDate(date: string | undefined | null): string | undefined {
  if (!date) return undefined;
  return date.split('T')[0];
}

/**
 * Merge CLI flags into an existing draft's data for finalization.
 *
 * - `--account` sets accountResourceId on ALL line items where it's null
 * - `--tax-profile` sets taxProfileResourceId on ALL line items where it's null
 * - `--lines` replaces the entire lineItems array
 * - Other flags overwrite individual top-level fields
 */
export function mergeDraftFlags(
  existing: any,  // eslint-disable-line @typescript-eslint/no-explicit-any
  opts: {
    contact?: string;       // already resolved to UUID
    date?: string;
    due?: string;
    lines?: LineItem[];
    account?: string;       // already resolved to UUID
    taxProfile?: string;    // already resolved to UUID
    ref?: string;
    notes?: string;
    tag?: string;
    tax?: boolean;
    taxInclusive?: boolean;
  },
): Record<string, unknown> {
  const data: Record<string, unknown> = {};

  if (opts.contact) data.contactResourceId = opts.contact;
  if (opts.date) data.valueDate = opts.date;
  if (opts.due) data.dueDate = opts.due;
  if (opts.ref !== undefined) data.reference = opts.ref;
  if (opts.notes !== undefined) data.notes = opts.notes;
  if (opts.tag !== undefined) data.tag = opts.tag;
  if (opts.tax) data.isTaxVatApplicable = true;
  if (opts.tax && opts.taxInclusive) data.taxInclusion = true;
  else if (opts.tax) data.taxInclusion = false;

  // Line items: either full override or patch existing
  if (opts.lines) {
    data.lineItems = opts.lines;
  } else if (opts.account || opts.taxProfile) {
    // Patch existing line items — sanitize from GET shape, fill in missing accounts/tax profiles
    const items = existing.lineItems ?? [];
    data.lineItems = items.map((li: any) => {  // eslint-disable-line @typescript-eslint/no-explicit-any
      const patched = sanitizeLineItem(li);
      if (opts.account && !patched.accountResourceId) {
        patched.accountResourceId = opts.account;
      }
      if (opts.taxProfile && !patched.taxProfileResourceId) {
        patched.taxProfileResourceId = opts.taxProfile;
      }
      return patched;
    });
  }

  return data;
}

// ── Journal-Specific Helpers ──────────────────────────────────

/**
 * Sanitize a journal entry from GET response to PUT-compatible format.
 * Strips response-only fields (debitAmount, creditAmount, organizationAccountResourceId).
 */
function sanitizeJournalEntry(e: any): Record<string, unknown> {  // eslint-disable-line @typescript-eslint/no-explicit-any
  const clean: Record<string, unknown> = {};

  // Account: GET uses organizationAccountResourceId, PUT uses accountResourceId
  const acctId = e.accountResourceId || e.organizationAccountResourceId;
  if (acctId) clean.accountResourceId = acctId;

  // Amount/type: GET uses debitAmount/creditAmount, PUT uses amount+type
  if (e.amount != null) {
    clean.amount = e.amount;
  } else if (e.debitAmount != null && e.debitAmount > 0) {
    clean.amount = e.debitAmount;
  } else if (e.creditAmount != null && e.creditAmount > 0) {
    clean.amount = e.creditAmount;
  }
  if (e.type) {
    clean.type = e.type; // Already in PUT form (DEBIT or CREDIT)
  } else if (e.debitAmount != null && e.debitAmount > 0) {
    clean.type = 'DEBIT';
  } else if (e.creditAmount != null && e.creditAmount > 0) {
    clean.type = 'CREDIT';
  }

  if (e.description) clean.description = e.description;
  if (e.contactResourceId) clean.contactResourceId = e.contactResourceId;
  return clean;
}

/**
 * Register draft finalize flags specific to journals.
 * Journals use --entries (not --lines), have no --contact or --due.
 */
export function addJournalDraftFinalizeOptions(cmd: Command): Command {
  return cmd
    .option('--date <YYYY-MM-DD>', 'Set/override date (valueDate)')
    .option('--entries <json>', 'Override all journal entries (JSON array)', parseJournalEntries)
    .option('--account <name/uuid>', 'Set account on ALL entries missing it (fuzzy resolved)')
    .option('--ref <reference>', 'Set reference')
    .option('--notes <text>', 'Set notes')
    .option('--dry-run', 'Validate only — show what\'s present/missing, don\'t finalize')
    .option('--input <file>', 'Read full JSON override body from file (or pipe via stdin)')
    .option('--api-key <key>', 'API key (overrides stored/env)')
    .option('--json', 'Output as JSON');
}

/**
 * Merge CLI flags into an existing draft journal's data for finalization.
 * Journal version of mergeDraftFlags — uses journalEntries, no contact/dueDate.
 */
export function mergeJournalDraftFlags(
  existing: any,  // eslint-disable-line @typescript-eslint/no-explicit-any
  opts: {
    date?: string;
    entries?: Array<Record<string, unknown>>;
    account?: string;       // already resolved to UUID
    ref?: string;
    notes?: string;
  },
): Record<string, unknown> {
  const data: Record<string, unknown> = {};

  if (opts.date) data.valueDate = opts.date;
  if (opts.ref !== undefined) data.reference = opts.ref;
  if (opts.notes !== undefined) data.notes = opts.notes;

  // Journal entries: either full override or patch existing
  if (opts.entries) {
    data.journalEntries = opts.entries;
  } else if (opts.account) {
    // Patch existing entries — sanitize from GET shape, fill missing accounts
    const items = existing.journalEntries ?? [];
    data.journalEntries = items.map((e: any) => {  // eslint-disable-line @typescript-eslint/no-explicit-any
      const patched = sanitizeJournalEntry(e);
      if (opts.account && !patched.accountResourceId) {
        patched.accountResourceId = opts.account;
      }
      return patched;
    });
  }

  return data;
}

/** Exported for use in finalize command — converts GET response to PUT-safe body */
export { sanitizeLineItem, normalizeDate, sanitizeJournalEntry };
