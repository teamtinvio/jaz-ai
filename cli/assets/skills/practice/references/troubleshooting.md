# Troubleshooting — practice_* tools and their downstream invocations

When `practice_*` tool calls or the downstream Jaz API tools surface errors, route by error class. Surface the recovery action to the practitioner; don't silently retry.

## practice_init

| Symptom | Cause | Recovery |
|---------|-------|----------|
| `EACCES` on `~/Documents/Jaz Practice` | Default home not writable | Pass `--root <path>` (CLI) or `practiceHome` (MCP) to a writable location, or set `PRACTICE_HOME` env. |
| `wasExisting: true` returned | Re-running on an existing workspace | Idempotent. Existing PRACTICE.md preserved; only the explicitly-passed flags get updated. Surface this clearly so the practitioner knows nothing was destroyed. |

## practice_onboard_client

| Symptom | Cause | Recovery |
|---------|-------|----------|
| `Client folder already exists: /…/clients/<slug>` | Slug collision (legal entity name slugs to existing dir) | Suggest a different `legalEntityName` (add a Pte Ltd / Inc suffix, year, etc.) or have the practitioner manually move the existing folder to `_archive/<slug>` first. |
| Frontmatter `gst_registration_number` empty when `gst_scheme != not-registered` | Mandatory field missing | Surface "GST scheme is `<scheme>` but no registration number provided. Add it before the first `quarterly-gst` engagement, or set `gst_scheme: not-registered` if it doesn't apply." |

## practice_create_engagement

| Symptom | Cause | Recovery |
|---------|-------|----------|
| `Engagement folder already exists` | Duplicate (type, period) for same client | Either load the existing one with `practice_load_engagement`, or pick a different `period` value. Don't overwrite — period work is sacred. |
| `Client not found: <slug>` | Slug typo or unflushed scaffold | Confirm via `practice_list_clients`. If the client legitimately doesn't exist yet, run `practice_onboard_client` first. |

## practice_load_client / practice_load_engagement

| Symptom | Cause | Recovery |
|---------|-------|----------|
| Returns null / "not found" | Filesystem moved, slug changed, or workspace deleted | Run `practice_list_clients` to re-discover available slugs. If the workspace is gone, the practitioner needs to re-run `practice_init`. |
| CLIENT.md frontmatter has unknown fields | Schema drift or hand-edited file | Agent gracefully ignores unknown fields. If a known field is missing, fall back to PRACTICE.md defaults or schema defaults; surface what was assumed. |

## Downstream Jaz API errors during engagement work

When the agent invokes Jaz tools inside an engagement context, common error classes:

| Error class | Recovery action |
|-------------|------------------|
| `422 with field: valueDate` | Date format mismatch. See `jaz-api § Identifiers & Dates`. Re-format as YYYY-MM-DD. |
| `422 with field: glAccount` not found | GL account in CLIENT.md.recurring_accruals doesn't exist in Jaz CoA. Surface "Account `<code>` not found in client's CoA. Create via `create_account` or update CLIENT.md.recurring_accruals[].gl_account to match an existing one." |
| `422 with field: organizationResourceId` | API key / org_id mismatch. Verify CLIENT.md.jaz_api_key_override resolves to the same Jaz org as CLIENT.md.jaz_org_id. |
| `401 Unauthorized` | API key invalid or expired. Surface "API key for `<client-slug>` is invalid. Check CLIENT.md.jaz_api_key_override → PRACTICE.md.default_jaz_api_key → JAZ_API_KEY env in that order." Don't echo the key value. |
| `404 on resourceId` | Resource was deleted server-side after CLIENT.md was last updated. Re-fetch via `search_*` and update CLIENT.md if the practitioner confirms. |
| `500` on `view_auto_reconciliation` | Known Jaz backend issue on high-volume bank accounts. Surface "Bank `<account>` has too many unreconciled records for the auto-recon endpoint. Use `search_bank_records(status: UNRECONCILED, limit: 50)` + manual `reconcile_*` per record instead." |

## Recipe / calculator failures

| Symptom | Cause | Recovery |
|---------|-------|----------|
| `plan_recipe(name: 'accrued-expense', …)` returns negative amount | Estimation method picked up a credit balance | Surface "Accrual `<name>`: prior_month estimation produced a credit. Switch CLIENT.md.recurring_accruals[i].estimation_method to `fixed_amount` for this row this period, or pull `trailing_3m_avg`." |
| `plan_recipe(name: 'fx-reval', …)` returns very large gain/loss | Currency rate stale or wrong direction | Verify `list_currency_rates` is current for the period. Confirm whether `from_rate` and `to_rate` match the expected period boundaries. |
| `clio calc <name>` validation error | Required option missing | The CLI prints which required option is missing. Match against the engagement-type playbook's specified arguments. |

## Workspace integrity

| Symptom | Recovery |
|---------|----------|
| CLIENT.md or ENGAGEMENT.md hand-edited and YAML breaks | Agent surfaces the YAML parse error with line number; practitioner fixes manually. Agent never auto-rewrites a broken file. |
| Workpapers / deliverables out of sync with frontmatter checklist | The checklist is source of truth. Re-walk the engagement, ticking based on what's actually in the filesystem. |
| Engagement marked `signed-off` but checklist incomplete | Hand-edit. Agent flags this on `practice_load_engagement`: "ENGAGEMENT.status is `signed-off` but `<N>` checklist items remain unticked. Confirm intent." |

## When to escalate to the practitioner (don't auto-fix)

The agent NEVER takes these actions silently:
- Changing `legal_entity_name`, `uen`, or `jaz_org_id` in CLIENT.md
- Lowering `materiality_threshold`
- Transitioning `ENGAGEMENT.status` past `signed-off` without practitioner confirmation
- Deleting any file in `_archive/`
- Posting a journal that exceeds `materiality_threshold` without practitioner review
- Modifying any deliverable that's already been filed externally
