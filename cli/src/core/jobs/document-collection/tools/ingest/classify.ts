/**
 * Folder name → document type classifier.
 *
 * Uses case-insensitive prefix matching on folder names to auto-classify
 * documents into INVOICE, BILL, CUSTOMER_CREDIT_NOTE, SUPPLIER_CREDIT_NOTE,
 * or BANK_STATEMENT categories.
 *
 * Supports: English (US/UK), Filipino/Tagalog, Bahasa Indonesia/Malay,
 * Vietnamese, Mandarin (pinyin), and common semantic synonyms.
 *
 * Rules are checked in order — first match wins. No overlaps between categories.
 */

import type { DocumentType } from '../../../types.js';

/** Classification rule: regex pattern → document type. */
interface ClassifyRule {
  pattern: RegExp;
  type: DocumentType;
}

/**
 * Rules are checked in order — first match wins.
 * Patterns match against the folder name (basename only, not full path).
 *
 * Design: no pattern matches more than one category. Ambiguous terms
 * (e.g. "payment" could be AR or AP) default to BANK_STATEMENT since
 * payment records are typically bank-related.
 */
const RULES: ClassifyRule[] = [
  // ── INVOICE (Sales / AR / Revenue / Outbound docs we issued) ──

  // English — sales-credit must be checked before general "sales" (first match wins)
  { pattern: /^sales.?credit/i, type: 'CUSTOMER_CREDIT_NOTE' },
  { pattern: /^invoice/i, type: 'INVOICE' },
  { pattern: /^sales/i, type: 'INVOICE' },
  { pattern: /^ar\b/i, type: 'INVOICE' },
  { pattern: /^receivable/i, type: 'INVOICE' },
  { pattern: /^revenue/i, type: 'INVOICE' },
  { pattern: /^incoming/i, type: 'INVOICE' },
  { pattern: /^customer.?invoice/i, type: 'INVOICE' },
  { pattern: /^income/i, type: 'INVOICE' },
  { pattern: /^debtor/i, type: 'INVOICE' },
  // Filipino / Tagalog
  { pattern: /^resibo/i, type: 'INVOICE' },         // resibo (receipt / invoice issued)
  { pattern: /^pagsingil/i, type: 'INVOICE' },      // billing / invoice
  { pattern: /^benta/i, type: 'INVOICE' },          // sales
  { pattern: /^paniningil/i, type: 'INVOICE' },     // receivables
  { pattern: /^kita/i, type: 'INVOICE' },           // income / revenue

  // Bahasa Indonesia / Malay
  { pattern: /^faktur/i, type: 'INVOICE' },          // invoice (ID)
  { pattern: /^invois/i, type: 'INVOICE' },          // invoice (MY)
  { pattern: /^penjualan/i, type: 'INVOICE' },       // sales (ID)
  { pattern: /^jualan/i, type: 'INVOICE' },          // sales (MY)
  { pattern: /^piutang/i, type: 'INVOICE' },         // receivables (ID)
  { pattern: /^penghutang/i, type: 'INVOICE' },      // debtors (MY)
  { pattern: /^pendapatan/i, type: 'INVOICE' },      // revenue/income (ID/MY)

  // Vietnamese
  { pattern: /^h[oó]a[\s_-]?[dđ][oơ]n/i, type: 'INVOICE' },  // hóa đơn (invoice)
  { pattern: /^b[aá]n[\s_-]?h[aà]ng/i, type: 'INVOICE' },     // bán hàng (sales)
  { pattern: /^doanh[\s_-]?thu/i, type: 'INVOICE' },           // doanh thu (revenue)
  { pattern: /^ph[aả]i[\s_-]?thu/i, type: 'INVOICE' },        // phải thu (receivables)

  // Mandarin (pinyin)
  { pattern: /^fapiao/i, type: 'INVOICE' },           // 发票 (invoice)
  { pattern: /^xiaoshou/i, type: 'INVOICE' },         // 销售 (sales)
  { pattern: /^shouru/i, type: 'INVOICE' },            // 收入 (revenue)
  { pattern: /^yingshou/i, type: 'INVOICE' },          // 应收 (receivables)

  // ── CUSTOMER_CREDIT_NOTE (Credit notes we issue to customers) ──

  // English — must come before BILL so "customer" prefix doesn't fall through
  { pattern: /^customer.?credit/i, type: 'CUSTOMER_CREDIT_NOTE' },
  { pattern: /^credit.?note/i, type: 'CUSTOMER_CREDIT_NOTE' },
  { pattern: /^cn\b/i, type: 'CUSTOMER_CREDIT_NOTE' },
  { pattern: /^customer.?cn/i, type: 'CUSTOMER_CREDIT_NOTE' },
  { pattern: /^customer/i, type: 'INVOICE' },
  // Filipino / Tagalog
  { pattern: /^nota.?kredito.?customer/i, type: 'CUSTOMER_CREDIT_NOTE' },  // credit note customer
  { pattern: /^kredito.?sa.?customer/i, type: 'CUSTOMER_CREDIT_NOTE' },    // credit to customer
  // Bahasa / Malay
  { pattern: /^nota.?kredit.?pelanggan/i, type: 'CUSTOMER_CREDIT_NOTE' },  // customer credit note
  // Vietnamese
  { pattern: /^gi[aấ]y[\s_-]?b[aá]o[\s_-]?c[oó]/i, type: 'CUSTOMER_CREDIT_NOTE' },  // giấy báo có (credit note)
  // Mandarin (pinyin)
  { pattern: /^kehu.?daizhang/i, type: 'CUSTOMER_CREDIT_NOTE' },  // 客户贷帐 (customer credit)

  // ── SUPPLIER_CREDIT_NOTE (Credit notes we receive from suppliers) ──

  // English
  { pattern: /^supplier.?credit/i, type: 'SUPPLIER_CREDIT_NOTE' },
  { pattern: /^vendor.?credit/i, type: 'SUPPLIER_CREDIT_NOTE' },
  { pattern: /^debit.?note/i, type: 'SUPPLIER_CREDIT_NOTE' },
  { pattern: /^dn\b/i, type: 'SUPPLIER_CREDIT_NOTE' },
  { pattern: /^purchase.?credit/i, type: 'SUPPLIER_CREDIT_NOTE' },
  { pattern: /^supplier.?cn/i, type: 'SUPPLIER_CREDIT_NOTE' },
  // Filipino
  { pattern: /^nota.?kredito.?supplier/i, type: 'SUPPLIER_CREDIT_NOTE' },  // credit note supplier
  // Bahasa / Malay
  { pattern: /^nota.?kredit.?pembekal/i, type: 'SUPPLIER_CREDIT_NOTE' },   // supplier credit note
  // Vietnamese
  { pattern: /^gi[aấ]y[\s_-]?b[aá]o[\s_-]?n[oợ]/i, type: 'SUPPLIER_CREDIT_NOTE' },  // giấy báo nợ (debit note)
  // Mandarin (pinyin)
  { pattern: /^gongying.?daizhang/i, type: 'SUPPLIER_CREDIT_NOTE' },  // 供应贷帐 (supplier credit)

  // ── BILL (Purchases / AP / Expenses / Inbound docs we received) ──

  // English
  { pattern: /^bill/i, type: 'BILL' },
  { pattern: /^purchase/i, type: 'BILL' },
  { pattern: /^expense/i, type: 'BILL' },
  { pattern: /^ap\b/i, type: 'BILL' },
  { pattern: /^payable/i, type: 'BILL' },
  { pattern: /^supplier/i, type: 'BILL' },
  { pattern: /^vendor/i, type: 'BILL' },
  { pattern: /^cost/i, type: 'BILL' },
  { pattern: /^outgoing/i, type: 'BILL' },
  { pattern: /^receipt/i, type: 'BILL' },
  { pattern: /^creditor/i, type: 'BILL' },
  { pattern: /^reimburse/i, type: 'BILL' },

  // Filipino / Tagalog
  { pattern: /^gastos/i, type: 'BILL' },             // expenses
  { pattern: /^bayarin/i, type: 'BILL' },            // payables / bills to pay
  { pattern: /^pagbili/i, type: 'BILL' },            // purchases
  { pattern: /^binili/i, type: 'BILL' },             // purchased items
  { pattern: /^utang/i, type: 'BILL' },              // debt / payable

  // Bahasa Indonesia / Malay
  { pattern: /^tagihan/i, type: 'BILL' },            // bill / invoice received (ID)
  { pattern: /^pembelian/i, type: 'BILL' },          // purchases (ID)
  { pattern: /^belian/i, type: 'BILL' },             // purchases (MY)
  { pattern: /^hutang/i, type: 'BILL' },             // payables (ID/MY)
  { pattern: /^biaya/i, type: 'BILL' },              // expenses/costs (ID)
  { pattern: /^perbelanjaan/i, type: 'BILL' },       // expenditure (MY)
  { pattern: /^kos/i, type: 'BILL' },                // cost (MY)
  { pattern: /^bekal/i, type: 'BILL' },              // supplier (MY)

  // Vietnamese
  { pattern: /^chi[\s_-]?ph[ií]/i, type: 'BILL' },       // chi phí (expense)
  { pattern: /^mua[\s_-]?h[aà]ng/i, type: 'BILL' },      // mua hàng (purchases)
  { pattern: /^ph[aả]i[\s_-]?tr[aả]/i, type: 'BILL' },   // phải trả (payables)
  { pattern: /^nh[aà][\s_-]?cung/i, type: 'BILL' },      // nhà cung cấp (supplier)

  // Mandarin (pinyin)
  { pattern: /^caigou/i, type: 'BILL' },              // 采购 (purchase)
  { pattern: /^feiyong/i, type: 'BILL' },             // 费用 (expense)
  { pattern: /^yingfu/i, type: 'BILL' },              // 应付 (payables)
  { pattern: /^zhangdan/i, type: 'BILL' },            // 账单 (bill)
  { pattern: /^gongying/i, type: 'BILL' },            // 供应商 (supplier)
  { pattern: /^chengben/i, type: 'BILL' },            // 成本 (cost)

  // ── BANK_STATEMENT (Bank records / Payments / Transactions) ──

  // English
  { pattern: /^bank/i, type: 'BANK_STATEMENT' },
  { pattern: /^statement/i, type: 'BANK_STATEMENT' },
  { pattern: /^recon/i, type: 'BANK_STATEMENT' },
  { pattern: /^payment/i, type: 'BANK_STATEMENT' },
  { pattern: /^transaction/i, type: 'BANK_STATEMENT' },

  // Filipino / Tagalog
  { pattern: /^bangko/i, type: 'BANK_STATEMENT' },    // bank
  { pattern: /^talaan/i, type: 'BANK_STATEMENT' },    // records / statement
  { pattern: /^transaksyon/i, type: 'BANK_STATEMENT' }, // transactions
  { pattern: /^bayad/i, type: 'BANK_STATEMENT' },     // payment

  // Bahasa Indonesia / Malay
  { pattern: /^rekening/i, type: 'BANK_STATEMENT' },   // bank account / statement (ID)
  { pattern: /^mutasi/i, type: 'BANK_STATEMENT' },     // bank mutations / transactions (ID)
  { pattern: /^penyata/i, type: 'BANK_STATEMENT' },    // statement (MY)
  { pattern: /^transaksi/i, type: 'BANK_STATEMENT' },  // transactions (ID)
  { pattern: /^urus[\s_-]?niaga/i, type: 'BANK_STATEMENT' }, // transactions (MY)

  // Vietnamese
  { pattern: /^s[aả]o[\s_-]?k[eê]/i, type: 'BANK_STATEMENT' },    // sao kê (bank statement)
  { pattern: /^ng[aâ]n[\s_-]?h[aà]ng/i, type: 'BANK_STATEMENT' }, // ngân hàng (bank)
  { pattern: /^giao[\s_-]?d[iị]ch/i, type: 'BANK_STATEMENT' },    // giao dịch (transactions)

  // Mandarin (pinyin)
  { pattern: /^yinhang/i, type: 'BANK_STATEMENT' },    // 银行 (bank)
  { pattern: /^duizhang/i, type: 'BANK_STATEMENT' },   // 对账单 (statement)
  { pattern: /^liushui/i, type: 'BANK_STATEMENT' },    // 流水 (bank flow / transactions)
  { pattern: /^jiaoyi/i, type: 'BANK_STATEMENT' },      // 交易 (transactions)
];

