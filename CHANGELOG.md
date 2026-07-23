# Changelog

## [5.29.2] - 2026-07-22

Fiscal year end is now recorded in full ("31 December") rather than the `31-12` form the API returns. Year-end and quarter closes resolve their date range from that field, and the short form is ambiguous — `01-12` could be read two ways.

## [5.29.1] - 2026-07-22

Renamed `/clio-init` to `/clio-setup`. "Init" is programmer shorthand; nobody setting up their books thinks of it that way. Same command, same behaviour — run it once to set up, run it again to add another company.

## [5.29.0] - 2026-07-22

**Clio Kit — run your practice from the terminal.**

A close is not one conversation. Month-end runs eighteen steps over one to three days, and if you serve eight clients you run it eight times with eight different sets of bank accounts, materiality thresholds, and recurring accruals. Clio Kit gives each organization a folder that remembers all of it.

```
/clio-init                  set up the kit, connect an organization
/clio-open acme             load its context, verify the connection
/clio-close 2026-06         run the close — resumable across sessions
/clio-review                approve the drafts waiting on you
/clio-status                every organization, what's due, what's pending
/clio-exit                  journal the session, sweep scratch
```

Plus `/clio-keys`, `/clio-policy`, `/clio-teach`, `/clio-save`, and `/clio-help`. `/jaz-*` runs a workflow; `/clio-*` runs your practice.

**What it remembers.** Each organization gets an `ORG.md` holding the things a close otherwise stops to ask for every time — bank accounts, materiality threshold, recurring accruals and how each is estimated, fiscal year end, filing frequency. Onboarding reads most of it from your ledger and asks you to confirm, rather than interviewing you about facts Jaz already knows.

**What it protects.** Everything is created as a draft, and every record carries a link into Jaz, so you review in the interface and finalize when you're ready — nothing posts live behind you. Interrupted closes resume exactly where they stopped, and any step that was mid-write when a session ended is verified against the ledger before it is retried, so a crash never doubles a journal. The period lock only moves after the review queue is empty and you explicitly confirm.

**Where keys live.** Not in the workspace. They stay in the CLI's credential store, and the folder holds only a label pointing at one. That is what makes the kit safe to keep in Documents, back up, or share with colleagues through a private git repository.

Multi-organization work needs the CLI (`npm i -g jaz-clio`); a single organization works through MCP tools alone. In Codex CLI, Cursor, and Copilot — which have no slash commands — the same flows trigger from plain requests like "open acme" or "close the books for June". Windows is supported by design but not yet verified.

Start with `/clio-init`.

## [5.28.1] - 2026-07-22

Slash commands now ship with the plugin. If you installed Jaz through the Claude Code marketplace, `/jaz-recon`, `/jaz-gst`, `/jaz-payment-run` and the other seven are available immediately — previously they reached only people who installed the `clio` CLI from npm. Nothing to do: update the plugin and type `/` to see them.

## [5.28.0] - 2026-07-22

Focused the slash commands on the jobs that have real steps to follow. Seven commands are retired — four were thin wrappers you never needed (just ask for what you want, and the agent uses the same tools), and three period-close commands are being replaced by a single close command that remembers where you left off.

| Retired | Use instead |
|---------|-------------|
| `/jaz-api` | Ask directly — "create a bill for Acme, $1,200, due 30 June" |
| `/jaz-report` | Ask directly — "trial balance as at 30 June" |
| `/jaz-calc` | Ask directly — "depreciate a $50k asset over 5 years" (or `clio calc <name>`) |
| `/jaz-recipe` | Ask directly — "set up the prepaid insurance" (or `clio ct <recipe>`) |
| `/jaz-month-end` | `/clio-close 2026-06` |
| `/jaz-quarter-end` | `/clio-close 2026-Q2` |
| `/jaz-year-end` | `/clio-close FY2026` |

The ten remaining commands are unchanged: audit-prep, credit-control, doc-collect, fa-review, gst, migrate, payment-run, recon, supplier-recon, tax-sg. Every close playbook, calculator, and recipe is still available in full through the skills and the `clio` CLI — only the command shortcuts changed.

## [5.25.11] - 2026-07-21

- More internal groundwork for progressive memory (feature-flagged off): a saved preference can now carry how strongly it should steer the agent, and a background pass can fold near-duplicate saved preferences into a single instruction. No user-facing changes since 5.25.0.

## [5.25.10] - 2026-07-21

- Internal groundwork for the chat agent's progressive memory (feature-flagged off). No user-facing changes since 5.25.0.

## [5.25.0] - 2026-07-20

- Internal groundwork for the email agent's progressive memory (feature-flagged off). No user-facing changes since 5.24.16.

## [5.24.15] - 2026-07-16

- Rejecting a judgment entry with a rollback now describes the outcome as landing asynchronously. `clio jots dispose` and the skill docs no longer say restores run immediately; a REJECT records right away and, if a rollback was requested, the per-record outcomes land on the entry as each write is restored, readable through `recall`. A partial outcome shown on `dispose` means the rollback is still in progress.

## [5.24.14] - 2026-07-13

- Rejecting a judgment entry now shows what happened to the work behind it. When a rejected entry's linked writes were rolled back (done from the review surface in the dashboard, where restores run immediately), `clio jots dispose` displays the recorded per-record outcome: restored (and to which version), changed since the agent worked on it and left untouched, created by the agent with nothing earlier to restore, or outside the rollback rails. `recall` carries the same outcome on each disposition in `--json` output. Partial results are shown honestly - each record restores independently.
- Repeating a REJECT on an already-rejected entry now replays the original decision instead of stacking a duplicate, and brings its recorded rollback outcome along.
- Clearer guidance when an agent credential tries to ENDORSE or REJECT: those decisions need a signed-in person, and the command now says so and points to `--verb FLAG` instead of showing a generic permission error.

## [5.24.13] - 2026-07-13

- Judgment journal recall gains two facets. `clio jots recall --first-party` keeps only entries written by Jaz-operated agents (the origin is stamped by the server, never self-reported), and `--pinned` keeps only the entries the journal pins to the top: critical calls and deliberately withheld writes. The `recall` tool accepts the same `firstParty` and `pinned` filters, each also accepting false to show only the other side. Entries recorded before origin stamping began count as not first-party; none are hidden.

## [5.24.12] - 2026-07-13

- Help center search now works the same as always with no Jaz account needed. Behind the scenes it is served live rather than shipped inside the extension, so answers stay current and the download is smaller. No change to how you use it.

## [5.24.11] - 2026-07-12

- Recalling judgment entries now shows when the server tidied an entry as it was recorded. A judgment logged without a type is kept under a neutral type (NOTE), and `recall` now notes that adjustment, so a tidied entry is distinguishable from one recorded that way on purpose. Entries recorded cleanly carry no such note.

## [5.24.10] - 2026-07-12

- From the command line you can now record the judgment behind a write inline: add `--jot "<one line>"` to any write command (create, update, delete, pay, finalize, apply-credits, refund, discard, sell, and more) and the reason rides along with that action into the judgment journal — no extra command. Prefix a type for precision, e.g. `--jot "MATCH: same supplier, different reference"`. When you run a write without `--jot`, Clio prints a one-line reminder to record the judgment behind it; silence the reminders with `JAZ_JOTS_NUDGES=0`.

## [5.24.9] - 2026-07-12

- Judgment journal reliability: a judgment recorded without a stated type is now kept under a neutral type instead of being dropped, so no judgment call is lost. Two more high-stakes bulk actions now correctly mark their judgment as critical: promoting a batch of drafts to active, and rolling back a recipe's scheduled entries. Those calls surface at the top of `recall` where they belong.

## [5.24.8] - 2026-07-12

- Judgment journal fidelity: a judgment recorded alongside a payment, deletion, or finalize action now correctly marks that action's role, so those high-stakes calls are treated as critical and surface at the top of `recall` where they belong. The guidance also spells out two cases: accepting or rejecting an inbound external document (an e-invoice a counterparty sent) is a finalize decision, and a deliberate decision not to post something is a recovery, not a deviation.
- Fixed a crash when listing an empty result set with `--all` (for example `clio jots recall --all` on an organization with no entries yet). Empty results now return cleanly.

## [5.24.7] - 2026-07-12

- Internal test-harness update: the integration smoke suite now treats the judgment-journal section as a strict gate now that its routes are live. No user-facing changes since 5.24.6.

## [5.24.6] - 2026-07-12

- Agents now learn the judgment journal earlier. The operating rules that set up a personal agent (Claude Code, Codex, Cursor, and similar) now explain what a jot is, the one rule for when to record a judgment call, and how to recall a prior judgment before repeating it. The same short guidance is given to Jaz's own dashboard-chat and email agents, so they record a judgment call and its basis at the moment it is made. Recording a judgment stays optional and never delays a reply.

## [5.24.5] - 2026-07-12

- Judgment journal polish: the optional judgment note that rides a write action now asks for a line only when the action involved a real judgment call (which account, which match, an assumption, a risk accepted, a deviation), and says to skip it for mechanical actions. A write that times out now also suggests recording a deliberate non-retry, matching what a failed write already does. Set `JAZ_JOTS_NUDGES=0` to turn these reminders off.
- From the command line you can now point `clio` at a non-production Jaz API for a single run by setting `JAZ_API_URL`. It applies only to direct API-key sessions and defaults to production when unset.

## [5.24.4] - 2026-07-12

- Internal efficiency update: recalling judgment entries with `--all --stats` now requests the full-result disposition aggregate once per run instead of recomputing it on every paginated page. Results are identical. No user-facing changes since 5.24.3.

## [5.24.3] - 2026-07-11

- Internal quality-harness update: adds evaluation rubrics and a measurement report for the judgment journal. No user-facing changes since 5.24.2.

## [5.24.2] - 2026-07-11

- The accounting playbooks now mark their judgment moments. The month-end close, bank reconciliation, and payment run playbooks (and the transaction recipes) note exactly where to record a judgment entry (deferring bills at a cash gate, archiving a suspected duplicate, accepting a close variance, resuming after a failed run), so the call and its basis land in the organization's judgment journal at the moment the decision is made.

## [5.24.1] - 2026-07-11

- The judgment journal now introduces itself where it matters: the first write action of a session notes that the organization keeps a judgment journal, a failed write suggests recording a deliberate non-retry decision, and every write operation carries a one-line reminder to record judgment calls (jot field or jot tool). Set `JAZ_JOTS_NUDGES=0` to turn these reminders off.

## [5.24.0] - 2026-07-11

- Judgment notes now ride the action itself: every create, update, delete, and other write operation on the hosted connector surface accepts an optional `jot` field. Record the judgment behind an action in one line on the call you are already making (for example "MATCH: treated as distinct from the earlier bill because the references differ") and it lands in the organization's judgment journal, linked to the records the action touched. A jot never blocks or slows the action it rides on, and `recall` finds it later.

## [5.23.0] - 2026-07-11

- New judgment journal: record the judgment calls behind your books with the `jot` tool, capturing the decision, the basis, the alternatives ruled out, and the records it touched. Look up prior judgments and precedents with `recall` (filter by record, kind, severity, review status, time range, or freetext). Also from the command line: `clio jots create`, `clio jots recall`, and `clio jots dispose` for review verdicts (flag / reject / endorse).

## [5.22.0] - 2026-07-10

- Dashboard navigation is now one `navigate` tool: call it with no destination to discover where you can go (screens and record views, filterable by keyword), then pass the destination key to get the deep link — one tool instead of two, with a leaner agent context. The previous tool names (`find_dashboard_destinations`, `get_dashboard_url`) keep working as aliases, so existing integrations are unaffected.

## [5.21.0] - 2026-07-10

