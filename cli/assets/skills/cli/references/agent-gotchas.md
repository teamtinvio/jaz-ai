# Agent Gotchas

> 19 critical gotchas for AI agents using the CLI. Learned from production testing.
> Violating these causes silent data errors or wasted API calls.

---

1. **Cash entries finalize immediately.** `clio cash-in` and `clio cash-out` default to `saveAsDraft: false` (API default). Unlike invoices/bills/journals which the CLI overrides to draft. Use `--finalize` on invoices to finalize; cash entries are already final.

2. **Line-item account resolution is NOT fuzzy.** The `accountResourceId` field inside `--lines` JSON arrays requires a UUID or exact account name. Fuzzy matching only works for top-level flags (`--contact`, `--account`). Always resolve accounts first: `clio accounts list --json | jq '.data[] | {name, id: .resourceId}'`.

3. **Create responses are minimal.** All create commands return only `{ "resourceId": "uuid" }`. To get the full entity (status, amounts, line items), run `clio <entity> get <id> --json` afterward.

4. **--offset is page number (0-indexed), not row skip count.** `--offset 0 --limit 100` = rows 1-100. `--offset 1 --limit 100` = rows 101-200. This is not the same as SQL OFFSET.

5. **--all caps at 1,000 rows by default** (lowered from 10,000 in 2026-04). For large orgs, pass `--max-rows 50000` explicitly. The CLI auto-paginates with concurrent requests and **stops fetching once `--max-rows` is reached** (early-stop, not slice-after — the previous behavior would pull every page and discard the excess, causing minute-long hangs on busy sandboxes).

6. **JAZ_API_KEY env var overrides --org and active profile.** If set, all commands use that key regardless of `--org` or `clio auth switch`. Run `unset JAZ_API_KEY` to restore profile-based auth. Run `echo $JAZ_API_KEY` to check.

7. **--json output goes to stdout; errors go to stderr.** Piping `clio invoices list --json | jq .` works cleanly. Resolution feedback ("Contact: Acme Corp (abc1234...)") is on stderr and won't corrupt JSON. Always parse stdout only.

8. **Dates are YYYY-MM-DD in org-local timezone.** Not UTC, not epoch. The API stores dates without time component. `--date 2026-03-15` means March 15 in the org's configured timezone.

9. **Currency codes are uppercase ISO 4217.** `SGD`, `USD`, `EUR` -- not `sgd`, `usd`. Lowercase will be rejected by the API with a validation error.

10. **The `customer` and `supplier` fields on contacts are booleans.** `{ "customer": true, "supplier": false }` -- not strings. A contact can be both customer and supplier simultaneously.

11. **Search returns results grouped by entity type, not a flat array.** `clio search "Acme" --json` returns `{ contacts: [...], sales: [...], purchases: [...], ... }`. Each key may be empty. Always access the specific entity key you need.

12. **`clio schema` is for tool introspection, not data.** `clio schema --json` lists command groups and tool counts. `clio schema invoices --json` shows tool definitions. `clio schema invoices create --json` shows parameter schema. None of these hit the API.

13. **Job blueprints output plain text by default.** `clio jobs month-end` prints a checklist. Add `--json` for structured output. Some job tools (`match`, `outstanding`, `sg-cs`) require auth; blueprint generators are offline.

14. **Capsule-transaction recipes: always `--plan` first.** `clio ct loan --plan` shows what accounts and transactions will be created, offline. Only run without `--plan` when you know the account mapping is correct. Recipes create real finalized transactions.

15. **The `--input` flag reads JSON from a file.** For complex payloads (multi-line-item invoices, detailed journals), write JSON to a temp file and pass `--input payload.json` instead of long `--lines` flags with shell escaping issues. When `--input` is provided, all other body flags are ignored.

16. **`bills draft list` (also `invoices/customer-credit-notes/supplier-credit-notes draft list`) fans out one attachment lookup per draft** (5 in flight). On accounts with hundreds of drafts this hangs >30s by default. Pass `--max-rows 10` for spot checks. Long-term: a `--with-attachments` flag is on the roadmap.

17. **Bulk-upsert is TWO endpoints per entity for invoices/bills.** `clio invoices bulk-upsert` is FLAT (one line per row via `itemDescription` + `totalAmount` + `invoiceAccountResourceId` at row level). `clio invoices bulk-upsert-line-items` is NESTED (multi-line via `lineItems[]`). Sending `lineItems[]` to FLAT is silently ignored → $0 invoices. Match your data shape to the variant.

18. **Reconciliation `lineItems[]` use `name` + `organizationAccountResourceId`.** The `reconciliations invoice-receipt` and `reconciliations bill-receipt` payloads use a DIFFERENT line-item field naming than `bulk-upsert-line-items`. Recon-create uses `name` (description) + `organizationAccountResourceId` (revenue/expense account). Bulk uses `itemDescription` + `accountResourceId`. Don't copy-paste line-items between the two.

19. **`reconciliations invoice-receipt` / `bill-receipt` gate on `paymentDirection`, not BSE type.** The 422 error code "Invalid business transaction type" is misleadingly named — the actual API check is on the BSE's `paymentDirection`. **`invoice-receipt` requires `PAYIN`** (positive amount via `clio bank add-records` → `credit_amount > 0`). **`bill-receipt` requires `PAYOUT`** (NEGATIVE amount → `debit_amount > 0`). Statement-imported BSEs (`clio bank import`) also work — direction is set from the CSV. For programmatic seeding, `clio bank add-records` with the correct sign is sync, fast, and reliable; no need for the async magic-OCR `bank import` path.
