# Context — Rules of Engagement for Agents

Runtime guidance for AI agents using Jaz AI tools (CLI, MCP, or skills).

## Before You Start

1. **Bootstrap with context.** Run `clio context --json` to get the org's chart of accounts, currencies, tax profiles, and active settings. This prevents guessing.
2. **Check what's available.** CLI: `clio --help`. MCP: call `describe_capabilities` (or `search_tools` with an empty query on the meta-tool surface) — **not** `tools/list`. Depending on packaging, `tools/list` returns 3, 45, or 367 entries for the same 369 operations; only the capability map tells you what actually exists.

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
10. **Exchange rates read base→source. Declare the direction rather than inverting by hand.**
`add_currency_rate`, `update_currency_rate` and the `currency` object on transaction tools all take
the rate functionalToSource: 1 unit of the organization's base currency = N units of the foreign one.
Whether that matches how the rate was quoted to you depends on which currency is the base — SGD org adding USD from "1 USD = 1.35 SGD" → the quote is source-first, so send 0.74 or label it SOURCE_TO_FUNCTIONAL. USD org adding PHP from "1 USD = 56.5 PHP" → the quote is ALREADY base-first, so send 56.5 unchanged (FUNCTIONAL_TO_SOURCE). Inversion depends on which currency is the base, not on habit.
A wrong direction is accepted silently and wrong by rate². Rather than working it out, pass the number
as given and set `rateDirection` (`FUNCTIONAL_TO_SOURCE` | `SOURCE_TO_FUNCTIONAL`). If you cannot tell
which way the user's number reads, ask. (Some read-side fields are named `rateSourceToFunctional` and
are the other direction by design — the name always tells you.)

11. **Offline tools are always safe.** Calculators (`clio calc`) and job blueprints (`clio jobs`) need no auth and make no API calls. Use them freely for planning and computation.
12. **One key per session, set once.** Use a single `JAZ_API_KEY` per Claude session — set once in your Claude Desktop connector settings, Claude Code settings, or `JAZ_API_KEY` env var. Don't re-enter it per task. (The hosted connector at `mcp.jaz.ai` signs you in via OAuth instead — there's no key to set, and one sign-in reaches every org you belong to; name the org per request.)

13. **Serving several organizations from the CLI: register each once, then name it per call.** `clio auth add <key>` stores a key under a label; pass `--org <label>` on each command. Prefer that over `clio auth switch`, which rewrites the shared active profile and silently changes the organization for every other terminal and agent session on the machine. If a `JAZ_API_KEY` is also set in plugin or connector settings, MCP tool calls resolve to it and ignore the label — confirm both planes agree (`get_organization` vs `clio org info`) before writing, or clear the setting. (The `jaz-kit` skill takes a simpler route: it keeps each company's org-scoped key in that company's workspace `.env` and sources it per call, so the key itself selects the org — no profiles or `--org` at all.)
