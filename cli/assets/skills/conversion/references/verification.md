# Verification — TB Comparison and Checklist Generation

## Post-Execution Verification Flow

After all conversion transactions are created, verify accuracy by comparing the Trial Balance on Jaz against the source TB.

### Step 1: Pull Jaz Trial Balance

```
POST /api/v1/generate-reports/trial-balance
{
  "startDate": "<FY start date>",
  "endDate": "<FYE date>"
}
```

This returns all account balances for the specified period. The response may be wrapped as `{ data: [...] }` or `{ data: { data: [...] } }` — handle both formats.

**Note:** This is a POST to `/generate-reports/trial-balance` (NOT a GET to `/reports/trial-balance`).

### Step 2: Parse Source Trial Balance

From the parsed input files, extract the source TB with:
- Account code
- Account name
- Debit balance (or positive amount)
- Credit balance (or negative amount)

### Step 3: Compare

For each account, compare:
```
Difference = Jaz balance - Source balance
```

**Tolerance:** $0.00 — there should be NO difference. Even $0.01 must be investigated and resolved.

### Step 4: Categorize Differences

| Category | Likely Cause | Fix |
|----------|-------------|-----|
| **Missing account** | Account exists in source but not in Jaz | Create the account + journal entry for the balance |
| **Extra account** | Account in Jaz but not in source | Check if it's a system account (ignore) or a mapping error |
| **Amount mismatch ≤ $1** | FX rounding | Small adjustment journal with note |
| **Amount mismatch > $1** | Missing or extra transaction | Investigate GL detail, find the discrepancy |
| **AR/AP mismatch** | Clearing account didn't net to zero | Check conversion invoices/bills vs TTB |
| **Sign reversal** | Debit/credit direction wrong | Reverse the journal entry or void and recreate |

### Step 5: Fix and Re-Verify

After each fix:
1. Pull Jaz TB again
2. Compare again
3. Repeat until all differences are resolved

## Verification Checklist Format

Generate a checklist in this format for customer sign-off:

```
CONVERSION CHECKLIST
====================
Client:     <Company Name>
Source:      <Source System (e.g., Xero, QuickBooks)>
Type:        <Quick Conversion / Full Conversion>
FYE Date:    <e.g., 2023-12-31>
Converted:   <e.g., 2026-02-14>
Converted By: <name>

TRIAL BALANCE COMPARISON (as at <FYE date>)
--------------------------------------------
                            Source          Jaz             Diff
Total Assets                $XXX,XXX.XX     $XXX,XXX.XX     $0.00
Total Liabilities           $XXX,XXX.XX     $XXX,XXX.XX     $0.00
Total Equity                $XXX,XXX.XX     $XXX,XXX.XX     $0.00
Total Revenue               $XXX,XXX.XX     $XXX,XXX.XX     $0.00
Total Expenses              $XXX,XXX.XX     $XXX,XXX.XX     $0.00
--------------------------------------------
Net Balance                 $0.00           $0.00           $0.00

AR / AP VERIFICATION
--------------------------------------------
Open Receivables            $XXX,XXX.XX     $XXX,XXX.XX     $0.00
Open Payables               $XXX,XXX.XX     $XXX,XXX.XX     $0.00
AR Clearing Balance                         $0.00
AP Clearing Balance                         $0.00

ENTITIES CREATED
--------------------------------------------
Chart of Accounts           XX
Contacts                    XX
Tax Profiles (mapped)       XX
Currencies Enabled          XX
Conversion Invoices (AR)    XX
Conversion Bills (AP)       XX
TTB Journal                 1
Lock Date Set               <FYE date>

FX RATES APPLIED
--------------------------------------------
USD                         1.3500
EUR                         1.4500
JPY                         0.0092

NOTES
--------------------------------------------
- <Any adjustments made, rounding notes, special handling>
- <Any known limitations or follow-up items>

Verified by: _______________     Date: _______________
Approved by: _______________     Date: _______________
```

## Detailed Account-Level Comparison

For complex conversions, also generate a per-account comparison:

```
ACCOUNT-LEVEL COMPARISON (as at <FYE date>)
--------------------------------------------
Code    Account Name                Source      Jaz         Diff
1000    Cash at Bank (SGD)          $50,000     $50,000     $0
1001    USD Bank Account            $10,000     $10,000     $0
1100    Accounts Receivable         $25,000     $25,000     $0
1200    Prepaid Expenses            $3,000      $3,000      $0
1299    AR Conversion Clearing      -           $0          $0
...
```

This is the definitive proof that the conversion is accurate. Every account must match.

## Quick Conversion Specific Checks

1. **Clearing accounts net to zero** — both AR and AP clearing
2. **Open AR on Jaz = AR Aging from source** — check total and per-customer
3. **Open AP on Jaz = AP Aging from source** — check total and per-supplier
4. **TB on Jaz = TB from source** — every account
5. **Lock date is set** — prevents accidental edits to historical data
6. **FX rates match** — Jaz closing rates = source closing rates at FYE

## Full Conversion Specific Checks

All Quick checks plus:
1. **TB matches at multiple dates** — not just FYE, also mid-period spot checks
2. **Invoice count matches** — total invoices created = total in source
3. **Payment count matches** — total payments applied = total in source
4. **GL detail spot check** — pick 5-10 random transactions, verify amounts and accounts
5. **Bank reconciliation** — bank records imported match bank statement
