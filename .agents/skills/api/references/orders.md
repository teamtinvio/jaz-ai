# Orders — Sale Quotes, Sale Orders, Purchase Requests, Purchase Orders

Pre-invoice / pre-bill documents in the sales and purchase pipelines.

```
Sales:     Sale Quote ──(accept)──► Sale Order ──(convert-to-invoice)──► Invoice
Purchases: Purchase Request ──(accept)──► Purchase Order ──(convert-to-bill)──► Bill
```

Two MCP namespaces wrap these: **`sale_orders`** (Sale Quotes + Sale Orders) and **`purchase_orders`** (Purchase Requests + Purchase Orders). Each tool takes a `documentType` discriminator. The full long-tail (list, bulk-*, fast-fix, line-item bulk-upsert) lives in the CLI (`clio sale-orders …`, `clio purchase-orders …`). Attachments on any order document go through the generic `get_attachments` / `add_attachment` / `delete_attachment` tools (`transactionType: sale-quotes | sale-orders | purchase-requests | purchase-orders`).

## Document types & lifecycle

| documentType | Created as | Advance verb | Terminal | saveAsDraft? |
|--------------|-----------|--------------|----------|--------------|
| `SALE_QUOTE` | DRAFT (default) / CREATED (saveAsDraft:false) | **accept** (CREATED → ACCEPTED) | VOID | yes (default true) |
| `SALE_ORDER` | CREATED | **confirm** → CONFIRMED | VOID | **no** (always CREATED) |
| `PURCHASE_REQUEST` | DRAFT (default) / ACTIVE (saveAsDraft:false) | **accept** (ACTIVE → ACCEPTED) | VOID | yes (default true) |
| `PURCHASE_ORDER` | DRAFT (default) / ACTIVE (saveAsDraft:false) | **confirm** → CONFIRMED | VOID | yes (default true) |

- **Quotes & Requests use `accept`. Orders use `confirm`.** (`transition_*` enforces this via a documentType × action matrix.)
- **`accept` works on the ISSUED state, not DRAFT** — a Sale Quote must be CREATED, a Purchase Request must be ACTIVE. Accepting a DRAFT returns `422 Invalid status` (verified live). There is no exposed DRAFT→issued verb: **issue a document by creating it with `saveAsDraft:false`** (update with `saveAsDraft:false` does NOT issue an existing DRAFT — verified live).
- **Sale Orders have no draft state** — `saveAsDraft` is ignored; created directly as `CREATED`.
- Statuses verified live: SQ create → `DRAFT` (or `CREATED` with `saveAsDraft:false`); SQ accept (from CREATED) → `ACCEPTED`; SO create → `CREATED`; SO confirm → `CONFIRMED`; PR create → `DRAFT` (or `ACTIVE` with `saveAsDraft:false`); PR accept (from ACTIVE) → `ACCEPTED`; PO `saveAsDraft:false` → `ACTIVE`; PO confirm → `CONFIRMED`.

## Linking (quote → order, request → PO)

Quote→Order / Request→PO linking is a **create-time reference field**:

- **Quote → Order**: pass `saleQuoteResourceId` on `create_sale_order` (documentType `SALE_ORDER`).
- **Request → PO**: pass `purchaseRequestResourceId` on `create_purchase_order` (documentType `PURCHASE_ORDER`).

**The parent must be ISSUED (not DRAFT/VOID).** A CREATED/ACCEPTED quote (or ACTIVE/ACCEPTED request) is linkable — accept is **optional** (CREATED already links). Linking to a `DRAFT`/`VOID` parent returns `SALE_QUOTE_STATUS_INVALID_FOR_ORDER_CONVERSION` ("must not be in VOID or DRAFT status to create sale order"). The `create_*` tools pre-flight this: for a DRAFT parent the `repair` hint says to issue it (create with `saveAsDraft:false`) — **not** to accept it (accept fails on DRAFT). So: to order from a quote/request, create the quote/request with `saveAsDraft:false`.

Once an order is created from an issued quote, the parent quote's `orderState` advances to `FULLY_ORDERED` (verified live). `orderState` (`NOT_ORDERED` / `PARTIALLY_ORDERED` / `FULLY_ORDERED`) is a **response field**, not a search filter.

## Conversion: Order → Invoice / Order → Bill

Both directions are now first-class endpoints:

- **`convert_sale_order_to_invoice`** (documentType `SALE_QUOTE` | `SALE_ORDER`) → creates a new Invoice from the source.
- **`convert_purchase_order_to_bill`** (documentType `PURCHASE_REQUEST` | `PURCHASE_ORDER`) → creates a new Bill from the source.

Body: `valueDate` + `dueDate` + `reference` required; if `reference` is omitted the tool sends a unique placeholder — pass your own to follow your org's numbering sequence. Optional `terms`, `notes` (sales → `invoiceNotes`), `internalNotes`, `tag`, `saveAsDraft` (defaults false → the new document is ACTIVE).

- **NON-IDEMPOTENT.** Each call creates ANOTHER invoice/bill. On a timeout or uncertain result, do NOT blind-retry — search for one already linked to this order (via the linkage fields below) first.
- **Source must not be VOID.** The convert tools pre-flight this and return a `repair` hint instead of a bare 422.
- The reverse link is also exposed as create-time fields: `create_invoice` accepts `saleOrderResourceId` / `saleQuoteResourceId`; `create_bill` accepts `purchaseOrderResourceId` / `purchaseRequestResourceId`. Use these when you build the invoice/bill yourself instead of converting.

