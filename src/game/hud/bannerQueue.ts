import type { BannerSpec } from './banners';
// U5-R2 / U6-R11 pure banner queue rules; BannerLayer owns timers and drawing.
export interface BannerQueueState { shown: BannerSpec | null; waiting: readonly BannerSpec[] }
export const IDLE_BANNERS: BannerQueueState = { shown: null, waiting: [] };
/** Replace everything (level-up semantics): the first spec becomes `shown`, the rest wait; `max` caps shown + waiting. */
export function startBanners(specs: readonly BannerSpec[], max: number): BannerQueueState {
  const all = specs.slice(0, Math.max(0, max));
  return all.length === 0 ? IDLE_BANNERS : { shown: all[0]!, waiting: all.slice(1) };
}
/** U5-R2 append; never resets a running queue. The card on screen counts toward `max`; a full queue drops the new specs. */
export function enqueueBanners(q: BannerQueueState, specs: readonly BannerSpec[], max: number): BannerQueueState {
  if (q.shown === null) return startBanners(specs, max);
  const room = Math.max(0, max - 1 - q.waiting.length);
  return room === 0 ? q : { shown: q.shown, waiting: [...q.waiting, ...specs.slice(0, room)] };
}
/** The card expired: next waiting spec becomes shown, or idle. */
export function advanceBanners(q: BannerQueueState): BannerQueueState {
  return q.waiting.length === 0 ? IDLE_BANNERS : { shown: q.waiting[0]!, waiting: q.waiting.slice(1) };
}
