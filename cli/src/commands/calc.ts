import chalk from 'chalk';
import { Command } from 'commander';
import { calculateLoan } from '../core/calc/loan.js';
import { calculateLease } from '../core/calc/lease.js';
import { calculateDepreciation } from '../core/calc/depreciation.js';
import { calculatePrepaidExpense, calculateDeferredRevenue } from '../core/calc/amortization.js';
import { calculateFxReval } from '../core/calc/fx-reval.js';
import { calculateEcl } from '../core/calc/ecl.js';
import { calculateProvision } from '../core/calc/provision.js';
import { calculateFixedDeposit } from '../core/calc/fixed-deposit.js';
import { calculateAssetDisposal } from '../core/calc/asset-disposal.js';
import { calculateAccruedExpense } from '../core/calc/accrued-expense.js';
import { calculateLeaveAccrual } from '../core/calc/leave-accrual.js';
import { calculateDividend } from '../core/calc/dividend.js';
import { printResult, printJson } from '../core/calc/format.js';
import { CalcValidationError } from '../core/calc/validate.js';

/** Wrap calc action with validation error handling. */
function calcAction(fn: (opts: Record<string, unknown>) => void) {
  return (opts: Record<string, unknown>) => {
    try {
      fn(opts);
    } catch (err) {
      if (err instanceof CalcValidationError) {
        console.error(chalk.red(`Error: ${err.message}`));
        process.exit(1);
      }
      throw err;
    }
  };
}

