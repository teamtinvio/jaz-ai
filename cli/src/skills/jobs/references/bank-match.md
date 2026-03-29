# Bank Reconciliation Matcher

## Scenario

Your company has 150 unreconciled bank records and 400 cashflow transactions in the books. Manually matching them by amount, date, and description takes hours. The bank-match calculator automates this — it runs a 5-phase cascade algorithm that finds 1:1, N:1, 1:N, and N:M matches with confidence scores, leaving only genuinely unmatched items for manual review.

**Pattern:** Utility calculator — produces match proposals for the bank reconciliation job

**When to use this calculator:**
- Bank reconciliation catch-up with a large backlog of unreconciled items
- Monthly recon where you want to pre-match before reviewing
- Automated reconciliation pipelines (use `--json` output)
- Investigating potential matches before committing them in Jaz

**When NOT to use this calculator:**
- Already reconciled — no unreconciled items to match
- Single-item matching — just search by amount and date manually
- Cross-entity matching — this operates within a single bank account

---

## Algorithm: 5-Phase Cascade

Each phase runs in order. Items matched in an earlier phase are removed from the pool before the next phase runs. This prevents double-matching.

### Phase 0: Normalize & Index

Converts all amounts to integer cents (eliminates floating-point issues), computes day offsets from a reference date, normalizes contact names and descriptions to lowercase tokens. Builds lookup indexes for fast matching.

### Phase 1: Exact 1:1 Hash Join

Finds perfect matches — same amount (to the cent), same contact name, same date. These are matched with `exact` confidence. Uses hash-based lookup for O(n) performance.

### Phase 2: Fuzzy 1:1 Greedy Assignment

For remaining items, scores every bank record against every candidate transaction using a weighted composite score:

| Signal | Weight | How It Works |
|--------|--------|-------------|
| **Text** | 0.55 | Cross-field similarity between contact/reference/description fields |
| **Date** | 0.30 | Exponential decay with 5-day half-life (14-day window default) |
| **Type** | 0.15 | Occam's razor — prefers simpler match types (1:1 over N:1) |

Amount must be within tolerance (default: $0.01). Pairs are assigned greedily (best score first) with a regret check — if a candidate is significantly better for another bank record, it skips and lets the better pairing win. Threshold: score >= 0.70 for strong 1:1 match.

**Confidence mapping:**
- `exact` — perfect amount + contact + date (Phase 1 only)
- `high` — score >= 0.70
- `medium` — score >= 0.40
- `low` — score < 0.40

### Phase 3: N:1 Subset-Sum (Multiple Transactions → One Bank Record)

A single bank record might represent several transactions batched together (e.g., a bank deposit covering 3 customer payments). This phase uses DFS with suffix-sum pruning to find subsets of transactions that sum to the bank record amount (within tolerance).

- Max subset size: configurable (default 5, max 10)
- Searches within same-direction candidates
- Scores the group using aggregate text similarity and average date proximity

### Phase 4: 1:N Reverse Subset-Sum (Multiple Bank Records → One Transaction)

The reverse case — a single transaction might correspond to multiple bank records (e.g., a payment was split across bank entries). Same DFS algorithm, reversed: finds subsets of bank records that sum to a transaction amount.

### Phase 5: N:M Two-Set Matching (Within Contact Groups)

For remaining unmatched items, groups bank records and transactions by contact name. Within each contact group, enumerates combinations where bank record subsets match transaction subsets (within tolerance). This catches complex split scenarios that Phases 3-4 miss.

---

## CLI Usage

```bash
# From file
clio jobs bank-recon match --input bank-data.json [--json]

# From stdin (pipe from API output)
cat bank-data.json | clio jobs bank-recon match --json

# With options
clio jobs bank-recon match --input data.json --tolerance 0.05 --date-window 7 --max-group 3 --currency SGD --json

# Analysis mode — all possible matches per record
clio jobs bank-recon match --input data.json --find-all --json
```

### Options

