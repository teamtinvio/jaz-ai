import { success, accent, muted } from './ui/theme.js';
import ora from 'ora';
import { logger } from '../utils/logger.js';
import { fetchReleases, GitHubRateLimitError } from '../utils/github.js';

export async function versionsCommand(): Promise<void> {
  logger.title('Clio — Available Versions');

  const spinner = ora('Fetching versions from GitHub...').start();

  try {
    const releases = await fetchReleases();

    if (releases.length === 0) {
      spinner.warn('No releases found');
      return;
    }

    spinner.succeed(`Found ${releases.length} version(s)`);
    console.log();

    releases.forEach((release, i) => {
      const tag = release.tag_name;
      const date = new Date(release.published_at).toLocaleDateString();
      const label = i === 0 ? success(' (latest)') : '';

      console.log(`  ${accent(tag)}${label}  ${muted(date)}`);
    });

    console.log();
  } catch (error) {
    if (error instanceof GitHubRateLimitError) {
      spinner.fail('GitHub rate limit reached. Try again later.');
    } else if (error instanceof Error) {
      spinner.fail(`Failed to fetch versions: ${error.message}`);
    }
    process.exit(1);
  }
}
