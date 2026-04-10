# Enhanced Deductions for SG Corporate Tax

Enhanced deductions allow companies to claim more than 100% of certain qualifying expenditures as tax deductions. The "base" 100% is already in the P&L (as an expense that reduces accounting profit). The "enhanced" portion is the uplift above 100% — this is the additional tax deduction that must be explicitly claimed.

**Key concept:** The `enhancedDeductions` fields in `SgFormCsInput` capture only the **uplift portion** (the amount above the base 100%). The base is already reflected in accounting profit.

---

## 1. R&D Tax Deduction (S14C / S14E)

Research and development expenditure qualifies for enhanced deductions under two schemes.

### S14C — Standard R&D deduction (no pre-approval needed)

| Item | Detail |
|------|--------|
| **Total deduction** | 250% of qualifying expenditure |
| **Breakdown** | 100% (already in P&L) + 150% uplift |
| **Pre-approval** | Not required |
| **Eligible expenditure** | Staff costs, consumables, IP costs for R&D, outsourced R&D (to SG research institutions) |
| **Cap** | None |

### S14E — Enhanced R&D deduction (requires IRAS pre-approval)

| Item | Detail |
|------|--------|
| **Total deduction** | 400% of qualifying expenditure |
| **Breakdown** | 100% (already in P&L) + 300% uplift |
| **Pre-approval** | Required — must be approved by IRAS before the R&D project starts |
| **Eligible expenditure** | Same categories as S14C, but must meet additional innovation criteria |
| **Cap** | None (but subject to IRAS approval of the specific project) |

### What qualifies as R&D

| Qualifying | NOT qualifying |
|-----------|---------------|
| Staff costs for R&D personnel | Market research or surveys |
| Consumables used in R&D | Routine quality testing |
| Payments to SG research institutions | Capital equipment purchases (claim CA instead) |
| IP costs directly related to R&D | Product adaptation for individual customers |
| Software development for new products | Maintenance of existing software |

### Input mapping

```
enhancedDeductions.rdExpenditure = [qualifying R&D spend]
enhancedDeductions.rdMultiplier = 2.5   (for S14C)
                              or  4.0   (for S14E)
```

The computation engine calculates the uplift as: `rdExpenditure * (rdMultiplier - 1)`

**Example:** $100,000 qualifying R&D under S14C:
- Base deduction (in P&L): $100,000
- Enhanced uplift (150%): $150,000
- Total tax deduction: $250,000
- Additional tax saving: $150,000 x 17% = $25,500

### Questions for the wizard

1. "Does the company perform research and development activities?"
2. "How much was spent on qualifying R&D during the basis period? (Staff costs, consumables, outsourced R&D.)"
3. "Is this under S14C (standard, 250%) or S14E (enhanced, 400%, requires pre-approval)?"
4. "For S14E: has IRAS approval been obtained?"

---

## 2. IP Registration Costs (S14A)

Intellectual property registration costs qualify for enhanced deduction.

| Item | Detail |
|------|--------|
| **Total deduction** | 200% of qualifying costs (first $100,000 per YA) |
| **Breakdown** | 100% (already in P&L) + 100% uplift |
| **Alternative** | 400% if under the IP Development Incentive (IDI) scheme |
| **Cap** | $100,000 of qualifying costs per YA (= max $100,000 uplift at 200%, or $300,000 uplift at 400%) |

### What qualifies

| Qualifying | NOT qualifying |
|-----------|---------------|
| Patent registration (SG or overseas) | Purchase of existing IP rights |
| Trademark registration | IP licensing fees |
| Registered design costs | Copyright (no registration in SG) |
| Plant variety registration | Internal costs of developing the IP |

### Input mapping

```
enhancedDeductions.ipRegistration = [qualifying IP costs, max $100,000]
enhancedDeductions.ipMultiplier = 2.0   (standard)
                              or  4.0   (IDI scheme)
```

The computation engine calculates the uplift as: `ipRegistration * (ipMultiplier - 1)`

**Example:** $30,000 trademark and patent registration costs:
- Base deduction (in P&L): $30,000
- Enhanced uplift (100%): $30,000
- Total tax deduction: $60,000
- Additional tax saving: $30,000 x 17% = $5,100

### Questions for the wizard

1. "Did the company register any patents, trademarks, or designs during the basis period?"
2. "What was the total cost of IP registration?"
3. "Is this under the standard scheme (200%) or the IP Development Incentive (400%)?"

---

## 3. Donation Deductions (S37)

Donations to approved Institutions of a Public Character (IPCs) qualify for a 250% tax deduction.

| Item | Detail |
|------|--------|
| **Total deduction** | 250% of qualifying donations |
| **Breakdown** | 100% (added back from P&L) + 250% claimed as donation relief |
| **Eligible donations** | Cash donations to approved IPCs |
| **Cap** | None per YA |
| **Carry-forward** | Unused donations can be carried forward up to 5 years (FIFO) |

### How donations work in the computation

Donations are handled differently from R&D and IP because they are set off **after** loss relief, not in the enhanced deductions step:

