# CLI Field Guide

> Maps CLI flags to API fields, lists required fields per command, and valid status values.
> This replaces the need to read the jaz-api skill for CLI-only usage.

## Flag → API Field Mapping

| CLI Flag | API Field | Notes |
|----------|-----------|-------|
| `--contact "name"` | `contactResourceId` | Fuzzy-resolved (name or UUID) |
| `--account "name"` | `accountResourceId` | Fuzzy-resolved at top level ONLY |
| `--date YYYY-MM-DD` | `valueDate` | Org-local timezone, not UTC |
| `--due YYYY-MM-DD` | `dueDate` | |
| `--ref "INV-001"` | `reference` | Must be unique per entity type |
| `--currency SGD` | `currencyCode` | Uppercase ISO 4217 |
| `--tag "Q1"` | Tag name (resolved to tag object) | |
| `--status DRAFT` | `status` | Uppercase enum |
| `--lines '[...]'` | `lineItems` array | Each needs: name, quantity, unitPrice, accountResourceId |
| `--entries '[...]'` | `journalEntries` array | Each needs: accountResourceId, debit OR credit |
| `--finalize` | `saveAsDraft: false` | CLI defaults to draft (saveAsDraft: true) |
| `--bank-account "name"` | `bankAccountResourceId` | Fuzzy-resolved |
| `--tax-profile "name"` | `taxProfileResourceId` | Fuzzy-resolved |

## Required Fields per Create Command

### Invoices / Bills
```
clio invoices create --contact "Acme" --date 2026-01-15 --due 2026-02-15 \
  --lines '[{"name":"Consulting","quantity":1,"unitPrice":5000,"accountResourceId":"uuid-or-exact-name"}]'
```
Required: `--contact`, `--date`, `--due`, `--lines` (each line needs name, quantity, unitPrice, accountResourceId)

### Journals
```
clio journals create --date 2026-01-15 \
  --entries '[{"accountResourceId":"uuid","debit":1000},{"accountResourceId":"uuid","credit":1000}]'
```
Required: `--date`, `--entries` (must balance: total debits = total credits)

### Contacts
```
clio contacts create --name "Acme Corp" --customer true
```
Required: `--name`. Optional: `--customer true`, `--supplier true`, `--currency SGD`

### Cash Entries (cash-in / cash-out)
```
clio cash-in create --account "Bank - SGD" --date 2026-01-15 \
  --entries '[{"accountResourceId":"uuid","debit":1000}]'
```
Required: `--account`, `--entries`, `--date`. Each entry needs accountResourceId + debit or credit.

## Status Values

| Entity | Valid Statuses |
|--------|---------------|
| Invoices | `DRAFT`, `UNPAID`, `PARTIALLY_PAID`, `PAID`, `VOID` |
| Bills | `DRAFT`, `UNPAID`, `PARTIALLY_PAID`, `PAID`, `VOID` |
| Credit Notes | `DRAFT`, `UNAPPLIED`, `PARTIALLY_APPLIED`, `APPLIED`, `VOID` |
| Journals | `DRAFT`, `ACTIVE`, `VOID` |
| Contacts | `ACTIVE`, `INACTIVE` |
| Items | `ACTIVE`, `INACTIVE` |
| Fixed Assets | `ACTIVE`, `DRAFT`, `DISPOSED`, `SOLD`, `DISCARDED`, `COMPLETED`, `ONGOING` |

Use in search: `clio invoices search --status UNPAID --json`

## CLI-Specific Gotchas

1. **Create returns minimal response** — only `{ "resourceId": "uuid" }`. Run `clio invoices get <id> --json` for full data.
2. **Line-item accounts don't fuzzy-resolve** — `--lines` JSON requires exact account name or UUID. Top-level `--account` fuzzy-resolves.
3. **All creates default to draft** — use `--finalize` to create as finalized (UNPAID for invoices, ACTIVE for journals).
4. **`--offset` is page number (0-indexed)** — not row skip count. offset=0 + limit=100 = page 1.
5. **`customer` is boolean** — `--customer true`, not `--customer "Acme"`.
6. **Dates are YYYY-MM-DD** — org-local timezone. API returns epoch ms but CLI formats them.
7. **`--all` caps at 10,000 rows** — use `--max-rows 50000` for larger datasets.
8. **JSON goes to stdout, errors to stderr** — `clio invoices list --json 2>/dev/null | jq .` is safe.
9. **`--finalize` skips draft** — creates finalized (e.g., UNPAID for invoices). Without it, everything is DRAFT.
10. **Currency codes are uppercase** — `SGD` not `sgd`. API rejects lowercase.
