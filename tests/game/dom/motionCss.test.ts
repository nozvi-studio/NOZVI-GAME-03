import { describe, expect, it } from 'vitest';
import { MOTION } from '../../../src/game/dom/motionTokens';
import { readRepoText } from './readText';

describe('D4-P2-R3 / R4 motion.css', async () => {
  const css = await readRepoText('src/game/dom/styles/motion.css');

  it('D4-P2-R4 defines both spring curves exactly', () => {
    expect(css).toContain('--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1)');
    expect(css).toContain('--ease-out-quart: cubic-bezier(0.22, 1, 0.36, 1)');
  });

  it('D4-P2-R3/R4 CSS timings mirror MOTION', () => {
    expect(css).toContain(`--breath-ms: ${MOTION.breathMs}ms`);
    expect(css).toContain(`--stagger-ms: ${MOTION.staggerMs}ms`);
    expect(css).toContain(`--stagger-rise: ${MOTION.staggerRisePx}px`);
    expect(css).toContain(`--enter-ms: ${MOTION.enterMs}ms`);
  });

  it('D4-P2-R3 head and body breathing share one duration variable', () => {
    expect(css).toMatch(/d4-breath-body\s+var\(--breath-ms\)/);
    expect(css).toMatch(/d4-breath-head\s+var\(--breath-ms\)/);
  });

  it('D4-P2-R4 reduced-motion shows final state for .d4-enter and contains no hex colours', () => {
    expect(css).toMatch(/\.reduced-motion\s+\.d4-enter\s*\{[^}]*opacity:\s*1/s);
    const stripped = css.replace(/url\([^)]*\)/gi, 'url()');
    expect(stripped).not.toMatch(/#[0-9a-f]{3,8}\b/i);
  });
});
