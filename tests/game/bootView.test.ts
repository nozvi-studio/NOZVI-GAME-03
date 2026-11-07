import { expect, it } from 'vitest';
import { bootView } from '../../src/game/flow/bootView';
it('P3b3-R12 progress is clamped and rounded for the bar and the text', () => {
  expect(bootView(0.62)).toEqual({ fill: 0.62, textKey: 'boot.loading', n: 62 });
  expect(bootView(-1)).toMatchObject({ fill: 0, n: 0 });
  expect(bootView(4)).toMatchObject({ fill: 1, n: 100 });
  expect(bootView(0.666)).toMatchObject({ n: 67 });
});
