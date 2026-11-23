// @ts-ignore node typings are not installed; vitest runs on Node
import { createHash } from 'node:crypto';
import { afterEach, describe, expect, it } from 'vitest';
import json from '../../config/balance.json';
import { parseBalance } from '../../src/core';
import { BODY_POSES, EXPRESSIONS, bodyKey, bodySvg, headKey, headLayersSvg, headSvg, skinExpressions } from '../../src/game/art/capyRig';
import { SKIN_EFFECTS, SKIN_IDS, SKIN_PALETTES, activeSkin, setActiveSkin } from '../../src/game/art/skins';
import { preloadSkins } from '../../src/game/art/capyTextures';
import { readRepoText } from './dom/readText';

const sha = (s: string): string => createHash('sha1').update(s).digest('hex').slice(0, 12);
const attr = (svg: string, part: string, name: string): string[] =>
  [...svg.matchAll(new RegExp(`data-part="${part}"[^>]*?\\s${name}="([^"]+)"`, 'g'))].map(m => m[1]!);
const LAYERS = ['ears', 'head', 'blush', 'muzzle', 'nose', 'eyes', 'mouth'];

// Hashes captured from the D4-P2 Duolingo vector capy output (2026-11-23).
const CAPY_HASH: Record<string, string> = {
  idle: '5c60bffb825e', idle_blink: 'b98d4c7d4005', eat_open: '78f20b3dea3a', eat_chew: '0a13ab913e35', dead: 'ba92d3b30031',
  happy: '421f5fe2049c', alert: 'fbc58e371118', scared: '76c329dbdab3', determined: '8e78d8773ae5', sleepy: '8e78d8773ae5',
  hurt: 'cef890c9050d', win: '2733d1af22a8',
};

