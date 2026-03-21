/**
 * Output formatters for calc results.
 * Table format for human reading, JSON for programmatic use.
 *
 * Currency-aware: when a result has a currency code, it appears in
 * the title and summary lines (e.g. "Loan Amortization Schedule (SGD)").
 */

import { muted, success, warning, danger, highlight, info } from '../../commands/ui/theme.js';
import type {
  CalcResult, LoanResult, LeaseResult, DepreciationResult,
  PrepaidExpenseResult, DeferredRevenueResult,
  FxRevalResult, EclResult, ProvisionResult,
  FixedDepositResult, AssetDisposalResult,
  BankMatchResult, MatchProposal,
  JournalEntry,
} from './types.js';

const fmt = (n: number): string => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtR = (n: number): string => fmt(n).padStart(14);
const fmtPct = (n: number): string => `${n}%`;
const currTag = (c: string | null): string => c ? ` (${c})` : '';
const line = (w: number): string => muted('─'.repeat(w));

function printWorkings(result: Exclude<CalcResult, BankMatchResult>): void {
  const bp = result.blueprint;
  if (!bp?.capsuleDescription) return;
  console.log(highlight('Workings (capsule description)'));
  console.log(line(60));
  for (const l of bp.capsuleDescription.split('\n')) {
    console.log(muted(`  ${l}`));
  }
  console.log();
}

function printJournal(journal: JournalEntry): void {
  console.log(muted(`    ${journal.description}`));
  for (const l of journal.lines) {
    if (l.debit > 0) {
      console.log(muted(`      Dr ${l.account.padEnd(35)} ${fmt(l.debit)}`));
    }
    if (l.credit > 0) {
      console.log(muted(`      Cr ${l.account.padEnd(35)}          ${fmt(l.credit)}`));
    }
  }
}

// ── Loan ──────────────────────────────────────────────────────────

function printLoanTable(result: LoanResult): void {
  const W = 90;
  console.log();
  console.log(highlight(`Loan Amortization Schedule${currTag(result.currency)}`));
  console.log(line(W));
  console.log(highlight(`  Principal:      ${fmt(result.inputs.principal)}`));
  console.log(highlight(`  Annual Rate:    ${fmtPct(result.inputs.annualRate)}`));
  console.log(highlight(`  Term:           ${result.inputs.termMonths} months`));
  console.log(highlight(`  Monthly PMT:    ${fmt(result.monthlyPayment)}`));
  console.log(line(W));

  const header = [
    'Period'.padStart(6),
    result.inputs.startDate ? 'Date'.padStart(12) : null,
    'Opening'.padStart(14),
    'Payment'.padStart(14),
    'Interest'.padStart(14),
    'Principal'.padStart(14),
    'Closing'.padStart(14),
  ].filter(Boolean).join('  ');

  console.log(muted(header));
  console.log(line(W));

  for (const row of result.schedule) {
    const cols = [
      String(row.period).padStart(6),
      row.date ? row.date.padStart(12) : null,
      fmtR(row.openingBalance),
      fmtR(row.payment),
      fmtR(row.interest),
      fmtR(row.principal),
      fmtR(row.closingBalance),
    ].filter(Boolean).join('  ');
    console.log(cols);
  }

  console.log(line(W));
  const totalCols = [
    'TOTAL'.padStart(6),
    result.inputs.startDate ? ''.padStart(12) : null,
    ''.padStart(14),
    fmtR(result.totalPayments),
    fmtR(result.totalInterest),
    fmtR(result.totalPrincipal),
    fmtR(0),
  ].filter(Boolean).join('  ');
  console.log(highlight(totalCols));
  console.log();

  console.log(highlight('Journal Entries'));
  console.log(line(60));
  console.log(muted('  Disbursement:'));
  console.log(muted(`    Dr Cash / Bank Account${' '.repeat(14)}${fmt(result.inputs.principal)}`));
  console.log(muted(`    Cr Loan Payable${' '.repeat(21)}     ${fmt(result.inputs.principal)}`));
  console.log();
  console.log(muted(`  Per period (example — Month 1):`));
  printJournal(result.schedule[0].journal);
  console.log();
  printWorkings(result);
}

