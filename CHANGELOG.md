# Changelog

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
