# Jaz API Resource Dependencies

> Required creation order and dependency chain for Jaz API resources.
> Understanding these dependencies prevents cascading failures.

---

## Dependency Graph

```
Organization ──┐
               ├── CoA ──────────────────┐
Tax Profiles ──┤                         ├── Items ──┐
Currencies ────┤                         │           │
Tags ──────────┘                         │           │
                                         │           │
                                         ├── Contacts ──┐
                                         │              │
                                         │              ├── Invoices ──┬── Payments
                                         │              ├── Bills ─────┤── Bill Payments
                                         │              ├── Journals   ├── Credit Notes
                                         │              ├── Cash-In    └── Credit Applications
                                         │              └── Cash-Out
                                         │
                                         └── Bank Records (need bankAccountId from CoA)
                                             Schedulers (need contactId + accountId)
```

---

## Required Creation Order

Resources MUST be created in this order. Steps at the same level can run in parallel.

### Level 0: Discovery (read-only)
- `GET /organization` → org name, base currency, country, lockDate
- `GET /chart-of-accounts` → existing accounts (keyed by name AND code)
- `GET /tax-profiles` → pre-existing tax profiles (map taxTypeCode → resourceId)
- `GET /organization/currencies` → enabled currencies
- `GET /contacts` → existing contacts
- `GET /items` → existing items
- `GET /tags` → existing tags

### Level 1: Foundation (parallel)
- `POST /chart-of-accounts/bulk-upsert` → create/update accounts
- `POST /organization/currencies` → enable FX currencies
- `POST /tags` → create tags
- `POST /custom-fields` → create custom fields

**Tax profiles are READ-ONLY** — discovered in Level 0, never created.

### Level 2: Entities (parallel)
- `POST /contacts` → create customers and suppliers
- `POST /items` → create items (needs CoA + tax profile IDs from Levels 0-1)

### Level 3: Transactions (parallel)
- `POST /magic/createBusinessTransactionFromAttachment` → **starting from an attachment (PDF/JPG)?** Use Jaz Magic — extraction & autofill creates a draft invoice or bill with all fields pre-filled. See SKILL.md Rules 57-62.
- `POST /invoices` → create invoices from structured data (needs contacts + CoA + tax profiles)
- `POST /bills` → create bills from structured data (same deps, can embed payments)
- `POST /journals` → create journal entries (needs CoA)
- `POST /cash-in-journals` → cash receipts (needs bank account from CoA)
- `POST /cash-out-journals` → cash payments (needs bank account from CoA)

### Level 4: Settlements (parallel)
- `POST /invoices/{id}/payments` → record invoice payments (needs invoice + bank account)
- `POST /bills/{id}/payments` → record bill payments (needs bill + bank account; fixed in PR #112)
- `POST /customer-credit-notes` → create customer CNs (needs contacts)
- `POST /supplier-credit-notes` → create supplier CNs (needs contacts)
- `POST /invoices/{id}/credits` → apply CNs to invoices (needs invoice + CN IDs)

### Level 5: Bank & Recurring (parallel)
- `POST /magic/importBankStatementFromAttachment` → import bank records (needs bank account from CoA)
- `POST /scheduled/invoices` → create invoice schedulers (needs contacts + CoA)
- `POST /scheduled/bills` → create bill schedulers (needs contacts + CoA)

### Level 5b: Optional/Experimental (Parallel)
- POST /api/v1/catalogs (needs Items from Level 2)
- POST /api/v1/deposits (needs Contacts + CoA-Bank from Level 0-1)
- POST /api/v1/fixed-assets (needs CoA from Level 0-1)
- POST /api/v1/inventory/adjustments (needs Items from Level 2)

These endpoints may not be available on all organizations. Use try/catch with graceful fallback.

### Level 6: Verification
- `POST /generate-reports/trial-balance` → verify data integrity

---

## Key Dependencies Explained

| Step | Needs from... | Why |
|------|--------------|-----|
| Items | CoA (Level 1) | `saleAccountResourceId`, `purchaseAccountResourceId` |
| Items | Tax Profiles (Level 0) | `saleTaxProfileResourceId`, `purchaseTaxProfileResourceId` |
| Contacts | Nothing | Standalone — only name, currency, phone |
| Invoices | Contacts (Level 2) | `contactResourceId` |
| Invoices | CoA (Level 1) | `lineItems[].accountResourceId` (if saveAsDraft: false) |
| Invoices | Tax Profiles (Level 0) | `lineItems[].taxProfileResourceId` |
| Invoice Payments | Invoices (Level 3) | URL: `/invoices/{invoiceResourceId}/payments` |
| Bill Payments | Bills (Level 3) | URL: `/bills/{billResourceId}/payments` (or embedded) |
| Payments | CoA-Bank (Level 0) | `accountResourceId` (the bank account) |
| Credit Notes | Contacts (Level 2) | `contactResourceId` |
| Credit Applications | Invoices + CNs (Level 3-4) | Both `invoiceResourceId` and `creditNoteResourceId` |
| Bank Records | CoA-Bank (Level 0) | Multipart: `/magic/importBankStatementFromAttachment` |
| Schedulers | Contacts + CoA (Level 1-2) | Full invoice/bill payload inside |

---

## What Happens If You Break The Order

| Mistake | Error You'll See |
|---------|-----------------|
| Create invoices before CoA | `"lineItems[0].accountResourceId is required"` |
| Create invoices before contacts | `"contactResourceId is a required field"` |
| Create payments before invoices | 404 on `/invoices/{id}/payments` |
| Create bank records before CoA probe | Bank account ID unknown |
| Create items before CoA | Items created but with no sale/purchase accounts |
| Create credit apps before CNs | `"creditNoteResourceId must be a valid UUID"` |
| Skip tax profile discovery | Invoices with no tax |
| Map CoA by code not name | Account lookup fails (pre-existing codes differ) |

---

## CoA Code Mapping Strategy

Pre-existing accounts may have different codes than your templates:
- "Cost of Goods Sold" = code 310 in the API, code 5000 in template
- "Accounts Receivable" can have `code: null` in the API

**Always map by NAME, not code**. When building lookup maps, key by both:
```javascript
coaIds[acct.name] = acct.resourceId;
if (acct.code) coaIds[acct.code] = acct.resourceId;
```

Resource IDs are the universal identifier, not codes.

---

*Last updated: 2026-02-08 — Extracted from chronology.md, stripped of project-specific seeder logic for portability*