// ── Lease ─────────────────────────────────────────────────────────

function printLeaseTable(result: LeaseResult): void {
  const W = 90;
  const hp = result.isHirePurchase;
  const title = hp ? 'Hire Purchase Schedule (IFRS 16)' : 'IFRS 16 Lease Schedule';
  console.log();
  console.log(highlight(`${title}${currTag(result.currency)}`));
  console.log(line(W));
  console.log(highlight(`  Monthly Payment:     ${fmt(result.inputs.monthlyPayment)}`));
  console.log(highlight(`  Lease Term:          ${result.inputs.termMonths} months`));
  if (hp) {
    console.log(highlight(`  Useful Life:         ${result.depreciationMonths} months`));
  }
  console.log(highlight(`  Discount Rate (IBR): ${fmtPct(result.inputs.annualRate)}`));
  console.log(highlight(`  Present Value:       ${fmt(result.presentValue)}`));
  console.log(highlight(`  Monthly ROU Dep:     ${fmt(result.monthlyRouDepreciation)}${hp ? ` (over ${result.depreciationMonths} months, not ${result.inputs.termMonths})` : ''}`));
  console.log(line(W));

  console.log(highlight('\nInitial Recognition'));
  printJournal(result.initialJournal);

  console.log(highlight('\nLiability Unwinding Schedule'));
  const header = [
    'Period'.padStart(6),
    result.inputs.startDate ? 'Date'.padStart(12) : null,
    'Opening'.padStart(14),
    'Payment'.padStart(14),
    'Interest'.padStart(14),
    'Principal'.padStart(14),
    'Closing'.padStart(14),
  ].filter(Boolean).join('  ');

  console.log(muted(header));
  console.log(line(W));

  for (const row of result.schedule) {
    const cols = [
      String(row.period).padStart(6),
      row.date ? row.date.padStart(12) : null,
      fmtR(row.openingBalance),
      fmtR(row.payment),
      fmtR(row.interest),
      fmtR(row.principal),
      fmtR(row.closingBalance),
    ].filter(Boolean).join('  ');
    console.log(cols);
  }

  console.log(line(W));
  const totalCols = [
    'TOTAL'.padStart(6),
    result.inputs.startDate ? ''.padStart(12) : null,
    ''.padStart(14),
    fmtR(result.totalCashPayments),
    fmtR(result.totalInterest),
    fmtR(result.presentValue),
    fmtR(0),
  ].filter(Boolean).join('  ');
  console.log(highlight(totalCols));
  console.log();

  console.log(highlight('Monthly ROU Depreciation'));
  console.log(muted(`  Dr Depreciation Expense — ROU${' '.repeat(8)}${fmt(result.monthlyRouDepreciation)}`));
  console.log(muted(`  Cr Accumulated Depreciation — ROU${' '.repeat(4)}     ${fmt(result.monthlyRouDepreciation)}`));
  console.log();

  console.log(highlight('Summary'));
  console.log(`  Total cash payments:    ${fmt(result.totalCashPayments)}`);
  console.log(`  Total interest expense: ${fmt(result.totalInterest)}`);
  console.log(`  Total ROU depreciation: ${fmt(result.totalDepreciation)}`);
  console.log(`  Total P&L impact:       ${fmt(result.totalInterest + result.totalDepreciation)}`);
  console.log();
  printWorkings(result);
}

// ── Depreciation ──────────────────────────────────────────────────

