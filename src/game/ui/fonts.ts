// P3-0-R6 self-hosted fonts (spec D4); Boot waits at most timeoutMs, then falls back to system-ui.
export const UI_FONT_SPECS = ['700 16px Nunito', '800 16px Nunito', '900 16px Nunito', '400 16px "Lilita One"'] as const;
export function waitForFonts(fonts: { load: (spec: string) => Promise<unknown> } | undefined,
  specs: readonly string[], timeoutMs: number): Promise<boolean> {
  if (!fonts) return Promise.resolve(false);
  const all = Promise.all(specs.map(s => fonts.load(s))).then(() => true, () => false);
  const timeout = new Promise<boolean>(r => setTimeout(() => r(false), timeoutMs));
  return Promise.race([all, timeout]);
}
