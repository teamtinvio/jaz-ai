/**
 * Top-level dispatch for bank file generation.
 * Validates input, routes to format-specific generator.
 */

import type { BankFileInput, BankFileResult } from './types.js';
import { validateBankFileInput } from './validate.js';
import { generateDbsGiro } from './formats/dbs-giro.js';
import { generateOcbcGiro } from './formats/ocbc-giro.js';
import { generateUobGiro } from './formats/uob-giro.js';

/**
 * Generate a bank payment file from validated input.
 * Throws BankFileValidationError if input is invalid.
 */
export function generateBankFile(input: BankFileInput): BankFileResult {
  validateBankFileInput(input);

  switch (input.format) {
    case 'dbs-giro':  return generateDbsGiro(input);
    case 'ocbc-giro': return generateOcbcGiro(input);
    case 'uob-giro':  return generateUobGiro(input);
    default: {
      const _exhaustive: never = input.format;
      throw new Error(`Unknown bank file format: ${_exhaustive}`);
    }
  }
}
