# Recipe: Intercompany Transactions

## Scenario

Your Singapore holding company (Entity A) provides management services to its Malaysian subsidiary (Entity B) at $15,000 per month. Both entities are on Jaz. At month-end, Entity A invoices Entity B, and each entity records mirrored journal entries. A capsule in each entity tracks the full intercompany lifecycle — charges, settlements, and reconciliation.

**Pattern:** Manual journals mirrored in two entities + capsule in each entity

---

## Accounts Involved

### Entity A (Service Provider)

| Account | Type | Subtype | Role |
|---|---|---|---|
| Intercompany Receivable — Entity B | Asset | Current Asset | Amount owed by Entity B |
| Management Fee Income | Revenue | Revenue | Service charge recognized |
| Cash / Bank Account | Asset | Bank | Receives settlement payment |

### Entity B (Service Recipient)

| Account | Type | Subtype | Role |
|---|---|---|---|
| Intercompany Payable — Entity A | Liability | Current Liability | Amount owed to Entity A |
| Management Fee Expense | Expense | Expense | Service charge incurred |
| Cash / Bank Account | Asset | Bank | Sends settlement payment |

---

## Journal Entries

### Step 1: Service Charge (Entity A — Provider)

**Option A — Invoice:** Create an invoice from Entity A to Entity B (preferred if you want AR aging and payment tracking):
- Invoice: $15,000 to "Entity B" contact
- Coded to Management Fee Income
- Assign to capsule

**Option B — Manual journal:** If you want to bypass AR/AP:

| Line | Account | Debit | Credit |
|---|---|---|---|
| 1 | Intercompany Receivable — Entity B | $15,000 | |
| 2 | Management Fee Income | | $15,000 |

### Step 2: Corresponding Entry (Entity B — Recipient)

**Option A — Bill:** Create a bill from Entity A in Entity B's books:
- Bill: $15,000 from "Entity A" contact
- Coded to Management Fee Expense
- Assign to capsule

**Option B — Manual journal:**

| Line | Account | Debit | Credit |
|---|---|---|---|
| 1 | Management Fee Expense | $15,000 | |
| 2 | Intercompany Payable — Entity A | | $15,000 |

### Step 3: Settlement (cash transfer)

**Entity A (receives cash):**
- Record receipt against the invoice, or:
- Dr Cash / Cr Intercompany Receivable — Entity B

**Entity B (sends cash):**
- Record payment against the bill, or:
- Dr Intercompany Payable — Entity A / Cr Cash

---

## Capsule Structure

**Entity A Capsule:** "Intercompany — Q1 2025 — Entity A → Entity B"
**Entity B Capsule:** "Intercompany — Q1 2025 — Entity A → Entity B"
**Capsule Type:** "Intercompany"

Contents per entity:
- 3 monthly charge entries (invoices/bills or journals)
- Settlement entries
- **Total entries per entity:** 4-6 per quarter

---

## Worked Example

**Setup:**
- Management fee: $15,000/month
- Entities: Entity A (Singapore) and Entity B (Malaysia)
- Quarter: Q1 2025 (Jan, Feb, Mar)

**Jan 31 — Entity A:**
- Create invoice: $15,000 to Entity B
- Code to Management Fee Income
- Capsule: "Intercompany — Q1 2025 — Entity A → Entity B"
- Custom field: "Intercompany Ref" → "IC-2025-001"

**Jan 31 — Entity B:**
- Create bill: $15,000 from Entity A
- Code to Management Fee Expense
- Capsule: "Intercompany — Q1 2025 — Entity A → Entity B"
- Custom field: "Intercompany Ref" → "IC-2025-001"

*Repeat for Feb and Mar with matching Intercompany Ref.*

**Mar 31 — Quarterly settlement:**
- Entity B transfers $45,000 to Entity A
- Entity A: record receipt against 3 invoices
- Entity B: record payment against 3 bills
- Both capsules now show matching charge + settlement entries

**Consolidation verification:**
- Entity A: Intercompany Receivable $0, Management Fee Income $45,000
- Entity B: Intercompany Payable $0, Management Fee Expense $45,000
- On consolidation: both entries eliminate (income vs. expense, receivable vs. payable)

---

## Enrichment Suggestions

| Enrichment | Value | Why |
|---|---|---|
| Tracking Tag | "Intercompany" | Filter all IC entries across entities |
| Custom Field | "Intercompany Ref" → "IC-2025-001" | **Critical** — matching reference in both entities for reconciliation |
| Custom Field | "Counterparty Entity" → "Entity B" | Identify the other party |
| Nano Classifier | Service Type → "Management Fee" | Categorize the type of IC charge |

---

## Verification

1. **Intercompany Reconciliation** → At any point, Entity A's Intercompany Receivable balance should equal Entity B's Intercompany Payable balance. Any mismatch indicates a missing or incorrect entry.
2. **Trial Balance** → After settlement, both Intercompany Receivable and Intercompany Payable should be $0.
3. **P&L match** → Entity A's Management Fee Income = Entity B's Management Fee Expense (same amounts, opposite directions).
4. **Custom Field search** → Search both entities for matching "Intercompany Ref" values to verify every charge has a counterpart.

---

## Variations

**Cross-currency intercompany:** If Entity A is SGD and Entity B is MYR, use the FX invoice/bill format: `currency: { sourceCurrency: "SGD" }` on Entity B's bill. FX differences are auto-handled. For manual journals, apply the spot rate and record any FX difference.

**Cost allocation (not a service fee):** If Entity A allocates shared costs (rent, IT, insurance) to Entity B, the pattern is the same but the income account may be "Intercompany Cost Recovery" (contra-expense) instead of revenue.

**Netting:** If both entities charge each other (e.g., A provides management, B provides warehousing), net the amounts and settle only the difference. Each entity still records the full gross charges — netting applies only to the cash settlement.

**Transfer pricing:** Ensure intercompany prices are at arm's length for tax compliance. Document the pricing methodology in the capsule custom field (e.g., "TP Method" → "Cost Plus 10%").

**Loan vs. trade:** If the intercompany transaction is a loan (not a service), use Intercompany Loan Receivable/Payable instead of trade accounts. Interest may apply — use the loan recipe for interest calculations.
