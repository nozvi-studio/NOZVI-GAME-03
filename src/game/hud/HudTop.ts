import type Phaser from 'phaser';
import { FONT_TITLE, FONT_UI, TOKENS, toInt } from '../uiTokens';
import { d3, d3m, ui } from '../ui/layout';
import { bindPress } from '../scenes/ui';
import { attachFeedback } from '../ui/feedback';
import { quotaFlash } from '../ui/barEdgeModel';
import { progressBar } from '../ui/widgets';
import { hudIconKey } from './hudIcons';
import { D3_RUN, D4_RUN, type D3HudLayout, type R } from './d3HudLayout';
import type { HudView } from './hudModel';
import type { HudTarget, Pt } from '../juice/types';
import type { Balance } from '../../core';
import { motionFor, type Motion } from '../motion';
import { levelTitleChanged } from './hudMotion';

// Mockup px of the pause glyph (U5-R1 bigger glyph: bars at x -10..-3 and 3..10).
const M = { pauseBarW: 7, pauseBarH: 22, pauseBarX: 10, pauseGap: 3, pauseRadius: 3, playHalf: 11, playBack: 8, playTip: 11, disabledAlpha: 0.4 } as const;
const cen = (r: R): { x: number; y: number } => ({ x: d3(r.x + r.w / 2), y: d3(r.y + r.h / 2) });

function drawFlatPill(g: Phaser.GameObjects.Graphics, w: number, h: number, lip: number, border: number, surface: number, borderColor: number, lipColor: number): void {
  const r = h / 2;
  g.clear();
  g.fillStyle(lipColor, 1).fillRoundedRect(-w / 2, -h / 2 + lip, w, h, r);
  g.fillStyle(surface, 1).fillRoundedRect(-w / 2, -h / 2, w, h, r);
  g.lineStyle(border, borderColor, 1).strokeRoundedRect(-w / 2, -h / 2, w, h, r);
}

// D4-P5-R2 unified flat top bar: white round pause, Level pill (no pink ribbon), Score pill, flat mango bar.
export class HudTop {
  readonly pauseButton: Phaser.GameObjects.Container;
  private readonly pauseBg: Phaser.GameObjects.Graphics;
  private readonly pauseG: Phaser.GameObjects.Graphics;
  private readonly levelPill: Phaser.GameObjects.Graphics;
  private readonly level: Phaser.GameObjects.Text;
  private readonly scorePill: Phaser.GameObjects.Graphics;
  private readonly scoreIcon: Phaser.GameObjects.Image;
  private readonly score: Phaser.GameObjects.Text;
  private readonly mangoIcon: Phaser.GameObjects.Image;
  private readonly mangoBar: ReturnType<typeof progressBar>;
  private readonly quota: Phaser.GameObjects.Text;
  private pauseKey = '';
  private stormKey: boolean | null = null;
  private readonly pos: Record<'score' | 'levelBar', Pt>;
  private readonly motion: Motion;
  private readonly cfg: Balance['motion'];
  private cueKey = '';
  private scoreTarget = -1;
  private scoreLayoutW = -1;
  private readonly scoreEase = { v: 0 };
  private quotaTarget = -1;
  private readonly quotaEase = { v: 0 };
  private stopQuota: (() => void) | null = null;
  private titleSeen: string | null = null;
  private readonly digitW: number;

