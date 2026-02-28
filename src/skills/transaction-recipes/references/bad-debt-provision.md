# Recipe: Bad Debt Provision / Expected Credit Loss (IFRS 9)

## Scenario

Your company has $185,000 in trade receivables across five aging buckets. IFRS 9.5.5.15 requires you to recognize lifetime expected credit losses using the simplified approach (provision matrix). You apply historical loss rates to each aging bucket, calculate the total required allowance, compare it to the existing provision balance, and post a journal for the difference.

**Pattern:** Manual journal + capsule (provision amount recalculated each quarter)

---

## Accounts Involved

| Account | Type | Subtype | Role |
|---|---|---|---|
| Bad Debt Expense | Expense | Expense | Period charge for provision increase |
| Allowance for Doubtful Debts | Asset | Current Asset (contra) | Contra-asset reducing receivables on balance sheet |
| Accounts Receivable | Asset | Current Asset | Trade receivables (affected on write-off only) |

> **Note on write-offs:** When a specific debt is confirmed uncollectible, the write-off journal is: Dr Allowance for Doubtful Debts / Cr Accounts Receivable. Use the `DEBT_WRITE_OFF` payment method in Jaz to record this against the specific invoice.

---

## Journal Entries

### Step 1: Calculate Provision Matrix

Run the aged receivables report and apply loss rates:

| Aging Bucket | Balance | Loss Rate | ECL |
|---|---|---|---|
| Current (not overdue) | | *%* | |
| 1-30 days overdue | | *%* | |
| 31-60 days overdue | | *%* | |
| 61-90 days overdue | | *%* | |
| 91+ days overdue | | *%* | |
| **Total** | | | **Total ECL** |

### Step 2: Provision Adjustment

```
Adjustment = Total ECL − Existing Provision Balance
```

**If increase (ECL > existing provision):**

| Line | Account | Debit | Credit |
|---|---|---|---|
| 1 | Bad Debt Expense | *adjustment* | |
| 2 | Allowance for Doubtful Debts | | *adjustment* |

**If release (ECL < existing provision):**

| Line | Account | Debit | Credit |
|---|---|---|---|
| 1 | Allowance for Doubtful Debts | *adjustment* | |
| 2 | Bad Debt Expense | | *adjustment* |

### Step 3: Write-Off (when confirmed uncollectible)

Use the `DEBT_WRITE_OFF` payment method against the specific invoice:

| Line | Account | Debit | Credit |
|---|---|---|---|
| 1 | Allowance for Doubtful Debts | *write-off amount* | |
| 2 | Accounts Receivable | | *write-off amount* |

---

## Capsule Structure

**Capsule:** "ECL Provision — Q4 2025"
**Capsule Type:** "ECL Provision"

Contents:
- 1 provision adjustment journal per quarter
- Write-off entries as they occur
- **Total entries:** Varies (typically 1 per quarter + write-offs)

---

## Worked Example

**Setup:**
- Reporting date: December 31, 2025
- Existing provision balance: $3,000

**Aged receivables and loss rates:**

| Aging Bucket | Balance | Loss Rate | ECL |
|---|---|---|---|
| Current | $100,000 | 0.5% | $500 |
| 1-30 days | $50,000 | 2% | $1,000 |
| 31-60 days | $20,000 | 5% | $1,000 |
| 61-90 days | $10,000 | 10% | $1,000 |
| 91+ days | $5,000 | 50% | $2,500 |
| **Total** | **$185,000** | **3.24%** | **$6,000** |

**Adjustment:**
```
Required provision: $6,000
Existing provision: $3,000
Increase needed:    $3,000
```

**Dec 31, 2025 — Provision journal:**
- Dr Bad Debt Expense $3,000
- Cr Allowance for Doubtful Debts $3,000
- Description: "ECL provision increase — Q4 2025"
- Assign to capsule

**Use the calculator:** `clio calc ecl --current 100000 --30d 50000 --60d 20000 --90d 10000 --120d 5000 --rates 0.5,2,5,10,50 --existing-provision 3000`

---

## Enrichment Suggestions

| Enrichment | Value | Why |
|---|---|---|
| Tracking Tag | "ECL" | Filter all provision-related entries |
| Tracking Tag | "Bad Debt" | Broader filter including write-offs |
| Custom Field | "Reporting Period" → "Q4 2025" | Link to specific reporting quarter |
| Custom Field | "Aged Receivables Report Date" → "2025-12-31" | Audit trail to source report |

---

## Verification

1. **Trial Balance** → Allowance for Doubtful Debts should equal the Total ECL amount ($6,000) after the adjustment.
2. **P&L for the quarter** → Bad Debt Expense shows only the delta ($3,000), not the full provision.
3. **Balance Sheet** → Accounts Receivable minus Allowance for Doubtful Debts = net realizable value ($185,000 − $6,000 = $179,000).
4. **Group General Ledger by Capsule** → Shows all provision adjustments and write-offs for the period.

---

## Variations

**First-time adoption:** If no existing provision, the full ECL amount is the initial charge. No "adjustment" calculation needed — just post the total.

**Quarterly vs. annual:** IFRS 9 requires assessment at each reporting date. Listed companies do quarterly; SMEs typically do semi-annually or annually. Adjust frequency to match your reporting calendar.

**Specific provision overlay:** In addition to the matrix (general provision), you may identify specific receivables that require a higher provision (e.g., a customer in bankruptcy). Add the specific overlay amount to the matrix total.

**Recovery of written-off debt:** If a previously written-off customer pays, record: Dr Cash / Cr Bad Debt Expense (or Cr Allowance). This can be handled as a regular receipt against the original invoice using the "Payment" method in Jaz.

**Loss rate calibration:** Loss rates should be based on historical data (typically 3-5 years of actual write-offs by aging bucket). Forward-looking adjustments may be needed for macroeconomic conditions (IFRS 9.5.5.17).
