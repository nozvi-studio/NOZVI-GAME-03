// MEC-004-R19 bot tuning; the lead may raise seeds/levels for the full report.
export const BOT = { seeds: 5, timeoutMs: 120000, horizonMs: 1500, levels: { from: 1, to: 15 } } as const;
/** Share of a biome's deaths above which a family cause is flagged. */
export const WARN_SHARE = 0.4;
/** Percent scale for report text. */
export const PERCENT = 100;