- The agent now runs on OpenAI's GPT-5.6 Terra model (chat, email, and Telegram surfaces). Stronger reasoning and a much larger working context, at roughly half the input cost of the previous model.

## [5.20.45] - 2026-07-09

- Internal release automation update. Hardens the post-deploy fire smoke suite (crash-proofs a `set -e` footgun that could abort a whole run, and stops counting async-extraction slowness / GitHub rate limits as test failures). No user-facing changes since 5.20.43.

## [5.20.43] - 2026-06-30

- When setting up claims, the assistant now points straight to the fix instead of a raw error: a claim type needs an expense account, an employee must bind to the right team-member account, and on a tax-inclusive policy every claim line needs a tax category — each now comes with a one-step suggestion to resolve it.

## [5.20.42] - 2026-06-30

- Snap an expense receipt and it files to you automatically — no extra step to say who it's for. To file on someone else's behalf, name the employee (`clio claims from-attachment --employee`); a claims manager/admin can do that.
- A claim now needs a reference before it can be submitted (drafts still save without one).
- Payout search now includes gateway disbursements alongside direct book entries.
- Removed the employee "default approver" field — an employee's approver now comes from their claim profile.

## [5.20.41] - 2026-06-29

- Documentation polish: the README reference catalog now lists the claims, orders, bank-rule, and search references, and the copy is standardized on "agent". No user-facing product changes since 5.20.40.

## [5.20.40] - 2026-06-28

- Removed the claim-profile digest-email toggle (`digestEmailEnabled`, the `--digest-email` flag on `clio claim-profiles`). The setting is being retired from the product, so it's no longer exposed via the assistant, the CLI, or search filters.

## [5.20.39] - 2026-06-28

- Internal documentation update — the CLI command reference now covers the employee-claims commands (claims, employees, claim-types, claim-profiles, posting-rules). No user-facing product changes since 5.20.38.

## [5.20.38] - 2026-06-28

- Create an expense claim directly, without a receipt to attach. The new `create_claim` (and `clio claims create`) files a claim from the details you give — employee, vendor, amount, line items — and either saves it as a draft or validates and submits it in one step.

## [5.20.37] - 2026-06-28

