// D3-R23/R24/R28 pooled tap burst (ring + sparks) and denied shake. Thin Phaser layer over interactionModel.
import type Phaser from 'phaser';
import { motionCfgFor, motionFor, type MotionTarget } from '../motion';
import { reduceMotion } from '../render/palette';
import { TOKENS, toInt } from '../uiTokens';
import { burstKind, deniedPlan, ringAt, shakeDx, sparkAt, tapPlan } from './interactionModel';
import { ui } from './layout';
import type { SkinTone } from './skin';

const RING_R = 22, RING_W = 4, SPARK_R = 4, FX_DEPTH = 1000; // mock px; depth above every menu and HUD layer
interface Pool { free: Phaser.GameObjects.Arc[]; live: number }
const pools = new WeakMap<Phaser.Scene, Pool>();
function poolOf(scene: Phaser.Scene): Pool {
  let p = pools.get(scene);
  if (!p) { p = { free: [], live: 0 }; pools.set(scene, p); }
  return p;
}
function take(scene: Phaser.Scene, p: Pool, x: number, y: number): Phaser.GameObjects.Arc {
  const o = p.free.pop() ?? scene.add.circle(0, 0, ui(SPARK_R), 0xffffff).setDepth(FX_DEPTH);
  p.live++;
  return o.setPosition(x, y).setVisible(true).setAlpha(1).setScale(1);
}
function give(p: Pool, o: Phaser.GameObjects.Arc): void { o.setVisible(false); p.free.push(o); p.live--; }
/** Live burst objects in a scene (test and audit hook). */
export const liveParticles = (scene: Phaser.Scene): number => pools.get(scene)?.live ?? 0;

/** D3-R23 ring (and sparks for primary and skill tones) at x,y in the tone's middle face colour. */
export function tapBurst(scene: Phaser.Scene, x: number, y: number, tone: SkinTone): void {
  const c = motionCfgFor(scene).d3, p = poolOf(scene);
  const plan = tapPlan(burstKind(tone), reduceMotion(), p.live, c);
  const color = toInt(TOKENS.d3.tone[tone].face[1]!);
  const ring = take(scene, p, x, y).setRadius(ui(RING_R)).setFillStyle(color, 0).setStrokeStyle(ui(RING_W), color, 1);
  const sparks = Array.from({ length: plan.sparks }, () => take(scene, p, x, y).setRadius(ui(SPARK_R)).setFillStyle(color, 1).setStrokeStyle(0, 0, 0));
  motionFor(scene).ease({ v: 0 }, 1, plan.ringMs, (t) => {
    const r = ringAt(t, c); ring.setScale(r.scale).setAlpha(r.alpha);
    sparks.forEach((s, i) => { const k = sparkAt(i, sparks.length, t, c); s.setPosition(x + ui(1) * k.dx, y + ui(1) * k.dy).setAlpha(k.alpha).setScale(k.scale); });
    if (t >= 1) { give(p, ring); for (const s of sparks) give(p, s); }
  });
}

/** D3-R24 refused tap: shake the visual around its rest x and flash the badge in the danger colour. */
export function denied(scene: Phaser.Scene, visual: MotionTarget, badge?: { setTint(c: number): unknown; clearTint(): unknown }): void {
  const c = motionCfgFor(scene).d3, plan = deniedPlan(reduceMotion()), restX = visual.x;
  if (plan.badgeFlash) badge?.setTint(toInt(TOKENS.d3.tone.danger.face[1]!));
  motionFor(scene).ease({ v: 0 }, 1, plan.shake ? c.shakeMs : c.badgeFlashMs, (t) => {
    if (plan.shake) visual.x = restX + ui(1) * shakeDx(t, c);
    if (t >= 1) { visual.x = restX; badge?.clearTint(); }
  });
}
