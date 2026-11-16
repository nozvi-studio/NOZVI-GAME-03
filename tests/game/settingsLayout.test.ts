import { describe, expect, it } from 'vitest';
import { knobTravel, settingsLayout } from '../../src/game/flow/settingsLayout';
import { trackAlpha } from '../../src/game/flow/settingsView';
import { MENU } from '../../src/game/ui/menuMetrics';

const S = MENU.settings.d3;
describe('D3-R19 settingsLayout', () => {
  it('D3-R19 one panel holds four rows; rows and dividers tile the panel exactly (360x640 board)', () => {
    const l = settingsLayout(640, 4);
    expect(l.panel).toEqual({ x: 14, y: 84, w: 332, h: 2 * S.panelPadY + 4 * S.rowH + 3 * S.divider });
    expect(l.rows).toHaveLength(4); expect(l.rows[0]!.y).toBe(84 + S.panelPadY);
    expect(l.rows[1]!.y - l.rows[0]!.y).toBe(S.rowH + S.divider);
    expect(l.toggle[0]).toMatchObject({ w: 60, h: 34 });
  });
  it('U6-R6 the caption sits below the panel at every height (the board mock overlaps)', () => {
    for (const hm of [640, 779, 800]) {
      const l = settingsLayout(hm, 4);
      expect(l.caption.y).toBe(l.panel.y + l.panel.h + S.captionGap);
      expect(l.caption.y + l.caption.h).toBeLessThanOrEqual(hm);
    }
  });
  it('D3-R8 every row is a full-width touch target of at least 48 px', () => {
    for (const r of settingsLayout(640, 4).rows) expect(Math.min(r.w, r.h)).toBeGreaterThanOrEqual(48);
  });
  it('U6-R7 the knob stays inside the track overhang and the slide cross-fades the track', () => {
    expect(knobTravel(60, 34)).toBe(13);
    expect(trackAlpha(false, true, 0)).toBe(0); expect(trackAlpha(false, true, 1)).toBe(1);
    expect(trackAlpha(true, false, 0.25)).toBe(0.75); expect(trackAlpha(true, true, 0.5)).toBe(1); expect(trackAlpha(false, false, 0.5)).toBe(0);
  });
});
