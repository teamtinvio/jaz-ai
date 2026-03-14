import chalk from 'chalk';
import { readFileSync } from 'node:fs';
import { basename, extname, resolve } from 'node:path';
import { Command } from 'commander';
import { listAttachments, addAttachment, deleteAttachment, fetchAttachmentTable } from '../core/api/attachments.js';
import { apiAction } from './api-action.js';
import { outputList, type OutputOpts } from './output.js';
import type { TableColumn } from './table-formatter.js';
import { formatId } from './format-helpers.js';

const ATTACHMENTS_COLUMNS: TableColumn[] = [
  { key: 'resourceId', header: 'ID', format: formatId },
  { key: 'fileName', header: 'File Name' },
];

type BtType = Parameters<typeof listAttachments>[1];

const BT_TYPES = ['invoices', 'bills', 'journals', 'scheduled_journals', 'customer-credit-notes', 'supplier-credit-notes'] as const;

const ATTACHMENT_MIME_MAP: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.csv': 'text/csv',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};

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
    .option('--format <type>', 'Output format: table, json, csv, yaml')
    .option('--json', 'Output as JSON')
    .action(apiAction(async (client, opts) => {
      const btType = opts.type as BtType;
      if (!BT_TYPES.includes(btType as typeof BT_TYPES[number])) {
        console.error(chalk.red(`Invalid type. Use one of: ${BT_TYPES.join(', ')}`));
        process.exit(1);
      }
      const result = await listAttachments(client, btType, opts.id as string);
      const items = result.data ?? [];
      const wrapped = {
        data: items,
        totalElements: (result as any).totalElements ?? items.length,  // eslint-disable-line @typescript-eslint/no-explicit-any
        totalPages: (result as any).totalPages ?? 1,  // eslint-disable-line @typescript-eslint/no-explicit-any
        truncated: (result as any).truncated ?? false,  // eslint-disable-line @typescript-eslint/no-explicit-any
      };
      outputList(wrapped as any, ATTACHMENTS_COLUMNS, opts as OutputOpts, 'Attachments');  // eslint-disable-line @typescript-eslint/no-explicit-any
    }));

  // ── clio attachments add ───────────────────────────────────────
  attachments
    .command('add')
    .description('Add an attachment to a transaction (file upload or URL download)')
    .requiredOption('--type <type>', `Transaction type (${BT_TYPES.join(', ')})`)
    .requiredOption('--id <resourceId>', 'Transaction resourceId')
    .option('--file <path>', 'Local file path (PDF, PNG, JPG, etc.)')
    .option('--url <url>', 'Download file from URL and attach')
    .option('--attachment-id <id>', 'Link existing attachment by ID')
    .option('--api-key <key>', 'API key')
    .option('--json', 'Output as JSON')
    .action(apiAction(async (client, opts) => {
      const btType = opts.type as BtType;
      if (!BT_TYPES.includes(btType as typeof BT_TYPES[number])) {
        console.error(chalk.red(`Invalid type. Use one of: ${BT_TYPES.join(', ')}`));
        process.exit(1);
      }
      if (!opts.attachmentId && !opts.url && !opts.file) {
        console.error(chalk.red('Provide --file, --url, or --attachment-id'));
        process.exit(1);
      }

      let file: Blob | undefined;
      let fileName: string | undefined;

      if (opts.file) {
        // Local file upload
        const filePath = resolve(opts.file as string);
        const ext = extname(filePath).toLowerCase();
        const mime = ATTACHMENT_MIME_MAP[ext] ?? 'application/octet-stream';
        const buffer = readFileSync(filePath);
        file = new Blob([buffer], { type: mime });
        fileName = basename(filePath);
      } else if (opts.url) {
        // Download from URL, then upload as file
        const res = await fetch(opts.url as string);
        if (!res.ok) {
          console.error(chalk.red(`Failed to download: ${res.status} ${res.statusText}`));
          process.exit(1);
        }
        const buffer = await res.arrayBuffer();
        const contentType = res.headers.get('content-type') ?? 'application/octet-stream';
        file = new Blob([buffer], { type: contentType });
        // Extract filename from URL path
        const urlPath = new URL(opts.url as string).pathname;
        fileName = basename(urlPath) || 'attachment';
      }

      const result = await addAttachment(client, {
        businessTransactionType: btType,
        businessTransactionResourceId: opts.id as string,
        file,
        fileName,
        attachmentId: opts.attachmentId as string | undefined,
      });
      if (opts.json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        console.log(chalk.green('Attachment added.'));
      }
    }));

  // ── clio attachments delete ────────────────────────────────────
  attachments
    .command('delete')
    .description('Delete an attachment from a transaction')
    .requiredOption('--type <type>', `Transaction type (${BT_TYPES.join(', ')})`)
    .requiredOption('--id <resourceId>', 'Transaction resourceId')
    .argument('<attachmentResourceId>', 'Attachment resourceId to delete')
    .option('--api-key <key>', 'API key')
    .option('--json', 'Output as JSON')
    .action((attachmentResourceId: string, rawOpts: Record<string, unknown>) => {
      const btType = rawOpts.type as BtType;
      if (!BT_TYPES.includes(btType as typeof BT_TYPES[number])) {
        console.error(chalk.red(`Invalid type. Use one of: ${BT_TYPES.join(', ')}`));
        process.exit(1);
      }
      return apiAction(async (client) => {
        const result = await deleteAttachment(client, btType, rawOpts.id as string, attachmentResourceId);
        if (rawOpts.json) {
          console.log(JSON.stringify(result, null, 2));
        } else {
          console.log(chalk.green('Attachment deleted.'));
        }
      })(rawOpts as { apiKey?: string; json?: boolean; org?: string });
    });

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
