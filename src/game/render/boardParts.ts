import { toInt } from '../uiTokens';

// P3b1-R2 board parts from Rock/Tile/FencePiece/FoodIcon/BiomeBoardsD2 (mockup HTML). Pure: no Phaser.
export type RockKind = 'pebble' | 'rock' | 'boulder';
export type Pt = readonly [number, number];

export const PART = {
  rock: { fill: toInt('#9AA3B8'), shade: toInt('#6B7490') },
  wood: { rail: toInt('#E3AC6D'), post: toInt('#CF9150') },
  mud: { fill: toInt('#B8956A'), puddle: toInt('#8F6F43') },
  ice: { fill: toInt('#9ED8F2'), shine: toInt('#B8E5F7') },
  stone: { top: toInt('#EDEFF4'), front: toInt('#A9B0C0'), warnFill: toInt('#D3D7E0'), warnDash: toInt('#FF9A1F'), chevron: toInt('#B35F00') },
  warn: { fill: toInt('#FF6B5B'), dash: toInt('#E5483A'), bang: toInt('#B3261E') },
  hedge: { fill: toInt('#4FBF7A'), edge: toInt('#FFFFFF'), glow: toInt('#7CF2D4') },
  mango: { body: toInt('#FFA21A'), leaf: toInt('#2E9E4F'), hi: toInt('#FFD27A') },
} as const;

/** Fractions of one cell unless noted. */
export const ROCK = { scale: { pebble: 0.5, rock: 0.82, boulder: 0.98 } as Record<RockKind, number>, aspect: 0.92,
  edge: 0.1, band: 0.19, drop: 0.095, dropAlpha: 0.35, hiColor: 0xffffff, hiAlpha: 0.55, hiRotDeg: -20,
  crumbleAlpha: 0.65, previewAlpha: 0.35, crackWidth: 0.075,
  /** Crack polyline in the 20-unit rock box (Rock.dc). */
  crack: [[11, 2], [8.5, 7.5], [12, 10.5], [9, 14.5], [11, 19]] as readonly Pt[],
  /** Debris chips: top-left and side as cell fractions, plus the chip border width share of the crack width. */
  debris: { chips: [{ x: 0.86, y: 0.66, size: 0.2, radius: 0.08 }, { x: 0.02, y: 0.78, size: 0.15, radius: 0.06 }] as readonly { x: number; y: number; size: number; radius: number }[], borderShare: 0.6 } } as const;
export const WARN = { ring: 0.1, inset: 0.05, radius: 0.3, tileRadius: 0.285, dash: 0.2, dashWidth: 0.095, chevronWidth: 0.13,
  fillBase: 0.3, fillGain: 0.4, riseFillFloor: 0.3 } as const;
export const FENCE = { rail: 0.2, railHigh: -0.28, railLow: 0.08, postW: 0.4, postH: 0.7, postRadius: 0.15, edge: 0.076, railRadius: 0.04 } as const;
export const TILE = { inset: 1 / 21, radius: 1 / 3, border: 0.095, stoneRadius: 0.2, topShare: 0.68, frontFrom: 0.58, zoneAlpha: 0.3, zoneInset: 0.1, zoneRadius: 0.15,
  /** Mud.dc puddle (fractions of the inset box) and bubbles (centre fractions of the box, radius in cell fractions). */
  mud: { puddle: { w: 0.56, h: 0.4 }, bubbles: [{ x: 0.3, y: 0.36, r: 0.0715 }, { x: 0.55, y: 0.48, r: 0.0475 }] as readonly { x: number; y: number; r: number }[] } } as const;
