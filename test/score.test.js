import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  calcScore, createRecords, recordSolo, recordDuo, normalizeRecords, loadRecords, saveRecords,
} from '../src/lib/score.js';
import { createStore } from '../src/lib/storage.js';

test('スコア = (花の数 + ボーナス) × 倍率', () => {
  assert.equal(calcScore({ myDiscs: 40, result: 'win', difficulty: 'hard' }), 180);
  assert.equal(calcScore({ myDiscs: 32, result: 'draw', difficulty: 'normal' }), 74);
  assert.equal(calcScore({ myDiscs: 10, result: 'lose', difficulty: 'easy' }), 10);
});

test('一人用の記録: 勝敗・最高スコア・ポイント累計', () => {
  let r = createRecords();
  let out = recordSolo(r, 'easy', { result: 'win', score: 50 });
  assert.equal(out.newBest, true);
  r = out.records;
  out = recordSolo(r, 'easy', { result: 'lose', score: 20 });
  assert.equal(out.newBest, false);
  r = out.records;
  assert.deepEqual(r.solo.easy, { played: 2, wins: 1, losses: 1, draws: 0, best: 50 });
  assert.equal(r.points, 70);
  assert.equal(r.solo.hard.played, 0);
});

test('二人用の記録', () => {
  let r = recordDuo(createRecords(), 'red');
  r = recordDuo(r, 'draw');
  assert.deepEqual(r.duo, { played: 2, redWins: 1, blueWins: 0, draws: 1 });
  assert.equal(r.points, 0);
});

test('壊れた記録は初期値で補う', () => {
  const r = normalizeRecords({ solo: { easy: { wins: 3, best: -5 } }, points: 'x' });
  assert.equal(r.solo.easy.wins, 3);
  assert.equal(r.solo.easy.best, 0);
  assert.equal(r.points, 0);
  assert.deepEqual(normalizeRecords(null), createRecords());
});

test('保存して読み戻せる', () => {
  const map = new Map();
  const store = createStore({
    backend: { getItem: (k) => map.get(k) ?? null, setItem: (k, v) => map.set(k, v), removeItem: (k) => map.delete(k) },
  });
  const r = recordSolo(createRecords(), 'normal', { result: 'win', score: 100 }).records;
  saveRecords(store, r);
  assert.deepEqual(loadRecords(store), r);
});
