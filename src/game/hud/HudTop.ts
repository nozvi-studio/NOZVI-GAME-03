import type Phaser from 'phaser';
import { FONT_TITLE, FONT_UI, TOKENS, toInt } from '../uiTokens';
import { d3, d3m, ui } from '../ui/layout';
import { bindPress } from '../scenes/ui';
import { attachFeedback } from '../ui/feedback';
import { hostOf, lipPx, skinTexture } from '../ui/skin';
import { progressBar } from '../ui/widgets';
import { drawCard, hudLabel } from './draw';
import { hudIconKey } from './hudIcons';
import { D3_RUN, type D3HudLayout, type R } from './d3HudLayout';
import type { HudView } from './hudModel';
import type { HudTarget, Pt } from '../juice/types';
import type { Balance } from '../../core';
import { motionFor, type Motion } from '../motion';
import { chipHasIcon, chipTransition, easeMsFor, energyCue, levelTitleChanged } from './hudMotion';

const T = TOKENS.d3;
// Mockup px of the pause glyph (kept from GameD2) and of the TEMP energy pill / checkpoint chip (replaced by BottomGroup in Task 4).
const M = { pauseBarW: 5, pauseBarH: 16, pauseBarX: 7, pauseGap: 2, pauseRadius: 2, playHalf: 9, playBack: 6, playTip: 9, disabledAlpha: 0.4,
  chip: 14, bolt: 16, bar: 10, chipPadL: 12, chipIcon: 18, chipGap: 8, chipPadR: 16 } as const;


const cen = (r: R): { x: number; y: number } => ({ x: d3(r.x + r.w / 2), y: d3(r.y + r.h / 2) });

// D3-R13 top bar: light pause button, level ribbon, score chip, mango quota bar. Static art is built once; apply() only sets text / crop / visibility.
// TEMP (until Task 4 BottomGroup): the energy row and the checkpoint / ramp / wait chip are still drawn here, positioned from the D3 layout.
export class HudTop {
  readonly pauseButton: Phaser.GameObjects.Container;
  private readonly pauseG: Phaser.GameObjects.Graphics; private readonly pauseFace: Phaser.GameObjects.Image;
  private readonly level: Phaser.GameObjects.Text;
  private readonly scoreLip: Phaser.GameObjects.Image; private readonly scoreFace: Phaser.GameObjects.Image;
  private readonly scoreIcon: Phaser.GameObjects.Image; private readonly score: Phaser.GameObjects.Text;
  private readonly mangoIcon: Phaser.GameObjects.Image; private readonly mangoBar: ReturnType<typeof progressBar>; private readonly quota: Phaser.GameObjects.Text;
  private readonly energyIcon: Phaser.GameObjects.Image; private readonly energyG: Phaser.GameObjects.Graphics; private readonly energy: Phaser.GameObjects.Text;
  private readonly chipG: Phaser.GameObjects.Graphics; private readonly chipText: Phaser.GameObjects.Text; private readonly chipIcon: Phaser.GameObjects.Image;
  private readonly chipBox: Phaser.GameObjects.Container;
  private chipKey = ''; private pauseKey = '';
  private readonly pos: Record<HudTarget, Pt>;
  private readonly motion: Motion; private readonly cfg: Balance['motion'];
  private cueKey = '';
  private scoreTarget = -1; private scoreW = 0; private scoreLayoutW = -1; private readonly scoreEase = { v: 0 };
  private quotaTarget = -1; private readonly quotaEase = { v: 0 };
  private energyTarget = -1; private energyShown = 0; private readonly energyEase = { v: 0 };
  private stopBolt: (() => void) | null = null; private stopQuota: (() => void) | null = null;
  private titleSeen: string | null = null; private chipKind: string | null = null;

