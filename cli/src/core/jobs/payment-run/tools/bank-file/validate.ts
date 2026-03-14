/**
 * Input validation for clio jobs payment-run bank-file.
 * Throws BankFileValidationError with user-friendly messages.
 */

import type {
  BankFileInput,
  BankFilePayee,
  BankFormat,
  DbsProductType,
  OcbcClearingType,
  UobPaymentMethod,
} from './types.js';
import {
  BANK_FORMATS,
  DBS_PRODUCT_TYPES,
  OCBC_CLEARING_TYPES,
  UOB_PAYMENT_METHODS,
  UOB_PAYNOW_METHODS,
} from './types.js';

export class BankFileValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BankFileValidationError';
  }
}

// ── Primitive validators ─────────────────────────────────────────

function requireString(value: unknown, name: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new BankFileValidationError(`${name} is required and must be a non-empty string`);
  }
  return value.trim();
}

function requirePositiveNumber(value: unknown, name: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    throw new BankFileValidationError(`${name} must be a positive number (got ${value})`);
  }
  return value;
}

function requireNonNegativeNumber(value: unknown, name: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new BankFileValidationError(`${name} must be zero or positive (got ${value})`);
  }
  return value;
}

function validateDateFormat(date: string, name: string): void {
  const m = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) {
    throw new BankFileValidationError(`${name} must be YYYY-MM-DD format (got "${date}")`);
  }
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const da = Number(m[3]);
  const d = new Date(Date.UTC(y, mo - 1, da));
  if (d.getUTCFullYear() !== y || d.getUTCMonth() !== mo - 1 || d.getUTCDate() !== da) {
    throw new BankFileValidationError(`Invalid date for ${name}: "${date}"`);
  }
}

function validateAmountPrecision(amount: number, name: string): void {
  // Integer-math check: amount * 100 must be an integer (within epsilon)
  const scaled = amount * 100;
  if (Math.abs(scaled - Math.round(scaled)) > 1e-8) {
    throw new BankFileValidationError(
      `${name} must have at most 2 decimal places (got ${amount})`
    );
  }
}

// ── Format-specific validators ───────────────────────────────────

function validateDbsOptions(input: BankFileInput): void {
  if (!input.dbs) {
    throw new BankFileValidationError(
      'dbs options are required when format is "dbs-giro". Include dbs.productType (BPY, GPP, or PPY)'
    );
  }

  if (!DBS_PRODUCT_TYPES.includes(input.dbs.productType)) {
    throw new BankFileValidationError(
      `dbs.productType must be one of: ${DBS_PRODUCT_TYPES.join(', ')} (got "${input.dbs.productType}")`
    );
  }

  requireString(input.originator.organizationId, 'originator.organizationId (required for DBS)');
  if (input.originator.organizationId!.length > 12) {
    throw new BankFileValidationError(
      `originator.organizationId must be at most 12 characters for DBS (got ${input.originator.organizationId!.length})`
    );
  }

  if (input.dbs.chargeBearer && !['OUR', 'BEN', 'SHA'].includes(input.dbs.chargeBearer)) {
    throw new BankFileValidationError(
      `dbs.chargeBearer must be OUR, BEN, or SHA (got "${input.dbs.chargeBearer}")`
    );
  }

  if (input.batch.batchId !== undefined) {
    if (!Number.isInteger(input.batch.batchId) || input.batch.batchId < 1 || input.batch.batchId > 99999) {
      throw new BankFileValidationError(
        `batch.batchId must be an integer 1–99999 for DBS (got ${input.batch.batchId})`
      );
    }
  }

  // DBS amount limit: 9(9).9(2) = 999,999,999.99
  for (let i = 0; i < input.payees.length; i++) {
    if (input.payees[i].amount > 999_999_999.99) {
      throw new BankFileValidationError(
        `payees[${i}].amount exceeds DBS limit of 999,999,999.99 (got ${input.payees[i].amount})`
      );
    }
  }

  // PPY requires proxy on every payee
  if (input.dbs.productType === 'PPY') {
    for (let i = 0; i < input.payees.length; i++) {
      const p = input.payees[i];
      if (!p.proxyType || !p.proxyValue) {
        throw new BankFileValidationError(
          `payees[${i}]: proxyType and proxyValue are required for DBS PPY (PayNow GIRO)`
        );
      }
    }
  }
}

function validateOcbcOptions(input: BankFileInput): void {
  if (!input.ocbc) {
    throw new BankFileValidationError(
      'ocbc options are required when format is "ocbc-giro". Include ocbc.clearing (GIRO or FAST)'
    );
  }

  if (!OCBC_CLEARING_TYPES.includes(input.ocbc.clearing)) {
    throw new BankFileValidationError(
      `ocbc.clearing must be one of: ${OCBC_CLEARING_TYPES.join(', ')} (got "${input.ocbc.clearing}")`
    );
  }

  if (input.ocbc.batchNumber !== undefined) {
    if (!/^\d{1,3}$/.test(input.ocbc.batchNumber)) {
      throw new BankFileValidationError(
        `ocbc.batchNumber must be 1–3 digits (got "${input.ocbc.batchNumber}")`
      );
    }
  }

  if (input.ocbc.chargeBearer && !['DEBT', 'CRED', 'SHAR', 'SLEV'].includes(input.ocbc.chargeBearer)) {
    throw new BankFileValidationError(
      `ocbc.chargeBearer must be DEBT, CRED, SHAR, or SLEV (got "${input.ocbc.chargeBearer}")`
    );
  }

  // OCBC amount limit: 17 digits in cents = 999,999,999,999,999.99
  for (let i = 0; i < input.payees.length; i++) {
    if (input.payees[i].amount > 999_999_999_999_999.99) {
      throw new BankFileValidationError(
        `payees[${i}].amount exceeds OCBC limit of 999,999,999,999,999.99 (got ${input.payees[i].amount})`
      );
    }
  }
}

