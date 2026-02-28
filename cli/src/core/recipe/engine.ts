/**
 * Recipe execution engine — orchestrates the full recipe flow:
 * validate → capsule type → capsule → transactions → result.
 *
 * Two entry paths:
 * 1. Full: creates all steps from scratch.
 * 2. Attach: existing transaction as starting point, creates delta only.
 */

import type { JazClient } from '../api/client.js';
import type { JournalEntry, LineItem } from '../api/types.js';
import type { JournalLine, BlueprintStep } from '../calc/types.js';
import { createJournal } from '../api/journals.js';
import { createBill } from '../api/bills.js';
import { createInvoice } from '../api/invoices.js';
import { createCashIn, createCashOut } from '../api/cash-entries.js';
import { listCapsuleTypes, createCapsuleType, createCapsule } from '../api/capsules.js';
import type { RecipeInput, RecipeResult, StepResult, AccountMapping } from './types.js';
import { ATTACH_ACTION_MAP } from './types.js';

// ── Main entry point ─────────────────────────────────────────────

export async function executeRecipe(
  client: JazClient,
  input: RecipeInput,
): Promise<RecipeResult> {
  const { blueprint, accountMap, finalize } = input;
  const saveAsDraft = !finalize;

  // 1. Validate
  validateInputs(input);

  // 2. Resolve or create capsule type
  const capsuleTypeId = await resolveCapsuleType(client, blueprint.capsuleType);

  // 3. Create capsule
  const capsuleRes = await createCapsule(client, {
    capsuleTypeResourceId: capsuleTypeId,
    title: blueprint.capsuleName,
    description: blueprint.capsuleDescription,
  });
  const capsule = {
    resourceId: capsuleRes.data.resourceId,
    type: blueprint.capsuleType,
    title: blueprint.capsuleName,
  };

  // 4. Determine which step to skip (attach mode)
  const attachStepIndex = findAttachStep(input);

  // 5. Execute steps
  const steps: StepResult[] = [];
  const notes: string[] = [];

  for (const bpStep of blueprint.steps) {
    // Attach mode: skip the initial step
    if (bpStep.step === attachStepIndex) {
      steps.push({
        step: bpStep.step,
        action: bpStep.action,
        status: 'existing',
        resourceId: input.existingTxnId,
        description: bpStep.description,
      });
      continue;
    }

    // Fixed-asset and note steps can't be auto-created
    if (bpStep.action === 'fixed-asset' || bpStep.action === 'note') {
      steps.push({
        step: bpStep.step,
        action: bpStep.action,
        status: 'skipped',
        description: bpStep.description,
      });
      notes.push(`Step ${bpStep.step} (${bpStep.action}): ${bpStep.description}`);
      continue;
    }

    // Execute the step
    const result = await executeStep(client, bpStep, input, saveAsDraft);
    steps.push(result);
    if (result.error) {
      notes.push(`Step ${bpStep.step} failed: ${result.error}`);
    }
  }

  // 6. Summarize
  const summary = {
    total: steps.length,
    created: steps.filter((s) => s.status === 'created').length,
    existing: steps.filter((s) => s.status === 'existing').length,
    skipped: steps.filter((s) => s.status === 'skipped').length,
    errors: steps.filter((s) => s.status === 'error').length,
    notes,
  };

  return { recipe: input.calcType, capsule, steps, summary };
}

// ── Validation ───────────────────────────────────────────────────

