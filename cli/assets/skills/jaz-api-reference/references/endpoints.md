# Jaz API Endpoint Reference

> Request/response examples for every Jaz API endpoint, one file per domain (index at the end).
> The conventions below apply to every endpoint. The jaz-api skill holds the rest: its SKILL.md indexes the numbered rules, its `errors.md` covers troubleshooting and its `field-map.md` name lookups.

---

## Base URL & Auth

```
Base URL: https://api.getjaz.com
Auth: OAuth through the configured CLI/MCP connection by default.
Optional API-key header: x-jk-api-key: <key>
Content-Type: application/json
```

---

## Date Format (All Endpoints)

**All dates must be `YYYY-MM-DD` strings** (e.g., `"2026-02-08"`).

- ISO datetime strings (e.g., `"2026-02-08T00:00:00Z"`) are REJECTED; bill payment validation returns "does not match 2006-01-02 format"
- Epoch milliseconds are REJECTED, with one exception: `POST /fixed-assets/bulk-upsert` takes `purchaseDate` and `depreciationStartDate` as epoch milliseconds and answers 400 to a date string (jaz-api rule 122)
- The OAS may declare some date fields as `integer/int64` (e.g., cash journals) but `YYYY-MM-DD` strings work in practice
- Production clients send all dates as `YYYY-MM-DD` via Python `date` type

**Timezone convention**: All business dates (`valueDate`, `dueDate`, `startDate`, `endDate`, etc.) are in the **organization's timezone**; no timezone conversion is needed, in either requests or responses. The DB stores epoch ms representing the org-local date. Only audit timestamps (`createdAt`, `updatedAt`, `action_at`) are UTC.

---

## Pagination (All List Endpoints)

All GET list endpoints and POST `/search` endpoints use **`limit`/`offset` pagination**, NOT `page`/`size`.

**IMPORTANT: `offset` is a page number (0-indexed), NOT a row-skip count.** `offset=0` returns the first page, `offset=1` returns the second page, etc. Example: `offset=2, limit=50` returns items 100 to 149.

**Exceptions, where `offset` is a 0-indexed ROW offset (next page = offset + limit):** `POST /generate-reports/general-ledger` and `templated-general-ledger`, the AR/AP details reports (`ar-details-report`, `ap-details-report`, `templated-ar-details-report`, `templated-ap-details-report`), `/purchase-items` (list and search), `GET /organization/currencies/{code}/rates`, and `POST /employees/payouts/search`. There, `offset=2, limit=50` returns items 2-51.

Paging one of these by page number reads overlapping windows: duplicates in, the rest never reached, while `totalElements` still looks right.

| Property | Value |
|----------|-------|
| **GET list endpoints** | `?limit=100&offset=0` (query params) |
| **POST /search endpoints** | `{ "limit": 100, "offset": 0 }` (JSON body) |
| **Default limit** | 100 (if omitted) |
| **Default offset** | 0 (first page) |
| **Max limit** | 1000 |
| **Min limit** | 1 |
| **Max offset** | 65536 |
| **Response shape** | `{ totalPages, totalElements, data: [...] }` |

**`page`/`size` are NOT supported**: sending `?page=0&size=100` is silently ignored (API returns default 100 items as if no params were sent). Always use `limit`/`offset`.

**POST /search sort requirement**: When `offset` is present in the body (even `offset: 0`), `sort` is required:
```json
{ "limit": 100, "offset": 0, "sort": { "sortBy": ["createdAt"], "order": "DESC" } }
```

---

## Success Status Codes (All Endpoints)

**Never branch on the exact 2xx; check `response.ok` (or `status < 300`) and read the body.** Every success carries the same `{ data: ... }` envelope regardless of code.

| Shape | Code |
|---|---|
| `POST` that creates a NEW record: `/invoices`, `/bills`, `/journals`, `/contacts`, `/items`, `/chart-of-accounts`, `/tags`, `/tax-profiles`, `/capsules`, `/bookmarks`, `/bank-records/:acct`, `/:type/:id/payments`, `/:type/:id/refunds`, `/organization[-]currencies/:code/rates`, `/scheduled/*`, `/magic/*`, `/sale-orders/:id/convert-to-invoice` (and the other `convert-to-*`), the fixed-asset disposal actions (`/discard-fixed-assets/:id`, `/mark-as-sold/fixed-assets`, `/transfer-fixed-assets`) | **201** |
| `PUT` (update), all 40 of them, no exceptions | **200** |
| `GET` (all), `DELETE` (all) | **200** |
| `POST /search`, `POST /bulk-upsert`, and action POSTs that mutate an EXISTING record (`/:id/request-changes`, `/:id/credits`, `/:id/attachments`) | **200** |
| Async batch kickoff (`/bulk-request-changes`, claims `bulk/*`) | **202** |
| Quick Fix / bulk partial failure | **207** (body shape identical to 200; check `failed[]`) |

