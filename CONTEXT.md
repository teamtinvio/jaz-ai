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
