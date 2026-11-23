import { describe, expect, it } from 'vitest';

// Vite raw glob: no @types/node needed.
const sources = import.meta.glob('../../src/game/scenes/*.ts', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
const files = Object.entries(sources).map(([path, src]) => ({ name: path.split('/').pop()!, src }));
// ui.ts and phaserPort.ts have no create(); BootScene runs once per page load and is never re-entered, so it needs no re-arm.
const EXEMPT_FROM_ENTER = ['ui.ts', 'phaserPort.ts', 'BootScene.ts'];

describe('MOT-2-R1 no direct scene.start in menu scenes', () => {
  it('MOT-2-R1 only transition.ts calls scene.start', () => {
    expect(files.length).toBeGreaterThan(5);
    const offenders = files.filter(f => /\bscene\.start\(/.test(f.src)).map(f => f.name);
    expect(offenders).toEqual([]);
  });
  it('MOT-2-R3 every scene that calls goTo also calls enter in create to re-arm it', () => {
    const missing = files.filter(f => !EXEMPT_FROM_ENTER.includes(f.name) && /\bgoTo\(/.test(f.src) && !/\benter\(/.test(f.src)).map(f => f.name);
    expect(missing).toEqual([]);
  });
});
