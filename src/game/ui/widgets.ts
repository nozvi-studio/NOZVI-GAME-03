import Phaser from 'phaser';
import { bindPress, type Button } from '../scenes/ui';
import { FONT_TITLE, FONT_UI, TOKENS, toInt } from '../uiTokens';
import { attachFeedback } from './feedback';
import { barFill, pillGeom, pillHitRect } from './geometry';
import { ui } from './layout';
import { PILL_SKIN, type PillTone } from './pillTones';
import { hostOf, lipPx, skinTexture, type SkinKind, type SkinState, type SkinTone } from './skin';
import { edgeAlpha, flashAlpha } from './barEdgeModel';
import { tapBurst } from './touchFx';
import { motionCfgFor } from '../motion';

/*
 * Token widget kit (P3-0-R7). All sizes are mockup px (ui() applied inside); colours come from TOKENS.
 * Origins: pillButton x,y = centre of the face (the lip hangs below); chip x,y = centre; card and progressBar x,y = top-left; titleText x,y = centre.
 *
 * Settings overlay contract (P3b-2 <-> P3b-3): Hud launches `scene.launch('Settings', { overlay: true })`;
 * Settings stops itself on Back and emits `settings-closed` on `game.events`;
 * Hud re-reads settings on that event and on Resume.
 * While the Settings overlay is active, the window keyboard handler (input/keyboard.ts) ignores keys; HudScene's own skill-key handler must also check this (P3b-2).
 */

export { PILL_SKIN, type PillTone } from './pillTones';
const D = TOKENS.d3, S = D.shape;
const LABEL_RATIO = 0.42, LABEL_RATIO_BIG = 0.56, CHIP_FONT = 13, CHIP_PAD_X = 12, CHIP_PAD_Y = 6;

/** D3-R5 image of one skin state, centred at x,y. */
function skinImage(scene: Phaser.Scene, x: number, y: number, kind: SkinKind, tone: SkinTone, w: number, h: number, state: SkinState): Phaser.GameObjects.Image {
  return scene.add.image(x, y, skinTexture(hostOf(scene), kind, tone, w, h, state, ui(1)));
}

// D3-R6/R21/R22 pill button: static lip, face + label dip on press, pressed face texture on pointer down.
export function pillButton(scene: Phaser.Scene, x: number, y: number, wMock: number, hMock: number, text: string,
  name: string, action: () => void, tone: PillTone = 'green', opts: { navigates?: boolean } = {}): Button {
  const skin = PILL_SKIN[tone], tc = D.tone[skin];
  const geom = pillGeom(wMock, hMock, skin === 'primary' ? S.lipBig : S.lip), { w, h } = geom;
  const key = (state: SkinState): string => skinTexture(hostOf(scene), 'button', skin, w, h, state, ui(1));
  const lip = scene.add.image(0, geom.shelf, key('lip'));
  const face = scene.add.image(0, 0, key('rest'));
  const t = scene.add.text(0, 0, text, {
    fontFamily: tc.outlined ? FONT_TITLE : FONT_UI, fontSize: `${ui(hMock * (tc.outlined ? LABEL_RATIO_BIG : LABEL_RATIO))}px`,
    fontStyle: tc.outlined ? '' : '900', color: tc.text,
    stroke: tc.outlined ? tc.line : undefined, strokeThickness: tc.outlined ? geom.labelStroke : 0,
  }).setOrigin(0.5);
  const hit = pillHitRect(geom);
  // Container sized w x h so displayOrigin is the face centre; the custom rect extends over the lip (see pillHitRect).
  const c = scene.add.container(x, y, [lip, face, t]).setName(name).setSize(w, h).setInteractive({
    hitArea: new Phaser.Geom.Rectangle(hit.x, hit.y, hit.w, hit.h), hitAreaCallback: Phaser.Geom.Rectangle.Contains, useHandCursor: true });
  // MOT-1-R5 face and label dip by pressedDy and scale about the face centre (lip static); the hit container is never scaled.
  const fb = attachFeedback(scene, [face, t], 'pill', { source: c, dipPx: geom.pressedDy, navigates: opts.navigates });
  bindPress(c, () => { face.setTexture(key('pressed')); fb.press(); }, () => { face.setTexture(key('rest')); fb.release(); },
    () => fb.fire(() => { tapBurst(scene, c.x, c.y, skin); action(); }));
  return { c, g: face, text: t, w, h, lip };
}

// D3-R6 panel card, origin top-left; the lip hangs below. `radiusMock` is kept for the call signature (one panel radius in D3).
export function card(scene: Phaser.Scene, x: number, y: number, wMock: number, hMock: number, _radiusMock: number = S.radiusPanel): Phaser.GameObjects.Container {
  const w = ui(wMock), h = ui(hMock), lip = lipPx('panel', 'light', ui(1));
  return scene.add.container(x, y, [
    skinImage(scene, w / 2, h / 2 + lip, 'panel', 'light', w, h, 'lip'),
    skinImage(scene, w / 2, h / 2, 'panel', 'light', w, h, 'rest'),
  ]);
}

