# Jaz API Endpoint Reference: Assets, Deferrals, Leases, Loans, Payroll

> Request/response examples for fixed assets, deferrals, leases, loans, payrun settings and employee pay.
> Base URL, auth, date format, pagination and status codes apply to every endpoint: see [endpoints.md](./endpoints.md), which also indexes every section.

---

## Fixed Assets (Experimental)

> Endpoint availability varies by organization. Use try/catch.

### Create Fixed Asset
POST /api/v1/fixed-assets
```json
{
  "name": "Office Laptop - MacBook Pro",
  "purchaseAmount": 3500.00,
  "purchaseDate": "2026-01-15",
  "depreciationStartDate": "2026-01-15",
  "purchaseAssetAccountResourceId": "fixed-asset-coa-uuid",
  "depreciationMethod": "STRAIGHT_LINE",
  "effectiveLife": 36,
  "depreciableValueResidualAmount": 0,
  "depreciationExpenseAccountResourceId": "depreciation-expense-coa-uuid",
  "accumulatedDepreciationAccountResourceId": "accumulated-depreciation-coa-uuid",
  "saveAsDraft": true
}
```

- `purchaseDate` and `depreciationStartDate`: YYYY-MM-DD (both required; omitting returns 422)
- `purchaseAmount`: Purchase cost (required)
- `purchaseAssetAccountResourceId`: Asset account (required)
- `depreciationMethod`: `"STRAIGHT_LINE"` or `"NO_DEPRECIATION"`
- `effectiveLife`: Integer (months)
- `category`: `"TANGIBLE"` or `"INTANGIBLE"`
- `saveAsDraft`: Defaults to `true`. Set `false` to activate; requires `purchaseBusinessTransactionType` (`PURCHASE`, `SALE`, `JOURNAL_MANUAL`, `JOURNAL_CASHFLOW`, `JOURNAL_DIRECT_CASH_IN`, `JOURNAL_DIRECT_CASH_OUT` or `JOURNAL_CASH_TRANSFER`) + `purchaseBusinessTransactionResourceId`
- Optional string fields (`purchaseBusinessTransactionResourceId`, `capsuleResourceId`) can be safely omitted for drafts
- An active save (`saveAsDraft: false`) also needs `reference` (`FIXED_ASSET_REFERENCE_REQUIRED`; `GET /references/next?type=FIXED_ASSET`) and `typeCode` (`FIXED_ASSET_TYPE_REQUIRED`; `typeName` is overwritten from the type master), plus `category`, `depreciationMethod` and `effectiveLife`. It links ONE purchase line (several lines are separate assets); `purchaseBusinessTransactionResourceId` is the line id from `POST /fixed-assets/eligible-lines/search`, not the document id. The eligible-lines filter also reads `description` and `amount`.

### Response
```json
{ "data": { "resourceId": "asset-uuid" } }
```

### Transfer Fixed Asset (Register Pre-Existing)
POST /api/v1/transfer-fixed-assets

Register an asset purchased before using Jaz, with accumulated depreciation.

```json
{
  "name": "Office Laptop",
  "reference": "FA-000093",
  "category": "TANGIBLE",
  "typeCode": "COMPUTER_AND_ELECTRONIC",
  "typeName": "Computers and Electronics",
  "purchaseAmount": 5000,
  "purchaseDate": "2025-01-15",
  "purchaseAssetAccountResourceId": "asset-coa-uuid",
  "depreciationMethod": "STRAIGHT_LINE",
  "depreciationStartDate": "2026-03-30",
  "effectiveLife": 36,
  "bookValueAccumulatedDepreciationAmount": 1500,
  "accumulatedDepreciationAccountResourceId": "accum-deprec-coa-uuid",
  "depreciationExpenseAccountResourceId": "deprec-expense-coa-uuid",
  "saveAsDraft": false
}
```

- `bookValueAccumulatedDepreciationAmount`: depreciation already incurred before registration (Book Value at Start = purchaseAmount - this value)
- No `purchaseBusinessTransactionType`/`purchaseBusinessTransactionResourceId` (unlike Create, no linked transaction)
- All other fields same as Create

### Close Out / Reopen Fixed Asset
POST /api/v1/close-out/fixed-assets/:resourceId
```json
{ "closeOutDate": "2026-06-30", "resourceId": "asset-uuid" }
```

POST /api/v1/reopen/fixed-assets/:resourceId (no body)

- Close out stops depreciation from that month-end; the asset stays on the register, nothing is reversed and no gain or loss is posted. Needs `ACTIVE` and a method other than `NO_DEPRECIATION`; `closeOutDate` is moved to its month-end and must be before the last depreciation month. Status becomes `CLOSED_OUT`.
- Reopen needs `CLOSED_OUT`; the full schedule is re-posted and the status returns to `ACTIVE`. Edit, sell and discard are refused on a `CLOSED_OUT` asset, so reopen first.

### Bulk Update Fixed Assets
POST /api/v1/fixed-assets/bulk-update

```json
{ "fixedAssets": [{ "resourceId": "asset-uuid", "name": "...", "purchaseDate": "2026-01-15", "...": "every update field" }] }
```

- 1-500 rows, async: returns `{ jobId }`; poll `search_background_jobs`. The ROUTE runs one Update Fixed Asset per row, a **full replace**: an omitted amount or text field is saved as 0 or blank. The `bulk_update_fixed_assets` tool and `clio fixed-assets bulk-update` do not expose that: they read the stored assets (search, 100 ids per request), merge each row over its asset as `update_fixed_asset` does, and submit the merged rows, so a row is `resourceId` plus only the fields to change (`tags` takes `{ add, remove }`). An unknown or repeated `resourceId` fails the whole call before anything is submitted. Calling the route directly, copy every field the row declares: GET returns epoch-millisecond dates and response-only fields; send dates as `YYYY-MM-DD` and leave out anything the row does not declare.
- Dates are `YYYY-MM-DD` (unlike `bulk-upsert`, which takes epoch milliseconds). A record listed twice returns 422.

