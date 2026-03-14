import chalk from 'chalk';
import { Command } from 'commander';
import { formatStatus, formatId, formatReference, formatCurrency } from './format-helpers.js';
import {
  listInvoices,
  getInvoice,
  searchInvoices,
  createInvoice,
  updateInvoice,
  deleteInvoice,
  createInvoicePayment,
  applyCreditsToInvoice,
  downloadInvoicePdf,
  finalizeInvoice,
  listInvoicePayments,
  listInvoiceCredits,
  reverseInvoiceCredit,
} from '../core/api/invoices.js';
import { listAttachments } from '../core/api/attachments.js';
import { apiAction } from './api-action.js';
import { resolveContactFlag, resolveAccountFlag, resolveTaxProfileFlag } from './resolve.js';
import { parsePositiveInt, parseNonNegativeInt, parseMoney, parseRate, parseLineItems, parseCustomFields, readBodyInput, requireFields } from './parsers.js';
import { paginatedFetch } from './pagination.js';
import { buildInvoiceBillFilter } from '../core/registry/pagination.js';
import { outputList, outputRecord, type OutputOpts } from './output.js';
import type { TableColumn } from './table-formatter.js';
import {
  INVOICE_REQUIRED_FIELDS,
  buildDraftReport,
  formatDraftTable,
  addDraftFinalizeOptions,
  mergeDraftFlags,
  validateDraft,
  buildValidation,
  normalizeDate,
  sanitizeLineItem,
  type DraftReport,
} from './draft-helpers.js';

const INVOICE_COLUMNS: TableColumn[] = [
  { key: 'resourceId', header: 'ID', format: formatId },
  { key: 'reference', header: 'Reference', format: formatReference },
  { key: 'status', header: 'Status', format: (v) => formatStatus(String(v)) },
  { key: 'totalAmount', header: 'Amount', align: 'right', format: formatCurrency },
  { key: 'valueDate', header: 'Date', format: (v) => normalizeDate(String(v)) ?? '-' },
];

