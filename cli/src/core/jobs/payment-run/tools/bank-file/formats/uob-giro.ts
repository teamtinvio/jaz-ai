/**
 * UOB UFF-SG — tilde-delimited (~) bank file generator.
 *
 * Record types:
 *   HD1 — File Header
 *   HD2 — Payment/Collection Header
 *   DTL — Transaction Detail (one per payee)
 *   FT2 — Payment Footer
 *   FT1 — File Footer
 *
 * Spec: "UOB_UFF-SG (1).xlsx"
 * Key rules:
 *   - Fields delimited by tilde (~)
 *   - Empty fields = empty between tildes (e.g. "DTL~~1000.00~SGD")
 *   - HD1.2 filename format: PAIDE<DDMM><NNN> (NNN = file sequence 001-999)
 *   - HD2.10 originating bank BIC: "UOVBSGSGXXX" (production)
 *   - DTL.3 amount: 18 digits, 2 decimal places
 *   - FT2.3 control sum: 20 digits (amount × 100, no decimals, leading zeros)
 *   - GIRO methods (IBG/IBGPN/IBGX/IBGXPN) require SGD
 *   - PayNow methods (IBGPN/IBGXPN/FASTPN): DTL.19 = proxy type, DTL.20 = proxy value
 */

import type { BankFileInput, BankFilePayee, BankFileResult, UobPaymentMethod } from '../types.js';
import { round2, UOB_BIC, UOB_PAYNOW_METHODS } from '../types.js';

// ── Helpers ──────────────────────────────────────────────────────

/** Format date from YYYY-MM-DD to YYYYMMDD. */
function toYyyyMmDd(isoDate: string): string {
  return isoDate.replace(/-/g, '');
}

/** Pad number with leading zeros. */
function padZeros(n: number, len: number): string {
  return String(n).padStart(len, '0');
}

/** Truncate string, returning [value, wasTruncated]. */
function truncate(value: string, max: number): [string, boolean] {
  if (value.length <= max) return [value, false];
  return [value.slice(0, max), true];
}

/** Format amount with exactly 2 decimal places for DTL.3. */
function fmtAmount(amount: number): string {
  return round2(amount).toFixed(2);
}

/**
 * Format control sum: amount × 100 as integer, 20 digits, leading zeros.
 * e.g. 12345.67 → "00000000000001234567"
 */
function fmtControlSum(totalAmount: number): string {
  const cents = Math.round(totalAmount * 100);
  return String(cents).padStart(20, '0');
}

/** Join fields with tilde delimiter. Trailing empty fields are trimmed (UOB accepts this). */
function tildeRow(fields: string[]): string {
  let lastNonEmpty = fields.length - 1;
  while (lastNonEmpty >= 0 && fields[lastNonEmpty] === '') {
    lastNonEmpty--;
  }
  return fields.slice(0, lastNonEmpty + 1).join('~');
}

/** Check if a payment method is PayNow. */
function isPayNow(method: UobPaymentMethod): boolean {
  return UOB_PAYNOW_METHODS.includes(method);
}

// ── Record builders ──────────────────────────────────────────────

function buildHD1(input: BankFileInput): string {
  const now = new Date();
  const dd = padZeros(now.getDate(), 2);
  const mm = padZeros(now.getMonth() + 1, 2);
  const seq = padZeros(input.uob?.fileSequence ?? 1, 3);
  const fileName = `PAIDE${dd}${mm}${seq}`;
  const creationDate = toYyyyMmDd(
    `${now.getFullYear()}-${mm}-${dd}`
  );
  const creationTime = `${padZeros(now.getHours(), 2)}${padZeros(now.getMinutes(), 2)}${padZeros(now.getSeconds(), 2)}`;
  const bic = input.originator.bankCode ?? UOB_BIC;

  // 1.1 Record Type, 1.2 File Name, 1.3 Creation Date, 1.4 Creation Time, 1.5 Initiating Party BIC
  return tildeRow(['HD1', fileName, creationDate, creationTime, bic]);
}

