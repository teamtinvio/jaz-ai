# Workspace schema and auth model

File formats and the credential design. Procedures live in `flows.md`; blank scaffolds in `templates.md`.

## Root

`JAZ_KIT_HOME` if set, otherwise `~/Documents/Clio Kit`.

Documents is chosen deliberately: accountants need to find, back up, and attach these files, and Documents is where they look. That is only safe because **no secret is ever written inside the kit** — on a default Mac this directory syncs to iCloud.

```
~/Documents/Clio Kit/
  KIT.md
  _shared/
    policies/
    skills/
  orgs/<slug>/
    ORG.md
    .env
    policies/  rules/  skills/  scripts/  work/
    closes/<period>/
      CLOSE.md
      workpapers/
```

`_shared/` applies to every organization. **Organization-level files win on conflict** — a firm-wide "chase at 30 days" is overridden by one client's "chase at 14".

`work/` is scratch, swept on exit after listing the files and asking. `closes/<period>/workpapers/` is permanent — it is the audit file, and nothing automatic ever deletes from it.

## Slugs

Lowercase, hyphenated, derived from the organization name. Two clients can genuinely share a name, so when a slug is taken by a different organization, append a short suffix from the organization identifier. **ORG.md's `organization_id` is the identity** — the slug is only a folder name and may be renamed freely.

## KIT.md

Firm-level. Written once at init.

| Field | Meaning |
|---|---|
| `operator` | Name of the person or firm |
| `mode` | `own-books` · `client-books` · `both` — sets vocabulary everywhere |
| `organizations` | Table: slug, organization name, label, country, FY end |
| `defaults` | Fallbacks for new organizations (materiality basis, close target day) |

## ORG.md

The close configuration. Everything the jobs skill's playbooks otherwise stop to ask for, answered once.

**Identity**
| Field | Meaning |
|---|---|
| `name` | Legal entity name as it appears in Jaz |
| `organization_id` | Identifier from `clio org info` — the real identity key |
| `label` | The `clio auth` profile label for this organization |
| `country` | Recorded for the user's own reference and for report labelling |
| `base_currency` | Reporting currency |
| `multi_currency` | Whether foreign-currency balances exist — gates the FX verification step |
| `fy_end` | Fiscal year end, written in full: `31 December`, `30 June`. `clio org info` returns it as `financialYearEnd` in `DD-MM` form (`31-12`) — **spell it out before storing it**, because `FY<year>` and fiscal-quarter resolution both read this field and `01-12` is ambiguous |

**Filing** — every value here comes from the user. The kit tracks their calendar; it does not own one.

| Field | Meaning |
|---|---|
| `registered` | Whether the entity files a periodic return at all |
| `filing_form` | What they call the return, for readable output |
| `filing_frequency` | How often they file |
| `filing_periods` | The period ends they actually file against |
| `filing_offset` | How long after a period end the return is due |

The next deadline is `filing_periods` + `filing_offset`. Past due with nothing recorded as filed → overdue, surfaced above everything else.

**Never derive these from `country`.** Filing rules change, vary by registration type and turnover, and differ by filing channel. The user knows their obligation; the kit's job is to remember and count down, not to assert. If a value is missing, ask — do not fill it with a plausible default.

**Close inputs**
| Field | Meaning |
|---|---|
| `bank_accounts` | Name + resourceId per account, from `clio bank accounts` |
| `materiality` | Absolute amount. Drives variance surfacing and review tiering |
| `recurring_accruals` | Per accrual: description, account, estimation method |
| `coa_notes` | Mappings that are not obvious from account names |
| `ecl_rates` | Loss-rate matrix per aging bucket, if the entity provisions |
| `fixed_assets` | Whether the register is used, and any non-straight-line methods |

**Operating**
| Field | Meaning |
|---|---|
| `close_target` | Working day the close should finish by |
| `reviewer` | Who approves before finalization and locking |
| `journal` | Dated entries, most recent first. Appended by save and exit |

Estimation methods for accruals must match what the jobs skill's month-end playbook expects — see its accruals step for the list.

## .env

Non-secret configuration only:

```
JAZ_ORG=acme-sg
```

This names a `clio auth` profile. It is a pointer, not a credential — publishing it would reveal nothing but a local nickname. Gitignored anyway, because the escape hatch below can add a path, and because habit is cheaper than judgment.

## Auth model

Keys live in the CLI's credential store at `~/.config/jaz-clio/credentials.json`, registered by `clio auth add`, which validates each key against the API before saving it. That path is outside Documents and therefore outside iCloud.

**Resolution order** (first match wins): `--api-key` → `JAZ_API_KEY` → `--org <label>` → `JAZ_ORG` → active profile.

Clio Kit uses `--org <label>` on every call, because `clio auth switch` is global: it rewrites the active profile in a shared file, so a second terminal, a scheduled script, or another agent session silently changes organization underneath itself. `--org` names the organization at the point of the write instead.

**`--org` is not absolute — `JAZ_API_KEY` outranks it.** Read the resolution order again: an exported `JAZ_API_KEY` resolves at step 2 and returns before `--org` is ever consulted. The flag is then silently ignored, and because no profile was resolved the CLI prints no organization banner. Every write lands in the env key's organization with no error and no visual signal.

That is the failure that posts one organization's entries into another's ledger, and it defeats a naive cross-check: if both the CLI and the MCP server read the same `JAZ_API_KEY`, they agree with each other while both being wrong. So the open flow does two distinct things — it asserts no `JAZ_API_KEY` is set for the session, and it compares the returned organization identifier against ORG.md. The second catches a mismatched label; only the first catches an exported key.

**Never combine an exported `JAZ_API_KEY` with Clio Kit.** One shell per organization, and let `--org` do the work.

**Headless escape hatch.** Scheduled jobs have no interactive credential store. Write the key to `~/.config/jaz-clio/kit-env/<slug>.env`, `chmod 600` — outside the kit root, never inside it. The organization's `.env` records only the path. The CLI does not read `.env` files, so the runner loads it explicitly:

```
set -a; . ~/.config/jaz-clio/kit-env/<slug>.env; set +a
```

Use that form, not `export $(… | xargs)`: `xargs` execs a real subprocess, which puts the key in its argv where any local user can read it from `ps`, and it word-splits and glob-expands values. Never run the loader under `set -x`, and never echo the variable.

This exports `JAZ_API_KEY` into the shell, which pins **every** command in it to that one organization and makes `--org` inert (see above). That is acceptable for a single-organization scheduled job and unacceptable anywhere else: one shell per organization, and never in an interactive Clio Kit session.

## Sharing a kit across a team

The kit is a git repository (offered at init, `.env` and `work/` ignored). To share:

1. Push to a **private** repository.
2. Colleagues clone it and run `clio auth add` with their own keys — credentials never travel, only the labels do.
3. Pull before starting, push after finishing.

Coordinate who works which organization. Two people closing the same period simultaneously will conflict in CLOSE.md, and worse, may both finalize the same drafts. Git surfaces the file conflict; nothing prevents the double-finalize, so agree who owns a client before starting.

**Do not share a kit through iCloud, Dropbox, or a shared drive.** File sync resolves concurrent edits by writing "conflicted copy" duplicates, which an agent may then read as truth. Git surfaces the conflict instead of hiding it. The open flow refuses to run when it finds conflicted-copy files.