**Changed 2026-08-10**: seven `PUT` endpoints moved 201 → 200: `/bills/{id}`, `/contacts/{id}`, `/nano-classifiers/{id}`, `/items/{id}`, `/journals/{id}`, `/scheduled/journals/{id}`, `/organization/currencies/{code}/rates/{id}`. Request shapes and response bodies are byte-identical; only the status changed. The same release corrected 114 published success codes that disagreed with what the endpoints actually returned, so the API reference now matches runtime everywhere. A client that asserted `status === 201` on an update breaks; one that checks `response.ok` does not.

---

## Auto-Wrapping (NormalizeToArray)

Middleware on payment, credit, and refund endpoints automatically wraps a flat JSON object into an array. Both formats work:

| Endpoint | Array format (preferred) | Flat format (auto-wrapped) |
|----------|------------------------|---------------------------|
| `POST /invoices/:id/payments` | `{ "payments": [{...}] }` | `{ "paymentAmount": ..., ... }` → auto-wrapped to `{ "payments": [{...}] }` |
| `POST /bills/:id/payments` | `{ "payments": [{...}] }` | Same |
| `POST /invoices/:id/credits` | `{ "credits": [{...}] }` | Same |
| `POST /bills/:id/credits` | `{ "credits": [{...}] }` | Same |
| `POST /customer-credit-notes/:id/refunds` | `{ "refunds": [{...}] }` | Same |
| `POST /supplier-credit-notes/:id/refunds` | `{ "refunds": [{...}] }` | Same |

**Recommendation**: Always use the array format for clarity and consistency.

---

## Search and Field Aliases

Every `POST /api/v1/{resource}/search` takes `{ filter, sort, limit, offset }`. The request shape, every operator per field type, and each endpoint's filter and sort fields are in [search-reference.md](./search-reference.md); the `query` string syntax is in [search-syntax.md](./search-syntax.md).

Create and update endpoints accept alias field names (`issueDate` for `valueDate`, `name` for `tagName`, and so on). The complete alias table, with the endpoints each alias applies to, is jaz-api's `field-map.md` → Middleware Alias Table.

---

## Where each section lives

