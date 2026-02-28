/**
 * clio capsule-transaction — Execute IFRS-compliant transaction recipes.
 *
 * Each subcommand runs a financial calculator, creates a capsule, and posts
 * all transactions in one shot. Two entry paths:
 *
 *   Full:   provide --input (account mapping) → creates everything from scratch
 *   Attach: provide --existing-txn <id>       → skip the initial transaction, create delta only
 *
 * Plan mode (--plan): offline, no auth — shows required accounts and step summary.
 */

import chalk from 'chalk';
import { Command } from 'commander';
import { apiAction } from './api-action.js';
import { readBodyInput } from './parsers.js';
import { resolveContactFlag, resolveBankAccountFlag, autoResolveAccountMap } from './resolve.js';
import { CalcValidationError } from '../core/calc/validate.js';
import { planRecipe, extractBlueprint } from '../core/recipe/plan.js';
import { executeRecipe } from '../core/recipe/engine.js';
import { runCalculator } from '../core/recipe/dispatch.js';
import type { CalcResult } from '../core/calc/types.js';
import type { JazClient } from '../core/api/client.js';
import type { AuthConfig } from '../core/auth/index.js';

// ── Shared options & action builders ─────────────────────────────

/** Add the shared recipe options to any subcommand. */
function addRecipeOptions(cmd: Command): Command {
  return cmd
    .option('--plan', 'Plan mode — show required accounts and step summary (offline, no auth)')
    .option('--input <file>', 'Account mapping JSON file (optional — auto-resolves from chart of accounts if omitted)')
    .option('--bank-account <id>', 'Bank/cash account name or resourceId (for cash-in/cash-out steps)')
    .option('--contact <id>', 'Contact name or resourceId — supplier for bills, customer for invoices')
    .option('--existing-txn <id>', 'Attach to existing transaction — skip initial step, create delta only')
    .option('--ref <prefix>', 'Reference prefix (generates prefix-1, prefix-2, ...)')
    .option('--finalize', 'Approve transactions immediately (default: create as drafts)')
    .option('--json', 'Output as JSON')
    .option('--api-key <key>', 'API key override');
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RecipeOpts = Record<string, any>;

/**
 * Shared action handler for all capsule-transaction subcommands.
 * Wraps the calc -> plan/execute flow with validation + error handling.
 *
 * Key: validation and entity resolution happen INSIDE apiAction callback
 * so we have access to the authenticated JazClient for auto-resolve.
 *
 * Two signatures:
 *   recipeAction(calcType, paramsFn) — uses dispatcher (preferred for DRY)
 *   recipeAction(calcType, calcFn)   — legacy, accepts any calc function
 */
function recipeAction(
  calcType: string,
  calcFn: (opts: RecipeOpts) => CalcResult,
) {
  return async (opts: RecipeOpts) => {
    try {
      // Run the calculator (offline, always)
      const calcResult = calcFn(opts);

      // ── Plan mode (offline, no auth) ──────────────────────────
      if (opts.plan) {
        const plan = planRecipe(calcType, calcResult);
        if (opts.json) {
          console.log(JSON.stringify(plan, null, 2));
        } else {
          printPlanHuman(plan);
        }
        return;
      }

      // ── Execute mode (needs auth) ─────────────────────────────
      const blueprint = extractBlueprint(calcResult);
      if (!blueprint) {
        console.error(chalk.red('Error: no blueprint generated. Provide --start-date to enable blueprint.'));
        process.exit(1);
      }

      // Defer to apiAction — resolution + execution happen inside with client access
      const executeWithAuth = apiAction<RecipeOpts>(
        async (client: JazClient, execOpts: RecipeOpts, _auth: AuthConfig) => {
          const silent = !!execOpts.json;

          // Resolve account mapping: --input file or auto-resolve from CoA
          let accountMap: Record<string, string>;
          const body = readBodyInput(execOpts);
          if (body) {
            accountMap = body as Record<string, string>;
          } else {
            // Auto-resolve all blueprint accounts from chart of accounts
            const plan = planRecipe(calcType, calcResult);
            if (!silent) {
              process.stderr.write(chalk.dim('  Auto-resolving accounts from chart of accounts...\n'));
            }
            accountMap = await autoResolveAccountMap(client, plan.plan.requiredAccounts, { silent });
          }

          // Resolve --contact by name if provided
          if (execOpts.contact) {
            const resolved = await resolveContactFlag(client, execOpts.contact, { silent });
            execOpts.contact = resolved.resourceId;
          }

          // Resolve --bank-account by name if provided
          if (execOpts.bankAccount) {
            const resolved = await resolveBankAccountFlag(client, execOpts.bankAccount, { silent });
            execOpts.bankAccount = resolved.resourceId;
          }

          const result = await executeRecipe(client, {
            blueprint,
            calcType,
            accountMap,
            bankAccountId: execOpts.bankAccount,
            contactId: execOpts.contact,
            existingTxnId: execOpts.existingTxn,
            referencePrefix: execOpts.ref,
            finalize: execOpts.finalize,
          });

          if (execOpts.json) {
            console.log(JSON.stringify(result, null, 2));
          } else {
            printResultHuman(result);
          }
        },
      );

      await executeWithAuth(opts);
    } catch (err) {
      if (err instanceof CalcValidationError || (err instanceof Error && err.message.includes('blueprint'))) {
        console.error(chalk.red('Error: ' + (err as Error).message));
        process.exit(1);
      }
      throw err;
    }
  };
}

// ── Human-readable output ────────────────────────────────────────

function printPlanHuman(plan: ReturnType<typeof planRecipe>): void {
  console.log(chalk.bold('\nCapsule Transaction Plan: ' + plan.recipe + '\n'));
  console.log('  Capsule Type:  ' + plan.plan.capsuleType);
  console.log('  Capsule Name:  ' + plan.plan.capsuleName);
  console.log('  Total Steps:   ' + plan.plan.steps.total);
  console.log('  Step Breakdown:');
  for (const [action, count] of Object.entries(plan.plan.steps.byAction)) {
    console.log('    ' + action + ': ' + count);
  }
  console.log('\n  Required Accounts:');
  for (const acct of plan.plan.requiredAccounts) {
    console.log('    - ' + acct);
  }
  if (plan.plan.needsBankAccount) {
    console.log(chalk.yellow('\n  Needs --bank-account (cash-in/cash-out steps present)'));
  }
  if (plan.plan.needsContact) {
    console.log(chalk.yellow('  Needs --contact (bill/invoice steps present)'));
  }
  console.log(chalk.dim('\n  Add --json for full output with calculator results.'));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function printResultHuman(result: any): void {
  console.log(chalk.bold('\nCapsule Transaction: ' + result.recipe));
  console.log('  Capsule: ' + result.capsule.title + ' (' + result.capsule.resourceId + ')');
  console.log('  Type:    ' + result.capsule.type + '\n');
  console.log('  Steps:');
  for (const step of result.steps) {
    const icon = step.status === 'created' ? chalk.green('\u2713')
      : step.status === 'existing' ? chalk.blue('\u21B3')
      : step.status === 'error' ? chalk.red('\u2717')
      : chalk.dim('\u2013');
    const id = step.resourceId ? chalk.dim(' (' + step.resourceId + ')') : '';
    console.log('    ' + icon + ' Step ' + step.step + ': ' + step.action + ' \u2014 ' + step.description + id);
    if (step.error) console.log(chalk.red('      Error: ' + step.error));
  }
  console.log('\n  Summary: ' + result.summary.created + ' created, ' + result.summary.existing + ' existing, ' + result.summary.skipped + ' skipped, ' + result.summary.errors + ' errors');
  if (result.summary.notes.length > 0) {
    console.log('\n  Notes:');
    for (const note of result.summary.notes) {
      console.log('    ' + chalk.dim(note));
    }
  }
}

// ── Command Registration ─────────────────────────────────────────

export function registerRecipeCommand(program: Command): void {
  const capsuleTxn = program
    .command('capsule-transaction')
    .alias('ct')
    .description(
      'Capsule transactions \u2014 run a financial calculator, create a capsule, and post all entries in one command.\n' +
      '  Two paths: full (--input) creates everything, attach (--existing-txn) starts from an existing transaction.\n' +
      '  Plan mode (--plan) shows requirements without auth.\n' +
      '  Recipes: loan, lease, depreciation, prepaid-expense, deferred-revenue, fx-reval, ecl, provision, fixed-deposit, asset-disposal, accrued-expense, leave-accrual, dividend',
    );

  // ── loan ─────────────────────────────────────────────────────
  addRecipeOptions(
    capsuleTxn
      .command('loan')
      .description(
        'Loan amortization capsule \u2014 disbursement (cash-in) + monthly payment journals.\n' +
        '  Accounts needed: Cash / Bank Account, Loan Payable, Interest Expense.\n' +
        '  Attach: --existing-txn <cash-in-id> to skip disbursement.',
      )
      .requiredOption('--principal <amount>', 'Loan principal', parseFloat)
      .requiredOption('--rate <percent>', 'Annual interest rate (%)', parseFloat)
      .requiredOption('--term <months>', 'Loan term in months', parseInt)
      .option('--start-date <date>', 'Start date (YYYY-MM-DD) \u2014 required for execute mode')
      .option('--currency <code>', 'Currency code (e.g. SGD, USD)'),
  ).action(
    recipeAction('loan', (opts) =>
      runCalculator('loan', {
        principal: opts.principal,
        rate: opts.rate,
        term: opts.term,
        startDate: opts.startDate,
        currency: opts.currency,
      }),
    ),
  );

  // ── lease ────────────────────────────────────────────────────
  addRecipeOptions(
    capsuleTxn
      .command('lease')
      .description(
        'IFRS 16 lease capsule \u2014 initial ROU recognition journal + monthly liability unwinding.\n' +
        '  Add --useful-life for hire purchase (depreciate over useful life, not lease term).\n' +
        '  Accounts needed: Right-of-Use Asset, Lease Liability, Interest Expense \u2014 Leases, Cash.\n' +
        '  Note: FA registration step is output as a manual instruction.\n' +
        '  Attach: --existing-txn <journal-id> to skip initial recognition.',
      )
      .requiredOption('--payment <amount>', 'Monthly lease payment', parseFloat)
      .requiredOption('--term <months>', 'Lease term in months', parseInt)
      .requiredOption('--rate <percent>', 'Incremental borrowing rate (%)', parseFloat)
      .option('--useful-life <months>', 'Asset useful life (hire purchase mode)', parseInt)
      .option('--start-date <date>', 'Lease commencement date (YYYY-MM-DD)')
      .option('--currency <code>', 'Currency code'),
  ).action(
    recipeAction('lease', (opts) =>
      runCalculator('lease', {
        payment: opts.payment,
        term: opts.term,
        rate: opts.rate,
        usefulLife: opts.usefulLife,
        startDate: opts.startDate,
        currency: opts.currency,
      }),
    ),
  );

  // ── depreciation ─────────────────────────────────────────────
  addRecipeOptions(
    capsuleTxn
      .command('depreciation')
      .description(
        'Depreciation capsule \u2014 periodic depreciation journals (SL, DDB, or 150DB).\n' +
        '  Use for non-standard depreciation outside Jaz FA module.\n' +
        '  Accounts needed: Fixed Asset, Accumulated Depreciation, Depreciation Expense.',
      )
      .requiredOption('--cost <amount>', 'Asset cost', parseFloat)
      .requiredOption('--salvage <amount>', 'Salvage value', parseFloat)
      .requiredOption('--life <years>', 'Useful life in years', parseInt)
      .option('--method <method>', 'Method: sl, ddb (default), 150db', 'ddb')
      .option('--frequency <freq>', 'Frequency: annual (default) or monthly', 'annual')
      .option('--start-date <date>', 'Start date (YYYY-MM-DD)')
      .option('--currency <code>', 'Currency code'),
  ).action(
    recipeAction('depreciation', (opts) =>
      runCalculator('depreciation', {
        cost: opts.cost,
        salvage: opts.salvage,
        life: opts.life,
        method: opts.method,
        frequency: opts.frequency,
        currency: opts.currency,
      }),
    ),
  );

  // ── prepaid-expense ──────────────────────────────────────────
  addRecipeOptions(
    capsuleTxn
      .command('prepaid-expense')
      .description(
        'Prepaid expense capsule \u2014 initial bill (or cash-out) + periodic amortization journals.\n' +
        '  Example: annual insurance paid upfront, recognized monthly.\n' +
        '  Accounts needed: Prepaid Asset, Expense Account, Cash / Bank Account.\n' +
        '  Needs: --contact (supplier) for the initial bill.\n' +
        '  Attach: --existing-txn <bill-id or cash-out-id> to skip initial payment.',
      )
      .requiredOption('--amount <amount>', 'Total prepaid amount', parseFloat)
      .requiredOption('--periods <count>', 'Number of recognition periods', parseInt)
      .option('--frequency <freq>', 'Frequency: monthly (default) or quarterly', 'monthly')
      .option('--start-date <date>', 'Start date (YYYY-MM-DD)')
      .option('--currency <code>', 'Currency code'),
  ).action(
    recipeAction('prepaid-expense', (opts) =>
      runCalculator('prepaid-expense', {
        amount: opts.amount,
        periods: opts.periods,
        frequency: opts.frequency,
        startDate: opts.startDate,
        currency: opts.currency,
      }),
    ),
  );

  // ── deferred-revenue ─────────────────────────────────────────
  addRecipeOptions(
    capsuleTxn
      .command('deferred-revenue')
      .description(
        'Deferred revenue capsule \u2014 initial invoice (or cash-in) + periodic revenue recognition journals.\n' +
        '  Example: annual SaaS contract paid upfront, revenue recognized monthly.\n' +
        '  Accounts needed: Deferred Revenue, Revenue Account, Cash / Bank Account.\n' +
        '  Needs: --contact (customer) for the initial invoice.\n' +
        '  Attach: --existing-txn <invoice-id or cash-in-id> to skip initial receipt.',
      )
      .requiredOption('--amount <amount>', 'Total deferred amount', parseFloat)
      .requiredOption('--periods <count>', 'Number of recognition periods', parseInt)
      .option('--frequency <freq>', 'Frequency: monthly (default) or quarterly', 'monthly')
      .option('--start-date <date>', 'Start date (YYYY-MM-DD)')
      .option('--currency <code>', 'Currency code'),
  ).action(
    recipeAction('deferred-revenue', (opts) =>
      runCalculator('deferred-revenue', {
        amount: opts.amount,
        periods: opts.periods,
        frequency: opts.frequency,
        startDate: opts.startDate,
        currency: opts.currency,
      }),
    ),
  );

  // ── fx-reval ─────────────────────────────────────────────────
  addRecipeOptions(
    capsuleTxn
      .command('fx-reval')
      .description(
        'FX revaluation capsule (IAS 21) \u2014 revaluation journal + Day 1 reversal.\n' +
        '  For non-AR/AP foreign currency balances (intercompany loans, FX deposits, etc.).\n' +
        '  Accounts needed: Source Account (FX item), FX Unrealized Gain/Loss.',
      )
      .requiredOption('--amount <amount>', 'Foreign currency amount outstanding', parseFloat)
      .requiredOption('--book-rate <rate>', 'Original booking exchange rate', parseFloat)
      .requiredOption('--closing-rate <rate>', 'Period-end closing exchange rate', parseFloat)
      .option('--currency <code>', 'Foreign currency code (default: USD)', 'USD')
      .option('--base-currency <code>', 'Base (functional) currency code (default: SGD)', 'SGD')
      .option('--start-date <date>', 'Revaluation date (YYYY-MM-DD)'),
  ).action(
    recipeAction('fx-reval', (opts) =>
      runCalculator('fx-reval', {
        amount: opts.amount,
        bookRate: opts.bookRate,
        closingRate: opts.closingRate,
        currency: opts.currency,
        baseCurrency: opts.baseCurrency,
      }),
    ),
  );

  // ── ecl ──────────────────────────────────────────────────────
  addRecipeOptions(
    capsuleTxn
      .command('ecl')
      .description(
        'ECL provision capsule (IFRS 9) \u2014 bad debt provision adjustment journal.\n' +
        '  Uses simplified approach with 5-bucket aging matrix.\n' +
        '  Accounts needed: Bad Debt Expense, Allowance for Doubtful Debts.',
      )
      .requiredOption('--current <amount>', 'Current (not overdue) receivables balance', parseFloat)
      .requiredOption('--30d <amount>', '1-30 days overdue balance', parseFloat)
      .requiredOption('--60d <amount>', '31-60 days overdue balance', parseFloat)
      .requiredOption('--90d <amount>', '61-90 days overdue balance', parseFloat)
      .requiredOption('--120d <amount>', '91+ days overdue balance', parseFloat)
      .requiredOption('--rates <rates>', 'Loss rates per bucket (comma-separated %)', (v: string) => v.split(',').map(Number))
      .option('--existing-provision <amount>', 'Existing provision balance', parseFloat, 0)
      .option('--currency <code>', 'Currency code')
      .option('--start-date <date>', 'Provision date (YYYY-MM-DD)'),
  ).action(
    recipeAction('ecl', (opts) =>
      runCalculator('ecl', {
        buckets: [
          { name: 'Current', balance: opts.current, rate: opts.rates[0] },
          { name: '1-30 days', balance: opts['30d'], rate: opts.rates[1] },
          { name: '31-60 days', balance: opts['60d'], rate: opts.rates[2] },
          { name: '61-90 days', balance: opts['90d'], rate: opts.rates[3] },
          { name: '91+ days', balance: opts['120d'], rate: opts.rates[4] },
        ],
        existingProvision: opts.existingProvision,
        currency: opts.currency,
      }),
    ),
  );

  // ── provision ────────────────────────────────────────────────
  addRecipeOptions(
    capsuleTxn
      .command('provision')
      .description(
        'IAS 37 provision capsule \u2014 PV recognition + monthly unwinding + settlement cash-out.\n' +
        '  Accounts needed: Provision Expense, Provision for Obligations, Finance Cost \u2014 Unwinding, Cash.\n' +
        '  Needs --bank-account for the settlement cash-out.\n' +
        '  Attach: --existing-txn <journal-id> to skip initial recognition.',
      )
      .requiredOption('--amount <amount>', 'Estimated future cash outflow', parseFloat)
      .requiredOption('--rate <percent>', 'Discount rate (%)', parseFloat)
      .requiredOption('--term <months>', 'Months until expected settlement', parseInt)
      .option('--start-date <date>', 'Recognition date (YYYY-MM-DD)')
      .option('--currency <code>', 'Currency code'),
  ).action(
    recipeAction('provision', (opts) =>
      runCalculator('provision', {
        amount: opts.amount,
        rate: opts.rate,
        term: opts.term,
        startDate: opts.startDate,
        currency: opts.currency,
      }),
    ),
  );

  // ── fixed-deposit ────────────────────────────────────────────
  addRecipeOptions(
    capsuleTxn
      .command('fixed-deposit')
      .description(
        'Fixed deposit capsule (IFRS 9) \u2014 placement cash-out + periodic interest accruals + maturity cash-in.\n' +
        '  Accounts needed: Fixed Deposit, Accrued Interest Receivable, Interest Income, Cash.\n' +
        '  Needs --bank-account for placement and maturity cash entries.\n' +
        '  Attach: --existing-txn <cash-out-id> to skip placement.',
      )
      .requiredOption('--principal <amount>', 'Deposit principal', parseFloat)
      .requiredOption('--rate <percent>', 'Annual interest rate (%)', parseFloat)
      .requiredOption('--term <months>', 'Term in months', parseInt)
      .option('--compound <method>', 'Compounding: none (default), monthly, quarterly, annually', 'none')
      .option('--start-date <date>', 'Placement date (YYYY-MM-DD)')
      .option('--currency <code>', 'Currency code'),
  ).action(
    recipeAction('fixed-deposit', (opts) =>
      runCalculator('fixed-deposit', {
        principal: opts.principal,
        rate: opts.rate,
        term: opts.term,
        compound: opts.compound,
        startDate: opts.startDate,
        currency: opts.currency,
      }),
    ),
  );

  // ── asset-disposal ───────────────────────────────────────────
  addRecipeOptions(
    capsuleTxn
      .command('asset-disposal')
      .description(
        'Asset disposal capsule (IAS 16) \u2014 gain/loss disposal journal + FA deregistration note.\n' +
        '  Accounts needed: Fixed Asset, Accumulated Depreciation, Gain/Loss on Disposal, Cash.\n' +
        '  Note: FA deregistration is output as a manual instruction.',
      )
      .requiredOption('--cost <amount>', 'Original asset cost', parseFloat)
      .requiredOption('--salvage <amount>', 'Salvage value', parseFloat)
      .requiredOption('--life <years>', 'Useful life in years', parseInt)
      .requiredOption('--acquired <date>', 'Acquisition date (YYYY-MM-DD)')
      .requiredOption('--disposed <date>', 'Disposal date (YYYY-MM-DD)')
      .requiredOption('--proceeds <amount>', 'Disposal proceeds (0 for scrap)', parseFloat)
      .option('--method <method>', 'Depreciation method: sl (default), ddb, 150db', 'sl')
      .option('--currency <code>', 'Currency code'),
  ).action(
    recipeAction('asset-disposal', (opts) =>
      runCalculator('asset-disposal', {
        cost: opts.cost,
        salvage: opts.salvage,
        life: opts.life,
        acquired: opts.acquired,
        disposed: opts.disposed,
        proceeds: opts.proceeds,
        method: opts.method,
        currency: opts.currency,
      }),
    ),
  );

  // ── accrued-expense ─────────────────────────────────────────
  addRecipeOptions(
    capsuleTxn
      .command('accrued-expense')
      .description(
        'Accrued expense capsule (IAS 1) \u2014 dual-entry: month-end accrual + next-month reversal.\n' +
        '  For estimated expenses before invoice arrives (rent, utilities, services).\n' +
        '  Accounts needed: Expense Account, Accrued Liability.',
      )
      .requiredOption('--amount <amount>', 'Estimated accrual amount per period', parseFloat)
      .requiredOption('--periods <count>', 'Number of accrual periods', parseInt)
      .option('--frequency <freq>', 'Frequency: monthly (default) or quarterly', 'monthly')
      .option('--start-date <date>', 'First accrual date (YYYY-MM-DD)')
      .option('--currency <code>', 'Currency code'),
  ).action(
    recipeAction('accrued-expense', (opts) =>
      runCalculator('accrued-expense', {
        amount: opts.amount,
        periods: opts.periods,
        frequency: opts.frequency,
        startDate: opts.startDate,
        currency: opts.currency,
      }),
    ),
  );

  // ── leave-accrual ───────────────────────────────────────────
  addRecipeOptions(
    capsuleTxn
      .command('leave-accrual')
      .description(
        'Leave accrual capsule (IAS 19) \u2014 monthly accrual of annual leave entitlements.\n' +
        '  Final month absorbs rounding remainder.\n' +
        '  Accounts needed: Leave Expense, Accrued Leave Liability.',
      )
      .requiredOption('--employees <count>', 'Number of employees', parseInt)
      .requiredOption('--days <days>', 'Leave days per employee per year', parseInt)
      .requiredOption('--daily-rate <amount>', 'Average daily rate (cost per day)', parseFloat)
      .option('--periods <count>', 'Months to accrue (default 12)', parseInt, 12)
      .option('--start-date <date>', 'First accrual date (YYYY-MM-DD)')
      .option('--currency <code>', 'Currency code'),
  ).action(
    recipeAction('leave-accrual', (opts) =>
      runCalculator('leave-accrual', {
        employees: opts.employees,
        days: opts.days,
        dailyRate: opts.dailyRate,
        periods: opts.periods,
        startDate: opts.startDate,
        currency: opts.currency,
      }),
    ),
  );

  // ── dividend ────────────────────────────────────────────────
  addRecipeOptions(
    capsuleTxn
      .command('dividend')
      .description(
        'Dividend capsule \u2014 declaration journal + payment cash-out + optional WHT.\n' +
        '  Two-step pattern (3 with withholding tax).\n' +
        '  Accounts needed: Retained Earnings, Dividends Payable, Cash / Bank Account.\n' +
        '  With WHT: also Withholding Tax Payable.\n' +
        '  Needs --bank-account for payment cash-out.',
      )
      .requiredOption('--amount <amount>', 'Declared dividend amount', parseFloat)
      .requiredOption('--declaration-date <date>', 'Board resolution date (YYYY-MM-DD)')
      .requiredOption('--payment-date <date>', 'Settlement date (YYYY-MM-DD)')
      .option('--withholding-rate <percent>', 'Withholding tax rate (%)', parseFloat, 0)
      .option('--currency <code>', 'Currency code'),
  ).action(
    recipeAction('dividend', (opts) =>
      runCalculator('dividend', {
        amount: opts.amount,
        declarationDate: opts.declarationDate,
        paymentDate: opts.paymentDate,
        withholdingRate: opts.withholdingRate,
        currency: opts.currency,
      }),
    ),
  );
}
