import { expect, it } from 'vitest';
import { waitForFonts, UI_FONT_SPECS } from '../../src/game/ui/fonts';
it('P3-0-R6 resolves true when every font loads', async () => {
  const asked: string[] = [];
  await expect(waitForFonts({ load: async (s: string) => { asked.push(s); return []; } }, UI_FONT_SPECS, 50)).resolves.toBe(true);
  expect(asked).toEqual([...UI_FONT_SPECS]);
});
it('P3-0-R6 resolves false on timeout, error or no FontFaceSet', async () => {
  await expect(waitForFonts({ load: () => new Promise(() => {}) }, UI_FONT_SPECS, 10)).resolves.toBe(false);
  await expect(waitForFonts({ load: async () => { throw new Error('x'); } }, UI_FONT_SPECS, 10)).resolves.toBe(false);
  await expect(waitForFonts(undefined, UI_FONT_SPECS, 10)).resolves.toBe(false);
});
