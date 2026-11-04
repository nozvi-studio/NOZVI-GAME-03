// tests/qa/p1-task9-scenes.qa.test.ts — black-box QA tests for Task 9 pure menu/input helpers
import { describe, expect, it } from 'vitest';
import type { SkillId } from '../../src/core';
import type { HomeModel, LoadoutModel } from '../../src/session';
import { acceptSkillInput, skillSlotForKey } from '../../src/game/input/skillKeys';
import { initEdit, tapCard, tapSlot } from '../../src/game/flow/loadoutEdit';
import { homeView, stepCheckpoint } from '../../src/game/flow/homeModel';

describe('QA Task 9: Pure Scene Helpers (Black-Box)', () => {
  // --------------------------------------------------------------------------
  // Group 1: Skill Key Mapping & Input Gate (MEC-007-R14, MEC-007-R15)
  // --------------------------------------------------------------------------

  it('QA-P1T9-01 MEC-007-R14 KeyJ and KeyQ map to slot 0; KeyK and KeyE map to slot 1', () => {
    expect(skillSlotForKey('KeyJ', false)).toBe(0);
    expect(skillSlotForKey('KeyQ', false)).toBe(0);
    expect(skillSlotForKey('KeyK', false)).toBe(1);
    expect(skillSlotForKey('KeyE', false)).toBe(1);
  });

  it('QA-P1T9-02 MEC-007-R14 unmapped keys return null', () => {
    for (const code of ['KeyA', 'KeyW', 'KeyS', 'KeyD', 'Space', 'Escape', 'Enter', 'KeyM', 'Digit1']) {
      expect(skillSlotForKey(code, false)).toBeNull();
    }
  });

  it('QA-P1T9-03 MEC-007-R15 keyboard auto-repeat is ignored for all skill keys', () => {
    expect(skillSlotForKey('KeyJ', true)).toBeNull();
    expect(skillSlotForKey('KeyQ', true)).toBeNull();
    expect(skillSlotForKey('KeyK', true)).toBeNull();
    expect(skillSlotForKey('KeyE', true)).toBeNull();
  });

  it('QA-P1T9-04 MEC-007-R15 skill input accepted only during playing phase', () => {
    expect(acceptSkillInput('playing')).toBe(true);
    expect(acceptSkillInput('ready')).toBe(false);
    expect(acceptSkillInput('countdown')).toBe(false);
    expect(acceptSkillInput('paused')).toBe(false);
    expect(acceptSkillInput('over')).toBe(false);
  });

  // --------------------------------------------------------------------------
  // Group 2: Loadout Screen Editing State (MEC-007-R6, MEC-007-R7, MEC-007-R8)
  // --------------------------------------------------------------------------

  it('QA-P1T9-05 MEC-007-R6/R9 initEdit initializes state with activeSlot 0', () => {
    const model: LoadoutModel = {
      unlocked: ['slowmo', 'tailSnip'],
      slotCount: 2,
      selection: ['slowmo', 'tailSnip'],
    };
    const state = initEdit(model);
    expect(state.activeSlot).toBe(0);
    expect(state.slotCount).toBe(2);
    expect(state.unlocked).toEqual(['slowmo', 'tailSnip']);
    expect(state.selection).toEqual(['slowmo', 'tailSnip']);
  });

  it('QA-P1T9-06 MEC-007-R6 tapSlot switches slot when within slotCount and ignores when beyond', () => {
    const twoSlots = initEdit({
      unlocked: ['slowmo', 'tailSnip', 'shield'],
      slotCount: 2,
      selection: ['slowmo', 'tailSnip'],
    });
    expect(tapSlot(twoSlots, 1).activeSlot).toBe(1);
    expect(tapSlot(twoSlots, 0).activeSlot).toBe(0);

    const oneSlot = initEdit({
      unlocked: ['slowmo'],
      slotCount: 1,
      selection: ['slowmo', null],
    });
    expect(tapSlot(oneSlot, 1)).toEqual(oneSlot);
    expect(tapSlot(oneSlot, 0).activeSlot).toBe(0);
  });

  it('QA-P1T9-07 MEC-007-R6 tapCard ignores locked skills not in unlocked list', () => {
    const state = initEdit({
      unlocked: ['slowmo'],
      slotCount: 1,
      selection: ['slowmo', null],
    });
    expect(tapCard(state, 'mangoRain' as SkillId)).toEqual(state);
    expect(tapCard(state, 'shield' as SkillId)).toEqual(state);
  });

  it('QA-P1T9-08 MEC-007-R7 tapCard replaces active slot and advances activeSlot to other slot', () => {
    const state = initEdit({
      unlocked: ['slowmo', 'tailSnip', 'shield'],
      slotCount: 2,
      selection: ['slowmo', 'tailSnip'],
    });
    // Active slot is 0; tap 'shield' -> slot 0 becomes 'shield', activeSlot becomes 1
    const s1 = tapCard(state, 'shield');
    expect(s1.selection).toEqual(['shield', 'tailSnip']);
    expect(s1.activeSlot).toBe(1);

    // Active slot is 1; tap 'slowmo' -> slot 1 becomes 'slowmo', activeSlot becomes 0
    const s2 = tapCard(s1, 'slowmo');
    expect(s2.selection).toEqual(['shield', 'slowmo']);
    expect(s2.activeSlot).toBe(0);
  });

  it('QA-P1T9-09 MEC-007-R7 tapCard swaps skills when tapped skill is in the other slot', () => {
    const state = initEdit({
      unlocked: ['slowmo', 'tailSnip', 'shield'],
      slotCount: 2,
      selection: ['slowmo', 'tailSnip'],
    });
    // Active slot is 0; tap 'tailSnip' (which is in slot 1) -> slots swap
    const s = tapCard(state, 'tailSnip');
    expect(s.selection).toEqual(['tailSnip', 'slowmo']);
    expect(s.activeSlot).toBe(1);
  });

  it('QA-P1T9-10 MEC-007-R8 sequence of taps maintains valid non-empty, non-duplicate 2-slot loadout', () => {
    let state = initEdit({
      unlocked: ['slowmo', 'tailSnip', 'shield', 'mangoRain'],
      slotCount: 2,
      selection: ['slowmo', 'tailSnip'],
    });
    const tapSequence: SkillId[] = [
      'shield', 'slowmo', 'mangoRain', 'tailSnip', 'shield', 'shield', 'mangoRain',
    ];
    for (const id of tapSequence) {
      state = tapCard(state, id);
      expect(state.selection[0]).not.toBeNull();
      expect(state.selection[1]).not.toBeNull();
      expect(state.selection[0]).not.toBe(state.selection[1]);
    }
  });

  // --------------------------------------------------------------------------
  // Group 3: Home View Model & Checkpoint Stepper (MEC-008-R4, MEC-008-R11, MEC-008 §8)
  // --------------------------------------------------------------------------

  it('QA-P1T9-11 MEC-008-R4 homeView without checkpoints offers only Play at L1', () => {
    const model: HomeModel = {
      checkpoints: [],
      defaultStart: 1,
      carriedEnergy: 0,
      nextMilestone: { reach: 4, requiresClear: false },
      showLoadout: false,
    };
    const view = homeView(model);
    expect(view.primary).toEqual({ key: 'home.play', level: 1 });
    expect(view.secondaryL1).toBe(false);
    expect(view.stepper).toEqual([]);
    expect(view.carry).toBeNull();
    expect(view.hint).toEqual({ key: 'hud.nextCheckpoint', level: 4 });
  });

  it('QA-P1T9-12 MEC-008-R4 homeView with checkpoints defaults to highest checkpoint and sorts stepper', () => {
    const model: HomeModel = {
      checkpoints: [8, 4, 12], // unsorted input
      defaultStart: 12,
      carriedEnergy: 35,
      nextMilestone: { reach: 16, requiresClear: false },
      showLoadout: true,
    };
    const view = homeView(model);
    expect(view.primary).toEqual({ key: 'home.playCheckpoint', level: 12 });
    expect(view.secondaryL1).toBe(true);
    expect(view.stepper).toEqual([4, 8, 12]);
    expect(view.carry).toBe(35);

    // Selected level override
    expect(homeView(model, 8).primary).toEqual({ key: 'home.playCheckpoint', level: 8 });
    // Invalid selected level falls back to defaultStart
    expect(homeView(model, 99).primary).toEqual({ key: 'home.playCheckpoint', level: 12 });
  });

  it('QA-P1T9-13 MEC-008-R11 homeView hint displays next milestone or clear requirement', () => {
    const base: HomeModel = {
      checkpoints: [4],
      defaultStart: 4,
      carriedEnergy: 0,
      nextMilestone: { reach: 10, requiresClear: false },
      showLoadout: true,
    };
    expect(homeView(base).hint).toEqual({ key: 'hud.nextCheckpoint', level: 10 });
    expect(homeView({ ...base, nextMilestone: { reach: 30, requiresClear: true } }).hint).toEqual({
      key: 'hud.nextCheckpointClear',
      level: 30,
    });
    expect(homeView({ ...base, nextMilestone: null }).hint).toBeNull();
  });

  it('QA-P1T9-14 MEC-008-R4 stepCheckpoint navigates between sorted checkpoints and clamps', () => {
    const model: HomeModel = {
      checkpoints: [8, 4, 16],
      defaultStart: 16,
      carriedEnergy: 0,
      nextMilestone: null,
      showLoadout: true,
    };
    // Step forward from 4 -> 8
    expect(stepCheckpoint(model, 4, 1)).toBe(8);
    // Step forward from 8 -> 16
    expect(stepCheckpoint(model, 8, 1)).toBe(16);
    // Step forward from 16 clamps at 16
    expect(stepCheckpoint(model, 16, 1)).toBe(16);

    // Step backward from 16 -> 8
    expect(stepCheckpoint(model, 16, -1)).toBe(8);
    // Step backward from 8 -> 4
    expect(stepCheckpoint(model, 8, -1)).toBe(4);
    // Step backward from 4 clamps at 4
    expect(stepCheckpoint(model, 4, -1)).toBe(4);

    // Empty checkpoints returns 1
    expect(stepCheckpoint({ ...model, checkpoints: [] }, 1, 1)).toBe(1);
    expect(stepCheckpoint({ ...model, checkpoints: [] }, 1, -1)).toBe(1);
  });
});
