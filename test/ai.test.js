import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chooseMove, DIFFICULTIES } from '../src/lib/ai.js';
import { createInitialBoard, getLegalMoves, applyMove, nextTurn, RED, BLUE, EMPTY, SIZE } from '../src/lib/board.js';

const at = (row, col) => row * SIZE + col;
const parse = (rows) =>
  rows.join('').split('').map((c) => (c === 'R' ? RED : c === 'B' ? BLUE : EMPTY));

for (const difficulty of DIFFICULTIES) {
  test(`${difficulty}: 常に合法手を返す`, () => {
    const legal = getLegalMoves(createInitialBoard(), RED).map((m) => m.index);
    assert.ok(legal.includes(chooseMove(createInitialBoard(), RED, difficulty)));
  });

  test(`${difficulty}: 1 局最後まで打ち切れる`, () => {
    let board = createInitialBoard();
    let turn = { player: RED, passed: false };
    let steps = 0;
    while (turn) {
      const move = chooseMove(board, turn.player, difficulty);
      assert.notEqual(move, -1);
      board = applyMove(board, move, turn.player).board;
      turn = nextTurn(board, turn.player);
      assert.ok(++steps <= 60);
    }
  });
}

test('置ける場所が無ければ -1', () => {
  const b = parse(['RRRRRRRR'.repeat(8)]);
  assert.equal(chooseMove(b, BLUE, 'hard'), -1);
});

test('ふつう・むずかしい: 角が取れるなら角を取る', () => {
  const b = parse([
    '........',
    '.B......',
    '..R.....',
    '...RB...',
    '...BR...',
    '........',
    '........',
    '........',
  ]);
  assert.equal(chooseMove(b, RED, 'normal'), at(0, 0));
  assert.equal(chooseMove(b, RED, 'hard'), at(0, 0));
});

test('むずかしい: 終盤は読み切って勝てる手を選ぶ', () => {
  // 残り 2 マス。(0,0) を選ぶと勝ち、(7,7) を先に選ぶと相手に (0,0) を取られる
  const b = parse([
    '.BBBBBBR',
    'RRRRRRRR',
    'RRRRRRRR',
    'BBBBBBBB',
    'BBBBBBBB',
    'RRRRRRRR',
    'RRRRRRRR',
    'BBBBBBB.',
  ]);
  const legal = getLegalMoves(b, RED).map((m) => m.index);
  assert.ok(legal.includes(at(0, 0)));
  assert.equal(chooseMove(b, RED, 'hard'), at(0, 0));
});
