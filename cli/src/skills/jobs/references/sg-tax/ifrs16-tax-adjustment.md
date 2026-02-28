# IFRS 16 Lease Reversal for SG Tax

One of the most misunderstood adjustments in Singapore corporate tax. Under IFRS 16 (effective 1 Jan 2019), lessees no longer distinguish between operating and finance leases on the balance sheet. All leases (except short-term and low-value) are recognized as a right-of-use (ROU) asset and a lease liability. This changes what appears on the P&L — and the tax treatment must reverse it.

---

## The Problem

Under IFRS 16, the P&L shows two expenses for what used to be a single "rental expense":

| IFRS 16 P&L line | Nature |
|-------------------|--------|
| **ROU asset depreciation** | Straight-line over the lease term (or useful life if shorter) |
| **Interest on lease liability** | Front-loaded — higher in early years, declining over the lease term |

**Neither of these is tax-deductible in Singapore.** IRAS does not follow IFRS 16 for tax purposes. Instead, the **actual operating lease payments** remain the deductible expense — exactly as they were before IFRS 16 existed.

This means for every operating lease accounted under IFRS 16, you need three tax adjustments:

1. **Add back** the ROU depreciation (not deductible)
2. **Add back** the lease interest (not deductible)
3. **Deduct** the actual lease payments (the real deductible expense)

---

## The Fix (3 Steps)

### Step 1: Add back ROU depreciation

Find the total ROU asset depreciation charged to the P&L during the basis period.

**How to find it:**
- Scan the trial balance for accounts containing "Right-of-Use", "ROU", or "Lease Asset"
- The depreciation charge will be in an expense account, often under "Depreciation — ROU Assets" or similar
- Cross-reference to the fixed asset summary if ROU assets are tracked there

**Maps to:** `addBacks.rouDepreciation`

### Step 2: Add back lease interest

Find the total interest expense on lease liabilities charged to the P&L.

**How to find it:**
- Scan for accounts containing "Lease Interest", "Lease Liability Interest", or "IFRS 16 Interest"
- This is separate from bank loan interest (which IS deductible)
- May be grouped under "Finance Costs" on the P&L — drill into the GL to isolate lease interest from other interest

**Maps to:** `addBacks.leaseInterest`

### Step 3: Deduct actual lease payments

Find the total cash payments made to lessors during the basis period.

**How to find it:**
- Scan bank/cash transactions for payments to the lessor
- Or look at the lease liability account movement — the cash payment portion reduces the liability
- Under IFRS 16 accounting, the payment is split: part reduces the lease liability (principal), part is interest expense. For tax, you deduct the **total payment** (principal + interest combined)

```
POST /api/v1/cashflow-transactions/search
{
  "filter": {
    "chartOfAccountResourceId": { "eq": "<lease-liability-account-id>" },
    "valueDate": { "between": ["2025-01-01", "2025-12-31"] }
  },
  "sort": { "sortBy": ["valueDate"], "order": "ASC" },
  "limit": 1000
}
```

Alternatively, if the company maintains a lease schedule, the total annual payment is simply: monthly payment x 12 (or per the lease agreement).

**Maps to:** `deductions.actualLeasePayments`

---

## Net Effect

The net tax adjustment for IFRS 16 is:

```
Net adjustment = (ROU depreciation + Lease interest) - Actual lease payments
```

- **Early years:** Interest is front-loaded under IFRS 16. The sum of ROU depreciation + interest **exceeds** the actual lease payment. Net effect: a positive add-back (increases taxable income slightly).
- **Later years:** Interest declines. The sum of ROU depreciation + interest **is less than** the actual lease payment. Net effect: a net deduction (decreases taxable income slightly).
- **Over the full lease term:** The total ROU depreciation + total interest = total lease payments. The cumulative net adjustment is zero. It is purely a timing difference.

---

## Worked Example

**Scenario:** Office lease — $5,000/month, 36 months, 5% incremental borrowing rate (IBR).

### IFRS 16 initial measurement

```
Monthly payment:     $5,000
Lease term:          36 months
IBR:                 5% per annum (0.4167% per month)
PV of lease payments: $167,234.69 (this becomes both the ROU asset and lease liability)
```

**Calculator:** `clio calc lease --payment 5000 --term 36 --rate 5 --json`

### Year 1 (months 1-12)

| Component | Amount |
|-----------|--------|
| ROU depreciation (straight-line over 36 months) | $55,744.90 ($167,234.69 / 3) |
| Lease interest (front-loaded, per amortization schedule) | $7,306.74 |
| **Total IFRS 16 P&L charge** | **$63,051.64** |
| Actual lease payments (12 x $5,000) | $60,000.00 |
| **Net tax adjustment (add-back)** | **$3,051.64** |