  constructor(private readonly scene: Phaser.Scene, private l: D3HudLayout, onPause: () => void) {
    const d4run = TOKENS.d4run;
    const H = d4run.hud;
    const surf = toInt(H.surface), bdr = toInt(H.border), lipC = toInt(H.lip), bdrPx = d3(D4_RUN.top.border);

    // Pause: flat white circle 48px with 4px tactile lip, zero gloss.
    const pd = d3(l.pause.w), pr = pd / 2, pc = cen(l.pause), plip = d3(D4_RUN.top.pauseLip);
    this.pauseBg = scene.add.graphics();
    const paintPauseBg = (pressed: boolean): void => {
      const dy = pressed ? plip : 0;
      this.pauseBg.clear();
      this.pauseBg.fillStyle(lipC, 1).fillCircle(0, plip, pr);
      this.pauseBg.fillStyle(surf, 1).fillCircle(0, dy, pr);
      this.pauseBg.lineStyle(bdrPx, bdr, 1).strokeCircle(0, dy, pr);
    };
    paintPauseBg(false);
    this.pauseG = scene.add.graphics().setName('pause-glyph');
    const vis = scene.add.container(0, 0, [this.pauseBg, this.pauseG]);
    this.pauseButton = scene.add.container(pc.x, pc.y, [vis]).setName('pause-button').setSize(pd, pd).setInteractive({ useHandCursor: true });
    const fb = attachFeedback(scene, vis, 'hudButton', { source: this.pauseButton });
    bindPress(
      this.pauseButton,
      () => { fb.press(); paintPauseBg(true); this.pauseG.setY(plip); },
      () => { fb.release(); paintPauseBg(false); this.pauseG.setY(0); },
      () => fb.fire(onPause),
      true,
    );

    // Level pill: flat white pill with dark ink title, zero stroke, zero pink ribbon.
    const lv = l.level, lc = cen(lv), lw = d3(lv.w), lh = d3(lv.h);
    this.levelPill = scene.add.graphics().setPosition(lc.x, lc.y);
    drawFlatPill(this.levelPill, lw, lh, d3(D4_RUN.top.pillLip), bdrPx, surf, bdr, lipC);
    this.level = scene.add.text(lc.x, lc.y, '', {
      fontFamily: FONT_TITLE,
      fontSize: `${d3(D4_RUN.top.pillFont)}px`,
      color: H.ink,
    }).setOrigin(0.5).setName('level');

    // Score pill: flat white pill, right-aligned, tabular width via max digit width.
    this.scorePill = scene.add.graphics();
    this.scoreIcon = scene.add.image(0, 0, hudIconKey('star')).setDisplaySize(d3(D3_RUN.score.icon), d3(D3_RUN.score.icon));
    this.score = scene.add.text(0, 0, '8', {
      fontFamily: FONT_UI,
      fontSize: `${d3(D3_RUN.score.font)}px`,
      fontStyle: '900',
      color: H.ink,
    }).setOrigin(0, 0.5).setName('score');
    this.digitW = Math.max(d3(10), this.score.width);
    this.score.setText('');

    // Mango quota bar: flat #FFC800 fill on #E5E2DC track.
    const m = l.mango, ic = cen(m.icon), qc = cen(m.label);
    this.mangoBar = progressBar(scene, d3(m.bar.x), d3(m.bar.y), d3m(m.bar.w), d3m(m.bar.h), H.mango, {
      flat: { track: H.track, fill: H.mango, border: H.border },
    });
    this.mangoIcon = scene.add.image(ic.x, ic.y, hudIconKey('mango')).setDisplaySize(d3(m.icon.w), d3(m.icon.h));
    this.quota = scene.add.text(qc.x, qc.y, '', {
      fontFamily: FONT_UI,
      fontSize: `${d3(D3_RUN.mango.labelFont)}px`,
      fontStyle: '900',
      color: H.labelLight,
    }).setOrigin(0.5).setName('quota-label');

    this.motion = motionFor(scene);
    this.cfg = (scene.registry.get('balance') as Balance).motion;
    const bc = cen(m.bar), sc = cen({ x: 360 - l.score.right - 60, y: l.score.y, w: 60, h: l.score.h });
    this.pos = { score: sc, levelBar: bc };
    this.layoutScore(this.digitW);
    for (const o of [this.mangoIcon, this.quota]) this.motion.rebase(o);
  }

  place(l: D3HudLayout): void { this.l = l; }

  apply(v: HudView, paused: boolean, pauseEnabled: boolean, storm = false): void {
    const d4run = TOKENS.d4run;
    const titleMoved = levelTitleChanged(this.titleSeen, v.levelTitle);
    this.titleSeen = v.levelTitle;
    this.level.setText(v.levelTitle);
    if (titleMoved) this.motion.slideIn(this.level, 'down');
    this.quota.setText(`${v.quota.done}${v.quota.total}`);
    if (this.stormKey !== storm) {
      this.stormKey = storm;
      this.quota.setColor(storm ? d4run.hud.labelStorm : d4run.hud.labelLight);
    }
    this.mangoBar.g.setVisible(v.quotaBar);
    if (v.scoreValue !== this.scoreTarget) this.retargetScore(v.scoreValue);
    this.syncBars(v.quotaFill);
    this.syncCues(v);
    const pk = `${paused}|${pauseEnabled}`;
    if (pk === this.pauseKey) return;
    this.pauseKey = pk;
    if (this.pauseButton.input) this.pauseButton.input.enabled = pauseEnabled;
    this.pauseButton.setAlpha(pauseEnabled ? 1 : M.disabledAlpha);
    this.drawPause(paused);
  }

