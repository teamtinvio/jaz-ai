# Add-Backs Classification Guide

How to identify, classify, and quantify non-deductible expenses for the Singapore CIT computation. Each category maps to a field in `SgFormCsInput.addBacks`. For each item: what it is, why it is non-deductible, where to find it in Jaz, and what questions to ask the user.

**CLI:** `clio jobs statutory-filing sg-cs --input tax-data.json --json`

---

## What Are Add-Backs?

Add-backs are expenses recorded in the P&L that are **not deductible for tax purposes**. They are added back to accounting profit to arrive at the adjusted profit (Form C-S Box 1).

**The rule:** An expense is deductible only if it is (a) wholly and exclusively incurred in the production of income, (b) not capital in nature, and (c) not specifically prohibited by the Income Tax Act.

**Important:** Add-backs increase the adjusted profit and therefore increase the tax payable. Getting them right matters — over-adding inflates the tax bill, under-adding risks IRAS penalties.

---

## Category 1: Depreciation

**Input field:** `addBacks.depreciation`

**What it is:** Accounting depreciation charged on fixed assets (straight-line, reducing balance, etc.) as recorded in the P&L.

**Why non-deductible:** Accounting depreciation is not recognized for Singapore tax purposes. Instead, the taxpayer claims **capital allowances** (tax depreciation) under Sections 19, 19A, 19B, or 14Q of the Income Tax Act. Depreciation is added back; CA is claimed separately.

**Where to find it in Jaz:**

| Source | API Endpoint |
|--------|-------------|
| P&L depreciation expense line | `POST /api/v1/generate-reports/profit-and-loss` |
| FA summary total depreciation | `POST /api/v1/generate-reports/fixed-assets-summary` |
| FA reconciliation depreciation | `POST /api/v1/generate-reports/fixed-assets-recon-summary` |

**GL keywords:** "Depreciation", "Depreciation Expense", "Dep'n"

**Decision tree:**
1. Is there a depreciation expense on the P&L? --> If yes, add back the full amount.
2. Does the FA summary depreciation match the P&L? --> If no, investigate. Manual depreciation journals may exist.
3. Is there any depreciation that was NOT posted through the FA register? --> Check for manual journal entries to depreciation accounts.

**Questions to ask:** None required. Depreciation is ALWAYS added back in full. No exceptions.

---

## Category 2: Amortization

**Input field:** `addBacks.amortization`

**What it is:** Amortization of intangible assets (goodwill, software, patents, trademarks) charged through the P&L.

**Why non-deductible:** Like depreciation, accounting amortization is not a tax deduction. Intangible assets may qualify for capital allowances under Section 19B (IP) if they meet the criteria. The amortization is added back; any qualifying CA is claimed separately.

**GL keywords:** "Amortization", "Amortisation", "Intangible", "Goodwill Impairment"

**Decision tree:**
1. Is there an amortization expense on the P&L? --> If yes, add back the full amount.
2. Does the intangible asset qualify for S19B CA? --> If yes, claim CA separately in the capital allowances section.
3. Is this goodwill amortization from a business acquisition? --> Goodwill does NOT qualify for S19B. Add back with no CA offset.

**Questions to ask:** "Is this amortization for a qualifying intellectual property right (patent, trademark, copyright, registered design, software license)? Or is it goodwill?"

---

## Category 3: ROU Depreciation (IFRS 16)

**Input field:** `addBacks.rouDepreciation`

**What it is:** Depreciation of right-of-use assets recognized under IFRS 16 for operating leases (office leases, equipment leases, vehicle leases).

**Why non-deductible:** IFRS 16 changed lease accounting — operating leases are now capitalized on the balance sheet as ROU assets and depreciated. For tax purposes, IRAS still follows the pre-IFRS 16 treatment: the actual lease payments are the deductible expense, not the ROU depreciation. The ROU depreciation is added back, and the actual lease payments are deducted.

**GL keywords:** "Right-of-Use", "ROU", "Lease Depreciation", "Operating Lease Depreciation"

**Decision tree:**
1. Does the P&L show ROU depreciation? --> If yes, add back the full amount.
2. What are the actual lease payments for the period? --> Deduct via `deductions.actualLeasePayments`.
3. Is there also lease interest? --> Add back via `addBacks.leaseInterest` (Category 4).

