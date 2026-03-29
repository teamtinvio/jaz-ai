import { danger, success, warning, muted, highlight } from './ui/theme.js';
import * as p from '@clack/prompts';
import { Command } from 'commander';
import {
  clearStoredCredentials,
  requireAuth,
  getProfile,
  setProfile,
  removeProfile,
  getActiveLabel,
  setActiveLabel,
  listProfiles,
  findLabelByApiKey,
  resolvedAuthSource,
} from '../core/auth/index.js';
import type { ProfileEntry } from '../core/auth/index.js';
import { JazClient } from '../core/api/client.js';
import { getOrganization } from '../core/api/organization.js';
import { outputList, type OutputOpts } from './output.js';
import type { TableColumn } from './table-formatter.js';

/** Escape a string for safe use in shell export statements. */
function shellEscape(s: string): string {
  if (/^[a-zA-Z0-9_-]+$/.test(s)) return s;
  return `'${s.replace(/'/g, "'\\''")}'`;
}

/** Slugify an org name into a label: "Acme Pte Ltd" → "acme-pte-ltd" */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    || 'org';
}

/** Validate key by calling GET /organization. Returns org details or throws. */
async function validateKey(apiKey: string) {
  const client = new JazClient({ mode: 'direct', apiKey });
  return getOrganization(client);
}

/** Shared add-org logic used by both `auth add` and `auth set-key`. */
async function addOrg(key: string, opts: { as?: string; json?: boolean }): Promise<void> {
  if (!key.startsWith('jk-')) {
    console.error(danger('Error: API key must start with "jk-"'));
    process.exit(1);
  }

  // Check for duplicate key under the same (or default) label
  const existingLabel = findLabelByApiKey(key);
  if (existingLabel && (!opts.as || opts.as === existingLabel)) {
    if (opts.json) {
      console.log(JSON.stringify({ error: 'duplicate', existingLabel }));
    } else {
      console.error(warning(`This key is already registered as '${existingLabel}'.`));
    }
    return;
  }

  // Validate by calling the API
  let org;
  try {
    org = await validateKey(key);
  } catch {
    console.error(danger('Error: API key is invalid or the API is unreachable.'));
    process.exit(2);
  }

  const label = opts.as ?? slugify(org.name);

  // Warn if same key exists under different label
  if (existingLabel && existingLabel !== label) {
    if (!opts.json) {
      console.error(warning(`Note: This key is also registered as '${existingLabel}'.`));
    }
  }

  // Overwrite protection — don't silently replace a different key under the same label
  const existingProfile = getProfile(label);
  if (existingProfile && existingProfile.apiKey !== key) {
    if (opts.json) {
      console.log(JSON.stringify({ error: 'label_taken', label, existingOrgName: existingProfile.orgName }));
    } else {
      console.error(danger(`Label '${label}' is already used by ${existingProfile.orgName}. Use --as <label> to choose a different label.`));
    }
    process.exit(1);
  }

  const entry: ProfileEntry = {
    apiKey: key,
    orgName: org.name,
    orgId: org.resourceId,
    currency: org.currency,
    country: org.countryCode ?? '',
    addedAt: new Date().toISOString(),
  };

  setProfile(label, entry);

  if (opts.json) {
    console.log(JSON.stringify({ registered: true, label, orgName: org.name, currency: org.currency, country: org.countryCode }));
  } else {
    console.log(success(`\u2713 Registered: ${label} \u2014 ${org.name} (${org.currency}, ${org.countryCode})`));
    const active = getActiveLabel();
    if (active === label) {
      console.log(muted(`  Active org set to ${label}`));
    }
  }
}

