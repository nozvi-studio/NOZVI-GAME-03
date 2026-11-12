import type Phaser from 'phaser';
import { FONT_UI, TOKENS } from '../uiTokens';
import { d3, d3m } from '../ui/layout';
import { progressBar } from '../ui/widgets';
import { butterChip } from '../ui/menuWidgets';
import { D3_HOME } from '../ui/menuMetrics';
import { hudIconKey } from './hudIcons';
import { D3_RUN, type D3HudLayout, type R } from './d3HudLayout';
import type { HudView } from './hudModel';
import type { HudTarget, Pt } from '../juice/types';
import type { Balance } from '../../core';
import { motionFor, type Motion } from '../motion';
import { fingerPose, fingerShown } from './fingerHintModel';
import { chipHasIcon, chipTransition, easeMsFor, energyCue } from './hudMotion';

const T = TOKENS.d3;
// D3-R26 first-input finger glyph proportions (360-wide D3 px): tip radius, body size, gap left of the hint text, y offset, press scale.
const FINGER = { tip: 7, bodyW: 12, bodyH: 18, gap: 18, dy: 6, pressScale: 0.88 } as const;
const cen = (r: R): Pt => ({ x: d3(r.x + r.w / 2), y: d3(r.y + r.h / 2) });

// D3-R9 bottom group: energy bar, steer hint (R2) and checkpoint / ramp chip (R3). Static art is built once; apply() only sets text / crop / visibility.
export class BottomGroup {
  private energyIcon: Phaser.GameObjects.Image; private energy: Phaser.GameObjects.Text; private bar: ReturnType<typeof progressBar>;
  private readonly hint: Phaser.GameObjects.Text;
  private readonly chipBox: Phaser.GameObjects.Container; private chipBody: Phaser.GameObjects.Container | null = null;
  private chipKey = ''; private chipKind: string | null = null;
  private readonly motion: Motion; private readonly cfg: Balance['motion'];
  private cueKey = ''; private stopBolt: (() => void) | null = null;
  private energyTarget = -1; private energyShown = 0; private readonly energyEase = { v: 0 };
  private last: HudView | null = null;
  private pos: Pt = { x: 0, y: 0 };
  private readonly finger: Phaser.GameObjects.Graphics; private touch = false; private reduced = false; private fingerOn = false;
  private fingerX = 0; private fingerY = 0;

  constructor(private readonly scene: Phaser.Scene, private l: D3HudLayout) {
    const e = l.energy, ec = cen(e.icon), lc = cen(e.label), E = D3_RUN.energy, H = D3_RUN.hint;
    this.energyIcon = scene.add.image(ec.x, ec.y, hudIconKey('bolt')).setDisplaySize(d3(e.icon.w), d3(e.icon.h));
    this.bar = progressBar(scene, d3(e.bar.x), d3(e.bar.y), d3m(e.bar.w), d3m(e.bar.h), T.tone.energy.face[0]);
    this.energy = scene.add.text(lc.x, lc.y, '', { fontFamily: FONT_UI, fontSize: `${d3(E.font)}px`, fontStyle: '900', color: T.white })
      .setOrigin(0.5).setShadow(0, d3(E.shadowY), T.inkDeep, 0, false, true).setName('energy');
    this.hint = scene.add.text(0, 0, '', { fontFamily: FONT_UI, fontSize: `${d3(H.font)}px`, fontStyle: '900', color: T.white })
      .setOrigin(0.5).setShadow(0, d3(H.shadowY), T.inkDeep, 0, false, true).setName('steer-hint').setVisible(false);
    this.chipBox = scene.add.container(0, 0).setVisible(false).setName('next-checkpoint');   // one animated target
    this.motion = motionFor(scene); this.cfg = (scene.registry.get('balance') as Balance).motion;
    this.finger = this.buildFinger();
    this.pos = cen(e.bar);
    this.placeHint();
    for (const o of [this.energyIcon, this.energy]) this.motion.rebase(o);
  }

  /** D3-R9 R4: re-place everything on a new layout (D-pad toggled mid-run); nothing is recreated except the sized bar and the chip. */
  place(l: D3HudLayout): void {
    this.l = l;
    const e = l.energy, ec = cen(e.icon), lc = cen(e.label);
    this.energyIcon.setPosition(ec.x, ec.y).setDisplaySize(d3(e.icon.w), d3(e.icon.h)); this.energy.setPosition(lc.x, lc.y);
    this.bar.g.destroy(); this.bar = progressBar(this.scene, d3(e.bar.x), d3(e.bar.y), d3m(e.bar.w), d3m(e.bar.h), T.tone.energy.face[0]);
    this.bar.set(this.energyShown, 1);
    this.pos = cen(e.bar); this.placeHint();
    for (const o of [this.energyIcon, this.energy]) this.motion.rebase(o);
    this.chipKey = ''; if (this.last) this.drawChip(this.last.chip);
    this.syncHint(this.last);
  }

  apply(v: HudView): void {
    this.last = v;
    this.energy.setText(v.energy.text);
    if (v.energy.fill !== this.energyTarget) {
      const first = this.energyTarget < 0, ms = first ? 0 : easeMsFor(this.energyTarget, v.energy.fill, this.cfg); this.energyTarget = v.energy.fill;
      this.motion.ease(this.energyEase, v.energy.fill, ms, x => { this.energyShown = x; this.bar.set(x, 1); });
    }
    this.syncCue(v.energy.fill);
    this.syncHint(v);
    this.drawChip(v.chip);
  }

