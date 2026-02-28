# Recipe: Employee Benefit Accruals — Leave + Bonus (IAS 19)

## Scenario

Your company has 20 employees, each entitled to 14 days annual leave. Total annual leave cost is $84,000. IAS 19.13 requires the leave obligation to be accrued over the year as employees earn it. Separately, you accrue a quarterly bonus of 5% of revenue, settled annually after year-end performance review.

**Pattern:** Scheduler (leave — fixed monthly) + manual journals (bonus — variable quarterly)

---

## Accounts Involved

| Account | Type | Subtype | Role |
|---|---|---|---|
| Leave Expense | Expense | Expense | Monthly leave accrual charge |
| Accrued Leave Liability | Liability | Current Liability | Obligation for earned but unused leave |
| Bonus Expense | Expense | Expense | Quarterly bonus accrual charge |
| Accrued Bonus Liability | Liability | Current Liability | Obligation for estimated bonus |
| Cash / Bank Account | Asset | Bank | Settlement on payout |

---

## Journal Entries

### Part A: Annual Leave Accrual (Monthly — Scheduler)

**Monthly amount:** Total annual leave cost / 12

```
$84,000 / 12 = $7,000 per month
```

| Line | Account | Debit | Credit |
|---|---|---|---|
| 1 | Leave Expense | $7,000 | |
| 2 | Accrued Leave Liability | | $7,000 |

**Scheduler settings:**
- Frequency: Monthly
- Start date: 2025-01-31
- End date: 2025-12-31
- Description: `Annual leave accrual — {{MONTH_NAME}} {{YEAR}}`
- Capsule: "FY2025 Annual Leave Accrual"

### Part A — Year-End True-Up

At year-end, compare the accrued balance ($84,000) against actual leave liability:
- If employees used less leave than expected → liability stays higher, no adjustment needed (or reduce if policy allows forfeit)
- If employees used more leave → reduce the liability with an adjustment journal

**Payout on resignation/termination:**
| Line | Account | Debit | Credit |
|---|---|---|---|
| 1 | Accrued Leave Liability | *payout amount* | |
| 2 | Cash / Bank Account | | *payout amount* |

### Part B: Bonus Accrual (Quarterly — Manual Journals)

**Quarterly calculation:** 5% × quarterly revenue

| Line | Account | Debit | Credit |
|---|---|---|---|
| 1 | Bonus Expense | *estimated bonus* | |
| 2 | Accrued Bonus Liability | | *estimated bonus* |

### Part B — Year-End True-Up and Settlement

When the actual bonus is determined (e.g., board approves $180,000 against $200,000 accrued):

**Reversal of over-accrual:**
| Line | Account | Debit | Credit |
|---|---|---|---|
| 1 | Accrued Bonus Liability | $20,000 | |
| 2 | Bonus Expense | | $20,000 |

**Payment:**
| Line | Account | Debit | Credit |
|---|---|---|---|
| 1 | Accrued Bonus Liability | $180,000 | |
| 2 | Cash / Bank Account | | $180,000 |

---

## Capsule Structure

**Leave Capsule:** "FY2025 Annual Leave Accrual"
**Capsule Type:** "Employee Benefits"

Contents:
- 12 monthly accrual journals (from scheduler)
- Year-end true-up journal (if needed)
- Payout journals for resignations
- **Total entries:** 12-15

**Bonus Capsule:** "FY2025 Performance Bonus"
**Capsule Type:** "Employee Benefits"

Contents:
- 4 quarterly accrual journals
- Year-end true-up journal
- Settlement payment journal
- **Total entries:** 6

---

## Worked Example

**Leave accrual setup:**
- 20 employees × 14 days × $300/day = $84,000 annual leave cost
- Monthly accrual: $7,000
- Create scheduler: Dr Leave Expense $7,000 / Cr Accrued Leave $7,000, monthly Jan-Dec

**Bonus accrual by quarter:**

| Quarter | Revenue | Bonus (5%) | Journal |
|---|---|---|---|
| Q1 | $800,000 | $40,000 | Dr Bonus Expense $40,000 / Cr Accrued Bonus $40,000 |
| Q2 | $950,000 | $47,500 | Dr Bonus Expense $47,500 / Cr Accrued Bonus $47,500 |
| Q3 | $1,100,000 | $55,000 | Dr Bonus Expense $55,000 / Cr Accrued Bonus $55,000 |
| Q4 | $1,150,000 | $57,500 | Dr Bonus Expense $57,500 / Cr Accrued Bonus $57,500 |
| **Total** | **$4,000,000** | **$200,000** | |

**Year-end true-up:** Board approves $180,000 bonus → reverse $20,000 over-accrual, then pay $180,000.

---

## Enrichment Suggestions

| Enrichment | Value | Why |
|---|---|---|
| Tracking Tag | "Employee Benefits" | Filter all leave + bonus entries |
| Nano Classifier | Department → "Engineering" / "Sales" / etc. | Allocate leave/bonus cost by department |
| Custom Field | "Fiscal Year" → "FY2025" | Link to fiscal year |

---

## Verification

1. **Trial Balance at Jun 30** → Accrued Leave Liability shows $42,000 credit (6 months × $7,000). Accrued Bonus shows $87,500 (Q1 + Q2).
2. **P&L for Q2** → Leave Expense: $21,000 (3 months). Bonus Expense: $47,500.
3. **Trial Balance at Dec 31 (before true-up)** → Accrued Leave: $84,000. Accrued Bonus: $200,000.
4. **After true-up and payment** → Accrued Bonus clears to $0. Bonus Expense net = $180,000.

---

## Variations

**Proportional leave by hire date:** New employees hired mid-year get prorated leave. Adjust the scheduler amount per employee or use manual journals for partial-year hires.

**Bonus based on profit (not revenue):** Same structure, but the quarterly estimate uses profit before bonus. The true-up at year-end adjusts for the circular reference (bonus reduces profit which reduces bonus).

**13th month salary (Philippines / Juan):** Similar to leave accrual — fixed monthly accrual of 1/12 of annual salary, settled in December. Use the scheduler pattern.

**Leave encashment policy:** If unused leave can be cashed out, the accrued liability stays on the balance sheet until encashment or termination. No year-end reversal — only adjustment for forfeited leave (if policy allows).
