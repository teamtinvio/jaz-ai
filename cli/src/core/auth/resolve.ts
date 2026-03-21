import type { AuthConfig } from './types.js';
import { readCredentials, getProfile, getActiveLabel } from './credentials.js';

// ── Module-level state for --org CLI flag ────────────────────────
let _cliOrg: string | undefined;

/** Called by Commander preAction hook to set --org flag value. */
export function setActiveOrg(name: string | undefined): void {
  _cliOrg = name;
}

// ── Tracking which profile label was resolved ────────────────────
let _resolvedLabel: string | null = null;

/** Returns the profile label used by the last resolveAuth() call, or null if auth came from flag/env. */
export function resolvedProfileLabel(): string | null {
  return _resolvedLabel;
}

// ── Tracking HOW auth was resolved (for visual guard) ────────────

/** How auth was resolved — used by visual guard in apiAction. */
export type AuthSource =
  | 'flag-api-key'   // step 1: --api-key flag
  | 'env-api-key'    // step 2: JAZ_API_KEY env
  | 'flag-org'       // step 3: --org flag
  | 'env-org'        // step 4: JAZ_ORG env (pinned session)
  | 'active-file'    // step 5: shared credentials file (UNPINNED)
  | null;            // step 6: no auth

let _resolvedSource: AuthSource = null;

/** Returns HOW auth was resolved by the last resolveAuth() call. */
export function resolvedAuthSource(): AuthSource {
  return _resolvedSource;
}

/**
 * Resolve auth config from available sources.
 *
 * Priority chain (stops at first match):
 *   1. --api-key <key>    → direct override, no profile
 *   2. JAZ_API_KEY env    → direct override, no profile
 *   3. --org <label>      → lookup in profiles
 *   4. JAZ_ORG env        → lookup in profiles
 *   5. active profile     → from credentials file
 *   6. (none)             → null
 *
 * Steps 1-2 bypass profiles entirely (backward compat, CI/agent path).
 * Steps 3-5 use the org registry.
 */
export function resolveAuth(explicitKey?: string): AuthConfig | null {
  _resolvedLabel = null;
  _resolvedSource = null;

  // 1. Explicit --api-key flag
  if (explicitKey) {
    _resolvedSource = 'flag-api-key';
    return { mode: 'direct', apiKey: explicitKey };
  }

  // 2. JAZ_API_KEY environment variable
  const envKey = process.env.JAZ_API_KEY;
  if (envKey) {
    _resolvedSource = 'env-api-key';
    return { mode: 'direct', apiKey: envKey };
  }

  // 3. --org <label> CLI flag (set via preAction hook)
  if (_cliOrg) {
    _resolvedSource = 'flag-org';
    return resolveFromProfile(_cliOrg);
  }

  // 4. JAZ_ORG environment variable (pinned session)
  const envOrg = process.env.JAZ_ORG;
  if (envOrg) {
    _resolvedSource = 'env-org';
    return resolveFromProfile(envOrg);
  }

  // 5. Active profile in credentials file (UNPINNED — visual guard triggers)
  const activeLabel = getActiveLabel();
  if (activeLabel) {
    _resolvedSource = 'active-file';
    return resolveFromProfile(activeLabel);
  }

  // 6. No auth configured
  return null;
}

/**
 * Resolve auth from a named profile. Sets _resolvedLabel on success.
 * Throws AuthError if the profile doesn't exist.
 */
function resolveFromProfile(label: string): AuthConfig {
  const entry = getProfile(label);
  if (!entry) {
    const creds = readCredentials();
    const available = creds ? Object.keys(creds.orgs) : [];
    const hint = available.length > 0
      ? ` Available: ${available.join(', ')}`
      : ' No orgs registered. Run `clio auth add <key>` first.';
    throw new AuthError(`Org '${label}' not found.${hint}`);
  }
  _resolvedLabel = label;
  return { mode: 'direct', apiKey: entry.apiKey };
}

/**
 * Resolve auth or throw with a clear error message.
 */
export function requireAuth(explicitKey?: string): AuthConfig {
  const auth = resolveAuth(explicitKey);
  if (!auth) {
    throw new AuthError(
      'No API key configured. Run `clio auth add <key>`, set JAZ_API_KEY, or pass --api-key.'
    );
  }
  return auth;
}

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthError';
  }
}