  /** MOT-4-R10 low energy: bolt pulses; full: one bolt pop. Cues are additive, never the only signal. */
  private syncCue(fill: number): void {
    const cue = energyCue(fill, this.cfg.energyLowFrac);
    if (cue === this.cueKey) return;
    const prev = this.cueKey; this.cueKey = cue;
    this.stopBolt?.(); this.stopBolt = null;
    if (cue === 'low') this.stopBolt = this.motion.pulse(this.energyIcon);
    else if (cue === 'full' && prev !== '' && prev !== 'full') this.motion.popIn(this.energyIcon);
  }

  /** D3-R26 C4: the finger glyph is drawn once (white tip with ink outline over a rounded body), origin at the tip centre. */
  private buildFinger(): Phaser.GameObjects.Graphics {
    const F = FINGER, g = this.scene.add.graphics().setName('first-input-finger').setVisible(false);
    g.fillStyle(parseInt(T.white.slice(1), 16), 1).fillRoundedRect(-d3(F.bodyW) / 2, 0, d3(F.bodyW), d3(F.bodyH), d3(F.bodyW) / 2);
    g.fillCircle(0, 0, d3(F.tip)).lineStyle(2, parseInt(T.inkDeep.slice(1), 16), 1).strokeCircle(0, 0, d3(F.tip));
    return g;
  }
  /** D3-R26 C3: touch only; reduced motion makes the glyph static. */
  setTouch(touch: boolean, reduced: boolean): void { this.touch = touch; this.reduced = reduced; this.syncHint(this.last); }
  /** D3-R26 per-frame finger pose; early-outs while hidden. */
  tick(now: number): void {
    if (!this.fingerOn) return;
    const p = fingerPose(now, this.reduced, this.cfg.d3);
    this.finger.setPosition(this.fingerX + d3(p.dx), this.fingerY).setAlpha(p.alpha).setScale(p.press ? FINGER.pressScale : 1);
  }

  private placeHint(): void {
    const h = this.l.hint; if (!h) return;
    this.hint.setPosition(d3(h.x + h.w / 2), d3(h.y + h.h / 2));
    this.fingerX = this.hint.x - d3(FINGER.gap) - this.hint.width / 2; this.fingerY = this.hint.y + d3(FINGER.dy);
  }
  /** D3-R9 R2/R3: the wait prompt is white text under the energy bar; no hint slot in D-pad mode, so it is hidden there. */
  private syncHint(v: HudView | null): void {
    const show = !!this.l.hint && v?.chip?.kind === 'wait';
    this.hint.setVisible(show); if (show) this.hint.setText(v!.chip!.text);
    this.placeHint(); this.fingerOn = fingerShown(this.touch, !!this.l.hint, show); this.finger.setVisible(this.fingerOn);
  }

  /** D3-R9 R2/R3: butter chip for ramp / checkpoint only (wait is the hint text); rebuilt only when its text or place changes. */
  private drawChip(chip: HudView['chip']): void {
    const shown = chip && chip.kind !== 'wait' ? chip : null;
    const kind = shown?.kind ?? null, tr = chipTransition(this.chipKind, kind); this.chipKind = kind;
    if (shown === null) {
      if (tr === 'out') this.motion.fadeOut(this.chipBox); else if (this.chipBox.alpha <= 0) this.chipBox.setVisible(false);
      this.chipKey = ''; return;
    }
    const c = this.l.chip, text = c.short ? shown.short : shown.text, icon = chipHasIcon(shown.kind), key = `${shown.kind}|${text}|${c.short}`;
    this.chipBox.setVisible(true);
    if (key !== this.chipKey) {
      this.chipKey = key; this.chipBody?.destroy();
      const F = D3_RUN.chip.font, meas = this.scene.add.text(0, 0, text, { fontFamily: FONT_UI, fontStyle: '900', fontSize: `${d3(F)}px` });
      const tw = meas.width / d3(1); meas.destroy();
      const ic = icon ? F * D3_HOME.chipIconRatio + D3_HOME.chipIconGap : 0, w = D3_RUN.chip.padX * 2 + ic + tw;
      const cx = c.right !== null ? 360 - c.right - w / 2 : c.cx, cy = c.y + c.h / 2;
      this.chipBody = butterChip(this.scene, 0, 0, w, c.h, text, F, icon ? 'flag' : undefined);
      this.chipBox.add(this.chipBody).setPosition(d3(cx), d3(cy)); this.motion.rebase(this.chipBox);
    }
    if (tr === 'in') { this.chipBox.setAlpha(1); this.motion.slideIn(this.chipBox, 'down'); }   // MOT-4-R13 fade + slide in
    else if (tr === 'cross') { this.chipBox.setAlpha(0); this.motion.fadeIn(this.chipBox); }    // cross-fade over fadeMs
  }

  /** P3a juice adapter: centre of the energy bar. */
  point(_target: Extract<HudTarget, 'energyBar'>): Pt { return this.pos; }
  /** P3a-R1/R2/R4: yoyo scale bump on the energy icon and label (reduced motion is gated in the mapper). */
  bump(_target: Extract<HudTarget, 'energyBar'>, scale: number, ms: number): void {
    for (const o of [this.energyIcon, this.energy]) this.motion.snap(o, scale, ms, () => { this.cueKey = ''; });   // re-arm the pulse cue a bump interrupted
  }
  /** P3a-R6: the chip pops in from zero; ms 0 (reduced motion) is a no-op. */
  plantFlag(ms: number): void {
    if (ms <= 0) return;
    this.motion.popIn(this.chipBox);
  }
}
