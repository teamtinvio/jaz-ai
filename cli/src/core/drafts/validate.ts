/**
 * Draft validation — pure business logic, no CLI dependencies.
 *
 * Shared by CLI commands, MCP tools, and daemon agent tools.
 * Field specs define what's mandatory to finalize each BT type.
 */

// ── Field Spec ──────────────────────────────────────────────────

export interface DraftFieldSpec {
  /** JSON field name: 'contactResourceId', 'accountResourceId', etc. */
  field: string;
  /** Human-readable label: 'Contact', 'Account', etc. */
  label: string;
  /** CLI hint shown when missing: '--contact <name or UUID>' */
  hint: string;
  /** Returns true if the field is present/valid on the item. */
  check: (item: any) => boolean;  // eslint-disable-line @typescript-eslint/no-explicit-any
  /** True = check on each lineItems[i] (or journalEntries[i]), not the top-level item. */
  perLineItem?: boolean;
}

// ── Bill / Invoice / Credit Note field specs ────────────────────

export const BILL_REQUIRED_FIELDS: DraftFieldSpec[] = [
  { field: 'contactResourceId', label: 'Contact', hint: '--contact <name or UUID>', check: (b) => !!b.contactResourceId },
  { field: 'valueDate', label: 'Date', hint: '--date <YYYY-MM-DD>', check: (b) => !!b.valueDate },
  { field: 'dueDate', label: 'Due date', hint: '--due <YYYY-MM-DD>', check: (b) => !!b.dueDate },
  { field: 'lineItems', label: 'Line items', hint: '--lines <json>', check: (b) => b.lineItems?.length > 0 },
  { field: 'name', label: 'Item name', hint: 'via --lines', check: (li) => !!li.name, perLineItem: true },
  { field: 'unitPrice', label: 'Unit price', hint: 'via --lines', check: (li) => li.unitPrice != null, perLineItem: true },
  // GET returns organizationAccountResourceId; CREATE/PUT use accountResourceId — check both
  { field: 'accountResourceId', label: 'Account', hint: '--account <name or UUID>', check: (li) => !!(li.accountResourceId || li.organizationAccountResourceId), perLineItem: true },
];

export const INVOICE_REQUIRED_FIELDS: DraftFieldSpec[] = [...BILL_REQUIRED_FIELDS];
export const CREDIT_NOTE_REQUIRED_FIELDS: DraftFieldSpec[] =
  BILL_REQUIRED_FIELDS.filter((s) => s.field !== 'dueDate');

// ── Journal field specs ─────────────────────────────────────────

export const JOURNAL_REQUIRED_FIELDS: DraftFieldSpec[] = [
  { field: 'valueDate', label: 'Date', hint: '--date <YYYY-MM-DD>', check: (j) => !!j.valueDate },
  { field: 'journalEntries', label: 'Journal entries', hint: '--entries <json>', check: (j) => j.journalEntries?.length > 0 },
  { field: 'accountResourceId', label: 'Account', hint: '--account <name or UUID>', check: (e) => !!(e.accountResourceId || e.organizationAccountResourceId), perLineItem: true },
  { field: 'amount', label: 'Amount', hint: 'via --entries', check: (e) =>
    (e.amount != null && e.amount > 0) ||
    (e.debitAmount != null && e.debitAmount > 0) ||
    (e.creditAmount != null && e.creditAmount > 0), perLineItem: true },
];

// ── Validation Types ────────────────────────────────────────────

export interface FieldValidation {
  status: 'ok' | 'missing';
  value?: string | number;
  resourceId?: string;
  hint?: string;
}

export interface LineItemValidation {
  index: number;
  name: string | null;
  nameStatus: 'ok' | 'missing';
  unitPrice: number | null;
  unitPriceStatus: 'ok' | 'missing';
  account: FieldValidation;
  taxProfile?: FieldValidation;
}

export interface DraftValidation {
  contact?: FieldValidation;
  valueDate: FieldValidation;
  dueDate?: FieldValidation;
  lineItems: LineItemValidation[];
}

export interface DraftReport {
  resourceId: string;
  reference: string | null;
  totalAmount: number;
  attachmentCount: number;
  ready: boolean;
  missingCount: number;
  missingFields: string[];
  validation: DraftValidation;
}

// ── Core Validation ─────────────────────────────────────────────

/**
 * Validate a draft against its field specs.
 *
 * Returns the list of missing field paths (e.g. ['contactResourceId', 'lineItems[0].accountResourceId']).
 */
export function validateDraft(
  item: any,  // eslint-disable-line @typescript-eslint/no-explicit-any
  specs: DraftFieldSpec[],
  lineItemsKey = 'lineItems',
): { missingFields: string[]; missingCount: number; ready: boolean } {
  const missingFields: string[] = [];

  for (const spec of specs) {
    if (spec.perLineItem) {
      const items = item[lineItemsKey] ?? [];
      for (let i = 0; i < items.length; i++) {
        if (!spec.check(items[i])) {
          missingFields.push(`${lineItemsKey}[${i}].${spec.field}`);
        }
      }
    } else {
      if (!spec.check(item)) {
        missingFields.push(spec.field);
      }
    }
  }

  return {
    missingFields,
    missingCount: missingFields.length,
    ready: missingFields.length === 0,
  };
}

