// Minimal rendering/input boundary double: tests execute real game/HUD handlers without a browser.
export class Signals {
  private listeners = new Map<string, { fn: (...args: any[]) => void; once: boolean }[]>();
  on(key: string, fn: (...args: any[]) => void): this { return this.subscribe(key, fn, false); }
  once(key: string, fn: (...args: any[]) => void): this { return this.subscribe(key, fn, true); }
  private subscribe(key: string, fn: (...args: any[]) => void, once: boolean): this {
    this.listeners.set(key, [...(this.listeners.get(key) ?? []), { fn, once }]); return this;
  }
  off(key: string, fn: (...args: any[]) => void): this {
    this.listeners.set(key, (this.listeners.get(key) ?? []).filter(l => l.fn !== fn)); return this;
  }
  emit(key: string, ...args: any[]): void {
    for (const l of [...(this.listeners.get(key) ?? [])]) { if (l.once) this.off(key, l.fn); l.fn(...args); }
  }
}
export class DrawObject extends Signals {
  name = ''; text = ''; visible = true; alpha = 1; x = 0; y = 0; scale = 1;
  width = 0; height = 0; list: DrawObject[] = []; commands: [string, ...unknown[]][] = [];
  input: { enabled: boolean } | null = null;
  mask?: object;
  setName(v: string): this { this.name = v; return this; }
  setText(v: string): this { this.text = v; return this; }
  setVisible(v: boolean): this { this.visible = v; return this; }
  setAlpha(v: number): this { this.alpha = v; return this; }
  setPosition(x: number, y: number): this { this.x = x; this.y = y; return this; }
  setScale(v: number): this { this.scale = v; return this; }
  setSize(w: number, h: number): this { this.width = w; this.height = h; return this; }
  setOrigin(): this { return this; }
  setWordWrapWidth(): this { return this; }
  setAlign(): this { return this; }
  setColor(): this { return this; }
  setDepth(): this { return this; }
  setInteractive(): this { this.input = { enabled: true }; return this; }
  disableInteractive(): this { if (this.input) this.input.enabled = false; return this; }
  setMask(mask: object): this { this.mask = mask; return this; }
  createGeometryMask(): object { return {}; }
  saveTexture(): this { return this; }
  draw(): this { return this; }
  add(items: DrawObject | DrawObject[]): this { this.list.push(...(Array.isArray(items) ? items : [items])); return this; }
  clear(): this { this.commands = []; return this; }
  fillStyle(...a: unknown[]): this { this.commands.push(['fillStyle', ...a]); return this; }
  lineStyle(...a: unknown[]): this { this.commands.push(['lineStyle', ...a]); return this; }
  fillRect(...a: unknown[]): this { this.commands.push(['fillRect', ...a]); return this; }
  fillRoundedRect(...a: unknown[]): this { this.commands.push(['fillRoundedRect', ...a]); return this; }
  strokeRoundedRect(...a: unknown[]): this { this.commands.push(['strokeRoundedRect', ...a]); return this; }
  fillCircle(...a: unknown[]): this { this.commands.push(['fillCircle', ...a]); return this; }
  strokeCircle(...a: unknown[]): this { this.commands.push(['strokeCircle', ...a]); return this; }
  fillTriangle(...a: unknown[]): this { this.commands.push(['fillTriangle', ...a]); return this; }
  beginPath(): this { return this; }
  moveTo(): this { return this; }
  lineTo(): this { return this; }
  closePath(): this { return this; }
  fillPath(): this { return this; }
  strokePath(): this { return this; }
  arc(): this { return this; }
  destroy(): void {}
}
export function sceneHarness() {
  const objects: DrawObject[] = [];
  const delayed: { fn: () => void; removed: boolean; delay: number }[] = [];
  const make = (x = 0, y = 0): DrawObject => { const o = new DrawObject().setPosition(x, y); objects.push(o); return o; };
  const registry = new Map<string, unknown>();
  const scene = {
    add: { graphics: () => make(), text: (x: number, y: number, text: string) => make(x, y).setText(text),
      zone: (x: number, y: number, w: number, h: number) => { const o = make(x, y); o.width = w; o.height = h; return o; },
      container: (x: number, y: number, children: DrawObject[] = []) => make(x, y).add(children) },
    sys: { isActive: () => true },
    events: new Signals(), input: Object.assign(new Signals(), { keyboard: new Signals(), setGlobalTopOnly: (_v: boolean) => {} }),
    time: { delayedCall: (delay: number, fn: () => void) => { const t = { fn, removed: false, delay }; delayed.push(t); return { remove: () => { t.removed = true; } }; } },
    tweens: { add: (_v: unknown) => {}, killTweensOf: (_v: unknown) => {} },
    registry: { get: (k: string) => registry.get(k), set: (k: string, v: unknown) => registry.set(k, v) },
  };
  return { scene, objects, registry, delayed, find: (name: string) => objects.find(o => o.name === name)!,
    flush: () => { for (const t of delayed.splice(0)) if (!t.removed) t.fn(); } };
}
