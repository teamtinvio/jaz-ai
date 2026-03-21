import { highlight } from './ui/theme.js';
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
        console.log(highlight('Organization:'), orgData.name);
        console.log(highlight('ID:'), orgData.resourceId);
        console.log(highlight('Currency:'), orgData.currency);
        console.log(highlight('Country:'), orgData.countryCode);
        console.log(highlight('Status:'), orgData.status);
        if (orgData.lockDate) {
          console.log(highlight('Lock Date:'), orgData.lockDate);
        }
        if (orgData.fiscalYearEnd !== undefined) {
          console.log(highlight('Fiscal Year End:'), `Month ${orgData.fiscalYearEnd}`);
        }
      }
    }));
}
