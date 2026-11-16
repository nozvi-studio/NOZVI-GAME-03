import { expect, it } from 'vitest';
import { ui } from '../../src/game/ui/layout';
import { TOKENS } from '../../src/game/uiTokens';
import { bootRects, logoLetters, logoSpec, smoothPath, homeRects, type HomeRects, type Rect } from '../../src/game/ui/menuLayout';
it('P3b3-R13 logo letters alternate tilt and cycle the mockup colours', () => {
  const a = logoLetters('MANGO', 0);
  expect(a.map(l => l.ch).join('')).toBe('MANGO');
  expect(a.map(l => l.color)).toEqual(['#F79DBB', '#F8D468', '#8CC9F0', '#97DB9B', '#C6B0F5']);
  expect(a.map(l => l.rotDeg)).toEqual([-3, 3, -3, 3, -3]);
  expect(a.map(l => l.dy)).toEqual([-2, 2, -2, 2, -2]);
  expect(logoLetters('SNAKE', 2).map(l => l.color)).toEqual(['#8CC9F0', '#97DB9B', '#C6B0F5', '#F79DBB', '#F8D468']);
});
it('P3b3-R13 a space is a gap that does not consume a colour', () => {
  const g = logoLetters('GAME OVER', 0);
  expect(g[4]).toEqual({ ch: ' ', color: '', rotDeg: 0, dy: 0 });
  expect(g[5]!.color).toBe('#C6B0F5'); // O is the fifth letter
});
it('P3b3-R13 smoothPath keeps the end points and stays inside the control box', () => {
  const pts = [{ x: 16, y: 232 }, { x: 170, y: 232 }, { x: 170, y: 168 }, { x: 250, y: 168 }, { x: 250, y: 112 }];
  const p = smoothPath(pts, 34, 3);
  expect(p[0]).toEqual(pts[0]);
  expect(p[p.length - 1]).toEqual(pts[4]);
  for (const q of p) { expect(q.x).toBeGreaterThanOrEqual(16); expect(q.x).toBeLessThanOrEqual(250); expect(q.y).toBeGreaterThanOrEqual(112); expect(q.y).toBeLessThanOrEqual(232); }
  for (let i = 1; i < p.length; i++) expect(Math.hypot(p[i]!.x - p[i - 1]!.x, p[i]!.y - p[i - 1]!.y)).toBeLessThanOrEqual(6);
});

it('D3-R11 logoSpec: MANGO yellow with mango line, SNAKE white with ink line, ink drop under both', () => {
  const s = logoSpec(0.92);
  expect(s.lines.map(l => l.key)).toEqual(['logo.mango', 'logo.snake']);
  expect(s.lines[0]).toMatchObject({ fill: TOKENS.d3.logo.mango, stroke: TOKENS.d3.logo.mangoLine });
  expect(s.lines[1]).toMatchObject({ fill: TOKENS.d3.white, stroke: TOKENS.d3.ink });
  for (const l of s.lines) { expect(l.back).toBe(TOKENS.d3.inkDeep); expect(l.backY - l.y).toBeCloseTo(6 * 0.92); }
  expect(s.fontPx).toBeCloseTo(70 * 0.92); expect(s.h).toBeCloseTo(150 * 0.92);
  expect(s.lines[0]!.y).toBeCloseTo((64 - 0.35 * 70) * 0.92); // centre of the caps, mock px from the logo top
});

const FLAGS = [false, true].flatMap(start => [false, true].flatMap(stepper => [false, true].flatMap(l1 => [false, true].flatMap(loadout =>
  [false, true].map(hint => ({ start, stepper: start && stepper, l1: start && l1, loadout, hint }))))));
const HM = [640, 700, 779, 800];
const all = (r: HomeRects) => Object.entries(r).filter(([, v]) => v) as [string, Rect][];
const overlap = (a: Rect, b: Rect) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

it('D3-R11 D3-R7 every Home rect sits inside the canvas at heights 640..800 mock px', () => {
  for (const hm of HM) for (const f of FLAGS) for (const [k, r] of all(homeRects(hm, f))) {
    expect(r.x, `${hm} ${k}`).toBeGreaterThanOrEqual(0); expect(r.x + r.w, `${hm} ${k}`).toBeLessThanOrEqual(360);
    expect(r.y, `${hm} ${k}`).toBeGreaterThanOrEqual(0); expect(r.y + r.h, `${hm} ${k}`).toBeLessThanOrEqual(hm);
  }
});
it('D3-R11 Home rects never overlap', () => {
  for (const hm of HM) for (const f of FLAGS) {
    const rs = all(homeRects(hm, f));
    for (let i = 0; i < rs.length; i++) for (let j = i + 1; j < rs.length; j++)
      expect(overlap(rs[i]![1], rs[j]![1]), `${hm} ${rs[i]![0]}/${rs[j]![0]}`).toBe(false);
  }
});
it('D3-R8 tappable Home targets are >= 48 mock px and actions start in the lower 45%', () => {
  for (const hm of HM) for (const f of FLAGS) {
    const r = homeRects(hm, f);
    for (const k of ['settings', 'play', 'prev', 'next', 'l1', 'loadout'] as const) {
      const x = r[k]; if (!x) continue;
      expect(x.w, k).toBeGreaterThanOrEqual(48); expect(x.h, k).toBeGreaterThanOrEqual(48);
    }
    for (const k of ['play', 'start', 'prev', 'next', 'l1', 'loadout'] as const) { const x = r[k]; if (x) expect(x.y, `${hm} ${k}`).toBeGreaterThanOrEqual(0.55 * hm); }
  }
});
it('D3-R11 board anchors: PLAY 280x84 at y 408 on 640, y 517 on 779; Start chip only with a checkpoint', () => {
  const f = { start: true, stepper: false, l1: true, loadout: true, hint: false };
  expect(homeRects(640, f).play).toEqual({ x: 40, y: 408, w: 280, h: 84 });
  expect(homeRects(779, f).play.y).toBeCloseTo(517);
  expect(homeRects(640, { ...f, start: false, l1: false }).start).toBeUndefined();
});
it('D3-R11 H3 the milestone hint uses the Start slot only when there is no checkpoint', () => {
  const base = { stepper: false, l1: false, loadout: false, hint: true };
  expect(homeRects(640, { ...base, start: false }).hint).toBeDefined();
  expect(homeRects(640, { ...base, start: true }).hint).toBeUndefined();
});
it('D3-R11 H2 a single link button is centred; two links sit left and right', () => {
  const one = homeRects(640, { start: false, stepper: false, l1: false, loadout: true, hint: false }).loadout!;
  expect(one.x + one.w / 2).toBeCloseTo(180);
  const two = homeRects(640, { start: true, stepper: false, l1: true, loadout: true, hint: false });
  expect(two.l1!.x).toBe(22); expect(two.loadout!.x + two.loadout!.w).toBe(338);
});
it('D3-R10 bootRects: board positions at 640, group centred on taller canvases, all inside', () => {
  const a = bootRects(640);
  expect(a.bar).toEqual({ x: 60, y: 420, w: 240, h: 26 });
  const b = bootRects(780);
  expect(b.bar.y - a.bar.y).toBeCloseTo(70); expect(b.logo.y - a.logo.y).toBeCloseTo(70);
  for (const hm of [640, 779, 800]) { const r = bootRects(hm); expect(r.text.y + r.text.h).toBeLessThanOrEqual(hm); }
});
