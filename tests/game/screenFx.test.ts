import { describe, expect, it } from 'vitest';
import { ScreenFx } from '../../src/game/juice/ScreenFx';
import { loadBalance } from '../support/balance';
import { DrawObject } from '../support/scene';

const b = loadBalance();
const sources = import.meta.glob('../../src/game/juice/ScreenFx.ts', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
const DANGER = 4242;
function make() {
  const made: { key: string; w: number; h: number; ctx: Record<string, unknown>; refreshed: number }[] = [];
  const images: (DrawObject & { key: string; tint?: number })[] = [];
  const tweens: { targets: DrawObject; alpha?: number; duration?: number; onComplete?: () => void }[] = [];
  const keys = new Set<string>();
  const ctx = () => new Proxy({} as Record<string, unknown>, { get: (t, k: string) => t[k] ?? (() => {}), set: (t, k: string, v) => { t[k] = v; return true; } });
  const scene = {
    textures: { exists: (k: string) => keys.has(k),
      createCanvas: (key: string, w: number, h: number) => { keys.add(key); const c = ctx(), e = { key, w, h, ctx: c, refreshed: 0 }; made.push(e); return { getContext: () => c, refresh: () => { e.refreshed++; } }; } },
    add: {
      image: (x: number, y: number, key: string) => {
        const o = Object.assign(new DrawObject().setPosition(x, y), { key, tint: undefined as number | undefined });
        o.setTint = (c: unknown) => { o.tint = c as number; return o; }; images.push(o); return o;
      },
      graphics: () => new DrawObject(), circle: () => new DrawObject(), rectangle: () => new DrawObject() },
    tweens: { add: (v: never) => { tweens.push(v); } },
  };
  const fx = new ScreenFx(scene as never, { bump() {}, plantFlag() {}, point: () => ({ x: 0, y: 0 }), skillPoint: () => ({ x: 0, y: 0 }) } as never,
    id => (id === 'danger' ? DANGER : 1), 20, { maxSparks: 5 }, b.juice.skill.iconRingScale);
  return { fx, made, images, tweens };
}
const death = { kind: 'deathFlash', alpha: b.juice.death.flashAlpha, ms: b.juice.death.flashMs, vignette: true } as const;

describe('P3a-R7 smooth death vignette', () => {
  it('pre-renders the vignette texture once across two deaths and tints it danger', () => {
    const m = make(); m.fx.play(death); m.fx.play(death);
    expect(m.made.map(t => t.key)).toEqual(['juice-vignette']); expect(m.made[0]!.refreshed).toBe(1);
    expect(m.images.length).toBe(2);
    for (const im of m.images) { expect(im.key).toBe('juice-vignette'); expect(im.tint).toBe(DANGER); expect(im.alpha).toBe(death.alpha); }
    expect(m.tweens.filter(t => t.alpha === 0).length).toBe(2);
  });
  it('reduced (no vignette) draws no texture', () => {
    const m = make(); m.fx.play({ ...death, vignette: false }); expect(m.made).toEqual([]); expect(m.images).toEqual([]);
  });
  it('has no colour literals (colours come from the palette helper)', () => {
    const src = Object.values(sources)[0]!;
    expect(src.length).toBeGreaterThan(0);
    expect(src).not.toMatch(/0x[0-9a-fA-F]{3,}|#[0-9a-fA-F]{3,8}\b/);
  });
});
