# Claims — Records, Lifecycle, Bulk + Claim Settings

The employee-expense **Claims** feature. This reference covers the **claim records**
(search / edit / lifecycle / bulk) and the **Claim Settings** master data (types /
profiles / posting rules). Claim → journal conversion + employee payouts are a
separate surface.

## Claim records (`claims` + `claim_processing` namespaces)

CLI: `clio claims …`. **Claims have no bare list or create** — a claim is born DRAFT
via document attachment or conversion, then mutated. List = `search_claims`.

### Status flow (server-enforced — surface the 422, don't pre-validate)

`DRAFT → SUBMITTED → APPROVED → CONVERTED` (CONVERTED = the customer-facing
**"Processed"**), with `REJECTED` / `CANCELLED` branches.

| Action | Tool | Legal from | Body |
|--------|------|-----------|------|
| Edit | `update_claim` | DRAFT | partial; `claimItems` non-empty REPLACES all, `[]` clears |
| Submit | `submit_claim` (or `update_claim` saveAsDraft=false) | DRAFT | none |
| Approve | `approve_claim` | SUBMITTED | none |
| Reject | `reject_claim` | SUBMITTED / APPROVED | `rejectionReason` (1-1000) |
| Cancel | `cancel_claim` | DRAFT / SUBMITTED | `cancellationReason` (1-1000) |
| Unpost | `unpost_claim` | CONVERTED | none (reverses conversion → APPROVED) |
| Delete | `delete_claim` | DRAFT / REJECTED / CANCELLED | none |

Single lifecycle ops are **SYNC** and return the updated claim. Illegal transitions
return `422` with a clear code, e.g. `CLAIM_NOT_SUBMITTABLE` ("Only DRAFT claims can
be submitted (current status: APPROVED)"). Don't pre-check — call and surface the error.

### Bulk actions are ASYNC

`bulk_submit / approve / reject / cancel / delete_claims` (max 500 ids) return **HTTP 202**
+ a job handle `{ jobId, subscriptionFBPath, status: "QUEUED", totalRecords, totalChunks }`.
Per-item processing happens in the background — **poll `search_background_jobs` by `jobId`**
for results (a queued job doesn't pre-validate item state). bulk_reject/cancel take one
shared reason for the batch.

### Update semantics (verified live)

`update_claim` is **partial**: omitted fields are unchanged; no GET-merge needed for
scalars. `claimItems` is a **full replacement set** (non-empty replaces every line,
`[]` clears, omit = no change). Attachments are per-row upsert (resourceId = edit, omit =
add, `deleted:true` = remove); `delete_claim_attachment` removes one and returns the claim.
`contactResourceId` and `vendorName` are mutually exclusive.

### Pickers (bare arrays)

`get_claim_tracking_tags` and `get_claim_custom_field_values` return a **bare array**,
not a `{data}` envelope.

### Conversion + payouts (`claim_processing`)

Turn APPROVED claims into journal entries, and record books-only employee payouts.

- **`preview_claims_conversion`** (read) — shows the journals a batch would produce:
  `{ expenseSubTotal, previewJournals, reimbursementDceCount, skippedDceCount }`, with
  non-APPROVED claims under `erroredClaims`. **Always preview and confirm `erroredClaims`
  is empty before converting.** Needs a default posting rule or an explicit
  `postingRuleResourceId` (else `422 AGGREGATION_RULE_NOT_FOUND`).
- **`convert_claims_to_journal`** (write, atomic) — `valueDate` (YYYY-MM-DD) required;
  `idempotencyKey` auto-generated (pass your own to dedup across calls; it must NOT start
  with `CONV:` / `CONV-`). Returns `{ committedJournalResourceIds, convertedClaimResourceIds,
  expenseSubTotal, idempotencyKey }`; the claim moves to **CONVERTED** ("Processed").
  Reverse with `unpost_claim`.
- **Payout flow**: `POST` (journals only) or `POST_AND_RECORD` (+ a books-only
  reimbursement DCE). The real-money **disburse** path (PayMongo) is **not exposed** — this
  surface records, it never disburses.
- **`record_employee_payout`** (write) — a books-only DCE (reimbursement or advance), no
  gateway transfer; `amount` / `paymentAccountResourceId` / `valueDate` required, `reference`
  auto-generated. **`search_employee_payouts`** lists them (filter by employee, reference,
  payout status/type).
- **`create_claim_from_attachment`** (write, multipart) — OCR a receipt into a DRAFT
  claim from a **file**, a **URL**, or **raw HTML** (an email body). **Wire field is
  `sourceURL` (capital URL)** — unlike the BT create-from-attachment's `sourceUrl`. On the
  email channel pass `attachmentId: "email-body"` to use the inbound body (the server
  renders HTML → PDF); when the host attaches a file to the call, omit all source args.
  CLI: `clio claims from-attachment (--file <path> | --source-url <url> | --html @<path>)`.
  Response is an async workflow handle; the claim materialises later (search claims,
  status DRAFT).

---

## Employees (`employees` namespace)

The expense-claim members. CLI: `clio employees …`. `list = search_employees` (no
bare list endpoint).

- **`add_employee`** — `name` + **`userResourceId` are required** (the server rejects
  a create without a user to bind: `422 EMPLOYEE_USER_RESOURCE_ID_MISSING`). Binding is
  **PERMANENT**. A claim profile is required too (the org default applies if omitted).
  Dedups by email (per-org unique).
- **`update_employee`** — partial (omit = no change; email `""` clears). **Archive with
  `active: false`** (reversible — prefer over `delete_employee`). `userResourceId` is NOT
  editable here; use **`bind_employee_user`** (one-way, permanent). `clearEmploymentType`
  unsets the classification.
- **`delete_employee`** — server validates the employee is settled (else error). Prefer archive.
- **`search_employees`** / **`search_employee_balances`** — the second is the balance
  directory (per-currency reimbursement owed). `search_employee_payouts` lives in `claim_processing`.
- **EmploymentType**: `FULL_TIME` `PART_TIME` `CONTRACTOR` `INTERN` `TEMPORARY` `CONSULTANT`.
- **Import**: `preprocess_employees_file` (sync — pass a sheet `fileUrl`, returns a row
  preview) → `import_employees` (`create`/`update`/`delete` arrays, **max 100 each**;
  sync-validates rows with row-level 422s, then queues an async job — poll
  `search_background_jobs`). Create rows need a bound user + claim profile.

---

## Claim Settings (`claim_settings` + `posting_rules` namespaces)

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