### Fixed Asset Totals
GET /api/v1/fixed-assets/totals?endDate=YYYY-MM-DD
GET /api/v1/fixed-assets/disposal-totals?endDate=YYYY-MM-DD

- Register totals (purchase amount, accumulated depreciation, net book value) and disposed-asset totals (book value, sale proceeds, gain/loss) as at `endDate` (default today). Disposed assets are not in the register totals. `assetDisposalGainLossAmount`: positive = loss, negative = gain.

### Fixed Asset Schedule
GET /api/v1/fixed-assets/:resourceId/schedule?viewDate=YYYY-MM-DD

- Month-by-month depreciation rows grouped by year (with book value), plus disposal rows once the asset is sold or discarded.
- The route takes only `viewDate`: no paging or range, and an asset runs to 1,200 months. The `get_fixed_asset_schedule` tool and `clio fixed-assets schedule` slice client-side with `fromPeriod` / `toPeriod` (row count from 1, inclusive); the tool returns at most 60 whole rows per call with `totalPeriods` and a `note` naming the next range.

### Preview Custom Schedule / Calculate Disposal (read-only POSTs, nothing saved)
POST /api/v1/fixed-assets/preview-custom-schedule
```json
{ "depreciableValueAmount": 1200, "depreciationStartDate": "2026-01-01", "effectiveLife": 12, "customSchedule": [{ "fromPeriod": 1, "toPeriod": 12, "amount": 100 }] }
```

POST /api/v1/fixed-assets/calculate-disposal
```json
{ "resourceId": "asset-uuid", "depreciationEndDate": "2026-06-30" }
```

- Preview returns `status` (`FULLY_SCHEDULED`, `SHORT`, `OVER`, `INCOMPLETE`), `scheduledAmount`, `difference` (target less scheduled; positive = short), `timeline`, `periods`, `defaultSchedule` (the straight-line split, a starting point to edit) and `errors`. Save the schedule only when `status` is `FULLY_SCHEDULED` with no `errors`.
- Calculate returns `totalAccumulateDepreciationAtDisposal`: depreciation up to and including the month of `depreciationEndDate`, plus any brought in. Net book value = purchase amount less this; gain or loss on a sale = sale amount less net book value (negative is a loss). Run it before Mark as Sold or Discard. 422 if the asset has no depreciation method yet.

- `periods` runs to one entry per month (up to 1,200). The tool and `clio fixed-assets preview-schedule` window `periods` client-side with `fromPeriod` / `toPeriod` (inclusive; stripped before the request, the route binds strictly): the tool returns at most 60 periods per call with `totalPeriods` and a `note` naming the next range, and `timeline` keeps only the segments touching them.

### Search Eligible Lines (what can be registered)
POST /api/v1/fixed-assets/eligible-lines/search

- Bill and journal lines on a Fixed Asset account that no asset has claimed, grouped by document then account. `limit` counts **documents**, not lines. Filter fields: `documentType`, `documentResourceId`, `reference`, `valueDate`, `contactName`, `accountResourceId`, `accountName`, `description`, `amount`.
- To create the asset: `sourceLineResourceId` -> `purchaseBusinessTransactionResourceId`, `documentType` -> `purchaseBusinessTransactionType`, `amount` -> `purchaseAmount`.
- No natural-language `query`: only fixed-asset record search takes one; this search answers 400 `query_not_supported`.

### Search Fixed Asset Types
POST /api/v1/fixed-assets-types/search

- Filter `categoryCode`, `typeName`, `typeCode`. Pick a `typeCode` whose `categoryCode` matches the asset `category`.
- No natural-language `query`: 400 `query_not_supported`.

---

## Deferrals (prepaid expenses and deferred revenue)

A deferral spreads whole bill, invoice or journal lines over months and, when active, posts every release row at once. Routes act as a user: a `jk-` key (`x-jk-api-key`), a personal access token or an OAuth sign-in works. Management credentials (the 48-character organization `API_KEY` header, the management key, the partner API key) are refused with `USER_NOT_AUTHORITY_PERMISSION` (the two deferrals reports accept them); a locked plan returns 403 `NOT_HAVE_ENOUGH_PERMISSION`. Single writes bind strictly: an unknown key is 400 `unknown_field`. Never PUT back a GET response.

### Deferral accounts (set up first)
POST /api/v1/deferral-accounts/search (`searchTerms` string[] is required by the spec; `[]` lists all)
PUT /api/v1/deferral-accounts
```json
{ "accounts": [{ "organizationAccountResourceId": "account-uuid", "deferralAccount": true }] }
```

- Nothing is eligible until an account is marked. Current Asset gives `PREPAID_EXPENSE`, Current Liability gives `DEFERRED_REVENUE`. Marking changes org setup: confirm first. Unmarking an account any deferral (draft included) uses is refused (`DEFERRAL_ACCOUNT_IN_USE`).

### Search Eligible Lines
POST /api/v1/deferrals/eligible-lines/search

- Bill (`PURCHASE`), invoice (`SALE`) and journal lines on a deferral account that no deferral holds, grouped by document then account. `limit` counts **documents**. `amount` is net of tax in base currency. A line with `draftDeferralReference` is held by that draft.

### Deferral Types
POST /api/v1/deferral-types/search

- Filter `categoryCode`, `typeName`, `typeCode`. The same `typeCode` exists in both categories: always filter by `categoryCode`.

- `POST /api/v1/deferrals/preview-custom-schedule` returns up to 1,200 `periods`. The tool and `clio deferrals preview-schedule` window `periods` client-side with `fromPeriod` / `toPeriod` (inclusive; stripped before the request, the route binds strictly): the tool returns at most 60 periods per call with `totalPeriods` and a `note` naming the next range, and `timeline` keeps only the segments touching them.

