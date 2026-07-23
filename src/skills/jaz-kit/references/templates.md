# Scaffolds

Copy these when creating files. Replace every `<…>`. Omit rows that do not apply rather than writing "N/A" — an absent row reads as "not relevant", a filled one as "confirmed".

## KIT.md

```markdown
# Jaz Kit — <operator name>

Mode: <own-books | client-books | both>
Created: <YYYY-MM-DD>

## Organizations

| Slug | Organization | Label | Country | FY end |
|------|--------------|-------|---------|--------|
| <slug> | <name> | <label> | <SG> | <31 December> |

## Defaults

Applied to new organizations unless overridden.

- Materiality basis: <e.g. 0.5% of revenue>
- Close target: <working day N>
```

## ORG.md

```markdown
# <Organization name>

## Identity

- Organization ID: <resourceId from clio org info>
- Country: <SG>
- Base currency: <SGD>
- Multi-currency: <yes | no>
- FY end: <31 December>

## Filing

All from the user — never derived from country.

- Registered: <yes | no>
- Form: <what they call the return>
- Frequency: <how often they file>
- Period ends: <the period ends they file against>
- Due: <how long after a period end>

## Close inputs

### Bank accounts
| Account | Currency | resourceId |
|---------|----------|------------|
| <name> | <SGD> | <id> |

### Materiality
<amount> — <basis and reasoning>

### Recurring accruals
| Description | Account | Estimation |
|-------------|---------|------------|
| <e.g. Utilities> | <account> | <prior month | trailing 3m average | budget | fixed> |

### Chart of accounts notes
- <mapping that is not obvious from the account name>

### ECL rates
| Bucket | Rate |
|--------|------|
| Current | <%> |
| 1-30 | <%> |
| 31-60 | <%> |
| 61-90 | <%> |
| 91+ | <%> |

### Fixed assets
- Register in use: <yes | no>
- Non-straight-line methods: <none | ddb, 150db>

## Operating

- Close target: <working day N>
- Reviewer: <name, or "sole operator">


## Journal

Most recent first.

### <YYYY-MM-DD>
<what happened, what is pending, where to pick up>
```

## CLOSE.md

```markdown
# Close — <period>

- Range: <YYYY-MM-DD> to <YYYY-MM-DD>
- Playbook: <month-end | quarter-end | year-end>
- Status: <in-progress | in-review | locked>
- Opened: <YYYY-MM-DD>   Last touched: <YYYY-MM-DD>

## Steps

| # | Step | State | Evidence | Note |
|---|------|-------|----------|------|
| 1 | <name> | <pending | started | confirmed | skipped> | <resourceId / file / count> | <only if needed> |

## Review queue

| Record | Amount | Link | State |
|--------|--------|------|-------|
| <what it is> | <amount> | <from navigate> | <queued | approved | rejected> |

## Decisions

### <YYYY-MM-DD> — <account or topic>
<what was decided, and why. Jot: recorded.>

## Residuals

- <what is being carried into the locked period, and why>
```

## Starter rules

Written to `rules/` at init. These govern **how the agent behaves** — they are the harness's own safety defaults, not accounting advice. Everything about how the books are actually kept comes from the operator and lands in `policies/`.

**`rules/draft-first.md`**
```markdown
# Draft first

Create every transaction as a draft. `saveAsDraft` defaults to `false` in the
API, so it must be set explicitly on every write.

Finalize only through the review flow, or when the operator names the specific
records to finalize. Never finalize as a side effect of another step.

To relax this for a specific transaction type, amend this file and say which
type and why.
```

**`rules/locked-periods.md`**
```markdown
# Locked periods

Never post into a locked period, and never move the lock date backwards to
make a posting possible.

A correction to a locked period is a new entry in an open period, with a note
explaining what it corrects.

The lock only moves forward after the review queue is empty and the operator
has explicitly confirmed a summary of the period.
```

**`rules/review-threshold.md`**
```markdown
# Review threshold

Present anything at or above the materiality threshold in ORG.md individually,
with its amount, its reason for existing, and its link.

Group everything below it by kind, with a count and a total.

Never finalize an above-threshold item without a specific confirmation for that
item.
```

## Starter policy

Create the file empty apart from its heading. **Do not seed it with suggestions** — policies are the operator's working practice, and a pre-filled list gets accepted unread, which turns our guesses into their file. It fills up through `/jk-policy` and `/jk-teach` as they say how they work.

**`policies/close-routine.md`**
```markdown
# Close routine

<Recorded as the operator states it. Nothing here is assumed.>
```

## orgs/<slug>/.env

One line, the company's own org-scoped key. Created during setup as a staging file the user pastes into, then moved into the folder. Gitignored. Never echoed.

```
JAZ_API_KEY=<paste this company's Jaz API key here>
```

## .gitignore

Written before `git init`, so nothing untracked is ever staged.

```
.env
*.env
.env.*
work/
*conflicted copy*
```

`*.env` and `.env.*` matter because each company's key sits in its `orgs/<slug>/.env`, and a bare `.env` pattern misses a stray copy or a `.env.backup`. Write this file **before** `git init`.
