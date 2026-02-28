/**
 * Embedding-based semantic search for help center articles.
 *
 * Single entry point: semanticSearch() — used by both CLI and daemon.
 * Modes: 'bm25' (offline default), 'semantic' (embeddings only), 'hybrid' (RRF merge).
 * Any failure gracefully falls back to BM25. Never throws.
 */

import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { searchArticles } from './search.js';
import type {
  ArticleEmbedding,
  EmbeddingIndex,
  HelpCenterIndex,
  SearchMode,
  SearchResult,
  SectionMeta,
} from './types.js';

// ── Constants ───────────────────────────────────────────────────

const EMBEDDING_MODEL = 'text-embedding-3-small';
const EMBED_TIMEOUT_MS = 2000;
const RRF_K = 60; // standard RRF constant

// ── State ───────────────────────────────────────────────────────

let _embeddingIndex: EmbeddingIndex | null = null;
let _embeddingPath: string | null = null;

// Singleton OpenAI-compatible fetch (reuses connection via keep-alive)
let _apiKey: string | null = null;

// ── Loading ─────────────────────────────────────────────────────

/** Load the pre-computed embedding index from disk. Returns null if missing. */
export function loadEmbeddings(indexPath?: string): EmbeddingIndex | null {
  const resolved = indexPath ?? resolveEmbeddingPath();
  if (!resolved) return null;

  if (_embeddingIndex && _embeddingPath === resolved) return _embeddingIndex;

  try {
    const raw = readFileSync(resolved, 'utf-8');
    _embeddingIndex = JSON.parse(raw) as EmbeddingIndex;
    _embeddingPath = resolved;
    return _embeddingIndex;
  } catch {
    return null;
  }
}

function resolveEmbeddingPath(): string | null {
  const __file = fileURLToPath(import.meta.url);
  const __dir = dirname(__file);
  const candidates = [
    join(__dir, '..', '..', '..', 'help-center-mirror', 'help-center-embeddings.json'),
    join(__dir, '..', '..', '..', 'assets', 'skills', 'api', 'help-center-mirror', 'help-center-embeddings.json'),
  ];

  for (const p of candidates) {
    if (existsSync(p)) return p;
  }
  return null;
}

// ── Cosine similarity ───────────────────────────────────────────

/** Cosine similarity (dot product — OpenAI vectors are L2-normalized). */
export function cosineSimilarity(a: number[], b: number[]): number {
  const len = Math.min(a.length, b.length);
  let dot = 0;
  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i];
  }
  return dot;
}

// ── OpenAI embedding API ────────────────────────────────────────

function getApiKey(): string | null {
  if (_apiKey !== null) return _apiKey;
  _apiKey = process.env.OPENAI_API_KEY ?? '';
  return _apiKey || null;
}

/**
 * Embed a query string via OpenAI API.
 * Returns null on any failure (no key, network error, timeout).
 */
export async function embedQuery(query: string): Promise<number[] | null> {
  const key = getApiKey();
  if (!key) return null;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), EMBED_TIMEOUT_MS);

    const res = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: EMBEDDING_MODEL,
        input: query,
      }),
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!res.ok) return null;

    const data = (await res.json()) as { data: Array<{ embedding: number[] }> };
    return data.data?.[0]?.embedding ?? null;
  } catch {
    return null;
  }
}

// ── Semantic search ─────────────────────────────────────────────

interface SemanticSearchOptions {
  mode?: SearchMode;
  limit?: number;
  section?: string;
}

/**
 * Unified search entry point — the SINGLE function both CLI and daemon call.
 *
 * - 'bm25': enhanced BM25 with synonyms + prefix matching (offline, ~1ms)
 * - 'semantic': pure embedding cosine similarity (~150ms, needs API key)
 * - 'hybrid': parallel BM25 + embedding → RRF merge (~150ms, needs API key)
 *
 * Falls back to BM25 if embeddings unavailable or API fails.
 */
