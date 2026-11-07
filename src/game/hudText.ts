// Pure HUD text decisions (no Phaser): which banner lines and whether the challenge marker shows.
type T = (k: string, v?: Record<string, string | number>) => string;

/** MEC-003 §8 run-start banner lines: the challenge banner when the run begins on a challenge level (e.g. checkpoint start). */
export function runStartLines(s: { level: number; challenge: boolean }, t: T): string[] {
  return s.challenge ? [t(`banner.challenge.${s.level}`)] : [];
}

/** P3b2-R6 HUD header "Level N", star only while the level is a challenge (MEC-003 §8). */
export function levelTitle(s: { level: number; challenge: boolean }, t: T): string {
  const base = t('hud.levelTitle', { n: s.level });
  return s.challenge ? `${base} ${t('hud.challenge')}` : base;
}

/** P3b2-R6 biome name (1..6), same strings as the biome banner. */
export const biomeName = (biome: number, t: T): string => t(`banner.biome.${biome}`);
