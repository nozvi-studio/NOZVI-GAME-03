import { afterEach, expect, it, vi } from 'vitest';
import { BootScene } from '../../src/game/scenes/BootScene';
import { defaultSave, SAVE_KEY } from '../../src/meta';
vi.mock('phaser', () => ({ default: { Scene: class {} } }));
afterEach(() => vi.unstubAllGlobals());
it('MEC-008-R12 Boot passes balance rules so v2 progress survives loading', () => {
  const data = { ...defaultSave(), bestLevel: 14, carriedEnergy: 18, unlockedCheckpoints: [4], lastLoadout: ['shield', 'slowmo'] };
  vi.stubGlobal('window', { localStorage: { getItem: (key: string) => key === SAVE_KEY ? JSON.stringify({ version: 2, data }) : null } });
  const registry = new Map<string, unknown>();
  const scene = new BootScene();
  Object.assign(scene, { registry, scene: { start() {}, launch() {} } });
  scene.create();
  expect(registry.get('save')).toEqual(data);
});
it('ART-001 Boot opens the art preview only with ?debug=1&artPreview=1', () => {
  vi.stubGlobal('window', { localStorage: { getItem: () => null }, location: { search: '?debug=1&artPreview=1' } });
  vi.stubGlobal('location', { search: '?debug=1&artPreview=1' });
  const started: string[] = [];
  const scene = new BootScene();
  Object.assign(scene, { registry: new Map(), scene: { start: (k: string) => started.push(k), launch() {} } });
  scene.create();
  expect(started).toEqual(['ArtPreview']);
});
