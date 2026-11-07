import type Phaser from 'phaser';
export type Call = [string, ...unknown[]];
/** Records every Graphics call (name + args); chained calls return the same proxy. */
export function gfx(): { g: Phaser.GameObjects.Graphics; calls: Call[]; names: () => string[]; count: (n: string) => number } {
  const calls: Call[] = [];
  const g: unknown = new Proxy({}, { get: (_o, name: string) => (...args: unknown[]): unknown => { calls.push([name, ...args]); return g; } });
  return { g: g as Phaser.GameObjects.Graphics, calls, names: () => calls.map(c => c[0]), count: n => calls.filter(c => c[0] === n).length };
}
