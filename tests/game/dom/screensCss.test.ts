import { describe, expect, it } from 'vitest';
import main from '../../../src/game/main.ts?raw';
import { readRepoText } from './readText';

describe('D4-P3 screens.css', async () => {
  const css = await readRepoText('src/game/dom/styles/screens.css');

  it('D4-P3-R1 grid rows are 72px with 8px gap and stage is min 200 max 260', () => {
    expect(css).toContain('grid-auto-rows: 72px');
    expect(css).toContain('gap: 8px');
    expect(css).toContain('min-height: 200px');
    expect(css).toContain('max-height: 260px');
  });

  it('D4-P3 no hex colours in screens.css and main.ts imports screens.css', () => {
    const stripped = css.replace(/url\([^)]*\)/gi, 'url()');
    expect(stripped).not.toMatch(/#[0-9a-f]{3,8}\b/i);
    expect(main).toContain("import './dom/styles/screens.css'");
  });
});
