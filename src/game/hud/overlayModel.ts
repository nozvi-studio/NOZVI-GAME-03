import type { Balance } from '../../core';
import type { T } from './hudModel';
import { stack } from './stack';

export type PauseButtonId = 'resume' | 'settings' | 'quit';
export interface PauseView { title: string; subtitle: string; chip: string | null; buttons: { id: PauseButtonId; label: string; tone: 'green' | 'cream' | 'danger' }[] }

/** P3b2-R12 PauseD2 content. Settings appears only when its scene exists (P3b-3); the marbles line is P4. */
export function pauseView(c: { level: number; biome: number; hint: { key: string; level: number } | null; settingsAvailable: boolean }, t: T): PauseView {
  const buttons: PauseView['buttons'] = [{ id: 'resume', label: t('resume'), tone: 'green' }];
  if (c.settingsAvailable) buttons.push({ id: 'settings', label: t('pause.settings'), tone: 'cream' });
  buttons.push({ id: 'quit', label: t('pause.quit'), tone: 'danger' }); // UIFIX-R14 POL-04
  return { title: t('paused'), subtitle: t('pause.subtitle', { n: c.level, biome: t(`banner.biome.${c.biome}`) }),
    chip: c.hint ? t(c.hint.key, { level: c.hint.level }) : null, buttons };
}

// D3-R15 board px (360 wide; convert with d3m/d3). Margins only: the board panel is a plain column, so gap is 0.
export const PAUSE_MOCK = { w: 300, padTop: 20, padBottom: 22, gap: 0, title: 44, subtitle: 20, subtitleMt: 6, chip: 30, chipMt: 12,
  resume: 66, resumeMt: 26, secondary: 52, secondaryMt: 22, quitMt: 16, titleSize: 40, subtitleSize: 15 } as const;

/** D3-R15 board-px y/height of every row in the dialog (top of the dialog = 0). */
export function pauseLayout(v: PauseView) {
  const m = PAUSE_MOCK, rows: { key: string; h: number; mt?: number }[] = [{ key: 'title', h: m.title }, { key: 'subtitle', h: m.subtitle, mt: m.subtitleMt }];
  if (v.chip !== null) rows.push({ key: 'chip', h: m.chip, mt: m.chipMt });
  for (const btn of v.buttons)
    rows.push({ key: btn.id, h: btn.id === 'resume' ? m.resume : m.secondary,
      mt: btn.id === 'resume' ? m.resumeMt : btn.id === 'settings' ? m.secondaryMt : m.quitMt });
  const s = stack(rows, { gap: m.gap, padTop: m.padTop, padBottom: m.padBottom });
  const at = (key: string): number => s.ys[rows.findIndex(r => r.key === key)]!;
  return { w: m.w, height: s.height, title: at('title'), subtitle: at('subtitle'), chip: v.chip === null ? null : at('chip'),
    buttons: v.buttons.map(btn => ({ id: btn.id, y: at(btn.id), h: btn.id === 'resume' ? m.resume : m.secondary })) };
}

/** P3b2-R13 CountdownD2 checkpoint card: fresh run start from a checkpoint while the speed ramp is active (MEC-008-R8). */
export function countdownCard(s: { rampActive: boolean; startLevel: number }, fresh: boolean, b: Balance, t: T): { title: string; subtitle: string } | null {
  if (!fresh || !s.rampActive || s.startLevel <= 1) return null;
  return { title: t('countdown.checkpoint', { level: s.startLevel }), subtitle: t('countdown.ramp', { n: b.checkpoints.rampMangoes }) };
}
