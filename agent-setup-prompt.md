Set up Jaz in the tools I choose using the instructions below. Handle installation and configuration wherever you have access, preserve my existing settings, and guide me through sign-in or private credential entry. Verify the selected targets, then help me get started.

---

# Jaz Agent Setup

Jaz is an accounting platform for invoices, bills, journal entries, reconciliation, reporting, and period close. Set up its CLI, MCP server, or hosted connector in the user's chosen tools. Prefer OAuth sign-in, then verify access to the correct organization. Offer API-key access as an optional alternative for existing integrations or unattended environments. Keep setup read-only: never create or modify accounting records to test it.

## Guide the user; perform the setup

Begin: "I'll check your environment, help you choose where to connect Jaz, and handle the setup."

Run commands, edit configuration, install components, and check results yourself wherever your tools permit. Do not ask the user to copy commands, paste configuration, download files, or run scripts you can execute. Use the platform's required approval controls; avoid redundant confirmation questions.

Ask the user only for a target choice, sign-in, private credential entry, required permissions, or information you cannot determine. Give one concrete action at a time, explain what happens next, and resume when it is complete. Never treat silence as completion.

For connector sign-in, always include the target's direct connect link as a clickable Markdown link in your message. Open it yourself when supported, but still show the link to the user. Do not send them to search a directory or navigate settings when a direct link is provided below. Use manual navigation only if the link fails or is unavailable to their account.

Assess actual access rather than assuming capabilities from the app's name. A shell may reach the user's computer, a persistent remote workspace, or an isolated sandbox. Connected folders and app controls may be accessible independently of the shell. Configure only the intended environment, and distinguish saved configuration from a running, authenticated connection.

Reuse working connections and credentials. Merge settings and guidance without overwriting user content. Keep keys and tokens out of chat, logs, generated instructions, and source control.

## 1. Choose installation targets

First inspect your runtime, available Jaz tools, and accessible application settings without installing anything or reading secret values.

Make target selection the only setup-preference question. Include skills by default where supported, with a Tools only opt-out in the same interaction. Omit questions already answered by the request or existing setup. Ask **"Where would you like to use Jaz?"** Use a multi-select interface when available; otherwise show a numbered list that accepts multiple choices:

- Claude Code
- Codex
- Cursor
- Windsurf
- VS Code / GitHub Copilot
- Gemini CLI
- Claude web, Desktop, or Cowork
- ChatGPT
- Microsoft 365 Copilot / Copilot Studio
- Terminal or scripts — Jaz CLI
- Another tool

Recommend OAuth with skills where supported; terminal/scripts implies local tooling. Choose the connection around the user's task, keeping authentication a separate choice. Do not ask the user to choose a connection method when only one is applicable.

Mark the current platform as recommended and identify detected existing connections. If the user already named their targets, use those choices without asking again. Ask which tool only when they choose "Another tool."

For each selected target, check whether you can configure it directly. Access to another selected application's settings is sufficient; you are not limited to your own application's configuration. If the intended machine or workspace is unclear, resolve that before making changes.

Choose the simplest supported connection:

- **Hosted MCP with OAuth** for connector-only use, including terminal and editor agents that support it.
- **Local CLI/MCP** when the user wants local tooling, scripts, or a development setup that needs it. Check the installed release for OAuth support before initiating authentication.

Choose the connection method yourself from the selected targets and available capabilities. Prefer one shared local OAuth session when local CLI and MCP are selected together; use hosted OAuth for hosted targets. Explain the choice briefly without asking another preference question. Honor explicit preferences. Separate hosted applications may each require their own consent.

### Include skills where supported

Skills provide reusable accounting instructions and workflows; tools provide access to Jaz data and actions. Skills can work with either hosted OAuth or local MCP. A hosted connection does not mean the user has declined skills.

Install or reuse Jaz skills for selected targets that support them unless the user chooses Tools only. Explain that skills provide workflow guidance alongside the connection; do not ask a separate skills question. Use the target's persistent workspace or supported import interface. Installing files in your sandbox does not install them in the user's application. For targets without skill support, use their available tools and workflow documentation without promising native skill shortcuts.

Briefly state the chosen targets, connection method, and skills choice, then proceed. Skip only the components already working; continue setting up the other selected components and targets.

## 2. Prepare selected components

Skip this section only when neither local tooling nor skill installation was selected. For either, check for a compatible Node.js LTS and npm, installing prerequisites when your environment supports it.

