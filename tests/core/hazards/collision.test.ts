import { describe, it, expect } from 'vitest';
import { resolveHeadCell, applyHeadHit, deathContext } from '../../../src/core/hazards/collision';
import { __setFamiliesForTest, FAMILIES } from '../../../src/core/hazards/registry';
import { headHitAt, solidFamilyWithPriority } from '../../../src/core/hazards/queries';
import { addTimedHazards, makeTimed } from '../../../src/core/hazards/timed';
import { effectiveTick } from '../../../src/core/skills';
import { stepSnake } from '../../../src/core/snake';
import { exportState, simFromState } from '../../../src/core/sim';
import { rngFrom } from '../../../src/core/rng';
import type { HazardFamily, TileKind } from '../../../src/core/types';
import { buildBoard } from '../../support/board';
import { fakeFamily, withFamilies, hitCtx } from '../../support/fakeFamily';
import { loadBalance } from '../../support/balance';

const b = loadBalance();

describe('MEC-004 collision', () => {
  const perCellCauses = [
    { key: 'gate', cause: 'gate', cellCause: 'fence', expected: 'fence' },
    { key: 'npc', cause: 'cat', cellCause: 'chicken', expected: 'chicken' },
    { key: 'gate', cause: 'gate', cellCause: null, expected: 'gate' },
  ] as const;

  it.each(perCellCauses)('MEC-004-R6 MEC-014-R4 MEC-015-R7 head entry uses causeAt with fallback: $key/$cellCause', ({ key, cause, cellCause, expected }) => {
    for (const solid of [true, false]) {
      const s = buildBoard({ head: [4, 8] });
      const f = { ...fakeFamily({ key, cause, ...(solid ? { solid: [[5, 8]] } : { hit: { kind: 'mover', cells: [[5, 8]] } }) }),
        causeAt: () => cellCause };
      const previous = FAMILIES;
      __setFamiliesForTest([f]);
      try {
        expect(resolveHeadCell(s, 5, 8, hitCtx(s))).toEqual({ kind: 'death', cause: expected });
        stepSnake(s, b, rngFrom(s.rng));
        expect(s.outcome).toEqual({ won: false, cause: expected });
        expect(s.events).toEqual([{ type: 'died', cause: expected, x: 4, y: 8 }]);
      } finally { __setFamiliesForTest(previous); }
    }
  });

  it.each(perCellCauses)('MEC-004-R8 MEC-014-R4 MEC-015-R7 update-time hit uses causeAt with fallback: $key/$cellCause', ({ key, cause, cellCause, expected }) => {
    const s = buildBoard({ head: [4, 8] }), ctx = hitCtx(s);
    const f = { ...fakeFamily({ key, cause }), causeAt: () => cellCause };
    const previous = FAMILIES;
    __setFamiliesForTest([f]);
    try {
      applyHeadHit(s, ctx, key, 4, 8, 'mover', { x: 1, y: 0 });
      expect(s.outcome).toEqual({ won: false, cause: expected });
      expect(ctx.events).toEqual([{ type: 'died', cause: expected, x: 4, y: 8 }]);
    } finally { __setFamiliesForTest(previous); }
  });

  it('MEC-004-R6 headHit cell kills with the family cause; shield breaks a breakable one', () => {
    const s = buildBoard({ head: [4, 8] });
    withFamilies(s, [{ key: 'rock', cause: 'rock', hit: { kind: 'mover', cells: [[5, 8]] }, breakable: true }], () => {
      const ctx = hitCtx(s);
      expect(resolveHeadCell(s, 5, 8, ctx)).toEqual({ kind: 'death', cause: 'rock' });
      expect(s.status).toBe('playing'); // The caller owns snake-step death.
      s.shield = { leftMs: 5000 };
      expect(resolveHeadCell(s, 5, 8, ctx)).toEqual({ kind: 'broke', family: 'rock' });
      expect(s.shield).toBeNull();
      expect(headHitAt(s, 5, 8)).toBeNull();
      expect(ctx.events).toEqual([
        { type: 'skillEnded', skill: 'shield', reason: 'consumed' },
        { type: 'shieldBroke', x: 5, y: 8, family: 'rock', rubble: { x: 6, y: 8 } },
      ]);
    });
  });

  it('MEC-004-R6 solid stage wins over headHit and preserves rotten-rock priority', () => {
    const s = buildBoard({ head: [4, 8] });
    withFamilies(s, [
      { key: 'rock', cause: 'rock', solid: [[5, 8]], hit: { kind: 'area', cells: [[5, 8]] } },
      { key: 'rottenRock', cause: 'rotten', solid: [[5, 8]] },
    ], () => {
      s.shield = { leftMs: 5000 };
      expect(resolveHeadCell(s, 5, 8, hitCtx(s))).toEqual({ kind: 'death', cause: 'rotten' });
      expect(s.shield).not.toBeNull();
    });
  });

  it('MEC-004 edge case 4 shield breaks only the selected family cell', () => {
    for (const [firstKey, secondKey, selectedIndex] of [
      ['snipWall', 'rock', 0],
      ['rock', 'rottenRock', 1],
    ] as const) {
      const s = buildBoard({ head: [4, 8], dir: [1, 0] });
      s.shield = { leftMs: 5000 };
      withFamilies(s, [firstKey, secondKey].map(key => ({
        key, cause: key === 'rottenRock' ? 'rotten' : key,
        solid: [[5, 8]] as [number, number][], breakable: true,
      })), () => {
        const selected = FAMILIES[selectedIndex]!;
        const other = FAMILIES[selectedIndex === 0 ? 1 : 0]!;
        expect(selected.solidAt(s, 5, 8)).toBe(true);
        expect(other.solidAt(s, 5, 8)).toBe(true);

        stepSnake(s, b, rngFrom(s.rng));

        expect(s.status).toBe('playing');
        expect(s.snake[0]).toEqual({ x: 5, y: 8 });
        expect(selected.solidAt(s, 5, 8)).toBe(false);
        expect(other.solidAt(s, 5, 8)).toBe(true);
        expect(s.shield).toBeNull();
        expect(s.events).toEqual([
          { type: 'skillEnded', skill: 'shield', reason: 'consumed' },
          { type: 'shieldBroke', x: 5, y: 8, family: selected.key, rubble: { x: 6, y: 8 } },
        ]);
      });
    }
  });

  it.each([
    { name: 'wall', head: [16, 8] as [number, number], body: undefined },
    { name: 'self', head: [4, 8] as [number, number], body: [[5, 8], [5, 9], [4, 9]] as [number, number][] },
  ])('MEC-004-R6 wall and self are checked before the solid stage: $name', ({ name, head, body }) => {
    const s = buildBoard({ head, body });
    s.shield = { leftMs: 5000 };
    withFamilies(s, [{ key: 'rock', cause: 'rock', solid: [[head[0] + 1, head[1]]], breakable: true }], () => {
      stepSnake(s, b, rngFrom(s.rng));
      expect(s.outcome).toEqual({ won: false, cause: name });
      expect(s.shield).toEqual({ leftMs: 5000 });
      expect(s.events).toEqual([{ type: 'died', cause: name, x: head[0], y: head[1] }]);
    });
  });

  it('MEC-004-R6 warning cells are passable', () => {
    const s = buildBoard({ head: [4, 8] });
    addTimedHazards(s, makeTimed('rock', [{ x: 5, y: 8 }], b.rock.warnMs, b.rock.lifeMs));
    s.shield = { leftMs: 5000 };
    expect(resolveHeadCell(s, 5, 8, hitCtx(s))).toEqual({ kind: 'clear' });
    expect(s.shield).toEqual({ leftMs: 5000 });
  });

  it('MEC-004-R6 shield breaks a solid and the snake moves in normally', () => {
    const s = buildBoard({ head: [4, 8], walls: [[5, 8]] });
    s.shield = { leftMs: 5000 };
    stepSnake(s, b, rngFrom(s.rng));
    expect(s.snake[0]).toEqual({ x: 5, y: 8 });
    expect(s.status).toBe('playing');
    expect(solidFamilyWithPriority(s, 5, 8)).toBeNull();
    expect(s.acc).toBe(-3 * effectiveTick(s, b));
  });

  it('MEC-004-R8 area hit consumes shield without bonk or rubble', () => {
    const s = buildBoard({ head: [4, 8] });
    s.shield = { leftMs: 5000 };
    s.acc = 37;
    const ctx = hitCtx(s);
    applyHeadHit(s, ctx, 'rock', 4, 8, 'area', { x: 1, y: 0 });
    expect(s.status).toBe('playing');
    expect(s.shield).toBeNull();
    expect(s.families.rubble).toEqual([]);
    expect(s.acc).toBe(37);
    expect(ctx.events).toEqual([
      { type: 'skillEnded', skill: 'shield', reason: 'consumed' },
      { type: 'shieldBroke', x: 4, y: 8, family: 'rock', rubble: null },
    ]);
  });

  it('MEC-004-R6 area entry absorbs once even for an unbreakable family, with no onBreak', () => {
    const s = buildBoard({ head: [4, 8] });
    withFamilies(s, [{ key: 'rock', cause: 'rock', hit: { kind: 'area', cells: [[5, 8]] } }], () => {
      s.shield = { leftMs: 5000 };
      const ctx = hitCtx(s);
      expect(resolveHeadCell(s, 5, 8, ctx)).toEqual({ kind: 'absorbed', family: 'rock' });
      expect(headHitAt(s, 5, 8)?.kind).toBe('area');
      expect(s.families.rubble).toEqual([]);
      expect(s.acc).toBe(0);
      expect(resolveHeadCell(s, 5, 8, ctx)).toEqual({ kind: 'death', cause: 'rock' });
    });
  });

  it('MEC-004-R8 mover hit without shield ends the run with the family cause', () => {
    const s = buildBoard({ head: [4, 8] }), ctx = hitCtx(s);
    applyHeadHit(s, ctx, 'rock', 4, 8, 'mover', { x: 1, y: 0 });
    expect(s.status).toBe('over');
    expect(s.outcome).toEqual({ won: false, cause: 'rock' });
    expect(ctx.events).toEqual([{ type: 'died', cause: 'rock', x: 4, y: 8 }]);
  });

  it.each(['mover', 'area'] as const)('MEC-004-R8 unshielded %s uses descriptor cause rather than family key', kind => {
    const s = buildBoard({ head: [4, 8] }), ctx = hitCtx(s);
    applyHeadHit(s, ctx, 'terrain', 4, 8, kind, { x: 0, y: -1 });
    expect(s.outcome).toEqual({ won: false, cause: 'ground' });
    expect(ctx.events).toEqual([{ type: 'died', cause: 'ground', x: 4, y: 8 }]);
  });

  it('MEC-004-R8 unbreakable mover kills even with Shield', () => {
    const s = buildBoard({ head: [4, 8] }), ctx = hitCtx(s);
    s.shield = { leftMs: 5000 };
    withFamilies(s, [{ key: 'rock', cause: 'rock', breakable: false }], () => {
      applyHeadHit(s, ctx, 'rock', 4, 8, 'mover', { x: 1, y: 0 });
      expect(s.outcome).toEqual({ won: false, cause: 'rock' });
      expect(s.shield).toEqual({ leftMs: 5000 });
    });
  });

  it('MEC-004-R8 mover hit with shield breaks it, bonk accumulator is -3 ticks, rubble beyond in mover direction', () => {
    const s = buildBoard({ head: [4, 8], walls: [[4, 8]] }), ctx = hitCtx(s);
    s.shield = { leftMs: 5000 };
    s.levelUpSlow = { factor: 2, easeMs: 1000, leftMs: 1000 };
    const tick = effectiveTick(s, b);
    expect(tick).toBeGreaterThan(s.tickMs); // Update-time hit happens before the speed refresh.
    applyHeadHit(s, ctx, 'rock', 4, 8, 'mover', { x: 0, y: 1 });
    expect(s.status).toBe('playing');
    expect(s.shield).toBeNull();
    expect(solidFamilyWithPriority(s, 4, 8)).toBeNull();
    expect(s.acc).toBe(-3 * tick);
    expect(s.families.rubble).toEqual([{ family: 'rubble', x: 4, y: 9, state: 'solid', leftMs: 1500 }]);
    expect(ctx.events.at(-1)).toEqual({ type: 'shieldBroke', x: 4, y: 8, family: 'rock', rubble: { x: 4, y: 9 } });
  });

  it.each([{ x: -1, y: 0 }, { x: 0, y: -1 }] as const)('MEC-004-R8 rubble skips reserved or out-of-bounds destination $x,$y', dir => {
    const s = buildBoard({ head: [4, 0], walls: [[4, 0]] }), ctx = hitCtx(s);
    s.shield = { leftMs: 5000 };
    applyHeadHit(s, ctx, 'rock', 4, 0, 'mover', dir);
    expect(s.families.rubble).toEqual([]);
    expect(ctx.events.at(-1)).toMatchObject({ type: 'shieldBroke', rubble: null });
  });

  it.each(['ice', 'mud', undefined] as const)('MEC-004-R15 died context is %s when the fatal step started on that tile', tile => {
    const s = buildBoard({ head: [4, 8] });
    withFamilies(s, [{ key: 'rock', cause: 'rock', solid: [[5, 8]],
      ...(tile ? { tile: { kind: tile, cells: [[4, 8]] as [number, number][] } } : {}),
    }], () => {
      expect(deathContext(s, s.snake[0]!)).toBe(tile);
      stepSnake(s, b, rngFrom(s.rng));
      expect(s.events).toEqual([{ type: 'died', cause: 'rock', x: 4, y: 8, ...(tile ? { context: tile } : {}) }]);
      if (!tile) expect(s.events[0]).not.toHaveProperty('context');
    });
  });

  it.each(['ice', 'mud'] satisfies TileKind[])('MEC-004-R15 non-move death captures %s at the current head', tile => {
    const s = buildBoard({ head: [4, 8] }), ctx = hitCtx(s);
    withFamilies(s, [{ key: 'rock', cause: 'rock', tile: { kind: tile, cells: [[4, 8]] } }], () => {
      applyHeadHit(s, ctx, 'rock', 4, 8, 'area', { x: 1, y: 0 });
      expect(ctx.events).toEqual([{ type: 'died', cause: 'rock', x: 4, y: 8, context: tile }]);
    });
  });

  it('MEC-004-R8 update-time death stops later families and the rest of that millisecond', () => {
    const s = buildBoard({ head: [4, 8] });
    s.acc = s.tickMs - 1;
    s.slowmo = { leftMs: 1 };
    const first: HazardFamily = { ...fakeFamily({ key: 'rock', cause: 'rock' }),
      update(state, ctx) { ctx.hitHead('rock', 4, 8, 'mover', { x: 1, y: 0 }); },
    };
    const later: HazardFamily = { ...fakeFamily({ key: 'fence', cause: 'fence' }),
      update(state) { state.score += 99; },
    };
    const previous = FAMILIES;
    __setFamiliesForTest([first, later]);
    try {
      const sim = simFromState(b, s);
      sim.advance(1);
      const after = exportState(sim);
      expect(after.status).toBe('over');
      expect(after.score).toBe(0);
      expect(after.snake).toEqual(s.snake);
      expect(after.acc).toBe(s.acc);
      expect(after.slowmo).toEqual({ leftMs: 1 });
      expect(sim.drainEvents()).toEqual([{ type: 'died', cause: 'rock', x: 4, y: 8 }]);
    } finally { __setFamiliesForTest(previous); }
  });
});
