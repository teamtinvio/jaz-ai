/**
 * THE single source of truth for all agent tools.
 *
 * Each tool = neutral schema (params) + execute function (calls core/api/*).
 * Providers convert these to SDK-native format at startup (cached once).
 *
 * CLI commands stay separate — they have their own UX (wizards, chalk, etc.)
 * but share the same core/api/* layer.
 */
import type { ToolDefinition, ToolContext, ParamDef } from './types.js';
import type { AddBankRecordEntry, LineItem, Payment, PaginatedResponse } from '../api/types.js';
import { findExistingContact, findExistingItem, findExistingAccount, findExistingCapsule, findExistingTaxProfile, findExistingTag, normalizeAccountType, assertUUID } from '../api/guards.js';

import { getOrganization } from '../api/organization.js';
import {
  listAccounts, searchAccounts, getAccount, createAccount, updateAccount, deleteAccount,
} from '../api/chart-of-accounts.js';
import {
  listContacts, searchContacts, getContact, createContact, updateContact,
  deleteContact,
} from '../api/contacts.js';
import {
  listInvoices, searchInvoices, getInvoice, createInvoice,
  updateInvoice, deleteInvoice, createInvoicePayment,
  createScheduledInvoice,
  finalizeInvoice, applyCreditsToInvoice, downloadInvoicePdf,
  listInvoicePayments, listInvoiceCredits, reverseInvoiceCredit,
} from '../api/invoices.js';
import {
  listBills, searchBills, getBill, createBill,
  updateBill, deleteBill, createBillPayment,
  createScheduledBill,
  finalizeBill, applyCreditsToBill,
  listBillPayments, listBillCredits, reverseBillCredit,
} from '../api/bills.js';
import {
  listJournals, searchJournals, getJournal, createJournal, deleteJournal,
  updateJournal, createScheduledJournal,
} from '../api/journals.js';
import {
  generateTrialBalance, generateBalanceSheet, generateProfitAndLoss,
  generateCashflow, generateArSummary, generateApSummary,
  generateCashBalance, generateGeneralLedger,
  generateVatLedger, generateEquityMovement,
  generateBankBalanceSummary, generateBankReconSummary, generateBankReconDetails,
  generateFaSummary, generateFaReconSummary, generateArReport,
  getLedgerHighlights,
} from '../api/reports.js';
import { listBankAccounts, addBankRecords, importBankStatement } from '../api/bank.js';
import {
  listItems, searchItems, getItem, createItem, updateItem, deleteItem,
} from '../api/items.js';
import {
  listTags, getTag, searchTags, createTag, updateTag, deleteTag,
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
  downloadCustomerCreditNotePdf,
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
import {
  listTaxProfiles, listTaxTypes, createTaxProfile,
  searchTaxProfiles, getTaxProfile, updateTaxProfile,
  listWithholdingTaxCodes,
} from '../api/tax-profiles.js';
import {
  createCashIn, listCashIn, getCashIn, updateCashIn,
  createCashOut, listCashOut, getCashOut, updateCashOut,
} from '../api/cash-entries.js';
import { createCashTransfer, listCashTransfers, getCashTransfer } from '../api/cash-transfers.js';
import {
  listScheduledInvoices, listScheduledBills, listScheduledJournals,
  getScheduledInvoice, updateScheduledInvoice, deleteScheduledInvoice,
  getScheduledBill, updateScheduledBill, deleteScheduledBill,
  getScheduledJournal, updateScheduledJournal, deleteScheduledJournal,
} from '../api/schedulers.js';
import { runCalculator, RECIPE_TYPES } from '../recipe/dispatch.js';
import { planRecipe, extractBlueprint } from '../recipe/plan.js';
import { executeRecipe } from '../recipe/engine.js';
import { resolveRecipeAccounts, resolveRecipeContact, resolveRecipeBankAccount } from '../intelligence/recipe-resolver.js';
import { getBankAccount, searchBankRecords } from '../api/bank.js';
import { deleteCashEntry, searchCashflowTransactions } from '../api/cashflow.js';
import { createTransferTrialBalance } from '../api/transfer-trial-balance.js';
import { listBookmarks, getBookmark, createBookmarks, updateBookmark } from '../api/bookmarks.js';
import { listOrgUsers, searchOrgUsers, inviteOrgUser, updateOrgUser, removeOrgUser } from '../api/org-users.js';
import { listPayments, searchPayments, getPayment, updatePayment, deletePayment } from '../api/payments.js';
import { downloadExport } from '../api/data-exports.js';
import { listAttachments, addAttachment, deleteAttachment, fetchAttachmentTable } from '../api/attachments.js';
import { createFromAttachment, searchMagicWorkflows } from '../api/magic.js';
import { messageToPdf } from '../api/message-pdf.js';
import { handlePagination, buildCnFilter, buildBankRecordFilter, buildInvoiceBillFilter, buildJournalFilter, buildContactFilter, buildCashflowFilter } from './pagination.js';
// New API modules (200-tools expansion)
import {
  listBankRules, getBankRule, searchBankRules,
  createBankRule, updateBankRule, deleteBankRule,
} from '../api/bank-rules.js';
import {
  listFixedAssets, getFixedAsset, searchFixedAssets,
  createFixedAsset, updateFixedAsset, deleteFixedAsset,
  discardFixedAsset, markFixedAssetSold, transferFixedAsset, undoFixedAssetDisposal,
} from '../api/fixed-assets.js';
import {
  listSubscriptions, getSubscription, createSubscription,
  updateSubscription, deleteSubscription, cancelSubscription,
  searchScheduledTransactions,
} from '../api/subscriptions.js';
import {
  listContactGroups, getContactGroup, searchContactGroups, createContactGroup,
  updateContactGroup, deleteContactGroup,
} from '../api/contact-groups.js';
import { listInventoryItems, createInventoryItem, getInventoryBalance } from '../api/inventory.js';
import { universalSearch } from '../api/search.js';
import { listCustomFields, getCustomField, searchCustomFields, createCustomField, updateCustomField, deleteCustomField } from '../api/custom-fields.js';
import { quickFix, quickFixLineItems, QUICK_FIX_ENTITIES, type QuickFixEntity } from '../api/quick-fix.js';
import {
  listNanoClassifiers, getNanoClassifier, searchNanoClassifiers,
  createNanoClassifier, updateNanoClassifier, deleteNanoClassifier,
} from '../api/nano-classifiers.js';
// Job blueprints (offline — no API calls)
import { generateMonthEndBlueprint } from '../jobs/month-end/blueprint.js';
import { generateQuarterEndBlueprint } from '../jobs/quarter-end/blueprint.js';
import { generateYearEndBlueprint } from '../jobs/year-end/blueprint.js';
import { generateBankReconBlueprint } from '../jobs/bank-recon/blueprint.js';
import { generateGstVatBlueprint } from '../jobs/gst-vat/blueprint.js';
import { generatePaymentRunBlueprint } from '../jobs/payment-run/blueprint.js';
import { generateCreditControlBlueprint } from '../jobs/credit-control/blueprint.js';
import { generateSupplierReconBlueprint } from '../jobs/supplier-recon/blueprint.js';
import { generateAuditPrepBlueprint } from '../jobs/audit-prep/blueprint.js';
import { generateFaReviewBlueprint } from '../jobs/fa-review/blueprint.js';
import { generateDocumentCollectionBlueprint } from '../jobs/document-collection/blueprint.js';
import { generateStatutoryFilingBlueprint } from '../jobs/statutory-filing/blueprint.js';
// Draft validation (pure logic from core/drafts/)
import {
  validateDraft, buildValidation, buildDraftReport,
  INVOICE_REQUIRED_FIELDS, BILL_REQUIRED_FIELDS,
  CREDIT_NOTE_REQUIRED_FIELDS, JOURNAL_REQUIRED_FIELDS,
  sanitizeLineItem, sanitizeJournalEntry, normalizeDate,
  mergeDraftFlags, mergeJournalDraftFlags,
} from '../drafts/index.js';

// ── Shared param snippets (DRY) ─────────────────────────────────

const PAGINATION_PARAMS: Record<string, ParamDef> = {
  limit: { type: 'number', description: 'Max results per page (default 20, max 1000).' },
  offset: { type: 'number', description: 'Page offset (0-indexed). Use with limit to paginate.' },
};

const SEARCH_PARAMS: Record<string, ParamDef> = {
  ...PAGINATION_PARAMS,
  // sortBy/order removed — hardcoded per-tool to prevent LLM sending invalid sort fields
};

const CURRENCY_PARAM: ParamDef = {
  type: 'object',
  properties: {
    sourceCurrency: { type: 'string' },
    exchangeRate: { type: 'number' },
  },
};

const CUSTOM_FIELDS_PARAM: ParamDef = {
  type: 'array',
  items: {
    type: 'object',
    properties: {
      customFieldName: { type: 'string' },
      actualValue: { type: 'string' },
    },
  },
  description: 'Custom field values: [{ customFieldName: "PO Number", actualValue: "PO-123" }]',
};

const CLASSIFIER_CONFIG_PARAM: ParamDef = {
  type: 'array',
  items: {
    type: 'object',
    properties: {
      resourceId: { type: 'string', description: 'Capsule type resourceId' },
      type: { type: 'string', enum: ['invoice', 'bill'], description: 'Resource type' },
      selectedClasses: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            className: { type: 'string' },
            resourceId: { type: 'string' },
          },
        },
      },
      printable: { type: 'boolean' },
    },
  },
  description: 'Nano classifier config for line items. Each entry links a capsule type with selected classes.',
};

const JOURNAL_ENTRY_PARAM: ParamDef = {
  type: 'array',
  items: {
    type: 'object',
    properties: {
      accountResourceId: { type: 'string', description: 'Account resourceId' },
      type: { type: 'string', enum: ['DEBIT', 'CREDIT'], description: 'Debit or credit' },
      amount: { type: 'number', description: 'Amount' },
      description: { type: 'string', description: 'Line description' },
    },
    required: ['accountResourceId', 'type', 'amount'],
  },
  description: 'Journal entries (debit/credit lines with accountResourceId, type, amount)',
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
      classifierConfig: CLASSIFIER_CONFIG_PARAM,
    },
    required: ['name', 'quantity', 'unitPrice'],
  },
  description: 'Line items — include accountResourceId on each line when finalizing (saveAsDraft: false)',
};

const PAYMENT_METHOD_PARAM: ParamDef = {
  type: 'string',
  enum: [
    'CASH', 'BANK_TRANSFER', 'CREDIT_CARD', 'CHEQUE', 'E_WALLET',
    'WITHHOLDING_TAX_CERTIFICATE', 'CLEARING_SETTLEMENT',
    'DEBT_WRITE_OFF', 'INTER_COMPANY', 'OTHER', 'PAYMENT_GATEWAY',
  ],
  description: 'Payment method (default BANK_TRANSFER)',
};

// ── Helper to extract common input fields ────────────────────────

function extractPaginationInput(input: Record<string, unknown>) {
  const limit = input.limit as number | undefined;
  const offset = input.offset as number | undefined;
  // sortBy/order not exposed to LLM — each search tool uses its own hardcoded default
  return { limit, offset, sortBy: undefined as string | undefined, sortOrder: undefined as 'ASC' | 'DESC' | undefined };
}

// ── List tool factory (DRY — all 10 list tools share this) ───────

function listTool(
  name: string,
  description: string,
  group: ToolDefinition['group'],
  fetcher: (client: ToolContext['client'], off: number, lim: number) => Promise<PaginatedResponse<unknown>>,
): ToolDefinition {
  return {
    name,
    description,
    params: { ...PAGINATION_PARAMS },
    required: [],
    group,
    readOnly: true,
    execute: async (ctx, input) => {
      const { limit, offset } = extractPaginationInput(input);
      return handlePagination((off, lim) => fetcher(ctx.client, off, lim), limit, offset, 20);
    },
  };
}

// ── Get tool factory (DRY — all simple get-by-id tools share this) ──

function getTool(
  name: string,
  description: string,
  group: ToolDefinition['group'],
  fetcher: (client: ToolContext['client'], resourceId: string) => Promise<unknown>,
): ToolDefinition {
  return {
    name,
    description,
    params: { resourceId: { type: 'string', description: 'Resource ID (UUID)' } },
    required: ['resourceId'],
    group,
    readOnly: true,
    execute: async (ctx, input) => fetcher(ctx.client, input.resourceId as string),
  };
}

// ── Delete tool factory (DRY — all simple delete-by-id tools share this) ──

function deleteTool(
  name: string,
  description: string,
  group: ToolDefinition['group'],
  deleter: (client: ToolContext['client'], resourceId: string) => Promise<unknown>,
): ToolDefinition {
  return {
    name,
    description,
    params: { resourceId: { type: 'string', description: 'Resource ID (UUID)' } },
    required: ['resourceId'],
    group,
    readOnly: false,
    execute: async (ctx, input) => {
      await deleter(ctx.client, input.resourceId as string);
      return { deleted: true, resourceId: input.resourceId };
    },
  };
}

// ── Shared finalize helper (DRY — used by all finalize + bulk_finalize) ──

type FinalizableType = 'invoice' | 'bill' | 'customer_credit_note' | 'supplier_credit_note';

/**
 * Writable fields per entity type (allowlist — only these go to PUT).
 * Derived from the finalize/update function signatures in src/core/api/.
 */
const WRITABLE_FIELDS: Record<FinalizableType, Set<string>> = {
  invoice: new Set([
    'reference', 'valueDate', 'dueDate', 'contactResourceId',
    'lineItems', 'notes', 'invoiceNotes', 'internalNotes', 'tag', 'tags',
    'isTaxVatApplicable', 'isTaxVATApplicable', 'taxInclusion',
    'terms', 'currency', 'customFields', 'capsuleResourceId',
    'taxProfileResourceId', 'customerPaymentProfileResourceId',
  ]),
  bill: new Set([
    'reference', 'valueDate', 'dueDate', 'contactResourceId',
    'lineItems', 'notes', 'internalNotes', 'tag', 'tags',
    'isTaxVatApplicable', 'isTaxVATApplicable', 'taxInclusion',
    'terms', 'currency', 'customFields', 'capsuleResourceId',
    'taxProfileResourceId',
  ]),
  customer_credit_note: new Set([
    'reference', 'valueDate', 'contactResourceId',
    'lineItems', 'notes', 'tag', 'tags',
    'isTaxVatApplicable', 'isTaxVATApplicable', 'taxInclusion',
    'currency', 'customFields', 'capsuleResourceId',
    'taxProfileResourceId',
  ]),
  supplier_credit_note: new Set([
    'reference', 'valueDate', 'contactResourceId',
    'lineItems', 'notes', 'tag', 'tags',
    'isTaxVatApplicable', 'isTaxVATApplicable', 'taxInclusion',
    'currency', 'customFields', 'capsuleResourceId',
    'taxProfileResourceId',
  ]),
};

/** Normalize a date string to YYYY-MM-DD (strip time component). */
function toDateOnly(v: unknown): string | unknown {
  if (typeof v !== 'string') return v;
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  const m = /^(\d{4}-\d{2}-\d{2})T/.exec(v);
  return m ? m[1] : v;
}

/** Writable line item fields for PUT (allowlist). */
const WRITABLE_LI_FIELDS = new Set([
  'name', 'quantity', 'unitPrice', 'unit', 'accountResourceId',
  'taxProfileResourceId', 'description', 'classifierConfig',
  'itemResourceId', 'discount',
]);

/** Normalize GET line items to PUT format (field name asymmetries + allowlist). */
function normalizeLineItems(items: unknown): unknown {
  if (!Array.isArray(items)) return items;
  return items.map((li: Record<string, unknown>) => {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(li)) {
      if (v === null || v === undefined) continue;
      // GET returns organizationAccountResourceId, PUT wants accountResourceId
      if (k === 'organizationAccountResourceId') {
        out.accountResourceId = v;
      } else if (k === 'taxProfile' && typeof v === 'object' && v !== null) {
        const rid = (v as Record<string, unknown>).resourceId;
        if (rid) out.taxProfileResourceId = rid;
      } else if (k === 'discount' && typeof v === 'object' && v !== null) {
        // Only include discount if it has a non-zero value (zero defaults cause 400)
        const rv = (v as Record<string, unknown>).rateValue;
        if (rv && Number(rv) !== 0) out.discount = v;
      } else if (WRITABLE_LI_FIELDS.has(k)) {
        out[k] = v;
      }
    }
    return out;
  });
}

/**
 * Fetch full entity, pick only writable fields, normalize GET→PUT asymmetries,
 * then merge LLM overrides on top. Bulletproof for finalize/update PUTs.
 */
async function fetchAndMerge(
  client: ToolContext['client'],
  type: FinalizableType,
  resourceId: string,
  overrides: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const fetcher = type === 'invoice' ? getInvoice
    : type === 'bill' ? getBill
    : type === 'customer_credit_note' ? getCustomerCreditNote
    : getSupplierCreditNote;
  const result = await fetcher(client, resourceId);
  const existing = result.data as unknown as Record<string, unknown>;
  const allowed = WRITABLE_FIELDS[type];

  // Pick only writable fields from existing entity
  const base: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(existing)) {
    if (allowed.has(k) && v !== null && v !== undefined) base[k] = v;
  }

  // Normalize dates to YYYY-MM-DD (GET returns ISO datetime)
  if (base.valueDate) base.valueDate = toDateOnly(base.valueDate);
  if (base.dueDate) base.dueDate = toDateOnly(base.dueDate);

  // Normalize line items (field name asymmetries)
  if (base.lineItems) base.lineItems = normalizeLineItems(base.lineItems);

  // Overrides win (LLM may supply updated lineItems, notes, etc.)
  for (const [k, v] of Object.entries(overrides)) {
    if (v !== undefined) base[k] = v;
  }

  // Validate draft readiness — reuses shared draft validation (DRY with CLI).
  // fetchAndMerge is only called by finalize tools, so always validate.
  const specs = type === 'invoice' ? INVOICE_REQUIRED_FIELDS
    : type === 'bill' ? BILL_REQUIRED_FIELDS
    : CREDIT_NOTE_REQUIRED_FIELDS;
  const { missingFields, ready } = validateDraft(base, specs);
  if (!ready) {
    throw new Error(
      `Cannot finalize: missing ${missingFields.join(', ')}. ` +
      `Use search_accounts (filter by accountType) and search_contacts to resolve, ` +
      `then pass the missing fields to this tool.`,
    );
  }
  return base;
}

