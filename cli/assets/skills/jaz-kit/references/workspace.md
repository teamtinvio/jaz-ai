# Workspace schema and auth model

File formats and the credential design. Procedures live in `flows.md`; blank scaffolds in `templates.md`.

## Root

`JAZ_KIT_HOME` if set, otherwise `~/Documents/Jaz Kit`.

Documents is chosen deliberately: accountants need to find, back up, and attach these files, and Documents is where they look. That is only safe because **no secret is ever written inside the kit**: on a default Mac this directory syncs to iCloud.

```
~/Documents/Jaz Kit/
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

`_shared/` applies to every organization. **Organization-level files win on conflict**: a firm-wide "chase at 30 days" is overridden by one client's "chase at 14".

`work/` is scratch, swept on exit after listing the files and asking. `closes/<period>/workpapers/` is permanent; it is the audit file, and nothing automatic ever deletes from it.

## Slugs

Lowercase, hyphenated, derived from the organization name. Two clients can genuinely share a name, so when a slug is taken by a different organization, append a short suffix from the organization identifier. **ORG.md's `organization_id` is the identity**; the slug is only a folder name and may be renamed freely.

## KIT.md

Firm-level. Written once at init.

| Field | Meaning |
|---|---|
| `operator` | Name of the person or firm |
| `mode` | `own-books` · `client-books` · `both`; sets vocabulary everywhere |
| `organizations` | Table: slug, organization name, label, country, FY end |
| `defaults` | Fallbacks for new organizations (materiality basis, close target day) |

## ORG.md

The close configuration. Everything the jobs skill's playbooks otherwise stop to ask for, answered once.

**Identity**
| Field | Meaning |
|---|---|
| `name` | Legal entity name as it appears in Jaz |
| `organization_id` | Identifier from `clio org info`, the real identity key, matched against the key on every open |
| `country` | Recorded for the user's own reference and for report labelling |
| `base_currency` | Reporting currency |
| `multi_currency` | Whether foreign-currency balances exist; gates the FX verification step |
| `fy_end` | Fiscal year end, written in full: `31 December`, `30 June`. `clio org info` returns it as `financialYearEnd` in `DD-MM` form (`31-12`); **spell it out before storing it**, because `FY<year>` and fiscal-quarter resolution both read this field and `01-12` is ambiguous |

**Filing**: every value here comes from the user. The kit tracks their calendar; it does not own one.

| Field | Meaning |
|---|---|
| `registered` | Whether the entity files a periodic return at all |
| `filing_form` | What they call the return, for readable output |
| `filing_frequency` | How often they file |
| `filing_periods` | The period ends they actually file against |
| `filing_offset` | How long after a period end the return is due |

The next deadline is `filing_periods` + `filing_offset`. Past due with nothing recorded as filed → overdue, surfaced above everything else.

**Never derive these from `country`.** Filing rules change, vary by registration type and turnover, and differ by filing channel. The user knows their obligation; the kit's job is to remember and count down, not to assert. If a value is missing, ask; do not fill it with a plausible default.

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

Estimation methods for accruals must match what the jobs skill's month-end playbook expects; see its accruals step for the list.

## Authentication

OAuth is the default. Store only `organization_id` in ORG.md. Run `clio auth login` on the machine running Jaz, then use `clio <command> --org oauth:<organization_id> --json` for every organization-scoped call. Never rely on the shared active organization. Refresh tokens stay in Jaz's private local configuration, outside the kit. Hosted MCP uses its own OAuth session; always pass the same organization ID and verify it.

Before opening a company, run `clio org info --org oauth:<organization_id> --json` and compare `resourceId` with ORG.md. Refuse a mismatch. Reauthenticate when access expires or is revoked; never silently switch to an API key. If CLI is unavailable, the same identity check can use hosted MCP.

### Optional .env API key

Existing key-based workspaces remain supported. Keep their single `JAZ_API_KEY=jk-...` in a gitignored `.env`. Never read or print the value. For this route only, source the folder's `.env` in the same command as each CLI call, without `--org`:

```
set -a; . "orgs/<slug>/.env"; set +a; clio <command> --json
```

Do not mix key overrides with OAuth organization selectors. Keep `.env`, `*.env`, and `.env.*` ignored. When migrating an existing folder to OAuth, verify access to its recorded organization first, stop loading its `.env`, and preserve the old key until the user chooses to remove it. Keys placed in a cloud-synced folder will sync with it; OAuth tokens must never be placed in the kit.

## Sharing a kit across a team

The kit is a git repository (offered at setup; `.env` / `*.env` / `work/` ignored). To share:

1. Push to a **private** repository. The `.env` keys stay behind; they are gitignored, so nothing sensitive travels.
2. Each colleague clones it and signs in to Jaz themselves. Share organization context and policies, never OAuth sessions. Colleagues choosing API-key access configure their own ignored `.env` files.
3. Pull before starting, push after finishing.

Coordinate who works which company. Two people closing the same period simultaneously will conflict in CLOSE.md, and worse, may both finalize the same drafts. Git surfaces the file conflict; nothing prevents the double-finalize, so agree who owns a client before starting.

**Do not share a kit through iCloud, Dropbox, or a shared drive.** File sync resolves concurrent edits by writing "conflicted copy" duplicates, which an agent may then read as truth. Git surfaces the conflict instead of hiding it. The open flow refuses to run when it finds conflicted-copy files.