  constructor(private readonly scene: Phaser.Scene, private l: D3HudLayout, onPause: () => void) {
    const host = hostOf(scene), unit = ui(1), tone = T.tone;
    // Pause (R13): light round skin, lip under face, pressed face on press.
    const pd = d3(l.pause.w), pc = cen(l.pause), plip = lipPx('round', 'light', unit);
    const restTex = skinTexture(host, 'round', 'light', pd, pd, 'rest', unit), pressTex = skinTexture(host, 'round', 'light', pd, pd, 'pressed', unit);
    const lip = scene.add.image(0, plip, skinTexture(host, 'round', 'light', pd, pd, 'lip', unit));
    this.pauseFace = scene.add.image(0, 0, restTex); this.pauseG = scene.add.graphics().setName('pause-glyph');
    const vis = scene.add.container(0, 0, [lip, this.pauseFace, this.pauseG]);
    this.pauseButton = scene.add.container(pc.x, pc.y, [vis]).setName('pause-button').setSize(pd, pd).setInteractive({ useHandCursor: true });
    // MOT-1-R2 the visual container animates; the 'pause-button' hit container never scales.
    const fb = attachFeedback(scene, vis, 'hudButton', { source: this.pauseButton });
    bindPress(this.pauseButton, () => { fb.press(); this.pauseFace.setTexture(pressTex); }, () => { fb.release(); this.pauseFace.setTexture(restTex); }, () => fb.fire(onPause), true);

    // Ribbon with the level title (R5: no biome line).
    const rb = l.ribbon, rc = cen(rb), rw = d3(rb.w), rh = d3(rb.h);
    scene.add.image(rc.x, rc.y + lipPx('ribbon', 'ribbon', unit), skinTexture(host, 'ribbon', 'ribbon', rw, rh, 'lip', unit));
    scene.add.image(rc.x, rc.y, skinTexture(host, 'ribbon', 'ribbon', rw, rh, 'rest', unit));
    this.level = scene.add.text(rc.x, rc.y, '', { fontFamily: FONT_TITLE, fontSize: `${d3(D3_RUN.ribbon.font)}px`, color: T.white,
      stroke: tone.ribbon.line, strokeThickness: d3(D3_RUN.ribbon.stroke) }).setOrigin(0.5).setName('level');

    // Score chip: light skin, right aligned, grows with the text (laid out in layoutScore).
    this.scoreLip = scene.add.image(0, 0, skinTexture(host, 'chip', 'light', d3(60), d3(l.score.h), 'lip', unit));
    this.scoreFace = scene.add.image(0, 0, skinTexture(host, 'chip', 'light', d3(60), d3(l.score.h), 'rest', unit));
    this.scoreIcon = scene.add.image(0, 0, hudIconKey('star')).setDisplaySize(d3(D3_RUN.score.icon), d3(D3_RUN.score.icon));
    this.score = scene.add.text(0, 0, '', { fontFamily: FONT_UI, fontSize: `${d3(D3_RUN.score.font)}px`, fontStyle: '900', color: T.text }).setOrigin(0, 0.5).setName('score');

    // Mango quota bar: icon, bar, "done/total" label.
    const m = l.mango, ic = cen(m.icon), lc = cen(m.label);
    this.mangoBar = progressBar(scene, d3(m.bar.x), d3(m.bar.y), d3m(m.bar.w), d3m(m.bar.h), tone.mango.face[0]);
    this.mangoIcon = scene.add.image(ic.x, ic.y, hudIconKey('mango')).setDisplaySize(d3(m.icon.w), d3(m.icon.h));
    this.quota = scene.add.text(lc.x, lc.y, '', { fontFamily: FONT_UI, fontSize: `${d3(D3_RUN.mango.labelFont)}px`, fontStyle: '900', color: T.white })
      .setOrigin(0.5).setShadow(0, d3(D3_RUN.mango.shadowY), T.inkDeep, 0, false, true).setName('quota-label');

    // TEMP energy pill + chip (Task 4 moves them to BottomGroup).
    const e = l.energy, ec = cen(e.icon);
    this.energyIcon = scene.add.image(ec.x, ec.y, hudIconKey('bolt')).setDisplaySize(d3(e.icon.w), d3(e.icon.h));
    this.energyG = scene.add.graphics();
    this.energy = hudLabel(scene, d3(e.label.x), d3(e.label.y + e.label.h / 2), '', 15, T.text, 900, 'energy').setOrigin(0, 0.5);
    this.chipG = scene.add.graphics();
    this.chipIcon = scene.add.image(0, 0, hudIconKey('flag', 'soft')).setDisplaySize(ui(M.chipIcon), ui(M.chipIcon));
    this.chipText = hudLabel(scene, 0, 0, '', M.chip, TOKENS.text.soft, 800, 'next-checkpoint');
    this.chipBox = scene.add.container(0, 0, [this.chipG, this.chipIcon, this.chipText]).setVisible(false);   // one animated target

    this.motion = motionFor(scene); this.cfg = (scene.registry.get('balance') as Balance).motion;
    const bc = cen(m.bar), enc = cen(e.bar), sc = cen({ x: 360 - l.score.right - 60, y: l.score.y, w: 60, h: l.score.h });
    this.pos = { score: sc, levelBar: bc, energyBar: enc };
    this.layoutScore(d3(60));
    this.drawEnergy();
    for (const o of [this.mangoIcon, this.quota, this.energyIcon, this.energy]) this.motion.rebase(o);
  }

  /** D3-R13 layout is fixed for the top bar; kept for symmetry with the bottom group (R4). */
  place(l: D3HudLayout): void { this.l = l; }

