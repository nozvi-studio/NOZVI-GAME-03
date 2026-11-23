// MEC-008-R4 D4-P3 simplified Home: one PLAY at the highest checkpoint; passive status pill; mascot bubble. Pure.
import type { HomeModel, SkinsModel } from '../../session';

export interface HomeView {
  playLevel: number;
  status: { key: 'home.status.next' | 'home.status.nextClear' | 'home.status.startsAt'; level: number };
  bubble: { key: 'home.bubble.ready' | 'home.bubble.first'; level: number };
  /** Retained for HudScene & P1 QA compatibility until D4-P5. */
  hint: { key: 'hud.nextCheckpoint' | 'hud.nextCheckpointClear'; level: number } | null;
  /** @deprecated Retained only for frozen P1 QA suite compatibility. */
  primary: { key: 'home.play' | 'home.playCheckpoint'; level: number };
  /** @deprecated */ secondaryL1: boolean;
  /** @deprecated */ stepper: number[];
  /** @deprecated */ carry: number | null;
}

const sorted = (m: HomeModel): number[] => [...m.checkpoints].sort((a, b) => a - b);

// MEC-008-R4 D4-P3 simplified Home: one PLAY at the highest checkpoint.
export function homeView(m: HomeModel, selected: number = m.defaultStart): HomeView {
  const stepper = sorted(m);
  const has = stepper.length > 0;
  const playLevel = has ? Math.max(...stepper) : 1;
  const legacyLevel = has && stepper.includes(selected) ? selected : has ? m.defaultStart : 1;
  const nm = m.nextMilestone;
  const status = nm
    ? { key: (nm.requiresClear ? 'home.status.nextClear' : 'home.status.next') as 'home.status.next' | 'home.status.nextClear', level: nm.reach }
    : { key: 'home.status.startsAt' as const, level: playLevel };
  const bubble = playLevel === 1 && !has
    ? { key: 'home.bubble.first' as const, level: 1 }
    : { key: 'home.bubble.ready' as const, level: playLevel };
  return {
    playLevel,
    status,
    bubble,
    hint: nm ? { key: nm.requiresClear ? 'hud.nextCheckpointClear' : 'hud.nextCheckpoint', level: nm.reach } : null,
    primary: { key: has ? 'home.playCheckpoint' : 'home.play', level: legacyLevel },
    secondaryL1: has,
    stepper,
    carry: m.carriedEnergy > 0 ? m.carriedEnergy : null,
  };
}

/** @deprecated Retained only for frozen P1 QA suite compatibility. */
export function stepCheckpoint(m: HomeModel, selected: number, dir: -1 | 1): number {
  const list = sorted(m);
  if (list.length === 0) return 1;
  const i = Math.max(0, list.indexOf(selected));
  return list[Math.min(list.length - 1, Math.max(0, i + dir))]!;
}

// D4-P3-R2 affordability dot on the Home Characters button (MEC-011).
export function canAffordUnowned(m: SkinsModel): boolean {
  return m.skins.some(s => !s.owned && m.coins >= s.price);
}
