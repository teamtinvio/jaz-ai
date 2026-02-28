import chalk from 'chalk';
import { Command } from 'commander';
import {
  listCustomerCreditNotes,
  getCustomerCreditNote,
  searchCustomerCreditNotes,
  createCustomerCreditNote,
  updateCustomerCreditNote,
  deleteCustomerCreditNote,
  createCustomerCreditNoteRefund,
  listCustomerCreditNoteRefunds,
  finalizeCustomerCreditNote,
} from '../core/api/customer-cn.js';
import { listAttachments } from '../core/api/attachments.js';
import { apiAction } from './api-action.js';
import { resolveContactFlag, resolveAccountFlag, resolveTaxProfileFlag } from './resolve.js';
import { parsePositiveInt, parseNonNegativeInt, parseMoney, parseRate, parseLineItems, readBodyInput, requireFields } from './parsers.js';
import { paginatedFetch, paginatedJson, displaySlice } from './pagination.js';
import {
  CREDIT_NOTE_REQUIRED_FIELDS,
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

export function registerCustomerCreditNotesCommand(program: Command): void {
  const ccn = program
    .command('customer-credit-notes')
    .description('Manage customer credit notes');

  // ── clio customer-credit-notes list ───────────────────────────
  ccn
    .command('list')
    .description('List customer credit notes')
    .option('--limit <n>', 'Max results (default 100)', parsePositiveInt)
    .option('--offset <n>', 'Offset for pagination', parseNonNegativeInt)
    .option('--all', 'Fetch all pages')
    .option('--max-rows <n>', 'Max rows for --all (default 10000)', parsePositiveInt)
    .option('--api-key <key>', 'API key (overrides stored/env)')
    .option('--json', 'Output as JSON')
    .action(apiAction(async (client, opts) => {
      const result = await paginatedFetch(
        opts,
        (p) => listCustomerCreditNotes(client, p),
        { label: 'Fetching customer credit notes' },
      );

      if (opts.json) {
        console.log(paginatedJson(result, opts));
      } else {
        console.log(chalk.bold(`Customer Credit Notes (${result.data.length} of ${result.totalElements}):\n`));
        const { items, overflow } = displaySlice(result.data);
        for (const cn of items) {
          const amount = cn.totalAmount !== undefined ? chalk.dim(` $${cn.totalAmount.toFixed(2)}`) : '';
          const status = cn.status === 'DRAFT' ? chalk.yellow(cn.status) : chalk.green(cn.status);
          console.log(`  ${chalk.cyan(cn.resourceId)}  ${cn.reference || '(no ref)'}  ${status}${amount}  ${cn.valueDate}`);
        }
        if (overflow > 0) console.log(chalk.dim(`  ... and ${overflow.toLocaleString()} more (use --json for full output)`));
      }
    }));

  // ── clio customer-credit-notes get ────────────────────────────
  ccn
    .command('get <resourceId>')
    .description('Get a customer credit note by resourceId')
    .option('--api-key <key>', 'API key (overrides stored/env)')
    .option('--json', 'Output as JSON')
    .action((resourceId: string, opts) => apiAction(async (client) => {
      const res = await getCustomerCreditNote(client, resourceId);
      const cn = res.data;

      if (opts.json) {
        console.log(JSON.stringify(cn, null, 2));
      } else {
        console.log(chalk.bold('Reference:'), cn.reference || '(none)');
        console.log(chalk.bold('ID:'), cn.resourceId);
        console.log(chalk.bold('Status:'), cn.status);
        console.log(chalk.bold('Date:'), cn.valueDate);
        if (cn.totalAmount !== undefined) console.log(chalk.bold('Total:'), cn.totalAmount.toFixed(2));
        if (cn.lineItems?.length) {
          console.log(chalk.bold('Line Items:'));
          for (const li of cn.lineItems) {
            const qty = li.quantity ?? 1;
            const price = li.unitPrice ?? 0;
            console.log(`  - ${li.name}  qty: ${qty}  price: ${price.toFixed(2)}`);
          }
        }
        if (cn.notes) console.log(chalk.bold('Notes:'), cn.notes);
      }
    })(opts));

  // ── clio customer-credit-notes search ─────────────────────────
  ccn
    .command('search')
    .description('Search customer credit notes')
    .option('--ref <reference>', 'Filter by reference (contains)')
    .option('--status <status>', 'Filter by status (DRAFT, UNAPPLIED, APPLIED, VOIDED)')
    .option('--contact <resourceId>', 'Filter by contact name or resourceId')
    .option('--sort <field>', 'Sort field (default: valueDate)')
    .option('--order <direction>', 'Sort order: ASC or DESC (default: DESC)')
    .option('--limit <n>', 'Max results (default 20)', parsePositiveInt)
    .option('--offset <n>', 'Offset for pagination', parseNonNegativeInt)
    .option('--all', 'Fetch all pages')
    .option('--max-rows <n>', 'Max rows for --all (default 10000)', parsePositiveInt)
    .option('--api-key <key>', 'API key (overrides stored/env)')
    .option('--json', 'Output as JSON')
    .action(apiAction(async (client, opts) => {
      // Resolve contact by name if provided
      if (opts.contact) {
        const resolved = await resolveContactFlag(client, opts.contact, { silent: opts.json });
        opts.contact = resolved.resourceId;
      }

      const filter: Record<string, unknown> = {};
      if (opts.ref) filter.reference = { contains: opts.ref };
      if (opts.status) filter.status = { eq: opts.status };
      if (opts.contact) filter.contactResourceId = { eq: opts.contact };

      const searchFilter = Object.keys(filter).length > 0 ? filter : undefined;
      const sort = { sortBy: [opts.sort ?? 'valueDate'] as string[], order: (opts.order ?? 'DESC') as 'ASC' | 'DESC' };

      const result = await paginatedFetch(
        opts,
        ({ limit, offset }) => searchCustomerCreditNotes(client, { filter: searchFilter, limit, offset, sort }),
        { label: 'Searching customer credit notes', defaultLimit: 20 },
      );

      if (opts.json) {
        console.log(paginatedJson(result, opts));
      } else {
        if (result.data.length === 0) {
          console.log(chalk.yellow('No customer credit notes found.'));
          return;
        }
        console.log(chalk.bold(`Found ${result.data.length} customer credit note(s):\n`));
        const { items, overflow } = displaySlice(result.data);
        for (const cn of items) {
          const amount = cn.totalAmount !== undefined ? chalk.dim(` $${cn.totalAmount.toFixed(2)}`) : '';
          console.log(`  ${chalk.cyan(cn.resourceId)}  ${cn.reference || '(no ref)'}  ${cn.status}${amount}  ${cn.valueDate}`);
        }
        if (overflow > 0) console.log(chalk.dim(`  ... and ${overflow.toLocaleString()} more (use --json for full output)`));
      }
    }));

  // ── clio customer-credit-notes create ─────────────────────────
  ccn
    .command('create')
    .description('Create a customer credit note (saves as draft by default)')
    .option('--contact <resourceId>', 'Contact name or resourceId')
    .option('--lines <json>', 'Line items as JSON array', parseLineItems)
    .option('--date <YYYY-MM-DD>', 'Credit note date (valueDate)')
    .option('--ref <reference>', 'Credit note reference/number')
    .option('--notes <text>', 'Notes')
    .option('--currency <code>', 'Foreign currency code (ISO 4217)')
    .option('--exchange-rate <rate>', 'Exchange rate for foreign currency', parseRate)
    .option('--finalize', 'Finalize instead of saving as draft')
    .option('--input <file>', 'Read full request body from JSON file (or pipe via stdin)')
    .option('--api-key <key>', 'API key (overrides stored/env)')
    .option('--json', 'Output as JSON')
    .action(apiAction(async (client, opts) => {
      const body = readBodyInput(opts);

      let res;
      if (body) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- user-provided JSON, API validates
        res = await createCustomerCreditNote(client, {
          ...body,
          saveAsDraft: body.saveAsDraft ?? !opts.finalize,
        } as any);
      } else {
        requireFields(opts as Record<string, unknown>, [
          { flag: '--contact', key: 'contact' },
          { flag: '--lines', key: 'lines' },
          { flag: '--date', key: 'date' },
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

        res = await createCustomerCreditNote(client, {
          contactResourceId: opts.contact,
          lineItems: opts.lines,
          valueDate: opts.date,
          reference: opts.ref,
          notes: opts.notes,
          currency,
          saveAsDraft: !opts.finalize,
        });
      }

      if (opts.json) {
        console.log(JSON.stringify(res.data, null, 2));
      } else {
        const status = opts.finalize ? 'finalized' : 'draft';
        console.log(chalk.green(`Customer credit note created (${status}): ${res.data.reference || res.data.resourceId}`));
        console.log(chalk.bold('ID:'), res.data.resourceId);
      }
    }));

  // ── clio customer-credit-notes update ─────────────────────────
  ccn
    .command('update <resourceId>')
    .description('Update a draft customer credit note')
    .option('--ref <reference>', 'New reference')
    .option('--date <YYYY-MM-DD>', 'New credit note date')
    .option('--lines <json>', 'New line items as JSON array', parseLineItems)
    .option('--notes <text>', 'New notes')
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
        if (opts.lines !== undefined) data.lineItems = opts.lines;
        if (opts.notes !== undefined) data.notes = opts.notes;
      }

      const res = await updateCustomerCreditNote(client, resourceId, data);

      if (opts.json) {
        console.log(JSON.stringify(res.data, null, 2));
      } else {
        console.log(chalk.green(`Customer credit note updated: ${res.data.reference || res.data.resourceId}`));
      }
    })(opts));

  // ── clio customer-credit-notes delete ─────────────────────────
  ccn
    .command('delete <resourceId>')
    .description('Delete/void a customer credit note')
    .option('--api-key <key>', 'API key (overrides stored/env)')
    .option('--json', 'Output as JSON')
    .action((resourceId: string, opts) => apiAction(async (client) => {
      await deleteCustomerCreditNote(client, resourceId);

      if (opts.json) {
        console.log(JSON.stringify({ deleted: true, resourceId }));
      } else {
        console.log(chalk.green(`Customer credit note ${resourceId} deleted.`));
      }
    })(opts));

  // ── clio customer-credit-notes refund ───────────────────────
  ccn
    .command('refund <resourceId>')
    .description('Record a refund against a customer credit note')
    .option('--amount <n>', 'Refund amount (bank currency)', parseMoney)
    .option('--account <resourceId>', 'Bank/cash account name or resourceId')
    .option('--date <YYYY-MM-DD>', 'Refund date (valueDate)')
    .option('--transaction-amount <n>', 'Transaction amount (CN currency, if different from bank)', parseMoney)
    .option('--method <method>', 'Refund method (BANK_TRANSFER, CASH, CHEQUE, etc.)', 'BANK_TRANSFER')
    .option('--ref <reference>', 'Refund reference')
    .option('--draft', 'Save as draft instead of finalizing')
    .option('--input <file>', 'Read full refund body from JSON file (or pipe via stdin)')
    .option('--api-key <key>', 'API key (overrides stored/env)')
    .option('--json', 'Output as JSON')
    .action((resourceId: string, opts) => apiAction(async (client) => {
      const body = readBodyInput(opts);

      let res;
      if (body) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- user-provided JSON, API validates
        res = await createCustomerCreditNoteRefund(client, resourceId, {
          ...body,
          saveAsDraft: body.saveAsDraft ?? (opts.draft ?? false),
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

        res = await createCustomerCreditNoteRefund(client, resourceId, {
          paymentAmount: opts.amount,
          transactionAmount: opts.transactionAmount ?? opts.amount,
          accountResourceId: opts.account,
          valueDate: opts.date,
          dueDate: opts.date,
          paymentMethod: opts.method,
          reference: opts.ref ?? '',
          saveAsDraft: opts.draft ?? false,
        });
      }

      if (opts.json) {
        console.log(JSON.stringify(res.data, null, 2));
      } else {
        console.log(chalk.green(`Refund recorded for customer credit note ${resourceId}`));
      }
    })(opts));

  // ── clio customer-credit-notes refunds ──────────────────────
  ccn
    .command('refunds <resourceId>')
    .description('List refunds for a customer credit note')
    .option('--api-key <key>', 'API key (overrides stored/env)')
    .option('--json', 'Output as JSON')
    .action((resourceId: string, opts) => apiAction(async (client) => {
      const res = await listCustomerCreditNoteRefunds(client, resourceId);
      const refunds = res.data;

      if (opts.json) {
        console.log(JSON.stringify(refunds, null, 2));
      } else {
        if (!refunds?.length) {
          console.log(chalk.yellow('No refunds found.'));
          return;
        }
        console.log(chalk.bold(`Refunds (${refunds.length}):\n`));
        for (const r of refunds) {
          console.log(`  ${chalk.cyan(r.resourceId)}  ${r.reference || '(no ref)'}  ${r.status}  ${r.refundAmount}  ${r.valueDate}`);
        }
      }
    })(opts));

  // ── clio customer-credit-notes draft ──────────────────────────
  const draft = ccn
    .command('draft')
    .description('Manage draft customer credit notes (inspect, finalize, attachments)');

  // ── clio customer-credit-notes draft list ─────────────────────
  draft
    .command('list')
    .description('List all draft customer credit notes with per-field validation status')
    .option('--ids <ids>', 'Comma-separated IDs to inspect (instead of all drafts)')
    .option('--max-rows <n>', 'Max drafts to fetch (default 10000)', parsePositiveInt)
    .option('--api-key <key>', 'API key (overrides stored/env)')
    .option('--json', 'Output as JSON')
    .action(apiAction(async (client, opts) => {
      let items: any[];  // eslint-disable-line @typescript-eslint/no-explicit-any

      if (opts.ids) {
        const ids = opts.ids.split(',').map((s: string) => s.trim()).filter(Boolean);
        items = await Promise.all(ids.map(async (id: string) => {
          const res = await getCustomerCreditNote(client, id);
          return res.data;
        }));
        items = items.filter((cn) => cn.status === 'DRAFT');
      } else {
        const result = await paginatedFetch(
          { all: true, json: true, maxRows: opts.maxRows },
          ({ limit, offset }) => searchCustomerCreditNotes(client, {
            filter: { status: { eq: 'DRAFT' } },
            limit,
            offset,
            sort: { sortBy: ['valueDate'], order: 'DESC' },
          }),
          { label: 'Fetching draft customer credit notes' },
        );
        items = result.data;
      }

      const BATCH_SIZE = 5;
      const reports: DraftReport[] = [];
      for (let i = 0; i < items.length; i += BATCH_SIZE) {
        const batch = items.slice(i, i + BATCH_SIZE);
        const batchReports = await Promise.all(batch.map(async (cn) => {
          let attachmentCount = 0;
          try {
            const attRes = await listAttachments(client, 'customer-credit-notes', cn.resourceId);
            attachmentCount = Array.isArray(attRes.data) ? attRes.data.length : 0;
          } catch { /* Attachment listing may fail — don't block the report */ }
          return buildDraftReport(cn, CREDIT_NOTE_REQUIRED_FIELDS, attachmentCount);
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
        formatDraftTable('Customer Credit Notes', reports);
      }
    }));

  // ── clio customer-credit-notes draft finalize ─────────────────
  addDraftFinalizeOptions(
    draft
      .command('finalize <resourceId>')
      .description('Fill missing fields and convert a draft customer credit note to APPROVED'),
  ).action((resourceId: string, opts) => apiAction(async (client) => {
    const body = readBodyInput(opts);

    // 1. GET CURRENT DRAFT
    const res = await getCustomerCreditNote(client, resourceId);
    const cn = res.data;

    if (cn.status !== 'DRAFT') {
      const msg = `Customer credit note ${resourceId} is ${cn.status}, not DRAFT.`;
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
      updateData = mergeDraftFlags(cn, resolvedOpts);
    }
    const userChangedFields = Object.keys(updateData);

    // 4. VALIDATE AFTER MERGE
    const merged = { ...cn, ...updateData };
    if (updateData.lineItems) {
      merged.lineItems = updateData.lineItems as typeof cn.lineItems;
    }
    const { missingFields, missingCount, ready } = validateDraft(merged, CREDIT_NOTE_REQUIRED_FIELDS);

    // 4b. BUILD FULL PUT-COMPATIBLE BODY (no dueDate for credit notes)
    if (!body) {
      const fullBody: Record<string, unknown> = {
        reference: merged.reference || undefined,
        contactResourceId: merged.contactResourceId,
        valueDate: normalizeDate(updateData.valueDate as string) || normalizeDate(cn.valueDate),
      };
      const rawItems = (updateData.lineItems ?? cn.lineItems ?? []) as any[];  // eslint-disable-line @typescript-eslint/no-explicit-any
      fullBody.lineItems = rawItems.map((li: any) => sanitizeLineItem(li));  // eslint-disable-line @typescript-eslint/no-explicit-any
      if (updateData.isTaxVatApplicable != null || cn.isTaxVATApplicable != null) {
        fullBody.isTaxVATApplicable = updateData.isTaxVatApplicable ?? cn.isTaxVATApplicable;
      }
      if (updateData.taxInclusion != null || cn.taxInclusion != null) {
        fullBody.taxInclusion = updateData.taxInclusion ?? cn.taxInclusion;
      }
      if (updateData.notes) fullBody.notes = updateData.notes;
      if (updateData.tag) fullBody.tag = updateData.tag;
      updateData = fullBody;
    }

    // 5. DRY RUN
    if (opts.dryRun) {
      const validation = buildValidation(merged, CREDIT_NOTE_REQUIRED_FIELDS);
      if (opts.json) {
        console.log(JSON.stringify({ finalized: false, dryRun: true, resourceId, reference: merged.reference || null, ready, missingCount, missingFields, validation }, null, 2));
      } else {
        if (ready) {
          console.log(chalk.green(`✓ ${merged.reference || resourceId} is ready to finalize.`));
        } else {
          console.log(chalk.yellow(`✗ ${merged.reference || resourceId} — ${missingCount} issue${missingCount > 1 ? 's' : ''} remaining:`));
          for (const f of missingFields) {
            const spec = CREDIT_NOTE_REQUIRED_FIELDS.find((s) => f === s.field || f.endsWith(`.${s.field}`));
            console.log(`  ${f}: ${chalk.red('MISSING')} — ${spec?.hint ?? ''}`);
          }
        }
      }
      return;
    }

    // 6. VALIDATION FAILURE
    if (!ready) {
      const validation = buildValidation(merged, CREDIT_NOTE_REQUIRED_FIELDS);
      if (opts.json) {
        console.log(JSON.stringify({ finalized: false, resourceId, reference: merged.reference || null, ready: false, missingCount, missingFields, validation }, null, 2));
      } else {
        console.error(chalk.red(`\n✗ Cannot finalize ${merged.reference || resourceId} — ${missingCount} issue${missingCount > 1 ? 's' : ''} remaining:\n`));
        for (const f of missingFields) {
          const spec = CREDIT_NOTE_REQUIRED_FIELDS.find((s) => f === s.field || f.endsWith(`.${s.field}`));
          console.error(`  ${f}: ${chalk.red('MISSING')} — ${spec?.hint ?? ''}`);
        }
        console.error(chalk.dim(`\n  Fix the issues and retry:\n    clio customer-credit-notes draft finalize ${resourceId} ...\n`));
      }
      process.exit(1);
    }

    // 7. FINALIZE
    await finalizeCustomerCreditNote(client, resourceId, updateData);

    // 8. VERIFY
    const verifyRes = await getCustomerCreditNote(client, resourceId);
    const updated = verifyRes.data;
    const fieldsUpdated = userChangedFields.filter((k) => k !== 'saveAsDraft' && k !== 'resourceId');

    if (opts.json) {
      console.log(JSON.stringify({ finalized: true, resourceId: updated.resourceId, reference: updated.reference || null, status: updated.status, fieldsUpdated }, null, 2));
    } else {
      console.log(chalk.green(`\n✓ Customer credit note finalized: ${updated.reference || updated.resourceId}`));
      console.log(chalk.bold('  Status:'), updated.status);
      if (fieldsUpdated.length > 0) {
        console.log(chalk.bold('  Updated:'), fieldsUpdated.join(', '));
      }
    }
  })(opts));

  // ── clio customer-credit-notes draft attachments ──────────────
  draft
    .command('attachments <resourceId>')
    .description('List attachments for a customer credit note (URLs for agent inspection)')
    .option('--api-key <key>', 'API key (overrides stored/env)')
    .option('--json', 'Output as JSON')
    .action((resourceId: string, opts) => apiAction(async (client) => {
      const cnRes = await getCustomerCreditNote(client, resourceId);
      const cn = cnRes.data;

      const attRes = await listAttachments(client, 'customer-credit-notes', resourceId);
      const attachments = Array.isArray(attRes.data) ? attRes.data : [];

      if (opts.json) {
        console.log(JSON.stringify({ creditNoteResourceId: resourceId, creditNoteReference: cn.reference || null, attachments }, null, 2));
      } else {
        if (attachments.length === 0) {
          console.log(chalk.yellow(`No attachments for customer credit note ${cn.reference || resourceId}.`));
          return;
        }
        console.log(chalk.bold(`Attachments for ${cn.reference || resourceId}:\n`));
        for (const att of attachments) {
          console.log(`  ${chalk.cyan(att.resourceId)}  ${att.fileName || '(unnamed)'}`);
          if (att.fileUrl) console.log(`    ${chalk.dim(att.fileUrl)}`);
        }
      }
    })(opts));
}
