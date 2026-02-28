/**
 * Blueprint builder — translates calculator output into a
 * capsule + transaction execution plan for Jaz.
 *
 * The blueprint gives an AI agent or human everything needed to
 * create the capsule and post all journal entries in Jaz without
 * any manual translation from the schedule.
 */

import type { JournalLine } from './types.js';

export interface BlueprintStep {
  step: number;
  action: 'journal' | 'bill' | 'invoice' | 'cash-out' | 'cash-in' | 'fixed-asset' | 'note';
  description: string;
  date: string | null;
  lines: JournalLine[];
}

export interface Blueprint {
  capsuleType: string;
  capsuleName: string;
  capsuleDescription: string;
  tags: string[];
  customFields: Record<string, string | null>;
  steps: BlueprintStep[];
}

/** Build a blueprint step from a journal entry with a date. */
export function journalStep(
  stepNum: number,
  description: string,
  date: string | null,
  lines: JournalLine[],
): BlueprintStep {
  return { step: stepNum, action: 'journal', description, date, lines };
}

/** Build a bill step (create supplier bill, e.g. prepaid expense). Lines show net accounting effect. */
export function billStep(
  stepNum: number,
  description: string,
  date: string | null,
  lines: JournalLine[],
): BlueprintStep {
  return { step: stepNum, action: 'bill', description, date, lines };
}

/** Build an invoice step (create customer invoice, e.g. deferred revenue). Lines show net accounting effect. */
export function invoiceStep(
  stepNum: number,
  description: string,
  date: string | null,
  lines: JournalLine[],
): BlueprintStep {
  return { step: stepNum, action: 'invoice', description, date, lines };
}

/** Build a cash-out step (cash disbursement, e.g. deposit placement). */
export function cashOutStep(
  stepNum: number,
  description: string,
  date: string | null,
  lines: JournalLine[],
): BlueprintStep {
  return { step: stepNum, action: 'cash-out', description, date, lines };
}

/** Build a cash-in step (cash receipt, e.g. deposit maturity). */
export function cashInStep(
  stepNum: number,
  description: string,
  date: string | null,
  lines: JournalLine[],
): BlueprintStep {
  return { step: stepNum, action: 'cash-in', description, date, lines };
}

/** Build a fixed-asset registration step (e.g. register ROU asset in FA module). */
export function fixedAssetStep(
  stepNum: number,
  description: string,
  date: string | null = null,
): BlueprintStep {
  return { step: stepNum, action: 'fixed-asset', description, date, lines: [] };
}

/** Build a note step (instruction, not a journal — e.g. "update FA register"). */
export function noteStep(
  stepNum: number,
  description: string,
  date: string | null = null,
): BlueprintStep {
  return { step: stepNum, action: 'note', description, date, lines: [] };
}

/** Format a currency amount for capsule names (e.g. "SGD 100,000"). */
export function fmtCapsuleAmount(amount: number, currency?: string): string {
  const formatted = amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  return currency ? `${currency} ${formatted}` : formatted;
}

/** Format a currency amount for workings text (e.g. "SGD 100,000.00"). */
export function fmtAmt(amount: number, currency?: string | null): string {
  const formatted = amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return currency ? `${currency} ${formatted}` : formatted;
}
