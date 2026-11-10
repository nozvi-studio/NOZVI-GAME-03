import { expect, it } from 'vitest';
import { drawThenSwap } from '../../src/game/ui/fonts';

const setup = () => {
  const log: string[] = []; let n = 0;
  const draw = () => { const id = ++n; log.push(`draw${id}`); return { destroy: () => log.push(`destroy${id}`) }; };
  let settle!: (ok: boolean) => void;
  const ready = new Promise<boolean>(r => { settle = r; });
  return { log, draw, ready, settle };
};
it('UIFIX-R8 the title is drawn immediately and redrawn once when fonts are ready', async () => {
  const s = setup();
  drawThenSwap(s.draw, s.ready, () => true);
  expect(s.log).toEqual(['draw1']);                       // visible before any font resolves
  s.settle(true); await s.ready; await Promise.resolve();
  expect(s.log).toEqual(['draw1', 'destroy1', 'draw2']);
});
it('UIFIX-R8 a font timeout keeps the fallback title (no redraw)', async () => {
  const s = setup();
  drawThenSwap(s.draw, s.ready, () => true);
  s.settle(false); await s.ready; await Promise.resolve();
  expect(s.log).toEqual(['draw1']);
});
it('UIFIX-R8 no redraw when the scene is already gone', async () => {
  const s = setup();
  drawThenSwap(s.draw, s.ready, () => false);
  s.settle(true); await s.ready; await Promise.resolve();
  expect(s.log).toEqual(['draw1']);
});
