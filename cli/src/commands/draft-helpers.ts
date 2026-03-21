/**
 * CLI draft finalization helpers — re-exports core logic + adds chalk/Commander UI.
 *
 * Core business logic (validation, sanitization, merge) lives in src/core/drafts/
 * and is shared by CLI, MCP, and daemon. This file adds:
 *   - formatDraftTable() — human-readable chalk table
 *   - addDraftFinalizeOptions() — Commander flag registration
 *   - addJournalDraftFinalizeOptions() — Commander flag registration (journals)
 */

import type { Command } from 'commander';
import { danger, success, warning, muted, highlight } from './ui/theme.js';
import { parseLineItems, parseJournalEntries } from './parsers.js';

// ── Re-export core logic (preserves import paths for all existing consumers) ──
export {
  // Types
  type DraftFieldSpec,
  type FieldValidation,
  type LineItemValidation,
  type DraftValidation,
  type DraftReport,
  // Field specs
  BILL_REQUIRED_FIELDS,
  INVOICE_REQUIRED_FIELDS,
  CREDIT_NOTE_REQUIRED_FIELDS,
  JOURNAL_REQUIRED_FIELDS,
  // Validation
  validateDraft,
  buildValidation,
  buildDraftReport,
  // Sanitization
  sanitizeLineItem,
  sanitizeJournalEntry,
  normalizeDate,
  // Merge
  mergeDraftFlags,
  mergeJournalDraftFlags,
} from '../core/drafts/index.js';

import type { DraftReport, FieldValidation } from '../core/drafts/index.js';

// ── Human-Readable Formatting ───────────────────────────────────

export function formatDraftTable(label: string, drafts: DraftReport[]): void {
  const readyCount = drafts.filter((d) => d.ready).length;
  const needsAttention = drafts.length - readyCount;

  if (drafts.length === 0) {
    console.log(`No draft ${label.toLowerCase()} found.`);
    return;
  }

  const summary = readyCount === drafts.length
    ? success(`${drafts.length} drafts, all ready`)
    : `${drafts.length} drafts, ${success(`${readyCount} ready`)}, ${warning(`${needsAttention} need attention`)}`;
  console.log(highlight(`Draft ${label} — ${summary}\n`));

  for (let idx = 0; idx < drafts.length; idx++) {
    const d = drafts[idx];
    const ref = d.reference || '(no ref)';
    const amount = d.totalAmount > 0 ? `$${d.totalAmount.toFixed(2)}` : '$0.00';
    const shortId = d.resourceId.length > 12 ? d.resourceId.slice(0, 8) + '-...' : d.resourceId;

    console.log(`  ${highlight(`${idx + 1}.`)} ${ref} ${muted(`(${shortId})`)}  ${muted(amount)}`);

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
        ? success('✓')
        : danger('MISSING');
      console.log(`     Line ${li.index + 1}:  ${name} — ${price} — account: ${acctStatus}`);
    }

    // Attachments
    const attachLabel = d.attachmentCount > 0
      ? `${d.attachmentCount} file${d.attachmentCount > 1 ? 's' : ''}`
      : 'none';
    console.log(`     Attach:  ${muted(attachLabel)}`);

    // Summary
    if (d.ready) {
      console.log(success('     ✓ READY TO FINALIZE'));
    } else {
      const hints = uniqueHints(d);
      console.error(warning(`     → ${d.missingCount} issue${d.missingCount > 1 ? 's' : ''}: ${hints}`));
    }
    console.log('');
  }
}

function formatFieldLine(label: string, fv: FieldValidation): void {
  const padLabel = label.padEnd(8);
  if (fv.status === 'ok') {
    const display = fv.value != null ? String(fv.value) : '';
    console.log(`     ${padLabel} ${display}  ${success('✓')}`);
  } else {
    console.log(`     ${padLabel} ${danger('MISSING')}`);
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
