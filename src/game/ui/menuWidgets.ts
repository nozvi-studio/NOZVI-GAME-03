import Phaser from 'phaser';
import { WIDTH } from '../layout';
import { TOKENS, toInt, FONT_TITLE, FONT_UI } from '../uiTokens';
import { t } from '../text';
import type { MotionTarget } from '../motion/motionCore';
import { attachFeedback } from './feedback';
import type { FeedbackKind } from './feedbackModel';
import { drawIcon, type IconId } from './icons';
import { d3, hitSize, ui } from './layout';
import { logoLetters, logoSpec, type LogoLine } from './menuLayout';
import { D3_HERO, D3_HOME, MENU } from './menuMetrics';
import { heroBody, heroHighlight } from './heroSpec';
import { headKey } from '../art/capyRig';
import { SKIN_BODY, activeSkin } from '../art/skins';
import { hostOf, lipPx, skinTexture, type SkinState } from './skin';
import { tapBurst } from './touchFx';
import { titleText } from './widgets';

// Menu-only widgets (P3b3). Origin convention follows the P3-0 kit: pills and chips are centred, cards and bars are top-left.


/** MOT-1-R6 optional feedback for a zone widget: the visual is animated, the zone (hit area) never is. */
export interface TapFx { visual: MotionTarget | MotionTarget[]; kind: FeedbackKind; navigates?: boolean }

/** Press-and-release hit zone (same rule as the greybox `button`): fires only if the press started on it. */
export function tap(scene: Phaser.Scene, x: number, y: number, w: number, h: number, name: string, action: () => void,
  fx?: TapFx): Phaser.GameObjects.Zone {
  const z = scene.add.zone(x, y, w, h).setName(name).setInteractive({ useHandCursor: true });
  const fb = fx ? attachFeedback(scene, fx.visual, fx.kind, { source: z, navigates: fx.navigates }) : undefined;
  let down = false;
  z.on('pointerdown', () => { down = true; fb?.press(); });
  z.on('pointerup', () => { const go = down; down = false; fb?.release(); if (go) { if (fb) fb.fire(action); else action(); } });
  z.on('pointerout', () => { down = false; fb?.release(); });
  return z;
}

/** D3-R6 round light icon button (back, sliders, home): lip image under a face image; `shelf` is kept for the call signature and ignored. */
export function roundIconButton(scene: Phaser.Scene, x: number, y: number, diameterMock: number, icon: IconId, name: string,
  action: () => void, _shelf = false, opts: { navigates?: boolean } = {}): Phaser.GameObjects.Container {
  const d = ui(diameterMock), lip = lipPx('round', 'light', ui(1)), host = hostOf(scene);
  const lipImg = scene.add.image(0, lip, skinTexture(host, 'round', 'light', d, d, 'lip', ui(1)));
  const face = scene.add.image(0, 0, skinTexture(host, 'round', 'light', d, d, 'rest', ui(1)));
  const ic = scene.add.graphics(); drawIcon(ic, icon, d * MENU.widgets.iconRatio, toInt(TOKENS.d3.text));
  const c = scene.add.container(x, y, [lipImg, face, ic]).setName(name);
  const hit = hitSize(d); // UIFIX-R7
  tap(scene, x, y, hit, hit, `${name}-hit`, () => { tapBurst(scene, x, y, 'light'); action(); }, { visual: [face, ic], kind: 'round', navigates: opts.navigates });
  return c;
}

// D3-R11 logo: per line, an ink back text (thick stroke, dropped) under the coloured front text.
export function d3Logo(scene: Phaser.Scene, cx: number, top: number, scale: number): { mango: Phaser.GameObjects.Container; snake: Phaser.GameObjects.Container } {
  const s = logoSpec(scale);
  const make = (l: LogoLine): Phaser.GameObjects.Container => {
    const st = (fill: string, stroke: string, px: number): Phaser.Types.GameObjects.Text.TextStyle =>
      ({ fontFamily: FONT_TITLE, fontSize: `${d3(s.fontPx)}px`, color: fill, stroke, strokeThickness: d3(px) });
    const back = scene.add.text(0, d3(l.backY - l.y), t(l.key), st(l.back, l.back, l.backStrokePx)).setOrigin(0.5);
    const front = scene.add.text(0, 0, t(l.key), st(l.fill, l.stroke, l.strokePx)).setOrigin(0.5);
    return scene.add.container(cx, top + d3(l.y), [back, front]);
  };
  return { mango: make(s.lines[0]!), snake: make(s.lines[1]!) };
}

/** One logo line (e.g. MANGO, GAME OVER): coloured, tilted Lilita letters with the outline and drop shadow. */
export function logoLine(scene: Phaser.Scene, cx: number, y: number, text: string, colorOffset: number, sizeMock: number): Phaser.GameObjects.Container {
  const letters = logoLetters(text, colorOffset);
  const objs = letters.map(l => l.ch === ' ' ? null : titleText(scene, 0, 0, l.ch, sizeMock, l.color)
    .setRotation(Phaser.Math.DegToRad(l.rotDeg)).setOrigin(0.5, 0.5));
  const gap = ui(MENU.widgets.logoGap), space = ui(sizeMock * MENU.widgets.logoSpace);
  const widths = objs.map(o => o ? o.width : space);
  const total = widths.reduce((a, b) => a + b, 0) + gap * (letters.length - 1);
  let x = -total / 2;
  objs.forEach((o, i) => { if (o) o.setPosition(x + widths[i]! / 2, ui(letters[i]!.dy)); x += widths[i]! + gap; });
  return scene.add.container(cx, y, objs.filter((o): o is Phaser.GameObjects.Text => o !== null));
}

