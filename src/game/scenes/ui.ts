import Phaser from 'phaser';
import type { Session } from '../../session';
import { currentPalette, reduceMotion, type Palette } from '../render/palette';
import { FONT_UI } from '../uiTokens';

// Shared greybox widgets for the P1 menu scenes (Home, Loadout, Results).
export const FONT = FONT_UI;
export const hex = (c: number): string => `#${c.toString(16).padStart(6, '0')}`;

export function label(scene: Phaser.Scene, x: number, y: number, text: string, size: number, name = ''): Phaser.GameObjects.Text {
  return scene.add.text(x, y, text, { fontFamily: FONT, fontSize: `${size}px`, fontStyle: 'bold',
    color: hex(currentPalette().ink) }).setName(name).setOrigin(.5);
}

export interface Button { c: Phaser.GameObjects.Container; g: Phaser.GameObjects.Graphics; text: Phaser.GameObjects.Text; w: number; h: number }

type PressEvent = Phaser.Types.Input.EventData | undefined;
type PressArgs = [pointer: Phaser.Input.Pointer, localX: number, localY: number, event?: Phaser.Types.Input.EventData];
/**
 * Shared press rule: `action` fires on pointerup only if the pointerdown started on this target.
 * Handlers receive the Phaser event data; `stop` calls stopPropagation on down and up so objects below do not react.
 */
export function bindPress(c: Phaser.GameObjects.Container, onPress: (event?: PressEvent) => void,
  onRelease: (event?: PressEvent) => void, action: (event?: PressEvent) => void, stop = false): void {
  let pressed = false;
  c.on('pointerdown', (...[, , , event]: PressArgs) => { if (stop) event?.stopPropagation(); pressed = true; onPress(event); });
  c.on('pointerup', (...[, , , event]: PressArgs) => {
    if (stop) event?.stopPropagation();
    const go = pressed; pressed = false; onRelease(event); if (go) action(event);
  });
  c.on('pointerout', () => { pressed = false; onRelease(); });
}

/** Greybox button: activates on pointerup after a pointerdown on it. */
export function button(scene: Phaser.Scene, x: number, y: number, w: number, h: number, text: string, name: string,
  action: () => void, size = 22): Button {
  const g = scene.add.graphics();
  const t = label(scene, 0, 0, text, size);
  const c = scene.add.container(x, y, [g, t]).setName(name).setSize(w, h).setInteractive({ useHandCursor: true });
  bindPress(c, () => { if (!reduceMotion()) c.setScale(.96); }, () => c.setScale(1), action);
  const b = { c, g, text: t, w, h };
  paintButton(b, currentPalette());
  return b;
}

export function paintButton(b: Button, p: Palette, fill = p.panel, line = 3): void {
  b.g.clear().fillStyle(fill).fillRoundedRect(-b.w / 2, -b.h / 2, b.w, b.h, 12)
    .lineStyle(line, p.ink).strokeRoundedRect(-b.w / 2, -b.h / 2, b.w, b.h, 12);
}

/** P1 scene flow: start a session run, then open Game + Hud (the countdown starts in GameScene). */
export function beginRun(scene: Phaser.Scene, level: number, entry: 'home' | 'results' = 'home', debug = false): void {
  const session = scene.registry.get('session') as Session;
  session.startRun(level, entry, debug);
  scene.scene.start('Game');
  scene.scene.launch('Hud');
}
