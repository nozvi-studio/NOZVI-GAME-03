import { expect, it } from 'vitest';
import { levelUpBanners, skillPills, skillTip, type LevelUpEvent } from '../../src/game/hud/banners';
import { t } from '../../src/game/text';
import { loadBalance } from '../support/balance';

const b = loadBalance();
const up = (o: Partial<LevelUpEvent> = {}): LevelUpEvent => ({ type: 'levelUp', level: 8, biome: 2, challenge: false, biomeChanged: false, clearedLevelTimeMs: 1000, ...o });

it('P3b2-R10 BannersD2 level-up card: level, Fresh start!, shrink chip only when the snake shrank', () => {
  expect(levelUpBanners(up(), { shrunkTo: 4, newCheckpoint: null }, b, t)).toEqual([
    { kind: 'levelUp', title: 'Level 8', subtitle: 'Fresh start!', chip: 'Your snake shrinks to 4 segments' }]);
  expect(levelUpBanners(up(), { shrunkTo: null, newCheckpoint: null }, b, t)[0]).toMatchObject({ chip: null });
});
it('P3b2-R10 order: level-up, challenge, biome, checkpoint, new-family hint (MEC-003 §8, MEC-008 §8)', () => {
  const kinds = (e: LevelUpEvent, c = { shrunkTo: 4 as number | null, newCheckpoint: null as number | null }) => levelUpBanners(e, c, b, t).map(x => x.kind);
  expect(kinds(up({ level: 11, biome: 3, biomeChanged: true, unlocked: 'ice' }), { shrunkTo: 4, newCheckpoint: 6 }))
    .toEqual(['levelUp', 'biome', 'checkpoint', 'hint']);
  expect(kinds(up({ level: 10, challenge: true }))).toEqual(['levelUp', 'challenge']);
  const biome = levelUpBanners(up({ level: 11, biome: 3, biomeChanged: true }), { shrunkTo: null, newCheckpoint: null }, b, t)[1];
  expect(biome).toEqual({ kind: 'biome', label: 'BIOME 3', name: 'Frozen Pond', tagline: 'Ice is slippery. Plan your turns.' });
  const cp = levelUpBanners(up(), { shrunkTo: null, newCheckpoint: 6 }, b, t)[1];
  expect(cp).toEqual({ kind: 'checkpoint', title: 'Next run starts at L6!', subtitle: 'Checkpoint saved' });
  expect(levelUpBanners(up({ level: 10, challenge: true }), { shrunkTo: null, newCheckpoint: null }, b, t)[1])
    .toEqual({ kind: 'challenge', title: 'Challenge: Fence field!' });
});
it('P3b2-R10 queue length is capped by balance.ui.hud.bannerQueueMax', () => {
  const small = loadBalance(j => { j.ui.hud.bannerQueueMax = 2; });
  expect(levelUpBanners(up({ challenge: true, level: 10, biomeChanged: true, unlocked: 'fence' }), { shrunkTo: 4, newCheckpoint: 6 }, small, t)).toHaveLength(2);
});
it('P3b2-R11 SkillActiveD2 pills use balance durations: timed skills count down, Tail Snip shows the wall time', () => {
  const k = (slot: 0 | 1, id: 'slowmo' | 'tailSnip' | 'shield' | 'mangoRain', active: boolean, leftMs: number) => ({ slot, id, cost: 1, affordable: true, active, leftMs });
  expect(skillPills([k(0, 'slowmo', true, 2800), k(1, 'tailSnip', true, 1200)], b, t)).toEqual([
    { slot: 0, skill: 'slowmo', text: 'Slow-mo · 3 s left' }, { slot: 1, skill: 'tailSnip', text: 'Tail Snip · rock wall for 3 s' }]);
  expect(skillPills([k(0, 'shield', true, 5000), k(1, 'mangoRain', false, 0)], b, t)).toEqual([{ slot: 0, skill: 'shield', text: 'Shield · 5 s left' }]);
  expect(skillPills([{ slot: 0, id: null, cost: 0, affordable: false, active: false, leftMs: 0 }, k(1, 'mangoRain', true, 4000)], b, t)[0]).toMatchObject({ text: 'Mango Rain · 4 s left' });
});
it('P3b2-R11 skill unlocked tip: tail slot when placed, existing next-run text when no slot (MEC-007-R12)', () => {
  expect(skillTip({ skill: 'slowmo', slot: 0 }, t)).toEqual({ text: 'New skill: Slow-mo', slot: 0 });
  expect(skillTip({ skill: 'shield', slot: null }, t)).toEqual({ text: 'Shield unlocked! Pick it before your next run', slot: null });
});
