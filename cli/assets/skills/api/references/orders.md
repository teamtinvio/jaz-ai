# Orders — Sale Quotes, Sale Orders, Purchase Requests, Purchase Orders

Pre-invoice / pre-bill documents in the sales and purchase pipelines.

```
Sales:     Sale Quote ──(accept)──► Sale Order ──► Invoice
Purchases: Purchase Request ──(accept)──► Purchase Order ──► Bill
```

Two MCP namespaces wrap these: **`sale_orders`** (Sale Quotes + Sale Orders) and **`purchase_orders`** (Purchase Requests + Purchase Orders). Each tool takes a `documentType` discriminator. The full long-tail (list, bulk-*, fast-fix, line-item bulk-upsert) lives in the CLI (`clio sale-orders …`, `clio purchase-orders …`).

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

## Linking (this is how "conversion" works today)

There is **no convert endpoint** (`/convert-to-invoice` → 404). Linking is a **create-time reference field**:

- **Quote → Order**: pass `saleQuoteResourceId` on `create_sale_order` (documentType `SALE_ORDER`).
- **Request → PO**: pass `purchaseRequestResourceId` on `create_purchase_order` (documentType `PURCHASE_ORDER`).

**The parent must be ISSUED (not DRAFT/VOID).** A CREATED/ACCEPTED quote (or ACTIVE/ACCEPTED request) is linkable — accept is **optional** (CREATED already links). Linking to a `DRAFT`/`VOID` parent returns `SALE_QUOTE_STATUS_INVALID_FOR_ORDER_CONVERSION` ("must not be in VOID or DRAFT status to create sale order"). The `create_*` tools pre-flight this: for a DRAFT parent the `repair` hint says to issue it (create with `saveAsDraft:false`) — **not** to accept it (accept fails on DRAFT). So: to order from a quote/request, create the quote/request with `saveAsDraft:false`.

Once an order is created from an issued quote, the parent quote's `orderState` advances to `FULLY_ORDERED` (verified live). `orderState` (`NOT_ORDERED` / `PARTIALLY_ORDERED` / `FULLY_ORDERED`) is a **response field**, not a search filter.

### Order → Invoice / Order → Bill

**Not exposed by the REST API yet.** There is no `saleOrderResourceId` on invoice-create and no `purchaseOrderResourceId` on bill-create at this layer. To raise an invoice "from" a confirmed Sale Order, call `create_invoice` separately (no order reference is recorded today). Fulfillment back-reference (`invoiceState`/`billState`) is tracked server-side but not surfaced here. Do **not** fabricate an order→invoice link.

## Fields (create)

Required: `valueDate`. Recommended: `reference` (auto-generated, timestamped, if omitted — must be unique per org), `contactResourceId`, `lineItems`.

- Line items reuse the standard shape: `{ name, quantity, unitPrice, accountResourceId?, taxProfileResourceId?, … }`. `accountResourceId` is **required on each line when the document is not a draft** (i.e. always for Sale Orders; for quotes/requests/POs when `saveAsDraft:false`). The `create_*` tools pre-flight this.
- Notes field differs by side: **sales** use `invoiceNotes`, **purchases** use `purchaseNotes`. The `notes` tool param maps to the right one automatically.
- Other optional fields: `dueDate`, `terms` (0/7/15/30/45/60), `tag`, `customFields`, `billTo`, `billFrom`, `capsuleResourceId`, `expectedTotal`.

## Delete vs Void

- **DELETE is draft-only** (422 on anything non-draft). `transition_* action:DELETE` pre-flights status and returns a `repair` hint to use `VOID` for non-draft records.
- **VOID** cancels any non-draft quote/request/order; optional `internalNotes` reason.

## MCP tools

`sale_orders`: `create_sale_order`, `get_sale_order`, `search_sale_orders`, `update_sale_order`, `transition_sale_order` (action: ACCEPT | CONFIRM | VOID | DELETE).
`purchase_orders`: `create_purchase_order`, `get_purchase_order`, `search_purchase_orders`, `update_purchase_order`, `transition_purchase_order`.

## CLI (full surface incl. long-tail)

```
clio sale-orders     list|get|search|create|update|accept|confirm|void|delete|fast-fix \
                     |bulk-void|bulk-accept|bulk-confirm|bulk-delete|bulk-upsert-line-items   (-t quote|order)
clio purchase-orders list|get|search|create|update|accept|confirm|void|delete|fast-fix \
                     |bulk-void|bulk-accept|bulk-confirm|bulk-delete|bulk-upsert-line-items   (-t request|order)
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
```

Purchase side is symmetric: `create -t request --finalize` (→ ACTIVE) → (optional) `accept` → `create -t order --request <id> --finalize` → `confirm`.

## Search

`search_sale_orders` / `search_purchase_orders` take `documentType` plus the standard filter set (reference, status, contact, contactResourceId, currencyCode, date range, amount range, tag). The `status` enum is the per-side union (sales: DRAFT/CREATED/ACCEPTED/CONFIRMED/VOID; purchases: DRAFT/ACTIVE/ACCEPTED/CONFIRMED/VOID). For advanced/nested queries (e.g. filter by `saleQuoteResourceId`), pass the raw `filter` object. See `search-reference.md` §24–25 and `search-enums.md` §25–26.

Search behaves exactly like the other entities: `sortBy` is an array, `order` is `ASC`/`DESC`, and an `offset` must be paired with a sort. Duplicate `sortBy` values are rejected (`422 — must contain unique values`).
