// @ts-check
/** 設定の既定値と検証。 */

/** @typedef {import('./ai.js').Difficulty} Difficulty */
/**
 * @typedef {{
 *   sound: boolean,
 *   handoff: boolean,
 *   mode: 'solo' | 'duo',
 *   humanColor: 'red' | 'blue',
 *   difficulty: Difficulty,
 * }} Settings
 */

export const SETTINGS_KEY = 'settings';

/** @returns {Settings} */
export const defaultSettings = () => ({
  sound: true,
  handoff: true,
  mode: 'solo',
  humanColor: 'red',
  difficulty: 'normal',
});

/** @param {unknown} raw @returns {Settings} */
export function normalizeSettings(raw) {
  const s = defaultSettings();
  if (!raw || typeof raw !== 'object') return s;
  const r = /** @type {any} */ (raw);
  if (typeof r.sound === 'boolean') s.sound = r.sound;
  if (typeof r.handoff === 'boolean') s.handoff = r.handoff;
  if (r.mode === 'solo' || r.mode === 'duo') s.mode = r.mode;
  if (r.humanColor === 'red' || r.humanColor === 'blue') s.humanColor = r.humanColor;
  if (['easy', 'normal', 'hard'].includes(r.difficulty)) s.difficulty = r.difficulty;
  return s;
}
