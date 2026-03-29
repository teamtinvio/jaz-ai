#!/usr/bin/env node

import { Command } from 'commander';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
// @ts-expect-error no type declarations
import updateNotifier from 'update-notifier';
import { initCommand } from './commands/init.js';
import { versionsCommand } from './commands/versions.js';
import { updateCommand } from './commands/update.js';
import { registerCalcCommand } from './commands/calc.js';
import { registerJobsCommand } from './commands/jobs.js';
import { registerAuthCommand } from './commands/auth.js';
import { registerOrgCommand } from './commands/org.js';
import { setActiveOrg } from './core/auth/index.js';
import { registerAccountsCommand } from './commands/accounts.js';
import { registerContactsCommand } from './commands/contacts.js';
import { registerInvoicesCommand } from './commands/invoices.js';
import { registerBillsCommand } from './commands/bills.js';
import { registerJournalsCommand } from './commands/journals.js';
import { registerCashEntryCommand } from './commands/cash-entry.js';
import { listCashIn, getCashIn, createCashIn, updateCashIn, listCashOut, getCashOut, createCashOut, updateCashOut } from './core/api/cash-entries.js';
import { registerCashTransferCommand } from './commands/cash-transfer.js';
import { registerPaymentsCommand } from './commands/payments.js';
import { registerBankCommand } from './commands/bank.js';
import { registerReportsCommand } from './commands/reports.js';
import { registerItemsCommand } from './commands/items.js';
import { registerTagsCommand } from './commands/tags.js';
import { registerCapsulesCommand } from './commands/capsules.js';
import { registerCustomerCreditNotesCommand } from './commands/customer-credit-notes.js';
import { registerSupplierCreditNotesCommand } from './commands/supplier-credit-notes.js';
import { registerCurrenciesCommand } from './commands/currencies.js';
import { registerCurrencyRatesCommand } from './commands/currency-rates.js';
import { registerAttachmentsCommand } from './commands/attachments.js';
import { registerTaxProfilesCommand } from './commands/tax-profiles.js';
import { registerBookmarksCommand } from './commands/bookmarks.js';
import { registerOrgUsersCommand } from './commands/org-users.js';
import { registerCashflowCommand } from './commands/cashflow.js';
import { registerRecipeCommand } from './commands/recipe.js';
import { registerMagicCommand } from './commands/magic.js';
import { registerSchedulersCommand } from './commands/schedulers.js';
import { registerExportsCommand } from './commands/exports.js';
import { registerKbCommand } from './commands/kb.js';
import { registerMcpCommand } from './commands/mcp.js';
import { registerBankRulesCommand } from './commands/bank-rules.js';
import { registerFixedAssetsCommand } from './commands/fixed-assets.js';
import { registerSubscriptionsCommand } from './commands/subscriptions.js';
import { registerContactGroupsCommand } from './commands/contact-groups.js';
import { registerInventoryCommand } from './commands/inventory.js';
import { registerSearchCommand } from './commands/search.js';
import { registerCustomFieldsCommand } from './commands/custom-fields.js';
import { registerQuickFixCommand } from './commands/quick-fix.js';
import { registerNanoClassifiersCommand } from './commands/nano-classifiers.js';
import { registerSchemaCommand } from './commands/schema.js';
// Agent command is private — dynamically imported to gracefully handle public mirror (where agent/ is stripped)
import { applyAllExamples } from './commands/help-examples.js';
import { shouldShowPicker, showCommandPicker, attachSubcommandPickers } from './commands/picker.js';
import type { PickerAuthInfo } from './commands/picker.js';
import { getActiveLabel, setProfile, listProfiles } from './core/auth/credentials.js';
import { getOrganization } from './core/api/organization.js';
import { JazClient } from './core/api/client.js';
import type { SkillType } from './types/index.js';
import { SKILL_TYPES } from './types/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const pkg = JSON.parse(
  readFileSync(join(__dirname, '../package.json'), 'utf-8')
);

// ── Update check (detached child process, zero startup cost) ─────
// Checks npm registry at most once per 24h. Auto-suppresses in CI,
// non-TTY (agents), and --json mode. Prints to stderr after output.
const notifier = updateNotifier({ pkg, updateCheckInterval: 24 * 60 * 60 * 1000 });

const program = new Command();

program
  .name('clio')
  .description(`Clio v${pkg.version} — Command Line Interface Orchestrator for Jaz AI`)
  .version(pkg.version)
  .enablePositionalOptions();

// Set --org before any command runs
program.hook('preAction', (_thisCommand, actionCommand) => {
  setActiveOrg(actionCommand.optsWithGlobals().org);
});

