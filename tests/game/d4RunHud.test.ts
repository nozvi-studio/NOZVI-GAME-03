import { describe, expect, it } from 'vitest';
import { boardRect, D3_RUN, D4_RUN, d3HudLayout } from '../../src/game/hud/d3HudLayout';
import { contrastRatio } from '../../src/game/render/biomePalette';
import { TOKENS, toInt } from '../../src/game/uiTokens';
import skillButtonsRaw from '../../src/game/hud/SkillButtons.ts?raw';

const hudRaw = import.meta.glob('../../src/game/hud/*.ts', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

describe('D4-P5-R1 / R2 flat in-run HUD & board frame rules', () => {
  it('D4-P5-R1 boardRect parity for hm 640, 700 and 780', () => {
    expect(boardRect(640)).toEqual({ x: 24, y: 148, size: 312 });
    expect(boardRect(700).size).toBe(340);
    expect(boardRect(780)).toEqual({ x: 10, y: 185, size: 340 });
  });

  it('D4-P5-R1 frame outer extent fits inside band.below and lip is 4px', () => {
    expect(D4_RUN.board.lip).toBe(4);
    expect(D4_RUN.board.stroke + D4_RUN.board.lip).toBeLessThanOrEqual(D3_RUN.band.below);
  });

  it('D4-P5-R2 layout exposes level pill rect, 48px pause button, and no ribbon skin in hud sources', () => {
    const l = d3HudLayout(640, false);
    expect(l.level.h).toBe(D4_RUN.top.pillH);
    expect(l.pause.w).toBe(48);
    expect(l.pause.h).toBe(48);
    const allHud = Object.values(hudRaw).join('\n');
    expect(allHud).not.toMatch(/'ribbon'/);
  });

  it('D4-P5-R2 top bar, energy and semantic badge tokens match D4 palette with >= 3:1 badge text contrast', () => {
    const { hud, badge, energy } = TOKENS.d4run;
    expect(hud.surface).toBe('#FFFFFF');
    expect(hud.mango).toBe('#FFC800');
    expect(hud.track).toBe('#E5E2DC');
    expect(energy.fill).toBe('#1CB0F6');
    expect(energy.track).toBe('#E5E2DC');
    expect(badge.ready).toBe('#1CB0F6');
    expect(badge.short).toBe('#AFAFAF');
    expect(badge.ready).not.toBe(TOKENS.danger.text);
    expect(badge.short).not.toBe(TOKENS.danger.text);
    expect(contrastRatio(toInt(badge.text), toInt(badge.ready))).toBeGreaterThanOrEqual(3);
    expect(contrastRatio(toInt(badge.text), toInt(badge.short))).toBeGreaterThanOrEqual(3);
  });

  it('D4-P5-R2 SkillButtons has 4px lip, no danger tone and no glossBand', () => {
    expect(D4_RUN.skill.lip).toBe(4);
    expect(skillButtonsRaw).not.toMatch(/danger/);
    expect(skillButtonsRaw).not.toMatch(/glossBand/);
  });
});
