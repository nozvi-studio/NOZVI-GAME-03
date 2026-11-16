// src/core/hazards/fixedTerrain.ts - MEC-019 fixed terrain family: live cells of the current template.
import type { Balance } from '../balance';
import { breachCells, diffLayout, layoutFor } from '../fixedTerrain';
import { placeMango } from '../mango';
import { rngFrom } from '../rng';
import type { FixedTerrainCell, HazardFamily, SimSnapshot, SimState, StepCtx } from '../types';
import { reservedByFamilies } from './queries';
import { FAMILIES } from './registry';

const at = (s: SimState, x: number, y: number): FixedTerrainCell | undefined =>
  s.families.fixedTerrain.cells.find(c => c.x === x && c.y === y);

// MEC-019-R3 the start level's layout is solid before the first step (also for a checkpoint start).
export function applyStartTerrain(s: SimState, b: Balance): void {
  if (!b.terrainSet) return;
  const l = layoutFor(b.terrainSet, b, s.level, s.terrainSeed);
  s.families.fixedTerrain = { templateId: l.templateId, variant: l.variant,
    cells: l.tiles.map(c => ({ ...c, state: 'solid' as const, leftMs: 0 })) };
}

// MEC-019-R9 presentation view; the name comes from the template in the balance.
export function fixedTerrainSnapshot(s: SimState, b: Balance): SimSnapshot['fixedTerrain'] {
  const st = s.families.fixedTerrain;
  return { name: b.terrainSet?.templates.find(t => t.id === st.templateId)?.name ?? null, cells: st.cells.map(c => ({ ...c })) };
}

// MEC-019-R5/R8 solid cells kill (cause terrain); every non-crumbling cell is a BFS wall; every cell is reserved.
export const fixedTerrain: HazardFamily = {
  key: 'fixedTerrain', cause: 'terrain', capClass: 'none', maxActiveKey: null, breakable: true,
  spawn: () => null,
  // MEC-019-R4 crumbling cells disappear; a warning cell turns solid when its time is over and the cell is clear (FT-7).
  update(s, ctx) {
    const st = s.families.fixedTerrain;
    if (st.cells.every(c => c.state === 'solid')) return;
    const others = FAMILIES.filter(f => f.key !== 'fixedTerrain');
    st.cells = st.cells.filter(c => {
      if (c.state === 'solid') return true;
      if (c.leftMs > 0) c.leftMs -= 1;
      if (c.leftMs > 0) return true;
      if (c.state === 'crumble') return false;
      if (!ctx.snakeOn(c.x, c.y) && !reservedByFamilies(s, c.x, c.y, others)) c.state = 'solid';
      return true;
    });
  },
  // Intentional no-op: a Shield hit on fixed terrain goes through the breach branch in resolveHeadCell (MEC-019-R6), never the generic branch; onBreak exists only because the registry requires it on every breakable family (MEC-006-R24).
  onBreak() { /* no-op */ },
  snapshot: s => structuredClone(s.families.fixedTerrain),
  solidAt: (s, x, y) => at(s, x, y)?.state === 'solid',
  bfsWallAt: (s, x, y) => { const c = at(s, x, y); return !!c && c.state !== 'crumble'; },
  reservedAt: (s, x, y) => !!at(s, x, y),
  count: s => s.families.fixedTerrain.cells.length,
};

// MEC-019-R4 called from the level-up chain: diff the live cells against the new level's layout.
export function changeTerrain(s: SimState, b: Balance, ctx: StepCtx): void {
  if (!b.terrainSet) return;
  const st = s.families.fixedTerrain, next = layoutFor(b.terrainSet, b, s.level, s.terrainSeed);
  if (next.templateId === st.templateId && next.variant === st.variant) return;
  const live = st.cells.filter(c => c.state !== 'crumble'), d = diffLayout(live, next.tiles);
  const fading = st.cells.filter(c => c.state === 'crumble' && !next.tiles.some(n => n.x === c.x && n.y === c.y));
  st.cells = [...d.keep, ...fading,
    ...d.crumble.map(c => ({ ...c, state: 'crumble' as const, leftMs: b.hazard.crumbleMs })),
    ...d.warn.map(c => ({ ...c, state: 'warn' as const, leftMs: b.fixedTerrain.warnMs }))];
  const fresh = (x: number, y: number) => d.warn.some(c => c.x === x && c.y === y);
  // FT-7 pickups on new cells: orbs and rain mangoes expire, the regular mango is placed again.
  s.orbs = s.orbs.filter(o => { if (!fresh(o.x, o.y)) return true; ctx.emit({ type: 'orbExpired', x: o.x, y: o.y }); return false; });
  s.rainMangoes = s.rainMangoes.filter(m => { if (!fresh(m.x, m.y)) return true; ctx.emit({ type: 'rainMangoExpired', x: m.x, y: m.y }); return false; });
  const m = s.mango, head = s.snake[0]!;
  if (m && fresh(m.x, m.y) && !(m.x === head.x && m.y === head.y)) { // a mango under the head is the one being eaten
    const from = { x: m.x, y: m.y };
    placeMango(s, b, rngFrom(s.rng));
    ctx.emit({ type: 'mangoDisplaced', from, to: s.mango ? { x: s.mango.x, y: s.mango.y } : null });
  }
  ctx.emit({ type: 'terrainChanged', templateId: next.templateId, name: next.name, variant: next.variant, newTemplate: next.templateId !== st.templateId });
  st.templateId = next.templateId; st.variant = next.variant;
}

// MEC-019-R6 Shield on terrain: consume the Shield, break the terrain cells in the area ahead, start invulnerability; no bonk pause.
export function breachTerrain(s: SimState, ctx: StepCtx, x: number, y: number): void {
  const sh = ctx.balance.skills.shield, st = s.families.fixedTerrain;
  const area = breachCells(s.snake[0]!, s.dir, sh.terrainBreach.w, sh.terrainBreach.len);
  const hit = (c: { x: number; y: number }) => area.some(a => a.x === c.x && a.y === c.y);
  const broken = st.cells.filter(c => c.state !== 'crumble' && hit(c)).map(c => ({ x: c.x, y: c.y }));
  st.cells = st.cells.filter(c => c.state === 'crumble' || !hit(c));
  s.shield = null;
  ctx.emit({ type: 'skillEnded', skill: 'shield', reason: 'consumed' });
  ctx.emit({ type: 'shieldBroke', x, y, family: 'fixedTerrain' });
  ctx.emit({ type: 'terrainBreached', cells: broken });
  s.invuln = { leftMs: sh.invulnMs };
  ctx.emit({ type: 'invulnStarted', ms: sh.invulnMs });
}
