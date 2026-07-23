# Jaz Kit flows

The canonical procedure for every Jaz Kit operation. Slash commands (`/jk-*`) point here; agents without slash commands reach the same flows from the trigger phrases in `SKILL.md`. One source of truth — command files add nothing.

Schemas live in `workspace.md` (KIT.md, ORG.md, `.env`) and `close-state.md` (CLOSE.md, review pack). Field-by-field onboarding questions live in `org-interview.md`. Copy-paste scaffolds live in `templates.md`.

## Ground rules for every flow

1. **One organization per session — the key decides which.** Each workspace's `.env` holds that company's own `jk-` key, and a `jk-` key is org-scoped: one key, one company's books. So the folder you open determines which ledger you touch — there is no active profile to switch, no label, no `--org` to get wrong. Load the key in the same command as each `clio` call:
   ```
   set -a; . "orgs/<slug>/.env"; set +a; clio <command> --json
   ```
   `set -a; . file; set +a` sources `JAZ_API_KEY` for that one command without echoing it — the value never reaches the transcript or `ps`. Never pass `--org`, never `clio auth switch`, and never carry a `JAZ_API_KEY` exported from another shell into a Jaz Kit session.
2. **Draft first.** `saveAsDraft` defaults to `false` in the API — omitting it posts live. Every write in a Jaz Kit flow sets `saveAsDraft: true` (or `--plan` then a non-finalized run for `clio ct`) unless the org's `rules/` explicitly relaxes that transaction type. Finalization happens in the review flow, never as a side effect.
3. **Never print a key.** The key lives in the workspace `.env`, which the user pastes into — never chat, never a message, never an error. Source the file; do not read the key value into your own output. `jk-` strings are redacted on sight.
4. **Judgment gets recorded.** When the user accepts a variance, carries a residual, or overrides a default, call `jot` at that moment. Mechanical steps never jot.
5. **Report exceptions, not dumps.** Surface the top few items that need a decision; write the full output to the period's `workpapers/`.

---

## setup — set up the kit, onboard an organization

Triggers: "set up Jaz Kit", "add my company", "onboard a new client", "connect another org".

Idempotent. No kit → create it. Kit exists → this is the add-a-company flow.

**1. Locate the root.** `JAZ_KIT_HOME` if set, else `~/Documents/Jaz Kit`. If it exists, skip to step 4.

**2. Ask who is being served** (one question, shapes vocabulary everywhere after):
- *my own business* → say "your books", "your organization"
- *clients* → say "the client", "the engagement"
- *both* → default to client vocabulary, treat own entities as clients

**3. Create the skeleton and KIT.md** from `templates.md`. The keys live inside the kit (step 5), so git hygiene matters — write `.gitignore` **before** `git init` so a key can never be staged:
```
.env
*.env
.env.*
work/
*conflicted copy*
```
Offer git (default yes).

**4. Check the CLI.** Multi-company work runs through the `clio` CLI. If `clio` is missing, say so and offer `npm i -g jaz-clio`; a single company can still work through the plugin's MCP key alone, but the workspace-key model below needs the CLI. If commands misbehave, `clio update` (the CLI self-notifies about new versions — do not hand-roll a version comparison).

**5. Connect the company — its key lives in its folder.** A `jk-` key is org-scoped: one key *is* one company's books, so the key in the folder is all the identity the workspace needs.
   1. Guide key creation in the Jaz UI (**Settings → API keys**).
   2. Write a staging `.env` (`<root>/.new-org.env`) containing the single line `JAZ_API_KEY=` and tell the user the exact path to paste their key after the `=`. **Never take the key through chat** — it goes straight into the file.
   3. Validate and identify the company in one call, sourcing the file so the value never surfaces:
      ```
      set -a; . "<root>/.new-org.env"; set +a; clio org info --json
      ```
      This returns the name, `resourceId`, currency, country, and financial year end — the key was valid if this succeeds, and it names the company so you never ask the user to retype it. A `401` means the pasted key is wrong or already revoked; send them back to step 5.1.

