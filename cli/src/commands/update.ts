import { success } from './ui/theme.js';
import ora from 'ora';
import type { UpdateOptions } from '../types/index.js';
import { installSkills } from '../utils/template.js';
import { logger } from '../utils/logger.js';

export async function updateCommand(options: UpdateOptions): Promise<void> {
  logger.title('Clio — Update Skills');

  const skillType = options.skill ?? 'all';
  const spinner = ora('Updating skill files...').start();

  try {
    const installedPaths = await installSkills(process.cwd(), skillType, true);

    spinner.succeed('Skills updated!');

    console.log();
    logger.info('Updated:');
    installedPaths.forEach((folder) => {
      console.log(`  ${success('+')} ${folder}/`);
    });

    console.log();
    logger.success('Restart Claude Code to pick up changes.');
    console.log();
  } catch (error) {
    spinner.fail('Update failed');
    if (error instanceof Error) {
      logger.error(error.message);
    }
    process.exit(1);
  }
}