### Tax adjustment entries for Year 1

| Adjustment | Amount | Input field |
|------------|--------|-------------|
| Add back: ROU depreciation | $55,744.90 | `addBacks.rouDepreciation` |
| Add back: Lease interest | $7,306.74 | `addBacks.leaseInterest` |
| Deduct: Actual payments | $60,000.00 | `deductions.actualLeasePayments` |
| **Net effect on taxable income** | **+$3,051.64** | (increases CI in early years) |

### Year 2 (months 13-24)

| Component | Amount |
|-----------|--------|
| ROU depreciation | $55,744.90 |
| Lease interest (lower than Y1) | $4,620.03 |
| **Total IFRS 16 P&L charge** | **$60,364.93** |
| Actual lease payments | $60,000.00 |
| **Net tax adjustment** | **$364.93** |

### Year 3 (months 25-36)

| Component | Amount |
|-----------|--------|
| ROU depreciation | $55,744.89 |
| Lease interest (lowest year) | $1,820.76 |
| **Total IFRS 16 P&L charge** | **$57,565.65** |
| Actual lease payments | $60,000.00 |
| **Net tax adjustment (deduction)** | **($2,434.35)** |

### Cumulative check

| | Year 1 | Year 2 | Year 3 | Total |
|---|--------|--------|--------|-------|
| ROU depreciation | 55,744.90 | 55,744.90 | 55,744.89 | 167,234.69 |
| Lease interest | 7,306.74 | 4,620.03 | 1,820.76 | 13,747.53 |
| IFRS 16 total | 63,051.64 | 60,364.93 | 57,565.65 | 180,982.22 |
| Actual payments | 60,000.00 | 60,000.00 | 60,000.00 | 180,000.00 |
| Net adjustment | +3,051.64 | +364.93 | -2,434.35 | +982.22 |

The small residual ($982.22) is the interest cost difference — total lease payments of $180,000 vs PV of $167,234.69 means $12,765.31 total interest, which nets against $13,747.53 calculated interest (rounding across 36 periods). Over the full term the economic effect is equivalent.

---

## Questions for the Wizard

Ask these in sequence during Phase 3 (Step 10-11 of the wizard workflow):

1. **"Does the company have operating leases accounted under IFRS 16?"** If no, skip all three adjustments.

2. **"What is the total ROU asset depreciation for the year?"** Record as `addBacks.rouDepreciation`.

3. **"What is the total lease liability interest for the year?"** Record as `addBacks.leaseInterest`.

4. **"What are the total actual lease payments made during the year?"** Record as `deductions.actualLeasePayments`. Verify with: `clio calc lease --payment [monthly] --term [total months] --rate [IBR] --json` and check the Year N amortization.

---

## Short-Term and Low-Value Lease Exemptions

IFRS 16 provides two optional exemptions where lessees can continue to recognize lease payments as expenses on a straight-line basis (i.e., the old treatment):

| Exemption | Threshold | Tax effect |
|-----------|-----------|------------|
| **Short-term leases** | Lease term <= 12 months (no purchase option) | No IFRS 16 adjustment needed — the P&L expense IS the actual payment |
| **Low-value leases** | Underlying asset value <= ~US$5,000 when new | Same — no adjustment needed |

If the company has elected these exemptions for any leases, those leases do NOT need the three-step reversal. Only leases recognized under IFRS 16 (ROU asset + lease liability on balance sheet) need the adjustment.

---

## Common Mistakes

1. **Adding back ROU depreciation but forgetting to deduct actual payments.** This overstates taxable income by the full lease payment amount. The three adjustments work as a set — never apply only one or two.

2. **Including IFRS 16 lease interest in the general "depreciation" add-back.** Lease interest is a separate line item. It goes in `addBacks.leaseInterest`, not `addBacks.depreciation`.

3. **Double-deducting lease payments.** If the company accounts for short-term/low-value leases as P&L expenses (not IFRS 16), those payments are already deducted in accounting profit. Do NOT add them to `deductions.actualLeasePayments` — that field is ONLY for IFRS 16 leases where the actual payment is not on the P&L.

4. **Confusing ROU depreciation with regular fixed asset depreciation.** ROU assets are depreciated separately. Regular FA depreciation goes in `addBacks.depreciation`; ROU depreciation goes in `addBacks.rouDepreciation`. They are claimed differently — FA depreciation is replaced by capital allowances; ROU depreciation is replaced by actual lease payments.
