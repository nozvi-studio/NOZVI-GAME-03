import type { Balance } from '../../core';
import { deadFace, type CapyExpression } from './capyRig';
import type { SkinId } from './skins';

export type CapyAnimConfig = Balance['ui']['capy'];
export type CapyMode = 'idle' | 'eat' | 'dead';
export interface CapyAnimState {
  mode: CapyMode; since: number; nextBlinkAt: number;
  skin: SkinId; nextTongueAt: number; tongueUntil: number; // ART-003 snake tongue schedule (capy: never)
}
export interface CapyPose { expression: CapyExpression; scaleX: number; scaleY: number; rotationDeg: number; dy: number }

const gap = (cfg: CapyAnimConfig, rnd: () => number): number =>
  cfg.blinkMinGapMs + Math.floor(rnd() * (cfg.blinkMaxGapMs - cfg.blinkMinGapMs));
const tongueGap = (cfg: CapyAnimConfig, rnd: () => number): number =>
  cfg.tongueMinGapMs + Math.floor(rnd() * (cfg.tongueMaxGapMs - cfg.tongueMinGapMs));
const flat = (expression: CapyExpression): CapyPose => ({ expression, scaleX: 1, scaleY: 1, rotationDeg: 0, dy: 0 });

// ART-001 presentation-only face state; rnd is a local (non-sim) random source.
export const createCapyAnim = (now: number, cfg: CapyAnimConfig, rnd: () => number, skin: SkinId = 'capy'): CapyAnimState =>
  ({ mode: 'idle', since: now, nextBlinkAt: now + gap(cfg, rnd), skin,
    nextTongueAt: skin === 'snake' ? now + tongueGap(cfg, rnd) : Infinity, tongueUntil: -Infinity });
export const capyEat = (st: CapyAnimState, now: number): CapyAnimState =>
  st.mode === 'dead' ? st : { ...st, mode: 'eat', since: now };
export const capyDie = (st: CapyAnimState, now: number): CapyAnimState => ({ ...st, mode: 'dead', since: now });

// ART-001 idle (breath + blink), eat (open → chew → idle) and dead (droop) face pose for one frame.
// ART-003 snake adds idle tongue flicks, one flick after the chew, and a hanging tongue when dead.
export function capyPose(st: CapyAnimState, now: number, cfg: CapyAnimConfig, reduced: boolean, rnd: () => number):
  { state: CapyAnimState; pose: CapyPose } {
  const snake = st.skin === 'snake';
  if (st.mode === 'dead') {
    const face = deadFace(st.skin);
    if (reduced) return { state: st, pose: flat(face) };
    const t = Math.min(1, (now - st.since) / cfg.deadDroopMs);
    return { state: st, pose: { ...flat(face), rotationDeg: -cfg.deadRotDeg * t, dy: cfg.deadDropPx * t } };
  }
  if (st.mode === 'eat') {
    const e = now - st.since;
    if (e < cfg.eatOpenMs) return { state: st, pose: reduced ? flat('eat_open')
      : { ...flat('eat_open'), scaleX: cfg.gulpScaleX, scaleY: cfg.gulpScaleY } };
    if (e < cfg.eatOpenMs + cfg.eatChewMs) return { state: st, pose: flat('eat_chew') };
    st = { ...st, mode: 'idle', since: now, tongueUntil: snake && !reduced ? now + cfg.tongueMs : -Infinity };
  }
  let state = st;
  let expression: CapyExpression = 'idle';
  if (now >= st.nextBlinkAt) {
    if (now < st.nextBlinkAt + cfg.blinkMs) expression = 'idle_blink';
    else state = { ...st, nextBlinkAt: now + gap(cfg, rnd) };
  }
  if (snake && !reduced && expression === 'idle') {
    if (now < st.tongueUntil) expression = 'eat_tongue';
    else if (now >= st.nextTongueAt) {
      if (now < st.nextTongueAt + cfg.tongueMs) expression = 'idle_tongue';
      else state = { ...state, nextTongueAt: now + tongueGap(cfg, rnd) };
    }
  }
  const b = reduced ? 0 : cfg.breathAmp * Math.sin((2 * Math.PI * (now - st.since)) / cfg.breathPeriodMs);
  return { state, pose: { expression, scaleX: 1 - b / 2, scaleY: 1 + b, rotationDeg: 0, dy: 0 } };
}