| Option | Default | Description |
|--------|---------|-------------|
| `--input <file>` | stdin | JSON file with bank records + transactions |
| `--tolerance <amount>` | 0.01 | Amount tolerance in functional currency |
| `--date-window <days>` | 14 | Max days apart for matching candidates |
| `--max-group <k>` | 5 | Max subset size for N:1/1:N/N:M (max: 10) |
| `--currency <code>` | null | Functional/reporting currency label |
| `--find-all` | false | Return all possible matches per record (analysis mode) |
| `--json` | false | Output as structured JSON |

---

## Input Format

```json
{
  "bankRecords": [
    {
      "id": "BR-001",
      "amount": 2500.00,
      "date": "2025-01-15",
      "contact": "Acme Corp",
      "reference": "TRF-88812",
      "description": "Payment for INV-001"
    }
  ],
  "transactions": [
    {
      "id": "TXN-001",
      "direction": "PAYIN",
      "amount": 2500.00,
      "date": "2025-01-14",
      "contact": "Acme Corporation",
      "reference": "INV-001",
      "type": "INVOICE_PAYMENT"
    }
  ],
  "options": {
    "tolerance": 0.01,
    "dateWindowDays": 14,
    "maxGroupSize": 5,
    "currency": "SGD"
  }
}
```

### Bank Record Fields

| Field | Required | Description |
|-------|----------|-------------|
| `id` | Yes | Unique identifier (bank record resourceId) |
| `amount` | Yes | Signed amount (positive = cash-in, negative = cash-out) |
| `date` | Yes | Value date (YYYY-MM-DD) |
| `contact` | No | Counterparty name from bank feed |
| `reference` | No | Bank reference / description |
| `description` | No | Additional description text |
| `currency` | No | Transaction currency (for cross-currency matching) |

### Cashflow Transaction Fields

| Field | Required | Description |
|-------|----------|-------------|
| `id` | Yes | Unique identifier (cashflow transaction resourceId) |
| `direction` | Yes | `PAYIN` (cash-in) or `PAYOUT` (cash-out) |
| `amount` | Yes | Absolute amount (always positive — direction indicates sign) |
| `date` | Yes | Value date (YYYY-MM-DD) |
| `contact` | No | Contact name from Jaz |
| `reference` | No | Document reference (e.g., INV-001) |
| `type` | No | Transaction type (e.g., INVOICE_PAYMENT, BILL_PAYMENT) |
| `currency` | No | Transaction currency |
| `crossCurrency` | No | True if this is a cross-currency transaction |

---

## Output Format (`--json`)

```json
{
  "type": "bank-match",
  "currency": "SGD",
  "inputs": {
    "recordCount": 150,
    "transactionCount": 400,
    "tolerance": 0.01,
    "dateWindowDays": 14,
    "maxGroupSize": 5
  },
  "matches": [
    {
      "matchType": "1:1",
      "confidence": "exact",
      "score": 1.0,
      "bankRecords": [{ "id": "BR-001", "amount": 2500.00, "date": "2025-01-15" }],
      "transactions": [{ "id": "TXN-001", "amount": 2500.00, "date": "2025-01-14" }],
      "bankTotal": 2500.00,
      "transactionTotal": 2500.00,
      "variance": 0.00,
      "signals": { "text": 0.85, "date": 0.92, "type": 1.00 },
      "reason": "Exact: amount $2,500.00, contact 'Acme Corp', date 2025-01-15"
    }
  ],
  "unmatchedRecords": [],
  "unmatchedTransactions": [],
  "summary": {
    "totalRecords": 150,
    "totalTransactions": 400,
    "matched1to1": 120,
    "matchedNto1": 15,
    "matched1toN": 5,
    "matchedNtoM": 2,
    "unmatchedRecordCount": 8,
    "unmatchedTransactionCount": 42,
    "matchRate": 0.947,
    "totalMatchedAmount": 485000.00,
    "totalUnmatchedAmount": 12500.00
  },
  "timing": {
    "phase0Ms": 2,
    "phase1Ms": 1,
    "phase2Ms": 8,
    "phase3Ms": 12,
    "phase4Ms": 6,
    "phase5Ms": 3,
    "totalMs": 32
  },
  "workings": "Bank Match Workings\n..."
}
```

