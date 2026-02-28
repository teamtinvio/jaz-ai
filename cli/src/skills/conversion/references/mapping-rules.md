# Mapping Rules — CoA, Contacts, Tax, Currencies

## Chart of Accounts Mapping

### Fresh Org Strategy (Replace)

When the Jaz org has only default system-generated accounts:

1. **Discover system accounts:** `GET /api/v1/chart-of-accounts/search` — system-generated accounts have `isSystemGenerated: true`. These cannot be deleted.
2. **Skip accounts that already exist** (matched by name or code from probe)
3. **Bulk-upsert source accounts** using `POST /api/v1/chart-of-accounts/bulk-upsert` with `{ accounts: [...] }` wrapper
4. **Match by code first, then name** — if a system account has the same code as a source account, map to it

### Existing Org Strategy (Match)

When the Jaz org has user-customized accounts:

1. **GET all existing accounts** from Jaz
2. **3-tier fuzzy matching** (reuse seeder's proven approach):
   - **Tier 1 — Exact name match:** Case-insensitive exact match on account name
   - **Tier 2 — Fuzzy match (Jaro-Winkler):** JW distance > 0.85 between names
   - **Tier 3 — Token overlap:** Split names into tokens, overlap > 60%
3. **Code as tiebreaker:** If multiple name matches, prefer the one with matching account code
4. **Create missing accounts** for any unmatched source accounts

### Account Type Mapping

Source systems use different classification names. Map to Jaz types:

| Source (common names) | Jaz `classificationType` |
|----------------------|-------------------------|
| Cash, Bank | Bank Accounts |
| Accounts Receivable, Trade Debtors | Current Asset |
| Inventory, Stock | Inventory |
| Prepaid Expenses | Current Asset |
| Fixed Assets, Property/Equipment | Fixed Asset |
| Accumulated Depreciation | Fixed Asset |
| Accounts Payable, Trade Creditors | Current Liability |
| Accrued Liabilities | Current Liability |
| Loans (long-term) | Non-current Liability |
| Owner's Equity, Share Capital | Shareholders Equity |
| Retained Earnings | Shareholders Equity |
| Sales, Revenue, Income | Operating Revenue |
| Cost of Goods Sold, COGS | Direct Costs |
| Operating Expenses | Operating Expense |
| Other Income | Other Revenue |

**Valid `classificationType` values (exactly 13):** Bank Accounts, Cash, Current Asset, Fixed Asset, Non-current Asset, Inventory, Current Liability, Non-current Liability, Shareholders Equity, Operating Revenue, Other Revenue, Direct Costs, Operating Expense

### Clearing Account Creation

For Quick Conversion, create two clearing accounts:

```json
{
  "accounts": [
    {
      "name": "AR Conversion Clearing",
      "code": "1299",
      "classificationType": "Current Asset",
      "description": "Contra account for conversion AR balances — should net to zero"
    },
    {
      "name": "AP Conversion Clearing",
      "code": "2199",
      "classificationType": "Current Liability",
      "description": "Contra account for conversion AP balances — should net to zero"
    }
  ]
}
```

Choose codes that don't conflict with existing accounts. Adjust `1299`/`2199` if those codes are taken.

## Contact Mapping

### Matching Rules
1. **Exact name match** (case-insensitive)
2. **Fuzzy name match** (Jaro-Winkler > 0.85) — handles minor variations like "Pte Ltd" vs "Pte. Ltd."
3. **If no match → create new contact**

### Contact Types
Jaz uses boolean flags, NOT an enum:
- Source "Customer" → `customer: true, supplier: false`
- Source "Supplier" / "Vendor" → `customer: false, supplier: true`
- If both (customer AND supplier) → `customer: true, supplier: true`

### Required Fields
- `name` — the contact's business name
- `billingName` — what shows on invoices/bills (often same as name)
- `customer` — boolean (true if the contact is a customer)
- `supplier` — boolean (true if the contact is a supplier)

### Optional but Recommended
- `email` — for payment reminders
- `phone` — **MUST be E.164** if provided (`+65XXXXXXXX` for SG, `+63XXXXXXXXXX` for PH)
- `currency` — default currency for this contact (for FX contacts)

### Contact API Example
```json
POST /api/v1/contacts
{
  "name": "Acme Corp",
  "billingName": "Acme Corp",
  "customer": true,
  "supplier": false,
  "email": "billing@acme.com"
}
```

## Items/Products Mapping

### Detection
The items extractor detects columns for: name, code, description, type (PRODUCT/SERVICE), sale price, sale account, sale tax profile, purchase price, purchase account, purchase tax profile.

### Item Types
- `PRODUCT` — physical goods (default if type column not present)
- `SERVICE` — services

### Payload Shape
```json
POST /api/v1/items
{
  "internalName": "Widget Pro",
  "itemCode": "WGT-001",
  "type": "PRODUCT",
  "appliesToSale": true,
  "saleItemName": "Widget Pro",
  "salePrice": 99.00,
  "saleAccountResourceId": "<revenue account ID>",
  "saleTaxProfileResourceId": "<SR tax profile ID>",
  "appliesToPurchase": true,
  "purchaseItemName": "Widget Pro",
  "purchasePrice": 65.00,
  "purchaseAccountResourceId": "<COGS account ID>",
  "purchaseTaxProfileResourceId": "<TX tax profile ID>"
}
```

### Key Rules
- Items have **two independent sides** — sale and purchase. Each side has its own account and tax profile.
- Set `appliesToSale: true` if the item has sale pricing/account. Set `appliesToPurchase: true` if it has purchase pricing/account.
- Account and tax profile references use template strings (`{{account:Revenue}}`, `{{taxProfile:SR}}`) resolved at execution time via the probe.
- If the source doesn't distinguish sale vs purchase accounts, use the same account for both.

## Tax Profile Mapping

**Tax profiles are READ-ONLY in Jaz.** They are pre-provisioned per org. You can only discover and map.

### Discovery
```
GET /api/v1/tax-profiles
```
Returns all available tax profiles with `taxTypeCode`, `taxPercentage`, and `description`.

### Common Mappings

**Singapore (GST):**
| Source Tax Code | Jaz taxTypeCode | Rate |
|----------------|-----------------|------|
| GST 9%, Standard Rate | SR | 9% |
| GST on Purchases | TX | 9% |
| Zero Rated | ZR | 0% |
| Exempt | ES | 0% |
| Out of Scope | OS | 0% |
| No Tax | - | Skip tax on line item |

**Philippines (VAT):**
| Source Tax Code | Jaz taxTypeCode | Rate |
|----------------|-----------------|------|
| 12% VAT | S12 | 12% |
| VAT Exempt | VE | 0% |
| Zero Rated | VZ | 0% |

### Exempt Tax Profile Split (Sales vs Purchase)
Jaz has separate exempt tax profiles for sales and purchases. Use the correct one:
- **Invoices / Customer Credit Notes** → exempt profile where `appliesToSale !== false`
- **Bills / Supplier Credit Notes** → exempt profile where `appliesToPurchase !== false`

The probe discovers both: `exemptSalesTaxProfileId` and `exemptPurchaseTaxProfileId`. Using the wrong one may cause validation errors.

### Handling "No Tax" / Tax-Free Items
If a source line item has no tax, omit `taxProfileResourceId` from the line item payload entirely — do NOT set it to a zero-rate profile unless the source explicitly used one.

## Currency Mapping

### Enable Currencies
Before creating any FX transactions or CoA entries with foreign currency:

```
POST /api/v1/organization/currencies
{
  "currencies": ["USD", "EUR", "JPY"]
}
```

**Note:** This is a POST (not PUT).

### Set FYE Exchange Rates
For Quick Conversion, all conversion transactions use the FYE closing rate. Rates MUST be set AFTER currencies are enabled:

```
POST /api/v1/organization-currencies/<code>/rates
{
  "rate": 1.35,
  "rateApplicableFrom": "2023-12-31"
}
```

**Rate direction:** `functionalToSource` — how many units of functional (base) currency = 1 unit of source (foreign) currency. Example: If base is SGD and rate is 1 SGD = 0.74 USD, then rate = 0.74.

**Note:** Rate endpoints use `/organization-currencies` (hyphenated). Enable/disable uses `/organization/currencies` (nested path). These are DIFFERENT endpoints.

**CRITICAL:** The field is `rateApplicableFrom` (NOT `effectiveDate`). Using the wrong field name will silently fail.

## Confidence Scoring

For each mapping, assign a confidence level:

| Confidence | Criteria | Action |
|-----------|---------|--------|
| **High** | Exact match (name or code) | Auto-accept |
| **Medium** | Fuzzy match (JW > 0.85 or token > 60%) | Flag for review |
| **Low** | No match found, creating new | Flag for review |
| **Conflict** | Multiple possible matches | Must resolve manually |

Present all medium, low, and conflict mappings to the human reviewer before proceeding.