program
  .command('init')
  .description('Install Jaz AI skills into the current project')
  .option(
    '-s, --skill <type>',
    `Skill to install (${SKILL_TYPES.join(', ')})`
  )
  .option('-f, --force', 'Overwrite existing files')
  .option(
    '-p, --platform <type>',
    'Target platform: claude, codex, copilot, cursor, antigravity, windsurf, goose, gemini, agents, auto (default: auto-detect)'
  )
  .action(async (options) => {
    if (options.skill && !SKILL_TYPES.includes(options.skill)) {
      console.error(`Invalid skill type: ${options.skill}`);
      console.error(`Valid types: ${SKILL_TYPES.join(', ')}`);
      process.exit(1);
    }
    const validPlatforms = ['claude', 'antigravity', 'codex', 'copilot', 'cursor', 'windsurf', 'goose', 'gemini', 'agents', 'auto'];
    if (options.platform && !validPlatforms.includes(options.platform)) {
      console.error(`Invalid platform: ${options.platform}`);
      console.error(`Valid platforms: ${validPlatforms.join(', ')}`);
      process.exit(1);
    }
    await initCommand({
      skill: options.skill as SkillType | undefined,
      force: options.force,
      platform: options.platform,
    });
  });

program
  .command('versions')
  .description('List available versions')
  .action(versionsCommand);

program
  .command('update')
  .description('Update Jaz AI skills to latest version')
  .option(
    '-s, --skill <type>',
    `Skill to update (${SKILL_TYPES.join(', ')})`
  )
  .action(async (options) => {
    if (options.skill && !SKILL_TYPES.includes(options.skill)) {
      console.error(`Invalid skill type: ${options.skill}`);
      console.error(`Valid types: ${SKILL_TYPES.join(', ')}`);
      process.exit(1);
    }
    await updateCommand({
      skill: options.skill as SkillType | undefined,
    });
  });

registerAuthCommand(program);
registerOrgCommand(program);
registerAccountsCommand(program);
registerContactsCommand(program);
registerInvoicesCommand(program);
registerBillsCommand(program);
registerJournalsCommand(program);
registerCashEntryCommand(program, {
  name: 'cash-in', label: 'Cash-In', txnType: 'JOURNAL_DIRECT_CASH_IN',
  listFn: listCashIn, getFn: getCashIn, createFn: createCashIn, updateFn: updateCashIn,
});
registerCashEntryCommand(program, {
  name: 'cash-out', label: 'Cash-Out', txnType: 'JOURNAL_DIRECT_CASH_OUT',
  listFn: listCashOut, getFn: getCashOut, createFn: createCashOut, updateFn: updateCashOut,
});
registerCashTransferCommand(program);
registerPaymentsCommand(program);
registerBankCommand(program);
registerReportsCommand(program);
registerItemsCommand(program);
registerTagsCommand(program);
registerCapsulesCommand(program);
registerCurrenciesCommand(program);
registerCurrencyRatesCommand(program);
registerCustomerCreditNotesCommand(program);
registerSupplierCreditNotesCommand(program);
registerAttachmentsCommand(program);
registerTaxProfilesCommand(program);
registerBookmarksCommand(program);
registerOrgUsersCommand(program);
registerCashflowCommand(program);
registerCalcCommand(program);
registerRecipeCommand(program);
registerJobsCommand(program);
registerMagicCommand(program);
registerSchedulersCommand(program);
registerExportsCommand(program);
registerKbCommand(program);
registerMcpCommand(program);
registerBankRulesCommand(program);
registerFixedAssetsCommand(program);
registerSubscriptionsCommand(program);
registerContactGroupsCommand(program);
registerInventoryCommand(program);
registerSearchCommand(program);
registerCustomFieldsCommand(program);
registerQuickFixCommand(program);
registerNanoClassifiersCommand(program);
registerSchemaCommand(program);
// Agent + TUI test commands — private, stripped from public mirror
applyAllExamples(program);

// Add --org to every command that has --api-key (DRY: zero changes to command files)
function addOrgOption(cmd: Command): void {
  for (const sub of cmd.commands) {
    const hasApiKey = sub.options.some((o: { long?: string }) => o.long === '--api-key');
    if (hasApiKey) {
      sub.option('--org <label>', 'Use a specific registered org for this command');
    }
    addOrgOption(sub);
  }
}
addOrgOption(program);

// ── Interactive picker (TTY only, bare invocations) ─────────────
// Attach subcommand pickers to group commands without their own action
// (e.g. bare `clio invoices`, `clio calc`, `clio invoices draft`)
if (shouldShowPicker()) {
  attachSubcommandPickers(program);
}

// ── Auth onboarding (TTY only, bare `clio`) ───────────────────────
// When no credentials exist, prompt the user to add an API key inline.
// When credentials exist, build auth info for the picker header.
let pickerAuthInfo: PickerAuthInfo | undefined;

