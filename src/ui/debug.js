// @ts-check
/**
 * スマホ上でのデバッグ補助。
 * - 予期しないエラーは画面下部に表示する(スクリーンショットで共有できるように)
 * - URL に ?debug を付けると、ゲームの内部状態を常時表示する
 */

const MAX_ERRORS = 3;
/** @type {string[]} */
const errors = [];

/** @param {unknown} error @param {string} [context] */
export function reportError(error, context = '') {
  const e = /** @type {any} */ (error);
  const message = e?.message ?? String(error);
  const where = String(e?.stack ?? '')
    .split('\n')
    .find((line) => /\.js:\d+/.test(line))
    ?.trim();
  errors.push([context, message, where].filter(Boolean).join(' / '));
  if (errors.length > MAX_ERRORS) errors.shift();
  console.error(error);
  render();
}

function render() {
  let banner = document.getElementById('error-banner');
  if (!banner) {
    banner = document.createElement('button');
    banner.type = 'button';
    banner.id = 'error-banner';
    banner.className = 'error-banner';
    banner.addEventListener('click', () => {
      errors.length = 0;
      /** @type {HTMLElement} */ (banner).hidden = true;
    });
    document.body.append(banner);
  }
  banner.hidden = errors.length === 0;
  banner.textContent = `エラーが発生しました(タップで閉じる)\n${errors.join('\n')}`;
}

export function installErrorReporter() {
  window.addEventListener('error', (e) => reportError(e.error ?? e.message, 'error'));
  window.addEventListener('unhandledrejection', (e) => reportError(e.reason, 'promise'));
}

export const isDebug = () => new URLSearchParams(location.search).has('debug');

/** @param {() => Record<string, unknown>} getState */
export function startDebugPanel(getState) {
  const panel = document.createElement('pre');
  panel.className = 'debug-panel';
  document.body.append(panel);
  const update = () => {
    try {
      panel.textContent = Object.entries(getState())
        .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`)
        .join('\n');
    } catch (e) {
      panel.textContent = String(e);
    }
  };
  update();
  setInterval(update, 300);
}
