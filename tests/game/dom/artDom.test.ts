// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { headSvg } from '../../../src/game/art/capyRig';
import { SKIN_IDS } from '../../../src/game/art/skins';
import { createHeroStage } from '../../../src/game/dom/heroStage';
import { FakeClock } from './fakeClock';

describe('D4-P2-R1 DOM id collision proof', () => {
  it('D4-P2-R1 five heroes plus five head thumbnails in one document have no ids', () => {
    const clock = new FakeClock();
    const wrap = document.createElement('div');
    document.body.appendChild(wrap);
    const heroes = SKIN_IDS.map(skin => createHeroStage(wrap, { skin, clock }));
    for (const skin of SKIN_IDS) {
      const thumb = document.createElement('div');
      thumb.innerHTML = headSvg(skin, 'idle');
      wrap.appendChild(thumb);
    }
    expect(wrap.querySelectorAll('[id]').length).toBe(0);
    expect(wrap.innerHTML).not.toContain('url(#');
    for (const h of heroes) h.destroy();
    wrap.remove();
    expect(clock.pending()).toBe(0);
  });
});
