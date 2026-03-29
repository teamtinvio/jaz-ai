/**
 * Visual theme — single source of truth for all CLI rendering.
 *
 * Brand-aligned with jaz.ai: dark palette, rounded corners, clean whitespace.
 * All UI modules import from here. Change once, update everywhere.
 */
import chalk from 'chalk';
import figures from 'figures';

// ── Brand Colors (closest terminal matches to jaz.ai palette) ────

export const accent = chalk.hex('#6699ff');     // jaz.ai link blue
export const muted = chalk.dim;                 // secondary text / borders
export const success = chalk.hex('#14b856');    // jaz.ai green
export const warning = chalk.hex('#ff9466');    // jaz.ai orange
export const danger = chalk.hex('#f87777');     // jaz.ai red
export const info = chalk.cyan;                 // teal interactive accent
export const highlight = chalk.bold;
export const subtle = chalk.gray;               // barely visible hints
export const underline = chalk.underline;       // links, URLs

// ── Symbols (cross-platform safe via figures) ────────────────────

export const sym = {
  tick: figures.tick,                 // ✓
  cross: figures.cross,               // ✗
  warning: figures.warning,           // ⚠
  info: figures.info,                 // ℹ
  pointer: figures.pointer,           // ❯
  bullet: figures.bullet,             // ●
  arrowRight: figures.arrowRight,     // →
  ellipsis: figures.ellipsis,         // …
  line: figures.line,                 // ─
  pointerSmall: figures.pointerSmall, // ›
} as const;

// ── Box Drawing (rounded — matches jaz.ai's rounded-corner design) ──

export const box = {
  topLeft: '╭',
  topRight: '╮',
  bottomLeft: '╰',
  bottomRight: '╯',
  horizontal: '─',
  vertical: '│',
  leftT: '├',
  rightT: '┤',
} as const;

// ── Layout Constants ─────────────────────────────────────────────

export const INDENT = '  ';
export const COL_GAP = 2;

// ── Terminal Detection Guards ────────────────────────────────────

export function isTTY(): boolean {
  return !!process.stdout.isTTY;
}

export function isCI(): boolean {
  return !!process.env.CI;
}

export function shouldAnimate(): boolean {
  return isTTY() && !isCI() && !process.env.NO_COLOR;
}
