/**
 * DBS IDEAL 3.0 UFF v1.9.3 — CSV (comma-delimited) bank file generator.
 *
 * Record types: HEADER, PAYMENT (repeated per payee), TRAILER.
 * Product types: BPY (Bulk Payment GIRO), GPP (FAST), PPY (PayNow GIRO).
 *
 * Spec: "DBS UFF Version 1.9.3.pdf"
 * Key rules:
 *   - CSV fields from first to last non-empty field (trailing empties omitted)
 *   - H02/D08 dates: DDMMYYYY
 *   - D28 amount: 9(9).9(2) — e.g. "1234.56"
 *   - T02 total count: 8 digits leading zeros
 *   - T03 total amount: 9(18).9(2)
 *   - D33 transaction code: "20" (Sundry Credit) by default
 */

import type { BankFileInput, BankFilePayee, BankFileResult, DbsProductType } from '../types.js';
import { round2 } from '../types.js';

// ── Helpers ──────────────────────────────────────────────────────

/** Format date from YYYY-MM-DD to DDMMYYYY. */
function toDdMmYyyy(isoDate: string): string {
  const [y, m, d] = isoDate.split('-');
  return `${d}${m}${y}`;
}

/** Truncate string to max length, returning [truncated, wasShortened]. */
function truncate(value: string, max: number): [string, boolean] {
  if (value.length <= max) return [value, false];
  return [value.slice(0, max), true];
}

/** Format amount as DBS expects: up to 9 integer digits + "." + 2 decimal digits. */
function fmtAmount(amount: number): string {
  return round2(amount).toFixed(2);
}

/** Format trailer total: 9(18).9(2). */
function fmtTrailerAmount(amount: number): string {
  return round2(amount).toFixed(2);
}

/** Pad number with leading zeros to length. */
function padZeros(n: number, len: number): string {
  return String(n).padStart(len, '0');
}

/**
 * Build a CSV row from fields, omitting trailing empty fields.
 * DBS UFF rule: fields up to and including the last non-empty field.
 */
function csvRow(fields: string[]): string {
  // Find last non-empty field index
  let lastNonEmpty = fields.length - 1;
  while (lastNonEmpty >= 0 && fields[lastNonEmpty] === '') {
    lastNonEmpty--;
  }
  // Include all fields up to last non-empty
  return fields.slice(0, lastNonEmpty + 1).join(',');
}

// ── Record builders ──────────────────────────────────────────────

function buildHeader(input: BankFileInput): string {
  const now = new Date();
  const creationDate = toDdMmYyyy(
    `${now.getFullYear()}-${padZeros(now.getMonth() + 1, 2)}-${padZeros(now.getDate(), 2)}`
  );

  const orgId = input.originator.organizationId ?? '';
  const [senderName] = truncate(input.originator.accountName, 35);

  // H01: Record Type, H02: File Creation Date, H03: Organization ID, H04: Sender Name
  return csvRow(['HEADER', creationDate, orgId, senderName]);
}

