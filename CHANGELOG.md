# Changelog

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