describe('ART-003 skins', () => {
  afterEach(() => setActiveSkin('snake'));
  it('ART-003 MEC-011-R1 five skin ids in balance order; activeSkin defaults to snake and can be set', () => {
    expect([...SKIN_IDS]).toEqual(parseBalance(json).skins.order);
    expect(activeSkin()).toBe('snake');
    setActiveSkin('capy'); expect(activeSkin()).toBe('capy');
    setActiveSkin('dragon'); expect(activeSkin()).toBe('snake');
  });
  it('MEC-011-R3 each new skin has its own ears and no part of another animal', () => {
    for (const skin of ['ginger', 'tuxedo'] as const) {
      const svg = headSvg(skin, 'idle');
      expect(svg, skin).toContain('data-part="ear-tri"'); expect(svg).toContain('data-part="whisker"');
      expect(svg).not.toContain('data-part="sclera"'); expect(svg).not.toContain('data-part="gloss"');
    }
    expect(headSvg('ginger', 'idle')).toContain('data-part="stripe"');
    expect(headSvg('tuxedo', 'idle')).toContain('data-part="blaze"');
    expect(headSvg('pup', 'idle')).toContain('data-part="ear-flop"');
    expect(headSvg('pup', 'idle')).not.toContain('data-part="whisker"');
  });
  it('MEC-011-R3 new skins use the 12 shared expressions (no tongue set)', () => {
    for (const skin of ['ginger', 'pup', 'tuxedo'] as const) expect(skinExpressions(skin)).toEqual(skinExpressions('capy'));
  });
  it('MEC-011-R25 only the rare skin has effects', () => {
    expect(SKIN_EFFECTS.capy).toEqual({ eat: true, trail: true });
    for (const skin of ['snake', 'ginger', 'pup', 'tuxedo'] as const) expect(SKIN_EFFECTS[skin]).toEqual({ eat: false, trail: false });
  });

  it('ART-003 D4-P2-R1 capy skin svg output matches the approved D4 baseline', () => {
    for (const [e, h] of Object.entries(CAPY_HASH)) expect(sha(headSvg('capy', e as never)), `capy ${e}`).toBe(h);
    expect(sha(bodySvg('capy', 'idle'))).toBe('7cd304ed59da');
    expect(sha(bodySvg('capy', 'win'))).toBe('179480f7e497');
  });

  it('D4-P2-R1 Duolingo vector rig: dual catchlights, warm outlines, cel layers, signature details and capy leaf tokens', async () => {
    const tokensCss = await readRepoText('src/game/dom/styles/tokens.css');
    const greenFace = tokensCss.match(/--d4-green-face:\s*(#[0-9a-f]{6})/i)?.[1]?.toUpperCase();
    const greenLip = tokensCss.match(/--d4-green-lip:\s*(#[0-9a-f]{6})/i)?.[1]?.toUpperCase();
    expect(SKIN_PALETTES.capy.leaf?.toUpperCase()).toBe(greenFace);
    expect(SKIN_PALETTES.capy.leafVein?.toUpperCase()).toBe(greenLip);
    expect(SKIN_PALETTES.snake.outline).toBe('#2B3A8F');
    expect(SKIN_PALETTES.ginger.outline).not.toBe('#7A3E12');
    expect(SKIN_PALETTES.pup.outline).not.toBe('#6B4423');
    expect(SKIN_PALETTES.tuxedo.outline).not.toBe('#1B1F2A');

    for (const skin of SKIN_IDS) {
      const idle = headSvg(skin, 'idle');
      expect(idle.match(/data-part="pupil"/g)?.length, skin).toBe(2);
      expect(idle.match(/data-part="glint"/g)?.length, skin).toBe(4);
      expect(idle, skin).toContain('data-part="crown"');
      expect(idle, skin).toContain('data-part="shade"');
      expect(idle, skin).toBe(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">${headLayersSvg(skin, 'idle')}</svg>`);
      expect(idle.includes('data-part="leaf"'), skin).toBe(skin === 'capy');
    }
    expect(headSvg('pup', 'idle')).toContain('data-part="ear-inner"');
    expect(bodySvg('tuxedo', 'idle')).toContain('data-part="blaze"');
  });

  it('ART-003 capy has 12 expressions, snake adds only tongue expressions', () => {
    expect(skinExpressions('capy')).toHaveLength(12);
    const extra = skinExpressions('snake').filter(e => !skinExpressions('capy').includes(e));
    expect(extra.sort()).toEqual(['dead_tongue', 'eat_tongue', 'idle_tongue']);
  });

  for (const skin of SKIN_IDS) {
    it(`ART-003 ${skin}: every expression has all fixed layers and the anchors`, () => {
      for (const e of skinExpressions(skin)) {
        const svg = headSvg(skin, e);
        expect(svg).toContain('viewBox="0 0 48 48"');
        for (const l of LAYERS) expect(svg, `${skin} ${e} ${l}`).toContain(`data-layer="${l}"`);
        expect(svg).toContain(`data-eyes="${EXPRESSIONS[e].eyes}"`);
        expect(svg).toContain(`data-mouth="${EXPRESSIONS[e].mouth}"`);
      }
      const svg = headSvg(skin, 'idle');
      expect(attr(svg, 'pupil', 'cx')).toEqual(['14.4', '33.6']);
      expect(attr(svg, 'pupil', 'cy')).toEqual(['20.4', '20.4']);
      // ART-003: eyes and mouth are shared anchors; nostrils and muzzle belong to the skin.
      if (skin === 'capy') { expect(attr(svg, 'nostril', 'cx')).toEqual(['20.6', '27.4']); expect(attr(svg, 'muzzle', 'cy')).toEqual(['34']); }
      // D3 Home board snake: white sclera behind each pupil, light muzzle oval, top gloss, no nostrils or diamond.
      else if (skin === 'snake') { expect(attr(svg, 'sclera', 'cx')).toEqual(['14.4', '33.6']); expect(attr(svg, 'muzzle', 'cy')).toEqual(['33.4']); expect(svg).toContain('data-part="gloss"');
        expect(svg).not.toContain('data-part="nostril"'); expect(svg).not.toContain('data-part="ear"'); expect(svg).not.toContain('data-part="diamond"'); }
      expect(svg).toMatch(/data-part="mouth"[^>]*data-y="37.6"/);
      expect(attr(svg, 'face', 'stroke-width')).toEqual(['2']);
    });

    it(`ART-003 ${skin}: body poses include head and body`, () => {
      for (const p of BODY_POSES) {
        const svg = bodySvg(skin, p);
        expect(svg).toContain('viewBox="0 0 48 72"');
        expect(svg).toContain('data-layer="body"');
        expect(svg).toContain('data-layer="head"');
      }
    });
  }

  it('ART-003 snake has no ears and a tongue only in tongue expressions; capy never', () => {
    for (const e of skinExpressions('snake')) {
      const svg = headSvg('snake', e);
      expect(svg).not.toContain('data-part="ear"');
      expect(svg.includes('data-part="tongue"'), e).toBe('tongue' in EXPRESSIONS[e]);
    }
    for (const e of skinExpressions('capy')) expect(headSvg('capy', e)).not.toContain('tongue');
    expect(headSvg('snake', 'idle')).not.toContain('#D6AB7C');
  });

  it('ART-003 keys are per skin and capy keys are unchanged', () => {
    expect(headKey('snake', 'idle', 'board')).toBe('snake/head/idle/board');
    expect(headKey('capy', 'eat_open', 'board')).toBe('capy/head/eat_open/board');
    expect(bodyKey('snake', 'win')).toBe('snake/body/win/large');
  });

  it('ART-003 preload covers every texture key of the requested skins', () => {
    const keys: string[] = [];
    const load = { svg: (k: string) => { keys.push(k); } };
    preloadSkins(load as never, [activeSkin()]);
    for (const e of skinExpressions(activeSkin())) for (const s of ['board', 'large']) expect(keys).toContain(`${activeSkin()}/head/${e}/${s}`);
    for (const p of BODY_POSES) expect(keys).toContain(`${activeSkin()}/body/${p}/large`);
    expect(keys.some(k => k.startsWith('capy/'))).toBe(false);
  });

  it('ART-003 balance has the tongue timings', () => {
    const c = parseBalance(structuredClone(json)).ui.capy;
    expect(c.tongueMs).toBeGreaterThan(0);
    expect(c.tongueMaxGapMs).toBeGreaterThanOrEqual(c.tongueMinGapMs);
    const bad = structuredClone(json) as typeof json;
    bad.ui.capy.tongueMaxGapMs = bad.ui.capy.tongueMinGapMs - 1;
    expect(() => parseBalance(bad)).toThrow();
  });
});
