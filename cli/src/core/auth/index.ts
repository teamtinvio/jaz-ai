export type { AuthConfig, DirectAuth, StoredCredentials, ProfileEntry, CredentialsFileV2 } from './types.js';
export {
  readStoredCredentials, writeStoredCredentials, clearStoredCredentials, getCredentialsPath,
  readCredentials, writeCredentials, getProfile, setProfile, removeProfile,
  getActiveLabel, setActiveLabel, listProfiles, findLabelByApiKey,
} from './credentials.js';
export type { AuthSource } from './resolve.js';
export { resolveAuth, requireAuth, AuthError, setActiveOrg, resolvedProfileLabel, resolvedAuthSource } from './resolve.js';
