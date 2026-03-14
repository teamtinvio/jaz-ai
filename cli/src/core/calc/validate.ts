/**
 * Input validation for clio calc financial calculators.
 * Throws CalcValidationError with user-friendly messages.
 */

import type { BankMatchInput } from './types.js';

export class CalcValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CalcValidationError';
  }
}

export function validatePositive(value: number, name: string): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new CalcValidationError(`${name} must be a positive number (got ${value})`);
  }
}

export function validateNonNegative(value: number, name: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new CalcValidationError(`${name} must be zero or positive (got ${value})`);
  }
}

export function validatePositiveInteger(value: number, name: string): void {
  if (!Number.isInteger(value) || value < 1) {
    throw new CalcValidationError(`${name} must be a positive integer (got ${value})`);
  }
}

export function validateSalvageLessThanCost(salvage: number, cost: number): void {
  if (salvage >= cost) {
    throw new CalcValidationError(`Salvage value (${salvage}) must be less than cost (${cost})`);
  }
}

export function validateDateFormat(date: string | undefined): void {
  if (!date) return;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new CalcValidationError(`Date must be YYYY-MM-DD format (got "${date}")`);
  }
  const d = new Date(date + 'T00:00:00');
  if (isNaN(d.getTime())) {
    throw new CalcValidationError(`Invalid date: "${date}"`);
  }
}

export function validateRate(rate: number, name = 'Rate'): void {
  validateNonNegative(rate, name);
  if (rate > 100) {
    // Warning only — rates >100% are rare but legal (e.g. hyperinflation)
    process.stderr.write(`Warning: ${name} is ${rate}% — are you sure this isn't a decimal? (e.g. 6 for 6%, not 0.06)\n`);
  }
}

// ── Bank match validation ──────────────────────────────────────

export function validateBankMatchInput(input: unknown): BankMatchInput {
  if (!input || typeof input !== 'object') {
    throw new CalcValidationError('Input must be a JSON object with bankRecords and transactions arrays');
  }

  const obj = input as Record<string, unknown>;

  if (!Array.isArray(obj.bankRecords)) {
    throw new CalcValidationError('bankRecords must be an array');
  }
  if (!Array.isArray(obj.transactions)) {
    throw new CalcValidationError('transactions must be an array');
  }
  if (obj.bankRecords.length === 0) {
    throw new CalcValidationError('bankRecords array is empty — nothing to match');
  }
  if (obj.transactions.length === 0) {
    throw new CalcValidationError('transactions array is empty — nothing to match');
  }

  // Validate each bank record
  for (let i = 0; i < obj.bankRecords.length; i++) {
    const r = obj.bankRecords[i] as Record<string, unknown>;
    if (!r.id || typeof r.id !== 'string') {
      throw new CalcValidationError(`bankRecords[${i}]: id is required (string)`);
    }
    if (typeof r.amount !== 'number' || !Number.isFinite(r.amount as number)) {
      throw new CalcValidationError(`bankRecords[${i}]: amount must be a finite number`);
    }
    if ((r.amount as number) === 0) {
      throw new CalcValidationError(`bankRecords[${i}]: amount must not be zero`);
    }
    if (!r.date || typeof r.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(r.date)) {
      throw new CalcValidationError(`bankRecords[${i}]: date must be YYYY-MM-DD format`);
    }
  }

  // Validate each transaction
  for (let i = 0; i < obj.transactions.length; i++) {
    const t = obj.transactions[i] as Record<string, unknown>;
    if (!t.id || typeof t.id !== 'string') {
      throw new CalcValidationError(`transactions[${i}]: id is required (string)`);
    }
    if (t.direction !== 'PAYIN' && t.direction !== 'PAYOUT') {
      throw new CalcValidationError(`transactions[${i}]: direction must be 'PAYIN' or 'PAYOUT'`);
    }
    if (typeof t.amount !== 'number' || !Number.isFinite(t.amount as number) || (t.amount as number) <= 0) {
      throw new CalcValidationError(`transactions[${i}]: amount must be a positive number`);
    }
    if (!t.date || typeof t.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(t.date)) {
      throw new CalcValidationError(`transactions[${i}]: date must be YYYY-MM-DD format`);
    }
    if (t.crossCurrency) {
      if (!t.currency || typeof t.currency !== 'string') {
        throw new CalcValidationError(`transactions[${i}]: crossCurrency is true but currency is missing`);
      }
    }
  }

  // Validate options if present
  const options = obj.options as Record<string, unknown> | undefined;
  if (options) {
    if (options.tolerance !== undefined) {
      if (typeof options.tolerance !== 'number' || (options.tolerance as number) < 0) {
        throw new CalcValidationError('options.tolerance must be a non-negative number');
      }
    }
    if (options.dateWindowDays !== undefined) {
      if (typeof options.dateWindowDays !== 'number' || !Number.isInteger(options.dateWindowDays) || (options.dateWindowDays as number) < 0) {
        throw new CalcValidationError('options.dateWindowDays must be a non-negative integer');
      }
    }
    if (options.maxGroupSize !== undefined) {
      if (typeof options.maxGroupSize !== 'number' || !Number.isInteger(options.maxGroupSize) || (options.maxGroupSize as number) < 2 || (options.maxGroupSize as number) > 10) {
        throw new CalcValidationError('options.maxGroupSize must be an integer between 2 and 10');
      }
    }
  }

  // Validate cross-currency exchange rates
  const exchangeRates = options?.exchangeRates as Record<string, number> | undefined;
  for (let i = 0; i < obj.transactions.length; i++) {
    const t = obj.transactions[i] as Record<string, unknown>;
    if (t.crossCurrency && t.currency) {
      if (!exchangeRates || typeof exchangeRates[t.currency as string] !== 'number') {
        throw new CalcValidationError(
          `transactions[${i}]: crossCurrency is true with currency "${t.currency}" but no exchange rate provided in options.exchangeRates`
        );
      }
    }
  }

  return input as BankMatchInput;
}
