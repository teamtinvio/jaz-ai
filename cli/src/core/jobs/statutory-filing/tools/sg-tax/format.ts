/**
 * Top-level dispatch for tax result formatting.
 * Routes to country-specific formatters.
 */

import type { TaxResult } from './types.js';
import { printFormCsResult, printCaResult } from './format-sg.js';

export function printTaxResult(result: TaxResult): void {
  switch (result.type) {
    case 'sg-form-cs': return printFormCsResult(result);
    case 'sg-capital-allowance': return printCaResult(result);
    default: {
      const _exhaustive: never = result;
      throw new Error(`Unknown tax result type: ${(_exhaustive as TaxResult).type}`);
    }
  }
}

export function printTaxJson(result: TaxResult): void {
  console.log(JSON.stringify(result, null, 2));
}
