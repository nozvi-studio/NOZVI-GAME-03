import { describe, expect, it } from 'vitest';
import { BODY_POSES, CAPY_EXPRESSIONS, EXPRESSIONS, capyBodyKey, capyBodySvg, capyHeadKey, capyHeadSvg, svgDataUrl } from '../../src/game/art/capyRig';

const attr = (svg: string, part: string, name: string): string[] =>
  [...svg.matchAll(new RegExp(`data-part="${part}"[^>]*?\\s${name}="([^"]+)"`, 'g'))].map(m => m[1]!);

describe('ART-001 capy rig', () => {
  it('ART-001 every expression maps to known eye and mouth variants', () => {
    expect(CAPY_EXPRESSIONS).toHaveLength(12);
    for (const e of CAPY_EXPRESSIONS) {
      expect(['open', 'blink', 'closed', 'x', 'half']).toContain(EXPRESSIONS[e].eyes);
      expect(['smile', 'open', 'chew', 'flat', 'o']).toContain(EXPRESSIONS[e].mouth);
    }
    expect(EXPRESSIONS.idle).toEqual({ eyes: 'open', mouth: 'smile' });
    expect(EXPRESSIONS.dead).toEqual({ eyes: 'x', mouth: 'o' });
  });

  it('ART-001 head svg has every fixed layer and the 48 viewBox', () => {
    for (const e of CAPY_EXPRESSIONS) {
      const svg = capyHeadSvg(e);
      expect(svg).toContain('viewBox="0 0 48 48"');
      for (const layer of ['ears', 'head', 'blush', 'muzzle', 'nose', 'eyes', 'mouth'])
        expect(svg).toContain(`data-layer="${layer}"`);
      expect(svg).toContain(`data-eyes="${EXPRESSIONS[e].eyes}"`);
      expect(svg).toContain(`data-mouth="${EXPRESSIONS[e].mouth}"`);
    }
  });

  it('ART-001 anchors: eyes, nostrils, ears, muzzle and mouth sit on the rig', () => {
    const svg = capyHeadSvg('idle');
    expect(attr(svg, 'pupil', 'cx')).toEqual(['14.4', '33.6']);
    expect(attr(svg, 'pupil', 'cy')).toEqual(['20.4', '20.4']);
    expect(attr(svg, 'nostril', 'cx')).toEqual(['20.6', '27.4']);
    expect(attr(svg, 'nostril', 'cy')).toEqual(['30.6', '30.6']);
    expect(attr(svg, 'ear', 'cx')).toEqual(['11.4', '36.6']);
    expect(attr(svg, 'muzzle', 'cy')).toEqual(['34']);
    expect(svg).toMatch(/data-part="mouth"[^>]*data-y="37.6"/);
  });

  it('ART-001 outline is dark brown, 2 on head and ears, 1.2 on the muzzle', () => {
    const svg = capyHeadSvg('idle');
    expect(attr(svg, 'face', 'stroke-width')).toEqual(['2']);
    expect(attr(svg, 'ear', 'stroke-width')).toEqual(['2', '2']);
    expect(attr(svg, 'muzzle', 'stroke-width')).toEqual(['1.2']);
    expect(attr(svg, 'face', 'stroke')).toEqual(['#4A2E1B']);
  });

  it('ART-001 no leaf, stem or text in any head', () => {
    for (const e of CAPY_EXPRESSIONS) expect(capyHeadSvg(e)).not.toMatch(/<text|leaf|stem/);
  });

  it('ART-001 body poses include the head and a body below y 44.4', () => {
    for (const p of BODY_POSES) {
      const svg = capyBodySvg(p);
      expect(svg).toContain('viewBox="0 0 48 72"');
      expect(svg).toContain('data-layer="body"');
      expect(svg).toContain('data-layer="head"');
    }
    expect(capyBodySvg('win')).toContain('data-eyes="closed"');
  });

  it('ART-001 keys and data urls', () => {
    expect(capyHeadKey('eat_open', 'board')).toBe('capy/head/eat_open/board');
    expect(capyBodyKey('win')).toBe('capy/body/win/large');
    expect(svgDataUrl('<svg/>')).toBe('data:image/svg+xml;charset=utf-8,%3Csvg%2F%3E');
  });
});