**6. Auto-profile.** Two small calls answer almost everything:
```
set -a; . "<root>/.new-org.env"; set +a; clio reports generate ledger-highlights --json
```
(Identity already came from step 5.3's `clio org info`.)
Highlights (`get_ledger_highlights` on MCP) returns what the organization actually *uses*, not what exists: `hasCrossCurrencyActivity` and `activeCurrencyCodes` settle `multi_currency`; `transactionCountByType` shows which modules are live (a `FIXED_ASSET` count means the register is in use); `distinctAccountCount` and `activeAccountResourceIds` name the accounts in play; first/last transaction dates bound the periods worth closing.

That matters because *existing* and *used* diverge hard: one real organization had 1,027 accounts of which 144 were active, and 226 bank accounts. Never transcribe the ledger into ORG.md — read highlights, then ask which of the active accounts they reconcile in a close.

**Never run a bare `clio context --json`** — unscoped it preloads every reference entity (1.5 MB on that same org). If you need reference detail, scope it: `... clio context -w chart_of_accounts --json` (sourcing the same `.env`).

Present the filled ORG.md and ask the user to confirm or correct. Never present a guess as a fact — mark anything inferred as *proposed*.

**7. Ask the four judgment questions** (nothing else — see `org-interview.md` for the exact wording and why each matters): materiality threshold · close cadence and target day · recurring accruals with their estimation methods · who reviews and signs off.

**8. Derive the slug** from the organization name (lowercase, hyphenated). **If the directory already exists for a different organization, append a short suffix from the organization identifier** — two clients genuinely do share names. ORG.md records the organization identifier as the identity, not the slug.

**If the directory already exists for THIS organization** (its `organization_id` matches), this is a re-onboard, not a new one. Never rewrite ORG.md and never reinstall the starter rules — that would destroy hand-edited materiality, accrual definitions, decisions, and the journal. Show a field-by-field diff of what auto-profiling found against what is on file, apply only what the user accepts, and leave everything else untouched.

**9. Write the workspace**: create `orgs/<slug>/` with ORG.md, the empty folders `policies/ rules/ skills/ scripts/ work/ closes/`, and the starter rules from `templates.md` (draft-first, locked-period, review threshold). Then **move the staging key into place**: `mv <root>/.new-org.env orgs/<slug>/.env`. That file holds the real `JAZ_API_KEY` and is gitignored by step 3.

**iCloud note.** If the kit root resolves under an iCloud-synced path (the default `~/Documents/Jaz Kit` does on most Macs), say so plainly once: the `.env` key will sync to the user's iCloud and their other devices. That is usually an acceptable trade — a `jk-` key is scoped to this one company and revocable in the Jaz UI in seconds — but if they would rather keep keys off the cloud, they can set `JAZ_KIT_HOME` to a path outside `~/Documents` and re-run setup. Their call; make it once, do not nag.

**10. Close the loop.** Show the folder path and the single next step: `/jk-open <slug>`.

---

## open — start a session on one organization

Triggers: "open <org>", "switch to <org>", "work on <client>", "let's do <org>'s books".

**1. Resolve the slug.** Fuzzy-match against `orgs/*/`. No match → offer the setup flow. Ambiguous → list candidates and ask.

**2. Guard against sync conflicts.** Glob the org directory for `*conflicted copy*` (iCloud writes these when two machines edit the same file). Any hit → stop, list them, and ask the user to resolve before continuing. Proceeding would read stale state.

**4. Load context**: ORG.md, then `policies/` and `rules/`, then `skills/` — org files first, `_shared/` second, and **org-level wins on conflict**. Do not re-read files already in context.

**5. Load the company's key and verify it live.** Confirm `orgs/<slug>/.env` exists and holds a `JAZ_API_KEY` line; if it doesn't, the workspace was never fully set up — route to `/jk-keys`. Then, sourcing the key so the value never surfaces:
```
set -a; . "orgs/<slug>/.env"; set +a; clio org info --json
```
Compare the returned `resourceId` against ORG.md. Same identifier, different name → the company was renamed; flag it and offer to update ORG.md. Identifier mismatch → **the wrong key is in this folder** (someone pasted company B's key into company A's `.env`); stop, do not write, send them to `/jk-keys`. `401`/`403` → the key was revoked or access removed; `/jk-keys` and stop. This live check is why the key belonging to the folder matters — a session physically cannot write to the wrong company once its own key verifies.

**6. Cross-check the tool plane.** If MCP tools are available, call `get_organization` and compare its identifier to what step 5 returned. A mismatch means the plugin's own `JAZ_API_KEY` (from connector settings) points at a different company than this folder's key — **stop**, tell the user to clear that setting, and do not write. The MCP plane can't be pointed per-folder; when it disagrees with the workspace key, the workspace key is the intended one.

**7. Report state, then wait**: open close and its phase, next filing deadline computed from ORG.md, count of items awaiting review, last session's closing note. Offer the obvious next action; do not start it unasked.

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

The key is the line `JAZ_API_KEY=jk-...` in `orgs/<slug>/.env`. Everything here is editing that one file. **Never display a key value, and never take one through chat — the user pastes into the file.**

- **Check**: source it and make a live call. `set -a; . "orgs/<slug>/.env"; set +a; clio org info --json` — success means the key is valid and names the company; `401` means it is wrong or revoked.
- **Add / repair** (empty or missing key): tell the user the path and the line to paste (`JAZ_API_KEY=<their key>`), then run the check above.
- **Rotate**: create the new key in the Jaz UI first. Have the user replace the `JAZ_API_KEY=` line in `orgs/<slug>/.env`. Run the check. Only once it passes, revoke the old key in the UI. Never revoke before the replacement verifies — a `jk-` key is org-scoped, so an old and new key for the same company coexist fine until you retire the old one.
- **Revoked / stopped working**: same as rotate — new key in the UI, paste over the line, check.

**Headless automation.** A cron job has no chat to paste into. Point its runner at the workspace file directly with the same safe loader — `set -a; . "orgs/<slug>/.env"; set +a; clio <command>` — and never under `set -x`, never `echo` the variable. It is the same file a human uses; nothing separate to manage.

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

Triggers: "help", "what commands", "what can Jaz Kit do".

The command table, the current state (which org is open, what is in flight), and the two or three actions that actually make sense right now given that state. Point at the jobs skill for the accounting workflows themselves rather than restating them.