function printDepreciationTable(result: DepreciationResult): void {
  const isSL = result.inputs.method === 'sl';
  const isMonthly = result.inputs.frequency === 'monthly';
  const periodLabel = isMonthly ? 'Month' : 'Year';
  const methodLabel = result.inputs.method.toUpperCase();

  const W = isSL ? 72 : 100;
  console.log();
  console.log(highlight(`${isSL ? 'Straight-Line' : 'Declining Balance'} Depreciation Schedule${isSL ? '' : ` (${methodLabel})`}${currTag(result.currency)}`));
  console.log(line(W));
  console.log(highlight(`  Asset Cost:     ${fmt(result.inputs.cost)}`));
  console.log(highlight(`  Salvage Value:  ${fmt(result.inputs.salvageValue)}`));
  console.log(highlight(`  Useful Life:    ${result.inputs.usefulLifeYears} years`));
  if (!isSL) {
    const mult = result.inputs.method === 'ddb' ? 2 : 1.5;
    console.log(highlight(`  Method:         ${methodLabel} (${mult} / ${result.inputs.usefulLifeYears} = ${(mult / result.inputs.usefulLifeYears * 100).toFixed(1)}% per year)`));
  }
  console.log(line(W));

  if (isSL) {
    // Straight-line: simpler table — no DDB/SL comparison columns
    const header = [
      periodLabel.padStart(6),
      'Opening BV'.padStart(14),
      'Depreciation'.padStart(14),
      'Closing BV'.padStart(14),
    ].join('  ');
    console.log(muted(header));
    console.log(line(W));

    for (const row of result.schedule) {
      const cols = [
        String(row.period).padStart(6),
        fmtR(row.openingBookValue),
        fmtR(row.depreciation),
        fmtR(row.closingBookValue),
      ].join('  ');
      console.log(cols);
    }
  } else {
    // DDB/150DB: full comparison table
    const header = [
      periodLabel.padStart(6),
      'Opening BV'.padStart(14),
      'DDB'.padStart(14),
      'SL'.padStart(14),
      'Method'.padStart(8),
      'Depreciation'.padStart(14),
      'Closing BV'.padStart(14),
    ].join('  ');
    console.log(muted(header));
    console.log(line(W));

    for (const row of result.schedule) {
      const cols = [
        String(row.period).padStart(6),
        fmtR(row.openingBookValue),
        fmtR(row.ddbAmount),
        fmtR(row.slAmount),
        row.methodUsed.padStart(8),
        fmtR(row.depreciation),
        fmtR(row.closingBookValue),
      ].join('  ');
      console.log(cols);
    }
  }

  console.log(line(W));
  console.log(highlight(`  Total depreciation: ${fmt(result.totalDepreciation)}  (cost ${fmt(result.inputs.cost)} − salvage ${fmt(result.inputs.salvageValue)})`));
  console.log();

  console.log(highlight('Journal Entry (per period)'));
  printJournal(result.schedule[0].journal);
  console.log();
  printWorkings(result);
}

// ── Prepaid Expense / Deferred Revenue ────────────────────────────

function printRecognitionTable(result: PrepaidExpenseResult | DeferredRevenueResult): void {
  const isPrepaid = result.type === 'prepaid-expense';
  const title = isPrepaid
    ? 'Prepaid Expense Recognition Schedule'
    : 'Deferred Revenue Recognition Schedule';
  const amountLabel = isPrepaid ? 'Prepaid Amount' : 'Deferred Amount';

  const W = 60;
  console.log();
  console.log(highlight(`${title}${currTag(result.currency)}`));
  console.log(line(W));
  console.log(highlight(`  ${amountLabel}:  ${fmt(result.inputs.amount)}`));
  console.log(highlight(`  Periods:        ${result.inputs.periods} (${result.inputs.frequency})`));
  console.log(highlight(`  Per Period:     ${fmt(result.perPeriodAmount)}`));
  console.log(line(W));

  const recognizedLabel = isPrepaid ? 'Expensed' : 'Recognized';
  const header = [
    'Period'.padStart(6),
    result.inputs.startDate ? 'Date'.padStart(12) : null,
    recognizedLabel.padStart(14),
    'Remaining'.padStart(14),
  ].filter(Boolean).join('  ');

  console.log(muted(header));
  console.log(line(W));

  for (const row of result.schedule) {
    const cols = [
      String(row.period).padStart(6),
      row.date ? row.date.padStart(12) : null,
      fmtR(row.amortized),
      fmtR(row.remainingBalance),
    ].filter(Boolean).join('  ');
    console.log(cols);
  }

  console.log(line(W));
  console.log();

  console.log(highlight('Journal Entry (per period)'));
  printJournal(result.schedule[0].journal);
  console.log();
  printWorkings(result);
}

