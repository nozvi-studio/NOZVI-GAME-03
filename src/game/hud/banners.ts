import type { Balance, SimEvent, SkillId } from '../../core';
import { biomeName } from '../hudText';
import type { HudSnap, T } from './hudModel';

export type BannerSpec =
  | { kind: 'levelUp'; title: string; subtitle: string; chip: string | null }
  | { kind: 'challenge'; title: string }
  | { kind: 'biome'; label: string; name: string; tagline: string }
  | { kind: 'checkpoint'; title: string; subtitle: string }
  | { kind: 'hint'; text: string }
  | { kind: 'incoming'; text: string }; // U5-R2 hazard warning, queued in the strip instead of a mid-board tooltip
export type LevelUpEvent = Extract<SimEvent, { type: 'levelUp' }>;

export const STRIP_TITLE_MAX = 28, STRIP_SUB_MAX = 36;
export type StripIcon = 'star' | 'bolt' | 'biome' | 'flag' | 'up' | 'warn';
export type StripTone = 'light' | 'butter' | 'mint' | 'warn';
export interface StripView { icon: StripIcon; title: string; sub: string | null; chip: string | null; tone: StripTone }
/** UIFIX-R1 one-line cut: keeps text that fits, else `max - 1` characters plus an ellipsis. */
export function clipLine(text: string, max: number): string { return text.length <= max ? text : `${text.slice(0, max - 1)}…`; }

/** P3b2-R10 MEC-003 §8 + MEC-008 §8 + MEC-001-R4: ordered banner queue for one level-up (BannersD2). */
export function levelUpBanners(e: LevelUpEvent, ctx: { shrunkTo: number | null; newCheckpoint: number | null }, b: Balance, t: T): BannerSpec[] {
  const out: BannerSpec[] = [{ kind: 'levelUp', title: t('banner.levelUp', { n: e.level }), subtitle: t('banner.freshStart'),
    chip: ctx.shrunkTo === null ? null : t('banner.shrinks', { n: ctx.shrunkTo }) }];
  if (e.challenge) out.push({ kind: 'challenge', title: t(`banner.challenge.${e.level}`) });
  if (e.biomeChanged) out.push({ kind: 'biome', label: t('banner.biomeLabel', { n: e.biome }), name: biomeName(e.biome, t), tagline: t(`banner.biomeTagline.${e.biome}`) });
  if (ctx.newCheckpoint !== null) out.push({ kind: 'checkpoint', title: t('banner.checkpoint', { level: ctx.newCheckpoint }), subtitle: t('banner.checkpointSaved') });
  if (e.unlocked) out.push({ kind: 'hint', text: t(`banner.new.${e.unlocked}`) });
  return out.slice(0, b.ui.hud.bannerQueueMax);
}

/** D3-R16 / U5-R2 every queued banner as one compact strip card: icon (or gold chip for a biome) + title + at most one sub line. */
export function bannerStrip(s: BannerSpec): StripView {
  const v = (icon: StripIcon, title: string, sub: string | null, tone: StripTone = 'light', chip: string | null = null): StripView =>
    ({ icon, title: clipLine(title, STRIP_TITLE_MAX), sub: sub === null ? null : clipLine(sub, STRIP_SUB_MAX), chip, tone });
  switch (s.kind) {
    case 'levelUp': return v('up', s.title, s.chip ?? s.subtitle);
    case 'challenge': return v('bolt', s.title, null, 'butter');
    case 'biome': return v('biome', s.name, s.tagline, 'light', s.label);
    case 'checkpoint': return v('flag', s.title, s.subtitle, 'mint');
    case 'hint': return v('bolt', s.text, null);
    case 'incoming': return v('warn', s.text, null, 'butter');
  }
}

export interface SkillPill { slot: 0 | 1; skill: SkillId; text: string }
/** P3b2-R11 SkillActiveD2 pills; seconds come from balance / the snapshot, never typed. */
export function skillPills(skills: HudSnap['skills'], b: Balance, t: T): SkillPill[] {
  const out: SkillPill[] = [];
  for (const k of skills) {
    if (k.id === null || !k.active) continue;
    const skill = t(`skill.${k.id}.name`);
    const text = k.id === 'tailSnip' ? t('skill.pill.wall', { skill, s: b.skills.tailSnip.wallLifeMs / 1000 })
      : t('skill.pill.timed', { skill, s: Math.ceil(k.leftMs / 1000) });
    out.push({ slot: k.slot, skill: k.id, text });
  }
  return out;
}

/** P3b2-R11 MEC-007-R12 skill-unlocked tip. A placed skill points its tail at the slot button; no slot keeps the next-run text. */
export function skillTip(e: { skill: SkillId; slot: 0 | 1 | null }, t: T): { text: string; slot: 0 | 1 | null } {
  const skill = t(`skill.${e.skill}.name`);
  return e.slot === null ? { text: t('tip.skillUnlocked.next', { skill }), slot: null } : { text: t('banner.skillNew', { skill }), slot: e.slot };
}
