import { accent, danger, success } from './ui/theme.js';
import { readFileSync } from 'node:fs';
import { Command } from 'commander';
import { quickFix, quickFixLineItems, QUICK_FIX_ENTITIES, type QuickFixEntity } from '../core/api/quick-fix.js';
import { apiAction } from './api-action.js';

function parseJson(source: string, label: string): Record<string, unknown> | null {
  try {
    return JSON.parse(source);
  } catch (err) {
    console.error(danger(`Invalid JSON in ${label}: ${(err as Error).message}`));
    process.exitCode = 1;
    return null;
  }
}

export function registerQuickFixCommand(program: Command): void {
  const cmd = program
    .command('quick-fix <entity>')
    .description('Bulk-update transactions or line items in one call')
    .addHelpText('after', `
Entities (grouped by domain):
  ARAP:        invoices, bills, customer-credit-notes, supplier-credit-notes
  Accounting:  journals, cash-entries
  Schedulers:  sale-schedules, purchase-schedules, subscription-schedules, journal-schedules

Examples:
  clio quick-fix invoices --ids id1,id2 --attributes '{"valueDate":"2026-01-15","tag":"Q1"}'
  clio quick-fix bills --ids id1 --date 2026-02-01 --due 2026-03-01 --tag Marketing
  clio quick-fix journals --line-items --ids li1,li2 --attributes '{"organizationAccountResourceId":"<uuid>"}'
  clio quick-fix sale-schedules --line-items --input scheduler-updates.json`)
    .option('--ids <csv>', 'Comma-separated resourceIds (transaction or line item)')
    .option('--line-items', 'Target line items instead of transactions')
    .option('--attributes <json>', 'Attributes JSON object')
    .option('--input <file>', 'Read attributes/body from JSON file')
    .option('--date <date>', 'Shorthand: set valueDate (YYYY-MM-DD)')
    .option('--due <date>', 'Shorthand: set dueDate (YYYY-MM-DD)')
    .option('--tag <name>', 'Shorthand: set tag')
    .option('--contact <id>', 'Shorthand: set contactResourceId')
    .option('--account <id>', 'Shorthand: set organizationAccountResourceId (line items)')
    .option('--tax-profile <id>', 'Shorthand: set taxProfileResourceId (line items)')
    .option('--api-key <key>', 'API key')
    .option('--json', 'JSON output')
    .action((entity: string, opts) => apiAction(async (client) => {
      // ── Validate entity ──────────────────────────────────────
      if (!QUICK_FIX_ENTITIES.includes(entity as QuickFixEntity)) {
        console.error(danger(`Unknown entity: ${entity}`));
        console.error(`Valid entities: ${QUICK_FIX_ENTITIES.join(', ')}`);
        process.exitCode = 1;
        return;
      }

      // ── Build body ───────────────────────────────────────────
      if (opts.input) {
        const raw = parseJson(readFileSync(opts.input, 'utf-8'), '--input');
        if (!raw) return;
        const result = opts.lineItems
          ? await quickFixLineItems(client, entity as QuickFixEntity, raw)
          : await quickFix(client, entity as QuickFixEntity, raw as { resourceIds: string[]; attributes: Record<string, unknown> });
        formatResult(result, opts.json);
        return;
      }

      const ids = opts.ids ? opts.ids.split(',').map((s: string) => s.trim()).filter(Boolean) : [];
      if (ids.length === 0) {
        console.error(danger('--ids is required (comma-separated resourceIds)'));
        process.exitCode = 1;
        return;
      }

      // Merge --attributes JSON with shorthand flags
      let attrs: Record<string, unknown> = {};
      if (opts.attributes) {
        const parsed = parseJson(opts.attributes, '--attributes');
        if (!parsed) return;
        attrs = parsed;
      }
      if (opts.date) attrs.valueDate = opts.date;
      if (opts.due) attrs.dueDate = opts.due;
      if (opts.tag) attrs.tags = [opts.tag];
      if (opts.contact) attrs.contactResourceId = opts.contact;
      if (opts.account) attrs.organizationAccountResourceId = opts.account;
      if (opts.taxProfile) attrs.taxProfileResourceId = opts.taxProfile;

      if (opts.lineItems) {
        const result = await quickFixLineItems(client, entity as QuickFixEntity, {
          lineItemResourceIds: ids,
          attributes: attrs,
        });
        formatResult(result, opts.json);
      } else {
        const result = await quickFix(client, entity as QuickFixEntity, {
          resourceIds: ids,
          attributes: attrs,
        });
        formatResult(result, opts.json);
      }
    })(opts));
}

function formatResult(result: { updated: string[]; failed: Array<{ resourceId: string; error: string; errorCode: string }> }, json?: boolean): void {
  if (json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (result.updated.length > 0) {
    console.log(success(`Updated ${result.updated.length} item(s):`));
    for (const id of result.updated) console.log(`  ${accent(id)}`);
  }

  if (result.failed.length > 0) {
    console.log(danger(`Failed ${result.failed.length} item(s):`));
    for (const f of result.failed) {
      console.log(`  ${accent(f.resourceId)}  ${danger(f.error)} (${f.errorCode})`);
    }
    process.exitCode = 1;
  }

  if (result.updated.length === 0 && result.failed.length === 0) {
    console.log('No items processed.');
  }
}