/**
 * Classify a folder name into a document type.
 * Returns the matched DocumentType or null if no rule matches.
 */
export function classifyFolder(folderName: string): DocumentType | null {
  const name = folderName.trim();
  if (!name) return null;

  for (const rule of RULES) {
    if (rule.pattern.test(name)) {
      return rule.type;
    }
  }

  return null;
}

/** Supported file extensions per document type. */
const EXTENSIONS_INVOICE_BILL = new Set(['.pdf', '.jpg', '.jpeg', '.png']);
const EXTENSIONS_BANK = new Set(['.csv', '.ofx']);
const EXTENSIONS_SKIP = new Set(['.xlsx', '.xls', '.doc', '.docx', '.txt', '.rar', '.7z']);

/** All supported extensions (union of invoice/bill + bank). */
const EXTENSIONS_ALL_SUPPORTED = new Set([...EXTENSIONS_INVOICE_BILL, ...EXTENSIONS_BANK]);

/**
 * Check if a file extension is supported for a given document type.
 * Returns 'supported', 'skip' (known unsupported), or 'unknown'.
 */
export function checkExtension(ext: string, docType: DocumentType | null): 'supported' | 'skip' | 'unknown' {
  const lower = ext.toLowerCase();

  if (EXTENSIONS_SKIP.has(lower)) return 'skip';

  if (docType === 'BANK_STATEMENT') {
    return EXTENSIONS_BANK.has(lower) ? 'supported' : 'skip';
  }

  if (docType === 'INVOICE' || docType === 'BILL' || docType === 'CUSTOMER_CREDIT_NOTE' || docType === 'SUPPLIER_CREDIT_NOTE') {
    return EXTENSIONS_INVOICE_BILL.has(lower) ? 'supported' : 'skip';
  }

  // No doc type yet — accept any supported extension
  return EXTENSIONS_ALL_SUPPORTED.has(lower) ? 'supported' : 'unknown';
}

/**
 * Infer document type from file extension alone (used when folder is unclassified).
 * Bank extensions → BANK_STATEMENT, image/PDF → null (could be invoice or bill).
 */
export function inferTypeFromExtension(ext: string): DocumentType | null {
  const lower = ext.toLowerCase();
  if (EXTENSIONS_BANK.has(lower)) return 'BANK_STATEMENT';
  return null;
}