function validateInputs(input: RecipeInput): void {
  const { blueprint, accountMap, bankAccountId, contactId } = input;

  if (!blueprint.steps.length) {
    throw new Error('Blueprint has no steps to execute.');
  }

  // Check all account names are mapped
  const unmapped: string[] = [];
  for (const step of blueprint.steps) {
    for (const line of step.lines) {
      const key = findMappedKey(line.account, accountMap);
      if (!key) unmapped.push(line.account);
    }
  }
  // Deduplicate
  const uniqueUnmapped = [...new Set(unmapped)];
  if (uniqueUnmapped.length > 0) {
    throw new Error(
      `Unmapped account(s) in --input: ${uniqueUnmapped.join(', ')}.\n` +
      'Add these to your account mapping JSON.',
    );
  }

  // Check bank account if needed (skip attached step — it already exists)
  const attachIdx = findAttachStep(input);
  const hasNonAttachedCashStep = blueprint.steps.some(
    (s) => (s.action === 'cash-in' || s.action === 'cash-out') && s.step !== attachIdx,
  );
  if (hasNonAttachedCashStep && !bankAccountId) {
    throw new Error('--bank-account is required for recipes with cash-in/cash-out steps.');
  }

  // Check contact if needed
  const hasNonAttachedContactStep = blueprint.steps.some(
    (s) => (s.action === 'bill' || s.action === 'invoice') && s.step !== attachIdx,
  );
  if (hasNonAttachedContactStep && !contactId) {
    throw new Error(
      '--contact is required for recipes with bill/invoice steps.',
    );
  }
}

// ── Capsule Type Resolution ──────────────────────────────────────

async function resolveCapsuleType(
  client: JazClient,
  displayName: string,
): Promise<string> {
  const types = await listCapsuleTypes(client);
  const match = types.data.find(
    (t) => t.displayName.toLowerCase() === displayName.toLowerCase(),
  );
  if (match) return match.resourceId;

  const created = await createCapsuleType(client, { displayName });
  return created.data.resourceId;
}

// ── Attach Step Detection ────────────────────────────────────────

function findAttachStep(input: RecipeInput): number | null {
  if (!input.existingTxnId) return null;

  const expectedActions = ATTACH_ACTION_MAP[input.calcType];
  if (!expectedActions) return null;

  // Find the first step matching any of the accepted attach actions
  const step = input.blueprint.steps.find((s) => expectedActions.includes(s.action));
  return step?.step ?? null;
}

// ── Step Execution ───────────────────────────────────────────────

async function executeStep(
  client: JazClient,
  step: BlueprintStep,
  input: RecipeInput,
  saveAsDraft: boolean,
): Promise<StepResult> {
  const { accountMap, referencePrefix } = input;
  const ref = referencePrefix ? `${referencePrefix}-${step.step}` : undefined;

  try {
    let resourceId: string | undefined;

    switch (step.action) {
      case 'journal': {
        const res = await createJournal(client, {
          reference: ref,
          valueDate: step.date!,
          journalEntries: mapLinesToEntries(step.lines, accountMap),
          notes: step.description,
          saveAsDraft,
        });
        resourceId = res.data.resourceId;
        break;
      }
      case 'bill': {
        const res = await createBill(client, {
          reference: ref,
          valueDate: step.date!,
          dueDate: step.date!,
          contactResourceId: input.contactId!,
          lineItems: linesToLineItems(step.lines, accountMap),
          notes: step.description,
          saveAsDraft,
        });
        resourceId = res.data.resourceId;
        break;
      }
      case 'invoice': {
        const res = await createInvoice(client, {
          reference: ref,
          valueDate: step.date!,
          dueDate: step.date!,
          contactResourceId: input.contactId!,
          lineItems: linesToLineItems(step.lines, accountMap),
          notes: step.description,
          saveAsDraft,
        });
        resourceId = res.data.resourceId;
        break;
      }
      case 'cash-in': {
        const { contraLines } = splitBankLine(step.lines, input.bankAccountId!, accountMap);
        const res = await createCashIn(client, {
          reference: ref,
          valueDate: step.date!,
          accountResourceId: input.bankAccountId!,
          journalEntries: mapLinesToEntries(contraLines, accountMap),
          notes: step.description,
          saveAsDraft,
        });
        resourceId = (res.data as { resourceId?: string })?.resourceId;
        break;
      }
      case 'cash-out': {
        const { contraLines } = splitBankLine(step.lines, input.bankAccountId!, accountMap);
        const res = await createCashOut(client, {
          reference: ref,
          valueDate: step.date!,
          accountResourceId: input.bankAccountId!,
          journalEntries: mapLinesToEntries(contraLines, accountMap),
          notes: step.description,
          saveAsDraft,
        });
        resourceId = (res.data as { resourceId?: string })?.resourceId;
        break;
      }
      default:
        return {
          step: step.step,
          action: step.action,
          status: 'skipped',
          description: step.description,
        };
    }

    return {
      step: step.step,
      action: step.action,
      status: 'created',
      resourceId,
      description: step.description,
    };
  } catch (err) {
    return {
      step: step.step,
      action: step.action,
      status: 'error',
      description: step.description,
      error: (err as Error).message,
    };
  }
}

