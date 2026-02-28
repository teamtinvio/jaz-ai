import chalk from 'chalk';
import { Command } from 'commander';
import {
  listContacts,
  searchContacts,
  createContact,
  getContact,
  updateContact,
  deleteContact,
} from '../core/api/contacts.js';
import { apiAction } from './api-action.js';
import { parsePositiveInt, parseNonNegativeInt, readBodyInput, requireFields } from './parsers.js';
import { paginatedFetch, paginatedJson, displaySlice } from './pagination.js';

export function registerContactsCommand(program: Command): void {
  const contacts = program
    .command('contacts')
    .description('Manage contacts (customers & suppliers)');

  // ── clio contacts list ──────────────────────────────────────────
  contacts
    .command('list')
    .description('List contacts')
    .option('--limit <n>', 'Max results (default 100)', parsePositiveInt)
    .option('--offset <n>', 'Offset for pagination', parseNonNegativeInt)
    .option('--all', 'Fetch all pages')
    .option('--max-rows <n>', 'Max rows for --all (default 10000)', parsePositiveInt)
    .option('--api-key <key>', 'API key (overrides stored/env)')
    .option('--json', 'Output as JSON')
    .action(apiAction(async (client, opts) => {
      const result = await paginatedFetch(
        opts,
        (p) => listContacts(client, p),
        { label: 'Fetching contacts' },
      );

      if (opts.json) {
        console.log(paginatedJson(result, opts));
      } else {
        console.log(chalk.bold(`Contacts (${result.data.length} of ${result.totalElements}):\n`));
        const { items, overflow } = displaySlice(result.data);
        for (const c of items) {
          const roles = [
            c.customer && 'customer',
            c.supplier && 'supplier',
          ].filter(Boolean).join(', ');
          console.log(`  ${chalk.cyan(c.resourceId)}  ${c.billingName}${roles ? chalk.dim(` (${roles})`) : ''}`);
        }
        if (overflow > 0) console.log(chalk.dim(`  ... and ${overflow.toLocaleString()} more (use --json for full output)`));
      }
    }));

  // ── clio contacts search ────────────────────────────────────────
  contacts
    .command('search <query>')
    .description('Search contacts by name or billing name')
    .option('--limit <n>', 'Max results (default 20)', parsePositiveInt)
    .option('--offset <n>', 'Offset for pagination', parseNonNegativeInt)
    .option('--all', 'Fetch all pages')
    .option('--max-rows <n>', 'Max rows for --all (default 10000)', parsePositiveInt)
    .option('--customer', 'Filter to customers only')
    .option('--supplier', 'Filter to suppliers only')
    .option('--sort <field>', 'Sort field (default: name)')
    .option('--order <direction>', 'Sort order: ASC or DESC (default: ASC)')
    .option('--api-key <key>', 'API key (overrides stored/env)')
    .option('--json', 'Output as JSON')
    .action((query: string, opts) => apiAction(async (client) => {
      const filter: Record<string, unknown> = {
        status: { eq: 'ACTIVE' },
        name: { contains: query },
      };
      if (opts.customer) filter.customer = { eq: true };
      if (opts.supplier) filter.supplier = { eq: true };

      const sort = { sortBy: [opts.sort ?? 'name'] as string[], order: (opts.order ?? 'ASC') as 'ASC' | 'DESC' };

      const result = await paginatedFetch(
        opts,
        ({ limit, offset }) => searchContacts(client, { filter, limit, offset, sort }),
        { label: 'Searching contacts', defaultLimit: 20 },
      );

      if (opts.json) {
        console.log(paginatedJson(result, opts));
      } else {
        if (result.data.length === 0) {
          console.log(chalk.yellow('No contacts found.'));
          return;
        }
        console.log(chalk.bold(`Found ${result.data.length} contact(s):\n`));
        const { items, overflow } = displaySlice(result.data);
        for (const c of items) {
          const roles = [
            c.customer && 'customer',
            c.supplier && 'supplier',
          ].filter(Boolean).join(', ');
          const email = c.emails?.length ? chalk.dim(` <${c.emails[0]}>`) : '';
          console.log(`  ${chalk.cyan(c.resourceId)}  ${c.billingName}${email}${roles ? chalk.dim(` (${roles})`) : ''}`);
        }
        if (overflow > 0) console.log(chalk.dim(`  ... and ${overflow.toLocaleString()} more (use --json for full output)`));
      }
    })(opts));

  // ── clio contacts get ───────────────────────────────────────────
  contacts
    .command('get <resourceId>')
    .description('Get a contact by resourceId')
    .option('--api-key <key>', 'API key (overrides stored/env)')
    .option('--json', 'Output as JSON')
    .action((resourceId: string, opts) => apiAction(async (client) => {
      const res = await getContact(client, resourceId);
      const c = res.data;

      if (opts.json) {
        console.log(JSON.stringify(c, null, 2));
      } else {
        console.log(chalk.bold('Name:'), c.billingName);
        if (c.name && c.name !== c.billingName) {
          console.log(chalk.bold('Display Name:'), c.name);
        }
        console.log(chalk.bold('ID:'), c.resourceId);
        if (c.emails?.length) {
          console.log(chalk.bold('Email:'), c.emails.join(', '));
        }
        if (c.taxRegistrationNumber) {
          console.log(chalk.bold('Tax Reg:'), c.taxRegistrationNumber);
        }
        const roles = [
          c.customer && 'Customer',
          c.supplier && 'Supplier',
        ].filter(Boolean).join(', ');
        if (roles) console.log(chalk.bold('Roles:'), roles);
        if (c.status) console.log(chalk.bold('Status:'), c.status);
      }
    })(opts));

  // ── clio contacts create ────────────────────────────────────────
  contacts
    .command('create')
    .description('Create a new contact')
    .option('--name <name>', 'Contact name (used for both name and billingName)')
    .option('--email <email>', 'Email address')
    .option('--customer', 'Mark as customer')
    .option('--supplier', 'Mark as supplier')
    .option('--tax-reg <number>', 'Tax registration number')
    .option('--phone <phone>', 'Phone number (E.164 format)')
    .option('--currency <code>', 'Currency code (ISO 4217)')
    .option('--payment-terms <days>', 'Payment term in days', parsePositiveInt)
    .option('--input <file>', 'Read full request body from JSON file (or pipe via stdin)')
    .option('--api-key <key>', 'API key (overrides stored/env)')
    .option('--json', 'Output as JSON')
    .action(apiAction(async (client, opts) => {
      const body = readBodyInput(opts);

      let res;
      if (body) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- user-provided JSON, API validates
        res = await createContact(client, body as any);
      } else {
        requireFields(opts as Record<string, unknown>, [
          { flag: '--name', key: 'name' },
        ]);
        res = await createContact(client, {
          billingName: opts.name,
          name: opts.name,
          emails: opts.email ? [opts.email] : undefined,
          customer: opts.customer ?? false,
          supplier: opts.supplier ?? false,
          taxRegistrationNumber: opts.taxReg,
          phone: opts.phone,
          currency: opts.currency ? { sourceCurrency: opts.currency } : undefined,
          paymentTermDays: opts.paymentTerms,
        });
      }

      if (opts.json) {
        console.log(JSON.stringify(res.data, null, 2));
      } else {
        console.log(chalk.green(`Contact created: ${res.data.billingName}`));
        console.log(chalk.bold('ID:'), res.data.resourceId);
      }
    }));

  // ── clio contacts update ────────────────────────────────────────
  contacts
    .command('update <resourceId>')
    .description('Update a contact')
    .option('--name <name>', 'New billing name')
    .option('--email <email>', 'New email address')
    .option('--customer', 'Set as customer')
    .option('--no-customer', 'Unset as customer')
    .option('--supplier', 'Set as supplier')
    .option('--no-supplier', 'Unset as supplier')
    .option('--tax-reg <number>', 'Tax registration number')
    .option('--phone <phone>', 'Phone number')
    .option('--status <status>', 'Status (ACTIVE/INACTIVE)')
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
        if (opts.name !== undefined) {
          data.billingName = opts.name;
          data.name = opts.name;
        }
        if (opts.email !== undefined) data.emails = [opts.email];
        if (opts.customer !== undefined) data.customer = opts.customer;
        if (opts.supplier !== undefined) data.supplier = opts.supplier;
        if (opts.taxReg !== undefined) data.taxRegistrationNumber = opts.taxReg;
        if (opts.phone !== undefined) data.phone = opts.phone;
        if (opts.status !== undefined) data.status = opts.status;
      }

      const res = await updateContact(client, resourceId, data);

      if (opts.json) {
        console.log(JSON.stringify(res.data, null, 2));
      } else {
        console.log(chalk.green(`Contact updated: ${res.data.billingName}`));
      }
    })(opts));

  // ── clio contacts delete ────────────────────────────────────────
  contacts
    .command('delete <resourceId>')
    .description('Delete a contact')
    .option('--api-key <key>', 'API key (overrides stored/env)')
    .option('--json', 'Output as JSON')
    .action((resourceId: string, opts) => apiAction(async (client) => {
      await deleteContact(client, resourceId);

      if (opts.json) {
        console.log(JSON.stringify({ deleted: true, resourceId }));
      } else {
        console.log(chalk.green(`Contact ${resourceId} deleted.`));
      }
    })(opts));
}
