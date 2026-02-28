import chalk from 'chalk';

export const logger = {
  title(text: string) {
    console.log();
    console.log(chalk.bold.cyan(`  ${text}`));
    console.log(chalk.dim('  ' + '─'.repeat(text.length)));
    console.log();
  },

  info(text: string) {
    console.log(`  ${chalk.blue('i')} ${text}`);
  },

  success(text: string) {
    console.log(`  ${chalk.green('✓')} ${text}`);
  },

  warn(text: string) {
    console.log(`  ${chalk.yellow('!')} ${text}`);
  },

  error(text: string) {
    console.log(`  ${chalk.red('✗')} ${text}`);
  },
};
