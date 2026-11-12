import Phaser from 'phaser';
import type { Balance } from '../../core';
import { biome } from '../../core';
import type { Session } from '../../session';
import { isMotionOff } from '../flow/debugFlag';
import { resultsTimeline } from '../flow/entranceOrder';
import { resultsLayout, type ResultsLayout } from '../flow/resultsLayout';
import { runResultsSequence, type SeqTargets } from '../flow/resultsSeq';
import { RESULTS_BUTTONS, resultsView, type ResultsRow, type ResultsView } from '../flow/resultsView';
import { WIDTH } from '../layout';
import { captureGroup, enter, goTo, motionFor } from '../motion';
import { reduceMotion } from '../render/palette';
import { t } from '../text';
import { screenBackground } from '../ui/background';
import { drawIcon, type IconId } from '../ui/icons';
import { d3, d3Height, d3m } from '../ui/layout';
import { MENU } from '../ui/menuMetrics';
import { bigLabel, butterChip } from '../ui/menuWidgets';
import { hostOf, lipPx, skinTexture } from '../ui/skin';
import { card, chip, pillButton, progressBar, titleText } from '../ui/widgets';
import { FONT_TITLE, FONT_UI, TOKENS, toInt } from '../uiTokens';
import { beginRun } from './ui';

const R = MENU.results, M = { ...R.d3, ...R }, D = TOKENS.d3; // M: layout metrics plus scene-only metrics
const NEXT_CHIP_CLEAR_W = 84; // "Clear L12" is wider than "L12" (mock px)
const ENERGY_ICON = D.tone.energy.face[1], NEXT_ICON = '#F5A400'; // board colours of the bolt and the next-checkpoint flag
const st = (size: number, color: string, weight: '800' | '900' = '800'): Phaser.Types.GameObjects.Text.TextStyle =>
  ({ fontFamily: FONT_UI, fontStyle: weight, fontSize: `${d3(size)}px`, color });

// D3-R18 / U5-R3/R4/R8 Results: rays, ribbon, one panel (headline, score, best chip, tiles, rows, tip) and the footer; layout comes from resultsLayout.
export class ResultsScene extends Phaser.Scene {
  private targets: SeqTargets = {}; private scoreText?: Phaser.GameObjects.Text;
  constructor() { super('Results'); }

  create(): void {
    this.targets = {}; this.scoreText = undefined; // Phaser reuses the instance
    const session = this.registry.get('session') as Session;
    const balance = this.registry.get('balance') as Balance;
    const s = session.summary();
    screenBackground(this, R.rayBiome, true);
    const home = (): void => { goTo(this, 'Home', undefined, 'back'); };
    const last = session.lastStartLevel();
    const v = s ? resultsView(s, session.homeModel().nextMilestone, biome(balance, balance.level.maxLevel)) : null;
    const l = resultsLayout(v ?? { rows: [], firstRunTip: null }, d3Height(), last !== null);
    if (v) this.panel(v, l);
    this.ribbon(t(v?.ribbon ?? 'results.gameOver'), l); // after the panel: the ribbon overlaps the panel top
    this.footer(l, last, home);
    enter(this, [], {}); // camera fade-in and re-arm goTo (MOT-2-R3); the sequence below is Results' own entrance
    if (s && v) this.playSequence(s.score, v);
  }

  // MOT-2-R9/R10 the Results sequence, skippable by a tap anywhere (Home / Play again taps still act at once).
  private playSequence(score: number, v: ResultsView): void {
    const cfg = (this.registry.get('balance') as Balance).motion, m = motionFor(this), has = (k: ResultsRow['kind']) => v.rows.some(r => r.kind === k);
    const timeline = resultsTimeline({ newBest: v.bestChip.key === 'results.newBest', energy: has('energy'), banner: has('checkpoint'),
      next: has('next'), again: this.targets.again !== undefined }, cfg);
    const seq = runResultsSequence({ motion: m, later: (ms, fn) => this.time.delayedCall(ms, fn), kill: t => this.tweens.killTweensOf(t), // the one allowed direct tween call (ruling 7)
      pulsePeriodMs: cfg.pulsePeriodMs, reduced: reduceMotion(), off: isMotionOff(window.location.search) }, timeline, this.targets, { text: this.scoreText!, value: score });
    this.input.on('pointerdown', () => seq.skip());
  }

