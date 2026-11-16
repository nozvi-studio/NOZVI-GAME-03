// D3-R1/R2/R4 D3 "Juicy" token contract (spec 2026-11-10-ui-d3-juicy-design.md §4). Pure: no Phaser.
import { expect, it } from 'vitest';
import { contrastRatio } from '../../src/game/render/biomePalette';
import { TOKENS, toInt } from '../../src/game/uiTokens';

const D = TOKENS.d3;
const cr = (a: string, b: string): number => contrastRatio(toInt(a), toInt(b));
const mid = (face: readonly string[]): string => face[Math.floor(face.length / 2)]!;

it('D3-R1 every d3 colour is a valid #RRGGBB', () => {
  const all: string[] = [...D.bg.stops, D.ink, D.inkDeep, D.text, D.white, D.logo.mango, D.logo.mangoLine,
    ...Object.values(D.tone).flatMap((t) => [...t.face, t.line, t.lip, t.text]),
    ...Object.values(D.snake), ...Object.values(D.outline), ...Object.values(D.outlineStorm),
    ...D.biomes.flatMap((b) => [...b.bg, b.frame, ...b.cells])];
  for (const c of all) expect(() => toInt(c)).not.toThrow();
});
it('D3-R2 plain text reaches 4.5:1 on the middle stop of its surface', () => {
  for (const [name, t] of Object.entries(D.tone)) {
    if (t.outlined) continue;
    expect(cr(t.text, mid(t.face)), name).toBeGreaterThanOrEqual(4.5);
  }
});
it('D3-R2 outlined display type reaches 4.5:1 between fill and outline', () => {
  for (const [name, t] of Object.entries(D.tone)) {
    if (!t.outlined) continue;
    expect(cr(t.text, t.line), name).toBeGreaterThanOrEqual(4.5);
  }
  expect(cr(D.white, D.inkDeep)).toBeGreaterThanOrEqual(4.5);
  expect(cr(D.logo.mango, D.logo.mangoLine)).toBeGreaterThanOrEqual(4.5);
});
it('D3-R2 board outlines reach 3:1 on both cells of every biome', () => {
  D.biomes.forEach((b, i) => {
    const set = i === D.biomes.length - 1 ? D.outlineStorm : D.outline;
    for (const [part, c] of Object.entries(set)) for (const cell of b.cells) {
      expect(cr(c, cell), `biome ${i + 1} ${part} on ${cell}`).toBeGreaterThanOrEqual(3);
    }
  });
});
it('D3-R4 six biomes, one hue per ground (cells differ, no grid colour)', () => {
  expect(D.biomes.length).toBe(6);
  for (const b of D.biomes) { expect(b.bg.length).toBe(3); expect(b.cells[0]).not.toBe(b.cells[1]); }
});
it('D3-R1 shape numbers are positive and ordered', () => {
  const s = D.shape;
  expect(s.lineBig).toBeGreaterThan(s.line);
  expect(s.lipBig).toBeGreaterThan(s.lipSkill); expect(s.lipSkill).toBeGreaterThan(s.lip);
  expect(s.pressedLip).toBeLessThan(s.lip);
  expect(s.pressedGloss).toBeGreaterThan(0); expect(s.pressedGloss).toBeLessThan(1);
});
it('D3-R2 strip card: skill pill text on its chip face (4.5:1) and icon tints on the light panel face (3:1)', () => {
  expect(cr(D.white, mid(D.tone.skillA.face)), 'skillA').toBeGreaterThanOrEqual(4.5);
  expect(cr(D.text, mid(D.tone.skillB.face)), 'skillB').toBeGreaterThanOrEqual(4.5); // slot B pill text and icon are ink, not white
  const panel = mid(D.tone.light.face);
  for (const [n, c] of Object.entries({ up: D.tone.primary.line, warn: D.tone.skillB.line, mint: TOKENS.hud.mintInk }))
    expect(cr(c, panel), n).toBeGreaterThanOrEqual(3);
});
