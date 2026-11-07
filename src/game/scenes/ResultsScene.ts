import Phaser from 'phaser';
import type { Balance } from '../../core';
import { biome } from '../../core';
import type { Session } from '../../session';
import { capyHeadKey } from '../art/capyRig';
import { resultsView, type ResultsView } from '../flow/resultsView';
import { HEIGHT, WIDTH } from '../layout';
import { t } from '../text';
import { drawIcon, type IconId } from '../ui/icons';
import { layoutColumn, ui } from '../ui/layout';
import { resultsColumn } from '../ui/menuLayout';
import { MENU } from '../ui/menuMetrics';
import { bgCream, bigLabel, hill, logoLine, roundIconButton, scaledBlock } from '../ui/menuWidgets';
import { card, pillButton, progressBar } from '../ui/widgets';
import { FONT_UI, TOKENS, toInt } from '../uiTokens';
import { beginRun } from './ui';

const R = MENU.results, C = R.card;
const TONE_FILL = { pink: TOKENS.accent.pink, butter: TOKENS.menu.statButter, sky: TOKENS.sky.stat } as const;
const style = (size: number, weight: '800' | '900', color: string): Phaser.Types.GameObjects.Text.TextStyle =>
  ({ fontFamily: FONT_UI, fontStyle: weight, fontSize: `${ui(size)}px`, color });

// P3b3-R11 ResultsD2: the four states come from resultsView; marbles row and marble machine stay hidden until P4 (D8).
export class ResultsScene extends Phaser.Scene {
  constructor() { super('Results'); }

  create(): void {
    const session = this.registry.get('session') as Session;
    const balance = this.registry.get('balance') as Balance;
    const s = session.summary();
    bgCream(this);
    hill(this, HEIGHT - ui(R.hillPeek));
    const home = (): void => { this.scene.start('Home'); };
    roundIconButton(this, ui(MENU.side + MENU.round / 2), ui(MENU.padTop + MENU.round / 2), MENU.round, 'home', 'results-home-top', home);
    logoLine(this, WIDTH / 2, ui(R.titleY + R.titleSize / 2), t('results.gameOver'), 0, R.titleSize);
    if (s) {
      const v = resultsView(s, session.homeModel().nextMilestone, biome(balance, balance.level.maxLevel));
      this.summaryBlock(v, s.won, balance.ui.minShrink);
    }
    this.footer(session, home);
  }

  private summaryBlock(v: ResultsView, won: boolean, minShrink: number): void {
    const blk = scaledBlock(this, layoutColumn(resultsColumn({ banner: v.checkpointBanner !== null, energy: v.energySaved !== null }, minShrink)));
    const x0 = WIDTH / 2 - ui(C.w) / 2, g = ui(MENU.section);
    let y = ui(R.cardTop);
    this.summaryCard(blk, v, won, x0, y);
    y += ui(R.cardH);
    if (v.energySaved !== null) { y += g; this.row(blk, x0, y, 'bolt', t('results.carryLabel'), String(v.energySaved), TOKENS.menu.bestSoft); y += ui(R.energyH); }
    if (v.checkpointBanner) { y += g; this.banner(blk, x0, y, v.checkpointBanner.level); y += ui(R.bannerH); }
    if (v.next) { y += g; this.progress(blk, x0, y, v.next); }
  }

  private summaryCard(blk: Phaser.GameObjects.Container, v: ResultsView, won: boolean, x0: number, y0: number): void {
    const cx = WIDTH / 2, text = (x: number, y: number, s: string, st: Phaser.Types.GameObjects.Text.TextStyle) => this.add.text(x, y0 + ui(y), s, st).setOrigin(0.5);
    blk.add(card(this, x0, y0, C.w, R.cardH, C.r));
    const headKey = capyHeadKey(won ? 'idle' : 'dead', 'large');
    if (this.textures.exists(headKey)) blk.add(this.add.image(cx, y0 - ui(C.headOverlap) + ui(C.headW) / 2, headKey).setDisplaySize(ui(C.headW), ui(C.headW)));
    const headline = t(v.headline.key) + (v.headline.context ? ' ' + t(v.headline.context) : '');
    const line = text(cx, C.headlineY, headline, { ...style(C.headline, '800', TOKENS.text.soft), wordWrap: { width: ui(C.w - 2 * C.pad) }, align: 'center' });
    // A wrapped headline (death context) grows upward so it never touches the SCORE label.
    if (line.height > ui(C.headline) * C.wrapLines) line.setOrigin(0.5, 1).setY(y0 + ui(C.headlineY + C.headline / 2));
    blk.add(line.setName('results-headline'));
    blk.add(text(cx, C.scoreLabelY, t('results.scoreLabel'), style(C.scoreLabel, '800', TOKENS.text.soft)).setLetterSpacing(ui(C.scoreLabelTrack)).setName('results-score-label'));
    blk.add(text(cx, C.scoreY, String(v.score), style(C.score, '800', TOKENS.text.primary)).setName('results-score'));
    this.bestChip(blk, v, cx, y0 + ui(C.chipY));
    const tw = (C.w - 2 * C.pad - 2 * C.tileGap) / 3;
    v.stats.forEach((st, i) => {
      const tx = x0 + ui(C.pad + i * (tw + C.tileGap)), ty = y0 + ui(C.tilesY);
      blk.add(this.add.graphics().fillStyle(toInt(TONE_FILL[st.tone])).fillRoundedRect(tx, ty, ui(tw), ui(C.tileH), ui(C.tileR)));
      blk.add(this.add.text(tx + ui(tw) / 2, ty + ui(C.tileLabelY), t(st.labelKey), style(C.tileLabel, '800', TOKENS.text.primary)).setOrigin(0.5).setLetterSpacing(ui(0.96)));
      blk.add(this.add.text(tx + ui(tw) / 2, ty + ui(C.tileValueY), st.value, style(C.tileValue, '800', TOKENS.text.primary)).setOrigin(0.5));
    });
  }