function validateUobOptions(input: BankFileInput): void {
  if (!input.uob) {
    throw new BankFileValidationError(
      'uob options are required when format is "uob-giro". Include uob.paymentMethod (IBG, IBGPN, IBGX, IBGXPN, FAST, or FASTPN)'
    );
  }

  if (!UOB_PAYMENT_METHODS.includes(input.uob.paymentMethod)) {
    throw new BankFileValidationError(
      `uob.paymentMethod must be one of: ${UOB_PAYMENT_METHODS.join(', ')} (got "${input.uob.paymentMethod}")`
    );
  }

  requireString(input.originator.organizationId, 'originator.organizationId (required for UOB Company ID)');
  if (input.originator.organizationId!.length > 12) {
    throw new BankFileValidationError(
      `originator.organizationId must be at most 12 characters for UOB (got ${input.originator.organizationId!.length})`
    );
  }

  if (input.uob.fileSequence !== undefined) {
    if (!Number.isInteger(input.uob.fileSequence) || input.uob.fileSequence < 1 || input.uob.fileSequence > 999) {
      throw new BankFileValidationError(
        `uob.fileSequence must be an integer 1–999 (got ${input.uob.fileSequence})`
      );
    }
  }

  if (input.uob.categoryPurposeCode && !['SALA', 'COLL'].includes(input.uob.categoryPurposeCode)) {
    throw new BankFileValidationError(
      `uob.categoryPurposeCode must be SALA or COLL (got "${input.uob.categoryPurposeCode}")`
    );
  }

  // UOB currency must be SGD for GIRO methods
  const currency = input.originator.currency ?? 'SGD';
  const giroMethods: UobPaymentMethod[] = ['IBG', 'IBGPN', 'IBGX', 'IBGXPN'];
  if (giroMethods.includes(input.uob.paymentMethod) && currency !== 'SGD') {
    throw new BankFileValidationError(
      `UOB GIRO methods (${giroMethods.join(', ')}) require SGD currency (got "${currency}")`
    );
  }

  // PayNow methods require proxy on every payee
  if (UOB_PAYNOW_METHODS.includes(input.uob.paymentMethod)) {
    for (let i = 0; i < input.payees.length; i++) {
      const p = input.payees[i];
      if (!p.proxyType || !p.proxyValue) {
        throw new BankFileValidationError(
          `payees[${i}]: proxyType and proxyValue are required for UOB ${input.uob.paymentMethod} (PayNow)`
        );
      }
    }
  }
}

// ── Payee validator ──────────────────────────────────────────────

function validatePayee(payee: BankFilePayee, index: number): void {
  requireString(payee.name, `payees[${index}].name`);
  requireString(payee.accountNumber, `payees[${index}].accountNumber`);
  requireString(payee.bankCode, `payees[${index}].bankCode`);
  requirePositiveNumber(payee.amount, `payees[${index}].amount`);
  validateAmountPrecision(payee.amount, `payees[${index}].amount`);

  if (payee.currency && typeof payee.currency !== 'string') {
    throw new BankFileValidationError(`payees[${index}].currency must be a string`);
  }
}

// ── Top-level validator ──────────────────────────────────────────

/** Validate the full BankFileInput structure. Throws BankFileValidationError on failure. */
export function validateBankFileInput(input: BankFileInput): void {
  // Format
  if (!BANK_FORMATS.includes(input.format)) {
    throw new BankFileValidationError(
      `format must be one of: ${BANK_FORMATS.join(', ')} (got "${input.format}")`
    );
  }

  // Originator
  if (!input.originator || typeof input.originator !== 'object') {
    throw new BankFileValidationError('originator is required');
  }
  requireString(input.originator.accountNumber, 'originator.accountNumber');
  requireString(input.originator.accountName, 'originator.accountName');

  // Batch
  if (!input.batch || typeof input.batch !== 'object') {
    throw new BankFileValidationError('batch is required');
  }
  requireString(input.batch.valueDate, 'batch.valueDate');
  validateDateFormat(input.batch.valueDate, 'batch.valueDate');

  // Payees
  if (!Array.isArray(input.payees) || input.payees.length === 0) {
    throw new BankFileValidationError('At least one payee is required');
  }

  for (let i = 0; i < input.payees.length; i++) {
    validatePayee(input.payees[i], i);
  }

  // Format-specific validation
  switch (input.format) {
    case 'dbs-giro':  validateDbsOptions(input); break;
    case 'ocbc-giro': validateOcbcOptions(input); break;
    case 'uob-giro':  validateUobOptions(input); break;
  }
}

// ── Structural validation from raw JSON ──────────────────────────

/** Validate and cast raw parsed JSON into BankFileInput. */
export function validateRawInput(raw: unknown): BankFileInput {
  if (!raw || typeof raw !== 'object') {
    throw new BankFileValidationError('Input must be a JSON object');
  }

  const obj = raw as Record<string, unknown>;

  if (!obj.format) {
    throw new BankFileValidationError(
      'No bank format specified. Use a format flag: --dbs-giro, --ocbc-giro, or --uob-giro'
    );
  }

  if (!obj.originator || typeof obj.originator !== 'object') {
    throw new BankFileValidationError('Missing "originator" object');
  }

  if (!obj.batch || typeof obj.batch !== 'object') {
    throw new BankFileValidationError('Missing "batch" object');
  }

  if (!Array.isArray(obj.payees)) {
    throw new BankFileValidationError('Missing "payees" array');
  }

  // Cast and run full validation
  const input = raw as BankFileInput;
  validateBankFileInput(input);
  return input;
}
