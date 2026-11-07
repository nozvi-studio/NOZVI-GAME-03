// P3b2-R9 pure vertical stack: item margins add to the flex gap (mockup column layout).
export interface StackItem { h: number; mt?: number }
export function stack(items: readonly StackItem[], o: { gap: number; padTop: number; padBottom: number }): { ys: number[]; height: number } {
  let y = o.padTop; const ys: number[] = [];
  items.forEach((it, i) => { y += (i > 0 ? o.gap : 0) + (it.mt ?? 0); ys.push(y); y += it.h; });
  return { ys, height: y + o.padBottom };
}
