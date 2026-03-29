/**
 * OCBC GIRO/FAST WITH INV v1.5 — fixed-width (1000 chars/record) bank file generator.
 *
 * Record types:
 *   Header (Transaction Type Code "10" for Payment)
 *   Detail (one per payee)
 *   Invoice Detail (optional "INV" records after each detail)
 *
 * Spec: "GIRO_FAST WITH INV_V1.5 (With PayNow).pdf"
 * Key rules:
 *   - Every record is exactly 1000 characters, padded with spaces
 *   - Amount in CENTS, 17 digits, right-justified, leading zeros (pos 189–205)
 *   - Dates: DDMMYYYY
 *   - Payee name: 140 chars max (pos 46–185)
 *   - Originating bank code is always "OCBCSGSGXXX" (pos 14–24)
 */

import type { BankFileInput, BankFilePayee, BankFileResult } from '../types.js';
import { round2, OCBC_BIC } from '../types.js';

const RECORD_WIDTH = 1000;

// ── Helpers ──────────────────────────────────────────────────────

/** Format date from YYYY-MM-DD to DDMMYYYY. */
function toDdMmYyyy(isoDate: string): string {
  const [y, m, d] = isoDate.split('-');
  return `${d}${m}${y}`;
}

/** Left-justify a string, padding with spaces to exact length. Truncates if too long. */
function leftPad(value: string, len: number): string {
  return value.slice(0, len).padEnd(len, ' ');
}

/** Right-justify a string, padding with leading characters. */
function rightPad(value: string, len: number, fill: string = ' '): string {
  return value.slice(0, len).padStart(len, fill);
}

/**
 * Convert a dollar amount to cents string, right-justified with leading zeros, 17 digits.
 * e.g. 1234.56 → "00000000000123456"
 */
function amountToCents(amount: number): string {
  const cents = Math.round(amount * 100);
  return String(cents).padStart(17, '0');
}

/** Build a record of exactly 1000 characters from positioned segments. */
function buildRecord(segments: Array<{ pos: number; value: string }>): string {
  // Start with 1000 spaces
  const chars = new Array(RECORD_WIDTH).fill(' ');

  for (const seg of segments) {
    const start = seg.pos - 1; // Convert 1-based to 0-based
    for (let i = 0; i < seg.value.length && start + i < RECORD_WIDTH; i++) {
      chars[start + i] = seg.value[i];
    }
  }

  return chars.join('');
}

/** Truncate with warning tracking. */
function truncateWithWarning(
  value: string,
  max: number,
  fieldName: string,
  payeeName: string,
  warnings: string[],
): string {
  if (value.length <= max) return value;
  warnings.push(`Payee "${payeeName}": ${fieldName} truncated to ${max} chars`);
  return value.slice(0, max);
}

// ── Record builders ──────────────────────────────────────────────

function buildHeaderRecord(input: BankFileInput): string {
  const ocbc = input.ocbc!;
  const batchNumber = (ocbc.batchNumber ?? '001').padStart(3, '0');
  const now = new Date();
  const submissionDate = toDdMmYyyy(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  );
  const chargeBearer = ocbc.chargeBearer ?? 'DEBT';
  const clearing = leftPad(ocbc.clearing, 4);
  const valueDate = toDdMmYyyy(input.batch.valueDate);
  const batchBooking = ocbc.batchBooking === false ? '0' : '1';

  const accountNumber = leftPad(input.originator.accountNumber, 34);
  const reference = leftPad(input.batch.reference ?? '', 16);

  return buildRecord([
    { pos: 1,   value: '10' },                        // Transaction Type Code (Payment)
    { pos: 3,   value: batchNumber },                  // Batch Number (3 digits)
    { pos: 6,   value: submissionDate },               // Submission Date (DDMMYYYY)
    { pos: 14,  value: leftPad(OCBC_BIC, 11) },       // Originating Bank Code
    { pos: 25,  value: accountNumber },                // Your Account Number (34 chars)
    // pos 59–61: Filler (spaces)
    // pos 62–81: On Behalf Of (spaces)
    // pos 82–201: Filler (spaces)
    { pos: 202, value: leftPad(chargeBearer, 4) },    // Charge Bearer
    { pos: 206, value: clearing },                     // Clearing (GIRO/FAST)
    { pos: 210, value: reference },                    // Your Reference Number
    { pos: 226, value: valueDate },                    // Value Date (DDMMYYYY)
    { pos: 234, value: '0000' },                       // Value Time
    { pos: 238, value: batchBooking },                 // Batch Booking
    // pos 239–1000: Filler (spaces)
  ]);
}

