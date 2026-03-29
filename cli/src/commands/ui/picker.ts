/**
 * Custom-built interactive picker — branded for Clio.
 *
 * Built with raw readline for full visual control.
 * Features: type-to-filter, arrow navigation, scrollable viewport,
 * rounded borders, brand colors, compact single-line items.
 */
import readline from 'node:readline';
import { accent, muted, highlight, subtle, box, sym, INDENT } from './theme.js';

export interface PickerItem {
  label: string;
  value: string;
  hint?: string;
}

export interface PickerOptions {
  header: string;
  items: PickerItem[];
  filterable?: boolean;
  maxVisible?: number;
}

const CANCEL = Symbol('cancel');
export function isCancel(value: unknown): value is symbol {
  return value === CANCEL;
}

// ── Helpers ──────────────────────────────────────────────────────

function stripAnsi(str: string): string {
  // eslint-disable-next-line no-control-regex
  return str.replace(/\x1b\[[0-9;]*m/g, '');
}

function fuzzyMatch(query: string, target: string): boolean {
  const q = query.toLowerCase();
  const t = target.toLowerCase();
  let qi = 0;
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) qi++;
  }
  return qi === q.length;
}

function truncate(str: string, max: number): string {
  const plain = stripAnsi(str);
  if (plain.length <= max) return str;
  return str.slice(0, max - 1) + '…';
}

// ── Render Frame ─────────────────────────────────────────────────

function renderFrame(
  header: string,
  items: PickerItem[],
  cursor: number,
  filter: string,
  filterable: boolean,
  maxVisible: number,
): string {
  const termWidth = process.stdout.columns || 80;
  const contentWidth = Math.min(termWidth - 4, 72);
  const lines: string[] = [];

  // Header box
  const hr = box.horizontal.repeat(contentWidth);
  lines.push(muted(`${INDENT}${box.topLeft}${hr}${box.topRight}`));
  const headerPlain = stripAnsi(header);
  const headerPad = Math.max(0, contentWidth - headerPlain.length - 1);
  lines.push(muted(`${INDENT}${box.vertical}`) + ` ${header}${' '.repeat(headerPad)}` + muted(box.vertical));
  lines.push(muted(`${INDENT}${box.bottomLeft}${hr}${box.bottomRight}`));

  // Filter input
  if (filterable) {
    const display = filter ? highlight(filter) : subtle('type to filter...');
    lines.push(`${INDENT}  ${muted(sym.pointerSmall)} ${display}`);
    lines.push('');
  } else {
    lines.push('');
  }

  // Items viewport
  if (items.length === 0) {
    lines.push(`${INDENT}  ${muted('No matching commands')}`);
  } else {
    const total = items.length;
    const viewSize = Math.min(maxVisible, total);
    let start = 0;
    if (total > viewSize) {
      start = Math.max(0, cursor - Math.floor(viewSize / 2));
      start = Math.min(start, total - viewSize);
    }
    const end = start + viewSize;

    const visibleItems = items.slice(start, end);
    const maxLabel = Math.min(
      Math.max(...visibleItems.map(i => stripAnsi(i.label).length), 8),
      36,
    );
    const hintBudget = Math.max(10, contentWidth - maxLabel - 8);

    if (start > 0) lines.push(`${INDENT}  ${muted('↑')}`);

    for (let i = start; i < end; i++) {
      const item = items[i];
      const isSelected = i === cursor;
      const label = stripAnsi(item.label).padEnd(maxLabel);
      const hint = item.hint ? truncate(item.hint, hintBudget) : '';

      if (isSelected) {
        lines.push(`${INDENT}${accent(sym.pointer)} ${highlight(label)}  ${muted(hint)}`);
      } else {
        lines.push(`${INDENT}  ${label}  ${subtle(hint)}`);
      }
    }

    if (end < total) lines.push(`${INDENT}  ${muted('↓')} ${subtle(`+${total - end} more`)}`);
  }

  // Footer
  lines.push('');
  lines.push(`${INDENT}${muted('↑↓')} ${subtle('navigate')}  ${muted('·')}  ${muted('enter')} ${subtle('select')}  ${muted('·')}  ${muted('esc')} ${subtle('quit')}`);

  return lines.join('\n');
}

// ── Interactive Picker ───────────────────────────────────────────

export function showPicker(opts: PickerOptions): Promise<string | symbol> {
  return new Promise((resolve) => {
    const { header, items, filterable = false } = opts;
    const termRows = process.stdout.rows || 24;
    const maxVisible = opts.maxVisible ?? Math.max(8, termRows - 10);

    let filter = '';
    let cursor = 0;
    let prevLineCount = 0;

    const getFiltered = (): PickerItem[] => {
      if (!filter) return items;
      return items.filter(i =>
        fuzzyMatch(filter, i.label) || (i.hint ? fuzzyMatch(filter, i.hint) : false),
      );
    };

    const draw = () => {
      const filtered = getFiltered();
      if (cursor >= filtered.length) cursor = Math.max(0, filtered.length - 1);

      const frame = renderFrame(header, filtered, cursor, filter, filterable, maxVisible);
      const frameLines = frame.split('\n').length;

      // Clear previous frame
      if (prevLineCount > 0) {
        process.stdout.write(`\x1b[${prevLineCount}A`); // Move up
        process.stdout.write('\x1b[J'); // Clear to end of screen
      }

      process.stdout.write(frame + '\n');
      prevLineCount = frameLines;
    };

    // Setup readline in raw mode
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    if (process.stdin.isTTY) process.stdin.setRawMode(true);
    readline.emitKeypressEvents(process.stdin, rl);

    // Hide cursor
    process.stdout.write('\x1b[?25l');

    const cleanup = () => {
      process.stdout.write('\x1b[?25h'); // Show cursor
      if (process.stdin.isTTY) process.stdin.setRawMode(false);
      process.stdin.removeListener('keypress', onKey);
      rl.close();
    };

    const onKey = (_char: string | undefined, key?: { name?: string; ctrl?: boolean; sequence?: string }) => {
      const filtered = getFiltered();

      if (key?.name === 'up') {
        cursor = cursor > 0 ? cursor - 1 : filtered.length - 1;
        draw();
      } else if (key?.name === 'down') {
        cursor = cursor < filtered.length - 1 ? cursor + 1 : 0;
        draw();
      } else if (key?.name === 'return') {
        if (filtered.length > 0) {
          cleanup();
          // Clear the picker output
          if (prevLineCount > 0) {
            process.stdout.write(`\x1b[${prevLineCount}A\x1b[J`);
          }
          resolve(filtered[cursor].value);
        }
      } else if (key?.name === 'escape' || (key?.ctrl && key?.name === 'c')) {
        cleanup();
        if (prevLineCount > 0) {
          process.stdout.write(`\x1b[${prevLineCount}A\x1b[J`);
        }
        resolve(CANCEL);
      } else if (key?.name === 'backspace') {
        if (filterable && filter.length > 0) {
          filter = filter.slice(0, -1);
          cursor = 0;
          draw();
        }
      } else if (filterable && key?.sequence && key.sequence.length === 1 && !key.ctrl) {
        filter += key.sequence;
        cursor = 0;
        draw();
      }
    };

    process.stdin.on('keypress', onKey);

    // Initial draw
    draw();
  });
}
