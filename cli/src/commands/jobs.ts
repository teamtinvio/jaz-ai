import chalk from 'chalk';
import prompts from 'prompts';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Command } from 'commander';
import { generateMonthEndBlueprint } from '../core/jobs/month-end/blueprint.js';
import { generateQuarterEndBlueprint } from '../core/jobs/quarter-end/blueprint.js';
import { generateYearEndBlueprint } from '../core/jobs/year-end/blueprint.js';
import { generateBankReconBlueprint } from '../core/jobs/bank-recon/blueprint.js';
import { generateGstVatBlueprint } from '../core/jobs/gst-vat/blueprint.js';
import { generatePaymentRunBlueprint } from '../core/jobs/payment-run/blueprint.js';
import { generateCreditControlBlueprint } from '../core/jobs/credit-control/blueprint.js';
import { generateSupplierReconBlueprint } from '../core/jobs/supplier-recon/blueprint.js';
import { generateAuditPrepBlueprint } from '../core/jobs/audit-prep/blueprint.js';
import { generateFaReviewBlueprint } from '../core/jobs/fa-review/blueprint.js';
import { generateDocumentCollectionBlueprint } from '../core/jobs/document-collection/blueprint.js';
import { generateStatutoryFilingBlueprint } from '../core/jobs/statutory-filing/blueprint.js';
import { ingest } from '../core/jobs/document-collection/tools/ingest/ingest.js';
import { uploadClassifiedFiles, resolveBankAccount } from '../core/jobs/document-collection/tools/ingest/upload.js';
import { isQpdfAvailable } from '../core/jobs/document-collection/tools/ingest/decrypt.js';
import { printIngestPlan, printIngestPlanJson, printUploadResult, printUploadResultJson, printUploadProgress } from '../core/jobs/document-collection/tools/ingest/format.js';
import { searchBills } from '../core/api/bills.js';
import { searchContacts } from '../core/api/contacts.js';
import { apiAction } from './api-action.js';
// paginatedFetch not used for outstanding — API bills/search pagination
// is broken with filters (api-dx-issues.md #9). Using single-page grab.
import { resolveContactFlag } from './resolve.js';
import { parsePositiveInt } from './parsers.js';
import type { IngestWithUploadResult } from '../core/jobs/types.js';
import { matchBankRecords } from '../core/jobs/bank-recon/tools/match/match.js';
import { computeFormCs } from '../core/jobs/statutory-filing/tools/sg-tax/form-cs.js';
import { computeCapitalAllowances } from '../core/jobs/statutory-filing/tools/sg-tax/capital-allowances.js';
import { printTaxResult, printTaxJson } from '../core/jobs/statutory-filing/tools/sg-tax/format.js';
import { TaxValidationError } from '../core/jobs/statutory-filing/tools/sg-tax/validate.js';
import type { SgFormCsInput, SgCapitalAllowanceInput, AssetCategory } from '../core/jobs/statutory-filing/tools/sg-tax/types.js';
import { generateBankFile, printBankFileResult, bankFileSampleJson, BankFileValidationError, validateRawInput } from '../core/jobs/payment-run/tools/bank-file/index.js';
import type { BankFormat } from '../core/jobs/payment-run/tools/bank-file/types.js';
import { groupOutstandingBills, printOutstandingResult } from '../core/jobs/payment-run/tools/outstanding/index.js';
import { printBlueprint, printBlueprintJson } from '../core/jobs/format.js';
import { printResult, printJson } from '../core/calc/format.js';
import { JobValidationError } from '../core/jobs/validate.js';
import { validateBankMatchInput, CalcValidationError } from '../core/calc/validate.js';

/** Wrap job/tool action with validation error handling. */
function jobAction(fn: (opts: Record<string, unknown>) => void) {
  return (opts: Record<string, unknown>) => {
    try {
      fn(opts);
    } catch (err) {
      if (err instanceof JobValidationError || err instanceof CalcValidationError || err instanceof TaxValidationError || err instanceof BankFileValidationError) {
        console.error(chalk.red(`Error: ${err.message}`));
        process.exit(1);
      }
      throw err;
    }
  };
}

/**
 * Read JSON from --input <file>, stdin pipe, or throw with a helpful message.
 * Shared by bank-recon match and payment-run bank-file.
 */
function readJsonInput(
  opts: Record<string, unknown>,
  noInputMessage: string,
  Err: new (msg: string) => Error,
): unknown {
  let rawJson: string;

  if (opts.input) {
    try {
      rawJson = readFileSync(opts.input as string, 'utf-8');
    } catch {
      throw new Err(`Cannot read file: ${opts.input}`);
    }
  } else if (!process.stdin.isTTY) {
    rawJson = readFileSync(0, 'utf-8');
  } else {
    throw new Err(noInputMessage);
  }

  try {
    return JSON.parse(rawJson);
  } catch (e) {
    const detail = e instanceof SyntaxError ? e.message : '';
    throw new Err(
      `Invalid JSON input${detail ? ': ' + detail : ''} — check that the file is valid JSON (not YAML or CSV)`
    );
  }
}

