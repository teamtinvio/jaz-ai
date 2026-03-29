/**
 * Date normalization utilities.
 * Parses common date formats into YYYY-MM-DD strings.
 *
 * Ported from the Python predecessor's _normalize_date().
 * Used by CLI and agent to handle free-form date inputs from users and CSVs.
 */

/**
 * Common date format patterns, tried in priority order.
 * Each entry: [regex, group-to-position mapping, century-expand flag].
 */
const DATE_PATTERNS: Array<{
  regex: RegExp;
  extract: (m: RegExpMatchArray) => { y: string; m: string; d: string };
}> = [
  // ISO 8601: 2026-02-17
  {
    regex: /^(\d{4})-(\d{1,2})-(\d{1,2})$/,
    extract: (m) => ({ y: m[1], m: m[2], d: m[3] }),
  },
  // DD/MM/YYYY: 17/02/2026
  {
    regex: /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
    extract: (m) => ({ y: m[3], m: m[2], d: m[1] }),
  },
  // DD/MM/YY: 17/02/26
  {
    regex: /^(\d{1,2})\/(\d{1,2})\/(\d{2})$/,
    extract: (m) => ({ y: expandYear(m[3]), m: m[2], d: m[1] }),
  },
  // MM/DD/YYYY: 02/17/2026 — US format (tried after DD/MM/YYYY; ambiguous)
  // Skipped: ambiguous with DD/MM/YYYY. We default to DD/MM/YYYY (non-US).
  // YYYY/MM/DD: 2026/02/17
  {
    regex: /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/,
    extract: (m) => ({ y: m[1], m: m[2], d: m[3] }),
  },
  // DD-MM-YYYY: 17-02-2026
  {
    regex: /^(\d{1,2})-(\d{1,2})-(\d{4})$/,
    extract: (m) => ({ y: m[3], m: m[2], d: m[1] }),
  },
  // DD-MM-YY: 17-02-26
  {
    regex: /^(\d{1,2})-(\d{1,2})-(\d{2})$/,
    extract: (m) => ({ y: expandYear(m[3]), m: m[2], d: m[1] }),
  },
];

/** Month name abbreviation -> month number (1-based). */
const MONTH_NAMES: Record<string, number> = {
  jan: 1, january: 1,
  feb: 2, february: 2,
  mar: 3, march: 3,
  apr: 4, april: 4,
  may: 5,
  jun: 6, june: 6,
  jul: 7, july: 7,
  aug: 8, august: 8,
  sep: 9, september: 9,
  oct: 10, october: 10,
  nov: 11, november: 11,
  dec: 12, december: 12,
};

// "17 Feb 2026", "17 February 2026"
const RE_DD_MON_YYYY = /^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/;
// "Feb 17, 2026", "February 17, 2026"
const RE_MON_DD_YYYY = /^([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})$/;

/**
 * Expand 2-digit year to 4-digit.
 * 00-49 -> 2000-2049, 50-99 -> 1950-1999.
 */
function expandYear(yy: string): string {
  const n = parseInt(yy, 10);
  return String(n < 50 ? 2000 + n : 1900 + n);
}

/** Pad a number string to 2 digits. */
function pad2(s: string): string {
  return s.padStart(2, '0');
}

/**
 * Validate month (1-12) and day (1-31) ranges.
 * Does NOT validate days-in-month (e.g., Feb 30 passes).
 * The API will reject truly invalid dates.
 */
function validMonthDay(m: number, d: number): boolean {
  return m >= 1 && m <= 12 && d >= 1 && d <= 31;
}

/**
 * Normalize a raw date string to YYYY-MM-DD format.
 *
 * Supports:
 *  - ISO 8601: 2026-02-17
 *  - DD/MM/YYYY, DD/MM/YY
 *  - YYYY/MM/DD
 *  - DD-MM-YYYY, DD-MM-YY
 *  - DD Mon YYYY: 17 Feb 2026
 *  - Mon DD, YYYY: Feb 17, 2026
 *
 * Returns null if the input cannot be parsed.
 */
export function normalizeDate(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // 1. Try regex patterns
  for (const pattern of DATE_PATTERNS) {
    const match = trimmed.match(pattern.regex);
    if (match) {
      const parts = pattern.extract(match);
      const month = parseInt(parts.m, 10);
      const day = parseInt(parts.d, 10);
      if (validMonthDay(month, day)) {
        return `${parts.y}-${pad2(parts.m)}-${pad2(parts.d)}`;
      }
    }
  }

  // 2. Try "17 Feb 2026" or "17 February 2026"
  const ddMon = trimmed.match(RE_DD_MON_YYYY);
  if (ddMon) {
    const month = MONTH_NAMES[ddMon[2].toLowerCase()];
    const day = parseInt(ddMon[1], 10);
    if (month && validMonthDay(month, day)) {
      return `${ddMon[3]}-${pad2(String(month))}-${pad2(ddMon[1])}`;
    }
  }

  // 3. Try "Feb 17, 2026" or "February 17, 2026"
  const monDd = trimmed.match(RE_MON_DD_YYYY);
  if (monDd) {
    const month = MONTH_NAMES[monDd[1].toLowerCase()];
    const day = parseInt(monDd[2], 10);
    if (month && validMonthDay(month, day)) {
      return `${monDd[3]}-${pad2(String(month))}-${pad2(monDd[2])}`;
    }
  }

  return null;
}

/**
 * Like normalizeDate but returns the original string if parsing fails.
 * Use when you want to pass through to the API for validation.
 */
export function normalizeDateOrPassthrough(raw: string): string {
  return normalizeDate(raw) ?? raw.trim();
}

/**
 * Check if a string is a valid YYYY-MM-DD date.
 */
export function isISODate(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}