// ── Line Conversion Helpers ──────────────────────────────────────

/** Convert blueprint JournalLine[] to API JournalEntry[]. */
function mapLinesToEntries(
  lines: JournalLine[],
  accountMap: AccountMapping,
): JournalEntry[] {
  return lines.map((line) => ({
    accountResourceId: resolveAccount(line.account, accountMap),
    type: (line.debit > 0 ? 'DEBIT' : 'CREDIT') as 'DEBIT' | 'CREDIT',
    amount: line.debit > 0 ? line.debit : line.credit,
  }));
}

/**
 * Convert blueprint lines to bill/invoice LineItem[].
 * For bills: the credit line (AP) is implicit — include only debit lines.
 * For invoices: the debit line (AR) is implicit — include only credit lines.
 * Since we don't know which side is control from here, include all mapped lines.
 * The API will assign the control side automatically.
 */
function linesToLineItems(
  lines: JournalLine[],
  accountMap: AccountMapping,
): LineItem[] {
  // For a bill step, include only the debit side (the expense/asset account)
  // For an invoice step, include only the credit side (the revenue/liability account)
  // The AP/AR control account is handled by the API automatically.
  // Convention: the line with amount > 0 on the "meaningful" side is the line item.
  return lines
    .filter((line) => findMappedKey(line.account, accountMap))
    .map((line) => ({
      name: line.account,
      quantity: 1,
      unitPrice: line.debit > 0 ? line.debit : line.credit,
      accountResourceId: resolveAccount(line.account, accountMap),
    }));
}

/**
 * Split blueprint lines into the bank account line and contra lines.
 * The bank line is the one whose mapped resourceId matches bankAccountId.
 */
function splitBankLine(
  lines: JournalLine[],
  bankAccountId: string,
  accountMap: AccountMapping,
): { bankLine: JournalLine; contraLines: JournalLine[] } {
  const contraLines: JournalLine[] = [];
  let bankLine: JournalLine | null = null;

  for (const line of lines) {
    const mappedId = resolveAccount(line.account, accountMap);
    if (mappedId === bankAccountId && !bankLine) {
      bankLine = line;
    } else {
      contraLines.push(line);
    }
  }

  if (!bankLine) {
    // Fallback: if no line maps to the bank account, use all lines as contra
    return { bankLine: lines[0], contraLines: lines.slice(1) };
  }

  return { bankLine, contraLines };
}

/** Case-insensitive account name lookup in the mapping. */
function findMappedKey(
  accountName: string,
  accountMap: AccountMapping,
): string | null {
  // Exact match first
  if (accountMap[accountName]) return accountName;
  // Case-insensitive
  const lower = accountName.toLowerCase();
  for (const key of Object.keys(accountMap)) {
    if (key.toLowerCase() === lower) return key;
  }
  return null;
}

/** Resolve an account name to a resourceId via the mapping. */
function resolveAccount(
  accountName: string,
  accountMap: AccountMapping,
): string {
  const key = findMappedKey(accountName, accountMap);
  if (!key) {
    throw new Error(`Unmapped account: "${accountName}"`);
  }
  return accountMap[key];
}
