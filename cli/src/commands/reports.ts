import { danger, highlight, muted, success } from './ui/theme.js';
import { Command } from 'commander';
import {
  generateTrialBalance,
  generateBalanceSheet,
  generateProfitAndLoss,
  generateCashflow,
  generateArSummary,
  generateApSummary,
  generateCashBalance,
  generateGeneralLedger,
  generateVatLedger,
  generateEquityMovement,
  generateBankBalanceSummary,
  generateBankReconSummary,
  generateBankReconDetails,
  generateFaSummary,
  generateFaReconSummary,
  generateArReport,
  getLedgerHighlights,
} from '../core/api/reports.js';
import { messageToPdf } from '../core/api/message-pdf.js';
import { apiAction } from './api-action.js';
import { todayLocal } from './parsers.js';

const REPORT_TYPES = [
  'trial-balance', 'balance-sheet', 'profit-loss',
  'cashflow', 'aged-ar', 'aged-ap', 'cash-balance',
  'general-ledger', 'vat-ledger', 'equity-movement',
  'bank-balance-summary', 'bank-recon-summary', 'bank-recon-details',
  'fa-summary', 'fa-recon-summary', 'ar-report',
  'ledger-highlights',
] as const;

const GL_GROUP_BY = ['ACCOUNT', 'TRANSACTION', 'CAPSULE'] as const;

type ReportType = typeof REPORT_TYPES[number];

