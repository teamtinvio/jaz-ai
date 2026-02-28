export type SkillType = 'jaz-api' | 'jaz-conversion' | 'jaz-recipes' | 'jaz-jobs' | 'all';

export interface Release {
  tag_name: string;
  name: string;
  published_at: string;
  html_url: string;
  assets: Asset[];
}

export interface Asset {
  name: string;
  browser_download_url: string;
  size: number;
}

export type Platform = 'claude' | 'antigravity' | 'codex' | 'copilot' | 'cursor' | 'windsurf' | 'goose' | 'gemini' | 'agents' | 'auto';

export interface InitOptions {
  skill?: SkillType;
  force?: boolean;
  platform?: Platform;
}

export interface UpdateOptions {
  skill?: SkillType;
}

export const SKILL_TYPES: SkillType[] = ['jaz-api', 'jaz-conversion', 'jaz-recipes', 'jaz-jobs', 'all'];

export const SKILL_DESCRIPTIONS: Record<Exclude<SkillType, 'all'>, string> = {
  'jaz-api': 'Jaz REST API reference — 55 rules, endpoint catalog, error catalog, field mapping',
  'jaz-conversion': 'Data conversion pipeline — Xero, QuickBooks, Sage, Excel migration to Jaz',
  'jaz-recipes': 'Complex accounting recipes — prepaid, deferred revenue, loans, IFRS 16, depreciation',
  'jaz-jobs': 'Accounting job blueprints — month/quarter/year-end close + 7 ad-hoc operational workflows',
};
