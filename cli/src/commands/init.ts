import ora from 'ora';
import * as p from '@clack/prompts';
import type { SkillType, Platform, InitOptions } from '../types/index.js';
import { SKILL_DESCRIPTIONS } from '../types/index.js';
import { installSkills, detectPlatform } from '../utils/template.js';
import { logger } from '../utils/logger.js';
import { accent, highlight, muted, underline, success as themeSuccess } from './ui/theme.js';

export async function initCommand(options: InitOptions): Promise<void> {
  logger.title('Clio — Skill Installer');

  let skillType: SkillType = options.skill ?? 'all';

  // Prompt for skill selection if not specified
  if (!options.skill) {
    const skill = await p.select({
      message: 'Which skills do you want to install?',
      options: [
        {
          label: 'All (Recommended)',
          hint: 'API reference + CLI + data conversion + transaction recipes + accounting jobs',
          value: 'all' as const,
        },
        {
          label: 'API only',
          hint: SKILL_DESCRIPTIONS['jaz-api'],
          value: 'jaz-api' as const,
        },
        {
          label: 'CLI only',
          hint: SKILL_DESCRIPTIONS['jaz-cli'],
          value: 'jaz-cli' as const,
        },
        {
          label: 'Conversion only',
          hint: SKILL_DESCRIPTIONS['jaz-conversion'],
          value: 'jaz-conversion' as const,
        },
        {
          label: 'Transaction Recipes only',
          hint: SKILL_DESCRIPTIONS['jaz-recipes'],
          value: 'jaz-recipes' as const,
        },
        {
          label: 'Jobs only',
          hint: SKILL_DESCRIPTIONS['jaz-jobs'],
          value: 'jaz-jobs' as const,
        },
      ],
      initialValue: 'all' as const,
    });

    if (p.isCancel(skill)) {
      logger.warn('Installation cancelled');
      return;
    }

    skillType = skill as SkillType;
  }

  const skillLabel =
    skillType === 'all'
      ? 'jaz-api + jaz-cli + jaz-conversion + jaz-recipes + jaz-jobs'
      : skillType;

  logger.info(`Installing: ${accent(skillLabel)}`);

  const spinner = ora('Installing skill files...').start();
  const cwd = process.cwd();
  const platform: Platform = options.platform ?? 'auto';

  try {
    // Show detected platform for auto mode
    if (platform === 'auto') {
      const detected = await detectPlatform(cwd);
      spinner.text = `Detected platform: ${detected === 'claude' ? 'Claude Code' : 'Agent Skills (universal)'}`;
    }

    spinner.text = 'Copying skill files...';
    const installedPaths = await installSkills(cwd, skillType, options.force ?? false, platform);

    spinner.succeed('Skills installed!');

    console.log();
    logger.info('Installed:');
    installedPaths.forEach((folder) => {
      console.log(`  ${themeSuccess('+')} ${folder}/`);
    });

    console.log();
    logger.success('Clio — Jaz AI skills installed successfully!');

    console.log();
    console.log(highlight('Next steps:'));
    console.log(muted('  1. Restart your AI tool (Claude Code, Antigravity, Codex, Copilot, Cursor, etc.)'));
    console.log(
      muted('  2. Try: "Create an invoice with line items and tax"')
    );
    if (skillType === 'all' || skillType === 'jaz-conversion') {
      console.log(
        muted('  3. Try: "Convert this Xero trial balance to Jaz"')
      );
    }
    console.log();
    console.log(
      muted(
        `  Docs: ${underline('https://help.jaz.ai')}`
      )
    );
    console.log();
  } catch (error) {
    spinner.fail('Installation failed');
    if (error instanceof Error) {
      logger.error(error.message);
    }
    process.exit(1);
  }
}