  // Star chip: gold star for "New best!", muted for a plain best.
  private bestChip(blk: Phaser.GameObjects.Container, v: ResultsView, cx: number, cy: number): void {
    const label = v.bestChip.key === 'results.newBest' ? t('results.newBest') : t('results.best', v.bestChip.vars);
    const tx = this.add.text(0, cy, label, style(C.chipFont, '800', TOKENS.text.primary)).setOrigin(0, 0.5);
    const ico = ui(C.chipIcon), w = ui(C.chipPadL) + ico + ui(C.chipGap) + tx.width + ui(C.chipPadR), h = ui(C.chipH), x = cx - w / 2;
    const bg = this.add.graphics().fillStyle(toInt(TOKENS.menu.bestSoft)).fillRoundedRect(x, cy - h / 2, w, h, h / 2);
    const star = this.add.graphics().setPosition(x + ui(C.chipPadL) + ico / 2, cy).fillStyle(toInt(v.bestChip.gold ? TOKENS.accent.butter : TOKENS.accent.gold));
    star.fillCircle(0, 0, ico / 2);
    tx.setX(x + ui(C.chipPadL) + ico + ui(C.chipGap));
    blk.add([bg, star, tx]).setName('results-best');
  }

  // Energy-saved card in the slot of the P4 marbles card (C7).
  private row(blk: Phaser.GameObjects.Container, x: number, y: number, icon: IconId, label: string, value: string, fill: string): void {
    const w = ui(C.w), h = ui(R.energyH), q = MENU.results.row, sh = TOKENS.shadow.card;
    blk.add(this.add.graphics().fillStyle(toInt(sh.color), sh.alpha).fillRoundedRect(x, y + ui(sh.y), w, h, ui(q.r))
      .fillStyle(toInt(fill)).fillRoundedRect(x, y, w, h, ui(q.r)));
    const ic = this.add.graphics().setPosition(x + ui(q.padX) + ui(q.icon) / 2, y + h / 2); drawIcon(ic, icon, ui(q.icon), toInt(TOKENS.text.primary));
    blk.add([ic, this.add.text(x + ui(q.padX + q.icon + q.gap), y + h / 2, label, style(q.label, '800', TOKENS.text.primary)).setOrigin(0, 0.5).setName('results-carry'),
      this.add.text(x + w - ui(q.padX), y + h / 2, value, style(q.value, '800', TOKENS.text.primary)).setOrigin(1, 0.5)]);
  }

  private banner(blk: Phaser.GameObjects.Container, x: number, y: number, level: number): void {
    const q = R.banner, w = ui(C.w), h = ui(R.bannerH), d = ui(q.disc);
    blk.add(this.add.graphics().fillStyle(toInt(TOKENS.menu.mintBanner)).fillRoundedRect(x, y, w, h, ui(q.r))
      .fillStyle(toInt(TOKENS.green.face)).fillCircle(x + ui(q.pad) + d / 2, y + h / 2, d / 2));
    const ic = this.add.graphics().setPosition(x + ui(q.pad) + d / 2, y + h / 2); drawIcon(ic, 'flag', ui(q.icon), toInt(TOKENS.surface.white));
    blk.add([ic, this.add.text(x + ui(q.pad + q.disc + q.gap), y + h / 2, t('banner.checkpoint', { level }), style(q.font, '900', TOKENS.menu.mintBannerText)).setOrigin(0, 0.5).setName('results-banner')]);
  }

  private progress(blk: Phaser.GameObjects.Container, x: number, y: number, next: NonNullable<ResultsView['next']>): void {
    const q = R.progress, label = t(next.chip.key, { level: next.chip.level });
    const tx = this.add.text(0, 0, label, style(q.chipFont, '800', TOKENS.text.primary)).setOrigin(0, 0.5);
    const ico = ui(q.chipIcon), cw = ui(q.chipPadL) + ico + ui(q.chipGap) + tx.width + ui(q.chipPadR), ch = ui(q.chipH), cy = y + ui(R.progressH) / 2;
    const barW = (ui(C.w) - cw - ui(q.gap)) / ui(1);
    const bar = progressBar(this, x, cy - ui(q.barH) / 2, barW, q.barH, TOKENS.accent.orange); bar.set(next.fill, 1);
    const cx = x + ui(C.w) - cw;
    const bg = this.add.graphics().fillStyle(toInt(TOKENS.surface.card)).fillRoundedRect(cx, cy - ch / 2, cw, ch, ch / 2);
    const ic = this.add.graphics().setPosition(cx + ui(q.chipPadL) + ico / 2, cy); drawIcon(ic, 'flag', ico, toInt(TOKENS.text.primary));
    tx.setPosition(cx + ui(q.chipPadL) + ico + ui(q.chipGap), cy);
    blk.add([bar.g, bg, ic, tx]);
  }

  // Home round button and Play again pill, anchored to the bottom (marble-machine button hidden until P4, D8).
  private footer(session: Session, home: () => void): void {
    const cy = HEIGHT - ui(R.bottom + R.againH / 2);
    roundIconButton(this, ui(R.side + R.btn / 2), cy, R.btn, 'home', 'results-home', home, true);
    const last = session.lastStartLevel();
    if (last === null) return;
    const left = ui(R.side + R.btn + R.btnGap), w = WIDTH - left - ui(R.side);
    const b = pillButton(this, left + w / 2, cy, w / ui(1), R.againH, t('playAgain'), 'results-again', () => beginRun(this, last, 'results'));
    bigLabel(b, R.againLabel, R.againStroke);
  }
}
