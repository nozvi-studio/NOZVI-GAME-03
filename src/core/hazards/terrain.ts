// src/core/hazards/terrain.ts — MEC-004 rising ground (spawnTerrain L508–530, updateTerrains L578–597)
import { defineFamily } from './family';
import type { Balance } from '../balance';
import type { InstanceRules, TerrainCell, TerrainHazard, TerrainVis } from '../types';

type Raw = { x: number; y: number; delay: number };

// MEC-004 wanted state of one cell at T.t, before the snake check
export function terrainWant(T: TerrainHazard, c: TerrainCell, b: Balance): TerrainVis {
  const tr = b.terrain;
  if (T.t >= T.lifeMs) return 'down';
  const ct = T.t - tr.startDelayMs - c.delay;
  if (ct < 0) return 'down';
  const l = ct % tr.periodMs, downMs = tr.periodMs - tr.upMs - tr.warnMs;
  return l < downMs ? 'down' : l < downMs + tr.warnMs ? 'warn' : 'up';
}

const rules: InstanceRules<TerrainHazard> = {
  key: 'terrain', cause: 'ground', capClass: 'big', maxActiveKey: 'terrain.maxActive', breakable: true,
  // MEC-006-R26 the broken cell leaves this terrain for the rest of its life.
  onBreak(s, x, y) {
    for (const T of s.families.terrain) if (T.cells.some(c => c.up && c.x === x && c.y === y)) T.cells = T.cells.filter(c => c.x !== x || c.y !== y);
  },
  // MEC-004-R10-R12 terrain reserves cells but adds no BFS walls.
  spawn(ctx, rng, s) {
    const b = ctx.balance, tr = b.terrain, { cols, rows } = b.board;
    for (let i = 0; i < tr.tries; i++) {
      let cells: Raw[] = [];
      if (rng.chance(tr.waveChance)) {
        const horiz = rng.chance(tr.horizChance), len = tr.waveLenMin + rng.int(tr.waveLenRand);
        const ox = rng.int(horiz ? cols - len + 1 : cols - tr.waveWidth + 1);
        const oy = rng.int(horiz ? rows - tr.waveWidth + 1 : rows - len + 1);
        for (let a = 0; a < len; a++) for (let w = 0; w < tr.waveWidth; w++)
          cells.push({ x: horiz ? ox + a : ox + w, y: horiz ? oy + w : oy + a, delay: a * tr.waveDelayMs });
      } else {
        const n = tr.checkerSize, ox = rng.int(cols - n + 1), oy = rng.int(rows - n + 1);
        for (let a = 0; a < n; a++) for (let w = 0; w < n; w++)
          cells.push({ x: ox + a, y: oy + w, delay: ((a + w) % 2) * (tr.periodMs / 2) });
      }
      cells = cells.filter(c => ctx.cellFree(c.x, c.y, b.fairness.terrainNearHeadDist));
      if (cells.length >= tr.minCells && ctx.candidateValid(s, cells, { nearDist: b.fairness.terrainNearHeadDist, wallCells: [] }))
        return { family: 'terrain', t: 0, lifeMs: tr.lifeMs + rng.next() * tr.lifeRandMs,
                 cells: cells.map(c => ({ ...c, up: false, vis: 'down' as const })) };
    }
    return null;
  },
  update(T, ctx) {
    T.t += 1;
    for (const c of T.cells) {
      let want = terrainWant(T, c, ctx.balance);
      if (want === 'up' && !c.up && ctx.snakeOn(c.x, c.y)) want = 'warn';   // wait for the snake to pass
      c.up = want === 'up';
      c.vis = want;
    }
    return T.t < T.lifeMs + ctx.balance.terrain.fadeOutMs ? 'keep' : 'remove';
  },
  solidAt: (T, x, y) => T.cells.some(c => c.up && c.x === x && c.y === y),
  bfsWallAt: () => false,                                             // L373: terrain is not a BFS wall
  reservedAt: (T, x, y) => T.cells.some(c => c.x === x && c.y === y),
};

// MEC-004-R2 compose state queries and updates over this family's own instances.
export const TERRAIN = defineFamily('terrain', rules, s => s.families.terrain, (s, instances) => { s.families.terrain = instances; });
