import type Phaser from 'phaser';
// P3b3-R14 small glyphs for menu buttons and cards, drawn with Graphics primitives (replaces the mockup SVGs).
export const ICON_IDS = ['back', 'sliders', 'lock', 'bolt', 'flag', 'home', 'slowmo', 'tailSnip', 'shield', 'mangoRain', 'sound', 'haptics', 'dpad', 'motion'] as const;
export type IconId = typeof ICON_IDS[number];
type G = Pick<Phaser.GameObjects.Graphics, 'fillStyle' | 'lineStyle' | 'fillCircle' | 'strokeCircle' | 'fillRoundedRect' | 'fillTriangle' | 'lineBetween' | 'beginPath' | 'moveTo' | 'lineTo' | 'strokePath' | 'closePath' | 'fillPath'>;

/** Draws `id` centred on (0,0) inside a `size` box. */
export function drawIcon(g: G, id: IconId, size: number, color: number): void {
  const u = size / 24, w = 2.4 * u;
  g.fillStyle(color); g.lineStyle(w, color);
  const poly = (pts: number[][], fill: boolean): void => {
    g.beginPath(); g.moveTo(pts[0]![0]! * u, pts[0]![1]! * u);
    for (const p of pts.slice(1)) g.lineTo(p[0]! * u, p[1]! * u);
    g.closePath(); if (fill) g.fillPath(); else g.strokePath();
  };
  switch (id) {
    case 'back': g.beginPath(); g.moveTo(3 * u, -8 * u); g.lineTo(-5 * u, 0); g.lineTo(3 * u, 8 * u); g.strokePath(); break;
    case 'sliders':
      g.lineBetween(-8 * u, -5 * u, 1 * u, -5 * u); g.lineBetween(7 * u, -5 * u, 8 * u, -5 * u);
      g.lineBetween(-8 * u, 5 * u, -7 * u, 5 * u); g.lineBetween(-1 * u, 5 * u, 8 * u, 5 * u);
      g.strokeCircle(4 * u, -5 * u, 2.4 * u); g.strokeCircle(-4 * u, 5 * u, 2.4 * u); break;
    case 'lock': g.fillRoundedRect(-7 * u, -2 * u, 14 * u, 11 * u, 3 * u); g.strokeCircle(0, -4 * u, 4 * u); break;
    case 'bolt': poly([[2, -10], [-6, 2], [0, 2], [-2, 10], [6, -3], [0, -3]], true); break;
    case 'flag': g.lineBetween(-5 * u, -10 * u, -5 * u, 10 * u); g.fillTriangle(-5 * u, -10 * u, 8 * u, -5 * u, -5 * u, 1 * u); break;
    case 'home': g.fillTriangle(-10 * u, -1 * u, 0, -10 * u, 10 * u, -1 * u); g.fillRoundedRect(-7 * u, -1 * u, 14 * u, 10 * u, 2 * u); break;
    case 'slowmo': g.strokeCircle(0, 0, 9 * u); g.lineBetween(0, 0, 0, -6 * u); g.lineBetween(0, 0, 5 * u, 2 * u); break;
    case 'tailSnip':
      g.lineBetween(-8 * u, -7 * u, 8 * u, 7 * u); g.lineBetween(-8 * u, 7 * u, 8 * u, -7 * u);
      g.strokeCircle(-8 * u, -7 * u, 2.5 * u); g.strokeCircle(-8 * u, 7 * u, 2.5 * u); break;
    case 'shield': poly([[0, -10], [8, -6], [7, 3], [0, 10], [-7, 3], [-8, -6]], true); break;
    case 'mangoRain': g.fillCircle(-6 * u, -5 * u, 3 * u); g.fillCircle(5 * u, -2 * u, 3 * u); g.fillCircle(-1 * u, 6 * u, 3 * u); break;
    case 'sound':
      g.fillTriangle(-4 * u, -4 * u, -4 * u, 4 * u, -10 * u, 0); g.fillRoundedRect(-10 * u, -3 * u, 5 * u, 6 * u, 1 * u);
      g.lineBetween(2 * u, -5 * u, 5 * u, -8 * u); g.lineBetween(3 * u, 0, 9 * u, 0); g.lineBetween(2 * u, 5 * u, 5 * u, 8 * u); break;
    case 'haptics': g.fillRoundedRect(-4 * u, -8 * u, 8 * u, 16 * u, 2 * u); g.lineBetween(-8 * u, -4 * u, -8 * u, 4 * u); g.lineBetween(8 * u, -4 * u, 8 * u, 4 * u); break;
    case 'dpad': g.fillRoundedRect(-3 * u, -9 * u, 6 * u, 18 * u, 2 * u); g.fillRoundedRect(-9 * u, -3 * u, 18 * u, 6 * u, 2 * u); break;
    case 'motion': g.strokeCircle(0, 0, 8.5 * u); g.beginPath(); g.moveTo(0, -4.5 * u); g.lineTo(0, 0); g.lineTo(3 * u, 2 * u); g.strokePath(); break;
  }
}