1. **Add-back:** The donation expense is added back to accounting profit (it's in the P&L, but the deduction comes later at 250%)
2. **Enhanced deduction step:** The uplift portion (250% - 100% = 150%) is claimed here as `donations250Base * 1.5`
3. **Donation relief step:** The full 250% amount is set off against chargeable income after loss relief

**Important:** The `addBacks.donations` and `enhancedDeductions.donations250Base` fields must contain the same amount (the base donation amount). The computation engine handles the 250% multiplier and the correct set-off order.

### Input mapping

```
addBacks.donations = [total IPC donations]
enhancedDeductions.donations250Base = [same amount as addBacks.donations]
```

**Example:** $10,000 cash donation to approved IPC:
- Add-back: $10,000 (removes the P&L expense)
- Donation relief: $10,000 x 250% = $25,000 (claimed after loss relief)
- Net tax benefit: $25,000 x 17% = $4,250
- Effective tax saving per dollar donated: 42.5 cents

### Carry-forward rules

- Unused donation deductions carry forward up to **5 years**
- Used on a **FIFO basis** (oldest donations used first)
- Subject to the same shareholding test as loss carry-forwards (>= 50% continuity)
- Input: `donationsCarryForward.broughtForward` (total from prior years, not yet used)

### Questions for the wizard

1. "Were any donations made to approved IPCs during the basis period?"
2. "What was the total donation amount?"
3. "Does the company have any unused donation deductions from prior years? If so, how much and from which YA?"

---

## 4. Renovation & Refurbishment Deduction (S14Q)

Renovation costs for business premises qualify for a special deduction spread over 3 years.

| Item | Detail |
|------|--------|
| **Total deduction** | 100% of qualifying costs over 3 years (33.33% per year) |
| **Cap** | $300,000 per rolling 3-year period |
| **Claimed via** | Capital allowances schedule (category: `renovation`, section S14Q) |
| **Enhanced uplift** | Only if there is a net uplift above what is already claimed via CA |

### What qualifies

| Qualifying | NOT qualifying |
|-----------|---------------|
| General renovation of business premises | New construction or building extension |
| Electrical wiring, plumbing | Land and structural improvements to property |
| Flooring, wall finishes, painting | Purchase of furniture or equipment (use CA instead) |
| Built-in furniture (e.g., reception desk) | Renovation of residential property |
| Signage and window displays | Motor vehicle modifications |
| Doors, windows, partitions | Landscaping |

### How S14Q works in the computation

S14Q renovation costs are primarily claimed through the **capital allowances schedule** — each qualifying renovation cost is entered as a `CaAsset` with `category: 'renovation'`. The CA engine computes the 33.33% annual claim.

The `enhancedDeductions.s14qRenovation` field captures only the **net uplift** — the portion of the S14Q deduction that is not already reflected in the CA schedule. In most cases, this is zero because the full deduction flows through the CA schedule.

Use the uplift field when renovation costs were expensed on the P&L (instead of capitalized) and you need to capture the additional deduction above what the CA schedule provides.

### Input mapping

For capitalized renovation (the normal case):
```
capitalAllowances.assets = [
  {
    description: "Office renovation - FY2025",
    cost: 120000,
    acquisitionDate: "2025-03-15",
    category: "renovation",
    priorYearsClaimed: 0
  }
]
enhancedDeductions.s14qRenovation = 0  (already in CA schedule)
```

For expensed renovation (unusual):
```
enhancedDeductions.s14qRenovation = [net uplift amount]
```

### 3-year rolling cap

The $300,000 cap applies per **rolling 3-year period**, not per YA. If the company spent $200,000 in Year 1, only $100,000 of new renovation in Years 2-3 qualifies. The AI agent should ask about prior year renovation claims to check the cap.

### Questions for the wizard

1. "Did the company incur renovation or refurbishment costs for business premises during the basis period?"
2. "What was the total renovation cost? Was it capitalized as a fixed asset or expensed on the P&L?"
3. "Were any renovation claims made in the prior 2 years? (To check the $300,000 rolling cap.)"

---

## Summary: Enhanced Deduction Input Fields

| Scheme | Input field | Multiplier field | Default | Uplift formula |
|--------|------------|-----------------|---------|----------------|
| R&D (S14C) | `enhancedDeductions.rdExpenditure` | `rdMultiplier` | 2.5 | expenditure x (2.5 - 1) = 150% |
| R&D (S14E) | `enhancedDeductions.rdExpenditure` | `rdMultiplier` | 4.0 | expenditure x (4.0 - 1) = 300% |
| IP (S14A) | `enhancedDeductions.ipRegistration` | `ipMultiplier` | 2.0 | costs x (2.0 - 1) = 100% |
| IP (IDI) | `enhancedDeductions.ipRegistration` | `ipMultiplier` | 4.0 | costs x (4.0 - 1) = 300% |
| Donations (S37) | `enhancedDeductions.donations250Base` | (fixed 250%) | n/a | base x 1.5 (enhanced step) |
| Renovation (S14Q) | `enhancedDeductions.s14qRenovation` | (net uplift) | n/a | typically 0 (flows via CA) |

---

## Common Mistakes

1. **Claiming the full 250% R&D deduction as an add-back.** The base 100% is already in the P&L. Only the uplift (150% or 300%) is the enhanced deduction. If you also add back the R&D expense, you've effectively claimed 350% or 500%.

2. **Not matching donations in add-backs and enhanced deductions.** `addBacks.donations` and `enhancedDeductions.donations250Base` must be the same amount. The add-back removes the P&L expense; the donation relief step claims the full 250%.

3. **Exceeding the IP registration cap.** Only the first $100,000 of qualifying IP costs per YA qualifies. If the company spent $150,000, only $100,000 goes into `enhancedDeductions.ipRegistration`.

4. **Forgetting the S14Q rolling cap.** The $300,000 cap spans 3 years. If $250,000 was claimed in Year 1, only $50,000 of new renovation qualifies in Years 2-3.

5. **Claiming S14E without pre-approval.** The 400% R&D deduction requires IRAS pre-approval BEFORE the project starts. Without it, only S14C (250%) applies.
