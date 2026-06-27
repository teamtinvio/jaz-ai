# Claim Settings — Claim Types, Claim Profiles, Posting Rules

Configuration for the employee-expense **Claims** feature (Settings → Claim Settings).
Three master-data entities, each with full CRUD + search. Employees, claims, and
claim → journal conversion build on top of this config (separate surface).

One MCP namespace wraps all three: **`claim_settings`**. CLI: `clio claim-types …`,
`clio claim-profiles …`, `clio posting-rules …`. Each entity supports
`list / get / search / create / update / delete`.

## Entities

| Entity | What it is | Key fields |
|--------|-----------|-----------|
| **Claim Type** | An expense category (e.g. "Travel", "Meals"). | `name` (unique/org), `expenseAccountResourceId`, `taxProfileResourceId`, `classifierConfig`, `isDefault` |
| **Claim Profile** | A per-employee policy bundle (who approves, spend limits, which types are visible, the liability account). | `name` (unique/org), `approverUserResourceId`, `visibleClaimTypeIds[]`, `visibleTaxProfileIds[]`, `visibleClassifierIds[]`, `visibleVendorResourceIds[]`, `allowedCurrencies[]`, `minClaimAmount`, `maxClaimAmount`, `maxPerPeriodAmount`, `perPeriod`, `employeeBalanceAccountResourceId`, `digestEmailEnabled`, `taxMode`, `isDefault` |
| **Posting Rule** | How approved claims group into journals at conversion (the "Posting Rules" tab). | `name` (unique/org), `outerAxis`, `innerAxis`, `lineDescriptionTemplate`, `journalReferenceTemplate`, `defaultBankAccountResourceId`, `defaultIncludeReimbursementPayout`, `isDefault` |

## Enums (use EXACT values)

- **Claim Profile `perPeriod`**: `DAILY` `WEEKLY` `MONTHLY` `QUARTERLY` `YEARLY`
- **Claim Profile `taxMode`**: `NO_TAX` `INCLUSIVE` — `EXCLUSIVE` is reserved and **rejected** server-side.
- **Posting Rule `outerAxis`** (outer grouping): `PER_EMPLOYEE` `PER_VENDOR` `PER_PAIR` `ONE_BATCH` `PER_CLAIM`
- **Posting Rule `innerAxis`** (line aggregation): `RAW` `BY_CT_TP_NC` `BY_CT_TP_NC_EMPLOYEE` `BY_CT_TP_NC_VENDOR`

## Gotchas (verified live)

1. **Create returns the FULL entity** in `{ data: { … } }` (not just `{ resourceId }`). No follow-up `get_*` needed.
2. **Names are unique per org** (case-insensitive for claim types + posting rules). The `create_*` tools dedup by name and return the existing entity (`_guard: duplicate_skipped`) instead of 422-ing.
3. **`isDefault` auto-true for the first entity.** When an org has zero posting rules, the first one created becomes the default automatically.
4. **The default posting rule cannot be deleted** while it is the default → `422` ("set another rule as default first"). Promote another rule first, then delete.
5. **Updates are partial.** Omitted fields are unchanged. To NULL an optional field, pass it in `clearFields` (tool) / `--clear a,b` (CLI) — these map to the API's `clear<Field>` flags. Posting rules have no clear flags (all fields stay set).
6. **`employeeBalanceAccountResourceId` must be a CURRENT_LIABILITY account** and is required before a profile's employees can be reimbursed at conversion. Once an employee on the profile has a non-zero balance, it can't be changed/cleared.
7. **Profile constraints (server-enforced):** `minClaimAmount ≤ maxClaimAmount`; `maxPerPeriodAmount` requires `perPeriod`.
8. **Posting Rule templates** are Handlebars-style: `lineDescriptionTemplate` (required, e.g. `"{employeeName} - {claimType}"`) and the optional `journalReferenceTemplate` for the parent journal header.

## Search

Standard `{ filter, sort }` envelope (filter-only — no natural-language `query`). Sort keys: `resourceId`, `name`, `isDefault`, `createdAt`, `updatedAt`. Filterable fields mirror the key fields above (name = contains; ids = eq; amounts = gte/lte; flags = boolean).
