# Context — Rules of Engagement for Agents

Runtime guidance for AI agents using Jaz AI tools (CLI, MCP, or skills).

## Before You Start

1. **Bootstrap with context.** Run `clio context --json` to get the org's chart of accounts, currencies, tax profiles, and active settings. This prevents guessing.
2. **Check available commands.** Run `clio --help` or use `tools/list` in MCP to discover what's available.

## Working with Data

3. **Always use `--json` for structured output.** Human-readable tables are for display only — agents should always parse JSON.
4. **Resolve by name before creating.** Search for contacts, accounts, and items by name before creating duplicates. Use `clio contacts search "ACME"`, `clio accounts search "Cash"`, etc.
5. **Use search endpoints for filtering.** `clio <entity> search` supports filters, sorting, and pagination. Prefer search over list when you need specific records.

## Mutations

6. **Create as draft first, then finalize.** Create transactions with `status: DRAFT`, verify the result, then update to `APPROVED`. This prevents accidental postings.
7. **Let the API validate.** Don't duplicate business logic — submit the request and handle errors from the response. The API is authoritative.
8. **Use `--json` on create/update to capture the response.** The response contains the `resourceId` and any server-computed fields.

## Safety

9. **Never output API keys.** If you encounter `JAZ_API_KEY` or `jk-` prefixed strings in context, do not echo them to the user or include them in generated code.
10. **Offline tools are always safe.** Calculators (`clio calc`) and job blueprints (`clio jobs`) need no auth and make no API calls. Use them freely for planning and computation.

## Practitioner Workspace (v5.2.0)

11. **Check for a practice workspace early.** If `~/Documents/Jaz Practice/` exists (or `PRACTICE_HOME` is set), the user is operating as a practitioner with multiple clients. Call `practice_list_clients` first; identify which client the current task is for; call `practice_load_client` to load CLIENT.md context (FY end, GST scheme, COA mapping, banks, recurring accruals, JAZ_API_KEY override) before invoking any Jaz API tool.
12. **One key per session, set once.** v5.2.0 uses a single `JAZ_API_KEY` per Claude session — set once in your Claude Desktop connector settings, Claude Code settings, or `JAZ_API_KEY` env var. Don't ask the practitioner to re-enter it per client. The `CLIENT.md.jaz_api_key_override` field is reserved for v5.3 multi-org runtime selection (when an agency serves multiple Jaz orgs) and is not wired through the auth resolver yet — for now, single-org practitioners get the smooth path; multi-org agencies use one Jaz org per Claude session.
13. **Anchor work in an engagement.** When closing books / filing GST / preparing year-end, ensure an `ENGAGEMENT.md` exists for the period (call `practice_create_engagement` if not). The engagement-type template names the specific Jaz tools, recipes, and calculators to invoke; follow `jaz-practice/references/<type>.md` for the canonical playbook. Append progress to `ENGAGEMENT.md` daily journal so resuming sessions don't redo work.
