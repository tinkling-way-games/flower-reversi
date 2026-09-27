import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGarden, unlockItem, selectItem, normalizeGarden, isOwned, ITEMS, CATEGORIES } from '../src/lib/garden.js';

test('各カテゴリに初期品(0 ポイント)がちょうど 1 つある', () => {
  for (const c of CATEGORIES) {
    assert.equal(ITEMS.filter((i) => i.category === c.id && i.price === 0).length, 1);
  }
});

test('初期状態は無料の品だけ持っていて選択中', () => {
  const g = createGarden();
  assert.ok(isOwned(g, 'red-dahlia'));
  assert.ok(!isOwned(g, 'red-camellia'));
  assert.equal(g.selected.red, 'red-dahlia');
});

test('解放するとポイントが減り、その品が選択中になる', () => {
  const out = unlockItem(createGarden(), 250, 'red-camellia');
  assert.equal(out.ok, true);
  assert.equal(out.points, 50);
  assert.ok(isOwned(out.garden, 'red-camellia'));
  assert.equal(out.garden.selected.red, 'red-camellia');
});

test('ポイント不足・所持済み・存在しない品は解放できない', () => {
  const g = createGarden();
  assert.equal(unlockItem(g, 199, 'red-camellia').ok, false);
  assert.equal(unlockItem(g, 999, 'red-dahlia').ok, false);
  assert.equal(unlockItem(g, 999, 'nope').ok, false);
  assert.equal(unlockItem(g, 199, 'red-camellia').points, 199);
});

test('持っていない品は選べない', () => {
  const g = createGarden();
  assert.equal(selectItem(g, 'board-night').selected.board, 'board-lawn');
  const owned = unlockItem(g, 300, 'board-night').garden;
  const back = selectItem(owned, 'board-lawn');
  assert.equal(back.selected.board, 'board-lawn');
  assert.equal(selectItem(back, 'board-night').selected.board, 'board-night');
});

test('壊れた・改ざんされた保存データを補正する', () => {
  const g = normalizeGarden({ owned: ['red-peony', 'unknown', 3], selected: { red: 'red-peony', blue: 'blue-hydrangea' } });
  assert.ok(isOwned(g, 'red-peony'));
  assert.ok(!g.owned.includes('unknown'));
  assert.equal(g.selected.red, 'red-peony');
  assert.equal(g.selected.blue, 'blue-nemophila'); // 持っていないので初期のまま
  assert.deepEqual(normalizeGarden(null), createGarden());
});