// D3-R6 chip; `fill` is kept for the call signature and ignored. opts.tone picks the skin (default light; 'mango' = gold New best, D3-R18);
// opts.lead (mock px) reserves room left of the text for an icon the caller draws.
export function chip(scene: Phaser.Scene, x: number, y: number, text: string, _fill: string, name = '', opts: { tone?: SkinTone; lead?: number } = {}): Phaser.GameObjects.Container {
  const tone = opts.tone ?? 'light', lead = ui(opts.lead ?? 0);
  const t = scene.add.text(0, 0, text, { fontFamily: FONT_UI, fontSize: `${ui(CHIP_FONT)}px`, fontStyle: '900', color: D.text }).setOrigin(0.5);
  const w = t.width + lead + 2 * ui(CHIP_PAD_X), h = t.height + 2 * ui(CHIP_PAD_Y), lip = lipPx('chip', tone, ui(1));
  t.setX(lead / 2);
  return scene.add.container(x, y, [
    skinImage(scene, 0, lip, 'chip', tone, w, h, 'lip'), skinImage(scene, 0, 0, 'chip', tone, w, h, 'rest'), t,
  ]).setName(name).setSize(w, h);
}

// D3-R1 display type: white Lilita One, deep ink outline and drop.
export function titleText(scene: Phaser.Scene, x: number, y: number, text: string, sizeMock: number, fill: string = D.white): Phaser.GameObjects.Text {
  return scene.add.text(x, y, text, {
    fontFamily: FONT_TITLE, fontSize: `${ui(sizeMock)}px`, color: fill,
    stroke: D.inkDeep, strokeThickness: ui(TOKENS.title.strokePx),
  }).setOrigin(0.5).setShadow(0, ui(TOKENS.title.shadowY), D.inkDeep, 0, true, true);
}

// D3-R6 / D4-P5-R2 bar: flat rounded vector bar when opts.flat is set, else D3 skin image bar.
export function progressBar(scene: Phaser.Scene, x: number, y: number, wMock: number, hMock: number, fill: string,
  opts?: { flat?: { track: string; fill: string; border?: string } }):
  { g: Phaser.GameObjects.Container; set(value: number, max: number): void; edge(now: number): void; flash(now: number): void } {
  const w = ui(wMock), h = ui(hMock), pad = opts?.flat ? ui(2) : ui(S.line), fw = w - 2 * pad, fh = h - 2 * pad;
  const cfg = scene.registry.get('balance') ? motionCfgFor(scene) : null;
  const flashG = scene.add.graphics().setAlpha(0);
  flashG.fillStyle(toInt(D.white), 1).fillRoundedRect(pad, pad, fw, fh, fh / 2);

  if (opts?.flat) {
    const f = opts.flat;
    const trackG = scene.add.graphics();
    trackG.fillStyle(toInt(f.track), 1).fillRoundedRect(0, 0, w, h, h / 2);
    if (f.border) trackG.lineStyle(ui(1.5), toInt(f.border), 1).strokeRoundedRect(0, 0, w, h, h / 2);
    const fillG = scene.add.graphics();
    const g = scene.add.container(x, y, [trackG, fillG, flashG]);
    let flashAt = -1;
    const set = (value: number, max: number): void => {
      const px = barFill(value, max, fw);
      fillG.clear();
      if (px > 0) fillG.fillStyle(toInt(f.fill), 1).fillRoundedRect(pad, pad, Math.max(fh, px), fh, fh / 2);
    };
    const edge = (now: number): void => {
      if (!cfg || flashAt < 0) return;
      const a = flashAlpha(now - flashAt, cfg.d3.flashMs);
      flashG.setAlpha(a);
      if (a === 0) flashAt = -1;
    };
    const flash = (now: number): void => { if (!cfg) return; flashAt = now; flashG.setAlpha(1); };
    set(0, 1);
    return { g, set, edge, flash };
  }

  const tone: SkinTone = toInt(fill) === toInt(D.tone.energy.face[0]) || toInt(fill) === toInt(TOKENS.sky.energy) ? 'energy' : 'mango';
  const track = skinImage(scene, w / 2, h / 2, 'bar', 'track', w, h, 'rest');
  const fillImg = skinImage(scene, w / 2, h / 2, 'bar', tone, fw, fh, 'rest');
  const edgeW = cfg ? ui(cfg.d3.edgePx) : 0;
  const edgeG = scene.add.graphics().setAlpha(0);
  edgeG.fillStyle(toInt(D.white), 1).fillRect(0, 0, edgeW, fh); edgeG.setPosition(pad, pad);
  const g = scene.add.container(x, y, [track, fillImg, flashG, edgeG]);
  let lastPx = -1, movedAt = -1e9, flashAt = -1, edgeLit = false, curPx = 0;
  const set = (value: number, max: number): void => {
    const px = barFill(value, max, fw);
    fillImg.setVisible(px > 0);
    if (px > 0) fillImg.setCrop(0, 0, px, fh);
    if (px !== lastPx) { if (lastPx >= 0) movedAt = scene.time.now; lastPx = px; curPx = px; edgeG.setX(pad + Math.max(0, px - edgeW)); }
  };
  const edge = (now: number): void => {
    if (!cfg) return;
    if (flashAt >= 0) { const a = flashAlpha(now - flashAt, cfg.d3.flashMs); flashG.setAlpha(a); if (a === 0) flashAt = -1; }
    if (curPx > 0 && now - movedAt <= cfg.fadeMs) { edgeG.setAlpha(edgeAlpha(now - movedAt, cfg.d3, cfg.fadeMs)); edgeLit = true; }
    else if (edgeLit) { edgeG.setAlpha(0); edgeLit = false; }
  };
  const flash = (now: number): void => { if (!cfg) return; flashAt = now; flashG.setAlpha(1); };
  set(0, 1);
  return { g, set, edge, flash };
}
