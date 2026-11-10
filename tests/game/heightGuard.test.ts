import { describe, expect, it } from 'vitest';

// D3-R7 HEIGHT is set at boot, so a module-level const computed from it would freeze the 960 default.
const sources = import.meta.glob('../../src/game/**/*.ts', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
const files = Object.entries(sources).map(([path, src]) => ({ path, src }));

/** Top-level (column 0) `const`/`let`/`export const` statements whose initialiser mentions HEIGHT. */
function offenders(src: string): string[] {
  const out: string[] = [];
  const re = /^(?:export\s+)?(?:const|let|var)\s[^\n]*?=([\s\S]*?);\s*$/gm;
  for (const m of src.matchAll(re)) {
    const init = m[1];
    if (/=>|function\b/.test(init.split('\n')[0])) continue; // arrow/function bodies are evaluated later
    if (/\bHEIGHT\b/.test(init)) out.push(m[0].split('\n')[0]);
  }
  return out;
}

describe('D3-R7 HEIGHT guard', () => {
  it('D3-R7 no module-level initialiser under src/game reads HEIGHT', () => {
    expect(files.length).toBeGreaterThan(20);
    const bad = files.flatMap(f => offenders(f.src).map(l => `${f.path}: ${l}`));
    expect(bad).toEqual([]);
  });
  it('D3-R7 guard catches a frozen HEIGHT constant', () => {
    expect(offenders('const Y = HEIGHT - 10;')).toHaveLength(1);
    expect(offenders('export const f = (): number => HEIGHT - 10;')).toHaveLength(0);
    expect(offenders('  const y = HEIGHT - 10;')).toHaveLength(0); // indented = inside a body
  });
});
