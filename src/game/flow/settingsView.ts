import type { BoardTheme, DisplayPrefs, Settings } from '../../meta';
import type { IconId } from '../ui/icons';
export { applySettings } from './settingsApply';

export type SettingsToggle = 'sound' | 'haptics' | 'dpad' | 'reducedMotion';
export interface SettingsRow { id: SettingsToggle; icon: IconId; titleKey: string; subKey: string; on: boolean; valueKey: 'settings.on' | 'settings.off' }
export interface SettingsView { rows: SettingsRow[]; theme: BoardTheme }
export const SETTINGS_CLOSED = 'settings-closed';
export interface SettingsEntry { overlay?: boolean; returnTo?: string }
export type SettingsExit = { action: 'start'; scene: string } | { action: 'close' };

const ROWS: { id: SettingsToggle; icon: IconId; key: string }[] = [
  { id: 'sound', icon: 'sound', key: 'sound' }, { id: 'haptics', icon: 'haptics', key: 'haptics' },
  { id: 'dpad', icon: 'dpad', key: 'dpad' }, { id: 'reducedMotion', icon: 'motion', key: 'motion' },
];

// P3b3-R6 Settings rows; reduced motion and theme show the resolved display value (null = follows the OS).
export function settingsView(s: Settings, d: DisplayPrefs): SettingsView {
  const on = (id: SettingsToggle): boolean => id === 'reducedMotion' ? d.reducedMotion : s[id];
  return {
    rows: ROWS.map(r => ({ id: r.id, icon: r.icon, titleKey: `settings.${r.key}`, subKey: `settings.${r.key}.sub`,
      on: on(r.id), valueKey: on(r.id) ? 'settings.on' as const : 'settings.off' as const })),
    theme: d.theme,
  };
}
export function togglePatch(s: Settings, d: DisplayPrefs, id: SettingsToggle): Partial<Settings> {
  return id === 'reducedMotion' ? { reducedMotion: !d.reducedMotion } : { [id]: !s[id] } as Partial<Settings>;
}
export const themePatch = (theme: BoardTheme): Partial<Settings> => ({ boardTheme: theme });

// P3b3-R7 Back from Home starts the caller scene; as an overlay over a paused run it just closes.
export function settingsExit(e: SettingsEntry): SettingsExit {
  return e.overlay ? { action: 'close' } : { action: 'start', scene: e.returnTo ?? 'Home' };
}
