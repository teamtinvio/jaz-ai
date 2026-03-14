/**
 * Interactive command picker for bare `clio` and bare `clio <group>` invocations.
 *
 * Uses `prompts` autocomplete with fuzzy search, numbered choices, and
 * inline category tags. Activates only in TTY terminals — non-interactive
 * usage (pipes, --json, CI) is unaffected.
 */
import chalk from 'chalk';
import prompts from 'prompts';
import type { Command } from 'commander';

// ── Category map (keyed by top-level command name) ──────────────────

const CATEGORIES: Record<string, string> = {
  invoices: 'AR',
  'customer-credit-notes': 'AR',
  bills: 'AP',
  'supplier-credit-notes': 'AP',
  journals: 'Acctg',
  'cash-in': 'Acctg',
  'cash-out': 'Acctg',
  'cash-transfer': 'Acctg',
  bank: 'Banking',
  payments: 'Banking',
  cashflow: 'Banking',
  contacts: 'Data',
  accounts: 'Data',
  items: 'Data',
  tags: 'Data',
  capsules: 'Data',
  currencies: 'Data',
  'currency-rates': 'Data',
  'tax-profiles': 'Data',
  bookmarks: 'Data',
  'org-users': 'Data',
  attachments: 'Data',
  calc: 'Calc',
  'capsule-transaction': 'Recipes',
  jobs: 'Jobs',
  reports: 'Reports',
  exports: 'Reports',
  schedulers: 'Reports',
  magic: 'AI',
  'help-center': 'AI',
  context: 'AI',
  init: 'Setup',
  update: 'Setup',
  versions: 'Setup',
  auth: 'Setup',
  org: 'Setup',
};

const CATEGORY_ORDER = [
  'AR', 'AP', 'Acctg', 'Banking', 'Jobs', 'Calc', 'Recipes',
  'Reports', 'Data', 'AI', 'Setup',
];

/** Commands excluded from the picker. */
const SKIP = new Set(['serve', 'mcp', 'help']);

// ── Types ───────────────────────────────────────────────────────────

interface LeafCommand {
  path: string;
  description: string;
  category: string;
}

// ── Collect leaf commands recursively ───────────────────────────────

function collectLeaves(
  commands: readonly Command[],
  prefix: string,
  category: string,
): LeafCommand[] {
  const leaves: LeafCommand[] = [];

  for (const cmd of commands) {
    const name = cmd.name();
    if (SKIP.has(name)) continue;

    const path = prefix ? `${prefix} ${name}` : name;
    const cat = prefix ? category : (CATEGORIES[name] ?? 'Other');
    const subs = cmd.commands.filter(c => !SKIP.has(c.name()));
    const hasOwnAction = (cmd as any)._actionHandler != null;

    if (subs.length > 0) {
      // Commands with own action + subcommands (e.g. jobs bank-recon)
      // appear as both a leaf AND parent
      if (hasOwnAction) {
        leaves.push({ path, description: cmd.description(), category: cat });
      }
      leaves.push(...collectLeaves(subs, path, cat));
    } else {
      leaves.push({ path, description: cmd.description(), category: cat });
    }
  }

  return leaves;
}

// ── Build prompts choices ───────────────────────────────────────────

function buildChoices(leaves: LeafCommand[]): prompts.Choice[] {
  // Sort by category order, then alphabetically within category
  const sorted = [...leaves].sort((a, b) => {
    const idxA = CATEGORY_ORDER.indexOf(a.category);
    const idxB = CATEGORY_ORDER.indexOf(b.category);
    const catA = idxA === -1 ? 999 : idxA;
    const catB = idxB === -1 ? 999 : idxB;
    if (catA !== catB) return catA - catB;
    return a.path.localeCompare(b.path);
  });

  const maxPath = Math.min(Math.max(...sorted.map(l => l.path.length)), 38);

  return sorted.map((leaf, i) => {
    const num = String(i + 1).padStart(3);
    const cmd = leaf.path.padEnd(maxPath);
    return {
      title: `${num}. ${cmd}`,
      value: leaf.path,
      description: `${leaf.description}  [${leaf.category}]`,
    };
  });
}

// ── Fuzzy suggest (precomputed hay strings) ─────────────────────────

function createSuggest(choices: prompts.Choice[]) {
  // Precompute lowercased search strings once, not on every keystroke
  const hayMap = new Map(choices.map(c => [
    c.value as string,
    `${c.title} ${c.description ?? ''}`.toLowerCase(),
  ]));
  return async (input: string, choices: prompts.Choice[]): Promise<prompts.Choice[]> => {
    if (!input) return choices;
    const terms = input.toLowerCase().split(/\s+/).filter(Boolean);
    return choices.filter(c => {
      const hay = hayMap.get(c.value as string) ?? '';
      return terms.every(t => hay.includes(t));
    });
  };
}

// ── TTY guard ───────────────────────────────────────────────────────

export function shouldShowPicker(): boolean {
  if (!process.stdout.isTTY || !process.stdin.isTTY) return false;
  const args = process.argv.slice(2);
  return !args.some(a =>
    a === '--json' || a === '--help' || a === '-h' ||
    a === '--version' || a === '-V',
  );
}