// ── FX Revaluation ────────────────────────────────────────────────

function printFxRevalTable(result: FxRevalResult): void {
  const W = 70;
  const ccy = result.currency ?? 'FCY';
  const base = result.inputs.baseCurrency;

  console.log();
  console.log(highlight(`FX Revaluation — IAS 21`));
  console.log(line(W));
  console.log(highlight(`  Foreign Currency:      ${ccy}`));
  console.log(highlight(`  Base Currency:         ${base}`));
  console.log(highlight(`  Amount Outstanding:    ${ccy} ${fmt(result.inputs.amount)}`));
  console.log(highlight(`  Book Rate:             ${result.inputs.bookRate}`));
  console.log(highlight(`  Closing Rate:          ${result.inputs.closingRate}`));
  console.log(line(W));

  console.log();
  console.log(`  Book Value (${base}):      ${fmt(result.bookValue)}  (${ccy} ${fmt(result.inputs.amount)} × ${result.inputs.bookRate})`);
  console.log(`  Closing Value (${base}):   ${fmt(result.closingValue)}  (${ccy} ${fmt(result.inputs.amount)} × ${result.inputs.closingRate})`);
  console.log(line(W));

  const label = result.isGain ? success('Unrealized GAIN') : danger('Unrealized LOSS');
  console.log(`  ${label}:  ${base} ${fmt(Math.abs(result.gainOrLoss))}`);
  console.log();

  console.log(highlight('Revaluation Journal'));
  printJournal(result.journal);
  console.log();

  console.log(highlight('Day 1 Reversal'));
  printJournal(result.reversalJournal);
  console.log();
  printWorkings(result);
}

// ── ECL Provision ─────────────────────────────────────────────────

function printEclTable(result: EclResult): void {
  const W = 75;

  console.log();
  console.log(highlight(`Expected Credit Loss — IFRS 9 Provision Matrix${currTag(result.currency)}`));
  console.log(line(W));

  // Provision matrix table
  const header = [
    'Aging Bucket'.padEnd(16),
    'Balance'.padStart(14),
    'Loss Rate'.padStart(10),
    'ECL'.padStart(14),
  ].join('  ');

  console.log(muted(header));
  console.log(line(W));

  for (const row of result.bucketDetails) {
    const cols = [
      row.bucket.padEnd(16),
      fmtR(row.balance),
      `${row.lossRate}%`.padStart(10),
      fmtR(row.ecl),
    ].join('  ');
    console.log(cols);
  }

  console.log(line(W));
  const totalCols = [
    'TOTAL'.padEnd(16),
    fmtR(result.totalReceivables),
    `${result.weightedRate}%`.padStart(10),
    fmtR(result.totalEcl),
  ].join('  ');
  console.log(highlight(totalCols));
  console.log();

  // Adjustment summary
  console.log(highlight('Provision Adjustment'));
  console.log(`  Required provision:    ${fmt(result.totalEcl)}`);
  console.log(`  Existing provision:    ${fmt(result.inputs.existingProvision)}`);
  console.log(line(45));

  const adjLabel = result.isIncrease
    ? warning(`Increase needed`)
    : success(`Release available`);
  console.log(`  ${adjLabel}:  ${fmt(Math.abs(result.adjustmentRequired))}`);
  console.log();

  console.log(highlight('Journal Entry'));
  printJournal(result.journal);
  console.log();
  printWorkings(result);
}

// ── Provision PV Unwinding ────────────────────────────────────────

