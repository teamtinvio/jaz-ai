/**
 * Intelligence layer — smart utilities shared by CLI and agent.
 */

// Fuzzy matching
export {
  levenshtein,
  levenshteinSimilarity,
  trigrams,
  trigramSimilarity,
  fuzzyScore,
  fuzzyMatch,
  type FuzzyMatch,
} from './fuzzy.js';

// Contact resolution
export { resolveContact, resolveBestContact } from './contact-resolver.js';

// Account resolution
export {
  resolveAccount,
  resolveBestAccount,
  filterLineItemAccounts,
  filterPaymentAccounts,
} from './account-resolver.js';

// Bank account resolution
export { resolveBankAccount, matchBankAccount, type ResolvedBankAccount } from './bank-resolver.js';

// Date normalization
export {
  normalizeDate,
  normalizeDateOrPassthrough,
  isISODate,
} from './date-normalizer.js';

// Amount parsing
export {
  parseAmount,
  parseAccountingAmount,
  formatAmount,
} from './amount-parser.js';

// No-reply / acknowledgment detection
export { isAcknowledgment } from './no-reply.js';

// CUD action summaries
export {
  extractActionsSummary,
  formatToolCallsForChannel,
  type CUDAction,
  type EntityType,
  type CUDActionSummary,
  type ToolCall,
} from './actions-summary.js';
