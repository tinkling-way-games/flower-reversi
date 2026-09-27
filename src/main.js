// @ts-check
import { createStore } from './lib/storage.js';

const store = createStore();

// 動作確認用: localStorage への保存・読込が機能しているかを表示する。
// ゲーム実装が入ったら置き換える。
const visits = store.load('visits', 0) + 1;
store.save('visits', visits);

const el = document.getElementById('visits');
if (el) {
  el.textContent = store.available
    ? `この端末での訪問回数: ${visits}`
    : '保存機能が使えない環境です(記録は残りません)';
}
