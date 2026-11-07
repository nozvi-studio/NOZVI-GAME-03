import Phaser from 'phaser';
import { reduceMotion } from '../render/palette';
import { bindPress, type Button } from '../scenes/ui';
import { FONT_TITLE, FONT_UI, TOKENS, toInt } from '../uiTokens';
import { barFill, pillGeom, pillHitRect } from './geometry';
import { ui } from './layout';

/*
 * Token widget kit (P3-0-R7). All sizes are mockup px (ui() applied inside); colours come from TOKENS.
 * Origins: pillButton x,y = centre of the face (the shelf hangs below); chip x,y = centre; card and progressBar x,y = top-left; titleText x,y = centre.
 *
 * Settings overlay contract (P3b-2 <-> P3b-3): Hud launches `scene.launch('Settings', { overlay: true })`;
 * Settings stops itself on Back and emits `settings-closed` on `game.events`;
 * Hud re-reads settings on that event and on Resume.
 * While the Settings overlay is active, game keyboard input is ignored (bindKeyboard checks the scene manager).
 */

export type PillTone = 'green' | 'orange' | 'cream';
const T = TOKENS;
const TONES: Record<PillTone, { face: string; deep: string; line: string; text: string; stroke: boolean }> = {
  green: { face: T.green.face, deep: T.green.deep, line: T.green.line, text: T.surface.white, stroke: true },
  orange: { face: T.accent.orange, deep: T.accent.orangeDeep, line: T.accent.orangeDeep, text: T.surface.white, stroke: true },
  cream: { face: T.surface.card, deep: T.surface.stone, line: T.text.soft, text: T.text.primary, stroke: false },
};

export function pillButton(scene: Phaser.Scene, x: number, y: number, wMock: number, hMock: number, text: string,
  name: string, action: () => void, tone: PillTone = 'green'): Button {
  const geom = pillGeom(wMock, hMock);
  const tc = TONES[tone];
  const { w, h, radius, shelf } = geom;
  // The shelf stays put; the face and label sink on press.
  const shelfG = scene.add.graphics().fillStyle(toInt(tc.deep)).fillRoundedRect(-w / 2, -h / 2 + shelf, w, h, radius);
  const g = scene.add.graphics()
    .fillStyle(toInt(tc.face)).fillRoundedRect(-w / 2, -h / 2, w, h, radius)
    .lineStyle(ui(2), toInt(tc.line)).strokeRoundedRect(-w / 2, -h / 2, w, h, radius);
  const t = scene.add.text(0, 0, text, {
    fontFamily: FONT_UI, fontSize: `${ui(hMock * 0.4)}px`, fontStyle: '900', color: tc.text,
    stroke: tc.stroke ? tc.line : undefined, strokeThickness: tc.stroke ? geom.labelStroke : 0,
  }).setOrigin(0.5);
  const hit = pillHitRect(geom);
  // Container sized w x h so displayOrigin is the face centre; the custom rect extends over the shelf (see pillHitRect).
  const c = scene.add.container(x, y, [shelfG, g, t]).setName(name).setSize(w, h).setInteractive({
    hitArea: new Phaser.Geom.Rectangle(hit.x, hit.y, hit.w, hit.h), hitAreaCallback: Phaser.Geom.Rectangle.Contains, useHandCursor: true });
  const move = (dy: number): void => { g.setY(dy); t.setY(dy); };
  bindPress(c, () => { if (!reduceMotion()) move(geom.pressedDy); }, () => move(0), action);
  return { c, g, text: t, w, h };
}

export function card(scene: Phaser.Scene, x: number, y: number, wMock: number, hMock: number, radiusMock = 22): Phaser.GameObjects.Graphics {
  const w = ui(wMock), h = ui(hMock), r = ui(radiusMock), sh = T.shadow.card;
  return scene.add.graphics().setPosition(x, y)
    .fillStyle(toInt(sh.color), sh.alpha).fillRoundedRect(0, ui(sh.y), w, h, r)
    .fillStyle(toInt(T.surface.card)).fillRoundedRect(0, 0, w, h, r);
}

export function chip(scene: Phaser.Scene, x: number, y: number, text: string, fill: string, name = ''): Phaser.GameObjects.Container {
  const t = scene.add.text(0, 0, text, { fontFamily: FONT_UI, fontSize: `${ui(13)}px`, fontStyle: '900', color: T.text.primary }).setOrigin(0.5);
  const w = t.width + 2 * ui(10), h = t.height + 2 * ui(4);
  const g = scene.add.graphics().fillStyle(toInt(fill)).fillRoundedRect(-w / 2, -h / 2, w, h, h / 2);
  return scene.add.container(x, y, [g, t]).setName(name).setSize(w, h);
}

export function titleText(scene: Phaser.Scene, x: number, y: number, text: string, sizeMock: number, fill: string = T.surface.white): Phaser.GameObjects.Text {
  return scene.add.text(x, y, text, {
    fontFamily: FONT_TITLE, fontSize: `${ui(sizeMock)}px`, color: fill,
    stroke: T.text.logoOutline, strokeThickness: ui(T.title.strokePx),
  }).setOrigin(0.5).setShadow(0, ui(T.title.shadowY), T.text.logoOutline, 0, true, true);
}

export function progressBar(scene: Phaser.Scene, x: number, y: number, wMock: number, hMock: number, fill: string):
  { g: Phaser.GameObjects.Graphics; set(value: number, max: number): void } {
  const w = ui(wMock), h = ui(hMock);
  const g = scene.add.graphics().setPosition(x, y);
  const set = (value: number, max: number): void => {
    g.clear().fillStyle(toInt(T.surface.sand)).fillRoundedRect(0, 0, w, h, h / 2);
    const fw = barFill(value, max, w);
    if (fw > 0) g.fillStyle(toInt(fill)).fillRoundedRect(0, 0, Math.max(fw, h), h, h / 2);
  };
  set(0, 1);
  return { g, set };
}
