import { afterEach, expect, it, vi } from 'vitest';
import type Phaser from 'phaser';
import { SkillButtons } from '../../src/game/hud/SkillButtons';
import { hudLayout } from '../../src/game/hud/hudLayout';
import type { SkillState, SkillView } from '../../src/game/hud/hudModel';
import { loadBalance } from '../support/balance';
import { sceneHarness } from '../support/scene';

vi.mock('phaser', () => ({ default: { Scene: class {}, Scenes: { Events: { SHUTDOWN: 'shutdown' } },
  Geom: { Rectangle: Object.assign(class { constructor(..._a: number[]) {} }, { Contains: () => false }) } } }));
afterEach(() => vi.unstubAllGlobals());
const b = loadBalance();
const skill = (state: SkillState, charge: number): SkillView => ({ slot: 0, id: 'slowmo', cost: 40, state, ring: null, charge });
const fixture = (reduced = false) => {
  vi.stubGlobal('window', { matchMedia: () => ({ matches: reduced }) });
  const h = sceneHarness();
  const sb = new SkillButtons(h.scene as unknown as Phaser.Scene, hudLayout(false), () => {}, b);
  return { sb, adds: h.adds, slotCommands: (slot: number) => h.find(`skill-${slot}-face`).commands };
};

it('MOT-4-R11 off -> ready pops the slot (scale to releaseOvershoot over tapUpMs) and keeps the glow stroke', () => {
  const { sb, adds, slotCommands } = fixture();
  sb.apply([skill('off', 0.5), null]); sb.apply([skill('ready', 1), null]);
  expect(adds.some(a => a.scaleX === b.motion.releaseOvershoot)).toBe(true);
  expect(slotCommands(0).some(c => c[0] === 'strokeCircle')).toBe(true);   // the existing M.glow ring
});
it('MOT-4-R11 ready -> off dips alpha for readyDipMs with no scale change', () => {
  const { sb, adds } = fixture();
  sb.apply([skill('ready', 1), null]); sb.apply([skill('off', 0.5), null]);
  expect(adds.some(a => a.duration === b.motion.readyDipMs && !('scaleX' in a))).toBe(true);
});
it('MOT-4-R11 the first paint, active and unchanged states do not animate; reduced motion pops nothing', () => {
  const a = fixture();
  a.sb.apply([skill('ready', 1), null]); expect(a.adds.length).toBe(0);                 // first paint
  a.sb.apply([skill('active', 1), null]); expect(a.adds.some(x => x.scaleX === b.motion.releaseOvershoot)).toBe(false);   // ready -> active: no pop
  a.sb.apply([skill('active', 1), null]);
  const r = fixture(true);
  r.sb.apply([skill('off', 0.5), null]); r.sb.apply([skill('ready', 1), null]); r.sb.apply([skill('off', 0.2), null]);
  expect(r.adds.length).toBe(0);
});
it('MOT-4-R11 charge steps stay quantised but the shown charge eases over barEaseMs (spend: barSpendMs)', () => {
  const { sb, adds } = fixture();
  sb.apply([skill('off', 0.2), null]); sb.apply([skill('off', 0.6), null]);
  expect(adds.some(a => a.duration === b.motion.barEaseMs)).toBe(true);
  sb.apply([skill('off', 0.1), null]);
  expect(adds.some(a => a.duration === b.motion.barSpendMs)).toBe(true);
});