```sh
npm view jaz-clio version
npx -y jaz-clio@latest --version
```

The second command downloads and runs Jaz as needed without a global installation. Reuse a working installation and respect explicit version pins.

### Skills, if selected

If the selected plugin or extension bundles Jaz skills, install or reuse it in section 3 and verify those skills instead of installing duplicates. Otherwise, for a fresh workspace, install guidance for the selected platform, including when its tools use hosted OAuth:

```sh
npx -y jaz-clio@latest init --platform <platform> --skill all
```

Supported values: `claude`, `codex`, `cursor`, `windsurf`, `copilot`, `gemini`, or `agents`. For existing or partial installations, generate files in a temporary workspace and merge the required changes, including the platform's instruction file. Do not rerun initialization over existing skills or use force to replace user guidance. For multiple targets, stage each platform separately, merge shared skills once, and preserve each target's instruction file and configuration. Verify that the target discovers the installed skills and load one without running accounting actions. Reload yourself when supported; otherwise state the exact remaining activation step. Distinguish installed files from skills available in the current session. Use the target's live skill listing to verify invocation names; they can differ from both metadata names and folder names. Installing skills does not require authentication. Use hosted tools for workflows they support. Use the installed workflow's supported connection. Jaz Kit identifies each company by its organization ID; pin that ID on every call. Do not request an API key merely to install or use skills. If older instructions require key-based access, check for an update before offering that alternative.

### Authenticate with OAuth

For hosted connections, start the target's OAuth flow in section 3 and let the user complete Jaz sign-in and consent. Handle configuration, activation, and verification yourself wherever supported. Do not ask for an API key.

For local CLI/MCP, reuse a working OAuth session. Otherwise start:

```sh
npx -y jaz-clio@latest auth login --json
```

Run sign-in in a process that stays alive while waiting for the user; keep its handle and capture the sign-in link separately so you can recover it. The command opens Jaz sign-in and waits for a callback. Show the returned sign-in link as a clickable link, keep the process alive, and let the user sign in and consent. The browser must be able to reach the computer running Jaz. For an isolated sandbox, configure the user's intended machine or use hosted OAuth instead; never copy tokens between applications.

Use the returned organization choices as described in section 4 before configuring local targets. If needed, refresh the choices with `auth organizations --json`, then run `auth select <resourceId> --json`. CLI and local MCP share this session and refresh it automatically.

Use `oauth:<resourceId>` as the local **organization selector**. For optional API-key access, the selector is the saved profile label. An explicit `--org` selector overrides inherited `JAZ_API_KEY`; preserve existing keys and profiles. If a target pins its organization only through `JAZ_ORG`, avoid a conflicting inherited key in that server's launch environment.

If the installed release does not offer `auth login`, update it while respecting explicit pins. If an update is unavailable, explain the limitation and offer hosted OAuth or optional API-key access. Do not invent a login command or silently change authentication methods.

### Optional: API-key access

Use this route when the user requests key-based access or chooses it for a surface that cannot yet use OAuth. Preserve existing working key-based setups unless the user wants to migrate them.

Reuse a valid organization profile. Otherwise, open Jaz's **Manage API Keys** screen through available app controls or a verified dashboard link, then prepare private credential entry in the intended environment.

The registration command is:

```text
npx -y jaz-clio@latest auth add <key> --as <profile-label>
```

Prefer a supported secure credential field or private local input flow that runs registration without exposing the key to the agent or transcript. Prepare and launch the flow yourself when possible; the user's action should be entering the credential. Do not request the key in chat or invent an interactive mode.

If private input is unavailable, hand off only credential registration in a private terminal and continue all other setup yourself. Let Jaz's tooling store the key; retain only the profile label. Verify its organization before use.

## 3. Configure each selected target

Use the instructions for every selected target. Match existing connections by endpoint or launch command, not just the name `jaz`. Keep existing server names and configuration scopes, and substitute the actual name in commands below. Register either hosted or local MCP for a target, avoiding duplicate connections. For local commands below, replace `<organization-selector>` with `oauth:<resourceId>` for OAuth, or the registered profile label for API-key access.

**Hosted connection:** name `Jaz`, URL `https://mcp.jaz.ai/mcp`, authentication `OAuth`.

### Claude Code

Check existing connections, including any inherited Claude connectors:

```sh
claude mcp list
```