export function registerInvoicesCommand(program: Command): void {
  const invoices = program
    .command('invoices')
    .description('Manage sales invoices');

  // ── clio invoices list ──────────────────────────────────────────
  invoices
    .command('list')
    .description('List invoices')
    .option('--limit <n>', 'Max results (default 100)', parsePositiveInt)
    .option('--offset <n>', 'Page number offset (0-indexed)', parseNonNegativeInt)
    .option('--all', 'Fetch all pages')
    .option('--max-rows <n>', 'Max rows for --all (default 10000)', parsePositiveInt)
    .option('--format <type>', 'Output format: table, json, csv, yaml')
    .option('--api-key <key>', 'API key (overrides stored/env)')
    .option('--json', 'Output as JSON')
    .action(apiAction(async (client, opts) => {
      const result = await paginatedFetch(
        opts,
        (p) => listInvoices(client, p),
        { label: 'Fetching invoices' },
      );

      outputList(result as any, INVOICE_COLUMNS, opts as OutputOpts, 'Invoices');  // eslint-disable-line @typescript-eslint/no-explicit-any
    }));

  // ── clio invoices get ───────────────────────────────────────────
  invoices
    .command('get <resourceId>')
    .description('Get an invoice by resourceId')
    .option('--api-key <key>', 'API key (overrides stored/env)')
    .option('--json', 'Output as JSON')
    .action((resourceId: string, opts) => apiAction(async (client) => {
      const res = await getInvoice(client, resourceId);
      const inv = res.data;

      if (opts.json) {
        console.log(JSON.stringify(inv, null, 2));
      } else {
        console.log(chalk.bold('Reference:'), inv.reference || '(none)');
        console.log(chalk.bold('ID:'), inv.resourceId);
        console.log(chalk.bold('Status:'), inv.status);
        console.log(chalk.bold('Date:'), normalizeDate(inv.valueDate));
        console.log(chalk.bold('Due:'), normalizeDate(inv.dueDate));
        if (inv.contactName) console.log(chalk.bold('Contact:'), inv.contactName);
        if (inv.totalAmount !== undefined) console.log(chalk.bold('Total:'), inv.totalAmount.toFixed(2));
        if (inv.amountDue !== undefined) console.log(chalk.bold('Amount Due:'), inv.amountDue.toFixed(2));
        if (inv.lineItems?.length) {
          console.log(chalk.bold('Line Items:'));
          for (const li of inv.lineItems) {
            const qty = li.quantity ?? 1;
            const price = li.unitPrice ?? 0;
            console.log(`  - ${li.name}  qty: ${qty}  price: ${price.toFixed(2)}`);
          }
        }
        if (inv.notes) console.log(chalk.bold('Notes:'), inv.notes);
      }
    })(opts));

  // ── clio invoices search ────────────────────────────────────────
  invoices
    .command('search')
    .description('Search invoices with filters')
    .option('--ref <reference>', 'Filter by reference (contains)')
    .option('--status <status>', 'Filter by status (DRAFT, UNPAID, PARTIALLY_PAID, PAID, OVERDUE, VOID)')
    .option('--contact <resourceId>', 'Filter by contact name or resourceId')
    .option('--tag <name>', 'Filter by tag')
    .option('--min-amount <n>', 'Minimum total amount', parseMoney)
    .option('--max-amount <n>', 'Maximum total amount', parseMoney)
    .option('--from <YYYY-MM-DD>', 'Filter from date (inclusive)')
    .option('--to <YYYY-MM-DD>', 'Filter to date (inclusive)')
    .option('--due-from <YYYY-MM-DD>', 'Filter by due date from (inclusive)')
    .option('--due-to <YYYY-MM-DD>', 'Filter by due date to (inclusive)')
    .option('--sort <field>', 'Sort field (default: valueDate)')
    .option('--order <direction>', 'Sort order: ASC or DESC (default: DESC)')
    .option('--limit <n>', 'Max results (default 20)', parsePositiveInt)
    .option('--offset <n>', 'Page number offset (0-indexed)', parseNonNegativeInt)
    .option('--all', 'Fetch all pages')
    .option('--max-rows <n>', 'Max rows for --all (default 10000)', parsePositiveInt)
    .option('--format <type>', 'Output format: table, json, csv, yaml')
    .option('--api-key <key>', 'API key (overrides stored/env)')
    .option('--json', 'Output as JSON')
    .action(apiAction(async (client, opts) => {
      // Resolve contact by name if provided
      if (opts.contact) {
        const resolved = await resolveContactFlag(client, opts.contact, { silent: opts.json });
        opts.contact = resolved.resourceId;
      }

      const searchFilter = buildInvoiceBillFilter({
        reference: opts.ref, status: opts.status,
        contactResourceId: opts.contact, tag: opts.tag,
        minAmount: opts.minAmount, maxAmount: opts.maxAmount,
        startDate: opts.from, endDate: opts.to,
        dueDateFrom: opts.dueFrom, dueDateTo: opts.dueTo,
      });
      const sort = { sortBy: [opts.sort ?? 'valueDate'] as string[], order: (opts.order ?? 'DESC') as 'ASC' | 'DESC' };

      const result = await paginatedFetch(
        opts,
        ({ limit, offset }) => searchInvoices(client, { filter: searchFilter, limit, offset, sort }),
        { label: 'Searching invoices', defaultLimit: 20 },
      );

      outputList(result as any, INVOICE_COLUMNS, opts as OutputOpts, 'Invoices');  // eslint-disable-line @typescript-eslint/no-explicit-any
    }));

  // ── clio invoices create ────────────────────────────────────────
  invoices
    .command('create')
    .description('Create an invoice (saves as draft by default)')
    .option('--contact <resourceId>', 'Contact name or resourceId')
    .option('--lines <json>', 'Line items as JSON array', parseLineItems)
    .option('--date <YYYY-MM-DD>', 'Invoice date (valueDate)')
    .option('--due <YYYY-MM-DD>', 'Due date')
    .option('--ref <reference>', 'Invoice reference/number')
    .option('--notes <text>', 'Notes')
    .option('--tag <tag>', 'Tag')
    .option('--custom-fields <json>', 'Custom field values as JSON array: [{"customFieldName":"PO Number","actualValue":"PO-123"}]')
    .option('--currency <code>', 'Foreign currency code (ISO 4217)')
    .option('--exchange-rate <rate>', 'Exchange rate for foreign currency', parseRate)
    .option('--tax', 'Enable tax/VAT')
    .option('--tax-inclusive', 'Prices are tax-inclusive (requires --tax)')
    .option('--finalize', 'Finalize instead of saving as draft')
    .option('--input <file>', 'Read full request body from JSON file (or pipe via stdin)')
    .option('--api-key <key>', 'API key (overrides stored/env)')
    .option('--json', 'Output as JSON')
    .action(apiAction(async (client, opts) => {
      const body = readBodyInput(opts);

      let res;
      if (body) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- user-provided JSON, API validates
        res = await createInvoice(client, {
          ...body,
          saveAsDraft: body.saveAsDraft ?? !opts.finalize,
        } as any);
      } else {
        requireFields(opts as Record<string, unknown>, [
          { flag: '--contact', key: 'contact' },
          { flag: '--lines', key: 'lines' },
          { flag: '--date', key: 'date' },
          { flag: '--due', key: 'due' },
        ]);

        // Resolve contact by name
        const contactResolved = await resolveContactFlag(client, opts.contact, { silent: opts.json });
        opts.contact = contactResolved.resourceId;

        const currency = opts.currency
          ? {
              sourceCurrency: opts.currency,
              ...(opts.exchangeRate !== undefined && { exchangeRate: opts.exchangeRate }),
            }
          : undefined;

        const customFields = opts.customFields ? parseCustomFields(opts.customFields) : undefined;

        res = await createInvoice(client, {
          contactResourceId: opts.contact,
          lineItems: opts.lines,
          valueDate: opts.date,
          dueDate: opts.due,
          reference: opts.ref,
          notes: opts.notes,
          tag: opts.tag,
          customFields,
          currency,
          isTaxVatApplicable: opts.tax ?? undefined,
          taxInclusion: opts.tax && opts.taxInclusive ? 'INCLUSIVE' : opts.tax ? 'EXCLUSIVE' : undefined,
          saveAsDraft: !opts.finalize,
        });
      }

      if (opts.json) {
        console.log(JSON.stringify(res.data, null, 2));
      } else {
        const status = opts.finalize ? 'finalized' : 'draft';
        console.log(chalk.green(`Invoice created (${status}): ${res.data.reference || res.data.resourceId}`));
        console.log(chalk.bold('ID:'), res.data.resourceId);
      }
    }));

  // ── clio invoices update ────────────────────────────────────────
  invoices
    .command('update <resourceId>')
    .description('Update a draft invoice')
    .option('--ref <reference>', 'New reference')
    .option('--date <YYYY-MM-DD>', 'New invoice date')
    .option('--due <YYYY-MM-DD>', 'New due date')
    .option('--lines <json>', 'New line items as JSON array', parseLineItems)
    .option('--notes <text>', 'New notes')
    .option('--tag <tag>', 'New tag')
    .option('--custom-fields <json>', 'Custom field values as JSON array: [{"customFieldName":"PO Number","actualValue":"PO-123"}]')
    .option('--input <file>', 'Read full update body from JSON file (or pipe via stdin)')
    .option('--api-key <key>', 'API key (overrides stored/env)')
    .option('--json', 'Output as JSON')
    .action((resourceId: string, opts) => apiAction(async (client) => {
      const body = readBodyInput(opts);
      let data: Record<string, unknown>;

      if (body) {
        data = body;
      } else {
        data = {};
        if (opts.ref !== undefined) data.reference = opts.ref;
        if (opts.date !== undefined) data.valueDate = opts.date;
        if (opts.due !== undefined) data.dueDate = opts.due;
        if (opts.lines !== undefined) data.lineItems = opts.lines;
        if (opts.notes !== undefined) data.notes = opts.notes;
        if (opts.tag !== undefined) data.tag = opts.tag;
        if (opts.customFields !== undefined) data.customFields = parseCustomFields(opts.customFields);
      }

      const res = await updateInvoice(client, resourceId, data);

      if (opts.json) {
        console.log(JSON.stringify(res.data, null, 2));
      } else {
        console.log(chalk.green(`Invoice updated: ${res.data.reference || res.data.resourceId}`));
      }
    })(opts));

  // ── clio invoices delete ────────────────────────────────────────
  invoices
    .command('delete <resourceId>')
    .description('Delete/void an invoice')
    .option('--api-key <key>', 'API key (overrides stored/env)')
    .option('--json', 'Output as JSON')
    .action((resourceId: string, opts) => apiAction(async (client) => {
      await deleteInvoice(client, resourceId);

      if (opts.json) {
        console.log(JSON.stringify({ deleted: true, resourceId }));
      } else {
        console.log(chalk.green(`Invoice ${resourceId} deleted.`));
      }
    })(opts));

  // ── clio invoices pay ───────────────────────────────────────────
  invoices
    .command('pay <resourceId>')
    .description('Record a payment against an invoice (finalizes by default)')
    .option('--amount <n>', 'Payment amount (bank currency)', parseMoney)
    .option('--account <resourceId>', 'Bank/cash account name or resourceId')
    .option('--date <YYYY-MM-DD>', 'Payment date (valueDate)')
    .option('--transaction-amount <n>', 'Transaction amount (invoice currency, if different from bank)', parseMoney)
    .option('--method <method>', 'Payment method (BANK_TRANSFER, CASH, CHEQUE, etc.)', 'BANK_TRANSFER')
    .option('--ref <reference>', 'Payment reference')
    .option('--draft', 'Save as draft instead of finalizing')
    .option('--custom-fields <json>', 'Custom field values as JSON array')
    .option('--input <file>', 'Read full payment body from JSON file (or pipe via stdin)')
    .option('--api-key <key>', 'API key (overrides stored/env)')
    .option('--json', 'Output as JSON')
    .action((resourceId: string, opts) => apiAction(async (client) => {
      const body = readBodyInput(opts);
      const customFields = opts.customFields ? parseCustomFields(opts.customFields) : undefined;

      let res;
      if (body) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- user-provided JSON, API validates
        res = await createInvoicePayment(client, resourceId, {
          ...body,
          saveAsDraft: body.saveAsDraft ?? (opts.draft ?? false),
          customFields: body.customFields ?? customFields,
        } as any);
      } else {
        requireFields(opts as Record<string, unknown>, [
          { flag: '--amount', key: 'amount' },
          { flag: '--account', key: 'account' },
          { flag: '--date', key: 'date' },
        ]);

        // Resolve account by name — bank filter for cash methods, any for others
        const cashMethods = new Set(['BANK_TRANSFER', 'CASH', 'CHEQUE']);
        const acctFilter = cashMethods.has(opts.method) ? 'bank' as const : 'any' as const;
        const acctResolved = await resolveAccountFlag(client, opts.account, { filter: acctFilter, silent: opts.json });
        opts.account = acctResolved.resourceId;

        res = await createInvoicePayment(client, resourceId, {
          paymentAmount: opts.amount,
          transactionAmount: opts.transactionAmount ?? opts.amount,
          accountResourceId: opts.account,
          valueDate: opts.date,
          dueDate: opts.date,
          paymentMethod: opts.method,
          reference: opts.ref ?? '',
          saveAsDraft: opts.draft ?? false,
          customFields,
        });
      }

      if (opts.json) {
        console.log(JSON.stringify(res.data, null, 2));
      } else {
        console.log(chalk.green(`Payment recorded for invoice ${resourceId}`));
      }
    })(opts));

  // ── clio invoices apply-credits ─────────────────────────────────
  invoices
    .command('apply-credits <resourceId>')
    .description('Apply customer credit note(s) to an invoice')
    .option('--credit-note <id>', 'Credit note resourceId')
    .option('--amount <n>', 'Amount to apply', parseMoney)
    .option('--credits <json>', 'JSON array: [{creditNoteResourceId, amountApplied}]')
    .option('--input <file>', 'Read credits from JSON file (or pipe via stdin)')
    .option('--api-key <key>', 'API key (overrides stored/env)')
    .option('--json', 'Output as JSON')
    .action((resourceId: string, opts) => apiAction(async (client) => {
      const body = readBodyInput(opts);
      let credits;

      if (body) {
        credits = Array.isArray(body) ? body : body.credits;
      } else if (opts.credits) {
        credits = JSON.parse(opts.credits);
      } else {
        requireFields(opts as Record<string, unknown>, [
          { flag: '--credit-note', key: 'creditNote' },
          { flag: '--amount', key: 'amount' },
        ]);
        credits = [{ creditNoteResourceId: opts.creditNote, amountApplied: opts.amount }];
      }

      const res = await applyCreditsToInvoice(client, resourceId, credits);

      if (opts.json) {
        console.log(JSON.stringify(res.data, null, 2));
      } else {
        console.log(chalk.green(`Applied ${credits.length} credit(s) to invoice ${resourceId}`));
      }
    })(opts));

  // ── clio invoices download ──────────────────────────────────────
  invoices
    .command('download <resourceId>')
    .description('Get PDF download URL for an invoice')
    .option('--api-key <key>', 'API key (overrides stored/env)')
    .option('--json', 'Output as JSON')
    .action((resourceId: string, opts) => apiAction(async (client) => {
      const res = await downloadInvoicePdf(client, resourceId);

      if (opts.json) {
        console.log(JSON.stringify(res.data, null, 2));
      } else {
        console.log(chalk.bold('PDF URL:'), res.data.fileUrl);
      }
    })(opts));

  // ── clio invoices draft ───────────────────────────────────────
  const draft = invoices
    .command('draft')
    .description('Manage draft invoices (inspect, finalize, attachments)');

  // ── clio invoices draft list ──────────────────────────────────
  draft
    .command('list')
    .description('List all draft invoices with per-field validation status')
    .option('--ids <ids>', 'Comma-separated invoice IDs to inspect (instead of all drafts)')
    .option('--max-rows <n>', 'Max drafts to fetch (default 10000)', parsePositiveInt)
    .option('--api-key <key>', 'API key (overrides stored/env)')
    .option('--json', 'Output as JSON')
    .action(apiAction(async (client, opts) => {
      let items: any[];  // eslint-disable-line @typescript-eslint/no-explicit-any

      if (opts.ids) {
        const ids = opts.ids.split(',').map((s: string) => s.trim()).filter(Boolean);
        items = await Promise.all(ids.map(async (id: string) => {
          const res = await getInvoice(client, id);
          return res.data;
        }));
        items = items.filter((inv) => inv.status === 'DRAFT');
      } else {
        const result = await paginatedFetch(
          { all: true, json: true, maxRows: opts.maxRows },
          ({ limit, offset }) => searchInvoices(client, {
            filter: { status: { eq: 'DRAFT' } },
            limit,
            offset,
            sort: { sortBy: ['valueDate'], order: 'DESC' },
          }),
          { label: 'Fetching draft invoices' },
        );
        items = result.data;
      }

      const BATCH_SIZE = 5;
      const reports: DraftReport[] = [];
      for (let i = 0; i < items.length; i += BATCH_SIZE) {
        const batch = items.slice(i, i + BATCH_SIZE);
        const batchReports = await Promise.all(batch.map(async (inv) => {
          let attachmentCount = 0;
          try {
            const attRes = await listAttachments(client, 'invoices', inv.resourceId);
            attachmentCount = attRes.data.length;
          } catch { /* Attachment listing may fail — don't block the report */ }
          return buildDraftReport(inv, INVOICE_REQUIRED_FIELDS, attachmentCount);
        }));
        reports.push(...batchReports);
      }

      if (opts.json) {
        const readyCount = reports.filter((r) => r.ready).length;
        console.log(JSON.stringify({
          totalDrafts: reports.length,
          readyCount,
          needsAttentionCount: reports.length - readyCount,
          drafts: reports,
        }, null, 2));
      } else {
        formatDraftTable('Invoices', reports);
      }
    }));

  // ── clio invoices draft finalize ──────────────────────────────
  addDraftFinalizeOptions(
    draft
      .command('finalize <resourceId>')
      .description('Fill missing fields and convert a draft invoice to APPROVED'),
  ).action((resourceId: string, opts) => apiAction(async (client) => {
    const body = readBodyInput(opts);

    // 1. GET CURRENT DRAFT
    const res = await getInvoice(client, resourceId);
    const inv = res.data;

    if (inv.status !== 'DRAFT') {
      const msg = `Invoice ${resourceId} is ${inv.status}, not DRAFT. Only DRAFT invoices can be finalized.`;
      if (opts.json) {
        console.log(JSON.stringify({ finalized: false, error: msg }));
      } else {
        console.error(chalk.red(msg));
      }
      process.exit(1);
    }

    // 2. RESOLVE NAMES → UUIDs
    const resolvedOpts: Record<string, any> = { ...opts };  // eslint-disable-line @typescript-eslint/no-explicit-any
    if (opts.contact) {
      const resolved = await resolveContactFlag(client, opts.contact, { silent: opts.json });
      resolvedOpts.contact = resolved.resourceId;
    }
    if (opts.account) {
      const resolved = await resolveAccountFlag(client, opts.account, { filter: 'line-item', silent: opts.json });
      resolvedOpts.account = resolved.resourceId;
    }
    if (opts.taxProfile) {
      const resolved = await resolveTaxProfileFlag(client, opts.taxProfile, { silent: opts.json });
      resolvedOpts.taxProfile = resolved.resourceId;
    }

    // 3. MERGE FLAGS WITH EXISTING VALUES
    let updateData: Record<string, unknown>;
    if (body) {
      updateData = body;
    } else {
      updateData = mergeDraftFlags(inv, resolvedOpts);
    }
    const userChangedFields = Object.keys(updateData);

    // 4. VALIDATE AFTER MERGE
    const merged = { ...inv, ...updateData };
    if (updateData.lineItems) {
      merged.lineItems = updateData.lineItems as typeof inv.lineItems;
    }
    const { missingFields, missingCount, ready } = validateDraft(merged, INVOICE_REQUIRED_FIELDS);

    // 4b. BUILD FULL PUT-COMPATIBLE BODY
    if (!body) {
      const fullBody: Record<string, unknown> = {
        reference: merged.reference || undefined,
        contactResourceId: merged.contactResourceId,
        valueDate: normalizeDate(updateData.valueDate as string) || normalizeDate(inv.valueDate),
        dueDate: normalizeDate(updateData.dueDate as string) || normalizeDate(inv.dueDate),
      };
      const rawItems = (updateData.lineItems ?? inv.lineItems ?? []) as any[];  // eslint-disable-line @typescript-eslint/no-explicit-any
      fullBody.lineItems = rawItems.map((li: any) => sanitizeLineItem(li));  // eslint-disable-line @typescript-eslint/no-explicit-any
      if (updateData.isTaxVatApplicable != null || inv.isTaxVATApplicable != null) {
        fullBody.isTaxVATApplicable = updateData.isTaxVatApplicable ?? inv.isTaxVATApplicable;
      }
      if (updateData.taxInclusion != null || inv.taxInclusion != null) {
        fullBody.taxInclusion = updateData.taxInclusion ?? inv.taxInclusion;
      }
      if (updateData.notes) fullBody.notes = updateData.notes;
      if (updateData.tag) fullBody.tag = updateData.tag;
      updateData = fullBody;
    }

    // 5. DRY RUN
    if (opts.dryRun) {
      const validation = buildValidation(merged, INVOICE_REQUIRED_FIELDS);
      if (opts.json) {
        console.log(JSON.stringify({ finalized: false, dryRun: true, resourceId, reference: merged.reference || null, ready, missingCount, missingFields, validation }, null, 2));
      } else {
        if (ready) {
          console.log(chalk.green(`✓ ${merged.reference || resourceId} is ready to finalize.`));
        } else {
          console.error(chalk.yellow(`✗ ${merged.reference || resourceId} — ${missingCount} issue${missingCount > 1 ? 's' : ''} remaining:`));
          for (const f of missingFields) {
            const spec = INVOICE_REQUIRED_FIELDS.find((s) => f === s.field || f.endsWith(`.${s.field}`));
            console.log(`  ${f}: ${chalk.red('MISSING')} — ${spec?.hint ?? ''}`);
          }
        }
      }
      return;
    }

    // 6. VALIDATION FAILURE
    if (!ready) {
      const validation = buildValidation(merged, INVOICE_REQUIRED_FIELDS);
      if (opts.json) {
        console.log(JSON.stringify({ finalized: false, resourceId, reference: merged.reference || null, ready: false, missingCount, missingFields, validation }, null, 2));
      } else {
        console.error(chalk.red(`\n✗ Cannot finalize ${merged.reference || resourceId} — ${missingCount} issue${missingCount > 1 ? 's' : ''} remaining:\n`));
        for (const f of missingFields) {
          const spec = INVOICE_REQUIRED_FIELDS.find((s) => f === s.field || f.endsWith(`.${s.field}`));
          console.error(`  ${f}: ${chalk.red('MISSING')} — ${spec?.hint ?? ''}`);
        }
        console.error(chalk.dim(`\n  Fix the issues and retry:\n    clio invoices draft finalize ${resourceId} ...\n`));
      }
      process.exit(1);
    }

    // 7. FINALIZE
    await finalizeInvoice(client, resourceId, updateData);

    // 8. VERIFY
    const verifyRes = await getInvoice(client, resourceId);
    const updated = verifyRes.data;
    const fieldsUpdated = userChangedFields.filter((k) => k !== 'saveAsDraft' && k !== 'resourceId');

    if (opts.json) {
      console.log(JSON.stringify({ finalized: true, resourceId: updated.resourceId, reference: updated.reference || null, status: updated.status, fieldsUpdated }, null, 2));
    } else {
      console.log(chalk.green(`\n✓ Invoice finalized: ${updated.reference || updated.resourceId}`));
      console.log(chalk.bold('  Status:'), updated.status);
      if (fieldsUpdated.length > 0) {
        console.log(chalk.bold('  Updated:'), fieldsUpdated.join(', '));
      }
    }
  })(opts));

  // ── clio invoices draft attachments ───────────────────────────
  draft
    .command('attachments <resourceId>')
    .description('List attachments for an invoice (URLs for agent inspection)')
    .option('--api-key <key>', 'API key (overrides stored/env)')
    .option('--json', 'Output as JSON')
    .action((resourceId: string, opts) => apiAction(async (client) => {
      const invRes = await getInvoice(client, resourceId);
      const inv = invRes.data;

      const attRes = await listAttachments(client, 'invoices', resourceId);
      const attachments = attRes.data;

      if (opts.json) {
        console.log(JSON.stringify({ invoiceResourceId: resourceId, invoiceReference: inv.reference || null, attachments }, null, 2));
      } else {
        if (attachments.length === 0) {
          console.log(`No attachments for invoice ${inv.reference || resourceId}.`);
          return;
        }
        console.log(chalk.bold(`Attachments for ${inv.reference || resourceId}:\n`));
        for (const att of attachments) {
          console.log(`  ${chalk.cyan(att.resourceId)}  ${att.fileName || '(unnamed)'}`);
          if (att.fileUrl) console.log(`    ${chalk.dim(att.fileUrl)}`);
        }
      }
    })(opts));

  // ── clio invoices list-payments ─────────────────────────────────
  invoices
    .command('list-payments <resourceId>')
    .description('List payments recorded against an invoice')
    .option('--api-key <key>', 'API key (overrides stored/env)')
    .option('--json', 'Output as JSON')
    .action((resourceId: string, opts) => apiAction(async (client) => {
      const res = await listInvoicePayments(client, resourceId);
      if (opts.json) {
        console.log(JSON.stringify(res.data, null, 2));
      } else {
        const payments = res.data;
        if (payments.length === 0) {
          console.log('No payments recorded for this invoice.');
          return;
        }
        console.log(chalk.bold(`Payments for invoice ${resourceId}:\n`));
        for (const p of payments as any[]) {  // eslint-disable-line @typescript-eslint/no-explicit-any
          console.log(`  ${chalk.cyan(p.resourceId)}  ${p.paymentAmount ?? p.amount ?? ''} on ${p.valueDate ?? ''}`);
        }
      }
    })(opts));

  // ── clio invoices list-credits ──────────────────────────────────
  invoices
    .command('list-credits <resourceId>')
    .description('List credit notes applied to an invoice')
    .option('--api-key <key>', 'API key (overrides stored/env)')
    .option('--json', 'Output as JSON')
    .action((resourceId: string, opts) => apiAction(async (client) => {
      const res = await listInvoiceCredits(client, resourceId);
      if (opts.json) {
        console.log(JSON.stringify(res.data, null, 2));
      } else {
        const credits = res.data;
        if (credits.length === 0) {
          console.log('No credits applied to this invoice.');
          return;
        }
        console.log(chalk.bold(`Credits for invoice ${resourceId}:\n`));
        for (const c of credits as any[]) {  // eslint-disable-line @typescript-eslint/no-explicit-any
          console.log(`  ${chalk.cyan(c.resourceId)}  ${c.amount ?? ''}`);
        }
      }
    })(opts));

  // ── clio invoices reverse-credit ────────────────────────────────
  invoices
    .command('reverse-credit <resourceId> <creditResourceId>')
    .description('Reverse (unapply) a credit note from an invoice')
    .option('--api-key <key>', 'API key (overrides stored/env)')
    .option('--json', 'Output as JSON')
    .action((resourceId: string, creditResourceId: string, opts) => apiAction(async (client) => {
      await reverseInvoiceCredit(client, resourceId, creditResourceId);
      if (opts.json) {
        console.log(JSON.stringify({ reversed: true, resourceId, creditResourceId }));
      } else {
        console.log(chalk.green(`Credit ${creditResourceId} reversed from invoice ${resourceId}.`));
      }
    })(opts));
}
