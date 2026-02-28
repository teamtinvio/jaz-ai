/**
 * Amount/money parsing utilities.
 * Handles common currency-formatted strings from user input and CSVs.
 *
 * Rules:
 * - Strips currency symbols ($, SGD, PHP, etc.) and commas
 * - Handles parentheses for negatives: (1,234.56) -> -1234.56
 * - Validates max 2 decimal places (accounting precision)
 * - Returns null for unparseable inputs
 */

/**
 * Strip leading currency symbols and codes.
 * Handles: $, USD, SGD, PHP, EUR, GBP, etc.
 */
function stripCurrency(raw: string): string {
  return raw
    .replace(/^[A-Z]{3}\s*/i, '') // "USD 1,234.56" -> "1,234.56"
    .replace(/^\$\s*/, '')         // "$1,234.56" -> "1,234.56"
    .replace(/^[£€¥₱₹]\s*/, '');  // "£1,234.56" -> "1,234.56"
}

/**
 * Parse a raw amount string to a number.
 *
 * Supported formats:
 *  - "1234.56"        -> 1234.56
 *  - "1,234.56"       -> 1234.56
 *  - "$1,234.56"      -> 1234.56
 *  - "SGD 1,234.56"   -> 1234.56
 *  - "(1,234.56)"     -> -1234.56  (accounting negative)
 *  - "-1,234.56"      -> -1234.56
 *  - "1234"           -> 1234
 *
 * Returns null if the input cannot be parsed.
 */
export function parseAmount(raw: string): number | null {
  let s = raw.trim();
  if (!s) return null;

  // Handle accounting negatives: (1,234.56) -> -1,234.56
  let negative = false;
  if (s.startsWith('(') && s.endsWith(')')) {
    negative = true;
    s = s.slice(1, -1).trim();
  } else if (s.startsWith('-')) {
    negative = true;
    s = s.slice(1).trim();
  }

  // Strip currency prefix
  s = stripCurrency(s);

  // Remove thousands separators (commas)
  s = s.replace(/,/g, '');

  // Validate: must be digits with optional decimal point
  if (!/^\d+(\.\d+)?$/.test(s)) {
    return null;
  }

  const num = Number(s);
  if (!isFinite(num)) return null;

  return negative ? -num : num;
}

/**
 * Parse amount with max 2 decimal places (accounting precision).
 * Returns null if input has more than 2 decimal places.
 */
export function parseAccountingAmount(raw: string): number | null {
  let s = raw.trim();
  if (!s) return null;

  // Handle negatives
  let negative = false;
  if (s.startsWith('(') && s.endsWith(')')) {
    negative = true;
    s = s.slice(1, -1).trim();
  } else if (s.startsWith('-')) {
    negative = true;
    s = s.slice(1).trim();
  }

  s = stripCurrency(s);
  s = s.replace(/,/g, '');

  // Validate: max 2 decimal places
  if (!/^\d+(\.\d{1,2})?$/.test(s)) {
    return null;
  }

  const num = Math.round(Number(s) * 100) / 100;
  if (!isFinite(num)) return null;

  return negative ? -num : num;
}

/**
 * Format a number as a display amount with 2 decimal places and commas.
 * Example: 1234.5 -> "1,234.50"
 */
export function formatAmount(amount: number): string {
  const sign = amount < 0 ? '-' : '';
  const abs = Math.abs(amount);
  const [whole, frac = '00'] = abs.toFixed(2).split('.');
  const withCommas = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${sign}${withCommas}.${frac}`;
}