If absent, choose the selected method:

```sh
# Hosted MCP
claude mcp add --transport http jaz https://mcp.jaz.ai/mcp

# Local MCP
claude mcp add jaz -- npx -y jaz-clio@latest mcp --org <organization-selector>
```

If authentication is needed and the installed CLI supports it, initiate it yourself in an interactive terminal:

```sh
claude mcp login jaz
```

Let the user complete browser sign-in. Keep the login process alive while waiting. In a remote environment, use the CLI's supported callback flow; keep authorization codes and redirect URLs out of chat. Use Claude Code's in-app `/mcp` interface only if command-line sign-in is unavailable.

### Codex

Check available connected apps as well as MCP servers; an app connection may not appear in the MCP list.

```sh
codex mcp list --json
```

If absent, choose the selected method:

```sh
# Hosted MCP
codex mcp add jaz --url https://mcp.jaz.ai/mcp

# Local MCP
codex mcp add jaz -- npx -y jaz-clio@latest mcp --org <organization-selector>
```

If hosted sign-in has not started or needs resuming, initiate it yourself:

```sh
codex mcp login jaz
```

Adding the hosted server may already start sign-in; do not start a second flow. Keep the process alive while the user completes browser sign-in. If commands are unavailable, use Codex's MCP settings.

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

Enable the server and initiate hosted sign-in through the editor. Perform activation or reload yourself if supported; otherwise give the user the single required action.

### Gemini CLI

Reuse an existing Jaz extension. Otherwise install it:

```sh
gemini extensions install https://github.com/teamtinvio/jaz-ai
```

For the extension's local MCP, complete local OAuth sign-in on the same computer and restart or reload the extension. Pin its organization through the supported launch configuration. The extension includes workflow guidance; do not install duplicate skills. API-key access remains optional.

### Claude web, Desktop, or Cowork

Reuse an available Jaz connector. For hosted OAuth, open Claude's connector settings through available app controls and add `https://mcp.jaz.ai/mcp` as a custom connector. If user action is needed, give the clickable [Open Claude](https://claude.ai/) link and the precise **Settings → Connectors → Add custom connector** action, then guide sign-in.

