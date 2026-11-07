import { expect, it } from 'vitest';
import { chipHasIcon } from '../../src/game/hud/HudTop';

it('UIFIX-R3 the wait chip shows no checkpoint flag; ramp and checkpoint chips keep the icon', () => {
  expect(chipHasIcon('wait')).toBe(false);
  expect(chipHasIcon('ramp')).toBe(true); expect(chipHasIcon('checkpoint')).toBe(true);
});
