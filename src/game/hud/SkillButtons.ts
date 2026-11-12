import type Phaser from 'phaser';
import type { Balance } from '../../core';
import { motionFor, type Motion } from '../motion';
import { easeMsFor, skillReadyEdge } from './hudMotion';
import { FONT_UI, TOKENS, toInt } from '../uiTokens';
import { d3, ui } from '../ui/layout';
import { drawIcon } from '../ui/icons';
import { hostOf, lipPx, skinTexture } from '../ui/skin';
import { reduceMotion } from '../render/palette';
import { sweepX } from '../flow/sweepModel';
import { readySweep } from '../ui/barEdgeModel';
import { denied, glossBand, tapBurst } from '../ui/touchFx';
import { hudIconKey, type IconTone } from './hudIcons';
import { D3_RUN, type D3HudLayout, type R } from './d3HudLayout';
import { skillLook } from './skillLook';
import type { HudView, SkillState, SkillView } from './hudModel';

const T = TOKENS.d3, K = D3_RUN.skill, B = K.badge;
const cen = (r: R): { x: number; y: number } => ({ x: d3(r.x + r.w / 2), y: d3(r.y + r.h / 2) });

interface Slot { c: Phaser.GameObjects.Container; vis: Phaser.GameObjects.Container; lip: Phaser.GameObjects.Image; face: Phaser.GameObjects.Image;
  icon: Phaser.GameObjects.Image; lock: Phaser.GameObjects.Graphics; gauge: Phaser.GameObjects.Graphics;
  badge: Phaser.GameObjects.Image; cost: Phaser.GameObjects.Text; key: string; down: boolean;
  state: SkillState | null; view: SkillView | null; chargeTarget: number; shownCharge: number; charge: { v: number }; dip: { v: number };
  band: Phaser.GameObjects.Graphics; maskG: Phaser.GameObjects.Graphics; sweepAt: number }