function buildHD2(input: BankFileInput): string {
  const uob = input.uob!;
  const valueDate = toYyyyMmDd(input.batch.valueDate);
  const companyId = input.originator.organizationId ?? '';
  const bulkRef = input.batch.reference ?? '';
  const catPurpose = uob.categoryPurposeCode ?? '';
  const bic = input.originator.bankCode ?? UOB_BIC;
  const currency = input.originator.currency ?? 'SGD';

  // Fields 2.1–2.14
  const fields = [
    'HD2',                              // 2.1  Record Type
    uob.paymentMethod,                  // 2.2  Payment Method
    valueDate,                          // 2.3  Value Date (YYYYMMDD)
    companyId,                          // 2.4  Company ID
    '',                                 // 2.5  (reserved)
    '',                                 // 2.6  (reserved)
    bulkRef,                            // 2.7  Bulk Reference (max 20)
    catPurpose,                         // 2.8  Category Purpose Code
    '',                                 // 2.9  (reserved)
    bic,                                // 2.10 Originating Party Bank BIC Code
    'SG',                               // 2.11 Originating Account Country Code
    input.originator.accountNumber,     // 2.12 Originating Account Number
    currency,                           // 2.13 Originating Account Currency
    input.originator.accountName,       // 2.14 Originating Account Name (max 140)
  ];

  return tildeRow(fields);
}

function buildDTL(
  input: BankFileInput,
  payee: BankFilePayee,
  warnings: string[],
): string {
  const uob = input.uob!;
  const currency = payee.currency ?? input.originator.currency ?? 'SGD';
  const payNow = isPayNow(uob.paymentMethod);

  const [ref, refTruncated] = truncate(payee.reference ?? '', 35);
  if (refTruncated) {
    warnings.push(`Payee "${payee.name}": reference truncated to 35 chars`);
  }

  const purposeCode = payee.purposeCode ?? input.batch.purposeCode ?? '';
  const benAdvice = uob.sendBenAdvice ? 'Y' : 'N';

  // For PayNow: 3.19 = proxy type, 3.20 = proxy value
  // For normal: 3.19 = bank BIC, 3.20 = account number
  const field319 = payNow ? (payee.proxyType ?? '') : payee.bankCode;
  const field320 = payNow ? (payee.proxyValue ?? '') : payee.accountNumber;

  // DTL.21 CP Account Name (max 140 chars)
  const [acctName] = truncate(payee.name, 140);

  // DTL.30–33 CP Name 1–4 (70 chars each = 280 chars total)
  const fullName = payee.name;
  const name1 = fullName.slice(0, 70);
  const name2 = fullName.length > 70 ? fullName.slice(70, 140) : '';
  const name3 = fullName.length > 140 ? fullName.slice(140, 210) : '';
  const name4 = fullName.length > 210 ? fullName.slice(210, 280) : '';

  // Single coherent warning for long names
  if (fullName.length > 280) {
    warnings.push(`Payee "${payee.name}": name exceeds 280 chars — truncated (DTL.21 to 140, DTL.30–33 to 280)`);
  } else if (fullName.length > 140) {
    warnings.push(`Payee "${payee.name}": name exceeds 140 chars — DTL.21 truncated, full name spread across DTL.30–33`);
  }

  // Address fields (70 chars each)
  const addr1 = payee.address?.line1 ?? '';
  const addr2 = payee.address?.line2 ?? '';
  const addr3 = payee.address?.line3 ?? '';
  const addr4 = payee.address?.city
    ? `${payee.address.city}${payee.address.country ? ' ' + payee.address.country : ''}`
    : '';

  // Fields 3.1–3.38
  const fields = [
    'DTL',                      // 3.1  Record Type
    ref,                        // 3.2  Originating Party Reference
    fmtAmount(payee.amount),    // 3.3  Transaction Amount
    currency,                   // 3.4  Transaction Currency
    '',                         // 3.5
    '',                         // 3.6
    '',                         // 3.7
    '',                         // 3.8
    '',                         // 3.9
    purposeCode,                // 3.10 Purpose Code
    '',                         // 3.11
    benAdvice,                  // 3.12 Beneficiary Advice Indicator
    '',                         // 3.13
    '',                         // 3.14
    '',                         // 3.15
    '',                         // 3.16
    '',                         // 3.17
    '',                         // 3.18
    field319,                   // 3.19 CP Bank BIC / Proxy Type
    field320,                   // 3.20 CP Account Number / Proxy Value
    acctName,                   // 3.21 CP Account Name
    '',                         // 3.22
    '',                         // 3.23
    '',                         // 3.24
    '',                         // 3.25
    '',                         // 3.26
    '',                         // 3.27
    '',                         // 3.28
    '',                         // 3.29
    name1,                      // 3.30 CP Name 1
    name2,                      // 3.31 CP Name 2
    name3,                      // 3.32 CP Name 3
    name4,                      // 3.33 CP Name 4
    '',                         // 3.34
    addr1,                      // 3.35 CP Address 1
    addr2,                      // 3.36 CP Address 2
    addr3,                      // 3.37 CP Address 3
    addr4,                      // 3.38 CP Address 4
  ];

  return tildeRow(fields);
}