**Questions to ask:** "Do you account for operating leases under IFRS 16? If so, what are the actual cash lease payments for the year?"

**Tip:** The net tax effect of IFRS 16 reversal is usually small (add back ROU dep + lease interest, deduct actual payments). But you must do the reversal — simply ignoring it is technically non-compliant.

---

## Category 4: Lease Interest (IFRS 16)

**Input field:** `addBacks.leaseInterest`

**What it is:** Interest expense on the lease liability recognized under IFRS 16. This is the "unwinding" of the discount on the lease liability — a finance cost in the P&L that represents the time value of money component of the lease.

**Why non-deductible:** Same as Category 3 — IRAS does not recognize IFRS 16 lease accounting for tax. The finance cost is added back; the actual lease payments are the deductible amount.

**GL keywords:** "Lease Interest", "Lease Liability Interest", "Finance Cost - Leases", "Interest on Lease Liabilities"

**Decision tree:**
1. Does the P&L show interest on lease liabilities? --> If yes, add back the full amount.
2. Is this already included in a broader "Finance Costs" line? --> Separate the lease interest from other interest (bank loans, etc.). Only lease interest is added back.

**Questions to ask:** "Can you confirm the interest expense breakdown? I need to separate IFRS 16 lease interest from bank loan interest and other finance costs."

---

## Category 5: General Provisions

**Input field:** `addBacks.generalProvisions`

**What it is:** Provisions based on general estimates rather than specific identified events. These include expected credit losses (ECL) under IFRS 9, general warranty provisions, restructuring provisions where costs are not yet incurred, and any "just in case" reserves.

**Why non-deductible:** A general provision is an estimate of a future cost that has not yet been incurred. IRAS requires that the expense be "actually incurred" to be deductible. A specific bad debt write-off (where you can name the debtor and the amount is confirmed uncollectible) IS deductible. A general ECL provision (percentage-based estimate across the whole receivable book) is NOT.

**GL keywords:** "Provision", "ECL", "Expected Credit Loss", "Allowance for Doubtful", "Bad Debt Provision", "Warranty Provision", "Restructuring Provision"

**Decision tree:**
1. Is this a specific write-off of a named receivable? --> Deductible. Do NOT add back.
2. Is this a general/statistical provision (ECL model, percentage-based)? --> Non-deductible. Add back.
3. Is this a reversal of a prior general provision? --> Was it added back in the prior year? If yes, the reversal should be deducted. Consult prior-year tax computation.
4. Is this a warranty provision? --> If general (estimated % of sales), add back. If specific (known warranty claim settled), deductible.
5. Is this a restructuring provision? --> If costs are not yet incurred, add back. If settlement amounts are confirmed and paid, deductible.

**Questions to ask:** "For each provision on the P&L, is this a general estimate or a specific identified amount? For bad debts specifically — are these actual write-offs of named receivables, or ECL model adjustments?"

**Common mistake:** Adding back ALL bad debt expense. Only general provisions are added back. Specific write-offs of identified uncollectible amounts are deductible.

---

## Category 6: Donations

**Input field:** `addBacks.donations`

**What it is:** Donations to approved Institutions of a Public Character (IPCs). These are added back from the P&L and then claimed at 250% as an enhanced deduction.

**Why added back (not why non-deductible):** Donations ARE deductible, but at an enhanced rate of 250% (not 100%). The P&L records the actual donation amount. For the tax computation: add back 100%, then claim 250% via the enhanced deductions section. The net effect is a 150% additional deduction.

**GL keywords:** "Donation", "Charitable Contribution", "Community Chest"

**Decision tree:**
1. Was the donation made to an approved IPC? --> If yes, add back the full amount AND set `enhancedDeductions.donations250Base` to the same amount.
2. Was it a non-IPC donation (e.g., to an overseas charity)? --> Non-deductible and no 250% claim. Add back under `otherNonDeductible` instead.
3. Was it a donation in kind (goods, not cash)? --> IPC donations in kind are valued at market value. Confirm the amount with the user.

**Questions to ask:** "Were these donations made to approved IPCs (Institutions of a Public Character)? Do you have the IPC tax deduction receipts?"

