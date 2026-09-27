import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createStore, NAMESPACE } from '../src/lib/storage.js';

/** Map ベースの localStorage 代替 */
function memoryBackend() {
  const map = new Map();
  return {
    map,
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => void map.set(k, String(v)),
    removeItem: (k) => void map.delete(k),
  };
}

test('保存した値を読み込める', () => {
  const store = createStore({ backend: memoryBackend() });
  assert.equal(store.save('score', { black: 10, white: 5 }), true);
  assert.deepEqual(store.load('score', null), { black: 10, white: 5 });
});

test('キーは名前空間付きで保存される', () => {
  const backend = memoryBackend();
  createStore({ backend }).save('x', 1);
  assert.ok(backend.map.has(`${NAMESPACE}x`));
});

test('未保存なら fallback を返す', () => {
  const store = createStore({ backend: memoryBackend() });
  assert.equal(store.load('missing', 42), 42);
});

test('壊れた JSON なら fallback を返す', () => {
  const backend = memoryBackend();
  backend.setItem(`${NAMESPACE}broken`, '{not json');
  assert.equal(createStore({ backend }).load('broken', 'fb'), 'fb');
});

test('スキーマバージョンが違えば fallback を返す', () => {
  const backend = memoryBackend();
  createStore({ backend, version: 1 }).save('k', 'old');
  assert.equal(createStore({ backend, version: 2 }).load('k', 'fb'), 'fb');
});

test('backend が無くても例外を出さない', () => {
  const store = createStore({ backend: null });
  assert.equal(store.available, false);
  assert.equal(store.save('k', 1), false);
  assert.equal(store.load('k', 'fb'), 'fb');
  store.remove('k');
});

test('容量超過などで setItem が失敗しても false を返す', () => {
  const backend = memoryBackend();
  backend.setItem = () => {
    throw new Error('QuotaExceededError');
  };
  assert.equal(createStore({ backend }).save('k', 1), false);
});

test('remove で削除できる', () => {
  const store = createStore({ backend: memoryBackend() });
  store.save('k', 1);
  store.remove('k');
  assert.equal(store.load('k', null), null);
});
