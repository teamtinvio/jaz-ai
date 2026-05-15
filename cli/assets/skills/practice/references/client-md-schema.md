# CLIENT.md schema

The per-client master file. Lives at `~/Documents/Jaz Practice/clients/<slug>/CLIENT.md`. Read by the agent on every `practice_load_client` call. The agent never edits it silently — practitioners curate it; the agent only suggests edits via the practitioner.

## Frontmatter fields

| Field | Type | Used by | What the agent does with it |
|-------|------|---------|------------------------------|
| `v` | int | infrastructure | Schema version. Never set manually below `1`. Bumped by future migrations. |
| `legal_entity_name` | string | every deliverable | Stamped verbatim onto reports, journals, filings. Used in slug derivation. |
| `uen` | string (Singapore) | annual-statutory | ACRA filings reference this. If `country: SG` and this is empty, surface to practitioner before annual-statutory deliverables. |
| `registered_address` | string | annual-statutory | Stamped on financial statements lodgment. |
| `country` | ISO-3166 alpha-2 | every playbook | Routes jurisdiction-specific guidance. `SG` triggers IRAS/ACRA paths; future codes (MY, PH, HK) route their equivalents. |
| `base_currency` | ISO-4217 | every playbook | Functional currency. Period-end FX revaluation against this is auto-handled by Jaz (IAS 21.23) — agent verifies via `clio calc fx-reval` cross-check, never invokes `execute_recipe(name: 'fx-reval', ...)`. Stamped onto reports. |
| `fy_end` | MM-DD | annual-statutory | Drives period boundaries: `annual-statutory` engagement period spans `<previous fy_end + 1 day>` to `<this fy_end>`. |
| `gst_scheme` | `quarterly` \| `monthly` \| `not-registered` | quarterly-gst | If `not-registered`, agent skips quarterly-gst engagement scheduling. Otherwise: cadence drives F5 period (e.g., quarterly = `2026-Q1`). |
| `gst_registration_number` | string | quarterly-gst | Stamped onto F5 submission tracker. Required when `gst_scheme != not-registered`. |
| `corporate_tax_bracket` | `standard` \| `startup_exemption` \| `partial_exemption` | annual-statutory | Routes Form C-S computation path. `startup_exemption` enables the first-3-YA exemption logic. |
| `jaz_api_key_override` | string (jk-…) | every API tool call | If set, this key is used for tool invocations on this client (multi-org agencies). Empty → falls back to `PRACTICE.md.default_jaz_api_key` → `JAZ_API_KEY` env. |
| `jaz_org_id` | UUID | every API tool call | Pinned at `practice_onboard_client` time. Subsequent tool invocations scope to this org so cross-client mix-ups don't happen. |
| `materiality_threshold` | number (in `base_currency`) | monthly-close, annual-statutory | Threshold for surfacing variance / reconciliation gaps. Compared against `|current - prior|` after `generate_trial_balance`. |
| `bank_accounts[]` | array | monthly-close | Each entry: `{name, account_number_ref?, currency, jaz_resource_id?}`. Iterated before invoking `search_bank_records(accountResourceId: …, status: UNRECONCILED)`. After first reconciliation, `jaz_resource_id` should be populated to skip future name-lookup. |
| `recurring_accruals[]` | array | monthly-close | Each entry: `{name, gl_account, vendor?, estimation_method?, fixed_amount?}`. Drives one `plan_recipe(name: 'accrued-expense', amount: <computed>, glAccount, vendor, valueDate: period_end, reversalDate: next_period_start)` invocation per row. `estimation_method` values: `prior_month` (use prior period's amount), `trailing_3m_avg` (average of last 3 months), `budget` (read from CLIENT body / ENGAGEMENT inputs), `fixed_amount` (use `fixed_amount` field). |
| `recurring_engagements[]` | array | practice_load_client surfacing | Each entry: `{type, cadence}`. Agent checks: for each entry, does an active engagement exist for the current period? If not, prompt practitioner to create it. |
| `key_contacts[]` | array | annual-statutory, ad-hoc questions | `{name, role, email}`. Used in correspondence routing and "ask the client" prompts. |

## Body sections

The body is markdown. The agent reads these for unstructured context but doesn't edit them silently — practitioners own this prose.

### "Industry & business model"

Two-three sentences on what the client does, who pays them, how revenue is recognized at a high level. Used to disambiguate: "is this transaction a sale or a deposit?", "should we accrue revenue here?".

### "COA mapping notes"

Material customizations to the standard CoA — extra revenue lines, departmental cost centers, project-tracking dimensions. Read before suggesting GL accounts on new transactions or accruals.

### "Tax setup quirks"

GST scheme details (reverse-charge applicability, blocked input tax categories, mixed supplies), corporate tax peculiarities (group relief, capital allowance pools, prior-year losses), withholding tax obligations on cross-border payments.

### "Banking & multi-currency exposures"

Which banks feed which entities, FX verification cadence (Jaz auto-handles reval per IAS 21.23 — practitioner just decides how often to run the verification cross-check: monthly vs quarterly vs at year-end), hedging arrangements, signatory rules.

### "Known issues / quirks"

Things every preparer must remember. Old systems still feeding data, manual journals that recur, vendor-specific oddities, related-party balances that need elimination.

### "Open follow-ups"

`- [ ] _Item_ — _owner_ — _due_` format. Surfaced on `practice_load_client`. Items past due get flagged.

### "Decisions log"

Append-only, most recent first. `- _YYYY-MM-DD_ — _decision_ — _rationale_` format. Cross-period accounting-treatment judgments (treatment elections, materiality overrides, reclassifications). Survives engagement archival.

### "Daily journal"

One-line per touch, most recent first. Facts the agent should remember next session about this client without re-reading every engagement.

## Invariants the agent enforces

1. `legal_entity_name` is never silently changed — it's stamped onto deliverables, including filed ones. If the practitioner asks for a name change, surface "this affects all future deliverables; prior filings keep the old name" and confirm before editing.
2. `jaz_api_key_override` is masked in any output. If the agent ever has to display CLIENT.md to the practitioner, this field is shown as `jk-***` only.
3. `materiality_threshold` is never silently lowered by the agent. Practitioners can raise (more conservative), never lower (more permissive).
4. `bank_accounts[].jaz_resource_id` is added by the agent only after a successful API call confirms the resourceId belongs to the right Jaz org (matches `jaz_org_id`).