  private ribbon(label: string, l: ResultsLayout): void {
    const r = l.ribbon, w = d3(r.w), h = d3(r.h), cy = d3(r.y + r.h / 2), host = hostOf(this), unit = d3(1);
    const img = (state: 'lip' | 'rest', y: number) => this.add.image(0, y, skinTexture(host, 'ribbon', 'ribbon', w, h, state, unit));
    const text = titleText(this, 0, 0, label, M.ribbonFont).setStroke(D.tone.ribbon.line, d3(M.ribbonStroke)).setName('results-title');
    this.targets.title = this.add.container(WIDTH / 2, cy, [img('lip', lipPx('ribbon', 'ribbon', unit)), img('rest', 0), text]);
  }

  private panel(v: ResultsView, l: ResultsLayout): void {
    const root = this.add.container(0, 0), px = d3(l.panel.x), pw = d3(l.panel.w), cx = WIDTH / 2, inner = l.panel.w - 2 * M.padX;
    const group = (key: string, at: { x: number; y: number }, build: () => void, name?: string): void => {
      this.targets[key] = captureGroup(this, root, at, build, name);
    };
    const text = (x: number, y: number, s: string, style: Phaser.Types.GameObjects.Text.TextStyle) => this.add.text(x, d3(y), s, style).setOrigin(0.5);
    group('card', { x: cx, y: d3(l.panel.y + l.panel.h / 2) }, () => root.add(card(this, px, d3(l.panel.y), d3m(l.panel.w), d3m(l.panel.h))));
    const headline = t(v.headline.key) + (v.headline.context ? ' ' + t(v.headline.context) : '');
    const hl = text(cx, l.headline + M.headlineH / 2, headline, { ...st(M.headlineFont, D.text), wordWrap: { width: d3(inner) }, align: 'center' }).setName('results-headline');
    // A wrapped headline (death context) grows upward into the panel padding so it never touches the SCORE label.
    if (hl.height > d3(M.headlineFont) * 1.6) hl.setOrigin(0.5, 1).setY(d3(l.headline + M.headlineH));
    root.add(hl); this.targets.headline = hl;
    const label = text(cx, l.scoreLabel + M.scoreLabelH / 2, t('results.scoreLabel'), st(M.scoreLabelFont, D.text)).setLetterSpacing(d3(M.scoreLabelTrack)).setName('results-score-label');
    root.add(label); this.targets.scoreLabel = label;
    const score = text(cx, l.score + M.scoreH / 2, String(v.score), { fontFamily: FONT_TITLE, fontSize: `${d3(M.scoreFont)}px`, color: D.text }).setName('results-score');
    root.add(score); this.targets.score = score; this.scoreText = score;
    this.best(root, v, cx, d3(l.best + M.bestH / 2));
    const tw = (inner - 2 * M.tileGap) / 3, tileColor = [D.stat.level, D.stat.eaten, D.stat.biome];
    v.stats.forEach((s, i) => {
      const x = d3(l.panel.x + M.padX + i * (tw + M.tileGap)), y = d3(l.tiles.y);
      group(`stat${i}`, { x: x + d3(tw) / 2, y: y + d3(l.tiles.h) / 2 }, () => {
        root.add(card(this, x, y, d3m(tw), d3m(l.tiles.h)));
        root.add(this.add.text(x + d3(tw) / 2, y + d3(M.tileLabelY), t(s.labelKey), st(M.tileLabelFont, D.text)).setOrigin(0.5));
        root.add(this.add.text(x + d3(tw) / 2, y + d3(M.tileValueY), s.value, st(M.tileValueFont, tileColor[i]!, '900')).setOrigin(0.5));
      });
    });
    l.rows.forEach((rect, i) => this.row(root, v.rows[i]!, rect, l, group));
    if (l.tip && v.firstRunTip) {
      const tip = this.add.text(cx, d3(l.tip.y + l.tip.h / 2), v.firstRunTip, { ...st(M.tipFont, D.tip), wordWrap: { width: d3(inner) }, align: 'center', lineSpacing: d3(M.tipFont * (M.tipLine - 1)) })
        .setOrigin(0.5).setName('results-tip');
      // The tip enters with the next-checkpoint row (no timeline item of its own, U5-R4); without that row it is static.
      const host = this.targets.next as Phaser.GameObjects.Container | undefined;
      if (host) host.add(tip.setPosition(tip.x - host.x, tip.y - host.y)); else root.add(tip);
    }
  }