## Fields (create)

Required: `valueDate`. Recommended: `reference` (auto-generated, timestamped, if omitted — must be unique per org), `contactResourceId`, `lineItems`.

- Line items reuse the standard shape: `{ name, quantity, unitPrice, accountResourceId?, taxProfileResourceId?, … }`. `accountResourceId` is **required on each line when the document is not a draft** (i.e. always for Sale Orders; for quotes/requests/POs when `saveAsDraft:false`). The `create_*` tools pre-flight this.
- Notes field differs by side: **sales** use `invoiceNotes`, **purchases** use `purchaseNotes`. The `notes` tool param maps to the right one automatically.
- Other optional fields: `dueDate`, `terms` (0/7/15/30/45/60), `tag`, `customFields`, `billTo`, `billFrom`, `capsuleResourceId`, `expectedTotal`.

## Delete vs Void

- **DELETE is draft-only** (422 on anything non-draft). `transition_* action:DELETE` pre-flights status and returns a `repair` hint to use `VOID` for non-draft records.
- **VOID** cancels any non-draft quote/request/order; optional `internalNotes` reason.

## MCP tools

`sale_orders`: `create_sale_order`, `get_sale_order`, `search_sale_orders`, `search_sale_order_line_items`, `update_sale_order`, `transition_sale_order` (action: ACCEPT | CONFIRM | VOID | DELETE), `convert_sale_order_to_invoice`.
`purchase_orders`: `create_purchase_order`, `get_purchase_order`, `search_purchase_orders`, `search_purchase_order_line_items`, `update_purchase_order`, `transition_purchase_order`, `convert_purchase_order_to_bill`.

PDF downloads for the documents these convert into: `download_bill_pdf` (`bills`), `download_supplier_credit_note_pdf` (`supplier_credit_notes`) — alongside the existing `download_invoice_pdf` / `download_credit_note_pdf`.

## CLI (full surface incl. long-tail)

```
clio sale-orders     list|get|search|search-line-items|create|update|accept|confirm|convert-to-invoice|void|delete|fast-fix \
                     |bulk-void|bulk-accept|bulk-confirm|bulk-delete|bulk-upsert-line-items   (-t quote|order)
clio purchase-orders list|get|search|search-line-items|create|update|accept|confirm|convert-to-bill|void|delete|fast-fix \
                     |bulk-void|bulk-accept|bulk-confirm|bulk-delete|bulk-upsert-line-items   (-t request|order)
clio bills download <id>                     # bill PDF
clio supplier-credit-notes download <id>     # supplier CN PDF
```

## Worked example — issued quote → accept → linked order → confirmed

```bash
# 1. Issue the quote (--finalize → saveAsDraft:false → status CREATED). A plain
#    draft (no --finalize) stays DRAFT and cannot be linked or accepted.
clio sale-orders create -t quote --finalize --contact <id> --lines '[{"name":"Widget","quantity":2,"unitPrice":50,"accountResourceId":"<acct>"}]' --date 2026-05-30 --json
# 2. (Optional) accept it (CREATED → ACCEPTED). A CREATED quote is already linkable.
clio sale-orders accept <quoteId> --json
# 3. Create the order linked to the issued quote (created as CREATED)
clio sale-orders create -t order --quote <quoteId> --contact <id> --lines '[…]' --date 2026-05-30 --json
# 4. Confirm the order (CREATED → CONFIRMED)
clio sale-orders confirm <orderId> --json
# 5. The parent quote now shows orderState = FULLY_ORDERED
clio sale-orders get <quoteId> -t quote --json | jq .orderState
# 6. Convert the confirmed order into an invoice (creates a NEW invoice)
clio sale-orders convert-to-invoice <orderId> -t order --date 2026-05-30 --due 2026-06-29 --json
```

Purchase side is symmetric: `create -t request --finalize` (→ ACTIVE) → (optional) `accept` → `create -t order --request <id> --finalize` → `confirm` → `convert-to-bill <orderId> -t order --date … --due …`.

## Search

`search_sale_orders` / `search_purchase_orders` take `documentType` plus the standard filter set (reference, status, contact, contactResourceId, currencyCode, date range, amount range, tag). The `status` enum is the per-side union (sales: DRAFT/CREATED/ACCEPTED/CONFIRMED/VOID; purchases: DRAFT/ACTIVE/ACCEPTED/CONFIRMED/VOID). For advanced/nested queries (e.g. filter by `saleQuoteResourceId`), pass the raw `filter` object. See `search-reference.md` §24–25 and `search-enums.md` §25–26.

Search behaves exactly like the other entities: `sortBy` is an array, `order` is `ASC`/`DESC`, and an `offset` must be paired with a sort. Duplicate `sortBy` values are rejected (`422 — must contain unique values`).

**Line-item-level search** — `search_sale_order_line_items` / `search_purchase_order_line_items` (CLI: `search-line-items -t …`) search the individual lines rather than the document headers. Filter by line text (`name`), parent order (`orderId` → `btResourceId`), contact, account, tax profile, amount range, open state (`isOpen`), and date. Use this for questions like "every order line still open for contact X over $500". A default sort is always applied, so paginating with `offset` is safe.
