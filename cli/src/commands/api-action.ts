import ora from 'ora';
import { JazClient, JazApiError } from '../core/api/client.js';
import { requireAuth, AuthError, resolvedProfileLabel, resolvedAuthSource, getProfile, listProfiles } from '../core/auth/index.js';
import type { AuthConfig } from '../core/auth/index.js';
import { isMachineFormat, type OutputOpts } from './output.js';
import { renderOrgBanner } from './ui/banner.js';
import { formatApiError, formatAuthError, formatGenericError } from './ui/error.js';
import { shouldAnimate } from './ui/theme.js';

/**
 * Shared action wrapper for all online CLI commands.
 * Handles auth resolution, client creation, org banner, spinner, and error formatting.
 *
 * Exit codes: 1 = validation, 2 = API error, 3 = auth error.
 */
export function apiAction<T extends { apiKey?: string; json?: boolean; format?: string; org?: string }>(
  fn: (client: JazClient, opts: T, auth: AuthConfig) => Promise<void>,
): (opts: T) => Promise<void> {
  return async (opts: T) => {
    let spinner: ReturnType<typeof ora> | undefined;
    // Hoist machine flag — computed once, safe to use in catch even if resolveFormat would throw
    let machine = false;
    try {
      machine = isMachineFormat(opts as unknown as OutputOpts);
    } catch { /* --json + --format conflict — treat as human mode for error display */ }

    try {
      // Conflict check: --api-key and --org are mutually exclusive
      if (opts.apiKey && opts.org) {
        throw new AuthError('Cannot use both --api-key and --org. Use one or the other.');
      }

      const auth = requireAuth(opts.apiKey);
      const client = new JazClient(auth);

      // Org banner — stderr, suppressed in machine formats
      if (!machine) {
        const label = resolvedProfileLabel();
        if (label) {
          const entry = getProfile(label);
          if (entry) {
            const source = resolvedAuthSource();
            const isPinned = source === 'env-org' || source === 'flag-org' || source === 'flag-api-key' || source === 'env-api-key';
            let orgCount = 0;
            try { orgCount = Object.keys(listProfiles() ?? {}).length; } catch { /* best-effort */ }

            renderOrgBanner(
              { label, orgName: entry.orgName, currency: entry.currency },
              isPinned,
              orgCount > 1,
            );
          }
        }
      }

      await fn(client, opts, auth);
    } catch (err) {
      if (err instanceof AuthError) {
        if (machine) console.error(JSON.stringify({ error: { code: 'AUTH_ERROR', message: err.message } }));
        else console.error(formatAuthError(err.message));
        process.exit(3);
      }
      if (err instanceof JazApiError) {
        if (machine) console.error(JSON.stringify({ error: { code: 'API_ERROR', status: err.status, message: err.message } }));
        else console.error(formatApiError(err.status, err.message, err.endpoint));
        process.exit(2);
      }
      const message = (err as Error).message;
      if (machine) console.error(JSON.stringify({ error: { code: 'UNKNOWN_ERROR', message } }));
      else console.error(formatGenericError(message));
      process.exit(2);
    } finally {
      spinner?.stop();
    }
  };
}