/**
 * Build structured per-field validation for JSON output.
 *
 * Produces the validation object with status/value/hint per field,
 * making it crystal clear to agents what's present and what's missing.
 */
export function buildValidation(
  item: any,  // eslint-disable-line @typescript-eslint/no-explicit-any
  specs: DraftFieldSpec[],
  lineItemsKey = 'lineItems',
): DraftValidation {
  const topSpecs = specs.filter((s) => !s.perLineItem);
  const liSpecs = specs.filter((s) => s.perLineItem);

  // Build result — only include top-level fields that exist in the specs
  const result: DraftValidation = {
    valueDate: buildFieldValidation(item, 'valueDate', 'Date', '--date <YYYY-MM-DD>', topSpecs),
    lineItems: [],
  };

  // Only include contact/dueDate when they're in the field specs
  if (topSpecs.some((s) => s.field === 'contactResourceId')) {
    result.contact = buildFieldValidation(item, 'contactResourceId', 'Contact', '--contact <name or UUID>', topSpecs);
  }
  if (topSpecs.some((s) => s.field === 'dueDate')) {
    result.dueDate = buildFieldValidation(item, 'dueDate', 'Due date', '--due <YYYY-MM-DD>', topSpecs);
  }

  // Build per-line-item validations using liSpecs for consistent status reporting
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- journal entries don't match LineItem shape
  const items: any[] = item[lineItemsKey] ?? [];
  result.lineItems = items.map((li: any, i: number) => {  // eslint-disable-line @typescript-eslint/no-explicit-any
    // GET returns organizationAccountResourceId; CREATE/PUT use accountResourceId — check both
    const acctId = li.accountResourceId || li.organizationAccountResourceId;
    const account: FieldValidation = acctId
      ? { status: 'ok', resourceId: acctId }
      : { status: 'missing', hint: '--account <name or UUID>' };

    // Journal entries: show amount/type instead of name/unitPrice
    // GET returns debitAmount/creditAmount (not amount/type)
    if (lineItemsKey === 'journalEntries') {
      const amountSpec = liSpecs.find((s) => s.field === 'amount');
      const amountOk = amountSpec ? amountSpec.check(li) : true;
      const entryAmount = li.amount ?? li.debitAmount ?? li.creditAmount ?? null;
      const debit = li.debitAmount;
      const credit = li.creditAmount;
      const entryType = li.type ?? (typeof debit === 'number' && debit > 0 ? 'DEBIT' : typeof credit === 'number' && credit > 0 ? 'CREDIT' : null);
      return {
        index: i,
        name: li.description || entryType || null,
        nameStatus: 'ok' as const,
        unitPrice: entryAmount,
        unitPriceStatus: amountOk ? 'ok' as const : 'missing' as const,
        account,
      };
    }

    // Line items: use name/unitPrice specs
    const nameSpec = liSpecs.find((s) => s.field === 'name');
    const priceSpec = liSpecs.find((s) => s.field === 'unitPrice');
    const nameOk = nameSpec ? nameSpec.check(li) : true;
    const priceOk = priceSpec ? priceSpec.check(li) : true;

    return {
      index: i,
      name: li.name || null,
      nameStatus: nameOk ? 'ok' as const : 'missing' as const,
      unitPrice: li.unitPrice ?? null,
      unitPriceStatus: priceOk ? 'ok' as const : 'missing' as const,
      account,
    };
  });

  return result;
}

function buildFieldValidation(
  item: any,  // eslint-disable-line @typescript-eslint/no-explicit-any
  field: string,
  label: string,
  hint: string,
  specs: DraftFieldSpec[],
): FieldValidation {
  const spec = specs.find((s) => s.field === field);
  if (!spec) {
    // Field not in specs — treat as optional, report value if present
    const value = item[field];
    return value ? { status: 'ok', value } : { status: 'ok' };
  }

  if (spec.check(item)) {
    const value = item[field];
    // For contacts, include both displayName and resourceId
    if (field === 'contactResourceId') {
      return { status: 'ok', value: item.contactName || value, resourceId: value };
    }
    return { status: 'ok', value };
  }

  return { status: 'missing', hint };
}

// ── Build DraftReport ───────────────────────────────────────────

export function buildDraftReport(
  item: any,  // eslint-disable-line @typescript-eslint/no-explicit-any
  specs: DraftFieldSpec[],
  attachmentCount: number,
  lineItemsKey = 'lineItems',
): DraftReport {
  const { missingFields, missingCount, ready } = validateDraft(item, specs, lineItemsKey);
  const validation = buildValidation(item, specs, lineItemsKey);

  return {
    resourceId: item.resourceId,
    reference: item.reference || null,
    totalAmount: item.totalAmount ?? 0,
    attachmentCount,
    ready,
    missingCount,
    missingFields,
    validation,
  };
}