### Create Deferral
POST /api/v1/deferrals (201, full deferral)
```json
{ "reference": "DF-000001", "sourceLineResourceIds": ["line-uuid"], "typeCode": "INSURANCE", "name": "Annual insurance", "amortizationStartDate": "2026-04-01", "effectiveLife": 12, "amortizationAccountResourceId": "expense-account-uuid", "saveAsDraft": false }
```

- `saveAsDraft` defaults **true**; a draft posts nothing. Amount is not an input: it is the sum of the whole lines, net of tax. Lines must be from one document and one account. Periods are anniversary periods from `amortizationStartDate`, not calendar months. `CUSTOM_SCHEDULE` takes `customSchedule: [{ fromPeriod, toPeriod, amount }]`, checked with `POST /deferrals/preview-custom-schedule` (save only when `status` is `FULLY_SCHEDULED` with no `errors`).

### Update / Delete Deferral
PUT /api/v1/deferrals/:resourceId (`reference` and `resourceId` required; `isDraftToActive: true` activates)
DELETE /api/v1/deferrals/:resourceId

- Partial update: omitted keeps the stored value; text, tags and lists cannot be cleared. Schedule changes on an ACTIVE deferral delete and re-post every row and are refused once a period is locked. `CLOSED_OUT` is refused (`INVALID_DEFERRAL_STATUS`): reopen first. Delete works on any status and is refused under a lock.

### Close Out / Reopen Deferral
POST /api/v1/close-out/deferrals/:resourceId
```json
{ "closeOutDate": "2026-08-15", "resourceId": "deferral-uuid" }
```

POST /api/v1/reopen/deferrals/:resourceId (no body)

- Close out removes rows after the date (used as given, not moved to a month-end) and posts nothing: `remainingAmount` stays on the deferral account.

### Search / Get / Totals / Schedule
POST /api/v1/deferrals/search (`viewStatus`, `endDate` as-at, `filter`, `query`)
GET /api/v1/deferrals/:resourceId
GET /api/v1/deferrals/totals?endDate=&category=
GET /api/v1/deferrals/:resourceId/schedule?viewDate=

- Totals: always pass `category`; prepaid and deferred revenue otherwise add into one meaningless number. Schedule rows are read from posted ledger rows, so a draft has none.
- The schedule route takes only `viewDate`. `get_deferral_schedule` and `clio deferrals schedule` slice client-side with `fromPeriod` / `toPeriod` (row count from 1, inclusive); the tool returns at most 60 whole rows per call with `totalPeriods` and a `note` naming the next range.

### Bulk Create / Update Deferrals
POST /api/v1/deferrals/bulk-upsert
POST /api/v1/deferrals/bulk-update

- 1-500 rows, async: `{ jobId }`, poll `search_background_jobs`. Upsert **creates only**, always ACTIVE, `STRAIGHT_LINE` only, `YYYY-MM-DD` dates. Update rows are partial with `resourceId` and `reference` required per row. A row's `tags` is the whole list and replaces every tag on the deferral, so the tool does not take it: tag changes go through `update_deferral` (add/remove).

### Deferral reports and exports
POST /api/v1/generate-reports/deferrals-summary
POST /api/v1/generate-reports/deferrals-recon-summary (`accountResourceIds` optional)
POST /api/v1/data-exports/deferrals-register
POST /api/v1/data-exports/deferrals-reconciliation-summary (`accountResourceId` required)

---

## Leases (IFRS 16 lessee leases, hire purchase)

Call as a user: a `jk-` key (`x-jk-api-key`), a PAT or an OAuth sign-in works. Management credentials (the 48-character organization API key, the management key, a partner key) are refused `USER_NOT_AUTHORITY_PERMISSION` on every lease route except reports and exports. Leases are locked on plans without a yearly cadence, `GROWTH`, `INTERNAL` or `JOURNAL_ACCOUNTING` (403 `NOT_HAVE_ENOUGH_PERMISSION`). Posting or changing an active lease needs the Admin role. The body binds strictly: an unknown key is 400 `unknown_field`. Dates sent are `YYYY-MM-DD`; dates read back are epoch milliseconds.

- **The register never posts rent.** Rent bills and payments are coded to the current lease liability account; a rent bill coded to Rent Expense double counts. The reconciliation report shows the gap.
- **`discountRate` is % per MONTH**: 6% a year is `0.5`, not `6` and not `0.06`.
- **`customSchedule` is the rent**: `amount` is the rent of each month in the range, ranges cover months 1 to `leaseTerm` with no gap or overlap, at least one above 0.

- `POST /api/v1/leases/preview-rent-schedule` returns up to 600 `periods`. The tool and `clio leases preview-rent` window `periods` client-side with `fromPeriod` / `toPeriod` (inclusive; stripped before the request, the route binds strictly): the tool returns at most 60 periods per call with `totalPeriods` and a `note` naming the next range, and `timeline` keeps only the segments touching them.

