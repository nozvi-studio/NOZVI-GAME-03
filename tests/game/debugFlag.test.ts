// tests/game/debugFlag.test.ts
import { expect, it } from 'vitest';
import { isDebug } from '../../src/game/flow/debugFlag';

it('MEC-003-R21 debug flag only for debug=1', () => {
  expect(isDebug('?debug=1')).toBe(true);
  expect(isDebug('?a=2&debug=1')).toBe(true);
  for (const s of ['', '?debug=0', '?x=1']) expect(isDebug(s)).toBe(false);
});
