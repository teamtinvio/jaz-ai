import chalk from 'chalk';
import { Command } from 'commander';
import {
  listBills,
  getBill,
  searchBills,
  createBill,
  updateBill,
  deleteBill,
  createBillPayment,
  applyCreditsToBill,
  finalizeBill,
} from '../core/api/bills.js';
import { listAttachments } from '../core/api/attachments.js';
import { apiAction } from './api-action.js';
import { resolveContactFlag, resolveAccountFlag, resolveTaxProfileFlag } from './resolve.js';
import { parsePositiveInt, parseNonNegativeInt, parseMoney, parseRate, parseLineItems, readBodyInput, requireFields } from './parsers.js';
import { paginatedFetch, paginatedJson, displaySlice } from './pagination.js';
import {
  BILL_REQUIRED_FIELDS,
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

export function registerBillsCommand(program: Command): void {
  const bills = program
    .command('bills')
    .description('Manage purchase bills');

  // ── clio bills list ─────────────────────────────────────────────
  bills
    .command('list')
    .description('List bills')
    .option('--limit <n>', 'Max results (default 100)', parsePositiveInt)
    .option('--offset <n>', 'Offset for pagination', parseNonNegativeInt)
    .option('--all', 'Fetch all pages')
    .option('--max-rows <n>', 'Max rows for --all (default 10000)', parsePositiveInt)
    .option('--api-key <key>', 'API key (overrides stored/env)')
    .option('--json', 'Output as JSON')
    .action(apiAction(async (client, opts) => {
      const result = await paginatedFetch(
        opts,
        (p) => listBills(client, p),
        { label: 'Fetching bills' },
      );

      if (opts.json) {
        console.log(paginatedJson(result, opts));
      } else {
        console.log(chalk.bold(`Bills (${result.data.length} of ${result.totalElements}):\n`));
        const { items, overflow } = displaySlice(result.data);
        for (const b of items) {
          const amount = b.totalAmount !== undefined ? chalk.dim(` $${b.totalAmount.toFixed(2)}`) : '';
          const status = b.status === 'DRAFT' ? chalk.yellow(b.status) : chalk.green(b.status);
          console.log(`  ${chalk.cyan(b.resourceId)}  ${b.reference || '(no ref)'}  ${status}${amount}  ${b.valueDate}`);
        }
        if (overflow > 0) console.log(chalk.dim(`  ... and ${overflow.toLocaleString()} more (use --json for full output)`));
      }
    }));

  // ── clio bills get ──────────────────────────────────────────────
  bills
    .command('get <resourceId>')
    .description('Get a bill by resourceId')
    .option('--api-key <key>', 'API key (overrides stored/env)')
    .option('--json', 'Output as JSON')
    .action((resourceId: string, opts) => apiAction(async (client) => {
      const res = await getBill(client, resourceId);
      const b = res.data;

      if (opts.json) {
        console.log(JSON.stringify(b, null, 2));
      } else {
        console.log(chalk.bold('Reference:'), b.reference || '(none)');
        console.log(chalk.bold('ID:'), b.resourceId);
        console.log(chalk.bold('Status:'), b.status);
        console.log(chalk.bold('Date:'), b.valueDate);
        console.log(chalk.bold('Due:'), b.dueDate);
        if (b.contactName) console.log(chalk.bold('Contact:'), b.contactName);
        if (b.totalAmount !== undefined) console.log(chalk.bold('Total:'), b.totalAmount.toFixed(2));
        if (b.amountDue !== undefined) console.log(chalk.bold('Amount Due:'), b.amountDue.toFixed(2));
        if (b.lineItems?.length) {
          console.log(chalk.bold('Line Items:'));
          for (const li of b.lineItems) {
            console.log(`  - ${li.name}  qty: ${li.quantity ?? 1}  price: ${(li.unitPrice ?? 0).toFixed(2)}`);
          }
        }
        if (b.notes) console.log(chalk.bold('Notes:'), b.notes);
      }
    })(opts));

  // ── clio bills search ───────────────────────────────────────────
  bills
    .command('search')
    .description('Search bills with filters')
    .option('--ref <reference>', 'Filter by reference (contains)')
    .option('--status <status>', 'Filter by status (DRAFT, UNPAID, PAID, OVERDUE, VOIDED)')
    .option('--contact <resourceId>', 'Filter by contact name or resourceId')
    .option('--from <YYYY-MM-DD>', 'Filter from date (inclusive)')
    .option('--to <YYYY-MM-DD>', 'Filter to date (inclusive)')
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
      if (opts.from || opts.to) {
        const dateFilter: Record<string, string> = {};
        if (opts.from) dateFilter.gte = opts.from;
        if (opts.to) dateFilter.lte = opts.to;
        filter.valueDate = dateFilter;
      }

      const searchFilter = Object.keys(filter).length > 0 ? filter : undefined;
      const sort = { sortBy: [opts.sort ?? 'valueDate'] as string[], order: (opts.order ?? 'DESC') as 'ASC' | 'DESC' };

      const result = await paginatedFetch(
        opts,
        ({ limit, offset }) => searchBills(client, { filter: searchFilter, limit, offset, sort }),
        { label: 'Searching bills', defaultLimit: 20 },
      );

      if (opts.json) {
        console.log(paginatedJson(result, opts));
      } else {
        if (result.data.length === 0) {
          console.log(chalk.yellow('No bills found.'));
          return;
        }
        console.log(chalk.bold(`Found ${result.data.length} bill(s):\n`));
        const { items, overflow } = displaySlice(result.data);
        for (const b of items) {
          const amount = b.totalAmount !== undefined ? chalk.dim(` $${b.totalAmount.toFixed(2)}`) : '';
          const status = b.status === 'DRAFT' ? chalk.yellow(b.status) : chalk.green(b.status);
          console.log(`  ${chalk.cyan(b.resourceId)}  ${b.reference || '(no ref)'}  ${status}${amount}  ${b.valueDate}`);
        }
        if (overflow > 0) console.log(chalk.dim(`  ... and ${overflow.toLocaleString()} more (use --json for full output)`));
      }
    }));

  // ── clio bills create ───────────────────────────────────────────
  bills
    .command('create')
    .description('Create a bill (saves as draft by default)')
    .option('--contact <resourceId>', 'Contact name or resourceId')
    .option('--lines <json>', 'Line items as JSON array', parseLineItems)
    .option('--date <YYYY-MM-DD>', 'Bill date (valueDate)')
    .option('--due <YYYY-MM-DD>', 'Due date')
    .option('--ref <reference>', 'Bill reference/number')
    .option('--notes <text>', 'Notes')
    .option('--tag <tag>', 'Tag')
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
        res = await createBill(client, {
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

        res = await createBill(client, {
          contactResourceId: opts.contact,
          lineItems: opts.lines,
          valueDate: opts.date,
          dueDate: opts.due,
          reference: opts.ref,
          notes: opts.notes,
          tag: opts.tag,
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
        console.log(chalk.green(`Bill created (${status}): ${res.data.reference || res.data.resourceId}`));
        console.log(chalk.bold('ID:'), res.data.resourceId);
      }
    }));

  // ── clio bills update ───────────────────────────────────────────
  bills
    .command('update <resourceId>')
    .description('Update a draft bill')
    .option('--ref <reference>', 'New reference')
    .option('--date <YYYY-MM-DD>', 'New bill date')
    .option('--due <YYYY-MM-DD>', 'New due date')
    .option('--lines <json>', 'New line items as JSON array', parseLineItems)
    .option('--notes <text>', 'New notes')
    .option('--tag <tag>', 'New tag')
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
      }

      const res = await updateBill(client, resourceId, data);

      if (opts.json) {
        console.log(JSON.stringify(res.data, null, 2));
      } else {
        console.log(chalk.green(`Bill updated: ${res.data.reference || res.data.resourceId}`));
      }
    })(opts));

  // ── clio bills delete ───────────────────────────────────────────
  bills
    .command('delete <resourceId>')
    .description('Delete/void a bill')
    .option('--api-key <key>', 'API key (overrides stored/env)')
    .option('--json', 'Output as JSON')
    .action((resourceId: string, opts) => apiAction(async (client) => {
      await deleteBill(client, resourceId);

      if (opts.json) {
        console.log(JSON.stringify({ deleted: true, resourceId }));
      } else {
        console.log(chalk.green(`Bill ${resourceId} deleted.`));
      }
    })(opts));

  // ── clio bills pay ──────────────────────────────────────────────
  bills
    .command('pay <resourceId>')
    .description('Record a payment against a bill (finalizes by default)')
    .option('--amount <n>', 'Payment amount (bank currency)', parseMoney)
    .option('--account <resourceId>', 'Bank/cash account name or resourceId')
    .option('--date <YYYY-MM-DD>', 'Payment date (valueDate)')
    .option('--transaction-amount <n>', 'Transaction amount (bill currency, if different from bank)', parseMoney)
    .option('--method <method>', 'Payment method (BANK_TRANSFER, CASH, CHEQUE, etc.)', 'BANK_TRANSFER')
    .option('--ref <reference>', 'Payment reference')
    .option('--draft', 'Save as draft instead of finalizing')
    .option('--input <file>', 'Read full payment body from JSON file (or pipe via stdin)')
    .option('--api-key <key>', 'API key (overrides stored/env)')
    .option('--json', 'Output as JSON')
    .action((resourceId: string, opts) => apiAction(async (client) => {
      const body = readBodyInput(opts);

      let res;
      if (body) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- user-provided JSON, API validates
        res = await createBillPayment(client, resourceId, {
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

        res = await createBillPayment(client, resourceId, {
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
        console.log(chalk.green(`Payment recorded for bill ${resourceId}`));
      }
    })(opts));

  // ── clio bills apply-credits ──────────────────────────────────
  bills
    .command('apply-credits <resourceId>')
    .description('Apply supplier credit note(s) to a bill')
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

      const res = await applyCreditsToBill(client, resourceId, credits);

      if (opts.json) {
        console.log(JSON.stringify(res.data, null, 2));
      } else {
        console.log(chalk.green(`Applied ${credits.length} credit(s) to bill ${resourceId}`));
      }
    })(opts));

  // ── clio bills draft ────────────────────────────────────────────
  const draft = bills
    .command('draft')
    .description('Manage draft bills (inspect, finalize, attachments)');

  // ── clio bills draft list ─────────────────────────────────────
  draft
    .command('list')
    .description('List all draft bills with per-field validation status')
    .option('--ids <ids>', 'Comma-separated bill IDs to inspect (instead of all drafts)')
    .option('--max-rows <n>', 'Max drafts to fetch (default 10000)', parsePositiveInt)
    .option('--api-key <key>', 'API key (overrides stored/env)')
    .option('--json', 'Output as JSON')
    .action(apiAction(async (client, opts) => {
      let bills: any[];  // eslint-disable-line @typescript-eslint/no-explicit-any

      if (opts.ids) {
        // Fetch specific bills by ID
        const ids = opts.ids.split(',').map((s: string) => s.trim()).filter(Boolean);
        bills = await Promise.all(ids.map(async (id: string) => {
          const res = await getBill(client, id);
          return res.data;
        }));
        // Filter to drafts only
        bills = bills.filter((b) => b.status === 'DRAFT');
      } else {
        // Search for all drafts
        const result = await paginatedFetch(
          { all: true, json: true, maxRows: opts.maxRows },
          ({ limit, offset }) => searchBills(client, {
            filter: { status: { eq: 'DRAFT' } },
            limit,
            offset,
            sort: { sortBy: ['valueDate'], order: 'DESC' },
          }),
          { label: 'Fetching draft bills' },
        );
        bills = result.data;
      }

      // Build draft reports with attachment counts (batched to avoid API rate limits)
      const BATCH_SIZE = 5;
      const reports: DraftReport[] = [];
      for (let i = 0; i < bills.length; i += BATCH_SIZE) {
        const batch = bills.slice(i, i + BATCH_SIZE);
        const batchReports = await Promise.all(batch.map(async (b) => {
          let attachmentCount = 0;
          try {
            const attRes = await listAttachments(client, 'bills', b.resourceId);
            attachmentCount = Array.isArray(attRes.data) ? attRes.data.length : 0;
          } catch {
            // Attachment listing may fail for some bills — don't block the report
          }
          return buildDraftReport(b, BILL_REQUIRED_FIELDS, attachmentCount);
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
        formatDraftTable('Bills', reports);
      }
    }));

  // ── clio bills draft finalize ─────────────────────────────────
  addDraftFinalizeOptions(
    draft
      .command('finalize <resourceId>')
      .description('Fill missing fields and convert a draft bill to APPROVED'),
  ).action((resourceId: string, opts) => apiAction(async (client) => {
    const body = readBodyInput(opts);

    // 1. Get current draft
    const res = await getBill(client, resourceId);
    const bill = res.data;

    if (bill.status !== 'DRAFT') {
      const msg = `Bill ${resourceId} is ${bill.status}, not DRAFT. Only DRAFT bills can be finalized.`;
      if (opts.json) {
        console.log(JSON.stringify({ finalized: false, error: msg }));
      } else {
        console.error(chalk.red(msg));
      }
      process.exit(1);
    }

    // 2. Resolve names → UUIDs
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

    // 3. Merge flags with existing values
    let updateData: Record<string, unknown>;
    if (body) {
      updateData = body;
    } else {
      updateData = mergeDraftFlags(bill, resolvedOpts);
    }
    // Track which fields the user explicitly changed (before we build the full PUT body)
    const userChangedFields = Object.keys(updateData);

    // 4. Validate after merge — apply updates to a virtual copy
    const merged = { ...bill, ...updateData };
    if (updateData.lineItems) {
      merged.lineItems = updateData.lineItems as typeof bill.lineItems;
    }
    const { missingFields, missingCount, ready } = validateDraft(merged, BILL_REQUIRED_FIELDS);

    // 4b. Build a full PUT-compatible body from merged state.
    // The API PUT requires: reference, contactResourceId, dates (YYYY-MM-DD),
    // and line items in create-request format (not GET response shape).
    if (!body) {
      const fullBody: Record<string, unknown> = {
        reference: merged.reference || undefined,
        contactResourceId: merged.contactResourceId,
        valueDate: normalizeDate(updateData.valueDate as string) || normalizeDate(bill.valueDate),
        dueDate: normalizeDate(updateData.dueDate as string) || normalizeDate(bill.dueDate),
      };
      // Sanitize line items: strip response-only fields, normalize account field name
      const rawItems = (updateData.lineItems ?? bill.lineItems ?? []) as any[];  // eslint-disable-line @typescript-eslint/no-explicit-any
      fullBody.lineItems = rawItems.map((li: any) => sanitizeLineItem(li));  // eslint-disable-line @typescript-eslint/no-explicit-any
      // Carry over tax settings
      if (updateData.isTaxVatApplicable != null || bill.isTaxVATApplicable != null) {
        fullBody.isTaxVATApplicable = updateData.isTaxVatApplicable ?? bill.isTaxVATApplicable;
      }
      if (updateData.taxInclusion != null || bill.taxInclusion != null) {
        fullBody.taxInclusion = updateData.taxInclusion ?? bill.taxInclusion;
      }
      if (updateData.notes) fullBody.notes = updateData.notes;
      if (updateData.tag) fullBody.tag = updateData.tag;
      updateData = fullBody;
    }

    // 5. Dry run: just report validation
    if (opts.dryRun) {
      const validation = buildValidation(merged, BILL_REQUIRED_FIELDS);
      if (opts.json) {
        console.log(JSON.stringify({
          finalized: false,
          dryRun: true,
          resourceId,
          reference: merged.reference || null,
          ready,
          missingCount,
          missingFields,
          validation,
        }, null, 2));
      } else {
        if (ready) {
          console.log(chalk.green(`✓ ${merged.reference || resourceId} is ready to finalize.`));
        } else {
          console.log(chalk.yellow(`✗ ${merged.reference || resourceId} — ${missingCount} issue${missingCount > 1 ? 's' : ''} remaining:`));
          for (const f of missingFields) {
            const spec = BILL_REQUIRED_FIELDS.find((s) => f === s.field || f.endsWith(`.${s.field}`));
            console.log(`  ${f}: ${chalk.red('MISSING')} — ${spec?.hint ?? ''}`);
          }
        }
      }
      return;
    }

    // 6. Validation failure — not dry run
    if (!ready) {
      const validation = buildValidation(merged, BILL_REQUIRED_FIELDS);
      if (opts.json) {
        console.log(JSON.stringify({
          finalized: false,
          resourceId,
          reference: merged.reference || null,
          ready: false,
          missingCount,
          missingFields,
          validation,
        }, null, 2));
      } else {
        console.error(chalk.red(`\n✗ Cannot finalize ${merged.reference || resourceId} — ${missingCount} issue${missingCount > 1 ? 's' : ''} remaining:\n`));
        for (const f of missingFields) {
          const spec = BILL_REQUIRED_FIELDS.find((s) => f === s.field || f.endsWith(`.${s.field}`));
          console.error(`  ${f}: ${chalk.red('MISSING')} — ${spec?.hint ?? ''}`);
        }
        console.error(chalk.dim(`\n  Fix the issues and retry:\n    clio bills draft finalize ${resourceId} ...\n`));
      }
      process.exit(1);
    }

    // 7. Finalize: PUT with saveAsDraft=false
    await finalizeBill(client, resourceId, updateData);

    // 8. GET the finalized bill to confirm status (PUT response may not include status)
    const verifyRes = await getBill(client, resourceId);
    const updated = verifyRes.data;

    // Report which fields the user explicitly changed (not the full PUT body)
    const fieldsUpdated = userChangedFields.filter((k) => k !== 'saveAsDraft' && k !== 'resourceId');

    if (opts.json) {
      console.log(JSON.stringify({
        finalized: true,
        resourceId: updated.resourceId,
        reference: updated.reference || null,
        status: updated.status,
        fieldsUpdated,
      }, null, 2));
    } else {
      console.log(chalk.green(`\n✓ Bill finalized: ${updated.reference || updated.resourceId}`));
      console.log(chalk.bold('  Status:'), updated.status);
      if (fieldsUpdated.length > 0) {
        console.log(chalk.bold('  Updated:'), fieldsUpdated.join(', '));
      }
    }
  })(opts));

  // ── clio bills draft attachments ──────────────────────────────
  draft
    .command('attachments <resourceId>')
    .description('List attachments for a bill (URLs for agent inspection)')
    .option('--api-key <key>', 'API key (overrides stored/env)')
    .option('--json', 'Output as JSON')
    .action((resourceId: string, opts) => apiAction(async (client) => {
      // Get bill reference for display
      const billRes = await getBill(client, resourceId);
      const bill = billRes.data;

      const attRes = await listAttachments(client, 'bills', resourceId);
      const attachments = Array.isArray(attRes.data) ? attRes.data : [];

      if (opts.json) {
        console.log(JSON.stringify({
          billResourceId: resourceId,
          billReference: bill.reference || null,
          attachments,
        }, null, 2));
      } else {
        if (attachments.length === 0) {
          console.log(chalk.yellow(`No attachments for bill ${bill.reference || resourceId}.`));
          return;
        }
        console.log(chalk.bold(`Attachments for ${bill.reference || resourceId}:\n`));
        for (const att of attachments) {
          console.log(`  ${chalk.cyan(att.resourceId)}  ${att.fileName || '(unnamed)'}`);
          if (att.fileUrl) console.log(`    ${chalk.dim(att.fileUrl)}`);
        }
      }
    })(opts));
}