/** Advisory pre-flight: reject payment/refund against DRAFT documents (API is authoritative). */
async function assertNotDraft(
  getter: (client: ToolContext['client'], id: string) => Promise<{ data: { status: string } }>,
  client: ToolContext['client'],
  resourceId: string,
  kind: string,
): Promise<void> {
  const res = await getter(client, resourceId);
  if (res.data.status === 'DRAFT') {
    throw new Error(`Cannot pay a DRAFT ${kind}. Finalize it first with finalize_${kind}.`);
  }
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
      const { limit, offset, sortBy, sortOrder } = extractPaginationInput(input);
      const query = input.query as string;
      return handlePagination((off, lim) => searchAccounts(ctx.client, {
        filter: { or: { name: { contains: query }, code: { contains: query } } },
        limit: lim, offset: off,
        sort: { sortBy: [sortBy ?? 'code'], order: (sortOrder ?? 'ASC') as 'ASC' | 'DESC' },
      }), limit, offset, 20);
    },
  },
  {
    name: 'create_account',
    description: 'Create a new chart of accounts entry. Auto-checks for duplicates by name — returns existing account if found. Code must be unique. Account class is inferred from accountType.',
    params: {
      name: { type: 'string', description: 'Account name' },
      code: { type: 'string', description: 'Account code (unique)' },
      accountType: { type: 'string', description: 'Exact API values: "Bank Accounts", "Cash", "Current Asset", "Fixed Asset", "Inventory", "Current Liability", "Non-current Liability", "Shareholders Equity", "Operating Revenue", "Other Revenue", "Operating Expense", "Direct Costs"' },
      currencyCode: { type: 'string', description: 'Currency code (e.g., "SGD")' },
    },
    required: ['name', 'code', 'accountType'],
    group: 'accounts',
    readOnly: false,
    execute: async (ctx, input) => {
      // Guard: API deduplicates on name — check first to avoid 400
      const acctName = input.name as string;
      const existingAcct = await findExistingAccount(ctx.client, acctName);
      if (existingAcct) {
        return { _guard: 'duplicate_skipped', message: `Account "${acctName}" already exists.`, existing: existingAcct };
      }
      const accountType = normalizeAccountType(input.accountType as string);
      return createAccount(ctx.client, {
        code: input.code as string,
        name: acctName,
        accountType,
        currencyCode: input.currencyCode as string | undefined,
      });
    },
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
    execute: async (ctx, input) => {
      // Fetch existing account — only keep writable fields (not server-managed ones)
      const rid = input.resourceId as string;
      const existing = (await getAccount(ctx.client, rid)).data as unknown as Record<string, unknown>;
      const ACCOUNT_WRITABLE = ['name', 'code', 'classificationType', 'taxProfileResourceId', 'currency', 'description'];
      const merged = Object.fromEntries(
        ACCOUNT_WRITABLE.filter(k => existing[k] !== undefined && existing[k] !== null).map(k => [k, existing[k]]),
      );
      // GET→PUT asymmetry: GET returns accountType, PUT requires classificationType (Rule 21)
      if (!merged.classificationType && existing.accountType) {
        merged.classificationType = existing.accountType;
      }
      if (input.name !== undefined) merged.name = input.name as string;
      if (input.code !== undefined) merged.code = input.code as string;
      return updateAccount(ctx.client, rid, merged as Parameters<typeof updateAccount>[2]);
    },
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
    description: 'Search contacts with filters. Searches both billingName and name fields when query is provided.',
    params: {
      query: { type: 'string', description: 'Search by name or billing name' },
      isCustomer: { type: 'boolean', description: 'Filter to customers only' },
      isSupplier: { type: 'boolean', description: 'Filter to suppliers only' },
      status: { type: 'string', enum: ['ACTIVE', 'INACTIVE'], description: 'Filter by status' },
      email: { type: 'string', description: 'Filter by email (contains)' },
      ...SEARCH_PARAMS,
    },
    required: [],
    group: 'contacts',
    readOnly: true,
    execute: async (ctx, input) => {
      const { limit, offset, sortBy, sortOrder } = extractPaginationInput(input);
      return handlePagination((off, lim) => searchContacts(ctx.client, {
        filter: buildContactFilter(input),
        limit: lim, offset: off,
        sort: { sortBy: [sortBy ?? 'billingName'], order: (sortOrder ?? 'ASC') as 'ASC' | 'DESC' },
      }), limit, offset, 20);
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
    description: 'Create a new contact. Auto-checks for duplicates by name — returns existing contact if found instead of creating a duplicate.',
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
    execute: async (ctx, input) => {
      const contactName = (input.name as string) ?? (input.billingName as string);
      // Guard: API deduplicates on name — check first to avoid 422
      const existingContact = await findExistingContact(ctx.client, contactName);
      if (existingContact) {
        return { _guard: 'duplicate_skipped', message: `Contact "${contactName}" already exists.`, existing: existingContact };
      }
      return createContact(ctx.client, {
        billingName: input.billingName as string,
        name: contactName,
        emails: input.email ? [input.email as string] : undefined,
        customer: (input.customer as boolean) ?? true,
        supplier: (input.supplier as boolean) ?? false,
      });
    },
  },
  {
    name: 'update_contact',
    description: 'Update an existing contact. Fetches current data first so you only need to send changed fields.',
    params: {
      resourceId: { type: 'string', description: 'Contact resourceId' },
      billingName: { type: 'string' },
      name: { type: 'string' },
      email: { type: 'string' },
    },
    required: ['resourceId'],
    group: 'contacts',
    readOnly: false,
    execute: async (ctx, input) => {
      const { resourceId: rid, ...updates } = input;
      const { data: existing } = await getContact(ctx.client, rid as string);
      // Filter to writable fields only — GET returns read-only fields (resourceId, createdAt, etc.)
      // that cause 400 "Invalid request body" if included in PUT. Same pattern as update_account.
      const CONTACT_WRITABLE = ['billingName', 'name', 'email', 'customer', 'supplier',
        'taxRegistrationNumber', 'address', 'phone', 'status'];
      const ex = existing as unknown as Record<string, unknown>;
      const base = Object.fromEntries(
        CONTACT_WRITABLE.filter(k => ex[k] !== undefined && ex[k] !== null).map(k => [k, ex[k]]),
      );
      Object.assign(base, updates);
      return updateContact(ctx.client, rid as string, base as Parameters<typeof updateContact>[2]);
    },
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
    description: 'Search invoices with filters. Provide any combination: reference, contact, status, date range, due date range, amount range, tag, currency.',
    params: {
      query: { type: 'string', description: 'Search by invoice reference number' },
      contactName: { type: 'string', description: 'Search by contact name' },
      status: { type: 'string', enum: ['DRAFT', 'UNPAID', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'VOID'], description: 'Filter by status' },
      tag: { type: 'string', description: 'Filter by tag name' },
      startDate: { type: 'string', description: 'Filter invoices on or after this date (YYYY-MM-DD)' },
      endDate: { type: 'string', description: 'Filter invoices on or before this date (YYYY-MM-DD)' },
      dueDateFrom: { type: 'string', description: 'Filter by due date from (YYYY-MM-DD)' },
      dueDateTo: { type: 'string', description: 'Filter by due date to (YYYY-MM-DD)' },
      minAmount: { type: 'number', description: 'Minimum total amount' },
      maxAmount: { type: 'number', description: 'Maximum total amount' },
      currencyCode: { type: 'string', description: 'Filter by currency code (e.g. USD, SGD)' },
      ...SEARCH_PARAMS,
    },
    required: [],
    group: 'invoices',
    readOnly: true,
    execute: async (ctx, input) => {
      const { limit, offset, sortBy, sortOrder } = extractPaginationInput(input);
      const filterInput = { ...input, reference: (input.reference as string | undefined) ?? (input.query as string | undefined) };
      return handlePagination((off, lim) => searchInvoices(ctx.client, {
        filter: buildInvoiceBillFilter(filterInput),
        limit: lim, offset: off,
        sort: { sortBy: [sortBy ?? 'valueDate'], order: (sortOrder ?? 'DESC') as 'ASC' | 'DESC' },
      }), limit, offset, 20);
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
- accountResourceId is REQUIRED on each lineItem for finalized invoices. Search accounts first (e.g. Operating Revenue).
- Currency format: { sourceCurrency: "USD", exchangeRate: 1.35 }
- contactResourceId is required — search contacts first to get the ID.
- Dates must be YYYY-MM-DD format.
- reference MUST be unique per org — if the user doesn't specify one, generate one with a timestamp (e.g., INV-20260309-1430). Duplicates cause 422.`,
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
      customFields: CUSTOM_FIELDS_PARAM,
    },
    required: ['reference', 'valueDate', 'dueDate', 'contactResourceId', 'lineItems'],
    group: 'invoices',
    readOnly: false,
    execute: async (ctx, input) => createInvoice(ctx.client, input as Parameters<typeof createInvoice>[1]),
  },
  {
    name: 'update_invoice',
    description: 'Update an existing draft invoice (change reference, dates, line items, notes, custom fields). Use when the user says "update", "change", "fix", or "correct" a draft invoice. Line items CAN be fully replaced — pass the complete updated lineItems array.',
    params: {
      resourceId: { type: 'string', description: 'Invoice resourceId' },
      reference: { type: 'string' },
      valueDate: { type: 'string' },
      dueDate: { type: 'string' },
      lineItems: LINE_ITEM_PARAM,
      notes: { type: 'string' },
      customFields: CUSTOM_FIELDS_PARAM,
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
    description: 'Record a payment against an invoice. Invoice must be APPROVED/UNPAID before payment — draft or voided invoices cannot be paid. If the invoice is still a DRAFT, call finalize_invoice first.',
    params: {
      resourceId: { type: 'string', description: 'Invoice resourceId' },
      paymentAmount: { type: 'number', description: 'Amount to pay (in bank currency)' },
      transactionAmount: { type: 'number', description: 'Amount in invoice currency (defaults to paymentAmount for same-currency)' },
      accountResourceId: { type: 'string', description: 'Bank/cash account resourceId for payment' },
      valueDate: { type: 'string', description: 'Payment date (YYYY-MM-DD)' },
      reference: { type: 'string', description: 'Payment reference' },
      paymentMethod: PAYMENT_METHOD_PARAM,
      customFields: CUSTOM_FIELDS_PARAM,
    },
    required: ['resourceId', 'paymentAmount', 'accountResourceId', 'valueDate'],
    group: 'invoices',
    readOnly: false,
    execute: async (ctx, input) => {
      const resourceId = input.resourceId as string;
      const payAmt = Number(input.paymentAmount);
      if (!Number.isFinite(payAmt) || payAmt <= 0) {
        throw new Error('paymentAmount must be a positive number');
      }
      const txnAmt = Number(input.transactionAmount ?? payAmt);
      if (!Number.isFinite(txnAmt) || txnAmt <= 0) {
        throw new Error('transactionAmount must be a positive number');
      }
      await assertNotDraft(getInvoice, ctx.client, resourceId, 'invoice');
      return createInvoicePayment(ctx.client, resourceId, {
        paymentAmount: payAmt,
        transactionAmount: txnAmt,
        accountResourceId: input.accountResourceId as string,
        valueDate: input.valueDate as string,
        dueDate: input.valueDate as string,
        reference: (input.reference as string) || `PMT-${Date.now()}`,
        paymentMethod: ((input.paymentMethod as string) ?? 'BANK_TRANSFER') as Payment['paymentMethod'],
        saveAsDraft: false,
        customFields: input.customFields as any[] | undefined, // eslint-disable-line @typescript-eslint/no-explicit-any
      });
    },
  },

  {
    name: 'finalize_invoice',
    description: 'Finalize a draft invoice (set saveAsDraft=false). Can optionally update fields in the same call. IMPORTANT: Every lineItem MUST have accountResourceId. If the draft was created without it, pass lineItems with accountResourceId added (search accounts first, e.g. Operating Revenue for sales).',
    params: {
      resourceId: { type: 'string', description: 'Invoice resourceId' },
      reference: { type: 'string' },
      valueDate: { type: 'string' },
      dueDate: { type: 'string' },
      lineItems: LINE_ITEM_PARAM,
      notes: { type: 'string' },
    },
    required: ['resourceId'],
    group: 'invoices',
    readOnly: false,
    execute: async (ctx, input) => {
      const { resourceId: rid, ...overrides } = input;
      const merged = await fetchAndMerge(ctx.client, 'invoice', rid as string, overrides);
      // Dedup guard: if reference already exists on another invoice, auto-suffix to avoid 422
      if (merged.reference) {
        const ref = merged.reference as string;
        const existing = await searchInvoices(ctx.client, {
          filter: { reference: { eq: ref } }, limit: 1, offset: 0,
          sort: { sortBy: ['valueDate'], order: 'DESC' },
        });
        const dupes = (existing.data ?? []).filter((inv) => inv.resourceId !== rid);
        if (dupes.length > 0) {
          merged.reference = `${ref}-${Date.now() % 10000}`;
        }
      }
      return finalizeInvoice(ctx.client, rid as string, merged as Parameters<typeof finalizeInvoice>[2]);
    },
  },
  {
    name: 'apply_credits_to_invoice',
    description: `Apply customer credit note(s) to an invoice. You MUST call this tool to actually apply credits — do not just describe the steps.
Steps: 1) search_customer_credit_notes with status UNAPPLIED for the same contact. 2) If CN is still DRAFT, call finalize_customer_credit_note first. 3) Call this tool with creditNoteResourceId and amountApplied for each CN.`,
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
    description: 'Search bills with filters. Provide any combination: reference, contact, status, date range, due date range, amount range, tag, currency.',
    params: {
      query: { type: 'string', description: 'Search by bill reference number' },
      contactName: { type: 'string', description: 'Search by contact name' },
      status: { type: 'string', enum: ['DRAFT', 'UNPAID', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'VOID'], description: 'Filter by status' },
      tag: { type: 'string', description: 'Filter by tag name' },
      startDate: { type: 'string', description: 'Filter bills on or after this date (YYYY-MM-DD)' },
      endDate: { type: 'string', description: 'Filter bills on or before this date (YYYY-MM-DD)' },
      dueDateFrom: { type: 'string', description: 'Filter by due date from (YYYY-MM-DD)' },
      dueDateTo: { type: 'string', description: 'Filter by due date to (YYYY-MM-DD)' },
      minAmount: { type: 'number', description: 'Minimum total amount' },
      maxAmount: { type: 'number', description: 'Maximum total amount' },
      currencyCode: { type: 'string', description: 'Filter by currency code (e.g. USD, SGD)' },
      ...SEARCH_PARAMS,
    },
    required: [],
    group: 'bills',
    readOnly: true,
    execute: async (ctx, input) => {
      const { limit, offset, sortBy, sortOrder } = extractPaginationInput(input);
      const filterInput = { ...input, reference: (input.reference as string | undefined) ?? (input.query as string | undefined) };
      return handlePagination((off, lim) => searchBills(ctx.client, {
        filter: buildInvoiceBillFilter(filterInput),
        limit: lim, offset: off,
        sort: { sortBy: [sortBy ?? 'valueDate'], order: (sortOrder ?? 'DESC') as 'ASC' | 'DESC' },
      }), limit, offset, 20);
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
    description: 'Create a new bill. Same rules as create_invoice: name not description, saveAsDraft defaults true, accountResourceId REQUIRED on lineItems for finalized bills (search accounts first, e.g. Operating Expense). When selecting a tax profile, use search_tax_profiles with appliesTo "purchase" — sales-only profiles cause 422. reference MUST be unique — generate one with a timestamp if user doesn\'t specify.',
    params: {
      reference: { type: 'string' },
      valueDate: { type: 'string' },
      dueDate: { type: 'string' },
      contactResourceId: { type: 'string' },
      lineItems: LINE_ITEM_PARAM,
      currency: { type: 'object' },
      saveAsDraft: { type: 'boolean' },
      notes: { type: 'string' },
      tag: { type: 'string' },
      customFields: CUSTOM_FIELDS_PARAM,
    },
    required: ['reference', 'valueDate', 'dueDate', 'contactResourceId', 'lineItems'],
    group: 'bills',
    readOnly: false,
    execute: async (ctx, input) => createBill(ctx.client, input as Parameters<typeof createBill>[1]),
  },
  {
    name: 'update_bill',
    description: 'Update an existing draft bill (change reference, dates, line items, notes, custom fields). Use when the user says "update", "change", "fix", or "correct" a draft bill. Line items CAN be fully replaced — pass the complete updated lineItems array.',
    params: {
      resourceId: { type: 'string', description: 'Bill resourceId' },
      reference: { type: 'string' },
      valueDate: { type: 'string' },
      dueDate: { type: 'string' },
      lineItems: LINE_ITEM_PARAM,
      notes: { type: 'string' },
      customFields: CUSTOM_FIELDS_PARAM,
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
    description: 'Record a payment against a bill. Bill must be APPROVED before payment — draft or voided bills cannot be paid.',
    params: {
      resourceId: { type: 'string' },
      paymentAmount: { type: 'number' },
      transactionAmount: { type: 'number', description: 'Amount in bill currency (defaults to paymentAmount for same-currency)' },
      accountResourceId: { type: 'string' },
      valueDate: { type: 'string' },
      reference: { type: 'string' },
      paymentMethod: PAYMENT_METHOD_PARAM,
      customFields: CUSTOM_FIELDS_PARAM,
    },
    required: ['resourceId', 'paymentAmount', 'accountResourceId', 'valueDate'],
    group: 'bills',
    readOnly: false,
    execute: async (ctx, input) => {
      const billResourceId = input.resourceId as string;
      const billPayAmt = Number(input.paymentAmount);
      if (!Number.isFinite(billPayAmt) || billPayAmt <= 0) {
        throw new Error('paymentAmount must be a positive number');
      }
      const billTxnAmt = Number(input.transactionAmount ?? billPayAmt);
      if (!Number.isFinite(billTxnAmt) || billTxnAmt <= 0) {
        throw new Error('transactionAmount must be a positive number');
      }
      await assertNotDraft(getBill, ctx.client, billResourceId, 'bill');
      return createBillPayment(ctx.client, billResourceId, {
        paymentAmount: billPayAmt,
        transactionAmount: billTxnAmt,
        accountResourceId: input.accountResourceId as string,
        valueDate: input.valueDate as string,
        dueDate: input.valueDate as string,
        reference: (input.reference as string) || `PMT-${Date.now()}`,
        paymentMethod: ((input.paymentMethod as string) ?? 'BANK_TRANSFER') as Payment['paymentMethod'],
        saveAsDraft: false,
        customFields: input.customFields as any[] | undefined, // eslint-disable-line @typescript-eslint/no-explicit-any
      });
    },
  },

  {
    name: 'finalize_bill',
    description: 'Finalize a draft bill (set saveAsDraft=false). Can optionally update fields in the same call. IMPORTANT: Every lineItem MUST have accountResourceId. If the draft was created without it, pass lineItems with accountResourceId added (search accounts first, e.g. Operating Expense for purchases).',
    params: {
      resourceId: { type: 'string', description: 'Bill resourceId' },
      reference: { type: 'string' },
      valueDate: { type: 'string' },
      dueDate: { type: 'string' },
      lineItems: LINE_ITEM_PARAM,
      notes: { type: 'string' },
    },
    required: ['resourceId'],
    group: 'bills',
    readOnly: false,
    execute: async (ctx, input) => {
      const { resourceId: rid, ...overrides } = input;
      const merged = await fetchAndMerge(ctx.client, 'bill', rid as string, overrides);
      return finalizeBill(ctx.client, rid as string, merged as Parameters<typeof finalizeBill>[2]);
    },
  },
  {
    name: 'apply_credits_to_bill',
    description: 'Apply supplier credit note(s) to a bill. IMPORTANT: The credit note must be FINALIZED first (status UNAPPLIED, not DRAFT). If it is still a draft, call finalize_supplier_credit_note first. Then search_supplier_credit_notes with status UNAPPLIED to find available credits for the contact, and pass creditNoteResourceId and amountApplied for each.',
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
  getTool(
    'get_journal',
    'Get full journal entry details by resourceId. Returns journal lines, amounts, status, and metadata.',
    'journals',
    (client, rid) => getJournal(client, rid),
  ),
  {
    name: 'search_journals',
    description: 'Search journals with filters. Provide any combination: reference, status, tag, type, date range.',
    params: {
      query: { type: 'string', description: 'Search by reference (contains)' },
      status: { type: 'string', enum: ['DRAFT', 'FINALIZED', 'VOID'], description: 'Filter by status' },
      tag: { type: 'string', description: 'Filter by tag name' },
      type: { type: 'string', description: 'Filter by type (e.g. JOURNAL_MANUAL, JOURNAL_DIRECT_CASH_IN, JOURNAL_DIRECT_CASH_OUT)' },
      startDate: { type: 'string', description: 'Filter journals on or after this date (YYYY-MM-DD)' },
      endDate: { type: 'string', description: 'Filter journals on or before this date (YYYY-MM-DD)' },
      ...SEARCH_PARAMS,
    },
    required: [],
    group: 'journals',
    readOnly: true,
    execute: async (ctx, input) => {
      const { limit, offset, sortBy, sortOrder } = extractPaginationInput(input);
      const filterInput = { ...input, reference: (input.reference as string | undefined) ?? (input.query as string | undefined) };
      return handlePagination((off, lim) => searchJournals(ctx.client, {
        filter: buildJournalFilter(filterInput),
        limit: lim, offset: off,
        sort: { sortBy: [sortBy ?? 'valueDate'], order: (sortOrder ?? 'DESC') as 'ASC' | 'DESC' },
      }), limit, offset, 20);
    },
  },
  {
    name: 'create_journal',
    description: `Create a journal entry. IMPORTANT:
- Each entry needs accountResourceId, type (DEBIT or CREDIT), and amount.
- Total debits MUST equal total credits — the API rejects unbalanced journals.
- Search accounts first to get the correct resourceIds.
- Double-check your math: sum all DEBIT amounts and all CREDIT amounts — they must be equal.`,
    params: {
      reference: { type: 'string', description: 'Journal reference' },
      valueDate: { type: 'string', description: 'Journal date (YYYY-MM-DD)' },
      journalEntries: JOURNAL_ENTRY_PARAM,
      saveAsDraft: { type: 'boolean' },
      notes: { type: 'string' },
      tags: { type: 'array', items: { type: 'string' }, description: 'Tags (string array)' },
    },
    required: ['reference', 'valueDate', 'journalEntries'],
    group: 'journals',
    readOnly: false,
    execute: async (ctx, input) => {
      // Pre-flight: verify debits == credits to catch LLM math errors before hitting 422
      // Use integer minor units (cents) to avoid IEEE-754 floating point drift
      const entries = input.journalEntries as Array<{ type: string; amount: number }> | undefined;
      if (entries?.length) {
        const toMinor = (n: number) => Math.round((n ?? 0) * 100);
        const debits = entries.filter(e => e.type === 'DEBIT').reduce((s, e) => s + toMinor(e.amount), 0);
        const credits = entries.filter(e => e.type === 'CREDIT').reduce((s, e) => s + toMinor(e.amount), 0);
        if (debits !== credits) {
          return { error: `Unbalanced journal: total debits (${(debits / 100).toFixed(2)}) ≠ total credits (${(credits / 100).toFixed(2)}). Fix the amounts before creating.` };
        }
      }
      return createJournal(ctx.client, input as Parameters<typeof createJournal>[1]);
    },
  },
  {
    name: 'create_transfer_trial_balance',
    description: `Create opening balance entries (Transfer Trial Balance). Used to set up initial account balances when migrating to a new accounting system.
- Always created as ACTIVE — no draft mode.
- Reference is auto-generated ("Transfer Trial Balance") — do NOT send a reference.
- Minimum 1 entry (unlike regular journals which require 2).
- Each entry needs accountResourceId, type (DEBIT or CREDIT), and amount (must be > 0).
- Skips lock date validation (opening balances are special).
- Uses journalEntries (NOT lines — this is a journal type).`,
    params: {
      valueDate: { type: 'string', description: 'Opening balance date (YYYY-MM-DD)' },
      journalEntries: JOURNAL_ENTRY_PARAM,
      currency: CURRENCY_PARAM,
    },
    required: ['valueDate', 'journalEntries'],
    group: 'journals',
    readOnly: false,
    execute: async (ctx, input) => {
      return createTransferTrialBalance(ctx.client, input as Parameters<typeof createTransferTrialBalance>[1]);
    },
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

  // ── Financial Reports (core statements) ──────────────────────
  {
    name: 'generate_trial_balance',
    description: 'Generate a trial balance report.',
    params: {
      endDate: { type: 'string', description: 'Snapshot date (YYYY-MM-DD)' },
      currencyCode: { type: 'string', description: 'Currency override' },
    },
    required: ['endDate'],
    group: 'financial_reports',
    readOnly: true,
    execute: async (ctx, input) => generateTrialBalance(ctx.client, input as Parameters<typeof generateTrialBalance>[1]),
  },
  {
    name: 'generate_balance_sheet',
    description: 'Generate a balance sheet report.',
    params: {
      snapshotDate: { type: 'string', description: 'Snapshot date (YYYY-MM-DD). Defaults to today if omitted.' },
      currencyCode: { type: 'string' },
    },
    required: [],
    group: 'financial_reports',
    readOnly: true,
    execute: async (ctx, input) => {
      const date = (input.snapshotDate as string) ?? new Date().toISOString().slice(0, 10);
      return generateBalanceSheet(ctx.client, { primarySnapshotDate: date, currencyCode: input.currencyCode } as Parameters<typeof generateBalanceSheet>[1]);
    },
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
    group: 'financial_reports',
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
    group: 'financial_reports',
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
    group: 'operational_reports',
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
    group: 'operational_reports',
    readOnly: true,
    execute: async (ctx, input) => generateApSummary(ctx.client, input as Parameters<typeof generateApSummary>[1]),
  },
  {
    name: 'generate_cash_balance',
    description: 'Generate a cash balance report showing cash position at a specific date. PREFERRED for cash position questions — use this (NOT balance sheet) when asked about total cash, cash on hand, available cash, or cash position across all bank accounts.',
    params: {
      endDate: { type: 'string', description: 'Snapshot date (YYYY-MM-DD)' },
    },
    required: ['endDate'],
    group: 'financial_reports',
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
    group: 'financial_reports',
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
      const { limit, offset, sortBy, sortOrder } = extractPaginationInput(input);
      const filter: Record<string, unknown> = {};
      if (input.appliesToSale !== undefined) filter.appliesToSale = { eq: input.appliesToSale };
      if (input.appliesToPurchase !== undefined) filter.appliesToPurchase = { eq: input.appliesToPurchase };
      if (input.status) filter.status = { eq: input.status };
      if (input.itemCategory) filter.itemCategory = { eq: input.itemCategory };
      return handlePagination((off, lim) => searchItems(ctx.client, {
        filter: Object.keys(filter).length > 0 ? filter : undefined,
        limit: lim, offset: off,
        sort: { sortBy: [sortBy ?? 'internalName'], order: (sortOrder ?? 'ASC') as 'ASC' | 'DESC' },
      }), limit, offset, 20);
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
    description: `Create a new item. Auto-checks for duplicates by itemCode — returns existing item if found.
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
      customFields: CUSTOM_FIELDS_PARAM,
    },
    required: ['itemCode', 'internalName'],
    group: 'items',
    readOnly: false,
    execute: async (ctx, input) => {
      // Guard: API deduplicates on itemCode — check first to avoid 422
      const code = input.itemCode as string;
      const existingItem = await findExistingItem(ctx.client, code);
      if (existingItem) {
        return { _guard: 'duplicate_skipped', message: `Item with code "${code}" already exists.`, existing: existingItem };
      }
      return createItem(ctx.client, input as Parameters<typeof createItem>[1]);
    },
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
      customFields: CUSTOM_FIELDS_PARAM,
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
      const { limit, offset, sortBy, sortOrder } = extractPaginationInput(input);
      const query = input.query as string;
      return handlePagination((off, lim) => searchTags(ctx.client, {
        filter: { tagName: { contains: query } },
        limit: lim, offset: off,
        sort: { sortBy: [sortBy ?? 'tagName'], order: (sortOrder ?? 'ASC') as 'ASC' | 'DESC' },
      }), limit, offset, 20);
    },
  },
  {
    name: 'create_tag',
    description: 'Create a new tag. Automatically reuses existing tag if one with the same name exists.',
    params: {
      name: { type: 'string', description: 'Tag name' },
    },
    required: ['name'],
    group: 'tags',
    readOnly: false,
    execute: async (ctx, input) => {
      const name = input.name as string;
      const existing = await findExistingTag(ctx.client, name);
      if (existing) return { data: existing, _note: `Tag "${name}" already exists — reusing.` };
      return createTag(ctx.client, { name });
    },
  },
  getTool(
    'get_tag',
    'Get a tag by resourceId.',
    'tags',
    (client, id) => getTag(client, id),
  ),
  {
    name: 'update_tag',
    description: 'Rename a tag.',
    params: {
      resourceId: { type: 'string', description: 'Tag resourceId' },
      name: { type: 'string', description: 'New tag name' },
    },
    required: ['resourceId', 'name'],
    group: 'tags',
    readOnly: false,
    execute: async (ctx, input) => updateTag(ctx.client, input.resourceId as string, { name: input.name as string }),
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
      const { limit, offset, sortBy, sortOrder } = extractPaginationInput(input);
      const query = input.query as string;
      return handlePagination((off, lim) => searchCapsules(ctx.client, {
        filter: { title: { contains: query } },
        limit: lim, offset: off,
        sort: { sortBy: [sortBy ?? 'title'], order: (sortOrder ?? 'ASC') as 'ASC' | 'DESC' },
      }), limit, offset, 20);
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
    execute: async (ctx, input) => {
      const capsuleTitle = input.title as string;
      // Guard: check for existing capsule with same title
      const existingCapsule = await findExistingCapsule(ctx.client, capsuleTitle);
      if (existingCapsule) {
        return { _guard: 'duplicate_skipped', message: `Capsule "${capsuleTitle}" already exists.`, existing: existingCapsule };
      }
      return createCapsule(ctx.client, {
        capsuleTypeResourceId: input.capsuleTypeResourceId as string,
        title: capsuleTitle,
        description: input.description as string | undefined,
      });
    },
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
      const { limit, offset, sortBy, sortOrder } = extractPaginationInput(input);
      return handlePagination((off, lim) => searchCustomerCreditNotes(ctx.client, {
        filter: buildCnFilter(input),
        limit: lim, offset: off,
        sort: { sortBy: [sortBy ?? 'valueDate'], order: (sortOrder ?? 'DESC') as 'ASC' | 'DESC' },
      }), limit, offset, 20);
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
- contactResourceId required — search contacts first.
- reference MUST be unique — generate one with a timestamp if user doesn't specify.`,
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
      tag: { type: 'string' },
      customFields: CUSTOM_FIELDS_PARAM,
    },
    required: ['valueDate', 'contactResourceId', 'lineItems'],
    group: 'customer_credit_notes',
    readOnly: false,
    execute: async (ctx, input) => {
      const data = { ...input } as Parameters<typeof createCustomerCreditNote>[1];
      if (!data.reference) data.reference = `CCN-${Date.now()}`;
      return createCustomerCreditNote(ctx.client, data);
    },
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
    description: 'Update a draft customer credit note (change amount, line items, contact, date, notes). Use when the user says "update", "change", "fix", or "correct" a credit note.',
    params: {
      resourceId: { type: 'string', description: 'Customer credit note resourceId' },
      reference: { type: 'string' },
      valueDate: { type: 'string' },
      lineItems: LINE_ITEM_PARAM,
      notes: { type: 'string' },
      tag: { type: 'string' },
      customFields: CUSTOM_FIELDS_PARAM,
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
      lineItems: LINE_ITEM_PARAM,
      notes: { type: 'string' },
    },
    required: ['resourceId'],
    group: 'customer_credit_notes',
    readOnly: false,
    execute: async (ctx, input) => {
      const { resourceId: rid, ...overrides } = input;
      const merged = await fetchAndMerge(ctx.client, 'customer_credit_note', rid as string, overrides);
      return finalizeCustomerCreditNote(ctx.client, rid as string, merged as Parameters<typeof finalizeCustomerCreditNote>[2]);
    },
  },
  {
    name: 'create_customer_credit_note_refund',
    description: 'Record a refund payment against a customer credit note.',
    params: {
      creditNoteId: { type: 'string', description: 'Customer credit note resourceId' },
      paymentAmount: { type: 'number', description: 'Refund amount' },
      transactionAmount: { type: 'number', description: 'Amount in credit note currency (defaults to paymentAmount for same-currency)' },
      accountResourceId: { type: 'string', description: 'Bank/cash account resourceId' },
      valueDate: { type: 'string', description: 'Payment date (YYYY-MM-DD)' },
      reference: { type: 'string', description: 'Payment reference' },
      paymentMethod: PAYMENT_METHOD_PARAM,
    },
    required: ['creditNoteId', 'paymentAmount', 'accountResourceId', 'valueDate'],
    group: 'customer_credit_notes',
    readOnly: false,
    execute: async (ctx, input) => {
      const refundAmt = Number(input.paymentAmount);
      if (!Number.isFinite(refundAmt) || refundAmt <= 0) {
        throw new Error('paymentAmount must be a positive number');
      }
      const txnAmt = Number(input.transactionAmount ?? refundAmt);
      if (!Number.isFinite(txnAmt) || txnAmt <= 0) {
        throw new Error('transactionAmount must be a positive number');
      }
      return createCustomerCreditNoteRefund(ctx.client, input.creditNoteId as string, {
        paymentAmount: refundAmt,
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
      const { limit, offset, sortBy, sortOrder } = extractPaginationInput(input);
      return handlePagination((off, lim) => searchSupplierCreditNotes(ctx.client, {
        filter: buildCnFilter(input),
        limit: lim, offset: off,
        sort: { sortBy: [sortBy ?? 'valueDate'], order: (sortOrder ?? 'DESC') as 'ASC' | 'DESC' },
      }), limit, offset, 20);
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
      tag: { type: 'string' },
      customFields: CUSTOM_FIELDS_PARAM,
    },
    required: ['valueDate', 'contactResourceId', 'lineItems'],
    group: 'supplier_credit_notes',
    readOnly: false,
    execute: async (ctx, input) => {
      const data = { ...input } as Parameters<typeof createSupplierCreditNote>[1];
      if (!data.reference) data.reference = `SCN-${Date.now()}`;
      return createSupplierCreditNote(ctx.client, data);
    },
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
    description: 'Update a draft supplier credit note (change amount, line items, contact, date, notes). Use when the user says "update", "change", "fix", or "correct" a credit note.',
    params: {
      resourceId: { type: 'string', description: 'Supplier credit note resourceId' },
      reference: { type: 'string' },
      valueDate: { type: 'string' },
      lineItems: LINE_ITEM_PARAM,
      notes: { type: 'string' },
      tag: { type: 'string' },
      customFields: CUSTOM_FIELDS_PARAM,
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
      lineItems: LINE_ITEM_PARAM,
      notes: { type: 'string' },
    },
    required: ['resourceId'],
    group: 'supplier_credit_notes',
    readOnly: false,
    execute: async (ctx, input) => {
      const { resourceId: rid, ...overrides } = input;
      const merged = await fetchAndMerge(ctx.client, 'supplier_credit_note', rid as string, overrides);
      return finalizeSupplierCreditNote(ctx.client, rid as string, merged as Parameters<typeof finalizeSupplierCreditNote>[2]);
    },
  },
  {
    name: 'create_supplier_credit_note_refund',
    description: 'Record a refund payment against a supplier credit note.',
    params: {
      creditNoteId: { type: 'string', description: 'Supplier credit note resourceId' },
      paymentAmount: { type: 'number', description: 'Refund amount' },
      transactionAmount: { type: 'number', description: 'Amount in credit note currency (defaults to paymentAmount for same-currency)' },
      accountResourceId: { type: 'string', description: 'Bank/cash account resourceId' },
      valueDate: { type: 'string', description: 'Payment date (YYYY-MM-DD)' },
      reference: { type: 'string', description: 'Payment reference' },
      paymentMethod: PAYMENT_METHOD_PARAM,
    },
    required: ['creditNoteId', 'paymentAmount', 'accountResourceId', 'valueDate'],
    group: 'supplier_credit_notes',
    readOnly: false,
    execute: async (ctx, input) => {
      const refundAmt = Number(input.paymentAmount);
      if (!Number.isFinite(refundAmt) || refundAmt <= 0) {
        throw new Error('paymentAmount must be a positive number');
      }
      const txnAmt = Number(input.transactionAmount ?? refundAmt);
      if (!Number.isFinite(txnAmt) || txnAmt <= 0) {
        throw new Error('transactionAmount must be a positive number');
      }
      return createSupplierCreditNoteRefund(ctx.client, input.creditNoteId as string, {
        paymentAmount: refundAmt,
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
    execute: async (ctx, input) => {
      const requested = input.currencies as string[];
      // Guard: fetch all enabled currencies once, filter locally (not N API calls)
      const allCurrencies = await listCurrencies(ctx.client);
      const enabledSet = new Set(allCurrencies.data.map(c => c.currencyCode.toUpperCase()));
      const alreadyEnabled = requested.filter(code => enabledSet.has(code.toUpperCase()));
      const toAdd = requested.filter(code => !enabledSet.has(code.toUpperCase()));
      if (toAdd.length === 0) {
        return { _guard: 'duplicate_skipped', message: `All currencies already enabled: ${requested.join(', ')}.`, existing: alreadyEnabled };
      }
      const result = await addCurrency(ctx.client, toAdd);
      if (alreadyEnabled.length > 0) {
        return { ...result, _note: `Skipped already-enabled: ${alreadyEnabled.join(', ')}` };
      }
      return result;
    },
  },
  {
    name: 'list_currency_rates',
    description: 'List exchange rates for a specific currency. IMPORTANT: You MUST call list_currencies first to discover which currencies the org has enabled — never guess or assume currency codes.',
    params: {
      currencyCode: { type: 'string', description: 'Currency code (e.g., "USD")' },
      ...PAGINATION_PARAMS,
    },
    required: ['currencyCode'],
    group: 'currencies',
    readOnly: true,
    execute: async (ctx, input) => {
      const { limit, offset } = extractPaginationInput(input);
      const cc = input.currencyCode as string;
      return handlePagination((off, lim) => listCurrencyRates(ctx.client, cc, { limit: lim, offset: off }), limit, offset, 100);
    },
  },
  {
    name: 'add_currency_rate',
    description: 'Add or set an exchange rate for a currency. ALWAYS use this tool even when the user says "update rate" — it handles both new and existing rates. Rate is relative to the base currency. Call list_currencies first to get valid currency codes.',
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
    description: 'Update an EXISTING exchange rate record by its resourceId. Requires the rate resourceId from list_currency_rates. WARNING: If the user says "update the rate" or "set the rate", they almost always mean add_currency_rate (which creates/overwrites for a date). Only use this tool when explicitly modifying an existing rate record by ID.',
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
    description: 'Create a new tax profile. List tax types first to get the taxTypeCode. Automatically checks for duplicates by name — returns existing profile if found.',
    params: {
      name: { type: 'string', description: 'Tax profile name (e.g., "GST 9%")' },
      taxRate: { type: 'number', description: 'Tax rate as percentage (e.g., 9 for 9%)' },
      taxTypeCode: { type: 'string', description: 'Tax type code (from list_tax_types)' },
    },
    required: ['name', 'taxRate', 'taxTypeCode'],
    group: 'tax_profiles',
    readOnly: false,
    execute: async (ctx, input) => {
      const name = input.name as string;
      // Guard: API rejects duplicates with 422 — check first
      const existing = await findExistingTaxProfile(ctx.client, name);
      if (existing) {
        return { _guard: 'duplicate_skipped', message: `Tax profile "${name}" already exists.`, existing };
      }
      return createTaxProfile(ctx.client, {
        name,
        taxRate: input.taxRate as number,
        taxTypeCode: input.taxTypeCode as string,
      });
    },
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
    description: `Record money received INTO a bank account from an EXTERNAL source (customer payment, refund received, deposit from outside).
WHEN TO USE: customer payments received, refunds from suppliers, insurance payouts, external deposits.
WHEN NOT TO USE: moving money between your own bank/cash accounts — use create_cash_transfer instead.
- CRITICAL: accountResourceId MUST be a Bank/Cash account from list_bank_accounts output. Using expense, revenue, or liability accounts will fail. Always call list_bank_accounts first to find valid accounts.
- lines are the offsetting entries. Each needs accountResourceId, type (DEBIT/CREDIT), and amount. IMPORTANT: offset accounts must be regular P&L or balance sheet accounts (expense, revenue, asset, liability) — NOT bank/cash accounts or controlled accounts (AR/AP). Example: Service Revenue, Interest Income, Other Income.
- The API enforces account separation: cash-in bank account cannot appear in lines.`,
    params: {
      reference: { type: 'string', description: 'Reference number' },
      valueDate: { type: 'string', description: 'Date (YYYY-MM-DD)' },
      accountResourceId: { type: 'string', description: 'Bank/cash account resourceId' },
      lines: JOURNAL_ENTRY_PARAM,
      notes: { type: 'string' },
      tags: { type: 'array', items: { type: 'string' }, description: 'Tags (string array)' },
      currency: CURRENCY_PARAM,
      saveAsDraft: { type: 'boolean', description: 'Save as draft (default false)' },
    },
    required: ['valueDate', 'accountResourceId', 'lines'],
    group: 'cash_entries',
    readOnly: false,
    execute: async (ctx, input) => {
      const data = { ...input } as unknown as Parameters<typeof createCashIn>[1];
      if (!data.reference) data.reference = `CI-${Date.now()}`;
      return createCashIn(ctx.client, data);
    },
  },
  listTool(
    'list_cash_out',
    'List cash-out entries (direct cash disbursements). Paginated.',
    'cash_entries',
    (client, off, lim) => listCashOut(client, { limit: lim, offset: off }),
  ),
  {
    name: 'create_cash_out',
    description: `Record money paid OUT FROM a bank account to an EXTERNAL party (expense, supplier payment, reimbursement, withdrawal).
WHEN TO USE: expenses paid, supplier payments, reimbursements, withdrawals to external parties.
WHEN NOT TO USE: moving money between your own bank/cash accounts — use create_cash_transfer instead.
- CRITICAL: accountResourceId MUST be a Bank/Cash account from list_bank_accounts output. Using expense, revenue, or liability accounts will fail with "CashOut journal account cannot be in CashIn Entries". Always call list_bank_accounts first to find valid accounts.
- lines are the offsetting entries. Each needs accountResourceId, type (DEBIT for cash-out expenses), and amount (must be > 0). For cash-out: use type "DEBIT" on the expense/offset account. IMPORTANT: offset accounts must be regular P&L or balance sheet accounts (expense, revenue, asset, liability) — NOT bank/cash accounts or controlled accounts (AR/AP). Example: { accountResourceId: "<expense-acct-id>", type: "DEBIT", amount: 100 }.
- The API enforces account separation: cash-out bank account cannot appear in lines.`,
    params: {
      reference: { type: 'string', description: 'Reference number' },
      valueDate: { type: 'string', description: 'Date (YYYY-MM-DD)' },
      accountResourceId: { type: 'string', description: 'Bank/cash account resourceId' },
      lines: JOURNAL_ENTRY_PARAM,
      notes: { type: 'string' },
      tags: { type: 'array', items: { type: 'string' }, description: 'Tags (string array)' },
      currency: CURRENCY_PARAM,
      saveAsDraft: { type: 'boolean', description: 'Save as draft (default false)' },
    },
    required: ['valueDate', 'accountResourceId', 'lines'],
    group: 'cash_entries',
    readOnly: false,
    execute: async (ctx, input) => {
      const data = { ...input } as unknown as Parameters<typeof createCashOut>[1];
      if (!data.reference) data.reference = `CO-${Date.now()}`;
      return createCashOut(ctx.client, data);
    },
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
    description: 'Update an existing cash-in entry (change amount, date, reference, notes, tags, or entry lines). Use when the user says "update", "change", "fix", or "adjust" a cash-in that was just created or found. Do NOT create a new entry — use this tool instead. NOTE: cash entries created without saveAsDraft:true are ACTIVE (finalized) and cannot be updated — they must be deleted and recreated.',
    params: {
      resourceId: { type: 'string', description: 'Cash-in resourceId (parentEntityResourceId from create response)' },
      accountResourceId: { type: 'string', description: 'Bank account resourceId (required for update)' },
      reference: { type: 'string' },
      valueDate: { type: 'string' },
      lines: JOURNAL_ENTRY_PARAM,
      notes: { type: 'string' },
      tags: { type: 'array', items: { type: 'string' }, description: 'Tags (string array)' },
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
    description: 'Update an existing cash-out entry (change amount, date, reference, notes, tags, or entry lines). Use when the user says "update", "change", "fix", or "adjust" a cash-out that was just created or found. Do NOT create a new entry — use this tool instead. NOTE: cash entries created without saveAsDraft:true are ACTIVE (finalized) and cannot be updated — they must be deleted and recreated.',
    params: {
      resourceId: { type: 'string', description: 'Cash-out resourceId (parentEntityResourceId from create response)' },
      accountResourceId: { type: 'string', description: 'Bank account resourceId (required for update)' },
      reference: { type: 'string' },
      valueDate: { type: 'string' },
      lines: JOURNAL_ENTRY_PARAM,
      notes: { type: 'string' },
      tags: { type: 'array', items: { type: 'string' }, description: 'Tags (string array)' },
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
    description: `Move money between two of YOUR OWN bank/cash accounts (internal transfer, e.g., main bank to petty cash, USD account to SGD account).
WHEN TO USE: petty cash top-ups from bank, inter-account transfers, currency conversions between own accounts.
WHEN NOT TO USE: receiving money from external parties (use create_cash_in) or paying external parties (use create_cash_out).
- cashOut = source account (money leaves), cashIn = destination account (money arrives).
- Each side needs accountResourceId + amount.
- reference is auto-generated if not provided.
- Do NOT send currency/exchangeRate — derived server-side from bank account currencies.`,
    params: {
      reference: { type: 'string', description: 'Reference number' },
      valueDate: { type: 'string', description: 'Date (YYYY-MM-DD)' },
      cashOut: {
        type: 'object',
        properties: {
          accountResourceId: { type: 'string', description: 'Source bank account resourceId' },
          amount: { type: 'number', description: 'Transfer amount' },
        },
        required: ['accountResourceId', 'amount'],
      },
      cashIn: {
        type: 'object',
        properties: {
          accountResourceId: { type: 'string', description: 'Destination bank account resourceId' },
          amount: { type: 'number', description: 'Transfer amount' },
        },
        required: ['accountResourceId', 'amount'],
      },
      tags: { type: 'array', items: { type: 'string' }, description: 'Tags (string array)' },
      saveAsDraft: { type: 'boolean', description: 'Save as draft (default true)' },
    },
    required: ['valueDate', 'cashOut', 'cashIn'],
    group: 'cash_transfers',
    readOnly: false,
    execute: async (ctx, input) => {
      const data = { ...input } as Parameters<typeof createCashTransfer>[1];
      if (!data.reference) data.reference = `CT-${Date.now()}`;
      return createCashTransfer(ctx.client, data);
    },
  },
  deleteTool(
    'delete_cash_in',
    'Delete (void) a cash-in entry. Uses parentEntityResourceId from create response.',
    'cash_entries',
    (client, id) => deleteCashEntry(client, id),
  ),
  deleteTool(
    'delete_cash_out',
    'Delete (void) a cash-out entry. Uses parentEntityResourceId from create response.',
    'cash_entries',
    (client, id) => deleteCashEntry(client, id),
  ),
  deleteTool(
    'delete_cash_transfer',
    'Delete (void) a cash transfer. Uses parentEntityResourceId from create response.',
    'cash_transfers',
    (client, id) => deleteCashEntry(client, id),
  ),

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
    description: 'Search bank records (imported bank transactions) for a specific account. Use this to find unreconciled items, match deposits to invoices, or identify bank charges. For duplicate detection, also cross-reference with search_cashflow_transactions to check if matching payments/cash entries exist. Filter by status (UNRECONCILED/RECONCILED/POSSIBLE_DUPLICATE), date range, description, payer/payee, reference, and amount range. Call list_bank_accounts first to get the accountResourceId.',
    params: {
      accountResourceId: { type: 'string', description: 'Bank account resourceId' },
      status: { type: 'string', enum: ['UNRECONCILED', 'RECONCILED', 'ARCHIVED', 'POSSIBLE_DUPLICATE'], description: 'Filter by reconciliation status' },
      from: { type: 'string', description: 'Filter from date inclusive (YYYY-MM-DD)' },
      to: { type: 'string', description: 'Filter to date inclusive (YYYY-MM-DD)' },
      description: { type: 'string', description: 'Filter by description (contains)' },
      payer: { type: 'string', description: 'Filter by payer/payee name (contains)' },
      reference: { type: 'string', description: 'Filter by reference (contains)' },
      amountMin: { type: 'number', description: 'Filter by minimum amount (inclusive)' },
      amountMax: { type: 'number', description: 'Filter by maximum amount (inclusive)' },
      ...SEARCH_PARAMS,
    },
    required: ['accountResourceId'],
    group: 'bank',
    readOnly: true,
    execute: async (ctx, input) => {
      assertUUID(input.accountResourceId as string, 'accountResourceId',
        'Call list_bank_accounts first to get the bank account UUID.');
      const { limit, offset, sortBy, sortOrder } = extractPaginationInput(input);
      return handlePagination((off, lim) => searchBankRecords(
        ctx.client, input.accountResourceId as string, {
          filter: buildBankRecordFilter(input),
          limit: lim, offset: off,
          sort: { sortBy: [sortBy ?? 'valueDate'], order: (sortOrder ?? 'DESC') as 'ASC' | 'DESC' },
        },
      ), limit, offset, 20);
    },
  },

  // ── Cashflow Transactions ──────────────────────────────────────
  {
    name: 'search_cashflow_transactions',
    description: 'Search cashflow transactions (unified ledger: invoices, bills, credit notes, journals, payments). Useful for reconciliation.',
    params: {
      businessTransactionType: { type: 'string', description: 'Filter by type (e.g., INVOICE, BILL, JOURNAL)' },
      direction: { type: 'string', enum: ['IN', 'OUT'], description: 'Filter by direction' },
      startDate: { type: 'string', description: 'Filter from date (YYYY-MM-DD)' },
      endDate: { type: 'string', description: 'Filter to date (YYYY-MM-DD)' },
      status: { type: 'string', description: 'Filter by transaction status' },
      reference: { type: 'string', description: 'Filter by reference (contains)' },
      ...SEARCH_PARAMS,
    },
    required: [],
    group: 'cashflow',
    readOnly: true,
    execute: async (ctx, input) => {
      const { limit, offset, sortBy, sortOrder } = extractPaginationInput(input);
      return handlePagination((off, lim) => searchCashflowTransactions(ctx.client, {
        filter: buildCashflowFilter(input),
        limit: lim, offset: off,
        sort: { sortBy: [sortBy ?? 'valueDate'], order: (sortOrder ?? 'DESC') as 'ASC' | 'DESC' },
      }), limit, offset, 20);
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
    description: 'Update an existing bookmark (name, value, or category). Use when modifying a previously created bookmark.',
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
      const { limit, offset, sortBy, sortOrder } = extractPaginationInput(input);
      const query = input.query as string;
      return handlePagination((off, lim) => searchOrgUsers(ctx.client, {
        filter: { or: { firstName: { contains: query }, lastName: { contains: query }, email: { contains: query } } },
        limit: lim, offset: off,
        sort: { sortBy: [sortBy ?? 'firstName'], order: (sortOrder ?? 'ASC') as 'ASC' | 'DESC' },
      }), limit, offset, 20);
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
            moduleName: { type: 'string', description: 'Module name: ORGANIZATION, USER_MANAGEMENT, ACCOUNTING, SALES, PURCHASES, REPORTS, or FIXED_ASSET' },
            roleCode: { type: 'string', description: 'Role code: ADMIN, PREPARER, MEMBER, or NO_ACCESS' },
          },
          required: ['moduleName', 'roleCode'],
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
            moduleName: { type: 'string', description: 'Module name: ORGANIZATION, USER_MANAGEMENT, ACCOUNTING, SALES, PURCHASES, REPORTS, or FIXED_ASSET' },
            roleCode: { type: 'string', description: 'Role code: ADMIN, PREPARER, MEMBER, or NO_ACCESS' },
          },
          required: ['moduleName', 'roleCode'],
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
    description: 'Search payments with filters (date, type, direction, reference, account).',
    params: {
      ...SEARCH_PARAMS,
      businessTransactionType: { type: 'string', description: 'Filter by type (SALE, PURCHASE, JOURNAL_MANUAL, etc.)' },
      direction: { type: 'string', description: 'Filter by direction: PAYIN or PAYOUT' },
      fromDate: { type: 'string', description: 'Filter from date (YYYY-MM-DD, inclusive)' },
      toDate: { type: 'string', description: 'Filter to date (YYYY-MM-DD, inclusive)' },
      reference: { type: 'string', description: 'Filter by reference (contains)' },
      accountResourceId: { type: 'string', description: 'Filter by account resourceId' },
    },
    required: [],
    group: 'payments',
    readOnly: true,
    execute: async (ctx, input) => {
      const { limit, offset, sortBy, sortOrder } = extractPaginationInput(input);
      const filter: Record<string, unknown> = {};
      if (input.businessTransactionType) filter.businessTransactionType = { eq: input.businessTransactionType };
      if (input.direction) filter.direction = { eq: input.direction };
      if (input.reference) filter.businessTransactionReference = { contains: input.reference };
      if (input.accountResourceId) filter.organizationAccountResourceId = { eq: input.accountResourceId };
      if (input.fromDate || input.toDate) {
        const df: Record<string, string> = {};
        if (input.fromDate) df.gte = input.fromDate as string;
        if (input.toDate) df.lte = input.toDate as string;
        filter.valueDate = df;
      }
      return handlePagination((off, lim) => searchPayments(ctx.client, {
        filter: Object.keys(filter).length > 0 ? filter : undefined,
        limit: lim, offset: off,
        sort: { sortBy: [sortBy ?? 'valueDate'], order: (sortOrder ?? 'DESC') as 'ASC' | 'DESC' },
      }), limit, offset, 20);
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
    description: `Plan a transaction recipe — run a financial calculator and show what accounts, contacts, and bank accounts are needed. This is READ-ONLY (no API calls, no transactions created).
YOUR NEXT STEP after this tool: call execute_recipe with the same parameters plus startDate. The execute_recipe tool IS available to you — ALWAYS use it (not create_journal/create_invoice/create_cash_out).
Supported recipes: ${RECIPE_TYPES.join(', ')}
Returns: capsule type/name, required accounts, step breakdown (journal/bill/invoice/cash-in/cash-out), and full calculator results.
Use this BEFORE execute_recipe to verify requirements. Parameters vary by recipe — see recipe skill docs for per-recipe params.
CRITICAL: ALWAYS call this tool for ANY calculation involving: depreciation, amortization, ECL/expected credit loss, FX revaluation, lease/IFRS 16, hire purchase, loan schedules, provisions, deferred revenue, fixed deposits, or asset disposal. Never compute these manually.`,
    params: {
      recipe: { type: 'string', enum: [...RECIPE_TYPES], description: 'Recipe type' },
      // Universal params
      amount: { type: 'number', description: 'Amount (for amortization, accrued-expense, dividend, ecl, provision, fx-reval)' },
      principal: { type: 'number', description: 'Principal (for loan, fixed-deposit)' },
      startDate: { type: 'string', description: 'Start date YYYY-MM-DD (REQUIRED for blueprint generation — default to today if user does not specify)' },
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
      return {
        ...planRecipe(recipe, calcResult),
        _nextStep: 'Call execute_recipe with the same parameters plus startDate to create all transactions. The execute_recipe tool IS available — use it now.',
      };
    },
  },
  {
    name: 'execute_recipe',
    description: `Execute a transaction recipe end-to-end — run calculator, create capsule, post all entries in one call.
PREFERRED over manual transaction creation — replaces ~20 manual tool calls. After plan_recipe, ALWAYS use this tool (not create_journal/create_invoice/create_cash_out).
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
- Flat structure — reference, valueDate, saveAsDraft at top level (not nested).
Dynamic strings for reference/name/notes: {{Day}}, {{Date}}, {{Date+X}}, {{DateRange:X}}, {{Month}}, {{Month+X}}, {{MonthRange:X}}, {{Year}}, {{Year+X}} — replaced with values relative to the transaction date.`,
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
    required: ['startDate', 'repeat', 'valueDate', 'schedulerEntries'],
    group: 'schedulers',
    readOnly: false,
    execute: async (ctx, input) => createScheduledJournal(ctx.client, {
      status: 'ACTIVE',
      startDate: input.startDate as string,
      endDate: input.endDate as string | undefined,
      repeat: input.repeat as string,
      valueDate: input.valueDate as string,
      schedulerEntries: input.schedulerEntries as Parameters<typeof createScheduledJournal>[1]['schedulerEntries'],
      reference: input.reference as string | undefined,
      notes: input.notes as string | undefined,
    }),
  },
  {
    name: 'create_scheduled_invoice',
    description: `Create a scheduled (recurring) invoice. Use for fixed-amount recurring invoices where you want full control over currency, tax, and line items each period.
DIFFERENT from subscriptions: no proration, but currency/tax/items can differ per occurrence.
CRITICAL:
- saveAsDraft MUST be false (API rejects INVALID_SALE_STATUS otherwise).
- Use repeat (NOT frequency/interval): WEEKLY, MONTHLY, QUARTERLY, YEARLY.
- Each lineItem needs name, unitPrice, quantity, accountResourceId.
Dynamic strings for reference/name/notes: {{Day}}, {{Date}}, {{Date+X}}, {{DateRange:X}}, {{Month}}, {{Month+X}}, {{MonthRange:X}}, {{Year}}, {{Year+X}} — replaced with values relative to the transaction date.`,
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
    required: ['startDate', 'repeat', 'contactResourceId', 'reference', 'valueDate', 'dueDate', 'lineItems'],
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
- Each lineItem needs name, unitPrice, quantity, accountResourceId.
Dynamic strings for reference/name/notes: {{Day}}, {{Date}}, {{Date+X}}, {{DateRange:X}}, {{Month}}, {{Month+X}}, {{MonthRange:X}}, {{Year}}, {{Year+X}} — replaced with values relative to the transaction date.`,
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
    required: ['startDate', 'repeat', 'contactResourceId', 'reference', 'valueDate', 'dueDate', 'lineItems'],
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
      journalEntries: JOURNAL_ENTRY_PARAM,
      notes: { type: 'string' },
      tags: { type: 'array', items: { type: 'string' }, description: 'Tags (string array)' },
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
      tags: input.tags as string[] | undefined,
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
    execute: async (ctx, input) => {
      if (!input.sourceUrl && !input.attachmentId) {
        throw new Error('Provide sourceUrl or attachmentId — one is required.');
      }
      return importBankStatement(ctx.client, {
        businessTransactionType: 'BANK_STATEMENT',
        accountResourceId: input.accountResourceId as string,
        sourceUrl: input.sourceUrl as string | undefined,
        attachmentId: input.attachmentId as string | undefined,
      });
    },
  },

  // ── Bank Records: JSON POST ──────────────────────────────────
  {
    name: 'add_bank_records',
    description:
      'Create bank statement entries via JSON POST (1-100 records per call). For CSV/OFX file imports, use import_bank_statement instead.\n\nFields per record:\n- amount (required): positive = cash-in, negative = cash-out\n- transactionDate (required): YYYY-MM-DD\n- description, payerOrPayee, reference: optional strings\n\nReturns {data: {errors: []}} on success. accountResourceId must be a bank-type CoA account (find via list_bank_accounts).',
    params: {
      accountResourceId: {
        type: 'string',
        description: 'Bank account resourceId (from list_bank_accounts)',
      },
      records: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            amount: { type: 'number', description: 'Positive = cash-in, negative = cash-out' },
            transactionDate: { type: 'string', description: 'Date (YYYY-MM-DD)' },
            description: { type: 'string', description: 'Description' },
            payerOrPayee: { type: 'string', description: 'Payer or payee name' },
            reference: { type: 'string', description: 'Reference' },
          },
          required: ['amount', 'transactionDate'],
        },
        description: 'Array of 1-100 bank records',
      },
    },
    required: ['accountResourceId', 'records'],
    group: 'bank',
    readOnly: false,
    execute: async (ctx, input) =>
      addBankRecords(
        ctx.client,
        input.accountResourceId as string,
        input.records as AddBankRecordEntry[],
      ),
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
    execute: async (ctx, input) => {
      if (!input.sourceUrl && !input.attachmentId) {
        throw new Error('Provide sourceUrl or attachmentId — one is required.');
      }
      return createFromAttachment(ctx.client, {
        businessTransactionType: input.businessTransactionType as Parameters<typeof createFromAttachment>[1]['businessTransactionType'],
        sourceUrl: input.sourceUrl as string | undefined,
        attachmentId: input.attachmentId as string | undefined,
      });
    },
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
      const { limit, offset, sortBy, sortOrder } = extractPaginationInput(input);
      const filter: Record<string, unknown> = {};
      if (input.status) filter.status = input.status;
      if (input.documentType) filter.documentType = input.documentType;
      return handlePagination((off, lim) => searchMagicWorkflows(ctx.client, {
        filter: Object.keys(filter).length > 0 ? filter : undefined,
        limit: lim, offset: off,
        sort: { sortBy: [sortBy ?? 'createdAt'], order: (sortOrder ?? 'DESC') as 'ASC' | 'DESC' },
      }), limit, offset, 20);
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
    description: 'Add an attachment to a business transaction. Provide sourceUrl (downloads and uploads as file) or attachmentId (links existing).',
    params: {
      transactionType: {
        type: 'string',
        enum: ['invoices', 'bills', 'journals', 'scheduled_journals', 'customer-credit-notes', 'supplier-credit-notes'],
        description: 'Transaction type',
      },
      transactionId: { type: 'string', description: 'Transaction resourceId' },
      attachmentId: { type: 'string', description: 'Attachment ID to link (alternative to sourceUrl)' },
      sourceUrl: { type: 'string', description: 'Source file URL — downloaded and uploaded as multipart file' },
    },
    required: ['transactionType', 'transactionId'],
    group: 'attachments',
    readOnly: false,
    execute: async (ctx, input) => {
      if (!input.attachmentId && !input.sourceUrl) {
        throw new Error('Provide attachmentId or sourceUrl — one is required.');
      }
      let file: Blob | undefined;
      let fileName: string | undefined;
      if (input.sourceUrl) {
        const res = await fetch(input.sourceUrl as string);
        if (!res.ok) throw new Error(`Failed to download ${input.sourceUrl}: ${res.status}`);
        const buffer = await res.arrayBuffer();
        const contentType = res.headers.get('content-type') ?? 'application/octet-stream';
        file = new Blob([buffer], { type: contentType });
        try { fileName = new URL(input.sourceUrl as string).pathname.split('/').pop() || 'attachment'; } catch { fileName = 'attachment'; }
      }
      return addAttachment(ctx.client, {
        businessTransactionType: input.transactionType as Parameters<typeof addAttachment>[1]['businessTransactionType'],
        businessTransactionResourceId: input.transactionId as string,
        file,
        fileName,
        attachmentId: input.attachmentId as string | undefined,
      });
    },
  },
  {
    name: 'delete_attachment',
    description: 'Delete an attachment from a business transaction.',
    params: {
      transactionType: {
        type: 'string',
        enum: ['invoices', 'bills', 'journals', 'scheduled_journals', 'customer-credit-notes', 'supplier-credit-notes'],
        description: 'Transaction type',
      },
      transactionId: { type: 'string', description: 'Transaction resourceId' },
      attachmentResourceId: { type: 'string', description: 'Attachment resourceId (from get_attachments response)' },
    },
    required: ['transactionType', 'transactionId', 'attachmentResourceId'],
    group: 'attachments',
    readOnly: false,
    execute: async (ctx, input) => deleteAttachment(
      ctx.client,
      input.transactionType as Parameters<typeof deleteAttachment>[1],
      input.transactionId as string,
      input.attachmentResourceId as string,
    ),
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

  // ══════════════════════════════════════════════════════════════
  // ── Close Procedure Jobs (offline — no API calls) ────────────
  // ══════════════════════════════════════════════════════════════

  {
    name: 'generate_month_end_blueprint',
    description: 'Generate a month-end close checklist with phases, steps, recipe references, and API calls. Returns a structured JobBlueprint.',
    params: {
      period: { type: 'string', description: 'Period in YYYY-MM format (e.g., "2026-01")' },
      currency: { type: 'string', description: 'Base currency (e.g., "SGD"). Defaults to SGD.' },
    },
    required: ['period'],
    group: 'close_jobs',
    readOnly: true,
    execute: async (_ctx, input) => generateMonthEndBlueprint({
      period: input.period as string,
      currency: input.currency as string | undefined,
    }),
  },
  {
    name: 'generate_quarter_end_blueprint',
    description: 'Generate a quarter-end close checklist. Set incremental=true to skip month-end phases (assumes months are already closed).',
    params: {
      period: { type: 'string', description: 'Period in YYYY-QN format (e.g., "2026-Q1")' },
      currency: { type: 'string', description: 'Base currency (e.g., "SGD"). Defaults to SGD.' },
      incremental: { type: 'boolean', description: 'Skip month-end phases (assumes months already closed)' },
    },
    required: ['period'],
    group: 'close_jobs',
    readOnly: true,
    execute: async (_ctx, input) => generateQuarterEndBlueprint({
      period: input.period as string,
      currency: input.currency as string | undefined,
      incremental: input.incremental as boolean | undefined,
    }),
  },
  {
    name: 'generate_year_end_blueprint',
    description: 'Generate a year-end close checklist. Set incremental=true to skip quarter/month phases (assumes already closed).',
    params: {
      period: { type: 'string', description: 'Year in YYYY format (e.g., "2025")' },
      currency: { type: 'string', description: 'Base currency (e.g., "SGD"). Defaults to SGD.' },
      incremental: { type: 'boolean', description: 'Skip quarter/month phases (assumes already closed)' },
    },
    required: ['period'],
    group: 'close_jobs',
    readOnly: true,
    execute: async (_ctx, input) => generateYearEndBlueprint({
      period: input.period as string,
      currency: input.currency as string | undefined,
      incremental: input.incremental as boolean | undefined,
    }),
  },
  {
    name: 'generate_bank_recon_blueprint',
    description: 'Generate a bank reconciliation job checklist — match bank statement entries to ledger transactions.',
    params: {
      account: { type: 'string', description: 'Specific bank account name or resourceId (optional — all accounts if omitted)' },
      period: { type: 'string', description: 'Period in YYYY-MM format (optional)' },
      currency: { type: 'string', description: 'Base currency (e.g., "SGD"). Defaults to SGD.' },
    },
    required: [],
    group: 'close_jobs',
    readOnly: true,
    execute: async (_ctx, input) => generateBankReconBlueprint({
      account: input.account as string | undefined,
      period: input.period as string | undefined,
      currency: input.currency as string | undefined,
    }),
  },
  {
    name: 'generate_gst_vat_blueprint',
    description: 'Generate a GST/VAT filing job checklist — verify tax transactions, reconcile GST accounts, prepare F5 return.',
    params: {
      period: { type: 'string', description: 'Period in YYYY-QN format (e.g., "2026-Q1")' },
      currency: { type: 'string', description: 'Base currency (e.g., "SGD"). Defaults to SGD.' },
    },
    required: ['period'],
    group: 'close_jobs',
    readOnly: true,
    execute: async (_ctx, input) => generateGstVatBlueprint({
      period: input.period as string,
      currency: input.currency as string | undefined,
    }),
  },
  {
    name: 'generate_payment_run_blueprint',
    description: 'Generate a payment run job checklist — identify outstanding bills, verify bank details, batch payments.',
    params: {
      dueBefore: { type: 'string', description: 'Pay bills due before this date (YYYY-MM-DD). Defaults to today.' },
      currency: { type: 'string', description: 'Base currency (e.g., "SGD"). Defaults to SGD.' },
    },
    required: [],
    group: 'operational_jobs',
    readOnly: true,
    execute: async (_ctx, input) => generatePaymentRunBlueprint({
      dueBefore: input.dueBefore as string | undefined,
      currency: input.currency as string | undefined,
    }),
  },
  {
    name: 'generate_credit_control_blueprint',
    description: 'Generate a credit control job checklist — chase overdue invoices, send reminders, escalate aged debt.',
    params: {
      overdueDays: { type: 'number', description: 'Minimum days overdue to include (default 30)' },
      currency: { type: 'string', description: 'Base currency (e.g., "SGD"). Defaults to SGD.' },
    },
    required: [],
    group: 'operational_jobs',
    readOnly: true,
    execute: async (_ctx, input) => generateCreditControlBlueprint({
      overdueDays: input.overdueDays as number | undefined,
      currency: input.currency as string | undefined,
    }),
  },
  {
    name: 'generate_supplier_recon_blueprint',
    description: 'Generate a supplier reconciliation job checklist — match supplier statements to AP ledger.',
    params: {
      supplier: { type: 'string', description: 'Specific supplier name or resourceId (optional — all suppliers if omitted)' },
      period: { type: 'string', description: 'Period in YYYY-MM format (optional)' },
      currency: { type: 'string', description: 'Base currency (e.g., "SGD"). Defaults to SGD.' },
    },
    required: [],
    group: 'operational_jobs',
    readOnly: true,
    execute: async (_ctx, input) => generateSupplierReconBlueprint({
      supplier: input.supplier as string | undefined,
      period: input.period as string | undefined,
      currency: input.currency as string | undefined,
    }),
  },
  {
    name: 'generate_audit_prep_blueprint',
    description: 'Generate an audit preparation job checklist — verify completeness, prepare supporting schedules, organize documents.',
    params: {
      period: { type: 'string', description: 'Period in YYYY or YYYY-QN format (e.g., "2025" or "2025-Q4")' },
      currency: { type: 'string', description: 'Base currency (e.g., "SGD"). Defaults to SGD.' },
    },
    required: ['period'],
    group: 'close_jobs',
    readOnly: true,
    execute: async (_ctx, input) => generateAuditPrepBlueprint({
      period: input.period as string,
      currency: input.currency as string | undefined,
    }),
  },
  {
    name: 'generate_fa_review_blueprint',
    description: 'Generate a fixed asset review job checklist — verify asset register, reconcile depreciation, check disposals.',
    params: {
      currency: { type: 'string', description: 'Base currency (e.g., "SGD"). Defaults to SGD.' },
    },
    required: [],
    group: 'operational_jobs',
    readOnly: true,
    execute: async (_ctx, input) => generateFaReviewBlueprint({
      currency: input.currency as string | undefined,
    }),
  },
  {
    name: 'generate_document_collection_blueprint',
    description: 'Generate a document collection job checklist — identify missing invoices, receipts, and supporting docs for the period.',
    params: {
      currency: { type: 'string', description: 'Base currency (e.g., "SGD"). Defaults to SGD.' },
    },
    required: [],
    group: 'operational_jobs',
    readOnly: true,
    execute: async (_ctx, input) => generateDocumentCollectionBlueprint({
      currency: input.currency as string | undefined,
    }),
  },
  {
    name: 'generate_statutory_filing_blueprint',
    description: 'Generate a statutory filing job checklist — prepare corporate income tax computation, file returns.',
    params: {
      ya: { type: 'number', description: 'Year of Assessment (defaults to current year)' },
      jurisdiction: { type: 'string', description: 'Tax jurisdiction code (e.g., "sg"). Defaults to "sg".' },
      currency: { type: 'string', description: 'Base currency (e.g., "SGD"). Defaults to SGD.' },
    },
    required: [],
    group: 'operational_jobs',
    readOnly: true,
    execute: async (_ctx, input) => generateStatutoryFilingBlueprint({
      ya: input.ya as number | undefined,
      jurisdiction: input.jurisdiction as string | undefined,
      currency: input.currency as string | undefined,
    }),
  },

  // ══════════════════════════════════════════════════════════════
  // ── Draft Validation Tools ───────────────────────────────────
  // ══════════════════════════════════════════════════════════════

  {
    name: 'validate_invoice_draft',
    description: 'Check if an invoice draft is ready to finalize. Returns missing fields, structured validation report, and ready status. Use before finalize_invoice to prevent errors.',
    params: {
      resourceId: { type: 'string', description: 'Invoice resourceId' },
    },
    required: ['resourceId'],
    group: 'drafts',
    readOnly: true,
    execute: async (ctx, input) => {
      const id = input.resourceId as string;
      const res = await getInvoice(ctx.client, id);
      const attachRes = await listAttachments(ctx.client, 'invoices', id);
      return buildDraftReport(res.data, INVOICE_REQUIRED_FIELDS, attachRes.data.length);
    },
  },
  {
    name: 'validate_bill_draft',
    description: 'Check if a bill draft is ready to finalize. Returns missing fields, structured validation report, and ready status. Use before finalize_bill to prevent errors.',
    params: {
      resourceId: { type: 'string', description: 'Bill resourceId' },
    },
    required: ['resourceId'],
    group: 'drafts',
    readOnly: true,
    execute: async (ctx, input) => {
      const id = input.resourceId as string;
      const res = await getBill(ctx.client, id);
      const attachRes = await listAttachments(ctx.client, 'bills', id);
      return buildDraftReport(res.data, BILL_REQUIRED_FIELDS, attachRes.data.length);
    },
  },
  {
    name: 'validate_journal_draft',
    description: 'Check if a journal draft is ready to finalize. Returns missing fields (accounts, amounts, date), structured validation, and ready status.',
    params: {
      resourceId: { type: 'string', description: 'Journal resourceId' },
    },
    required: ['resourceId'],
    group: 'drafts',
    readOnly: true,
    execute: async (ctx, input) => {
      const res = await getJournal(ctx.client, input.resourceId as string);
      return buildDraftReport(res.data, JOURNAL_REQUIRED_FIELDS, 0, 'journalEntries');
    },
  },
  {
    name: 'validate_credit_note_draft',
    description: 'Check if a credit note draft (customer or supplier) is ready to finalize. Returns missing fields, structured validation, and ready status.',
    params: {
      resourceId: { type: 'string', description: 'Credit note resourceId' },
      type: { type: 'string', enum: ['customer', 'supplier'], description: 'Credit note type: "customer" or "supplier"' },
    },
    required: ['resourceId', 'type'],
    group: 'drafts',
    readOnly: true,
    execute: async (ctx, input) => {
      const id = input.resourceId as string;
      const cnType = input.type as string;
      const res = cnType === 'customer'
        ? await getCustomerCreditNote(ctx.client, id)
        : await getSupplierCreditNote(ctx.client, id);
      const btType = cnType === 'customer' ? 'customer-credit-notes' as const : 'supplier-credit-notes' as const;
      const attachRes = await listAttachments(ctx.client, btType, id);
      return buildDraftReport(res.data, CREDIT_NOTE_REQUIRED_FIELDS, attachRes.data.length);
    },
  },

  // ══════════════════════════════════════════════════════════════
  // ── Bank Rules ─────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════

  listTool(
    'list_bank_rules',
    'List bank reconciliation rules (action shortcuts). Shows rule name, action type, and target bank account.',
    'bank_rules',
    (client, off, lim) => listBankRules(client, { limit: lim, offset: off }),
  ),
  getTool(
    'get_bank_rule',
    'Get full bank rule details including configuration (allocation percentages, accounts, tax settings).',
    'bank_rules',
    (client, id) => getBankRule(client, id),
  ),
  {
    name: 'search_bank_rules',
    description: 'Search bank rules by name or action type.',
    params: {
      query: { type: 'string', description: 'Search term (rule name)' },
      ...SEARCH_PARAMS,
    },
    required: ['query'],
    group: 'bank_rules' as const,
    readOnly: true,
    execute: async (ctx, input) => {
      const { limit, offset, sortBy, sortOrder } = extractPaginationInput(input);
      const query = input.query as string;
      return handlePagination((off, lim) => searchBankRules(ctx.client, {
        filter: { name: { contains: query } },
        limit: lim, offset: off,
        sort: { sortBy: [sortBy ?? 'name'], order: (sortOrder ?? 'ASC') as 'ASC' | 'DESC' },
      }), limit, offset, 20);
    },
  },
  {
    name: 'create_bank_rule',
    description: `Create a bank reconciliation rule. Rules auto-match bank records to transactions during reconciliation. When the user asks to create a bank rule, use this tool directly — do not only list existing rules.
- appliesToReconciliationAccount: the bank account UUID this rule applies to (NOT "ResourceId" suffix)
- configuration MUST be nested under reconcileWithDirectCashEntry key
- configuration.reconcileWithDirectCashEntry.reference is REQUIRED (omitting causes error)
- amountAllocationType: "PERCENTAGE" or "FIXED". Do NOT send "FIXED_AND_PERCENTAGE" — include both arrays and the server infers it.
- Optional: contactResourceId (pre-fills contact on created DCE), internalNotes, currencySettings, taxCurrencySettings
Minimum payload: { reconcileWithDirectCashEntry: { amountAllocationType: "PERCENTAGE", reference: "{{bankReference}}", percentageAllocation: [{ organizationAccountResourceId: "<acct>", amount: 100 }] } }
Full payload: { reconcileWithDirectCashEntry: { amountAllocationType: "PERCENTAGE", reference: "{{bankPayee}} - {{bankDescription}}", percentageAllocation: [...], fixedAllocation: [...], contactResourceId: "<uuid>", internalNotes: "Auto-reconciled", tags: ["auto"], taxInclusion: false, taxVatApplicable: false } }
Dynamic strings for name/reference: {{bankReference}} (e.g., INV-03/01/2025-01), {{bankPayee}} (e.g., Fruit Planet), {{bankDescription}} (e.g., QR Payment) — replaced with actual bank record values during reconciliation.`,
    params: {
      name: { type: 'string', description: 'Rule name — supports dynamic strings: {{bankReference}}, {{bankPayee}}, {{bankDescription}}' },
      appliesToReconciliationAccount: { type: 'string', description: 'Bank account UUID this rule applies to' },
      configuration: { type: 'object', description: 'MUST nest under reconcileWithDirectCashEntry key. reference is REQUIRED. See tool description for full structure.' },
    },
    required: ['name', 'appliesToReconciliationAccount', 'configuration'],
    group: 'bank_rules' as const,
    readOnly: false,
    execute: async (ctx, input) => createBankRule(ctx.client, input as Parameters<typeof createBankRule>[1]),
  },
  {
    name: 'update_bank_rule',
    description: `Update an existing bank reconciliation rule. FULL REPLACEMENT — the API replaces the entire rule on update. You MUST provide the complete configuration, appliesToReconciliationAccount, and name every time. Use get_bank_rule first to read the current state, merge your changes, then call this tool with the full payload. Dynamic strings: {{bankReference}}, {{bankPayee}}, {{bankDescription}}.`,
    params: {
      resourceId: { type: 'string', description: 'Bank rule resourceId' },
      name: { type: 'string', description: 'Rule name — supports dynamic strings: {{bankReference}}, {{bankPayee}}, {{bankDescription}}' },
      appliesToReconciliationAccount: { type: 'string', description: 'Bank account UUID this rule applies to (required for update — full replacement)' },
      configuration: { type: 'object', description: 'Full configuration object — must nest under reconcileWithDirectCashEntry key (same structure as create). reference is REQUIRED.' },
    },
    required: ['resourceId', 'name', 'appliesToReconciliationAccount', 'configuration'],
    group: 'bank_rules' as const,
    readOnly: false,
    execute: async (ctx, input) => updateBankRule(ctx.client, input.resourceId as string, {
      resourceId: input.resourceId as string,
      name: input.name as string,
      appliesToReconciliationAccount: input.appliesToReconciliationAccount as string,
      configuration: input.configuration as Record<string, unknown>,
    }),
  },
  deleteTool(
    'delete_bank_rule',
    'Delete a bank reconciliation rule.',
    'bank_rules',
    (client, id) => deleteBankRule(client, id),
  ),

  // ── Auto-Reconciliation ──────────────────────────────────────
  {
    name: 'view_auto_reconciliation',
    description: 'Generate auto-reconciliation recommendations for a bank account. Returns magic match suggestions.',
    params: {
      bankAccountResourceId: { type: 'string', description: 'Bank account resourceId' },
      recommendationType: {
        type: 'string',
        enum: ['MAGIC_MATCH', 'MAGIC_RECONCILE_WITH_CASH_TRANSFER', 'MAGIC_RECONCILE_WITH_BANK_RULE', 'MAGIC_QUICK_RECONCILE'],
        description: 'Type of recommendation to generate',
      },
    },
    required: ['recommendationType'],
    group: 'bank' as const,
    readOnly: true,
    execute: async (ctx, input) => {
      try {
        return await ctx.client.post('/api/v1/search-magic-reconciliation', {
          bankAccountResourceId: input.bankAccountResourceId as string | undefined,
          recommendationType: input.recommendationType as string,
        });
      } catch (e) {
        const status = (e as { status?: number }).status ?? (e as { response?: { status?: number } }).response?.status;
        if (status === 404) return { notSupported: true, reason: 'Endpoint /search-magic-reconciliation not available' };
        throw e;
      }
    },
  },

  // ══════════════════════════════════════════════════════════════
  // ── Universal Search ───────────────────────────────────────
  // ══════════════════════════════════════════════════════════════

  {
    name: 'universal_search',
    description: 'Search across all entity types (contacts, invoices, bills, credit notes, journals, items, capsules) in one call. Returns categorized results. For filtering by tags, dates, amounts, or status, use the specific search tools (search_cashflow_transactions, search_invoices, search_journals, etc.) instead — they support structured filters.',
    params: {
      query: { type: 'string', description: 'Search query' },
      limit: { type: 'number', description: 'Max results per category (default 10)' },
    },
    required: ['query'],
    group: 'search' as const,
    readOnly: true,
    execute: async (ctx, input) => universalSearch(ctx.client, {
      query: input.query as string,
      limit: input.limit as number | undefined,
    }),
  },

  // ══════════════════════════════════════════════════════════════
  // ── Fixed Assets ───────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════

  listTool(
    'list_fixed_assets',
    'List fixed assets. Returns name, reference, type, category, status, purchase amount, net book value.',
    'fixed_assets',
    (client, off, lim) => listFixedAssets(client, { limit: lim, offset: off }),
  ),
  getTool(
    'get_fixed_asset',
    'Get full fixed asset details including depreciation schedule, accounts, disposal info.',
    'fixed_assets',
    (client, id) => getFixedAsset(client, id),
  ),
  {
    name: 'search_fixed_assets',
    description: 'Search fixed assets by name, reference, type, status, or category.',
    params: {
      query: { type: 'string', description: 'Search term (name or reference)' },
      status: { type: 'string', enum: ['ONGOING', 'COMPLETED', 'DISPOSED', 'DRAFT'], description: 'Filter by status' },
      category: { type: 'string', enum: ['TANGIBLE', 'INTANGIBLE'], description: 'Filter by category' },
      tag: { type: 'string', description: 'Filter by tag name' },
      ...SEARCH_PARAMS,
    },
    required: [],
    group: 'fixed_assets' as const,
    readOnly: true,
    execute: async (ctx, input) => {
      const { limit, offset, sortBy, sortOrder } = extractPaginationInput(input);
      const filter: Record<string, unknown> = {};
      if (input.query) filter.name = { contains: input.query };
      if (input.status) filter.status = { eq: input.status };
      if (input.category) filter.category = { eq: input.category };
      if (input.tag) filter.tags = { name: { eq: input.tag } };
      return handlePagination((off, lim) => searchFixedAssets(ctx.client, {
        filter: Object.keys(filter).length > 0 ? filter : undefined,
        limit: lim, offset: off,
        sort: { sortBy: [sortBy ?? 'name'], order: (sortOrder ?? 'DESC') as 'ASC' | 'DESC' },
      }), limit, offset, 20);
    },
  },
  {
    name: 'create_fixed_asset',
    description: `Register a fixed asset linked to an existing purchase transaction (bill or journal).
- saveAsDraft defaults to true. Set to false to activate — requires ALL fields below.
- ACTIVE assets require: purchaseBusinessTransactionType + purchaseBusinessTransactionResourceId
  (links to the bill/journal that recorded the purchase).
- For standalone asset entry (no linked transaction), use transfer_fixed_asset instead.`,
    params: {
      name: { type: 'string', description: 'Asset name' },
      typeName: { type: 'string', description: 'Asset type (e.g., "Buildings", "Vehicles", "Furniture")' },
      category: { type: 'string', enum: ['TANGIBLE', 'INTANGIBLE'], description: 'Asset category' },
      purchaseAmount: { type: 'number', description: 'Purchase cost' },
      purchaseDate: { type: 'string', description: 'Purchase date (YYYY-MM-DD)' },
      purchaseAssetAccountResourceId: { type: 'string', description: 'Asset account resourceId' },
      depreciationStartDate: { type: 'string', description: 'Depreciation start date (YYYY-MM-DD, required for STRAIGHT_LINE)' },
      depreciationMethod: { type: 'string', enum: ['STRAIGHT_LINE', 'NO_DEPRECIATION'], description: 'Depreciation method' },
      effectiveLife: { type: 'number', description: 'Effective life in months' },
      depreciableValueResidualAmount: { type: 'number', description: 'Residual/salvage value' },
      depreciationExpenseAccountResourceId: { type: 'string', description: 'Depreciation expense account resourceId (required for STRAIGHT_LINE)' },
      accumulatedDepreciationAccountResourceId: { type: 'string', description: 'Accumulated depreciation account resourceId (required for STRAIGHT_LINE)' },
      purchaseBusinessTransactionType: { type: 'string', enum: ['PURCHASE', 'JOURNAL_MANUAL'], description: 'Type of purchase transaction this asset is linked to' },
      purchaseBusinessTransactionResourceId: { type: 'string', description: 'ResourceId of the purchase bill or journal' },
      internalNotes: { type: 'string', description: 'Internal notes' },
      saveAsDraft: { type: 'boolean', description: 'Save as draft (default true). False = activate immediately.' },
      customFields: CUSTOM_FIELDS_PARAM,
    },
    required: ['name', 'purchaseAmount', 'purchaseDate', 'purchaseAssetAccountResourceId', 'depreciationStartDate'],
    group: 'fixed_assets' as const,
    readOnly: false,
    execute: async (ctx, input) => createFixedAsset(ctx.client, input as Parameters<typeof createFixedAsset>[1]),
  },
  {
    name: 'update_fixed_asset',
    description: 'Update an existing fixed asset (draft or active). Can update name, depreciation settings, notes.',
    params: {
      resourceId: { type: 'string', description: 'Fixed asset resourceId' },
      name: { type: 'string' },
      internalNotes: { type: 'string' },
      depreciationMethod: { type: 'string' },
      effectiveLife: { type: 'number' },
      customFields: CUSTOM_FIELDS_PARAM,
    },
    required: ['resourceId'],
    group: 'fixed_assets' as const,
    readOnly: false,
    execute: async (ctx, input) => {
      const { resourceId, ...data } = input;
      return updateFixedAsset(ctx.client, resourceId as string, data);
    },
  },
  deleteTool(
    'delete_fixed_asset',
    'Delete a draft fixed asset. Cannot delete active/disposed assets.',
    'fixed_assets',
    (client, id) => deleteFixedAsset(client, id),
  ),
  {
    name: 'discard_fixed_asset',
    description: 'Discard (write off) a fixed asset. Records the disposal and final depreciation.',
    params: {
      resourceId: { type: 'string', description: 'Fixed asset resourceId' },
      disposalDate: { type: 'string', description: 'Disposal date (YYYY-MM-DD)' },
      depreciationEndDate: { type: 'string', description: 'Final depreciation date (YYYY-MM-DD)' },
      assetDisposalGainLossAccountResourceId: { type: 'string', description: 'Gain/loss account resourceId (optional for write-offs)' },
    },
    required: ['resourceId', 'disposalDate', 'depreciationEndDate'],
    group: 'fixed_assets' as const,
    readOnly: false,
    execute: async (ctx, input) => discardFixedAsset(ctx.client, input.resourceId as string, {
      disposalDate: input.disposalDate as string,
      depreciationEndDate: input.depreciationEndDate as string,
      assetDisposalGainLossAccountResourceId: input.assetDisposalGainLossAccountResourceId as string | undefined,
    }),
  },
  {
    name: 'mark_fixed_asset_sold',
    description: 'Mark a fixed asset as sold. Links to the sale transaction and records gain/loss. When the user asks to sell an asset, use this tool directly — retrieve the asset first with list_fixed_assets or search_fixed_assets to get the resourceId.',
    params: {
      resourceId: { type: 'string', description: 'Fixed asset resourceId' },
      depreciationEndDate: { type: 'string', description: 'Final depreciation date (YYYY-MM-DD)' },
      assetDisposalGainLossAccountResourceId: { type: 'string', description: 'Gain/loss account resourceId' },
      saleBusinessTransactionType: { type: 'string', enum: ['SALE', 'PURCHASE', 'JOURNAL_MANUAL'], description: 'Sale transaction type' },
      saleItemResourceId: { type: 'string', description: 'Sale item resourceId' },
    },
    required: ['resourceId', 'depreciationEndDate', 'assetDisposalGainLossAccountResourceId', 'saleBusinessTransactionType', 'saleItemResourceId'],
    group: 'fixed_assets' as const,
    readOnly: false,
    execute: async (ctx, input) => markFixedAssetSold(ctx.client, input as Parameters<typeof markFixedAssetSold>[1]),
  },
  {
    name: 'transfer_fixed_asset',
    description: 'Transfer a fixed asset to a different asset type/account, OR create a standalone asset entry (no linked purchase transaction needed). Creates a new asset registration from an existing one.',
    params: {
      resourceId: { type: 'string', description: 'Source fixed asset resourceId' },
      name: { type: 'string', description: 'New asset name' },
      typeName: { type: 'string', description: 'New asset type' },
      purchaseAssetAccountResourceId: { type: 'string', description: 'New asset account resourceId' },
    },
    required: ['resourceId'],
    group: 'fixed_assets' as const,
    readOnly: false,
    execute: async (ctx, input) => transferFixedAsset(ctx.client, input as Record<string, unknown>),
  },
  {
    name: 'undo_fixed_asset_disposal',
    description: 'Undo a fixed asset disposal (discard or sale). Restores the asset to active status. When the user asks to reverse or undo a disposal, use this tool directly.',
    params: {
      resourceId: { type: 'string', description: 'Fixed asset resourceId' },
    },
    required: ['resourceId'],
    group: 'fixed_assets' as const,
    readOnly: false,
    execute: async (ctx, input) => undoFixedAssetDisposal(ctx.client, input.resourceId as string),
  },

  // ══════════════════════════════════════════════════════════════
  // ── Subscriptions ──────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════

  listTool(
    'list_subscriptions',
    'List recurring subscriptions. Returns status, interval, next schedule date, amount, transaction type.',
    'subscriptions',
    (client, off, lim) => listSubscriptions(client, { limit: lim, offset: off }),
  ),
  getTool(
    'get_subscription',
    'Get full subscription details including line items, schedule, and payment history.',
    'subscriptions',
    (client, id) => getSubscription(client, id),
  ),
  {
    name: 'create_subscription',
    description: `Create a subscription — auto-generates invoices on schedule with proration.
DIFFERENT from scheduled invoices: subscriptions auto-prorate partial periods (credit notes for mid-period changes), but currency/tax/account are immutable after creation.
Use for: software licenses, retainer services, recurring SaaS billing. Invoices only (no bills).
- accountResourceId and taxProfileResourceId apply to ALL line items (same for all — immutable after creation)
- interval: "WEEKLY", "MONTHLY", "QUARTERLY", "YEARLY"
- reference is REQUIRED (API rejects without it)
Dynamic strings for reference/line item name/notes: {{Day}}, {{Date}}, {{Date+X}}, {{DateRange:X}}, {{Month}}, {{Month+X}}, {{MonthRange:X}}, {{Year}}, {{Year+X}} — replaced with values relative to the transaction date (e.g., {{Month}} → "March", {{Date+7}} → "16 Mar 2026").`,
    params: {
      interval: { type: 'string', enum: ['WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY'], description: 'Billing interval' },
      startDate: { type: 'string', description: 'Start date (YYYY-MM-DD)' },
      endDate: { type: 'string', description: 'End date (YYYY-MM-DD, optional for ongoing)' },
      contactResourceId: { type: 'string', description: 'Customer contact resourceId' },
      reference: { type: 'string', description: 'Invoice reference (REQUIRED). Supports dynamic strings: {{Month}}, {{Year}}, etc.' },
      valueDate: { type: 'string', description: 'Invoice date (YYYY-MM-DD)' },
      dueDate: { type: 'string', description: 'Due date (YYYY-MM-DD)' },
      accountResourceId: { type: 'string', description: 'Revenue account resourceId (applied to ALL line items — must be same)' },
      taxProfileResourceId: { type: 'string', description: 'Tax profile resourceId (applied to ALL line items — must be same)' },
      lineItems: {
        type: 'array', items: {
          type: 'object',
          properties: { name: { type: 'string' }, unitPrice: { type: 'number' }, quantity: { type: 'number' } },
          required: ['name', 'unitPrice', 'quantity'],
        },
        description: 'Line items (name, unitPrice, quantity only — account/tax set at top level)',
      },
    },
    required: ['interval', 'startDate', 'contactResourceId', 'lineItems', 'accountResourceId', 'valueDate', 'dueDate', 'reference'],
    group: 'subscriptions' as const,
    readOnly: false,
    execute: async (ctx, input) => {
      const { interval, startDate, endDate, contactResourceId, reference, valueDate, dueDate,
        accountResourceId, taxProfileResourceId, lineItems } = input as Record<string, unknown>;
      // Apply shared account/tax to all line items
      const items = (lineItems as Record<string, unknown>[]).map((li) => ({
        ...li,
        accountResourceId,
        ...(taxProfileResourceId ? { taxProfileResourceId } : {}),
      }));
      // Subscriptions use repeat + invoice wrapper + proratedConfig (required)
      const body: Record<string, unknown> = {
        repeat: interval, startDate, status: 'ACTIVE',
        proratedConfig: { proratedAdjustmentLineText: 'Prorated adjustment' },
        invoice: {
          contactResourceId, reference: reference || `SUB-${Date.now()}`, valueDate, dueDate,
          lineItems: items, saveAsDraft: false,
        },
      };
      if (endDate) body.endDate = endDate;
      return createSubscription(ctx.client, body);
    },
  },
  {
    name: 'update_subscription',
    description: 'Update an existing subscription (interval, end date, or transaction template). When the user asks to update a subscription, use this tool directly. NOTE: accountResourceId and taxProfileResourceId on line items are immutable after creation — to change them, cancel and recreate.',
    params: {
      resourceId: { type: 'string', description: 'Subscription resourceId' },
      interval: { type: 'string', enum: ['WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY'] },
      endDate: { type: 'string', description: 'New end date (YYYY-MM-DD)' },
      data: { type: 'object', description: 'Updated transaction template' },
    },
    required: ['resourceId'],
    group: 'subscriptions' as const,
    readOnly: false,
    execute: async (ctx, input) => {
      const { resourceId, ...data } = input;
      return updateSubscription(ctx.client, resourceId as string, data);
    },
  },
  deleteTool(
    'delete_subscription',
    'Delete a subscription. Removes the recurring schedule.',
    'subscriptions',
    (client, id) => deleteSubscription(client, id),
  ),
  {
    name: 'cancel_subscription',
    description: 'Cancel an active subscription. Prorates remaining period and stops future billing. Safe to call — subscriptions can be reactivated after cancellation. Always use this tool when the user asks to cancel a subscription. Must cancel before delete.',
    params: {
      resourceId: { type: 'string', description: 'Subscription resourceId' },
      cancelDateType: { type: 'string', enum: ['END_OF_CURRENT_PERIOD', 'END_OF_LAST_PERIOD', 'CUSTOM_DATE'], description: 'When to end (default: END_OF_CURRENT_PERIOD)' },
      endDate: { type: 'string', description: 'Custom cancel date YYYY-MM-DD (only with CUSTOM_DATE)' },
      proratedAdjustmentLineText: { type: 'string', description: 'Label for proration line item (default: "Prorated adjustment")' },
    },
    required: ['resourceId'],
    group: 'subscriptions' as const,
    readOnly: false,
    execute: async (ctx, input) => cancelSubscription(ctx.client, input.resourceId as string, {
      cancelDateType: input.cancelDateType as string | undefined,
      endDate: input.endDate as string | undefined,
      proratedAdjustmentLineText: input.proratedAdjustmentLineText as string | undefined,
    }),
  },
  {
    name: 'search_scheduled_transactions',
    description: 'Search all scheduled transactions (subscriptions, scheduled invoices/bills/journals). Filter by type, status, date range.',
    params: {
      businessTransactionType: { type: 'string', enum: ['SALE', 'PURCHASE', 'JOURNAL'], description: 'Filter by transaction type' },
      status: { type: 'string', enum: ['ACTIVE', 'CANCELLED', 'COMPLETED'], description: 'Filter by status' },
      schedulerType: { type: 'string', description: 'Filter by scheduler type (e.g. RECURRING, SUBSCRIPTION)' },
      ...SEARCH_PARAMS,
    },
    required: [],
    group: 'subscriptions' as const,
    readOnly: true,
    execute: async (ctx, input) => {
      const { limit, offset, sortBy, sortOrder } = extractPaginationInput(input);
      const filter: Record<string, unknown> = {};
      if (input.businessTransactionType) filter.businessTransactionType = { eq: input.businessTransactionType };
      if (input.status) filter.status = { eq: input.status };
      if (input.schedulerType) filter.schedulerType = { eq: input.schedulerType };
      return handlePagination((off, lim) => searchScheduledTransactions(ctx.client, {
        filter: Object.keys(filter).length > 0 ? filter : undefined,
        limit: lim, offset: off,
        sort: { sortBy: [sortBy ?? 'startDate'], order: (sortOrder ?? 'DESC') as 'ASC' | 'DESC' },
      }), limit, offset, 20);
    },
  },

  // ══════════════════════════════════════════════════════════════
  // ── Financial Reports (continued) ─────────────────────────
  // ══════════════════════════════════════════════════════════════

  {
    name: 'generate_vat_ledger',
    description: 'Generate VAT/GST ledger report showing all tax transactions for the period.',
    params: {
      startDate: { type: 'string', description: 'Start date (YYYY-MM-DD)' },
      endDate: { type: 'string', description: 'End date (YYYY-MM-DD)' },
    },
    required: ['startDate', 'endDate'],
    group: 'financial_reports' as const,
    readOnly: true,
    execute: async (ctx, input) => generateVatLedger(ctx.client, {
      startDate: input.startDate as string,
      endDate: input.endDate as string,
    }),
  },
  {
    name: 'generate_equity_movement',
    description: 'Generate equity movement report (statement of changes in equity).',
    params: {
      primarySnapshotStartDate: { type: 'string', description: 'Period start date (YYYY-MM-DD)' },
      primarySnapshotEndDate: { type: 'string', description: 'Period end date (YYYY-MM-DD)' },
      currencyCode: { type: 'string', description: 'Currency code (e.g., "SGD")' },
      compareWith: { type: 'string', description: 'Compare with period (e.g., "PREVIOUS_YEAR")' },
      compareCount: { type: 'number', description: 'Number of comparison periods' },
    },
    required: ['primarySnapshotStartDate', 'primarySnapshotEndDate'],
    group: 'financial_reports' as const,
    readOnly: true,
    execute: async (ctx, input) => generateEquityMovement(ctx.client, input as Parameters<typeof generateEquityMovement>[1]),
  },
  {
    name: 'generate_bank_balance_summary',
    description: 'Generate bank balance summary report — snapshot of all bank account balances at a point in time.',
    params: {
      primarySnapshotDate: { type: 'string', description: 'Snapshot date (YYYY-MM-DD)' },
      currencyCode: { type: 'string', description: 'Currency code (e.g., "SGD")' },
    },
    required: ['primarySnapshotDate'],
    group: 'operational_reports' as const,
    readOnly: true,
    execute: async (ctx, input) => generateBankBalanceSummary(ctx.client, {
      primarySnapshotDate: input.primarySnapshotDate as string,
      currencyCode: input.currencyCode as string | undefined,
    }),
  },
  {
    name: 'generate_bank_recon_summary',
    description: 'Generate bank reconciliation summary for a specific bank account. Essential for month-end close — call this for each in-scope bank account for the current entity and reporting period. Use for bank recon status, unreconciled items count, or reconciliation summaries.',
    params: {
      bankAccountResourceId: { type: 'string', description: 'Bank account resourceId' },
      primarySnapshotStartDate: { type: 'string', description: 'Period start date (YYYY-MM-DD)' },
      primarySnapshotEndDate: { type: 'string', description: 'Period end date (YYYY-MM-DD)' },
      currencyCode: { type: 'string', description: 'Currency code' },
      tags: { type: 'array', items: { type: 'string' }, description: 'Filter by tags' },
    },
    required: ['bankAccountResourceId', 'primarySnapshotStartDate', 'primarySnapshotEndDate'],
    group: 'operational_reports' as const,
    readOnly: true,
    execute: async (ctx, input) => generateBankReconSummary(ctx.client, input as Parameters<typeof generateBankReconSummary>[1]),
  },
  {
    name: 'generate_bank_recon_details',
    description: 'Generate detailed bank reconciliation report showing matched/unmatched items.',
    params: {
      bankAccountResourceId: { type: 'string', description: 'Bank account resourceId' },
      primarySnapshotStartDate: { type: 'string', description: 'Period start date (YYYY-MM-DD)' },
      primarySnapshotEndDate: { type: 'string', description: 'Period end date (YYYY-MM-DD)' },
      filter: { type: 'object', description: 'Filter criteria (e.g., { status: "UNMATCHED" })' },
      currencyCode: { type: 'string', description: 'Currency code' },
    },
    required: ['bankAccountResourceId', 'primarySnapshotStartDate', 'primarySnapshotEndDate', 'filter'],
    group: 'operational_reports' as const,
    readOnly: true,
    execute: async (ctx, input) => generateBankReconDetails(ctx.client, input as Parameters<typeof generateBankReconDetails>[1]),
  },
  {
    name: 'generate_fa_summary',
    description: 'Generate fixed assets summary report grouped by account, type, category, or status.',
    params: {
      primarySnapshotStartDate: { type: 'string', description: 'Period start date (YYYY-MM-DD)' },
      primarySnapshotEndDate: { type: 'string', description: 'Period end date (YYYY-MM-DD)' },
      groupBy: { type: 'string', enum: ['ACCOUNT', 'TYPE', 'CATEGORY', 'STATUS'], description: 'Grouping dimension' },
      currencyCode: { type: 'string', description: 'Currency code' },
    },
    required: ['primarySnapshotStartDate', 'primarySnapshotEndDate', 'groupBy'],
    group: 'operational_reports' as const,
    readOnly: true,
    execute: async (ctx, input) => generateFaSummary(ctx.client, input as Parameters<typeof generateFaSummary>[1]),
  },
  {
    name: 'generate_fa_recon_summary',
    description: 'Generate fixed assets reconciliation summary — reconciles asset register with general ledger.',
    params: {
      primarySnapshotStartDate: { type: 'string', description: 'Period start date (YYYY-MM-DD)' },
      primarySnapshotEndDate: { type: 'string', description: 'Period end date (YYYY-MM-DD)' },
      accountResourceIds: { type: 'array', items: { type: 'string' }, description: 'Filter by specific asset account IDs' },
      currencyCode: { type: 'string', description: 'Currency code' },
    },
    required: ['primarySnapshotStartDate', 'primarySnapshotEndDate'],
    group: 'operational_reports' as const,
    readOnly: true,
    execute: async (ctx, input) => generateFaReconSummary(ctx.client, input as Parameters<typeof generateFaReconSummary>[1]),
  },
  {
    name: 'generate_ar_report',
    description: 'Generate accounts receivable aging report. Shows outstanding invoices grouped by aging buckets. Use this when discussing customer payment allocation, credit control, or AR status — generate the report to show the full picture.',
    params: {
      endDate: { type: 'string', description: 'Report date (YYYY-MM-DD) — point-in-time snapshot' },
    },
    required: ['endDate'],
    group: 'operational_reports' as const,
    readOnly: true,
    execute: async (ctx, input) => generateArReport(ctx.client, { endDate: input.endDate as string }),
  },
  {
    name: 'get_ledger_highlights',
    description: 'Get ledger highlights — summary metadata about the org general ledger: transaction counts by type, date range, active accounts, active currencies, and cross-currency detection. No parameters needed.',
    params: {},
    required: [],
    group: 'operational_reports' as const,
    readOnly: true,
    execute: async (ctx) => getLedgerHighlights(ctx.client),
  },
  // ══════════════════════════════════════════════════════════════
  // ── Contact Groups ─────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════

  listTool(
    'list_contact_groups',
    'List contact groups with their associated contacts. Used to segment customers/suppliers.',
    'contact_groups',
    (client, off, lim) => listContactGroups(client, { limit: lim, offset: off }),
  ),
  getTool(
    'get_contact_group',
    'Get contact group details including all associated contacts.',
    'contact_groups',
    (client, id) => getContactGroup(client, id),
  ),
  {
    name: 'search_contact_groups',
    description: 'Search contact groups by name.',
    params: {
      query: { type: 'string', description: 'Search term (group name)' },
      ...SEARCH_PARAMS,
    },
    required: ['query'],
    group: 'contact_groups' as const,
    readOnly: true,
    execute: async (ctx, input) => {
      const { limit, offset, sortBy, sortOrder } = extractPaginationInput(input);
      const query = input.query as string;
      return handlePagination((off, lim) => searchContactGroups(ctx.client, {
        filter: { name: { contains: query } },
        limit: lim, offset: off,
        sort: { sortBy: [sortBy ?? 'name'], order: (sortOrder ?? 'ASC') as 'ASC' | 'DESC' },
      }), limit, offset, 20);
    },
  },
  {
    name: 'create_contact_group',
    description: 'Create a new contact group for segmenting contacts (e.g., "VIP Customers", "Government", "Overdue > 90 Days").',
    params: {
      name: { type: 'string', description: 'Group name' },
      contactResourceIds: { type: 'array', items: { type: 'string' }, description: 'Contact IDs to add to the group' },
    },
    required: ['name'],
    group: 'contact_groups' as const,
    readOnly: false,
    execute: async (ctx, input) => createContactGroup(ctx.client, {
      name: input.name as string,
      contactResourceIds: input.contactResourceIds as string[] | undefined,
    }),
  },
  {
    name: 'update_contact_group',
    description: 'Update a contact group name or members. NOTE: Update endpoint has a known 500 bug on some orgs — retry or recreate if it fails.',
    params: {
      resourceId: { type: 'string', description: 'Contact group resourceId' },
      name: { type: 'string', description: 'New group name' },
      contactResourceIds: { type: 'array', items: { type: 'string' }, description: 'Contact IDs to set as group members (replaces existing)' },
    },
    required: ['resourceId'],
    group: 'contact_groups' as const,
    readOnly: false,
    execute: async (ctx, input) => updateContactGroup(ctx.client, input.resourceId as string, {
      name: input.name as string | undefined,
      contactResourceIds: input.contactResourceIds as string[] | undefined,
    }),
  },
  deleteTool(
    'delete_contact_group',
    'Delete a contact group. Does not delete the contacts themselves.',
    'contact_groups',
    (client, id) => deleteContactGroup(client, id),
  ),

  // ══════════════════════════════════════════════════════════════
  // ── Custom Fields ──────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════

  listTool(
    'list_custom_fields',
    'List custom fields defined for the organization. Custom fields add extra data to invoices, bills, credit notes, and payments.',
    'custom_fields',
    (client, off, lim) => listCustomFields(client, { limit: lim, offset: off }),
  ),
  {
    name: 'get_custom_field',
    description: 'Get a custom field by resourceId. Returns full definition including appliesTo flags and list options.',
    params: {
      resourceId: { type: 'string', description: 'Custom field resourceId' },
    },
    required: ['resourceId'],
    group: 'custom_fields' as const,
    readOnly: true,
    execute: async (ctx, input) => getCustomField(ctx.client, input.resourceId as string),
  },
  {
    name: 'search_custom_fields',
    description: 'Search custom fields with filters. Filter by customFieldName (contains) or datatypeCode (eq).',
    params: {
      ...SEARCH_PARAMS,
      customFieldName: { type: 'string', description: 'Filter by field name (contains match)' },
      datatypeCode: { type: 'string', description: 'Filter by type: TEXT, NUMBER, DATE, DROPDOWN' },
    },
    required: [],
    group: 'custom_fields' as const,
    readOnly: true,
    execute: async (ctx, input) => {
      const { limit, offset, sortBy, sortOrder } = extractPaginationInput(input);
      const filter: Record<string, unknown> = {};
      if (input.customFieldName) filter.customFieldName = { contains: input.customFieldName };
      if (input.datatypeCode) filter.datatypeCode = { eq: input.datatypeCode };
      const searchFilter = Object.keys(filter).length > 0 ? filter : undefined;
      return handlePagination((off, lim) => searchCustomFields(ctx.client, {
        filter: searchFilter,
        limit: lim,
        offset: off,
        sort: { sortBy: [sortBy ?? 'customFieldName'], order: (sortOrder ?? 'ASC') as 'ASC' | 'DESC' },
      }), limit, offset, 20);
    },
  },
  {
    name: 'create_custom_field',
    description: `Create a new custom field. Custom fields appear on transactions (invoices, bills, credit notes, payments).
- Use appliesTo to control which transaction types show this field.
- printOnDocuments controls whether the field appears on PDFs.`,
    params: {
      name: { type: 'string', description: 'Field name (e.g., "PO Number", "Cost Center")' },
      description: { type: 'string', description: 'Field description' },
      printOnDocuments: { type: 'boolean', description: 'Show on PDF documents (default false)' },
      appliesTo: {
        type: 'object',
        description: 'Which transaction types: { invoices: true, bills: true, customerCredits: true, supplierCredits: true, payments: true }',
      },
      fieldType: { type: 'string', description: 'Field type (e.g., "TEXT", "NUMBER", "DATE") — legacy param' },
      entityType: { type: 'string', description: 'Entity type — legacy param' },
    },
    required: ['name'],
    group: 'custom_fields' as const,
    readOnly: false,
    execute: async (ctx, input) => createCustomField(ctx.client, input as Parameters<typeof createCustomField>[1]),
  },
  {
    name: 'update_custom_field',
    description: 'Update a custom field definition. Can change name, description, printOnDocuments, and appliesTo flags.',
    params: {
      resourceId: { type: 'string', description: 'Custom field resourceId' },
      name: { type: 'string', description: 'New field name' },
      description: { type: 'string', description: 'New description' },
      printOnDocuments: { type: 'boolean', description: 'Show on PDF documents' },
      appliesTo: {
        type: 'object',
        description: 'Which transaction types: { invoices, bills, customerCredits, supplierCredits, payments }',
      },
    },
    required: ['resourceId'],
    group: 'custom_fields' as const,
    readOnly: false,
    execute: async (ctx, input) => {
      const { resourceId: rid, ...data } = input;
      return updateCustomField(ctx.client, rid as string, data as Parameters<typeof updateCustomField>[2]);
    },
  },
  deleteTool(
    'delete_custom_field',
    'Delete a custom field. Removes it from all future transactions.',
    'custom_fields',
    (client, id) => deleteCustomField(client, id),
  ),

  // ══════════════════════════════════════════════════════════════
  // ── Tax Compliance (new tools) ─────────────────────────────
  // ══════════════════════════════════════════════════════════════

  {
    name: 'list_withholding_tax_codes',
    description: 'List withholding tax codes (industry classification codes for PH/SG compliance). Returns full list (no pagination).',
    params: {},
    required: [] as string[],
    group: 'tax_profiles' as const,
    readOnly: true,
    execute: async (ctx) => listWithholdingTaxCodes(ctx.client),
  },
  {
    name: 'search_tax_profiles',
    description: 'Search tax profiles by name or tax type code. Use appliesTo to filter by transaction type (e.g. "purchase" for bills, "sale" for invoices). IMPORTANT: When selecting a tax profile for a transaction, always filter by the correct appliesTo to avoid 422 errors.',
    params: {
      query: { type: 'string', description: 'Search term (profile name or tax type code)' },
      appliesTo: { type: 'string', enum: ['sale', 'purchase', 'sale_credit_note', 'purchase_credit_note'], description: 'Filter to profiles that apply to this transaction type (e.g. "purchase" for bills, "sale" for invoices)' },
      ...SEARCH_PARAMS,
      sortBy: { type: 'string', enum: ['name', 'taxTypeCode', 'status', 'vatValue'], description: 'Sort field for tax profiles' },
    },
    required: ['query'],
    group: 'tax_profiles' as const,
    readOnly: true,
    execute: async (ctx, input) => {
      const { limit, offset, sortBy, sortOrder } = extractPaginationInput(input);
      const query = input.query as string;
      const filter: Record<string, unknown> = { or: { name: { contains: query }, taxTypeCode: { contains: query } } };
      // Scope to transaction type — prevents picking a sales-only profile for a bill (or vice versa)
      if (input.appliesTo === 'sale') filter.appliesToSale = { eq: true };
      if (input.appliesTo === 'purchase') filter.appliesToPurchase = { eq: true };
      if (input.appliesTo === 'sale_credit_note') filter.appliesToSaleCreditNote = { eq: true };
      if (input.appliesTo === 'purchase_credit_note') filter.appliesToPurchaseCreditNote = { eq: true };
      return handlePagination((off, lim) => searchTaxProfiles(ctx.client, {
        filter, limit: lim, offset: off,
        sort: { sortBy: [sortBy ?? 'name'], order: (sortOrder ?? 'ASC') as 'ASC' | 'DESC' },
      }), limit, offset, 20);
    },
  },
  getTool(
    'get_tax_profile',
    'Get full tax profile details including tax rate, type code, and status.',
    'tax_profiles',
    (client, id) => getTaxProfile(client, id),
  ),
  {
    name: 'update_tax_profile',
    description: 'Update an existing tax profile (name, rate, or status).',
    params: {
      resourceId: { type: 'string', description: 'Tax profile resourceId' },
      name: { type: 'string' },
      taxRate: { type: 'number' },
      status: { type: 'string', enum: ['ACTIVE', 'INACTIVE'] },
    },
    required: ['resourceId'],
    group: 'tax_profiles' as const,
    readOnly: false,
    execute: async (ctx, input) => updateTaxProfile(ctx.client, input.resourceId as string, {
      name: input.name as string | undefined,
      taxRate: input.taxRate as number | undefined,
      status: input.status as string | undefined,
    }),
  },

  // ══════════════════════════════════════════════════════════════
  // ── Inventory ──────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════

  listTool(
    'list_inventory_items',
    'List inventory-tracked items with stock details, COGS accounts, and purchase/sale accounts.',
    'inventory',
    (client, off, lim) => listInventoryItems(client, { limit: lim, offset: off }),
  ),
  {
    name: 'get_inventory_balance',
    description: 'Get current inventory balance for a specific item — quantity on hand, average cost, base unit.',
    params: {
      itemResourceId: { type: 'string', description: 'Item resourceId' },
    },
    required: ['itemResourceId'],
    group: 'inventory' as const,
    readOnly: true,
    execute: async (ctx, input) => getInventoryBalance(ctx.client, input.itemResourceId as string),
  },
  {
    name: 'create_inventory_item',
    description: 'Create a new inventory-tracked item. Requires itemCode, name, costingMethod (FIXED or WAC), cogsResourceId, and account links. Use --input for full JSON body.',
    params: {
      itemCode: { type: 'string', description: 'Unique item code (SKU)' },
      name: { type: 'string', description: 'Item name' },
      unit: { type: 'string', description: 'Unit of measure (e.g., "pcs", "kg")' },
      costingMethod: { type: 'string', description: 'Costing method: FIXED or WAC' },
      cogsResourceId: { type: 'string', description: 'COGS account resourceId (required)' },
      purchaseAccountResourceId: { type: 'string', description: 'Purchase account resourceId (required if cogsResourceId set)' },
      saleAccountResourceId: { type: 'string', description: 'Sale account resourceId (required if cogsResourceId set)' },
      appliesToSale: { type: 'boolean', description: 'Whether item applies to sales (required if cogsResourceId set)' },
      appliesToPurchase: { type: 'boolean', description: 'Whether item applies to purchases (required if cogsResourceId set)' },
      blockInsufficientDeductions: { type: 'boolean', description: 'Block transactions when insufficient stock (default: false)' },
    },
    required: ['itemCode', 'name', 'costingMethod', 'cogsResourceId'],
    group: 'inventory' as const,
    readOnly: false,
    execute: async (ctx, input) => {
      const data: Record<string, unknown> = {
        itemCode: input.itemCode,
        name: input.name,
        costingMethod: input.costingMethod,
        cogsResourceId: input.cogsResourceId,
        blockInsufficientDeductions: input.blockInsufficientDeductions ?? false,
      };
      if (input.unit) data.unit = input.unit;
      if (input.purchaseAccountResourceId) data.purchaseAccountResourceId = input.purchaseAccountResourceId;
      if (input.saleAccountResourceId) data.saleAccountResourceId = input.saleAccountResourceId;
      if (input.appliesToSale !== undefined) data.appliesToSale = input.appliesToSale;
      if (input.appliesToPurchase !== undefined) data.appliesToPurchase = input.appliesToPurchase;
      return createInventoryItem(ctx.client, data);
    },
  },

  // ══════════════════════════════════════════════════════════════
  // ── CRUD Gaps (missing from existing tools) ────────────────
  // ══════════════════════════════════════════════════════════════

  deleteTool(
    'delete_contact',
    'Delete a contact. Cannot delete contacts with existing transactions.',
    'contacts',
    (client, id) => deleteContact(client, id),
  ),
  deleteTool(
    'delete_account',
    'Delete a chart of accounts entry. Cannot delete accounts with existing transactions.',
    'accounts',
    (client, id) => deleteAccount(client, id),
  ),
  getTool(
    'get_cash_transfer',
    'Get full cash transfer details by resourceId.',
    'cash_transfers',
    (client, id) => getCashTransfer(client, id),
  ),
  {
    name: 'download_credit_note_pdf',
    description: 'Download a customer credit note as PDF. Returns a file URL.',
    params: {
      resourceId: { type: 'string', description: 'Customer credit note resourceId' },
    },
    required: ['resourceId'],
    group: 'customer_credit_notes' as const,
    readOnly: true,
    execute: async (ctx, input) => downloadCustomerCreditNotePdf(ctx.client, input.resourceId as string),
  },

  // ══════════════════════════════════════════════════════════════
  // ── Compound Tools (multi-step, high-value operations) ─────
  // ══════════════════════════════════════════════════════════════

  {
    name: 'get_transaction_summary',
    description: `Get a complete summary of any transaction — fetches the transaction, its attachments, and payment history in one call.
Works for invoices, bills, customer credit notes, supplier credit notes, and journals.`,
    params: {
      transactionType: {
        type: 'string',
        enum: ['invoice', 'bill', 'customer_credit_note', 'supplier_credit_note', 'journal'],
        description: 'Transaction type',
      },
      resourceId: { type: 'string', description: 'Transaction resourceId' },
    },
    required: ['transactionType', 'resourceId'],
    group: 'search' as const,
    readOnly: true,
    execute: async (ctx, input) => {
      const type = input.transactionType as string;
      const id = input.resourceId as string;

      // Fetch transaction
      const txnPromise = type === 'invoice' ? getInvoice(ctx.client, id)
        : type === 'bill' ? getBill(ctx.client, id)
        : type === 'customer_credit_note' ? getCustomerCreditNote(ctx.client, id)
        : type === 'supplier_credit_note' ? getSupplierCreditNote(ctx.client, id)
        : getJournal(ctx.client, id);

      // Map to attachment type
      const attachType = type === 'invoice' ? 'invoices' as const
        : type === 'bill' ? 'bills' as const
        : type === 'customer_credit_note' ? 'customer-credit-notes' as const
        : type === 'supplier_credit_note' ? 'supplier-credit-notes' as const
        : 'journals' as const;

      // Fetch all in parallel
      const [txn, attachments] = await Promise.all([
        txnPromise,
        listAttachments(ctx.client, attachType, id),
      ]);

      // Fetch payments for invoices/bills (they have payment records)
      let payments;
      if (type === 'invoice' || type === 'bill') {
        try {
          payments = await searchPayments(ctx.client, {
            filter: { businessTransactionResourceId: { eq: id } },
            limit: 100,
          });
        } catch { /* no payments */ }
      }

      const atts = attachments.data ?? [];
      return {
        transaction: txn.data,
        attachments: atts,
        attachmentCount: atts.length,
        ...(payments ? { payments: payments.data, paymentCount: payments.totalElements } : {}),
      };
    },
  },
  {
    name: 'bulk_finalize_drafts',
    description: `Finalize multiple draft transactions in one call. Attempts finalization for each item and returns per-item pass/fail results. Supports invoices, bills, and credit notes.`,
    params: {
      items: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            type: { type: 'string', enum: ['invoice', 'bill', 'customer_credit_note', 'supplier_credit_note'], description: 'Transaction type' },
            resourceId: { type: 'string', description: 'Transaction resourceId' },
          },
          required: ['type', 'resourceId'],
        },
        description: 'Array of {type, resourceId} to finalize',
      },
    },
    required: ['items'],
    group: 'drafts' as const,
    readOnly: false,
    execute: async (ctx, input) => {
      const items = input.items as Array<{ type: string; resourceId: string }>;
      const results: Array<{ type: string; resourceId: string; success: boolean; error?: string }> = [];

      for (const item of items) {
        try {
          const merged = await fetchAndMerge(ctx.client, item.type as FinalizableType, item.resourceId, {});
          if (item.type === 'invoice') {
            await finalizeInvoice(ctx.client, item.resourceId, merged as Parameters<typeof finalizeInvoice>[2]);
          } else if (item.type === 'bill') {
            await finalizeBill(ctx.client, item.resourceId, merged as Parameters<typeof finalizeBill>[2]);
          } else if (item.type === 'customer_credit_note') {
            await finalizeCustomerCreditNote(ctx.client, item.resourceId, merged as Parameters<typeof finalizeCustomerCreditNote>[2]);
          } else if (item.type === 'supplier_credit_note') {
            await finalizeSupplierCreditNote(ctx.client, item.resourceId, merged as Parameters<typeof finalizeSupplierCreditNote>[2]);
          }
          results.push({ ...item, success: true });
        } catch (e) {
          results.push({ ...item, success: false, error: e instanceof Error ? e.message : String(e) });
        }
      }

      return {
        total: items.length,
        succeeded: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        results,
      };
    },
  },
  {
    name: 'bulk_invite_org_users',
    description: `Invite multiple users to the organization in one call. Accepts an array of user objects.
Each user needs: email, firstName, lastName, moduleRoles. Returns per-user pass/fail results.`,
    params: {
      users: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            email: { type: 'string', description: 'User email' },
            firstName: { type: 'string', description: 'First name' },
            lastName: { type: 'string', description: 'Last name' },
            moduleRoles: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  moduleName: { type: 'string' },
                  roleCode: { type: 'string' },
                },
              },
              description: 'Module roles to assign',
            },
          },
          required: ['email', 'firstName', 'lastName'],
        },
        description: 'Array of users to invite',
      },
    },
    required: ['users'],
    group: 'org_users' as const,
    readOnly: false,
    execute: async (ctx, input) => {
      const users = input.users as Array<{
        email: string; firstName: string; lastName: string;
        moduleRoles?: Array<{ moduleName: string; roleCode: string }>;
      }>;
      const results: Array<{ email: string; success: boolean; resourceId?: string; error?: string }> = [];

      for (const user of users) {
        try {
          const res = await inviteOrgUser(ctx.client, {
            ...user,
            moduleRoles: (user.moduleRoles ?? []) as Parameters<typeof inviteOrgUser>[1]['moduleRoles'],
          });
          results.push({ email: user.email, success: true, resourceId: (res as { data?: { resourceId?: string } }).data?.resourceId });
        } catch (e) {
          results.push({ email: user.email, success: false, error: e instanceof Error ? e.message : String(e) });
        }
      }

      return {
        total: users.length,
        succeeded: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        results,
      };
    },
  },
  {
    name: 'bulk_create_contacts',
    description: `Create multiple contacts in one call. Deduplicates against existing contacts (exact name match).
Returns per-contact result: created, skipped (duplicate), or failed.`,
    params: {
      contacts: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            billingName: { type: 'string', description: 'Official billing name' },
            name: { type: 'string', description: 'Display name' },
            email: { type: 'string', description: 'Primary email' },
            customer: { type: 'boolean', description: 'Is a customer' },
            supplier: { type: 'boolean', description: 'Is a supplier' },
          },
          required: ['billingName'],
        },
        description: 'Array of contacts to create',
      },
      skipDuplicates: { type: 'boolean', description: 'Skip contacts that match existing names (default true)' },
    },
    required: ['contacts'],
    group: 'contacts' as const,
    readOnly: false,
    execute: async (ctx, input) => {
      const contacts = input.contacts as Array<{
        billingName: string; name?: string; email?: string;
        customer?: boolean; supplier?: boolean;
      }>;
      const skipDupes = (input.skipDuplicates as boolean) ?? true;
      const results: Array<{ billingName: string; status: 'created' | 'skipped' | 'failed'; resourceId?: string; error?: string }> = [];

      for (const contact of contacts) {
        try {
          // Check for duplicates if enabled
          if (skipDupes) {
            const dup = await findExistingContact(ctx.client, contact.name ?? contact.billingName);
            if (dup) {
              results.push({ billingName: contact.billingName, status: 'skipped', resourceId: dup.resourceId });
              continue;
            }
          }

          const res = await createContact(ctx.client, {
            billingName: contact.billingName,
            name: contact.name ?? contact.billingName,
            emails: contact.email ? [contact.email] : undefined,
            customer: contact.customer ?? true,
            supplier: contact.supplier ?? false,
          });
          results.push({ billingName: contact.billingName, status: 'created', resourceId: res.data.resourceId });
        } catch (e) {
          results.push({ billingName: contact.billingName, status: 'failed', error: e instanceof Error ? e.message : String(e) });
        }
      }

      return {
        total: contacts.length,
        created: results.filter(r => r.status === 'created').length,
        skipped: results.filter(r => r.status === 'skipped').length,
        failed: results.filter(r => r.status === 'failed').length,
        results,
      };
    },
  },

  // ══════════════════════════════════════════════════════════════
  // ── Quick Fix (Bulk Update) ─────────────────────────────────
  // ══════════════════════════════════════════════════════════════

  {
    name: 'quick_fix_transactions',
    description: `Bulk-update multiple transactions of the same type in one call. Pass resourceIds + attributes — only included fields are changed, omitted fields are left unchanged.
Per-entity attributes:
- Invoices: valueDate, dueDate, invoiceNotes, templateResourceId, contactResourceId, billFrom, billTo, currencySettings, taxCurrencySettings, tags, customFields, capsuleResourceId
- Bills: valueDate, dueDate, contactResourceId, currencySettings, taxCurrencySettings, tags, customFields, capsuleResourceId
- Customer CNs: valueDate, notes, templateResourceId, contactResourceId, creditFrom, creditTo, currencySettings, taxCurrencySettings, tags, customFields, capsuleResourceId
- Supplier CNs: valueDate, contactResourceId, currencySettings, taxCurrencySettings, tags, customFields, capsuleResourceId
- Journals: valueDate, contactResourceId, tags, internalNotes, capsuleResourceId
- Cash entries: organizationAccountResourceId, valueDate, contactResourceId, capsuleResourceId, tags, reference, currencySetting (SINGULAR — { rateFunctionalToSource, exchangeToken }), taxCurrencySettings
- Sale/subscription schedules: endDate, interval, invoiceNotes, templateResourceId, contactResourceId, billFrom, billTo, tags, customFields, capsuleResourceId (+ currencySettings/taxCurrencySettings for sale only)
- Purchase schedules: endDate, interval, contactResourceId, currencySettings, taxCurrencySettings, tags, customFields, capsuleResourceId
- Journal schedules: startDate, endDate, interval, contactResourceId, tags, internalNotes, capsuleResourceId
Tags: string array (max 50 items, max 50 chars each), e.g. ["Q1"].
Response: { updated: string[], failed: [{ resourceId, error, errorCode }] }. On partial failure (HTTP 207), both arrays may be populated — always check failed.length. On 207, only retry failed resourceIds.`,
    params: {
      entity: { type: 'string', enum: [...QUICK_FIX_ENTITIES], description: 'Transaction type to update' },
      resourceIds: { type: 'array', items: { type: 'string' }, description: 'Array of transaction resourceIds to update' },
      attributes: { type: 'object', description: 'REQUIRED object with fields to update. Only included fields are changed, omitted fields left unchanged. Example: { "valueDate": "2026-03-15", "tags": ["Q1"] }. See tool description for per-entity attribute list.' },
    },
    required: ['entity', 'resourceIds'],
    group: 'quick_fix' as const,
    readOnly: false,
    execute: async (ctx, input) => {
      // Agents sometimes pass attribute fields at top level instead of nesting in `attributes`.
      // Auto-sweep unrecognized keys into attributes for resilience.
      const KNOWN_KEYS = new Set(['entity', 'resourceIds', 'attributes']);
      let attrs = (input.attributes as Record<string, unknown>) ?? {};
      for (const [k, v] of Object.entries(input)) {
        if (!KNOWN_KEYS.has(k)) attrs = { ...attrs, [k]: v };
      }
      return quickFix(ctx.client, input.entity as QuickFixEntity, {
        resourceIds: input.resourceIds as string[],
        attributes: attrs,
      });
    },
  },

  {
    name: 'quick_fix_line_items',
    description: `Bulk-update line items across multiple transactions. Only included fields are changed, omitted fields left unchanged.
Request patterns by entity type:
- ARAP + accounting (invoices, bills, CNs, journals, cash-entries): pass lineItemResourceIds + attributes.
- Schedulers (sale/purchase/subscription-schedules): pass schedulerUpdates with arrayIndex per line item (Pattern C).
- Journal schedules: pass schedulerUpdates with lineItemResourceId (UUID) per line item — NOT arrayIndex (Pattern D).
Line item attributes by type:
- Sale (invoices + customer CNs): name, quantity, unit, unitPrice, discount, itemResourceId, organizationAccountResourceId, taxProfileResourceId, classifierConfig
- Purchase (bills + supplier CNs): same as sale + withholdingTax
- Scheduler (sale/purchase/subscription, Pattern C): name, description, sku, unit, unitPrice, quantity, discount, taxProfileResourceId, organizationAccountResourceId, classifierConfig, itemResourceId, withholdingTax (purchase only). Uses arrayIndex (zero-based).
- Journal/cash-entry: organizationAccountResourceId, amount, description, taxProfileResourceId, classifierConfig
- Journal-schedule (Pattern D): amount, description, organizationAccountResourceId, taxProfileResourceId, classifierConfig, itemResourceId, unit, quantity, pricePerUnit. Uses lineItemResourceId (UUID).
Response: { updated: string[], failed: [{ resourceId, error, errorCode }] }. On partial failure (HTTP 207), check failed.length.`,
    params: {
      entity: { type: 'string', enum: [...QUICK_FIX_ENTITIES], description: 'Transaction type' },
      lineItemResourceIds: { type: 'array', items: { type: 'string' }, description: 'Line item resourceIds to update (ARAP + accounting entities)' },
      attributes: { type: 'object', description: 'Fields to update on all specified line items' },
      schedulerUpdates: { type: 'array', items: { type: 'object' }, description: 'Per-scheduler updates: [{ schedulerResourceId, lineItemUpdates: [{ arrayIndex, ...fields }] }]. EXCEPTION: journal-schedules use lineItemResourceId (UUID) instead of arrayIndex.' },
    },
    required: ['entity'],
    group: 'quick_fix' as const,
    readOnly: false,
    execute: async (ctx, input) => {
      const entity = input.entity as QuickFixEntity;
      const isScheduler = (['sale-schedules', 'purchase-schedules', 'subscription-schedules', 'journal-schedules'] as string[]).includes(entity);
      const body: Record<string, unknown> = {};
      if (isScheduler) {
        if (!input.schedulerUpdates) throw new Error('schedulerUpdates is required for scheduler entities (sale-schedules, purchase-schedules, subscription-schedules, journal-schedules)');
        body.schedulerUpdates = input.schedulerUpdates;
      } else {
        if (!input.lineItemResourceIds) throw new Error('lineItemResourceIds is required for non-scheduler entities');
        body.lineItemResourceIds = input.lineItemResourceIds;
        body.attributes = input.attributes ?? {};
      }
      return quickFixLineItems(ctx.client, entity, body);
    },
  },

  // ── Nano Classifiers (Tracking Categories) ─────────────────────

  listTool(
    'list_nano_classifiers',
    'List nano classifiers (tracking categories). Paginated. Nano classifiers tag line items with structured categories.',
    'nano_classifiers',
    (client, off, lim) => listNanoClassifiers(client, { limit: lim, offset: off }),
  ),
  getTool(
    'get_nano_classifier',
    'Get a nano classifier by resourceId. Returns type and all classes.',
    'nano_classifiers',
    (client, id) => getNanoClassifier(client, id),
  ),
  {
    name: 'search_nano_classifiers',
    description: 'Search nano classifiers by type name. Returns up to 100 by default.',
    params: {
      query: { type: 'string', description: 'Search term (classifier type)' },
      ...SEARCH_PARAMS,
    },
    required: ['query'],
    group: 'nano_classifiers' as const,
    readOnly: true,
    execute: async (ctx, input) => {
      const { limit, offset } = extractPaginationInput(input);
      const query = input.query as string;
      return handlePagination((off, lim) => searchNanoClassifiers(ctx.client, {
        filter: { type: { contains: query } },
        limit: lim, offset: off,
        sort: { sortBy: ['type'], order: 'ASC' },
      }), limit, offset, 20);
    },
  },
  {
    name: 'create_nano_classifier',
    description: 'Create a nano classifier (tracking category). Provide a type name and list of class names. printable defaults to true (NOTE: printable: false is currently rejected by a server bug — always use true).',
    params: {
      type: { type: 'string', description: 'Classifier type name (e.g., "Department", "Project")' },
      classes: {
        type: 'array',
        items: { type: 'string' },
        description: 'Class names: ["Sales", "Marketing", "Engineering"]',
      },
      printable: { type: 'boolean', description: 'Show on printed documents (default: true). NOTE: false is rejected by a server bug.' },
    },
    required: ['type', 'classes'],
    group: 'nano_classifiers' as const,
    readOnly: false,
    execute: async (ctx, input) => {
      return createNanoClassifier(ctx.client, {
        type: input.type as string,
        classes: input.classes as string[],
        printable: (input.printable as boolean) ?? true,
      });
    },
  },
  {
    name: 'update_nano_classifier',
    description: 'Update a nano classifier — change type name, modify classes, or toggle printable.',
    params: {
      resourceId: { type: 'string', description: 'Nano classifier resourceId' },
      type: { type: 'string', description: 'New type name' },
      classes: {
        type: 'array',
        items: { type: 'string' },
        description: 'Updated class names: ["Sales", "Marketing"]',
      },
      printable: { type: 'boolean', description: 'Show on printed documents' },
    },
    required: ['resourceId'],
    group: 'nano_classifiers' as const,
    readOnly: false,
    execute: async (ctx, input) => {
      const data: Record<string, unknown> = {};
      if (input.type) data.type = input.type;
      if (input.classes) data.classes = input.classes;
      if (input.printable !== undefined) data.printable = input.printable;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return updateNanoClassifier(ctx.client, input.resourceId as string, data as any);
    },
  },
  deleteTool(
    'delete_nano_classifier',
    'Delete a nano classifier.',
    'nano_classifiers',
    (client, id) => deleteNanoClassifier(client, id),
  ),

  // ── Invoice/Bill Payment & Credit Sub-resources ────────────────

  {
    name: 'list_invoice_payments',
    description: 'List all payments recorded against an invoice. Returns payment records with amounts, dates, and methods.',
    params: {
      resourceId: { type: 'string', description: 'Invoice resourceId' },
    },
    required: ['resourceId'],
    group: 'payments' as const,
    readOnly: true,
    execute: async (ctx, input) => listInvoicePayments(ctx.client, input.resourceId as string),
  },
  {
    name: 'list_invoice_credits',
    description: 'List all credit notes applied to an invoice.',
    params: {
      resourceId: { type: 'string', description: 'Invoice resourceId' },
    },
    required: ['resourceId'],
    group: 'payments' as const,
    readOnly: true,
    execute: async (ctx, input) => listInvoiceCredits(ctx.client, input.resourceId as string),
  },
  {
    name: 'reverse_invoice_credit',
    description: 'Reverse (unapply) a credit note from an invoice. The credit note becomes UNAPPLIED again.',
    params: {
      resourceId: { type: 'string', description: 'Invoice resourceId' },
      creditResourceId: { type: 'string', description: 'Credit application resourceId to reverse' },
    },
    required: ['resourceId', 'creditResourceId'],
    group: 'payments' as const,
    readOnly: false,
    execute: async (ctx, input) => {
      await reverseInvoiceCredit(ctx.client, input.resourceId as string, input.creditResourceId as string);
      return { reversed: true, invoiceId: input.resourceId, creditId: input.creditResourceId };
    },
  },
  {
    name: 'list_bill_payments',
    description: 'List all payments recorded against a bill. Returns payment records with amounts, dates, and methods.',
    params: {
      resourceId: { type: 'string', description: 'Bill resourceId' },
    },
    required: ['resourceId'],
    group: 'payments' as const,
    readOnly: true,
    execute: async (ctx, input) => listBillPayments(ctx.client, input.resourceId as string),
  },
  {
    name: 'list_bill_credits',
    description: 'List all credit notes applied to a bill.',
    params: {
      resourceId: { type: 'string', description: 'Bill resourceId' },
    },
    required: ['resourceId'],
    group: 'payments' as const,
    readOnly: true,
    execute: async (ctx, input) => listBillCredits(ctx.client, input.resourceId as string),
  },
  {
    name: 'reverse_bill_credit',
    description: 'Reverse (unapply) a supplier credit note from a bill. The credit note becomes UNAPPLIED again.',
    params: {
      resourceId: { type: 'string', description: 'Bill resourceId' },
      creditResourceId: { type: 'string', description: 'Credit application resourceId to reverse' },
    },
    required: ['resourceId', 'creditResourceId'],
    group: 'payments' as const,
    readOnly: false,
    execute: async (ctx, input) => {
      await reverseBillCredit(ctx.client, input.resourceId as string, input.creditResourceId as string);
      return { reversed: true, billId: input.resourceId, creditId: input.creditResourceId };
    },
  },

  // ── Scheduled Transaction CRUD (Get, Update, Delete) ───────────

  getTool(
    'get_scheduled_invoice',
    'Get a scheduled (recurring) invoice by resourceId.',
    'schedulers',
    (client, id) => getScheduledInvoice(client, id),
  ),
  {
    name: 'update_scheduled_invoice',
    description: 'Update a scheduled invoice — change schedule settings and/or the invoice template.',
    params: {
      resourceId: { type: 'string', description: 'Scheduled invoice resourceId' },
      repeat: { type: 'string', description: 'Recurrence: WEEKLY, MONTHLY, QUARTERLY, YEARLY' },
      startDate: { type: 'string', description: 'First occurrence date (YYYY-MM-DD)' },
      endDate: { type: 'string', description: 'Last occurrence date (YYYY-MM-DD)' },
      status: { type: 'string', description: 'Status: ACTIVE or PAUSED' },
      invoice: { type: 'object', description: 'Invoice template: { reference, valueDate, dueDate, contactResourceId, lineItems, currency, tag, saveAsDraft }' },
    },
    required: ['resourceId'],
    group: 'schedulers' as const,
    readOnly: false,
    execute: async (ctx, input) => {
      const data: Record<string, unknown> = {};
      if (input.repeat) data.repeat = input.repeat;
      if (input.startDate) data.startDate = input.startDate;
      if (input.endDate) data.endDate = input.endDate;
      if (input.status) data.status = input.status;
      if (input.invoice) data.invoice = input.invoice;
      return updateScheduledInvoice(ctx.client, input.resourceId as string, data);
    },
  },
  deleteTool(
    'delete_scheduled_invoice',
    'Delete a scheduled (recurring) invoice.',
    'schedulers',
    (client, id) => deleteScheduledInvoice(client, id),
  ),
  getTool(
    'get_scheduled_bill',
    'Get a scheduled (recurring) bill by resourceId.',
    'schedulers',
    (client, id) => getScheduledBill(client, id),
  ),
  {
    name: 'update_scheduled_bill',
    description: 'Update a scheduled bill — change schedule settings and/or the bill template.',
    params: {
      resourceId: { type: 'string', description: 'Scheduled bill resourceId' },
      repeat: { type: 'string', description: 'Recurrence: WEEKLY, MONTHLY, QUARTERLY, YEARLY' },
      startDate: { type: 'string', description: 'First occurrence date (YYYY-MM-DD)' },
      endDate: { type: 'string', description: 'Last occurrence date (YYYY-MM-DD)' },
      status: { type: 'string', description: 'Status: ACTIVE or PAUSED' },
      bill: { type: 'object', description: 'Bill template: { reference, valueDate, dueDate, contactResourceId, lineItems, currency, tag, saveAsDraft }' },
    },
    required: ['resourceId'],
    group: 'schedulers' as const,
    readOnly: false,
    execute: async (ctx, input) => {
      const data: Record<string, unknown> = {};
      if (input.repeat) data.repeat = input.repeat;
      if (input.startDate) data.startDate = input.startDate;
      if (input.endDate) data.endDate = input.endDate;
      if (input.status) data.status = input.status;
      if (input.bill) data.bill = input.bill;
      return updateScheduledBill(ctx.client, input.resourceId as string, data);
    },
  },
  deleteTool(
    'delete_scheduled_bill',
    'Delete a scheduled (recurring) bill.',
    'schedulers',
    (client, id) => deleteScheduledBill(client, id),
  ),
  getTool(
    'get_scheduled_journal',
    'Get a scheduled (recurring) journal by resourceId.',
    'schedulers',
    (client, id) => getScheduledJournal(client, id),
  ),
  {
    name: 'update_scheduled_journal',
    description: 'Update a scheduled journal — change schedule settings and/or the journal template.',
    params: {
      resourceId: { type: 'string', description: 'Scheduled journal resourceId' },
      repeat: { type: 'string', description: 'Recurrence: WEEKLY, MONTHLY, QUARTERLY, YEARLY' },
      startDate: { type: 'string', description: 'First occurrence date (YYYY-MM-DD)' },
      endDate: { type: 'string', description: 'Last occurrence date (YYYY-MM-DD)' },
      status: { type: 'string', description: 'Status: ACTIVE or PAUSED' },
      valueDate: { type: 'string', description: 'Journal date (YYYY-MM-DD)' },
      schedulerEntries: { type: 'array', items: { type: 'object' }, description: 'Journal entries: [{ accountResourceId, type: CREDIT|DEBIT, amount, ... }]' },
      reference: { type: 'string', description: 'Journal reference' },
      notes: { type: 'string', description: 'Journal notes' },
    },
    required: ['resourceId'],
    group: 'schedulers' as const,
    readOnly: false,
    execute: async (ctx, input) => {
      const data: Record<string, unknown> = {};
      if (input.repeat) data.repeat = input.repeat;
      if (input.startDate) data.startDate = input.startDate;
      if (input.endDate) data.endDate = input.endDate;
      if (input.status) data.status = input.status;
      if (input.valueDate) data.valueDate = input.valueDate;
      if (input.schedulerEntries) data.schedulerEntries = input.schedulerEntries;
      if (input.reference) data.reference = input.reference;
      if (input.notes) data.notes = input.notes;
      return updateScheduledJournal(ctx.client, input.resourceId as string, data);
    },
  },
  deleteTool(
    'delete_scheduled_journal',
    'Delete a scheduled (recurring) journal.',
    'schedulers',
    (client, id) => deleteScheduledJournal(client, id),
  ),

  // ── Generic Payment CRUD ───────────────────────────────────────

  getTool(
    'get_payment',
    'Get a specific payment record by resourceId. Returns payment amount, method, date, and reference.',
    'payments',
    (client, id) => getPayment(client, id),
  ),
  {
    name: 'update_payment',
    description: 'Update a payment record — correct amount, reference, date, method, or account.',
    params: {
      resourceId: { type: 'string', description: 'Payment resourceId (from invoice/bill paymentRecords)' },
      paymentAmount: { type: 'number', description: 'Corrected payment amount (bank currency)' },
      reference: { type: 'string', description: 'Payment reference' },
      valueDate: { type: 'string', description: 'Payment date (YYYY-MM-DD)' },
      paymentMethod: PAYMENT_METHOD_PARAM,
      accountResourceId: { type: 'string', description: 'Bank/cash account resourceId' },
      transactionFee: { type: 'number', description: 'Transaction fee amount' },
    },
    required: ['resourceId'],
    group: 'payments' as const,
    readOnly: false,
    execute: async (ctx, input) => {
      const data: Record<string, unknown> = {};
      if (input.paymentAmount !== undefined) data.paymentAmount = input.paymentAmount;
      if (input.reference) data.reference = input.reference;
      if (input.valueDate) data.valueDate = input.valueDate;
      if (input.paymentMethod) data.paymentMethod = input.paymentMethod;
      if (input.accountResourceId) data.accountResourceId = input.accountResourceId;
      if (input.transactionFee !== undefined) data.transactionFee = input.transactionFee;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return updatePayment(ctx.client, input.resourceId as string, data as any);
    },
  },
  deleteTool(
    'delete_payment',
    'Delete (void) a payment record. The associated invoice/bill balance is restored.',
    'payments',
    (client, id) => deletePayment(client, id),
  ),
];
