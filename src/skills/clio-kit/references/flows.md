# Clio Kit flows

The canonical procedure for every Clio Kit operation. Slash commands (`/clio-*`) point here; agents without slash commands reach the same flows from the trigger phrases in `SKILL.md`. One source of truth — command files add nothing.

Schemas live in `workspace.md` (KIT.md, ORG.md, `.env`) and `close-state.md` (CLOSE.md, review pack). Field-by-field onboarding questions live in `org-interview.md`. Copy-paste scaffolds live in `templates.md`.

## Ground rules for every flow

1. **One organization per session.** Resolve the label once at open, then pass `--org <label>` on every `clio` call. Never run `clio auth switch` inside a Clio Kit flow — it rewrites the shared active profile in `~/.config/jaz-clio/credentials.json`, which silently changes the org for every other terminal and agent session on the machine. `--org` is explicit, per-call, and cannot leak across sessions.
2. **Draft first.** `saveAsDraft` defaults to `false` in the API — omitting it posts live. Every write in a Clio Kit flow sets `saveAsDraft: true` (or `--plan` then a non-finalized run for `clio ct`) unless the org's `rules/` explicitly relaxes that transaction type. Finalization happens in the review flow, never as a side effect.
3. **Never print a key.** Not in output, not in a file the user can paste, not in an error. Key values only ever move between the Jaz UI and `clio auth add`. `jk-` strings are redacted on sight.
4. **Judgment gets recorded.** When the user accepts a variance, carries a residual, or overrides a default, call `jot` at that moment. Mechanical steps never jot.
5. **Report exceptions, not dumps.** Surface the top few items that need a decision; write the full output to the period's `workpapers/`.

---

## setup — set up the kit, onboard an organization

Triggers: "set up Clio Kit", "add my company", "onboard a new client", "connect another org".

Idempotent. No kit → create it. Kit exists → this is the add-a-company flow.

**1. Locate the root.** `JAZ_KIT_HOME` if set, else `~/Documents/Clio Kit`. If it exists, skip to step 4.

**2. Ask who is being served** (one question, shapes vocabulary everywhere after):
- *my own business* → say "your books", "your organization"
- *clients* → say "the client", "the engagement"
- *both* → default to client vocabulary, treat own entities as clients

**3. Create the skeleton and KIT.md** from `templates.md`. Offer git (default yes) — write `.gitignore` **before** `git init` so nothing untracked is ever staged:
```
.env
work/
*conflicted copy*
```

**4. Check the CLI.** `clio auth list` — if `clio` is missing, the user is on the MCP-only path: say multi-organization support needs the CLI (`npm i -g jaz-clio`), then continue in single-org mode using whatever key the MCP server already has. If auth commands misbehave, `clio update` (the CLI self-notifies about new versions; do not hand-roll a version comparison).

**5. Connect the organization.** Guide key creation in the Jaz UI (Settings → API keys), then:
```
clio auth add <key>
```
The command validates the key against the API and registers the org under a label. It prints the org name, currency, and country — do not ask the user to retype what it already knows. If the derived label collides with an existing one the command exits — re-run with `--as <label>` to choose a distinct one.

**6. Auto-profile.** Two small calls answer almost everything:
```
clio org info --org <label> --json                                  # identity
clio reports generate ledger-highlights --org <label> --json        # shape of the books
```
Highlights (`get_ledger_highlights` on MCP) returns what the organization actually *uses*, not what exists: `hasCrossCurrencyActivity` and `activeCurrencyCodes` settle `multi_currency`; `transactionCountByType` shows which modules are live (a `FIXED_ASSET` count means the register is in use); `distinctAccountCount` and `activeAccountResourceIds` name the accounts in play; first/last transaction dates bound the periods worth closing.

That matters because *existing* and *used* diverge hard: one real organization had 1,027 accounts of which 144 were active, and 226 bank accounts. Never transcribe the ledger into ORG.md — read highlights, then ask which of the active accounts they reconcile in a close.

**Never run a bare `clio context --json`** — unscoped it preloads every reference entity (1.5 MB on that same org). If you need reference detail, scope it: `clio context --org <label> -w chart_of_accounts --json`.