export async function semanticSearch(
  index: HelpCenterIndex,
  embeddings: EmbeddingIndex | null,
  query: string,
  options: SemanticSearchOptions = {},
): Promise<SearchResult[]> {
  const mode = options.mode ?? 'hybrid';
  const limit = options.limit ?? 5;
  const section = options.section;

  // Pure BM25 — synchronous, offline
  if (mode === 'bm25' || !embeddings) {
    return searchArticles(index, query, { limit, section });
  }

  // Pure semantic
  if (mode === 'semantic') {
    const queryVec = await embedQuery(query);
    if (!queryVec) {
      // Fallback to BM25
      return searchArticles(index, query, { limit, section });
    }
    return embeddingSearch(index, embeddings, queryVec, { limit, section });
  }

  // Hybrid: run BM25 + embedding in parallel
  const [queryVec, bm25Results] = await Promise.all([
    embedQuery(query),
    Promise.resolve(searchArticles(index, query, { limit: limit * 2, section })),
  ]);

  if (!queryVec) {
    // Embedding failed — return BM25 only
    return bm25Results.slice(0, limit);
  }

  const embResults = embeddingSearch(index, embeddings, queryVec, { limit: limit * 2, section });
  return rrfMerge(embResults, bm25Results, limit);
}

/**
 * Score articles by cosine similarity to a query vector.
 */
function embeddingSearch(
  index: HelpCenterIndex,
  embeddings: EmbeddingIndex,
  queryVec: number[],
  options: { limit: number; section?: string },
): SearchResult[] {
  const sectionMap = new Map(index.sections.map((s) => [s.slug, s]));
  const articleMap = new Map(index.articles.map((a) => [a.id, a]));

  const scored: Array<{ articleId: number; score: number }> = [];

  for (const emb of embeddings.embeddings) {
    const article = articleMap.get(emb.articleId);
    if (!article) continue;
    if (options.section && article.section !== options.section) continue;

    const score = cosineSimilarity(queryVec, emb.vector);
    scored.push({ articleId: emb.articleId, score });
  }

  scored.sort((a, b) => b.score - a.score);

  const results: SearchResult[] = [];
  for (const { articleId, score } of scored.slice(0, options.limit)) {
    const article = articleMap.get(articleId);
    if (!article) continue;
    const section = sectionMap.get(article.section);
    if (!section) continue;
    results.push({ article, score, section, matchedTerms: [] });
  }
  return results;
}

// ── Reciprocal Rank Fusion ──────────────────────────────────────

/**
 * Merge embedding and BM25 results using Reciprocal Rank Fusion.
 * RRF score = 1/(K+rank_emb) + 1/(K+rank_bm25)
 * Operates on ranks (not scores) so no normalization needed.
 */
export function rrfMerge(
  embResults: SearchResult[],
  bm25Results: SearchResult[],
  limit: number,
): SearchResult[] {
  const scores = new Map<number, { score: number; result: SearchResult }>();

  for (let i = 0; i < embResults.length; i++) {
    const r = embResults[i];
    const rrfScore = 1 / (RRF_K + i + 1); // rank is 1-indexed
    const entry = scores.get(r.article.id);
    if (entry) {
      entry.score += rrfScore;
    } else {
      scores.set(r.article.id, { score: rrfScore, result: r });
    }
  }

  for (let i = 0; i < bm25Results.length; i++) {
    const r = bm25Results[i];
    const rrfScore = 1 / (RRF_K + i + 1);
    const entry = scores.get(r.article.id);
    if (entry) {
      entry.score += rrfScore;
      // Prefer BM25 result (has matchedTerms)
      entry.result = r;
    } else {
      scores.set(r.article.id, { score: rrfScore, result: r });
    }
  }

  const merged = Array.from(scores.values());
  merged.sort((a, b) => b.score - a.score);

  return merged.slice(0, limit).map((m) => ({
    ...m.result,
    score: m.score,
  }));
}

// ── Availability checks ─────────────────────────────────────────

/** True if embeddings are loaded AND an OpenAI key is available. */
export function isSemanticAvailable(embeddings: EmbeddingIndex | null): boolean {
  return embeddings !== null && !!getApiKey();
}

/** Reset cached state (for testing). */
export function resetEmbeddings(): void {
  _embeddingIndex = null;
  _embeddingPath = null;
  _apiKey = null;
}
