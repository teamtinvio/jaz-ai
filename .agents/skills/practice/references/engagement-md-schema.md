# ENGAGEMENT.md schema

The per-engagement hub. Lives at `~/Documents/Jaz Practice/clients/<client-slug>/engagements/<engagement-slug>/ENGAGEMENT.md`. Read by the agent on every `practice_load_engagement` call.

The engagement-type-specific template body is what the practitioner sees on disk (e.g., `monthly-close.md` template embeds the tool / recipe / calculator triad and the scope checklist). The agent loads `references/<type>.md` for the canonical playbook depth.

## Frontmatter fields

| Field | Type | Used by | What the agent does with it |
|-------|------|---------|------------------------------|
| `v` | int | infrastructure | Schema version. |
| `type` | `monthly-close` \| `quarterly-gst` \| `annual-statutory` \| `onboarding` \| `adhoc` | every routing decision | Drives which `references/<type>.md` deep playbook the agent loads. Unknown types fall back to `adhoc` (no canonical playbook). |
| `period` | string | every blueprint invocation | Format depends on type: `YYYY-MM` (monthly-close), `YYYY-QN` (quarterly-gst), `YYYY` (annual-statutory), free-text (onboarding/adhoc). Passed verbatim into `generate_*_blueprint(period: …)`. |
| `status` | `active` \| `in-review` \| `signed-off` \| `filed` \| `archived` | scope guard | Agent only transitions when the scope checklist is complete. `signed-off` requires every checklist item ticked. `filed` requires submission confirmation in deliverables/. `archived` is a manual practitioner action. |
| `scope_summary` | string | deliverable cover pages | One sentence. What this engagement is producing. |
| `opened_date` | YYYY-MM-DD | overdue detection | Set by `practice_create_engagement`. |
| `target_completion_date` | YYYY-MM-DD | overdue detection | Used by `practice_list_clients` to flag overdue items in the dashboard. |
| `jaz_org_id` | UUID | every API tool call | Pinned at scaffold time from `CLIENT.md.jaz_org_id`. Engagement keeps the same org context across re-runs even if CLIENT.md changes later. |

## Body sections

### "Scope & deliverables checklist"

`- [ ] _Deliverable_ — _location in `deliverables/`_` format. The agent ticks items as the underlying Jaz tools succeed and writes outputs into `workpapers/` or `deliverables/`. Status transitions to `signed-off` only when every item is ticked.

The exact checklist content comes from the type-specific template (e.g., `src/templates/engagement-types/monthly-close.md`). Each item names a specific Jaz tool / recipe / calculator with field paths.

### "Open queries with client"

`- [ ] _Question_ — _asked YYYY-MM-DD_ — _waiting on_ — _SLA YYYY-MM-DD_` format. Surfaced on `practice_load_engagement`. Items past their SLA get flagged.

When the practitioner asks the agent "what's blocking?", the agent reads this section first.

### "Risk areas"

Specific accounting exposures the practitioner flagged for this period: large adjusting journals, related-party transactions, going-concern indicators, tax positions taken, FX-revaluation gaps. Free-form prose. The agent reads this before suggesting any new transaction in this engagement to avoid contradicting prior judgments.

### "Decisions log"

Append-only, most recent first. `- _YYYY-MM-DD_ — _decision_ — _rationale_` format. Period-specific accounting-treatment judgment calls (estimate, classification, reclassification, scope change). The agent appends here when invoking a recipe with non-default parameters.

Cross-period decisions (treatment elections that survive future periods) belong in `CLIENT.md.decisions_log`, not here.

### "Daily journal"

Most recent first. The agent appends one line per working day before ending the session, so resuming next session doesn't redo yesterday's steps. Format: `- _YYYY-MM-DD_ — _what happened_`.

The agent reads the top 3 entries before resuming work to recover context.

## Workpapers and deliverables convention

- `workpapers/` — interim outputs the agent produces while working (TBs, sample selections, variance analyses, recipe outputs). Filename convention: `<task>-<YYYY-MM-DD>.md` or `<task>.json`. Practitioner can review and archive.
- `deliverables/` — final outputs the engagement produces (signed reports, filed returns, board packs). Filename convention: `<deliverable-name>-<period>.<ext>`.

The scope checklist's "location in `deliverables/`" field tells the agent where to save each finished output.

## Status state machine

```
active → in-review → signed-off → filed → archived
```

- `active`: work in progress. Default on creation.
- `in-review`: practitioner ready for review (peer / partner / client). Can return to `active` if rework needed.
- `signed-off`: scope checklist 100% complete, practitioner approved.
- `filed`: external submission completed (IRAS / ACRA / other). Submission confirmation in `deliverables/`.
- `archived`: locked. Read-only. Folder may be moved to `clients/<slug>/_archive/`.

The agent never auto-transitions past `signed-off` without practitioner explicit confirmation.
