Set up Jaz in the tools I choose using the instructions below. Show every listed tool as its own selection row. Handle installation and configuration, guide me through sign-in, verify access, and help me get started.

---

# Jaz Agent Setup

Jaz is an accounting platform for managing business finances, from day-to-day transactions to reporting and closing the books. Its connectors, MCP server, and CLI let you access the user's accounting data and take actions on their behalf. Jaz skills provide guidance for recording transactions, reconciling accounts, analyzing reports, and completing accounting workflows.

## Guide the user; perform the setup

Run setup independently through supported tools, commands, and APIs. When a step needs the user, provide a direct link or exact instructions, then continue and verify after they finish. Ask only for selections, sign-in, required permissions, or missing information.

Configure the intended app or persistent workspace; installing in a disposable sandbox does not configure the user's computer. Mark inaccessible targets as pending and give the next step.

For installed targets, check for updates and verify access. Reconfigure only to fix a problem. Preserve user settings and files, respect version pins, and keep credentials out of chat, logs, and source control.

## 1. Choose installation targets

Ask **"Where would you like to use Jaz?"** Show every tool below in a multi-select UI, with one row per tool. Skip this question if the user already chose their targets.

List the current app and its sibling first: ChatGPT with Codex, or Claude with Claude Code. Keep the remaining options in the order below. If the current app is unknown, use the standard order.

If the UI requires smaller groups, present every group with individual tool choices. Without multi-select, use a numbered list accepting multiple names or numbers.

**ChatGPT and Claude**

- ChatGPT
- Codex
- Claude (Web and Desktop)
- Claude Code

**IDEs**

- Cursor
- Windsurf
- VS Code (GitHub Copilot)

**Other tools**

- Gemini CLI
- Microsoft 365 Copilot
- Copilot Studio
- Jaz CLI (terminal or scripts)
- Another tool (specify)

## 2. Prepare selected components

For local tooling or skill installation, check for Node.js LTS and npm and install prerequisites where needed. Check the current Jaz release:

```sh
npm view jaz-clio version
npx -y jaz-clio@latest --version
```

### Install skills

Install all Jaz skills supported by each selected target. Use bundled skills when available; otherwise install them in the target's persistent workspace:

```sh
npx -y jaz-clio@latest init --platform <platform> --skill all
```

Supported values: `claude`, `codex`, `cursor`, `windsurf`, `copilot`, `gemini`, or `agents`.

Confirm the skills appear in the target's live listing and load one without taking accounting actions. Reload if needed.

### Sign in

Use OAuth for setup. Connectors sign in through their app in section 3; each may require separate consent. For CLI and local MCP:

```sh
npx -y jaz-clio@latest auth login --json
```

Keep sign-in processes alive while the user completes consent and show the returned link. For local sign-in, the browser callback must reach the computer running Jaz. CLI and local MCP share this session and refresh it automatically.

Select the organization using section 4 before configuring local targets. If `auth login` is unavailable, update Jaz before continuing.

## 3. Configure each selected target

Use the hosted server for agent access, or local CLI/MCP for terminal workflows and targets that require it. Follow explicit user preferences. Choose one connection per target.

Replace `<organization-selector>` with `oauth:<resourceId>`. Use the same value if an extension pins its organization through `JAZ_ORG`.

**Hosted connection:** name `Jaz`, URL `https://mcp.jaz.ai/mcp`, authentication `OAuth`.

### ChatGPT

Show both links and let the user choose:

