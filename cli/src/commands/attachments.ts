import chalk from 'chalk';
import { Command } from 'commander';
import { listAttachments, addAttachment, fetchAttachmentTable } from '../core/api/attachments.js';
import { apiAction } from './api-action.js';

type BtType = Parameters<typeof listAttachments>[1];

const BT_TYPES = ['invoices', 'bills', 'journals', 'scheduled_journals', 'customer-credit-notes', 'supplier-credit-notes'] as const;

export function registerAttachmentsCommand(program: Command): void {
  const attachments = program
    .command('attachments')
    .description('Manage transaction attachments');

  // ── clio attachments list ──────────────────────────────────────
  attachments
    .command('list')
    .description('List attachments for a transaction')
    .requiredOption('--type <type>', `Transaction type (${BT_TYPES.join(', ')})`)
    .requiredOption('--id <resourceId>', 'Transaction resourceId')
    .option('--api-key <key>', 'API key')
    .option('--json', 'Output as JSON')
    .action(apiAction(async (client, opts) => {
      const btType = opts.type as BtType;
      if (!BT_TYPES.includes(btType as typeof BT_TYPES[number])) {
        console.error(chalk.red(`Invalid type. Use one of: ${BT_TYPES.join(', ')}`));
        process.exit(1);
      }
      const result = await listAttachments(client, btType, opts.id as string);
      if (opts.json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        const items = result.data ?? [];
        console.log(chalk.bold(`${items.length} attachment(s)`));
        for (const a of items) {
          console.log(`  ${a.resourceId}  ${a.fileName}`);
        }
      }
    }));

  // ── clio attachments add ───────────────────────────────────────
  attachments
    .command('add')
    .description('Add an attachment to a transaction')
    .requiredOption('--type <type>', `Transaction type (${BT_TYPES.join(', ')})`)
    .requiredOption('--id <resourceId>', 'Transaction resourceId')
    .option('--attachment-id <id>', 'Attachment ID')
    .option('--url <url>', 'Source file URL')
    .option('--api-key <key>', 'API key')
    .option('--json', 'Output as JSON')
    .action(apiAction(async (client, opts) => {
      const btType = opts.type as BtType;
      if (!BT_TYPES.includes(btType as typeof BT_TYPES[number])) {
        console.error(chalk.red(`Invalid type. Use one of: ${BT_TYPES.join(', ')}`));
        process.exit(1);
      }
      if (!opts.attachmentId && !opts.url) {
        console.error(chalk.red('Provide --attachment-id or --url'));
        process.exit(1);
      }
      const result = await addAttachment(client, {
        businessTransactionType: btType,
        businessTransactionResourceId: opts.id as string,
        attachmentId: opts.attachmentId as string | undefined,
        sourceUrl: opts.url as string | undefined,
      });
      if (opts.json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        console.log(chalk.green('Attachment added.'));
      }
    }));

  // ── clio attachments table ─────────────────────────────────────
  attachments
    .command('table')
    .description('Fetch extracted table data from an attachment')
    .argument('<attachmentId>', 'Attachment ID')
    .option('--api-key <key>', 'API key')
    .option('--json', 'Output as JSON')
    .action((attachmentId: string, rawOpts: Record<string, unknown>) => {
      return apiAction(async (client) => {
        const result = await fetchAttachmentTable(client, attachmentId);
        console.log(JSON.stringify(result, null, 2));
      })(rawOpts as { apiKey?: string; json?: boolean; org?: string });
    });
}
