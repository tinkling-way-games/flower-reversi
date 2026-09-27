import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createInitialBoard, getLegalMoves, applyMove, countDiscs, nextTurn, winner, getFlips,
  EMPTY, RED, BLUE, SIZE,
} from '../src/lib/board.js';

const at = (row, col) => row * SIZE + col;

/** 文字列から盤面を作る。R=赤 B=青 .=空 */
function parse(rows) {
  return rows.join('').replace(/\s/g, '').split('').map((c) => (c === 'R' ? RED : c === 'B' ? BLUE : EMPTY));
}

test('初期配置は中央に 2 つずつ', () => {
  const b = createInitialBoard();
  assert.deepEqual(countDiscs(b), { red: 2, blue: 2, empty: 60 });
  assert.equal(b[at(3, 4)], RED);
  assert.equal(b[at(4, 3)], RED);
});

test('初手の合法手は 4 つ', () => {
  const moves = getLegalMoves(createInitialBoard(), RED).map((m) => m.index).sort((a, b) => a - b);
  assert.deepEqual(moves, [at(2, 3), at(3, 2), at(4, 5), at(5, 4)].sort((a, b) => a - b));
});

test('置くと挟んだ石が裏返り、元の盤面は変わらない', () => {
  const b = createInitialBoard();
  const { board, flips } = applyMove(b, at(2, 3), RED);
  assert.deepEqual(flips, [at(3, 3)]);
  assert.equal(board[at(3, 3)], RED);
  assert.equal(b[at(3, 3)], BLUE);
  assert.deepEqual(countDiscs(board), { red: 4, blue: 1, empty: 59 });
});

test('複数方向を同時に裏返す', () => {
  const b = parse([
    'R.R.R...',
    '.BBB....',
    'RB.BR...',
    '.BBB....',
    'R.R.R...',
    '........',
    '........',
    '........',
  ]);
  assert.equal(getFlips(b, at(2, 2), RED).length, 8);
});

test('端を越えて挟めない', () => {
  const b = parse([
    '.......B',
    'R.......',
    '........',
    '........',
    '........',
    '........',
    '........',
    '........',
  ]);
  // (0,6) に赤を置いても (0,7) の青は右端で途切れているので挟めない
  assert.deepEqual(getFlips(b, at(0, 6), RED), []);
});

test('置けない場所に置くと例外', () => {
  assert.throws(() => applyMove(createInitialBoard(), 0, RED));
});

test('相手が置けなければパスして同じ人が続ける', () => {
  const b = parse([
    'RB......',
    '........',
    '........',
    '........',
    '........',
    '........',
    '........',
    '........',
  ]);
  // 青には置ける場所が無い、赤は (0,2) に置ける
  assert.deepEqual(nextTurn(b, RED), { player: RED, passed: true });
});

test('両者置けなければ終局', () => {
  const b = parse(['RRRRRRRR'.repeat(8)]);
  assert.equal(nextTurn(b, RED), null);
  assert.equal(winner(b), RED);
});

test('同数なら引き分け', () => {
  const b = parse(['RRRRBBBB'.repeat(8)]);
  assert.equal(winner(b), 0);
});
