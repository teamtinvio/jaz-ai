---
name: clio-kit
version: 5.29.1
description: >-
  Use this skill when an accountant, bookkeeper, or owner is running real books
  in Jaz across one or more organizations from the terminal — setting up a
  workspace, switching between clients, running a month/quarter/year close that
  survives across sessions, or clearing a queue of drafts for review. Triggers
  on "open <org>", "close the books for June", "what needs my review",
  "what's due", "add another organization".
license: MIT
compatibility: Works with Claude Code, Codex CLI, Cursor, Copilot, Claude Cowork, Claude.ai, and any agent that reads markdown. Multi-organization workflows need the `clio` CLI (`npm i -g jaz-clio`); a single organization works through MCP tools alone. Load alongside jaz-jobs for close playbooks, jaz-recipes for IFRS patterns, jaz-api for payload shapes, jaz-conversion for migrations.
---

# Clio Kit

The operator layer for people who run books in Jaz. Where the other skills know *how to do accounting*, this one knows *whose books these are, what was decided last time, and where the close left off*.

## The problem it solves

A close is not one conversation. Month-end runs eighteen steps over one to three days, and an accountant serving eight clients runs it eight times with eight different sets of bank accounts, materiality thresholds, and recurring accruals. Without somewhere to keep that, every session re-asks what it should already know, and every interruption loses the thread.

Clio Kit gives each organization a folder: what the organization is, how it likes things done, what has been decided, and exactly where the current close stands.

## The workspace

```
~/Documents/Clio Kit/            override with JAZ_KIT_HOME
  KIT.md                         who you are, index of organizations
  _shared/policies/ skills/      firm-wide, applies to every organization
  orgs/<slug>/
    ORG.md                       the close config + session journal
    .env                         JAZ_ORG=<label> — a pointer, never a key
    policies/ rules/ skills/     how this organization works
    scripts/  work/              automations · scratch (swept on exit, after asking)
    closes/<period>/
      CLOSE.md                   resumable state for this close
      workpapers/                permanent audit file
```

Keys never live here. They stay in the CLI's credential store (`clio auth`), outside any synced folder; the workspace holds only the label that points at one. That is what makes the kit safe to keep in Documents, back up, or share with a colleague through a private git repository.

## Operations

Every flow is specified in `references/flows.md` — that file is the procedure, and Claude Code's `/clio-*` commands are thin pointers into it. In agents without slash commands, the trigger phrases below reach the same flows.

| Intent | Flow | Command |
|---|---|---|
| Set up the kit · add a company | `setup` | `/clio-setup` |
| Start work on one organization | `open` | `/clio-open <org>` |
| Run a period close | `close` | `/clio-close <period>` |
| Clear the draft review queue | `review` | `/clio-review` |
| See every organization at a glance | `status` | `/clio-status` |
| Connect, check, or rotate a key | `keys` | `/clio-keys` |
| Record how this organization works | `policy` | `/clio-policy` |
| Save a procedure for next time | `teach` | `/clio-teach` |
| Checkpoint mid-close | `save` | `/clio-save` |
| End the session cleanly | `exit` | `/clio-exit` |
| What can I do right now | `help` | `/clio-help` |

## Rules that hold across every flow

Six ground rules govern every operation — one organization per session, draft first, verify before retrying a write, never print a key, record judgment not activity, and locking is the user's call. They are stated once, with their reasoning, at the top of [references/flows.md](./references/flows.md). Read them before the first write of any session.

## This is a harness, not a rulebook

Clio Kit supplies structure: memory between sessions, sequencing, safety rails, and an audit trail. **The accountant supplies the domain truth** — their materiality, their filing dates, their accounting policies, their sign-off model, their procedures.

So: never assert a statutory deadline, a reporting standard, or a "best practice" from memory, and never offer a jurisdiction default for the user to correct. A confident wrong answer costs them more than an open question. When a fact is missing from ORG.md, ask for it and record it. When they tell you how they do something, write it to `policies/` or `rules/` and follow it thereafter.

The value is that they say it once.

## What this skill does not do

It does not perform accounting. Close playbooks live in **jaz-jobs**, transaction patterns and calculators in **jaz-recipes**, payload shapes and error handling in **jaz-api**, migrations in **jaz-conversion**. When a flow reaches real work, it loads the relevant skill and follows it. If you find yourself about to write an accounting procedure into this skill, extend the right one instead and link to it.

## Supporting files

- **[references/flows.md](./references/flows.md)** — the ground rules and the canonical procedure for every operation
- **[references/workspace.md](./references/workspace.md)** — KIT.md, ORG.md, and `.env` schemas; the auth model; sharing a kit across a team
- **[references/close-state.md](./references/close-state.md)** — CLOSE.md schema, the resume protocol, review-pack and close-summary formats
- **[references/org-interview.md](./references/org-interview.md)** — what to read automatically, and the four questions worth asking
- **[references/templates.md](./references/templates.md)** — copy-paste scaffolds for every file the kit creates