**Tip:** The IRAS website maintains a list of approved IPCs. If the user is unsure, they can check the receipt — IPC receipts state the tax deduction amount and the IPC registration number.

---

## Category 7: Entertainment

**Input field:** `addBacks.entertainment`

**What it is:** The non-deductible portion of entertainment expenses. Business entertainment (client meals, gifts, event hosting) is partially or fully non-deductible depending on the nature.

**Why non-deductible:** Entertainment expenses are deductible only if they are wholly and exclusively incurred in the production of income. IRAS takes a strict view: entertainment of business contacts is generally deductible, but the burden of proof is on the taxpayer. Many companies take a conservative position and add back a portion.

**GL keywords:** "Entertainment", "Meals", "Hospitality", "Client Entertainment", "Staff Entertainment", "Gifts"

**Classification detail:**

| Entertainment Type | Deductible? | Action |
|-------------------|------------|--------|
| Client entertainment (business meal with client) | Yes, if documented | Deductible — do not add back |
| Staff entertainment (team dinner, D&D) | Generally yes | Deductible — do not add back |
| Personal entertainment disguised as business | No | Add back |
| Gifts to clients (> $50/item) | Partial — case by case | Ask the user |
| Club membership fees | No | Add back |

**Decision tree:**
1. What is the total entertainment expense on the P&L? --> Get the full amount.
2. What portion is for genuine business entertainment with documentation? --> This portion is deductible.
3. What portion is questionable or lacks documentation? --> Add back the non-deductible portion.
4. Is there a company policy on entertainment deductibility? --> Many companies apply a blanket non-deductible percentage (e.g., 50%). Ask.

**Questions to ask:** "What percentage of entertainment expenses relates to business purposes with proper documentation? Does your company have a standard policy for the non-deductible portion (e.g., 25%, 50%)?"

---

## Category 8: Penalties and Fines

**Input field:** `addBacks.penalties`

**What it is:** Penalties, fines, and surcharges imposed by government or regulatory bodies.

**Why non-deductible:** Penalties and fines are not incurred in the production of income. They are personal to the company as a consequence of non-compliance. This includes: IRAS tax penalties, ACRA late filing penalties, NEA environmental fines, MOM safety fines, traffic fines, customs penalties.

**GL keywords:** "Penalty", "Fine", "Surcharge", "Late Fee", "Composition Fine", "Court Fine"

**Decision tree:**
1. Is this a government or regulatory penalty/fine? --> Always non-deductible. Add back.
2. Is this a commercial penalty (e.g., late payment interest to a supplier)? --> Usually deductible as it is incurred in the ordinary course of business.
3. Is this a contractual liquidated damages payment? --> Deductible if it is a genuine business expense.

**Questions to ask:** "Are these penalties from government authorities (IRAS, ACRA, MOM, etc.) or commercial penalties (supplier late fees, contract penalties)?"

**Tip:** Government penalties are always non-deductible regardless of size. Even a $50 ACRA late filing fee should be added back if you want a clean computation.

---

## Category 9: Private Car Expenses

**Input field:** `addBacks.privateCar`

**What it is:** Expenses related to S-plated (private) motor vehicles — lease payments, fuel, insurance, repairs, parking, ERP charges.

**Why non-deductible:** Under Section 15(1)(o) of the Income Tax Act, no deduction is allowed for expenses relating to a private passenger car (one that is not a Q-plated, goods vehicle, or excursion bus). This is a blanket prohibition — even if the car is used 100% for business.

**GL keywords:** "Motor Vehicle", "Car", "Vehicle Expense", "Fuel", "Petrol", "Parking", "ERP", "Road Tax", "Vehicle Insurance", "Car Lease"

**Decision tree:**
1. Does the company own or lease motor vehicles? --> If yes, determine the plate type.
2. Is the vehicle S-plated (private registration)? --> ALL expenses are non-deductible. Add back everything.
3. Is the vehicle Q-plated (commercial) or a goods vehicle? --> Expenses are deductible. Do NOT add back.
4. Is the vehicle an employee-benefit car (not company-owned)? --> Different treatment — may be a taxable benefit. Consult a tax agent.

**Questions to ask:** "Does the company have any motor vehicles? If so, are they S-plated (private) or Q-plated (commercial)? Please list all vehicle-related expenses."