/** Resolve the single bank format flag from CLI opts. */
function resolveBankFormat(opts: Record<string, unknown>): BankFormat {
  const flags: { flag: string; format: BankFormat }[] = [
    { flag: 'dbsGiro',  format: 'dbs-giro' },
    { flag: 'ocbcGiro', format: 'ocbc-giro' },
    { flag: 'uobGiro',  format: 'uob-giro' },
  ];
  const selected = flags.filter(f => opts[f.flag]);

  if (selected.length === 0) {
    throw new BankFileValidationError(
      'No bank format specified. Pick one:\n\n' +
      '  --dbs-giro     DBS IDEAL UFF (product types: BPY, GPP, PPY)\n' +
      '  --ocbc-giro    OCBC GIRO / FAST (fixed-width 1000 chars)\n' +
      '  --uob-giro     UOB UFF (tilde-delimited)\n\n' +
      'Example:\n' +
      '  clio jobs payment-run bank-file --dbs-giro --input payees.json\n' +
      '  clio jobs payment-run bank-file --ocbc-giro --input payees.json --output payment.txt\n' +
      '  cat payees.json | clio jobs payment-run bank-file --uob-giro --json'
    );
  }
  if (selected.length > 1) {
    throw new BankFileValidationError(
      `Only one format flag allowed (got ${selected.map(s => '--' + s.format).join(' and ')}). ` +
      'Choose one of: --dbs-giro, --ocbc-giro, --uob-giro'
    );
  }

  return selected[0].format;
}

