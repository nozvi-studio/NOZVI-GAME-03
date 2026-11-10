import { expect, it } from 'vitest';
import { HEIGHT, WIDTH } from '../../src/game/layout';
import { PREVIEW, previewRects, type Rect } from '../../src/game/ui/artPreviewLayout';

const overlap = (a: Rect, b: Rect): boolean => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;

it('UIFIX-R11 no widget overlaps the live capy box', () => {
  const { widgets, live } = previewRects();
  for (const w of widgets) expect(overlap(w, live), w.name).toBe(false);
});
it('UIFIX-R11 widgets do not overlap each other and stay on the canvas', () => {
  const { widgets } = previewRects();
  widgets.forEach((a, i) => {
    expect(a.x0).toBeGreaterThanOrEqual(0); expect(a.x1).toBeLessThanOrEqual(WIDTH);
    expect(a.y0).toBeGreaterThanOrEqual(PREVIEW.liveTop); expect(a.y1).toBeLessThanOrEqual(HEIGHT);
    widgets.slice(i + 1).forEach(b => expect(overlap(a, b), `${a.name} vs ${b.name}`).toBe(false));
  });
});
it('UIFIX-R11 the Remotion sprite stays on the canvas and clear of the capy and the widgets', () => {
  const { widgets, live, remotion } = previewRects();
  expect(remotion.x0).toBeGreaterThanOrEqual(0); expect(remotion.x1).toBeLessThanOrEqual(WIDTH);
  expect(remotion.y0).toBeGreaterThanOrEqual(0); expect(remotion.y1).toBeLessThanOrEqual(HEIGHT);
  expect(overlap(remotion, live)).toBe(false);
  for (const w of widgets) expect(overlap(remotion, w), w.name).toBe(false);
});
it('UIFIX-R11 the live capy keeps its ART-001 size and position', () => {
  expect(PREVIEW.bigSize).toBe(256); expect(PREVIEW.liveY).toBe(828);
  expect(PREVIEW.rmX).toBe(470); expect(PREVIEW.rmY).toBe(828);
});
