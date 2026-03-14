/** Direct auth — API key identifies a shadow org user. */
export interface DirectAuth {
  mode: 'direct';
  apiKey: string;
}


export type AuthConfig = DirectAuth;

/** Legacy v1 credentials (single key). Auto-migrated to v2 on first read. */
export interface StoredCredentials {
  apiKey: string;
  createdAt: string;
}

// ── Multi-org credentials (v2) ──────────────────────────────────

export interface ProfileEntry {
  apiKey: string;
  orgName: string;
  orgId: string;
  currency: string;
  country: string;
  addedAt: string;
}

export interface CredentialsFileV2 {
  version: 2;
  active: string;
  orgs: Record<string, ProfileEntry>;
}
