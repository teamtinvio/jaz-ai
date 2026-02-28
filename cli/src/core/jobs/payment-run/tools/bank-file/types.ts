/**
 * Types for clio jobs payment-run bank-file — SG bank payment file generation.
 *
 * Supports:
 *   DBS  — IDEAL 3.0 UFF v1.9.3 (CSV, comma-delimited)
 *   OCBC — GIRO/FAST WITH INV v1.5 (fixed-width, 1000 chars/record)
 *   UOB  — UFF-SG (tilde-delimited ~)
 */

import { round2 } from '../../../../calc/types.js';
export { round2 };

// ── Bank format identifiers ──────────────────────────────────────

export type BankFormat = 'dbs-giro' | 'ocbc-giro' | 'uob-giro';

export const BANK_FORMATS: BankFormat[] = ['dbs-giro', 'ocbc-giro', 'uob-giro'];

// ── DBS-specific enums ───────────────────────────────────────────

/** DBS IDEAL 3.0 product types for domestic payments. */
export type DbsProductType = 'BPY' | 'GPP' | 'PPY';
//  BPY = Bulk Payment (normal GIRO)
//  GPP = FAST payment
//  PPY = PayNow GIRO

export const DBS_PRODUCT_TYPES: DbsProductType[] = ['BPY', 'GPP', 'PPY'];

export type DbsChargeBearer = 'OUR' | 'BEN' | 'SHA';

// ── OCBC-specific enums ──────────────────────────────────────────

export type OcbcClearingType = 'GIRO' | 'FAST';

export const OCBC_CLEARING_TYPES: OcbcClearingType[] = ['GIRO', 'FAST'];

export type OcbcChargeBearer = 'DEBT' | 'CRED' | 'SHAR' | 'SLEV';

// ── UOB-specific enums ───────────────────────────────────────────

/** UOB payment methods for domestic SG payments. */
export type UobPaymentMethod =
  | 'IBG'      // GIRO Normal
  | 'IBGPN'    // GIRO Normal PayNow
  | 'IBGX'     // GIRO Express
  | 'IBGXPN'   // GIRO Express PayNow
  | 'FAST'     // FAST
  | 'FASTPN';  // FAST PayNow

export const UOB_PAYMENT_METHODS: UobPaymentMethod[] = [
  'IBG', 'IBGPN', 'IBGX', 'IBGXPN', 'FAST', 'FASTPN',
];

/** Methods that route via PayNow proxy (require proxyType + proxyValue on each payee). */
export const UOB_PAYNOW_METHODS: UobPaymentMethod[] = ['IBGPN', 'IBGXPN', 'FASTPN'];

// ── Bank BIC constants ───────────────────────────────────────────

export const DBS_BIC  = 'DBSSSGSGXXX';
export const OCBC_BIC = 'OCBCSGSGXXX';
export const UOB_BIC  = 'UOVBSGSGXXX';

// ── Input types ──────────────────────────────────────────────────

export interface BankFilePayee {
  /** Beneficiary name. Truncated to format limit with warning. */
  name: string;
  /** Bank account number (or proxy value for PayNow). */
  accountNumber: string;
  /** Receiving bank BIC/SWIFT (11 chars) or 4-digit bank code (DBS D18). */
  bankCode: string;
  /** DBS: 4-digit receiving branch code (D19). */
  branchCode?: string;
  /** Payment amount (positive, max 2 decimal places). */
  amount: number;
  /** Payment currency. Default: SGD. */
  currency?: string;
  /** Payment reference / end-to-end reference. */
  reference?: string;
  /** Remittance info / payment details. */
  paymentDetails?: string;
  /** PayNow proxy type: UEN, MOBILE, NRIC. */
  proxyType?: string;
  /** PayNow proxy value. */
  proxyValue?: string;
  /** Purpose code (e.g. SUPP, SALA). */
  purposeCode?: string;
  /** Beneficiary address lines. */
  address?: {
    line1?: string;
    line2?: string;
    line3?: string;
    city?: string;
    country?: string;
  };
  /** Invoice details — OCBC INV records or DBS D64 field. */
  invoiceDetails?: string[];
}

export interface BankFileInput {
  /** Which bank format to generate. Set by CLI flag dispatch. */
  format: BankFormat;

  /** Originator — the paying company. */
  originator: {
    /** Bank account number. */
    accountNumber: string;
    /** Company name on account. */
    accountName: string;
    /** BIC/SWIFT code. Auto-filled per format if omitted. */
    bankCode?: string;
    /** Account currency. Default: SGD. */
    currency?: string;
    /** Organization ID / Company ID (DBS H03: 12 chars, UOB HD2.4: 12 chars). */
    organizationId?: string;
  };

  /** Payment batch metadata. */
  batch: {
    /** Payment execution date (YYYY-MM-DD). */
    valueDate: string;
    /** Batch reference. DBS: CustomerRef (D05). UOB: BulkReference (HD2.7). */
    reference?: string;
    /** DBS batch ID (1–99999). Default: 1. */
    batchId?: number;
    /** Default purpose code for all payees (overridden by payee-level). */
    purposeCode?: string;
  };

  /** DBS-specific options. Required when format = 'dbs-giro'. */
  dbs?: {
    /** Product type: BPY (GIRO), GPP (FAST), PPY (PayNow GIRO). */
    productType: DbsProductType;
    /** Charge bearer. Default: OUR. */
    chargeBearer?: DbsChargeBearer;
    /** Transaction code. Default: "20" (Sundry Credit). */
    transactionCode?: string;
  };

  /** OCBC-specific options. Required when format = 'ocbc-giro'. */
  ocbc?: {
    /** Clearing type: GIRO or FAST. */
    clearing: OcbcClearingType;
    /** 3-digit batch number. Default: "001". */
    batchNumber?: string;
    /** Charge bearer. Default: DEBT. */
    chargeBearer?: OcbcChargeBearer;
    /** Batch booking flag. Default: true (1). */
    batchBooking?: boolean;
  };

  /** UOB-specific options. Required when format = 'uob-giro'. */
  uob?: {
    /** Payment method. */
    paymentMethod: UobPaymentMethod;
    /** Category purpose code. */
    categoryPurposeCode?: 'SALA' | 'COLL';
    /** File sequence number for filename (1–999). Default: 1. */
    fileSequence?: number;
    /** Send beneficiary advice. Default: false. */
    sendBenAdvice?: boolean;
  };

  /** Payees — beneficiaries to pay. */
  payees: BankFilePayee[];
}

// ── Output types ─────────────────────────────────────────────────

export interface BankFileResult {
  type: 'bank-file';
  format: BankFormat;
  /** Suggested output filename. */
  filename: string;
  /** The generated file content (ready to write to disk). */
  content: string;
  /** Summary statistics. */
  summary: {
    totalPayees: number;
    totalAmount: number;
    currency: string;
    valueDate: string;
    formatDescription: string;
  };
  /** Non-fatal warnings (e.g. name truncated, field omitted). */
  warnings: string[];
}