function buildDetailRecord(
  input: BankFileInput,
  payee: BankFilePayee,
  warnings: string[],
): string {
  const currency = payee.currency ?? input.originator.currency ?? 'SGD';
  const bankCode = leftPad(payee.bankCode, 11);
  const accountNumber = leftPad(payee.accountNumber, 34);
  const name = leftPad(
    truncateWithWarning(payee.name, 140, 'name', payee.name, warnings),
    140,
  );
  const currencyStr = leftPad(currency, 3);
  const amount = amountToCents(payee.amount);
  const paymentDetails = leftPad(
    truncateWithWarning(payee.paymentDetails ?? '', 35, 'payment details', payee.name, warnings),
    35,
  );
  const purposeCode = leftPad(payee.purposeCode ?? input.batch.purposeCode ?? '', 4);
  const debtorsRef = leftPad(
    truncateWithWarning(payee.reference ?? '', 35, 'reference', payee.name, warnings),
    35,
  );

  // Proxy fields (for PayNow via FAST clearing)
  const proxyType = leftPad(payee.proxyType ?? '', 12);
  const proxyValue = leftPad(payee.proxyValue ?? '', 140);

  return buildRecord([
    { pos: 1,   value: bankCode },             // Bank Code (BIC, 11 chars)
    { pos: 12,  value: accountNumber },         // Payer/Payee Account Number (34 chars)
    { pos: 46,  value: name },                  // Payer/Payee Name (140 chars)
    { pos: 186, value: currencyStr },           // Currency (3 chars)
    { pos: 189, value: amount },                // Amount in cents (17 chars, right-justified)
    { pos: 206, value: paymentDetails },        // Payment Details (35 chars)
    { pos: 241, value: purposeCode },           // Purpose Code (4 chars)
    { pos: 245, value: debtorsRef },            // Debtors Reference (35 chars)
    // pos 280–419: Ultimate Creditor Name (140 chars, spaces)
    // pos 420–559: Ultimate Debtor Name (140 chars, spaces)
    // pos 560: Send Remittance Advice Via (space)
    // pos 561–815: Send Details (255 chars, spaces)
    { pos: 816, value: proxyType },             // Proxy Type (12 chars)
    { pos: 828, value: proxyValue },            // Proxy Value (140 chars)
    // pos 968–1000: Filler (spaces)
  ]);
}

function buildInvoiceDetailRecord(invoiceText: string): string {
  const detail = leftPad(invoiceText, 97);
  return buildRecord([
    { pos: 1, value: 'INV' },                  // Record Type
    { pos: 4, value: detail },                  // Invoice Details (97 chars)
    // pos 101–1000: Filler (spaces)
  ]);
}

// ── Main generator ───────────────────────────────────────────────

/** Generate an OCBC GIRO/FAST bank file. Input must already be validated. */
export function generateOcbcGiro(input: BankFileInput): BankFileResult {
  const warnings: string[] = [];
  const lines: string[] = [];

  // Header record
  lines.push(buildHeaderRecord(input));

  // Detail + optional invoice records
  for (const payee of input.payees) {
    lines.push(buildDetailRecord(input, payee, warnings));

    // Invoice detail records (optional, one per invoice line)
    if (payee.invoiceDetails && payee.invoiceDetails.length > 0) {
      for (const inv of payee.invoiceDetails) {
        const [invText, truncated] = [inv.slice(0, 97), inv.length > 97];
        if (truncated) {
          warnings.push(`Payee "${payee.name}": invoice detail line truncated to 97 chars`);
        }
        lines.push(buildInvoiceDetailRecord(invText));
      }
    }
  }

  const content = lines.join('\n') + '\n';
  const totalAmount = round2(input.payees.reduce((s, p) => s + p.amount, 0));
  const currency = input.originator.currency ?? 'SGD';
  const clearing = input.ocbc!.clearing;

  // Suggested filename
  const vd = input.batch.valueDate.replace(/-/g, '');
  const filename = `OCBC_${clearing}_${vd}.txt`;

  return {
    type: 'bank-file',
    format: 'ocbc-giro',
    filename,
    content,
    summary: {
      totalPayees: input.payees.length,
      totalAmount,
      currency,
      valueDate: input.batch.valueDate,
      formatDescription: `OCBC ${clearing} Payment`,
    },
    warnings,
  };
}