function printProvisionTable(result: ProvisionResult): void {
  const W = 80;

  console.log();
  console.log(highlight(`IAS 37 Provision — PV Measurement & Unwinding${currTag(result.currency)}`));
  console.log(line(W));
  console.log(highlight(`  Nominal Outflow:  ${fmt(result.nominalAmount)}`));
  console.log(highlight(`  Discount Rate:    ${fmtPct(result.inputs.annualRate)}`));
  console.log(highlight(`  Settlement Term:  ${result.inputs.termMonths} months`));
  console.log(highlight(`  Present Value:    ${fmt(result.presentValue)}`));
  console.log(highlight(`  Total Unwinding:  ${fmt(result.totalUnwinding)}`));
  console.log(line(W));

  console.log(highlight('\nInitial Recognition'));
  printJournal(result.initialJournal);

  console.log(highlight('\nDiscount Unwinding Schedule'));
  const header = [
    'Period'.padStart(6),
    result.inputs.startDate ? 'Date'.padStart(12) : null,
    'Opening'.padStart(14),
    'Unwinding'.padStart(14),
    'Closing'.padStart(14),
  ].filter(Boolean).join('  ');

  console.log(muted(header));
  console.log(line(W));

  for (const row of result.schedule) {
    const cols = [
      String(row.period).padStart(6),
      row.date ? row.date.padStart(12) : null,
      fmtR(row.openingBalance),
      fmtR(row.interest),
      fmtR(row.closingBalance),
    ].filter(Boolean).join('  ');
    console.log(cols);
  }

  console.log(line(W));
  const finalRow = result.schedule[result.schedule.length - 1];
  console.log(highlight(`  Final provision balance: ${fmt(finalRow.closingBalance)}  (= nominal outflow)`));
  console.log();

  console.log(highlight('Summary'));
  console.log(`  Initial recognition (PV):  ${fmt(result.presentValue)}`);
  console.log(`  Total unwinding (P&L):     ${fmt(result.totalUnwinding)}`);
  console.log(`  Nominal outflow:           ${fmt(result.nominalAmount)}`);
  console.log();

  console.log(highlight('Journal Entry (per period)'));
  printJournal(result.schedule[0].journal);
  console.log();
  printWorkings(result);
}

// ── Fixed Deposit ────────────────────────────────────────────────

function printFixedDepositTable(result: FixedDepositResult): void {
  const W = 75;
  console.log();
  console.log(highlight(`Fixed Deposit — Interest Accrual Schedule${currTag(result.currency)}`));
  console.log(line(W));
  console.log(highlight(`  Principal:      ${fmt(result.inputs.principal)}`));
  console.log(highlight(`  Annual Rate:    ${fmtPct(result.inputs.annualRate)}`));
  console.log(highlight(`  Term:           ${result.inputs.termMonths} months`));
  console.log(highlight(`  Compounding:    ${result.inputs.compounding}`));
  console.log(highlight(`  Total Interest: ${fmt(result.totalInterest)}`));
  console.log(highlight(`  Maturity Value: ${fmt(result.maturityValue)}`));
  if (result.inputs.compounding !== 'none') {
    console.log(highlight(`  Effective Rate: ${result.effectiveRate}% p.a.`));
  }
  console.log(line(W));

  const header = [
    'Period'.padStart(6),
    result.inputs.startDate ? 'Date'.padStart(12) : null,
    'Carrying Amt'.padStart(14),
    'Interest'.padStart(14),
    result.inputs.compounding !== 'none' ? 'New Balance'.padStart(14) : null,
  ].filter(Boolean).join('  ');

  console.log(muted(header));
  console.log(line(W));

  for (const row of result.schedule) {
    const cols = [
      String(row.period).padStart(6),
      row.date ? row.date.padStart(12) : null,
      fmtR(row.openingBalance),
      fmtR(row.interest),
      result.inputs.compounding !== 'none' ? fmtR(row.closingBalance) : null,
    ].filter(Boolean).join('  ');
    console.log(cols);
  }

  console.log(line(W));
  console.log(highlight(`  Total interest: ${fmt(result.totalInterest)}`));
  console.log();

  console.log(highlight('Journal Entries'));
  console.log(line(60));
  console.log(muted('  Placement:'));
  printJournal(result.placementJournal);
  console.log();
  console.log(muted('  Monthly accrual (example — Month 1):'));
  printJournal(result.schedule[0].journal);
  console.log();
  console.log(muted('  Maturity:'));
  printJournal(result.maturityJournal);
  console.log();
  printWorkings(result);
}