  apply(v: HudView, paused: boolean, pauseEnabled: boolean): void {
    const titleMoved = levelTitleChanged(this.titleSeen, v.levelTitle); this.titleSeen = v.levelTitle;
    this.level.setText(v.levelTitle);
    if (titleMoved) this.motion.slideIn(this.level, 'down');   // MOT-4-R12
    this.quota.setText(`${v.quota.done}${v.quota.total}`); this.energy.setText(v.energy.text);
    this.mangoBar.g.setVisible(v.quotaBar);                    // R8 no bar at the max level
    if (v.scoreValue !== this.scoreTarget) this.retargetScore(v.scoreValue);
    this.syncBars(v.quotaFill, v.energy.fill);
    this.syncCues(v);
    this.drawChip(v.chip);
    const pk = `${paused}|${pauseEnabled}`;
    if (pk === this.pauseKey) return;
    this.pauseKey = pk;
    if (this.pauseButton.input) this.pauseButton.input.enabled = pauseEnabled;
    this.pauseButton.setAlpha(pauseEnabled ? 1 : M.disabledAlpha); this.drawPause(paused);
  }

  /** MOT-4-R7 rising score ticks via motion.ease (same cubicOut as countUp; ease, not countUp, so the P3a bump cannot freeze it). */
  private retargetScore(target: number): void {
    const first = this.scoreTarget < 0, from = this.scoreEase.v;
    this.scoreTarget = target;
    this.score.setText(String(target)); this.scoreW = this.score.width;                      // layout uses the FINAL width
    this.layoutScore(this.scoreW);
    if (first || target <= from) { this.motion.ease(this.scoreEase, target, 0, () => {}); return; }
    this.score.setText(String(Math.round(from)));
    this.motion.ease(this.scoreEase, target, this.cfg.hudTickMs, x => { this.score.setText(String(Math.round(x))); });
  }
  /** Size the score chip for a text `tw` px wide and right-align it; static images, re-skinned only when the width changes. */
  private layoutScore(tw: number): void {
    const S = D3_RUN.score, h = d3(this.l.score.h), pad = d3(S.padX), ic = d3(S.icon), gap = d3(S.gap);
    const w = Math.round(pad + ic + gap + tw + pad);
    const right = d3(360 - this.l.score.right), x = right - w, cy = d3(this.l.score.y + this.l.score.h / 2);
    if (w !== this.scoreLayoutW) {
      this.scoreLayoutW = w; const host = hostOf(this.scene), unit = ui(1);
      this.scoreLip.setTexture(skinTexture(host, 'chip', 'light', w, h, 'lip', unit)); this.scoreFace.setTexture(skinTexture(host, 'chip', 'light', w, h, 'rest', unit));
    }
    this.scoreLip.setPosition(x + w / 2, cy + lipPx('chip', 'light', ui(1)));
    this.scoreFace.setPosition(x + w / 2, cy);
    this.scoreIcon.setPosition(x + pad + ic / 2, cy); this.score.setPosition(x + pad + ic + gap, cy);
    this.pos.score.x = x + w / 2; this.pos.score.y = cy;
    this.motion.rebase(this.scoreIcon); this.motion.rebase(this.score);
  }
  /** MOT-4-R8/R9 quota and energy fills ease; first paint and a falling quota (level-up reset) jump; a spend eases faster. */
  private syncBars(quota: number, energy: number): void {
    if (quota !== this.quotaTarget) {
      const jump = this.quotaTarget < 0 || quota < this.quotaTarget; this.quotaTarget = quota;
      if (!jump) this.bump('levelBar', this.cfg.releaseOvershoot, this.cfg.tapUpMs);   // R8 pop on a progress change
      this.motion.ease(this.quotaEase, quota, jump ? 0 : this.cfg.barEaseMs, x => { this.mangoBar.set(x, 1); });
    }
    if (energy !== this.energyTarget) {
      const first = this.energyTarget < 0, ms = first ? 0 : easeMsFor(this.energyTarget, energy, this.cfg); this.energyTarget = energy;
      this.motion.ease(this.energyEase, energy, ms, x => { this.energyShown = x; this.drawEnergy(); });
    }
  }
  /** MOT-4-R10 low energy: bolt pulses; full: one bolt pop. R8: the mango icon pulses while one mango is left. Cues are additive, never the only signal. */
  private syncCues(v: HudView): void {
    const cue = energyCue(v.energy.fill, this.cfg.energyLowFrac), key = `${cue}|${v.quotaLast}`;
    if (key === this.cueKey) return;
    const prev = this.cueKey.split('|')[0]; this.cueKey = key;
    this.stopBolt?.(); this.stopBolt = null; this.stopQuota?.(); this.stopQuota = null;
    if (cue === 'low') this.stopBolt = this.motion.pulse(this.energyIcon);
    else if (cue === 'full' && prev !== '' && prev !== 'full') this.motion.popIn(this.energyIcon);
    if (v.quotaLast) this.stopQuota = this.motion.pulse(this.mangoIcon);
  }