// ── Auth info for picker header ──────────────────────────────────────

export interface PickerAuthInfo {
  label: string;
  orgName: string;
  currency: string;
  otherOrgCount: number;
}

// ── Top-level picker ────────────────────────────────────────────────

export async function showCommandPicker(
  program: Command,
  authInfo?: PickerAuthInfo,
): Promise<string | null> {
  const leaves = collectLeaves(program.commands, '', '');
  const choices = buildChoices(leaves);
  const version = program.version() ?? '';

  // Strip control chars / ANSI sequences from untrusted strings
  const safe = (s: string) => s.replace(/[\x00-\x1F\x7F]/g, '').replace(/\x1B\[[0-9;]*[A-Za-z]/g, '');

  // Merged header: version + org info (if authenticated) + help hints
  let header = `  Clio v${version}`;
  if (authInfo) {
    header += ` · ${safe(authInfo.label)} · ${safe(authInfo.orgName)} (${safe(authInfo.currency)})`;
    if (authInfo.otherOrgCount > 0) {
      header += ` + ${authInfo.otherOrgCount} other org${authInfo.otherOrgCount > 1 ? 's' : ''}`;
    }
  }
  header += ` — ${choices.length} commands`;
  process.stderr.write(chalk.dim(header + '\n'));
  process.stderr.write(chalk.dim('  type to filter, ↑↓ navigate, Enter select, Esc quit\n\n'));

  const result = await prompts({
    type: 'autocomplete',
    name: 'command',
    message: 'clio',
    choices,
    suggest: createSuggest(choices),
    limit: 20,
  }, { onCancel: () => process.exit(0) });

  return result.command ?? null;
}

// ── Subcommand picker ───────────────────────────────────────────────

async function showSubcommandPicker(
  parent: Command,
  parentPath: string,
): Promise<string | null> {
  const topLevel = parentPath.split(' ')[0];
  const category = CATEGORIES[topLevel] ?? 'Other';
  const leaves = collectLeaves(parent.commands, parentPath, category);
  const choices = buildChoices(leaves);

  process.stderr.write(
    chalk.dim(`  ${choices.length} subcommands — type to filter, ↑↓ navigate, Enter select, Esc quit\n\n`),
  );

  const result = await prompts({
    type: 'autocomplete',
    name: 'command',
    message: `clio ${parentPath}`,
    choices,
    suggest: createSuggest(choices),
    limit: 15,
  }, { onCancel: () => process.exit(0) });

  return result.command ?? null;
}

// ── Attach subcommand pickers to group commands ─────────────────────

/**
 * Recursively attach interactive pickers to group commands that have
 * subcommands but no default action of their own.
 *
 * After this, bare `clio invoices` or `clio invoices draft` show a picker
 * instead of the Commander help dump.
 */
export function attachSubcommandPickers(program: Command): void {
  function recurse(parent: Command, parentPath: string): void {
    for (const cmd of parent.commands) {
      const name = cmd.name();
      if (SKIP.has(name)) continue;

      const path = parentPath ? `${parentPath} ${name}` : name;
      const subs = cmd.commands.filter(c => !SKIP.has(c.name()));

      if (subs.length > 0) {
        const hasOwnAction = (cmd as any)._actionHandler != null;
        if (!hasOwnAction) {
          cmd.action(async () => {
            const selected = await showSubcommandPicker(cmd, path);
            if (!selected) process.exit(0);
            await program.parseAsync(['node', 'clio', ...selected.split(' ')]);
          });
        } else if (process.stdin.isTTY && process.stdout.isTTY) {
          // Parent has both own action AND subcommands (e.g. jobs payment-run).
          // Wrap action to show disambiguation when invoked bare from picker.
          const originalAction = (cmd as any)._actionHandler;
          let inDisambiguation = false;
          (cmd as any)._actionHandler = async (...args: unknown[]) => {
            // Re-entrancy guard: if we're already in disambiguation (e.g. parseAsync
            // re-invoked this handler), run the original action directly.
            if (inDisambiguation) return originalAction.call(cmd, ...args);
            inDisambiguation = true;
            try {
              const choices: prompts.Choice[] = [
                {
                  title: `${name} ${chalk.dim('(default blueprint)')}`,
                  value: '__default__',
                  description: cmd.description(),
                },
                ...subs.map(sub => ({
                  title: `${name} ${sub.name()}`,
                  value: sub.name(),
                  description: sub.description(),
                })),
              ];

              process.stderr.write(chalk.dim(`\n  ${name} has subcommands — pick one:\n\n`));
              const { action } = await prompts({
                type: 'select',
                name: 'action',
                message: `clio ${path}`,
                choices,
              }, { onCancel: () => process.exit(0) });

              if (action === '__default__') {
                return originalAction.call(cmd, ...args);
              }
              await program.parseAsync(['node', 'clio', ...path.split(' '), action]);
            } finally {
              inDisambiguation = false;
            }
          };
        }
        // Recurse deeper (invoices > draft, capsules > types, etc.)
        recurse(cmd, path);
      }
    }
  }
  recurse(program, '');
}
