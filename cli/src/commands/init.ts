import chalk from 'chalk';
import ora from 'ora';
import prompts from 'prompts';
import type { SkillType, Platform, InitOptions } from '../types/index.js';
import { SKILL_DESCRIPTIONS } from '../types/index.js';
import { installSkills, detectPlatform } from '../utils/template.js';
import { logger } from '../utils/logger.js';

export async function initCommand(options: InitOptions): Promise<void> {
  logger.title('Clio — Skill Installer');

  let skillType: SkillType = options.skill ?? 'all';

  // Prompt for skill selection if not specified
  if (!options.skill) {
    const response = await prompts({
      type: 'select',
      name: 'skill',
      message: 'Which skills do you want to install?',
      choices: [
        {
          title: `All (Recommended)`,
          description: 'API reference + data conversion + transaction recipes + accounting jobs',
          value: 'all',
        },
        {
          title: 'API only',
          description: SKILL_DESCRIPTIONS['jaz-api'],
          value: 'jaz-api',
        },
        {
          title: 'Conversion only',
          description: SKILL_DESCRIPTIONS['jaz-conversion'],
          value: 'jaz-conversion',
        },
        {
          title: 'Transaction Recipes only',
          description: SKILL_DESCRIPTIONS['jaz-recipes'],
          value: 'jaz-recipes',
        },
        {
          title: 'Jobs only',
          description: SKILL_DESCRIPTIONS['jaz-jobs'],
          value: 'jaz-jobs',
        },
      ],
      initial: 0,
    });

    if (!response.skill) {
      logger.warn('Installation cancelled');
      return;
    }

    skillType = response.skill as SkillType;
  }

  const skillLabel =
    skillType === 'all'
      ? 'jaz-api + jaz-conversion + jaz-recipes + jaz-jobs'
      : skillType;

  logger.info(`Installing: ${chalk.cyan(skillLabel)}`);

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
      console.log(`  ${chalk.green('+')} ${folder}/`);
    });

    console.log();
    logger.success('Clio — Jaz AI skills installed successfully!');

    console.log();
    console.log(chalk.bold('Next steps:'));
    console.log(chalk.dim('  1. Restart your AI tool (Claude Code, Antigravity, Codex, Copilot, Cursor, etc.)'));
    console.log(
      chalk.dim('  2. Try: "Create an invoice with line items and tax"')
    );
    if (skillType === 'all' || skillType === 'jaz-conversion') {
      console.log(
        chalk.dim('  3. Try: "Convert this Xero trial balance to Jaz"')
      );
    }
    console.log();
    console.log(
      chalk.dim(
        `  Docs: ${chalk.underline('https://help.jaz.ai')}`
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
