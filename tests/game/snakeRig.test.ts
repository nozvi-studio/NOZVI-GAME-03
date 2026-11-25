import { afterEach, describe, expect, it, vi } from 'vitest';
import { createSim, type SimSnapshot } from '../../src/core';
import { setActiveSkin, type SkinId } from '../../src/game/art/skins';
import { SNAKE_BURST_KEY, SNAKE_MANGO_KEY, SNAKE_RIG_KEY, SnakeRig } from '../../src/game/art/snakeRig';
import { RIGGED_SKINS, SKIN_RIG_REGISTRY } from '../../src/game/art/snakeRigModel';
import { setDisplaySettings } from '../../src/game/render/palette';
import { BootScene } from '../../src/game/scenes/BootScene';
import { GameScene } from '../../src/game/scenes/GameScene';
import { defaultSettings } from '../../src/meta';
import { loadBalance } from '../support/balance';
import { DrawObject, sceneHarness, Signals } from '../support/scene';

vi.mock('../../src/game/ui/background', () => ({ screenBackground: vi.fn(() => ({ destroy() {} })) }));
vi.mock('phaser', () => ({
  default: {
    WEBGL: 2,
    CANVAS: 1,
    Scene: class {},
    Scenes: { Events: { SHUTDOWN: 'shutdown' } },
    Core: { Events: { BLUR: 'blur', HIDDEN: 'hidden' } },
  },
}));

afterEach(() => {
  vi.unstubAllGlobals();
  setDisplaySettings(null);
  setActiveSkin('snake');
});

class FakeRigObject extends DrawObject {
  timeScale = 1;
  rotation = 0;
  skeleton = {};
  pose = {};
  played: { name: string; loop: boolean; mix: number }[] = [];
  appliedTimes: number[] = [];
  state = {
    tracks: [{ time: 0, alpha: 1, loop: true }] as ({ time: number; alpha: number; loop?: boolean } | null)[],
    apply: () => {
      this.appliedTimes.push(this.state.tracks[0]?.time ?? -1);
    },
  };
  play(name: string, loop = true, mix = 0) {
    this.played.push({ name, loop, mix });
    const entry = { time: 0, alpha: 1, loop };
    this.state.tracks[0] = entry;
    return entry;
  }
  override setRotation(rad: number): this {
    this.rotation = rad;
    return this;
  }
  boneWorld() { return null; }
}

const fakeSnap = (balance: ReturnType<typeof loadBalance>, dx: -1 | 0 | 1, dy: -1 | 0 | 1): SimSnapshot => ({
  ...createSim(balance, 1).snapshot(),
  dir: { x: dx, y: dy },
});

function makeGameHarness(opts: { webgl?: boolean; rigLoaded?: boolean | readonly string[]; reduced?: boolean; skin?: SkinId } = {}) {
  const { webgl = true, rigLoaded = true, reduced = false, skin = 'snake' } = opts;
  setActiveSkin(skin);
  setDisplaySettings({ ...defaultSettings(), reducedMotion: reduced });
  vi.stubGlobal('window', {
    addEventListener() {},
    removeEventListener() {},
    matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
  });

  const h = sceneHarness();
  const events = new Signals();
  const rigObjs: FakeRigObject[] = [];
  const loadCalls: { kind: string; key: string; skeleton?: string; atlas?: string }[] = [];
  const loadedKeys = new Set<string>(
    Array.isArray(rigLoaded) ? rigLoaded : rigLoaded ? RIGGED_SKINS.map(s => SKIN_RIG_REGISTRY[s].key) : [],
  );
  const textureKeys = new Set<string>(loadedKeys.size > 0 ? [SNAKE_MANGO_KEY, SNAKE_BURST_KEY] : []);

  const game = new GameScene();
  const balance = loadBalance();
  h.registry.set('balance', balance);

  Object.assign(game, h.scene, {
    time: { ...h.scene.time, now: 1000 },
    add: {
      ...h.scene.add,
      graphics: () => {
        const base = h.scene.add.graphics();
        const proxy: DrawObject = new Proxy(base, {
          get(target, prop, receiver) {
            if (prop in target) return Reflect.get(target, prop, receiver);
            return () => proxy;
          },
        });
        return proxy;
      },
      image: (x: number, y: number, key: string) => {
        const img = new DrawObject().setPosition(x, y).setTexture(key).setName(key);
        img.width = 200;
        img.height = 200;
        h.objects.push(img);
        return img;
      },
      renderTexture: () => new DrawObject(),
      rigby: (x: number, y: number, key: string, anim: string, loop: boolean) => {
        const r = new FakeRigObject().setPosition(x, y).setName(key);
        r.play(anim, loop, 0);
        rigObjs.push(r);
        h.objects.push(r);
        return r;
      },
    },
    load: {
      rigby: (key: string, skeleton?: string, atlas?: string) => { loadCalls.push({ kind: 'rigby', key, skeleton, atlas }); },
      image: (key: string) => { loadCalls.push({ kind: 'image', key }); },
    },
    cache: {
      custom: {
        rigby2d: { get: (k: string) => (loadedKeys.has(k) ? { skeleton: {} } : undefined) },
      },
    },
    textures: {
      exists: (k: string) => textureKeys.has(k),
      createCanvas: h.scene.textures.createCanvas,
    },
    children: { getByName: () => null },
    cameras: { main: { setBackgroundColor() {}, fadeIn() {} } },
    game: {
      renderer: { type: webgl ? 2 : 1 },
      events,
      canvas: { addEventListener() {}, removeEventListener() {} },
    },
  });

  vi.spyOn(game, 'startRun').mockImplementation(() => {});
  return { game, h, events, rigObjs, loadCalls, balance };
}

