// ── Pagination ────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  totalPages: number;
  totalElements: number;
  data: T[];
}

export interface PaginationParams {
  limit?: number;
  offset?: number;
}

export interface SearchParams extends PaginationParams {
  filter?: Record<string, unknown>;
  sort?: { sortBy: string[]; order: 'ASC' | 'DESC' };
}

// ── Filter Types ──────────────────────────────────────────────────

export interface StringFilter {
  contains?: string;
  eq?: string;
  neq?: string;
  is_null?: boolean;
  reg?: string;
  in?: string[];
  like_in?: string[];
}

export interface NumberFilter {
  eq?: number;
  gt?: number;
  gte?: number;
  lt?: number;
  lte?: number;
  in?: number[];
}

export interface DateFilter {
  eq?: string;
  gt?: string;
  gte?: string;
  lt?: string;
  lte?: string;
  between?: [string, string];
}

export interface BooleanFilter {
  eq?: boolean;
}

// ── Common Entity Types ───────────────────────────────────────────

export interface OrgDetails {
  resourceId: string;
  name: string;
  currency: string;
  countryCode: string;
  status: string;
  lockDate: string | null;
  fiscalYearEnd?: number;
}

export interface Account {
  resourceId: string;
  name: string;
  code: string;
  accountClass: string;
  accountType: string;
  status: string;
  currencyCode: string;
  locked: boolean;
  controlFlag: boolean;
}

export interface Contact {
  resourceId: string;
  billingName: string;
  name: string;
  emails?: string[];
  customer?: boolean;
  supplier?: boolean;
  taxRegistrationNumber?: string;
  status?: string;
}

export interface LineItem {
  name: string;
  quantity?: number;
  unitPrice?: number;
  unit?: string;
  discount?: number;
  accountResourceId?: string;
  /** GET responses use this field name instead of accountResourceId */
  organizationAccountResourceId?: string;
  taxProfileResourceId?: string;
  itemResourceId?: string;
}

export interface CurrencyExchangeRate {
  sourceCurrency: string;
  exchangeRate?: number;
}

export type PaymentMethod =
  | 'CASH' | 'CREDIT_CARD' | 'BANK_TRANSFER' | 'E_WALLET'
  | 'CHEQUE' | 'WITHHOLDING_TAX_CERTIFICATE' | 'CLEARING_SETTLEMENT'
  | 'DEBT_WRITE_OFF' | 'INTER_COMPANY' | 'OTHER' | 'PAYMENT_GATEWAY';

export interface TransactionFee {
  feeDescription?: string;
  feeTaxVatApplicable?: boolean;
  taxVatProfileResourceId?: string;
  feeAccountResourceId: string;
  feeType: 'FLAT' | 'PERCENTAGE';
  feeValue: number;
}

export interface Payment {
  reference: string;
  valueDate: string;
  dueDate: string;
  paymentMethod: PaymentMethod;
  accountResourceId: string;
  paymentAmount: number;
  transactionAmount: number;
  transactionFee?: TransactionFee;
  transactionFeeCollected?: TransactionFee;
  sendEmail?: boolean;
  currency?: CurrencyExchangeRate;
  saveAsDraft?: boolean;
}

export interface Refund {
  resourceId: string;
  reference: string;
  status: string;
  valueDate: string;
  organizationAccountResourceId: string;
  refundMethod: string;
  refundAmount: number;
  transactionAmount: number;
  currencyCode: string;
  exchangeRate: number;
}

export interface CreditApplication {
  creditNoteResourceId: string;
  amountApplied: number;
}

export interface Invoice {
  resourceId: string;
  reference: string;
  valueDate: string;
  dueDate: string;
  status: string;
  contactResourceId: string;
  contactName?: string;
  lineItems: LineItem[];
  currency?: CurrencyExchangeRate;
  tag?: string;
  notes?: string;
  totalAmount?: number;
  balanceAmount?: number;
  amountDue?: number;
  isTaxVATApplicable?: boolean;
  taxInclusion?: boolean;
}

export interface Bill {
  resourceId: string;
  reference: string;
  valueDate: string;
  dueDate: string;
  status: string;
  contactResourceId: string;
  contactName?: string;
  lineItems: LineItem[];
  currency?: CurrencyExchangeRate;
  tag?: string;
  notes?: string;
  totalAmount?: number;
  balanceAmount?: number;
  amountDue?: number;
  isTaxVATApplicable?: boolean;
  taxInclusion?: boolean;
}

export interface JournalEntry {
  accountResourceId: string;
  type: 'CREDIT' | 'DEBIT';
  amount: number;
  description?: string;
  contactResourceId?: string;
  taxProfileResourceId?: string;
}