[Jaz in Claude's directory](https://claude.ai/directory/ant.dir.gh.teamtinvio.jaz-ai) is also available, with a [public listing](https://claude.com/connectors/jaz-accounting). Inspect the offered installation type: if it offers a Desktop extension or API-key setup, do not substitute it for the user's selected hosted OAuth connection.

For local MCP in Claude Desktop, merge the local entry from the editor section under `mcpServers` in its configuration file: `~/Library/Application Support/Claude/claude_desktop_config.json` on macOS or `%APPDATA%\Claude\claude_desktop_config.json` on Windows. Use the selected organization selector. Local stdio configuration does not configure Claude web or Cowork; use their supported hosted connector instead.

After sign-in or activation, check whether Jaz tools are available. Enable or reload yourself when supported; otherwise give the one required action. Report workspace restrictions only if encountered.

### ChatGPT

Reuse an available Jaz app. If connection or sign-in is needed, show:

> [Connect Jaz to ChatGPT](https://chatgpt.com/plugins/plugin_asdk_app_6a28b9cc16948191a008db1db0a56533), select the available **Install plugin** or **Connect** action, and complete sign-in. Come back here when you're done; I'll check the connection.

After sign-in, check whether Jaz tools are available. Enable Jaz yourself if supported; otherwise give the next action to enable it in the conversation.

Only if the direct link fails, guide the user to find Jaz in the app directory. If unavailable there, use a custom remote MCP connection where the account and workspace support it. Report any administrator requirement only if encountered.

### Microsoft 365 Copilot / Copilot Studio

In [Copilot Studio](https://copilotstudio.microsoft.com), open the intended agent and add an MCP tool with the hosted URL. Select OAuth with dynamic discovery, create the connection, and let the user sign in to Jaz. Add it to the agent.

If discovery reports "Could not discover authorization server metadata," select **Dynamic** and use `https://api.getjaz.com/oauth/authorize` and `https://api.getjaz.com/oauth/token` as the authorization and token URLs. Do not ask for a client ID or secret for dynamic registration.

Use available controls yourself. Publishing to Microsoft 365 Copilot or Teams is a separate deployment step; report it as pending unless the user requested publication.

### Terminal or scripts

Pin the selected organization explicitly:

```sh
npx -y jaz-clio@latest org info --org <organization-selector> --json
```

### Other tools

Use the tool's supported MCP configuration with the same hosted URL or local command and organization selector. If it does not support the selected connection method, explain the available alternative before changing the plan.

## 4. Select an organization and verify

List organizations reachable through the authenticated connection. Use the only available organization automatically, or the user's existing explicit choice. If consent or existing trusted context already identifies the intended organization, reuse it. If several still remain with no explicit choice, present their names once and wait for a choice; never guess a financial organization to reduce setup questions. If none are available, explain that organization access is needed.

Reuse that choice across targets; ask again only if another connection cannot access it. Read the chosen organization's name and resource ID. For hosted MCP, where available, call `list_organizations`, then `organization` with:

```json
{"operation":"get_organization","arguments":{},"org_id":"<selected organization resourceId>"}
```

For local OAuth, use the choices returned by sign-in or `auth organizations --json`, then `auth select <resourceId> --json`; skip another selection if sign-in already verified the intended organization. For local CLI, use the `org info` command above. For local MCP, discover the equivalent read through live tool descriptions. A single-organization key selects its organization automatically; still verify its identity.

Verify each selected target where possible. Use the active session's actual connection when checking tools; a separate CLI configuration listing does not prove which server that session loaded. Do not invent scope-precedence explanations or recommend removing an existing connection without evidence of a real conflict. A successful installation, "Connected" status, tool discovery, or zero exit code does not prove authenticated data access. Require the selected organization detail operation to succeed through each connection. Listing accessible organizations is a selection step, not sufficient verification: for MCP, call `get_organization` through the live tool schema and confirm its returned resource ID. CLI success alone does not prove an editor's MCP connection is active. Confirm that targets intended for the same organization resolve to the same ID. Mark inaccessible targets as configured but pending verification rather than ready.

## 5. Complete setup and hand off

Keep the successful handoff focused on the selected targets and how to use them. Omit unused connections, installation diagnostics, and optional cleanup offers unless they caused a verified failure in a selected target. Give a brief result for each selected target: **Ready**, **Needs sign-in**, **Needs activation**, or **Needs verification**. Name the verified organization. If anything remains, provide the next action and resume afterward; do not repeat completed steps.

Save non-secret connection details, authentication method, target scopes, profile labels when applicable, organization ID, skills choice and availability, verification date, and remaining steps in the workspace or platform's supported persistent context. Preserve existing instructions.

### Help the user start using Jaz

Give a short onboarding message tailored to the target they selected and the work they described. Explain:

- **Where to work:** name the connected app and organization. If it is the current conversation, say they can continue here. Otherwise, tell them where to open the connected agent and how to enable Jaz if needed.
- **How to ask:** describe the outcome in ordinary language. Include a period, customer, supplier, or document when relevant; the user does not need tool names, account IDs, or commands. For a development setup, ask for the workflow or integration they want to build and where it should run.
- **How to use skills and tools directly:** state whether skills are available, pending activation, or were skipped. For installed skills, show how to select or invoke one using the target's actual interface and a verified skill name. Explain that the user can also ask the agent to call a named Jaz tool; use an available tool as the example. Do not invent shortcuts or present a tool name as a terminal command.
- **What happens next:** the agent finds the relevant Jaz data, asks for missing details, and helps complete the task. Explain proposed record changes clearly and follow the platform's permissions and approval settings. Mention only capabilities available through the verified connection.
- **How to continue:** follow-up questions can refine the same task. To work in another organization, ask to switch; verify the new organization before using it. In a new conversation, enable Jaz if required.

Keep this to a few sentences, not a feature list or menu of sample prompts. If an example would help, give one grounded in the user's stated work.

End with one contextual question, such as **"What are you working on in <organization name> today?"** If the user already gave a task, summarize it and begin, asking only for the next missing detail. Guide them through that first task instead of ending at setup confirmation.

## Use the configured setup

Select the organization explicitly on every call. Discover operations through live tools, use JSON output for CLI work, and stay within the user's request.

At setup and each new session, check relevant updates. Respect pinned versions; for unpinned local tooling, compare the published and resolved versions using the commands in §2. Preserve customizations when updating guidance and restart updated MCP processes. Hosted service updates are managed by Jaz; apply platform-offered connector updates when needed. Reauthenticate only when required, then re-verify access.

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