Present the filled ORG.md and ask the user to confirm or correct. Never present a guess as a fact — mark anything inferred as *proposed*.

**7. Ask the four judgment questions** (nothing else — see `org-interview.md` for the exact wording and why each matters): materiality threshold · close cadence and target day · recurring accruals with their estimation methods · who reviews and signs off.

**8. Derive the slug** from the organization name (lowercase, hyphenated). **If the directory already exists for a different organization, append a short suffix from the organization identifier** — two clients genuinely do share names. ORG.md records the organization identifier as the identity, not the slug.

**If the directory already exists for THIS organization** (its `organization_id` matches), this is a re-onboard, not a new one. Never rewrite ORG.md and never reinstall the starter rules — that would destroy hand-edited materiality, accrual definitions, decisions, and the journal. Show a field-by-field diff of what auto-profiling found against what is on file, apply only what the user accepts, and leave everything else untouched.

**9. Write the workspace**: `orgs/<slug>/` with ORG.md, `.env` (holding `JAZ_ORG=<label>` — a pointer, never a key), and empty `policies/ rules/ skills/ scripts/ work/ closes/`. Install the starter rules from `templates.md` (draft-first, locked-period, review threshold).

**10. Close the loop.** Show the path, the label, and the single next step: `/clio-open <slug>`.

---

## open — start a session on one organization

Triggers: "open <org>", "switch to <org>", "work on <client>", "let's do <org>'s books".

**1. Resolve the slug.** Fuzzy-match against `orgs/*/`. No match → offer the setup flow. Ambiguous → list candidates and ask.

**2. Guard against sync conflicts.** Glob the org directory for `*conflicted copy*` (iCloud writes these when two machines edit the same file). Any hit → stop, list them, and ask the user to resolve before continuing. Proceeding would read stale state.

**4. Load context**: ORG.md, then `policies/` and `rules/`, then `skills/` — org files first, `_shared/` second, and **org-level wins on conflict**. Do not re-read files already in context.

**5. Assert no exported key is hijacking the session.** `JAZ_API_KEY` resolves *before* `--org` and silently voids it, with no error and no organization banner — every write would land in that key's organization instead. Check the shell:
```
clio auth whoami --json
```
The `source` field must be `flag-org`, `env-org`, or `active-file`. If it is `env-api-key`, stop: tell the user to `unset JAZ_API_KEY` in this shell (or open a new one) and start again. Do not proceed and do not write.

**6. Verify the connection with a live call**, not the local profile — `clio auth whoami --org <label>` prints only what is stored on disk and will happily report a revoked key as fine:
```
clio org info --org <label> --json
```
Compare the returned `resourceId` against ORG.md. Different name, same identifier → the org was renamed; flag it and offer to update ORG.md. `401`/`403` → the key was revoked or access removed; send the user to `/clio-keys` and stop. Identifier mismatch → the label points at the wrong organization; stop and do not write.

**7. Cross-check the tool plane.** If MCP tools are available, call `get_organization` and compare its identifier to what `clio org info` returned. A mismatch means the MCP server is pinned to a different organization by a `JAZ_API_KEY` in plugin or connector settings while the CLI points elsewhere — **stop immediately**, tell the user to clear that setting, and do not write anything. Note this check only catches a *divergence*: if the same exported key drives both planes they agree while both are wrong, which is what step 5 exists for.

**8. Report state, then wait**: open close and its phase, next filing deadline computed from ORG.md, count of items awaiting review, last session's closing note. Offer the obvious next action; do not start it unasked.

---

## close — run a period close

Triggers: "close the books for <period>", "run month-end", "close June", "year-end for <org>".

Requires an open session. The playbooks are in the jobs skill — this flow adds state, safety, and resumability around them; it does not restate them.

**1. Resolve the period.** `2026-06` → month · `2026-Q2` → quarter, **fiscal, counted from ORG.md's `fy_end`** (for a 30 June year-end, Q1 is Jul-Sep) · `FY2026` → the fiscal year **ending** in 2026 per ORG.md's year-end. Echo the resolved date range and get confirmation before touching anything.

