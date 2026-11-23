import { expect, it } from 'vitest';
import { boardLook, contrastRatio, HAZARD_EDGES } from '../../src/game/render/biomePalette';
import { SKIN_IDS } from '../../src/game/art/skins';
import { TOKENS, toInt } from '../../src/game/uiTokens';

function hsl(c: number): { l: number; chroma: number } {
  const r = ((c >> 16) & 255) / 255, g = ((c >> 8) & 255) / 255, b = (c & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  return { l: (max + min) / 2, chroma: max - min };
}

function relLum(c: number): number {
  const ch = (v: number): number => { const x = v / 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * ch((c >> 16) & 255) + 0.7152 * ch((c >> 8) & 255) + 0.0722 * ch(c & 255);
}

// D3-R2 board outlines keep >= 3:1 against both cells of every biome.
it('D3-R2 snake, mango, rock and warn outlines vs both cells, biomes 1..6', () => {
  for (let n = 1; n <= 6; n++) {
    const l = boardLook(n);
    for (const k of ['snake', 'mango', 'rock', 'warn'] as const) for (const cell of [l.groundA, l.groundB])
      expect(contrastRatio(l.outline[k], cell), `biome ${n} ${k}`).toBeGreaterThanOrEqual(3);
  }
});

it('D3-R2 every hazard family outline vs both cells, biomes 1..6', () => {
  for (let n = 1; n <= 6; n++) {
    const l = boardLook(n);
    for (const [k, edge] of Object.entries(HAZARD_EDGES)) for (const cell of [l.groundA, l.groundB])
      expect(contrastRatio(edge(l), cell), `biome ${n} ${k}`).toBeGreaterThanOrEqual(3);
  }
});

for (const skin of SKIN_IDS) it(`MEC-011-R4 D3-R2 ${skin}: the body outline keeps the board contrast on both cells of all 6 biomes`, () => {
  for (let biome = 1; biome <= 6; biome++) {
    const look = boardLook(biome, skin);
    for (const cell of [look.groundA, look.groundB]) expect(contrastRatio(look.outline.snake, cell), `${skin} biome ${biome}`).toBeGreaterThanOrEqual(3);
  }
});

it('D4-P5-R1 full 6 biomes x 5 skins x 11 hazards contrast matrix (>= 3:1 on both cells)', () => {
  expect(SKIN_IDS.length).toBe(5);
  expect(Object.keys(HAZARD_EDGES).length).toBe(11);
  for (let n = 1; n <= 6; n++) {
    for (const skin of SKIN_IDS) {
      const look = boardLook(n, skin);
      for (const cell of [look.groundA, look.groundB]) {
        expect(contrastRatio(look.outline.snake, cell), `b${n} ${skin} snake`).toBeGreaterThanOrEqual(3);
        expect(contrastRatio(look.outline.mango, cell), `b${n} ${skin} mango`).toBeGreaterThanOrEqual(3);
        expect(contrastRatio(look.outline.warn, cell), `b${n} ${skin} warn`).toBeGreaterThanOrEqual(3);
        for (const [fam, edge] of Object.entries(HAZARD_EDGES)) {
          expect(contrastRatio(edge(look), cell), `b${n} ${skin} ${fam}`).toBeGreaterThanOrEqual(3);
        }
      }
    }
  }
});

it('D4-P5-R1 biome 1..5 checker is soft: |L(a)-L(b)| <= 0.06 and chroma <= 0.55', () => {
  for (let n = 1; n <= 5; n++) {
    const look = boardLook(n);
    const a = hsl(look.groundA), b = hsl(look.groundB);
    expect(Math.abs(a.l - b.l), `biome ${n} dL`).toBeLessThanOrEqual(0.06);
    expect(a.chroma, `biome ${n} chroma A`).toBeLessThanOrEqual(0.55);
    expect(b.chroma, `biome ${n} chroma B`).toBeLessThanOrEqual(0.55);
  }
});

it('D4-P5-R1 / D4-P5-R2 Storm cells stay dark and Storm HUD surfaces pass legibility guards', () => {
  const storm = boardLook(6);
  expect(relLum(storm.groundA)).toBeLessThanOrEqual(0.12);
  expect(relLum(storm.groundB)).toBeLessThanOrEqual(0.12);
  const { hud, energy, bg, frame } = TOKENS.d4run;
  const surface = toInt(hud.surface), ink = toInt(hud.ink);
  const bgTop = toInt(bg[5]![0]), bgBottom = toInt(bg[5]![1]), stormFrame = toInt(frame[5]!);
  expect(contrastRatio(ink, surface)).toBeGreaterThanOrEqual(4.5);
  expect(contrastRatio(surface, stormFrame)).toBeGreaterThanOrEqual(3);
  expect(contrastRatio(surface, bgTop)).toBeGreaterThanOrEqual(3);
  expect(contrastRatio(surface, bgBottom)).toBeGreaterThanOrEqual(3);
  expect(contrastRatio(toInt(hud.labelStorm), bgTop)).toBeGreaterThanOrEqual(4.5);
  expect(contrastRatio(toInt(hud.labelStorm), bgBottom)).toBeGreaterThanOrEqual(4.5);
  expect(contrastRatio(toInt(energy.track), bgBottom)).toBeGreaterThanOrEqual(3);
});