export function registerJobsCommand(program: Command): void {
  const jobs = program
    .command('jobs')
    .enablePositionalOptions()
    .description('Accounting job blueprints — month-end, quarter-end, year-end, bank-recon, gst-vat, payment-run, credit-control, supplier-recon, audit-prep, fa-review, document-collection, statutory-filing');

  // ── clio jobs month-end ──────────────────────────────────────────
  jobs
    .command('month-end')
    .description('Month-end close blueprint (5 phases, 18 steps)')
    .requiredOption('--period <YYYY-MM>', 'Month period (e.g., 2025-01)')
    .option('--currency <code>', 'Currency code (e.g. SGD, USD)')
    .option('--json', 'Output as JSON')
    .action(jobAction((opts) => {
      const bp = generateMonthEndBlueprint({
        period: opts.period as string,
        currency: opts.currency as string | undefined,
      });
      opts.json ? printBlueprintJson(bp) : printBlueprint(bp);
    }));

  // ── clio jobs quarter-end ────────────────────────────────────────
  jobs
    .command('quarter-end')
    .description('Quarter-end close blueprint (monthly × 3 + quarterly extras)')
    .requiredOption('--period <YYYY-QN>', 'Quarter period (e.g., 2025-Q1)')
    .option('--incremental', 'Generate only quarterly extras (assumes months already closed)')
    .option('--currency <code>', 'Currency code (e.g. SGD, USD)')
    .option('--json', 'Output as JSON')
    .action(jobAction((opts) => {
      const bp = generateQuarterEndBlueprint({
        period: opts.period as string,
        currency: opts.currency as string | undefined,
        incremental: opts.incremental as boolean | undefined,
      });
      opts.json ? printBlueprintJson(bp) : printBlueprint(bp);
    }));

  // ── clio jobs year-end ───────────────────────────────────────────
  jobs
    .command('year-end')
    .description('Year-end close blueprint (quarterly × 4 + annual extras)')
    .requiredOption('--period <YYYY>', 'Fiscal year (e.g., 2025)')
    .option('--incremental', 'Generate only annual extras (assumes quarters already closed)')
    .option('--currency <code>', 'Currency code (e.g. SGD, USD)')
    .option('--json', 'Output as JSON')
    .action(jobAction((opts) => {
      const bp = generateYearEndBlueprint({
        period: opts.period as string,
        currency: opts.currency as string | undefined,
        incremental: opts.incremental as boolean | undefined,
      });
      opts.json ? printBlueprintJson(bp) : printBlueprint(bp);
    }));

  // ── clio jobs bank-recon (command group: blueprint + match tool) ──
  const bankRecon = jobs
    .command('bank-recon')
    .description('Bank reconciliation — blueprint + match tool')
    .enablePositionalOptions()
    .passThroughOptions()
    .option('--account <name>', 'Specific bank account name')
    .option('--period <YYYY-MM>', 'Month period to reconcile')
    .option('--currency <code>', 'Currency code (e.g. SGD, USD)')
    .option('--json', 'Output as JSON')
    .action(jobAction((opts) => {
      const bp = generateBankReconBlueprint({
        account: opts.account as string | undefined,
        period: opts.period as string | undefined,
        currency: opts.currency as string | undefined,
      });
      opts.json ? printBlueprintJson(bp) : printBlueprint(bp);
    }));

  // ── clio jobs bank-recon match ────────────────────────────────────
  bankRecon
    .command('match')
    .description('Bank reconciliation matcher — finds 1:1, N:1, 1:N, and N:M matches between bank records and transactions')
    .option('--input <file>', 'JSON file with bankRecords + transactions (or pipe via stdin)')
    .option('--tolerance <amount>', 'Amount tolerance in functional currency (default: 0.01)', parseFloat)
    .option('--date-window <days>', 'Max days apart for matching (default: 14)', parseInt)
    .option('--max-group <k>', 'Max subset size for N:1/1:N matching (default: 5, max: 10)', parseInt)
    .option('--max-dfs-nodes <n>', 'DFS node budget per subset search (default: 500000). Higher = more thorough but slower', parseInt)
    .option('--currency <code>', 'Functional/reporting currency (e.g. SGD)')
    .option('--find-all', 'Return all possible matches per record (analysis mode)')
    .option('--json', 'Output as JSON')
    .action(jobAction((opts) => {
      const parsed = readJsonInput(
        opts,
        'No input provided. Use --input <file> or pipe JSON via stdin:\n' +
        '  clio jobs bank-recon match --input match-data.json\n' +
        '  cat data.json | clio jobs bank-recon match --json',
        CalcValidationError,
      );

      const input = validateBankMatchInput(parsed);

      if (!input.options) input.options = {};
      if (opts.tolerance !== undefined) input.options.tolerance = opts.tolerance as number;
      if (opts.dateWindow !== undefined) input.options.dateWindowDays = opts.dateWindow as number;
      if (opts.maxGroup !== undefined) input.options.maxGroupSize = opts.maxGroup as number;
      if (opts.maxDfsNodes !== undefined) input.options.maxDfsNodes = opts.maxDfsNodes as number;
      if (opts.currency) input.options.currency = opts.currency as string;
      if (opts.findAll) input.options.findAll = true;

      const result = matchBankRecords(input);
      opts.json ? printJson(result) : printResult(result);
    }));

  // ── clio jobs gst-vat ────────────────────────────────────────────
  jobs
    .command('gst-vat')
    .description('GST/VAT filing preparation blueprint')
    .requiredOption('--period <YYYY-QN>', 'Quarter period (e.g., 2025-Q1)')
    .option('--currency <code>', 'Currency code (e.g. SGD, USD)')
    .option('--json', 'Output as JSON')
    .action(jobAction((opts) => {
      const bp = generateGstVatBlueprint({
        period: opts.period as string,
        currency: opts.currency as string | undefined,
      });
      opts.json ? printBlueprintJson(bp) : printBlueprint(bp);
    }));

  // ── clio jobs payment-run (command group: blueprint + bank-file tool) ──
  const paymentRun = jobs
    .command('payment-run')
    .description('Payment run — blueprint + outstanding bills + bank file generation (DBS, OCBC, UOB)')
    .enablePositionalOptions()
    .passThroughOptions()
    .option('--due-before <YYYY-MM-DD>', 'Pay bills due on or before this date')
    .option('--currency <code>', 'Currency code (e.g. SGD, USD)')
    .option('--json', 'Output as JSON')
    .action(jobAction((opts) => {
      const bp = generatePaymentRunBlueprint({
        dueBefore: opts.dueBefore as string | undefined,
        currency: opts.currency as string | undefined,
      });
      opts.json ? printBlueprintJson(bp) : printBlueprint(bp);
    }));

  // ── clio jobs payment-run bank-file ────────────────────────────────
  paymentRun
    .command('bank-file')
    .description('Generate bank payment file (GIRO/FAST/PayNow) for DBS, OCBC, or UOB')
    .option('--dbs-giro', 'DBS IDEAL UFF — CSV (product types: BPY, GPP, PPY)')
    .option('--ocbc-giro', 'OCBC GIRO/FAST — fixed-width 1000 chars (clearing: GIRO or FAST)')
    .option('--uob-giro', 'UOB UFF — tilde-delimited (methods: IBG, IBGX, FAST + PayNow variants)')
    .option('--input <path>', 'Path to JSON input file (or pipe via stdin)')
    .option('--output <path>', 'Write path (default: auto-named in current directory, e.g. DBS_BPY_20260315.csv)')
    .option('--force', 'Overwrite existing output file (default: fail if exists)')
    .option('--json', 'Output result as JSON (includes file content + summary)')
    .action(jobAction((opts) => {
      // ── Resolve format from mutually-exclusive flags ──────────
      const format = resolveBankFormat(opts);

      // ── Read + validate + generate ────────────────────────────
      const parsed = readJsonInput(
        opts,
        'No input provided. Use --input <file> or pipe JSON via stdin.\n\n' +
        'Example:\n' +
        `  clio jobs payment-run bank-file --${format} --input payees.json\n` +
        `  cat payees.json | clio jobs payment-run bank-file --${format} --json\n\n` +
        `Sample JSON for ${format}:\n` +
        bankFileSampleJson(format),
        BankFileValidationError,
      );

      // Inject format from CLI flag (user doesn't include it in JSON)
      if (parsed && typeof parsed === 'object') {
        (parsed as Record<string, unknown>).format = format;
      }

      const input = validateRawInput(parsed);
      const result = generateBankFile(input);

      // ── Save + print ──────────────────────────────────────────
      const outputPath = opts.output
        ? resolve(opts.output as string)
        : resolve(result.filename);

      try {
        const flag = opts.force ? 'w' : 'wx';
        writeFileSync(outputPath, result.content, { encoding: 'utf-8', flag });
      } catch (e) {
        const code = (e as NodeJS.ErrnoException).code ?? 'UNKNOWN';
        if (code === 'EEXIST') {
          throw new BankFileValidationError(
            `Refusing to overwrite existing file "${outputPath}". Re-run with --force to overwrite.`
          );
        }
        throw new BankFileValidationError(
          `Cannot write file "${outputPath}" — check the path exists and is writable (${code})`
        );
      }

      if (opts.json) {
        console.log(JSON.stringify({ ...result, savedTo: outputPath }, null, 2));
      } else {
        printBankFileResult(result, outputPath);
      }
    }));

  // ── clio jobs payment-run outstanding ────────────────────────────
  paymentRun
    .command('outstanding')
    .description('Fetch outstanding bills grouped by supplier (requires API key)')
    .option('--due-before <YYYY-MM-DD>', 'Only bills due on or before this date')
    .option('--currency <code>', 'Filter by currency (e.g. SGD)')
    .option('--supplier <name>', 'Filter to a specific supplier (fuzzy name or resourceId)')
    .option('--limit <n>', 'Max bills to fetch (default 1000, max 1000)', parsePositiveInt)
    .option('--api-key <key>', 'API key (overrides stored/env)')
    .option('--json', 'Output as JSON')
    .action(apiAction(async (client, opts) => {
      // Resolve supplier name → contactResourceId if provided
      let contactResourceId: string | undefined;
      if (opts.supplier) {
        const resolved = await resolveContactFlag(client, opts.supplier, { silent: opts.json });
        contactResourceId = resolved.resourceId;
      }

      // Build search filter — UNPAID + balance > 0 (SKILL.md Rule 67)
      const filter: Record<string, unknown> = {
        status: { eq: 'UNPAID' },
        balanceAmount: { gt: 0 },
      };
      if (opts.dueBefore) filter.dueDate = { lte: opts.dueBefore };
      if (contactResourceId) filter.contactResourceId = { eq: contactResourceId };
      if (opts.currency) filter.currencyCode = { eq: opts.currency };

      const sort = { sortBy: ['dueDate'] as string[], order: 'ASC' as const };

      // Fetch outstanding bills — use limit=1000 single-page grab.
      // NOTE: API bills/search has a pagination bug where offset > 0 with
      // filters returns 0 items (api-dx-issues.md #9). Workaround: max
      // single page. For orgs with > 1000 unpaid bills, results are capped.
      const pageLimit = opts.limit ?? 1000;
      const res = await searchBills(client, { filter, limit: pageLimit, offset: 0, sort });
      const fetched = {
        data: res.data,
        totalElements: res.totalElements,
        totalPages: Math.ceil(res.totalElements / pageLimit),
        truncated: res.totalElements > res.data.length,
      };
      if (fetched.truncated && !opts.json) {
        process.stderr.write(
          chalk.yellow(`  Warning: ${res.totalElements.toLocaleString()} bills found, showing ${res.data.length.toLocaleString()} (API pagination bug — see api-dx-issues.md #9)\n`),
        );
      }

      // Enrich bills with contact names (batch lookup)
      const uniqueContactIds = Array.from(new Set(
        fetched.data.map(b => b.contactResourceId).filter(Boolean),
      )) as string[];
      const contactNames = new Map<string, string>();
      // Batch in chunks of 100 (StringExpression.in max)
      for (let i = 0; i < uniqueContactIds.length; i += 100) {
        const chunk = uniqueContactIds.slice(i, i + 100);
        const res = await searchContacts(client, {
          filter: { resourceId: { in: chunk } },
          sort: { sortBy: ['name'], order: 'ASC' },
          limit: chunk.length,
          offset: 0,
        });
        for (const c of res.data) {
          contactNames.set(c.resourceId, c.name);
        }
      }
      // Stamp contactName onto bills
      for (const b of fetched.data) {
        if (b.contactResourceId && contactNames.has(b.contactResourceId)) {
          (b as { contactName?: string }).contactName = contactNames.get(b.contactResourceId);
        }
      }

      // Group by supplier + compute summary
      const result = groupOutstandingBills(fetched.data, {
        currency: opts.currency,
        dueBefore: opts.dueBefore,
      });

      if (opts.json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        printOutstandingResult(result);
      }
    }));

  // ── clio jobs credit-control ─────────────────────────────────────
  jobs
    .command('credit-control')
    .description('Credit control / AR chase blueprint')
    .option('--overdue-days <days>', 'Minimum overdue days to include', (v: string) => {
      const n = Number.parseInt(v, 10);
      if (!Number.isFinite(n)) throw new JobValidationError(`overdue-days must be an integer (got "${v}")`);
      return n;
    })
    .option('--currency <code>', 'Currency code (e.g. SGD, USD)')
    .option('--json', 'Output as JSON')
    .action(jobAction((opts) => {
      const bp = generateCreditControlBlueprint({
        overdueDays: opts.overdueDays as number | undefined,
        currency: opts.currency as string | undefined,
      });
      opts.json ? printBlueprintJson(bp) : printBlueprint(bp);
    }));

  // ── clio jobs supplier-recon ─────────────────────────────────────
  jobs
    .command('supplier-recon')
    .description('Supplier statement reconciliation blueprint')
    .option('--supplier <name>', 'Specific supplier name')
    .option('--period <YYYY-MM>', 'Month period')
    .option('--currency <code>', 'Currency code (e.g. SGD, USD)')
    .option('--json', 'Output as JSON')
    .action(jobAction((opts) => {
      const bp = generateSupplierReconBlueprint({
        supplier: opts.supplier as string | undefined,
        period: opts.period as string | undefined,
        currency: opts.currency as string | undefined,
      });
      opts.json ? printBlueprintJson(bp) : printBlueprint(bp);
    }));

  // ── clio jobs audit-prep ─────────────────────────────────────────
  jobs
    .command('audit-prep')
    .description('Audit preparation pack blueprint')
    .requiredOption('--period <YYYY|YYYY-QN>', 'Fiscal year or quarter (e.g., 2025 or 2025-Q3)')
    .option('--currency <code>', 'Currency code (e.g. SGD, USD)')
    .option('--json', 'Output as JSON')
    .action(jobAction((opts) => {
      const bp = generateAuditPrepBlueprint({
        period: opts.period as string,
        currency: opts.currency as string | undefined,
      });
      opts.json ? printBlueprintJson(bp) : printBlueprint(bp);
    }));

  // ── clio jobs fa-review ──────────────────────────────────────────
  jobs
    .command('fa-review')
    .description('Fixed asset register review blueprint')
    .option('--currency <code>', 'Currency code (e.g. SGD, USD)')
    .option('--json', 'Output as JSON')
    .action(jobAction((opts) => {
      const bp = generateFaReviewBlueprint({
        currency: opts.currency as string | undefined,
      });
      opts.json ? printBlueprintJson(bp) : printBlueprint(bp);
    }));

  // ── clio jobs document-collection (command group: blueprint + ingest tool) ──
  const docCollection = jobs
    .command('document-collection')
    .description('Document collection — scan, classify, and upload client documents')
    .enablePositionalOptions()
    .passThroughOptions()
    .option('--currency <code>', 'Currency code (e.g. SGD, USD)')
    .option('--json', 'Output as JSON')
    .action(jobAction((opts) => {
      const bp = generateDocumentCollectionBlueprint({
        currency: opts.currency as string | undefined,
      });
      opts.json ? printBlueprintJson(bp) : printBlueprint(bp);
    }));

  // ── clio jobs document-collection ingest ────────────────────────
  const ingestCmd = docCollection
    .command('ingest')
    .description('Scan and classify client documents — optionally upload via Magic API')
    .requiredOption('--source <path>', 'Local directory, .zip file, or public share URL (Dropbox, Google Drive, OneDrive). ZIPs are auto-extracted.')
    .option('--type <type>', 'Force document type: invoice, bill, credit-note-customer, credit-note-supplier, or bank-statement')
    .option('--upload', 'Upload classified files to Jaz after scanning (requires auth)')
    .option('--bank-account <name-or-id>', 'Bank account name or resourceId (required for bank statements)')
    .option('--api-key <key>', 'API key (or use JAZ_API_KEY env var)')
    .option('--timeout <ms>', 'Download timeout in milliseconds for cloud sources (default: 30000)', parseInt)
    .option('--currency <code>', 'Functional/reporting currency (e.g. SGD)')
    .option('--json', 'Output as JSON');

  // Handler: scan-only (offline) vs scan+upload (online)
  ingestCmd.action(async (opts: Record<string, unknown>) => {
    // Normalize --type flag
    const typeMap: Record<string, 'INVOICE' | 'BILL' | 'CUSTOMER_CREDIT_NOTE' | 'SUPPLIER_CREDIT_NOTE' | 'BANK_STATEMENT'> = {
      invoice: 'INVOICE',
      bill: 'BILL',
      'credit-note-customer': 'CUSTOMER_CREDIT_NOTE',
      'credit-note-supplier': 'SUPPLIER_CREDIT_NOTE',
      customer_credit_note: 'CUSTOMER_CREDIT_NOTE',
      supplier_credit_note: 'SUPPLIER_CREDIT_NOTE',
      'bank-statement': 'BANK_STATEMENT',
      bank_statement: 'BANK_STATEMENT',
    };
    const forceType = opts.type ? typeMap[(opts.type as string).toLowerCase()] : undefined;
    if (opts.type && !forceType) {
      console.error(chalk.red(`Error: Invalid --type "${opts.type}". Use: invoice, bill, credit-note-customer, credit-note-supplier, or bank-statement`));
      process.exit(1);
    }

    // ── Scan + Classify ─────────────────────────────────────────
    let plan;
    try {
      plan = await ingest({
        source: opts.source as string,
        type: forceType,
        currency: opts.currency as string | undefined,
        timeout: opts.timeout as number | undefined,
      });
    } catch (err) {
      console.error(chalk.red(`Error: ${err instanceof Error ? err.message : String(err)}`));
      process.exit(1);
    }

    // ── Scan-only mode (no --upload) ─────────────────────────────
    if (!opts.upload) {
      opts.json ? printIngestPlanJson(plan) : printIngestPlan(plan);
      return;
    }

    // ── Upload mode: validate before auth ────────────────────────
    if (plan.summary.needClassification > 0) {
      const unknownFolders = plan.folders
        .filter(f => f.documentType === 'UNKNOWN')
        .map(f => `  ${f.folder}/ (${f.count} files)`)
        .join('\n');
      console.error(chalk.red('Error: Cannot upload — some folders could not be classified:'));
      console.error(chalk.yellow(unknownFolders));
      console.error();
      console.error(chalk.dim('Fix: Re-run with --type to force a type for all files,'));
      console.error(chalk.dim('     or rename folders to match: invoices/, bills/, bank-statements/'));
      process.exit(1);
    }

    if (plan.summary.uploadable === 0) {
      console.error(chalk.red('Error: No uploadable files found in the source.'));
      process.exit(1);
    }

    const hasBankStatements = plan.folders.some(f => f.documentType === 'BANK_STATEMENT');
    if (hasBankStatements && !opts.bankAccount) {
      console.error(chalk.red('Error: --bank-account is required when uploading bank statements.'));
      console.error(chalk.dim('Get your bank account ID: clio bank accounts --json'));
      process.exit(1);
    }

    // ── Encrypted PDF checks ──────────────────────────────────────
    // Files with __pw__<password> in the filename auto-supply their password.
    // Only files without a filePassword need qpdf + user action.
    const encryptedFiles = plan.folders.flatMap(f => f.files.filter(file => file.encrypted));
    const needPassword = encryptedFiles.filter(f => !f.filePassword);

    if (encryptedFiles.length > 0 && !isQpdfAvailable()) {
      const paths = encryptedFiles.map(f => `${f.folder}/${f.filename}`);
      if (opts.json) {
        console.log(JSON.stringify({
          error: 'ENCRYPTED_PDF_NO_QPDF',
          message: 'Encrypted PDFs found but qpdf is not installed',
          action: 'Install qpdf: brew install qpdf (macOS) or sudo apt install qpdf (Linux), then retry',
          encryptedFiles: paths,
        }));
      } else {
        console.error(chalk.red('Error: Encrypted PDFs found but qpdf is not installed.'));
        console.error(chalk.yellow('Install qpdf to decrypt before upload:'));
        console.error(chalk.dim('  macOS:   brew install qpdf'));
        console.error(chalk.dim('  Ubuntu:  sudo apt install qpdf'));
        console.error(chalk.dim('  Windows: choco install qpdf'));
      }
      process.exit(1);
    }
    if (needPassword.length > 0) {
      const paths = needPassword.map(f => `${f.folder}/${f.filename}`);
      if (opts.json) {
        // Agents can't type — error with actionable instructions
        console.log(JSON.stringify({
          error: 'ENCRYPTED_PDF_NO_PASSWORD',
          message: `${needPassword.length} encrypted PDF(s) found without a password`,
          action: 'Embed password in filename: rename to filename__pw__password.pdf',
          encryptedFiles: paths,
        }));
        process.exit(1);
      }
      // Interactive mode — prompt user for each encrypted file
      console.error(chalk.yellow(`\n${needPassword.length} encrypted PDF(s) need a password:\n`));
      for (const f of needPassword) {
        const { password } = await prompts({
          type: 'text',
          name: 'password',
          message: `PDF password for ${f.folder}/${f.filename}`,
        });
        if (!password) {
          console.error(chalk.red('Aborted — no password provided.'));
          console.error(chalk.dim('Tip: embed password in filename to skip prompts: filename__pw__password.pdf'));
          process.exit(1);
        }
        f.filePassword = password;
      }
    }

    // ── Upload with auth ─────────────────────────────────────────
    const doUpload = apiAction(async (client, apiOpts) => {
      // Resolve bank account (fuzzy name match or UUID)
      let bankAccountId: string | undefined;
      if (opts.bankAccount) {
        const resolved = await resolveBankAccount(client, opts.bankAccount as string);
        bankAccountId = resolved.resourceId;
        if (!apiOpts.json && resolved.name !== resolved.resourceId) {
          process.stderr.write(chalk.dim(`  Bank account: ${resolved.name} (${resolved.resourceId})\n`));
        }
      }

      if (!apiOpts.json) {
        process.stderr.write(chalk.dim(`\n  Uploading ${plan.summary.uploadable} files...\n`));
      }

      const upload = await uploadClassifiedFiles({
        plan,
        client,
        bankAccountId,
        onProgress: apiOpts.json ? undefined : printUploadProgress,
      });

      const result: IngestWithUploadResult = { ...plan, upload };
      apiOpts.json ? printUploadResultJson(result) : printUploadResult(result);
    });

    await doUpload(opts as { apiKey?: string; json?: boolean; org?: string });
  });

  // ── clio jobs statutory-filing (command group: blueprint + sg-cs + sg-ca) ──
  const statFiling = jobs
    .command('statutory-filing')
    .description('Statutory filing — corporate income tax computation and filing')
    .enablePositionalOptions()
    .passThroughOptions()
    .option('--ya <year>', 'Year of Assessment', parseInt)
    .option('--jurisdiction <code>', 'Jurisdiction: sg (default)', 'sg')
    .option('--currency <code>', 'Currency code (e.g. SGD)')
    .option('--json', 'Output as JSON')
    .action(jobAction((opts) => {
      const bp = generateStatutoryFilingBlueprint({
        ya: opts.ya as number | undefined,
        jurisdiction: opts.jurisdiction as string | undefined,
        currency: opts.currency as string | undefined,
      });
      opts.json ? printBlueprintJson(bp) : printBlueprint(bp);
    }));

  // ── clio jobs statutory-filing sg-cs ───────────────────────────────
  statFiling
    .command('sg-cs')
    .description('Singapore Form C-S / C-S Lite corporate income tax computation')
    .option('--input <file>', 'JSON input file (full SgFormCsInput structure)')
    .option('--ya <year>', 'Year of Assessment', parseInt)
    .option('--revenue <amount>', 'Total revenue', parseFloat)
    .option('--profit <amount>', 'Accounting net profit/loss', parseFloat)
    .option('--depreciation <amount>', 'Accounting depreciation (add-back)', parseFloat)
    .option('--amortization <amount>', 'Intangible amortization (add-back)', parseFloat)
    .option('--rou-depreciation <amount>', 'IFRS 16 ROU depreciation (add-back)', parseFloat)
    .option('--lease-interest <amount>', 'IFRS 16 lease interest (add-back)', parseFloat)
    .option('--lease-payments <amount>', 'Actual lease payments (deduction)', parseFloat)
    .option('--provisions <amount>', 'General provisions (add-back)', parseFloat)
    .option('--donations <amount>', 'IPC donations (add-back, claimed at 250%)', parseFloat)
    .option('--entertainment <amount>', 'Non-deductible entertainment', parseFloat)
    .option('--penalties <amount>', 'Penalties & fines', parseFloat)
    .option('--private-car <amount>', 'S-plated vehicle expenses', parseFloat)
    .option('--ca <amount>', 'Current year capital allowances', parseFloat)
    .option('--ca-bf <amount>', 'Unabsorbed CA brought forward', parseFloat)
    .option('--losses-bf <amount>', 'Unabsorbed trade losses b/f', parseFloat)
    .option('--donations-bf <amount>', 'Unabsorbed donations b/f', parseFloat)
    .option('--exemption <type>', 'Exemption type: sute, pte (default), none', 'pte')
    .option('--basis-start <date>', 'Basis period start (YYYY-MM-DD)')
    .option('--basis-end <date>', 'Basis period end (YYYY-MM-DD)')
    .option('--currency <code>', 'Currency code (default: SGD)')
    .option('--json', 'Output as JSON')
    .action(jobAction((opts) => {
      const jsonInput = readTaxJsonInput(opts);
      let input: SgFormCsInput;

      if (jsonInput) {
        input = jsonInput as SgFormCsInput;
      } else {
        if (!opts.ya) {
          throw new TaxValidationError('--ya (Year of Assessment) is required');
        }
        input = buildDefaultSgCsInput(opts);
      }

      const result = computeFormCs(input);
      opts.json ? printTaxJson(result) : printTaxResult(result);
    }));

  // ── clio jobs statutory-filing sg-ca ───────────────────────────────
  statFiling
    .command('sg-ca')
    .description('Singapore capital allowance schedule (per-asset computation)')
    .option('--input <file>', 'JSON input file (full SgCapitalAllowanceInput structure)')
    .option('--ya <year>', 'Year of Assessment', parseInt)
    .option('--cost <amount>', 'Asset cost (simple single-asset mode)', parseFloat)
    .option('--category <cat>', 'Asset category: computer, automation, low-value, general, ip, renovation')
    .option('--acquired <date>', 'Acquisition date (YYYY-MM-DD)')
    .option('--prior-claimed <amount>', 'CA already claimed in prior YAs', parseFloat, 0)
    .option('--ip-years <years>', 'IP write-off period (5, 10, or 15)', parseInt)
    .option('--unabsorbed-bf <amount>', 'Unabsorbed CA brought forward', parseFloat, 0)
    .option('--currency <code>', 'Currency code (default: SGD)')
    .option('--json', 'Output as JSON')
    .action(jobAction((opts) => {
      const jsonInput = readTaxJsonInput(opts);
      let input: SgCapitalAllowanceInput;

      if (jsonInput) {
        input = jsonInput as SgCapitalAllowanceInput;
      } else {
        if (!opts.ya) {
          throw new TaxValidationError('--ya (Year of Assessment) is required');
        }
        if (!opts.cost || !opts.category || !opts.acquired) {
          throw new TaxValidationError('--cost, --category, and --acquired are required in simple mode');
        }
        input = {
          ya: opts.ya as number,
          currency: opts.currency as string | undefined,
          unabsorbedBroughtForward: opts.unabsorbedBf as number,
          assets: [{
            description: `${(opts.category as string).charAt(0).toUpperCase() + (opts.category as string).slice(1)} asset`,
            cost: opts.cost as number,
            acquisitionDate: opts.acquired as string,
            category: opts.category as AssetCategory,
            priorYearsClaimed: opts.priorClaimed as number,
            ipWriteOffYears: opts.ipYears as number | undefined,
          }],
        };
      }

      const result = computeCapitalAllowances(input);
      opts.json ? printTaxJson(result) : printTaxResult(result);
    }));
}