| Section | File |
|---------|------|
| 1. Organization | [endpoints-master-data.md](./endpoints-master-data.md) |
| 2. Chart of Accounts | [endpoints-master-data.md](./endpoints-master-data.md) |
| 3. Tax Profiles | [endpoints-master-data.md](./endpoints-master-data.md) |
| 4. Currencies | [endpoints-master-data.md](./endpoints-master-data.md) |
| 5. Contacts | [endpoints-master-data.md](./endpoints-master-data.md) |
| 6. Items | [endpoints-master-data.md](./endpoints-master-data.md) |
| 7. Invoices | [endpoints-transactions.md](./endpoints-transactions.md) |
| 8. Bills | [endpoints-transactions.md](./endpoints-transactions.md) |
| 9. Journals | [endpoints-transactions.md](./endpoints-transactions.md) |
| 10. Cash Entries | [endpoints-transactions.md](./endpoints-transactions.md) |
| 11. Payments | [endpoints-transactions.md](./endpoints-transactions.md) |
| 12. Credit Notes | [endpoints-transactions.md](./endpoints-transactions.md) |
| 13. Tags | [endpoints-master-data.md](./endpoints-master-data.md) |
| 14. Custom Fields | [endpoints-master-data.md](./endpoints-master-data.md) |
| 14b. Inventory Items | [endpoints-master-data.md](./endpoints-master-data.md) |
| 14c. Cash Transfers | [endpoints-transactions.md](./endpoints-transactions.md) |
| 14d. Credit Note Refunds | [endpoints-transactions.md](./endpoints-transactions.md) |
| 14e. Contact Groups | [endpoints-master-data.md](./endpoints-master-data.md) |
| 14f. Organization Bookmarks | [endpoints-master-data.md](./endpoints-master-data.md) |
| 14g. Attachments | [endpoints-transactions.md](./endpoints-transactions.md) |
| 14h. Jaz Magic: Extraction & Autofill | [endpoints-banking-magic.md](./endpoints-banking-magic.md) |
| 15. Bank Records | [endpoints-banking-magic.md](./endpoints-banking-magic.md) |
| 16. Schedulers | [endpoints-schedules-reports.md](./endpoints-schedules-reports.md) |
| 16b. Subscriptions (Recurring Invoices with Auto-Proration) | [endpoints-schedules-reports.md](./endpoints-schedules-reports.md) |
| 17. Reports | [endpoints-schedules-reports.md](./endpoints-schedules-reports.md) |
| 18. Cashflow Transactions Search | [endpoints-banking-magic.md](./endpoints-banking-magic.md) |
| 19. Bank Records Search | [endpoints-banking-magic.md](./endpoints-banking-magic.md) |
| 20. Bank Records: JSON POST (Alternative) | [endpoints-banking-magic.md](./endpoints-banking-magic.md) |
| Catalogs (Experimental) | [endpoints-master-data.md](./endpoints-master-data.md) |
| Deposits (a flag on an account, not an entity) | [endpoints-banking-magic.md](./endpoints-banking-magic.md) |
| Fixed Assets (Experimental) | [endpoints-assets-payroll.md](./endpoints-assets-payroll.md) |
| Deferrals (prepaid expenses and deferred revenue) | [endpoints-assets-payroll.md](./endpoints-assets-payroll.md) |
| Leases (IFRS 16 lessee leases, hire purchase) | [endpoints-assets-payroll.md](./endpoints-assets-payroll.md) |
| Payrun settings and employee pay (pay types, payrun posting rules, pay profiles, employee pay details) | [endpoints-assets-payroll.md](./endpoints-assets-payroll.md) |
| Loans (borrowings; term and on demand) | [endpoints-assets-payroll.md](./endpoints-assets-payroll.md) |
| Inventory (read-only balances, no adjustment write path) | [endpoints-master-data.md](./endpoints-master-data.md) |
| 17. Quick Fix (Bulk Update) | [endpoints-bulk-edits.md](./endpoints-bulk-edits.md) |
| 17a. Ledger Find & Fix | [endpoints-bulk-edits.md](./endpoints-bulk-edits.md) |
| 18b. Transfer Trial Balance | [endpoints-transactions.md](./endpoints-transactions.md) |
| 19. Payment Record CRUD | [endpoints-transactions.md](./endpoints-transactions.md) |
| 19b. Invoice/Bill Sub-Resource Endpoints | [endpoints-transactions.md](./endpoints-transactions.md) |
| 19c. Request Changes | [endpoints-transactions.md](./endpoints-transactions.md) |
| 19d. Approve | [endpoints-transactions.md](./endpoints-transactions.md) |
| 20. Nano-Classifier CRUD | [endpoints-master-data.md](./endpoints-master-data.md) |
| 21. Scheduler GET/PUT/DELETE | [endpoints-schedules-reports.md](./endpoints-schedules-reports.md) |
| 22. Contacts Bulk Upsert | [endpoints-bulk-edits.md](./endpoints-bulk-edits.md) |
| 23. Background Jobs Search | [endpoints-bulk-edits.md](./endpoints-bulk-edits.md) |
| 24. Export Records | [endpoints-schedules-reports.md](./endpoints-schedules-reports.md) |
| 25. Jots (Judgment Journal) | [endpoints-transactions.md](./endpoints-transactions.md) |
| 26. Bank Rules CRUD | [endpoints-banking-magic.md](./endpoints-banking-magic.md) |
| 27. Unapplied Payments | [endpoints-transactions.md](./endpoints-transactions.md) |
| 28. Report Templates | [endpoints-schedules-reports.md](./endpoints-schedules-reports.md) |
| 29. Collaboration (Comments and Notifications) | [endpoints-transactions.md](./endpoints-transactions.md) |

---

*Last updated: 2026-11-25 (split by domain into the files indexed above). Previous: 2026-11-06 (Collaboration mentions are markup in `content`). Previous: 2026-11-05 (added Collaboration, section 29). Previous: 2026-09-24 (added Report Templates, section 28). Previous: 2026-09-23 (added Unapplied Payments, section 27). Previous: 2026-09-13 (added Bank Rules CRUD, section 26). Previous: 2026-07-11 (added Jots judgment journal, section 25). Previous: 2026-04-09, added Contacts bulk-upsert (22), Background Jobs search (23), Export Records (24). 2026-03-13: Payment record CRUD, nano-classifier, scheduler GET/PUT/DELETE.*
