/**
 * CLI output formatting for bank file results.
 */

import chalk from 'chalk';
import type { BankFormat, BankFileResult } from './types.js';

// ── Sample JSON templates (shown in --help / validation errors) ──

const SAMPLES: Record<BankFormat, string> = {
  'dbs-giro': [
    '{',
    '  "originator": { "accountNumber": "0721234567", "accountName": "MyCompany Pte Ltd", "organizationId": "MYCOMP123456" },',
    '  "batch": { "valueDate": "2026-03-15" },',
    '  "dbs": { "productType": "BPY" },',
    '  "payees": [{ "name": "Acme Pte Ltd", "accountNumber": "0012345678", "bankCode": "7171", "amount": 1000.50 }]',
    '}',
  ].join('\n'),
  'ocbc-giro': [
    '{',
    '  "originator": { "accountNumber": "5012345678", "accountName": "MyCompany Pte Ltd" },',
    '  "batch": { "valueDate": "2026-03-15" },',
    '  "ocbc": { "clearing": "GIRO" },',
    '  "payees": [{ "name": "Acme Pte Ltd", "accountNumber": "0012345678", "bankCode": "DBSSSGSGXXX", "amount": 1000.50 }]',
    '}',
  ].join('\n'),
  'uob-giro': [
    '{',
    '  "originator": { "accountNumber": "3012345678", "accountName": "MyCompany Pte Ltd", "organizationId": "MYCOMP123456" },',
    '  "batch": { "valueDate": "2026-03-15" },',
    '  "uob": { "paymentMethod": "IBG" },',
    '  "payees": [{ "name": "Acme Pte Ltd", "accountNumber": "0012345678", "bankCode": "DBSSSGSGXXX", "amount": 1000.50 }]',
    '}',
  ].join('\n'),
};

/** Return a sample JSON snippet for the given bank format. */
export function bankFileSampleJson(format: BankFormat): string {
  return SAMPLES[format];
}

const fmt = (n: number): string =>
  n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const line = (w: number): string => chalk.dim('─'.repeat(w));

/** Print bank file result as human-readable summary. */
export function printBankFileResult(result: BankFileResult, savedTo?: string): void {
  const W = 60;

  console.log();
  console.log(chalk.bold(`BANK FILE GENERATED — ${result.summary.formatDescription}`));
  console.log(line(W));
  if (savedTo) {
    console.log(`  Saved to:     ${chalk.green(savedTo)}`);
  } else {
    console.log(`  Filename:     ${chalk.cyan(result.filename)}`);
  }
  console.log(`  Format:       ${result.format}`);
  console.log(`  Value date:   ${result.summary.valueDate}`);
  console.log(`  Currency:     ${result.summary.currency}`);
  console.log(`  Payees:       ${result.summary.totalPayees}`);
  console.log(`  Total amount: ${result.summary.currency} ${fmt(result.summary.totalAmount)}`);
  console.log(line(W));

  if (result.warnings.length > 0) {
    console.log();
    console.log(chalk.yellow(`  ${result.warnings.length} warning(s):`));
    for (const w of result.warnings) {
      console.log(chalk.yellow(`    • ${w}`));
    }
  }

  console.log();
}