describe('ANIM-SNAKE SnakeRig Phaser wrapper & GameScene wiring', () => {
  it('ANIM-SNAKE-R1 / ANIM-CAT-R4 preload queues all 3 rigs + mango + burst on WebGL and skips on Canvas', () => {
    const webgl = makeGameHarness({ webgl: true, rigLoaded: false });
    expect(SnakeRig.preload(webgl.game)).toBe(true);
    expect(webgl.loadCalls).toEqual([
      { kind: 'rigby', key: SNAKE_RIG_KEY, skeleton: 'rigs/snake/snake.json', atlas: 'rigs/snake/snake.atlas' },
      { kind: 'rigby', key: 'rig/ginger', skeleton: 'rigs/ginger/ginger.json', atlas: 'rigs/ginger/ginger.atlas' },
      { kind: 'rigby', key: 'rig/tuxedo', skeleton: 'rigs/tuxedo/tuxedo.json', atlas: 'rigs/tuxedo/tuxedo.atlas' },
      { kind: 'image', key: SNAKE_MANGO_KEY },
      { kind: 'image', key: SNAKE_BURST_KEY },
    ]);

    const canvas = makeGameHarness({ webgl: false, rigLoaded: false });
    expect(SnakeRig.preload(canvas.game)).toBe(false);
    expect(canvas.loadCalls).toEqual([]);
  });

  it('ANIM-CAT-R4 BootScene.preload queues all 3 rigged skins on WebGL', () => {
    const boot = new BootScene();
    const rigbyCalls: { key: string; skeleton: string; atlas: string }[] = [];
    const h = sceneHarness();
    Object.assign(boot, h.scene, {
      load: {
        on: vi.fn(),
        off: vi.fn(),
        image: vi.fn(),
        svg: vi.fn(),
        rigby: (key: string, skeleton: string, atlas: string) => { rigbyCalls.push({ key, skeleton, atlas }); },
      },
      cache: { custom: { rigby2d: { get: () => undefined } } },
      textures: { exists: () => false, createCanvas: h.scene.textures.createCanvas },
      cameras: { main: { setBackgroundColor: vi.fn() } },
      game: { renderer: { type: 2 } },
    });
    boot.preload();
    expect(rigbyCalls).toEqual([
      { key: 'rig/snake', skeleton: 'rigs/snake/snake.json', atlas: 'rigs/snake/snake.atlas' },
      { key: 'rig/ginger', skeleton: 'rigs/ginger/ginger.json', atlas: 'rigs/ginger/ginger.atlas' },
      { key: 'rig/tuxedo', skeleton: 'rigs/tuxedo/tuxedo.json', atlas: 'rigs/tuxedo/tuxedo.atlas' },
    ]);
  });

  it('ANIM-CAT-R5 GameScene activates ginger and tuxedo rigs with per-skin durations and keeps pup/capy on CapyHead', () => {
    for (const [skin, expectedEatMs, expectedDeadSec] of [['ginger', 900, 1.4], ['tuxedo', 1200, 1.8]] as const) {
      const { game, h, rigObjs, balance } = makeGameHarness({ webgl: true, rigLoaded: true, reduced: false, skin });
      game.create();
      expect(rigObjs).toHaveLength(1);
      const rig = rigObjs[0]!;
      expect(rig.visible).toBe(true);
      expect(h.find('capy-head').visible).toBe(false);

      const draw = (game as unknown as { draw(s: SimSnapshot, t: number, dt: number): void }).draw.bind(game);
      const handleEvents = (game as unknown as { handleEvents(e: unknown[], s: SimSnapshot, t: number): void }).handleEvents.bind(game);
      const snap = fakeSnap(balance, 1, 0);

      handleEvents([{ type: 'ate' }], snap, 1000);
      expect(rig.played.at(-1)).toEqual({ name: 'eat', loop: false, mix: 0 });
      draw(snap, 1000 + expectedEatMs - 50, expectedEatMs - 50);
      expect(rig.played.at(-1)?.name).toBe('eat');
      draw(snap, 1000 + expectedEatMs, 50);
      expect(rig.played.at(-1)).toEqual({ name: 'idle', loop: true, mix: 0 });

      handleEvents([{ type: 'died' }], snap, 2000);
      draw(snap, 5000, 3000);
      expect(rig.played.at(-1)?.name).toBe('dead');
      expect(rig.state.tracks[0]?.time).toBeCloseTo(expectedDeadSec);
    }

    const pup = makeGameHarness({ webgl: true, rigLoaded: true, skin: 'pup' });
    pup.game.create();
    expect(pup.rigObjs).toHaveLength(0);
    expect(pup.h.find('capy-head').visible).toBe(true);
  });

  it('ANIM-SNAKE-R6/R7 GameScene activates SnakeRig for snake skin on WebGL, hides CapyHead, follows heading, and triggers eat/dead', () => {
    const { game, h, rigObjs, balance } = makeGameHarness({ webgl: true, rigLoaded: true, reduced: false, skin: 'snake' });
    game.create();
    expect(rigObjs).toHaveLength(1);
    const rig = rigObjs[0]!;
    const capyImg = h.find('capy-head');
    const mangoImg = h.find('snake-rig-mango');
    const burstImg = h.find('snake-rig-burst');
    expect(rig.visible).toBe(true);
    expect(capyImg.visible).toBe(false);

    // Draw facing right (1, 0) -> rotation +PI/2
    const draw = (game as unknown as { draw(s: SimSnapshot, t: number, dt: number): void }).draw.bind(game);
    const handleEvents = (game as unknown as { handleEvents(e: unknown[], s: SimSnapshot, t: number): void }).handleEvents.bind(game);
    const snap = fakeSnap(balance, 1, 0);
    draw(snap, 1000, 16);
    expect(rig.rotation).toBeCloseTo(Math.PI / 2);
    expect(mangoImg.visible).toBe(false);
    expect(burstImg.visible).toBe(false);

    // Trigger eat -> mango & burst sync at t=100ms, returns to idle after 740ms
    handleEvents([{ type: 'ate' }], snap, 1016);
    expect(rig.played.at(-1)).toEqual({ name: 'eat', loop: false, mix: 0 });
    draw(snap, 1116, 100);
    expect(mangoImg.visible).toBe(true);
    expect(burstImg.visible).toBe(true);
    draw(snap, 1800, 700);
    expect(rig.played.at(-1)).toEqual({ name: 'idle', loop: true, mix: 0 });
    expect(mangoImg.visible).toBe(false);
    expect(burstImg.visible).toBe(false);

    // Trigger dead -> plays dead non-looping and holds final frame
    handleEvents([{ type: 'died' }], snap, 1816);
    expect(rig.played.at(-1)).toEqual({ name: 'dead', loop: false, mix: 0 });
    draw(snap, 3800, 2000);
    expect(rig.played.at(-1)?.name).toBe('dead');
    expect(rig.state.tracks[0]?.time).toBeCloseTo(1.35);
  });

  it('ANIM-SNAKE-R7 falls back to CapyHead on non-WebGL, Reduce Motion, or non-snake skin, and toggles live on settings-closed', () => {
    const nonWebgl = makeGameHarness({ webgl: false, rigLoaded: true, skin: 'snake' });
    nonWebgl.game.create();
    expect(nonWebgl.rigObjs).toHaveLength(0);
    expect(nonWebgl.h.find('capy-head').visible).toBe(true);

    const otherSkin = makeGameHarness({ webgl: true, rigLoaded: true, skin: 'capy' });
    otherSkin.game.create();
    expect(otherSkin.rigObjs).toHaveLength(0);
    expect(otherSkin.h.find('capy-head').visible).toBe(true);

    const live = makeGameHarness({ webgl: true, rigLoaded: true, reduced: false, skin: 'snake' });
    live.game.create();
    expect(live.rigObjs[0]!.visible).toBe(true);
    expect(live.h.find('capy-head').visible).toBe(false);

    setDisplaySettings({ ...defaultSettings(), reducedMotion: true });
    live.events.emit('settings-closed');
    expect(live.rigObjs[0]!.visible).toBe(false);
    expect(live.h.find('capy-head').visible).toBe(true);
  });
});
