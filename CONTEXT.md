# Context — Rules of Engagement for Agents

Runtime guidance for AI agents using Jaz AI tools (CLI, MCP, or skills).

## Before You Start

1. **Bootstrap with context.** Run `clio context --json` to get the org's chart of accounts, currencies, tax profiles, and active settings. This prevents guessing.
2. **Check what's available.** CLI: `clio --help`. MCP: call `describe_capabilities` (or `search_tools` with an empty query on the meta-tool surface) — **not** `tools/list`. Depending on packaging, `tools/list` returns 3, 46, or 381 entries for the same 381 operations; only the capability map tells you what actually exists.

## Working with Data

3. **Always use `--json` for structured output.** Human-readable tables are for display only — agents should always parse JSON.
4. **Resolve by name before creating.** Search for contacts, accounts, and items by name before creating duplicates. Use `clio contacts search --name "ACME"`, `clio accounts search "Cash"`, etc.
5. **Use search endpoints for filtering.** `clio <entity> search` supports filters, sorting, and pagination. Prefer search over list when you need specific records.

## Mutations

6. **Create as draft first, then finalize.** Create transactions with `saveAsDraft: true`, verify the result, then finalize (`clio invoices draft finalize <id>`, or the matching finalize tool). Cash-in, cash-out and cash transfers have no draft state and post on create, so verify their inputs before the call. A document sitting in an approval workflow is approved with `approve_documents` instead. This prevents accidental postings.
7. **Let the API validate.** Don't duplicate business logic — submit the request and handle errors from the response. The API is authoritative.
8. **Use `--json` on create/update to capture the response.** The response contains the `resourceId` and any server-computed fields.

## Safety

9. **Never output credentials.** Keep API keys, PATs, OAuth access and refresh tokens, and client secrets out of chat, logs, generated code, and source control.
10. **Exchange rates read base→source. Declare the direction rather than inverting by hand.**
`add_currency_rate`, `update_currency_rate` and the `currency` object on transaction tools all take
the rate functionalToSource: 1 unit of the organization's base currency = N units of the foreign one.
Whether that matches how the rate was quoted to you depends on which currency is the base — SGD org adding USD from "1 USD = 1.35 SGD" → the quote is source-first, so send 0.74 or label it SOURCE_TO_FUNCTIONAL. USD org adding PHP from "1 USD = 56.5 PHP" → the quote is ALREADY base-first, so send 56.5 unchanged (FUNCTIONAL_TO_SOURCE). Inversion depends on which currency is the base, not on habit.
A wrong direction is accepted silently and wrong by rate². Rather than working it out, pass the number
as given and set `rateDirection` (`FUNCTIONAL_TO_SOURCE` | `SOURCE_TO_FUNCTIONAL`). If you cannot tell
which way the user's number reads, ask. (Some read-side fields are named `rateSourceToFunctional` and
are the other direction by design — the name always tells you.)

11. **Offline tools are always safe.** Calculators (`clio calc`) and job blueprints (`clio jobs`) need no auth and make no API calls. Use them freely for planning and computation.
12. **OAuth by default.** Hosted connectors sign in through their host. For local CLI/MCP, run `clio auth login` once on the intended computer; both share the saved session and refresh it automatically. Never copy tokens into chats, workspaces, or another application's configuration. API keys and PATs remain optional.

13. **Name the organization on every call.** Use `--org oauth:<resourceId>` for local OAuth, or the explicit organization ID in MCP tools. For API-key profiles, retain `--org <label>`. Do not rely on the shared active organization. Verify that CLI, MCP, and Jaz Kit's ORG.md refer to the same resource ID before writing. Existing per-company `.env` keys remain supported as an optional route; don't mix their key overrides with OAuth selectors.
