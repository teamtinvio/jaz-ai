/**
 * Recipe plan extraction — offline, no API calls.
 * Analyzes a CalcResult to produce a RecipePlan that tells the agent
 * exactly what accounts, contacts, and bank accounts are needed.
 */

import type { CalcResult, Blueprint, BlueprintStep } from '../calc/types.js';
import type { RecipePlan } from './types.js';

const CASH_ACTIONS = new Set(['cash-in', 'cash-out']);
const CONTACT_ACTIONS = new Set(['bill', 'invoice']);

/**
 * Extract a RecipePlan from a CalcResult.
 * Throws if the result has no blueprint (missing --start-date).
 */
export function planRecipe(calcType: string, result: CalcResult): RecipePlan {
  const blueprint = extractBlueprint(result);
  if (!blueprint) {
    throw new Error(
      'No blueprint available. Provide --start-date to generate a blueprint with dated steps.',
    );
  }

  const requiredAccounts = collectUniqueAccounts(blueprint.steps);
  const byAction = countByAction(blueprint.steps);

  return {
    recipe: calcType,
    plan: {
      capsuleType: blueprint.capsuleType,
      capsuleName: blueprint.capsuleName,
      capsuleDescription: blueprint.capsuleDescription,
      requiredAccounts,
      needsBankAccount: blueprint.steps.some((s) => CASH_ACTIONS.has(s.action)),
      needsContact: blueprint.steps.some((s) => CONTACT_ACTIONS.has(s.action)),
      steps: { total: blueprint.steps.length, byAction },
    },
    calculator: result,
  };
}

/** Extract blueprint from any CalcResult variant. */
export function extractBlueprint(result: CalcResult): Blueprint | null {
  if ('blueprint' in result) return result.blueprint;
  return null;
}

/** Collect unique account names from all step lines, preserving order. */
function collectUniqueAccounts(steps: BlueprintStep[]): string[] {
  const seen = new Set<string>();
  const accounts: string[] = [];
  for (const step of steps) {
    for (const line of step.lines) {
      if (!seen.has(line.account)) {
        seen.add(line.account);
        accounts.push(line.account);
      }
    }
  }
  return accounts;
}

/** Count steps by action type. */
function countByAction(steps: BlueprintStep[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const step of steps) {
    counts[step.action] = (counts[step.action] ?? 0) + 1;
  }
  return counts;
}
