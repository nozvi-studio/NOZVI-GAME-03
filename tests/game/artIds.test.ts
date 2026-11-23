import { describe, expect, it } from 'vitest';
import { BODY_POSES, bodySvg, headSvg, skinExpressions } from '../../src/game/art/capyRig';
import { heroSvg } from '../../src/game/art/heroSvg';
import { SKIN_IDS } from '../../src/game/art/skins';

const allArt = (): Array<[string, string]> => SKIN_IDS.flatMap(s => [
  ...skinExpressions(s).map(e => [`${s} head ${e}`, headSvg(s, e)] as [string, string]),
  ...skinExpressions(s).map(e => [`${s} hero ${e}`, heroSvg(s, e)] as [string, string]),
  ...BODY_POSES.map(p => [`${s} body ${p}`, bodySvg(s, p)] as [string, string]),
]);

describe('D4-P2-R1 art id and number hygiene', () => {
  it('D4-P2-R1 no svg declares an id or references url(#...)', () => {
    for (const [name, svg] of allArt()) {
      expect(svg, name).not.toMatch(/\sid="/);
      expect(svg, name).not.toContain('url(#');
      expect(svg, name).not.toContain('<defs');
    }
  });

  it('D4-P2-R1 no NaN, undefined or Infinity leaks into any attribute', () => {
    for (const [name, svg] of allArt()) {
      expect(svg, name).not.toMatch(/NaN|undefined|Infinity/);
    }
  });

  it('D4-P2-R1 every svg is ASCII', () => {
    for (const [name, svg] of allArt()) {
      expect(/^[\x00-\x7F]*$/.test(svg), name).toBe(true);
    }
  });
});
