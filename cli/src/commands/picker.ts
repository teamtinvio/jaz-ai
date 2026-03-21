/**
 * Interactive command picker — two-level category navigation.
 *
 * Level 1: 11 categories — fits on one screen at any width.
 * Level 2: Commands within selected category — compact, filterable.
 *
 * Uses custom branded picker (ui/picker.ts), NOT @clack/prompts chrome.
 * Activates only in TTY terminals — non-interactive usage is unaffected.
 */
import * as p from '@clack/prompts';
import type { Command } from 'commander';
import { showPicker, isCancel } from './ui/picker.js';
import { accent, muted } from './ui/theme.js';

// ── Category map ────────────────────────────────────────────────────

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

const CATEGORY_HINTS: Record<string, string> = {
  AR: 'Invoices, credit notes, payments',
  AP: 'Bills, supplier credit notes',
  Acctg: 'Journals, cash in/out/transfer',
  Banking: 'Bank, reconciliation, cashflow',
  Jobs: 'Month-end, recon, tax filing',
  Calc: 'Loan, lease, depreciation, ECL',
  Recipes: 'Capsule transactions (IFRS)',
  Reports: 'TB, P&L, balance sheet, exports',
  Data: 'Contacts, accounts, items, tags',
  AI: 'Magic extraction, help center',
  Setup: 'Auth, org, init, update',
};

const SKIP = new Set(['serve', 'mcp', 'help']);

// ── Types ───────────────────────────────────────────────────────────

interface LeafCommand {
  path: string;
  description: string;
  category: string;
}

// ── Collect leaf commands ───────────────────────────────────────────

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
      if (hasOwnAction) leaves.push({ path, description: cmd.description(), category: cat });
      leaves.push(...collectLeaves(subs, path, cat));
    } else {
      leaves.push({ path, description: cmd.description(), category: cat });
    }
  }
  return leaves;
}

function truncateDesc(desc: string, max: number): string {
  const short = desc.split(/[.;—]/).shift()?.trim() ?? desc;
  return short.length <= max ? short : short.slice(0, max - 1) + '…';
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

// ── Auth info ───────────────────────────────────────────────────────

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
  const version = program.version() ?? '';
  const safe = (s: string) => s.replace(/[\x00-\x1F\x7F]/g, '').replace(/\x1B\[[0-9;]*[A-Za-z]/g, '');

  // Build header
  let headerText = `Clio v${version}`;
  if (authInfo) {
    headerText += ` ${muted('·')} ${safe(authInfo.label)} ${muted('·')} ${safe(authInfo.orgName)} (${safe(authInfo.currency)})`;
    if (authInfo.otherOrgCount > 0) headerText += ` ${muted(`+${authInfo.otherOrgCount} more`)}`;
  }

  // ── Level 1: Categories ──
  while (true) {
    const categoryItems = CATEGORY_ORDER.map(cat => {
      const count = leaves.filter(l => l.category === cat).length;
      return {
        label: cat,
        value: cat,
        hint: `${String(count).padStart(3)} commands   ${CATEGORY_HINTS[cat] ?? ''}`,
      };
    });

    const category = await showPicker({
      header: headerText,
      items: categoryItems,
    });

    if (isCancel(category)) process.exit(0);

    // ── Level 2: Commands in category ──
    const catLeaves = leaves
      .filter(l => l.category === category)
      .sort((a, b) => a.path.localeCompare(b.path));

    const descBudget = Math.max(20, (process.stdout.columns || 80) - 44);
    const commandItems = [
      { label: '← Back', value: '__back__', hint: 'Return to categories' },
      ...catLeaves.map(leaf => ({
        label: leaf.path,
        value: leaf.path,
        hint: truncateDesc(leaf.description, descBudget),
      })),
    ];

    const selected = await showPicker({
      header: `${accent(String(category))} ${muted('·')} ${catLeaves.length} commands`,
      items: commandItems,
      filterable: true,
    });

    if (isCancel(selected)) process.exit(0);
    if (selected === '__back__') continue;

    return selected as string;
  }
}

// ── Subcommand picker ───────────────────────────────────────────────

async function showSubcommandPicker(
  parent: Command,
  parentPath: string,
): Promise<string | null> {
  const topLevel = parentPath.split(' ')[0];
  const category = CATEGORIES[topLevel] ?? 'Other';
  const leaves = collectLeaves(parent.commands, parentPath, category)
    .sort((a, b) => a.path.localeCompare(b.path));

  const descBudget = Math.max(20, (process.stdout.columns || 80) - 44);
  const items = leaves.map(leaf => ({
    label: leaf.path,
    value: leaf.path,
    hint: truncateDesc(leaf.description, descBudget),
  }));

  const result = await showPicker({
    header: `clio ${parentPath}`,
    items,
    filterable: items.length > 10,
  });

  if (isCancel(result)) process.exit(0);
  return result as string ?? null;
}

// ── Attach subcommand pickers ───────────────────────────────────────

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
          const originalAction = (cmd as any)._actionHandler;
          let inDisambiguation = false;
          (cmd as any)._actionHandler = async (...args: unknown[]) => {
            if (inDisambiguation) return originalAction.call(cmd, ...args);
            inDisambiguation = true;
            try {
              const items = [
                { label: `${name} (default)`, value: '__default__', hint: truncateDesc(cmd.description(), 50) },
                ...subs.map(sub => ({
                  label: `${name} ${sub.name()}`,
                  value: sub.name(),
                  hint: truncateDesc(sub.description(), 50),
                })),
              ];

              const action = await showPicker({
                header: `clio ${path}`,
                items,
              });
              if (isCancel(action)) process.exit(0);
              if (action === '__default__') return originalAction.call(cmd, ...args);
              await program.parseAsync(['node', 'clio', ...path.split(' '), action]);
            } finally {
              inDisambiguation = false;
            }
          };
        }
        recurse(cmd, path);
      }
    }
  }
  recurse(program, '');
}
