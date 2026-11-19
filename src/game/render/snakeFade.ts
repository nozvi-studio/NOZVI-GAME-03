export interface FadePart { setVisible(v: boolean): unknown }
export interface FadeTarget {
  clear(): unknown;
  draw(objs: readonly FadePart[]): unknown;
  setAlpha(a: number): unknown;
  setVisible(v: boolean): unknown;
}

/**
 * MEC-019-R7 invulnerable blink. The snake is several overlapping shapes (outline, body, belly strokes, a disc at
 * every joint, the capy face over the head disc); alpha on each shape lets the overlaps show as round dots. Below
 * full alpha, draw the opaque parts once into a composite texture and fade that texture as one image instead.
 */
export function applySnakeFade(alpha: number, parts: readonly FadePart[], rt: FadeTarget): void {
  for (const p of parts) p.setVisible(true);
  if (alpha >= 1) { rt.setVisible(false); return; }
  rt.clear();
  rt.draw(parts);
  for (const p of parts) p.setVisible(false);
  rt.setAlpha(alpha);
  rt.setVisible(true);
}
