/**
 * Progress bar for paginated fetches.
 * Uses log-update for smooth in-place terminal updates.
 */
import { logUpdateStderr } from 'log-update';
import { muted, accent, shouldAnimate } from './theme.js';

const BAR_WIDTH = 16;

/**
 * Create a progress renderer that updates in-place on stderr.
 * Returns start/update/clear functions.
 *
 * Only animates when TTY + not CI + not NO_COLOR.
 * Falls back to silent no-op otherwise (agents, pipes).
 */
export function createProgress(label: string): {
  update: (fetched: number, total: number) => void;
  clear: () => void;
} {
  if (!shouldAnimate()) {
    return { update: () => {}, clear: () => {} };
  }

  return {
    update(fetched: number, total: number) {
      const ratio = total > 0 ? Math.min(fetched / total, 1) : 0;
      const filled = Math.round(ratio * BAR_WIDTH);
      const empty = BAR_WIDTH - filled;
      const bar = `${accent('█'.repeat(filled))}${muted('░'.repeat(empty))}`;
      const counts = `${fetched.toLocaleString()} / ${total.toLocaleString()}`;
      logUpdateStderr(`  ${bar} ${muted(counts)}  ${muted(label)}`);
    },
    clear() {
      logUpdateStderr.clear();
    },
  };
}