### Create Lease
POST /api/v1/leases (returns 201 with the lease)
```json
{
  "reference": "LS-000001", "name": "Office level 3", "typeCode": "OFFICE",
  "commencementDate": "2026-01-01", "leaseTerm": 36, "paymentTiming": "ADVANCE", "discountRate": 0.5,
  "customSchedule": [{ "fromPeriod": 1, "toPeriod": 36, "amount": 5000 }],
  "rouAssetAccountResourceId": "uuid", "accumulatedDepreciationAccountResourceId": "uuid",
  "depreciationExpenseAccountResourceId": "uuid", "leaseLiabilityAccountResourceId": "uuid",
  "interestExpenseAccountResourceId": "uuid", "saveAsDraft": false
}
```
- `saveAsDraft` defaults **true**: a draft posts nothing but returns `leaseLiabilityAmount`, `rouAssetAmount` and `endDate` when the terms already make a schedule. `reference` is required on drafts too (`GET /references/next?type=LEASE`).
- `exemptionType: "EXEMPT"` (short-term or low-value) takes only reference, name, type, start and term, and posts nothing.
- Optional: `contactResourceId` (lessor), `prepaidLeasePaymentsAmount` + account, `restorationCostAmount` + provision account, `ownershipTransfers` + `usefulLife` + `purchaseOptionPrice`, `leaseLiabilityNonCurrentAccountResourceId` (needed when principal falls due after 12 months). Interest Expense must be a Finance Cost account. The five required accounts (right-of-use asset, accumulated depreciation, depreciation expense, current lease liability, interest expense) must all be different (`LEASE_ACCOUNTS_NOT_DISTINCT`); the non-current liability account is added only when principal falls due after 12 months.
- Hire purchase: `POST /leases/calculate-flat-rate` `{ "flatRate": 2.78, "financedAmount": 68000, "leaseTerm": 84, "paymentTiming": "ARREARS" }` returns the monthly `discountRate` (0.4322 here), `instalment`, `finalInstalment`, `totalInterest`. Create with `typeCode: "HIRE_PURCHASE"`, rent `instalment` for months 1 to term-1 and `finalInstalment` for the last, usually `ownershipTransfers: true` with `usefulLife`.

### Update Lease
PUT /api/v1/leases/:resourceId
- Partial: omitted fields keep their value; `reference` and `resourceId` are required. `isDraftToActive: true` activates a draft.
- On an ACTIVE lease, any schedule field (start, term, rent, timing, rate, prepaid, restoration, ownership, any account) rewrites every entry from the start date (past months restated) and is refused once a month is locked. There is no rent review or extension: a genuine mid-life change is terminate plus a new lease, which books a gain or loss.
- Refused on `CLOSED_OUT` and `TERMINATED` leases (`INVALID_LEASE_STATUS`).

### Search Leases / Lease Types
POST /api/v1/leases/search, POST /api/v1/lease-types/search
- Body `filter`, `sort`, `limit`, `offset` (a 0-indexed page), plus `viewStatus` (`ACTIVE`, `DRAFT`, `EXEMPT`, `COMPLETED`, `ENDED`, `CLOSED_OUT`, `TERMINATED`) and `endDate` (the as-at date) on leases. `query` answers 400 `query_not_supported`. A terminated lease shows its liability at termination.
- Figures (`leaseLiabilityRemaining`, `currentPortion`, `nonCurrentPortion`, `rouNetBookValue`) come from the schedule, not the ledger.

### Lease Schedule and Totals
GET /api/v1/leases/:resourceId/schedule?viewDate=YYYY-MM-DD, GET /api/v1/leases/totals?endDate=YYYY-MM-DD
- The schedule route takes only `viewDate`, and a lease runs to 600 months. `get_lease_schedule` and `clio leases schedule` slice client-side with `fromPeriod` / `toPeriod` (`PERIOD` rows by `periodNumber`, inclusive); the tool returns at most 60 months per call with `totalPeriods` and a `note` naming the next range. The RECOGNITION row comes with the first window and a close-out or termination note with the last.
- Totals: `rouNetBookValue`, `leaseLiability`, `currentPortion`, `nonCurrentPortion`; the restoration provision, drafts, exempt, terminated and ended leases are left out.

### Close Out / Reopen Lease
POST /api/v1/close-out/leases/:resourceId `{ "closeOutDate": "2026-06-30", "resourceId": "uuid" }`; POST /api/v1/reopen/leases/:resourceId (no body)
- Close out is **not an exit**: posting stops after the month-end, liability and right-of-use asset stay on the books. To take a lease off the books, terminate it.

### Terminate Lease
POST /api/v1/leases/calculate-termination `{ "resourceId": "uuid", "terminationDate": "2026-09-30" }` (preview, saves nothing); POST /api/v1/terminate/leases/:resourceId `{ "resourceId": "uuid", "terminationDate": "2026-09-30", "terminationGainLossAccountResourceId": "uuid" }`; POST /api/v1/undo-termination/leases/:resourceId (no body)
- Preview first. `terminationGainLossAmount` is positive for a **gain** (the reverse of fixed assets). The gain/loss account is required when it is not 0. The restoration provision is not reversed; a penalty goes on a bill.

### Bulk Update Leases
POST /api/v1/leases/bulk-update `{ "leases": [{ "resourceId": "uuid", "reference": "LS-000001", "name": "..." }] }`
- 1-500 rows, async: returns `{ jobId }`; poll `search_background_jobs`. Each row is the partial update; for renaming or activating drafts, not for rent changes. A row's `tags` is the whole list and replaces every tag on the lease, so the tool does not take it: tag changes go through `update_lease` (add/remove).

### Lease Reports and Exports
POST /api/v1/generate-reports/leases-summary (the IFRS 16 note; `groupBy` `TYPE`, `STATUS` or `ACCOUNT`), POST /api/v1/generate-reports/leases-recon-summary (register vs GL per lease account; `accountResourceIds` optional); POST /api/v1/data-exports/leases-register, POST /api/v1/data-exports/leases-reconciliation-summary (`accountResourceId` required)
- Reports need `REPORTS:ADMIN`. A liability difference in the reconciliation almost always means a rent bill coded elsewhere, posted in another month, or not booked.

---

## Payrun settings and employee pay (pay types, payrun posting rules, pay profiles, employee pay details)

Payruns is a separate module: a plan without it answers 402 `plan_upgrade_required`, and the key's user must be an admin of Employees (403 `NOT_HAVE_ENOUGH_PERMISSION`). Routes sit outside the public spec until launch. Dates sent are `YYYY-MM-DD`; dates read back are epoch milliseconds. Every PUT is partial: an omitted key keeps its value, `clear...: true` empties an optional field, and a list sent (`payTypeLines`, `payTypeInputs`) replaces the whole list. The id in the URL is the one used. Every search takes `filter` only: `query` answers 400 `query_not_supported`. `offset` is a 0-indexed page and `sort` is required with it. An empty search reply has no `data` key. A creating POST answers 201 with the full record. Not the claim posting rules (`/posting-rules`).

