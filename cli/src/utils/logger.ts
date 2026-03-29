import { accent, success, warning, danger, info, muted, sym, box, INDENT } from '../commands/ui/theme.js';

export const logger = {
  title(text: string) {
    console.log();
    console.log(`${INDENT}${accent(text)}`);
    console.log(`${INDENT}${muted(box.horizontal.repeat(text.length))}`);
    console.log();
  },

  info(text: string) {
    console.log(`${INDENT}${info(sym.info)} ${text}`);
  },

  success(text: string) {
    console.log(`${INDENT}${success(sym.tick)} ${text}`);
  },

  warn(text: string) {
    console.log(`${INDENT}${warning(sym.warning)} ${text}`);
  },

  error(text: string) {
    console.log(`${INDENT}${danger(sym.cross)} ${text}`);
  },

  step(n: number, text: string) {
    console.log(`${INDENT}${muted(`${n}.`)} ${text}`);
  },

  divider() {
    const width = process.stdout.columns ? Math.min(process.stdout.columns - 4, 60) : 40;
    console.log(`${INDENT}${muted(box.horizontal.repeat(width))}`);
  },

  blank() {
    console.log();
  },
};
