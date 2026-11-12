import { TOKENS, toInt } from '../uiTokens';

// P3b1-R2 board parts from Rock/Tile/FencePiece/FoodIcon/BiomeBoardsD2 (mockup HTML). Pure: no Phaser.
export type RockKind = 'pebble' | 'rock' | 'boulder';
export type Pt = readonly [number, number];

export const PART = {
  rock: { fill: toInt(TOKENS.d3.board.rock.body), shade: toInt(TOKENS.d3.board.rock.shade), hi: toInt(TOKENS.d3.board.rock.hi) },
  wood: { rail: toInt(TOKENS.d3.board.wood.rail), post: toInt(TOKENS.d3.board.wood.post) },
  mud: { fill: toInt(TOKENS.d3.board.mud.fill), puddle: toInt(TOKENS.d3.board.mud.puddle) },
  ice: { fill: toInt(TOKENS.d3.board.ice.fill), shine: toInt(TOKENS.d3.board.ice.shine) },
  stone: { top: toInt(TOKENS.d3.board.stone.top), front: toInt(TOKENS.d3.board.stone.front), warnFill: toInt(TOKENS.d3.board.stone.warnFill), warnDash: toInt(TOKENS.d3.board.stone.warnDash), chevron: toInt(TOKENS.d3.board.stone.chevron) },
  warn: { fill: toInt(TOKENS.d3.board.warn.fill), bang: toInt(TOKENS.d3.board.warn.bang) },
  hedge: { fill: toInt(TOKENS.d3.board.hedge.fill), glow: toInt(TOKENS.d3.board.hedge.glow) },
  /** Movers, cycles, blasts and the shrink ring (greybox shapes keep their geometry; only colours moved to tokens). */
  lane: { fill: toInt(TOKENS.d3.board.lane.fill), coconut: toInt(TOKENS.d3.board.lane.coconut), coconutHi: toInt(TOKENS.d3.board.lane.coconutHi) },
  cat: { body: toInt(TOKENS.d3.board.cat.body), ear: toInt(TOKENS.d3.board.cat.ear) },
  chicken: { body: toInt(TOKENS.d3.board.chicken.body), beak: toInt(TOKENS.d3.board.chicken.beak) },
  shadow: toInt(TOKENS.d3.board.shadow),
  gate: { post: toInt(TOKENS.d3.board.gate.post), bar: toInt(TOKENS.d3.board.gate.bar), warn: toInt(TOKENS.d3.board.gate.warn) },
  spike: { fill: toInt(TOKENS.d3.board.spike.fill), warn: toInt(TOKENS.d3.board.spike.warn) },
  bomb: { body: toInt(TOKENS.d3.board.bomb.body), blast: toInt(TOKENS.d3.board.bomb.blast), digit: toInt(TOKENS.d3.board.bomb.digit), warn: toInt(TOKENS.d3.board.bomb.warn) },
  shrink: { wall: toInt(TOKENS.d3.board.shrink.wall), hatch: toInt(TOKENS.d3.board.shrink.hatch), arrow: toInt(TOKENS.d3.board.shrink.arrow) },
  mango: { body: toInt(TOKENS.d3.board.mango.body), leaf: toInt(TOKENS.d3.board.mango.leaf), shine: toInt(TOKENS.d3.board.mango.shine), halo: toInt(TOKENS.d3.board.mango.halo) },
} as const;

/** Fractions of one cell unless noted. */
// D3-R12 board frame, fractions of one cell.
export const FRAME = { pad: 0.4, radius: 1.3, groundRadius: 0.7, dropY: 0.2, dropAlpha: 0.5, shadowH: 0.5, shadowAlpha: 0.16, shadowRadius: 0.2 } as const;
export const ROCK = { scale: { pebble: 0.5, rock: 0.82, boulder: 0.98 } as Record<RockKind, number>, aspect: 0.92,
  edge: 0.1, band: 0.19, drop: 0.095, dropAlpha: 0.35, hiAlpha: 0.55, hiRotDeg: -20,
  crumbleAlpha: 0.65, previewAlpha: 0.35, crackWidth: 0.075,
  /** Crack polyline in the 20-unit rock box (Rock.dc). */
  crack: [[11, 2], [8.5, 7.5], [12, 10.5], [9, 14.5], [11, 19]] as readonly Pt[],
  /** Debris chips: top-left and side as cell fractions, plus the chip border width share of the crack width. */
  debris: { chips: [{ x: 0.86, y: 0.66, size: 0.2, radius: 0.08 }, { x: 0.02, y: 0.78, size: 0.15, radius: 0.06 }] as readonly { x: number; y: number; size: number; radius: number }[], borderShare: 0.6 } } as const;
/** D3-R2 stroke width of an outline added to a hazard shape that had none, as a cell fraction. */
export const BOARD_EDGE = 0.08;
export const WARN = { ring: 0.1, inset: 0.05, radius: 0.3, tileRadius: 0.285, dash: 0.2, dashWidth: 0.095, chevronWidth: 0.13,
  fillBase: 0.3, fillGain: 0.4, riseFillFloor: 0.3 } as const;
export const FENCE = { rail: 0.2, railHigh: -0.28, railLow: 0.08, postW: 0.4, postH: 0.7, postRadius: 0.15, edge: 0.076, railRadius: 0.04 } as const;
export const TILE = { inset: 1 / 21, radius: 1 / 3, border: 0.095, stoneRadius: 0.2, topShare: 0.68, frontFrom: 0.58, zoneAlpha: 0.3, zoneInset: 0.1, zoneRadius: 0.15,
  /** Mud.dc puddle (fractions of the inset box) and bubbles (centre fractions of the box, radius in cell fractions). */
  mud: { puddle: { w: 0.56, h: 0.4 }, bubbles: [{ x: 0.3, y: 0.36, r: 0.0715 }, { x: 0.55, y: 0.48, r: 0.0475 }] as readonly { x: number; y: number; r: number }[] } } as const;
export const HEDGE = { bar: 0.8, edge: 0.11, glow: 0.12, glowAlpha: 0.22, radius: 0.22, edgeHalf: 0.055 } as const;
export const MANGO = { halo: 0.62, haloAlpha: 0.35, outline: 1.16, shineAlpha: 0.7, shine: { x: -0.3, y: -0.3, w: 0.3, h: 0.18, rotDeg: -35 }, box: 32, fill: 0.92, body: { cx: 16, cy: 18.5, rx: 11.5, ry: 10, rotDeg: -20 },
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

// D3-R12 snake, fractions of one cell (boardSvg: outline 0.96, body 0.76, stripe 0.14, head r 0.7 + 0.1 outline)
export const SNAKE = { body: 0.76, outline: 0.96, stripe: 0.14, stripeAlpha: 0.4, stripeOffset: 0.16, head: 0.7, headOutline: 0.1, belly: 0.26, gulp: 0.18 } as const;