### Pay Types
POST /api/v1/pay-types, POST /api/v1/pay-types/search, GET|PUT|DELETE /api/v1/pay-types/:resourceId
- `category` (required) is one of `EARNING`, `OVERTIME`, `ALLOWANCE`, `ADDITIONAL_PAYMENT` (debit account, add to gross pay), `DEDUCTION`, `EMPLOYEE_CONTRIBUTION`, `EMPLOYEE_TAX` (credit account, reduce net pay), `EMPLOYER_CONTRIBUTION`, `EMPLOYER_TAX` (both accounts). A wrong side is 422 `PAY_TYPE_ACCOUNT_NOT_APPLICABLE`. `name` and `code` are unique (case-insensitive).
- A category change must set the new account and clear the old one in the same PUT, and is refused once a draft or finalized payslip line uses the pay type (`categoryLocked`, `PAY_TYPE_IN_USE`). `status` is `ACTIVE` or `INACTIVE`.
- DELETE: refused with `PAY_TYPE_IN_USE` while a pay profile, pay detail or payslip uses it (set it `INACTIVE`). It answers `{ "data": { "deleted": true } }`, and `false` when the record is already gone.

### Payrun Posting Rules
POST /api/v1/payrun-posting-rules, POST /api/v1/payrun-posting-rules/search, GET|PUT|DELETE /api/v1/payrun-posting-rules/:resourceId
- Required: `name`, `netPayAccountResourceId` (an active, non-controlled account that is not a claim profile's balance account). `innerAxis` is `BY_PAY_TYPE` (default), `BY_CATEGORY` or `BY_ACCOUNT`; `journalDatePolicy` is `PAYMENT_DATE` (default), `PERIOD_END` or `CUSTOM`; `outerAxis` is `ONE_BATCH`. A blank template goes back to its default (`PAYRUN-{period}-{payrunName}` for the reference). `journalReferenceTemplate` holds at most 255 characters (`PAYRUN_POSTING_RULE_REFERENCE_TOO_LONG`). Templates take `{payrunName}`, `{payrunReference}` (the payrun's reference, else its name), `{period}`, `{periodStart}`, `{periodEnd}`, `{paymentDate}`; line descriptions add `{payType}`, `{category}`, `{account}`. Any other token is refused (`PAYRUN_POSTING_RULE_TEMPLATE_UNKNOWN_TOKEN`). A written line description is kept as typed.
- One default per organization: the first rule is it, `isDefault: true` moves it. The default cannot be unset or deleted (`PAYRUN_POSTING_RULE_DEFAULT`); a rule a profile or payrun uses cannot be deleted (`PAYRUN_POSTING_RULE_IN_USE`).

### Pay Profiles
POST /api/v1/pay-profiles, POST /api/v1/pay-profiles/search, GET|PUT|DELETE /api/v1/pay-profiles/:resourceId
- Required: `name`, `payFrequency` (`WEEKLY`, `FORTNIGHTLY`, `SEMI_MONTHLY`, `MONTHLY`), `currencyCode` (base or an active currency). `payTypeLines` is `[{ payTypeId, amount? }]`, each pay type once, ACTIVE ones only; a line with no `amount` is set per employee. `prorationType` is `CALENDAR_DAYS`, `WORKING_DAYS` (needs `workWeek` 5, 5.5 or 6) or `FIXED_DAYS` (needs `workWeek` and `daysPerMonth` 1 to 31, MONTHLY only). No `payrunPostingRuleResourceId` means the default rule; `clearPayrunPostingRuleResourceId` goes back to it.
- `payFrequency` and `currencyCode` lock once an employee is on the profile (`PAY_PROFILE_FREQUENCY_CURRENCY_LOCKED`). A profile an employee is or was on cannot be deleted (`PAY_PROFILE_IN_USE`): set it `INACTIVE`.

