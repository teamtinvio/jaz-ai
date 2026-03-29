/**
 * Draft merge — combines override flags with existing draft data.
 *
 * Used to fill in missing fields before finalization.
 * Pure logic — no CLI dependencies.
 */

import type { LineItem } from '../api/types.js';
import { sanitizeLineItem, sanitizeJournalEntry } from './sanitize.js';

/**
 * Merge flags into an existing draft's data for finalization.
 *
 * - `account` sets accountResourceId on ALL line items where it's null
 * - `taxProfile` sets taxProfileResourceId on ALL line items where it's null
 * - `lines` replaces the entire lineItems array
 * - Other fields overwrite individual top-level fields
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

/**
 * Merge flags into an existing draft journal's data for finalization.
 * Journal version — uses journalEntries, no contact/dueDate.
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