### Match Types

| Type | Meaning | Example |
|------|---------|---------|
| `1:1` | One bank record matches one transaction | Single invoice payment |
| `N:1` | Multiple transactions match one bank record | Batch deposit (3 payments in 1 bank entry) |
| `1:N` | Multiple bank records match one transaction | Split payment (1 payment across 2 bank entries) |
| `N:M` | Multiple bank records match multiple transactions | Complex group match within a contact |

---

## Worked Example

**Setup:** A Singapore company reconciling their DBS Current account for January 2025. They have 5 unreconciled bank records and 8 cashflow transactions.

**Input (bank records):**
- BR-001: +$2,500.00 on Jan 15, "Acme Corp — TRF"
- BR-002: -$800.00 on Jan 18, "Office Supplies"
- BR-003: +$5,200.00 on Jan 20, "CustomerX batch payment"
- BR-004: -$25.00 on Jan 31, "Monthly service charge"
- BR-005: +$3,000.00 on Jan 22, "CustomerY"

**Input (transactions):**
- TXN-001: PAYIN $2,500.00 on Jan 14, contact "Acme Corporation", ref "INV-001"
- TXN-002: PAYOUT $800.00 on Jan 17, contact "Staples SG", ref "BILL-015"
- TXN-003: PAYIN $2,200.00 on Jan 19, contact "CustomerX Pte Ltd", ref "INV-010"
- TXN-004: PAYIN $3,000.00 on Jan 19, contact "CustomerX Pte Ltd", ref "INV-011"
- TXN-005: PAYIN $3,000.00 on Jan 21, contact "CustomerY Ltd", ref "INV-020"

**Results:**

| Match | Type | Confidence | Bank | Txn | Reason |
|-------|------|-----------|------|-----|--------|
| 1 | 1:1 | exact | BR-001 ($2,500) | TXN-001 ($2,500) | Amount + contact match |
| 2 | 1:1 | high | BR-002 ($800) | TXN-002 ($800) | Amount match, date 1 day apart |
| 3 | N:1 | high | BR-003 ($5,200) | TXN-003 + TXN-004 ($2,200 + $3,000) | Batch deposit: 2 invoices = 1 bank entry |
| 4 | 1:1 | high | BR-005 ($3,000) | TXN-005 ($3,000) | Amount + contact match |

**Unmatched:** BR-004 ($25 service charge) — no transaction in books. Create a cash-out journal for bank fees.

**Match rate:** 80% of records matched (4/5), 80% of matched amount.

---

## Cross-Currency Matching

When bank records and transactions are in different currencies, the calculator applies a wider tolerance based on FX variance:

- Default FX tolerance: 5% of the amount (`fxTolerancePct: 0.05`)
- Transactions flagged with `crossCurrency: true` get the wider tolerance
- If `exchangeRates` are provided in options, the calculator converts to functional currency for comparison

```json
{
  "options": {
    "currency": "SGD",
    "exchangeRates": { "USD": 1.35, "EUR": 1.45 },
    "fxTolerancePct": 0.05
  }
}
```

---

## Integration with Bank Recon Job

This calculator is designed to work as a pre-matching step in the `clio jobs bank-recon` workflow:

1. **Pull data:** Fetch unreconciled bank records + cashflow transactions from Jaz API
2. **Run matcher:** `clio jobs bank-recon match --input data.json --json`
3. **Review matches:** High/exact confidence matches can be auto-reconciled; medium/low need manual review
4. **Resolve unmatched:** Use Path B/C/D from the bank recon job for remaining items

**Performance:** <50ms for 500 records x 2,000 transactions. Scales linearly for Phases 0-2, exponentially bounded for Phases 3-5 (controlled by `--max-group`).
