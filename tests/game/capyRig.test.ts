import { describe, expect, it } from 'vitest';
import { BODY_POSES, CAPY_EXPRESSIONS, EXPRESSIONS, capyBodyKey, capyBodySvg, capyHeadKey, capyHeadSvg, svgDataUrl, ART } from '../../src/game/art/capyRig';
import { SKIN_PALETTES } from '../../src/game/art/skins';

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

  it('ART-001 D4-P2-R1 outline is the warm capy outline, 2 on head and ears, 1.2 on the muzzle', () => {
    const svg = capyHeadSvg('idle');
    expect(attr(svg, 'face', 'stroke-width')).toEqual(['2']);
    expect(attr(svg, 'ear', 'stroke-width')).toEqual(['2', '2']);
    expect(attr(svg, 'muzzle', 'stroke-width')).toEqual(['1.2']);
    expect(SKIN_PALETTES.capy.outline).toBe('#7A4A26');
    expect(SKIN_PALETTES.capy.outline).not.toBe('#4A2E1B');
    expect(attr(svg, 'face', 'stroke')).toEqual([SKIN_PALETTES.capy.outline]);
  });

  it('ART-001 D4-P2-R1 capy heads carry exactly one leaf accent and no text', () => {
    for (const e of CAPY_EXPRESSIONS) {
      const svg = capyHeadSvg(e);
      expect(svg).not.toMatch(/<text|stem/);
      expect(svg.match(/data-part="leaf"/g)?.length).toBe(1);
    }
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
    expect(svgDataUrl('<svg/>')).toBe('data:image/svg+xml;base64,' + btoa('<svg/>'));
  });

  it('ART-001 every capy svg is pure ASCII and round-trips through base64 data urls', () => {
    const svgs = [...CAPY_EXPRESSIONS.map(e => capyHeadSvg(e)), ...BODY_POSES.map(p => capyBodySvg(p))];
    for (const svg of svgs) {
      expect(/^[\x00-\x7F]*$/.test(svg)).toBe(true);
      const url = svgDataUrl(svg);
      expect(url.startsWith('data:image/svg+xml;base64,')).toBe(true);
      expect(atob(url.split(';base64,')[1]!)).toBe(svg);
    }
  });

  it('ART-001 body feet outline stays inside the viewBox', () => {
    expect(ART.body.feetY + ART.body.footRy + 1).toBeLessThanOrEqual(72);
  });
});
