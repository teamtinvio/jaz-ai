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
import { registerContextCommand } from './commands/context.js';
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
  .description('Clio — Command Line Interface Orchestrator for Jaz AI')
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
registerContextCommand(program);

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

program.parse();

// ── Print update notification (stderr, after output) ─────────────
// Suppressed when: not a TTY (agents/pipes), CI detected, --json passed.
const hasJson = process.argv.includes('--json');
if (!hasJson) {
  notifier.notify({
    isGlobal: true,
    message: [
      'Update available: {currentVersion} \u2192 {latestVersion}',
      'Run {updateCommand} to upgrade',
      'Changelog: https://github.com/teamtinvio/jaz-ai/releases',
    ].join('\n'),
  });
}