function buildFT2(payees: BankFilePayee[]): string {
  const totalCount = padZeros(payees.length, 10);
  const totalAmount = payees.reduce((s, p) => s + p.amount, 0);
  const controlSum = fmtControlSum(totalAmount);

  return tildeRow(['FT2', totalCount, controlSum]);
}

function buildFT1(payees: BankFilePayee[]): string {
  const totalCount = padZeros(payees.length, 10);
  return tildeRow(['FT1', totalCount]);
}

// ── Main generator ───────────────────────────────────────────────

/** Generate a UOB UFF-SG bank file. Input must already be validated. */
export function generateUobGiro(input: BankFileInput): BankFileResult {
  const warnings: string[] = [];
  const lines: string[] = [];

  // HD1 — File Header
  lines.push(buildHD1(input));

  // HD2 — Payment Header
  lines.push(buildHD2(input));

  // DTL — Transaction Details
  for (const payee of input.payees) {
    lines.push(buildDTL(input, payee, warnings));
  }

  // FT2 — Payment Footer
  lines.push(buildFT2(input.payees));

  // FT1 — File Footer
  lines.push(buildFT1(input.payees));

  const content = lines.join('\n') + '\n';
  const totalAmount = round2(input.payees.reduce((s, p) => s + p.amount, 0));
  const currency = input.originator.currency ?? 'SGD';
  const method = input.uob!.paymentMethod;

  // Suggested filename: PAIDE<DDMM><NNN>.txt
  const now = new Date();
  const dd = padZeros(now.getDate(), 2);
  const mm = padZeros(now.getMonth() + 1, 2);
  const seq = padZeros(input.uob?.fileSequence ?? 1, 3);
  const filename = `PAIDE${dd}${mm}${seq}.txt`;

  const methodDesc: Record<string, string> = {
    IBG: 'UOB GIRO Normal',
    IBGPN: 'UOB GIRO Normal PayNow',
    IBGX: 'UOB GIRO Express',
    IBGXPN: 'UOB GIRO Express PayNow',
    FAST: 'UOB FAST',
    FASTPN: 'UOB FAST PayNow',
  };

  return {
    type: 'bank-file',
    format: 'uob-giro',
    filename,
    content,
    summary: {
      totalPayees: input.payees.length,
      totalAmount,
      currency,
      valueDate: input.batch.valueDate,
      formatDescription: methodDesc[method] ?? `UOB ${method}`,
    },
    warnings,
  };
}
