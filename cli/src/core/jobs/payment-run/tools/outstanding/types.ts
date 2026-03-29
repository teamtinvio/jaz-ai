/**
 * Types for `clio jobs payment-run outstanding`.
 * Fetches outstanding (unpaid) bills from the Jaz API, grouped by supplier.
 */

export interface OutstandingBill {
  resourceId: string;
  reference: string;
  valueDate: string;
  dueDate: string;
  totalAmount: number;
  balanceAmount: number;
  contactResourceId: string;
  contactName: string;
  currency: string;
  isOverdue: boolean;
}

export interface SupplierGroup {
  contactResourceId: string;
  contactName: string;
  billCount: number;
  totalBalance: number;
  earliestDueDate: string;
  overdueCount: number;
  bills: OutstandingBill[];
}

export interface OutstandingResult {
  type: 'outstanding';
  totalBills: number;
  totalBalance: number;
  currency: string;
  supplierCount: number;
  overdueCount: number;
  asOfDate: string;
  dueBefore?: string;
  suppliers: SupplierGroup[];
}