// ── Asset Disposal ───────────────────────────────────────────────

function printAssetDisposalTable(result: AssetDisposalResult): void {
  const W = 60;
  console.log();
  console.log(highlight(`Asset Disposal — IAS 16${currTag(result.currency)}`));
  console.log(line(W));
  console.log(highlight(`  Asset Cost:         ${fmt(result.inputs.cost)}`));
  console.log(highlight(`  Salvage Value:      ${fmt(result.inputs.salvageValue)}`));
  console.log(highlight(`  Useful Life:        ${result.inputs.usefulLifeYears} years`));
  console.log(highlight(`  Method:             ${result.inputs.method.toUpperCase()}`));
  console.log(highlight(`  Acquired:           ${result.inputs.acquisitionDate}`));
  console.log(highlight(`  Disposed:           ${result.inputs.disposalDate}`));
  console.log(highlight(`  Months Held:        ${result.monthsHeld}`));
  console.log(line(W));

  console.log();
  console.log(`  Accumulated Depreciation:  ${fmt(result.accumulatedDepreciation)}`);
  console.log(`  Net Book Value:            ${fmt(result.netBookValue)}`);
  console.log(`  Disposal Proceeds:         ${fmt(result.inputs.proceeds)}`);
  console.log(line(W));

  const label = result.isGain
    ? (result.gainOrLoss > 0 ? success('GAIN on Disposal') : 'AT BOOK VALUE')
    : danger('LOSS on Disposal');
  console.log(`  ${label}:  ${fmt(Math.abs(result.gainOrLoss))}`);
  console.log();

  console.log(highlight('Disposal Journal'));
  printJournal(result.disposalJournal);
  console.log();
  printWorkings(result);
}

// ── Bank Match ───────────────────────────────────────────────────

const confidenceColor = (c: string): string => {
  switch (c) {
    case 'exact': return success(c);
    case 'high': return info(c);
    case 'medium': return warning(c);
    case 'low': return danger(c);
    default: return c;
  }
};

const matchTypeLabel = (t: string): string => {
  switch (t) {
    case '1:1': return '1:1';
    case 'N:1': return 'N:1 (batch)';
    case '1:N': return '1:N (split)';
    case 'N:M': return 'N:M (complex)';
    default: return t;
  }
};

function printMatchProposal(proposal: MatchProposal, index: number): void {
  const W = 80;
  const header = `  #${index + 1}  ${matchTypeLabel(proposal.matchType)}  ${confidenceColor(proposal.confidence)}  score: ${proposal.score.toFixed(2)}`;
  console.log(highlight(header));

  // Bank records
  for (const r of proposal.bankRecords) {
    console.log(muted(`    Bank:  ${r.id.substring(0, 20).padEnd(20)}  ${fmt(r.amount).padStart(14)}  ${r.date}`));
  }
  // Transactions
  for (const t of proposal.transactions) {
    console.log(muted(`    Txn:   ${t.id.substring(0, 20).padEnd(20)}  ${fmt(t.amount).padStart(14)}  ${t.date}`));
  }

  // Variance + signals
  const parts: string[] = [];
  if (proposal.variance !== 0) parts.push(`var: ${fmt(proposal.variance)}`);
  if (proposal.fxVariance) parts.push(`fx-var: ${fmt(proposal.fxVariance)}`);
  parts.push(`signals: text=${proposal.signals.text.toFixed(2)} date=${proposal.signals.date.toFixed(2)} type=${proposal.signals.type.toFixed(2)}`);
  console.log(muted(`    ${parts.join('  |  ')}`));
  console.log(muted(`    ${proposal.reason}`));
  console.log(line(W));
}

