import { describe, expect, it } from 'vitest';
import { findViolations } from './support/boundary';

// Vite raw glob: no @types/node needed. Includes pure game flow, input math and strings.
const pureSources = import.meta.glob(['../src/core/**/*.ts', '../src/meta/**/*.ts', '../src/session/**/*.ts', '../src/game/flow/**/*.ts', '../src/game/input/swipeMath.ts', '../src/game/text.ts'], {
  query: '?raw', import: 'default', eager: true,
}) as Record<string, string>;

describe('GDD-13 boundary', () => {
  it('GDD-13 boundary: the scanner flags each forbidden API', () => {
    const src = "import Phaser from 'phaser';\nconst r = Math.random();\nwindow.x = 1; document.title;\n"
      + 'localStorage.x; performance.now(); Date.now();';
    expect(findViolations({ 'a.ts': src })).toEqual([
      'a.ts: phaser import', 'a.ts: window', 'a.ts: document', 'a.ts: localStorage',
      'a.ts: Math.random', 'a.ts: performance', 'a.ts: Date',
    ]);
  });
  it('GDD-13 boundary: comments are ignored', () => {
    expect(findViolations({ 'b.ts': '// Date and window in prose\n/* performance */\nexport const x = 1;' })).toEqual([]);
  });
  it('GDD-13 boundary: src/core and src/meta use no engine or browser API', () => {
    expect(findViolations(pureSources)).toEqual([]);
  });
  it('P1 boundary: src/session imports only core/meta index and no Phaser or browser globals', () => {
    const session = Object.fromEntries(Object.entries(pureSources).filter(([p]) => p.includes('/src/session/')));
    expect(Object.keys(session).length).toBeGreaterThan(0);
    expect(findViolations(session)).toEqual([]);
    const allowed = /^(\.\/[\w]+|\.\.\/(core|meta)\/index)$/;
    const bad = Object.entries(session).flatMap(([p, text]) => [...text.matchAll(/from\s+['"]([^'"]+)['"]/g)]
      .map(m => m[1]!).filter(spec => !allowed.test(spec)).map(spec => `${p}: ${spec}`));
    expect(bad).toEqual([]);
  });
});