### Employee Pay Details
POST /api/v1/employee-pay-details, POST /api/v1/employee-pay-details/bulk-create, POST /api/v1/employee-pay-details/search, PUT /api/v1/employee-pay-details/:resourceId (no GET or DELETE)
- Create: `employeeResourceId` (active), `payProfileResourceId` (ACTIVE), `effectiveFromDate` (after the start of the employee's latest pay detail, else 422 `EMPLOYEE_PAY_DETAIL_OVERLAP`), optional `payTypeInputs` `[{ payTypeId, amount }]` and `notes`. A raise is a NEW pay detail from the new date: the previous one ends the day before. A profile line left without an amount needs an input, or populating a payrun skips the employee.
- PUT corrects in place: `payTypeInputs` replaces every figure, `effectiveToDate` ends the pay, `clearEffectiveToDate`, `clearNotes`; the dates change on the employee's latest pay detail only (`EMPLOYEE_PAY_DETAIL_NOT_LATEST`).
- Bulk create `{ "employeePayDetails": [...] }` (max 500) answers 200 with one `{ employeeResourceId, resourceId }` or `{ employeeResourceId, errorCode, errorMessage }` per row, in order. A refused row does not stop the others: read every row.
- Search body takes `filter` (`employeeResourceId`, `payProfileResourceId`, `resourceId`), `sort`, paging and `inForceOn` (`YYYY-MM-DD`: only the pay details in force that day, at most one per employee). Each record carries `lines` and `totals` for one pay period.

### Payruns
POST /api/v1/payruns, POST /api/v1/payruns/search, GET|PUT|DELETE /api/v1/payruns/:resourceId, POST /api/v1/payruns/bulk/delete, POST /api/v1/payruns/:resourceId/employees, POST /api/v1/payruns/:resourceId/employees/remove, PUT /api/v1/payruns/:resourceId/lines, POST /api/v1/payruns/:resourceId/populate, POST /api/v1/payruns/:resourceId/populate/preview, POST /api/v1/payruns/:resourceId/validate, POST /api/v1/payruns/:resourceId/preview-journal, POST /api/v1/payruns/:resourceId/finalize, POST /api/v1/payruns/bulk/finalize, POST /api/v1/payruns/:resourceId/unpost, POST /api/v1/payruns/:resourceId/void, POST /api/v1/payruns/:resourceId/payouts/preview, POST /api/v1/payruns/:resourceId/payouts, POST /api/v1/payruns/payouts/:journalResourceId/void
- A payrun is one run for a period, one `payFrequency` and one `currencyCode`, with a payslip per employee. `payrunType` is `REGULAR` (default) or `OFF_CYCLE`; type, frequency and currency cannot change after create. `status` is `DRAFT`, `FINALIZED` or `VOID`; `payoutStatus` is `UNPAID`, `PARTIALLY_PAID` or `PAID`. Several drafts per period are fine, but only one finalized `REGULAR` run per frequency, currency and period (`PAYRUN_REGULAR_PERIOD_EXISTS`).
- Create (201, the full run): required `name`, `payFrequency`, `currencyCode`, `periodStartDate`, `periodEndDate`, `paymentDate`. `populate: true` fills it at once. `idempotencyKey` (max 255) makes a re-send return the run already created; the same key with a different request is `PAYRUN_IDEMPOTENCY_KEY_IN_USE`. `reference` is unique ignoring case (`PAYRUN_REFERENCE_IN_USE`); a duplicate is a 422, as on the sales families. `GET /references/next?type=PAYRUN` gives the next number.
- PUT is partial and draft only: a finalized run takes one change, its payslip template (`templateResourceId` or `clearTemplateResourceId` sent alone), and Generate Payslips then makes its PDFs with it; any other change to a finalized run, and any change to a void one, is `PAYRUN_NOT_DRAFT`. Clear flags: `clearReference`, `clearInternalNotes`, `clearPayrunPostingRuleResourceId`, `clearTemplateResourceId`. A new period leaves the payslips as they are; refresh them to pro-rate to it.
- DELETE answers `{ "data": { "deleted": true } }` for a new draft. A run finalized and then unposted is refused with `PAYRUN_ALREADY_POSTED`: void it instead (`POST /void`). `POST /bulk/delete` `{ resourceIds }` answers 202 with a `jobId` (job type `BULK_DELETE_PAYRUNS`); a run listed twice is refused before any job starts (`PAYRUN_DUPLICATE`), and each failure is a JSON string in the job's `errorDetails`.
- Search takes `filter` only (`query` is 400 `query_not_supported`) and `payslip: { employeeResourceId, payoutStatus? }` beside it: only runs with a payslip of that employee. An empty answer has no `data` key. `filter` takes `name`, `reference`, `payrunType`, `status`, `payoutStatus`, `payFrequency`, `currencyCode`, `paymentDate`, `periodStartDate`, `periodEndDate` (day expressions, `YYYY-MM-DD`: `eq`, `gt`, `gte`, `lt`, `lte`, `between`), `employeeCount`, `totalNetPayAmount` and `payrunPostingRuleResourceId`. Sort fields: `resourceId`, `name`, `reference`, `payrunType`, `payFrequency`, `currencyCode`, `periodStartDate`, `periodEndDate`, `paymentDate`, `status`, `payoutStatus`, `payrunPostingRuleResourceId`, `employeeCount`, `totalNetPayAmount`, `createdAt`, `updatedAt`.
- Populate (no body) adds every employee not yet in the run whose pay overlaps the period on an active profile with the run's frequency and currency; it never changes an existing payslip, leaves removed employees out (`PAYRUN_EMPLOYEE_REMOVED`) and answers `{ payrun, added, skipped }`, each skipped row with an `errorCode` (an empty list is left out). `populate/preview` answers the same shape and saves nothing; its `added` also lists every active employee with no pay in the period (no `payProfileResourceId`).
- Add employees `{ employeeResourceIds }` gives an employee with no pay in the period an empty payslip (every line is added by hand); the first employee who cannot be added refuses the call. Remove moves them out until they are added again.
- Validate and preview-journal `{ journalValueDate? }` answer 200 with `{ valid, errors? }` (an empty `errors` is left out): a problem is a 200 reply, not a refusal. Each error has `code` (`PAYSLIP_NO_LINES`, `PAYRUN_NET_PAY_NEGATIVE`, `PAYRUN_PERIOD_LOCKED`, `PAYRUN_REGULAR_PERIOD_EXISTS`, `PAYRUN_NO_PAYSLIPS`, `PAYRUN_JOURNAL_EMPTY` and more), `message` and what it is about. The preview adds the journal: `lines` (debits first, net pay one credit last), `totalDebitAmount`, `totalCreditAmount`. An error may carry `payStartDate` (epoch ms, on `PAYRUN_EMPLOYEE_PAY_STARTS_LATER`) and `contextualAttributes` (`[{ columnName, columnValue }]`, e.g. on `PAYRUN_REGULAR_PERIOD_EXISTS` and `PAYRUN_PERIOD_LOCKED`). Finalize, bulk finalize, validate and preview-journal take an optional `payrunPostingRuleResourceId`; finalizing saves it as the payrun's rule.
- Finalize `{ journalValueDate? }` posts one balanced journal, answers the run (`FINALIZED`, one entry in `linkedJournals`) and makes the PDFs afterwards; the first Validate problem refuses it with its code. A finalized run finalizes again unchanged. `POST /bulk/finalize` `{ payruns: [{ payrunResourceId, journalValueDate? }] }` answers 202 (job type `BULK_FINALIZE_PAYRUNS`); a run listed twice is `PAYRUN_DUPLICATE` before any job, a run that cannot go fails on its own in `errorDetails` (job `PARTIAL_SUCCESS`).
- Unpost (no body) voids the journal and the run goes back to `DRAFT`; a run already unposted comes back unchanged. Void `{ voidReason }` (required, max 500) cancels it for good and frees the period for a new `REGULAR` run. Both are refused while a payout is live (`PAYRUN_PAYOUT_LINKED`: void the payouts first) or still going through the payment gateway (`PAYRUN_PAYOUT_DISBURSING`: wait for it or cancel it) and into a locked period (`PAYRUN_PERIOD_LOCKED`). A draft never posted cannot be voided (`PAYRUN_VOID_NEVER_POSTED`: delete it); a run unposted earlier cannot be deleted (`PAYRUN_ALREADY_POSTED`: void it).
- Payouts (`FINALIZED` runs): body `{ payoutMethod, paymentAccountResourceId (preview: optional, a preview without it works out everything else and leaves the account's checks out; recording needs it, `PAYRUN_PAYOUT_ACCOUNT_REQUIRED`; a wrong account is `PAYRUN_PAYOUT_ACCOUNT_NOT_FOUND` on both), valueDate?, reference?, internalNotes?, payslips?: [{ payslipResourceId, amount?, reference? }], hash? }`. `payoutMethod` `RECORD` books money paid outside Jaz (a journal per payslip, debit net pay account, credit the bank or cash account in the run currency); `DISBURSE` pays through a payment gateway and is NOT used by the clio tools or commands, which always send `RECORD`. No `payslips`: every payslip still owed, in full; part amounts are allowed. `payouts/preview` takes the same body and answers 200 with `{ valid, errors?, payouts[] (netPayAmount, paidAmount, owedAmount, payoutAmount, lines), totalPayoutAmount }`. `POST /payouts` answers 202 (job type `PAYRUN_CREATE_PAYOUTS` for `RECORD`). Errors: `PAYRUN_PAYOUT_EXCEEDS_OWED`, `PAYRUN_PAYOUT_NOTHING_OWED`, `PAYRUN_PAYOUT_ACCOUNT_INVALID_TYPE`, `PAYRUN_PAYOUT_ACCOUNT_CURRENCY_MISMATCH`, `PAYRUN_PAYOUT_NOT_FINALIZED`. The payslip `payoutStatus` goes `UNPAID`, `PARTIALLY_PAID`, `PAID`.
- `hash` only dedups while its job runs (the same hash and request returns that job; the same hash with another request is `PAYRUN_PAYOUT_HASH_IN_USE`). Staging, 2026-11-17: the same hash and request sent after the job finished started a second job and recorded a part payout twice. Read the run's `payouts` before sending again.
- The run's `payouts` list each payout with `journalResourceId` and `voidable`. `POST /payouts/:journalResourceId/void` `{ voidReason }` voids a recorded one (the payslip owes it again) and answers the run; deleting its cash entry is refused with `PAYRUN_PAYOUT_LINKED_TO_PAYRUN` (void it from the payrun: `void_payrun_payout`); a gateway payout is refused (`PAYRUN_PAYOUT_DISBURSED`). Payrun payouts also appear in `POST /employees/payouts/search` with `payrunResourceId` and `type` `PAYRUN_PAYOUT`; `payoutType` (`DIRECT_ENTRY` for a recorded payout, `DISBURSEMENT` for a payment gateway payout, `PAYRUN_PAYOUT` for a payrun's payouts, recorded or through the gateway, which the other two leave out; any other value is a 422) and `payoutStatus` are bare arrays in that filter, not `{ eq }` or `{ in }`. `POST /employees/balances/search` rows carry `unpaidPay` (net pay finalized runs still owe, per currency).
- Save lines `{ payslips: [{ payslipResourceId, lines: [{ resourceId?, payTypeId, amount, description? }], notes?, clearNotes? }] }`: a payslip's `lines` replaces its whole list; amounts 0 or more, 2 decimals. Answers `data` as an ARRAY of the payslips named. Lines added by hand have `origin` `MANUAL`; lines from a payrun import have `origin` `IMPORTED`.