export interface Journal {
  resourceId: string;
  reference: string;
  valueDate: string;
  status: string;
  journalEntries: JournalEntry[];
  notes?: string;
}

export interface BankAccount {
  resourceId: string;
  name: string;
  accountResourceId: string;
  currencyCode: string;
  status: string;
}

export interface BankRecord {
  resourceId: string;
  date: string;
  description: string;
  amount: number;
  balance?: number;
  status: string;
}

export interface Item {
  resourceId: string;
  itemCode: string;
  internalName: string;
  appliesToSale: boolean;
  appliesToPurchase: boolean;
  saleItemName?: string;
  purchaseItemName?: string;
  salePrice?: number;
  purchasePrice?: number;
  saleAccountResourceId?: string;
  purchaseAccountResourceId?: string;
  status?: string;
}

export interface TaxProfile {
  resourceId: string;
  name: string;
  taxRate: number;
  taxTypeCode: string;
  status: string;
}

export interface TaxType {
  resourceId: string;
  code: string;
  name: string;
}

export interface Capsule {
  resourceId: string;
  title: string;
  description?: string;
  status?: string;
  type?: string;
  capsuleType?: { resourceId: string; displayName?: string; name?: string };
  startDate?: string;
  endDate?: string;
  totalSchedulers?: number;
  totalTransactions?: number;
}

export interface CapsuleType {
  resourceId: string;
  displayName: string;
  description?: string;
}

export interface Bookmark {
  resourceId: string;
  name: string;
  value: string;
  categoryCode: string;
}

export interface OrgUser {
  resourceId: string;
  firstName: string;
  lastName: string;
  email: string;
  moduleRoles: ModuleRole[];
}

export interface ModuleRole {
  moduleName: ModuleName;
  roleCode: RoleCode;
}

export type ModuleName =
  | 'ORGANIZATION' | 'USER_MANAGEMENT' | 'ACCOUNTING'
  | 'SALES' | 'PURCHASES' | 'REPORTS' | 'FIXED_ASSET';

export type RoleCode = 'ADMIN' | 'PREPARER' | 'MEMBER' | 'NO_ACCESS';

export type Repeat = 'ONE_TIME' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';

// ── Cashflow Transaction Types ────────────────────────────────────

export interface CashflowTransaction {
  resourceId: string;
  parentEntityResourceId: string; // journal header ID — use for DELETE (/cashflow-journals/:id)
  businessTransactionResourceId: string;
  transactionReference: string;
  transactionStatus: string;
  businessTransactionType: string;
  direction: string;
  totalAmount: number;
  valueDate: number; // epoch ms
  currencyCode: string;
  currencySymbol: string;
  crossCurrency: boolean;
  organizationAccountResourceId: string;
  account: {
    resourceId: string;
    name: string;
    accountType: string;
    accountClass: string;
  };
  contactResourceId: string | null;
  contact: unknown | null;
}

// ── Report Types ──────────────────────────────────────────────────

export interface TrialBalanceRow {
  accountCode: string;
  accountName: string;
  accountType: string;
  debit: number;
  credit: number;
  balance: number;
}

export interface ReportResponse {
  data: unknown;
}

export interface ExportResponse {
  data: {
    fileName: string;
    fileUrl: string;
  };
}

// ── Data Export Types ─────────────────────────────────────────────

export type ExportType =
  | 'trial-balance' | 'balance-sheet' | 'profit-and-loss'
  | 'general-ledger' | 'cashflow' | 'cash-balance'
  | 'ar-report' | 'ap-report'
  | 'sales-summary' | 'sales-payments-summary'
  | 'purchase-summary' | 'purchase-payments-summary'
  | 'customer-revenue-summary' | 'product-sales-summary' | 'periodic-revenue-summary'
  | 'supplier-expense-summary' | 'product-purchase-summary' | 'periodic-expense-summary'
  | 'credit-note-summary'
  | 'sales-cost-margin'
  | 'sale-inventory-movement' | 'purchase-inventory-movement'
  | 'analysis-anomalous-invoices' | 'analysis-anomalous-bills'
  | 'analysis-cashflow-anomalies' | 'analysis-gl-journal-audit'
  | 'analysis-receivables-customer-risk' | 'analysis-cash-expense-health'
  | 'statement-of-account-export';

// ── Attachment Types ─────────────────────────────────────────────

export interface Attachment {
  resourceId: string;
  fileName: string;
  fileUrl: string;
  fileType?: string;
  createdAt?: string;
}
