/**
 * Tool namespaces for deferred tool search.
 *
 * Groups 36+ ToolGroups into ~20 searchable namespaces with LLM-friendly
 * descriptions. Each namespace has ≤10 tools (OpenAI best practice).
 *
 * The LLM reads namespace descriptions to decide which tools to load.
 * Multiple namespaces can be loaded in a single turn.
 *
 * Abbreviations and synonyms are embedded in descriptions so the LLM
 * can match "tb" → financial_reports, "pnl" → financial_reports, etc.
 *
 * Used by:
 * - OpenAI provider: native tool_search with defer_loading: true
 * - Anthropic provider: client-side search_tools meta-tool
 */
import type { ToolGroup } from './types.js';

export interface ToolNamespace {
  name: string;
  description: string;
  groups: ToolGroup[];
}

export const TOOL_NAMESPACES: ToolNamespace[] = [
  // ── Transactions ────────────────────────────────────────────
  {
    name: 'invoices',
    description: 'Sales invoices (INV/SI). Create, search, get, update, delete, pay, finalize, apply credits, download PDF. Also: receivables, AR, billing, overdue invoices.',
    groups: ['invoices'],
  },
  {
    name: 'customer_credit_notes',
    description: 'Customer credit notes (CN). Create, search, update, delete, finalize, refund, download PDF. Also: sales returns, customer CN.',
    groups: ['customer_credit_notes'],
  },
  {
    name: 'bills',
    description: 'Purchase bills (PO/PI). Create, search, get, update, delete, pay, finalize, apply credits. Also: payables, AP, vendor invoices, supplier bills.',
    groups: ['bills'],
  },
  {
    name: 'supplier_credit_notes',
    description: 'Supplier credit notes. Create, search, update, delete, finalize, refund. Also: purchase returns, debit notes, supplier CN.',
    groups: ['supplier_credit_notes'],
  },
  {
    name: 'journals',
    description: 'Journal entries (JE). Create, search, update, delete manual journals. Also: adjusting entries, accruals, reclassifications, corrections.',
    groups: ['journals'],
  },
  {
    name: 'cash_entries',
    description: 'Cash-in receipts and cash-out disbursements for external cash movements. WHEN TO USE: money received from customers/external → cash-in. Money paid to suppliers/external → cash-out. For internal account-to-account transfers, use cash_transfers namespace.',
    groups: ['cash_entries'],
  },
  {
    name: 'cash_transfers',
    description: 'Cash transfers between your own bank/cash accounts and cashflow transaction search. WHEN TO USE: moving funds between own accounts (main bank → petty cash, USD → SGD). For external receipts/payments, use cash_entries namespace.',
    groups: ['cash_transfers'],
  },

  // ── Banking ─────────────────────────────────────────────────
  {
    name: 'bank_accounts',
    description: 'Bank accounts, bank statement imports (CSV/OFX), bank records search, auto-reconciliation. For unreconciled queries: ALWAYS search bank records with status UNRECONCILED after listing accounts. Also: bank feeds, bank balance.',
    groups: ['bank'],
  },
  {
    name: 'bank_rules',
    description: 'Bank reconciliation rules (action shortcuts). Create, search, update, delete bank rules. Configure auto-matching rules for bank records.',
    groups: ['bank_rules'],
  },

  // ── Reports ─────────────────────────────────────────────────
  {
    name: 'financial_reports',
    description: 'Core financial statements: trial balance (TB), balance sheet (BS/B/S), profit & loss (PnL/P&L/income statement), cash flow, general ledger (GL), cash balance/position, equity movement, VAT/GST ledger. Also: how profitable, what is the balance.',
    groups: ['financial_reports'],
  },
  {
    name: 'operational_reports',
    description: 'Aging and operational reports: aged receivables (AR aging), aged payables (AP aging), AR report, bank balance summary, bank reconciliation reports, fixed asset (FA) summary, FA reconciliation. Data exports (CSV/Excel). Also: overdue analysis, how much owed.',
    groups: ['operational_reports', 'exports'],
  },

  // ── Master Data ─────────────────────────────────────────────
  {
    name: 'contacts',
    description: 'Contacts (customers/suppliers/vendors), contact groups. Create, search, get, update, delete, bulk create contacts. List/create contact groups.',
    groups: ['contacts', 'contact_groups'],
  },
  {
    name: 'items_and_inventory',
    description: 'Products, services, inventory items. Create, search, get, update, delete items. Check inventory balance. Also: SKU, catalog, stock.',
    groups: ['items', 'inventory'],
  },
  {
    name: 'tags_and_custom_fields',
    description: 'Tags for categorizing transactions. Custom fields for adding metadata (text, date, dropdown). Create, search, delete tags and custom fields.',
    groups: ['tags', 'custom_fields'],
  },

  {
    name: 'nano_classifiers',
    description: 'Nano classifiers (tracking categories/dimensions). List, search, create, update, delete classifiers and their classes. Used for line-item tagging and dimensional reporting. Also: tracking categories, cost centers, departments, projects.',
    groups: ['nano_classifiers'],
  },

  // ── Accounting Setup ────────────────────────────────────────
  {
    name: 'chart_of_accounts',
    description: 'Chart of accounts (COA/GL accounts). Create, search, update accounts. Bookmarks (favorites/shortcuts). Also: ledger codes, account types.',
    groups: ['accounts', 'bookmarks'],
  },
  {
    name: 'currencies',
    description: 'Currencies, exchange rates (FX/forex). List/add org currencies. Set, update, import currency rates. Also: multi-currency, FX rates.',
    groups: ['currencies'],
  },
  {
    name: 'tax_profiles',
    description: 'Tax profiles (GST/VAT/sales tax), withholding tax codes (WHT/ATC). Search, create, update tax profiles. List WHT codes.',
    groups: ['tax_profiles'],
  },

  // ── Capsules & Recipes ──────────────────────────────────────
  {
    name: 'capsules_and_recipes',
    description: 'Capsules (transaction groupings/capsule types). Financial recipes: amortization, depreciation, deferred revenue, IFRS 16 leases, hire purchase, fixed deposits, FX revaluation, loan schedules, ECL/expected credit loss, IAS 37 provisions, asset disposal. Plan and execute recipes. Keywords: calculate, provision, schedule, expected credit loss, revaluation.',
    groups: ['capsules', 'recipes'],
  },

  // ── Scheduling ──────────────────────────────────────────────
  {
    name: 'scheduled_transactions',
    description: 'Scheduled/recurring invoices, bills, journals. Create scheduled invoices/bills/journals, search scheduled transactions. Also: recurring, auto-generate.',
    groups: ['schedulers'],
  },
  {
    name: 'subscriptions',
    description: 'Subscriptions (recurring billing/payment plans). Create, update, cancel, search subscriptions. Also: recurring charges, subscription schedules.',
    groups: ['subscriptions'],
  },

  // ── Organization ────────────────────────────────────────────
  {
    name: 'organization',
    description: 'Organization info (name, currency, country, fiscal year). User management: invite, update, remove, search org users. Bulk invite.',
    groups: ['organization', 'org_users'],
  },

  // ── Documents & AI ──────────────────────────────────────────
  {
    name: 'document_ai',
    description: 'File attachments, AI document extraction (magic/OCR). Upload/list attachments. Create transactions from PDFs/images (invoice scanning, bill extraction). Track extraction workflows.',
    groups: ['attachments', 'magic'],
  },

  // ── Fixed Assets ────────────────────────────────────────────
  {
    name: 'fixed_assets',
    description: 'Fixed assets (PP&E/property, plant, equipment). Search, create, update, discard, sell, transfer, undo disposal. Also: depreciation, asset register.',
    groups: ['fixed_assets'],
  },

  // ── Payments & Search ───────────────────────────────────────
  {
    name: 'payments_and_search',
    description: 'Payment records: get, update, delete individual payments. List payments/credits on invoices and bills. Reverse credit applications. Cashflow transaction search. Universal cross-entity search. Also: void payment, payment history, credit note applications.',
    groups: ['payments', 'cashflow', 'search'],
  },

  // ── Quick Fix (Bulk Update) ────────────────────────────────
  {
    name: 'quick_fix',
    description: 'Quick Fix: bulk-update multiple transactions or line items in one call. Change dates, contacts, tags, accounts, tax profiles, custom fields across many invoices/bills/journals/credit-notes/cash-entries/schedulers at once. Also: batch update, mass edit.',
    groups: ['quick_fix'],
  },

  // ── Drafts ──────────────────────────────────────────────────
  {
    name: 'drafts',
    description: 'Draft validation for invoices, bills, journals, credit notes. Bulk finalize multiple drafts at once. Check if drafts are ready to finalize.',
    groups: ['drafts'],
  },

  // ── Job Blueprints ──────────────────────────────────────────
  {
    name: 'close_procedures',
    description: 'Period-end close checklists: month-end, quarter-end, year-end close. Bank reconciliation job. GST/VAT filing job. Audit preparation. Returns structured blueprints.',
    groups: ['close_jobs'],
  },
  {
    name: 'operational_jobs',
    description: 'Operational job checklists: payment runs, credit control/collections, supplier reconciliation, fixed asset review, document collection, statutory filing. Returns structured blueprints.',
    groups: ['operational_jobs'],
  },
];
