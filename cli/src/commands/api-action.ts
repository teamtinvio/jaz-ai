import chalk from 'chalk';
import { JazClient, JazApiError } from '../core/api/client.js';
import { requireAuth, AuthError, resolvedProfileLabel, resolvedAuthSource, getProfile, listProfiles } from '../core/auth/index.js';
import type { AuthConfig } from '../core/auth/index.js';
import { isMachineFormat, type OutputOpts } from './output.js';

/**
 * Shared action wrapper for all online CLI commands.
 * Handles auth resolution, client creation, org banner, and error formatting.
 *
 * Exit codes: 1 = validation, 2 = API error, 3 = auth error.
 */
export function apiAction<T extends { apiKey?: string; json?: boolean; format?: string; org?: string }>(
  fn: (client: JazClient, opts: T, auth: AuthConfig) => Promise<void>,
): (opts: T) => Promise<void> {
  return async (opts: T) => {
    try {
      // Conflict check: --api-key and --org are mutually exclusive
      if (opts.apiKey && opts.org) {
        throw new AuthError('Cannot use both --api-key and --org. Use one or the other.');
      }

      const auth = requireAuth(opts.apiKey);
      const client = new JazClient(auth);

      // Org banner — show which org we're hitting (suppressed in machine formats)
      // Visual guard: yellow warning when unpinned + multi-org, dim banner otherwise
      if (!isMachineFormat(opts as unknown as OutputOpts)) {
        const label = resolvedProfileLabel();
        if (label) {
          const entry = getProfile(label);
          if (entry) {
            const source = resolvedAuthSource();
            const isPinned = source === 'env-org' || source === 'flag-org' || source === 'flag-api-key' || source === 'env-api-key';
            let orgCount = 0;
            try { orgCount = Object.keys(listProfiles() ?? {}).length; } catch { /* best-effort */ }

            if (!isPinned && orgCount > 1) {
              // UNPINNED multi-org: prominent yellow warning
              process.stderr.write(
                chalk.yellow(`  \u26A0 ${label} \u00B7 ${entry.orgName} (${entry.currency})`) +
                chalk.dim(` \u2014 not pinned to this terminal\n`) +
                chalk.dim(`    Pin: export JAZ_ORG=${label}  or  --org ${label}\n`),
              );
            } else {
              // Pinned or single-org: normal dim banner
              process.stderr.write(chalk.dim(`  \u25B8 ${label} \u00B7 ${entry.orgName} (${entry.currency})\n`));
            }
          }
        }
      }

      await fn(client, opts, auth);
    } catch (err) {
      const machine = isMachineFormat(opts as unknown as OutputOpts);
      if (err instanceof AuthError) {
        if (machine) console.log(JSON.stringify({ error: { code: 'AUTH_ERROR', message: err.message } }));
        else console.error(chalk.red(`Error: ${err.message}`));
        process.exit(3);
      }
      if (err instanceof JazApiError) {
        if (machine) console.log(JSON.stringify({ error: { code: 'API_ERROR', status: err.status, message: err.message } }));
        else console.error(chalk.red(`API Error (${err.status}): ${err.message}`));
        process.exit(2);
      }
      const message = (err as Error).message;
      if (machine) console.log(JSON.stringify({ error: { code: 'UNKNOWN_ERROR', message } }));
      else console.error(chalk.red(`Error: ${message}`));
      process.exit(2);
    }
  };
}
