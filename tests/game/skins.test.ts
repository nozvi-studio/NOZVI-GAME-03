// @ts-ignore node typings are not installed; vitest runs on Node
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import json from '../../config/balance.json';
import { parseBalance } from '../../src/core';
import { BODY_POSES, EXPRESSIONS, bodyKey, bodySvg, headKey, headSvg, skinExpressions } from '../../src/game/art/capyRig';
import { SKIN_IDS, activeSkin } from '../../src/game/art/skins';
import { preloadSkins } from '../../src/game/art/capyTextures';

const sha = (s: string): string => createHash('sha1').update(s).digest('hex').slice(0, 12);
const attr = (svg: string, part: string, name: string): string[] =>
  [...svg.matchAll(new RegExp(`data-part="${part}"[^>]*?\\s${name}="([^"]+)"`, 'g'))].map(m => m[1]!);
const LAYERS = ['ears', 'head', 'blush', 'muzzle', 'nose', 'eyes', 'mouth'];

// Hashes captured from the pre-skin capy output (2026-11-10).
const CAPY_HASH: Record<string, string> = {
  idle: 'ce89a97af9bb', idle_blink: 'd751392c19a9', eat_open: '0a752e762317', eat_chew: 'f5524b38f701', dead: '9ee7c82c0295',
  happy: 'cc68de905037', alert: '20a3472f8c81', scared: 'add09d82363e', determined: 'da9de24e0822', sleepy: 'da9de24e0822',
  hurt: '4f1bacc2f7c5', win: '5e8241f3603d',
};

describe('ART-003 skins', () => {
  it('ART-003 skin ids and activeSkin() default to snake', () => {
    expect([...SKIN_IDS].sort()).toEqual(['capy', 'snake']);
    expect(activeSkin()).toBe('snake');
  });

  it('ART-003 capy skin svg output is unchanged', () => {
    for (const [e, h] of Object.entries(CAPY_HASH)) expect(sha(headSvg('capy', e as never)), `capy ${e}`).toBe(h);
    expect(sha(bodySvg('capy', 'idle'))).toBe('1223a2eadf0e');
    expect(sha(bodySvg('capy', 'win'))).toBe('702c632db20e');
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
      else { expect(attr(svg, 'sclera', 'cx')).toEqual(['14.4', '33.6']); expect(attr(svg, 'muzzle', 'cy')).toEqual(['33.4']); expect(svg).toContain('data-part="gloss"');
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