export function registerCalcCommand(program: Command): void {
  const calc = program
    .command('calc')
    .description('Financial calculators — loan, lease, depreciation, prepaid-expense, deferred-revenue, fx-reval, ecl, provision, fixed-deposit, asset-disposal, accrued-expense, leave-accrual, dividend');

  // ── clio calc loan ──────────────────────────────────────────────
  calc
    .command('loan')
    .description('Loan amortization schedule')
    .requiredOption('--principal <amount>', 'Loan principal', parseFloat)
    .requiredOption('--rate <percent>', 'Annual interest rate (%)', parseFloat)
    .requiredOption('--term <months>', 'Loan term in months', parseInt)
    .option('--start-date <date>', 'Start date (YYYY-MM-DD)')
    .option('--currency <code>', 'Currency code (e.g. SGD, USD)')
    .option('--json', 'Output as JSON')
    .action(calcAction((opts) => {
      const result = calculateLoan({
        principal: opts.principal as number,
        annualRate: opts.rate as number,
        termMonths: opts.term as number,
        startDate: opts.startDate as string | undefined,
        currency: opts.currency as string | undefined,
      });
      opts.json ? printJson(result) : printResult(result);
    }));

  // ── clio calc lease ─────────────────────────────────────────────
  calc
    .command('lease')
    .description('IFRS 16 lease schedule (liability unwinding + ROU depreciation). Add --useful-life for hire purchase.')
    .requiredOption('--payment <amount>', 'Monthly lease payment', parseFloat)
    .requiredOption('--term <months>', 'Lease term in months', parseInt)
    .requiredOption('--rate <percent>', 'Incremental borrowing rate (%)', parseFloat)
    .option('--useful-life <months>', 'Asset useful life in months (hire purchase: depreciate over useful life, not term)', parseInt)
    .option('--start-date <date>', 'Lease commencement date (YYYY-MM-DD)')
    .option('--currency <code>', 'Currency code (e.g. SGD, USD)')
    .option('--json', 'Output as JSON')
    .action(calcAction((opts) => {
      const result = calculateLease({
        monthlyPayment: opts.payment as number,
        termMonths: opts.term as number,
        annualRate: opts.rate as number,
        usefulLifeMonths: opts.usefulLife as number | undefined,
        startDate: opts.startDate as string | undefined,
        currency: opts.currency as string | undefined,
      });
      opts.json ? printJson(result) : printResult(result);
    }));

  // ── clio calc depreciation ──────────────────────────────────────
  calc
    .command('depreciation')
    .description('Depreciation schedule (straight-line, double declining, or 150% declining)')
    .requiredOption('--cost <amount>', 'Asset cost', parseFloat)
    .requiredOption('--salvage <amount>', 'Salvage value', parseFloat)
    .requiredOption('--life <years>', 'Useful life in years', parseInt)
    .option('--method <method>', 'Method: sl, ddb (default), or 150db', 'ddb')
    .option('--frequency <freq>', 'Frequency: annual (default) or monthly', 'annual')
    .option('--currency <code>', 'Currency code (e.g. SGD, USD)')
    .option('--json', 'Output as JSON')
    .action(calcAction((opts) => {
      const result = calculateDepreciation({
        cost: opts.cost as number,
        salvageValue: opts.salvage as number,
        usefulLifeYears: opts.life as number,
        method: opts.method as 'ddb' | '150db' | 'sl',
        frequency: opts.frequency as 'annual' | 'monthly',
        currency: opts.currency as string | undefined,
      });
      opts.json ? printJson(result) : printResult(result);
    }));

  // ── clio calc prepaid-expense ──────────────────────────────────
  calc
    .command('prepaid-expense')
    .description('Prepaid expense recognition schedule (e.g. insurance, rent, subscriptions)')
    .requiredOption('--amount <amount>', 'Total prepaid amount', parseFloat)
    .requiredOption('--periods <count>', 'Number of recognition periods', parseInt)
    .option('--frequency <freq>', 'Frequency: monthly (default) or quarterly', 'monthly')
    .option('--start-date <date>', 'Start date (YYYY-MM-DD)')
    .option('--currency <code>', 'Currency code (e.g. SGD, USD)')
    .option('--json', 'Output as JSON')
    .action(calcAction((opts) => {
      const result = calculatePrepaidExpense({
        amount: opts.amount as number,
        periods: opts.periods as number,
        frequency: opts.frequency as 'monthly' | 'quarterly',
        startDate: opts.startDate as string | undefined,
        currency: opts.currency as string | undefined,
      });
      opts.json ? printJson(result) : printResult(result);
    }));

  // ── clio calc deferred-revenue ───────────────────────────────────
  calc
    .command('deferred-revenue')
    .description('Deferred revenue recognition schedule (e.g. annual contracts, retainers)')
    .requiredOption('--amount <amount>', 'Total deferred amount', parseFloat)
    .requiredOption('--periods <count>', 'Number of recognition periods', parseInt)
    .option('--frequency <freq>', 'Frequency: monthly (default) or quarterly', 'monthly')
    .option('--start-date <date>', 'Start date (YYYY-MM-DD)')
    .option('--currency <code>', 'Currency code (e.g. SGD, USD)')
    .option('--json', 'Output as JSON')
    .action(calcAction((opts) => {
      const result = calculateDeferredRevenue({
        amount: opts.amount as number,
        periods: opts.periods as number,
        frequency: opts.frequency as 'monthly' | 'quarterly',
        startDate: opts.startDate as string | undefined,
        currency: opts.currency as string | undefined,
      });
      opts.json ? printJson(result) : printResult(result);
    }));

  // ── clio calc fx-reval ───────────────────────────────────────────
  calc
    .command('fx-reval')
    .description('FX revaluation — unrealized gain/loss on non-AR/AP foreign currency balances (IAS 21)')
    .requiredOption('--amount <amount>', 'Foreign currency amount outstanding', parseFloat)
    .requiredOption('--book-rate <rate>', 'Original booking exchange rate', parseFloat)
    .requiredOption('--closing-rate <rate>', 'Period-end closing exchange rate', parseFloat)
    .option('--currency <code>', 'Foreign currency code (e.g. USD)', 'USD')
    .option('--base-currency <code>', 'Base (functional) currency code (e.g. SGD)', 'SGD')
    .option('--json', 'Output as JSON')
    .action(calcAction((opts) => {
      const result = calculateFxReval({
        amount: opts.amount as number,
        bookRate: opts.bookRate as number,
        closingRate: opts.closingRate as number,
        currency: opts.currency as string,
        baseCurrency: opts.baseCurrency as string,
      });
      opts.json ? printJson(result) : printResult(result);
    }));

  // ── clio calc ecl ────────────────────────────────────────────────
  calc
    .command('ecl')
    .description('Expected credit loss provision matrix (IFRS 9 simplified approach)')
    .requiredOption('--current <amount>', 'Current (not overdue) receivables balance', parseFloat)
    .requiredOption('--30d <amount>', '1-30 days overdue balance', parseFloat)
    .requiredOption('--60d <amount>', '31-60 days overdue balance', parseFloat)
    .requiredOption('--90d <amount>', '61-90 days overdue balance', parseFloat)
    .requiredOption('--120d <amount>', '91+ days overdue balance', parseFloat)
    .requiredOption('--rates <rates>', 'Loss rates per bucket (comma-separated %)', (v: string) => v.split(',').map(Number))
    .option('--existing-provision <amount>', 'Existing provision balance', parseFloat, 0)
    .option('--currency <code>', 'Currency code (e.g. SGD, USD)')
    .option('--json', 'Output as JSON')
    .action(calcAction((opts) => {
      const rates = opts.rates as number[];
      const result = calculateEcl({
        buckets: [
          { name: 'Current', balance: opts.current as number, rate: rates[0] },
          { name: '1-30 days', balance: opts['30d'] as number, rate: rates[1] },
          { name: '31-60 days', balance: opts['60d'] as number, rate: rates[2] },
          { name: '61-90 days', balance: opts['90d'] as number, rate: rates[3] },
          { name: '91+ days', balance: opts['120d'] as number, rate: rates[4] },
        ],
        existingProvision: opts.existingProvision as number,
        currency: opts.currency as string | undefined,
      });
      opts.json ? printJson(result) : printResult(result);
    }));

  // ── clio calc provision ──────────────────────────────────────────
  calc
    .command('provision')
    .description('IAS 37 provision PV measurement + discount unwinding schedule')
    .requiredOption('--amount <amount>', 'Estimated future cash outflow', parseFloat)
    .requiredOption('--rate <percent>', 'Discount rate (%)', parseFloat)
    .requiredOption('--term <months>', 'Months until expected settlement', parseInt)
    .option('--start-date <date>', 'Recognition date (YYYY-MM-DD)')
    .option('--currency <code>', 'Currency code (e.g. SGD, USD)')
    .option('--json', 'Output as JSON')
    .action(calcAction((opts) => {
      const result = calculateProvision({
        amount: opts.amount as number,
        annualRate: opts.rate as number,
        termMonths: opts.term as number,
        startDate: opts.startDate as string | undefined,
        currency: opts.currency as string | undefined,
      });
      opts.json ? printJson(result) : printResult(result);
    }));

  // ── clio calc fixed-deposit ────────────────────────────────────
  calc
    .command('fixed-deposit')
    .description('Fixed deposit interest accrual schedule (IFRS 9 amortized cost)')
    .requiredOption('--principal <amount>', 'Deposit principal', parseFloat)
    .requiredOption('--rate <percent>', 'Annual interest rate (%)', parseFloat)
    .requiredOption('--term <months>', 'Term in months', parseInt)
    .option('--compound <method>', 'Compounding: none (default), monthly, quarterly, annually', 'none')
    .option('--start-date <date>', 'Placement date (YYYY-MM-DD)')
    .option('--currency <code>', 'Currency code (e.g. SGD, USD)')
    .option('--json', 'Output as JSON')
    .action(calcAction((opts) => {
      const result = calculateFixedDeposit({
        principal: opts.principal as number,
        annualRate: opts.rate as number,
        termMonths: opts.term as number,
        compounding: opts.compound as 'none' | 'monthly' | 'quarterly' | 'annually',
        startDate: opts.startDate as string | undefined,
        currency: opts.currency as string | undefined,
      });
      opts.json ? printJson(result) : printResult(result);
    }));

  // ── clio calc asset-disposal ───────────────────────────────────
  calc
    .command('asset-disposal')
    .description('Fixed asset disposal — gain/loss calculation (IAS 16)')
    .requiredOption('--cost <amount>', 'Original asset cost', parseFloat)
    .requiredOption('--salvage <amount>', 'Salvage value', parseFloat)
    .requiredOption('--life <years>', 'Useful life in years', parseInt)
    .requiredOption('--acquired <date>', 'Acquisition date (YYYY-MM-DD)')
    .requiredOption('--disposed <date>', 'Disposal date (YYYY-MM-DD)')
    .requiredOption('--proceeds <amount>', 'Disposal proceeds (0 for scrap)', parseFloat)
    .option('--method <method>', 'Depreciation method: sl (default), ddb, 150db', 'sl')
    .option('--currency <code>', 'Currency code (e.g. SGD, USD)')
    .option('--json', 'Output as JSON')
    .action(calcAction((opts) => {
      const result = calculateAssetDisposal({
        cost: opts.cost as number,
        salvageValue: opts.salvage as number,
        usefulLifeYears: opts.life as number,
        acquisitionDate: opts.acquired as string,
        disposalDate: opts.disposed as string,
        proceeds: opts.proceeds as number,
        method: opts.method as 'sl' | 'ddb' | '150db',
        currency: opts.currency as string | undefined,
      });
      opts.json ? printJson(result) : printResult(result);
    }));

  // ── clio calc accrued-expense ─────────────────────────────────
  calc
    .command('accrued-expense')
    .description('Accrued expense schedule — dual-entry accrual + reversal (IAS 1)')
    .requiredOption('--amount <amount>', 'Estimated accrual amount per period', parseFloat)
    .requiredOption('--periods <count>', 'Number of accrual periods', parseInt)
    .option('--frequency <freq>', 'Frequency: monthly (default) or quarterly', 'monthly')
    .option('--start-date <date>', 'First accrual date (YYYY-MM-DD)')
    .option('--currency <code>', 'Currency code (e.g. SGD, USD)')
    .option('--json', 'Output as JSON')
    .action(calcAction((opts) => {
      const result = calculateAccruedExpense({
        amount: opts.amount as number,
        periods: opts.periods as number,
        frequency: opts.frequency as 'monthly' | 'quarterly',
        startDate: opts.startDate as string | undefined,
        currency: opts.currency as string | undefined,
      });
      opts.json ? printJson(result) : printResult(result);
    }));

  // ── clio calc leave-accrual ───────────────────────────────────
  calc
    .command('leave-accrual')
    .description('Employee leave accrual schedule (IAS 19) — monthly accrual of annual leave entitlements')
    .requiredOption('--employees <count>', 'Number of employees', parseInt)
    .requiredOption('--days <days>', 'Leave days per employee per year', parseInt)
    .requiredOption('--daily-rate <amount>', 'Average daily rate (cost per day)', parseFloat)
    .option('--periods <count>', 'Months to accrue (default 12)', parseInt, 12)
    .option('--start-date <date>', 'First accrual date (YYYY-MM-DD)')
    .option('--currency <code>', 'Currency code (e.g. SGD, USD)')
    .option('--json', 'Output as JSON')
    .action(calcAction((opts) => {
      const result = calculateLeaveAccrual({
        employees: opts.employees as number,
        daysPerYear: opts.days as number,
        dailyRate: opts.dailyRate as number,
        periods: opts.periods as number,
        startDate: opts.startDate as string | undefined,
        currency: opts.currency as string | undefined,
      });
      opts.json ? printJson(result) : printResult(result);
    }));

  // ── clio calc dividend ────────────────────────────────────────
  calc
    .command('dividend')
    .description('Dividend declaration + payment schedule — optional withholding tax')
    .requiredOption('--amount <amount>', 'Declared dividend amount', parseFloat)
    .requiredOption('--declaration-date <date>', 'Board resolution date (YYYY-MM-DD)')
    .requiredOption('--payment-date <date>', 'Settlement date (YYYY-MM-DD)')
    .option('--withholding-rate <percent>', 'Withholding tax rate (%)', parseFloat, 0)
    .option('--currency <code>', 'Currency code (e.g. SGD, USD)')
    .option('--json', 'Output as JSON')
    .action(calcAction((opts) => {
      const result = calculateDividend({
        amount: opts.amount as number,
        declarationDate: opts.declarationDate as string,
        paymentDate: opts.paymentDate as string,
        withholdingRate: opts.withholdingRate as number,
        currency: opts.currency as string | undefined,
      });
      opts.json ? printJson(result) : printResult(result);
    }));

}
