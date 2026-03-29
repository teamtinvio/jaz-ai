/**
 * Draft sanitization — converts GET response shapes to PUT-compatible format.
 *
 * The Jaz API returns different field names and shapes in GET vs PUT:
 * - GET: organizationAccountResourceId → PUT: accountResourceId
 * - GET: taxProfile { resourceId } object → PUT: taxProfileResourceId string
 * - GET: discount { rateType, rateValue } → PUT: discount number
 * - GET: debitAmount/creditAmount → PUT: amount + type
 * - GET: dates with "T00:00:00Z" → PUT: YYYY-MM-DD
 */

/**
 * Sanitize a line item from GET response to PUT-compatible format.
 *
 * Extracts only the fields that CreateBillClientRequestLineItem schema accepts.
 * Strips response-only fields (organizationAccountResourceId, taxProfile object,
 * withholdingTaxAmount, line-item resourceId, etc.).
 */
export function sanitizeLineItem(li: any): Record<string, unknown> {  // eslint-disable-line @typescript-eslint/no-explicit-any
  const clean: Record<string, unknown> = {};

  // Core fields
  if (li.name != null) clean.name = li.name;
  if (li.quantity != null) clean.quantity = li.quantity;
  if (li.unitPrice != null) clean.unitPrice = li.unitPrice;
  if (li.unit) clean.unit = li.unit;

  // Account: GET uses organizationAccountResourceId, PUT uses accountResourceId
  const acctId = li.accountResourceId || li.organizationAccountResourceId;
  if (acctId) clean.accountResourceId = acctId;

  // Tax profile: GET returns { resourceId } object, PUT expects string UUID
  const tpId = li.taxProfileResourceId
    || (li.taxProfile && typeof li.taxProfile === 'object' ? li.taxProfile.resourceId : null);
  if (tpId) clean.taxProfileResourceId = tpId;

  // Optional fields the PUT accepts
  if (li.itemResourceId) clean.itemResourceId = li.itemResourceId;
  if (li.discount != null) {
    // PUT expects a number (flat discount); GET returns { rateType, rateValue } object
    clean.discount = typeof li.discount === 'object' ? (li.discount.rateValue ?? 0) : li.discount;
  }

  return clean;
}

/**
 * Sanitize a journal entry from GET response to PUT-compatible format.
 * Strips response-only fields (debitAmount, creditAmount, organizationAccountResourceId).
 */
export function sanitizeJournalEntry(e: any): Record<string, unknown> {  // eslint-disable-line @typescript-eslint/no-explicit-any
  const clean: Record<string, unknown> = {};

  // Account: GET uses organizationAccountResourceId, PUT uses accountResourceId
  const acctId = e.accountResourceId || e.organizationAccountResourceId;
  if (acctId) clean.accountResourceId = acctId;

  // Amount/type: GET uses debitAmount/creditAmount, PUT uses amount+type
  if (e.amount != null) {
    clean.amount = e.amount;
  } else if (e.debitAmount != null && e.debitAmount > 0) {
    clean.amount = e.debitAmount;
  } else if (e.creditAmount != null && e.creditAmount > 0) {
    clean.amount = e.creditAmount;
  }
  if (e.type) {
    clean.type = e.type; // Already in PUT form (DEBIT or CREDIT)
  } else if (e.debitAmount != null && e.debitAmount > 0) {
    clean.type = 'DEBIT';
  } else if (e.creditAmount != null && e.creditAmount > 0) {
    clean.type = 'CREDIT';
  }

  if (e.description) clean.description = e.description;
  if (e.contactResourceId) clean.contactResourceId = e.contactResourceId;
  return clean;
}

/**
 * Normalize a date from GET response format (ISO with time: "2026-02-27T00:00:00Z")
 * to PUT format (YYYY-MM-DD only). Returns as-is if already in YYYY-MM-DD format.
 */
export function normalizeDate(date: string | undefined | null): string | undefined {
  if (!date) return undefined;
  return date.split('T')[0];
}