### Payslips
POST /api/v1/payslips/search, GET /api/v1/payslips/:resourceId, POST /api/v1/payslips/:resourceId/refresh, POST /api/v1/payruns/:resourceId/payslips/refresh, POST /api/v1/payruns/:resourceId/payslips/generate
- Search takes `filter` only; sort `payrun.periodEndDate` and the other `payrun.` dates are valid. An employee's payslips, newest first: `employeeResourceId`, `payrun.status` `FINALIZED`, sort `payrun.periodEndDate` DESC.
- A pro-rated payslip carries `proration: { periods: [{ startDate, endDate, daysCounted, daysInPeriod }], changes: [{ date, type }] }` (`type` is `JOINED`, `PAY_CHANGES` or `PAY_ENDS`); each line's proration parts carry `periodDays`.
- Refresh (draft only) rebuilds the pay-setup lines from the employee's current pay, pro-rated, and each replaces every line of its pay type whatever its origin (a hand edit, a hand-added line, an imported line); lines of other pay types are kept. One payslip answers `{ data: { payslip } }`; an employee with no pay in the period is refused with `PAYRUN_EMPLOYEE_NO_PAY_PROFILE` and the payslip is unchanged. `POST /payruns/:id/payslips/refresh` takes `{ payslipResourceIds? }` (none or empty: every payslip) and answers `{ payrun, refreshed, failed }`; a payslip that cannot be refreshed is in `failed` with an `errorCode`.
- Generate (finalized runs only, 202, job type `PAYRUN_GENERATE_PAYSLIPS`) makes the PDFs again for the payslips named or all; the link is in the payslip's `generatedDocuments`. A draft is refused (`PAYRUN_NOT_FINALIZED`).
- Not in the REST API: payrun import, emailing payslips, a ZIP of payslips, version history, a custom exchange rate at finalize.

---

## Loans (borrowings; term and on demand)