export function registerAuthCommand(program: Command): void {
  const auth = program
    .command('auth')
    .description('Manage org connections and API credentials');

  // ── clio auth add <key> ─────────────────────────────────────────
  auth
    .command('add <key>')
    .description('Validate an API key and register the org')
    .option('--as <label>', 'Custom label (default: slugified org name)')
    .option('--json', 'Output as JSON')
    .action(addOrg);

  // ── clio auth switch [label] ────────────────────────────────────
  auth
    .command('switch [label]')
    .description('Switch the active org (interactive picker if no label)')
    .option('--json', 'Output as JSON')
    .option('--export', 'Output shell export statement for eval')
    .action(async (label: string | undefined, opts: { json?: boolean; export?: boolean }) => {
      const orgs = listProfiles();
      const labels = Object.keys(orgs);

      if (labels.length === 0) {
        console.error(danger('No orgs registered. Run `clio auth add <key>` first.'));
        process.exit(1);
      }

      let target = label;

      // Interactive picker if no label provided
      if (!target) {
        if (opts.json || opts.export) {
          console.error(danger('Error: --json and --export require a label argument.'));
          process.exit(1);
        }
        if (!process.stdin.isTTY || !process.stdout.isTTY) {
          console.error(danger('Error: interactive picker requires a TTY. Provide a label argument.'));
          process.exit(1);
        }
        const active = getActiveLabel();
        const selected = await p.select({
          message: 'Switch to:',
          options: labels.map(l => ({
            label: `${l === active ? '\u2605 ' : '  '}${l} \u2014 ${orgs[l].orgName} (${orgs[l].currency})`,
            value: l,
          })),
        });
        if (p.isCancel(selected)) return; // User cancelled
        target = selected;
      }

      try {
        setActiveLabel(target!);
      } catch (err) {
        console.error(danger((err as Error).message));
        process.exit(1);
      }

      const entry = orgs[target!];

      // --export: output shell export for eval $(clio auth switch X --export)
      if (opts.export) {
        console.log(`export JAZ_ORG=${shellEscape(target!)}`);
        return;
      }

      if (opts.json) {
        console.log(JSON.stringify({ switched: true, label: target, orgName: entry.orgName, currency: entry.currency }));
      } else {
        console.log(success(`Switched to: ${target} \u2014 ${entry.orgName} (${entry.currency}, ${entry.country})`));
        if (labels.length > 1) {
          console.log(muted(`  Tip: Pin to this terminal: eval "$(clio auth switch ${target} --export)"`));
          console.log(muted(`  Or add shell integration:  eval "$(clio auth shell-init)"`));
        }
      }
    });

  // ── clio auth list ──────────────────────────────────────────────
  auth
    .command('list')
    .description('List all registered orgs')
    .option('--format <type>', 'Output format: table, json, csv, yaml')
    .option('--json', 'Output as JSON')
    .action((opts: { json?: boolean; format?: string }) => {
      const orgs = listProfiles();
      const active = getActiveLabel();

      // Preserve original --json envelope (backwards compat)
      if (opts.json) {
        const entries = Object.entries(orgs).map(([label, entry]) => ({
          label,
          active: label === active,
          ...entry,
        }));
        console.log(JSON.stringify({ active, orgs: entries }, null, 2));
        return;
      }

      // --format (table/csv/yaml) via outputList
      if (opts.format) {
        const entries = Object.entries(orgs).map(([label, entry]) => ({
          label,
          active: label === active,
          orgName: entry.orgName,
          currency: entry.currency,
          country: entry.country,
        }));
        const columns: TableColumn[] = [
          { key: 'label', header: 'Label' },
          { key: 'active', header: 'Active' },
          { key: 'orgName', header: 'Org Name' },
          { key: 'currency', header: 'Currency' },
          { key: 'country', header: 'Country' },
        ];
        const wrapped = { data: entries as any, totalElements: entries.length, totalPages: 1, truncated: false };  // eslint-disable-line @typescript-eslint/no-explicit-any
        outputList(wrapped, columns, opts as OutputOpts, 'Auth Profiles');
        return;
      }

      const labels = Object.keys(orgs);
      if (labels.length === 0) {
        console.error(warning('No orgs registered. Run `clio auth add <key>` to get started.'));
        return;
      }

      for (const label of labels) {
        const entry = orgs[label];
        const marker = label === active ? warning('\u2605') : ' ';
        const labelStr = label === active ? highlight(label) : label;
        const countryStr = entry.country ? `  ${entry.country}` : '';
        console.log(`  ${marker} ${labelStr.padEnd(18)} ${entry.orgName.padEnd(22)} ${entry.currency}${countryStr}`);
      }

      // Show pinned indicator when JAZ_ORG is set
      const pinnedOrg = process.env.JAZ_ORG;
      if (pinnedOrg) {
        const safe = pinnedOrg.replace(/[\x00-\x1F\x7F]/g, '');
        console.log(muted(`\n  This terminal is pinned to: ${safe} (via JAZ_ORG)`));
      }
    });

  // ── clio auth remove <label> ────────────────────────────────────
  auth
    .command('remove <label>')
    .description('Remove a registered org')
    .option('--json', 'Output as JSON')
    .action((label: string, opts: { json?: boolean }) => {
      const removed = removeProfile(label);
      if (!removed) {
        const orgs = listProfiles();
        const available = Object.keys(orgs);
        const hint = available.length > 0 ? ` Available: ${available.join(', ')}` : '';
        console.error(danger(`Org '${label}' not found.${hint}`));
        process.exit(1);
      }

      if (opts.json) {
        console.log(JSON.stringify({ removed: true, label }));
      } else {
        console.log(success(`Removed: ${label}`));
        const active = getActiveLabel();
        if (!active) {
          console.error(warning('No active org. Run `clio auth switch <label>` to set one.'));
        }
      }
    });

  // ── clio auth whoami ──────────────────────────────────────────
  auth
    .command('whoami')
    .description('Show active org details')
    .option('--org <label>', 'Show a specific org instead')
    .option('--json', 'Output as JSON')
    .action(async (opts: { org?: string; json?: boolean }) => {
      try {
        // If --org specified, show that profile. Otherwise use normal resolution.
        if (opts.org) {
          const entry = getProfile(opts.org);
          if (!entry) {
            const available = Object.keys(listProfiles());
            const hint = available.length > 0 ? ` Available: ${available.join(', ')}` : '';
            console.error(danger(`Org '${opts.org}' not found.${hint}`));
            process.exit(1);
          }
          if (opts.json) {
            console.log(JSON.stringify({ label: opts.org, ...entry }, null, 2));
          } else {
            printProfile(opts.org, entry);
          }
          return;
        }

        const authConfig = requireAuth();
        const client = new JazClient(authConfig);
        const org = await getOrganization(client);
        const active = getActiveLabel();
        const source = resolvedAuthSource();

        if (opts.json) {
          console.log(JSON.stringify({ label: active, source, ...org }, null, 2));
        } else {
          if (active) {
            console.log(highlight('Label:'), active);
          }
          console.log(highlight('Organization:'), org.name);
          console.log(highlight('Currency:'), org.currency);
          console.log(highlight('Country:'), org.countryCode);
          console.log(highlight('Status:'), org.status);
          if (org.lockDate) {
            console.log(highlight('Lock Date:'), org.lockDate);
          }
          if (source) {
            const sourceHuman: Record<string, string> = {
              'flag-api-key': 'via --api-key flag',
              'env-api-key': 'via JAZ_API_KEY env',
              'flag-org': 'pinned via --org flag',
              'env-org': 'pinned via JAZ_ORG env',
              'active-file': 'from shared config (not pinned)',
            };
            const isPinned = source === 'env-org' || source === 'flag-org' || source === 'flag-api-key' || source === 'env-api-key';
            const sourceStr = sourceHuman[source] ?? source;
            console.log(highlight('Source:'), isPinned ? success(sourceStr) : warning(sourceStr));
          }
        }
      } catch (err) {
        const isAuthError = (err as Error).name === 'AuthError';
        console.error(danger(`Error: ${(err as Error).message}`));
        process.exit(isAuthError ? 3 : 2);
      }
    });

  // ── clio auth set-key <key> (backward compat alias) ─────────────
  auth
    .command('set-key <key>')
    .description('Store an API key (alias for `auth add`)')
    .option('--as <label>', 'Custom label (default: slugified org name)')
    .option('--json', 'Output as JSON')
    .action(addOrg);

  // ── clio auth clear ───────────────────────────────────────────
  auth
    .command('clear')
    .description('Remove ALL stored credentials')
    .option('--json', 'Output as JSON')
    .action((opts: { json?: boolean }) => {
      const removed = clearStoredCredentials();
      if (opts.json) {
        console.log(JSON.stringify({ removed }));
      } else if (removed) {
        console.log(success('All credentials removed.'));
      } else {
        console.error(warning('No credentials file found.'));
      }
    });

  // ── clio auth shell-init ────────────────────────────────────────
  auth
    .command('shell-init')
    .description('Output shell integration for session pinning (add to .bashrc/.zshrc)')
    .action(() => {
      console.log(generateShellInit());
    });

  // ── clio auth unpin ─────────────────────────────────────────────
  auth
    .command('unpin')
    .description('Remove session pin (unset JAZ_ORG)')
    .option('--export', 'Output shell unset command for eval')
    .action((opts: { export?: boolean }) => {
      if (opts.export) {
        console.log('unset JAZ_ORG');
        return;
      }
      if (process.env.JAZ_ORG) {
        const safe = process.env.JAZ_ORG.replace(/[\x00-\x1F\x7F]/g, '');
        console.log(success(`Session is pinned to: ${safe}`));
        console.log(muted('  To unpin: eval "$(clio auth unpin --export)"'));
        console.log(muted('  Or simply: unset JAZ_ORG'));
      } else {
        console.log(muted('Session is not pinned (JAZ_ORG is not set).'));
      }
    });
}

