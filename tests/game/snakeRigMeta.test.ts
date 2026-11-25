import { afterEach, describe, expect, it, vi } from 'vitest';
import { metaHeroPlacement } from '../../src/game/art/snakeRigModel';
import { SNAKE_RIG_KEY } from '../../src/game/art/snakeRig';
import { setDisplaySettings } from '../../src/game/render/palette';
import { META_BG_KEY, META_BG_READY_EVENT, MetaBgScene } from '../../src/game/scenes/MetaBgScene';
import { createPhaserPort } from '../../src/game/scenes/phaserPort';
import { defaultSettings } from '../../src/meta';
import { loadBalance } from '../support/balance';
import { DrawObject, Signals } from '../support/scene';

vi.mock('phaser', () => ({
  default: {
    WEBGL: 2,
    CANVAS: 1,
    BlendModes: { ADD: 1 },
    Scene: class {},
    Loader: { Events: { FILE_LOAD_ERROR: 'loaderror' } },
    Scale: { Events: { RESIZE: 'resize' } },
    Scenes: { Events: { UPDATE: 'update', SHUTDOWN: 'shutdown' } },
  },
}));

afterEach(() => {
  vi.unstubAllGlobals();
  setDisplaySettings(null);
});

class FakeRigObject extends DrawObject {
  timeScale = 1;
  rotation = 0;
  skeleton = {};
  pose = {};
  played: { name: string; loop: boolean; mix: number }[] = [];
  state = {
    tracks: [{ time: 0, alpha: 1, loop: true }] as ({ time: number; alpha: number; loop?: boolean } | null)[],
    apply: () => {},
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

function makeMetaBgHarness(opts: { webgl?: boolean; rigLoaded?: boolean; reduced?: boolean } = {}) {
  const { webgl = true, rigLoaded = true, reduced = false } = opts;
  setDisplaySettings({ ...defaultSettings(), reducedMotion: reduced });
  vi.stubGlobal('window', {
    matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
  });

  const balance = loadBalance();
  const gameEvents = new Signals();
  const sceneEvents = new Signals();
  const scaleEvents = new Signals();
  const registryMap = new Map<string, unknown>([['balance', balance]]);
  const rigObjs: FakeRigObject[] = [];
  const mainIgnored: unknown[] = [];
  const heroIgnored: unknown[] = [];

  const mainCam = {
    width: 540,
    height: 960,
    zoom: 1,
    setBackgroundColor: vi.fn(),
    setZoom(z: number) { this.zoom = z; },
    centerOn: vi.fn(),
    ignore: vi.fn((o: unknown) => { mainIgnored.push(o); }),
  };
  const heroCam = {
    width: 540,
    height: 960,
    setSize: vi.fn(function (this: { width: number; height: number }, w: number, h: number) {
      this.width = w;
      this.height = h;
    }),
    ignore: vi.fn((o: unknown) => { heroIgnored.push(o); }),
  };

  const scene = new MetaBgScene();
  const fxData = {
    'x-bgfx': {
      width: 540,
      height: 960,
      windBake: 1.5,
      loopDuration: 6,
      bgTexture: 'bg.png',
      fireflyTexture: 'ff.png',
      sparkleTexture: 'sp.png',
      centerGlow: { x: 270, y: 480, cycles: 1, alphaMin: 0.2, alphaMax: 0.5 },
      fireflies: [],
      sparkle: { x: 100, y: 100, localX: 0, localY: 0, cycles: 1, scaleMin: 0.5, scaleMax: 1, rotDeg: 10 },
    },
  };

  const loadedKeys = new Set<string>(rigLoaded ? [SNAKE_RIG_KEY] : []);
  Object.assign(scene, {
    load: {
      on: vi.fn(),
      off: vi.fn(),
      once: vi.fn(),
      json: vi.fn(),
      image: vi.fn(),
      rigby: vi.fn(),
    },
    cache: {
      json: {
        exists: (k: string) => k === 'marsh-bg:fx',
        get: (k: string) => (k === 'marsh-bg:fx' ? fxData : undefined),
      },
      custom: {
        rigby2d: { get: (k: string) => (loadedKeys.has(k) ? { skeleton: {} } : undefined) },
      },
    },
    add: {
      image: (x: number, y: number, key: string) => {
        const img = new DrawObject().setPosition(x, y).setTexture(key).setName(key);
        Object.assign(img, {
          setBlendMode() { return img; },
          setTint() { return img; },
          setAngle() { return img; },
        });
        return img;
      },
      rigby: (x: number, y: number, key: string, anim: string, loop: boolean) => {
        const r = new FakeRigObject().setPosition(x, y).setName(key);
        r.play(anim, loop, 0);
        rigObjs.push(r);
        return r;
      },
    },
    cameras: {
      main: mainCam,
      add: vi.fn(() => heroCam),
    },
    scene: {
      key: META_BG_KEY,
      sendToBack: vi.fn(),
    },
    scale: scaleEvents,
    events: sceneEvents,
    registry: {
      get: (k: string) => registryMap.get(k),
      set: (k: string, v: unknown) => { registryMap.set(k, v); },
    },
    game: {
      renderer: { type: webgl ? 2 : 1 },
      events: gameEvents,
      canvas: {
        getBoundingClientRect: () => ({ left: 100, top: 20, width: 360, height: 640 }),
      },
    },
  });

  return { scene, balance, gameEvents, rigObjs, mainCam, heroCam, mainIgnored, heroIgnored, registryMap };
}

describe('ANIM-SNAKE-R8..R10 meta snake rig placement, MetaBgScene overlay, and PhaserPort', () => {
  it('ANIM-SNAKE-R8 metaHeroPlacement maps DOM slot rect to unzoomed Phaser game coords and rejects empty rects', () => {
    const cfg = loadBalance().ui.snakeRig;
    const canvasRect = { left: 100, top: 20, width: 360, height: 640 };
    const slotRect = { left: 190, top: 220, width: 180, height: 180 };

    const p = metaHeroPlacement(slotRect, canvasRect, 540, 960, cfg);
    expect(p.visible).toBe(true);
    // Horizontal center: (190 + 90 - 100) * (540 / 360) = 180 * 1.5 = 270
    expect(p.x).toBeCloseTo(270);
    // Top: (220 - 20) * 1.5 = 300; slotH = 180 * 1.5 = 270; feetY = 300 + 270 * metaFeetFrac
    expect(p.feetY).toBeCloseTo(300 + 270 * cfg.metaFeetFrac);
    // Scale: (270 * metaHeadFrac) / designHeight
    expect(p.scale).toBeCloseTo((270 * cfg.metaHeadFrac) / cfg.designHeight);

    expect(metaHeroPlacement(null, canvasRect, 540, 960, cfg).visible).toBe(false);
    expect(metaHeroPlacement({ left: 0, top: 0, width: 0, height: 100 }, canvasRect, 540, 960, cfg).visible).toBe(false);
    expect(metaHeroPlacement(slotRect, { left: 0, top: 0, width: 0, height: 640 }, 540, 960, cfg).visible).toBe(false);
  });

  it('ANIM-SNAKE-R9 MetaBgScene renders snake rig on unzoomed hero camera, aligns to DOM rect, plays poke/celebrate/denied -> idle, and hides for non-snake or Reduce Motion', () => {
    const { scene, balance, rigObjs, mainIgnored, heroIgnored, registryMap } = makeMetaBgHarness();
    scene.create();

    expect(registryMap.get('metaSnakeRigReady')).toBe(true);
    expect(scene.isSnakeRigReady()).toBe(true);
    // BgLoop rig is index 0; meta SnakeRig overlay is index 1
    expect(rigObjs).toHaveLength(2);
    const snakeObj = rigObjs[1]!;
    expect(snakeObj.visible).toBe(false);
    expect(mainIgnored).toContain(snakeObj);
    expect(heroIgnored.length).toBeGreaterThan(0);

    // Bind snake slot -> visible & aligned
    const slotRect = { left: 190, top: 220, width: 180, height: 180 };
    expect(scene.setHeroSlot({ skin: 'snake', readRect: () => slotRect })).toBe(true);
    expect(snakeObj.visible).toBe(true);
    expect(snakeObj.x).toBeCloseTo(270);
    expect(scene.currentHeroAnim()).toBe('idle');

    const stepMs = (total: number): void => {
      for (let left = total; left > 0; left -= 50) scene.update(0, Math.min(50, left));
    };

    // Poke -> returns to idle after pokeMs
    scene.playHeroAnim('poke');
    expect(scene.currentHeroAnim()).toBe('poke');
    stepMs(balance.ui.snakeRig.pokeMs + 10);
    expect(scene.currentHeroAnim()).toBe('idle');

    // Celebrate one-shot -> returns to idle after celebrateMs
    scene.playHeroAnim('celebrate');
    expect(scene.currentHeroAnim()).toBe('celebrate');
    stepMs(balance.ui.snakeRig.celebrateMs + 10);
    expect(scene.currentHeroAnim()).toBe('idle');

    // Denied one-shot -> returns to idle after deniedMs
    scene.playHeroAnim('denied');
    expect(scene.currentHeroAnim()).toBe('denied');
    stepMs(balance.ui.snakeRig.deniedMs + 10);
    expect(scene.currentHeroAnim()).toBe('idle');

    // Switch to non-snake skin -> hides rig
    expect(scene.setHeroSlot({ skin: 'capy', readRect: () => slotRect })).toBe(false);
    expect(snakeObj.visible).toBe(false);

    // Switch back to snake, then enable Reduce Motion -> hides rig on update
    expect(scene.setHeroSlot({ skin: 'snake', readRect: () => slotRect })).toBe(true);
    expect(snakeObj.visible).toBe(true);
    setDisplaySettings({ ...defaultSettings(), reducedMotion: true });
    scene.update(0, 16);
    expect(snakeObj.visible).toBe(false);
  });

  it('ANIM-SNAKE-R10 createPhaserPort buffers pending metaHero slot until META_BG_READY_EVENT', () => {
    const { scene, gameEvents } = makeMetaBgHarness();
    let ready = false;
    const fakeGame = {
      events: gameEvents,
      scene: {
        getScenes: () => [],
        getScene: (key: string) => (key === META_BG_KEY && ready ? scene : undefined),
      },
    } as unknown as Parameters<typeof createPhaserPort>[0];

    const port = createPhaserPort(fakeGame);
    const slotRect = { left: 190, top: 220, width: 180, height: 180 };
    expect(port.metaHero?.setSlot({ skin: 'snake', readRect: () => slotRect })).toBe(false);

    ready = true;
    scene.create();
    expect(scene.currentHeroAnim()).toBe('idle');
    port.metaHero?.play('poke');
    expect(scene.currentHeroAnim()).toBe('poke');
    expect(port.metaHero?.isLive()).toBe(true);
    // Re-emitting META_BG_READY_EVENT replays pendingSlot cleanly
    gameEvents.emit(META_BG_READY_EVENT);
    expect(port.metaHero?.isLive()).toBe(true);
  });
});
