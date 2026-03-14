/**
 * Input validation for clio jobs blueprint generators.
 * Parses period strings and validates flags.
 */

export class JobValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'JobValidationError';
  }
}

export interface MonthPeriod {
  type: 'month';
  year: number;
  month: number;
  startDate: string;
  endDate: string;
  label: string;
}

export interface QuarterPeriod {
  type: 'quarter';
  year: number;
  quarter: number;
  startDate: string;
  endDate: string;
  months: MonthPeriod[];
  label: string;
}

export interface YearPeriod {
  type: 'year';
  year: number;
  startDate: string;
  endDate: string;
  quarters: QuarterPeriod[];
  label: string;
}

/** Last day of a given month (1-indexed). */
function lastDay(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/** Format YYYY-MM-DD from components. */
function fmtDate(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/** Short month name (Jan, Feb, etc.) */
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Parse a month period string like "2025-01". */
export function parseMonthPeriod(period: string): MonthPeriod {
  const match = period.match(/^(\d{4})-(\d{2})$/);
  if (!match) {
    throw new JobValidationError(`Invalid month period: "${period}". Expected YYYY-MM (e.g., 2025-01)`);
  }
  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  if (month < 1 || month > 12) {
    throw new JobValidationError(`Invalid month: ${month}. Must be 01-12`);
  }
  const end = lastDay(year, month);
  return {
    type: 'month',
    year,
    month,
    startDate: fmtDate(year, month, 1),
    endDate: fmtDate(year, month, end),
    label: `${MONTH_NAMES[month - 1]} ${year}`,
  };
}

/** Parse a quarter period string like "2025-Q1". */
export function parseQuarterPeriod(period: string): QuarterPeriod {
  const match = period.match(/^(\d{4})-Q([1-4])$/i);
  if (!match) {
    throw new JobValidationError(`Invalid quarter period: "${period}". Expected YYYY-QN (e.g., 2025-Q1)`);
  }
  const year = parseInt(match[1], 10);
  const quarter = parseInt(match[2], 10);

  const firstMonth = (quarter - 1) * 3 + 1;
  const lastMonth = firstMonth + 2;
  const endDay = lastDay(year, lastMonth);

  const months: MonthPeriod[] = [];
  for (let m = firstMonth; m <= lastMonth; m++) {
    months.push({
      type: 'month',
      year,
      month: m,
      startDate: fmtDate(year, m, 1),
      endDate: fmtDate(year, m, lastDay(year, m)),
      label: `${MONTH_NAMES[m - 1]} ${year}`,
    });
  }

  return {
    type: 'quarter',
    year,
    quarter,
    startDate: fmtDate(year, firstMonth, 1),
    endDate: fmtDate(year, lastMonth, endDay),
    months,
    label: `Q${quarter} ${year}`,
  };
}

/** Parse a year period string like "2025". */
export function parseYearPeriod(period: string): YearPeriod {
  const match = period.match(/^(\d{4})$/);
  if (!match) {
    throw new JobValidationError(`Invalid year period: "${period}". Expected YYYY (e.g., 2025)`);
  }
  const year = parseInt(match[1], 10);

  const quarters: QuarterPeriod[] = [];
  for (let q = 1; q <= 4; q++) {
    quarters.push(parseQuarterPeriod(`${year}-Q${q}`));
  }

  return {
    type: 'year',
    year,
    startDate: fmtDate(year, 1, 1),
    endDate: fmtDate(year, 12, 31),
    quarters,
    label: `FY${year}`,
  };
}

/** Validate an optional date string (YYYY-MM-DD). Round-trip checks components. */
export function validateDateString(date: string | undefined, name: string): void {
  if (!date) return;
  const m = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) {
    throw new JobValidationError(`${name} must be YYYY-MM-DD format (got "${date}")`);
  }
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const da = Number(m[3]);
  const d = new Date(Date.UTC(y, mo - 1, da));
  if (d.getUTCFullYear() !== y || d.getUTCMonth() !== mo - 1 || d.getUTCDate() !== da) {
    throw new JobValidationError(`Invalid ${name}: "${date}"`);
  }
}

/** Validate overdue-days is a positive integer. */
export function validateOverdueDays(days: number): void {
  if (!Number.isInteger(days) || days < 1) {
    throw new JobValidationError(`Overdue days must be a positive integer (got ${days})`);
  }
}