**2. Preconditions** — check all three, report together, let the user decide:
- Prior period not closed → offer to close it first, or proceed standalone and note the gap in CLOSE.md.
- No prior close on record (first period) → the variance step has no baseline; say so now and skip that comparison rather than inventing one.
- Period already locked → do not attempt to write. Route to the recovery in the jobs skill's error table. Determine this from the platform's lock date, never from CLOSE.md's status: **the ledger is authoritative and CLOSE.md is only a cache.** If they disagree, say so, correct CLOSE.md to match the ledger, and note the divergence before continuing.
- **Contained periods already closed** → before a quarter or year close, look in `closes/` for the months (or quarters) inside this period. The jobs skill's quarter and year playbooks are *standalone by default*: they re-run every constituent month-end step, which posts a second copy of each accrual. If the contained periods are already closed, run the playbook **incremental** (extras only, `--incremental`). Name which contained closes you found and which mode you are using, and get confirmation. If some but not all are closed, stop and ask.
- Required ORG.md fields missing for this close — `materiality` (variance surfacing and review tiering), or `fy_end` for an `FY<year>` period → ask for them now, at the top, naming the step each one feeds, and write them to ORG.md before starting. Do not begin intending to ask later.

**3. Open or resume CLOSE.md** at `closes/<period>/CLOSE.md`. Resuming: read it and **do not re-run confirmed steps**. Any step marked `started` but not `confirmed` crashed mid-write — see the resume rule below before touching it.

**4. Walk the playbook** — month-end, quarter-end, or year-end from the jobs skill (`clio jobs <type> --period <period> --json` prints the same phased checklist if you want it as data). For each step:
- mark it `started` in CLOSE.md **before** the call that writes
- create as draft; add each created record to the review queue with a link built by `navigate` (never write a dashboard URL from memory)
- mark `confirmed` only after the platform confirms
- at any genuine decision, `jot` it

**Resume rule — the one that prevents duplicate journals.** Reconciliation endpoints are not idempotent: calling one twice on the same bank entry creates a second journal (api skill rule 125), and drafts have the same hazard on a second conversion (rule 130). So before re-running any `started` step, verify actual platform state first — `search_bank_records` filtered by `status`, or `search_journals` filtered by `status: DRAFT` — and skip what already landed. Never retry a write on the assumption it failed.

**5. Variances.** For each account moving more than materiality against the prior close, drill the ledger, propose a one-line cause in plain language, and let the user accept or correct it. Accepted explanations get jotted and written to CLOSE.md. Never auto-accept.

**6. Review pack.** After verification and before locking, write the pack to `closes/<period>/workpapers/` and summarize it in chat. Then hand off to the review flow — the close does not finalize its own drafts.

**7. Lock.** Only when the review queue is empty. Present the period, trial balance totals, and any residuals being carried, and require an explicit typed confirmation — not an inferred yes. Then move the lock date forward per the jobs skill's lock step. Generate the formal close summary into `workpapers/` and record the lock in CLOSE.md.

---

## review — clear the queue

Triggers: "what needs my review", "show me the drafts", "approve the close".

