import type { DisplayPrefs, Settings } from '../../meta';
import type { Session } from '../../session';
import { resolveDisplay } from '../../meta/settings';
import { setDisplaySettings } from '../render/palette';

/** P3b3-R7 save the change immediately, then push the saved settings so the palette updates at once. */
export function applySettings(session: Pick<Session, 'updateSettings' | 'save'>, patch: Partial<Settings>,
  os: { dark: boolean; reducedMotion: boolean }): DisplayPrefs {
  session.updateSettings(patch);
  const s = session.save().settings;
  setDisplaySettings(s);
  return resolveDisplay(s, os);
}
