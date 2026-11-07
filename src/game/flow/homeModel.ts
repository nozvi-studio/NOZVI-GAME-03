// Pure Home screen view: primary/secondary buttons, checkpoint stepper, carry line, next milestone hint.
import type { HomeModel } from '../../session';

export interface HomeView {
  primary: { key: 'home.play' | 'home.playCheckpoint'; level: number }; secondaryL1: boolean;
  stepper: number[]; carry: number | null;
  /** No checkpoint and no carried energy (mockup firstRun). */ compact: boolean;
  /** Level for the "Start at Lx" chip, null without a checkpoint. */ startAt: number | null;
  /** Chip row visible. */ extras: boolean; showStepper: boolean;
  hint: { key: 'hud.nextCheckpoint' | 'hud.nextCheckpointClear'; level: number } | null;
}

const sorted = (m: HomeModel): number[] => [...m.checkpoints].sort((a, b) => a - b);

// MEC-008-R4 default start = highest checkpoint, L1 offered as the secondary; MEC-008-R11 hint.
export function homeView(m: HomeModel, selected: number = m.defaultStart): HomeView {
  const stepper = sorted(m);
  const has = stepper.length > 0;
  const level = has && stepper.includes(selected) ? selected : has ? m.defaultStart : 1;
  const nm = m.nextMilestone;
  return {
    primary: { key: has ? 'home.playCheckpoint' : 'home.play', level },
    secondaryL1: has, stepper,
    carry: m.carriedEnergy > 0 ? m.carriedEnergy : null,
    compact: !has && m.carriedEnergy <= 0, startAt: has ? level : null,
    extras: has || m.carriedEnergy > 0, showStepper: stepper.length > 1,
    hint: nm ? { key: nm.requiresClear ? 'hud.nextCheckpointClear' : 'hud.nextCheckpoint', level: nm.reach } : null,
  };
}

// MEC-008-R4 stepper moves between unlocked checkpoints and clamps at the ends.
export function stepCheckpoint(m: HomeModel, selected: number, dir: -1 | 1): number {
  const list = sorted(m);
  if (list.length === 0) return 1;
  const i = Math.max(0, list.indexOf(selected));
  return list[Math.min(list.length - 1, Math.max(0, i + dir))]!;
}
