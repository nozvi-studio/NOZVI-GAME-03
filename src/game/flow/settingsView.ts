import type { DisplayPrefs, Settings } from '../../meta';
import type { IconId } from '../ui/icons';
import { TOKENS } from '../uiTokens';
export { applySettings } from './settingsApply';

export type SettingsToggle = 'sound' | 'haptics' | 'dpad' | 'reducedMotion';
export interface SettingsRow { id: SettingsToggle; icon: IconId; titleKey: string; subKey: string; on: boolean; valueKey: 'settings.on' | 'settings.off' }
export interface SettingsView { rows: SettingsRow[] }
export const SETTINGS_CLOSED = 'settings-closed';
export interface SettingsEntry { overlay?: boolean; returnTo?: string }
export type SettingsExit = { action: 'start'; scene: string } | { action: 'close' };

const ROWS: { id: SettingsToggle; icon: IconId; key: string }[] = [
  { id: 'sound', icon: 'sound', key: 'sound' }, { id: 'haptics', icon: 'haptics', key: 'haptics' },
  { id: 'dpad', icon: 'dpad', key: 'dpad' }, { id: 'reducedMotion', icon: 'motion', key: 'motion' },
];

// P3b3-R6 Settings rows; reduced motion shows the resolved display value (null = follows the OS).
export function settingsView(s: Settings, d: DisplayPrefs): SettingsView {
  const on = (id: SettingsToggle): boolean => id === 'reducedMotion' ? d.reducedMotion : s[id];
  return {
    rows: ROWS.map(r => ({ id: r.id, icon: r.icon, titleKey: `settings.${r.key}`, subKey: `settings.${r.key}.sub`,
      on: on(r.id), valueKey: on(r.id) ? 'settings.on' as const : 'settings.off' as const })),
  };
}
export function togglePatch(s: Settings, d: DisplayPrefs, id: SettingsToggle): Partial<Settings> {
  return id === 'reducedMotion' ? { reducedMotion: !d.reducedMotion } : { [id]: !s[id] } as Partial<Settings>;
}
export type SettingsTheme = 'light' | 'dark';
/** UIFIX-R14 POL-02: one edge colour for the Settings cards and toggle tracks. */
export const settingsCardEdge = (theme: SettingsTheme): string => theme === 'dark' ? TOKENS.menu.cardEdgeDark : TOKENS.surface.stone;
/** UIFIX-R14 toggle track: fill and knob carry the on/off state, the border is the shared card edge. */
export function toggleTrackStyle(on: boolean, theme: SettingsTheme): { fill: string; border: string; knob: string } {
  return { fill: on ? TOKENS.green.face : TOKENS.surface.sand, border: settingsCardEdge(theme), knob: on ? TOKENS.surface.white : TOKENS.text.soft };
}

// P3b3-R7 Back from Home starts the caller scene; as an overlay over a paused run it just closes.
export function settingsExit(e: SettingsEntry): SettingsExit {
  return e.overlay ? { action: 'close' } : { action: 'start', scene: e.returnTo ?? 'Home' };
}
