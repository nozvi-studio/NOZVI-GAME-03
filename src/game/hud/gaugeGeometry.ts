export interface Pt { x: number; y: number }
/** UIFIX-R12: polygon (relative to the circle centre, y down) of the part of a disc below a horizontal fill line at `charge` (0..1 of the height). Empty at 0, the full disc at 1. */
export function chargeSegment(radius: number, charge: number, steps: number): Pt[] {
  const c = Math.min(1, Math.max(0, charge));
  if (c <= 0) return [];
  const yLine = radius - 2 * radius * c; // fill line y: +r (bottom) at 0, -r (top) at 1
  const a0 = Math.asin(Math.min(1, Math.max(-1, yLine / radius))); // angle of the line's right end
  const n = Math.max(2, steps), pts: Pt[] = [];
  // arc from the right end of the line, down around the bottom, to the left end
  for (let i = 0; i <= n; i++) { const a = a0 + (Math.PI - 2 * a0) * (i / n); pts.push({ x: radius * Math.cos(a), y: radius * Math.sin(a) }); }
  return pts;
}
