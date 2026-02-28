# Feature Glossary

Business context for Jaz platform features — what they are, when to use them, and which API endpoints correspond. This supplements the API-focused reference files with product knowledge that helps AI agents understand the *purpose* behind API calls.

For full help center content split by section, see [help-center-mirror/](../help-center-mirror/) or [help.jaz.ai](https://help.jaz.ai). For the complete endpoint catalog (80+), see [full-api-surface.md](./full-api-surface.md).

---

## Invoices

Sales documents sent to customers for goods/services rendered. Track Accounts Receivable, support multi-currency with FX gain/loss, and integrate with payments, customer credits, delivery slips, and recurring schedules. Statuses: draft, payment due, overdue, partially paid, fully paid.

Key capabilities: draft/approval workflows, multi-currency (auto-fetch ECB rates or custom org rates), scheduled/recurring invoices with dynamic scheduler strings, delivery slips, sales subscriptions with proration, bulk import (up to 1,000), Quick Fix for bulk field edits, GST/VAT adjustments.

If payment date equals invoice date, it's recorded as a cash transaction (not AR). Transaction fees are deducted from cash received. RGL = `(Invoice payment / Transaction Rate) - (Cash received / Payment Rate)`.

**API**: CRUD `GET/POST/PUT/DELETE /invoices`, `POST /invoices/search`, `POST /invoices/:id/payments`, `GET /invoices/:id/payments`, `POST /invoices/:id/credits`, `GET /invoices/:id/download`, `POST/GET/DELETE /invoices/:id/attachments`, `PUT /invoices/:id/approve`, `POST /scheduled/invoices` (CRUD), `POST /scheduled/subscriptions` (recurring). Generic payment ops: `GET/PUT/DELETE /payments/:id`. **Starting from a PDF/JPG attachment?** Use `POST /magic/createBusinessTransactionFromAttachment` instead — Jaz Magic handles extraction & autofill (see AI Agents section).

---

## Bills

Purchase documents from suppliers for goods/services received. Track Accounts Payable with multi-currency FX. Bills follow the same lifecycle as invoices but with reversed RGL logic and admin-only approval workflows. Supports withholding tax (WHT) on line items.

Key capabilities: bill receipts (short-form template creating bill + payment together), purchase order PDFs from drafts, scheduled/recurring bills, WHT certificate payments (always credited to WHT Payable account), bulk import.

Transaction fees are added to cash spent (not deducted like invoices). RGL = `(Cash spent / Payment rate) - (Bill payment / Transaction rate)`.

**API**: CRUD `GET/POST/PUT/DELETE /bills`, `POST /bills/search`, `POST /bills/:id/payments`, `GET /bills/:id/payments`, `POST /bills/:id/credits`, `POST/GET/DELETE /bills/:id/attachments`, `PUT /bills/:id/approve`, `POST /scheduled/bills` (CRUD). Generic payment ops: `GET/PUT/DELETE /payments/:id`. **Starting from a PDF/JPG attachment?** Use `POST /magic/createBusinessTransactionFromAttachment` instead — Jaz Magic handles extraction & autofill (see AI Agents section).

---

## Customer Credits

Credit notes that reduce amounts owed by customers — issued for returns, discounts, or corrections. Can be applied to invoices (same currency only) or refunded to customers. Statuses: draft, credit available, fully applied.

Active credits only can be applied to invoices. Application has no additional ledger impact (already accounted at creation). Refunds use `refundAmount` + `refundMethod` (NOT `paymentAmount`/`paymentMethod`). Voiding a credit deletes associated refunds and unapplies from invoices.

**API**: CRUD `GET/POST/PUT/DELETE /customer-credit-notes`, `POST /customer-credit-notes/search`, `POST /customer-credit-notes/:id/refunds`, `GET /customer-credit-notes/:id/refunds`, `POST /customer-credit-notes/:id/credits` (apply to invoice), `GET /customer-credit-notes/:id/download`

---

## Supplier Credits

Credit notes that reduce amounts owed to suppliers — issued by suppliers for returns, discounts, or corrections. Can be applied to bills (same currency only) or refunded from suppliers. Same lifecycle as customer credits.

Supports withholding tax on credit line items. Supplier credit note PDFs are NOT available for download (internal records only). Import supports credit notes but NOT refunds.

**API**: CRUD `GET/POST/PUT/DELETE /supplier-credit-notes`, `POST /supplier-credit-notes/search`, `POST /supplier-credit-notes/:id/refunds`, `GET /supplier-credit-notes/:id/refunds`, `POST /supplier-credit-notes/:id/credits` (apply to bill)

---

## Deposits

Track advance payments and prepaid balances. Customer deposits are liabilities (money received before goods/services delivered). Supplier deposits are assets (money paid before goods/services received). Support multi-currency, top-ups, drawdowns, and integration with invoice/bill payment workflows.

Can block payments if deposit balance is insufficient. View all contacts with deposits and filter by balance status. Managed via dedicated deposit accounts in the Chart of Accounts.

There is no dedicated `/deposits` endpoint (returns 404). Deposits are managed through deposit-designated CoA accounts, with transactions recorded as journal entries and payments on invoices/bills drawing from those deposit accounts.

**API**: `POST /journals` (record deposit top-ups/drawdowns via deposit CoA accounts), `POST /chart-of-accounts` (create deposit accounts), `POST /invoices/:id/payments` / `POST /bills/:id/payments` (draw from deposit account via `accountResourceId`)

---

## Journal Entries

Manual accounting entries for non-payment transactions. Three types: Manual Journals (multi-line debit/credit entries), Cash Journals (2-line cash transfers between bank accounts with cross-currency support), and Transfer Journals (year-end trial balance transfers, non-editable).

Manual journals support multi-currency — the entire journal can be in the org's base currency or any enabled foreign currency. Foreign currency journal restrictions: (1) no controlled accounts (AR/AP — use invoices/bills instead), (2) no FX system accounts (Unrealized Gain/Loss/Rounding), (3) bank accounts must match the journal's currency (e.g., USD journal → USD bank only).

Minimum 2 balanced entries required. Cash journals are restricted to exactly 2 lines. Bank/cash/current asset/equity/liability accounts cannot have tax profiles applied. Supports scheduled/recurring journals with dynamic scheduler strings (`{{YEAR}}`, `{{MONTH}}`).

Cash transfer FX logic: if either side is base currency, keep as-is; if both non-base, fetch rate for cash-out and derive cash-in. Transfer rate = `Cash-in amount / Cash-out amount`.

**API**: CRUD `GET/POST/PUT/DELETE /journals`, `POST /journals/search`, `POST/GET/DELETE /journals/:id/attachments`, `POST /cash-in-journals`, `POST /cash-out-journals`, `POST /cash-transfer-journals`, `POST /cashflow-transactions/search`, `DELETE /cashflow-journals/:id`, `POST /scheduled/journals` (CRUD)

---

## Capsules

Containers that group related transactions for complex accounting scenarios. Use cases: prepaid expenses (annual insurance amortization), deferred revenue, accrued expenses, fixed asset acquisitions (CIP), intercompany transactions, renovation projects.

A capsule links invoices, bills, journals, and schedulers into a single logical unit. If a scheduler belongs to a capsule, every recurring entry it generates is automatically created under that same capsule — this is how prepaid expenses, deferred revenue, and accruals spread entries across periods while keeping them grouped. The ledger can be filtered and grouped by capsule (the only enrichment that supports group-by). Capsule Types are customizable labels. A capsule must be empty before deletion. Transactions can be bulk-attached via Quick Fix or moved between capsules.

**API**: CRUD `GET/POST/PUT/DELETE /capsules`, `POST /capsules/search`, `POST /move-transaction-capsules`, CRUD `GET/POST/PUT/DELETE /capsuleTypes`, `POST /capsuleTypes/search` (also available as `/capsule-types/*` kebab-case aliases)

---

## Reports

Financial statements and accounting reports for compliance, analysis, and audit. All reports support multi-currency display, exchange rate transparency, and Excel/PDF export.

| Report | What it shows |
|--------|--------------|
| **Trial Balance** | Debit/credit verification worksheet — if unbalanced, arithmetic error exists |
| **Balance Sheet** | Assets/liabilities/equity snapshot at a point in time |
| **Profit & Loss** | Revenue/costs/expenses over a period; supports tracking tag filters |
| **Cashflow Statement** | Cash inflows/outflows categorized as operating/investing/financing |
| **General Ledger** | Complete record of all transactions; group by accounts/contacts/transactions/relationships/tax profiles/capsules |
| **Aged Receivables** | Outstanding invoices by overdue periods; summary and detail views |
| **Aged Payables** | Outstanding bills by overdue periods; summary and detail views |
| **Cash Balance** | Bank/cash account balances at a specific date |
| **Equity Movement** | Changes in equity accounts over a period |
| **Bank Balance Summary** | Consolidated bank account balances with lock dates and currencies |

FX-related accounts auto-created: FX Bank Revaluation, FX Realized, FX Unrealized, FX Rounding (each with Gains and Loss variants). Retained Earnings auto-updates at financial year-end via CYE rollover.

**API**: `POST /generate-reports/trial-balance`, `POST /generate-reports/balance-sheet`, `POST /generate-reports/profit-and-loss`, `POST /generate-reports/general-ledger`, `POST /generate-reports/cashflow`, `POST /generate-reports/cash-balance`, `POST /generate-reports/ar-report`, `POST /generate-reports/ap-report`, `POST /generate-reports/bank-balance-summary`, `POST /generate-reports/equity-movement`, and more. Data exports: `POST /data-exports/trial-balance`, `POST /data-exports/profit-and-loss`, `POST /data-exports/general-ledger`, etc. Also: `POST /generate-report-packs-pdf`, `POST /statement-of-account-export`

---

## Contacts

Customer and supplier records. A single contact can be both customer AND supplier simultaneously. Each contact has transaction settings (default payment terms, currency, GST profile, WHT codes, PDF/email templates) that auto-fill when creating transactions.

Contact Groups organize contacts for report filtering (Aged Receivables/Payables, Ledger). Contact Relationships use pre-defined types (Associate Company, Director/Shareholder, Parent Company, etc.) for related-party reporting. Sales Activity PDFs show statement of balances and accounts per currency.

**API**: CRUD `GET/POST/PUT/DELETE /contacts`, `POST /contacts/search`, CRUD `GET/POST/PUT/DELETE /contact-groups`, `POST /contact-groups/search`

---

## Products & Items

Items for sales (revenue accounts) and purchases (expense accounts). Each item has Internal Name (org use), Sale Name (invoice PDF), and Purchase Name (bill PDF). Items support default tax profiles, COGS tracking, and unique item codes.

Inventory items use Fixed Cost (non-GAAP, for fully-landed costs) or Weighted Average Cost (recalculates on each stock addition). Costing method cannot be changed after selection. "Block insufficient deductions" prevents sales reducing stock below zero.

Catalogs group items for bulk application to invoices/credits/scheduled invoices/subscriptions. Catalogs can be assigned to contact groups.

**API**: CRUD `GET/POST/PUT/DELETE /items`, `POST /items/search`, `DELETE /items/:id` (also deletes inventory items), `POST /inventory-items`, `GET /inventory-items`, `GET /inventory-item-balance/:id`, CRUD `GET/POST/PUT/DELETE /catalogs`, `POST /catalogs/search`, `POST /purchase-items/search`

---

## Bank Reconciliations

Match bank statement lines to Jaz transactions to verify cash balances. This is where most day-to-day bookkeeping happens — reconciling what the bank shows vs what Jaz has recorded.

**Auto-Reconciliation**: Runs daily at midnight with configurable rules — Match (existing transactions), Quick Reconcile (create journals), Apply Rule (bank rules), Cash Transfer. Three magic thresholds: Strict, Balanced, Lenient. Can exclude specific records via Saved Search.

**Magic Match**: Auto-suggests transaction matches within 30 days (with contact) or 3 days (payments only), matching by amount + contact name.

**Bank Feeds**: Connect Airwallex, Aspire, Stripe, Wise, or Xendit for automated statement sync (up to 12 months history, daily auto-sync).

**Bank Rules**: Auto-allocate amounts using percentage-only or fixed+percentage splits (max 10 fixed + 10 percentage lines). Support dynamic strings like `#{{bankReference}}`, `#{{payeeName}}`.

Statement amounts are recorded in the bank account's currency — no auto-conversion. Cross-currency transactions prompt for cash received/spent in statement currency. Reconciled transactions become uneditable (must reset to edit).

**API**: `POST /bank-records/:accountResourceId` (JSON import), `POST /bank-records/:accountResourceId/search`, `POST /magic/importBankStatementFromAttachment` (multipart CSV/OFX), CRUD `GET/POST/PUT/DELETE /bank-rules`, `POST /bank-rules/search`, `GET /bank-accounts`, `POST /view-auto-reconciliation`

---

## Approvals

Workflow for draft invoices and bills requiring admin sign-off before activation. Three user roles: Admins (approve + create active), Preparers (submit drafts for approval), Members (submit own drafts only). Status progression: Draft → For Approval → Approved (active). Approval PDFs capture Submitted By / Approved By audit trail.

**API**: `PUT /invoices/:id/approve`, `PUT /bills/:id/approve`

---

## Fixed Assets

Fixed asset register with straight-line depreciation. Register assets from invoice/bill line items or standalone. Auto-posts monthly depreciation journal entries. Formula: `(Cost - Salvage Value) / Useful Life`.

Fixed assets lock their linked line items — cannot edit account, amounts, or exchange rates on a line item with an active fixed asset. Must delete the asset before modifying the line item. Fixed asset journals can be grouped in capsules for CIP, renovations, and disposals.

**API**: CRUD `GET/POST/PUT/DELETE /fixed-assets`, `POST /fixed-assets/search`, `POST /mark-as-sold/fixed-assets`, `POST /undo-disposal/fixed-assets/:id`, `POST /discard-fixed-assets/:id`, `POST /transfer-fixed-assets`, `POST /fixed-assets-types/search`

---

## AI Agents

**Clio**: AI assistant for accounting tasks. Auto-extracts invoice/bill data from PDF/image attachments (OCR), detects multi-step transactions (prepaid expenses, deferred revenue, accruals), and suggests capsule creation with linked schedulers. Creates draft transactions for user review. Session-based (no persistent chat history). Available on web and Android (iOS coming).

**Agent Builder**: Configure custom AI agents in Settings > Agent Builder with name, email (a-z, 0-9, + symbol), and workflow preferences.

**Jaz Magic**: The extraction & autofill engine. When users start from an attachment (PDF, JPG, document image), Jaz Magic is the correct path — it handles OCR, line item detection, contact matching, and CoA auto-mapping via ML learning, producing a complete draft transaction. Contact-level settings control extraction behavior: line items (detailed extraction), summary totals (single amount), or none. Up to 10 images can be merged into a single PDF. **Do not manually parse attachments to construct `POST /invoices` or `POST /bills` — always use Jaz Magic when the input is a file.**

**API**: `POST /magic/createBusinessTransactionFromAttachment` (**attachment → draft transaction** — the primary endpoint for file-based creation), `POST /magic/importBankStatementFromAttachment` (bank statements), `PUT /invoices/magic-update`, `PUT /bills/magic-update`, `PUT /journals/magic-update`, `GET /invoices/magic-search`, `GET /bills/magic-search` (all magic endpoints use `x-magic-api-key`)

---

## Settings & Configuration

**Chart of Accounts**: Account codes, names, types (Revenue, Expense, Asset, Liability, Equity), subtypes, lock dates per account. System accounts (AR, AP, FX) are auto-created and cannot be deleted.

**Tax Profiles**: GST/VAT codes with rates, scoped to sales-only, purchases-only, or both. Pre-provisioned per org — discover via GET, never create.

**Currencies & FX Rates**: Enable currencies before use. Rate priority: transaction-level custom rate > org-level custom rate > ECB/Frankfurter auto-fetch. Rate direction: `rate` = functionalToSource (1 base = X foreign).

**Transaction Data Enrichments** — four optional metadata layers at different granularities:

| Layer | Scope | Purpose | Reporting | PDF | Scheduler |
|-------|-------|---------|-----------|-----|-----------|
| **Tracking Tags** | Transaction only | Hashtags for advanced reporting | Filter | No | Inherited |
| **Nano Classifiers** | Line item only | Classification intent (department, cost center) | Filter | Yes (line items) | Inherited |
| **Capsules** | Group of transactions | Workflow container for multi-step accounting | Filter + Group by | No | All entries land in capsule |
| **Custom Fields** | Transaction | Additional record-keeping | No impact | Yes | No |

- **Tracking Tags**: Like hashtags on transactions — data enrichment for advanced reporting. Transaction-level only (not line items). Can be set on schedulers — generated entries inherit them. Cannot group by tags in reports, only filter.
- **Nano Classifiers**: Data enrichment with a classification intent — group line items into named classes within a classifier (e.g., Department: Engineering/Sales/Finance). Line-item-level only (not transaction headers). Can be displayed on PDF line items. Can be set on schedulers — generated entries inherit them. Assigning classifiers to items auto-applies them to line items in transactions.
- **Capsules**: Not a classification — a workflow container that groups related transactions for a specific accounting scenario (prepaid, deferred, accrual, CIP). The only enrichment supporting group-by in reports. See dedicated Capsules section above.
- **Custom Fields**: Text/number/date/dropdown fields for additional record-keeping. Transaction-level, applied to invoices/bills/journals/contacts. Can show on PDFs and be made mandatory. No reporting impact, not available on schedulers.

**Lock Dates**: Prevent edits to transactions before a date (org-wide or per-account). Prevents backdated entries.

**User Roles**: Admin (full access), Preparer (create drafts, submit for approval), Member (own drafts only). Granular permissions by module (AR, AP, Treasury, Journals).

**API**: CRUD `GET/POST/PUT/DELETE /chart-of-accounts`, `POST /chart-of-accounts/bulk-upsert`, `POST /chart-of-accounts/search`, `GET /tax-profiles`, `POST /tax-profiles/search`, CRUD `GET/POST/PUT/DELETE /tags`, `POST /tags/search`, CRUD `GET/POST/PUT/DELETE /custom-fields`, `POST /custom-fields/search`, `POST /organization/currencies` (enable), `DELETE /organization/currencies/:code` (disable), `POST /organization-currencies/:code/rates` (set FX rate, CRUD), `GET /organization` (org details), CRUD `GET/POST/PUT/DELETE /organization/bookmarks`, CRUD `GET/POST/PUT/DELETE /nano-classifiers`, `POST /nano-classifiers/search`, `GET /organization-users`, `POST /organization-users/search`. Reference data: `GET /account-classifications`, `GET /withholding-tax-codes`, `GET /tax-types`, `GET /modules`, `GET /search` (Typesense full-text)

---

## Collaboration

Threaded comments on transactions for team communication and audit trails. Add comments to invoices, bills, journals, and credit notes. Tag team members with @mentions to trigger notifications.

---

## Data Import

Bulk import for all entity types. All imports use .xlsx templates with error review before finalizing. Limits: 1,000 rows (invoices/bills/journals/credits/items), 2MB (items), 12 files (bank statements). Imports create active transactions (not drafts) for invoices/bills. Items can update existing records based on item code.

Bank statement import supports CSV and PDF with configurable column mapping. Statement amounts recorded in bank account currency (no auto-conversion). Auto-detects date format.

**API**: `POST /magic/importBankStatementFromAttachment` (multipart: `sourceFile`, `accountResourceId`, `businessTransactionType: "BANK_STATEMENT"`, `sourceType: "FILE"`)

---

*Maintained alongside [help.jaz.ai](https://help.jaz.ai).*
