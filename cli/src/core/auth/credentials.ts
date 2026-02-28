import { readFileSync, writeFileSync, renameSync, mkdirSync, unlinkSync, existsSync, openSync, fsyncSync, closeSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import type { StoredCredentials, CredentialsFileV2, ProfileEntry } from './types.js';

const CONFIG_DIR = join(homedir(), '.config', 'jaz-clio');
const CREDENTIALS_FILE = join(CONFIG_DIR, 'credentials.json');

export function getCredentialsPath(): string {
  return CREDENTIALS_FILE;
}

// ── v2 Multi-Profile CRUD ─────────────────────────────────────────

/**
 * Read credentials file. Auto-migrates v1 (single key) to v2 (multi-profile).
 * Returns null if file doesn't exist.
 */
export function readCredentials(): CredentialsFileV2 | null {
  try {
    const raw = readFileSync(CREDENTIALS_FILE, 'utf-8');
    const parsed = JSON.parse(raw);

    // v2 format — return as-is
    if (parsed.version === 2) {
      return parsed as CredentialsFileV2;
    }

    // v1 format — migrate to v2 with "default" label
    if (parsed.apiKey) {
      const migrated: CredentialsFileV2 = {
        version: 2,
        active: 'default',
        orgs: {
          default: {
            apiKey: parsed.apiKey,
            orgName: 'Unknown (migrated)',
            orgId: '',
            currency: '',
            country: '',
            addedAt: parsed.createdAt ?? new Date().toISOString(),
          },
        },
      };
      // Best-effort write-back — return migrated in-memory even if write fails
      try { writeCredentials(migrated); } catch { /* read-only FS is ok */ }
      return migrated;
    }

    return null;
  } catch {
    return null;
  }
}

/** Write credentials file atomically (write-tmp-fsync-rename) with 0600 permissions. */
export function writeCredentials(creds: CredentialsFileV2): void {
  mkdirSync(CONFIG_DIR, { recursive: true });
  const tmp = CREDENTIALS_FILE + '.tmp';
  writeFileSync(tmp, JSON.stringify(creds, null, 2) + '\n', { mode: 0o600 });
  const fd = openSync(tmp, 'r');
  try { fsyncSync(fd); } finally { closeSync(fd); }
  renameSync(tmp, CREDENTIALS_FILE);
}

/** Get a specific profile entry by label. */
export function getProfile(label: string): ProfileEntry | null {
  const creds = readCredentials();
  return creds?.orgs[label] ?? null;
}

/** Add or update a profile entry. Creates the file if it doesn't exist. */
export function setProfile(label: string, entry: ProfileEntry): void {
  const creds = readCredentials() ?? { version: 2 as const, active: '', orgs: {} };
  creds.orgs[label] = entry;
  // Auto-set active if this is the first/only org
  if (!creds.active || Object.keys(creds.orgs).length === 1) {
    creds.active = label;
  }
  writeCredentials(creds);
}

/** Remove a profile. Returns false if label not found. */
export function removeProfile(label: string): boolean {
  const creds = readCredentials();
  if (!creds || !(label in creds.orgs)) return false;
  delete creds.orgs[label];
  if (creds.active === label) {
    creds.active = '';
  }
  writeCredentials(creds);
  return true;
}

/** Get the active profile label. */
export function getActiveLabel(): string | null {
  const creds = readCredentials();
  return creds?.active || null;
}

/** Set the active profile label. Throws if label not in orgs. */
export function setActiveLabel(label: string): void {
  const creds = readCredentials();
  if (!creds) throw new Error('No credentials file found. Run `clio auth add <key>` first.');
  if (!(label in creds.orgs)) {
    const available = Object.keys(creds.orgs).join(', ');
    throw new Error(`Org '${label}' not found. Available: ${available}`);
  }
  creds.active = label;
  writeCredentials(creds);
}

/** List all profiles. */
export function listProfiles(): Record<string, ProfileEntry> {
  return readCredentials()?.orgs ?? {};
}

/**
 * Find a label that already uses the given API key.
 * Returns the label or null if no match.
 */
export function findLabelByApiKey(apiKey: string): string | null {
  const creds = readCredentials();
  if (!creds) return null;
  for (const [label, entry] of Object.entries(creds.orgs)) {
    if (entry.apiKey === apiKey) return label;
  }
  return null;
}

// ── v1 Backward Compat Wrappers ──────────────────────────────────
// Used by existing tests and legacy `set-key` codepath.

export function readStoredCredentials(): StoredCredentials | null {
  const creds = readCredentials();
  if (!creds) return null;
  const activeLabel = creds.active;
  const entry = activeLabel ? creds.orgs[activeLabel] : Object.values(creds.orgs)[0];
  if (!entry) return null;
  return { apiKey: entry.apiKey, createdAt: entry.addedAt };
}

export function writeStoredCredentials(apiKey: string): void {
  setProfile('default', {
    apiKey,
    orgName: 'Unknown',
    orgId: '',
    currency: '',
    country: '',
    addedAt: new Date().toISOString(),
  });
}

export function clearStoredCredentials(): boolean {
  if (existsSync(CREDENTIALS_FILE)) {
    unlinkSync(CREDENTIALS_FILE);
    return true;
  }
  return false;
}
