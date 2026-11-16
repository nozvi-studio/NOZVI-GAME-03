import { describe, expect, it } from 'vitest';
import { drawFixedTerrain, invulnAlpha } from '../../src/game/render/fixedTerrain';
import { boardLook } from '../../src/game/render/biomePalette';
import { loadBalance } from '../support/balance';
import { gfx } from '../support/gfx';
import { TEL } from '../support/telegraph';
import type { SimSnapshot } from '../../src/core';

const cfg = { invulnBlinkMs: 120, invulnLowAlpha: 0.45 };
describe('MEC-019-R7 invulnerable blink', () => {
  it('is opaque when not invulnerable', () => { expect(invulnAlpha(null, 500, false, cfg)).toBe(1); });
  it('alternates every blink period', () => {
    expect(invulnAlpha({ leftMs: 900 }, 0, false, cfg)).toBe(1);
    expect(invulnAlpha({ leftMs: 900 }, 120, false, cfg)).toBe(0.45);
    expect(invulnAlpha({ leftMs: 900 }, 240, false, cfg)).toBe(1);
  });
  it('reduced motion uses a steady low alpha', () => {
    expect(invulnAlpha({ leftMs: 900 }, 0, true, cfg)).toBe(0.45);
    expect(invulnAlpha({ leftMs: 900 }, 120, true, cfg)).toBe(0.45);
  });
});

describe('MEC-019-R9 drawFixedTerrain', () => {
  const b = loadBalance(), look = boardLook(2);
  const view = (cells: SimSnapshot['fixedTerrain']['cells']): SimSnapshot['fixedTerrain'] => ({ name: 'Test', cells });
  it('draws rock, fence, warn ring and crumble without throwing', () => {
    const p = gfx();
    const cells = [
      { x: 1, y: 1, kind: 'R', state: 'solid', leftMs: 0 },
      { x: 4, y: 4, kind: 'F', state: 'solid', leftMs: 0 },
      { x: 5, y: 4, kind: 'F', state: 'solid', leftMs: 0 },
      { x: 7, y: 7, kind: 'R', state: 'warn', leftMs: 500 },
      { x: 9, y: 9, kind: 'R', state: 'crumble', leftMs: 100 },
    ] as const;
    expect(() => drawFixedTerrain(p.g, view(cells), 30, look, b, false, TEL)).not.toThrow();
    expect(p.count('fillEllipse')).toBeGreaterThan(0);
    expect(p.count('fillRoundedRect')).toBeGreaterThan(0);
    expect(p.count('strokeRoundedRect')).toBeGreaterThan(0);
  });
  it('records nothing for an empty cell list', () => {
    const p = gfx();
    drawFixedTerrain(p.g, view([]), 30, look, b, false, TEL);
    expect(p.calls.length).toBe(0);
  });
});