**Tip:** Some companies split vehicle expenses between S-plated and Q-plated vehicles in the GL. If they do not, you need to ask the user to provide the breakdown.

---

## Category 10: Capital Expenditure on P&L

**Input field:** `addBacks.capitalExpOnPnl`

**What it is:** Capital items that were expensed on the P&L instead of being capitalized as fixed assets. These are one-off purchases of lasting benefit that should have been recorded as assets.

**Why non-deductible:** Capital expenditure is not deductible as a revenue expense. It should be claimed through capital allowances instead. If a $15,000 air-conditioning unit was expensed under "Repairs & Maintenance", it needs to be added back and then claimed as a CA.

**GL keywords:** Review "Repairs", "Maintenance", "Miscellaneous", "Office Expenses", "General Expenses" for large one-off items.

**Decision tree:**
1. Are there any single expense items exceeding $5,000 in repair/maintenance/miscellaneous accounts? --> Review each.
2. Is the expense for a new asset or an improvement that extends useful life? --> Capital in nature. Add back.
3. Is the expense for routine maintenance or repair to restore original condition? --> Revenue in nature. Deductible. Do not add back.
4. Does the item meet a capital allowance category? --> If yes, add back AND include in CA schedule.

**Questions to ask:** "I see a $X expense in [account name]. Is this a new purchase (capital) or a repair/maintenance of an existing item (revenue)?"

**Tip:** The $5,000 threshold is a practical guideline, not a legal rule. A $500 printer is capital in nature but immaterial. Most SMBs and tax agents apply a materiality threshold of $1,000-$5,000 for this review.

---

## Category 11: Unrealized FX Loss

**Input field:** `addBacks.unrealizedFxLoss`

**What it is:** Foreign exchange losses on the revaluation of foreign currency assets and liabilities at the balance sheet date that have not been settled (crystallized) in cash.

**Why non-deductible:** An unrealized FX loss is a paper loss — the underlying transaction has not been settled, so the loss has not been "incurred" in the IRAS sense. Only realized FX losses (from actual settlement of foreign currency transactions) are deductible.

**GL keywords:** "Unrealized", "Unrealised", "FX Loss", "Foreign Exchange Loss", "Exchange Difference", "Currency Revaluation"

**Decision tree:**
1. Does the P&L show a foreign exchange loss? --> Investigate whether it is realized or unrealized.
2. Was the loss created by a year-end revaluation of balances? --> Unrealized. Add back.
3. Was the loss created by settling a foreign currency invoice at a different rate? --> Realized. Deductible. Do not add back.
4. Is the FX loss account a single combined line (realized + unrealized)? --> Ask the user to separate them, or use Jaz FX revaluation journals to isolate the unrealized portion.

**Questions to ask:** "Does your FX loss account combine realized and unrealized amounts? Can you confirm the split? If you ran FX revaluation at year-end, the revaluation journal amount is the unrealized portion."

**Corresponding deduction:** Unrealized FX gains (`deductions.unrealizedFxGain`) are deducted for the same reason — not yet crystallized, not taxable.

---

## Category 12: Exempt Dividends

**Input field:** `addBacks.exemptDividends`

**What it is:** Dividend income received from Singapore-resident companies under the one-tier corporate tax system.

**Why non-taxable:** Under Section 13(26) of the Income Tax Act, one-tier dividends are exempt from tax in the hands of the recipient. The paying company has already been taxed on the underlying income. Adding back exempt dividends removes them from the adjusted profit so they are not taxed again.

**GL keywords:** "Dividend Income", "Dividend Received", "Investment Income"

**Decision tree:**
1. Does the P&L show dividend income? --> If yes, determine the source.
2. Is the dividend from a Singapore-incorporated company? --> One-tier exempt. Add back the full amount.
3. Is the dividend from a foreign company? --> May or may not be exempt. Foreign-sourced dividends are exempt under Section 13(8) if certain conditions are met (headline tax rate >= 15% in the source country, income was subject to tax). If exempt, add back. If not exempt, do not add back. This may disqualify the company from Form C-S.
4. Is the dividend from a REIT or unit trust? --> Different treatment. Consult a tax agent.

**Questions to ask:** "Are the dividends received from Singapore-resident companies (one-tier)? Or are they from foreign companies? If foreign, which country and were they subject to tax there?"