  private retargetScore(target: number): void {
    const first = this.scoreTarget < 0, from = this.scoreEase.v;
    this.scoreTarget = target;
    const digits = String(Math.max(0, Math.round(target))).length;
    this.score.setText(String(target));
    const fixedW = Math.max(this.score.width, digits * this.digitW);
    this.layoutScore(fixedW);
    if (first || target <= from) { this.motion.ease(this.scoreEase, target, 0, () => {}); return; }
    this.score.setText(String(Math.round(from)));
    this.motion.ease(this.scoreEase, target, this.cfg.hudTickMs, x => { this.score.setText(String(Math.round(x))); });
  }

  private layoutScore(tw: number): void {
    const d4run = TOKENS.d4run, H = d4run.hud;
    const S = D3_RUN.score, h = d3(this.l.score.h), pad = d3(S.padX), ic = d3(S.icon), gap = d3(S.gap);
    const w = Math.round(pad + ic + gap + tw + pad);
    const right = d3(360 - this.l.score.right), x = right - w, cy = d3(this.l.score.y + this.l.score.h / 2);
    if (w !== this.scoreLayoutW) {
      this.scoreLayoutW = w;
      drawFlatPill(this.scorePill, w, h, d3(D4_RUN.top.pillLip), d3(D4_RUN.top.border), toInt(H.surface), toInt(H.border), toInt(H.lip));
    }
    this.scorePill.setPosition(x + w / 2, cy);
    this.scoreIcon.setPosition(x + pad + ic / 2, cy);
    this.score.setPosition(x + pad + ic + gap, cy);
    this.pos.score.x = x + w / 2;
    this.pos.score.y = cy;
    this.motion.rebase(this.scoreIcon);
    this.motion.rebase(this.score);
  }

  tick(now: number): void { this.mangoBar.edge(now); }

  private syncBars(quota: number): void {
    if (quota !== this.quotaTarget) {
      const prev = this.quotaTarget, jump = prev < 0 || quota < prev;
      this.quotaTarget = quota;
      if (quotaFlash(prev, quota)) this.mangoBar.flash(this.scene.time.now);
      if (!jump) this.bump('levelBar', this.cfg.releaseOvershoot, this.cfg.tapUpMs);
      this.motion.ease(this.quotaEase, quota, jump ? 0 : this.cfg.barEaseMs, x => { this.mangoBar.set(x, 1); });
    }
  }

  private syncCues(v: HudView): void {
    const key = String(v.quotaLast);
    if (key === this.cueKey) return;
    this.cueKey = key;
    this.stopQuota?.();
    this.stopQuota = null;
    if (v.quotaLast) this.stopQuota = this.motion.pulse(this.mangoIcon);
  }

  private drawPause(paused: boolean): void {
    const d4run = TOKENS.d4run;
    const g = this.pauseG.clear();
    g.fillStyle(toInt(d4run.hud.ink));
    const hb = ui(M.pauseBarH) / 2;
    if (paused) g.fillTriangle(-ui(M.playBack), -ui(M.playHalf), -ui(M.playBack), ui(M.playHalf), ui(M.playTip), 0);
    else g.fillRoundedRect(-ui(M.pauseBarX), -hb, ui(M.pauseBarW), 2 * hb, ui(M.pauseRadius)).fillRoundedRect(ui(M.pauseGap), -hb, ui(M.pauseBarW), 2 * hb, ui(M.pauseRadius));
  }

  point(target: 'score' | 'levelBar'): Pt { return this.pos[target]; }

  bump(target: 'score' | 'levelBar', scale: number, ms: number): void {
    const parts = target === 'score' ? [this.scoreIcon, this.score] : [this.mangoIcon, this.quota];
    for (const o of parts) this.motion.snap(o, scale, ms, target === 'score' ? undefined : () => { this.cueKey = ''; });
  }

  scoreText(): string { return this.score.text; }
}
