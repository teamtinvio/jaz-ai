# CLI Output Shapes

> `--json` output shapes from real CLI runs. Use these for `jq` pipelines.

---

## List Commands (Paginated Envelope)

```bash
clio invoices list --json       # Any list command: invoices, contacts, bills, etc.
```

```json
{
  "totalElements": 7297,
  "totalPages": 73,
  "truncated": false,
  "data": [{ "resourceId": "...", "reference": "INV-175", "status": "DRAFT", ... }]
}
```

Optional when truncated: `"_meta": { "fetchedRows": 10000, "maxRows": 10000 }`

**jq examples:**
```bash
clio invoices list --json | jq '.data[] | {ref: .reference, amount: .totalAmount, status}'
clio contacts list --all --json | jq '[.data[].resourceId]'
clio invoices list --all --json | jq '.truncated'
```

### Key fields by entity

**Invoices/Bills**: reference, status, valueDate, dueDate, contactResourceId, terms, resourceId, isTaxVATApplicable, taxInclusion, lineItems, billFrom, contact, subTotal, totalShipping, totalVat, totalAmount, currencyCode, currencySymbol, taxCurrencyExchange

**Contacts**: addresses, contactGroups, contactPeople, currencyCode, customer, jazMagicAutofill, name, billingName, organizationId, paymentDetail, resourceId, status, supplier, theyOwe, youOwe, createdAt

**Journals**: reference, status, valueDate, resourceId, journalEntries, totalDebit, totalCredit, currencyCode

---

## Get Commands (Single Entity)

Returns the full entity object directly (no envelope).

```bash
clio invoices get <id> --json   # → { resourceId, reference, status, ... }
clio contacts get <id> --json   # → { resourceId, name, theyOwe, youOwe, ... }
```

**jq examples:**
```bash
clio invoices get "$ID" --json | jq '{status, totalAmount, reference}'
clio contacts get "$ID" --json | jq '{name, theyOwe, youOwe}'
```

---

## Create Commands (Minimal Response)

All create commands return only `{ resourceId: string }`. Fetch full data afterward.

```bash
ID=$(clio invoices create --contact "Acme" --date 2026-01-15 --lines '[...]' --json | jq -r '.resourceId')
clio invoices get "$ID" --json   # Now you have the full record
```

---

## Search Command (Multi-Entity)

Universal search returns results grouped by entity type.

```bash
clio search "Acme" --json
```

```json
{
  "contacts": [],
  "sales": [],
  "purchases": [],
  "journals": [],
  "credit_notes": [],
  "sale_items": [],
  "purchase_items": [],
  "sale_credit_note_items": [],
  "purchase_credit_note_items": [],
  "supplier_notes": []
}
```

**jq examples:**
```bash
clio search "Acme" --json | jq '.contacts[] | {name, resourceId}'
clio search "laptop" --json | jq 'to_entries | map({key, count: (.value | length)})'
```

---

## Calc Commands (Calculator Output)

Offline calculators return structured results with an amortization schedule.

```bash
clio calc loan --principal 10000 --rate 5 --term 12 --json
```

```json
{
  "type": "loan",
  "currency": null,
  "inputs": { "principal": 10000, "annualRate": 5, "termMonths": 12, "startDate": null },
  "monthlyPayment": 856.07,
  "totalPayments": 10272.89,
  "totalInterest": 272.89,
  "totalPrincipal": 10000,
  "schedule": [{ "period": 1, "date": "2025-02-01", "openingBalance": 10000, "payment": 856.07, "interest": 41.67, "principal": 814.40, "closingBalance": 9185.60, "journal": {...} }],
  "blueprint": { ... }
}
```

**jq examples:**
```bash
clio calc loan --principal 10000 --rate 5 --term 12 --json | jq '.monthlyPayment'
clio calc loan --principal 10000 --rate 5 --term 12 --json | jq '.schedule[-1].closingBalance'
```

---

## Health Command

```bash
clio health --json
```

```json
{
  "version": "4.50.0",
  "checks": [
    { "name": "CLI version", "status": "ok", "value": "4.50.0" },
    { "name": "Node.js", "status": "ok", "value": "v24.6.0" },
    { "name": "Auth", "status": "ok", "value": "global-sg-demo (Global SG Demo, SGD)", "detail": "connected" },
    { "name": "API connection", "status": "ok", "value": "200 OK (142ms)" }
  ],
  "ok": true
}
```

Each check has: `name`, `status` ("ok"/"warn"/"fail"), `value`, and optional `detail` (actionable hint).

**jq examples:**
```bash
clio health --json | jq '.ok'
clio health --json | jq '.checks[] | select(.status != "ok")'
```

---

## Schema Command (Tool Introspection)

```bash
clio schema --json
```

```json
{
  "totalTools": 243,
  "totalGroups": 39,
  "groups": [
    { "group": "invoices", "tools": 10, "read": 4, "write": 6, "cliCommand": "clio invoices" }
  ]
}
```

**jq examples:**
```bash
clio schema --json | jq '.groups[].group'
clio schema --json | jq '.groups[] | select(.write > 0) | {group, write}'
clio schema invoices --json              # Tool definitions for a group
clio schema invoices create --json       # Parameter schema for a specific tool
```
