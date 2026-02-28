/**
 * Types for clio recipe — full transaction recipe execution.
 */

import type { Blueprint, CalcResult } from '../calc/types.js';

// ── Account Mapping ──────────────────────────────────────────────

/** Maps blueprint account names to API accountResourceIds. */
export interface AccountMapping {
  [blueprintAccountName: string]: string;
}

// ── Recipe Input ─────────────────────────────────────────────────

export interface RecipeInput {
  blueprint: Blueprint;
  calcType: string;
  accountMap: AccountMapping;
  bankAccountId?: string;
  contactId?: string;
  existingTxnId?: string;
  referencePrefix?: string;
  finalize?: boolean;
}

// ── Recipe Output ────────────────────────────────────────────────

export interface StepResult {
  step: number;
  action: string;
  status: 'created' | 'existing' | 'skipped' | 'error';
  resourceId?: string;
  description: string;
  error?: string;
}

export interface RecipeResult {
  recipe: string;
  capsule: { resourceId: string; type: string; title: string };
  steps: StepResult[];
  summary: {
    total: number;
    created: number;
    existing: number;
    skipped: number;
    errors: number;
    notes: string[];
  };
}

// ── Recipe Plan (offline) ────────────────────────────────────────

export interface RecipePlan {
  recipe: string;
  plan: {
    capsuleType: string;
    capsuleName: string;
    capsuleDescription: string;
    requiredAccounts: string[];
    needsBankAccount: boolean;
    needsContact: boolean;
    steps: { total: number; byAction: Record<string, number> };
  };
  calculator: CalcResult;
}

// ── Attach type map (recipe → accepted initial step actions) ─────
// Prepaid can start from bill OR cash-out (direct payment).
// Deferred revenue can start from invoice OR cash-in (direct receipt).

export const ATTACH_ACTION_MAP: Record<string, string[]> = {
  'loan': ['cash-in'],
  'lease': ['journal'],
  'prepaid-expense': ['bill', 'cash-out'],
  'deferred-revenue': ['invoice', 'cash-in'],
  'provision': ['journal'],
  'fixed-deposit': ['cash-out'],
  'accrued-expense': ['journal'],
  'dividend': ['journal'],
};