---

## Category 13: Other Non-Deductible

**Input field:** `addBacks.otherNonDeductible` (with `addBacks.otherDescription`)

**What it is:** A catch-all for non-deductible items that do not fit the 12 specific categories above.

**Common items in this category:**
- Pre-incorporation expenses (incurred before the company was incorporated)
- Political contributions
- Non-IPC donations (charitable donations to non-approved organizations)
- Gifts to directors/shareholders that are not employment-related
- Legal costs for capital transactions (e.g., share issuance, acquisition legal fees)
- Impairment losses on investments

**Decision tree:**
1. Have you reviewed all 12 categories above? --> If yes and items remain, classify here.
2. Is the expense "wholly and exclusively" for producing income? --> If no, add back.
3. Is the expense capital in nature? --> If yes and not covered by CA, add back.
4. Is the expense specifically prohibited by the ITA? --> If yes, add back.

**Questions to ask:** "Are there any other expenses you believe should not be tax-deductible? For example, pre-incorporation costs, political donations, or legal fees for capital transactions?"

**Always provide a description** in `addBacks.otherDescription` so the workpaper is auditable.

---

## Add-Back Summary Table

| # | Category | Input Field | Always? | Typical SMB Amount |
|---|----------|------------|---------|-------------------|
| 1 | Depreciation | `depreciation` | Always | $10K-$100K |
| 2 | Amortization | `amortization` | If intangibles exist | $0-$50K |
| 3 | ROU Depreciation | `rouDepreciation` | If IFRS 16 leases | $0-$50K |
| 4 | Lease Interest | `leaseInterest` | If IFRS 16 leases | $0-$10K |
| 5 | General Provisions | `generalProvisions` | If provisions charged | $0-$50K |
| 6 | Donations | `donations` | If IPC donations made | $0-$10K |
| 7 | Entertainment | `entertainment` | If entertainment costs | $0-$20K |
| 8 | Penalties & Fines | `penalties` | If penalties incurred | $0-$5K |
| 9 | Private Car | `privateCar` | If S-plated vehicles | $0-$30K |
| 10 | Capital Exp on P&L | `capitalExpOnPnl` | If found during review | $0-$20K |
| 11 | Unrealized FX Loss | `unrealizedFxLoss` | If FX reval performed | $0-$50K |
| 12 | Exempt Dividends | `exemptDividends` | If SG dividends received | $0-varies |
| 13 | Other | `otherNonDeductible` | Catch-all | $0-varies |

---

## Corresponding Deductions (Further Deductions)

When certain items are added back, a corresponding deduction may apply. The deductions are entered in `SgFormCsInput.deductions`:

| Add-Back | Corresponding Deduction | Field |
|----------|------------------------|-------|
| ROU Depreciation + Lease Interest | Actual lease payments | `deductions.actualLeasePayments` |
| Unrealized FX Loss | Unrealized FX Gain (if any) | `deductions.unrealizedFxGain` |
| Exempt Dividends | Already excluded via add-back | (no additional deduction needed) |
| Donations | 250% enhanced claim | `enhancedDeductions.donations250Base` |

---

## Practitioner Tips

**Work through every category, even if zero.** Set unused add-back fields to `0.00` explicitly. This makes the workpaper complete and auditable — it shows the preparer considered each category and determined it was not applicable.

**Depreciation is non-negotiable.** It is always the first and usually the largest add-back. If the P&L shows zero depreciation, verify — the company may not have any fixed assets, or depreciation may not have been posted (which is a bookkeeping error to flag).

**General provisions vs specific write-offs is the most common judgment call.** When in doubt, ask the user to describe the nature of the provision. If they say "we estimated X% of receivables might go bad" — that is a general provision (add back). If they say "ABC Pte Ltd went into liquidation and owes us $15,000" — that is a specific write-off (deductible).

**S-plated car expenses are a frequent IRAS audit target.** IRAS regularly checks that companies are not claiming tax deductions on private car expenses. Ensure the full amount is added back — including fuel, parking, ERP, insurance, and maintenance.

**Keep workpaper notes.** For each add-back category, record a one-line note explaining the source and reasoning. The `addBacks.otherDescription` field covers the "other" category, but you should also document the rationale in the computation narrative. The CLI `workings` output helps with this.
