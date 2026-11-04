// tests/game/keyMap.test.ts
import { describe, it, expect } from 'vitest';
import { keyAction } from '../../src/game/input/keyMap';

describe('keyMap', () => {
  it('MEC-001 GDD-13 arrows and WASD map to unit turns', () => {
    expect(['ArrowUp', 'KeyW', 'ArrowDown', 'KeyS', 'ArrowLeft', 'KeyA', 'ArrowRight', 'KeyD'].map(keyAction)).toEqual([
      { type: 'turn', dx: 0, dy: -1 }, { type: 'turn', dx: 0, dy: -1 },
      { type: 'turn', dx: 0, dy: 1 }, { type: 'turn', dx: 0, dy: 1 },
      { type: 'turn', dx: -1, dy: 0 }, { type: 'turn', dx: -1, dy: 0 },
      { type: 'turn', dx: 1, dy: 0 }, { type: 'turn', dx: 1, dy: 0 },
    ]);
  });
  it('GDD-13 M toggles sound; Space/P/Escape are flow keys; others ignored', () => {
    expect(keyAction('KeyM')).toEqual({ type: 'sound' });
    expect(['Space', 'KeyP', 'Escape'].map(keyAction)).toEqual([
      { type: 'flow', code: 'Space' }, { type: 'flow', code: 'KeyP' }, { type: 'flow', code: 'Escape' },
    ]);
    expect(keyAction('KeyJ')).toBeNull();
    expect(keyAction('KeyX')).toBeNull();
  });
});