**1. Read the queue** from the current CLOSE.md (or the org's open drafts if no close is running).

**2. Present it in two tiers** against the org's materiality threshold:
- **at or above** → one row each: what it is, the amount, why it exists, and its link
- **below** → a single grouped line per kind with a count and total ("11 recognition journals from existing schedules, 4,210 total")

**3. Act on the answer.** Approve → finalize (`bulk_update_journals` for journals, `bulk_finalize_drafts` for invoices, bills, and credit notes). Reject → leave it as a draft and record why. Unsure → leave it queued.

**4. Expect the teammate case.** A `422` saying the entry is already active means someone else finalized it (jaz-api rule 130 — the drafts lifecycle is not idempotent). Mark the item done, do not retry, do not treat it as an error.

**5. Expect the deleted case.** A `404` or not-found means the record was deleted in the interface after it was queued. Mark it `withdrawn` with the date, do not recreate it, and flag it in the review pack — if a close step depended on that entry, that step no longer has evidence and must be revisited before locking.

**5. Update CLOSE.md** and report what is left.

---

## status — everything at a glance

Triggers: "status", "what's due", "how are my orgs doing".

Reads files only. **No API calls, no keys touched** — safe to run any time, including before opening anything.

Across every `orgs/*/`: organization, last closed period, any open close and its phase, next filing deadline computed from the filing fields the user recorded in ORG.md, and items awaiting review. Name the period being filed, not just a date — "the quarter ended 30 Jun, due in 12 days" is actionable, "filing due in 12 days" is not. Sort by urgency: overdue filings first, then open closes, then clean organizations. End with the single most useful next action.

---

## keys — connect, check, rotate

Triggers: "add a key", "rotate the key", "my key stopped working".

Wraps `clio auth`. **Never display a key value.**

- **Check**: `clio auth list`, and `clio auth whoami --org <label>` for one org.
- **Add**: guide creation in the Jaz UI → `clio auth add <key>` → confirm the org it resolved to.
- **Rotate**: create the new key first, then `clio auth add <key> --as <label>-new`. The label is required: `clio auth add` derives it from the organization name, so a same-organization rotation collides with the existing profile and exits. Verify with `clio auth whoami --org <label>-new`, update `.env` to the new label, then `clio auth remove <old-label>` and revoke the old key in the UI. Never revoke before the replacement is proven.
- **Revoked key**: `clio auth remove <label>`, then add the replacement.

**Headless automation.** Scheduled scripts cannot use an interactive credential store. The escape hatch, its exact file location outside the kit root, and the safe loader line are specified in `workspace.md` (Auth model). Say plainly that it trades safety for automation, that the exported key pins the whole shell to one organization, and that the pointer model is better whenever a human is present.

---

## policy — how this organization works

Triggers: "always do X here", "never post to Y", "remember that we…".

Two kinds, and the distinction is the whole point:
- **policies/** — preferences and conventions ("code supplier invoices to the department tag", "chase at 30 days")
- **rules/** — hard constraints the agent must not break ("never finalize without review", "never touch a locked period")

Ask which organization it applies to: this one, or `_shared/` for every organization in the kit. Write it as a short imperative statement with the reason. Confirm the file path afterward so the user knows where it lives.

---

## teach — capture a procedure

Triggers: "remember how I did that", "save this as a procedure", "next time do it this way".

**1. Reconstruct what was actually done** in this session — the real steps and tools, not an idealized version.

**2. Ask scope**: this organization only, or `_shared/`.

**3. Write a skill file** (`skills/<name>.md`): when it applies, the steps with their exact tools, and the gotchas hit along the way. Loaded automatically by the open flow.

**4. In Claude Code only**, offer to mirror it as a personal command in `~/.claude/commands/` that points at the skill file — do not duplicate the content. Other agents reach it through the skill file, so never make the command the only copy. Personal commands share one global namespace with every installed plugin, so prefix the filename with the organization slug (`acme-donor-report.md`, not `donor-report.md`); an unprefixed generic verb can shadow a shipped command.

---

## save — checkpoint without ending

Triggers: "save progress", "checkpoint", "note where we are".

Update CLOSE.md (step states, residuals, accepted variances), append a dated line to ORG.md's journal, list what is outstanding. **Does not sweep and does not end the session.** Use it before a long-running operation or when handing over mid-close.

---

## exit — end the session cleanly

Triggers: "done for today", "wrap up", "finish here".

1. Append a dated summary to ORG.md's journal: what moved, what is pending, what the next session should start with.
2. Update CLOSE.md.
3. If a period was locked this session, generate the formal close summary into `workpapers/`.
4. Sweep scratch: list stale files in the literal path `orgs/<slug>/work/` and ask before deleting anything. Never glob the token `work` — `closes/<period>/workpapers/` matches a careless pattern and is the permanent audit file.
5. Report anything still awaiting review so it is not a surprise tomorrow.

---

## help — what can I do here

Triggers: "help", "what commands", "what can Clio Kit do".

The command table, the current state (which org is open, what is in flight), and the two or three actions that actually make sense right now given that state. Point at the jobs skill for the accounting workflows themselves rather than restating them.
