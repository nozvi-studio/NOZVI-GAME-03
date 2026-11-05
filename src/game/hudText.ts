// Pure HUD text decisions (no Phaser): which banner lines and whether the challenge marker shows.
type T = (k: string, v?: Record<string, string | number>) => string;

/** MEC-003 §8 level-up banner lines: level, biome, unlock, then the challenge banner. */
export function levelUpLines(
  e: { level: number; challenge: boolean; unlocked?: string; biomeChanged: boolean; biome?: number }, t: T,
): string[] {
  const lines = [`${t('banner.levelUp', { n: e.level })} · ${t('banner.freshStart')}`];
  if (e.biomeChanged && e.biome !== undefined) lines.push(t(`banner.biome.${e.biome}`));
  if (e.unlocked) lines.push(t(`banner.new.${e.unlocked}`));
  if (e.challenge) lines.push(t(`banner.challenge.${e.level}`));
  return lines;
}

/** MEC-003 §8 HUD level label; the challenge marker shows only while the level is a challenge. */
export function levelLabel(s: { level: number; biome: number; challenge: boolean }, t: T): string {
  const base = t('hud.level', { n: s.level, b: s.biome });
  return s.challenge ? `${base} ${t('hud.challenge')}` : base;
}
