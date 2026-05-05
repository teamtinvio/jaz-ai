---
v: 1
type: monthly-close                    # <!-- One of: monthly-close | quarterly-gst | annual-statutory | onboarding | adhoc. Agent loads the matching playbook from jaz-practice/references/<type>.md. -->
period: "{{period}}"                   # <!-- Format depends on type: YYYY-MM (monthly-close), YYYY-QN (quarterly-gst), YYYY (annual-statutory), free-text (onboarding/adhoc). Drives generate_*_blueprint period args. -->
status: active                         # <!-- One of: active | in-review | signed-off | filed | archived. Agent transitions only when scope checklist is complete. -->
scope_summary: ""                      # <!-- One sentence. What this engagement is producing. -->
opened_date: "{{opened_date}}"         # <!-- YYYY-MM-DD. Set by practice_create_engagement. -->
target_completion_date: ""             # <!-- YYYY-MM-DD. Used by practice_list_clients to flag overdue engagements. -->
jaz_org_id: ""                         # <!-- Pinned at scaffold time from CLIENT.md.jaz_org_id so the engagement keeps the same org context across re-runs. -->
---

# {{type}} — {{period}}

## Scope & deliverables checklist

Concrete artifacts this engagement must produce. Agent ticks items as the underlying Jaz tools succeed.

- [ ] _Deliverable_ — _location in `deliverables/`_

## Open queries with client

Outstanding accounting questions blocking progress. Each has an owner and an SLA. Agent surfaces these on `practice_load_engagement`.

- [ ] _Question_ — _asked YYYY-MM-DD_ — _waiting on_ — _SLA YYYY-MM-DD_

## Risk areas

Specific accounting exposures the agent should be alert to (large adjusting journals, related-party transactions, going-concern indicators, tax positions taken, FX-revaluation gaps).

## Decisions log

Append-only. Most recent first. Accounting-treatment judgment calls made during this engagement (estimate, classification, reclassification, scope change). Cross-period decisions belong in CLIENT.md.

- _YYYY-MM-DD_ — _decision_ — _rationale_

## Daily journal

Most recent first. Append a line each working day so the agent can resume work without redoing yesterday's steps.

- _YYYY-MM-DD_ — _what happened_
