/**
 * BM25 search engine for help center articles.
 * Zero external dependencies — loads a pre-computed JSON index.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fuzzyMatch } from '../intelligence/fuzzy.js';
import type { ArticleEntry, HelpCenterIndex, SearchResult, SectionMeta } from './types.js';

// BM25 parameters (standard Lucene/Elasticsearch defaults)
const K1 = 1.2;
const B = 0.75;
const TITLE_BOOST = 1.5;

// ── Stop words (common English, stripped during tokenization) ─────
const STOP_WORDS = new Set([
  'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'shall',
  'should', 'may', 'might', 'must', 'can', 'could', 'am', 'i', 'me',
  'my', 'we', 'our', 'you', 'your', 'he', 'she', 'it', 'they', 'them',
  'this', 'that', 'these', 'those', 'what', 'which', 'who', 'whom',
  'how', 'when', 'where', 'why', 'if', 'then', 'than', 'so', 'no',
  'not', 'or', 'and', 'but', 'in', 'on', 'at', 'to', 'for', 'of',
  'with', 'by', 'from', 'as', 'into', 'about', 'between', 'through',
  'after', 'before', 'during', 'above', 'below', 'up', 'down', 'out',
  'off', 'over', 'under', 'again', 'further', 'just', 'also', 'very',
  'too', 'only', 'own', 'same', 'both', 'each', 'all', 'any', 'few',
  'more', 'most', 'other', 'some', 'such', 'here', 'there',
]);

// ── Synonyms (query-time expansion, index unchanged) ────────────
const SYNONYMS: ReadonlyMap<string, readonly string[]> = new Map([
  ['recon', ['reconciliation', 'reconcile', 'reconciled']],
  ['txn', ['transaction', 'transactions']], ['txns', ['transactions', 'transaction']],
  ['acct', ['account', 'accounts']], ['accts', ['accounts', 'account']],
  ['inv', ['invoice', 'invoices']], ['cn', ['credit', 'note']],
  ['ar', ['receivable', 'receivables']], ['ap', ['payable', 'payables']],
  ['pmt', ['payment', 'payments']], ['stmt', ['statement', 'statements']],
  ['bal', ['balance', 'balances']], ['fa', ['fixed', 'assets', 'asset']],
  ['gst', ['tax', 'goods', 'services']], ['vat', ['tax', 'value', 'added']],
  ['fx', ['foreign', 'exchange', 'currency']],
  ['config', ['configuration', 'configure', 'settings']],
  ['depr', ['depreciation']], ['amort', ['amortization']],
  ['coa', ['chart', 'accounts']], ['po', ['purchase', 'order']],
  ['so', ['sales', 'order']], ['org', ['organization']],
  ['subs', ['subscription', 'subscriptions']],
  ['amt', ['amount', 'amounts']], ['qty', ['quantity']],
  ['desc', ['description']], ['ref', ['reference']], ['num', ['number']],
]);

/** Expand query tokens with domain synonyms. */
export function expandQuery(tokens: string[]): string[] {
  const expanded = new Set(tokens);
  for (const t of tokens) {
    const syns = SYNONYMS.get(t);
    if (syns) for (const s of syns) expanded.add(s);
  }
  return Array.from(expanded);
}

// ── Prefix matching constants ────────────────────────────────────
const PREFIX_DISCOUNT = 0.7;
const MIN_PREFIX_LEN = 3;
const MAX_QUERY_TOKENS = 32;
const MAX_PREFIX_MATCHES = 5;

// ── Tokenizer ────────────────────────────────────────────────────

