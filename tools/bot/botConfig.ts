// MEC-004-R19 bot tuning; the lead may raise seeds/levels for the full report.
// Optional overrides: VITE_BOT_FROM / VITE_BOT_TO (default L1-15).
const DEFAULT_FROM = 1, DEFAULT_TO = 15;
export const BOT = { seeds: 5, timeoutMs: 120000, horizonMs: 1500,
  levels: { from: Number(import.meta.env.VITE_BOT_FROM ?? DEFAULT_FROM), to: Number(import.meta.env.VITE_BOT_TO ?? DEFAULT_TO) } } as const;
/** Share of a biome's deaths above which a family cause is flagged. */
export const WARN_SHARE = 0.4;
/** Percent scale for report text. */
export const PERCENT = 100;
