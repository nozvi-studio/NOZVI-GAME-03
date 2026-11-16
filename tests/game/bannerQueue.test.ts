import { expect, it } from 'vitest';
import type { BannerSpec } from '../../src/game/hud/banners';
import { advanceBanners, enqueueBanners, IDLE_BANNERS, startBanners } from '../../src/game/hud/bannerQueue';

const lv = (n: number): BannerSpec => ({ kind: 'levelUp', title: `Level ${n}`, subtitle: 'Fresh start!', chip: null });
const inc: BannerSpec = { kind: 'incoming', text: 'Fence incoming' };
const ch: BannerSpec = { kind: 'challenge', title: 'Challenge: Fence field!' };

it('U5-R2 enqueue on an idle strip starts the card', () => {
  expect(enqueueBanners(IDLE_BANNERS, [inc], 3)).toEqual({ shown: inc, waiting: [] });
});
it('U5-R2 enqueue never resets a running queue: shown stays, order kept', () => {
  const run = startBanners([lv(4), ch], 4);
  const q = enqueueBanners(run, [inc], 4);
  expect(q.shown).toBe(run.shown); expect(q.waiting).toEqual([ch, inc]);
});
it('U5-R2 the card on screen counts toward bannerQueueMax; a full queue drops the new card', () => {
  const q = startBanners([lv(4), ch], 2);
  expect(enqueueBanners(q, [inc], 2)).toEqual(q);
});
it('U5-R2 run-start banners appended behind a running incoming card keep it (regression: flushRunStart used show())', () => {
  const running = enqueueBanners(IDLE_BANNERS, [inc], 4);
  const q = enqueueBanners(running, [ch], 4);
  expect(q.shown).toEqual(inc); expect(q.waiting).toEqual([ch]);
});
it('P3b2-R10 startBanners caps the queue and advance walks it in order, then idles', () => {
  let q = startBanners([lv(4), ch, inc], 2);
  expect(q.shown).toEqual(lv(4)); expect(q.waiting).toEqual([ch]);
  q = advanceBanners(q); expect(q.shown).toEqual(ch);
  q = advanceBanners(q); expect(q).toEqual(IDLE_BANNERS);
});
