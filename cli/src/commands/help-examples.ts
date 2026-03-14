/**
 * Centralized help examples for CLI commands.
 * All examples in ONE file — zero changes to existing command files.
 * After all register*Command() calls, one call to applyAllExamples() walks the
 * command tree and attaches examples via Commander.js .addHelpText().
 */
import chalk from 'chalk';
import type { Command } from 'commander';

interface CommandExample {
  /** Optional one-liner description (rendered dim above the command). */
  description?: string;
  /** Copy-pasteable clio command. */
  command: string;
}

const EXAMPLES: Record<string, CommandExample[]> = {
  'invoices list': [
    { description: 'List first 100 invoices', command: 'clio invoices list' },
    { description: 'Export all invoices as CSV', command: 'clio invoices list --all --format csv' },
    { description: 'Get JSON for piping to other tools', command: 'clio invoices list --limit 50 --json' },
  ],
  'invoices search': [
    { description: 'Search by reference', command: 'clio invoices search --reference INV-001' },
    { description: 'Find overdue invoices', command: 'clio invoices search --status APPROVED --dueDateTo 2025-12-31' },
    { description: 'Search by contact and export', command: 'clio invoices search --contactName "Acme" --format json' },
  ],
  'invoices create': [
    { description: 'Create a simple invoice', command: 'clio invoices create --contact "Acme Corp" --date 2025-06-01 --due 2025-07-01 --line "Consulting,10,150"' },
    { description: 'Create with tax profile', command: 'clio invoices create --contact "Acme Corp" --date 2025-06-01 --due 2025-07-01 --line "Service,1,1000,,,tp-sr" --status APPROVED' },
    { description: 'Create from JSON file', command: 'clio invoices create --body invoice.json' },
  ],
  'invoices pay': [
    { description: 'Record a full payment', command: 'clio invoices pay <resourceId> --amount 1000 --date 2025-06-15 --account "Cash"' },
  ],
  'bills list': [
    { description: 'List all bills', command: 'clio bills list' },
    { description: 'Export as YAML', command: 'clio bills list --format yaml' },
    { description: 'Fetch every page as JSON', command: 'clio bills list --all --json' },
  ],
  'bills search': [
    { description: 'Search by supplier name', command: 'clio bills search --contactName "Supplier Co"' },
    { description: 'Find draft bills', command: 'clio bills search --status DRAFT' },
  ],
  'bills create': [
    { description: 'Create a bill', command: 'clio bills create --contact "Supplier Co" --date 2025-06-01 --due 2025-07-01 --line "Office supplies,5,20"' },
    { description: 'Create from JSON body', command: 'clio bills create --body bill.json' },
  ],
  'contacts list': [
    { description: 'List contacts', command: 'clio contacts list' },
    { description: 'Export all as CSV', command: 'clio contacts list --all --format csv' },
  ],
  'contacts search': [
    { description: 'Find customers', command: 'clio contacts search --customer true' },
    { description: 'Search by name', command: 'clio contacts search --name "Acme"' },
  ],
  'contacts create': [
    { description: 'Create a customer', command: 'clio contacts create --name "New Client" --customer' },
    { description: 'Create a supplier', command: 'clio contacts create --name "Vendor Inc" --supplier' },
  ],
  'journals create': [
    { description: 'Create a journal entry', command: 'clio journals create --date 2025-06-01 --ref "ADJ-001" --debit "Office Expenses,500" --credit "Cash,500"' },
    { description: 'Create with description', command: 'clio journals create --date 2025-06-01 --ref "ADJ-002" --debit "Rent,2000" --credit "Bank,2000" --description "Monthly rent"' },
  ],
  'reports generate': [
    { description: 'Generate trial balance', command: 'clio reports generate trial-balance --date 2025-06-30' },
    { description: 'Profit & Loss for a period', command: 'clio reports generate profit-and-loss --from 2025-01-01 --to 2025-06-30' },
    { description: 'Balance sheet as JSON', command: 'clio reports generate balance-sheet --date 2025-06-30 --json' },
    { description: 'Export AR summary as CSV', command: 'clio reports generate ar-summary --date 2025-06-30 --format csv' },
  ],
  'accounts list': [
    { description: 'List chart of accounts', command: 'clio accounts list' },
    { description: 'Export as JSON', command: 'clio accounts list --json' },
  ],
  'items search': [
    { description: 'Search items by name', command: 'clio items search --name "Widget"' },
    { description: 'Find sale items', command: 'clio items search --saleItem true' },
  ],
  'bank import': [
    { description: 'Import a bank statement', command: 'clio bank import --file statement.csv --account "DBS Current"' },
  ],
  search: [
    { description: 'Search across all entities', command: 'clio search "Acme Corp"' },
    { description: 'Search with limit', command: 'clio search "INV-001" --limit 5' },
  ],
  'capsules create': [
    { description: 'Create a capsule', command: 'clio capsules create --name "Q2 Prepaid" --type PREPAID_EXPENSES --class ASSET' },
  ],
  'customer-credit-notes create': [
    { description: 'Create a credit note', command: 'clio customer-credit-notes create --contact "Acme" --date 2025-06-01 --line "Refund,1,500"' },
  ],
  'magic create': [
    { description: 'Extract data from a document', command: 'clio magic create --file invoice.pdf' },
    { description: 'Check extraction status', command: 'clio magic status <jobId>' },
  ],
  schema: [
    { description: 'List all API groups', command: 'clio schema' },
    { description: 'Show tools in a group', command: 'clio schema invoices' },
    { description: 'Inspect a specific tool\'s params', command: 'clio schema invoices create' },
    { description: 'Get full schema as JSON', command: 'clio schema invoices create --json' },
  ],
};

/** Format examples block for Commander help text. */
function formatExamples(examples: CommandExample[]): string {
  const lines = ['\nEXAMPLES'];
  for (const ex of examples) {
    if (ex.description) lines.push(`  ${chalk.dim(ex.description)}`);
    lines.push(`  $ ${ex.command}`);
    lines.push('');
  }
  return lines.join('\n');
}

/** Recursively find a subcommand by dot-separated path (e.g., "invoices.list"). */
function findCommand(root: Command, path: string): Command | undefined {
  const parts = path.split(' ');
  let cmd: Command | undefined = root;
  for (const part of parts) {
    cmd = cmd?.commands.find((c) => c.name() === part);
    if (!cmd) return undefined;
  }
  return cmd;
}

/**
 * Walk the Commander tree and attach examples to matching commands.
 * Call once after all register*Command() calls.
 */
export function applyAllExamples(program: Command): void {
  for (const [path, examples] of Object.entries(EXAMPLES)) {
    const cmd = findCommand(program, path);
    if (cmd) {
      cmd.addHelpText('after', formatExamples(examples));
    }
  }
}
