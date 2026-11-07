// P3-0-R4 player settings (spec D7). Pure.
export type BoardTheme = 'light' | 'dark';
export interface Settings { sound: boolean; haptics: boolean; dpad: boolean; reducedMotion: boolean | null; boardTheme: BoardTheme | null }
export interface DisplayPrefs { theme: BoardTheme; reducedMotion: boolean }
export const defaultSettings = (): Settings => ({ sound: true, haptics: true, dpad: false, reducedMotion: null, boardTheme: null });
const bool = (v: unknown, d: boolean): boolean => typeof v === 'boolean' ? v : d;
export function validSettings(raw: unknown): Settings {
  const d = defaultSettings();
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return d;
  const r = raw as Record<string, unknown>;
  return { sound: bool(r.sound, d.sound), haptics: bool(r.haptics, d.haptics), dpad: bool(r.dpad, d.dpad),
    reducedMotion: typeof r.reducedMotion === 'boolean' ? r.reducedMotion : null,
    boardTheme: r.boardTheme === 'light' || r.boardTheme === 'dark' ? r.boardTheme : null };
}
export function resolveDisplay(s: Settings, os: { dark: boolean; reducedMotion: boolean }): DisplayPrefs {
  return { theme: s.boardTheme ?? (os.dark ? 'dark' : 'light'), reducedMotion: s.reducedMotion ?? os.reducedMotion };
}
