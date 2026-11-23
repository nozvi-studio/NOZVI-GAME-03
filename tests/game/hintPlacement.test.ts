import { describe, expect, it } from 'vitest';
import { badgeRects, d3HudLayout, hintPlacement, type R } from '../../src/game/hud/d3HudLayout';

const FINGER = { tip: 7, bodyW: 12, bodyH: 18, gap: 18, dy: 6 };

function intersects(a: R, b: R): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

describe('D4-P5-R2 swipe-hint finger placement never overlaps skill buttons or badges', () => {
  for (const hm of [640, 700, 780]) {
    it(`D4-P5-R2 finger box clears both skills and badges across hintW 40..200 at 360x${hm}`, () => {
      const l = d3HudLayout(hm, false);
      const badges = badgeRects(l);
      const obstacles: R[] = [l.skills[0], l.skills[1], ...badges];
      const swing = 12;
      for (let hintW = 40; hintW <= 200; hintW += 4) {
        const res = hintPlacement(l, hintW, FINGER, badges, swing)!;
        expect(res).not.toBeNull();
        for (const dx of [-swing, 0, swing]) {
          const fx = res.finger.x + dx;
          const halfW = Math.max(FINGER.tip, FINGER.bodyW / 2);
          const box: R = {
            x: fx - halfW,
            y: res.finger.y - FINGER.tip,
            w: halfW * 2,
            h: FINGER.tip + FINGER.bodyH,
          };
          for (const o of obstacles) {
            expect(intersects(box, o), `hm=${hm} hintW=${hintW} dx=${dx}`).toBe(false);
          }
        }
      }
    });
  }

  it('D4-P5-R2 hintPlacement is null in D-pad mode', () => {
    const l = d3HudLayout(640, true);
    expect(hintPlacement(l, 120, FINGER, badgeRects(l))).toBeNull();
  });
});