export function registerReportsCommand(program: Command): void {
  const reports = program
    .command('reports')
    .description('Generate financial reports');

  reports
    .command('generate <type>')
    .description(`Generate a report (${REPORT_TYPES.join(', ')})`)
    .option('--from <YYYY-MM-DD>', 'Start date (for P&L, cashflow, equity, recon)')
    .option('--to <YYYY-MM-DD>', 'End/snapshot date')
    .option('--currency <code>', 'Currency code override')
    .option('--group-by <groupBy>', `Group by for general-ledger/fa-summary (${GL_GROUP_BY.join(', ')}, default ACCOUNT)`)
    .option('--bank-account <id>', 'Bank account resourceId (for bank-recon-*)')
    .option('--api-key <key>', 'API key (overrides stored/env)')
    .option('--json', 'Output as JSON')
    .action((type: string, opts) => {
      if (!REPORT_TYPES.includes(type as ReportType)) {
        console.error(danger(`Invalid report type: ${type}`));
        console.error(muted(`Valid types: ${REPORT_TYPES.join(', ')}`));
        process.exit(1);
      }

      return apiAction(async (client) => {
        const today = todayLocal();
        let result: { data: unknown };

        switch (type as ReportType) {
          case 'trial-balance':
            result = await generateTrialBalance(client, {
              endDate: opts.to ?? today,
              currencyCode: opts.currency,
            });
            break;

          case 'balance-sheet':
            result = await generateBalanceSheet(client, {
              primarySnapshotDate: opts.to ?? today,
              currencyCode: opts.currency,
            });
            break;

          case 'profit-loss':
            result = await generateProfitAndLoss(client, {
              startDate: opts.from ?? `${today.slice(0, 4)}-01-01`,
              endDate: opts.to ?? today,
              currencyCode: opts.currency,
            });
            break;

          case 'cashflow':
            result = await generateCashflow(client, {
              startDate: opts.from ?? `${today.slice(0, 4)}-01-01`,
              endDate: opts.to ?? today,
            });
            break;

          case 'aged-ar':
            result = await generateArSummary(client, {
              startDate: opts.from ?? `${(opts.to ?? today).slice(0, 4)}-01-01`,
              endDate: opts.to ?? today,
            });
            break;

          case 'aged-ap':
            result = await generateApSummary(client, {
              startDate: opts.from ?? `${(opts.to ?? today).slice(0, 4)}-01-01`,
              endDate: opts.to ?? today,
            });
            break;

          case 'cash-balance':
            result = await generateCashBalance(client, {
              endDate: opts.to ?? today,
            });
            break;

          case 'general-ledger': {
            const groupBy = (opts.groupBy ?? 'ACCOUNT').toUpperCase();
            if (!GL_GROUP_BY.includes(groupBy as typeof GL_GROUP_BY[number])) {
              console.error(danger(`Invalid --group-by: ${groupBy}`));
              console.error(muted(`Valid values: ${GL_GROUP_BY.join(', ')}`));
              process.exit(1);
            }
            result = await generateGeneralLedger(client, {
              startDate: opts.from ?? `${today.slice(0, 4)}-01-01`,
              endDate: opts.to ?? today,
              groupBy,
            });
            break;
          }

          case 'vat-ledger':
            result = await generateVatLedger(client, {
              startDate: opts.from ?? `${today.slice(0, 4)}-01-01`,
              endDate: opts.to ?? today,
            });
            break;

          case 'equity-movement':
            result = await generateEquityMovement(client, {
              primarySnapshotStartDate: opts.from ?? `${today.slice(0, 4)}-01-01`,
              primarySnapshotEndDate: opts.to ?? today,
              currencyCode: opts.currency,
            });
            break;

          case 'bank-balance-summary':
            result = await generateBankBalanceSummary(client, {
              primarySnapshotDate: opts.to ?? today,
              currencyCode: opts.currency,
            });
            break;

          case 'bank-recon-summary':
            if (!opts.bankAccount) { console.error(danger('--bank-account is required for bank-recon-summary')); process.exit(1); }
            result = await generateBankReconSummary(client, {
              bankAccountResourceId: opts.bankAccount,
              primarySnapshotStartDate: opts.from ?? `${today.slice(0, 4)}-01-01`,
              primarySnapshotEndDate: opts.to ?? today,
              currencyCode: opts.currency,
            });
            break;

          case 'bank-recon-details':
            if (!opts.bankAccount) { console.error(danger('--bank-account is required for bank-recon-details')); process.exit(1); }
            result = await generateBankReconDetails(client, {
              bankAccountResourceId: opts.bankAccount,
              primarySnapshotStartDate: opts.from ?? `${today.slice(0, 4)}-01-01`,
              primarySnapshotEndDate: opts.to ?? today,
              filter: {},
              currencyCode: opts.currency,
            });
            break;

          case 'fa-summary': {
            const faGroupBy = (opts.groupBy ?? 'ACCOUNT').toUpperCase();
            result = await generateFaSummary(client, {
              primarySnapshotStartDate: opts.from ?? `${today.slice(0, 4)}-01-01`,
              primarySnapshotEndDate: opts.to ?? today,
              groupBy: faGroupBy,
              currencyCode: opts.currency,
            });
            break;
          }

          case 'fa-recon-summary':
            result = await generateFaReconSummary(client, {
              primarySnapshotStartDate: opts.from ?? `${today.slice(0, 4)}-01-01`,
              primarySnapshotEndDate: opts.to ?? today,
              currencyCode: opts.currency,
            });
            break;

          case 'ar-report':
            result = await generateArReport(client, {
              endDate: opts.to ?? today,
            });
            break;

          case 'ledger-highlights':
            result = await getLedgerHighlights(client);
            break;
        }

        if (opts.json) {
          console.log(JSON.stringify(result!.data, null, 2));
        } else {
          // Reports have complex nested structures — default to formatted JSON for human output too
          console.log(highlight(`${type} Report:\n`));
          console.log(JSON.stringify(result!.data, null, 2));
        }
      })(opts);
    });

  // ── clio reports pdf ──────────────────────────────────────────
  reports
    .command('pdf')
    .description('Convert markdown text to a downloadable PDF')
    .option('--body <markdown>', 'Markdown content to convert')
    .option('--title <title>', 'PDF title')
    .option('--api-key <key>', 'API key (overrides stored/env)')
    .option('--json', 'Output as JSON')
    .action(apiAction(async (client, opts) => {
      const body = opts.body as string | undefined;
      if (!body) {
        console.error(danger('--body is required'));
        process.exit(1);
      }
      const result = await messageToPdf(client, {
        markdown: body,
        title: opts.title as string | undefined,
      });
      if (opts.json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        const data = result.data;
        console.log(success(`PDF created: ${data.fileName}`));
        console.log(muted(data.fileUrl));
      }
    }));
}