// ── Tax input helpers ──────────────────────────────────────────────

/** Read JSON input from --input file or stdin. */
function readTaxJsonInput(opts: Record<string, unknown>): unknown {
  const inputFile = opts.input as string | undefined;
  if (inputFile) {
    const raw = readFileSync(inputFile, 'utf-8');
    return JSON.parse(raw);
  }
  if (!process.stdin.isTTY) {
    try {
      const raw = readFileSync(0, 'utf-8').trim();
      if (raw) return JSON.parse(raw);
    } catch {
      // No stdin data available
    }
  }
  return null;
}

/** Build a default SgFormCsInput structure from CLI flags. */
function buildDefaultSgCsInput(opts: Record<string, unknown>): SgFormCsInput {
  return {
    ya: opts.ya as number,
    basisPeriodStart: (opts.basisStart as string) ?? `${(opts.ya as number) - 1}-01-01`,
    basisPeriodEnd: (opts.basisEnd as string) ?? `${(opts.ya as number) - 1}-12-31`,
    currency: opts.currency as string | undefined,
    revenue: (opts.revenue as number) ?? 0,
    accountingProfit: (opts.profit as number) ?? 0,
    addBacks: {
      depreciation: (opts.depreciation as number) ?? 0,
      amortization: (opts.amortization as number) ?? 0,
      rouDepreciation: (opts.rouDepreciation as number) ?? 0,
      leaseInterest: (opts.leaseInterest as number) ?? 0,
      generalProvisions: (opts.provisions as number) ?? 0,
      donations: (opts.donations as number) ?? 0,
      entertainment: (opts.entertainment as number) ?? 0,
      penalties: (opts.penalties as number) ?? 0,
      privateCar: (opts.privateCar as number) ?? 0,
      capitalExpOnPnl: 0,
      unrealizedFxLoss: 0,
      otherNonDeductible: 0,
    },
    deductions: {
      actualLeasePayments: (opts.leasePayments as number) ?? 0,
      unrealizedFxGain: 0,
      exemptDividends: 0,
      exemptIncome: 0,
      otherDeductions: 0,
    },
    capitalAllowances: {
      currentYearClaim: (opts.ca as number) ?? 0,
      balanceBroughtForward: (opts.caBf as number) ?? 0,
    },
    enhancedDeductions: {
      rdExpenditure: 0,
      rdMultiplier: 2.5,
      ipRegistration: 0,
      ipMultiplier: 2.0,
      donations250Base: (opts.donations as number) ?? 0,
      s14qRenovation: 0,
    },
    losses: {
      broughtForward: (opts.lossesBf as number) ?? 0,
    },
    donationsCarryForward: {
      broughtForward: (opts.donationsBf as number) ?? 0,
    },
    exemptionType: (opts.exemption as 'sute' | 'pte' | 'none') ?? 'pte',
  };
}
