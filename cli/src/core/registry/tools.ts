/**
 * THE single source of truth for all agent tools.
 *
 * Each tool = neutral schema (params) + execute function (calls core/api/*).
 * Providers convert these to SDK-native format at startup (cached once).
 *
 * CLI commands stay separate — they have their own UX (wizards, chalk, etc.)
 * but share the same core/api/* layer.
 */
import type { ToolDefinition, ParamDef } from './types.js';
import type { AgentContext } from '../../agent/context.js';
import type { Payment, PaginatedResponse } from '../api/types.js';

import { getOrganization } from '../api/organization.js';
import {
  listAccounts, searchAccounts, createAccount, updateAccount,
} from '../api/chart-of-accounts.js';
import {
  listContacts, searchContacts, getContact, createContact, updateContact,
} from '../api/contacts.js';
import {
  listInvoices, searchInvoices, getInvoice, createInvoice,
  updateInvoice, deleteInvoice, createInvoicePayment,
  createScheduledInvoice,
  finalizeInvoice, applyCreditsToInvoice, downloadInvoicePdf,
} from '../api/invoices.js';
import {
  listBills, searchBills, getBill, createBill,
  updateBill, deleteBill, createBillPayment,
  createScheduledBill,
  finalizeBill, applyCreditsToBill,
} from '../api/bills.js';
import {
  listJournals, searchJournals, createJournal, deleteJournal,
  updateJournal, createScheduledJournal,
} from '../api/journals.js';
import {
  generateTrialBalance, generateBalanceSheet, generateProfitAndLoss,
  generateCashflow, generateArSummary, generateApSummary,
  generateCashBalance, generateGeneralLedger,
} from '../api/reports.js';
import { listBankAccounts, importBankStatement } from '../api/bank.js';
import {
  listItems, searchItems, getItem, createItem, updateItem, deleteItem,
} from '../api/items.js';
import {
  listTags, searchTags, createTag, deleteTag,
} from '../api/tags.js';
import {
  listCapsuleTypes, listCapsules, searchCapsules, getCapsule,
  createCapsule, updateCapsule, deleteCapsule,
} from '../api/capsules.js';
import {
  listCustomerCreditNotes, searchCustomerCreditNotes,
  getCustomerCreditNote, createCustomerCreditNote, deleteCustomerCreditNote,
  updateCustomerCreditNote, finalizeCustomerCreditNote,
  createCustomerCreditNoteRefund, listCustomerCreditNoteRefunds,
} from '../api/customer-cn.js';
import {
  listSupplierCreditNotes, searchSupplierCreditNotes,
  getSupplierCreditNote, createSupplierCreditNote, deleteSupplierCreditNote,
  updateSupplierCreditNote, finalizeSupplierCreditNote,
  createSupplierCreditNoteRefund, listSupplierCreditNoteRefunds,
} from '../api/supplier-cn.js';
import {
  listCurrencies, addCurrency, listCurrencyRates,
  addCurrencyRate, updateCurrencyRate,
  startCurrencyRatesImportJob, getCurrencyRatesImportJobStatus,
} from '../api/currencies.js';
import { listTaxProfiles, listTaxTypes, createTaxProfile } from '../api/tax-profiles.js';
import {
  createCashIn, listCashIn, getCashIn, updateCashIn,
  createCashOut, listCashOut, getCashOut, updateCashOut,
} from '../api/cash-entries.js';
import { createCashTransfer, listCashTransfers } from '../api/cash-transfers.js';
import { listScheduledInvoices, listScheduledBills, listScheduledJournals } from '../api/schedulers.js';
import { runCalculator, RECIPE_TYPES } from '../recipe/dispatch.js';
import { planRecipe, extractBlueprint } from '../recipe/plan.js';
import { executeRecipe } from '../recipe/engine.js';
import { resolveRecipeAccounts, resolveRecipeContact, resolveRecipeBankAccount } from '../intelligence/recipe-resolver.js';
import { getBankAccount, searchBankRecords } from '../api/bank.js';
import { searchCashflowTransactions } from '../api/cashflow.js';
import { listBookmarks, getBookmark, createBookmarks, updateBookmark } from '../api/bookmarks.js';
import { listOrgUsers, searchOrgUsers, inviteOrgUser, updateOrgUser, removeOrgUser } from '../api/org-users.js';
import { listPayments, searchPayments } from '../api/payments.js';
import { downloadExport } from '../api/data-exports.js';
import { listAttachments, addAttachment, fetchAttachmentTable } from '../api/attachments.js';
import { createFromAttachment, searchMagicWorkflows } from '../api/magic.js';
import { messageToPdf } from '../api/message-pdf.js';
import { handlePaginationMode, buildCnFilter } from './pagination.js';

// ── Shared param snippets (DRY) ─────────────────────────────────

const PAGINATION_PARAMS: Record<string, ParamDef> = {
  limit: { type: 'number', description: 'Max results per page (default 100, max 1000)' },
  offset: { type: 'number', description: 'Pagination offset (use with limit to page through results)' },
  mode: { type: 'string', enum: ['sample', 'all'], description: "Pagination mode: 'sample' (20 items + total count), 'all' (fetch everything — may be slow for large datasets). Omit for default limit/offset behavior." },
};

const SEARCH_PARAMS: Record<string, ParamDef> = {
  ...PAGINATION_PARAMS,
  sortBy: { type: 'string', description: 'Sort field (overrides default)' },
  order: { type: 'string', enum: ['ASC', 'DESC'], description: 'Sort direction' },
};

const LINE_ITEM_PARAM: ParamDef = {
  type: 'array',
  items: {
    type: 'object',
    properties: {
      name: { type: 'string', description: 'Line item description/name' },
      quantity: { type: 'number' },
      unitPrice: { type: 'number' },
      accountResourceId: { type: 'string' },
      taxProfileResourceId: { type: 'string' },
    },
    required: ['name', 'quantity', 'unitPrice'],
  },
  description: 'Line items',
};

const CURRENCY_PARAM: ParamDef = {
  type: 'object',
  properties: {
    sourceCurrency: { type: 'string' },
    exchangeRate: { type: 'number' },
  },
};

// ── Helper to extract common input fields ────────────────────────

function extractPaginationInput(input: Record<string, unknown>) {
  const mode = input.mode as string | undefined;
  const limit = input.limit as number | undefined;
  const offset = input.offset as number | undefined;
  const sortBy = input.sortBy as string | undefined;
  const rawOrder = input.order as string | undefined;
  const sortOrder = rawOrder === 'ASC' || rawOrder === 'DESC' ? rawOrder : undefined;
  return { mode, limit, offset, sortBy, sortOrder };
}

// ── List tool factory (DRY — all 10 list tools share this) ───────

function listTool(
  name: string,
  description: string,
  group: ToolDefinition['group'],
  fetcher: (client: AgentContext['client'], off: number, lim: number) => Promise<PaginatedResponse<unknown>>,
): ToolDefinition {
  return {
    name,
    description,
    params: { ...PAGINATION_PARAMS },
    required: [],
    group,
    readOnly: true,
    execute: async (ctx, input) => {
      const { mode, limit, offset } = extractPaginationInput(input);
      return handlePaginationMode(mode, (off, lim) => fetcher(ctx.client, off, lim), limit, offset, 100);
    },
  };
}

// ── Tool Definitions ─────────────────────────────────────────────

