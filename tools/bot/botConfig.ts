// MEC-004-R19 bot tuning (P2 design §16: L1-30, 20 seeds, 180 s per run).
// Optional overrides: VITE_BOT_FROM / VITE_BOT_TO / VITE_BOT_SEEDS.
const DEFAULT_FROM = 1, DEFAULT_TO = 30, DEFAULT_SEEDS = 20;
export const BOT = { seeds: Number(import.meta.env.VITE_BOT_SEEDS ?? DEFAULT_SEEDS), timeoutMs: 180000, horizonMs: 1500,
  levels: { from: Number(import.meta.env.VITE_BOT_FROM ?? DEFAULT_FROM), to: Number(import.meta.env.VITE_BOT_TO ?? DEFAULT_TO) } } as const;
/** Share of a biome's deaths above which a family cause is flagged. */
export const WARN_SHARE = 0.4;
/** Percent scale for report text. */
export const PERCENT = 100;
/** Board-size sampling period (P2 design §17), in sim ms. */
export const SAMPLE_EVERY_MS = 1000;
