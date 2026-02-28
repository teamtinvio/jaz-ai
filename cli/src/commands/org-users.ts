import chalk from 'chalk';
import { Command } from 'commander';
import {
  listOrgUsers, searchOrgUsers, inviteOrgUser, updateOrgUser, removeOrgUser,
} from '../core/api/org-users.js';
import { apiAction } from './api-action.js';
import { parsePositiveInt, parseNonNegativeInt, readBodyInput, requireFields } from './parsers.js';
import { paginatedFetch, paginatedJson, displaySlice } from './pagination.js';

export function registerOrgUsersCommand(program: Command): void {
  const ou = program
    .command('org-users')
    .description('Manage organization users');

  // ── clio org-users list ───────────────────────────────────────
  ou
    .command('list')
    .description('List organization users')
    .option('--limit <n>', 'Max results (default 100)', parsePositiveInt)
    .option('--offset <n>', 'Offset for pagination', parseNonNegativeInt)
    .option('--all', 'Fetch all pages')
    .option('--max-rows <n>', 'Max rows for --all (default 10000)', parsePositiveInt)
    .option('--api-key <key>', 'API key (overrides stored/env)')
    .option('--json', 'Output as JSON')
    .action(apiAction(async (client, opts) => {
      const result = await paginatedFetch(
        opts,
        (p) => listOrgUsers(client, p),
        { label: 'Fetching org users' },
      );

      if (opts.json) {
        console.log(paginatedJson(result, opts));
      } else {
        console.log(chalk.bold(`Org Users (${result.data.length} of ${result.totalElements}):\n`));
        const { items, overflow } = displaySlice(result.data);
        for (const u of items) {
          const roles = u.moduleRoles.map((r) => `${r.moduleName}:${r.roleCode}`).join(', ');
          console.log(`  ${chalk.cyan(u.resourceId)}  ${u.firstName} ${u.lastName}  ${chalk.dim(u.email)}  ${roles}`);
        }
        if (overflow > 0) console.log(chalk.dim(`  ... and ${overflow.toLocaleString()} more (use --json for full output)`));
      }
    }));

  // ── clio org-users search ─────────────────────────────────────
  ou
    .command('search <query>')
    .description('Search organization users by name or email')
    .option('--sort <field>', 'Sort field (default: firstName)')
    .option('--order <direction>', 'Sort order: ASC or DESC (default: ASC)')
    .option('--limit <n>', 'Max results (default 20)', parsePositiveInt)
    .option('--offset <n>', 'Offset for pagination', parseNonNegativeInt)
    .option('--all', 'Fetch all pages')
    .option('--max-rows <n>', 'Max rows for --all (default 10000)', parsePositiveInt)
    .option('--api-key <key>', 'API key (overrides stored/env)')
    .option('--json', 'Output as JSON')
    .action((query: string, opts) => apiAction(async (client) => {
      const filter = {
        or: [
          { firstName: { contains: query } },
          { lastName: { contains: query } },
          { email: { contains: query } },
        ],
      };
      const sort = { sortBy: [opts.sort ?? 'firstName'] as string[], order: (opts.order ?? 'ASC') as 'ASC' | 'DESC' };

      const result = await paginatedFetch(
        opts,
        ({ limit, offset }) => searchOrgUsers(client, { filter, limit, offset, sort }),
        { label: 'Searching org users', defaultLimit: 20 },
      );

      if (opts.json) {
        console.log(paginatedJson(result, opts));
      } else {
        if (result.data.length === 0) {
          console.log(chalk.yellow('No users found.'));
          return;
        }
        console.log(chalk.bold(`Found ${result.data.length} user(s):\n`));
        const { items, overflow } = displaySlice(result.data);
        for (const u of items) {
          console.log(`  ${chalk.cyan(u.resourceId)}  ${u.firstName} ${u.lastName}  ${chalk.dim(u.email)}`);
        }
        if (overflow > 0) console.log(chalk.dim(`  ... and ${overflow.toLocaleString()} more (use --json for full output)`));
      }
    })(opts));

  // ── clio org-users invite ─────────────────────────────────────
  ou
    .command('invite')
    .description('Invite a user to the organization')
    .option('--first-name <name>', 'First name')
    .option('--last-name <name>', 'Last name')
    .option('--email <email>', 'Email address')
    .option('--role <role>', 'Role code: ADMIN, PREPARER, MEMBER, NO_ACCESS (default: MEMBER)')
    .option('--input <file>', 'Read full request body from JSON file (or pipe via stdin)')
    .option('--api-key <key>', 'API key (overrides stored/env)')
    .option('--json', 'Output as JSON')
    .action(apiAction(async (client, opts) => {
      const body = readBodyInput(opts);

      let res;
      if (body) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- user-provided JSON, API validates
        res = await inviteOrgUser(client, body as any);
      } else {
        requireFields(opts as Record<string, unknown>, [
          { flag: '--first-name', key: 'firstName' },
          { flag: '--last-name', key: 'lastName' },
          { flag: '--email', key: 'email' },
        ]);
        const roleCode = (opts.role ?? 'MEMBER') as 'ADMIN' | 'PREPARER' | 'MEMBER' | 'NO_ACCESS';
        res = await inviteOrgUser(client, {
          firstName: opts.firstName,
          lastName: opts.lastName,
          email: opts.email,
          moduleRoles: [
            { moduleName: 'ORGANIZATION', roleCode },
            { moduleName: 'ACCOUNTING', roleCode },
            { moduleName: 'SALES', roleCode },
            { moduleName: 'PURCHASES', roleCode },
            { moduleName: 'REPORTS', roleCode },
          ],
        });
      }

      if (opts.json) {
        console.log(JSON.stringify(res.data, null, 2));
      } else {
        console.log(chalk.green(`User invited: ${opts.firstName ?? ''} ${opts.lastName ?? ''} (${opts.email ?? ''})`));
        console.log(chalk.bold('ID:'), res.data.resourceId);
      }
    }));

  // ── clio org-users update ─────────────────────────────────────
  ou
    .command('update <resourceId>')
    .description('Update a user\'s module roles')
    .option('--role <role>', 'New role code: ADMIN, PREPARER, MEMBER, NO_ACCESS')
    .option('--input <file>', 'Read full request body from JSON file (or pipe via stdin)')
    .option('--api-key <key>', 'API key (overrides stored/env)')
    .option('--json', 'Output as JSON')
    .action((resourceId: string, opts) => apiAction(async (client) => {
      const body = readBodyInput(opts);

      let data;
      if (body) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- user-provided JSON, API validates
        data = body as any;
      } else {
        requireFields(opts as Record<string, unknown>, [
          { flag: '--role', key: 'role' },
        ]);
        const roleCode = opts.role as 'ADMIN' | 'PREPARER' | 'MEMBER' | 'NO_ACCESS';
        data = {
          moduleRoles: [
            { moduleName: 'ORGANIZATION', roleCode },
            { moduleName: 'ACCOUNTING', roleCode },
            { moduleName: 'SALES', roleCode },
            { moduleName: 'PURCHASES', roleCode },
            { moduleName: 'REPORTS', roleCode },
          ],
        };
      }

      const res = await updateOrgUser(client, resourceId, data);

      if (opts.json) {
        console.log(JSON.stringify(res.data, null, 2));
      } else {
        console.log(chalk.green(`User updated: ${res.data.firstName} ${res.data.lastName}`));
      }
    })(opts));

  // ── clio org-users remove ─────────────────────────────────────
  ou
    .command('remove <resourceId>')
    .description('Remove a user from the organization')
    .option('--api-key <key>', 'API key (overrides stored/env)')
    .option('--json', 'Output as JSON')
    .action((resourceId: string, opts) => apiAction(async (client) => {
      await removeOrgUser(client, resourceId);

      if (opts.json) {
        console.log(JSON.stringify({ deleted: true, resourceId }));
      } else {
        console.log(chalk.green(`User ${resourceId} removed.`));
      }
    })(opts));
}
