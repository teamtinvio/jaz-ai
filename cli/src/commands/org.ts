import chalk from 'chalk';
import { Command } from 'commander';
import { getOrganization } from '../core/api/organization.js';
import { apiAction } from './api-action.js';

export function registerOrgCommand(program: Command): void {
  const org = program
    .command('org')
    .description('Organization management');

  org
    .command('info')
    .description('Show organization details')
    .option('--api-key <key>', 'API key (overrides stored/env)')
    .option('--json', 'Output as JSON')
    .action(apiAction(async (client, opts) => {
      const orgData = await getOrganization(client);

      if (opts.json) {
        console.log(JSON.stringify(orgData, null, 2));
      } else {
        console.log(chalk.bold('Organization:'), orgData.name);
        console.log(chalk.bold('ID:'), orgData.resourceId);
        console.log(chalk.bold('Currency:'), orgData.currency);
        console.log(chalk.bold('Country:'), orgData.countryCode);
        console.log(chalk.bold('Status:'), orgData.status);
        if (orgData.lockDate) {
          console.log(chalk.bold('Lock Date:'), orgData.lockDate);
        }
        if (orgData.fiscalYearEnd !== undefined) {
          console.log(chalk.bold('Fiscal Year End:'), `Month ${orgData.fiscalYearEnd}`);
        }
      }
    }));
}
