/**
 * Pagination helper for list/search tools.
 * All list/search tool execute functions route through this.
 * CLI commands that need bulk fetch use fetchAllPages() directly.
 */
import type { PaginatedResponse } from '../api/types.js';

/** Paginate a tool call with sensible defaults. */
export async function handlePagination<T>(
  fetcher: (offset: number, limit: number) => Promise<PaginatedResponse<T>>,
  limit: number | undefined,
  offset: number | undefined,
  defaultLimit: number,
): Promise<unknown> {
  return fetcher(offset ?? 0, limit ?? defaultLimit);
}

/** Build a credit note search filter from agent input (shared by customer + supplier CN search). */
export function buildCnFilter(input: Record<string, unknown>): Record<string, unknown> | undefined {
  const f: Record<string, unknown> = {};
  if (input.reference) f.reference = { contains: input.reference };
  if (input.status) f.status = { eq: input.status };
  if (input.contactResourceId) f.contactResourceId = { eq: input.contactResourceId };
  return Object.keys(f).length > 0 ? f : undefined;
}

/** Build invoice/bill search filter (shared by CLI + tool + MCP). */
export function buildInvoiceBillFilter(input: Record<string, unknown>): Record<string, unknown> | undefined {
  const f: Record<string, unknown> = {};
  if (input.reference) f.reference = { contains: input.reference };
  if (input.status) f.status = { eq: input.status };
  if (input.contactResourceId) f.contactResourceId = { eq: input.contactResourceId };
  if (input.contactName) f.contact = { name: { contains: input.contactName } };
  if (input.tag) f.tags = { name: { eq: input.tag } };
  if (input.currencyCode) f.currencyCode = { eq: input.currencyCode };
  const minAmt = typeof input.minAmount === 'number' && Number.isFinite(input.minAmount) ? input.minAmount : undefined;
  const maxAmt = typeof input.maxAmount === 'number' && Number.isFinite(input.maxAmount) ? input.maxAmount : undefined;
  if (minAmt != null || maxAmt != null) {
    const a: Record<string, number> = {};
    if (minAmt != null) a.gte = minAmt;
    if (maxAmt != null) a.lte = maxAmt;
    f.totalAmount = a;
  }
  if (input.startDate || input.endDate) {
    const d: Record<string, string> = {};
    if (input.startDate) d.gte = input.startDate as string;
    if (input.endDate) d.lte = input.endDate as string;
    f.valueDate = d;
  }
  if (input.dueDateFrom || input.dueDateTo) {
    const d: Record<string, string> = {};
    if (input.dueDateFrom) d.gte = input.dueDateFrom as string;
    if (input.dueDateTo) d.lte = input.dueDateTo as string;
    f.dueDate = d;
  }
  return Object.keys(f).length > 0 ? f : undefined;
}

/** Build journal search filter (shared by CLI + tool + MCP). */
export function buildJournalFilter(input: Record<string, unknown>): Record<string, unknown> | undefined {
  const f: Record<string, unknown> = {};
  if (input.reference) f.reference = { contains: input.reference };
  if (input.status) f.status = { eq: input.status };
  if (input.tag) f.tags = { name: { eq: input.tag } };
  if (input.type) f.type = { eq: input.type };
  if (input.startDate || input.endDate) {
    const d: Record<string, string> = {};
    if (input.startDate) d.gte = input.startDate as string;
    if (input.endDate) d.lte = input.endDate as string;
    f.valueDate = d;
  }
  return Object.keys(f).length > 0 ? f : undefined;
}

/** Build contact search filter (shared by CLI + tool + MCP).
 * Note: contacts search does NOT support `or`/`andGroup` — use `name` contains
 * which searches both name and billingName server-side. */
export function buildContactFilter(input: Record<string, unknown>): Record<string, unknown> | undefined {
  const f: Record<string, unknown> = {};
  if (input.query) f.name = { contains: input.query };
  if (input.isCustomer !== undefined) f.customer = { eq: input.isCustomer };
  if (input.isSupplier !== undefined) f.supplier = { eq: input.isSupplier };
  if (input.status) f.status = { eq: input.status };
  if (input.email) f.email = { contains: input.email };
  return Object.keys(f).length > 0 ? f : undefined;
}

/** Build cashflow transaction search filter (shared by CLI + tool + MCP). */
export function buildCashflowFilter(input: Record<string, unknown>): Record<string, unknown> | undefined {
  const f: Record<string, unknown> = {};
  if (input.businessTransactionType) f.businessTransactionType = { eq: input.businessTransactionType };
  if (input.direction) f.direction = { eq: input.direction };
  if (input.status) f.businessTransactionStatus = { eq: input.status };
  if (input.reference) f.transactionReference = { contains: input.reference };
  if (input.startDate || input.endDate) {
    const d: Record<string, string> = {};
    if (input.startDate) d.gte = input.startDate as string;
    if (input.endDate) d.lte = input.endDate as string;
    f.valueDate = d;
  }
  return Object.keys(f).length > 0 ? f : undefined;
}

/** Build a bank record search filter (shared by CLI + MCP tool). */
export function buildBankRecordFilter(input: Record<string, unknown>): Record<string, unknown> | undefined {
  const f: Record<string, unknown> = {};
  if (input.status) f.status = { eq: input.status };
  if (input.description) f.description = { contains: input.description };
  if (input.payer) f.extContactName = { contains: input.payer };
  if (input.reference) f.extReference = { contains: input.reference };
  // Date range → valueDate expression
  if (input.from || input.to) {
    const d: Record<string, string> = {};
    if (input.from) d.gte = input.from as string;
    if (input.to) d.lte = input.to as string;
    f.valueDate = d;
  }
  // Amount range → netAmount expression (guard against NaN/Infinity)
  const min = typeof input.amountMin === 'number' && Number.isFinite(input.amountMin) ? input.amountMin : undefined;
  const max = typeof input.amountMax === 'number' && Number.isFinite(input.amountMax) ? input.amountMax : undefined;
  if (min != null || max != null) {
    const a: Record<string, number> = {};
    if (min != null) a.gte = min;
    if (max != null) a.lte = max;
    f.netAmount = a;
  }
  return Object.keys(f).length > 0 ? f : undefined;
}
