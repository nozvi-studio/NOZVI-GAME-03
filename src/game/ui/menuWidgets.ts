import Phaser from 'phaser';
import { WIDTH } from '../layout';
import { TOKENS, toInt, FONT_TITLE } from '../uiTokens';
import { drawIcon, type IconId } from './icons';
import { ui, type ColumnLayout } from './layout';
import { logoLetters } from './menuLayout';
import { MENU } from './menuMetrics';
import { titleText } from './widgets';

// Menu-only widgets (P3b3). Origin convention follows the P3-0 kit: pills and chips are centred, cards and bars are top-left.

/** Container for the middle block: local x centred on WIDTH/2, local y 0 = top of the block, uniformly scaled (spec D2). */
export function scaledBlock(scene: Phaser.Scene, l: ColumnLayout): Phaser.GameObjects.Container {
  return scene.add.container(WIDTH / 2 * (1 - l.middleScale), l.middleY).setScale(l.middleScale);
}
export function bgCream(scene: Phaser.Scene): void { scene.cameras.main.setBackgroundColor(toInt(TOKENS.surface.cream)); }

/** Press-and-release hit zone (same rule as the greybox `button`): fires only if the press started on it. */
export function tap(scene: Phaser.Scene, x: number, y: number, w: number, h: number, name: string, action: () => void): Phaser.GameObjects.Zone {
  const z = scene.add.zone(x, y, w, h).setName(name).setInteractive({ useHandCursor: true });
  let down = false;
  z.on('pointerdown', () => { down = true; });
  z.on('pointerup', () => { const go = down; down = false; if (go) action(); });
  z.on('pointerout', () => { down = false; });
  return z;
}

/** Round white icon button (back, sliders, home), optional blue shelf for the footer variant. */
export function roundIconButton(scene: Phaser.Scene, x: number, y: number, diameterMock: number, icon: IconId, name: string,
  action: () => void, shelf = false): Phaser.GameObjects.Container {
  const d = ui(diameterMock), g = scene.add.graphics();
  if (shelf) g.fillStyle(toInt(TOKENS.sky.bottom), MENU.widgets.shelfAlpha).fillCircle(0, ui(MENU.widgets.shelfDy), d / 2);
  else g.fillStyle(toInt(TOKENS.shadow.card.color), TOKENS.shadow.card.alpha).fillCircle(0, ui(TOKENS.shadow.card.y), d / 2);
  g.fillStyle(toInt(TOKENS.surface.card)).fillCircle(0, 0, d / 2);
  const ic = scene.add.graphics(); drawIcon(ic, icon, d * MENU.widgets.iconRatio, toInt(TOKENS.text.primary));
  const c = scene.add.container(x, y, [g, ic]).setName(name);
  tap(scene, x, y, d, d, `${name}-hit`, action);
  return c;
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