/** Tokenize text for BM25: lowercase, strip markdown/URLs, split, remove stop words. */
export function tokenize(text: string): string[] {
  let s = text.toLowerCase();
  // Strip URLs
  s = s.replace(/https?:\/\/\S+/g, '');
  // Strip markdown formatting
  s = s.replace(/[*#`|_\-~\[\]()>]/g, ' ');
  // Extract alphanumeric tokens
  const raw = s.match(/[a-z0-9]+/g) ?? [];
  return raw.filter((t) => t.length > 1 && !STOP_WORDS.has(t));
}

// ── Index loading ────────────────────────────────────────────────

let _cachedIndex: HelpCenterIndex | null = null;
let _cachedPath: string | null = null;

/** Load the help center index from disk. Caches after first load. */
export function loadIndex(indexPath?: string): HelpCenterIndex {
  const resolved = indexPath ?? resolveIndexPath();
  if (_cachedIndex && _cachedPath === resolved) return _cachedIndex;

  const raw = readFileSync(resolved, 'utf-8');
  _cachedIndex = JSON.parse(raw) as HelpCenterIndex;
  _cachedPath = resolved;
  return _cachedIndex;
}

function resolveIndexPath(): string {
  const __file = fileURLToPath(import.meta.url);
  const __dir = dirname(__file);
  const candidates = [
    // Development (from dist/core/kb/)
    join(__dir, '..', '..', '..', 'help-center-mirror', 'help-center-index.json'),
    // npm installed package (from dist/core/kb/)
    join(__dir, '..', '..', '..', 'assets', 'skills', 'api', 'help-center-mirror', 'help-center-index.json'),
  ];

  for (const p of candidates) {
    try {
      readFileSync(p, 'utf-8');
      return p;
    } catch {
      // try next
    }
  }

  throw new Error(
    'Help center index not found. Run the help center sync or reinstall the package.',
  );
}

// ── BM25 search ──────────────────────────────────────────────────

/** Search articles using BM25 scoring with synonym expansion + prefix matching. */
export function searchArticles(
  index: HelpCenterIndex,
  query: string,
  options: { limit?: number; section?: string } = {},
): SearchResult[] {
  const limit = options.limit ?? 5;
  const rawTokens = tokenize(query);
  if (rawTokens.length === 0) return [];

  // Expand with domain synonyms (query-time only, index unchanged)
  // Cap to prevent DoS via long queries
  const queryTokens = expandQuery(rawTokens).slice(0, MAX_QUERY_TOKENS);

  const sectionMap = new Map(index.sections.map((s) => [s.slug, s]));
  const results: SearchResult[] = [];

  for (const article of index.articles) {
    if (options.section && article.section !== options.section) continue;

    // Count term frequencies in this document
    const tf = new Map<string, number>();
    for (const t of article.tokens) {
      tf.set(t, (tf.get(t) ?? 0) + 1);
    }

    let score = 0;
    const matchedTerms: string[] = [];
    const titleLower = article.title.toLowerCase();

    for (const qt of queryTokens) {
      let termFreq = tf.get(qt) ?? 0;
      let idf = index.idf[qt] ?? 0;
      let isPrefix = false;

      // Prefix matching: if exact match fails and token is long enough
      if (termFreq === 0 && qt.length >= MIN_PREFIX_LEN) {
        let prefixHits = 0;
        for (const [docToken, docFreq] of tf) {
          if (docToken.startsWith(qt) && docToken !== qt) {
            termFreq += docFreq;
            idf = Math.max(idf, index.idf[docToken] ?? 0);
            isPrefix = true;
            if (++prefixHits >= MAX_PREFIX_MATCHES) break;
          }
        }
      }

      if (termFreq === 0) continue;

      matchedTerms.push(isPrefix ? `${qt}*` : qt);
      const numerator = termFreq * (K1 + 1);
      const denominator = termFreq + K1 * (1 - B + B * (article.tokenCount / index.avgDocLen));
      let termScore = idf * (numerator / denominator);

      // Prefix discount: prefix matches score lower than exact
      if (isPrefix) {
        termScore *= PREFIX_DISCOUNT;
      }

      // Title boost: if query term appears in the article title
      if (titleLower.includes(qt)) {
        termScore *= TITLE_BOOST;
      }

      score += termScore;
    }

    if (score > 0) {
      const section = sectionMap.get(article.section);
      if (section) {
        results.push({ article, score, section, matchedTerms });
      }
    }
  }

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, limit);
}

// ── Section/article lookups ──────────────────────────────────────

/** List all sections with metadata. */
export function listSections(index: HelpCenterIndex): SectionMeta[] {
  return index.sections;
}

/** Get all articles in a section by slug. */
export function getSection(index: HelpCenterIndex, sectionSlug: string): ArticleEntry[] {
  return index.articles.filter((a) => a.section === sectionSlug);
}

/** Find a specific article by title (fuzzy match). */
export function findArticle(index: HelpCenterIndex, title: string): ArticleEntry | undefined {
  const matches = fuzzyMatch(title, index.articles, (a) => a.title, {
    threshold: 0.25,
    limit: 1,
  });
  return matches[0]?.item;
}

// ── Full article content reader ──────────────────────────────────

/**
 * Read the full article content from the raw markdown file.
 * The index only has snippets — this reads the complete Q&A text.
 */
export function readArticleContent(article: ArticleEntry, mirrorDir?: string): string | null {
  const dir = mirrorDir ?? resolveMirrorDir();
  if (!dir) return null;

  try {
    const filePath = join(dir, `${article.section}.md`);
    const content = readFileSync(filePath, 'utf-8');

    // Find the article by its ### Title header
    const marker = `### ${article.title}`;
    const start = content.indexOf(marker);
    if (start === -1) return null;

    // Find the end (next --- separator or next ### header or EOF)
    const afterMarker = start + marker.length;
    const nextSep = content.indexOf('\n---\n', afterMarker);
    const end = nextSep !== -1 ? nextSep : content.length;

    return content.slice(start, end).trim();
  } catch {
    return null;
  }
}

function resolveMirrorDir(): string | null {
  const __file = fileURLToPath(import.meta.url);
  const __dir = dirname(__file);
  const candidates = [
    join(__dir, '..', '..', '..', 'help-center-mirror'),
    join(__dir, '..', '..', '..', 'assets', 'skills', 'api', 'help-center-mirror'),
  ];

  for (const p of candidates) {
    try {
      readFileSync(join(p, 'index.md'), 'utf-8');
      return p;
    } catch {
      // try next
    }
  }
  return null;
}
