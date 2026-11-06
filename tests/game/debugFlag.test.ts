// tests/game/debugFlag.test.ts
import { expect, it } from 'vitest';
import { debugStartLevel, isArtPreview, isDebug } from '../../src/game/flow/debugFlag';

it('MEC-003-R21 debug flag only for debug=1', () => {
  expect(isDebug('?debug=1')).toBe(true);
  expect(isDebug('?a=2&debug=1')).toBe(true);
  for (const s of ['', '?debug=0', '?x=1']) expect(isDebug(s)).toBe(false);
});

it('MEC-003-R21 debugStartLevel needs debug=1 and an integer level in 1..max', () => {
  expect(debugStartLevel('?debug=1&level=17', 30)).toBe(17);
  expect(debugStartLevel('?level=17&debug=1', 30)).toBe(17);
  expect(debugStartLevel('?debug=1&level=30', 30)).toBe(30);
  for (const s of ['?level=17', '?debug=0&level=17', '?debug=1', '?debug=1&level=0', '?debug=1&level=31',
    '?debug=1&level=abc', '?debug=1&level=2.5', '?debug=1&level=-3', '?debug=1&level=']) expect(debugStartLevel(s, 30)).toBeNull();
});

it('ART-001 art preview needs debug=1 and artPreview=1', () => {
  expect(isArtPreview('?debug=1&artPreview=1')).toBe(true);
  expect(isArtPreview('?artPreview=1')).toBe(false);
  expect(isArtPreview('?debug=1')).toBe(false);
});