/** Bottom sky hill (decor): a wide ellipse whose crest sits at `topY`. */
export function hill(scene: Phaser.Scene, topY: number): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics();
  g.fillStyle(toInt(TOKENS.sky.top)).fillEllipse(WIDTH / 2, topY + ui(MENU.hill.topDy), ui(MENU.hill.w), ui(MENU.hill.topH));
  g.fillStyle(toInt(TOKENS.sky.bottom)).fillEllipse(WIDTH / 2, topY + ui(MENU.hill.bottomDy), ui(MENU.hill.w), ui(MENU.hill.bottomH));
  return g.setDepth(-1);
}

/** Big green Lilita pill label ("Play", "Go!", "Play again"): swap the P3-0 pill text to the title font (Lilita One is loaded at weight 400 only). */
export function bigLabel(b: { text: Phaser.GameObjects.Text }, sizeMock: number, strokeMock: number): void {
  b.text.setFontFamily(FONT_TITLE).setFontStyle('normal').setFontSize(ui(sizeMock)).setStroke(TOKENS.green.line, ui(strokeMock));
}

// D3-R11 hero on the ray fan: ground shadow, outlined body with highlight, mango with halo, current skin head.
export function snakeHero(scene: Phaser.Scene, cx: number, top: number, wMock: number): { c: Phaser.GameObjects.Container; head: Phaser.GameObjects.Image } {
  const H = D3_HERO, k = d3(wMock) / H.w, x0 = cx - d3(wMock) / 2, at = (x: number, y: number) => ({ x: x0 + x * k, y: top + y * k });
  const d = TOKENS.d3, g = scene.add.graphics();
  const sh = at(H.shadow.x, H.shadow.y);
  g.fillStyle(toInt(d.inkDeep), H.shadow.alpha).fillEllipse(sh.x, sh.y, 2 * H.shadow.rx * k, 2 * H.shadow.ry * k);
  const body = heroBody(H.step);
  for (const [col, w] of [[SKIN_BODY[activeSkin()]?.outline ?? d.outline.snake, H.outlineW], [SKIN_BODY[activeSkin()]?.body ?? d.snake.body, H.bodyW]] as const) {
    g.fillStyle(toInt(col)); for (const p of body) { const q = at(p.x, p.y); g.fillCircle(q.x, q.y, w * k / 2); }
  }
  const hl = heroHighlight(H.step).map(p => at(p.x, p.y)); g.lineStyle(H.hiW * k, toInt(d.white), H.hiAlpha); g.beginPath(); hl.forEach((q, i) => i ? g.lineTo(q.x, q.y) : g.moveTo(q.x, q.y)); g.strokePath();
  const M = H.mango, mc = at(M.x, M.y), s = M.size * k;
  g.fillStyle(toInt(d.white), M.haloAlpha).fillCircle(mc.x, mc.y, M.haloR * s);
  g.fillStyle(toInt(d.outline.mango)).fillEllipse(mc.x, mc.y, 2 * (M.rx + M.line) * s, 2 * (M.ry + M.line) * s);
  g.fillStyle(toInt(d.tone.mango.face[1])).fillEllipse(mc.x, mc.y, 2 * M.rx * s, 2 * M.ry * s);
  g.fillStyle(toInt(d.tone.primary.line)).fillEllipse(mc.x + M.leaf.dx * s, mc.y + M.leaf.dy * s, M.leaf.w * s, M.leaf.h * s);
  const hc = at(H.head.x, H.head.y);
  const head = scene.add.image(hc.x, hc.y, headKey(activeSkin(), 'idle', 'large')).setDisplaySize(H.head.w * k, H.head.w * k);
  return { c: scene.add.container(0, 0, [g, head]), head };
}

/** Width in board (d3) px of a chip holding `text` at `fontMock` with a leading icon and side padding (measured with a throwaway Text). */
export function chipWidthMock(scene: Phaser.Scene, text: string, fontMock: number, o: { padX: number; icon: number; gap: number }): number {
  const probe = scene.add.text(0, 0, text, { fontFamily: FONT_UI, fontStyle: '900', fontSize: `${d3(fontMock)}px` });
  const w = 2 * o.padX + o.icon + o.gap + probe.width / d3(1); probe.destroy(); return w;
}

// D3-R11 butter (secondary tone, or light via opts) chip of a fixed mock size, optional leading icon; static, not tappable.
export function butterChip(scene: Phaser.Scene, cx: number, cy: number, wMock: number, hMock: number, text: string, fontMock: number, icon?: IconId,
  opts: { tone?: 'secondary' | 'light'; textName?: string } = {}): Phaser.GameObjects.Container {
  const sk = opts.tone ?? 'secondary', w = d3(wMock), h = d3(hMock), tone = TOKENS.d3.tone[sk], lip = lipPx('chip', sk, d3(1));
  const host = hostOf(scene), key = (st: SkinState) => skinTexture(host, 'chip', sk, w, h, st, d3(1));
  const tx = scene.add.text(0, 0, text, { fontFamily: FONT_UI, fontStyle: '900', fontSize: `${d3(fontMock)}px`, color: tone.text }).setOrigin(0.5).setName(opts.textName ?? '');
  const parts: Phaser.GameObjects.GameObject[] = [scene.add.image(0, lip, key('lip')), scene.add.image(0, 0, key('rest')), tx];
  if (icon) {
    const ico = d3(fontMock * D3_HOME.chipIconRatio), gap = d3(D3_HOME.chipIconGap), total = ico + gap + tx.width;
    const g = scene.add.graphics().setPosition(-total / 2 + ico / 2, 0); drawIcon(g, icon, ico, toInt(tone.text));
    tx.setX(-total / 2 + ico + gap + tx.width / 2); parts.push(g);
  }
  return scene.add.container(cx, cy, parts).setSize(w, h);
}
