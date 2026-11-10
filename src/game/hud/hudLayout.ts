import { BOARD, HEIGHT, WIDTH } from '../layout';
import { hitSize, ui } from '../ui/layout';

/** UIFIX-R6: D-pad raised (bottom 16 -> 25) as far as the chip row allows; left gap 18, right gap 8.
 * P3b2-R8 GameD2 / GameDpadD2 sizes in mockup px. Vertical gaps are compacted (top pad 8, row gap 8) so the header and stats fit above the fixed BOARD at 540x960. */
export const HUD_MOCK = {
  padTop: 8, sidePad: 16, header: 44, rowGap: 8, stats: 42, statGap: 10, pauseHit: 56,
  boardPad: 6, chipGap: 4, chip: 34,
  skill: 84, skillGap: 6, skillCost: 26, skillSide: 24, skillBottom: 24,
  dpad: 148, dpadLeft: 126, dpadBottom: 25, dpadBtn: 48, dpadStep: 50,
  titleSize: 24, biomeSize: 13, titleGap: 3,
} as const;

export interface Circle { cx: number; cy: number; r: number }
export interface SkillRect extends Circle { costY: number; costH: number; groupTop: number }
export interface HudLayout {
  headerCy: number; titleY: number; biomeY: number; pause: Circle & { hit: number }; statsY: number; statsH: number;
  chip: { cx: number; y: number; h: number }; skills: readonly [SkillRect, SkillRect];
  dpad: { x: number; y: number; size: number; btn: number; step: number } | null;
}
export function hudLayout(dpad: boolean): HudLayout {
  const m = HUD_MOCK, top = ui(m.padTop), headerCy = top + ui(m.header) / 2;
  const titleY = headerCy - ui(m.titleSize + m.titleGap + m.biomeSize) / 2;
  const groupTop = HEIGHT - ui(m.skillBottom) - ui(m.skill + m.skillGap + m.skillCost), r = ui(m.skill) / 2;
  const skill = (cx: number): SkillRect => ({ cx, cy: groupTop + r, r, groupTop, costY: groupTop + ui(m.skill + m.skillGap), costH: ui(m.skillCost) });
  return {
    headerCy, titleY, biomeY: titleY + ui(m.titleSize + m.titleGap),
    pause: { cx: WIDTH - ui(m.sidePad) - ui(m.header) / 2, cy: headerCy, r: ui(m.header) / 2, hit: hitSize(ui(m.pauseHit)) },
    statsY: top + ui(m.header + m.rowGap), statsH: ui(m.stats),
    chip: { cx: WIDTH / 2, y: BOARD.y + BOARD.size + ui(m.boardPad + m.chipGap), h: ui(m.chip) },
    skills: [skill(ui(m.skillSide) + r), skill(WIDTH - ui(m.skillSide) - r)],
    dpad: dpad ? { x: ui(m.dpadLeft), y: HEIGHT - ui(m.dpadBottom) - ui(m.dpad), size: ui(m.dpad), btn: ui(m.dpadBtn), step: ui(m.dpadStep) } : null,
  };
}

export interface PillPos { x: number; w: number; icon: number; text: number }
export interface EnergyPos { x: number; w: number; bolt: number; bar: number; barW: number; text: number }
export interface StatsRow { quota: PillPos; score: PillPos; energy: EnergyPos }
/** P3b2-R8 three stat pills (mockup px) centred in the 390 frame; tw = measured text widths in mockup px. */
export function statsRow(tw: { quota: number; score: number; energy: number }): StatsRow {
  const gap = HUD_MOCK.statGap, barW = 46;
  const wq = 8 + 28 + 6 + tw.quota + 16, ws = 12 + 20 + 8 + tw.score + 16, we = 10 + 16 + 8 + barW + 8 + tw.energy + 14;
  const x0 = (390 - (wq + ws + we + 2 * gap)) / 2;
  const xs = x0 + wq + gap, xe = xs + ws + gap;
  return {
    quota: { x: x0, w: wq, icon: x0 + 8, text: x0 + 8 + 28 + 6 },
    score: { x: xs, w: ws, icon: xs + 12, text: xs + 12 + 20 + 8 },
    energy: { x: xe, w: we, bolt: xe + 10, bar: xe + 10 + 16 + 8, barW, text: xe + 10 + 16 + 8 + barW + 8 },
  };
}

/** UIFIX-R1 banner strip metrics (mockup px) and the strip rect inside the board (game px). */
export const STRIP_MOCK = { cells: 1.5, alpha: 0.85, radius: 10, pad: 10, icon: 22, iconGap: 8, title: 15, sub: 11, pillGap: 6 } as const;
export function bannerStripRect(cols: number): { x: number; y: number; w: number; h: number } {
  return { x: BOARD.x, y: BOARD.y, w: BOARD.size, h: STRIP_MOCK.cells * BOARD.size / cols };
}
/** UIFIX-R1 text row offsets (game px from the strip top): title alone is centred; with a sub line the pair is centred as one block. */
export function stripRows(hasSub: boolean, h: number): { titleY: number; subY: number | null } {
  const t = ui(STRIP_MOCK.title), s = ui(STRIP_MOCK.sub);
  if (!hasSub) return { titleY: (h - t) / 2, subY: null };
  const top = (h - (t + s)) / 2;
  return { titleY: top, subY: top + t };
}

/** UIFIX-R2 bubble top-left for a tip whose tail points at a skill button; clamped so it never covers the board (UIFIX-R2). */
export function skillTipPlacement(l: HudLayout, slot: 0 | 1, w: number, h: number, m: { margin: number; tailLeft: number; tailGap: number }): { x: number; y: number } {
  const s = l.skills[slot];
  return { x: Math.min(WIDTH - m.margin - w, Math.max(m.margin, s.cx - m.tailLeft)), y: Math.max(BOARD.y + BOARD.size, s.groupTop - m.tailGap - h) };
}