function printBankMatchTable(result: BankMatchResult): void {
  const W = 80;
  console.log();
  console.log(highlight(`Bank Reconciliation Match Results${currTag(result.currency)}`));
  console.log(line(W));
  console.log(highlight(`  Records:       ${result.inputs.recordCount}`));
  console.log(highlight(`  Transactions:  ${result.inputs.transactionCount}`));
  console.log(highlight(`  Tolerance:     ${result.inputs.tolerance}`));
  console.log(highlight(`  Date Window:   ${result.inputs.dateWindowDays} days`));
  console.log(highlight(`  Max Group:     ${result.inputs.maxGroupSize}`));
  console.log(line(W));

  // Summary bar
  const s = result.summary;
  const rate = s.matchRate;
  const barLen = 30;
  const filled = Math.round(barLen * rate / 100);
  const bar = success('█'.repeat(filled)) + muted('░'.repeat(barLen - filled));
  console.log(`  Match Rate:  ${bar}  ${rate}%`);
  console.log();

  // Breakdown
  console.log(highlight('  Match Breakdown'));
  if (s.matched1to1 > 0) console.log(`    1:1 exact/fuzzy:  ${s.matched1to1}`);
  if (s.matchedNto1 > 0) console.log(`    N:1 batch:        ${s.matchedNto1}`);
  if (s.matched1toN > 0) console.log(`    1:N split:        ${s.matched1toN}`);
  if (s.matchedNtoM > 0) console.log(`    N:M complex:      ${s.matchedNtoM}`);
  console.log(`    Unmatched records:  ${s.unmatchedRecordCount}  (${fmt(s.totalUnmatchedAmount)})`);
  console.log(`    Unmatched txns:     ${s.unmatchedTransactionCount}`);
  console.log(line(W));

  // Match proposals sorted by confidence
  if (result.matches.length > 0) {
    console.log();
    console.log(highlight(`  Match Proposals (${result.matches.length} total — sorted by confidence)`));
    console.log(line(W));

    for (let i = 0; i < result.matches.length; i++) {
      printMatchProposal(result.matches[i], i);
    }
  }

  // Unmatched items
  if (result.unmatchedRecords.length > 0) {
    console.log();
    console.log(highlight(`  Unmatched Bank Records (${result.unmatchedRecords.length})`));
    console.log(line(W));
    for (const r of result.unmatchedRecords) {
      console.log(muted(`    ${(r.id ?? '').substring(0, 20).padEnd(20)}  ${fmt(r.amount).padStart(14)}  ${r.date}  ${r.contact ?? ''}  ${r.description ?? ''}`));
    }
  }

  if (result.unmatchedTransactions.length > 0) {
    console.log();
    console.log(highlight(`  Unmatched Transactions (${result.unmatchedTransactions.length})`));
    console.log(line(W));
    for (const t of result.unmatchedTransactions) {
      console.log(muted(`    ${(t.id ?? '').substring(0, 20).padEnd(20)}  ${fmt(t.amount).padStart(14)}  ${t.date}  ${t.direction}  ${t.contact ?? ''}`));
    }
  }

  // Timing + workings
  console.log();
  console.log(highlight('Workings'));
  console.log(line(W));
  for (const l of result.workings.split('\n')) {
    console.log(muted(`  ${l}`));
  }
  console.log();
}

// ── Dispatch ──────────────────────────────────────────────────────

export function printResult(result: CalcResult): void {
  switch (result.type) {
    case 'loan': return printLoanTable(result);
    case 'lease': return printLeaseTable(result);
    case 'depreciation': return printDepreciationTable(result);
    case 'prepaid-expense': return printRecognitionTable(result);
    case 'deferred-revenue': return printRecognitionTable(result);
    case 'fx-reval': return printFxRevalTable(result);
    case 'ecl': return printEclTable(result);
    case 'provision': return printProvisionTable(result);
    case 'fixed-deposit': return printFixedDepositTable(result);
    case 'asset-disposal': return printAssetDisposalTable(result);
    case 'bank-match': return printBankMatchTable(result);
  }
}

export function printJson(result: CalcResult): void {
  console.log(JSON.stringify(result, null, 2));
}