- The assistant now tells a vendor bill apart from your own expense claim and routes each correctly. A receipt for something you paid out of pocket becomes a reimbursement claim filed to you (it knows who you are and what you're allowed to do), while a supplier's invoice becomes a bill — no more treating an employee expense as a vendor bill.

## [5.20.36] - 2026-06-28

- The assistant can now look up your own profile — who you are, the employee record linked to your login, and which areas you have access to — so it can act on your behalf, like filing an expense claim for you and knowing whether a receipt should become a bill or a claim.

## [5.20.35] - 2026-06-28

- File an expense claim straight from an emailed receipt. `create_claim_from_attachment` (and `clio claims from-attachment`) now accept the email body itself or raw HTML — not just a file or a link — so a receipt that arrives in an email becomes a draft claim with no manual re-keying, the same way bills already work.

## [5.20.34] - 2026-06-28

- Create an expense claim straight from a receipt on your computer (not just a link): the new `--file` option uploads a local PDF, photo, or scan and the assistant extracts a draft claim from it.

## [5.20.33] - 2026-06-28

- Manage your employees (expense-claim members) end to end: add, edit, search, and archive them, look up reimbursement balances owed, link an employee to a login user, and bulk-import a whole roster from a sheet (preview the rows first, then import).

## [5.20.32] - 2026-06-28

- Close the loop on expense claims. The assistant can now preview and post approved claims into journal entries, record employee reimbursements and advances as books entries, and look those payouts up. It can also create a claim straight from a receipt link — scan the document and a draft claim appears. (Recording books entries only — no money is moved out.)

## [5.20.31] - 2026-06-28

- Work employee expense claims end to end. The assistant can now find claims (by status, employee, vendor, reference, date, or amount), edit a draft's line items and details, and move a claim through its lifecycle — submit, approve, reject, cancel, unpost, or delete — with the same rules your team sees in the app. It can also action many claims at once (bulk submit, approve, reject, cancel, or delete), which runs in the background and hands back a job you can track.

## [5.20.30] - 2026-06-27

- Set up your expense-claim configuration from the assistant or CLI: create and manage claim types (expense categories), claim profiles (per-employee approval and spend-limit policies), and posting rules (how approved claims group into journal entries).

## [5.20.29] - 2026-06-25

- When the agent files a whole folder or batch of documents, it now replies right away that the drafts are being prepared and will appear in your Drafts as they finish, instead of pausing on a long completion check that — on a big batch — could look like an error even though everything succeeded. The drafts are created exactly as before; only the wait-and-report behavior changed.

## [5.20.28] - 2026-06-25

- Hand the agent a whole folder of paperwork and it sorts and files it for you. Paste a Dropbox, Google Drive, or OneDrive folder share link (or a .zip of mixed documents) and the agent now classifies each file into invoices, bills, credit notes, and bank statements, then creates the drafts. Previously it asked you to paste each file link one at a time. Single documents work exactly as before.

## [5.20.27] - 2026-06-24

- Adds a read-only `clio resolve <account|contact|bank|tax-profile> <name>` command that returns the resourceId for a name (the same lookup the agent uses), and routes the post-deploy smoke test through it so test and product share one resolver. Also makes the smoke fixtures durable so the shared test sandbox stops accumulating undeletable accounts. No change to existing extension behavior.

## [5.20.26] - 2026-06-24

- Internal release automation update. Hardens the post-deploy smoke test's bank-account-by-name guard against accumulated test-data drift in the shared fire sandbox. No user-facing changes to the extension since v5.20.25.

## [5.20.25] - 2026-06-23

- Internal release. Fixes a post-deploy smoke test (account lookup by name) and hardens it against test-data drift. No user-facing changes to the extension.

## [5.20.24] - 2026-06-23

- Internal release. Fixes a streaming failure in the hosted agent service where replies died mid-response (`Premature close`) on Node 22 — the OpenAI client now uses the platform's native fetch instead of node-fetch. No user-facing changes to the extension.

## [5.20.22] - 2026-06-22

- More on-hand for the agent: it can now manage catalogs (named groupings of your products/services), browse your saved report templates, and move transactions from one capsule to another. The bank-rule help also now explains column-based mapping in full (how a statement column drives the account, tax, classifier, contact, or tag).

## [5.20.21] - 2026-06-22

- The agent can now look up a few more things on its own: which features your organization has enabled, your account classifications, and your purchasable items — handy when it's helping you set up accounts or purchase documents.

## [5.20.20] - 2026-06-22

- When setting up a bank reconciliation rule, the agent now understands column-based mapping — pulling the amount, account, tax, classifier, contact, or tags for each row from a column in your bank statement, instead of a single fixed value.

## [5.20.19] - 2026-06-19

- ChatGPT and Claude connectors now reliably create bills and invoices instead of getting stuck. When you attach an invoice or bill, they reach for AI extraction and create the draft for you, and they no longer claim a tool is missing when it isn't. For documents that are still being prepared, they tell you it's on its way to your Drafts rather than inventing a link.

## [5.20.18] - 2026-06-18

- Links in email and chat replies now point somewhere real. When a document you send is still being prepared in the background, the reply tells you it's on its way and takes you to your Drafts tab — instead of a "review draft" link that could land on a missing page. Replies also include a link only when it's the useful next step, not on every message.

## [5.20.17] - 2026-06-17

- Forwarded receipt and invoice emails now reliably create a draft from the original document — including when you reply later to confirm (e.g. "just create it"). Previously a follow-up reply could lose the forwarded document and fall back to reading the email text, producing an inaccurate draft.

## [5.20.16] - 2026-06-17

Internal release. No user-facing changes since v5.20.15.

## [5.20.15] - 2026-06-17

Internal release. No user-facing changes since v5.20.14.

## [5.20.14] - 2026-06-15

- Clearer setup field for your Jaz API key: the hint now shows you can paste a personal access token, or several API keys separated by commas to connect multiple organizations.

## [5.20.13] - 2026-06-12

- Connector icon sourced from high-resolution design asset for sharper rendering.

## [5.20.12] - 2026-06-12

- Connector icon now uses a transparent background for clean rendering in dark-mode UIs.

## [5.20.11] - 2026-06-12

Internal release. No user-facing changes since v5.20.10.

## [5.20.10] - 2026-06-12

- Updated connector description.

## [5.20.9] - 2026-06-12

- Smarter dashboard deep links: destination search understands everyday transaction vocabulary (invoice, bill, credit note), and an empty lookup now suggests broader product-area terms to retry with — so the agent lands on the right dashboard page or record link instead of giving up.

## [5.20.8] - 2026-06-11

- Sturdier tool definitions: every write tool's parameters are now checked against the platform API schema in CI, so enum values and required fields can never silently drift out of date.

## [5.20.7] - 2026-06-11

Internal type-safety and test hardening. No user-facing changes since v5.20.6.

## [5.20.6] - 2026-06-11

- Microsoft 365 Copilot support: connect Jaz to a Copilot Studio agent through the hosted connector. OAuth sign-in, no install. The README documents the full setup, plus the local VS Code path for the Microsoft stack.

## [5.20.5] - 2026-06-11

- Documentation refresh: accurate tool and capability counts, leaner and cleaner READMEs.

## [5.20.4] - 2026-06-11

Internal release. No user-facing changes to the extension since v5.20.3.

## [5.20.3] - 2026-06-10

- Tool search understands natural phrasing better: filler words no longer skew results, so requests like "take me to reports" or "share a link to this" reliably surface the navigation tools.
- The bundled agent skills now document dashboard deep links end to end — coding agents build links with the navigation tools instead of guessing URLs.

## [5.20.2] - 2026-06-10

- Deep-link destination discovery recovers from no-match searches: when a term like "card details" finds nothing, it now suggests retrying with broader product-area terms ("billing", "settings") instead of returning an empty result.

## [5.20.1] - 2026-06-10

Internal release automation update. No user-facing changes since v5.20.0.

## [5.20.0] - 2026-06-10

- Get a direct link to anywhere in Jaz. Ask for a report, a list, or a specific record — a sale, a bill, a credit note — and get back a URL that opens it straight away, pointed at the right organization.

## [5.19.0] - 2026-06-09

- Aged receivables and payables now return a compact aging-bucket summary by default; ask for the per-contact breakdown to dig in.
- Steadier lookups by name or number — a name or reference is searched for, not mistaken for an internal id.
- Clearer numbers — negatives show in parentheses.

## [5.18.3] - 2026-06-07

Internal test-suite hardening. No user-facing changes since v5.18.2.

## [5.18.2] - 2026-06-07

Internal release. No user-facing changes since v5.18.1.

## [5.18.1] - 2026-06-06

Use Jaz in Claude and ChatGPT with no install. Add the hosted connector at `https://mcp.jaz.ai/mcp` as a custom connector and sign in with your Jaz account — no API key to set, and one sign-in reaches every organization you belong to. The docs now cover this remote-connector path alongside the local install options.

## [5.18.0] - 2026-06-06

Reconciliation review at a glance. Auto-reconciliation suggestions can now include the bank line — its date, amount, and who it's with — right next to the bill or invoice it matches, so you can confirm a match without opening each one.

## [5.17.1] - 2026-06-06

Sharper tool search. When you search for a specific operation (for example "invoices download"), the exact tool now surfaces first instead of the generic list — a keyword that points to one tool outweighs the namespace name that every tool in the group shares.

## [5.17.0] - 2026-06-05

Drop a whole folder, ZIP, or share link of mixed accounting paperwork and let the agent sort and file it for you. Three new capabilities, available to the CLI, the MCP tools, and the AI agent:

- Auto-sort a pile of documents. Point it at a folder, a .zip, or an https link (a direct file/zip URL, or a Dropbox / Google Drive / OneDrive share) and it classifies every file into invoices, bills, customer and supplier credit notes, and bank statements, without creating anything yet, so you can review the breakdown first.
- Extract the whole batch in one go. Confirm, and it sends each document to AI extraction (bank statements imported as statements, everything else as draft transactions), skipping duplicate files automatically. A merged PDF that holds several documents is split apart on the way in.
- Wait for the results. A new step polls the extraction jobs and reports when each document's draft is ready, or why it failed, so a long batch finishes cleanly instead of leaving you guessing.

## [5.16.4] - 2026-06-05

Fixed AI document-extraction status checks hanging. `clio magic status --wait` (and any flow that waits for extraction to finish) used to wait the full timeout instead of noticing when a document had finished extracting. It now recognizes completed, failed, and partially-completed workflows correctly, and checks them all in a single batched request.

## [5.16.3] - 2026-06-05

Reading rows from an attached spreadsheet now works reliably. Excel (.xlsx) attachments parse correctly, and multi-sheet workbooks are handled cleanly: a blank cover page is skipped to the first sheet that has data, and if a sheet's header row is malformed you get a clear message listing the available sheets — rather than rows being read from the wrong sheet. CSV attachments are unchanged.

## [5.16.2] - 2026-06-05

Documentation cleanup. The agent's API reference no longer lists a set of bulk-update and legacy search endpoints that have been retired from the platform, so the agent won't surface or attempt calls that are no longer available. Everyday accounting commands and behavior are unchanged.

## [5.16.1] - 2026-06-04

Chart of accounts period locks can now be removed, not just set. Building on 5.15.0 (which added setting a lock date when you create or update a ledger account), you can now clear an account's lock date to re-open that period for editing. Setting and keeping lock dates is unchanged.

## [5.16.0] - 2026-06-04

Focused the agent toolset on core Jaz accounting operations. The period-close and operational job checklists (month-end, quarter-end, year-end, bank reconciliation, GST/VAT, payment run, credit control, supplier reconciliation, audit prep, fixed-asset review, document collection, statutory filing) now run through the jobs skill and the `clio jobs` command instead of standalone tools. The local practitioner-workspace scaffolding tools have been retired. Everyday accounting tools (invoices, bills, journals, payments, reconciliation, recipes, reports) are unchanged.

## [5.15.0] - 2026-06-04

Two improvements to everyday bookkeeping. Chart of accounts now supports period lock dates: set a lock date when you create or update a ledger account to block recording or changing transactions on or before that date, and the lock date is kept intact when you rename the account. And creating invoices, bills, and credit notes no longer requires a contact up front — save the document now and assign the customer or supplier later.

## [5.14.4] - 2026-06-03

More results per lean search. Because the compact summary rows are far smaller, the agent now fetches up to 50 of them per page by default (was 20) on the supported entities — more coverage in a single call, fewer back-and-forth round trips. Full-detail searches still default to 20, and an explicit limit always wins.

## [5.14.3] - 2026-06-03

The compact `view` option is now consistent across every surface. The CLI gains `--view lean` on `search` and `list` for the supported entities (invoices, bills, contacts, items, journals, customer/supplier credit notes, sale/purchase orders) — summary rows for a quick scan, defaulting to full as before. The agent skill docs now spell out the page-then-drill pattern (search lean to find a record, then read it in full).

## [5.14.2] - 2026-06-03

Lighter list tools too. The compact-by-default behaviour added for search now also applies to the list tools that have a summary view (list_invoices, list_bills, list_contacts, list_items, list_journals, list_customer_credit_notes, list_supplier_credit_notes): they return summary rows by default and drill into the full record on demand. Pass view "full" for complete rows.

## [5.14.1] - 2026-06-03

More reliable handling of large search results. When a search or list result is too big to return in full, the agent now drops whole records from the end (and notes how many) instead of cutting off mid-record. The result stays readable, so the agent can still act on what it got and knows to narrow the search.

## [5.14.0] - 2026-06-03

Faster, lighter search. The agent's search tools (search_invoices, search_bills, search_contacts, search_journals, and the rest) now return a compact summary row per result by default: the key fields needed to find a record (id, reference, status, date, contact, amount), then drill into the full record on demand with its get tool. This cuts the data each search pulls by roughly 10x, so the agent answers "find the unpaid invoice for Acme" style questions faster and at lower cost. Pass view "full" on a search when you want complete rows up front.

## [5.13.12] - 2026-06-03

Internal release. No user-facing changes since v5.13.11. (Smoke test + jaz-api skill docs updated to track an upstream Orders change: a sale-quote / purchase-request `orderState` is now an order+invoice rollup — `PARTIALLY_ORDERED` while a confirmed order is not yet fully invoiced/billed, then terminal `FULLY_INVOICED` / `FULLY_BILLED`; the old `FULLY_ORDERED` value was retired. Test and documentation accuracy only.)

## [5.13.9] - 2026-06-02

Internal release automation update. No user-facing changes since v5.13.8. (Excludes local-only filesystem tools — the `practice` practitioner-workspace scaffolding — from the hosted mcp.jaz.ai connector surface, where they'd run against the server rather than the user. They remain available on the Claude Code / desktop-extension surface. Hosted/connector only.)

## [5.13.8] - 2026-06-02

Internal release automation update. No user-facing changes since v5.13.7. (Adds the directory-grade "namespace mode" for the hosted MCP connector at mcp.jaz.ai — ~37 resource-scoped namespace tools, generated from the registry, that keep all ~300 operations reachable within the ChatGPT/Claude connector tool budgets and review rules. Hosted/connector surface only; Claude Code and the desktop extension keep the existing meta-tool surface.)

## [5.13.7] - 2026-06-02

Internal release automation update. No user-facing changes since v5.13.6. (Corrects the MCP flat-mode tool annotation `openWorldHint` — it now reflects whether a tool reaches a party outside the organization's own Jaz data, defaulting false for the closed bookkeeping domain, instead of being hardcoded true. Affects the hosted/flat MCP surface only.)

## [5.13.6] - 2026-06-02

Internal release automation update. No user-facing changes since v5.13.5. (The hosted MCP endpoint now resolves the organization from the OAuth token instead of requiring a request header, so a remote connector forwards only the bearer. Daemon/infrastructure only.)

## [5.13.5] - 2026-06-02

Internal release automation update. No user-facing changes since v5.13.4. (Adds the public-hosting layer for the remote MCP endpoint — DNS-rebinding Host allowlist, per-IP rate limit, and the K3s manifests/workflow for mcp.jaz.ai. Daemon/infrastructure only, not part of the desktop extension.)

## [5.13.4] - 2026-06-02

Internal release automation update. No user-facing changes since v5.13.3. (Adds a hosted MCP Streamable-HTTP endpoint to the serve daemon — groundwork for remote connectors, not part of the desktop extension.)

## [5.13.3] - 2026-06-01

### Smarter help-center search (opt-in)

`search_help_center` now does hybrid retrieval (semantic + BM25) when `CLIO_HELP_CENTER_OPENAI_API_KEY` is set, finding articles whose meaning matches your question even when wording doesn't. BM25 lexical search continues to work unchanged for users who don't opt in.

## [5.13.2] - 2026-06-01

### Safer multi-organization handling

When you connect more than one organization and the list cannot be loaded for a moment, the agent now declines organization-specific actions with a clear message instead of risking the wrong organization. A brief hiccup loading your organizations no longer drops the ones it already knows about.

## [5.13.1] - 2026-06-01

### Personal access tokens now authenticate

Personal access tokens (the `pat-…` keys for multi-org access) were rejected because of a prefix mismatch, so they never worked. They now authenticate correctly — set one as your `JAZ_API_KEY` just like a `jk-…` key.

## [5.13.0] - 2026-05-31

### Turn a quote or order into an invoice or bill in one step

You can now convert a sale quote or sale order straight into an invoice, and a purchase request or purchase order straight into a bill. The line items, contact and amounts carry over, and you can set the new document's reference, dates, payment terms and notes. Each conversion creates a brand-new invoice or bill — it doesn't move or consume the original — so you can review it before anything posts.

### Order attachments, line-item search, and more PDF downloads

- Attachments now work on sale quotes, sale orders, purchase requests and purchase orders — not just invoices and bills.
- A new line-item search finds individual order lines across your quotes and orders (by description, account, amount, open/closed state, or date) — handy for questions like "what's still open for this customer".
- You can now download a bill or a supplier credit note as a PDF, alongside the existing invoice and customer-credit-note downloads.
- When you build an invoice or bill yourself, you can link it back to the originating order for a clean paper trail.

## [5.12.2] - 2026-05-31

Internal release automation update — a CI guardrail that detects when the Jaz API surface changes underneath the tools. No user-facing changes since v5.12.1.

## [5.12.1] - 2026-05-31

### Removed two tools that never worked

Two tools pointed at API endpoints that don't exist, so they always failed: converting a message to a PDF and fetching extracted table data from an attachment. They've been removed (along with their `clio reports pdf` and `clio attachments table` commands) so the agent no longer offers actions that can only error out — plus an unused internal inventory-search helper that was never exposed as a tool. Reading tabular files still works via the spreadsheet reader, and document extraction still works via the attachment/Magic flow.

## [5.12.0] - 2026-05-31

### Customize the text a recipe generates

When you trigger an IFRS recipe (prepaid amortization, deferred revenue, loan, lease, accrual & reversal), you can now customize the text it produces — the capsule title and description, the label and description on each scheduled entry, the journal-line memos, and the schedule reference. Change only the parts you want; everything else keeps its default wording. Preview a recipe first to see which text it lets you edit and confirm your changes before anything posts.

### New commands to work with recipes directly

A new `capsule-recipes` command group lets you list the available recipes, inspect a recipe's inputs and editable text slots, preview the full schedule before posting, and resume or roll back a recipe run.

## [5.11.2] - 2026-05-30

### Searching quotes and orders works

Searching sale quotes, sale orders, purchase requests, and purchase orders — by status, contact, date, amount, or reference — now returns results reliably. A server-side issue had been causing these searches to fail; that is fixed, and the agent guidance now reflects that order search is fully available alongside list and get.

## [5.11.1] - 2026-05-30

### More report types deliver as real files

When you ask the agent for a report file ("send me the trial balance as Excel", "the P&L as a PDF"), the right file lands in the channel instead of inline data. Coverage now spans the full set of analytical, financial, and audit exports — trial balance, balance sheet, profit & loss, cashflow, AR/AP aging, customer/supplier/product summaries, anomaly analyses, statement of account, tax ledger, equity movement, bank reconciliation, fixed assets, and journal summary, among others.

PDF output is now supported for balance sheet, profit & loss, trial balance, and cashflow. All other reports continue to deliver as XLSX.

### Inviting and updating administrators works end-to-end

Inviting a teammate with admin access — or moving an existing user to admin or revoking their access on a specific module — used to fail with a confusing validation error. Both flows now go through cleanly from the agent and from `clio org-users invite` / `clio org-users update`.

## [5.11.0] - 2026-05-30

### Sales orders and purchase orders

Full support for the documents that come before an invoice or a bill: **sale quotes**, **sale orders**, **purchase requests**, and **purchase orders**. Create, view, search, update, and move them through their lifecycle (accept a quote or request, confirm an order, void, delete).

A sale order can be raised from an accepted quote, and a purchase order from an accepted request — the link is kept, and the quote/request shows how much of it has been ordered. The agent guides you through the right order of steps (e.g. accept the quote before raising the order) and explains the fix when something is out of sequence. The full command set, including bulk actions, is available in the CLI under `clio sale-orders` and `clio purchase-orders`.

## [5.10.1] - 2026-05-29

### Read invoice / bill rows directly from CSV and Excel attachments

When a user shares a CSV or Excel attachment for bulk action — exchange rates, opening balances, account mappings — the agent can now read rows directly via `read_spreadsheet_rows` instead of asking the user to paste them. Pagination (`offset`, `limit`), multi-sheet workbooks (`sheetIndex` + `availableSheets`), and presigned S3 URLs are all supported. CSV cell precision is preserved (financial decimals, leading-zero codes, FX trailing zeros).

### Inbound-email body as a transaction source

When an invoice or bill sits in the email body itself (no file attached), the agent creates the draft directly from the body — no copy-paste, no file step. Works alongside the `html` parameter from 5.10.0 (which other channels still use).

### Safer attachment URL fetching

SSRF guard + bounded streaming fetch closes a few footguns: link-local and cloud-metadata-service IPs are blocked, DNS-rebind TOCTOU is plugged with a re-resolve at fetch time, and large bodies are capped (20 MB for spreadsheets).

## [5.10.0] - 2026-05-29

### Create a transaction straight from email HTML

When you have an invoice or bill as an email body (or any raw HTML) rather than a file, the agent can now create the draft transaction directly from that HTML. It is rendered and extracted in one step, with no need to save it to a file first. `create_bt_from_attachment` gains an `html` input, and `clio magic create` gains a `--html` flag (an inline string, or `@path` to read from a file). Uploading a file or pointing at a URL works exactly as before.

## [5.9.0] - 2026-05-29

Reconciliation — the workflow most often handed to an agent to finish — can now match a bank statement line to an **existing** open bill, invoice, or payment, instead of only creating a new one.

### Match a bank line to an existing open bill or invoice

Ask the agent to "reconcile this bank entry against bill X" and it records the payment against the open bill and reconciles the line in one step — no need to mark the bill paid first. Three new actions: match to existing bills/invoices/payments, bulk-accept suggested matches, and accept a learned-match suggestion. Foreign-currency entries are handled automatically — the exchange rate is resolved for you, so a USD bill paid from a USD account reconciles without entering a rate.

### Smarter auto-reconciliation suggestions

Auto-reconciliation suggestions now come back ready to act on: each one names the action to take and carries a confidence level, so the agent can clear high-confidence matches end-to-end and surface only the ones that need a human look. Matching an existing transaction is now the default — creating a duplicate is the fallback only when nothing matches.

## [5.8.1] - 2026-05-28

### Fixed

Pagination guidance for agents is now consistent everywhere. Search and list `offset` is a 0-indexed page number (offset 1 = the second page of `limit` rows), not a row-skip count. The MCP server instructions, the API skill rules, and the agent operating-rules file now all state this clearly, matching the CLI reference docs that already did. Six CLI `--offset` help texts that still read a bare "Offset" now read "Page number offset (0-indexed)" like the rest. No behavior change: the underlying pagination has always worked this way.

## [5.8.0] - 2026-05-28

Sprint 2 wave-2 ship. Daemon-side instrumentation + Anthropic prompt-cache pre-warm.

### Faster first response after the daemon starts

When `clio serve` boots with `LLM_PROVIDER=anthropic`, the daemon now seeds the Anthropic prompt cache during startup so the first real message after a daemon boot reads from cache instead of paying the cache-write cost. First-message time to first token drops by roughly one to two seconds. Opt out with `CLIO_DISABLE_PREWARM=1`. The pre-warm is fire-and-forget so daemon startup is not blocked.

OpenAI deployments skip the pre-warm automatically (different cache-pricing model). An equivalent prewarm for OpenAI Responses API context caching is on the follow-up list.

### Instrumentation for stack operators

Three new Prometheus metric families on the daemon `/metrics` endpoint:

- `clio_workflow_ttfmo_seconds{workflow, channel}`: time to first content event per workflow class. Workflow labels derive from the rubric corpus so the label space grows with the agent surface, not a hard-coded list. Tool-first turns count tool_start as the first event; see help text for the exact semantics.
- `clio_agent_repair_loops_total{channel, anchor_tool}`: count of sessions where the agent followed a repair suggestion and the original tool errored again. Informational only at this stage (no CI gate) until validated against a real-traffic labeled corpus.
- `clio_agent_repair_loop_size{channel}`: distribution of consecutive failed retries within a repair loop.

Each completed session also emits a `_event: session.complete` structured log line that rolls up turns, tool calls, repair loops, cost, workflow class, and cache hit ratio. Per-turn `agent.turn` log lines now also carry `isRepair: boolean` on each tool call so downstream consumers can trace the repair-loop pattern at turn resolution.

### Notes

No breaking changes. Tool count unchanged at 285. Default behavior preserved across every channel. Every new capability is opt-in via env var or surfaced only when the daemon is configured with a matching provider.

## [5.7.2] - 2026-05-28

Internal release — server-side daemon fixes. No user-facing changes since v5.7.1.

## [5.7.1] - 2026-05-28

Patch on top of v5.7.0.

### Fixed

- v5.7.0 release notes rewritten to remove em dashes (tone-profile alignment for the GitHub release notes pane).
- `jaz-agent-rules.md` template now states the current 285-tool count. Previous releases left it stale at 284, so fresh `practice` workspaces installed a contradictory rule file. The platform-rules template now syncs at release time alongside README + manifest.

### Internal

- `scripts/sync-stats.sh` extended to cover `src/templates/platform-rules/jaz-agent-rules.md`. Future tool-count drift on this path gets caught at validate-plugin time.

## [5.7.0] - 2026-05-28

Agent stack speed and delight pass. Wave 1 of the speed/delight masterplan ships as one release.

### Agent error recovery

When a tool call fails with a known-recoverable cause (resource not found, missing foreign key, duplicate reference, tax-direction mismatch), the response now carries a structured `repair` block telling the agent exactly which read-only tool to call next instead of leaving it to guess from free-text. The block always points at a `search_*`, `list_*`, `get_*`, `view_*`, or `describe_*` tool. Never a write or destructive one. Agents that decode the block recover in one turn instead of the usual three or four. The Telegram and ChatKit operator views surface the same suggestion as a "Suggested next step" line below the error.

### Pre-flight guard on finalize

Finalizing an invoice, bill, customer credit note, or supplier credit note without `accountResourceId` on every line item now fails fast with the same structured `repair` pointer (suggested next tool: `search_accounts`) without burning a round trip on the API. Applies to `create_*` calls with `saveAsDraft: false` and to all four `finalize_*` calls. Drafts still allow missing line item account IDs as before.

### Write tools can return the full entity

`create_invoice`, `create_bill`, `create_journal`, `create_contact`, and `create_item` now accept `returnFullEntity: true`. The agent gets the populated entity back from the create call instead of the previous `{ resourceId }` stub, so the standard "create then re-fetch" round trip collapses to one turn. Default behavior is unchanged.

### MCP flat mode with parallel-safe annotations

Hosts that benefit from a full eager tool list (Claude Code in particular) can opt into `JAZ_MCP_FLAT=1` to receive every tool with per-tool `readOnlyHint`, `destructiveHint`, `idempotentHint`, and `openWorldHint` annotations on `tools/list`. With the hints in hand, the host parallelizes read-only chains roughly 2x. Default mode is unchanged (3-meta-tool lazy discovery at ~363 tokens) for hosts that prefer the smaller handshake.

### Operator-visible run metrics

Set `CLIO_CLI_METRICS=1` to print a one-line summary at the end of every invocation: turns, input/output/cached tokens, cost, wall-clock duration, and time-to-first-token where streaming applies. The same line appears in MCP stdio mode so hosts that surface stderr in tool-call panels can show it. Coexists with the existing daemon Prometheus metrics; they serve different audiences and both stay on. Off by default.

### Instrumentation for stack operators

New Prometheus histograms for time-to-first-token (`clio_llm_ttft_seconds`) and prompt cache hit ratio (`clio_llm_cache_hit_ratio`). New per-turn structured log line (`_event: "agent.turn"`) makes multi-turn cost and repair-loop patterns analyzable. PII redaction in the daemon logger now covers contact name, email, phone, and line-item description fields at three nesting depths.

### Notes

All changes hold the existing tool count (285) and overall manifest token cost. No breaking changes. Internal-only telemetry and ops tooling that supports this work is documented separately and is not part of the public extension surface.

## [5.6.10] - 2026-05-28

Internal release. Pre-release audit now also runs at commit time, in addition to the existing release-time check. No user-facing changes since v5.6.9.

## [5.6.9] - 2026-05-28

Internal release. Email channel daemon now sends the correct delegated-auth headers when calling the upstream API on behalf of an organization user (previously sent unrecognized header names, causing the upstream to reject every request with 401). No user-facing changes since v5.6.8.

## [5.6.8] - 2026-05-28

Internal release. Email channel deploy workflow now applies the Service manifest alongside the Deployment (previously only the Deployment was applied, leaving cluster DNS without a record of the Service on first-time deploys). No user-facing changes since v5.6.7.

## [5.6.7] - 2026-05-28

### Fixed — capsuleRecipe silent-null on trigger mutations (smoke tests 65 + 66)

When a trigger mutation (create_invoice / create_bill / create_journal / create_cash_in / create_cash_out) carries an inline `capsuleRecipe` payload that the post-commit publish can't accept, the API returns 201 with no `capsuleRecipeJob` field and no error reason on the body. The smoke suite's tests 65 + 66 hit this from v5.5.0 onwards and quietly failed for 20+ hours — three causes were tangled in: hardcoded `SGD` currency against a USD test org, attaching SALE-only DEFERRED_REVENUE to a journal, and using an Expense account in a Liability slot. None of these were visible on the response.

- Smoke test now derives the recipe currency from the org's account currencies (no more hardcoded SGD against USD orgs), uses ACCRUAL_REVERSAL (JOURNAL_MANUAL-compatible) for the journal-path capsuleRecipe test, and auto-creates an Accrued Liability account where needed. The soft 422 fallback on the journal happy-path test (which masked the silent-null bug) has been removed — it now hard-asserts a non-null `jobResourceId`. All 8 inline FAIL paths in sections 65 + 66 now feed `record_fire_failure()` so fire-test issues carry actual per-failure detail instead of `FAILURES_JSON: []`.
- New jaz-api Rule 156 codifies the single-currency v1 recipe constraint (recipe currency + every input account currency + base trx currency must all match — preview returns `ERR_RECIPE_ACCOUNT_CURRENCY_MISMATCH`, trigger silently nulls).
- New jaz-api Rule 157 codifies the `x-accountClass` slot constraint on every `*AccountResourceId` input field, with the exact JSON path (`data.versions[0].inputSchema`, not the top-level field which is null).
- Rule 143 (silent-null failure mode) expanded: lists all three known causes, gives the canonical diagnosis sequence (`preview_capsule_recipe` first, then `search_background_jobs` by `baseTransactionResourceId`), and documents the pre-flight gate.
- Rule 150 corrected: trigger mutations do NOT return 422 on a base-type mismatch — only `preview_capsule_recipe` does. The trigger silently nulls.
- All 10 capsuleRecipe-bearing tool descriptions now call out which base trx type each mutation accepts + the silent-null trap + `preview_capsule_recipe` as the pre-flight gate. `transaction-recipes` skill carries a three-gate pre-flight checklist + diagnosis flow.

### Internal

- `+216 tok` param-description surface (Rule 143 callout on shared `CAPSULE_RECIPE_PARAM`), `+52 tok` tool-description surface (per-mutation base-type guidance). Token budgets bumped accordingly with rationale. Net spend prevents the exact regression that just cost 20+ hours of fire-test failures.

## [5.6.6] - 2026-05-27

Internal release. Fixes two independent bugs blocking the cloud email channel from coming up: the daemon's readiness check was probing a URL that didn't exist (always returned 503), and the production startup validator was treating channel-specific env vars as fatal on a deployment that doesn't use them. No user-facing changes since v5.6.5.

## [5.6.5] - 2026-05-27

Internal release. Rewrote the v5.6.3 changelog entry to match the team's audience-facing template. No user-facing changes since v5.6.4.

## [5.6.4] - 2026-05-27

Internal release. Fire-test callback now reports honest pass/fail counts when smoke crashes mid-run instead of defaulting to "0/0" — fixes the deceptive `❌ fire tests failed (0/0)` Slack render that filed empty-detail issues on trigger repos.

- `.github/workflows/fire.yml` now log-scrapes per-test PASS/FAIL/SKIP markers when `RESULTS_JSON:` and `Results:` summary lines are both absent (smoke crash signature). On the crashed fire-output from run 26508315685, the new fallback recovers `944/1/6` (pass/fail/skip) where the old logic reported `0/0/0`.
- New callback fields `crashed: bool` and `last_section: string` flow through to Sentinel so the Slack render can distinguish "crashed mid-run at section X" from a real test-failure regression. Backwards-compatible — old Sentinel ignores unknown fields.

No user-facing changes since v5.6.3.

## [5.6.3] - 2026-05-27

Internal release. CI smoke-test harness reliability fixes. No user-facing changes since v5.6.2.

## [5.6.2] - 2026-05-27

Internal release. Cloud email channel deploy pipeline now runs end-to-end on the deploy host: build, image import, and cluster updates all happen over a single SSH session. Matches the deploy pattern already used by the other cloud channels. No user-facing changes since v5.6.1.

## [5.6.1] - 2026-05-27

Internal release. Cloud email channel deploy workflow now reads the kubeconfig from the team-standard secret name, matching the convention used by every other deploy in this org. No user-facing changes since v5.6.0.

## [5.6.0] - 2026-05-27

### Added — live pseudo-SQL schema discovery

- New `get_pseudo_sql_schema` tool returns the live curated catalog (70+ tables, 91+ join edges, 47+ allowlisted functions) AND the downloadable canonical agent skills doc (`jaz-pseudo-sql.md`, ~30 KB Agent Skills standard) in one call. Drop the `.md` body into your context as the syntax guide; treat the `tables[] / joins[] / functions[]` arrays as the column-list source. Call this BEFORE writing any pseudo-SQL query.
- Response carries a stable 16-char hex `version` field — cache by it within a session, refresh only on mismatch.
- New jaz-api Rule 155 lays down the call-first / version-cache-key contract.

### Changed

- `jaz-pseudo-sql` skill body now points at `get_pseudo_sql_schema` as the canonical schema source. The frontmatter Tools list, "Source of truth" section, and tool-selection section all reference the new tool.
- Pseudo-SQL has been split into its own `pseudo_sql` namespace (was bundled under `operational_reports`). Cleaner search-routing signal for ad-hoc-SQL intents.

### Removed

- The static `references/curated-schema.md` snapshot inside the `jaz-pseudo-sql` skill. It was a hand-derived 6-table probe that drifted instantly against the real 70-table catalog. The new tool replaces it with live data.

### Internal

- New `clio mcp-call <tool> [--args '<json>']` CLI command for invoking MCP tools directly from the CLI. Used by smoke + debug workflows when an MCP tool has no `clio` shadow (read-only tools like `get_pseudo_sql_schema`, `list_capsule_recipes`, etc.). Always emits JSON on stdout. Not an agent surface; zero token-budget impact.
- All pseudo-SQL + capsule-recipe smoke sections (61-66) now invoke MCP tools via `clio mcp-call` instead of raw HTTP — matches the rest of the smoke suite's `$CLIO ...` pattern and eliminates the `FREKI_URL` env var contract that drifted across the v5.5.0 → v5.5.1 releases.
- Smoke section 67 exercises `get_pseudo_sql_schema` end-to-end against the demo org (catalog floors + version stability + agentSkillsDoc structural marker).

## [5.5.3] - 2026-05-27

Internal release. Cloud email channel deployment-manifest fix: the reply-callback target was pointing at a non-existent in-cluster DNS name + wrong port. No user-facing changes since v5.5.2.

## [5.5.2] - 2026-05-27

Internal release. Email-channel infrastructure prep: tightened secret handling on the inbound auth path, restored a wire-format detail for downstream tooling, and added deploy-time guards against missing configuration. No user-facing changes since v5.5.1.

## [5.5.1] - 2026-05-27

Internal release automation update. No user-facing changes since v5.5.0.

Fixes the post-deploy fire-test smoke suite (sections 61–63, pseudo-SQL preview / validation / export probes) which was crashing on every fire run since v5.5.0 because `$FREKI_URL` was referenced unset and tripped `set -u`. Added a default so the smoke script can run end-to-end against the public Jaz API without extra env wiring.

## [5.5.0] - 2026-05-27

The Jaz public REST surface added IFRS capsule recipes + pseudo-SQL since v5.4.x. v5.5.0 wraps both end-to-end across the agent stack — 9 new tools, 10 existing trigger mutations gain optional recipe-trigger payload, two new skill docs, 13 new agent rules, plus subscriptions proration expansion.

### Added — IFRS capsule recipes (server-side recipe lifecycle)

The 5 IFRS capsule recipes (Prepaid Amortization, Loan Amortization, Accrual Reversal, Deferred Revenue, IFRS 16 Lease) now have a server-side path alongside the existing offline calculator (`plan_recipe` / `execute_recipe`). The new path creates real capsule entities + scheduler atoms via a single API call — useful when you want the capsule entity to show up in FE / reporting alongside the base transaction.

- **5 new tools** under `capsules_and_recipes` namespace, new `capsule_recipes` group:
  - `list_capsule_recipes` — list registered IFRS recipes + per-version JSON Schemas (source of truth for `recipeName`).
  - `get_capsule_recipe` — descriptor by enum name (PREPAID_AMORTIZATION, LOAN_AMORTIZATION, ACCRUAL_REVERSAL, DEFERRED_REVENUE, IFRS16_LEASE) with `versions[].inputSchema`.
  - `preview_capsule_recipe` — compute the blueprint without persisting; returns `{legs[], expectedOutput[], previewMarkdown}`.
  - `resume_capsule_recipe` — retry a FAILED recipe job from its failed leg. NOT idempotent (≤3 same-leg attempts then terminal `BLOCKED_AFTER_3_RESUME_ATTEMPTS`).
  - `rollback_capsule_recipe` — delete every scheduler atom posted by the recipe. `dryRun=true` previews safely (idempotent on already-rolled-back capsules).
- **10 trigger mutations gain optional `capsuleRecipe` payload** so you can create-and-fire in one shot:
  - `create_invoice`, `update_invoice` (DEFERRED_REVENUE)
  - `create_bill`, `update_bill` (PREPAID_AMORTIZATION)
  - `create_journal`, `update_journal` (DEFERRED_REVENUE, ACCRUAL_REVERSAL, IFRS16_LEASE)
  - `create_cash_in`, `update_cash_in` (LOAN_AMORTIZATION — cash-in = loan disbursement, canonical trigger)
  - `create_cash_out`, `update_cash_out` (loan repayment patterns)

  Mutually exclusive with `capsuleResourceId`. Response carries `capsuleRecipeJob: { jobResourceId, capsuleResourceId, recipeKey, idempotentHit, ... }` for polling and rollback.
- **`jaz-recipes` skill** gains a "Server-side recipe execution" section explaining offline-vs-server-side path selection, recovery flow (3-attempt resume → rollback), and the `fx-reval` double-post warning.
- **`plan_recipe` and `execute_recipe` descriptions** now point at the server-side path for the 5 overlap recipes so agents see both options out-of-the-box.

### Added — Pseudo-SQL ad-hoc reporting

The new pseudo-SQL DSL lets agents answer ad-hoc data questions that aren't covered by canonical `download_export` reports — top customers by revenue, FX-exposed bills, custom groupings, etc.

- **4 new tools** under `operational_reports` namespace, new `pseudo_sql` group:
  - `preview_pseudo_sql` — sync SELECT preview, up to 100 typed rows.
  - `export_pseudo_sql` — async CSV export kickoff; supports `Idempotency-Key` for dedup.
  - `get_pseudo_sql_export` — poll status; COMPLETED returns a short-lived (~15min) S3 download URL.
  - `run_pseudo_sql_and_download` — one-shot composite: kickoff + poll + fetch. Auto-`Idempotency-Key` from `sha256(query).slice(0,16)`. 25s default timeout (safe under typical MCP provider 30s ceiling). Returns CSV buffer by default; opt-in `downloadToFile=true` writes to `~/Downloads/`.
- **New `jaz-pseudo-sql` skill** with three reference docs: curated table inventory, 10+ query patterns by user intent, full error catalog with recovery paths.
- **`download_export`** description now cross-references pseudo-SQL for ad-hoc custom queries.

### Added — Subscription proration controls

- **`create_subscription` and `update_subscription` accept the full `proratedConfig` payload.** Customize the first prorated period via 4 new fields: `proratedStartDate`, `proratedAdjustmentLineText`, `itemResourceId` (non-inventory item for the adjustment line), and `includeNextPeriod` (bundles next full period at 2x quantity AND advances nextScheduleDate). Response now includes `bundledPeriodEndDate` + `bundledAmount` when `includeNextPeriod=true` — needed by downstream CN refund calculations.

### Added — 13 new agent rules

The `jaz-api` skill gains Rules 142-154 covering: capsuleRecipe payload semantics (mutual exclusion with capsuleResourceId, response shape, recovery path), RecipeName closed enum at the API layer, pseudo-SQL `truncated` / downloadUrl 15min expiry / cashflow IAS 7 template gate, resume terminal states + rollback-only fallback, partial-rollback retry safety, RECIPE_INVALID_BASE_TRANSACTION_TYPE, saveAsDraft + capsuleRecipe stash-then-fire on activation, Idempotency-Key server-side dedup primary, and rollback-on-non-recipe-capsule (422 RECIPE_ROLLBACK_JOB_NOT_FOUND — use `delete_capsule` for legacy capsules).

### Changed

- **`download_export(exportType='cashflow')`** description now flags the IAS 7 template requirement (404 `template_not_found` if no template configured).
- **`create_capsule` description** routes IFRS-recipe-driven flows to `preview_capsule_recipe` + `capsuleRecipe` payload; legacy manually-grouped capsules stay on `create_capsule`.
- **`list_capsule_types` description** disambiguates from `list_capsule_recipes` (different surfaces — types are PREPAID_EXPENSE et al; recipes are LOAN_AMORTIZATION et al with JSON Schema input contracts).
- **Tool count: 275 → 284.**

## [5.4.41] - 2026-05-23

Internal release. Fire-test callback now retries on transient Sentinel cold-start. No user-facing changes since v5.4.40.

## [5.4.40] - 2026-05-23

Internal release. `run_parallel` hardened against subshell exit-code-capture races. No user-facing changes since v5.4.39.

## [5.4.39] - 2026-05-23

Internal release. Fire-test workflow exit-code propagation hardened. No user-facing changes since v5.4.38.

## [5.4.37] - 2026-05-16

### Fixed
- **`view_auto_reconciliation` now accepts `MAGIC_RECONCILE_WITH_CASH_IN_OUT`** alongside the existing 4 recommendation types. This is the workflow type the Learned-Predictions (LP) engine emits, so agents can finally read LP-generated reconciliation suggestions for a bank account via the auto-recon tool. Previously, passing this value returned 500 because the enum on the tool didn't list it.

## [5.4.36] - 2026-05-16

Consolidated release notes for the v5.4.7 → v5.4.35 wave so what's new lands in one place. 19 patch releases shipped overnight on token-economics + skill-doc accuracy work; this entry collects the user-facing impact.

### Fixed
- **22 stale step-number cross-references** between recipe playbooks and engagement playbooks. The `quarterly-gst.md step Q` placeholder is gone; off-by-N citations are corrected (`monthly-close.md step 9` → `step 5` for depreciation; `step 8` → `step 7` for deferred-revenue / capital-WIP / intercompany capsule unwinding; `step 10` → `step 4` for employee leave accrual); current/non-current loan + lease reclassification is now correctly routed to `year-end-close.md Y6` instead of `annual-statutory.md step 8`. Agents following the practice → recipe → back-to-engagement loop now land on the right section every time.
- **4 invented API references** in skill examples. `capsule.customFields` (not a Capsule field — capsule-level context belongs in `title` / `description`; per-event narrative belongs in journal `tags` + `internalNotes`) and `JOURNAL_TYPE: 'DEPRECIATION'` (not a valid journal-type value — depreciation journals filter by `capsuleResourceId` or `tag: 'depreciation'`). Agents following year-end FA reconciliation, capital-WIP setup, or bank-loan playbooks no longer hit invalid filter or payload errors.

### Changed
- **Tool description efficiency.** Trimmed redundant prose from the 9 `bulk_upsert_*` tool descriptions and ~20 search tools (`search_invoices`, `search_journals`, `search_accounts`, etc.). Wire-shape contracts (FLAT vs nested-lineItems shape, NATURAL KEY warnings, sibling-tool pointers, pre/post-condition guards, error-code names) preserved verbatim — agents save ~254 tokens of schema overhead per turn for the same functionality.

## [5.4.7] - 2026-05-15

Internal release. Added 35 discovery test cases locking in agent-query → tool resolution across 19 canonical natural-language prompts ("close the books", "bank reconciliation", "WHT codes", etc.) plus cross-provider parity simulation (Anthropic full-list, OpenAI namespace-search). No user-facing changes since v5.4.6.

## [5.4.6] - 2026-05-15

### Changed
- **Recipe + job documentation rewritten end-to-end** for Jaz-native depth. Every recipe now names the canonical engine entry point (`plan_recipe(name: '...')`), the future-dated DRAFT journals it pre-emits, the practitioner monthly action (`bulk_finalize_drafts`), the dependency-resolution flow, and the error-recovery table. Every job now names MCP tool calls (e.g. `search_invoices`, `quick_reconcile`, `bulk_finalize_drafts`) instead of HTTP routes.
- **FX revaluation recipe is now verification-only.** Jaz auto-handles all period-end IAS 21.23 FX translation for foreign-currency monetary balances (AR, AP, cash, bank, intercompany, term deposits, FX provisions). Running `execute_recipe(name: 'fx-reval', ...)` would double-post; the recipe is repositioned as an independent cross-check via `clio calc fx-reval`.
- **Capsules deep-dive** added to building-blocks with 9 advanced multi-step transaction patterns (M&A lifecycle, restructuring, insurance claims, intercompany, CWIP-to-FA, etc.).
- **Audit-prep step expanded** with proactive audit-analyses pre-empt step (`download_export(exportType: 'analysis-anomalous-bills' | 'analysis-gl-journal-audit' | ...)`) so the practitioner runs the same audit-flag exports the auditor would, before handing over the pack.

### Removed
- **Outdated SG GIRO bank-file generators (DBS / OCBC / UOB)** removed from CLI and source. The CLI command `clio jobs payment-run bank-file` and its three format generators were unmaintained; bank-file generation now happens outside Jaz (via the bank's portal). Affects the CLI surface only — no API or MCP tool change.

## [5.4.5] - 2026-05-15

Internal docs release. The public README and AGENTS.md were rewritten for clarity. No user-facing extension changes since v5.4.4.

## [5.4.4] - 2026-05-15

### Changed
- Bank reconciliation suggestions are now clearly distinguished from execution. The `view_auto_reconciliation` tool is labelled READ-ONLY in its description, and agents are pointed at `quick_reconcile`, `apply_bank_rule`, or the per-entry `reconcile_*` tools when they want to actually post a reconciliation.
- Discoverability improved for "AR aging" / "dunning" / "recurring invoices" (lands on invoices), "CSV import" / "bulk upload" / "customer segmentation" (lands on contacts), and "payment run" / "batch payment" / "payment matching" (lands on payments).
- jaz-api skill description updated from "117 production gotchas" to "141 production gotchas" to match the actual rule count.

## [5.4.3] - 2026-05-12

Internal smoke-test fixture fix. No user-facing changes since v5.4.2.

## [5.4.2] - 2026-05-12

### Fixed
- **`bulk_upsert_chart_of_accounts` now works end-to-end.** The tool was returning an API validation error ("accounts is a required field") on every call since it shipped — affecting both the MCP tool and the companion `clio accounts bulk-upsert` CLI command. Existing chart-of-accounts entries were unaffected; only the bulk-upsert path was blocked. Single-account `create_account` calls were never impacted.

## [5.4.1] - 2026-05-10

Consolidated release notes for the v5.2.5 → v5.4.0 wave so what's new lands in one place. No code changes from v5.4.0.

### Added
- **New tool `get_contact_signals`** — read-only contact pattern lookup. Pull the cadence, outliers, divergences, currency / payment-terms / top-account / top-item modal patterns, and outstanding balance for any one contact (scoped to a transaction type: SALE, PURCHASE, SALE_CREDIT_NOTE, PURCHASE_CREDIT_NOTE). Use it to ask "what does this supplier normally look like?" before drafting a transaction. For draft-vs-history scoring after drafting, use `validate_drafts`.
- **New tool `bulk_upsert_chart_of_accounts`** — bulk create or update up to 500 chart-of-accounts entries in a single sync call. Returns `resourceIds` for successful rows alongside `failedRows` (with row index, column name, value, error code, and message) and `failedCount` for partial-success introspection. Dedup is by NAME, not code — duplicate-name rows surface `ORGANIZATION_CHART_OF_ACCOUNT_DUPLICATED` per row while other rows in the same batch still succeed. Companion CLI: `clio accounts bulk-upsert --input <file.json>`.
- **9 IFRS 18 chart-of-accounts classification types** (effective 2027) added alongside the classic 12: Discontinued Expense, Discontinued Income, Finance Cost, Financing Income, Goodwill, Income Tax Expense, Investing Expense, Investing Income, Investment. Unambiguous variants are normalized client-side ("income tax" → Income Tax Expense, "investments" → Investment, "finance costs" → Finance Cost). "Interest expense" / "interest income" are intentionally NOT auto-classified — under IFRS 18, those can land in either Financing or Investing depending on the entity's business activity, so the agent must pick the explicit canonical string. Classic types still work — IFRS 18 is purely additive.

### Changed
- **`validate_drafts` now returns rich per-result enrichment** — every entry in the response carries `contactSignals` (Mid-7 contact-history insight: cadence, outliers, severity, divergences, outstanding balance — populated against the draft's contact) and `breakdown` (Balance-panel payload: line items + transaction-level metadata like subtotal, tax, total, paymentRecorded, balance, exchangeRate). Top-level `contactSignalsMeta.unavailable=true` signals the freshness layer was offline for the whole batch. The tool description cross-references `get_contact_signals` for stand-alone history lookups without a draft.
- **`bulk_upsert_currency_rates` surfaces per-row failures** — response now includes `failedRows[]` (with row index, column name, value, error code, message) and `failedCount` alongside successful `resourceIds`. Agents can introspect partial-failure detail without polling a background job. Also documented `rateApplicableTo` defaulting: omitting it now means the API defaults to `rateApplicableFrom - 0.999ms`, preventing temporal gaps in rate lookups.
- **`bulk_upsert_contacts` documents the 5 request-level validation rules** that fail the whole batch with HTTP 422: `customer` or `supplier` must be true per row (the API backfills omitted flags from the existing contact on update), `emailList` entries must be unique within a contact (case-insensitive), payment-terms `value` must be a positive integer when `name` != "CUSTOM", contact `name` must be unique within the batch, and `addressLine1` is required when a `billingAddress` / `shippingAddress` object is provided. Pre-validate client-side: one bad row drops the whole batch.

## [5.4.0] - 2026-05-10

### Added
- New tool `bulk_upsert_chart_of_accounts` — bulk create/update up to 500 chart-of-accounts entries in a single sync call (no jobId polling). Returns `resourceIds[]` for successful rows alongside `failedRows[]` (with `rowIndex`, `columnName`, `columnValue`, `errorCode`, `errorMessage`) and `failedCount` for partial-success introspection. Common per-row error: `ORGANIZATION_CHART_OF_ACCOUNT_DUPLICATED` when a row's name collides with an existing account (dedup is by NAME, not code) — other rows in the batch still succeed. Accepts the classic 12 + 9 IFRS 18 `accountType` values; common variants normalized client-side. Companion CLI `clio accounts bulk-upsert --input <file.json>` for human-driven imports.

## [5.3.2] - 2026-05-10

### Added
- Chart of accounts now accepts the 9 IFRS 18 classification types (effective 2027) alongside the classic 12: **Discontinued Expense**, **Discontinued Income**, **Finance Cost**, **Financing Income**, **Goodwill**, **Income Tax Expense**, **Investing Expense**, **Investing Income**, **Investment**. The `create_account` tool description enumerates them; `normalizeAccountType` maps unambiguous variants client-side ("income tax" → Income Tax Expense, "investments" → Investment, "finance costs" → Finance Cost). Ambiguous "interest expense" / "interest income" are intentionally NOT auto-mapped (under IFRS 18, those can land in either Financing or Investing depending on the entity's business activity — agents must pick the explicit canonical string). Classic types still work — IFRS 18 is purely additive.

## [5.3.1] - 2026-05-10

### Changed
- `validate_drafts` per-result responses now carry `contactSignals` (Mid-7 contact-history insight: cadence, outliers, severity, divergences, outstanding balance — populated against the draft's contact) and `breakdown` (Balance-panel payload: line items + trx-level metadata like subtotal, tax, total, paymentRecorded, balance, exchangeRate). Top-level `contactSignalsMeta.unavailable=true` signals the freshness layer was offline for the whole batch. The tool description cross-references `get_contact_signals` for stand-alone history lookups without a draft.

## [5.3.0] - 2026-05-10

### Added
- New tool `get_contact_signals` — read-only pattern intelligence for any contact (cadence, outliers, currency / payment-terms / top-COA / top-item modal patterns, outstanding-balance snapshot, severity bucket). Scope to one business-transaction type via the required `btType` param (SALE | PURCHASE | SALE_CREDIT_NOTE | PURCHASE_CREDIT_NOTE). Use this for stand-alone "what does this contact normally look like?" lookups before drafting a transaction. For draft-vs-history scoring after drafting, keep using `validate_drafts`.

## [5.2.7] - 2026-05-10

### Changed
- `bulk_upsert_contacts` description now spells out the five request-level validation rules that fail the whole batch with HTTP 422: `customer` or `supplier` must be true per row (the API backfills omitted flags from the existing contact on update), `emailList` entries must be unique within a contact (case-insensitive), payment-terms `value` must be a positive integer when `name` != "CUSTOM", contact `name` must be unique within the batch, and `addressLine1` is required when a `billingAddress` / `shippingAddress` object is provided. Pre-validate client-side: one bad row drops the whole batch.

## [5.2.6] - 2026-05-10

### Changed
- `bulk_upsert_currency_rates` now surfaces per-row failures: response includes `failedRows[]` (with rowIndex, columnName, columnValue, errorCode, errorMessage) and `failedCount` alongside successful `resourceIds`. Agents can introspect partial-failure detail without polling a background job.
- Documented `rateApplicableTo` defaulting: omitting it now means the API defaults to `rateApplicableFrom - 0.999ms`, preventing temporal gaps in rate lookups.

## [5.2.5] - 2026-05-10

Internal release. No user-facing changes since v5.2.4.

## [5.2.4] - 2026-05-08

Internal release automation update. No user-facing changes since v5.2.3.

## [5.2.3] - 2026-05-06

### Changed
- Refreshed connector store copy. Tighter positioning: Jaz in your agents, full-featured accounting, finance, and reporting. IFRS-first, multi-currency, multi-user.

## [5.2.2] - 2026-05-05

### Fixed
- **Anomaly / audit / risk reports now actually generated, not just discoverable.** Asking the agent for "anomalous bills 2026" or "cashflow anomalies" was reaching the export tool (since 5.2.1) but the agent was picking the wrong export tool — `export_records`, which dumps raw bill rows — instead of `download_export`, which generates the analytical report. Tool descriptions now explicitly disambiguate so the right tool runs.

## [5.2.1] - 2026-05-05

### Fixed
- **Anomaly detection and audit reports now discoverable.** Asking the agent for "anomalous bills", "anomalous invoices", "cashflow anomalies", "GL journal audit", "exchange rate audit", "receivables customer risk", or "cash expense health" now reaches the data export tool that generates them. Same fix surfaces the IFRS recipe library (depreciation, IFRS 16 lease, ECL, FX revaluation, asset disposal, hire purchase, fixed deposit, amortization) when asking by calculation type instead of by name.
- **Exchange Rates Summary export (`analysis-exchange-rate-audit`) listed in download_export.** The export type was already supported by the API but missing from the agent-facing list of available exports.
- **Depreciation method names corrected.** Agent-facing copy now lists the actual supported methods (SL / DDB / 150DB), not the SYD method that was never implemented.

## [5.2.0] - 2026-05-05

### Added
- **Practitioner workspace.** Set up a structured client folder once, then run period work from inside it forever after. The agent reads each client's `CLIENT.md` (FY end, GST scheme, COA mapping, banks, recurring accruals, materiality threshold) before invoking any Jaz API tool, so it stays hyper-contextual to that specific client across sessions.

  Six new offline tools — `practice_init`, `practice_list_clients`, `practice_load_client`, `practice_onboard_client`, `practice_create_engagement`, `practice_load_engagement` — manage the workspace at `~/Documents/Jaz Practice/` (override with `PRACTICE_HOME` env or the `--root` flag). Same surface from the CLI: `clio practice <subcommand>`.

  Engagement types ship with concrete checklist templates that name the specific Jaz tools, recipes, and calculators each phase invokes:
  - **monthly-close** — drives `generate_month_end_blueprint` plus `plan_recipe` for accruals, depreciation, FX revaluation, prepaid recognition.
  - **quarterly-gst** — Singapore F5 boxes 1-16, output/input tax cross-check, IRAS-specific.
  - **annual-statutory** — year-end audit + corporate tax + ACRA + IRAS workstreams.
  - **onboarding** — new-client takeover from prior firm: opening balances, COA setup, multi-currency, first-month reconciliation. Triggers the `jaz-conversion` skill when migrating from Xero / QuickBooks / Sage / MYOB.

  Multi-org agencies: `CLIENT.md.jaz_api_key_override` overrides the firm default for that client only. Resolution chain: CLIENT override → PRACTICE default → `JAZ_API_KEY` env. Same key never serves two clients accidentally.

- **`jaz-practice` skill.** Sixth skill in the bundle. Routes practitioner intent ("close the books for Acme March") to the right engagement type and loads the canonical playbook from `references/<type>.md`. Cross-referenced from the existing skills (jaz-jobs, jaz-recipes, jaz-conversion, jaz-api) so the agent always knows where to go for deeper detail.

### Changed
- **Existing skills audited for cross-references.** Each of the 12 jaz-jobs blueprints and 16 jaz-recipes recipes now names the engagement type it typically appears in. The jaz-api skill TOC reorders practitioner-relevant content first, integrator-only content later. The jaz-cli skill labels itself as power-user / automation surface so practitioners on Claude Desktop don't load it unnecessarily.
- Tool count: 266 → 272 (six new `practice_*` tools).
- Command groups: 54 → 55 (new `clio practice`).

## [5.1.6] - 2026-05-01

### Added
- **Skill content as MCP resources.** Five Jaz skill domains (api, cli, conversion, jobs, transaction-recipes) and the full help center are now addressable via `jaz://skill/{domain}` and `jaz://help-center/{slug}` URIs. Agents can list and read them through standard MCP `resources/list` and `resources/read` calls. Pairs with `search_help_center`: search to triage, read for full content. No account needed.

## [5.1.5] - 2026-05-01

### Added
- **Help center search.** New `search_help_center` tool lets the agent answer "how do I..." and "what is..." questions about Jaz from inside Claude. Returns top matching articles with title, section, snippet, and source URL. Works without an account. Covers the full Jaz help center bundled with the connector.

## [5.1.4] - 2026-05-01

### Changed
- Refreshed install page copy to lead with what Jaz brings to your accounting workflow instead of permissions language.
- The "no API key" message now points to jaz.ai for getting a key, instead of pointing at command-line tools that prospects don't have. Calculators, blueprints, and help center search continue to work without an account.
- `plan_recipe` tool description now surfaces all the supported recipes (loans, IFRS 16 leases, depreciation, FX revaluation, ECL provisions, IAS 37 provisions, fixed deposits, asset disposals, accruals, leave, dividends, prepaids, deferred revenue) so an agent can discover them on day one without an account.

## [5.1.3] - 2026-05-01

### Fixed
- Startup crashes now log a stack trace to Claude Desktop's connector log before the connector exits, instead of disappearing as a silent "process exited early." Makes connection issues self-diagnosable from the log.

## [5.1.2] - 2026-05-01

### Fixed
- **MCP server no longer crashes on startup in Claude Desktop when no API key is configured.** Claude Desktop's manifest binding (`JAZ_API_KEY=${user_config.api_key}`) passes the literal unsubstituted `${user_config.api_key}` string when the user hasn't entered a key. The CLI's key parser rejected the literal and the action handler exited with code 1 — leaving Claude Desktop showing "Server disconnected." The connector now sanitizes substitution-failure values, treats empty/whitespace as unset, and degrades to offline mode on any auth-parse error instead of exiting. Offline tools (calculators, job blueprints) work; API tools return a friendly hint pointing the user at connector settings.

## [5.1.1] - 2026-05-01

### Breaking changes

- **Removed `clio search` command and `universal_search` MCP tool.** The Typesense-backed universal cross-entity search was frontend-typeahead infrastructure that leaked into the agent/CLI surface. For programmatic search, use the structured `--query` syntax on per-entity search commands:
  ```
  clio invoices search --query 'customer:acme AND status:unpaid AND $500+' --json
  clio bills search --query '$50+ AND date:-90d' --json
  clio contacts search --query 'customer:yes' --json
  ```
  The full DSL (AND/OR/NOT, parentheses, amount ranges, date ranges, wildcards, sort) is documented in the API skill's `references/search-syntax.md`.
- **Tool count: 266 → 265** (`universal_search` removed).

### Fixed
- Stale references to the removed `clio search` command cleaned up across the README.
- `clio drafts validate`, `clio drafts convert-to-active`, `clio drafts submit-for-approval` now register correctly (were returning "unknown command 'drafts'" since 4.58.0).
- `bulk_upsert_journals` schema docs corrected. Natural key is `journalReference` (not `reference`), legs field is `journalEntries[]` (not `entries[]`), each leg uses `debitAmount` + `creditAmount` (not `amount` + `type`).
- `bulk_upsert_fixed_assets` schema docs corrected. Request uses `valueDate` (the GET response uses `purchaseDate`); also documents `cost`/`purchaseAmount` and `effectiveLife`/`usefulLifeMonths` as accepted synonyms.
- `--all` mode no longer fetches every page before slicing. List and search commands now early-stop once `--max-rows` is reached, eliminating multi-minute hangs on busy datasets.

### Changed
- CLI default `--max-rows` lowered from 10,000 to 1,000 for `--all` mode across every list/search command. Pass `--max-rows N` explicitly to fetch more.
- Auth-gated tool error message clarifies that the API key can be set in connector settings (Claude Desktop) as well as via env var or CLI.

## [5.0.0] - 2026-05-01

### Breaking changes

- **Removed `clio search` command and `universal_search` MCP tool.** The Typesense-backed universal cross-entity search was frontend-typeahead infrastructure that leaked into the agent/CLI surface. For programmatic search, use the structured `--query` syntax on per-entity search commands:
  ```
  clio invoices search --query "customer:acme AND status:unpaid AND $500+" --json
  clio bills search --query "$50+ AND date:-90d" --json
  clio contacts search --query "customer:yes" --json
  ```
  The full DSL (AND/OR/NOT, parentheses, amount ranges, date ranges, wildcards, sort) is documented in the API skill's `references/search-syntax.md`.
- **Tool count: 266 → 265** (`universal_search` removed).
- **Internal API: `core/api/search.ts` and `universalSearch()` removed.** No longer importable.

### Added

- 6 new structured-query smoke tests in section 57 (k–p) exercising the full `--query` DSL: AND + amount ranges, OR + parens + AND, NOT + sort, amount lower-bound + date range, ref wildcard + status, 3-way OR + outer AND.

## [4.58.5] - 2026-04-30

### Fixed
- **`drafts` CLI was never wired** — `clio drafts validate`, `clio drafts convert-to-active`, `clio drafts submit-for-approval` returned "unknown command 'drafts'" since 4.58.0. Now registered in `src/index.ts`.
- **`bulk_upsert_journals` schema docs were wrong** — natural key field is `journalReference` (NOT `reference`), legs field is `journalEntries[]` (NOT `entries[]`), each leg uses `debitAmount`+`creditAmount` (NOT `amount`+`type`). Existing tool calls using the wrong field names were silently failing at the API worker. Tool registry, SKILL docs, and field-map reference all updated.
- **`bulk_upsert_fixed_assets` schema docs were wrong** — request uses `valueDate` (the GET response uses `purchaseDate`); also documents `cost`/`purchaseAmount` and `effectiveLife`/`usefulLifeMonths` as accepted synonyms. Sending `purchaseDate` returned a generic 400 "Invalid request body".
- **`paginatedFetch` no longer fans out unbounded fetches** — `--all` mode now early-stops once `--max-rows` is reached. Previously it pulled every page then sliced, causing minute-long hangs on busy sandboxes.

### Changed
- **CLI default `--max-rows` lowered from 10,000 → 1,000** for `--all` mode across every list/search command. Pass `--max-rows N` explicitly to fetch more. Combined with the early-stop fix above, prevents accidental multi-thousand-row fetches.
- **5 bulk-upsert tool descriptions tightened** with gotchas surfaced by integration testing — FLAT vs NESTED distinction for invoices/bills, journals naming, manual-journal auto-add-bank-leg warning, invoice-receipt / bill-receipt BSE-type requirement, fixed-asset date-field mismatch.
- **Skill docs extended** — `api/SKILL.md` gained rules 131-135 (complete-drafts before promote, manual-journal auto-add, BSE-type, FLAT vs NESTED, recon line-item naming). `cli/SKILL.md` + `references/agent-gotchas.md` + `references/command-catalog.md` now cover reconciliations + drafts namespaces and `bills draft list` attachment fan-out warning.

## [4.58.2] - 2026-04-29
- 247 → 266 tools across three new capability areas. Single user-facing release covering everything published since 4.55.6.
- Bulk-upsert (8 tools, async, max 500 rows/call):
  - `bulk_upsert_invoices`, `bulk_upsert_invoice_line_items`
  - `bulk_upsert_bills`, `bulk_upsert_bill_line_items`
  - `bulk_upsert_customer_credit_notes`, `bulk_upsert_supplier_credit_notes`
  - `bulk_upsert_journals` (debit + credit must balance per row)
  - `bulk_upsert_fixed_assets` (`registrationType`: NEW or TRANSFER)
- Reconciliations namespace (8 tools, commit a reconciliation against a bank statement entry):
  - Async: `quick_reconcile`, `apply_bank_rule`
  - Sync: `reconcile_direct_cash_entry`, `reconcile_cash_journal`, `reconcile_manual_journal`, `reconcile_cash_transfer`, `reconcile_invoice_receipt`, `reconcile_bill_receipt`
- Drafts lifecycle namespace (3 tools, one call accepts up to 500 items mixing any combination of invoices, bills, customer credit notes, supplier credit notes):
  - `validate_drafts` (sync, eligibility check)
  - `convert_drafts_to_active` (async)
  - `submit_drafts_for_approval` (async)
- Bulk-upsert dates are ISO 8601 (`YYYY-MM-DD`) only. The `dateFormat` field is gone.
- Drafts convert/submit and the 6 sync reconciliation endpoints are not idempotent. Filter drafts by `status: DRAFT` before submitting; confirm reconciled state before retrying a sync recon call.
- Includes the 4.58.1 release-pipeline hotfix.

## [4.58.1] - 2026-04-29
- Internal release-pipeline fix: scrubbed an internal codename from the 4.56.0 CHANGELOG entry that was tripping the public-mirror confidential audit and blocking npm publishes since 4.56.0. No code or behavior change.

## [4.58.0] - 2026-04-29
- Add 3 server-side draft lifecycle tools wrapping `/api/v1/drafts/*`. **Bulk-action friendly:** all three accept up to 500 items in ONE call, mixing any combination of invoices (`SALE`), bills (`PURCHASE`), customer credit notes (`SALE_CREDIT_NOTE`), and supplier credit notes (`PURCHASE_CREDIT_NOTE`). No per-entity tools needed — one call covers them all. Journals have their own approval flow.
  - `validate_drafts` + `clio drafts validate` — sync; per-item eligibility check, no state change. Safe to call repeatedly.
  - `convert_drafts_to_active` + `clio drafts convert-to-active` — async, returns a job ID.
  - `submit_drafts_for_approval` + `clio drafts submit-for-approval` — async, returns a job ID.
- Convert/submit are NOT idempotent — a second call on already-promoted drafts returns 422. Filter the draft list by `status: DRAFT` before submitting.
- Shared `assertDraftItems` validator builds on the existing `assertBatchArray` helper to reject malformed batches client-side (non-array, empty, >500, missing/empty `btResourceId`, invalid `btType`) with row-indexed error messages.

## [4.57.2] - 2026-04-29
- Internal refactor: 4 reconciliation tool executors (`quick_reconcile`, `apply_bank_rule`, `reconcile_cash_journal`, `reconcile_manual_journal`) now use the shared `assertBatchArray` helper for empty-array / max-cap checks, matching the pattern used by the 9 bulk-upsert tools. No user-facing behavior change.

## [4.57.1] - 2026-04-29
- Add client-side validation to `reconcile_invoice_receipt` and `reconcile_bill_receipt` — reject empty / >500 line items and non-ISO 8601 date fields (`valueDate`, `dueDate`, `recordedPayment.valueDate`) before submission. These two endpoints create AR/AP transactions and reconcile them in one non-idempotent call, so catching shape problems client-side prevents partial-write recovery.

## [4.57.0] - 2026-04-29
- New `reconciliations` namespace + 8 tools wrapping `/api/v1/reconciliations/*`. These commit a reconciliation decision against a bank statement entry — distinct from the existing `view_auto_reconciliation` (which queries suggestions only).
  - Async (returns a job ID — poll with `clio background-jobs get <jobId>`):
    - `quick_reconcile` + `clio recon quick-reconcile` — bulk-match bank entries to journals (max 500)
    - `apply_bank_rule` + `clio recon bank-rule` — apply a bank rule to a batch of entries (max 500)
  - Sync (returns the reconciled entry status):
    - `reconcile_direct_cash_entry` + `clio recon direct-cash-entry` — single-line cashflow journal; direction inferred from entry sign
    - `reconcile_cash_journal` + `clio recon cash-journal` — multi-line cashflow journal (max 200 lines)
    - `reconcile_manual_journal` + `clio recon manual-journal` — double-entry; bank-side leg auto-added by API
    - `reconcile_cash_transfer` + `clio recon cash-transfer` — inter-account transfer
    - `reconcile_invoice_receipt` + `clio recon invoice-receipt` — AR: creates an invoice and reconciles
    - `reconcile_bill_receipt` + `clio recon bill-receipt` — AP: creates a bill and reconciles
- Most fields prefill from the bank entry when omitted (`valueDate`, `dueDate`, payment amount, direction).
- Rule reminder: the 6 sync endpoints are NOT idempotent on the same `bankStatementEntryResourceId` — confirm reconciled state before retrying. Concurrent calls on the same entry race.

## [4.56.2] - 2026-04-29
- Internal refactor: extracted a shared `assertBatchArray()` helper for the 9 bulk-upsert tools (contacts, invoices, invoice line items, bills, bill line items, customer credit notes, supplier credit notes, journals, fixed assets). The empty-array / max-500 checks were duplicated in each executor; they now go through one validator. No user-facing behavior change.

## [4.56.1] - 2026-04-29
- Fix bulk-upsert tool descriptions to point users at `search_background_jobs` (with `resourceId` filter) for per-row PARTIAL_SUCCESS error details. Previous wording referenced a `get_background_job` tool that doesn't exist; the same response from `search_background_jobs` already carries `errorDetails`.
- Add client-side date validation for the 8 transaction bulk-upsert tools — invalid `valueDate` / `dueDate` / `depreciationStartDate` (anything outside `YYYY-MM-DD`) and any leftover `dateFormat` field now error out before submission with a row-indexed message, instead of failing async mid-job.

## [4.56.0] - 2026-04-29
- Add 8 transaction bulk-upsert tools — import or update large batches in one call (max 500 per call), all async (return a job ID — poll with `clio background-jobs get <jobId>`):
  - `bulk_upsert_invoices` + `clio invoices bulk-upsert` (natural key: `invoiceReference`)
  - `bulk_upsert_invoice_line_items` + `clio invoices bulk-upsert-line-items` (nested line items per invoice)
  - `bulk_upsert_bills` + `clio bills bulk-upsert` (natural key: `billReference`)
  - `bulk_upsert_bill_line_items` + `clio bills bulk-upsert-line-items` (nested line items per bill)
  - `bulk_upsert_customer_credit_notes` + `clio customer-credit-notes bulk-upsert`
  - `bulk_upsert_supplier_credit_notes` + `clio supplier-credit-notes bulk-upsert`
  - `bulk_upsert_journals` + `clio journals bulk-upsert` (multi-leg manual journals; debit + credit must balance)
  - `bulk_upsert_fixed_assets` + `clio fixed-assets bulk-upsert` (`registrationType` `NEW` or `TRANSFER` per row)
- Dates on bulk-upsert payloads are ISO 8601 (`YYYY-MM-DD`) only — the previously-tolerated `dateFormat` field has been removed API-side.
- 247 → 255 MCP tools

## [4.55.6] - 2026-04-12
- Internal release automation update. No user-facing changes since v4.55.5.

## [4.55.5] - 2026-04-10
- Multi-org MCP auth: comma-separated API keys (`jk-aaa,jk-bbb`) — one MCP server, multiple organizations
- New `list_organizations` meta-tool exposed in multi-org mode (4 meta-tools instead of 3)
- Optional `org_id` parameter on `execute_tool` for per-request org routing; ignored in single-org mode
- 5 new tools: `get_export_columns`, `preview_export_records`, `export_records`, `search_background_jobs`, `bulk_upsert_contacts`
- 247 MCP tools total (+5 from v4.53.0)
- Stability: 30s per-command timeout in smoke tests; dedup guards now verify exact match client-side; items bulk-upsert search uses `--filter`
- 58/58 MCP integration tests passing (28 no-auth + 21 auth + 9 multi-org)

## [4.54.0] - 2026-04-09
- Add export-records API + CLI (`clio export-records columns/preview/download`) + 3 MCP tools (`get_export_columns`, `preview_export_records`, `export_records`)
- Add background-jobs search API + CLI (`clio background-jobs search/get`) + MCP tool (`search_background_jobs`) — universal async job tracking layer
- Add contacts bulk-upsert API + CLI (`clio contacts bulk-upsert`) + MCP tool (`bulk_upsert_contacts`) — async (returns jobId), unlike items bulk-upsert (sync)
- 242 → 247 MCP tools; 51 → 53 CLI command groups; 2,718 → 2,748 unit tests

## [4.53.0] - 2026-03-10
- Multi-org auth: PAT (pat_...) and comma-separated API keys (jk-aaa,jk-bbb) in MCP server
- New `list_organizations` meta-tool for multi-org mode
- `org_id` parameter on `execute_tool` for per-request org routing
- `parseKeyInput()` with full edge case handling (mixed types, duplicates, invalid formats)
- Upgrade title generation model to gpt-5.4-nano-2026-03-17

## [4.23.0] - 2026-03-06
- Add custom fields, tags, and nano classifiers across CLI, MCP, and skills
- Patch hono and @hono/node-server security vulnerabilities
- Replace stale OAS with placeholder, fix sanitization regex
- Upgrade default OpenAI model to gpt-5.4-2026-03-05

## [4.22.1] - 2026-03-04
- Add missing CLI commands for all registered tools
- Fix auto-reconciliation endpoint URL to `/search-magic-reconciliation`

## [4.22.0] - 2026-03-04
- Expand tool registry from 146 to 200+ tools for full bookkeeper coverage
- Resolve 12 smoke test failures across CLI and infrastructure
- Add build step to release-to-mirror and validate-plugin workflows
- Replace confidential codename in field-map.md

## [4.21.2] - 2026-03-04
- Resolve 12 smoke test failures across CLI commands and infrastructure

## [4.21.1] - 2026-03-04
- Fix bank record search — broken date filter, missing filter params, wrong type
- Enforce same-contact constraint on N:1 bank match (Phase 3)
- Input validation, defensive guards, ESM-safe sync

## [4.21.0] - 2026-03-04
- Add `add_bank_records` tool — JSON POST for creating 1-100 bank records per call (`clio bank add-records`)
- Fix bank record search sort field: `date` → `valueDate`
- Update skill docs: bank record creation methods, error catalog, field map

## [4.20.1] - 2026-03-03
- Combined MCP config examples in README
- Removed duplicate API gotchas table (covered by skills)
- Updated README tagline and descriptions
- Added Clio trademark notice

## [4.20.0] - 2026-03-02
- Structured MCP error responses with status codes and actionable hints
- Input validation in MCP path (fail before hitting API)
- Destructive hint annotations for pay/finalize/refund/remove operations
- Org context display in MCP server instructions and stderr
- Search invoices/bills now match by contact name
- DRY tool architecture: shared errors + validation across MCP and daemon

## [4.19.0] - 2026-03-02
- DRY tool architecture — single source of truth for MCP, drafts, and jobs
- 145 tools from unified TOOL_DEFINITIONS

## [4.18.0] - 2026-03-02
- Auth onboarding on bare `clio` invocation
- Correct offset semantics for pagination

## [4.17.0] - 2026-02-28
- Resolved 19 smoke test failures
- Removed smoke-test from assets (confidential audit)
- Synced stale stats (test count, doc line counts)

## [4.16.0] - 2026-02-25
- Initial public release
- 145 agent tools, 13 financial calculators, 12 accounting jobs
- 4 agent skills (API, conversion, transaction recipes, jobs)
- MCP stdio server for Claude Code and AI tools
- CLI with 38 command groups