  // Best chip: gold (mango skin) with a star disc for "New best!", the plain light chip otherwise.
  private best(root: Phaser.GameObjects.Container, v: ResultsView, cx: number, cy: number): void {
    const label = v.bestChip.key === 'results.newBest' ? t('results.newBest') : t('results.best', v.bestChip.vars);
    const c = chip(this, cx, cy, label, '', 'results-best-chip', { tone: v.bestChip.gold ? 'mango' : 'light', lead: M.bestLead });
    const star = this.add.graphics().setPosition(cx - c.width / 2 + d3(M.padX / 2 + M.bestIcon / 2 - 4), cy).fillStyle(toInt(D.tone.mango.face[1])).fillCircle(0, 0, d3(M.bestIcon) / 2);
    star.lineStyle(d3(2), toInt(D.tone.mango.line)).strokeCircle(0, 0, d3(M.bestIcon) / 2);
    root.setName('results-best'); // kept on the root as before (QA name)
    this.targets.best = captureGroup(this, root, { x: cx, y: cy }, () => root.add([c, star]), 'results-best-group');
    if (v.bestChip.gold) this.targets.bestStar = star; // only a new best pulses (and is hidden first) the plain chip's star is static
  }

  private row(root: Phaser.GameObjects.Container, r: ResultsRow, rect: ResultsLayout['rows'][number], l: ResultsLayout, group: (k: string, at: { x: number; y: number }, b: () => void) => void): void {
    const x0 = d3(l.panel.x + M.padX), w = d3(l.panel.w - 2 * M.padX), y = d3(rect.y), h = d3(rect.h), cy = y + h / 2, at = { x: WIDTH / 2, y: cy };
    const icon = (id: IconId, x: number, color: string) => { const g = this.add.graphics().setPosition(x + d3(M.rowIcon) / 2, cy); drawIcon(g, id, d3(M.rowIcon), toInt(color)); return g; };
    if (r.kind === 'checkpoint') {
      group('banner', at, () => root.add(butterChip(this, WIDTH / 2, cy, l.panel.w - 2 * M.padX, rect.h, t('results.nextRunAt', { level: r.level }), M.chipFont, 'flag').setName('results-banner')));
    } else if (r.kind === 'energy') {
      group('energy', at, () => root.add([icon('bolt', x0, ENERGY_ICON),
        this.add.text(x0 + d3(M.rowIcon + M.rowGap), cy, t('results.carryLabel'), st(M.rowFont, D.text)).setOrigin(0, 0.5).setName('results-carry'),
        this.add.text(x0 + w, cy, String(r.value), st(M.rowValueFont, D.text, '900')).setOrigin(1, 0.5)]));
    } else {
      const cw = r.requiresClear ? NEXT_CHIP_CLEAR_W : M.nextChipW, bx = M.rowIcon + M.rowGap, barW = l.panel.w - 2 * M.padX - bx - cw - M.rowGap;
      group('next', at, () => {
        const bar = progressBar(this, x0 + d3(bx), cy - d3(M.barH) / 2, d3m(barW), d3m(M.barH), TOKENS.accent.orange); bar.set(r.fill, 1);
        root.add([icon('flag', x0, NEXT_ICON), bar.g,
          butterChip(this, x0 + w - d3(cw) / 2, cy, cw, M.nextChipH, t(r.requiresClear ? 'results.nextCpClear' : 'results.nextCp', { level: r.level }), M.nextChipFont)]);
      });
    }
  }

  // Primary (Play again, or Home when there is no run to repeat, U5-R8) and the cream Home pill below it.
  private footer(l: ResultsLayout, last: number | null, home: () => void): void {
    const p = l.primary, cy = d3(p.y + p.h / 2);
    if (last === null) {
      const b = pillButton(this, WIDTH / 2, cy, d3m(p.w), d3m(p.h), t('results.home'), RESULTS_BUTTONS.home, home, 'green', { navigates: true });
      bigLabel(b, d3m(M.primaryLabel), d3m(M.primaryStroke)); this.targets.home = b.c;
      return;
    }
    const a = pillButton(this, WIDTH / 2, cy, d3m(p.w), d3m(p.h), t('playAgain'), RESULTS_BUTTONS.again, () => beginRun(this, last, 'results'), 'green', { navigates: true });
    bigLabel(a, d3m(M.primaryLabel), d3m(M.primaryStroke)); this.targets.again = a.c;
    const s = l.secondary!, sy = d3(s.y + s.h / 2);
    const h = pillButton(this, WIDTH / 2, sy, d3m(s.w), d3m(s.h), t('results.home'), RESULTS_BUTTONS.home, home, 'cream', { navigates: true });
    h.text.setFontSize(d3(M.secondaryFont));
    const ico = d3(M.secondaryIcon), gap = d3(M.secondaryGap), total = ico + gap + h.text.width;
    const g = this.add.graphics().setPosition(-total / 2 + ico / 2, 0); drawIcon(g, 'home', ico, toInt(D.text));
    h.text.setX(-total / 2 + ico + gap + h.text.width / 2); h.c.add(g);
    this.targets.home = h.c;
  }
}