// D3-R14 skill buttons on the `skill` skin: tone by slot, rim charge gauge, countdown ring, cost badge, locked empty slot (R1). Redraws only on a state / charge-step change.
export class SkillButtons {
  private readonly slots: Slot[] = [];
  private readonly motion: Motion;
  private l: D3HudLayout;
  /** `onDenied(slot)` fires on a tap of a locked slot (R1): the scene plays the nope sound; `onUse` is NOT called. */
  constructor(private readonly scene: Phaser.Scene, l: D3HudLayout, onUse: (slot: 0 | 1) => void, private readonly b: Balance, onDenied?: (slot: 0 | 1) => void) {
    this.l = l; this.motion = motionFor(scene);
    const host = hostOf(scene), unit = ui(1), dd = d3(K.d), lip0 = lipPx('skill', 'off', unit);
    for (const slot of [0, 1] as const) {
      const p = cen(l.skills[slot]);
      const lip = scene.add.image(0, lip0, skinTexture(host, 'skill', 'off', dd, dd, 'lip', unit));
      const face = scene.add.image(0, 0, skinTexture(host, 'skill', 'off', dd, dd, 'rest', unit));
      const icon = scene.add.image(0, 0, hudIconKey('slowmo', 'on')).setDisplaySize(d3(K.icon), d3(K.icon));
      const lock = scene.add.graphics().setName(`skill-${slot}-lock`), gauge = scene.add.graphics().setName(`skill-${slot}-face`);
      const badge = scene.add.image(0, 0, skinTexture(host, 'chip', 'light', d3(B.minW), d3(B.h), 'rest', unit)).setName(`skill-${slot}-badge`);
      const cost = scene.add.text(0, 0, '', { fontFamily: FONT_UI, fontSize: `${d3(B.font)}px`, fontStyle: '900', color: T.text }).setOrigin(0.5).setName(`skill-${slot}-cost`);
      const vis = scene.add.container(0, 0, [lip, face, icon, lock, gauge, badge, cost]).setName(`skill-${slot}-visual`);
      const band = glossBand(scene, dd, dd, b.motion.d3);   // D3-R27 ready sweep band, clipped to the round face
      const maskG = scene.make.graphics({}, false); maskG.fillStyle(toInt(T.white)).fillCircle(0, 0, dd / 2); maskG.setPosition(p.x, p.y);
      band.setMask(maskG.createGeometryMask());
      const c = scene.add.container(p.x, p.y, [vis, band]).setName(`skill-${slot}`).setSize(dd, dd).setInteractive({ useHandCursor: true });
      const s: Slot = { c, vis, lip, face, icon, lock, gauge, badge, cost, key: '', down: false, state: null, view: null, chargeTarget: -1, shownCharge: 0, charge: { v: 0 }, dip: { v: 1 }, band, maskG, sweepAt: -1 };
      c.on('pointerdown', (_p: unknown, _x: number, _y: number, e?: Phaser.Types.Input.EventData) => { // MEC-007-R14 reacts on pointer down
        e?.stopPropagation();
        s.down = true; s.key = ''; this.paint(slot);
        if (skillLook(s.view, slot).locked) { onDenied?.(slot); return; }   // D3-R1: locked slot, no cast
        onUse(slot);
      });
      const up = (): void => { if (!s.down) return; s.down = false; s.key = ''; this.paint(slot); };
      c.on('pointerup', up); c.on('pointerout', up);
      this.slots.push(s);
    }
    scene.events.once('shutdown', () => { for (const s of this.slots) s.maskG.destroy(); });
  }
  /** D3-R9 R4: move both buttons to a new layout (D-pad toggled mid-run); nothing is recreated. */
  place(l: D3HudLayout): void {
    this.l = l;
    for (const slot of [0, 1] as const) { const p = cen(l.skills[slot]); this.slots[slot]!.c.setPosition(p.x, p.y); this.slots[slot]!.maskG.setPosition(p.x, p.y); this.motion.rebase(this.slots[slot]!.vis); }
  }
  apply(skills: HudView['skills']): void {
    for (const slot of [0, 1] as const) this.draw(slot, skills[slot]);
  }
  private draw(slot: 0 | 1, k: SkillView | null): void {
    const s = this.slots[slot]!, cfg = this.b.motion;
    const edge = skillReadyEdge(s.state, k?.state ?? null); s.state = k?.state ?? null; s.view = k;
    if (!k) { s.key = ''; s.chargeTarget = -1; this.paint(slot); return; }
    if (readySweep(edge, reduceMotion())) s.sweepAt = this.scene.time.now;                  // D3-R27/R28 one gloss sweep on off -> ready, none under reduced motion
    if (edge === 'pop') this.motion.release(s.vis);                                       // 1 -> releaseOvershoot -> 1 over tapUpMs (MOT-4-R11)
    else if (edge === 'dip') { s.vis.setAlpha(cfg.reducedPressAlpha); s.dip.v = cfg.reducedPressAlpha; this.motion.ease(s.dip, 1, cfg.readyDipMs, v => { s.vis.setAlpha(v); }); }   // 80 ms alpha dip, no scale
    if (k.charge !== s.chargeTarget) {                                                    // eased charge between the quantised gauge steps
      const first = s.chargeTarget < 0, ms = first ? 0 : easeMsFor(s.chargeTarget, k.charge, cfg); s.chargeTarget = k.charge;
      this.motion.ease(s.charge, k.charge, ms, v => { s.shownCharge = v; this.paint(slot); });
    }
    this.paint(slot);
  }
  // D3-R14 R21 R22 R1 one slot: skin face by tone, icon or lock, rim gauge or countdown ring, cost badge.
  private paint(slot: 0 | 1): void {
    const s = this.slots[slot]!, k = s.view, look = skillLook(k, slot), host = hostOf(this.scene), unit = ui(1), dd = d3(K.d), r = dd / 2;
    const fill = !k || k.state === 'active' ? 0 : Math.round(Math.min(1, Math.max(0, s.shownCharge)) * K.chargeSteps); // UIFIX-R12 quantised gauge steps
    const pressed = s.down || k?.state === 'active';
    const key = `${k ? `${k.id}|${k.state}|${k.ring === null ? 'n' : k.ring.toFixed(2)}|${k.cost}` : 'locked'}|${fill}|${pressed ? 1 : 0}`;
    if (key === s.key) return;
    s.key = key;
    s.lip.setTexture(skinTexture(host, 'skill', look.tone, dd, dd, 'lip', unit)).setPosition(0, lipPx('skill', look.tone, unit));
    s.face.setTexture(skinTexture(host, 'skill', look.tone, dd, dd, pressed && !look.locked ? 'pressed' : 'rest', unit));
    const tone: IconTone = look.tone === 'off' ? 'off' : 'on';
    s.icon.setVisible(!look.locked); if (k) s.icon.setTexture(hudIconKey(k.id, tone));
    s.lock.clear(); s.lock.setVisible(look.locked);
    if (look.locked) { s.lock.setPosition(0, 0); drawIcon(s.lock, 'lock', d3(K.lock), toInt(T.tone.off.text)); }
    const g = s.gauge.clear();
    if (fill > 0 && fill < K.chargeSteps) {   // R12 charge as an arc on the rim, clockwise from 12 o'clock; D3 board: an affordable button has no gauge
      const gr = r - d3(K.gaugeInset);
      g.lineStyle(d3(K.gauge), toInt(T.tone.energy.face[1]!));
      g.beginPath().arc(0, 0, gr, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * fill / K.chargeSteps, false).strokePath();
    }
    if (k && k.state === 'active' && k.ring !== null) {   // countdown ring, white over a faint track
      const rr = r + d3(K.ringOut), end = -Math.PI / 2 + Math.PI * 2 * k.ring;
      g.lineStyle(d3(K.ring), toInt(T.white), K.trackAlpha).strokeCircle(0, 0, rr);
      g.lineStyle(d3(K.ring), toInt(T.white)).beginPath().arc(0, 0, rr, -Math.PI / 2, end, false).strokePath();
    }
    // cost badge (bottom right): light chip, danger chip when the skill is not affordable
    s.badge.setVisible(!!k); s.cost.setVisible(!!k);
    if (!k) return;
    s.cost.setText(String(k.cost)).setColor(look.badgeNo ? T.tone.danger.text : T.text);
    const bw = Math.max(d3(B.minW), s.cost.width + 2 * d3(B.padX)), bh = d3(B.h), bt = look.badgeNo ? 'danger' : 'light';
    const bx = r + d3(-B.right) - bw / 2, by = r + d3(-B.bottom) - bh / 2;
    s.badge.setTexture(skinTexture(host, 'chip', bt, bw, bh, 'rest', unit)).setPosition(bx, by); s.cost.setPosition(bx, by);
  }
  /** P3a juice adapter: centre of a skill button (JuiceHud.skillPoint). */
  point(slot: 0 | 1): { x: number; y: number } { return cen(this.l.skills[slot]); }
  /** D3-R27 per-frame sweep position; early-outs when no sweep is running. */
  tick(now: number): void {
    const cfg = this.b.motion.d3, dd = d3(K.d);
    for (const s of this.slots) {
      if (s.sweepAt < 0) continue;
      const x = sweepX(now - s.sweepAt, cfg.sweepMs, dd, dd * cfg.sweepBand);
      if (x === null) { s.sweepAt = -1; s.band.setVisible(false); } else s.band.setVisible(true).setX(x);
    }
  }
  /** D3-R24 / MEC-006 §8 / GDD §10.4 refused cast: shake the button and flash the badge; skipped shake under reduced motion. */
  shake(slot: 0 | 1): void { const s = this.slots[slot]!; denied(this.scene, s.vis, s.badge.visible ? s.badge : undefined); }
  /** D3-R23 successful cast: tap burst at the button centre in the slot tone. */
  cast(slot: 0 | 1): void { const p = this.point(slot); tapBurst(this.scene, p.x, p.y, slot === 0 ? 'skillA' : 'skillB'); }
}
