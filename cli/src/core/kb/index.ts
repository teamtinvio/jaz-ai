export type {
  HelpCenterIndex,
  SectionMeta,
  ArticleEntry,
  SearchResult,
  EmbeddingIndex,
  ArticleEmbedding,
  SearchMode,
} from './types.js';

export {
  loadIndex,
  tokenize,
  searchArticles,
  listSections,
  getSection,
  findArticle,
  readArticleContent,
  expandQuery,
} from './search.js';

export {
  loadEmbeddings,
  embedQuery,
  cosineSimilarity,
  semanticSearch,
  rrfMerge,
  isSemanticAvailable,
  resetEmbeddings,
} from './embeddings.js';