if (shouldShowPicker() && process.argv.length === 2) {
  const activeLabel = getActiveLabel();
  const profiles = listProfiles();
  const profileCount = Object.keys(profiles).length;

  if (profileCount === 0) {
    // No credentials — offer inline auth add
    const { muted, success, danger } = await import('./commands/ui/theme.js');
    const pClack = await import('@clack/prompts');

    process.stderr.write(muted('  No org connected.\n\n'));

    const action = await pClack.select({
      message: 'Get started',
      options: [
        { label: 'Connect an org (add API key)', value: 'add' as const },
        { label: 'Skip — use offline commands only', value: 'skip' as const },
      ],
    });
    if (pClack.isCancel(action)) process.exit(0);

    if (action === 'add') {
      const key = await pClack.text({
        message: 'API key',
        validate: (v) => (!v || !v.startsWith('jk-')) ? 'API key must start with "jk-"' : undefined,
      });
      if (pClack.isCancel(key) || !key) process.exit(0);

      // Validate against API
      process.stderr.write(muted('  Validating...\n'));
      try {
        const client = new JazClient({ mode: 'direct', apiKey: key });
        const org = await getOrganization(client);

        // Slugify org name for label, dedup if collision exists
        const baseLabel = org.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')
          || 'org';
        let label = baseLabel;
        const currentProfiles = listProfiles();
        for (let i = 2; currentProfiles[label]; i++) label = `${baseLabel}-${i}`;

        setProfile(label, {
          apiKey: key,
          orgName: org.name,
          orgId: org.resourceId,
          currency: org.currency,
          country: org.countryCode ?? '',
          addedAt: new Date().toISOString(),
        });

        process.stderr.write(success(`  ✓ Connected: ${label} — ${org.name} (${org.currency})\n\n`));

        pickerAuthInfo = {
          label,
          orgName: org.name,
          currency: org.currency,
          otherOrgCount: 0,
        };
      } catch (err) {
        process.stderr.write(danger('  ✗ API key is invalid or the API is unreachable.\n'));
        if (process.env.CLIO_DEBUG === '1') {
          process.stderr.write(muted(`  debug: ${(err as Error).message ?? err}\n`));
        }
        process.stderr.write('\n');
        // Continue to picker without auth — user can still use offline commands
      }
    }
    // action === 'skip' or undefined → continue to picker without auth
  } else if (activeLabel && profiles[activeLabel]) {
    // Has credentials — build auth info for header
    const entry = profiles[activeLabel];
    pickerAuthInfo = {
      label: activeLabel,
      orgName: entry.orgName,
      currency: entry.currency,
      otherOrgCount: profileCount - 1,
    };
  }
}

// ── Auto-update prompt (TTY only, before picker) ─────────────────
// If update-notifier found a newer version (cached from last run's
// background check), offer to install it right here — one keypress.
if (shouldShowPicker() && notifier.update) {
  const { warning, muted: mutedTheme, success: successTheme, danger: dangerTheme } = await import('./commands/ui/theme.js');
  const pClack = await import('@clack/prompts');
  const { execFileSync } = await import('child_process');

  const { current, latest } = notifier.update;
  process.stderr.write(
    warning(`  Update available: v${current} → v${latest}\n`),
  );

  const confirm = await pClack.confirm({
    message: 'Install now?',
    initialValue: true,
  });

  if (pClack.isCancel(confirm)) {
    process.stderr.write('\n');
  } else if (confirm) {
    process.stderr.write(mutedTheme(`  Updating jaz-clio...\n`));
    try {
      execFileSync('npm', ['update', '-g', 'jaz-clio'], { stdio: 'inherit' });
      process.stderr.write(successTheme(`  Updated to v${latest}\n\n`));
    } catch {
      process.stderr.write(dangerTheme(`  Update failed — run manually: npm update -g jaz-clio\n\n`));
    }
  } else {
    process.stderr.write('\n');
  }
}

// Bare `clio` (no args) → interactive command picker
if (shouldShowPicker() && process.argv.length === 2) {
  const selected = await showCommandPicker(program, pickerAuthInfo);
  if (selected) {
    await program.parseAsync(['node', 'clio', ...selected.split(' ')]);
  }
} else {
  await program.parseAsync();
}

// ── Passive update notification (non-interactive fallback) ───────
// For non-TTY (agents/pipes) or when running specific commands,
// still show the banner to stderr after output.
const hasJson = process.argv.includes('--json');
if (!hasJson && !shouldShowPicker()) {
  notifier.notify({
    isGlobal: true,
    message: [
      'Update available: {currentVersion} \u2192 {latestVersion}',
      'Run {updateCommand} to upgrade',
      'Changelog: https://github.com/teamtinvio/jaz-ai/releases',
    ].join('\n'),
  });
}