function buildPaymentRow(
  input: BankFileInput,
  payee: BankFilePayee,
  warnings: string[],
): string {
  const dbs = input.dbs!;
  const productType = dbs.productType;
  const currency = input.originator.currency ?? 'SGD';
  const payeeCurrency = payee.currency ?? currency;
  const chargeBearer = dbs.chargeBearer ?? 'OUR';
  const transactionCode = dbs.transactionCode ?? '20';
  const batchId = padZeros(input.batch.batchId ?? 1, 5);
  const valueDate = toDdMmYyyy(input.batch.valueDate);

  // D05: Customer reference — max 16 for BPY, 35 for GPP/PPY
  const refMaxLen = productType === 'BPY' ? 16 : 35;
  const refRaw = payee.reference ?? input.batch.reference ?? '';
  const [ref, refTruncated] = truncate(refRaw, refMaxLen);
  if (refTruncated) {
    warnings.push(`Payee "${payee.name}": reference truncated to ${refMaxLen} chars (${productType})`);
  }

  // D11: Receiving party name
  const nameMaxLen = productType === 'BPY' ? 35 : 140;
  const [recvName, nameTruncated] = truncate(payee.name, nameMaxLen);
  if (nameTruncated) {
    warnings.push(`Payee "${payee.name}": name truncated to ${nameMaxLen} chars`);
  }

  // D16: Account number or proxy value (for PPY)
  const accountOrProxy = productType === 'PPY' && payee.proxyValue
    ? payee.proxyValue
    : payee.accountNumber;

  // D18: Receiving bank code (4-digit bank code, e.g. 7171 for DBS, 9247 for OCBC)
  const bankCode = payee.bankCode.length <= 4
    ? payee.bankCode
    : payee.bankCode.slice(0, 4);
  if (payee.bankCode.length > 4) {
    warnings.push(
      `Payee "${payee.name}": bankCode "${payee.bankCode}" is ${payee.bankCode.length} chars — DBS expects a 4-digit code (e.g. 7171). Truncated to "${bankCode}"`
    );
  }

  // D19: Branch code (4 digits)
  const branchCode = payee.branchCode ?? '';

  // Build all 90 fields (D01–D90). Most are empty.
  const fields: string[] = new Array(90).fill('');

  fields[0]  = 'PAYMENT';                            // D01 Record Type
  fields[1]  = productType;                           // D02 Product Type
  fields[2]  = input.originator.accountNumber;        // D03 Originating Account Number
  fields[3]  = currency;                              // D04 Originating Account Currency
  fields[4]  = ref;                                   // D05 Customer Reference
  fields[5]  = payeeCurrency;                         // D06 Payment Currency
  fields[6]  = batchId;                               // D07 Batch ID
  fields[7]  = valueDate;                             // D08 Payment Date
  fields[8]  = chargeBearer;                          // D09 Bank Charges
  fields[9]  = '';                                    // D10 Debit Account for Charges
  fields[10] = recvName;                              // D11 Receiving Party Name
  // D12–D15: Payable To, Address 1-3 (empty)
  fields[15] = accountOrProxy;                        // D16 Receiving Account Number / Proxy Value
  fields[16] = '';                                    // D17 Country Specific
  fields[17] = bankCode;                              // D18 Receiving Bank Code
  fields[18] = branchCode;                            // D19 Receiving Branch Code
  // D20–D27: Clearing/SWIFT/intermediary/FX (empty for domestic)
  fields[27] = fmtAmount(payee.amount);               // D28 Amount
  // D29–D32: FX fields (empty)
  fields[32] = transactionCode;                       // D33 Transaction Code
  fields[33] = payee.paymentDetails ?? '';             // D34 Particulars / E2E Reference

  // D64: Invoice Details (optional)
  if (payee.invoiceDetails && payee.invoiceDetails.length > 0) {
    const invoiceStr = payee.invoiceDetails.join('; ');
    const [inv, invTruncated] = truncate(invoiceStr, 70000);
    if (invTruncated) {
      warnings.push(`Payee "${payee.name}": invoice details truncated to 70,000 chars`);
    }
    fields[63] = inv;                                 // D64 Invoice Details
  }

  return csvRow(fields);
}

function buildTrailer(payees: BankFilePayee[]): string {
  const count = padZeros(payees.length, 8);
  const totalAmount = payees.reduce((sum, p) => sum + p.amount, 0);

  // T01: Record Type, T02: Total Transactions, T03: Total Amount
  return csvRow(['TRAILER', count, fmtTrailerAmount(totalAmount)]);
}

// ── Main generator ───────────────────────────────────────────────

/** Generate a DBS UFF CSV bank file. Input must already be validated. */
export function generateDbsGiro(input: BankFileInput): BankFileResult {
  const warnings: string[] = [];
  const lines: string[] = [];

  // Header
  lines.push(buildHeader(input));

  // Payment rows
  for (const payee of input.payees) {
    lines.push(buildPaymentRow(input, payee, warnings));
  }

  // Trailer
  lines.push(buildTrailer(input.payees));

  const content = lines.join('\n') + '\n';
  const totalAmount = round2(input.payees.reduce((s, p) => s + p.amount, 0));
  const currency = input.originator.currency ?? 'SGD';
  const productType = input.dbs!.productType;

  // Suggested filename
  const vd = input.batch.valueDate.replace(/-/g, '');
  const filename = `DBS_${productType}_${vd}.csv`;

  const formatDesc: Record<string, string> = {
    BPY: 'DBS Bulk Payment (GIRO)',
    GPP: 'DBS FAST Payment',
    PPY: 'DBS PayNow GIRO',
  };

  return {
    type: 'bank-file',
    format: 'dbs-giro',
    filename,
    content,
    summary: {
      totalPayees: input.payees.length,
      totalAmount,
      currency,
      valueDate: input.batch.valueDate,
      formatDescription: formatDesc[productType] ?? `DBS ${productType}`,
    },
    warnings,
  };
}
