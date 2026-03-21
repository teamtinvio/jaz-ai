/**
 * Pre-flight guards for create operations.
 *
 * Currently: duplicate detection (search-before-create).
 * Future: archived entity checks, balance validations, etc.
 *
 * Used by tool executors (auto-skip), CLI commands (inform + skip),
 * and any other surface that creates entities.
 *
 * API dedup fields (verified via live testing):
 *   - Contacts: `name` (422 DUPLICATE_CONTACT)
 *   - Items: `itemCode` (422 ITEM_CODE_EXIST)
 *   - Accounts: `name` (400 ORGANIZATION_CHART_OF_ACCOUNT_DUPLICATED)
 */
import type { JazClient } from './client.js';
import type { Contact, Item, Account, Capsule, TaxProfile } from './types.js';
import type { Tag } from './tags.js';
import { searchContacts } from './contacts.js';
import { searchItems } from './items.js';
import { searchAccounts } from './chart-of-accounts.js';
import { searchCapsules } from './capsules.js';
import { searchTaxProfiles } from './tax-profiles.js';
import { listTags } from './tags.js';

/** Find existing contact by name. Returns first match or undefined. */
export async function findExistingContact(
  client: JazClient,
  name: string,
): Promise<Contact | undefined> {
  if (!name) return undefined;
  const result = await searchContacts(client, { filter: { name: { eq: name } }, limit: 1 });
  return result.totalElements > 0 ? result.data[0] : undefined;
}

/** Find existing item by itemCode. Returns first match or undefined. */
export async function findExistingItem(
  client: JazClient,
  itemCode: string,
): Promise<Item | undefined> {
  if (!itemCode) return undefined;
  const result = await searchItems(client, { filter: { itemCode: { eq: itemCode } }, limit: 1 });
  return result.totalElements > 0 ? result.data[0] : undefined;
}

// ── Account type normalization ───────────────────────────────────

/** Normalize common accountType variations to exact API values.
 *  Pure map lookup — no network calls, no perf impact. */
const ACCOUNT_TYPE_MAP: Record<string, string> = {
  'current assets': 'Current Asset', 'current asset': 'Current Asset',
  'fixed assets': 'Fixed Asset', 'fixed asset': 'Fixed Asset',
  'bank account': 'Bank Accounts', 'bank accounts': 'Bank Accounts', 'bank': 'Bank Accounts',
  'current liabilities': 'Current Liability', 'current liability': 'Current Liability',
  'non-current liabilities': 'Non-current Liability', 'non-current liability': 'Non-current Liability',
  'equity': 'Shareholders Equity', 'shareholders equity': 'Shareholders Equity',
  "shareholders' equity": 'Shareholders Equity', "shareholder's equity": 'Shareholders Equity',
  'revenue': 'Operating Revenue', 'operating revenue': 'Operating Revenue',
  'other revenue': 'Other Revenue', 'other income': 'Other Revenue',
  'expense': 'Operating Expense', 'operating expense': 'Operating Expense', 'expenses': 'Operating Expense',
  'direct costs': 'Direct Costs', 'cost of goods sold': 'Direct Costs', 'cogs': 'Direct Costs',
  'cash': 'Cash', 'inventory': 'Inventory',
};

export function normalizeAccountType(raw: unknown): string {
  if (typeof raw !== 'string') return String(raw ?? '');
  const trimmed = raw.trim();
  return ACCOUNT_TYPE_MAP[trimmed.toLowerCase()] ?? trimmed;
}

// ── Duplicate detection ─────────────────────────────────────────

/** Find existing capsule by title. Normalizes whitespace/case for comparison. */
export async function findExistingCapsule(
  client: JazClient,
  title: string,
): Promise<Capsule | undefined> {
  if (!title?.trim()) return undefined;
  const normalized = title.trim().toLowerCase();
  const result = await searchCapsules(client, { filter: { title: { contains: title.trim() } }, limit: 20 });
  return result.data.find(c => c.title?.trim().toLowerCase() === normalized);
}

/** Find existing account by name. Returns first match or undefined. */
export async function findExistingAccount(
  client: JazClient,
  name: string,
): Promise<Account | undefined> {
  if (!name) return undefined;
  const result = await searchAccounts(client, { filter: { name: { eq: name } }, limit: 1 });
  return result.totalElements > 0 ? result.data[0] : undefined;
}

/** Find existing tax profile by name. Returns first exact match or undefined. */
export async function findExistingTaxProfile(
  client: JazClient,
  name: string,
): Promise<TaxProfile | undefined> {
  if (!name) return undefined;
  const result = await searchTaxProfiles(client, { filter: { name: { eq: name } }, limit: 1 });
  return result.totalElements > 0 ? result.data[0] : undefined;
}

/** Find existing tag by name (case-insensitive). Tags have no search endpoint, so we list + filter. */
export async function findExistingTag(
  client: JazClient,
  name: string,
): Promise<Tag | undefined> {
  if (!name) return undefined;
  const lower = name.toLowerCase().trim();
  const result = await listTags(client, { limit: 500 });
  return result.data.find((t) => t.name.toLowerCase().trim() === lower);
}

// ── UUID validation ─────────────────────────────────────────────

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Pre-flight UUID validation — fail fast with actionable hint instead of hitting API. */
export function assertUUID(value: string, field: string, hint: string): void {
  if (!UUID_RE.test(value)) {
    throw new Error(`${field} must be a valid UUID (got "${value}"). ${hint}`);
  }
}