- [Open Jaz in ChatGPT Desktop](codex://plugins/plugin_asdk_app_6a28b9cc16948191a008db1db0a56533)
- [Open Jaz in ChatGPT Web](https://chatgpt.com/plugins/plugin_asdk_app_6a28b9cc16948191a008db1db0a56533)

Ask them to select **Install plugin** or **Connect**, sign in, and enable Jaz in the conversation. Installing in either makes Jaz available in both on the same account; the other may need an app restart or browser refresh. If the desktop link is unsupported, guide them to **Plugins → Jaz** inside the app.

### Codex

Add Jaz using one connection:

```sh
# Hosted MCP
codex mcp add jaz --url https://mcp.jaz.ai/mcp

# Local MCP
codex mcp add jaz -- npx -y jaz-clio@latest mcp --org <organization-selector>
```

If adding the hosted server did not start sign-in, run:

```sh
codex mcp login jaz
```

If commands are unavailable, use Codex's MCP settings.

### Claude (Web and Desktop)

Ask the user to complete this in their existing signed-in Claude session:

> Open [Connectors](https://claude.ai/settings/connectors), choose **Add custom connector**, set the name to **Jaz** and the URL to **`https://mcp.jaz.ai/mcp`**, then click **Connect** and sign in to Jaz.

### Claude Code

Add Jaz using one connection:

```sh
# Hosted MCP
claude mcp add --transport http jaz https://mcp.jaz.ai/mcp

# Local MCP
claude mcp add jaz -- npx -y jaz-clio@latest mcp --org <organization-selector>
```

For hosted sign-in, run this if supported by the installed CLI:

```sh
claude mcp login jaz
```

Otherwise use Claude Code's `/mcp` sign-in interface.

### Cursor, Windsurf, and VS Code / GitHub Copilot

Merge the chosen server entry into the appropriate file:

| Target | File | Root key |
| --- | --- | --- |
| Cursor | `.cursor/mcp.json` | `mcpServers` |
| Windsurf | `~/.codeium/windsurf/mcp_config.json` | `mcpServers` |
| VS Code / GitHub Copilot | `.vscode/mcp.json` | `servers` |

Local entry for Cursor or Windsurf:

```json
{"jaz":{"command":"npx","args":["-y","jaz-clio@latest","mcp","--org","<organization-selector>"]}}
```

For VS Code, also set `"type":"stdio"` inside the `jaz` entry.

Hosted entry for Cursor:

```json
{"jaz":{"url":"https://mcp.jaz.ai/mcp"}}
```

For Windsurf, use `serverUrl` instead of `url`. For VS Code, use `url` and add `"type":"http"`.

Enable the server, complete hosted sign-in through the editor, and reload if needed.

### Gemini CLI

Install the Jaz extension:

```sh
gemini extensions install https://github.com/teamtinvio/jaz-ai
```

Complete sign-in from section 2 on the same computer, pin the organization in its launch configuration, and reload. The extension includes workflow guidance.

### Microsoft 365 Copilot / Copilot Studio

In [Copilot Studio](https://copilotstudio.microsoft.com), add an MCP tool to the intended agent using the hosted URL. Select OAuth with dynamic discovery, create the connection, and sign in.

If discovery reports "Could not discover authorization server metadata," select **Dynamic** and use `https://api.getjaz.com/oauth/authorize` and `https://api.getjaz.com/oauth/token` as the authorization and token URLs. Do not ask for a client ID or secret for dynamic registration.

Publish to Microsoft 365 Copilot or Teams only if requested.

### Terminal or scripts

Pin the selected organization explicitly:

```sh
npx -y jaz-clio@latest org info --org <organization-selector> --json
```

### Other tools

Use its supported MCP interface with the same URL or local command and organization selector.

## 4. Select an organization and verify

Keep setup verification read-only.

List accessible organizations. Use the user's chosen organization, or select the only available one automatically. Otherwise show their names in a native single-select or numbered list and wait for a choice. If none are available, explain that organization access is needed.

Apply the choice across targets, asking again only if one cannot access it. For hosted MCP, call `list_organizations`, then use the live `organization` schema to read the selected organization:

```json
{"operation":"get_organization","arguments":{},"org_id":"<selected organization resourceId>"}
```

For local sign-in, use the returned choices or `auth organizations --json`, then `auth select <resourceId> --json`. Verify with `org info` for CLI or the equivalent live MCP tool.

Read the organization's details through each target's actual connection and confirm the resource ID. Sign-in, tool discovery, and organization lists alone do not verify access. CLI success does not verify an editor's MCP connection.

## 5. Complete setup and hand off

Name the verified organization and give each selected target a status: **Ready**, **Needs sign-in**, **Needs activation**, or **Needs verification**. For pending targets, give the next action. Omit installation diagnostics.

List every installed Jaz skill by its verified name, noting which target it is available in. Clearly mark skills still awaiting installation or activation. Show how to invoke one.

For a ready connection, explain that the user can describe the outcome they want in ordinary language, adding a period, customer, supplier, or document when relevant. The agent will use Jaz's tools and skills and ask for missing details; the user does not need to know commands or tool names.

If the user already gave a task, begin it. Otherwise offer up to three short prompts tailored to their organization, work, and available capabilities. Use these examples or relevant ones from the repository's [Quick start](https://github.com/teamtinvio/jaz-ai#quick-start) and [workflow guides](https://github.com/teamtinvio/jaz-ai/tree/main/src/skills):

- "Show me the 10 largest unpaid invoices."
- "Help me record a payment against an invoice."
- "Compare last month's profit and loss with the previous month, showing absolute and percentage variances by account."

Invite them to choose one or describe their own task. For development setups, use examples relevant to the workflow or integration they want to build.

Save non-secret connection details, organization ID, skill availability, and pending steps in supported persistent context.

## API-key access (optional)

Use this section when the user requests API-key access for CLI or local MCP.

Tell the user to get an API key from **Manage API Keys** in Jaz, then run this command in their own terminal, replacing `<key>` and `<profile-label>`:

```sh
npx -y jaz-clio@latest auth add <key> --as <profile-label>
```

Ask them to confirm when it is done and share only the profile label, not the key. Use the profile label as `<organization-selector>` or `JAZ_ORG` instead of the OAuth selector. The key determines the organization; verify it through the selected target's connection.

When using a named profile or OAuth selector, remove any conflicting `JAZ_API_KEY` override from the target's launch environment without displaying its value.

## Use the configured setup

Select the organization explicitly on every call and verify any requested switch. Discover operations through live tools, use JSON output for CLI work, and follow the user's scope and platform permissions.

At setup and each new session, check for relevant updates. Use section 2 for local versions and the app's update controls for connectors. Jaz manages hosted service updates. Restart changed components and re-verify access; sign in again only when required.

Read only the resources needed for the task:

| Resource | Use |
| --- | --- |
| [Operating guidance](https://github.com/teamtinvio/jaz-ai/blob/main/CONTEXT.md) | Organization handling and transaction conventions |
| [Workflow guidance](https://github.com/teamtinvio/jaz-ai/tree/main/src/skills) | Accounting procedures |
| [CLI reference](https://github.com/teamtinvio/jaz-ai/blob/main/cli/README.md) | Commands, profiles, structured output |
| [API specification](https://github.com/teamtinvio/jaz-ai/blob/main/spec/openapi.yaml) | Direct integrations |
| [Changelog](https://github.com/teamtinvio/jaz-ai/blob/main/CHANGELOG.md) | Release changes |
| [Help center](https://help.jaz.ai) | Product workflows |
| [Repository README](https://github.com/teamtinvio/jaz-ai/blob/main/README.md) | Setup troubleshooting |