function printProfile(label: string, entry: ProfileEntry): void {
  console.log(highlight('Label:'), label);
  console.log(highlight('Organization:'), entry.orgName);
  console.log(highlight('Currency:'), entry.currency);
  console.log(highlight('Country:'), entry.country);
}

/** Generate shell function for session auto-pinning. Works in bash and zsh. */
function generateShellInit(): string {
  return `# Clio session pinning — auto-pins JAZ_ORG on switch
# Add to your .bashrc or .zshrc:  eval "$(clio auth shell-init)"
#
# After this, "clio auth switch <label>" will pin JAZ_ORG to your terminal.
# Use "clio auth unpin" to remove the pin.

clio() {
  local clio_bin
  clio_bin="$(command -v clio)" || { echo "clio: command not found" >&2; return 127; }

  if [ "$1" = "auth" ] && [ "$2" = "switch" ] && [ -n "$3" ]; then
    # Run switch normally (updates shared config + prints output)
    "$clio_bin" "$@"
    local rc=$?
    if [ $rc -eq 0 ]; then
      # Extract the label (first non-flag argument after "auth switch")
      shift 2
      local label=""
      for arg in "$@"; do
        case "$arg" in
          --*) ;;
          *) label="$arg"; break ;;
        esac
      done
      if [ -n "$label" ]; then
        case "$label" in
          *[!a-zA-Z0-9_-]*) echo "clio: invalid label for pinning: $label" >&2 ;;
          *) export JAZ_ORG="$label" ;;
        esac
      fi
    fi
    return $rc
  elif [ "$1" = "auth" ] && [ "$2" = "unpin" ]; then
    unset JAZ_ORG
    echo "Session unpinned. Falling back to shared active profile."
  else
    "$clio_bin" "$@"
  fi
}`;
}