export const TOOL_DEFINITIONS: ToolDefinition[] = [
  // ── Organization ───────────────────────────────────────────────
  {
    name: 'get_organization',
    description: 'Get organization details (name, currency, country, lock date, fiscal year end).',
    params: {},
    required: [],
    group: 'organization',
    readOnly: true,
    execute: async (ctx) => getOrganization(ctx.client),
  },

  // ── Chart of Accounts ──────────────────────────────────────────
  listTool(
    'list_accounts',
    'List chart of accounts. Returns account name, code, type, class, status. Paginated — response includes totalElements. Use limit/offset to page.',
    'accounts',
    (client, off, lim) => listAccounts(client, { limit: lim, offset: off }),
  ),
  {
    name: 'search_accounts',
    description: 'Search chart of accounts by name or code. Returns up to 100 by default. Use limit/offset to page through large result sets.',
    params: {
      query: { type: 'string', description: 'Search term (account name or code)' },
      ...SEARCH_PARAMS,
    },
    required: ['query'],
    group: 'accounts',
    readOnly: true,
    execute: async (ctx, input) => {
      const { mode, limit, offset, sortBy, sortOrder } = extractPaginationInput(input);
      const query = input.query as string;
      return handlePaginationMode(mode, (off, lim) => searchAccounts(ctx.client, {
        filter: { or: { name: { contains: query }, code: { contains: query } } },
        limit: lim, offset: off,
        sort: { sortBy: [sortBy ?? 'code'], order: (sortOrder ?? 'ASC') as 'ASC' | 'DESC' },
      }), limit, offset, 100);
    },
  },
  {
    name: 'create_account',
    description: 'Create a new chart of accounts entry. Code must be unique within the org.',
    params: {
      name: { type: 'string', description: 'Account name' },
      code: { type: 'string', description: 'Account code (unique)' },
      accountClass: {
        type: 'string',
        enum: ['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'],
        description: 'Account class',
      },
      accountType: { type: 'string', description: 'Account type (e.g., "Current Assets", "Revenue")' },
      currencyCode: { type: 'string', description: 'Currency code (e.g., "SGD")' },
    },
    required: ['name', 'code', 'accountClass', 'accountType'],
    group: 'accounts',
    readOnly: false,
    execute: async (ctx, input) => createAccount(ctx.client, {
      code: input.code as string,
      name: input.name as string,
      accountType: input.accountType as string,
      currencyCode: input.currencyCode as string | undefined,
    }),
  },
  {
    name: 'update_account',
    description: 'Update an existing chart of accounts entry (name or code).',
    params: {
      resourceId: { type: 'string', description: 'Account resourceId' },
      name: { type: 'string', description: 'New account name' },
      code: { type: 'string', description: 'New account code' },
    },
    required: ['resourceId'],
    group: 'accounts',
    readOnly: false,
    execute: async (ctx, input) => updateAccount(ctx.client, input.resourceId as string, {
      name: input.name as string | undefined,
      code: input.code as string | undefined,
    }),
  },

  // ── Contacts ───────────────────────────────────────────────────
  listTool(
    'list_contacts',
    'List contacts (customers/suppliers). Returns billingName, name, emails, status. Paginated — response includes totalElements. Use limit/offset to page.',
    'contacts',
    (client, off, lim) => listContacts(client, { limit: lim, offset: off }),
  ),
  {
    name: 'search_contacts',
    description: 'Search contacts by name. Searches both billingName and name fields. Returns up to 100 by default. Use limit/offset to page through large result sets.',
    params: {
      query: { type: 'string', description: 'Search term' },
      ...SEARCH_PARAMS,
    },
    required: ['query'],
    group: 'contacts',
    readOnly: true,
    execute: async (ctx, input) => {
      const { mode, limit, offset, sortBy, sortOrder } = extractPaginationInput(input);
      const query = input.query as string;
      return handlePaginationMode(mode, (off, lim) => searchContacts(ctx.client, {
        filter: { or: { billingName: { contains: query }, name: { contains: query } } },
        limit: lim, offset: off,
        sort: { sortBy: [sortBy ?? 'billingName'], order: (sortOrder ?? 'ASC') as 'ASC' | 'DESC' },
      }), limit, offset, 100);
    },
  },
  {
    name: 'get_contact',
    description: 'Get full contact details by resourceId.',
    params: {
      resourceId: { type: 'string', description: 'Contact resourceId (UUID)' },
    },
    required: ['resourceId'],
    group: 'contacts',
    readOnly: true,
    execute: async (ctx, input) => getContact(ctx.client, input.resourceId as string),
  },
  {
    name: 'create_contact',
    description: 'Create a new contact. IMPORTANT: Search first to avoid duplicates. Sets both billingName and name.',
    params: {
      billingName: { type: 'string', description: 'Official billing name' },
      name: { type: 'string', description: 'Display name (usually same as billingName)' },
      email: { type: 'string', description: 'Primary email address' },
      customer: { type: 'boolean', description: 'Is a customer (default true)' },
      supplier: { type: 'boolean', description: 'Is a supplier (default false)' },
    },
    required: ['billingName'],
    group: 'contacts',
    readOnly: false,
    execute: async (ctx, input) => createContact(ctx.client, {
      billingName: input.billingName as string,
      name: (input.name as string) ?? (input.billingName as string),
      emails: input.email ? [input.email as string] : undefined,
      customer: (input.customer as boolean) ?? true,
      supplier: (input.supplier as boolean) ?? false,
    }),
  },
  {
    name: 'update_contact',
    description: 'Update an existing contact.',
    params: {
      resourceId: { type: 'string', description: 'Contact resourceId' },
      billingName: { type: 'string' },
      name: { type: 'string' },
      email: { type: 'string' },
    },
    required: ['resourceId'],
    group: 'contacts',
    readOnly: false,
    execute: async (ctx, input) => updateContact(ctx.client, input.resourceId as string, {
      billingName: input.billingName as string | undefined,
      name: input.name as string | undefined,
    }),
  },

  // ── Invoices ───────────────────────────────────────────────────
  listTool(
    'list_invoices',
    'List invoices. Returns reference, date, status, contact, totalAmount. Paginated — response includes totalElements. Use limit/offset to page.',
    'invoices',
    (client, off, lim) => listInvoices(client, { limit: lim, offset: off }),
  ),
  {
    name: 'search_invoices',
    description: 'Search invoices by reference or contact name. Returns up to 100 by default. Use limit/offset to page through large result sets.',
    params: {
      query: { type: 'string', description: 'Search term (reference or contact name)' },
      ...SEARCH_PARAMS,
    },
    required: ['query'],
    group: 'invoices',
    readOnly: true,
    execute: async (ctx, input) => {
      const { mode, limit, offset, sortBy, sortOrder } = extractPaginationInput(input);
      const query = input.query as string | undefined;
      return handlePaginationMode(mode, (off, lim) => searchInvoices(ctx.client, {
        filter: query ? { reference: { contains: query } } : undefined,
        limit: lim, offset: off,
        sort: { sortBy: [sortBy ?? 'valueDate'], order: (sortOrder ?? 'DESC') as 'ASC' | 'DESC' },
      }), limit, offset, 100);
    },
  },
  {
    name: 'get_invoice',
    description: 'Get full invoice details including line items, payments, totals.',
    params: {
      resourceId: { type: 'string', description: 'Invoice resourceId' },
    },
    required: ['resourceId'],
    group: 'invoices',
    readOnly: true,
    execute: async (ctx, input) => getInvoice(ctx.client, input.resourceId as string),
  },
  {
    name: 'create_invoice',
    description: `Create a new invoice. IMPORTANT:
- Line items use "name" (not "description") for the item label.
- saveAsDraft defaults to true. Set to false only if user says "finalize".
- Currency format: { sourceCurrency: "USD", exchangeRate: 1.35 }
- contactResourceId is required — search contacts first to get the ID.
- Dates must be YYYY-MM-DD format.`,
    params: {
      reference: { type: 'string', description: 'Invoice reference number' },
      valueDate: { type: 'string', description: 'Invoice date (YYYY-MM-DD)' },
      dueDate: { type: 'string', description: 'Due date (YYYY-MM-DD)' },
      contactResourceId: { type: 'string', description: 'Contact resourceId' },
      lineItems: LINE_ITEM_PARAM,
      currency: CURRENCY_PARAM,
      saveAsDraft: { type: 'boolean', description: 'Save as draft (default true)' },
      notes: { type: 'string' },
      tag: { type: 'string' },
    },
    required: ['reference', 'valueDate', 'dueDate', 'contactResourceId', 'lineItems'],
    group: 'invoices',
    readOnly: false,
    execute: async (ctx, input) => createInvoice(ctx.client, input as Parameters<typeof createInvoice>[1]),
  },
  {
    name: 'update_invoice',
    description: 'Update an existing draft invoice. Cannot update finalized invoices.',
    params: {
      resourceId: { type: 'string', description: 'Invoice resourceId' },
      reference: { type: 'string' },
      valueDate: { type: 'string' },
      dueDate: { type: 'string' },
      lineItems: { type: 'array', items: { type: 'object' } },
      notes: { type: 'string' },
    },
    required: ['resourceId'],
    group: 'invoices',
    readOnly: false,
    execute: async (ctx, input) => updateInvoice(
      ctx.client,
      input.resourceId as string,
      input as Parameters<typeof updateInvoice>[2],
    ),
  },
  {
    name: 'delete_invoice',
    description: 'Delete a draft invoice. Cannot delete finalized invoices.',
    params: {
      resourceId: { type: 'string', description: 'Invoice resourceId' },
    },
    required: ['resourceId'],
    group: 'invoices',
    readOnly: false,
    execute: async (ctx, input) => deleteInvoice(ctx.client, input.resourceId as string),
  },
  {
    name: 'pay_invoice',
    description: 'Record a payment against an invoice.',
    params: {
      resourceId: { type: 'string', description: 'Invoice resourceId' },
      paymentAmount: { type: 'number', description: 'Amount to pay' },
      accountResourceId: { type: 'string', description: 'Bank/cash account resourceId for payment' },
      valueDate: { type: 'string', description: 'Payment date (YYYY-MM-DD)' },
      reference: { type: 'string', description: 'Payment reference' },
      paymentMethod: {
        type: 'string',
        enum: ['CASH', 'BANK_TRANSFER', 'CREDIT_CARD', 'CHEQUE', 'E_WALLET', 'OTHER'],
        description: 'Payment method (default BANK_TRANSFER)',
      },
    },
    required: ['resourceId', 'paymentAmount', 'accountResourceId', 'valueDate'],
    group: 'invoices',
    readOnly: false,
    execute: async (ctx, input) => {
      const payAmt = Number(input.paymentAmount);
      if (!Number.isFinite(payAmt) || payAmt <= 0) {
        throw new Error('paymentAmount must be a positive number');
      }
      const txnAmt = Number(input.transactionAmount ?? payAmt);
      if (!Number.isFinite(txnAmt) || txnAmt <= 0) {
        throw new Error('transactionAmount must be a positive number');
      }
      return createInvoicePayment(ctx.client, input.resourceId as string, {
        paymentAmount: payAmt,
        transactionAmount: txnAmt,
        accountResourceId: input.accountResourceId as string,
        valueDate: input.valueDate as string,
        dueDate: input.valueDate as string,
        reference: (input.reference as string) ?? '',
        paymentMethod: ((input.paymentMethod as string) ?? 'BANK_TRANSFER') as Payment['paymentMethod'],
        saveAsDraft: false,
      });
    },
  },

  {
    name: 'finalize_invoice',
    description: 'Finalize a draft invoice (set saveAsDraft=false). Can optionally update fields in the same call.',
    params: {
      resourceId: { type: 'string', description: 'Invoice resourceId' },
      reference: { type: 'string' },
      valueDate: { type: 'string' },
      dueDate: { type: 'string' },
      lineItems: { type: 'array', items: { type: 'object' } },
      notes: { type: 'string' },
    },
    required: ['resourceId'],
    group: 'invoices',
    readOnly: false,
    execute: async (ctx, input) => {
      const { resourceId: rid, ...data } = input;
      return finalizeInvoice(ctx.client, rid as string, data as Parameters<typeof finalizeInvoice>[2]);
    },
  },
  {
    name: 'apply_credits_to_invoice',
    description: 'Apply customer credit note(s) to an invoice. Each credit needs creditNoteResourceId and amountApplied.',
    params: {
      resourceId: { type: 'string', description: 'Invoice resourceId' },
      credits: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            creditNoteResourceId: { type: 'string', description: 'Customer credit note resourceId' },
            amountApplied: { type: 'number', description: 'Amount to apply' },
          },
          required: ['creditNoteResourceId', 'amountApplied'],
        },
        description: 'Credits to apply',
      },
    },
    required: ['resourceId', 'credits'],
    group: 'invoices',
    readOnly: false,
    execute: async (ctx, input) => applyCreditsToInvoice(
      ctx.client,
      input.resourceId as string,
      input.credits as Parameters<typeof applyCreditsToInvoice>[2],
    ),
  },
  {
    name: 'download_invoice_pdf',
    description: 'Download an invoice as PDF. Returns { fileUrl }.',
    params: {
      resourceId: { type: 'string', description: 'Invoice resourceId' },
    },
    required: ['resourceId'],
    group: 'invoices',
    readOnly: true,
    execute: async (ctx, input) => downloadInvoicePdf(ctx.client, input.resourceId as string),
  },

  // ── Bills ──────────────────────────────────────────────────────
  listTool(
    'list_bills',
    'List bills (purchase invoices). Returns reference, date, status, contact, amounts. Paginated — response includes totalElements. Use limit/offset to page.',
    'bills',
    (client, off, lim) => listBills(client, { limit: lim, offset: off }),
  ),
  {
    name: 'search_bills',
    description: 'Search bills by reference or contact name. Returns up to 100 by default. Use limit/offset to page through large result sets.',
    params: {
      query: { type: 'string', description: 'Search term' },
      ...SEARCH_PARAMS,
    },
    required: ['query'],
    group: 'bills',
    readOnly: true,
    execute: async (ctx, input) => {
      const { mode, limit, offset, sortBy, sortOrder } = extractPaginationInput(input);
      const query = input.query as string | undefined;
      return handlePaginationMode(mode, (off, lim) => searchBills(ctx.client, {
        filter: query ? { reference: { contains: query } } : undefined,
        limit: lim, offset: off,
        sort: { sortBy: [sortBy ?? 'valueDate'], order: (sortOrder ?? 'DESC') as 'ASC' | 'DESC' },
      }), limit, offset, 100);
    },
  },
  {
    name: 'get_bill',
    description: 'Get full bill details.',
    params: {
      resourceId: { type: 'string' },
    },
    required: ['resourceId'],
    group: 'bills',
    readOnly: true,
    execute: async (ctx, input) => getBill(ctx.client, input.resourceId as string),
  },
  {
    name: 'create_bill',
    description: 'Create a new bill. Same rules as create_invoice (name not description, saveAsDraft default).',
    params: {
      reference: { type: 'string' },
      valueDate: { type: 'string' },
      dueDate: { type: 'string' },
      contactResourceId: { type: 'string' },
      lineItems: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            quantity: { type: 'number' },
            unitPrice: { type: 'number' },
            accountResourceId: { type: 'string' },
          },
          required: ['name', 'quantity', 'unitPrice'],
        },
      },
      currency: { type: 'object' },
      saveAsDraft: { type: 'boolean' },
      notes: { type: 'string' },
    },
    required: ['reference', 'valueDate', 'dueDate', 'contactResourceId', 'lineItems'],
    group: 'bills',
    readOnly: false,
    execute: async (ctx, input) => createBill(ctx.client, input as Parameters<typeof createBill>[1]),
  },
  {
    name: 'update_bill',
    description: 'Update an existing draft bill. Cannot update finalized bills.',
    params: {
      resourceId: { type: 'string', description: 'Bill resourceId' },
      reference: { type: 'string' },
      valueDate: { type: 'string' },
      dueDate: { type: 'string' },
      lineItems: { type: 'array', items: { type: 'object' } },
      notes: { type: 'string' },
    },
    required: ['resourceId'],
    group: 'bills',
    readOnly: false,
    execute: async (ctx, input) => updateBill(
      ctx.client,
      input.resourceId as string,
      input as Parameters<typeof updateBill>[2],
    ),
  },
  {
    name: 'delete_bill',
    description: 'Delete a draft bill.',
    params: {
      resourceId: { type: 'string' },
    },
    required: ['resourceId'],
    group: 'bills',
    readOnly: false,
    execute: async (ctx, input) => deleteBill(ctx.client, input.resourceId as string),
  },
  {
    name: 'pay_bill',
    description: 'Record a payment against a bill.',
    params: {
      resourceId: { type: 'string' },
      paymentAmount: { type: 'number' },
      accountResourceId: { type: 'string' },
      valueDate: { type: 'string' },
      reference: { type: 'string' },
      paymentMethod: { type: 'string' },
    },
    required: ['resourceId', 'paymentAmount', 'accountResourceId', 'valueDate'],
    group: 'bills',
    readOnly: false,
    execute: async (ctx, input) => {
      const billPayAmt = Number(input.paymentAmount);
      if (!Number.isFinite(billPayAmt) || billPayAmt <= 0) {
        throw new Error('paymentAmount must be a positive number');
      }
      const billTxnAmt = Number(input.transactionAmount ?? billPayAmt);
      if (!Number.isFinite(billTxnAmt) || billTxnAmt <= 0) {
        throw new Error('transactionAmount must be a positive number');
      }
      return createBillPayment(ctx.client, input.resourceId as string, {
        paymentAmount: billPayAmt,
        transactionAmount: billTxnAmt,
        accountResourceId: input.accountResourceId as string,
        valueDate: input.valueDate as string,
        dueDate: input.valueDate as string,
        reference: (input.reference as string) ?? '',
        paymentMethod: ((input.paymentMethod as string) ?? 'BANK_TRANSFER') as Payment['paymentMethod'],
        saveAsDraft: false,
      });
    },
  },

  {
    name: 'finalize_bill',
    description: 'Finalize a draft bill (set saveAsDraft=false). Can optionally update fields in the same call.',
    params: {
      resourceId: { type: 'string', description: 'Bill resourceId' },
      reference: { type: 'string' },
      valueDate: { type: 'string' },
      dueDate: { type: 'string' },
      lineItems: { type: 'array', items: { type: 'object' } },
      notes: { type: 'string' },
    },
    required: ['resourceId'],
    group: 'bills',
    readOnly: false,
    execute: async (ctx, input) => {
      const { resourceId: rid, ...data } = input;
      return finalizeBill(ctx.client, rid as string, data as Parameters<typeof finalizeBill>[2]);
    },
  },
  {
    name: 'apply_credits_to_bill',
    description: 'Apply supplier credit note(s) to a bill. Each credit needs creditNoteResourceId and amountApplied.',
    params: {
      resourceId: { type: 'string', description: 'Bill resourceId' },
      credits: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            creditNoteResourceId: { type: 'string', description: 'Supplier credit note resourceId' },
            amountApplied: { type: 'number', description: 'Amount to apply' },
          },
          required: ['creditNoteResourceId', 'amountApplied'],
        },
        description: 'Credits to apply',
      },
    },
    required: ['resourceId', 'credits'],
    group: 'bills',
    readOnly: false,
    execute: async (ctx, input) => applyCreditsToBill(
      ctx.client,
      input.resourceId as string,
      input.credits as Parameters<typeof applyCreditsToBill>[2],
    ),
  },

  // ── Journals ───────────────────────────────────────────────────
  listTool(
    'list_journals',
    'List journal entries. Paginated — response includes totalElements. Use limit/offset to page.',
    'journals',
    (client, off, lim) => listJournals(client, { limit: lim, offset: off }),
  ),
  {
    name: 'search_journals',
    description: 'Search journals by reference. Returns up to 100 by default. Use limit/offset to page through large result sets.',
    params: {
      query: { type: 'string' },
      ...SEARCH_PARAMS,
    },
    required: ['query'],
    group: 'journals',
    readOnly: true,
    execute: async (ctx, input) => {
      const { mode, limit, offset, sortBy, sortOrder } = extractPaginationInput(input);
      const query = input.query as string;
      return handlePaginationMode(mode, (off, lim) => searchJournals(ctx.client, {
        filter: { reference: { contains: query } },
        limit: lim, offset: off,
        sort: { sortBy: [sortBy ?? 'valueDate'], order: (sortOrder ?? 'DESC') as 'ASC' | 'DESC' },
      }), limit, offset, 100);
    },
  },
  {
    name: 'create_journal',
    description: `Create a journal entry. IMPORTANT:
- Each entry needs accountResourceId, type (DEBIT or CREDIT), and amount.
- Total debits MUST equal total credits.
- Search accounts first to get the correct resourceIds.`,
    params: {
      reference: { type: 'string', description: 'Journal reference' },
      valueDate: { type: 'string', description: 'Journal date (YYYY-MM-DD)' },
      journalEntries: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            accountResourceId: { type: 'string' },
            type: { type: 'string', enum: ['DEBIT', 'CREDIT'] },
            amount: { type: 'number' },
            description: { type: 'string' },
          },
          required: ['accountResourceId', 'type', 'amount'],
        },
      },
      saveAsDraft: { type: 'boolean' },
      notes: { type: 'string' },
    },
    required: ['reference', 'valueDate', 'journalEntries'],
    group: 'journals',
    readOnly: false,
    execute: async (ctx, input) => createJournal(ctx.client, input as Parameters<typeof createJournal>[1]),
  },
  {
    name: 'delete_journal',
    description: 'Delete a draft journal entry.',
    params: {
      resourceId: { type: 'string' },
    },
    required: ['resourceId'],
    group: 'journals',
    readOnly: false,
    execute: async (ctx, input) => deleteJournal(ctx.client, input.resourceId as string),
  },

  // ── Reports ────────────────────────────────────────────────────
  {
    name: 'generate_trial_balance',
    description: 'Generate a trial balance report.',
    params: {
      endDate: { type: 'string', description: 'Snapshot date (YYYY-MM-DD)' },
      currencyCode: { type: 'string', description: 'Currency override' },
    },
    required: ['endDate'],
    group: 'reports',
    readOnly: true,
    execute: async (ctx, input) => generateTrialBalance(ctx.client, input as Parameters<typeof generateTrialBalance>[1]),
  },
  {
    name: 'generate_balance_sheet',
    description: 'Generate a balance sheet report.',
    params: {
      snapshotDate: { type: 'string', description: 'Snapshot date (YYYY-MM-DD)' },
      currencyCode: { type: 'string' },
    },
    required: ['snapshotDate'],
    group: 'reports',
    readOnly: true,
    execute: async (ctx, input) => generateBalanceSheet(ctx.client, input as Parameters<typeof generateBalanceSheet>[1]),
  },
  {
    name: 'generate_profit_and_loss',
    description: 'Generate a profit & loss (income statement) report.',
    params: {
      startDate: { type: 'string', description: 'Period start (YYYY-MM-DD)' },
      endDate: { type: 'string', description: 'Period end (YYYY-MM-DD)' },
      currencyCode: { type: 'string' },
    },
    required: ['startDate', 'endDate'],
    group: 'reports',
    readOnly: true,
    execute: async (ctx, input) => generateProfitAndLoss(ctx.client, input as Parameters<typeof generateProfitAndLoss>[1]),
  },
  {
    name: 'generate_cashflow',
    description: 'Generate a cashflow report.',
    params: {
      startDate: { type: 'string' },
      endDate: { type: 'string' },
    },
    required: ['startDate', 'endDate'],
    group: 'reports',
    readOnly: true,
    execute: async (ctx, input) => generateCashflow(ctx.client, input as Parameters<typeof generateCashflow>[1]),
  },
  {
    name: 'generate_aged_ar',
    description: 'Generate aged accounts receivable summary.',
    params: {
      endDate: { type: 'string' },
    },
    required: ['endDate'],
    group: 'reports',
    readOnly: true,
    execute: async (ctx, input) => generateArSummary(ctx.client, input as Parameters<typeof generateArSummary>[1]),
  },
  {
    name: 'generate_aged_ap',
    description: 'Generate aged accounts payable summary.',
    params: {
      endDate: { type: 'string' },
    },
    required: ['endDate'],
    group: 'reports',
    readOnly: true,
    execute: async (ctx, input) => generateApSummary(ctx.client, input as Parameters<typeof generateApSummary>[1]),
  },
  {
    name: 'generate_cash_balance',
    description: 'Generate a cash balance report showing cash position at a specific date.',
    params: {
      endDate: { type: 'string', description: 'Snapshot date (YYYY-MM-DD)' },
    },
    required: ['endDate'],
    group: 'reports',
    readOnly: true,
    execute: async (ctx, input) => generateCashBalance(ctx.client, input as Parameters<typeof generateCashBalance>[1]),
  },
  {
    name: 'generate_general_ledger',
    description: 'Generate a general ledger report.',
    params: {
      startDate: { type: 'string', description: 'Period start (YYYY-MM-DD)' },
      endDate: { type: 'string', description: 'Period end (YYYY-MM-DD)' },
      groupBy: { type: 'string', description: 'Group by: ACCOUNT (default), TRANSACTION, or CAPSULE' },
    },
    required: ['startDate', 'endDate'],
    group: 'reports',
    readOnly: true,
    execute: async (ctx, input) => {
      const i = input as Record<string, unknown>;
      return generateGeneralLedger(ctx.client, {
        ...i,
        groupBy: (i.groupBy as string) ?? 'ACCOUNT',
      } as Parameters<typeof generateGeneralLedger>[1]);
    },
  },

  // ── Bank Accounts ──────────────────────────────────────────────
  {
    name: 'list_bank_accounts',
    description: 'List bank accounts connected to the organization.',
    params: {},
    required: [],
    group: 'bank',
    readOnly: true,
    execute: async (ctx) => listBankAccounts(ctx.client),
  },

  // ── Items ──────────────────────────────────────────────────────
  listTool(
    'list_items',
    'List items (products & services). Returns internalName, itemCode, appliesToSale/Purchase. Paginated — response includes totalElements. Use limit/offset to page.',
    'items',
    (client, off, lim) => listItems(client, { limit: lim, offset: off }),
  ),
  {
    name: 'search_items',
    description: `Search items with filters. IMPORTANT: Cannot search by name — internalName is NOT a filter field. Use list_items and scan results to find items by name. Supported filters: appliesToSale, appliesToPurchase, status, itemCategory.`,
    params: {
      appliesToSale: { type: 'boolean', description: 'Filter items that apply to sales' },
      appliesToPurchase: { type: 'boolean', description: 'Filter items that apply to purchases' },
      status: { type: 'string', enum: ['ACTIVE', 'INACTIVE'], description: 'Filter by status' },
      itemCategory: { type: 'string', description: 'Filter by item category' },
      ...SEARCH_PARAMS,
    },
    required: [],
    group: 'items',
    readOnly: true,
    execute: async (ctx, input) => {
      const { mode, limit, offset, sortBy, sortOrder } = extractPaginationInput(input);
      const filter: Record<string, unknown> = {};
      if (input.appliesToSale !== undefined) filter.appliesToSale = { eq: input.appliesToSale };
      if (input.appliesToPurchase !== undefined) filter.appliesToPurchase = { eq: input.appliesToPurchase };
      if (input.status) filter.status = { eq: input.status };
      if (input.itemCategory) filter.itemCategory = { eq: input.itemCategory };
      return handlePaginationMode(mode, (off, lim) => searchItems(ctx.client, {
        filter: Object.keys(filter).length > 0 ? filter : undefined,
        limit: lim, offset: off,
        sort: { sortBy: [sortBy ?? 'internalName'], order: (sortOrder ?? 'ASC') as 'ASC' | 'DESC' },
      }), limit, offset, 100);
    },
  },
  {
    name: 'get_item',
    description: 'Get full item details by resourceId.',
    params: {
      resourceId: { type: 'string', description: 'Item resourceId (UUID)' },
    },
    required: ['resourceId'],
    group: 'items',
    readOnly: true,
    execute: async (ctx, input) => getItem(ctx.client, input.resourceId as string),
  },
  {
    name: 'create_item',
    description: `Create a new item. IMPORTANT:
- saleItemName/purchaseItemName are auto-set from internalName if not provided.
- Set appliesToSale and/or appliesToPurchase to control where the item can be used.`,
    params: {
      itemCode: { type: 'string', description: 'Unique item code' },
      internalName: { type: 'string', description: 'Item name' },
      appliesToSale: { type: 'boolean', description: 'Can be used on invoices' },
      appliesToPurchase: { type: 'boolean', description: 'Can be used on bills' },
      salePrice: { type: 'number', description: 'Default sale price' },
      purchasePrice: { type: 'number', description: 'Default purchase price' },
      saleAccountResourceId: { type: 'string', description: 'Revenue account for sales' },
      purchaseAccountResourceId: { type: 'string', description: 'Expense account for purchases' },
    },
    required: ['itemCode', 'internalName'],
    group: 'items',
    readOnly: false,
    execute: async (ctx, input) => createItem(ctx.client, input as Parameters<typeof createItem>[1]),
  },
  {
    name: 'update_item',
    description: 'Update an existing item. Only send fields you want to change — required fields are auto-merged from current state.',
    params: {
      resourceId: { type: 'string', description: 'Item resourceId' },
      internalName: { type: 'string', description: 'New name' },
      itemCode: { type: 'string', description: 'New code' },
      salePrice: { type: 'number' },
      purchasePrice: { type: 'number' },
      status: { type: 'string', enum: ['ACTIVE', 'INACTIVE'] },
    },
    required: ['resourceId'],
    group: 'items',
    readOnly: false,
    execute: async (ctx, input) => {
      const { resourceId: rid, ...updateData } = input;
      return updateItem(ctx.client, rid as string, updateData);
    },
  },
  {
    name: 'delete_item',
    description: 'Delete an item.',
    params: {
      resourceId: { type: 'string', description: 'Item resourceId' },
    },
    required: ['resourceId'],
    group: 'items',
    readOnly: false,
    execute: async (ctx, input) => deleteItem(ctx.client, input.resourceId as string),
  },

  // ── Tags ───────────────────────────────────────────────────────
  listTool(
    'list_tags',
    'List tags used for transaction categorization. Paginated — response includes totalElements. Use limit/offset to page.',
    'tags',
    (client, off, lim) => listTags(client, { limit: lim, offset: off }),
  ),
  {
    name: 'search_tags',
    description: 'Search tags by name. Returns up to 100 by default. Use limit/offset to page through large result sets.',
    params: {
      query: { type: 'string', description: 'Search term (tag name)' },
      ...SEARCH_PARAMS,
    },
    required: ['query'],
    group: 'tags',
    readOnly: true,
    execute: async (ctx, input) => {
      const { mode, limit, offset, sortBy, sortOrder } = extractPaginationInput(input);
      const query = input.query as string;
      return handlePaginationMode(mode, (off, lim) => searchTags(ctx.client, {
        filter: { tagName: { contains: query } },
        limit: lim, offset: off,
        sort: { sortBy: [sortBy ?? 'tagName'], order: (sortOrder ?? 'ASC') as 'ASC' | 'DESC' },
      }), limit, offset, 100);
    },
  },
  {
    name: 'create_tag',
    description: 'Create a new tag.',
    params: {
      name: { type: 'string', description: 'Tag name' },
    },
    required: ['name'],
    group: 'tags',
    readOnly: false,
    execute: async (ctx, input) => createTag(ctx.client, { name: input.name as string }),
  },
  {
    name: 'delete_tag',
    description: 'Delete a tag.',
    params: {
      resourceId: { type: 'string', description: 'Tag resourceId' },
    },
    required: ['resourceId'],
    group: 'tags',
    readOnly: false,
    execute: async (ctx, input) => deleteTag(ctx.client, input.resourceId as string),
  },

  // ── Capsules ───────────────────────────────────────────────────
  {
    name: 'list_capsule_types',
    description: 'List capsule types (e.g., PREPAID_EXPENSE, DEFERRED_REVENUE). Use to get capsuleTypeResourceId before creating capsules.',
    params: {},
    required: [],
    group: 'capsules',
    readOnly: true,
    execute: async (ctx) => listCapsuleTypes(ctx.client),
  },
  listTool(
    'list_capsules',
    'List capsules (transaction groupings for amortization, deferred revenue, etc.). Paginated — response includes totalElements. Use limit/offset to page.',
    'capsules',
    (client, off, lim) => listCapsules(client, { limit: lim, offset: off }),
  ),
  {
    name: 'search_capsules',
    description: 'Search capsules by title. Returns up to 100 by default. Use limit/offset to page through large result sets.',
    params: {
      query: { type: 'string', description: 'Search term (capsule title)' },
      ...SEARCH_PARAMS,
    },
    required: ['query'],
    group: 'capsules',
    readOnly: true,
    execute: async (ctx, input) => {
      const { mode, limit, offset, sortBy, sortOrder } = extractPaginationInput(input);
      const query = input.query as string;
      return handlePaginationMode(mode, (off, lim) => searchCapsules(ctx.client, {
        filter: { title: { contains: query } },
        limit: lim, offset: off,
        sort: { sortBy: [sortBy ?? 'title'], order: (sortOrder ?? 'ASC') as 'ASC' | 'DESC' },
      }), limit, offset, 100);
    },
  },
  {
    name: 'get_capsule',
    description: 'Get full capsule details by resourceId.',
    params: {
      resourceId: { type: 'string', description: 'Capsule resourceId (UUID)' },
    },
    required: ['resourceId'],
    group: 'capsules',
    readOnly: true,
    execute: async (ctx, input) => getCapsule(ctx.client, input.resourceId as string),
  },
  {
    name: 'create_capsule',
    description: 'Create a new capsule. List capsule types first to get the capsuleTypeResourceId.',
    params: {
      capsuleTypeResourceId: { type: 'string', description: 'Capsule type resourceId (from list_capsule_types)' },
      title: { type: 'string', description: 'Capsule title' },
      description: { type: 'string', description: 'Capsule description' },
    },
    required: ['capsuleTypeResourceId', 'title'],
    group: 'capsules',
    readOnly: false,
    execute: async (ctx, input) => createCapsule(ctx.client, {
      capsuleTypeResourceId: input.capsuleTypeResourceId as string,
      title: input.title as string,
      description: input.description as string | undefined,
    }),
  },
  {
    name: 'update_capsule',
    description: 'Update a capsule title or description. Required fields are auto-merged from current state.',
    params: {
      resourceId: { type: 'string', description: 'Capsule resourceId' },
      title: { type: 'string', description: 'New title' },
      description: { type: 'string', description: 'New description' },
    },
    required: ['resourceId'],
    group: 'capsules',
    readOnly: false,
    execute: async (ctx, input) => {
      const { resourceId: capId, ...capData } = input;
      return updateCapsule(ctx.client, capId as string, capData as Parameters<typeof updateCapsule>[2]);
    },
  },
  {
    name: 'delete_capsule',
    description: 'Delete a capsule.',
    params: {
      resourceId: { type: 'string', description: 'Capsule resourceId' },
    },
    required: ['resourceId'],
    group: 'capsules',
    readOnly: false,
    execute: async (ctx, input) => deleteCapsule(ctx.client, input.resourceId as string),
  },

  // ── Customer Credit Notes ──────────────────────────────────────
  listTool(
    'list_customer_credit_notes',
    'List customer credit notes (AR adjustments/refunds). Paginated — response includes totalElements. Use limit/offset to page.',
    'customer_credit_notes',
    (client, off, lim) => listCustomerCreditNotes(client, { limit: lim, offset: off }),
  ),
  {
    name: 'search_customer_credit_notes',
    description: 'Search customer credit notes by reference, status, or contact. Returns up to 100 by default. Use limit/offset to page through large result sets.',
    params: {
      reference: { type: 'string', description: 'Filter by reference (contains)' },
      status: { type: 'string', enum: ['DRAFT', 'UNAPPLIED', 'APPLIED', 'VOIDED'], description: 'Filter by status' },
      contactResourceId: { type: 'string', description: 'Filter by contact resourceId' },
      ...SEARCH_PARAMS,
    },
    required: [],
    group: 'customer_credit_notes',
    readOnly: true,
    execute: async (ctx, input) => {
      const { mode, limit, offset, sortBy, sortOrder } = extractPaginationInput(input);
      return handlePaginationMode(mode, (off, lim) => searchCustomerCreditNotes(ctx.client, {
        filter: buildCnFilter(input),
        limit: lim, offset: off,
        sort: { sortBy: [sortBy ?? 'valueDate'], order: (sortOrder ?? 'DESC') as 'ASC' | 'DESC' },
      }), limit, offset, 100);
    },
  },
  {
    name: 'get_customer_credit_note',
    description: 'Get full customer credit note details including line items.',
    params: {
      resourceId: { type: 'string', description: 'Customer credit note resourceId' },
    },
    required: ['resourceId'],
    group: 'customer_credit_notes',
    readOnly: true,
    execute: async (ctx, input) => getCustomerCreditNote(ctx.client, input.resourceId as string),
  },
  {
    name: 'create_customer_credit_note',
    description: `Create a customer credit note. Saves as draft by default.
- Status when finalized is UNAPPLIED (not APPROVED).
- Line items use "name" for item description.
- contactResourceId required — search contacts first.`,
    params: {
      reference: { type: 'string', description: 'Credit note reference number' },
      valueDate: { type: 'string', description: 'Credit note date (YYYY-MM-DD)' },
      contactResourceId: { type: 'string', description: 'Customer contact resourceId' },
      lineItems: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Line item description' },
            quantity: { type: 'number' },
            unitPrice: { type: 'number' },
            accountResourceId: { type: 'string' },
          },
          required: ['name', 'quantity', 'unitPrice'],
        },
        description: 'Credit note line items',
      },
      currency: CURRENCY_PARAM,
      saveAsDraft: { type: 'boolean', description: 'Save as draft (default true)' },
      notes: { type: 'string' },
    },
    required: ['valueDate', 'contactResourceId', 'lineItems'],
    group: 'customer_credit_notes',
    readOnly: false,
    execute: async (ctx, input) => createCustomerCreditNote(ctx.client, input as Parameters<typeof createCustomerCreditNote>[1]),
  },
  {
    name: 'delete_customer_credit_note',
    description: 'Delete a draft customer credit note.',
    params: {
      resourceId: { type: 'string', description: 'Customer credit note resourceId' },
    },
    required: ['resourceId'],
    group: 'customer_credit_notes',
    readOnly: false,
    execute: async (ctx, input) => deleteCustomerCreditNote(ctx.client, input.resourceId as string),
  },
  {
    name: 'update_customer_credit_note',
    description: 'Update a draft customer credit note.',
    params: {
      resourceId: { type: 'string', description: 'Customer credit note resourceId' },
      reference: { type: 'string' },
      valueDate: { type: 'string' },
      lineItems: { type: 'array', items: { type: 'object' } },
      notes: { type: 'string' },
    },
    required: ['resourceId'],
    group: 'customer_credit_notes',
    readOnly: false,
    execute: async (ctx, input) => {
      const { resourceId: rid, ...data } = input;
      return updateCustomerCreditNote(ctx.client, rid as string, data as Parameters<typeof updateCustomerCreditNote>[2]);
    },
  },
  {
    name: 'finalize_customer_credit_note',
    description: 'Finalize a draft customer credit note (set saveAsDraft=false). Status becomes UNAPPLIED.',
    params: {
      resourceId: { type: 'string', description: 'Customer credit note resourceId' },
      reference: { type: 'string' },
      valueDate: { type: 'string' },
      lineItems: { type: 'array', items: { type: 'object' } },
      notes: { type: 'string' },
    },
    required: ['resourceId'],
    group: 'customer_credit_notes',
    readOnly: false,
    execute: async (ctx, input) => {
      const { resourceId: rid, ...data } = input;
      return finalizeCustomerCreditNote(ctx.client, rid as string, data as Parameters<typeof finalizeCustomerCreditNote>[2]);
    },
  },
  {
    name: 'create_customer_credit_note_refund',
    description: 'Record a refund payment against a customer credit note.',
    params: {
      creditNoteId: { type: 'string', description: 'Customer credit note resourceId' },
      paymentAmount: { type: 'number', description: 'Refund amount' },
      accountResourceId: { type: 'string', description: 'Bank/cash account resourceId' },
      valueDate: { type: 'string', description: 'Payment date (YYYY-MM-DD)' },
      reference: { type: 'string', description: 'Payment reference' },
      paymentMethod: {
        type: 'string',
        enum: ['CASH', 'BANK_TRANSFER', 'CREDIT_CARD', 'CHEQUE', 'E_WALLET', 'OTHER'],
        description: 'Payment method (default BANK_TRANSFER)',
      },
    },
    required: ['creditNoteId', 'paymentAmount', 'accountResourceId', 'valueDate'],
    group: 'customer_credit_notes',
    readOnly: false,
    execute: async (ctx, input) => {
      const refundAmt = Number(input.paymentAmount);
      if (!Number.isFinite(refundAmt) || refundAmt <= 0) {
        throw new Error('paymentAmount must be a positive number');
      }
      return createCustomerCreditNoteRefund(ctx.client, input.creditNoteId as string, {
        paymentAmount: refundAmt,
        transactionAmount: refundAmt,
        accountResourceId: input.accountResourceId as string,
        valueDate: input.valueDate as string,
        dueDate: input.valueDate as string,
        reference: (input.reference as string) ?? '',
        paymentMethod: ((input.paymentMethod as string) ?? 'BANK_TRANSFER') as Payment['paymentMethod'],
        saveAsDraft: false,
      });
    },
  },
  {
    name: 'list_customer_credit_note_refunds',
    description: 'List refund payments for a customer credit note.',
    params: {
      creditNoteId: { type: 'string', description: 'Customer credit note resourceId' },
    },
    required: ['creditNoteId'],
    group: 'customer_credit_notes',
    readOnly: true,
    execute: async (ctx, input) => listCustomerCreditNoteRefunds(ctx.client, input.creditNoteId as string),
  },

  // ── Supplier Credit Notes ──────────────────────────────────────
  listTool(
    'list_supplier_credit_notes',
    'List supplier credit notes (AP adjustments/refunds). Paginated — response includes totalElements. Use limit/offset to page.',
    'supplier_credit_notes',
    (client, off, lim) => listSupplierCreditNotes(client, { limit: lim, offset: off }),
  ),
  {
    name: 'search_supplier_credit_notes',
    description: 'Search supplier credit notes by reference, status, or contact. Returns up to 100 by default. Use limit/offset to page through large result sets.',
    params: {
      reference: { type: 'string', description: 'Filter by reference (contains)' },
      status: { type: 'string', enum: ['DRAFT', 'UNAPPLIED', 'APPLIED', 'VOIDED'], description: 'Filter by status' },
      contactResourceId: { type: 'string', description: 'Filter by contact resourceId' },
      ...SEARCH_PARAMS,
    },
    required: [],
    group: 'supplier_credit_notes',
    readOnly: true,
    execute: async (ctx, input) => {
      const { mode, limit, offset, sortBy, sortOrder } = extractPaginationInput(input);
      return handlePaginationMode(mode, (off, lim) => searchSupplierCreditNotes(ctx.client, {
        filter: buildCnFilter(input),
        limit: lim, offset: off,
        sort: { sortBy: [sortBy ?? 'valueDate'], order: (sortOrder ?? 'DESC') as 'ASC' | 'DESC' },
      }), limit, offset, 100);
    },
  },
  {
    name: 'get_supplier_credit_note',
    description: 'Get full supplier credit note details including line items.',
    params: {
      resourceId: { type: 'string', description: 'Supplier credit note resourceId' },
    },
    required: ['resourceId'],
    group: 'supplier_credit_notes',
    readOnly: true,
    execute: async (ctx, input) => getSupplierCreditNote(ctx.client, input.resourceId as string),
  },
  {
    name: 'create_supplier_credit_note',
    description: `Create a supplier credit note. Saves as draft by default.
- Status when finalized is UNAPPLIED (not APPROVED).
- Line items use "name" for item description.
- contactResourceId required — search contacts first.`,
    params: {
      reference: { type: 'string', description: 'Credit note reference number' },
      valueDate: { type: 'string', description: 'Credit note date (YYYY-MM-DD)' },
      contactResourceId: { type: 'string', description: 'Supplier contact resourceId' },
      lineItems: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Line item description' },
            quantity: { type: 'number' },
            unitPrice: { type: 'number' },
            accountResourceId: { type: 'string' },
          },
          required: ['name', 'quantity', 'unitPrice'],
        },
        description: 'Credit note line items',
      },
      currency: CURRENCY_PARAM,
      saveAsDraft: { type: 'boolean', description: 'Save as draft (default true)' },
      notes: { type: 'string' },
    },
    required: ['valueDate', 'contactResourceId', 'lineItems'],
    group: 'supplier_credit_notes',
    readOnly: false,
    execute: async (ctx, input) => createSupplierCreditNote(ctx.client, input as Parameters<typeof createSupplierCreditNote>[1]),
  },
  {
    name: 'delete_supplier_credit_note',
    description: 'Delete a draft supplier credit note.',
    params: {
      resourceId: { type: 'string', description: 'Supplier credit note resourceId' },
    },
    required: ['resourceId'],
    group: 'supplier_credit_notes',
    readOnly: false,
    execute: async (ctx, input) => deleteSupplierCreditNote(ctx.client, input.resourceId as string),
  },
  {
    name: 'update_supplier_credit_note',
    description: 'Update a draft supplier credit note.',
    params: {
      resourceId: { type: 'string', description: 'Supplier credit note resourceId' },
      reference: { type: 'string' },
      valueDate: { type: 'string' },
      lineItems: { type: 'array', items: { type: 'object' } },
      notes: { type: 'string' },
    },
    required: ['resourceId'],
    group: 'supplier_credit_notes',
    readOnly: false,
    execute: async (ctx, input) => {
      const { resourceId: rid, ...data } = input;
      return updateSupplierCreditNote(ctx.client, rid as string, data as Parameters<typeof updateSupplierCreditNote>[2]);
    },
  },
  {
    name: 'finalize_supplier_credit_note',
    description: 'Finalize a draft supplier credit note (set saveAsDraft=false). Status becomes UNAPPLIED.',
    params: {
      resourceId: { type: 'string', description: 'Supplier credit note resourceId' },
      reference: { type: 'string' },
      valueDate: { type: 'string' },
      lineItems: { type: 'array', items: { type: 'object' } },
      notes: { type: 'string' },
    },
    required: ['resourceId'],
    group: 'supplier_credit_notes',
    readOnly: false,
    execute: async (ctx, input) => {
      const { resourceId: rid, ...data } = input;
      return finalizeSupplierCreditNote(ctx.client, rid as string, data as Parameters<typeof finalizeSupplierCreditNote>[2]);
    },
  },
  {
    name: 'create_supplier_credit_note_refund',
    description: 'Record a refund payment against a supplier credit note.',
    params: {
      creditNoteId: { type: 'string', description: 'Supplier credit note resourceId' },
      paymentAmount: { type: 'number', description: 'Refund amount' },
      accountResourceId: { type: 'string', description: 'Bank/cash account resourceId' },
      valueDate: { type: 'string', description: 'Payment date (YYYY-MM-DD)' },
      reference: { type: 'string', description: 'Payment reference' },
      paymentMethod: {
        type: 'string',
        enum: ['CASH', 'BANK_TRANSFER', 'CREDIT_CARD', 'CHEQUE', 'E_WALLET', 'OTHER'],
        description: 'Payment method (default BANK_TRANSFER)',
      },
    },
    required: ['creditNoteId', 'paymentAmount', 'accountResourceId', 'valueDate'],
    group: 'supplier_credit_notes',
    readOnly: false,
    execute: async (ctx, input) => {
      const refundAmt = Number(input.paymentAmount);
      if (!Number.isFinite(refundAmt) || refundAmt <= 0) {
        throw new Error('paymentAmount must be a positive number');
      }
      return createSupplierCreditNoteRefund(ctx.client, input.creditNoteId as string, {
        paymentAmount: refundAmt,
        transactionAmount: refundAmt,
        accountResourceId: input.accountResourceId as string,
        valueDate: input.valueDate as string,
        dueDate: input.valueDate as string,
        reference: (input.reference as string) ?? '',
        paymentMethod: ((input.paymentMethod as string) ?? 'BANK_TRANSFER') as Payment['paymentMethod'],
        saveAsDraft: false,
      });
    },
  },
  {
    name: 'list_supplier_credit_note_refunds',
    description: 'List refund payments for a supplier credit note.',
    params: {
      creditNoteId: { type: 'string', description: 'Supplier credit note resourceId' },
    },
    required: ['creditNoteId'],
    group: 'supplier_credit_notes',
    readOnly: true,
    execute: async (ctx, input) => listSupplierCreditNoteRefunds(ctx.client, input.creditNoteId as string),
  },

  // ── Currencies ─────────────────────────────────────────────────
  {
    name: 'list_currencies',
    description: 'List currencies enabled for the organization. Returns currency code, name, symbol, and whether it is the base currency.',
    params: {},
    required: [],
    group: 'currencies',
    readOnly: true,
    execute: async (ctx) => listCurrencies(ctx.client),
  },
  {
    name: 'add_currency',
    description: 'Enable one or more currencies for the organization.',
    params: {
      currencies: { type: 'array', items: { type: 'string' }, description: 'Currency codes to add (e.g., ["USD", "EUR"])' },
    },
    required: ['currencies'],
    group: 'currencies',
    readOnly: false,
    execute: async (ctx, input) => addCurrency(ctx.client, input.currencies as string[]),
  },
  {
    name: 'list_currency_rates',
    description: 'List exchange rates for a specific currency.',
    params: {
      currencyCode: { type: 'string', description: 'Currency code (e.g., "USD")' },
      ...PAGINATION_PARAMS,
    },
    required: ['currencyCode'],
    group: 'currencies',
    readOnly: true,
    execute: async (ctx, input) => {
      const { mode, limit, offset } = extractPaginationInput(input);
      const cc = input.currencyCode as string;
      return handlePaginationMode(mode, (off, lim) => listCurrencyRates(ctx.client, cc, { limit: lim, offset: off }), limit, offset, 100);
    },
  },
  {
    name: 'add_currency_rate',
    description: 'Add an exchange rate for a currency. Rate is relative to the base currency.',
    params: {
      currencyCode: { type: 'string', description: 'Currency code' },
      rate: { type: 'number', description: 'Exchange rate (e.g., 1.35 for 1 USD = 1.35 SGD)' },
      rateApplicableFrom: { type: 'string', description: 'Start date (YYYY-MM-DD)' },
      rateApplicableTo: { type: 'string', description: 'End date (YYYY-MM-DD, optional)' },
    },
    required: ['currencyCode', 'rate', 'rateApplicableFrom'],
    group: 'currencies',
    readOnly: false,
    execute: async (ctx, input) => addCurrencyRate(ctx.client, input.currencyCode as string, {
      rate: input.rate as number,
      rateApplicableFrom: input.rateApplicableFrom as string,
      rateApplicableTo: input.rateApplicableTo as string | undefined,
    }),
  },
  {
    name: 'update_currency_rate',
    description: 'Update an existing exchange rate.',
    params: {
      currencyCode: { type: 'string', description: 'Currency code' },
      resourceId: { type: 'string', description: 'Rate resourceId' },
      rate: { type: 'number', description: 'New exchange rate' },
      rateApplicableFrom: { type: 'string', description: 'Start date (YYYY-MM-DD)' },
      rateApplicableTo: { type: 'string', description: 'End date (YYYY-MM-DD, optional)' },
    },
    required: ['currencyCode', 'resourceId', 'rate', 'rateApplicableFrom'],
    group: 'currencies',
    readOnly: false,
    execute: async (ctx, input) => updateCurrencyRate(
      ctx.client, input.currencyCode as string, input.resourceId as string, {
        rate: input.rate as number,
        rateApplicableFrom: input.rateApplicableFrom as string,
        rateApplicableTo: input.rateApplicableTo as string | undefined,
      },
    ),
  },
  {
    name: 'start_currency_rates_import_job',
    description: 'Start an async job to import currency rates from a CSV file URL.',
    params: {
      currencyCode: { type: 'string', description: 'Currency code' },
      csvUrl: { type: 'string', description: 'URL of the CSV file to import' },
    },
    required: ['currencyCode', 'csvUrl'],
    group: 'currencies',
    readOnly: false,
    execute: async (ctx, input) => startCurrencyRatesImportJob(ctx.client, input.currencyCode as string, input.csvUrl as string),
  },
  {
    name: 'get_currency_rates_import_job_status',
    description: 'Check the status of a currency rates import job.',
    params: {
      jobId: { type: 'string', description: 'Job ID from start_currency_rates_import_job' },
    },
    required: ['jobId'],
    group: 'currencies',
    readOnly: true,
    execute: async (ctx, input) => getCurrencyRatesImportJobStatus(ctx.client, input.jobId as string),
  },

  // ── Tax Profiles ───────────────────────────────────────────────
  listTool(
    'list_tax_profiles',
    'List tax profiles (GST, VAT, etc.). Returns name, rate, tax type.',
    'tax_profiles',
    (client, off, lim) => listTaxProfiles(client, { limit: lim, offset: off }),
  ),
  listTool(
    'list_tax_types',
    'List available tax types. Use the tax type code when creating tax profiles.',
    'tax_profiles',
    (client, off, lim) => listTaxTypes(client, { limit: lim, offset: off }),
  ),
  {
    name: 'create_tax_profile',
    description: 'Create a new tax profile. List tax types first to get the taxTypeCode.',
    params: {
      name: { type: 'string', description: 'Tax profile name (e.g., "GST 9%")' },
      taxRate: { type: 'number', description: 'Tax rate as percentage (e.g., 9 for 9%)' },
      taxTypeCode: { type: 'string', description: 'Tax type code (from list_tax_types)' },
    },
    required: ['name', 'taxRate', 'taxTypeCode'],
    group: 'tax_profiles',
    readOnly: false,
    execute: async (ctx, input) => createTaxProfile(ctx.client, {
      name: input.name as string,
      taxRate: input.taxRate as number,
      taxTypeCode: input.taxTypeCode as string,
    }),
  },

  // ── Cash Entries ───────────────────────────────────────────────
  listTool(
    'list_cash_in',
    'List cash-in entries (direct cash receipts). Paginated.',
    'cash_entries',
    (client, off, lim) => listCashIn(client, { limit: lim, offset: off }),
  ),
  {
    name: 'create_cash_in',
    description: `Create a direct cash-in entry. IMPORTANT:
- journalEntries must have accountResourceId, type (DEBIT/CREDIT), and amount.
- accountResourceId is the bank/cash account receiving the money.`,
    params: {
      reference: { type: 'string', description: 'Reference number' },
      valueDate: { type: 'string', description: 'Date (YYYY-MM-DD)' },
      accountResourceId: { type: 'string', description: 'Bank/cash account resourceId' },
      journalEntries: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            accountResourceId: { type: 'string' },
            type: { type: 'string', enum: ['DEBIT', 'CREDIT'] },
            amount: { type: 'number' },
            description: { type: 'string' },
          },
          required: ['accountResourceId', 'type', 'amount'],
        },
      },
      notes: { type: 'string' },
      currency: CURRENCY_PARAM,
      saveAsDraft: { type: 'boolean', description: 'Save as draft (default true)' },
    },
    required: ['valueDate', 'accountResourceId', 'journalEntries'],
    group: 'cash_entries',
    readOnly: false,
    execute: async (ctx, input) => createCashIn(ctx.client, input as Parameters<typeof createCashIn>[1]),
  },
  listTool(
    'list_cash_out',
    'List cash-out entries (direct cash disbursements). Paginated.',
    'cash_entries',
    (client, off, lim) => listCashOut(client, { limit: lim, offset: off }),
  ),
  {
    name: 'create_cash_out',
    description: 'Create a direct cash-out entry. Same structure as create_cash_in.',
    params: {
      reference: { type: 'string', description: 'Reference number' },
      valueDate: { type: 'string', description: 'Date (YYYY-MM-DD)' },
      accountResourceId: { type: 'string', description: 'Bank/cash account resourceId' },
      journalEntries: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            accountResourceId: { type: 'string' },
            type: { type: 'string', enum: ['DEBIT', 'CREDIT'] },
            amount: { type: 'number' },
            description: { type: 'string' },
          },
          required: ['accountResourceId', 'type', 'amount'],
        },
      },
      notes: { type: 'string' },
      currency: CURRENCY_PARAM,
      saveAsDraft: { type: 'boolean', description: 'Save as draft (default true)' },
    },
    required: ['valueDate', 'accountResourceId', 'journalEntries'],
    group: 'cash_entries',
    readOnly: false,
    execute: async (ctx, input) => createCashOut(ctx.client, input as Parameters<typeof createCashOut>[1]),
  },
  {
    name: 'get_cash_in',
    description: 'Get a cash-in entry by resourceId.',
    params: {
      resourceId: { type: 'string', description: 'Cash-in resourceId' },
    },
    required: ['resourceId'],
    group: 'cash_entries',
    readOnly: true,
    execute: async (ctx, input) => getCashIn(ctx.client, input.resourceId as string),
  },
  {
    name: 'update_cash_in',
    description: 'Update an existing cash-in entry.',
    params: {
      resourceId: { type: 'string', description: 'Cash-in resourceId' },
      reference: { type: 'string' },
      valueDate: { type: 'string' },
      journalEntries: { type: 'array', items: { type: 'object' } },
      notes: { type: 'string' },
    },
    required: ['resourceId'],
    group: 'cash_entries',
    readOnly: false,
    execute: async (ctx, input) => {
      const { resourceId: rid, ...data } = input;
      return updateCashIn(ctx.client, rid as string, data);
    },
  },
  {
    name: 'get_cash_out',
    description: 'Get a cash-out entry by resourceId.',
    params: {
      resourceId: { type: 'string', description: 'Cash-out resourceId' },
    },
    required: ['resourceId'],
    group: 'cash_entries',
    readOnly: true,
    execute: async (ctx, input) => getCashOut(ctx.client, input.resourceId as string),
  },
  {
    name: 'update_cash_out',
    description: 'Update an existing cash-out entry.',
    params: {
      resourceId: { type: 'string', description: 'Cash-out resourceId' },
      reference: { type: 'string' },
      valueDate: { type: 'string' },
      journalEntries: { type: 'array', items: { type: 'object' } },
      notes: { type: 'string' },
    },
    required: ['resourceId'],
    group: 'cash_entries',
    readOnly: false,
    execute: async (ctx, input) => {
      const { resourceId: rid, ...data } = input;
      return updateCashOut(ctx.client, rid as string, data);
    },
  },

  // ── Cash Transfers ─────────────────────────────────────────────
  listTool(
    'list_cash_transfers',
    'List cash transfer entries. Paginated.',
    'cash_transfers',
    (client, off, lim) => listCashTransfers(client, { limit: lim, offset: off }),
  ),
  {
    name: 'create_cash_transfer',
    description: 'Create a cash transfer between two accounts. Requires cashOut and cashIn sides.',
    params: {
      reference: { type: 'string', description: 'Reference number' },
      valueDate: { type: 'string', description: 'Date (YYYY-MM-DD)' },
      cashOut: {
        type: 'object',
        properties: {
          accountResourceId: { type: 'string', description: 'Source account resourceId' },
          journalEntries: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                accountResourceId: { type: 'string' },
                type: { type: 'string', enum: ['DEBIT', 'CREDIT'] },
                amount: { type: 'number' },
              },
              required: ['accountResourceId', 'type', 'amount'],
            },
          },
        },
        required: ['accountResourceId', 'journalEntries'],
      },
      cashIn: {
        type: 'object',
        properties: {
          accountResourceId: { type: 'string', description: 'Destination account resourceId' },
          journalEntries: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                accountResourceId: { type: 'string' },
                type: { type: 'string', enum: ['DEBIT', 'CREDIT'] },
                amount: { type: 'number' },
              },
              required: ['accountResourceId', 'type', 'amount'],
            },
          },
        },
        required: ['accountResourceId', 'journalEntries'],
      },
      currency: CURRENCY_PARAM,
      saveAsDraft: { type: 'boolean', description: 'Save as draft (default true)' },
    },
    required: ['valueDate', 'cashOut', 'cashIn'],
    group: 'cash_transfers',
    readOnly: false,
    execute: async (ctx, input) => createCashTransfer(ctx.client, input as Parameters<typeof createCashTransfer>[1]),
  },

  // ── Scheduled Transactions ─────────────────────────────────────
  listTool(
    'list_scheduled_invoices',
    'List scheduled (recurring) invoices. Paginated.',
    'schedulers',
    (client, off, lim) => listScheduledInvoices(client, { limit: lim, offset: off }),
  ),
  listTool(
    'list_scheduled_bills',
    'List scheduled (recurring) bills. Paginated.',
    'schedulers',
    (client, off, lim) => listScheduledBills(client, { limit: lim, offset: off }),
  ),
  listTool(
    'list_scheduled_journals',
    'List scheduled (recurring) journals. Paginated.',
    'schedulers',
    (client, off, lim) => listScheduledJournals(client, { limit: lim, offset: off }),
  ),

  // ── Bank (additional) ──────────────────────────────────────────
  {
    name: 'get_bank_account',
    description: 'Get full bank account details by resourceId.',
    params: {
      resourceId: { type: 'string', description: 'Bank account resourceId' },
    },
    required: ['resourceId'],
    group: 'bank',
    readOnly: true,
    execute: async (ctx, input) => getBankAccount(ctx.client, input.resourceId as string),
  },
  {
    name: 'search_bank_records',
    description: 'Search bank records (imported bank transactions) for a specific account.',
    params: {
      accountResourceId: { type: 'string', description: 'Bank account resourceId' },
      ...SEARCH_PARAMS,
    },
    required: ['accountResourceId'],
    group: 'bank',
    readOnly: true,
    execute: async (ctx, input) => {
      const { mode, limit, offset, sortBy, sortOrder } = extractPaginationInput(input);
      return handlePaginationMode(mode, (off, lim) => searchBankRecords(
        ctx.client, input.accountResourceId as string, {
          limit: lim, offset: off,
          sort: { sortBy: [sortBy ?? 'date'], order: (sortOrder ?? 'DESC') as 'ASC' | 'DESC' },
        },
      ), limit, offset, 100);
    },
  },

  // ── Cashflow Transactions ──────────────────────────────────────
  {
    name: 'search_cashflow_transactions',
    description: 'Search cashflow transactions (unified ledger: invoices, bills, credit notes, journals, payments). Useful for reconciliation.',
    params: {
      ...SEARCH_PARAMS,
      businessTransactionType: { type: 'string', description: 'Filter by type (e.g., INVOICE, BILL, JOURNAL)' },
      direction: { type: 'string', enum: ['IN', 'OUT'], description: 'Filter by direction' },
    },
    required: [],
    group: 'cashflow',
    readOnly: true,
    execute: async (ctx, input) => {
      const { mode, limit, offset, sortBy, sortOrder } = extractPaginationInput(input);
      const filter: Record<string, unknown> = {};
      if (input.businessTransactionType) filter.businessTransactionType = { eq: input.businessTransactionType };
      if (input.direction) filter.direction = { eq: input.direction };
      return handlePaginationMode(mode, (off, lim) => searchCashflowTransactions(ctx.client, {
        filter: Object.keys(filter).length > 0 ? filter : undefined,
        limit: lim, offset: off,
        sort: { sortBy: [sortBy ?? 'valueDate'], order: (sortOrder ?? 'DESC') as 'ASC' | 'DESC' },
      }), limit, offset, 100);
    },
  },

  // ── Bookmarks ──────────────────────────────────────────────────
  listTool(
    'list_bookmarks',
    'List organization bookmarks (saved values/settings).',
    'bookmarks',
    (client, off, lim) => listBookmarks(client, { limit: lim, offset: off }),
  ),
  {
    name: 'get_bookmark',
    description: 'Get a bookmark by resourceId.',
    params: {
      resourceId: { type: 'string', description: 'Bookmark resourceId' },
    },
    required: ['resourceId'],
    group: 'bookmarks',
    readOnly: true,
    execute: async (ctx, input) => getBookmark(ctx.client, input.resourceId as string),
  },
  {
    name: 'create_bookmarks',
    description: 'Create one or more bookmarks. categoryCode must be one of: AUDIT_AND_ASSURANCE, BANKING_AND_FINANCE, BUDGETS_AND_CONTROLS, EMPLOYEES_AND_PAYROLL, EXTERNAL_DOCUMENTS, GENERAL_INFORMATION, OWNERS_AND_DIRECTORS, TAXATION_AND_COMPLIANCE, WORKFLOWS_AND_PROCESSES.',
    params: {
      items: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Bookmark name' },
            value: { type: 'string', description: 'Bookmark value' },
            categoryCode: { type: 'string', description: 'Category code (e.g., GENERAL_INFORMATION)' },
            datatypeCode: { type: 'string', description: 'Datatype code (default: TEXT)' },
          },
          required: ['name', 'value', 'categoryCode', 'datatypeCode'],
        },
        description: 'Bookmarks to create',
      },
    },
    required: ['items'],
    group: 'bookmarks',
    readOnly: false,
    execute: async (ctx, input) => createBookmarks(ctx.client, input.items as Parameters<typeof createBookmarks>[1]),
  },
  {
    name: 'update_bookmark',
    description: 'Update an existing bookmark.',
    params: {
      resourceId: { type: 'string', description: 'Bookmark resourceId' },
      name: { type: 'string', description: 'New name' },
      value: { type: 'string', description: 'New value' },
      categoryCode: { type: 'string', description: 'New category code' },
    },
    required: ['resourceId'],
    group: 'bookmarks',
    readOnly: false,
    execute: async (ctx, input) => {
      const { resourceId: rid, ...data } = input;
      return updateBookmark(ctx.client, rid as string, data as Parameters<typeof updateBookmark>[2]);
    },
  },

  // ── Org Users ──────────────────────────────────────────────────
  listTool(
    'list_org_users',
    'List organization users (team members). Returns name, email, roles.',
    'org_users',
    (client, off, lim) => listOrgUsers(client, { limit: lim, offset: off }),
  ),
  {
    name: 'search_org_users',
    description: 'Search organization users by name or email.',
    params: {
      query: { type: 'string', description: 'Search term (name or email)' },
      ...SEARCH_PARAMS,
    },
    required: ['query'],
    group: 'org_users',
    readOnly: true,
    execute: async (ctx, input) => {
      const { mode, limit, offset, sortBy, sortOrder } = extractPaginationInput(input);
      const query = input.query as string;
      return handlePaginationMode(mode, (off, lim) => searchOrgUsers(ctx.client, {
        filter: { or: { firstName: { contains: query }, lastName: { contains: query }, email: { contains: query } } },
        limit: lim, offset: off,
        sort: { sortBy: [sortBy ?? 'firstName'], order: (sortOrder ?? 'ASC') as 'ASC' | 'DESC' },
      }), limit, offset, 100);
    },
  },
  {
    name: 'invite_org_user',
    description: 'Invite a new user to the organization.',
    params: {
      firstName: { type: 'string', description: 'First name' },
      lastName: { type: 'string', description: 'Last name' },
      email: { type: 'string', description: 'Email address' },
      moduleRoles: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            module: { type: 'string', description: 'Module (e.g., ACCOUNTING, SALES)' },
            role: { type: 'string', description: 'Role (e.g., ADMIN, VIEWER)' },
          },
          required: ['module', 'role'],
        },
        description: 'Module role assignments',
      },
    },
    required: ['firstName', 'lastName', 'email', 'moduleRoles'],
    group: 'org_users',
    readOnly: false,
    execute: async (ctx, input) => inviteOrgUser(ctx.client, input as Parameters<typeof inviteOrgUser>[1]),
  },
  {
    name: 'update_org_user',
    description: 'Update an organization user\'s module roles.',
    params: {
      resourceId: { type: 'string', description: 'Org user resourceId' },
      moduleRoles: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            module: { type: 'string' },
            role: { type: 'string' },
          },
          required: ['module', 'role'],
        },
      },
    },
    required: ['resourceId', 'moduleRoles'],
    group: 'org_users',
    readOnly: false,
    execute: async (ctx, input) => updateOrgUser(ctx.client, input.resourceId as string, {
      moduleRoles: input.moduleRoles as Parameters<typeof updateOrgUser>[2]['moduleRoles'],
    }),
  },
  {
    name: 'remove_org_user',
    description: 'Remove a user from the organization.',
    params: {
      resourceId: { type: 'string', description: 'Org user resourceId' },
    },
    required: ['resourceId'],
    group: 'org_users',
    readOnly: false,
    execute: async (ctx, input) => removeOrgUser(ctx.client, input.resourceId as string),
  },

  // ── Payments ───────────────────────────────────────────────────
  {
    name: 'list_payments',
    description: 'List recent payments across all transaction types. Paginated.',
    params: {
      ...PAGINATION_PARAMS,
    },
    required: [],
    group: 'payments',
    readOnly: true,
    execute: async (ctx, input) => {
      const limit = input.limit as number | undefined;
      const offset = input.offset as number | undefined;
      return listPayments(ctx.client, { limit: limit ?? 100, offset: offset ?? 0 });
    },
  },
  {
    name: 'search_payments',
    description: 'Search payments with filters (date, type, direction).',
    params: {
      ...SEARCH_PARAMS,
      businessTransactionType: { type: 'string', description: 'Filter by type' },
    },
    required: [],
    group: 'payments',
    readOnly: true,
    execute: async (ctx, input) => {
      const { mode, limit, offset, sortBy, sortOrder } = extractPaginationInput(input);
      const filter: Record<string, unknown> = {};
      if (input.businessTransactionType) filter.businessTransactionType = { eq: input.businessTransactionType };
      return handlePaginationMode(mode, (off, lim) => searchPayments(ctx.client, {
        filter: Object.keys(filter).length > 0 ? filter : undefined,
        limit: lim, offset: off,
        sort: { sortBy: [sortBy ?? 'valueDate'], order: (sortOrder ?? 'DESC') as 'ASC' | 'DESC' },
      }), limit, offset, 100);
    },
  },

  // ── Data Exports ───────────────────────────────────────────────
  {
    name: 'download_export',
    description: `Download a data export report. Returns { fileName, fileUrl }.
Available export types: trial-balance, balance-sheet, profit-and-loss, general-ledger, cashflow, cash-balance, ar-report, ap-report, sales-summary, sales-payments-summary, purchase-summary, purchase-payments-summary, customer-revenue-summary, product-sales-summary, periodic-revenue-summary, supplier-expense-summary, product-purchase-summary, periodic-expense-summary, credit-note-summary, sales-cost-margin, sale-inventory-movement, purchase-inventory-movement, analysis-anomalous-invoices, analysis-anomalous-bills, analysis-cashflow-anomalies, analysis-gl-journal-audit, analysis-receivables-customer-risk, analysis-cash-expense-health, statement-of-account-export.`,
    params: {
      exportType: {
        type: 'string',
        description: 'Export type (see description for full list)',
      },
      startDate: { type: 'string', description: 'Period start (YYYY-MM-DD)' },
      endDate: { type: 'string', description: 'Period end (YYYY-MM-DD)' },
      currencyCode: { type: 'string', description: 'Currency override' },
      tags: { type: 'array', items: { type: 'string' }, description: 'Filter by tags' },
      contactResourceId: { type: 'string', description: 'Filter by contact' },
    },
    required: ['exportType'],
    group: 'exports',
    readOnly: true,
    execute: async (ctx, input) => {
      const { exportType, ...params } = input;
      return downloadExport(ctx.client, exportType as Parameters<typeof downloadExport>[1], params);
    },
  },

  // ── Recipes ───────────────────────────────────────────────────

  {
    name: 'plan_recipe',
    description: `Plan a transaction recipe — run a financial calculator and show what accounts, contacts, and bank accounts are needed. Read-only (no API calls).
Supported recipes: ${RECIPE_TYPES.join(', ')}
Returns: capsule type/name, required accounts, step breakdown (journal/bill/invoice/cash-in/cash-out), and full calculator results.
Use this BEFORE execute_recipe to verify requirements. Parameters vary by recipe — see recipe skill docs for per-recipe params.`,
    params: {
      recipe: { type: 'string', enum: [...RECIPE_TYPES], description: 'Recipe type' },
      // Universal params
      amount: { type: 'number', description: 'Amount (for amortization, accrued-expense, dividend, ecl, provision, fx-reval)' },
      principal: { type: 'number', description: 'Principal (for loan, fixed-deposit)' },
      startDate: { type: 'string', description: 'Start date YYYY-MM-DD (enables blueprint generation for most recipes)' },
      currency: { type: 'string', description: 'Currency code (e.g. SGD, USD)' },
      periods: { type: 'number', description: 'Number of periods (for amortization, accrued-expense, leave-accrual)' },
      frequency: { type: 'string', enum: ['monthly', 'quarterly', 'annual'], description: 'Frequency (for depreciation, amortization, accrued-expense)' },
      // Loan / Lease / Provision / Fixed-deposit
      annualRate: { type: 'number', description: 'Annual interest/discount rate %' },
      termMonths: { type: 'number', description: 'Term in months' },
      // Lease
      monthlyPayment: { type: 'number', description: 'Monthly lease payment (for lease)' },
      usefulLifeMonths: { type: 'number', description: 'Asset useful life in months (hire purchase)' },
      // Depreciation / Asset-disposal
      cost: { type: 'number', description: 'Asset cost' },
      salvageValue: { type: 'number', description: 'Salvage value' },
      usefulLifeYears: { type: 'number', description: 'Useful life in years' },
      method: { type: 'string', enum: ['sl', 'ddb', '150db'], description: 'Depreciation method' },
      // Asset-disposal
      acquisitionDate: { type: 'string', description: 'Acquisition date YYYY-MM-DD' },
      disposalDate: { type: 'string', description: 'Disposal date YYYY-MM-DD' },
      proceeds: { type: 'number', description: 'Disposal proceeds' },
      // FX-reval
      bookRate: { type: 'number', description: 'Original booking exchange rate' },
      closingRate: { type: 'number', description: 'Period-end closing exchange rate' },
      baseCurrency: { type: 'string', description: 'Base (functional) currency' },
      // ECL
      buckets: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, balance: { type: 'number' }, rate: { type: 'number' } }, required: ['name', 'balance', 'rate'] }, description: 'ECL aging buckets' },
      existingProvision: { type: 'number', description: 'Existing ECL provision balance' },
      // Fixed-deposit
      compounding: { type: 'string', enum: ['none', 'monthly', 'quarterly', 'annually'], description: 'Compounding method' },
      // Leave-accrual
      employees: { type: 'number', description: 'Number of employees' },
      daysPerYear: { type: 'number', description: 'Leave days per employee per year' },
      dailyRate: { type: 'number', description: 'Average daily rate' },
      // Dividend
      declarationDate: { type: 'string', description: 'Board resolution date YYYY-MM-DD' },
      paymentDate: { type: 'string', description: 'Settlement date YYYY-MM-DD' },
      withholdingRate: { type: 'number', description: 'Withholding tax rate %' },
    },
    required: ['recipe'],
    group: 'recipes',
    readOnly: true,
    execute: async (_ctx, input) => {
      const recipe = input.recipe as string;
      const calcResult = runCalculator(recipe, input as Record<string, unknown>);
      return planRecipe(recipe, calcResult);
    },
  },
  {
    name: 'execute_recipe',
    description: `Execute a transaction recipe end-to-end — run calculator, create capsule, post all entries.
Replaces ~20 manual tool calls with 1 call. Use plan_recipe first to verify requirements.
Supported recipes: ${RECIPE_TYPES.join(', ')}
Requires startDate (to generate blueprint with dated steps).
Auto-resolves accounts from chart of accounts. Provide bankAccountName for recipes with cash-in/cash-out steps, contactName for recipes with invoice/bill steps.`,
    params: {
      recipe: { type: 'string', enum: [...RECIPE_TYPES], description: 'Recipe type' },
      // All calculator params (same as plan_recipe)
      amount: { type: 'number' },
      principal: { type: 'number' },
      startDate: { type: 'string', description: 'Start date YYYY-MM-DD (REQUIRED for execution)' },
      currency: { type: 'string' },
      periods: { type: 'number' },
      frequency: { type: 'string', enum: ['monthly', 'quarterly', 'annual'] },
      annualRate: { type: 'number' },
      termMonths: { type: 'number' },
      monthlyPayment: { type: 'number' },
      usefulLifeMonths: { type: 'number' },
      cost: { type: 'number' },
      salvageValue: { type: 'number' },
      usefulLifeYears: { type: 'number' },
      method: { type: 'string', enum: ['sl', 'ddb', '150db'] },
      acquisitionDate: { type: 'string' },
      disposalDate: { type: 'string' },
      proceeds: { type: 'number' },
      bookRate: { type: 'number' },
      closingRate: { type: 'number' },
      baseCurrency: { type: 'string' },
      buckets: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, balance: { type: 'number' }, rate: { type: 'number' } }, required: ['name', 'balance', 'rate'] } },
      existingProvision: { type: 'number' },
      compounding: { type: 'string', enum: ['none', 'monthly', 'quarterly', 'annually'] },
      employees: { type: 'number' },
      daysPerYear: { type: 'number' },
      dailyRate: { type: 'number' },
      declarationDate: { type: 'string' },
      paymentDate: { type: 'string' },
      withholdingRate: { type: 'number' },
      // Execution params
      bankAccountName: { type: 'string', description: 'Bank/cash account name (for cash-in/cash-out steps) — auto-resolved by fuzzy match' },
      contactName: { type: 'string', description: 'Contact name (for invoice/bill steps) — auto-resolved by fuzzy match' },
      existingTxnId: { type: 'string', description: 'Attach to existing transaction — skip initial step' },
      referencePrefix: { type: 'string', description: 'Reference prefix (generates prefix-1, prefix-2, ...)' },
      finalize: { type: 'boolean', description: 'Approve transactions immediately (default: drafts)' },
    },
    required: ['recipe', 'startDate'],
    group: 'recipes',
    readOnly: false,
    execute: async (ctx, input) => {
      const recipe = input.recipe as string;
      const calcResult = runCalculator(recipe, input as Record<string, unknown>);
      const blueprint = extractBlueprint(calcResult);
      if (!blueprint) {
        throw new Error('No blueprint generated. Ensure startDate is provided.');
      }

      // Auto-resolve accounts
      const plan = planRecipe(recipe, calcResult);
      const resolution = await resolveRecipeAccounts(ctx.client, plan.plan.requiredAccounts);
      if (resolution.failures.length > 0) {
        const missing = resolution.failures.map((f) =>
          `${f.name}${f.candidates.length > 0 ? ` (closest: ${f.candidates.join(', ')})` : ''}`,
        ).join('; ');
        throw new Error(`Cannot auto-resolve ${resolution.failures.length} account(s): ${missing}. Create them in Jaz first.`);
      }

      // Resolve optional contact and bank account
      let contactId: string | undefined;
      if (input.contactName) {
        const resolved = await resolveRecipeContact(ctx.client, input.contactName as string);
        contactId = resolved.resourceId;
      }
      let bankAccountId: string | undefined;
      if (input.bankAccountName) {
        const resolved = await resolveRecipeBankAccount(ctx.client, input.bankAccountName as string);
        bankAccountId = resolved.resourceId;
      }

      return executeRecipe(ctx.client, {
        blueprint,
        calcType: recipe,
        accountMap: resolution.mapping,
        bankAccountId,
        contactId,
        existingTxnId: input.existingTxnId as string | undefined,
        referencePrefix: input.referencePrefix as string | undefined,
        finalize: input.finalize as boolean | undefined,
      });
    },
  },

  // ── Scheduler Creation ────────────────────────────────────────

  {
    name: 'create_scheduled_journal',
    description: `Create a scheduled (recurring) journal. CRITICAL:
- Use schedulerEntries (NOT journalEntries) — each needs accountResourceId, amount, type (DEBIT/CREDIT), name.
- Use repeat (NOT frequency/interval): WEEKLY, MONTHLY, QUARTERLY, YEARLY.
- Total debits MUST equal total credits.
- Flat structure — reference, valueDate, saveAsDraft at top level (not nested).`,
    params: {
      reference: { type: 'string', description: 'Journal reference' },
      valueDate: { type: 'string', description: 'Template date (YYYY-MM-DD)' },
      startDate: { type: 'string', description: 'First occurrence (YYYY-MM-DD)' },
      endDate: { type: 'string', description: 'Last occurrence (YYYY-MM-DD, optional)' },
      repeat: { type: 'string', enum: ['WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY'], description: 'Recurrence interval' },
      schedulerEntries: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            accountResourceId: { type: 'string' },
            amount: { type: 'number' },
            type: { type: 'string', enum: ['DEBIT', 'CREDIT'] },
            name: { type: 'string', description: 'Line description' },
          },
          required: ['accountResourceId', 'amount', 'type'],
        },
      },
      notes: { type: 'string', description: 'Journal notes' },
    },
    required: ['startDate', 'repeat', 'schedulerEntries'],
    group: 'schedulers',
    readOnly: false,
    execute: async (ctx, input) => createScheduledJournal(ctx.client, {
      status: 'ACTIVE',
      startDate: input.startDate as string,
      endDate: input.endDate as string | undefined,
      repeat: input.repeat as string,
      schedulerEntries: input.schedulerEntries as Parameters<typeof createScheduledJournal>[1]['schedulerEntries'],
      reference: input.reference as string | undefined,
      notes: input.notes as string | undefined,
    }),
  },
  {
    name: 'create_scheduled_invoice',
    description: `Create a scheduled (recurring) invoice. CRITICAL:
- saveAsDraft MUST be false (API rejects INVALID_SALE_STATUS otherwise).
- Use repeat (NOT frequency/interval): WEEKLY, MONTHLY, QUARTERLY, YEARLY.
- Each lineItem needs name, unitPrice, quantity, accountResourceId.`,
    params: {
      startDate: { type: 'string', description: 'First occurrence (YYYY-MM-DD)' },
      endDate: { type: 'string', description: 'Last occurrence (YYYY-MM-DD, optional)' },
      repeat: { type: 'string', enum: ['WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY'], description: 'Recurrence interval' },
      contactResourceId: { type: 'string', description: 'Customer contact resourceId' },
      reference: { type: 'string', description: 'Invoice reference' },
      valueDate: { type: 'string', description: 'Template issue date (YYYY-MM-DD)' },
      dueDate: { type: 'string', description: 'Template due date (YYYY-MM-DD)' },
      lineItems: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            unitPrice: { type: 'number' },
            quantity: { type: 'number' },
            accountResourceId: { type: 'string' },
            taxProfileResourceId: { type: 'string' },
          },
          required: ['name', 'unitPrice', 'quantity', 'accountResourceId'],
        },
      },
      tag: { type: 'string', description: 'Tag name' },
    },
    required: ['startDate', 'repeat', 'contactResourceId', 'valueDate', 'dueDate', 'lineItems'],
    group: 'schedulers',
    readOnly: false,
    execute: async (ctx, input) => createScheduledInvoice(ctx.client, {
      status: 'ACTIVE',
      startDate: input.startDate as string,
      endDate: input.endDate as string | undefined,
      repeat: input.repeat as string,
      invoice: {
        reference: input.reference as string | undefined,
        valueDate: input.valueDate as string,
        dueDate: input.dueDate as string,
        contactResourceId: input.contactResourceId as string,
        lineItems: input.lineItems as Parameters<typeof createScheduledInvoice>[1]['invoice']['lineItems'],
        tag: input.tag as string | undefined,
        saveAsDraft: false,
      },
    }),
  },
  {
    name: 'create_scheduled_bill',
    description: `Create a scheduled (recurring) bill. CRITICAL:
- saveAsDraft MUST be false (API rejects INVALID_PURCHASE_STATUS otherwise).
- Use repeat (NOT frequency/interval): WEEKLY, MONTHLY, QUARTERLY, YEARLY.
- Each lineItem needs name, unitPrice, quantity, accountResourceId.`,
    params: {
      startDate: { type: 'string', description: 'First occurrence (YYYY-MM-DD)' },
      endDate: { type: 'string', description: 'Last occurrence (YYYY-MM-DD, optional)' },
      repeat: { type: 'string', enum: ['WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY'], description: 'Recurrence interval' },
      contactResourceId: { type: 'string', description: 'Supplier contact resourceId' },
      reference: { type: 'string', description: 'Bill reference' },
      valueDate: { type: 'string', description: 'Template issue date (YYYY-MM-DD)' },
      dueDate: { type: 'string', description: 'Template due date (YYYY-MM-DD)' },
      lineItems: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            unitPrice: { type: 'number' },
            quantity: { type: 'number' },
            accountResourceId: { type: 'string' },
            taxProfileResourceId: { type: 'string' },
          },
          required: ['name', 'unitPrice', 'quantity', 'accountResourceId'],
        },
      },
      tag: { type: 'string', description: 'Tag name' },
    },
    required: ['startDate', 'repeat', 'contactResourceId', 'valueDate', 'dueDate', 'lineItems'],
    group: 'schedulers',
    readOnly: false,
    execute: async (ctx, input) => createScheduledBill(ctx.client, {
      status: 'ACTIVE',
      startDate: input.startDate as string,
      endDate: input.endDate as string | undefined,
      repeat: input.repeat as string,
      bill: {
        reference: input.reference as string | undefined,
        valueDate: input.valueDate as string,
        dueDate: input.dueDate as string,
        contactResourceId: input.contactResourceId as string,
        lineItems: input.lineItems as Parameters<typeof createScheduledBill>[1]['bill']['lineItems'],
        tag: input.tag as string | undefined,
        saveAsDraft: false,
      },
    }),
  },

  // ── Journal Update ────────────────────────────────────────────
  {
    name: 'update_journal',
    description: `Update an existing journal entry. Can modify reference, valueDate, entries, notes. Set saveAsDraft=false to finalize.`,
    params: {
      resourceId: { type: 'string', description: 'Journal resourceId' },
      reference: { type: 'string', description: 'Updated reference' },
      valueDate: { type: 'string', description: 'Updated date (YYYY-MM-DD)' },
      journalEntries: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            accountResourceId: { type: 'string' },
            amount: { type: 'number' },
            type: { type: 'string', enum: ['DEBIT', 'CREDIT'] },
            name: { type: 'string' },
          },
          required: ['accountResourceId', 'amount', 'type'],
        },
        description: 'Updated journal entries (debit/credit lines)',
      },
      notes: { type: 'string' },
      saveAsDraft: { type: 'boolean', description: 'Keep as draft (default true)' },
    },
    required: ['resourceId'],
    group: 'journals',
    readOnly: false,
    execute: async (ctx, input) => updateJournal(ctx.client, input.resourceId as string, {
      reference: input.reference as string | undefined,
      valueDate: input.valueDate as string | undefined,
      journalEntries: input.journalEntries as Parameters<typeof updateJournal>[2]['journalEntries'],
      notes: input.notes as string | undefined,
      saveAsDraft: input.saveAsDraft as boolean | undefined,
    }),
  },

  // ── Bank Import ───────────────────────────────────────────────
  {
    name: 'import_bank_statement',
    description: 'Import a bank statement from URL or attachment ID. Processing is async — check magic workflows for status.',
    params: {
      accountResourceId: { type: 'string', description: 'Bank account resourceId to import into' },
      sourceUrl: { type: 'string', description: 'URL of the bank statement file' },
      attachmentId: { type: 'string', description: 'Attachment ID (alternative to URL)' },
    },
    required: ['accountResourceId'],
    group: 'bank',
    readOnly: false,
    execute: async (ctx, input) => importBankStatement(ctx.client, {
      businessTransactionType: 'BANK_STATEMENT',
      accountResourceId: input.accountResourceId as string,
      sourceUrl: input.sourceUrl as string | undefined,
      attachmentId: input.attachmentId as string | undefined,
    }),
  },

  // ── Magic: Create BT from Attachment ──────────────────────────
  {
    name: 'create_bt_from_attachment',
    description: 'Create a business transaction (invoice/bill/credit note) from an uploaded file using AI extraction. Processing is async.',
    params: {
      businessTransactionType: {
        type: 'string',
        enum: ['INVOICE', 'BILL', 'CUSTOMER_CREDIT_NOTE', 'SUPPLIER_CREDIT_NOTE'],
        description: 'Type of transaction to create',
      },
      sourceUrl: { type: 'string', description: 'URL of the source file' },
      attachmentId: { type: 'string', description: 'Attachment ID (alternative to URL)' },
    },
    required: ['businessTransactionType'],
    group: 'magic',
    readOnly: false,
    execute: async (ctx, input) => createFromAttachment(ctx.client, {
      businessTransactionType: input.businessTransactionType as Parameters<typeof createFromAttachment>[1]['businessTransactionType'],
      sourceUrl: input.sourceUrl as string | undefined,
      attachmentId: input.attachmentId as string | undefined,
    }),
  },

  {
    name: 'search_magic_workflows',
    description: 'Search magic workflow tasks (BT extractions and bank statement imports). Filter by status, document type, date.',
    params: {
      status: { type: 'array', items: { type: 'string' }, description: 'Filter by status: SUBMITTED, PROCESSING, COMPLETED, FAILED' },
      documentType: { type: 'array', items: { type: 'string' }, description: 'Filter by type: SALE, PURCHASE, SALE_CREDIT_NOTE, PURCHASE_CREDIT_NOTE, BANK_STATEMENT' },
      ...SEARCH_PARAMS,
    },
    required: [],
    group: 'magic',
    readOnly: true,
    execute: async (ctx, input) => {
      const { mode, limit, offset, sortBy, sortOrder } = extractPaginationInput(input);
      const filter: Record<string, unknown> = {};
      if (input.status) filter.status = input.status;
      if (input.documentType) filter.documentType = input.documentType;
      return handlePaginationMode(mode, (off, lim) => searchMagicWorkflows(ctx.client, {
        filter: Object.keys(filter).length > 0 ? filter : undefined,
        limit: lim, offset: off,
        sort: { sortBy: [sortBy ?? 'createdAt'], order: (sortOrder ?? 'DESC') as 'ASC' | 'DESC' },
      }), limit, offset, 100);
    },
  },
  {
    name: 'get_magic_workflow_status',
    description: 'Get the current status of specific magic workflow(s) by resourceId(s). Returns workflow details including status, document type, and results.',
    params: {
      workflowIds: { type: 'array', items: { type: 'string' }, description: 'One or more workflow resourceIds to check' },
    },
    required: ['workflowIds'],
    group: 'magic',
    readOnly: true,
    execute: async (ctx, input) => {
      const ids = input.workflowIds as string[];
      if (ids.length === 0) throw new Error('workflowIds must be non-empty');
      return searchMagicWorkflows(ctx.client, {
        filter: { resourceId: { in: ids } },
        limit: ids.length,
      });
    },
  },

  // ── Attachments ───────────────────────────────────────────────
  {
    name: 'get_attachments',
    description: 'Get attachments for a business transaction (invoice, bill, journal, credit note).',
    params: {
      transactionType: {
        type: 'string',
        enum: ['invoices', 'bills', 'journals', 'scheduled_journals', 'customer-credit-notes', 'supplier-credit-notes'],
        description: 'Transaction type',
      },
      transactionId: { type: 'string', description: 'Transaction resourceId' },
    },
    required: ['transactionType', 'transactionId'],
    group: 'attachments',
    readOnly: true,
    execute: async (ctx, input) => listAttachments(
      ctx.client,
      input.transactionType as Parameters<typeof listAttachments>[1],
      input.transactionId as string,
    ),
  },
  {
    name: 'add_attachment',
    description: 'Add an attachment to a business transaction.',
    params: {
      transactionType: {
        type: 'string',
        enum: ['invoices', 'bills', 'journals', 'scheduled_journals', 'customer-credit-notes', 'supplier-credit-notes'],
        description: 'Transaction type',
      },
      transactionId: { type: 'string', description: 'Transaction resourceId' },
      attachmentId: { type: 'string', description: 'Attachment ID to link' },
      sourceUrl: { type: 'string', description: 'Source file URL (alternative to attachmentId)' },
    },
    required: ['transactionType', 'transactionId'],
    group: 'attachments',
    readOnly: false,
    execute: async (ctx, input) => addAttachment(ctx.client, {
      businessTransactionType: input.transactionType as Parameters<typeof addAttachment>[1]['businessTransactionType'],
      businessTransactionResourceId: input.transactionId as string,
      attachmentId: input.attachmentId as string | undefined,
      sourceUrl: input.sourceUrl as string | undefined,
    }),
  },
  {
    name: 'fetch_attachment_table',
    description: 'Fetch extracted table data from an attachment (OCR/AI extraction result).',
    params: {
      attachmentId: { type: 'string', description: 'Attachment ID' },
    },
    required: ['attachmentId'],
    group: 'attachments',
    readOnly: true,
    execute: async (ctx, input) => fetchAttachmentTable(ctx.client, input.attachmentId as string),
  },

  // ── Message to PDF ────────────────────────────────────────────
  {
    name: 'message_to_pdf',
    description: 'Convert a markdown message to a downloadable PDF document.',
    params: {
      markdown: { type: 'string', description: 'Markdown content to convert to PDF' },
      title: { type: 'string', description: 'PDF title (optional)' },
    },
    required: ['markdown'],
    group: 'exports',
    readOnly: true,
    execute: async (ctx, input) => messageToPdf(ctx.client, {
      markdown: input.markdown as string,
      title: input.title as string | undefined,
    }),
  },
];
