import { mkdir, cp, rm, access, readdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { SkillType, Platform } from '../types/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
// From dist/utils/template.js -> ../../assets (two levels up to cli/, then assets/)
const ASSETS_DIR = join(__dirname, '..', '..', 'assets');

const SKILLS: Exclude<SkillType, 'all'>[] = ['jaz-api', 'jaz-conversion', 'jaz-recipes', 'jaz-jobs'];

/** Map skill type to source directory name (directories kept short). */
const SKILL_DIR: Record<Exclude<SkillType, 'all'>, string> = {
  'jaz-api': 'api',
  'jaz-conversion': 'conversion',
  'jaz-recipes': 'transaction-recipes',
  'jaz-jobs': 'jobs',
};

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

/**
 * Detect the AI platform based on project directory contents.
 *
 * Priority: explicit markers first, then fall back to universal standard.
 */
export async function detectPlatform(projectDir: string): Promise<'claude' | 'agents'> {
  // Check for existing skill installations
  if (await exists(join(projectDir, '.claude', 'skills'))) return 'claude';
  if (await exists(join(projectDir, '.agents', 'skills'))) return 'agents';

  // Check for platform-specific config dirs
  if (await exists(join(projectDir, '.claude'))) return 'claude';
  if (await exists(join(projectDir, '.codex'))) return 'agents';
  if (await exists(join(projectDir, '.antigravity'))) return 'agents';
  if (await exists(join(projectDir, '.cursor'))) return 'agents';
  if (await exists(join(projectDir, '.copilot'))) return 'agents';
  if (await exists(join(projectDir, '.windsurf'))) return 'agents';
  if (await exists(join(projectDir, '.goose'))) return 'agents';

  // Check for platform-specific instruction files
  if (await exists(join(projectDir, 'CLAUDE.md'))) return 'claude';
  if (await exists(join(projectDir, 'AGENTS.md'))) return 'agents';

  // Default: Agent Skills open standard (universal)
  return 'agents';
}

/**
 * Resolve the skill base directory for a given platform.
 */
function skillBasePath(platform: 'claude' | 'agents'): string {
  return platform === 'claude' ? '.claude/skills' : '.agents/skills';
}

/**
 * Install skill files into a target project directory.
 * Creates <basePath>/<skillName>/ with SKILL.md + references/
 */
async function installSkill(
  targetDir: string,
  skillName: Exclude<SkillType, 'all'>,
  force: boolean,
  platform: 'claude' | 'agents'
): Promise<string> {
  const dirName = SKILL_DIR[skillName];
  const sourceDir = join(ASSETS_DIR, 'skills', dirName);
  const base = skillBasePath(platform);
  const targetSkillDir = join(targetDir, base, dirName);

  if (!(await exists(sourceDir))) {
    throw new Error(`Skill source not found: ${sourceDir}`);
  }

  if (await exists(targetSkillDir)) {
    if (!force) {
      throw new Error(
        `${targetSkillDir} already exists. Use --force to overwrite.`
      );
    }
    // Remove stale files before copying (ensures deleted references don't linger)
    await rm(targetSkillDir, { recursive: true, force: true });
  }

  await mkdir(targetSkillDir, { recursive: true });
  await cp(sourceDir, targetSkillDir, { recursive: true, force: true });

  return `${base}/${dirName}`;
}

/**
 * Install selected skills into the target project.
 */
export async function installSkills(
  targetDir: string,
  skillType: SkillType,
  force = false,
  platform: Platform = 'auto'
): Promise<string[]> {
  // Resolve platform — all non-Claude platforms map to Agent Skills standard (.agents/skills/)
  const resolvedPlatform = platform === 'claude'
    ? 'claude' as const
    : platform === 'auto'
      ? await detectPlatform(targetDir)
      : 'agents' as const;

  const skillsToInstall =
    skillType === 'all' ? SKILLS : [skillType as Exclude<SkillType, 'all'>];
  const installedPaths: string[] = [];

  for (const skill of skillsToInstall) {
    const path = await installSkill(targetDir, skill, force, resolvedPlatform);
    installedPaths.push(path);
  }

  return installedPaths;
}