export const HEDGE = { bar: 0.8, edge: 0.11, glow: 0.12, glowAlpha: 0.22, radius: 0.22, edgeHalf: 0.055 } as const;
export const GRID_LINE = 0.1;
export const MANGO = { box: 32, fill: 0.92, body: { cx: 16, cy: 18.5, rx: 11.5, ry: 10, rotDeg: -20 },
  hi: { p: [[8.5, 16], [9.5, 13], [11.7, 11], [14.7, 10.4]] as readonly Pt[], width: 2.4 },
  leaf: [[[16, 9], [17, 4.5], [21.5, 2.5], [26, 3.5]], [[26, 3.5], [25.4, 8.1], [21, 10.7], [16, 9]]] as readonly (readonly Pt[])[] } as const;

/** P3b1-R2 shape id of each warning kind; every warn state is drawn with its shape, not only a colour. */
export const WARN_SHAPES = { hazard: 'bang', rise: 'chevron', mud: 'drop', ice: 'snowflake' } as const;
export type WarnKind = keyof typeof WARN_SHAPES;

/** P3b1-R2 rock body metrics for a cell of `size` px (Rock.dc). dx/dy locate the highlight centre from the rock centre. */
export function rockMetrics(kind: RockKind, size: number) {
  const d = size * ROCK.scale[kind], h = d * ROCK.aspect;
  return { d, h, edge: size * ROCK.edge, band: size * ROCK.band, drop: size * ROCK.drop,
    hl: { dx: -0.15 * d, dy: -0.26 * h, w: 0.3 * d, h: 0.16 * d, rot: (ROCK.hiRotDeg * Math.PI) / 180 } };
}

/** P3b1-R2 "!" drawn as a rounded bar plus a dot, centred in a cell, offsets from the cell top-left. */
export function bangGeometry(cell: number) {
  const w = cell * 0.11, h = cell * 0.34, top = cell * 0.5 - cell * 0.3;
  return { bar: { x: cell / 2 - w / 2, y: top, w, h, r: w / 2 }, dot: { x: cell / 2, y: top + h + cell * 0.1, r: cell * 0.06 } };
}

/** P3b1-R2 rise-warn chevron `M4 12l6-6 6 6` scaled from the 20 px icon box to the cell. */
export function chevronPoints(cell: number): [Pt, Pt, Pt] {
  const s = cell / 20;
  return [[4 * s, 12 * s], [10 * s, 6 * s], [16 * s, 12 * s]];
}

/** P3b1-R2 hedge bars: one inset bar per cell plus a connector towards the right/lower neighbour. */
export function hedgeRects(cells: readonly { x: number; y: number; k: number }[], cell: number): { x: number; y: number; w: number; h: number }[] {
  const has = new Set(cells.map(c => `${c.x},${c.y}`)), out: { x: number; y: number; w: number; h: number }[] = [];
  for (const c of cells) {
    const bar = cell * HEDGE.bar * c.k, cx = (c.x + 0.5) * cell, cy = (c.y + 0.5) * cell;
    out.push({ x: cx - bar / 2, y: cy - bar / 2, w: bar, h: bar });
    if (has.has(`${c.x + 1},${c.y}`)) out.push({ x: cx, y: cy - bar / 2, w: cell, h: bar });
    if (has.has(`${c.x},${c.y + 1}`)) out.push({ x: cx - bar / 2, y: cy, w: bar, h: cell });
  }
  return out;
}

/** P3b1-R2 sample a cubic Bezier into n + 1 points. */
export function cubic(p0: Pt, p1: Pt, p2: Pt, p3: Pt, n: number): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, u = 1 - t, a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t;
    out.push([a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0], a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1]]);
  }
  return out;
}

/** P3b1-R2 FoodIcon leaf outline `M16 9c1-4.5 5.5-6.5 10-5.5-.6 4.6-5 7.2-10 5.5z` as a polygon (shared joint dropped). */
export function mangoLeaf(): Pt[] {
  const [a, b] = MANGO.leaf as readonly [readonly Pt[], readonly Pt[]];
  return [...cubic(a[0]!, a[1]!, a[2]!, a[3]!, 8), ...cubic(b[0]!, b[1]!, b[2]!, b[3]!, 8).slice(1)];
}
