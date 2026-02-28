import chalk from 'chalk';
import { Command } from 'commander';
import {
  listJournals,
  searchJournals,
  createJournal,
  getJournal,
  updateJournal,
  deleteJournal,
  finalizeJournal,
} from '../core/api/journals.js';
import { listAttachments } from '../core/api/attachments.js';
import { apiAction } from './api-action.js';
import { resolveAccountFlag } from './resolve.js';
import { parsePositiveInt, parseNonNegativeInt, parseJournalEntries, readBodyInput, requireFields } from './parsers.js';
import { paginatedFetch, paginatedJson, displaySlice } from './pagination.js';
import {
  JOURNAL_REQUIRED_FIELDS,
  buildDraftReport,
  formatDraftTable,
  addJournalDraftFinalizeOptions,
  mergeJournalDraftFlags,
  validateDraft,
  buildValidation,
  normalizeDate,
  sanitizeJournalEntry,
  type DraftReport,
} from './draft-helpers.js';

export function registerJournalsCommand(program: Command): void {
  const journals = program
    .command('journals')
    .description('Manage journal entries');

  // ── clio journals list ──────────────────────────────────────────
  journals
    .command('list')
    .description('List journals')
    .option('--limit <n>', 'Max results (default 100)', parsePositiveInt)
    .option('--offset <n>', 'Offset for pagination', parseNonNegativeInt)
    .option('--all', 'Fetch all pages')
    .option('--max-rows <n>', 'Max rows for --all (default 10000)', parsePositiveInt)
    .option('--api-key <key>', 'API key (overrides stored/env)')
    .option('--json', 'Output as JSON')
    .action(apiAction(async (client, opts) => {
      const result = await paginatedFetch(
        opts,
        (p) => listJournals(client, p),
        { label: 'Fetching journals' },
      );

      if (opts.json) {
        console.log(paginatedJson(result, opts));
      } else {
        console.log(chalk.bold(`Journals (${result.data.length} of ${result.totalElements}):\n`));
        const { items, overflow } = displaySlice(result.data);
        for (const j of items) {
          const status = j.status === 'DRAFT' ? chalk.yellow(j.status) : chalk.green(j.status);
          const entries = j.journalEntries?.length ?? 0;
          console.log(`  ${chalk.cyan(j.resourceId)}  ${j.reference || '(no ref)'}  ${status}  ${j.valueDate}  ${chalk.dim(`${entries} entries`)}`);
        }
        if (overflow > 0) console.log(chalk.dim(`  ... and ${overflow.toLocaleString()} more (use --json for full output)`));
      }
    }));

  // ── clio journals search ────────────────────────────────────────
  journals
    .command('search')
    .description('Search journals with filters')
    .option('--ref <reference>', 'Filter by reference (contains)')
    .option('--from <YYYY-MM-DD>', 'Filter from date (inclusive)')
    .option('--to <YYYY-MM-DD>', 'Filter to date (inclusive)')
    .option('--status <status>', 'Filter by status (DRAFT, FINALIZED)')
    .option('--sort <field>', 'Sort field (default: valueDate)')
    .option('--order <direction>', 'Sort order: ASC or DESC (default: DESC)')
    .option('--limit <n>', 'Max results (default 20)', parsePositiveInt)
    .option('--offset <n>', 'Offset for pagination', parseNonNegativeInt)
    .option('--all', 'Fetch all pages')
    .option('--max-rows <n>', 'Max rows for --all (default 10000)', parsePositiveInt)
    .option('--api-key <key>', 'API key (overrides stored/env)')
    .option('--json', 'Output as JSON')
    .action(apiAction(async (client, opts) => {
      const filter: Record<string, unknown> = {};
      if (opts.ref) filter.reference = { contains: opts.ref };
      if (opts.status) filter.status = { eq: opts.status };
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
        ({ limit, offset }) => searchJournals(client, { filter: searchFilter, limit, offset, sort }),
        { label: 'Searching journals', defaultLimit: 20 },
      );

      if (opts.json) {
        console.log(paginatedJson(result, opts));
      } else {
        if (result.data.length === 0) {
          console.log(chalk.yellow('No journals found.'));
          return;
        }
        console.log(chalk.bold(`Found ${result.data.length} journal(s):\n`));
        const { items, overflow } = displaySlice(result.data);
        for (const j of items) {
          const status = j.status === 'DRAFT' ? chalk.yellow(j.status) : chalk.green(j.status);
          console.log(`  ${chalk.cyan(j.resourceId)}  ${j.reference || '(no ref)'}  ${status}  ${j.valueDate}`);
        }
        if (overflow > 0) console.log(chalk.dim(`  ... and ${overflow.toLocaleString()} more (use --json for full output)`));
      }
    }));

  // ── clio journals create ────────────────────────────────────────
  journals
    .command('create')
    .description('Create a journal entry (saves as draft by default)')
    .option('--entries <json>', 'Journal entries as JSON array (each: accountResourceId, amount, type: DEBIT|CREDIT)', parseJournalEntries)
    .option('--date <YYYY-MM-DD>', 'Journal date (valueDate)')
    .option('--ref <reference>', 'Journal reference')
    .option('--notes <text>', 'Notes')
    .option('--finalize', 'Finalize instead of saving as draft')
    .option('--input <file>', 'Read full request body from JSON file (or pipe via stdin)')
    .option('--api-key <key>', 'API key (overrides stored/env)')
    .option('--json', 'Output as JSON')
    .action(apiAction(async (client, opts) => {
      const body = readBodyInput(opts);

      let res;
      if (body) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- user-provided JSON, API validates
        res = await createJournal(client, {
          ...body,
          saveAsDraft: body.saveAsDraft ?? !opts.finalize,
        } as any);
      } else {
        requireFields(opts as Record<string, unknown>, [
          { flag: '--entries', key: 'entries' },
          { flag: '--date', key: 'date' },
        ]);
        res = await createJournal(client, {
          journalEntries: opts.entries,
          valueDate: opts.date,
          reference: opts.ref,
          notes: opts.notes,
          saveAsDraft: !opts.finalize,
        });
      }

      if (opts.json) {
        console.log(JSON.stringify(res.data, null, 2));
      } else {
        const status = opts.finalize ? 'finalized' : 'draft';
        console.log(chalk.green(`Journal created (${status}): ${res.data.reference || res.data.resourceId}`));
        console.log(chalk.bold('ID:'), res.data.resourceId);
      }
    }));

  // ── clio journals get ──────────────────────────────────────────
  journals
    .command('get <resourceId>')
    .description('Get a journal by ID')
    .option('--api-key <key>', 'API key (overrides stored/env)')
    .option('--json', 'Output as JSON')
    .action((resourceId: string, opts) => apiAction(async (client) => {
      const { data: j } = await getJournal(client, resourceId);

      if (opts.json) {
        console.log(JSON.stringify(j, null, 2));
      } else {
        const status = j.status === 'DRAFT' ? chalk.yellow(j.status)
          : j.status === 'VOID' ? chalk.red(j.status)
          : chalk.green(j.status);
        console.log(chalk.bold('Journal:'), j.reference || '(no ref)');
        console.log(chalk.bold('  ID:'), chalk.cyan(j.resourceId));
        console.log(chalk.bold('  Status:'), status);
        console.log(chalk.bold('  Date:'), j.valueDate);
        console.log(chalk.bold('  Notes:'), j.notes || '—');
        if (j.journalEntries?.length) {
          console.log(chalk.bold(`  Entries (${j.journalEntries.length}):`));
          for (const e of j.journalEntries) {
            // GET response has richer fields than the create JournalEntry type
            const entry = e as unknown as Record<string, unknown>;
            const acct = entry.organizationAccountResourceId ?? e.accountResourceId;
            const dr = entry.debitAmount;
            const cr = entry.creditAmount;
            const amt = dr != null ? `DR ${dr}` : `CR ${cr}`;
            console.log(`    ${chalk.dim(String(acct).slice(0, 12) + '...')}  ${amt}  ${e.description || ''}`);
          }
        }
      }
    })(opts));

  // ── clio journals update ──────────────────────────────────────
  journals
    .command('update <resourceId>')
    .description('Update a journal')
    .option('--entries <json>', 'Journal entries as JSON array', parseJournalEntries)
    .option('--date <YYYY-MM-DD>', 'Journal date (valueDate)')
    .option('--ref <reference>', 'Journal reference')
    .option('--notes <text>', 'Notes')
    .option('--finalize', 'Finalize instead of saving as draft')
    .option('--input <file>', 'Read full request body from JSON file (or pipe via stdin)')
    .option('--api-key <key>', 'API key (overrides stored/env)')
    .option('--json', 'Output as JSON')
    .action((resourceId: string, opts) => apiAction(async (client) => {
      const body = readBodyInput(opts);

      let res;
      if (body) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- user-provided JSON, API validates
        res = await updateJournal(client, resourceId, {
          ...body,
          saveAsDraft: body.saveAsDraft ?? !opts.finalize,
        } as any);
      } else {
        const data: Record<string, unknown> = {};
        if (opts.entries) data.journalEntries = opts.entries;
        if (opts.date) data.valueDate = opts.date;
        if (opts.ref) data.reference = opts.ref;
        if (opts.notes) data.notes = opts.notes;
        data.saveAsDraft = !opts.finalize;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- partial update fields, API validates
        res = await updateJournal(client, resourceId, data as any);
      }

      if (opts.json) {
        console.log(JSON.stringify(res.data, null, 2));
      } else {
        const status = opts.finalize ? 'finalized' : 'draft';
        console.log(chalk.green(`Journal updated (${status}): ${res.data.reference || res.data.resourceId}`));
      }
    })(opts));

  // ── clio journals delete ────────────────────────────────────────
  journals
    .command('delete <resourceId>')
    .description('Delete/void a journal')
    .option('--api-key <key>', 'API key (overrides stored/env)')
    .option('--json', 'Output as JSON')
    .action((resourceId: string, opts) => apiAction(async (client) => {
      await deleteJournal(client, resourceId);

      if (opts.json) {
        console.log(JSON.stringify({ deleted: true, resourceId }));
      } else {
        console.log(chalk.green(`Journal ${resourceId} deleted.`));
      }
    })(opts));

  // ── clio journals draft ──────────────────────────────────────
  const draft = journals
    .command('draft')
    .description('Manage draft journals (inspect, finalize, attachments)');

  // ── clio journals draft list ─────────────────────────────────
  draft
    .command('list')
    .description('List all draft journals with per-field validation status')
    .option('--ids <ids>', 'Comma-separated journal IDs to inspect (instead of all drafts)')
    .option('--max-rows <n>', 'Max drafts to fetch (default 10000)', parsePositiveInt)
    .option('--api-key <key>', 'API key (overrides stored/env)')
    .option('--json', 'Output as JSON')
    .action(apiAction(async (client, opts) => {
      let items: any[];  // eslint-disable-line @typescript-eslint/no-explicit-any

      if (opts.ids) {
        const ids = opts.ids.split(',').map((s: string) => s.trim()).filter(Boolean);
        items = await Promise.all(ids.map(async (id: string) => {
          const res = await getJournal(client, id);
          return res.data;
        }));
        items = items.filter((j) => j.status === 'DRAFT');
      } else {
        const result = await paginatedFetch(
          { all: true, json: true, maxRows: opts.maxRows },
          ({ limit, offset }) => searchJournals(client, {
            filter: { status: { eq: 'DRAFT' } },
            limit,
            offset,
            sort: { sortBy: ['valueDate'], order: 'DESC' },
          }),
          { label: 'Fetching draft journals' },
        );
        items = result.data;
      }

      const BATCH_SIZE = 5;
      const reports: DraftReport[] = [];
      for (let i = 0; i < items.length; i += BATCH_SIZE) {
        const batch = items.slice(i, i + BATCH_SIZE);
        const batchReports = await Promise.all(batch.map(async (j) => {
          let attachmentCount = 0;
          try {
            const attRes = await listAttachments(client, 'journals', j.resourceId);
            attachmentCount = Array.isArray(attRes.data) ? attRes.data.length : 0;
          } catch { /* Attachment listing may fail — don't block the report */ }
          return buildDraftReport(j, JOURNAL_REQUIRED_FIELDS, attachmentCount, 'journalEntries');
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
        formatDraftTable('Journals', reports);
      }
    }));

  // ── clio journals draft finalize ─────────────────────────────
  addJournalDraftFinalizeOptions(
    draft
      .command('finalize <resourceId>')
      .description('Fill missing fields and convert a draft journal to POSTED'),
  ).action((resourceId: string, opts) => apiAction(async (client) => {
    const body = readBodyInput(opts);

    // 1. GET CURRENT DRAFT
    const res = await getJournal(client, resourceId);
    const journal = res.data;

    if (journal.status !== 'DRAFT') {
      const msg = `Journal ${resourceId} is ${journal.status}, not DRAFT. Only DRAFT journals can be finalized.`;
      if (opts.json) {
        console.log(JSON.stringify({ finalized: false, error: msg }));
      } else {
        console.error(chalk.red(msg));
      }
      process.exit(1);
    }

    // 2. RESOLVE NAMES → UUIDs (journals: account only, no contact/taxProfile)
    const resolvedOpts: Record<string, any> = { ...opts };  // eslint-disable-line @typescript-eslint/no-explicit-any
    if (opts.account) {
      const resolved = await resolveAccountFlag(client, opts.account, { filter: 'line-item', silent: opts.json });
      resolvedOpts.account = resolved.resourceId;
    }

    // 3. MERGE FLAGS WITH EXISTING VALUES
    let updateData: Record<string, unknown>;
    if (body) {
      updateData = body;
    } else {
      updateData = mergeJournalDraftFlags(journal, resolvedOpts);
    }
    const userChangedFields = Object.keys(updateData);

    // 4. VALIDATE AFTER MERGE
    const merged = { ...journal, ...updateData };
    if (updateData.journalEntries) {
      merged.journalEntries = updateData.journalEntries as typeof journal.journalEntries;
    }
    const { missingFields, missingCount, ready } = validateDraft(merged, JOURNAL_REQUIRED_FIELDS, 'journalEntries');

    // 4b. BUILD FULL PUT-COMPATIBLE BODY (journals: no contact, no dueDate, no tax)
    if (!body) {
      const fullBody: Record<string, unknown> = {
        reference: merged.reference || undefined,
        valueDate: normalizeDate(updateData.valueDate as string) || normalizeDate(journal.valueDate),
      };
      // Sanitize journal entries: strip response-only fields, normalize account field name
      const rawEntries = (updateData.journalEntries ?? journal.journalEntries ?? []) as any[];  // eslint-disable-line @typescript-eslint/no-explicit-any
      fullBody.journalEntries = rawEntries.map((e: any) => sanitizeJournalEntry(e));  // eslint-disable-line @typescript-eslint/no-explicit-any
      if (updateData.notes) fullBody.notes = updateData.notes;
      updateData = fullBody;
    }

    // 5. DRY RUN
    if (opts.dryRun) {
      const validation = buildValidation(merged, JOURNAL_REQUIRED_FIELDS, 'journalEntries');
      if (opts.json) {
        console.log(JSON.stringify({ finalized: false, dryRun: true, resourceId, reference: merged.reference || null, ready, missingCount, missingFields, validation }, null, 2));
      } else {
        if (ready) {
          console.log(chalk.green(`✓ ${merged.reference || resourceId} is ready to finalize.`));
        } else {
          console.log(chalk.yellow(`✗ ${merged.reference || resourceId} — ${missingCount} issue${missingCount > 1 ? 's' : ''} remaining:`));
          for (const f of missingFields) {
            const spec = JOURNAL_REQUIRED_FIELDS.find((s) => f === s.field || f.endsWith(`.${s.field}`));
            console.log(`  ${f}: ${chalk.red('MISSING')} — ${spec?.hint ?? ''}`);
          }
        }
      }
      return;
    }

    // 6. VALIDATION FAILURE
    if (!ready) {
      const validation = buildValidation(merged, JOURNAL_REQUIRED_FIELDS, 'journalEntries');
      if (opts.json) {
        console.log(JSON.stringify({ finalized: false, resourceId, reference: merged.reference || null, ready: false, missingCount, missingFields, validation }, null, 2));
      } else {
        console.error(chalk.red(`\n✗ Cannot finalize ${merged.reference || resourceId} — ${missingCount} issue${missingCount > 1 ? 's' : ''} remaining:\n`));
        for (const f of missingFields) {
          const spec = JOURNAL_REQUIRED_FIELDS.find((s) => f === s.field || f.endsWith(`.${s.field}`));
          console.error(`  ${f}: ${chalk.red('MISSING')} — ${spec?.hint ?? ''}`);
        }
        console.error(chalk.dim(`\n  Fix the issues and retry:\n    clio journals draft finalize ${resourceId} ...\n`));
      }
      process.exit(1);
    }

    // 7. FINALIZE
    await finalizeJournal(client, resourceId, updateData);

    // 8. VERIFY
    const verifyRes = await getJournal(client, resourceId);
    const updated = verifyRes.data;
    const fieldsUpdated = userChangedFields.filter((k) => k !== 'saveAsDraft' && k !== 'resourceId');

    if (opts.json) {
      console.log(JSON.stringify({ finalized: true, resourceId: updated.resourceId, reference: updated.reference || null, status: updated.status, fieldsUpdated }, null, 2));
    } else {
      console.log(chalk.green(`\n✓ Journal finalized: ${updated.reference || updated.resourceId}`));
      console.log(chalk.bold('  Status:'), updated.status);
      if (fieldsUpdated.length > 0) {
        console.log(chalk.bold('  Updated:'), fieldsUpdated.join(', '));
      }
    }
  })(opts));

  // ── clio journals draft attachments ──────────────────────────
  draft
    .command('attachments <resourceId>')
    .description('List attachments for a journal (URLs for agent inspection)')
    .option('--api-key <key>', 'API key (overrides stored/env)')
    .option('--json', 'Output as JSON')
    .action((resourceId: string, opts) => apiAction(async (client) => {
      const journalRes = await getJournal(client, resourceId);
      const journal = journalRes.data;

      const attRes = await listAttachments(client, 'journals', resourceId);
      const attachments = Array.isArray(attRes.data) ? attRes.data : [];

      if (opts.json) {
        console.log(JSON.stringify({ journalResourceId: resourceId, journalReference: journal.reference || null, attachments }, null, 2));
      } else {
        if (attachments.length === 0) {
          console.log(chalk.yellow(`No attachments for journal ${journal.reference || resourceId}.`));
          return;
        }
        console.log(chalk.bold(`Attachments for ${journal.reference || resourceId}:\n`));
        for (const att of attachments) {
          console.log(`  ${chalk.cyan(att.resourceId)}  ${att.fileName || '(unnamed)'}`);
          if (att.fileUrl) console.log(`    ${chalk.dim(att.fileUrl)}`);
        }
      }
    })(opts));
}