The register never posts cash: the user records the drawdown receipt (non-current loan account) and every installment IN FULL (current loan account). `annualInterestRate` is percent per **year** (6.5 = 6.5% a year). Hire purchase is a lease, not a loan. Every loan route binds strictly (unknown key = 400). Credentials: the routes act as a user, so a `jk-` key (`x-jk-api-key`), a personal access token or an OAuth sign-in works; a management credential (the 48-character organization `API_KEY` header, the management key, the partner API key) is refused with `USER_NOT_AUTHORITY_PERMISSION`, reads and previews included. Only the loan reports and data exports accept management callers (reports need `REPORTS:ADMIN`; a locked plan answers them 422 `UNAUTHORIZED`, the other routes 403 `NOT_HAVE_ENOUGH_PERMISSION`). `calculate-*` and `preview-schedule` save nothing but need a read-write token: a token limited to read-only scope refuses them, since their paths end neither in `/search` nor `/preview`. Loan search and loan-type search give 400 `query_not_supported` for `query`.

### Loans
| Method | Path | Notes |
|--------|------|-------|
| POST | `/loans` | Create; `saveAsDraft` defaults true; `reference` required; returns 201 with the loan |
| GET | `/loans/:resourceId` | Get, figures as of today |
| PUT | `/loans/:resourceId` | Partial; `reference` + `resourceId` required; `fees` replaces the list; `isDraftToActive`. A term, fee or account change on an ACTIVE loan rewrites the schedule from the start |
| DELETE | `/loans/:resourceId` | Any status; removes the loan's own rows |
| POST | `/loans/search` | Body `filter`, `sort`, `limit`, `offset`, plus `viewStatus` and `endDate` (as-at) |
| GET | `/loans/totals` | `endDate`: outstandingPrincipal, currentPortion, nonCurrentPortion, accruedInterest |
| GET | `/loans/:resourceId/schedule` | `viewDate` only: no paging or range, up to 600 rows. `get_loan_schedule` / `preview_loan_schedule` and `clio loans schedule` slice client-side with `fromPeriod` / `toPeriod` (`periodNumber`, inclusive); the tools return at most 60 installments per call with `totalPeriods` and a `note` naming the next range |
| GET | `/loans/:resourceId/events` | Latest first, with `canUndo`; `limit`, `offset` |
| GET | `/loans/:resourceId/ledger` | On-demand only; `endDate`, `limit`, `offset` |
| POST | `/loans/preview-schedule` | Schedule from terms, saves nothing; `preview_loan_schedule` and `clio loans preview-schedule` take the same client-side `fromPeriod` / `toPeriod` as the schedule route (stripped before the request) |
| POST | `/loans/bulk-upsert` | Create ACTIVE loans (max 500, creates only, dates YYYY-MM-DD); async `{ jobId }` |
| POST | `/loans/bulk-update` | PUT per row (max 500); async `{ jobId }` |
| POST | `/close-out/loans/:resourceId` | Body `closeOutDate`; not an exit |
| POST | `/reopen/loans/:resourceId` | No body |
| GET/POST | `/loan-types`, `/loan-types/search`, `/loan-types/:resourceId` | Master types (BANK, DIRECTOR, ...) |

### Loan events
Forward only (a date before the latest event is refused); only the latest event can be undone; a retry within 2 minutes returns `LOAN_EVENT_DUPLICATE` (the first call committed). CUSTOM-shape loans refuse drawdown, prepay, rate change, capitalize, payment holiday and restructure (`LOAN_EVENT_ON_LENDER_SCHEDULE`); on-demand loans take only settle, forgive and convert (`LOAN_NOT_A_TERM_LOAN` otherwise), and an on-demand settle needs the ledger at exactly 0 (`LOAN_PAYOFF_NOT_RECORDED`; owed to the company is `LOAN_NOTHING_OWED`). Forgiveness by the lender, a conversion difference and a restructure catch-up need a gain or loss account, sent or already on the loan (`LOAN_GAIN_LOSS_ACCOUNT_REQUIRED`). `fairValue` on conversion is 0 or more. `gainLossAmount` above 0 is a gain.

| Event | Preview (saves nothing) | Record |
|-------|-------------------------|--------|
| Drawdown | `POST /loans/calculate-drawdown` | `POST /record-drawdown/loans/:id` |
| Prepayment (`keep` required) | `POST /loans/calculate-prepayment` | `POST /prepay/loans/:id` |
| Rate change (`keep` required) | `POST /loans/calculate-rate-change` | `POST /change-rate/loans/:id` |
| Capitalize interest | `POST /loans/calculate-capitalization` | `POST /capitalize-interest/loans/:id` |
| Payment holiday | `POST /loans/calculate-payment-holiday` | `POST /payment-holiday/loans/:id` |
| Restructure (10% or more ends the loan, new loan in event details) | `POST /loans/calculate-restructure` | `POST /restructure/loans/:id` |
| Settle (payoff) | `POST /loans/calculate-settlement` | `POST /settle/loans/:id` |
| Forgive | `POST /loans/calculate-forgiveness` | `POST /forgive/loans/:id` |
| Convert to shares | `POST /loans/calculate-conversion` | `POST /convert-to-shares/loans/:id` |
| Refinance (returns the NEW loan) | none | `POST /refinance/loans/:id` |
| Reclassify as current (covenant breach) | none | `POST /reclassify-as-current/loans/:id` |
| Undo | none | `POST /undo-event/loans/:id` (body `eventResourceId`) |
| Opening balance after a missed payment | `POST /loans/calculate-opening-balance` | none |

Reports: `POST /generate-reports/loans-summary`, `loans-roll-forward`, `loans-related-party`, `loans-interest`, `loans-maturity-analysis` (one request) and `loans-recon-summary` (`accountResourceIds`). Exports: `POST /data-exports/loans-register`, `/data-exports/loans-reconciliation-summary` (`accountResourceId` array required).