  /** TEMP (Task 4): old energy bar, positioned from the D3 energy rect. */
  private drawEnergy(): void {
    const b = this.l.energy.bar, x = d3(b.x), w = d3(b.w), h = d3(b.h), y = d3(b.y), g = this.energyG.clear();
    const low = energyCue(this.energyShown, this.cfg.energyLowFrac) === 'low';
    g.fillStyle(toInt(TOKENS.hud.energyTrack)).fillRoundedRect(x, y, w, h, h / 2);
    if (this.energyShown > 0) g.fillStyle(toInt(low ? TOKENS.danger.text : TOKENS.sky.energy)).fillRoundedRect(x, y, Math.max(h, w * this.energyShown), h, h / 2);
  }
  /** TEMP (Task 4): old chip, positioned from the D3 chip rect. */
  private drawChip(chip: HudView['chip']): void {
    const kind = chip?.kind ?? null, tr = chipTransition(this.chipKind, kind); this.chipKind = kind;
    if (chip === null) {
      if (tr === 'out') this.motion.fadeOut(this.chipBox); else if (this.chipBox.alpha <= 0) this.chipBox.setVisible(false);
      this.chipKey = ''; return;
    }
    const text = chip.text, icon = chipHasIcon(chip.kind);
    this.chipBox.setVisible(true); this.chipText.setVisible(true); this.chipIcon.setVisible(icon);
    const key = `${chip.kind}|${text}`;
    if (key !== this.chipKey) {
      this.chipKey = key; this.chipText.setText(text);
      const c = this.l.chip, y = d3(c.y), h = d3(c.h), tw = this.chipText.width, pad = ui(M.chipPadL), ic = icon ? ui(M.chipIcon) : 0, gap = icon ? ui(M.chipGap) : 0;
      const w = pad + ic + gap + tw + ui(M.chipPadR), x = c.right !== null ? d3(360 - c.right) - w : d3(c.cx) - w / 2;
      this.chipG.clear(); drawCard(this.chipG, x, y, w, h, h / 2, TOKENS.surface.card);
      this.chipIcon.setPosition(x + pad + ic / 2, y + h / 2); this.chipText.setPosition(x + pad + ic + gap, y + h / 2).setOrigin(0, 0.5);
    }
    if (tr === 'in') { this.chipBox.setAlpha(1); this.motion.slideIn(this.chipBox, 'down'); }   // MOT-4-R13 fade + slide in
    else if (tr === 'cross') { this.chipBox.setAlpha(0); this.motion.fadeIn(this.chipBox); }    // cross-fade over fadeMs
  }
  private drawPause(paused: boolean): void {
    const g = this.pauseG.clear();
    g.fillStyle(toInt(T.text));
    const hb = ui(M.pauseBarH) / 2;
    if (paused) g.fillTriangle(-ui(M.playBack), -ui(M.playHalf), -ui(M.playBack), ui(M.playHalf), ui(M.playTip), 0);
    else g.fillRoundedRect(-ui(M.pauseBarX), -hb, ui(M.pauseBarW), 2 * hb, ui(M.pauseRadius)).fillRoundedRect(ui(M.pauseGap), -hb, ui(M.pauseBarW), 2 * hb, ui(M.pauseRadius));
  }

  /** P3a juice adapter: centre of the score chip, the energy bar (TEMP) and the mango bar. */
  point(target: HudTarget): Pt { return this.pos[target]; }
  /** P3a-R1/R2/R4: yoyo scale bump on a chip's icon and text, relative to their base scale (reduced motion is gated in the mapper). */
  bump(target: HudTarget, scale: number, ms: number): void {
    const parts = target === 'score' ? [this.scoreIcon, this.score] : target === 'levelBar' ? [this.mangoIcon, this.quota] : [this.energyIcon, this.energy];
    for (const o of parts) this.motion.snap(o, scale, ms, target === 'score' ? undefined : () => { this.cueKey = ''; });   // re-arm the pulse cues a bump interrupted
  }
  /** P3a-R6: the chip's flag icon pops in from zero; ms 0 (reduced motion) is a no-op. */
  plantFlag(ms: number): void {
    if (ms <= 0) return;          // reduced motion is gated in the mapper (ms 0)
    this.motion.popIn(this.chipIcon);
  }
  /** Test seam: the score text as drawn right now. */
  scoreText(): string { return this.score.text; }
}
