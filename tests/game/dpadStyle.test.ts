import { expect, it } from 'vitest';
import { dpadStyle, type DpadState } from '../../src/game/input/dpadStyle';

const states: DpadState[] = ['heading', 'idle', 'blocked'];
it('UIFIX-R13 every D-pad state draws the identical border', () => {
  const [a, ...rest] = states.map(s => dpadStyle(s).border);
  for (const b of rest) expect(b).toEqual(a);
  expect(a!.widthMock).toBeGreaterThan(0);
});
it('UIFIX-R13 heading is the only state with the glow halo and full alpha; blocked is the faintest', () => {
  expect(states.filter(s => dpadStyle(s).glow)).toEqual(['heading']);
  expect(dpadStyle('heading').alpha).toBe(1);
  expect(dpadStyle('idle').alpha).toBeGreaterThan(dpadStyle('blocked').alpha);
  expect(dpadStyle('idle').alpha).toBeLessThan(1);
});
