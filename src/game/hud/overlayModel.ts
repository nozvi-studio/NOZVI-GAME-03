import type { Balance } from '../../core';
import type { T } from './hudModel';
import { stack } from './stack';

export type PauseButtonId = 'resume' | 'settings' | 'quit';
export interface PauseView { title: string; subtitle: string; chip: string | null; buttons: { id: PauseButtonId; label: string }[] }

/** P3b2-R12 PauseD2 content. Settings appears only when its scene exists (P3b-3); the marbles line is P4. */
export function pauseView(c: { level: number; biome: number; hint: { key: string; level: number } | null; settingsAvailable: boolean }, t: T): PauseView {
  const buttons: PauseView['buttons'] = [{ id: 'resume', label: t('resume') }];
  if (c.settingsAvailable) buttons.push({ id: 'settings', label: t('pause.settings') });
  buttons.push({ id: 'quit', label: t('pause.quit') });
  return { title: t('paused'), subtitle: t('pause.subtitle', { n: c.level, biome: t(`banner.biome.${c.biome}`) }),
    chip: c.hint ? t(c.hint.key, { level: c.hint.level }) : null, buttons };
}

export const PAUSE_MOCK = { w: 310, radius: 30, padTop: 26, padBottom: 20, gap: 6, title: 37.4, subtitle: 19, chip: 34, chipMt: 6,
  resume: 66, resumeMt: 16, secondary: 52, secondaryMt: 8, titleSize: 34, subtitleSize: 16 } as const;

/** P3b2-R12 mockup-px y/height of every row in the dialog (top of the dialog = 0). */
export function pauseLayout(v: PauseView) {
  const m = PAUSE_MOCK, rows: { key: string; h: number; mt?: number }[] = [{ key: 'title', h: m.title }, { key: 'subtitle', h: m.subtitle }];
  if (v.chip !== null) rows.push({ key: 'chip', h: m.chip, mt: m.chipMt });
  for (const btn of v.buttons)
    rows.push({ key: btn.id, h: btn.id === 'resume' ? m.resume : m.secondary,
      ...(btn.id === 'resume' ? { mt: m.resumeMt } : btn.id === 'settings' ? { mt: m.secondaryMt } : {}) });
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
